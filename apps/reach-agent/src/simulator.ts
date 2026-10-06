// Simulateur de worker : joue INTAKE puis RESEARCH contre un eve, sans Sokosumi (contrat : docs/CONTRACT.md).
import { Client, type MessageResult } from "eve/client";
import { extractBrief, phaseMessage, type Brief } from "../../../packages/contract/src/index.ts";

export const NO_ANSWER_TEXT = "Pas de réponse : continue avec des hypothèses explicites.";
const MAX_INTAKE_ROUNDS = 5;
const DEFAULT_EVE_URL = "http://127.0.0.1:21949";

export interface SimulatedTask {
  text: string;
  answers: readonly string[];
}

export interface SimulationResult {
  questions: string[];
  brief: Brief;
  report: string;
  intakeMs: number;
  researchMs: number;
}

export function createClient(): Client {
  const user = process.env.ROUTE_AUTH_BASIC_USER;
  const password = process.env.ROUTE_AUTH_BASIC_PASSWORD;
  return new Client({
    host: process.env.EVE_URL ?? DEFAULT_EVE_URL,
    ...(user && password ? { auth: { basic: { username: user, password } }, redirect: "error" as const } : {}),
  });
}

function assertNotFailed(result: MessageResult, phase: string): void {
  if (result.status === "failed") throw new Error(`${phase} turn failed`);
}

export async function simulateTask(client: Client, task: SimulatedTask): Promise<SimulationResult> {
  const answers = [...task.answers];
  const questions: string[] = [];
  const intakeStart = performance.now();

  const { session, response } = await client.sessions.create({ message: phaseMessage("INTAKE", task.text) });
  let result = await response.result();
  for (let round = 0; ; round++) {
    const question = result.inputRequests.find((request) => request.kind === "question");
    if (!question) break;
    if (round >= MAX_INTAKE_ROUNDS) throw new Error("Intake did not converge");
    questions.push(question.prompt);
    const answer = answers.shift() ?? NO_ANSWER_TEXT;
    const optionIndex = /^\s*([1-3])\s*$/.exec(answer)?.[1];
    const option = optionIndex ? question.options?.[Number(optionIndex) - 1] : undefined;
    const reply = option ? { requestId: question.requestId, optionId: option.id } : { requestId: question.requestId, text: answer };
    result = await (await session.respond([reply])).result();
  }
  assertNotFailed(result, "Intake");
  const brief = extractBrief(result.message ?? "");
  const intakeMs = Math.round(performance.now() - intakeStart);

  const researchStart = performance.now();
  const briefBlock = "```json\n" + JSON.stringify(brief, null, 2) + "\n```";
  result = await (await session.send(phaseMessage("RESEARCH", briefBlock))).result();
  // `status === "waiting"` vaut aussi pour une session au repos : seule la présence d'inputRequests compte.
  for (let pending = result.inputRequests[0]; pending; pending = result.inputRequests[0]) {
    if (pending.kind !== "question") throw new Error(`Unexpected input request during research: ${pending.kind}`);
    result = await (await session.respond([{ requestId: pending.requestId, text: NO_ANSWER_TEXT }])).result();
  }
  assertNotFailed(result, "Research");
  const report = result.message ?? "";
  return { questions, brief, report, intakeMs, researchMs: Math.round(performance.now() - researchStart) };
}
