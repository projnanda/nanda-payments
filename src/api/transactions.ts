import { Router } from "express";
import { z } from "zod";
import { TransactionModel, IdemModel, NP_CURRENCY, NP_SCALE } from "../models/index.js";
import { createTransaction } from "../services/transactionEngine.js";

export const transactions = Router();

transactions.post("/transactions", async (req, res) => {
  const schema = z.object({
    type: z.enum(["mint","burn","transfer","earn","spend","hold","capture","refund","reversal"]),
    sourceWalletId: z.string().nullable().optional(),
    destWalletId: z.string().nullable().optional(),
    amount: z.object({ currency: z.string().default(NP_CURRENCY), scale: z.number().default(NP_SCALE), value: z.number().int().positive() }),
    reasonCode: z.string(),
    idempotencyKey: z.string(),
    actor: z.object({ type: z.enum(["agent","system"]).default("agent"), did: z.string().optional(), walletId: z.string().optional() }).optional(),
    facts: z.object({
      ttlSec: z.number().optional(),
      from: z.object({ did: z.string().optional(), primaryFactsUrl: z.string().optional(), vcStatusUrl: z.string().optional(), factsDigest: z.string().optional(), eventsWebhook: z.string().optional(), endpointClass: z.enum(["static","adaptive","rotating"]).optional() }).optional(),
      to: z.object({ did: z.string().optional(), primaryFactsUrl: z.string().optional(), vcStatusUrl: z.string().optional(), factsDigest: z.string().optional(), eventsWebhook: z.string().optional(), endpointClass: z.enum(["static","adaptive","rotating"]).optional() }).optional()
    }).optional(),
    metadata: z.any().optional()
  });

  try {
    const body = schema.parse(req.body);
    const existing = await IdemModel.findOne({ key: body.idempotencyKey });
    if (existing) {
      const tx = await TransactionModel.findById(existing.txId);
      return res.status(200).json(tx);
    }
    const tx = await createTransaction({
      type: body.type,
      sourceWalletId: body.sourceWalletId ?? null,
      destWalletId: body.destWalletId ?? null,
      amountValue: body.amount.value,
      reasonCode: body.reasonCode,
      actor: body.actor,
      idempotencyKey: body.idempotencyKey,
      facts: body.facts,
      metadata: body.metadata
    });
    res.status(201).json(tx);
  } catch (e: any) {
    const code = e?.httpCode || 400;
    res.status(code).json({ error: { code: "VALIDATION_ERROR", message: e?.message ?? "Invalid request" } });
  }
});

transactions.get("/transactions/:txId", async (req, res) => {
  const tx = await TransactionModel.findById(req.params.txId);
  if (!tx) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction not found" } });
  res.json(tx);
});

transactions.get("/transactions", async (req, res) => {
  const { walletId, limit = "50", after } = req.query as any;
  const filter: any = {};
  if (walletId) filter["postings.accountId"] = walletId;
  if (after) filter["_id"] = { $lt: after };
  const txs = await TransactionModel.find(filter).sort({ _id: -1 }).limit(parseInt(limit, 10));
  res.json(txs);
});
