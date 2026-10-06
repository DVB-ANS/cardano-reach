import { phaseMessage } from "../../../packages/contract/src/index.ts";
import type { TaskEvent } from "./sokosumi.ts";

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export const MAX_ANSWER_LENGTH = 2000;
const KEYCAPS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export function formatQuestion(prompt: string, options: readonly QuestionOption[]): string {
  const lines = options.slice(0, KEYCAPS.length).map((option, i) => {
    const description = option.description?.trim();
    return `${KEYCAPS[i]} **${option.label}**${description ? ` — ${description}` : ""}`;
  });
  const numbers = options.slice(0, KEYCAPS.length).map((_, i) => `\`${i + 1}\``);
  const choices = numbers.length > 1 ? `${numbers.slice(0, -1).join(", ")}, ${numbers.at(-1)}` : (numbers[0] ?? "");
  const hint = choices ? `_Réponds juste ${choices} ou en texte libre._` : "_Réponds en texte libre._";
  return [`**🎯 Reach** — ${prompt.trim()}`, lines.join("\n"), hint].filter(Boolean).join("\n\n");
}

export type HumanAnswer = { optionId: string } | { text: string };

// « 2 » (ou « 2. ») choisit l'option 2 ; tout le reste est transmis tel quel comme réponse libre.
export function parseAnswer(comment: string, options: readonly QuestionOption[]): HumanAnswer {
  const index = /^\s*([1-9])\s*[.)]?\s*$/.exec(comment)?.[1];
  const option = index ? options[Number(index) - 1] : undefined;
  return option ? { optionId: option.id } : { text: comment.trim().slice(0, MAX_ANSWER_LENGTH) };
}

function isHumanComment(event: TaskEvent): boolean {
  return event.actorType === "user" && typeof event.comment === "string" && event.comment.trim().length > 0;
}

// Première réponse humaine postée après l'événement de la question (les événements sont triés par date).
export function findReply(events: readonly TaskEvent[], questionEventId: string): TaskEvent | undefined {
  const index = events.findIndex((event) => event.id === questionEventId);
  if (index === -1) return undefined;
  return events.slice(index + 1).find(isHumanComment);
}

export function humanComments(events: readonly TaskEvent[]): string[] {
  return events.filter(isHumanComment).map((event) => (event.comment ?? "").trim().slice(0, MAX_ANSWER_LENGTH));
}

// Rejouer l'intake depuis Sokosumi (source de vérité) : description + réponses humaines déjà données.
export function intakeMessage(description: string, comments: readonly string[]): string {
  const body = comments.length ? `${description}\n\n${comments.map((c) => `Commentaire: ${c}`).join("\n")}` : description;
  return phaseMessage("INTAKE", body);
}
