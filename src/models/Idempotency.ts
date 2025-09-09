import mongoose, { Schema, InferSchemaType } from "mongoose";

const IdemSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  txId: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date(), expires: 60 * 60 * 24 } // 24h TTL
});

export type IdemDoc = InferSchemaType<typeof IdemSchema>;
export const IdemModel = mongoose.model<IdemDoc>("idempotency_keys", IdemSchema);
