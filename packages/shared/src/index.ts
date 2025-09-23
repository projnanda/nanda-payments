/**
 * x402 NANDA Points Shared Package
 * Common types and utilities for NANDA Points x402 implementation
 */

// Types
export type {
  PaymentRequirements,
  PaymentPayload,
  VerificationResponse,
  SettlementResponse,
  SupportedResponse,
  NPReceipt,
  NPAgent,
  NPWallet,
  NPTransaction,
  NPFacilitatorConfig,
  NPPaymentConfig,
  NPRoutesConfig,
  Resource,
  Network,
  Scheme,
} from "./types.js";

// Error classes
export { NPPaymentError, NPVerificationError, NPSettlementError } from "./types.js";

// NANDA Points scheme
export { nandaPoints, npUtils } from "./nanda-points-scheme.js";

// MongoDB utilities
export {
  connectToMongoDB,
  getAgentCollection,
  getWalletCollection,
  mongoUtils,
} from "./mongodb.js";

// Express middleware
export { npPaymentMiddleware, createNPFacilitatorClient } from "./middleware.js";
export type { NPFacilitatorClient } from "./middleware.js";
