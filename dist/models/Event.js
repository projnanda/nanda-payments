import mongoose, { Schema } from "mongoose";
const EventsSchema = new Schema({
    type: {
        type: String,
        enum: [
            "tx.posted",
            "tx.pending",
            "tx.failed",
            "wallet.updated",
            "invoice.created",
            "invoice.issued",
            "invoice.paid",
            "invoice.cancelled",
            "reputation.verified",
            "reputation.failed"
        ],
        required: true,
        index: true
    },
    txId: { type: String, index: true },
    invoiceId: { type: String, index: true },
    affectedWallets: [{ type: String }],
    affectedAgents: [{ type: String }], // DIDs of affected agents
    payload: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "success"
    },
    webhookStatus: {
        delivered: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        lastAttempt: Date,
        nextAttempt: Date,
        error: String
    },
    createdAt: { type: Date, default: () => new Date(), index: true }
});
export const EventModel = mongoose.model("events", EventsSchema);
