import assert from "node:assert/strict";
import { test } from "node:test";
import { isHealthy } from "./health.ts";

test("le pouls est sain s'il est récent, malade s'il est absent, vieux ou illisible", () => {
  const now = Date.parse("2026-10-07T10:00:00.000Z");
  const at = (iso: string) => ({ pid: 1, at: iso, ok: true, activeTasks: 0 });
  assert.equal(isHealthy(at("2026-10-07T09:59:00.000Z"), 600_000, now), true);
  assert.equal(isHealthy(at("2026-10-07T09:40:00.000Z"), 600_000, now), false);
  assert.equal(isHealthy(at("pas une date"), 600_000, now), false);
  assert.equal(isHealthy(undefined, 600_000, now), false);
});
