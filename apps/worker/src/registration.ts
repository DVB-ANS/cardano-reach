import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMps, requireSavedRuntimeToken } from "./mps.ts";
import { atomicWrite, readJson, writeJson } from "./store.ts";

// État d'enregistrement Masumi (IDs publics, pas de secret) ; le jeton MPS limité vit à part, en 0600.
export interface Registration {
  walletId: string;
  sourceId: string;
  supportedPaymentSourceIndex: number;
  sellerAddress?: string;
  sellerVkey?: string;
  agentIdentifier?: string;
  registrationId?: string;
  registrationState?: string;
  runtimeKeyId?: string;
  keyWritePending?: boolean;
  registrationWritePending?: boolean;
  request?: unknown;
}

export const registrationPath = (dataDir: string): string => join(dataDir, "registration-state.json");
export const runtimeTokenPath = (dataDir: string): string => join(dataDir, "mps-runtime.env");

export function loadRegistration(dataDir: string): Registration | undefined {
  return readJson(registrationPath(dataDir)) as Registration | undefined;
}

export function isPaidReady(dataDir: string): boolean {
  const registration = loadRegistration(dataDir);
  return registration?.registrationState === "RegistrationConfirmed" && !!registration.agentIdentifier && existsSync(runtimeTokenPath(dataDir));
}

export function registrationUrl(publicUrl: string | undefined, port = "21950"): string {
  if (publicUrl) {
    const url = new URL(publicUrl);
    if (url.protocol !== "https:" && url.hostname !== "127.0.0.1") throw new Error("AGENT_API_PUBLIC_URL must be https (or loopback)");
    return url.href.replace(/\/$/, "");
  }
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("AGENT_API_PORT must be an integer between 1 and 65535");
  return `http://127.0.0.1:${Number(port)}`;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function findById(value: unknown, id: string): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findById(item, id);
      if (found) return found;
    }
    return undefined;
  }
  const obj = record(value);
  if (!obj) return undefined;
  if (obj.id === id) return obj;
  for (const item of Object.values(obj)) {
    const found = findById(item, id);
    if (found) return found;
  }
  return undefined;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main(command: string | undefined): Promise<void> {
  const dataDir = process.env.WORKER_DATA_DIR?.trim() || ".local";
  const statePath = registrationPath(dataDir);
  let state: Registration = loadRegistration(dataDir) ?? {
    walletId: required("MPS_SELLING_WALLET_ID"),
    sourceId: required("MPS_PAYMENT_SOURCE_ID"),
    supportedPaymentSourceIndex: 0,
  };
  const save = () => writeJson(statePath, state);
  const admin = createMps(process.env.MPS_URL?.trim() || "http://127.0.0.1:3012", () => required("MPS_ADMIN_KEY"));

  if (command === "key") {
    // Clé de paiement limitée au wallet vendeur ; la clé admin ne sert qu'ici, jamais dans le worker.
    if (state.runtimeKeyId) {
      requireSavedRuntimeToken(runtimeTokenPath(dataDir));
      console.log(`Runtime key already saved ${state.runtimeKeyId}`);
      return;
    }
    if (state.keyWritePending) throw new Error("Previous key write uncertain; inspect API key records before retry");
    state = { ...state, keyWritePending: true };
    save();
    const key = record(
      await admin.post("/api-key", {
        usageLimited: "false",
        UsageCredits: [],
        NetworkLimit: ["Preprod"],
        ChainIdLimit: [],
        canRead: true,
        canPay: true,
        canAdmin: false,
        walletScopeEnabled: true,
        WalletScopeHotWalletIds: [state.walletId],
        x402WalletScopeEnabled: true,
        X402WalletScopeEvmWalletIds: [],
      }),
    );
    if (typeof key?.id !== "string") throw new Error("MPS returned no key id");
    state = { ...state, runtimeKeyId: key.id, keyWritePending: false };
    save();
    if (typeof key.token !== "string" || key.token.startsWith("*****")) throw new Error("Created key token was not revealed; key ID preserved");
    atomicWrite(runtimeTokenPath(dataDir), `MPS_RUNTIME_TOKEN=${key.token}\n`);
    console.log(`Runtime key created ${key.id}`);
    return;
  }

  if (command === "register") {
    if (state.registrationId) {
      console.log(`Registration already saved ${state.registrationId}`);
      return;
    }
    if (state.registrationWritePending) throw new Error("Previous registration write uncertain; inspect registry before retry");
    const wallet = record(await admin.get(`/wallet?walletType=Selling&id=${encodeURIComponent(state.walletId)}`));
    const source = findById(await admin.get("/payment-source?take=100"), state.sourceId);
    if (typeof wallet?.walletVkey !== "string" || typeof wallet.walletAddress !== "string" || typeof source?.smartContractAddress !== "string") {
      throw new Error("Dedicated selling wallet or payment source not found");
    }
    const body = {
      network: "Preprod",
      type: "Standard",
      sellingWalletVkey: wallet.walletVkey,
      supportedPaymentSources: [
        { chain: "Cardano", network: "Preprod", paymentSourceType: "Web3CardanoV2", address: source.smartContractAddress, pricing: { pricingType: "Dynamic" } },
      ],
      ExampleOutputs: [],
      Tags: ["sourcing", "leads", "b2b", "research"],
      name: "Richard",
      description: "Finds the right suppliers or clients and returns a sourced, dated B2B shortlist.",
      Capability: { name: process.env.REACH_MODEL?.trim() || "gpt-6.1-sol", version: "1" },
      Author: { name: "Richard" },
      apiBaseUrl: registrationUrl(process.env.AGENT_API_PUBLIC_URL?.trim(), process.env.AGENT_API_PORT?.trim() || undefined),
    };
    state = { ...state, registrationWritePending: true, request: body, sellerVkey: wallet.walletVkey, sellerAddress: wallet.walletAddress };
    save();
    const created = record(await admin.post("/registry", body));
    if (typeof created?.id !== "string") throw new Error("MPS returned no registration id");
    state = { ...state, registrationId: created.id, registrationWritePending: false };
    save();
    console.log(`Registration submitted ${created.id}`);
    return;
  }

  if (!state.registrationId) throw new Error("No registration yet: run `registration register` first");
  const found = findById(await admin.get("/registry?network=Preprod&filterPaymentSourceType=Web3CardanoV2&limit=100"), state.registrationId);
  state = {
    ...state,
    ...(typeof found?.agentIdentifier === "string" ? { agentIdentifier: found.agentIdentifier } : {}),
    ...(typeof found?.state === "string" ? { registrationState: found.state } : {}),
  };
  save();
  console.log(JSON.stringify({ id: state.registrationId, state: state.registrationState, agentIdentifier: state.agentIdentifier }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv[2]);
}
