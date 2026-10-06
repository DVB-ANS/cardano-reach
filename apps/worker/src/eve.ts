import { Client, type ClientSession, type InputRequest, type InputResponse, type MessageResult } from "eve/client";
import { MAX_REPORT_BYTES, extractBrief, phaseMessage, type Brief } from "../../../packages/contract/src/index.ts";
import type { Config } from "./config.ts";
import type { HumanAnswer, QuestionOption } from "./intake.ts";

export const NO_ANSWER_TEXT = "Pas de réponse : continue avec des hypothèses explicites.";
export const BRIEF_RETRY_TEXT = "Réponds uniquement avec le bloc JSON Brief.";
const TRUNCATED = "_Rapport tronqué._";
const MAX_AUTO_ANSWERS = 5;

export interface SessionRef {
  sessionId: string;
  streamIndex: number;
}

export interface AgentQuestion {
  requestId: string;
  prompt: string;
  options: QuestionOption[];
}

export type IntakeOutcome =
  | { kind: "question"; session: SessionRef; question: AgentQuestion }
  | { kind: "brief"; session: SessionRef; brief: Brief }
  | { kind: "invalid"; session: SessionRef };

export interface ResearchOutcome {
  session: SessionRef;
  report: string;
}

function ref(session: ClientSession): SessionRef {
  return { sessionId: session.state.sessionId, streamIndex: session.state.streamIndex };
}

function assertTurn(result: MessageResult, label: string): void {
  if (result.status === "failed") throw new Error(`${label} turn failed`);
}

function toQuestion(request: InputRequest): AgentQuestion {
  return {
    requestId: request.requestId,
    prompt: request.prompt,
    options: (request.options ?? []).map((o) => ({ id: o.id, label: o.label, ...(o.description ? { description: o.description } : {}) })),
  };
}

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function cells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return trimmed.split(/(?<!\\)\|/);
}

// Le modèle écrit parfois une ligne de séparation avec une colonne de trop ou de moins : le tableau ne s'affiche
// alors plus. On l'aligne sur l'en-tête, en gardant l'alignement (`:---`, `---:`) des colonnes existantes.
export function repairTables(report: string): string {
  const lines = report.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const header = lines[i - 1] ?? "";
    const separator = lines[i] ?? "";
    if (!header.trim().startsWith("|") || !SEPARATOR.test(separator) || !separator.includes("-")) continue;
    const width = cells(header).length;
    const current = cells(separator).map((cell) => cell.trim());
    if (current.length === width) continue;
    const aligned = Array.from({ length: width }, (_, k) => current[k] || "---");
    lines[i] = `|${aligned.join("|")}|`;
  }
  return lines.join("\n");
}

// Tronque à la dernière ligne complète sous MAX_REPORT_BYTES (contrat), avec une mention explicite.
export function fitReport(report: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(report).byteLength <= MAX_REPORT_BYTES) return report;
  const budget = MAX_REPORT_BYTES - encoder.encode(`\n\n${TRUNCATED}\n`).byteLength;
  let cut = report;
  while (encoder.encode(cut).byteLength > budget) cut = cut.slice(0, cut.lastIndexOf("\n", cut.length - 2));
  return `${cut.trimEnd()}\n\n${TRUNCATED}\n`;
}

export class Agent {
  readonly #client: Client;

  constructor(config: Config) {
    this.#client = new Client({
      host: config.eveUrl,
      ...(config.eveAuth ? { auth: { basic: config.eveAuth }, redirect: "error" as const } : {}),
    });
  }

  async health(): Promise<void> {
    await this.#client.health();
  }

  async startIntake(message: string): Promise<IntakeOutcome> {
    const { session, response } = await this.#client.sessions.create({ message });
    return this.#intake(session, await response.result());
  }

  async answer(at: SessionRef, requestId: string, answer: HumanAnswer): Promise<IntakeOutcome> {
    const session = this.#client.sessions.attach(at.sessionId, { streamIndex: at.streamIndex });
    const reply: InputResponse = "optionId" in answer ? { requestId, optionId: answer.optionId } : { requestId, text: answer.text };
    return this.#intake(session, await (await session.respond([reply])).result());
  }

  async #intake(session: ClientSession, first: MessageResult): Promise<IntakeOutcome> {
    let result = first;
    assertTurn(result, "Intake");
    const pending = result.inputRequests[0];
    if (pending?.kind === "question") return { kind: "question", session: ref(session), question: toQuestion(pending) };
    if (pending) result = await this.#settle(session, result, "Intake");
    try {
      return { kind: "brief", session: ref(session), brief: extractBrief(result.message ?? "") };
    } catch {
      result = await (await session.send(BRIEF_RETRY_TEXT)).result();
      assertTurn(result, "Intake retry");
      try {
        return { kind: "brief", session: ref(session), brief: extractBrief(result.message ?? "") };
      } catch {
        return { kind: "invalid", session: ref(session) };
      }
    }
  }

  // Questions inattendues : hypothèses ; limite de session : on choisit « stop » et on échoue proprement.
  async #settle(session: ClientSession, first: MessageResult, label: string): Promise<MessageResult> {
    let result = first;
    for (let round = 0; result.inputRequests[0]; round++) {
      const request = result.inputRequests[0];
      if (round >= MAX_AUTO_ANSWERS) throw new Error(`${label} kept asking for input`);
      if (request.kind === "session-limit") {
        const stop = request.options?.find((o) => /stop/i.test(o.label));
        if (stop) await (await session.respond([{ requestId: request.requestId, optionId: stop.id }])).result();
        throw new Error(`${label} hit the session limit`);
      }
      if (request.kind !== "question") throw new Error(`${label} requested ${request.kind}`);
      result = await (await session.respond([{ requestId: request.requestId, text: NO_ANSWER_TEXT }])).result();
      assertTurn(result, label);
    }
    return result;
  }

  async research(brief: Brief): Promise<ResearchOutcome> {
    const message = phaseMessage("RESEARCH", `\`\`\`json\n${JSON.stringify(brief, null, 2)}\n\`\`\``);
    const { session, response } = await this.#client.sessions.create({ message });
    const result = await this.#settle(session, await response.result(), "Research");
    assertTurn(result, "Research");
    const report = result.message?.trim();
    if (!report) throw new Error("Research returned no report");
    return { session: ref(session), report: fitReport(repairTables(report)) };
  }

  // API standard Masumi : pas d'humain pour répondre, l'intake avance avec des hypothèses explicites.
  async autoReport(prompt: string): Promise<string> {
    let outcome = await this.startIntake(phaseMessage("INTAKE", prompt));
    for (let round = 0; outcome.kind === "question"; round++) {
      if (round >= MAX_AUTO_ANSWERS) throw new Error("Intake kept asking questions");
      outcome = await this.answer(outcome.session, outcome.question.requestId, { text: NO_ANSWER_TEXT });
    }
    if (outcome.kind === "invalid") throw new Error("No valid brief");
    return (await this.research(outcome.brief)).report.trim();
  }

  async followUp(at: SessionRef, comment: string): Promise<string | undefined> {
    const session = this.#client.sessions.attach(at.sessionId, { streamIndex: at.streamIndex });
    const result = await (await session.send(phaseMessage("FOLLOWUP", comment))).result();
    if (result.status === "failed" || result.inputRequests.length) return undefined;
    return result.message?.trim() || undefined;
  }
}
