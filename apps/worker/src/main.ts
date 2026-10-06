import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadConfig } from "./config.ts";
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
console.log(`Worker ${process.pid} polling Coworker ${config.coworkerId} (${config.scope.kind}, ${paid ? "paid" : "free"}), every ${config.pollMs} ms`);

const short = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);

for (;;) {
  try {
    for (const task of await soko.readyTasks()) {
      if (runner.known(task.id)) continue;
      console.log(`Starting ${task.id}`);
      await runner.begin(task).catch((error: unknown) => console.error(`Task ${task.id} could not start: ${short(error)}`));
    }
  } catch (error) {
    console.error(`Polling failed: ${short(error)}`);
  }
  for (const id of runner.activeTaskIds()) await runner.advance(id);
  await sleep(config.pollMs);
}
