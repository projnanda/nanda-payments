/**
 * Core x402 and NANDA Points types for the payments SDK
 */

// Core x402 types that maintain compatibility with the protocol
export interface PaymentRequirements {
  scheme: "nanda-points";
  network: "nanda-network";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string; // Agent name instead of blockchain address
  maxTimeoutSeconds: number;
  asset: "NP"; // NANDA Points
  outputSchema?: unknown;
  extra?: {
    facilitatorUrl?: string;
    [key: string]: unknown;
  };
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "nanda-points";
  network: "nanda-network";
  payTo: string; // Agent name
  amount: string; // NP amount
  from: string; // Paying agent name
  txId: string; // NP transaction ID
  timestamp: number;
  extra?: {
    [key: string]: unknown;
  };
}

export interface VerificationResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  amount?: string;
  txId?: string;
}

export interface SettlementResponse {
  success: boolean;
  txId: string;
  amount: string;
  from: string;
  to: string;
  timestamp: number;
  errorReason?: string;
  receipt?: NPReceipt;
}

export interface SupportedResponse {
  kinds: Array<{
    scheme: "nanda-points";
    network: "nanda-network";
    asset: "NP";
    extra?: {
      facilitatorUrl: string;
      [key: string]: unknown;
    };
  }>;
}

// NANDA Points specific types
export interface NPReceipt {
  txId: string;
  fromAgent: string;
  toAgent: string;
  amountMinor: number;
  amountPoints: number;
  timestamp: string;
  fromBalanceAfter: number;
  toBalanceAfter: number;
}

export interface NPAgent {
  agent_name: string;
  walletId: string;
  serviceCharge: number;
}

export interface NPWallet {
  walletId: string;
  agent_name: string;
  balanceMinor: number;
  currency: "NP";
  scale: 0;
  createdAt: string;
  updatedAt: string;
}

export interface NPTransaction {
  txId: string;
  fromAgent: string;
  toAgent: string;
  amountMinor: number;
  status: "completed" | "pending" | "failed";
  timestamp: string;
  description?: string;
}

// SDK Configuration types
export interface PaymentConfig {
  facilitatorUrl: string;
  agentName: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface ToolPaymentRequirement {
  amount: number;
  description?: string;
  recipient?: string;
  timeout?: number;
}

// Error classes
export class NPPaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "NPPaymentError";
  }
}

export class NPVerificationError extends NPPaymentError {
  constructor(message: string, details?: unknown) {
    super(message, "VERIFICATION_FAILED", details);
  }
}

export class NPSettlementError extends NPPaymentError {
  constructor(message: string, details?: unknown) {
    super(message, "SETTLEMENT_FAILED", details);
  }
}

export class NPNetworkError extends NPPaymentError {
  constructor(message: string, details?: unknown) {
    super(message, "NETWORK_ERROR", details);
  }
}

// Utility types
export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type PaymentStatus = "success" | "payment_required" | "error";