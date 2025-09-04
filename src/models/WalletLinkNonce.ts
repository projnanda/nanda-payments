

import mongoose, { Schema, InferSchemaType } from "mongoose";

const WalletLinkNonceSchema = new Schema({
  did: { type: String, required: true, index: true, unique: true },
  nonce: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date(), expires: 60 * 15 } // 15-minute TTL
});

export type WalletLinkNonceDoc = InferSchemaType<typeof WalletLinkNonceSchema>;
export const WalletLinkNonceModel = mongoose.model<WalletLinkNonceDoc>(
  "wallet_link_nonces",
  WalletLinkNonceSchema
);