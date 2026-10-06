import assert from "node:assert/strict";
import { test } from "node:test";
import { findReply, formatQuestion, humanComments, intakeMessage, parseAnswer } from "./intake.ts";
import type { TaskEvent } from "./sokosumi.ts";

const options = [
  { id: "a", label: "Sourcing", description: "je cherche un fournisseur" },
  { id: "b", label: "Leads" },
];

const event = (id: string, actorType: string, comment: string | null, status: string | null = null): TaskEvent => ({
  id,
  createdAt: "2026-10-07T00:00:00.000Z",
  actorType,
  comment,
  status,
});

test("formatQuestion suit le format du plan", () => {
  assert.equal(
    formatQuestion("Tu cherches quoi ?", options),
    "**🎯 Richard** — Tu cherches quoi ?\n\n1️⃣ **Sourcing** — je cherche un fournisseur\n2️⃣ **Leads**\n\n_Réponds juste `1`, `2` ou en texte libre._",
  );
});

test("formatQuestion sans options demande du texte libre", () => {
  assert.equal(formatQuestion("Quelle zone ?", []), "**🎯 Richard** — Quelle zone ?\n\n_Réponds en texte libre._");
});

test("parseAnswer : numéro d'option ou texte libre", () => {
  assert.deepEqual(parseAnswer(" 2 ", options), { optionId: "b" });
  assert.deepEqual(parseAnswer("1.", options), { optionId: "a" });
  assert.deepEqual(parseAnswer("3", options), { text: "3" });
  assert.deepEqual(parseAnswer("plutôt des clients en Europe", options), { text: "plutôt des clients en Europe" });
  assert.equal((parseAnswer("x".repeat(5000), options) as { text: string }).text.length, 2000);
});

test("findReply prend la première réponse humaine après la question", () => {
  const events = [
    event("1", "user", "avant"),
    event("q", "coworker", "question", "INPUT_REQUIRED"),
    event("2", "user", "  "),
    event("3", "user", "1"),
    event("4", "user", "2"),
  ];
  assert.equal(findReply(events, "q")?.id, "3");
  assert.equal(findReply(events, "absent"), undefined);
  assert.equal(findReply(events.slice(0, 3), "q"), undefined);
});

test("intakeMessage rejoue la description et les réponses humaines", () => {
  const events = [event("1", "user", " 1 "), event("2", "coworker", "q"), event("3", "user", null)];
  assert.equal(intakeMessage("Trouve-moi des partenaires.", humanComments(events)), "PHASE: INTAKE\n\nTrouve-moi des partenaires.\n\nCommentaire: 1");
  assert.equal(intakeMessage("Demande", []), "PHASE: INTAKE\n\nDemande");
});
