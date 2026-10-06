import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadConfig } from "./config.ts";
import { Agent } from "./eve.ts";
import { acquireWorkerLock } from "./lock.ts";
import { Runner } from "./runner.ts";
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
if (config.paidEnabled) throw new Error("PAID_TASKS_ENABLED=true is not wired yet (M2)");
const runner = new Runner(config, soko, agent);
runner.markUncertain();
console.log(`Worker ${process.pid} polling Coworker ${config.coworkerId} (${config.scope.kind}), every ${config.pollMs} ms`);

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
