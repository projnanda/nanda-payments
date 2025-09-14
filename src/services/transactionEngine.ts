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

// Reputation-enhanced transaction function
export async function createTransactionWithReputation(opts: {
  type: string;
  sourceWalletId: string | null;
  destWalletId: string | null;
  amountValue: number;
  reasonCode: string;
  idempotencyKey: string;
  actor?: { type?: "agent" | "system"; did?: string; walletId?: string };
  facts?: any;
  metadata?: any;
  reputationHash?: string;  // New field for reputation verification
  skipReputationCheck?: boolean;  // Option to skip reputation check for system transactions
}) {
  const { 
    type, sourceWalletId, destWalletId, amountValue, reasonCode, 
    idempotencyKey, actor, facts, metadata, reputationHash, skipReputationCheck 
  } = opts;
  
  if (amountValue <= 0) throw new Error("amount must be positive");

  const existing = await IdemModel.findOne({ key: idempotencyKey });
  if (existing) {
    const tx = await TransactionModel.findById(existing.txId);
    if (tx) return tx;
  }

  console.log(`[REPUTATION DEBUG] Starting transaction with reputation check:`, {
    type,
    actorType: actor?.type,
    actorDid: actor?.did,
    skipReputationCheck,
    hasReputationHash: !!reputationHash
  });

  // Import reputation service dynamically to avoid circular dependencies
  const { getReputationService, isReputationServiceReady } = await import('./reputationManager.js');
  const reputationService = getReputationService();
  const serviceReady = isReputationServiceReady();

  console.log(`[REPUTATION DEBUG] Reputation service status:`, {
    serviceExists: !!reputationService,
    serviceReady,
    actorType: actor?.type,
    actorDid: actor?.did,
    skipReputationCheck
  });

  // Reputation verification for agent transactions
  if (actor?.type === "agent" && actor.did && !skipReputationCheck) {
    if (!reputationService || !serviceReady) {
      const error: any = new Error("Reputation service not initialized. Please call /reputation/initialize first.");
      error.httpCode = 503; // Service Unavailable
      error.reputationError = true;
      console.error(`[REPUTATION ERROR] Service not initialized for agent transaction:`, actor.did);
      throw error;
    }

    try {
      const minRequiredScore = reputationService.getMinimumReputationRequirement(type, amountValue);
      console.log(`[REPUTATION DEBUG] Required score for ${type} (${amountValue}): ${minRequiredScore}`);
      
      const reputationResult = await reputationService.verifyTransactionReputation(
        { reputationHash },
        actor.did,
        minRequiredScore
      );

      console.log(`[REPUTATION DEBUG] Verification result:`, {
        isValid: reputationResult.isValid,
        error: reputationResult.error,
        score: reputationResult.reputationScore?.score
      });

      if (!reputationResult.isValid) {
        const error: any = new Error(`Reputation verification failed: ${reputationResult.error}`);
        error.httpCode = 403; // Forbidden
        error.reputationError = true;
        throw error;
      }

      // Log successful reputation verification
      if (reputationResult.reputationScore) {
        console.log(`[REPUTATION SUCCESS] Verified for ${actor.did}: score ${reputationResult.reputationScore.score} (required: ${minRequiredScore})`);
      }
    } catch (reputationError: any) {
      console.error(`[REPUTATION ERROR] Verification failed for ${actor.did}:`, reputationError.message);
      throw reputationError;
    }
  } else {
    console.log(`[REPUTATION DEBUG] Skipping reputation check:`, {
      reason: !actor?.type ? 'no actor type' : 
              !actor?.did ? 'no actor did' : 
              skipReputationCheck ? 'explicitly skipped' : 'not an agent transaction'
    });
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
    actor: actor || { type: "agent" },
    facts,
    postings,
    snapshots,
    links: {
      reputationHash: reputationHash || undefined
    },
    metadata
  });

  const transactionSuccessful = true; // Transaction was created successfully

  await IdemModel.create({ key: idempotencyKey, txId: tx._id.toString() });

  // Update reputation score after successful transaction
  if (reputationService && actor?.type === "agent" && actor.did && !skipReputationCheck) {
    try {
      // For now, we'll assume we have the current score from the verification step
      // In production, you'd fetch this from your reputation system
      const currentScore = 75; // This would come from your reputation system
      await reputationService.updateReputationAfterTransaction(
        tx._id.toString(),
        actor.did,
        transactionSuccessful,
        currentScore
      );
    } catch (reputationUpdateError) {
      // Log but don't fail the transaction if reputation update fails
      console.error('Failed to update reputation after transaction:', reputationUpdateError);
    }
  }

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
