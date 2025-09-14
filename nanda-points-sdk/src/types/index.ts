// ===== CORE TYPES =====

export interface Agent {
  _id: string;
  did: string;
  name: string;
  status: 'active' | 'suspended' | 'expired';
  primaryFactsUrl?: string;
  payments?: {
    np?: {
      walletId?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  _id: string;
  agentDid: string;
  balance: number;
  status: 'active' | 'suspended' | 'closed';
  type: 'user' | 'treasury' | 'fee_pool' | 'escrow';
  currency: string;
  scale: number;
  limits?: {
    dailySpend?: number;
    allowOverdraft?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  type: 'mint' | 'burn' | 'transfer' | 'earn' | 'spend' | 'hold' | 'capture' | 'refund' | 'reversal';
  status: 'posted' | 'pending' | 'failed';
  amountValue: number;
  sourceWalletId?: string;
  destWalletId?: string;
  reasonCode: string;
  actor?: {
    type: 'agent' | 'system';
    did?: string;
    walletId?: string;
  };
  facts?: {
    from?: {
      did: string;
      walletId: string;
    };
    to?: {
      did: string;
      walletId: string;
    };
  };
  metadata?: {
    invoiceId?: string;
    invoiceNumber?: string;
    [key: string]: any;
  };
  links?: {
    invoiceId?: string;
    settlementId?: string;
    reputationJobId?: string;
    reputationHash?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'expired';
  amount: {
    currency: string;
    scale: number;
    value: number;
  };
  issuer: {
    did: string;
    walletId: string;
  };
  recipient: {
    did: string;
    walletId?: string;
  };
  paymentTerms?: {
    dueDate?: string;
    acceptPartial?: boolean;
    minAmount?: number;
    allowOverpayment?: boolean;
    maxAmount?: number;
  };
  transactions?: Array<{
    txId: string;
    amount: number;
    timestamp: string;
  }>;
  metadata?: {
    memo?: string;
    description?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    tags?: string[];
    externalRef?: string;
  };
  issuedAt?: string;
  paidAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== REQUEST TYPES =====

export interface AgentRequest {
  did: string;
  name: string;
  primaryFactsUrl?: string;
}

export interface WalletRequest {
  did: string;
  type?: 'user' | 'treasury' | 'fee_pool' | 'escrow';
  labels?: string[];
}

export interface TransactionRequest {
  type: string;
  sourceWalletId?: string;
  destWalletId?: string;
  amountValue: number;
  reasonCode: string;
  idempotencyKey: string;
  actor?: {
    type: 'agent' | 'system';
    did?: string;
    walletId?: string;
  };
  facts?: any;
  metadata?: any;
  reputationHash?: string;
}

export interface InvoiceRequest {
  amount: {
    value: number;
    currency?: string;
    scale?: number;
  };
  issuer: {
    did: string;
    walletId: string;
  };
  recipient: {
    did: string;
    walletId?: string;
  };
  paymentTerms?: {
    dueDate?: string;
    acceptPartial?: boolean;
    minAmount?: number;
    allowOverpayment?: boolean;
    maxAmount?: number;
  };
  metadata?: {
    memo?: string;
    description?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    tags?: string[];
    externalRef?: string;
  };
}

// ===== REPUTATION TYPES =====

export interface ReputationScore {
  agentDid: string;
  score: number;
  timestamp: string;
  source: string;
}

export interface ReputationResponse {
  transactionType: string;
  amount: number;
  minimumReputationScore: number;
  description: string;
}

// ===== ERROR TYPES =====

export interface NandaError {
  code: string;
  message: string;
  details?: any;
}

export class NandaPointsError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'NandaPointsError';
    this.code = code;
    this.details = details;
  }
}

// ===== CONFIGURATION TYPES =====

export interface SDKConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface TransactionOptions {
  reasonCode?: string;
  idempotencyKey?: string;
  metadata?: any;
}

export interface ReputationOptions {
  reputationHash?: string;
  actorDid?: string;
}

// ===== AGENT REPUTATION TYPES =====

export interface ReputationScoreResponse {
  success: boolean;
  data: {
    agentDid: string;
    reputation_score: number;
    timestamp: string;
    source: string;
    lastUpdated: string;
    transactionCount: number;
    reputationLevel: string;
    requirements: {
      transfer: { minScore: number; eligible: boolean };
      earn: { minScore: number; eligible: boolean };
      spend: { minScore: number; eligible: boolean };
      mint: { minScore: number; eligible: boolean };
      burn: { minScore: number; eligible: boolean };
      hold: { minScore: number; eligible: boolean };
      capture: { minScore: number; eligible: boolean };
      refund: { minScore: number; eligible: boolean };
      reversal: { minScore: number; eligible: boolean };
    };
    metrics: {
      totalTransactions: number;
      successfulTransactions: number;
      failedTransactions: number;
      totalVolume: number;
      averageTransactionValue: number;
      lastTransactionDate: string;
      accountAge: number;
    };
  };
}

export interface ReputationVerificationResponse {
  success: boolean;
  data: {
    agentDid: string;
    reputationScore: ReputationScore;
    isValid: boolean;
    verifiedAt: string;
  };
}
