// Phase courante d'une session (contrat : la première ligne du dernier message worker est `PHASE: <X>`).
import type { ModelMessage, UserModelMessage } from "ai";
import { PHASES, type Phase } from "../../../packages/contract/src/index.ts";

const PHASE_LINE = /^PHASE: (\w+)/;

function isPhase(value: string): value is Phase {
  return (PHASES as readonly string[]).includes(value);
}

function textOf(message: UserModelMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content.map((part) => (part.type === "text" ? part.text : "")).join("");
}

/** Dernier message utilisateur portant un préfixe `PHASE:` ; les relances sans préfixe restent dans la même phase. */
export function currentPhase(messages: readonly ModelMessage[]): Phase | null {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const phase = PHASE_LINE.exec(textOf(message).trimStart())?.[1];
    if (phase && isPhase(phase)) return phase;
  }
  return null;
}

/** Garde codée : le modèle ne doit pas chercher pendant l'intake (le paiement n'est pas encore fait). */
export function assertSearchAllowed(messages: readonly ModelMessage[]): void {
  if (currentPhase(messages) === "INTAKE") {
    throw new Error("Recherche interdite en PHASE: INTAKE. Rends maintenant le brief JSON (ou pose une question avec ask_question).");
  }
}
