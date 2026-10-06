import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Brief } from "../../../packages/contract/src/index.ts";
import type { Config } from "./config.ts";
import type { Agent, IntakeOutcome } from "./eve.ts";
import type { HumanAnswer } from "./intake.ts";
import { type PaidFlow, Runner } from "./runner.ts";
import { writeJson } from "./store.ts";
import type { Sokosumi, Task, TaskEvent } from "./sokosumi.ts";

const brief: Brief = { mode: "sourcing", niche: "aero-spatial", need: "titane", zone: "Europe", volume: null, constraints: [], language: "fr", assumptions: [] };
const session = { sessionId: "s1", streamIndex: 0 };
const question: IntakeOutcome = {
  kind: "question",
  session,
  question: { requestId: "r1", prompt: "Tu achètes ou tu vends ?", options: [{ id: "buy", label: "J'achète" }, { id: "sell", label: "Je vends" }] },
};

function fakes() {
  const events: TaskEvent[] = [];
  let status = "READY";
  let clock = 0;
  const add = (actorType: string, body: { status?: string; comment?: string }): TaskEvent => {
    const event = { id: `e${events.length + 1}`, createdAt: new Date(Date.now() + clock++).toISOString(), actorType, status: body.status ?? null, comment: body.comment ?? null };
    events.push(event);
    if (body.status) status = body.status;
    return event;
  };
  const answers: HumanAnswer[] = [];
  let intakes = 0;
  const soko = {
    task: async (): Promise<Task> => ({ id: "t1", status, description: "Trouve-moi des partenaires." }),
    events: async () => [...events],
    postEvent: async (_id: string, body: { status?: string; comment?: string }) => add("coworker", body),
    runtimeStart: (): Task => {
      add("coworker", { status: "RUNNING" });
      return { id: "t1", status: "RUNNING", description: "Trouve-moi des partenaires." };
    },
    runtimeComplete: (_id: string, file: string) => add("coworker", { status: "COMPLETED", comment: readFileSync(file, "utf8") }),
  } as unknown as Sokosumi;
  const agent = {
    startIntake: async (): Promise<IntakeOutcome> => {
      intakes++;
      return question;
    },
    answer: async (_at: unknown, _id: string, answer: HumanAnswer): Promise<IntakeOutcome> => {
      answers.push(answer);
      return { kind: "brief", session, brief };
    },
    research: async () => ({ session: { sessionId: "s2", streamIndex: 3 }, report: "# 🎯 Reach — 5 fournisseurs" }),
    followUp: async () => "Commence par le premier.",
  } as unknown as Agent;
  const config = { dataDir: mkdtempSync(join(tmpdir(), "reach-runner-")), intakeTimeoutMs: 60_000 } as Config;
  return { soko, agent, config, events, answers, user: (comment: string) => add("user", { comment }), status: () => status, intakes: () => intakes };
}

test("parcours gratuit : question, reprise sans doublon, réponse chiffrée, rapport, suivi", async () => {
  const f = fakes();
  let runner = new Runner(f.config, f.soko, f.agent);

  await runner.begin({ id: "t1", status: "READY", description: "Trouve-moi des partenaires." });
  assert.equal(f.status(), "INPUT_REQUIRED");
  const questions = () => f.events.filter((e) => e.status === "INPUT_REQUIRED").length;
  assert.equal(questions(), 1);
  assert.match(f.events.at(-1)?.comment ?? "", /^\*\*🎯 Reach\*\* — Tu achètes ou tu vends \?/);

  // Redémarrage du worker : même journal, aucune question reposée tant que l'humain n'a pas répondu.
  runner = new Runner(f.config, f.soko, f.agent);
  await runner.advance("t1");
  assert.equal(questions(), 1);
  assert.equal(f.intakes(), 1);

  f.user("2");
  await runner.advance("t1");
  assert.deepEqual(f.answers, [{ optionId: "sell" }]);
  assert.equal(f.status(), "COMPLETED");
  assert.equal(f.events.at(-1)?.comment, "# 🎯 Reach — 5 fournisseurs");
  const reply = f.events.findIndex((e) => e.comment === "2");
  assert.ok(f.events.slice(reply).some((e) => e.actorType === "coworker" && e.status === "RUNNING"), "RUNNING reposté après la réponse");

  f.user("Lequel en premier ?");
  await runner.advance("t1");
  assert.equal(f.events.at(-1)?.comment, "Commence par le premier.");
  await runner.advance("t1");
  assert.equal(f.events.filter((e) => e.comment === "Commence par le premier.").length, 1, "pas de double réponse");
});

test("pas de réponse humaine dans le délai : hypothèses explicites", async () => {
  const f = fakes();
  const runner = new Runner({ ...f.config, intakeTimeoutMs: 1 }, f.soko, f.agent);
  await runner.begin({ id: "t1", status: "READY", description: "Trouve-moi des partenaires." });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await runner.advance("t1");
  assert.deepEqual(f.answers, [{ text: "Pas de réponse : continue avec des hypothèses explicites." }]);
  assert.equal(f.status(), "COMPLETED");
});

test("une Task déjà payée n'est jamais recherchée en mode gratuit", async () => {
  const f = fakes();
  let researched = false;
  const agent = { ...(f.agent as object), research: async () => ((researched = true), { session, report: "# x" }) } as unknown as Agent;
  writeJson(join(f.config.dataDir, "tasks", "t1.json"), {
    taskId: "t1",
    phase: "brief-ready",
    input: "x",
    brief,
    questions: 0,
    attempts: 0,
    comments: {},
    paid: { stage: "awaiting-escrow" },
  });
  await new Runner(f.config, f.soko, agent).advance("t1");
  assert.equal(researched, false);
});

test("une recherche payée qui échoue est plafonnée à 3 tentatives", async () => {
  const f = fakes();
  const journal = { taskId: "t1", phase: "brief-ready", input: "x", brief, questions: 0, attempts: 0, comments: {}, paid: { stage: "model-pending" } };
  writeJson(join(f.config.dataDir, "tasks", "t1.json"), journal);
  let calls = 0;
  const paid: PaidFlow = {
    advance: async () => {
      calls++;
      throw new Error("research failed");
    },
  };
  const runner = new Runner(f.config, f.soko, f.agent, paid);
  for (let i = 0; i < 5; i++) await runner.advance("t1");
  assert.equal(calls, 3);
  assert.equal(f.status(), "FAILED");
  assert.deepEqual(runner.activeTaskIds(), []);
});
