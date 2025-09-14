"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NandaPointsSDK = void 0;
const axios_1 = __importDefault(require("axios"));
class NandaPointsSDK {
    constructor(baseUrl = 'http://localhost:3001', apiKey) {
        this.baseUrl = baseUrl;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            },
            timeout: 10000
        });
    }
    // ===== CORE TRANSACTION METHODS =====
    /**
     * Earn points for an agent
     * @param amount - Amount in minor units (e.g., 1000 = 1.000 NP)
     * @param walletId - Destination wallet ID
     * @param reasonCode - Reason for earning points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    async earnPoints(amount, walletId, reasonCode = 'TASK_COMPLETION', idempotencyKey) {
        const response = await this.client.post('/transactions', {
            type: 'mint',
            destWalletId: walletId,
            amount: { currency: "NP", scale: 3, value: amount },
            reasonCode,
            idempotencyKey: idempotencyKey || `earn-${Date.now()}-${Math.random()}`
        });
        return response.data;
    }
    /**
     * Spend points from an agent's wallet
     * @param amount - Amount in minor units
     * @param walletId - Source wallet ID
     * @param reasonCode - Reason for spending points
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    async spendPoints(amount, walletId, reasonCode = 'SERVICE_PAYMENT', idempotencyKey) {
        const response = await this.client.post('/transactions', {
            type: 'burn',
            sourceWalletId: walletId,
            amount: { currency: "NP", scale: 3, value: amount },
            reasonCode,
            idempotencyKey: idempotencyKey || `spend-${Date.now()}-${Math.random()}`
        });
        return response.data;
    }
    /**
     * Transfer points between wallets
     * @param amount - Amount in minor units
     * @param fromWalletId - Source wallet ID
     * @param toWalletId - Destination wallet ID
     * @param reasonCode - Reason for transfer
     * @param idempotencyKey - Unique key to prevent duplicate transactions
     */
    async transferPoints(amount, fromWalletId, toWalletId, reasonCode = 'TASK_PAYOUT', idempotencyKey) {
        const response = await this.client.post('/transactions', {
            type: 'transfer',
            sourceWalletId: fromWalletId,
            destWalletId: toWalletId,
            amount: { currency: "NP", scale: 3, value: amount },
            reasonCode,
            idempotencyKey: idempotencyKey || `transfer-${Date.now()}-${Math.random()}`
        });
        return response.data;
    }
    // ===== REPUTATION-ENHANCED TRANSACTIONS =====
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
    async transferPointsWithReputation(amount, fromWalletId, toWalletId, reputationHash, actorDid, reasonCode = 'TASK_PAYOUT', idempotencyKey) {
        const response = await this.client.post('/transactions/with-reputation', {
            type: 'transfer',
            sourceWalletId: fromWalletId,
            destWalletId: toWalletId,
            amount: { currency: "NP", scale: 3, value: amount },
            reasonCode,
            idempotencyKey: idempotencyKey || `reputation-transfer-${Date.now()}-${Math.random()}`,
            actor: {
                type: 'agent',
                did: actorDid
            },
            reputationHash
        });
        return response.data;
    }
    // ===== WALLET MANAGEMENT =====
    /**
     * Create a new wallet for an agent
     * @param agentDid - Agent DID
     * @param type - Wallet type (user, treasury, fee_pool, escrow)
     */
    async createWallet(agentDid, type = 'user') {
        const response = await this.client.post('/wallets', {
            did: agentDid,
            type
        });
        return response.data;
    }
    /**
     * Get wallet information
     * @param walletId - Wallet ID
     */
    async getWallet(walletId) {
        const response = await this.client.get(`/wallets/${walletId}`);
        return response.data;
    }
    /**
     * Get wallet balance
     * @param walletId - Wallet ID
     */
    async getWalletBalance(walletId) {
        const wallet = await this.getWallet(walletId);
        return wallet.balance;
    }
    // ===== AGENT MANAGEMENT =====
    /**
     * Create a new agent
     * @param agentData - Agent information
     */
    async createAgent(agentData) {
        const response = await this.client.post('/agents', agentData);
        return response.data;
    }
    /**
     * Get agent information
     * @param did - Agent DID
     */
    async getAgent(did) {
        const response = await this.client.get(`/agents/${encodeURIComponent(did)}`);
        return response.data;
    }
    // ===== INVOICE MANAGEMENT =====
    /**
     * Create a new invoice
     * @param invoiceData - Invoice information
     */
    async createInvoice(invoiceData) {
        const response = await this.client.post('/invoices', invoiceData);
        return response.data;
    }
    /**
     * Issue an invoice (change status from draft to issued)
     * @param invoiceId - Invoice ID
     */
    async issueInvoice(invoiceId) {
        const response = await this.client.post(`/invoices/${invoiceId}/issue`, {});
        return response.data;
    }
    /**
     * Pay an invoice
     * @param invoiceId - Invoice ID
     * @param amount - Payment amount
     * @param walletId - Paying wallet ID
     * @param idempotencyKey - Unique key to prevent duplicate payments
     */
    async payInvoice(invoiceId, amount, walletId, idempotencyKey) {
        const response = await this.client.post(`/invoices/${invoiceId}/pay`, {
            amount,
            walletId,
            idempotencyKey: idempotencyKey || `invoice-payment-${Date.now()}-${Math.random()}`
        });
        return response.data;
    }
    // ===== REPUTATION SYSTEM =====
    /**
     * Get reputation requirements for a transaction type
     * @param transactionType - Type of transaction
     * @param amount - Transaction amount
     */
    async getReputationRequirements(transactionType, amount) {
        const response = await this.client.get(`/reputation/requirements?transactionType=${transactionType}&amount=${amount}`);
        return response.data;
    }
    /**
     * Generate reputation verification keys
     */
    async generateReputationKeys() {
        const response = await this.client.post('/reputation/generate-keys');
        return response.data.keys;
    }
    /**
     * Get agent reputation score
     * @param agentDid - Agent DID
     * @returns Promise<ReputationScoreResponse>
     */
    async getAgentReputation(agentDid) {
        const response = await this.client.get(`/agents/${agentDid}/reputation`);
        return response.data;
    }
    /**
     * Verify agent reputation hash
     * @param agentDid - Agent DID
     * @param reputationHash - Encrypted reputation hash
     * @returns Promise<ReputationVerificationResponse>
     */
    async verifyAgentReputation(agentDid, reputationHash) {
        const response = await this.client.post(`/agents/${agentDid}/reputation/verify`, {
            reputationHash
        });
        return response.data;
    }
    // ===== TRANSACTION QUERIES =====
    /**
     * Get transaction by ID
     * @param transactionId - Transaction ID
     */
    async getTransaction(transactionId) {
        const response = await this.client.get(`/transactions/${transactionId}`);
        return response.data;
    }
    /**
     * Get transactions for a wallet
     * @param walletId - Wallet ID
     * @param limit - Number of transactions to return
     * @param after - Cursor for pagination
     */
    async getWalletTransactions(walletId, limit = 50, after) {
        const params = new URLSearchParams({
            walletId,
            limit: limit.toString(),
            ...(after && { after })
        });
        const response = await this.client.get(`/transactions?${params}`);
        return response.data;
    }
    // ===== UTILITY METHODS =====
    /**
     * Check if the API is healthy
     */
    async healthCheck() {
        const response = await this.client.get('/health');
        return response.data;
    }
    /**
     * Format points amount for display
     * @param amount - Amount in minor units
     * @param scale - Decimal scale (default: 3)
     */
    formatPoints(amount, scale = 3) {
        const divisor = Math.pow(10, scale);
        return (amount / divisor).toFixed(scale) + ' NP';
    }
    /**
     * Parse points amount from display format
     * @param pointsString - Points string (e.g., "1.500 NP")
     * @param scale - Decimal scale (default: 3)
     */
    parsePoints(pointsString, scale = 3) {
        const numericPart = pointsString.replace(' NP', '');
        return Math.round(parseFloat(numericPart) * Math.pow(10, scale));
    }
}
exports.NandaPointsSDK = NandaPointsSDK;
//# sourceMappingURL=client.js.map