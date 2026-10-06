import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const TIMEOUT_MS = 30_000;

export interface Mps {
  get(path: string): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

// Clé MPS limitée au wallet vendeur, créée par `registration.ts key` ; jamais la clé admin dans le worker.
export function requireSavedRuntimeToken(path: string): string {
  let token: string | undefined;
  try {
    token = parseEnv(readFileSync(path, "utf8")).MPS_RUNTIME_TOKEN;
  } catch {
    throw new Error("Runtime key recovery required: private token file is missing or unreadable");
  }
  if (!token || token.startsWith("*****")) throw new Error("Runtime key recovery required: private token is missing or masked");
  return token;
}

export function createMps(baseUrl: string, token: () => string): Mps {
  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "content-type": "application/json", token: token() },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = record(await response.json().catch(() => undefined));
    if (!response.ok || data?.status !== "success") throw new Error(`MPS ${path} failed HTTP ${response.status}. Inspect saved state before retry.`);
    return data.data;
  }
  return { get: (path) => call("GET", path), post: (path, body) => call("POST", path, body) };
}
