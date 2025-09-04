import {
  WalletModel, TransactionModel, EventModel, IdemModel,
  NP_CURRENCY, NP_SCALE
} from "../models/index.js";
import { emit } from "../lib/eventBus.js";

export async function createTransaction(opts: {
  type: string;
  sourceWalletId: string | null;
  destWalletId: string | null;
  amountValue: number;
  reasonCode: string;
  idempotencyKey: string;
  actor?: { type?: "agent" | "system"; did?: string; walletId?: string };
  facts?: any;
  metadata?: any;
}) {
  const { type, sourceWalletId, destWalletId, amountValue, reasonCode, idempotencyKey, actor, facts, metadata } = opts;
  if (amountValue <= 0) throw new Error("amount must be positive");

  const existing = await IdemModel.findOne({ key: idempotencyKey });
  if (existing) {
    const tx = await TransactionModel.findById(existing.txId);
    if (tx) return tx;
  }

  // fetch wallets
  const src = sourceWalletId ? await WalletModel.findById(sourceWalletId) : null;
  const dst = destWalletId ? await WalletModel.findById(destWalletId) : null;

  // policy checks
  if ((type === "transfer" || type === "earn" || type === "spend") && (!src || !dst)) {
    throw new Error("sourceWalletId and destWalletId required");
  }
  if (src && src.status !== "active") throw new Error("source wallet not active");
  if (dst && dst.status !== "active") throw new Error("dest wallet not active");
  if (src && src.limits && !src.limits.allowOverdraft && src.balance < amountValue) {
    const err: any = new Error("insufficient funds");
    err.httpCode = 402;
    throw err;
  }

  // prepare postings
  const postings: any[] = [];
  if (type === "mint") {
    if (!dst) throw new Error("destWalletId required for mint");
    postings.push({ accountType: "treasury", accountId: "treasury", direction: "debit", value: amountValue });
    postings.push({ accountType: "wallet", accountId: dst._id.toString(), direction: "credit", value: amountValue });
  } else if (type === "burn") {
    if (!src) throw new Error("sourceWalletId required for burn");
    postings.push({ accountType: "wallet", accountId: src._id.toString(), direction: "debit", value: amountValue });
    postings.push({ accountType: "treasury", accountId: "sink:burn", direction: "credit", value: amountValue });
  } else {
    // transfer-like
    postings.push({ accountType: "wallet", accountId: src!._id.toString(), direction: "debit", value: amountValue });
    postings.push({ accountType: "wallet", accountId: dst!._id.toString(), direction: "credit", value: amountValue });
  }

  // update balances (best-effort, non-transactional pair)
  const snapshots: any[] = [];
  if (src) {
    const updated = await WalletModel.findOneAndUpdate(
      { _id: src._id, status: "active", balance: { $gte: (src.limits?.allowOverdraft ?? false) ? -1e15 : amountValue } },
      { $inc: { balance: -amountValue, seq: 1 } },
      { new: true }
    );
    if (!updated) {
      const err: any = new Error("insufficient funds or wallet not active");
      err.httpCode = 402;
      throw err;
    }
    snapshots.push({ walletId: updated._id.toString(), balanceAfter: updated.balance, seq: updated.seq });
  }
  if (dst) {
    const updated = await WalletModel.findOneAndUpdate(
      { _id: dst._id, status: "active" },
      { $inc: { balance: amountValue, seq: 1 } },
      { new: true }
    );
    if (!updated) throw new Error("dest wallet update failed");
    snapshots.push({ walletId: updated._id.toString(), balanceAfter: updated.balance, seq: updated.seq });
  }

  // write transaction
  const tx = await TransactionModel.create({
    type,
    status: "posted",
    amount: { currency: NP_CURRENCY, scale: NP_SCALE, value: amountValue },
    reasonCode,
    idempotencyKey,
    actor: actor ?? { type: "agent" },
    facts: { ttlSec: facts?.ttlSec, from: facts?.from, to: facts?.to },
    postings,
    snapshots,
    links: {},
    metadata
  });

  await IdemModel.create({ key: idempotencyKey, txId: tx._id.toString() });

  const ev = {
    type: "tx.posted",
    txId: tx._id.toString(),
    status: "posted",
    reasonCode,
    amount: { currency: NP_CURRENCY, scale: NP_SCALE, value: amountValue },
    from: src ? { did: actor?.did, walletId: src._id.toString() } : null,
    to: dst ? { did: facts?.to?.did, walletId: dst._id.toString() } : null,
    snapshots,
    createdAt: new Date().toISOString()
  };
  await EventModel.create({ type: "tx.posted", txId: tx._id.toString(), affectedWallets: snapshots.map(s => s.walletId), payload: ev });
  emit(ev);

  return tx;
}
