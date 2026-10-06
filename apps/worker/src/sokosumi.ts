import { execFileSync, spawnSync } from "node:child_process";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config } from "./config.ts";

// Client HTTP Core authentifié par la clé runtime du Coworker (module interne du CLI Sokosumi 1.0.4).
export interface CoreClient {
  get(path: string, signal?: AbortSignal): Promise<unknown>;
  post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown>;
}

export interface Task {
  id: string;
  status: string;
  description: string | null;
}

export interface TaskEvent {
  id: string;
  createdAt: string;
  status: string | null;
  comment: string | null;
  actorType: string | null;
}

interface RuntimeModules {
  createCoworkerHttpClient(options: { apiKey: string }): CoreClient;
}

const CLI_TIMEOUT_MS = 60_000;
const HTTP_TIMEOUT_MS = 30_000;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseTask(value: unknown): Task {
  const raw = record(value);
  const id = str(raw?.id);
  const status = str(raw?.status);
  if (!raw || !id || !status) throw new Error("Invalid Task payload");
  return { id, status, description: str(raw.description) };
}

export function parseEvent(value: unknown): TaskEvent {
  const raw = record(value);
  const id = str(raw?.id);
  const createdAt = str(raw?.createdAt);
  if (!raw || !id || !createdAt) throw new Error("Invalid Task event payload");
  return { id, createdAt, status: str(raw.status), comment: str(raw.comment), actorType: str(record(raw.actor)?.type) };
}

function dataOf(response: unknown): unknown {
  return record(response)?.data;
}

function cliRoot(): string {
  const skillsPath = execFileSync("sokosumi", ["skills", "path"], { encoding: "utf8", timeout: CLI_TIMEOUT_MS }).trim();
  if (!isAbsolute(skillsPath) || !skillsPath.endsWith("/skills")) throw new Error("sokosumi skills path returned an invalid package path");
  return join(dirname(skillsPath), "dist", "src");
}

async function loadModules(): Promise<RuntimeModules> {
  const mod: unknown = await import(pathToFileURL(join(cliRoot(), "api", "http-client.js")).href);
  if (typeof record(mod)?.createCoworkerHttpClient !== "function") throw new Error("Sokosumi CLI has no createCoworkerHttpClient");
  return mod as RuntimeModules;
}

export class Sokosumi {
  readonly #config: Config;
  readonly #core: CoreClient;

  private constructor(config: Config, core: CoreClient) {
    this.#config = config;
    this.#core = core;
  }

  static async connect(config: Config): Promise<Sokosumi> {
    const { createCoworkerHttpClient } = await loadModules();
    return new Sokosumi(config, createCoworkerHttpClient({ apiKey: config.apiKey }));
  }

  get core(): CoreClient {
    return this.#core;
  }

  async readyTasks(): Promise<Task[]> {
    const query = new URLSearchParams({ coworkerId: this.#config.coworkerId, status: "READY", take: "50" });
    const data = dataOf(await this.#core.get(`/v1/tasks?${query}`, AbortSignal.timeout(HTTP_TIMEOUT_MS)));
    if (!Array.isArray(data)) throw new Error("Invalid Task list payload");
    return data.map(parseTask);
  }

  async task(taskId: string): Promise<Task> {
    return parseTask(dataOf(await this.#core.get(`/v1/tasks/${encodeURIComponent(taskId)}`, AbortSignal.timeout(HTTP_TIMEOUT_MS))));
  }

  async events(taskId: string): Promise<TaskEvent[]> {
    const events: TaskEvent[] = [];
    let cursor: string | undefined;
    for (;;) {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) params.set("cursor", cursor);
      const response = record(await this.#core.get(`/v1/tasks/${encodeURIComponent(taskId)}/events?${params}`, AbortSignal.timeout(HTTP_TIMEOUT_MS)));
      const data = response?.data;
      if (!Array.isArray(data)) throw new Error("Invalid Task events payload");
      events.push(...data.map(parseEvent));
      const next = str(record(record(response?.meta)?.pagination)?.nextCursor);
      if (!next || next === cursor) return events;
      cursor = next;
    }
  }

  async postEvent(taskId: string, body: { status?: string; comment?: string }): Promise<TaskEvent> {
    const payload = body.comment === undefined ? body : { ...body, comment: body.comment.trim() };
    return parseEvent(dataOf(await this.#core.post(`/v1/tasks/${encodeURIComponent(taskId)}/events`, payload, AbortSignal.timeout(HTTP_TIMEOUT_MS))));
  }

  // runtime start / complete passent par le CLI : il vérifie l'identité du Coworker, la Task et le Workspace.
  runtimeStart(taskId: string): Task {
    return parseTask(this.#runtime(["start", taskId]));
  }

  runtimeComplete(taskId: string, resultFile: string): void {
    const data = record(this.#runtime(["complete", taskId, "--result-file", resultFile]));
    if (data?.status !== "COMPLETED") throw new Error("Runtime completion was not confirmed");
  }

  #runtime(args: string[]): unknown {
    const scope = this.#config.scope.kind === "personal" ? ["--personal"] : ["--organization-id", this.#config.scope.orgId];
    const result = spawnSync(
      "sokosumi",
      ["--preprod", "runtime", ...args, ...scope, "--coworker-id", this.#config.coworkerId, "--api-key-stdin", "--json"],
      { input: this.#config.apiKey, encoding: "utf8", timeout: CLI_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.status !== 0) throw new Error(`sokosumi runtime ${args[0]} failed: ${result.stderr.trim().slice(0, 300)}`);
    return JSON.parse(result.stdout);
  }
}
