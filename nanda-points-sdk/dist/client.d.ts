import { Agent, Wallet, Transaction, Invoice, ReputationResponse, InvoiceRequest, AgentRequest, ReputationScoreResponse, ReputationVerificationResponse } from './types';
export declare class NandaPointsSDK {
    private client;
    private baseUrl;
    constructor(baseUrl?: string, apiKey?: string);
    /**
     * Earn points for an agent
     * @param amount - Amount in minor units (e.g., 1000 = 1.000 NP)
     * @param walletId - Destination wallet ID
     * @param reasonCode - Reason for earning points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    earnPoints(amount: number, walletId: string, reasonCode?: string, idempotencyKey?: string): Promise<Transaction>;
    /**
     * Spend points from an agent's wallet
     * @param amount - Amount in minor units
     * @param walletId - Source wallet ID
     * @param reasonCode - Reason for spending points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    spendPoints(amount: number, walletId: string, reasonCode?: string, idempotencyKey?: string): Promise<Transaction>;
    /**
     * Transfer points between wallets
     * @param amount - Amount in minor units
     * @param fromWalletId - Source wallet ID
     * @param toWalletId - Destination wallet ID
     * @param reasonCode - Reason for transfer
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    transferPoints(amount: number, fromWalletId: string, toWalletId: string, reasonCode?: string, idempotencyKey?: string): Promise<Transaction>;
    /**
     * Transfer points with reputation verification
     * @param amount - Amount in minor units
     * @param fromWalletId - Source wallet ID
     * @param toWalletId - Destination wallet ID
     * @param reputationHash - Encrypted reputation score
     * @param actorDid - Agent DID
     * @param reasonCode - Reason for transfer
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    transferPointsWithReputation(amount: number, fromWalletId: string, toWalletId: string, reputationHash: string, actorDid: string, reasonCode?: string, idempotencyKey?: string): Promise<Transaction>;
    /**
     * Create a new wallet for an agent
     * @param agentDid - Agent DID
     * @param type - Wallet type (user, treasury, fee_pool, escrow)
     */
    createWallet(agentDid: string, type?: 'user' | 'treasury' | 'fee_pool' | 'escrow'): Promise<Wallet>;
    /**
     * Get wallet information
     * @param walletId - Wallet ID
     */
    getWallet(walletId: string): Promise<Wallet>;
    /**
     * Get wallet balance
     * @param walletId - Wallet ID
     */
    getWalletBalance(walletId: string): Promise<number>;
    /**
     * Create a new agent
     * @param agentData - Agent information
     */
    createAgent(agentData: AgentRequest): Promise<Agent>;
    /**
     * Get agent information
     * @param did - Agent DID
     */
    getAgent(did: string): Promise<Agent>;
    /**
     * Create a new invoice
     * @param invoiceData - Invoice information
     */
    createInvoice(invoiceData: InvoiceRequest): Promise<Invoice>;
    /**
     * Issue an invoice (change status from draft to issued)
     * @param invoiceId - Invoice ID
     */
    issueInvoice(invoiceId: string): Promise<Invoice>;
    /**
     * Pay an invoice
     * @param invoiceId - Invoice ID
     * @param amount - Payment amount
     * @param walletId - Paying wallet ID
     * @param idempotencyKey - Unique key to prevent duplicate payments
     */
    payInvoice(invoiceId: string, amount: number, walletId: string, idempotencyKey?: string): Promise<Invoice>;
    /**
     * Get reputation requirements for a transaction type
     * @param transactionType - Type of transaction
     * @param amount - Transaction amount
     */
    getReputationRequirements(transactionType: string, amount: number): Promise<ReputationResponse>;
    /**
     * Generate reputation verification keys
     */
    generateReputationKeys(): Promise<{
        privateKey: string;
        publicKey: string;
    }>;
    /**
     * Get agent reputation score
     * @param agentDid - Agent DID
     * @returns Promise<ReputationScoreResponse>
     */
    getAgentReputation(agentDid: string): Promise<ReputationScoreResponse>;
    /**
     * Verify agent reputation hash
     * @param agentDid - Agent DID
     * @param reputationHash - Encrypted reputation hash
     * @returns Promise<ReputationVerificationResponse>
     */
    verifyAgentReputation(agentDid: string, reputationHash: string): Promise<ReputationVerificationResponse>;
    /**
     * Get transaction by ID
     * @param transactionId - Transaction ID
     */
    getTransaction(transactionId: string): Promise<Transaction>;
    /**
     * Get transactions for a wallet
     * @param walletId - Wallet ID
     * @param limit - Number of transactions to return
     * @param after - Cursor for pagination
     */
    getWalletTransactions(walletId: string, limit?: number, after?: string): Promise<Transaction[]>;
    /**
     * Check if the API is healthy
     */
    healthCheck(): Promise<{
        status: string;
        mongo: number;
    }>;
    /**
     * Format points amount for display
     * @param amount - Amount in minor units
     * @param scale - Decimal scale (default: 3)
     */
    formatPoints(amount: number, scale?: number): string;
    /**
     * Parse points amount from display format
     * @param pointsString - Points string (e.g., "1.500 NP")
     * @param scale - Decimal scale (default: 3)
     */
    parsePoints(pointsString: string, scale?: number): number;
}
//# sourceMappingURL=client.d.ts.map