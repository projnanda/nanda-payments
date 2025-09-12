import mongoose, { Schema, InferSchemaType } from "mongoose";
import { NP_CURRENCY, NP_SCALE } from "./constants.js";

const PaymentsSchema = new Schema(
  {
    walletId: { type: String },               // <-- no `unique: true` here
    scale: { type: Number, default: NP_SCALE },
    receiveEndpoint: { type: String },
    invoiceEndpoint: { type: String },
    eventsWebhook: { type: String },          // Keep it simple as a string URL
    accepts: [{ type: String }],
    minAmount: { type: Number },
    ttl: { type: Number },
    walletProofVerified: { type: Boolean, default: false }
  },
  { _id: false }
);

const AgentsSchema = new Schema({
  did: { type: String, required: true, unique: true, index: true },
  agentName: { type: String },
  label: { type: String },
  primaryFactsUrl: { type: String },

  facts: {
    factsDigest: { type: String },
    factsFetchedAt: { type: Date },
    factsTtlSec: { type: Number },
    provider: {
      name: String,
      url: String,
      did: String
    },
    endpoints: {
      static: [{ type: String }],
      adaptiveResolver: {
        url: String,
        policies: [{ type: Schema.Types.Mixed }]
      }
    },
    certification: {
      level: String,
      issuer: String,
      issuanceDate: String,
      expirationDate: String,
      vcStatusUrl: String
    }
  },

  payments: {
    np: { type: PaymentsSchema, required: false }
  },

  status: { type: String, enum: ["active","suspended","expired"], default: "active" },

  issuancePolicy: {
    welcomeGrant: { enabled: { type: Boolean, default: true }, amount: { type: Number, default: 100000 } },
    faucet: { enabled: { type: Boolean, default: false }, cooldownSec: { type: Number, default: 86400 }, lifetimeCap: { type: Number, default: 300000 } },
    taskOnly: { type: Boolean, default: false }
  }

}, { timestamps: true });

// AgentsSchema.index({ "payments.np.walletId": 1 }, { unique: false, sparse: false });

export type AgentDoc = InferSchemaType<typeof AgentsSchema>;
export const AgentModel = mongoose.model<AgentDoc>("agents", AgentsSchema);
