import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { requireSavedRuntimeToken } from "./mps.ts";
import { isPaidReady, registrationPath, registrationUrl, runtimeTokenPath } from "./registration.ts";
import { writeJson } from "./store.ts";

test("registrationUrl : URL publique https ou port loopback", () => {
  assert.equal(registrationUrl(undefined, "32123"), "http://127.0.0.1:32123");
  assert.equal(registrationUrl(undefined), "http://127.0.0.1:21950");
  assert.equal(registrationUrl("https://reach.example.com/agent-api/"), "https://reach.example.com/agent-api");
  assert.throws(() => registrationUrl("http://reach.example.com/agent-api"));
  for (const port of ["0", "65536", "abc", "21950.5"]) assert.throws(() => registrationUrl(undefined, port));
});

test("le jeton MPS doit exister et ne pas être masqué", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-reg-"));
  const file = join(dir, "mps-runtime.env");
  try {
    assert.throws(() => requireSavedRuntimeToken(file), /recovery required/);
    for (const value of ["", "*****masked"]) {
      writeFileSync(file, `MPS_RUNTIME_TOKEN=${value}\n`);
      assert.throws(() => requireSavedRuntimeToken(file), /recovery required/);
    }
    writeFileSync(file, "MPS_RUNTIME_TOKEN=test-token\n");
    assert.equal(requireSavedRuntimeToken(file), "test-token");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("isPaidReady exige l'enregistrement confirmé et le jeton", () => {
  const dir = mkdtempSync(join(tmpdir(), "reach-reg-"));
  try {
    assert.equal(isPaidReady(dir), false);
    writeJson(registrationPath(dir), { walletId: "w", sourceId: "s", supportedPaymentSourceIndex: 0, registrationState: "RegistrationConfirmed", agentIdentifier: "a" });
    assert.equal(isPaidReady(dir), false);
    writeFileSync(runtimeTokenPath(dir), "MPS_RUNTIME_TOKEN=t\n");
    assert.equal(isPaidReady(dir), true);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
