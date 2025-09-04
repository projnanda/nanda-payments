import mongoose, { Schema, InferSchemaType } from "mongoose";

const EventsSchema = new Schema({
  type: { type: String, enum: ["tx.posted","tx.pending","tx.failed","wallet.updated"], required: true },
  txId: { type: String },
  affectedWallets: [{ type: String }],
  payload: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date(), index: true }
});

export type EventDoc = InferSchemaType<typeof EventsSchema>;
export const EventModel = mongoose.model<EventDoc>("events", EventsSchema);
