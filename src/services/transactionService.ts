import { randomUUID } from "crypto";
import { Wallets, Transactions, Receipts } from './database.js';
import { Txn, Receipt, MinorUnits } from '../models/index.js';

function nowIso() { return new Date().toISOString(); }

export async function transfer(fromAgent: string, toAgent: string, amountMinor: MinorUnits, task: string): Promise<{ tx: Txn; receipt: Receipt; payload: Receipt }> {
  const createdAt = nowIso();
  const txId = randomUUID();

  // 1. Ensure both wallets exist and check balance
  const fromWallet = await Wallets.findOne({ agent_name: fromAgent });
  const toWallet = await Wallets.findOne({ agent_name: toAgent });
  
  if (!fromWallet) throw new Error("SENDER_WALLET_NOT_FOUND");
  if (!toWallet) throw new Error("RECEIVER_WALLET_NOT_FOUND");
  if (fromWallet.balanceMinor < amountMinor) throw new Error("INSUFFICIENT_FUNDS");

  // 2. Deduct from sender's wallet
  const updatedFromWallet = await Wallets.findOneAndUpdate(
    { agent_name: fromAgent },
    { $inc: { balanceMinor: -amountMinor }, $set: { updatedAt: nowIso() } },
    { returnDocument: "after" }
  );
  if (!updatedFromWallet) throw new Error("FAILED_TO_UPDATE_SENDER_WALLET");

  // 3. Add to receiver's wallet
  const updatedToWallet = await Wallets.findOneAndUpdate(
    { agent_name: toAgent },
    { $inc: { balanceMinor: amountMinor }, $set: { updatedAt: nowIso() } },
    { returnDocument: "after" }
  );
  if (!updatedToWallet) throw new Error("FAILED_TO_UPDATE_RECEIVER_WALLET");

  // 4. Record transaction
  const tx: Txn = {
    txId,
    fromAgent,
    toAgent,
    amountMinor,
    currency: "NP",
    scale: 0,
    createdAt,
    status: "completed",
    error: null,
    task,
  };
  await Transactions.insertOne(tx);

  // 5. Create receipt
  const receipt: Receipt = {
    txId,
    issuedAt: nowIso(),
    fromAgent,
    toAgent,
    amountMinor,
    fromBalanceAfter: updatedFromWallet.balanceMinor,
    toBalanceAfter: updatedToWallet.balanceMinor,
  };
  await Receipts.insertOne(receipt);

  return { tx, receipt, payload: receipt };
}
