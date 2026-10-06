export type Scope = { kind: "personal" } | { kind: "org"; orgId: string; orgSlug: string };

export interface Config {
  coworkerId: string;
  apiKey: string;
  scope: Scope;
  eveUrl: string;
  eveAuth: { username: string; password: string } | undefined;
  dataDir: string;
  pollMs: number;
  intakeTimeoutMs: number;
  paidEnabled: boolean;
  mpsUrl: string;
  blockfrostKey: string | undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function positiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const coworkerId = required(env, "COWORKER_ID");
  if (!UUID.test(coworkerId)) throw new Error("COWORKER_ID must be a UUID");
  const apiKey = required(env, "SOKOSUMI_COWORKER_API_KEY");
  if (!/^coworker_[A-Za-z0-9_-]+$/.test(apiKey)) throw new Error("SOKOSUMI_COWORKER_API_KEY must be a coworker_* key");

  const scopeName = env.SOKOSUMI_SCOPE?.trim() || "personal";
  let scope: Scope;
  if (scopeName === "personal") scope = { kind: "personal" };
  else if (scopeName === "org") scope = { kind: "org", orgId: required(env, "SOKOSUMI_ORG_ID"), orgSlug: required(env, "SOKOSUMI_ORG_SLUG") };
  else throw new Error("SOKOSUMI_SCOPE must be personal or org");

  const user = env.ROUTE_AUTH_BASIC_USER?.trim();
  const password = env.ROUTE_AUTH_BASIC_PASSWORD?.trim();

  return {
    coworkerId,
    apiKey,
    scope,
    eveUrl: env.EVE_URL?.trim() || "http://127.0.0.1:21949",
    eveAuth: user && password ? { username: user, password } : undefined,
    dataDir: env.WORKER_DATA_DIR?.trim() || ".local",
    pollMs: positiveInt(env, "POLL_INTERVAL_MS", 5_000),
    intakeTimeoutMs: positiveInt(env, "INTAKE_TIMEOUT_MS", 1_800_000),
    paidEnabled: env.PAID_TASKS_ENABLED === "true",
    mpsUrl: env.MPS_URL?.trim() || "http://127.0.0.1:3012",
    blockfrostKey: env.BLOCKFROST_API_KEY_PREPROD?.trim() || undefined,
  };
}
