import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Brief } from "../../../packages/contract/src/index.ts";
import type { Config } from "./config.ts";
import { type Agent, type AgentQuestion, type IntakeOutcome, NO_ANSWER_TEXT, type ResearchOutcome, type SessionRef } from "./eve.ts";
import { findReply, formatQuestion, humanComments, intakeMessage, parseAnswer } from "./intake.ts";
import type { Sokosumi, Task } from "./sokosumi.ts";
import { readJson, writeJson } from "./store.ts";

export type Phase =
  | "starting"
  | "started"
  | "intake-sent"
  | "question-post-pending"
  | "awaiting-human"
  | "answer-sent"
  | "brief-ready"
  | "research-sent"
  | "result-saved"
  | "complete-pending"
  | "completed"
  | "failed"
  | "inspection-required";

export interface PendingQuestion extends AgentQuestion {
  session: SessionRef;
  comment: string;
  eventId?: string;
  askedAt?: number;
}

export interface Journal {
  taskId: string;
  phase: Phase;
  input?: string;
  questions: number;
  question?: PendingQuestion;
  answer?: { eventId: string | null; text: string };
  brief?: Brief;
  researchSession?: SessionRef;
  attempts: number;
  comments: Record<string, "model-pending" | "post-pending" | "posted">;
  paid?: unknown;
  note?: string;
}

export interface PaidHooks {
  save(journal: Journal): Journal;
  research(brief: Brief): Promise<ResearchOutcome>;
  resultPath(taskId: string): string;
}

// Branché en mode payé (PAID_TASKS_ENABLED) : paiement Masumi entre le brief et la recherche, puis collecte.
export interface PaidFlow {
  advance(journal: Journal, hooks: PaidHooks): Promise<Journal>;
}

const paidStage = (journal: Journal): string | undefined => (journal.paid as { stage?: string } | undefined)?.stage;

const MAX_QUESTIONS = 2;
const MAX_ATTEMPTS = 3;
const FAILED_COMMENT = "Reach n'a pas pu cadrer la demande : reformule ton besoin.";
const ERROR_COMMENT = "Reach a rencontré une erreur et n'a pas pu terminer cette Task.";
const IDLE: readonly Phase[] = ["awaiting-human", "failed", "inspection-required"];
const REPLAYABLE: readonly Phase[] = ["started", "intake-sent", "answer-sent", "research-sent"];

export class Runner {
  readonly #config: Config;
  readonly #soko: Sokosumi;
  readonly #agent: Agent;
  readonly #paid: PaidFlow | undefined;
  readonly #dir: string;

  constructor(config: Config, soko: Sokosumi, agent: Agent, paid?: PaidFlow) {
    this.#config = config;
    this.#soko = soko;
    this.#agent = agent;
    this.#paid = paid;
    this.#dir = join(config.dataDir, "tasks");
  }

  #path(taskId: string): string {
    return join(this.#dir, `${taskId}.json`);
  }

  resultPath(taskId: string): string {
    return join(this.#dir, `${taskId}.md`);
  }

  #save(journal: Journal): Journal {
    writeJson(this.#path(journal.taskId), journal);
    return journal;
  }

  #load(taskId: string): Journal | undefined {
    return readJson(this.#path(taskId)) as Journal | undefined;
  }

  known(taskId: string): boolean {
    return existsSync(this.#path(taskId));
  }

  activeTaskIds(): string[] {
    if (!existsSync(this.#dir)) return [];
    return readdirSync(this.#dir)
      .filter((name) => /^[0-9a-f-]{36}\.json$/.test(name))
      .map((name) => name.slice(0, -5))
      .filter((id) => {
        const phase = this.#load(id)?.phase;
        return phase !== undefined && phase !== "failed" && phase !== "inspection-required";
      });
  }

  async begin(task: Task): Promise<void> {
    let journal = this.#save({ taskId: task.id, phase: "starting", questions: 0, attempts: 0, comments: {} });
    const started = this.#soko.runtimeStart(task.id);
    journal = this.#save({ ...journal, phase: "started", input: started.description ?? "" });
    await this.advance(task.id, journal);
  }

  async advance(taskId: string, loaded?: Journal): Promise<void> {
    let journal = loaded ?? this.#load(taskId);
    if (!journal) return;
    try {
      for (let step = 0; step < 20; step++) {
        const before = `${journal.phase}:${paidStage(journal)}`;
        journal = await this.#step(journal);
        if (`${journal.phase}:${paidStage(journal)}` === before || IDLE.includes(journal.phase)) break;
      }
      if (journal.phase === "completed") await this.#followUps(journal);
    } catch (error) {
      await this.#onError(journal, error);
    }
  }

  async #step(j: Journal): Promise<Journal> {
    switch (j.phase) {
      case "starting":
        return this.#recoverStart(j);
      case "started":
      case "intake-sent":
        return this.#intakeFromScratch(j);
      case "question-post-pending":
        return this.#postQuestion(j);
      case "awaiting-human":
        return this.#checkReply(j);
      case "answer-sent":
        return this.#sendAnswer(j);
      case "brief-ready":
        if (this.#paid) return this.#paid.advance(j, this.#hooks());
        return this.#save({ ...j, phase: "research-sent" });
      case "research-sent":
        return this.#research(j);
      case "result-saved":
        return this.#complete(this.#save({ ...j, phase: "complete-pending" }));
      case "complete-pending":
        return this.#recoverComplete(j);
      case "completed": {
        // Après la complétion payée : suivi du retrait jusqu'à la preuve de collecte.
        const stage = paidStage(j);
        if (this.#paid && stage && stage !== "settled") return this.#paid.advance(j, this.#hooks());
        return j;
      }
      default:
        return j;
    }
  }

  // Crash entre l'écriture de « starting » et la confirmation du CLI : on relit la Task avant d'agir.
  async #recoverStart(j: Journal): Promise<Journal> {
    const task = await this.#soko.task(j.taskId);
    if (task.status === "READY") return this.#save({ ...j, phase: "started", input: this.#soko.runtimeStart(j.taskId).description ?? "" });
    if (task.status === "RUNNING") return this.#save({ ...j, phase: "started", input: task.description ?? "" });
    return this.#save({ ...j, phase: "inspection-required", note: `starting with Task status ${task.status}` });
  }

  async #intakeFromScratch(j: Journal): Promise<Journal> {
    const comments = j.questions > 0 ? humanComments(await this.#soko.events(j.taskId)) : [];
    const sent = this.#save({ ...j, phase: "intake-sent" });
    return this.#handleIntake(sent, await this.#agent.startIntake(intakeMessage(j.input ?? "", comments)));
  }

  async #handleIntake(j: Journal, outcome: IntakeOutcome): Promise<Journal> {
    if (outcome.kind === "brief") return this.#save({ ...j, phase: "brief-ready", brief: outcome.brief, attempts: 0 });
    if (outcome.kind === "invalid") {
      await this.#soko.postEvent(j.taskId, { status: "FAILED", comment: FAILED_COMMENT });
      return this.#save({ ...j, phase: "failed", note: "no valid brief after retry" });
    }
    if (j.questions >= MAX_QUESTIONS) {
      const answered = await this.#agent.answer(outcome.session, outcome.question.requestId, { text: NO_ANSWER_TEXT });
      return this.#handleIntake(j, answered);
    }
    const question: PendingQuestion = {
      ...outcome.question,
      session: outcome.session,
      comment: formatQuestion(outcome.question.prompt, outcome.question.options),
    };
    return this.#postQuestion(this.#save({ ...j, phase: "question-post-pending", question }));
  }

  async #postQuestion(j: Journal): Promise<Journal> {
    const question = j.question;
    if (!question) return this.#save({ ...j, phase: "inspection-required", note: "question missing" });
    // Reprise : si la question a déjà été postée par le Coworker, on ne la reposte pas.
    const existing = (await this.#soko.events(j.taskId)).find(
      (event) => event.actorType === "coworker" && event.status === "INPUT_REQUIRED" && event.comment?.trim() === question.comment.trim(),
    );
    const event = existing ?? (await this.#soko.postEvent(j.taskId, { status: "INPUT_REQUIRED", comment: question.comment }));
    return this.#save({
      ...j,
      phase: "awaiting-human",
      questions: j.questions + 1,
      question: { ...question, eventId: event.id, askedAt: Date.parse(event.createdAt) || Date.now() },
    });
  }

  async #checkReply(j: Journal): Promise<Journal> {
    const question = j.question;
    if (!question?.eventId) return this.#save({ ...j, phase: "inspection-required", note: "question event missing" });
    const reply = findReply(await this.#soko.events(j.taskId), question.eventId);
    if (reply?.comment) return this.#save({ ...j, phase: "answer-sent", answer: { eventId: reply.id, text: reply.comment } });
    if (Date.now() - (question.askedAt ?? 0) > this.#config.intakeTimeoutMs) {
      return this.#save({ ...j, phase: "answer-sent", answer: { eventId: null, text: NO_ANSWER_TEXT } });
    }
    return j;
  }

  async #sendAnswer(j: Journal): Promise<Journal> {
    const { question, answer } = j;
    if (!question || !answer) return this.#save({ ...j, phase: "inspection-required", note: "answer missing" });
    const task = await this.#soko.task(j.taskId);
    if (task.status === "INPUT_REQUIRED") await this.#soko.postEvent(j.taskId, { status: "RUNNING" });
    const parsed = answer.eventId ? parseAnswer(answer.text, question.options) : { text: answer.text };
    let outcome: IntakeOutcome;
    try {
      outcome = await this.#agent.answer(question.session, question.requestId, parsed);
    } catch {
      // Session eve perdue : on rejoue l'intake depuis Sokosumi, qui garde la description et les réponses.
      return this.#intakeFromScratch(j);
    }
    return this.#handleIntake(this.#save({ ...j, question: undefined, answer: undefined }), outcome);
  }

  #hooks(): PaidHooks {
    return {
      save: (journal) => this.#save(journal),
      research: (brief) => this.#agent.research(brief),
      resultPath: (taskId) => this.resultPath(taskId),
    };
  }

  async #research(j: Journal): Promise<Journal> {
    if (!j.brief) return this.#save({ ...j, phase: "inspection-required", note: "brief missing" });
    const { session, report } = await this.#agent.research(j.brief);
    writeFileSync(this.resultPath(j.taskId), report, { mode: 0o600 });
    return this.#save({ ...j, phase: "result-saved", researchSession: session, attempts: 0 });
  }

  #complete(j: Journal): Journal {
    this.#soko.runtimeComplete(j.taskId, this.resultPath(j.taskId));
    console.log(`Completed ${j.taskId}`);
    return this.#save({ ...j, phase: "completed" });
  }

  async #recoverComplete(j: Journal): Promise<Journal> {
    const task = await this.#soko.task(j.taskId);
    if (task.status === "COMPLETED") return this.#save({ ...j, phase: "completed" });
    if (task.status === "RUNNING") return this.#complete(j);
    return this.#save({ ...j, phase: "inspection-required", note: `complete-pending with Task status ${task.status}` });
  }

  // Commentaires humains postés après la complétion : réponse courte en phase FOLLOWUP.
  async #followUps(j: Journal): Promise<void> {
    if (!j.researchSession) return;
    const events = await this.#soko.events(j.taskId);
    const done = events.findLastIndex((event) => event.status === "COMPLETED");
    if (done === -1) return;
    let journal = j;
    for (const event of events.slice(done + 1)) {
      if (event.actorType !== "user" || !event.comment?.trim()) continue;
      const state = journal.comments[event.id];
      if (state === "posted" || state === "post-pending") continue;
      journal = this.#save({ ...journal, comments: { ...journal.comments, [event.id]: "model-pending" } });
      const reply = await this.#agent.followUp(j.researchSession, event.comment.trim());
      if (!reply) continue;
      journal = this.#save({ ...journal, comments: { ...journal.comments, [event.id]: "post-pending" } });
      await this.#soko.postEvent(j.taskId, { comment: reply });
      journal = this.#save({ ...journal, comments: { ...journal.comments, [event.id]: "posted" } });
    }
  }

  async #onError(j: Journal, error: unknown): Promise<void> {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    console.error(`Task ${j.taskId} blocked at ${j.phase}: ${message}`);
    const current = this.#load(j.taskId) ?? j;
    if (!REPLAYABLE.includes(current.phase)) return;
    const attempts = current.attempts + 1;
    if (attempts < MAX_ATTEMPTS) {
      this.#save({ ...current, attempts });
      return;
    }
    this.#save({ ...current, attempts, phase: "failed", note: message });
    await this.#soko.postEvent(j.taskId, { status: "FAILED", comment: ERROR_COMMENT }).catch(() => undefined);
  }

  // Au démarrage : une étape « *-pending » de paiement dont l'issue est inconnue n'est jamais rejouée.
  markUncertain(): void {
    for (const id of this.activeTaskIds()) {
      const journal = this.#load(id);
      const stage = (journal?.paid as { stage?: unknown } | undefined)?.stage;
      if (journal && typeof stage === "string" && stage.endsWith("-pending") && stage !== "model-pending") {
        console.error(`Task ${id} requires inspection at ${stage}`);
        this.#save({ ...journal, phase: "inspection-required", note: `payment ${stage}` });
      }
    }
  }
}
