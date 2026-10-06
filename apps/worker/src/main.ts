import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadConfig } from "./config.ts";
import { beat } from "./health.ts";
import { errorMessage, log } from "./log.ts";
import { Agent } from "./eve.ts";
import { acquireWorkerLock } from "./lock.ts";
import { createMps, requireSavedRuntimeToken } from "./mps.ts";
import { createPaidFlow } from "./payment.ts";
import { isPaidReady, loadRegistration, runtimeTokenPath } from "./registration.ts";
import { type PaidFlow, Runner } from "./runner.ts";
import { Sokosumi } from "./sokosumi.ts";

const config = loadConfig();
const release = acquireWorkerLock(join(config.dataDir, "worker.lock"));
process.once("exit", release);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    release();
    process.exit(0);
  });
}

const soko = await Sokosumi.connect(config);
const agent = new Agent(config);
await agent.health();
let paid: PaidFlow | undefined;
if (config.paidEnabled) {
  if (!isPaidReady(config.dataDir)) throw new Error("PAID_TASKS_ENABLED=true requires a confirmed Masumi registration and the scoped MPS key");
  const tokenFile = runtimeTokenPath(config.dataDir);
  paid = createPaidFlow({
    core: soko.core,
    mps: createMps(config.mpsUrl, () => requireSavedRuntimeToken(tokenFile)),
    registration: () => {
      const registration = loadRegistration(config.dataDir);
      if (!registration) throw new Error("Registration state missing");
      return registration;
    },
    blockfrostKey: config.blockfrostKey,
  });
}
const runner = new Runner(config, soko, agent, paid);
runner.markUncertain();
log.info("worker started", { pid: process.pid, coworkerId: config.coworkerId, scope: config.scope.kind, mode: paid ? "paid" : "free", pollMs: config.pollMs });

for (;;) {
  let error: string | undefined;
  try {
    for (const task of await soko.readyTasks()) {
      if (runner.known(task.id)) continue;
      log.info("task received", { taskId: task.id });
      await runner.begin(task).catch((cause: unknown) => log.error("task could not start", { taskId: task.id, error: errorMessage(cause) }));
    }
  } catch (cause) {
    error = errorMessage(cause);
    log.error("polling failed", { error });
  }
  const active = runner.activeTaskIds();
  for (const id of active) await runner.advance(id);
  beat(config.dataDir, { ok: !error, activeTasks: active.length, ...(error ? { error } : {}) });
  await sleep(config.pollMs);
}
