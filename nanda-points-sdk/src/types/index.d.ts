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
export interface NandaError {
    code: string;
    message: string;
    details?: any;
}
export declare class NandaPointsError extends Error {
    code: string;
    details?: any;
    constructor(message: string, code: string, details?: any);
}
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
//# sourceMappingURL=index.d.ts.map