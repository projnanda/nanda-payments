import mongoose, { Schema } from "mongoose";
const IdemSchema = new Schema({
    key: { type: String, required: true, unique: true, index: true },
    txId: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date(), expires: 60 * 60 * 24 } // 24h TTL
});
export const IdemModel = mongoose.model("idempotency_keys", IdemSchema);
