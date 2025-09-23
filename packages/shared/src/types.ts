/**
 * x402 types adapted for NANDA Points
 */

// Core x402 types that we maintain compatibility with
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
  // ... other agent fields
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

// Configuration types
export interface NPFacilitatorConfig {
  mongoUri: string;
  dbName: string;
  baseUrl?: string;
}

export interface NPPaymentConfig {
  priceNP: number;
  recipient: string;
  description?: string;
  maxTimeoutSeconds?: number;
}

// Route configuration (adapted from x402-express)
export type NPRoutesConfig = {
  [route: string]: NPPaymentConfig;
};

export type Resource = string;
export type Network = "nanda-network";
export type Scheme = "nanda-points";

// Error types
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
