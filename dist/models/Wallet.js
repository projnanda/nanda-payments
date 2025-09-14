import mongoose, { Schema } from "mongoose";
import { NP_CURRENCY, NP_SCALE } from "./constants.js";
const WalletsSchema = new Schema({
    agentDid: { type: String, required: true, index: true },
    type: { type: String, enum: ["user", "treasury", "fee_pool", "escrow"], default: "user" },
    currency: { type: String, default: NP_CURRENCY },
    scale: { type: Number, default: NP_SCALE },
    balance: { type: Number, default: 0 },
    seq: { type: Number, default: 0 },
    limits: {
        dailySpend: { type: Number, default: 5_000_000 },
        maxSingleTx: { type: Number, default: 1_000_000 },
        allowOverdraft: { type: Boolean, default: false }
    },
    counters: {
        earnedToday: { type: Number, default: 0 },
        spentToday: { type: Number, default: 0 },
        windowStart: { type: Date, default: () => new Date(new Date().toDateString()) }
    },
    status: { type: String, enum: ["active", "suspended", "closed"], default: "active" },
    labels: [{ type: String }]
}, { timestamps: true });
WalletsSchema.index({ agentDid: 1, currency: 1 });
export const WalletModel = mongoose.model("wallets", WalletsSchema);
