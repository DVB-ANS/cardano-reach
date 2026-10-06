import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { taskHash } from "./hash.ts";
import { log } from "./log.ts";
import type { Mps } from "./mps.ts";
import type { Registration } from "./registration.ts";
import type { Journal, PaidFlow, PaidHooks } from "./runner.ts";
import { type ObservedTx, type Settlement, verifySettlement } from "./settlement.ts";
import type { CoreClient } from "./sokosumi.ts";

export const USDM = "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d";
export const PRICE = "1000000";
const MINUTE = 60_000;
// Écarts de 15 min minimum imposés par MPS ; +30 min laissent la place à une recherche de quelques minutes.
export const DEADLINES_MIN = { payBy: 5, submitResult: 30, unlock: 46, externalDisputeUnlock: 62 } as const;
export const MIN_RESEARCH_MS = 8 * MINUTE;
const ESCROW_GRACE_MS = 10 * MINUTE;
const DEADLINE_COMMENT = "Délai de paiement dépassé : aucun résultat n'est soumis, l'escrow sera remboursé.";
const ESCROW_COMMENT = "Paiement non reçu dans les délais : la Task est abandonnée sans frais.";

export type PaidStage =
  | "terms-pending"
  | "terms-saved"
  | "purchase-pending"
  | "awaiting-escrow"
  | "model-pending"
  | "result-saved"
  | "submit-pending"
  | "awaiting-result"
  | "complete-ready"
  | "complete-pending"
  | "awaiting-withdrawal"
  | "settled";

export interface MpsPayment {
  blockchainIdentifier: string;
  agentIdentifier?: string;
  inputHash?: string;
  payByTime: string;
  submitResultTime: string;
  unlockTime: string;
  externalDisputeUnlockTime: string;
  sellerReturnAddress?: string | null;
  forceLayer?: string | null;
  PaymentSource?: { network?: string; paymentSourceType?: string; smartContractAddress?: string; policyId?: string };
  SmartContractWallet?: { id?: string; walletVkey?: string };
  RequestedFunds: { amount: string; unit: string }[];
  onChainState?: string;
  resultHash?: string;
  CurrentTransaction?: ObservedTx | null;
  TransactionHistory?: ObservedTx[];
}

export interface PaidState {
  stage: PaidStage;
  nonce?: string;
  payment?: MpsPayment;
  payload?: Record<string, unknown>;
  eventId?: string;
  observed?: MpsPayment;
  result?: string;
  resultHash?: string;
  completionEventId?: string;
  settlement?: Settlement;
}

export function asPayment(value: unknown): MpsPayment {
  const raw = typeof value === "object" && value !== null ? (value as Partial<MpsPayment>) : undefined;
  if (typeof raw?.blockchainIdentifier !== "string" || typeof raw.submitResultTime !== "string" || !Array.isArray(raw.RequestedFunds)) {
    throw new Error("Invalid MPS payment payload");
  }
  return raw as MpsPayment;
}

export function confirmedState(payment: MpsPayment, expected: string): boolean {
  const current = payment.CurrentTransaction;
  if (current?.status === "Confirmed" && current.newOnChainState === expected) return true;
  return payment.TransactionHistory?.some((tx) => tx.status === "Confirmed" && tx.newOnChainState === expected) ?? false;
}

// Champs signés par MPS repris tels quels ; Core ne peut pas transporter sellerReturnAddress ni forceLayer non nuls.
export function purchasePayload(payment: MpsPayment, nonce: string, registration: Registration): Record<string, unknown> {
  if (payment.sellerReturnAddress !== null || (payment.forceLayer !== undefined && payment.forceLayer !== null)) {
    throw new Error("Core Task events cannot preserve non-null signed sellerReturnAddress or forceLayer");
  }
  if (payment.PaymentSource?.network !== "Preprod" || payment.PaymentSource.paymentSourceType !== "Web3CardanoV2") {
    throw new Error("Payment source is not Preprod Web3CardanoV2");
  }
  if (payment.SmartContractWallet?.id !== registration.walletId) throw new Error("Payment wallet differs from dedicated seller wallet");
  const funds = payment.RequestedFunds;
  if (funds.length !== 1 || funds[0]?.unit !== USDM || funds[0].amount !== PRICE) throw new Error("Signed quote differs from 1 test USDM");
  return {
    blockchainIdentifier: payment.blockchainIdentifier,
    agentIdentifier: payment.agentIdentifier,
    sellerVkey: payment.SmartContractWallet.walletVkey,
    submitResultTime: payment.submitResultTime,
    payByTime: payment.payByTime,
    unlockTime: payment.unlockTime,
    externalDisputeUnlockTime: payment.externalDisputeUnlockTime,
    inputHash: payment.inputHash,
    identifierFromPurchaser: nonce,
    paymentSourceType: "Web3CardanoV2",
    supportedPaymentSourceIndex: registration.supportedPaymentSourceIndex,
    Amounts: funds.map(({ amount, unit }) => ({ amount, unit })),
    PaymentSource: { network: "Preprod", smartContractAddress: payment.PaymentSource.smartContractAddress, policyId: payment.PaymentSource.policyId },
  };
}

export function termsRequest(input: string, nonce: string, registration: Registration, taskId: string, now: number): Record<string, unknown> {
  const at = (minutes: number) => new Date(now + minutes * MINUTE).toISOString();
  return {
    network: "Preprod",
    agentIdentifier: registration.agentIdentifier,
    paymentSourceType: "Web3CardanoV2",
    supportedPaymentSourceIndex: registration.supportedPaymentSourceIndex,
    inputHash: taskHash(input),
    identifierFromPurchaser: nonce,
    RequestedFunds: [{ amount: PRICE, unit: USDM }],
    payByTime: at(DEADLINES_MIN.payBy),
    submitResultTime: at(DEADLINES_MIN.submitResult),
    unlockTime: at(DEADLINES_MIN.unlock),
    externalDisputeUnlockTime: at(DEADLINES_MIN.externalDisputeUnlock),
    metadata: JSON.stringify({ taskId }),
  };
}

// Une échéance illisible ne doit jamais désactiver en silence les contrôles de délai.
function time(value: string | undefined): number {
  const ms = Number(value);
  if (!value || !Number.isFinite(ms)) throw new Error(`Invalid MPS deadline: ${String(value)}`);
  return ms;
}

export function createPaidFlow(options: {
  core: CoreClient;
  mps: Mps;
  registration: () => Registration;
  blockfrostKey: string | undefined;
  now?: () => number;
}): PaidFlow {
  const now = options.now ?? Date.now;

  async function fail(j: Journal, hooks: PaidHooks, comment: string, note: string): Promise<Journal> {
    await options.core.post(`/v1/tasks/${encodeURIComponent(j.taskId)}/events`, { status: "FAILED", comment }).catch(() => undefined);
    return hooks.save({ ...j, phase: "failed", note });
  }

  async function observe(p: PaidState): Promise<MpsPayment> {
    if (!p.payment) throw new Error("Paid state has no payment");
    return asPayment(
      await options.mps.post("/payment/resolve-blockchain-identifier", {
        network: "Preprod",
        blockchainIdentifier: p.payment.blockchainIdentifier,
        includeHistory: "true",
      }),
    );
  }

  async function research(j: Journal, p: PaidState, hooks: PaidHooks): Promise<Journal> {
    const deadline = time(p.payment?.submitResultTime);
    if (deadline - now() < MIN_RESEARCH_MS) return fail(j, hooks, DEADLINE_COMMENT, "not enough time before submitResultTime");
    if (!j.brief) return hooks.save({ ...j, phase: "inspection-required", note: "paid research without brief" });
    const pending = hooks.save({ ...j, paid: { ...p, stage: "model-pending" } });
    const outcome = await hooks.research(j.brief);
    // Le texte soumis (hash) et le texte de complétion doivent être octet pour octet identiques.
    const result = outcome.report.trim();
    writeFileSync(hooks.resultPath(j.taskId), result, { mode: 0o600 });
    return hooks.save({ ...pending, researchSession: outcome.session, paid: { ...p, stage: "result-saved", result, resultHash: taskHash(result) } });
  }

  async function advance(j: Journal, hooks: PaidHooks): Promise<Journal> {
    const p = (j.paid ?? undefined) as PaidState | undefined;
    const registration = options.registration();

    if (!p) {
      if (!j.input?.trim()) throw new Error("Paid Task requires authoritative started input");
      if (!registration.agentIdentifier) throw new Error("Registration has no agentIdentifier");
      const nonce = randomBytes(10).toString("hex");
      const body = termsRequest(j.input, nonce, registration, j.taskId, now());
      const pending = hooks.save({ ...j, paid: { stage: "terms-pending", nonce } satisfies PaidState });
      const payment = asPayment(await options.mps.post("/payment", body));
      return hooks.save({ ...pending, paid: { stage: "terms-saved", nonce, payment } satisfies PaidState });
    }

    switch (p.stage) {
      case "terms-saved": {
        if (!p.payment || !p.nonce) throw new Error("Saved terms are incomplete");
        const payload = purchasePayload(p.payment, p.nonce, registration);
        // Rien n'a encore été posté à Core : des conditions expirées se renégocient sans risque.
        if (now() >= time(p.payment.payByTime)) return hooks.save({ ...j, paid: undefined });
        const pending = hooks.save({ ...j, paid: { ...p, payload, stage: "purchase-pending" } });
        const response = await options.core.post(`/v1/tasks/${encodeURIComponent(j.taskId)}/events`, {
          comment: "Payment requested: 1 test USDM.",
          masumiPayment: payload,
        });
        const eventId = (response as { data?: { id?: unknown } } | undefined)?.data?.id;
        return hooks.save({ ...pending, paid: { ...p, payload, stage: "awaiting-escrow", ...(typeof eventId === "string" ? { eventId } : {}) } });
      }
      case "awaiting-escrow": {
        const observed = await observe(p);
        const next = hooks.save({ ...j, paid: { ...p, observed } });
        if (observed.onChainState !== "FundsLocked" || !confirmedState(observed, "FundsLocked")) {
          if (now() > time(p.payment?.payByTime) + ESCROW_GRACE_MS && !observed.onChainState) return fail(next, hooks, ESCROW_COMMENT, "escrow never locked");
          return next;
        }
        return research(next, { ...p, observed }, hooks);
      }
      case "model-pending":
        // Aucun effet externe pendant la recherche : on la relance si l'échéance le permet.
        return research(j, p, hooks);
      case "result-saved": {
        if (!p.payment || !p.resultHash) throw new Error("Saved result is incomplete");
        if (now() >= time(p.payment.submitResultTime)) return fail(j, hooks, DEADLINE_COMMENT, "result saved after submitResultTime");
        const pending = hooks.save({ ...j, paid: { ...p, stage: "submit-pending" } });
        await options.mps.post("/payment/submit-result", {
          network: "Preprod",
          blockchainIdentifier: p.payment.blockchainIdentifier,
          submitResultHash: p.resultHash,
        });
        return hooks.save({ ...pending, paid: { ...p, stage: "awaiting-result" } });
      }
      case "awaiting-result": {
        const observed = await observe(p);
        const submitted = observed.onChainState === "ResultSubmitted" && observed.resultHash === p.resultHash && confirmedState(observed, "ResultSubmitted");
        return hooks.save({ ...j, paid: { ...p, observed, stage: submitted ? "complete-ready" : "awaiting-result" } });
      }
      case "complete-ready": {
        const pending = hooks.save({ ...j, paid: { ...p, stage: "complete-pending" } });
        const response = await options.core.post(`/v1/tasks/${encodeURIComponent(j.taskId)}/events`, { status: "COMPLETED", comment: p.result });
        const eventId = (response as { data?: { id?: unknown } } | undefined)?.data?.id;
        log.info("paid task completed", { taskId: j.taskId, blockchainIdentifier: p.payment?.blockchainIdentifier ?? null });
        return hooks.save({
          ...pending,
          phase: "completed",
          paid: { ...p, stage: "awaiting-withdrawal", ...(typeof eventId === "string" ? { completionEventId: eventId } : {}) },
        });
      }
      case "awaiting-withdrawal": {
        const observed = await observe(p);
        if (!["Withdrawn", "DisputedWithdrawn"].includes(observed.onChainState ?? "")) return hooks.save({ ...j, paid: { ...p, observed } });
        const settlement = await verifySettlement({
          core: options.core,
          taskId: j.taskId,
          blockchainIdentifier: observed.blockchainIdentifier,
          transactions: [observed.CurrentTransaction, ...(observed.TransactionHistory ?? [])].filter((t): t is ObservedTx => !!t),
          sellerAddress: registration.sellerAddress ?? "",
          unit: USDM,
          blockfrostKey: options.blockfrostKey,
        });
        if (settlement.verified) log.info("payment settled", { taskId: j.taskId, txHash: settlement.txHash ?? null, netAtomicUnits: settlement.netAtomicUnits ?? null });
        return hooks.save({ ...j, paid: { ...p, observed, settlement, stage: settlement.verified ? "settled" : "awaiting-withdrawal" } });
      }
      case "settled":
        return j;
      default:
        // terms-pending, purchase-pending, submit-pending, complete-pending : issue inconnue, jamais rejouée.
        log.warn("task requires inspection", { taskId: j.taskId, stage: p.stage });
        return hooks.save({ ...j, phase: "inspection-required", note: `payment ${p.stage}` });
    }
  }

  return { advance };
}
