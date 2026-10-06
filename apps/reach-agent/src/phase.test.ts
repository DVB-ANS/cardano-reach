import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelMessage } from "ai";
import { assertSearchAllowed, currentPhase } from "./phase.ts";

const user = (text: string): ModelMessage => ({ role: "user", content: text });

describe("currentPhase", () => {
  it("keeps the last PHASE across unprefixed retries", () => {
    const messages = [user("PHASE: INTAKE\n\nTrouve-moi des partenaires."), { role: "assistant", content: "…" } as const, user("Réponds uniquement avec le bloc JSON Brief.")];
    assert.equal(currentPhase(messages), "INTAKE");
    assert.throws(() => assertSearchAllowed(messages), /INTAKE/);
  });

  it("allows search once RESEARCH starts, including text parts", () => {
    const messages: ModelMessage[] = [user("PHASE: INTAKE\n\nx"), { role: "user", content: [{ type: "text", text: "PHASE: RESEARCH\n\n```json\n{}\n```" }] }];
    assert.equal(currentPhase(messages), "RESEARCH");
    assert.doesNotThrow(() => assertSearchAllowed(messages));
  });
});
