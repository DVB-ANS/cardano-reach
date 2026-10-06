import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { join } from "node:path";
import { setInterval } from "node:timers";
import { loadConfig } from "./config.ts";
import { Agent } from "./eve.ts";
import { sha256, standardInputHash, standardResultHash } from "./hash.ts";
import { createMps, requireSavedRuntimeToken } from "./mps.ts";
import { DEADLINES_MIN, PRICE, USDM, asPayment, confirmedState } from "./payment.ts";
import { loadRegistration, runtimeTokenPath } from "./registration.ts";
import { atomicWrite, readJson, writeJson } from "./store.ts";

// API standard Masumi (MIP-003) : un autre agent achète une shortlist sans passer par Sokosumi.
interface Job {
  id: string;
  nonceKey: string;
  nonce: string;
  input: { prompt: string };
  inputHash: string;
  status: "awaiting_payment" | "running" | "completed" | "failed";
  phase: "payment-pending" | "waiting-payment" | "model-pending" | "submit-pending" | "awaiting-result" | "result-confirmed" | "deadline-blocked";
  blockchainIdentifier?: string;
  response?: Record<string, unknown>;
  result?: string;
  resultHash?: string;
}

const MINUTE = 60_000;
const MAX_PROMPT = 16_000;
const MIN_RESEARCH_MS = 8 * MINUTE;

const config = loadConfig();
const jobsDir = join(config.dataDir, "standard-jobs");
mkdirSync(jobsDir, { recursive: true, mode: 0o700 });
const mps = createMps(config.mpsUrl, () => requireSavedRuntimeToken(runtimeTokenPath(config.dataDir)));
const agent = new Agent(config);
const port = Number(process.env.AGENT_API_PORT || 21950);

const jobPath = (id: string) => join(jobsDir, `${id}.json`);
const save = (job: Job) => writeJson(jobPath(job.id), job);
const load = (id: string) => readJson(jobPath(id)) as Job | undefined;
const allJobs = () =>
  readdirSync(jobsDir)
    .filter((name) => /^[0-9a-f-]{36}\.json$/.test(name))
    .map((name) => load(name.slice(0, -5)))
    .filter((job): job is Job => !!job);

const schema = {
  input_data: [
    {
      id: "prompt",
      type: "string",
      name: "Brief",
      data: { description: "What you buy or sell, the niche and the zone. Reach returns a sourced, dated shortlist of companies." },
      validations: [
        { validation: "min", value: "1" },
        { validation: "max", value: String(MAX_PROMPT) },
      ],
    },
  ],
};

function respond(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/availability") return respond(res, 200, { status: "available", type: "masumi-agent" });
    if (req.method === "GET" && url.pathname === "/input_schema") return respond(res, 200, schema);
    if (req.method === "GET" && url.pathname === "/status") {
      const id = url.searchParams.get("job_id") ?? "";
      if (!/^[0-9a-f-]{36}$/.test(id)) return respond(res, 400, { error: "Invalid job_id" });
      const job = existsSync(jobPath(id)) ? load(id) : undefined;
      if (!job) return respond(res, 404, { error: "Job not found" });
      return respond(res, 200, { id, status: job.status, result: job.status === "completed" ? job.result : undefined });
    }
    if (req.method !== "POST" || url.pathname !== "/start_job") return respond(res, 404, { error: "Route not found" });

    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 20_000) return respond(res, 413, { error: "Request too large" });
    }
    const input = JSON.parse(body) as { identifier_from_purchaser?: unknown; identifierFromPurchaser?: unknown; input_data?: Record<string, unknown> };
    const nonce = input.identifier_from_purchaser ?? input.identifierFromPurchaser;
    const prompt = input.input_data?.prompt;
    if (
      typeof nonce !== "string" ||
      !/^[a-fA-F0-9]{14,26}$/.test(nonce) ||
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > MAX_PROMPT ||
      Object.keys(input.input_data ?? {}).some((key) => key !== "prompt")
    ) {
      return respond(res, 400, { error: "Expected hex purchaser nonce and input_data.prompt" });
    }
    const registration = loadRegistration(config.dataDir);
    if (registration?.registrationState !== "RegistrationConfirmed" || !registration.agentIdentifier) {
      return respond(res, 503, { error: "Registration not confirmed" });
    }

    // Persisté avant l'écriture de paiement : une issue inconnue se réinspecte, jamais rejouée automatiquement.
    const nonceKey = sha256(nonce);
    const existing = allJobs().find((job) => job.nonceKey === nonceKey);
    if (existing) {
      if (existing.inputHash !== standardInputHash({ prompt }, nonce)) return respond(res, 409, { error: "Nonce already used with another input" });
      return respond(res, existing.response ? 200 : 409, existing.response ?? { error: "Payment outcome requires inspection" });
    }
    const job: Job = {
      id: randomUUID(),
      nonceKey,
      nonce,
      input: { prompt },
      inputHash: standardInputHash({ prompt }, nonce),
      status: "awaiting_payment",
      phase: "payment-pending",
    };
    save(job);
    const now = Date.now();
    const at = (minutes: number) => new Date(now + minutes * MINUTE).toISOString();
    const payment = asPayment(
      await mps.post("/payment", {
        network: "Preprod",
        paymentSourceType: "Web3CardanoV2",
        supportedPaymentSourceIndex: registration.supportedPaymentSourceIndex,
        inputHash: job.inputHash,
        agentIdentifier: registration.agentIdentifier,
        identifierFromPurchaser: nonce,
        RequestedFunds: [{ unit: USDM, amount: PRICE }],
        payByTime: at(10),
        submitResultTime: at(DEADLINES_MIN.submitResult),
        unlockTime: at(DEADLINES_MIN.unlock),
        externalDisputeUnlockTime: at(DEADLINES_MIN.externalDisputeUnlock),
      }),
    );
    const response = {
      id: job.id,
      input_hash: job.inputHash,
      identifierFromPurchaser: nonce,
      blockchainIdentifier: payment.blockchainIdentifier,
      agentIdentifier: registration.agentIdentifier,
      sellerVKey: registration.sellerVkey,
      paymentSourceType: "Web3CardanoV2",
      supportedPaymentSourceIndex: registration.supportedPaymentSourceIndex,
      payByTime: Number(payment.payByTime),
      submitResultTime: Number(payment.submitResultTime),
      unlockTime: Number(payment.unlockTime),
      externalDisputeUnlockTime: Number(payment.externalDisputeUnlockTime),
    };
    save({ ...job, phase: "waiting-payment", blockchainIdentifier: payment.blockchainIdentifier, response });
    return respond(res, 200, response);
  } catch {
    return respond(res, 500, { error: "Request failed. Inspect the saved job state before retrying." });
  }
}).listen(port, "127.0.0.1", () => console.log(`Agent API listening on 127.0.0.1:${port}`));

let busy = false;
setInterval(async () => {
  if (busy) return;
  busy = true;
  try {
    for (const job of allJobs()) {
      if (job.phase !== "waiting-payment" && job.phase !== "awaiting-result") continue;
      try {
        const payment = asPayment(
          await mps.post("/payment/resolve-blockchain-identifier", { network: "Preprod", blockchainIdentifier: job.blockchainIdentifier, includeHistory: "true" }),
        );
        if (job.phase === "awaiting-result") {
          if (payment.onChainState === "ResultSubmitted" && payment.resultHash === job.resultHash && confirmedState(payment, "ResultSubmitted")) {
            save({ ...job, phase: "result-confirmed", status: "completed" });
          }
          continue;
        }
        if (payment.onChainState !== "FundsLocked" || !confirmedState(payment, "FundsLocked")) continue;
        if (Number(payment.submitResultTime) - Date.now() < MIN_RESEARCH_MS) {
          save({ ...job, phase: "deadline-blocked", status: "failed" });
          continue;
        }
        save({ ...job, phase: "model-pending", status: "running" });
        const result = await agent.autoReport(job.input.prompt);
        const resultHash = standardResultHash(result, job.nonce);
        atomicWrite(join(jobsDir, `${job.id}.md`), result);
        save({ ...job, phase: "submit-pending", status: "running", result, resultHash });
        if (Number(payment.submitResultTime) <= Date.now()) {
          save({ ...job, phase: "deadline-blocked", status: "failed", result, resultHash });
          continue;
        }
        await mps.post("/payment/submit-result", { network: "Preprod", blockchainIdentifier: payment.blockchainIdentifier, submitResultHash: resultHash });
        save({ ...job, phase: "awaiting-result", status: "running", result, resultHash });
      } catch {
        console.error(`Standard job needs inspection ${job.id}`);
      }
    }
  } finally {
    busy = false;
  }
}, 5_000);
