import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./store.ts";

// Pouls du worker : écrit à chaque tour de boucle, lu par le HEALTHCHECK Docker (`npm run health`).
export interface Heartbeat {
  pid: number;
  at: string;
  ok: boolean;
  activeTasks: number;
  error?: string;
}

export const heartbeatPath = (dataDir: string): string => join(dataDir, "health.json");

export function beat(dataDir: string, heartbeat: Omit<Heartbeat, "pid" | "at">): void {
  writeJson(heartbeatPath(dataDir), { pid: process.pid, at: new Date().toISOString(), ...heartbeat });
}

// Sain si le dernier tour date de moins de `maxAgeMs` (une recherche peut occuper la boucle quelques minutes).
export function isHealthy(heartbeat: Heartbeat | undefined, maxAgeMs: number, now = Date.now()): boolean {
  if (!heartbeat) return false;
  const age = now - Date.parse(heartbeat.at);
  return Number.isFinite(age) && age <= maxAgeMs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataDir = process.env.WORKER_DATA_DIR?.trim() || ".local";
  const maxAgeMs = Number(process.env.HEALTH_MAX_AGE_MS || 600_000);
  const heartbeat = readJson(heartbeatPath(dataDir)) as Heartbeat | undefined;
  const healthy = isHealthy(heartbeat, maxAgeMs);
  console.log(JSON.stringify({ healthy, ...heartbeat }));
  process.exitCode = healthy ? 0 : 1;
}
