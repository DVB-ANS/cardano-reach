import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Config, loadConfig } from "./config.ts";
import { Agent } from "./eve.ts";
import { errorMessage } from "./log.ts";
import { createMps, requireSavedRuntimeToken } from "./mps.ts";
import { loadRegistration, runtimeTokenPath } from "./registration.ts";
import { Sokosumi } from "./sokosumi.ts";

// Pré-vol en lecture seule : dit en une commande si le worker (gratuit ou payé) peut tourner, et quoi réparer sinon.
type Status = "ok" | "fail" | "warn" | "skip";
interface Check {
  name: string;
  status: Status;
  detail: string;
  fix?: string;
}

const ICON: Record<Status, string> = { ok: "✅", fail: "❌", warn: "⚠️ ", skip: "➖" };
const TIMEOUT_MS = 10_000;

async function run(name: string, fn: () => Promise<Omit<Check, "name">>, fix?: string): Promise<Check> {
  try {
    const result = await fn();
    return { name, ...result, ...(result.status === "fail" && !result.fix && fix ? { fix } : {}) };
  } catch (error) {
    return { name, status: "fail", detail: errorMessage(error), ...(fix ? { fix } : {}) };
  }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${TIMEOUT_MS} ms`)), TIMEOUT_MS))]);
}

function lockOwner(config: Config): number | undefined {
  const path = join(config.dataDir, "worker.lock");
  if (!existsSync(path)) return undefined;
  const pid = Number(readFileSync(path, "utf8"));
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    return undefined;
  }
}

const paidMode = process.argv.includes("--paid") || process.env.PAID_TASKS_ENABLED === "true";
const checks: Check[] = [];
let config: Config | undefined;

checks.push(
  await run(
    "configuration",
    async () => {
      config = loadConfig();
      return { status: "ok", detail: `Coworker ${config.coworkerId}, scope ${config.scope.kind}, données dans ${config.dataDir}` };
    },
    "renseigner COWORKER_ID et SOKOSUMI_COWORKER_API_KEY dans .env.local (modèle : .env.example)",
  ),
);

checks.push(
  await run(
    "CLI sokosumi",
    async () => {
      const version = execFileSync("sokosumi", ["--version"], { encoding: "utf8", timeout: TIMEOUT_MS }).trim();
      return version.includes("1.0.4") ? { status: "ok", detail: version } : { status: "warn", detail: `${version} (le projet est validé sur 1.0.4)` };
    },
    "npm install -g @masumi_network/sokosumi@1.0.4 (Node 24)",
  ),
);

if (config) {
  const cfg = config;
  let soko: Sokosumi | undefined;
  checks.push(
    await run(
      "Coworker (clé runtime)",
      async () => {
        soko = await Sokosumi.connect(cfg);
        const me = (await withTimeout(soko.core.get("/v1/coworkers/me"))) as { data?: { id?: string; name?: string; capabilities?: string[]; archivedAt?: string | null } };
        const coworker = me.data;
        if (coworker?.id !== cfg.coworkerId) return { status: "fail", detail: "la clé runtime appartient à un autre Coworker" };
        if (coworker.archivedAt) return { status: "fail", detail: "Coworker archivé" };
        if (!coworker.capabilities?.includes("tasks")) return { status: "fail", detail: "capability tasks absente" };
        return { status: "ok", detail: `${coworker.name ?? "?"} (${coworker.id})` };
      },
      "réimporter la clé : script « Save the runtime key » de docs/masumi/agent-guide.md §2",
    ),
  );
  checks.push(
    await run("Tasks Sokosumi", async () => {
      if (!soko) return { status: "skip", detail: "Coworker injoignable" };
      const ready = await withTimeout(soko.readyTasks());
      return { status: "ok", detail: `${ready.length} Task(s) READY en attente` };
    }),
  );
  checks.push(
    await run(
      "agent eve",
      async () => {
        await withTimeout(new Agent(cfg).health());
        return { status: "ok", detail: cfg.eveUrl };
      },
      "lancer l'agent (apps/reach-agent : npm run dev en local, service reach-agent en prod) et vérifier EVE_URL",
    ),
  );
  const owner = lockOwner(cfg);
  checks.push({
    name: "exécuteur unique",
    status: owner ? "warn" : "ok",
    detail: owner ? `un worker tourne déjà (pid ${owner}) : n'en lance pas un second` : "aucun worker lancé sur cette machine",
  });

  if (!paidMode) {
    checks.push({ name: "mode payé", status: "skip", detail: "non vérifié (relancer avec --paid ou PAID_TASKS_ENABLED=true)" });
  } else {
    checks.push(
      await run(
        "MPS",
        async () => {
          const response = await fetch(`${cfg.mpsUrl}/api/v1/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
          const body = (await response.json()) as { status?: string; data?: { status?: string } };
          return body.status === "success" && body.data?.status === "ok"
            ? { status: "ok", detail: cfg.mpsUrl }
            : { status: "fail", detail: `HTTP ${response.status}` };
        },
        "démarrer MPS (docs/MPS-SETUP.md) et vérifier MPS_URL",
      ),
    );
    checks.push(
      await run(
        "enregistrement Masumi",
        async () => {
          const registration = loadRegistration(cfg.dataDir);
          if (!registration) return { status: "fail", detail: "aucun état d'enregistrement", fix: "npm run registration -- key, puis register" };
          if (registration.registrationState !== "RegistrationConfirmed" || !registration.agentIdentifier) {
            return { status: "fail", detail: `état ${registration.registrationState ?? "inconnu"}`, fix: "npm run registration -- status (attendre RegistrationConfirmed)" };
          }
          if (!registration.sellerAddress) return { status: "warn", detail: "adresse vendeur absente : la preuve de collecte échouera" };
          return { status: "ok", detail: `agent ${registration.agentIdentifier.slice(0, 16)}…, vendeur ${registration.sellerAddress.slice(0, 16)}…` };
        },
      ),
    );
    checks.push(
      await run(
        "clé MPS limitée",
        async () => {
          const token = requireSavedRuntimeToken(runtimeTokenPath(cfg.dataDir));
          await withTimeout(createMps(cfg.mpsUrl, () => token).get("/payment-source?take=1"));
          return { status: "ok", detail: "lecture autorisée" };
        },
        "npm run registration -- key (avec MPS_ADMIN_KEY, une seule fois)",
      ),
    );
    checks.push(
      await run(
        "Blockfrost Preprod",
        async () => {
          if (!cfg.blockfrostKey) return { status: "fail", detail: "BLOCKFROST_API_KEY_PREPROD absente" };
          const response = await fetch("https://cardano-preprod.blockfrost.io/api/v0/", {
            headers: { project_id: cfg.blockfrostKey },
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          return response.ok ? { status: "ok", detail: "clé acceptée" } : { status: "fail", detail: `HTTP ${response.status}` };
        },
        "projet gratuit sur blockfrost.io (réseau Cardano Preprod), clé dans .env.local",
      ),
    );
  }
}

for (const check of checks) {
  console.log(`${ICON[check.status]} ${check.name.padEnd(24)} ${check.detail}`);
  if (check.status === "fail" && check.fix) console.log(`   → ${check.fix}`);
}
const failed = checks.filter((check) => check.status === "fail").length;
console.log(failed ? `\n${failed} point(s) bloquant(s).` : `\nPrêt${paidMode ? " pour une Task payée" : ""}.`);
process.exitCode = failed ? 1 : 0;
