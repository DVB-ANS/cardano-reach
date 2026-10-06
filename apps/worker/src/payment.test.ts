import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Brief } from "../../../packages/contract/src/index.ts";
import { taskHash } from "./hash.ts";
import type { Mps } from "./mps.ts";
import { type MpsPayment, type PaidState, USDM, confirmedState, createPaidFlow, purchasePayload } from "./payment.ts";
import type { Registration } from "./registration.ts";
import type { Journal, PaidHooks } from "./runner.ts";
import type { CoreClient } from "./sokosumi.ts";

const NOW = Date.parse("2026-10-07T10:00:00.000Z");
const MINUTE = 60_000;
const registration: Registration = {
  walletId: "seller-wallet",
  sourceId: "source",
  supportedPaymentSourceIndex: 0,
  agentIdentifier: "a".repeat(80),
  sellerAddress: "addr_test1seller",
};
const brief: Brief = { mode: "sourcing", niche: "aero-spatial", need: "fixations titane", zone: "Europe", volume: null, constraints: [], language: "fr", assumptions: [] };

function payment(overrides: Partial<MpsPayment> = {}): MpsPayment {
  return {
    sellerReturnAddress: null,
    forceLayer: null,
    PaymentSource: { network: "Preprod", paymentSourceType: "Web3CardanoV2", smartContractAddress: "addr_test1contract", policyId: "p".repeat(56) },
    SmartContractWallet: { id: "seller-wallet", walletVkey: "v".repeat(56) },
    RequestedFunds: [{ amount: "1000000", unit: USDM }],
    agentIdentifier: registration.agentIdentifier,
    blockchainIdentifier: "signed",
    inputHash: taskHash("Trouve-moi un usineur titane"),
    payByTime: String(NOW + 5 * MINUTE),
    submitResultTime: String(NOW + 30 * MINUTE),
    unlockTime: String(NOW + 46 * MINUTE),
    externalDisputeUnlockTime: String(NOW + 62 * MINUTE),
    ...overrides,
  };
}

const locked = (extra: Partial<MpsPayment> = {}) =>
  payment({ onChainState: "FundsLocked", CurrentTransaction: { status: "Confirmed", newOnChainState: "FundsLocked" }, ...extra });

function harness(options: { observed?: () => MpsPayment; now?: number; corePost?: (path: string, body: unknown) => unknown } = {}) {
  const posts: { path: string; body: Record<string, unknown> }[] = [];
  const mpsCalls: { path: string; body: unknown }[] = [];
  let researches = 0;
  const core: CoreClient = {
    get: async () => ({ data: { settled: true, txHash: "tx1", blockchainIdentifier: "signed" } }),
    post: async (path, body) => {
      posts.push({ path, body: body as Record<string, unknown> });
      return options.corePost ? options.corePost(path, body) : { data: { id: `event-${posts.length}` } };
    },
  };
  const mps: Mps = {
    get: async () => ({}),
    post: async (path, body) => {
      mpsCalls.push({ path, body });
      if (path === "/payment") return payment();
      if (path === "/payment/submit-result") return {};
      return (options.observed ?? (() => payment()))();
    },
  };
  const flow = createPaidFlow({ core, mps, registration: () => registration, blockfrostKey: "bf", now: () => options.now ?? NOW });
  const dir = mkdtempSync(join(tmpdir(), "reach-pay-"));
  let saved: Journal | undefined;
  const hooks: PaidHooks = {
    save: (journal) => {
      saved = journal;
      return journal;
    },
    research: async () => {
      researches++;
      return { session: { sessionId: "s", streamIndex: 1 }, report: "\n# 🎯 Richard — rapport\n\n| ok |\n" };
    },
    resultPath: (taskId) => join(dir, `${taskId}.md`),
  };
  const journal = (paid?: PaidState): Journal => ({
    taskId: "task-1",
    phase: "brief-ready",
    input: "Trouve-moi un usineur titane",
    brief,
    questions: 0,
    attempts: 0,
    comments: {},
    ...(paid ? { paid } : {}),
  });
  return { flow, hooks, journal, posts, mpsCalls, researches: () => researches, saved: () => saved };
}

const stage = (j: Journal) => (j.paid as PaidState | undefined)?.stage;

test("champs signés repris tels quels, surcharges non transportables refusées", () => {
  const payload = purchasePayload(payment(), "0102030405060708", registration);
  assert.equal(payload.blockchainIdentifier, "signed");
  assert.equal(payload.unlockTime, payment().unlockTime);
  assert.equal(payload.identifierFromPurchaser, "0102030405060708");
  assert.throws(() => purchasePayload(payment({ forceLayer: "L1" }), "n", registration), /cannot preserve/);
  assert.throws(() => purchasePayload(payment({ sellerReturnAddress: "addr" }), "n", registration), /cannot preserve/);
  assert.throws(() => purchasePayload(payment({ SmartContractWallet: { id: "other" } }), "n", registration), /differs/);
  assert.throws(() => purchasePayload(payment({ RequestedFunds: [{ amount: "2000000", unit: USDM }] }), "n", registration), /1 test USDM/);
});

test("une transaction confirmée sans rapport ne prouve pas l'escrow", () => {
  assert.equal(confirmedState(payment({ CurrentTransaction: null, TransactionHistory: [{ status: "Confirmed", newOnChainState: "FundsLocked" }] }), "FundsLocked"), true);
  assert.equal(confirmedState(payment({ CurrentTransaction: { status: "Confirmed", newOnChainState: "Withdrawn" } }), "FundsLocked"), false);
});

test("parcours complet : devis → achat → escrow → recherche → hash soumis → complétion → collecte prouvée", async (t) => {
  let observed = payment();
  const h = harness({ observed: () => observed });

  let j = await h.flow.advance(h.journal(), h.hooks);
  assert.equal(stage(j), "terms-saved");
  const terms = h.mpsCalls[0]?.body as Record<string, unknown>;
  assert.equal(terms.inputHash, taskHash("Trouve-moi un usineur titane"));
  // MPS ne voit l'escrow qu'après 20 confirmations + un poll de 3 min (~10 min) : 5 min ont fait échouer la 1re Task payée.
  const payBy = Date.parse(String(terms.payByTime));
  assert.ok(payBy - NOW >= 15 * MINUTE, "payByTime laisse à MPS le temps de constater l'escrow");
  assert.ok(Date.parse(String(terms.submitResultTime)) - payBy >= 18 * MINUTE, "un escrow verrouillé au dernier moment laisse grâce + recherche");

  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "awaiting-escrow");
  assert.equal(h.posts[0]?.body.comment, "Payment requested: 1 test USDM.");
  assert.equal((h.posts[0]?.body.masumiPayment as Record<string, unknown>).blockchainIdentifier, "signed");

  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "awaiting-escrow");
  assert.equal(h.researches(), 0, "pas de modèle avant l'escrow confirmé");

  observed = locked();
  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "result-saved");
  const paid = j.paid as PaidState;
  assert.equal(paid.result, "# 🎯 Richard — rapport\n\n| ok |");
  assert.equal(paid.resultHash, taskHash("# 🎯 Richard — rapport\n\n| ok |"));
  assert.deepEqual(j.researchSession, { sessionId: "s", streamIndex: 1 });

  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "awaiting-result");
  assert.deepEqual(h.mpsCalls.at(-1), { path: "/payment/submit-result", body: { network: "Preprod", blockchainIdentifier: "signed", submitResultHash: paid.resultHash } });

  observed = payment({ onChainState: "ResultSubmitted", resultHash: paid.resultHash, CurrentTransaction: { status: "Confirmed", newOnChainState: "ResultSubmitted" } });
  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "complete-ready");

  j = await h.flow.advance(j, h.hooks);
  assert.equal(j.phase, "completed");
  assert.equal(stage(j), "awaiting-withdrawal");
  assert.deepEqual(h.posts.at(-1)?.body, { status: "COMPLETED", comment: paid.result });

  observed = payment({ onChainState: "Withdrawn", CurrentTransaction: { status: "Confirmed", newOnChainState: "Withdrawn", txHash: "tx1" } });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      inputs: [{ address: "addr_test1contract", amount: [{ unit: USDM, quantity: "1000000" }] }],
      outputs: [{ address: "addr_test1seller", amount: [{ unit: USDM, quantity: "950000" }] }],
    }),
  );
  j = await h.flow.advance(j, h.hooks);
  assert.equal(stage(j), "settled");
  assert.deepEqual((j.paid as PaidState).settlement, { verified: true, txHash: "tx1", netAtomicUnits: "950000" });
  assert.equal(h.researches(), 1);
});

test("un achat à l'issue inconnue n'est jamais reposté", async () => {
  const h = harness();
  const j = await h.flow.advance(h.journal({ stage: "purchase-pending", nonce: "n", payment: payment() }), h.hooks);
  assert.equal(j.phase, "inspection-required");
  assert.equal(h.posts.length, 0);
});

test("échéance trop proche au verrouillage : pas de recherche, Task en échec, escrow remboursé", async () => {
  const h = harness({ observed: () => locked(), now: NOW + 25 * MINUTE });
  const j = await h.flow.advance(h.journal({ stage: "awaiting-escrow", nonce: "n", payment: payment() }), h.hooks);
  assert.equal(j.phase, "failed");
  assert.equal(h.researches(), 0);
  assert.equal(h.posts.at(-1)?.body.status, "FAILED");
});

test("escrow jugé invalide par MPS après payByTime : Task en échec au lieu d'attendre indéfiniment", async () => {
  const h = harness({ observed: () => payment({ onChainState: "FundsOrDatumInvalid" }), now: NOW + 16 * MINUTE });
  const j = await h.flow.advance(h.journal({ stage: "awaiting-escrow", nonce: "n", payment: payment() }), h.hooks);
  assert.equal(j.phase, "failed");
  assert.equal(h.researches(), 0);
  assert.equal(h.posts.at(-1)?.body.status, "FAILED");
  assert.match(String(h.posts.at(-1)?.body.comment), /non confirmé par le nœud/);
});

test("des conditions expirées avant l'achat sont renégociées", async () => {
  const h = harness({ now: NOW + 6 * MINUTE });
  const j = await h.flow.advance(h.journal({ stage: "terms-saved", nonce: "n", payment: payment() }), h.hooks);
  assert.equal(j.paid, undefined);
  assert.equal(h.posts.length, 0);
});

test("un devis valide survit au refus du payload", async () => {
  const h = harness();
  const first = h.journal({ stage: "terms-saved", nonce: "n", payment: payment({ forceLayer: "L1" }) });
  await assert.rejects(() => h.flow.advance(first, h.hooks), /cannot preserve/);
  assert.equal(h.posts.length, 0);
});

test("une échéance MPS illisible bloque au lieu de désactiver les contrôles", async () => {
  const h = harness({ observed: () => locked({ submitResultTime: "pas-une-date" }) });
  const bad = h.journal({ stage: "awaiting-escrow", nonce: "n", payment: payment({ submitResultTime: "pas-une-date" }) });
  await assert.rejects(() => h.flow.advance(bad, h.hooks), /Invalid MPS deadline/);
  assert.equal(h.researches(), 0);
});
