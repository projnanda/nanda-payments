import mongoose, { Schema, InferSchemaType } from "mongoose";
import { NP_CURRENCY, NP_SCALE } from "./constants.js";

const PostingSchema = new Schema({
  accountType: { type: String, enum: ["wallet","treasury","fee_pool","escrow"], required: true },
  accountId: { type: String, required: true },
  direction: { type: String, enum: ["debit","credit"], required: true },
  value: { type: Number, required: true }
}, { _id: false });

const SnapshotSchema = new Schema({
  walletId: { type: String, required: true },
  balanceAfter: { type: Number, required: true },
  seq: { type: Number, required: true }
}, { _id: false });

const FactsPartySchema = new Schema({
  did: String,
  primaryFactsUrl: String,
  vcStatusUrl: String,
  factsDigest: String,
  eventsWebhook: String,
  endpointClass: { type: String, enum: ["static","adaptive","rotating"], default: "static" }
}, { _id: false });

const TransactionsSchema = new Schema({
  type: { type: String, enum: ["mint","burn","transfer","earn","spend","hold","capture","refund","reversal"], required: true },
  status: { type: String, enum: ["pending","posted","failed","reversed"], default: "posted" },
  amount: {
    currency: { type: String, default: NP_CURRENCY },
    scale: { type: Number, default: NP_SCALE },
    value: { type: Number, required: true }
  },
  reasonCode: { type: String, required: true },
  idempotencyKey: { type: String, required: true, index: true },

  actor: {
    type: { type: String, enum: ["agent","system"], default: "agent" },
    did: { type: String },
    walletId: { type: String }
  },

  facts: {
    ttlSec: Number,
    from: { type: FactsPartySchema },
    to: { type: FactsPartySchema }
  },

  postings: { type: [PostingSchema], required: true },
  snapshots: { type: [SnapshotSchema], required: true },

  links: {
    invoiceId: String,
    settlementId: String,
    reputationJobId: String
  },

  metadata: {
    memo: String,
    tags: [{ type: String }],
    client: { sdk: String, version: String },
    onchainHash: String
  }
}, { timestamps: { createdAt: "createdAt", updatedAt: "postedAt" } });

TransactionsSchema.index({ createdAt: -1 });
TransactionsSchema.index({ "postings.accountId": 1 });

export type TransactionDoc = InferSchemaType<typeof TransactionsSchema>;
export const TransactionModel = mongoose.model<TransactionDoc>("transactions", TransactionsSchema);
