import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { acquireWorkerLock } from "./lock.ts";
import { readJson, writeJson } from "./store.ts";

const dir = () => mkdtempSync(join(tmpdir(), "reach-worker-"));

test("un seul verrou à la fois, relâché proprement", () => {
  const path = join(dir(), "worker.lock");
  const release = acquireWorkerLock(path);
  assert.equal(readFileSync(path, "utf8"), String(process.pid));
  assert.throws(() => acquireWorkerLock(path), /Worker already running/);
  release();
  assert.equal(existsSync(path), false);
});

test("un verrou dont le propriétaire est mort est repris", () => {
  const path = join(dir(), "worker.lock");
  writeFileSync(path, "999999999");
  const release = acquireWorkerLock(path);
  assert.equal(readFileSync(path, "utf8"), String(process.pid));
  release();
});

test("un verrou au contenu invalide bloque", () => {
  const path = join(dir(), "worker.lock");
  writeFileSync(path, "pas-un-pid");
  assert.throws(() => acquireWorkerLock(path), /invalid/);
});

test("writeJson / readJson : aller-retour et fichier absent", () => {
  const path = join(dir(), "nested", "task.json");
  writeJson(path, { phase: "started" });
  assert.deepEqual(readJson(path), { phase: "started" });
  assert.equal(readJson(join(dir(), "absent.json")), undefined);
});
