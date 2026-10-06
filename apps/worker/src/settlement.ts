import type { CoreClient } from "./sokosumi.ts";

export interface Utxo {
  address: string;
  amount: { unit: string; quantity: string }[];
}

export interface Settlement {
  verified: boolean;
  txHash?: string;
  netAtomicUnits?: string;
  reason?: string;
}

export interface ObservedTx {
  status?: string;
  newOnChainState?: string;
  txHash?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

// Reçu net du vendeur : sorties moins entrées à son adresse (la monnaie rendue ne gonfle pas le montant).
export function sellerTokenNet(utxos: { inputs: Utxo[]; outputs: Utxo[] }, address: string, unit: string): bigint {
  const sum = (entries: Utxo[]) =>
    entries
      .filter((entry) => entry.address === address)
      .reduce((total, entry) => total + entry.amount.filter((a) => a.unit === unit).reduce((n, a) => n + BigInt(a.quantity), 0n), 0n);
  return sum(utxos.outputs) - sum(utxos.inputs);
}

// Une Task terminée ne prouve pas le paiement : reçu Core + retrait MPS confirmé + montant mesuré via Blockfrost.
export async function verifySettlement(options: {
  core: CoreClient;
  taskId: string;
  blockchainIdentifier: string;
  transactions: ObservedTx[];
  sellerAddress: string;
  unit: string;
  blockfrostKey: string | undefined;
}): Promise<Settlement> {
  const receipt = record(record(await options.core.get(`/v1/tasks/${encodeURIComponent(options.taskId)}/receipt`))?.data);
  const txHash = typeof receipt?.txHash === "string" ? receipt.txHash : undefined;
  if (receipt?.settled !== true || !txHash) return { verified: false, reason: "Core receipt not settled" };
  if (receipt.blockchainIdentifier !== options.blockchainIdentifier) throw new Error("Core receipt payment identifier mismatch");
  const tx = options.transactions.find(
    (t) => t.status === "Confirmed" && ["Withdrawn", "DisputedWithdrawn"].includes(t.newOnChainState ?? "") && t.txHash === txHash,
  );
  if (!tx) return { verified: false, txHash, reason: "Matching MPS withdrawal transaction not confirmed" };
  if (!options.blockfrostKey) return { verified: false, txHash, reason: "BLOCKFROST_API_KEY_PREPROD missing" };
  const response = await fetch(`https://cardano-preprod.blockfrost.io/api/v0/txs/${txHash}/utxos`, {
    headers: { project_id: options.blockfrostKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { verified: false, txHash, reason: `Blockfrost HTTP ${response.status}` };
  const net = sellerTokenNet((await response.json()) as { inputs: Utxo[]; outputs: Utxo[] }, options.sellerAddress, options.unit);
  return { verified: net > 0n, txHash, netAtomicUnits: net.toString() };
}
