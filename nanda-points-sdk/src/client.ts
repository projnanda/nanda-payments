import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Agent,
  Wallet,
  Transaction,
  Invoice,
  ReputationResponse,
  TransactionRequest,
  InvoiceRequest,
  AgentRequest,
  WalletRequest,
  ReputationScoreResponse,
  ReputationVerificationResponse
} from './types';

export class NandaPointsSDK {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
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
  async earnPoints(
    amount: number,
    walletId: string,
    reasonCode: string = 'TASK_COMPLETION',
    idempotencyKey?: string
  ): Promise<Transaction> {
    const response = await this.client.post<Transaction>('/transactions', {
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
  async spendPoints(
    amount: number,
    walletId: string,
    reasonCode: string = 'SERVICE_PAYMENT',
    idempotencyKey?: string
  ): Promise<Transaction> {
    const response = await this.client.post<Transaction>('/transactions', {
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
  async transferPoints(
    amount: number,
    fromWalletId: string,
    toWalletId: string,
    reasonCode: string = 'TASK_PAYOUT',
    idempotencyKey?: string
  ): Promise<Transaction> {
    const response = await this.client.post<Transaction>('/transactions', {
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
  async transferPointsWithReputation(
    amount: number,
    fromWalletId: string,
    toWalletId: string,
    reputationHash: string,
    actorDid: string,
    reasonCode: string = 'TASK_PAYOUT',
    idempotencyKey?: string
  ): Promise<Transaction> {
    const response = await this.client.post<Transaction>('/transactions/with-reputation', {
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
  async createWallet(agentDid: string, type: 'user' | 'treasury' | 'fee_pool' | 'escrow' = 'user'): Promise<Wallet> {
    const response = await this.client.post<Wallet>('/wallets', {
      did: agentDid,
      type
    });
    return response.data;
  }

  /**
   * Get wallet information
   * @param walletId - Wallet ID
   */
  async getWallet(walletId: string): Promise<Wallet> {
    const response = await this.client.get<Wallet>(`/wallets/${walletId}`);
    return response.data;
  }

  /**
   * Get wallet balance
   * @param walletId - Wallet ID
   */
  async getWalletBalance(walletId: string): Promise<number> {
    const wallet = await this.getWallet(walletId);
    return wallet.balance;
  }

  // ===== AGENT MANAGEMENT =====

  /**
   * Create a new agent
   * @param agentData - Agent information
   */
  async createAgent(agentData: AgentRequest): Promise<Agent> {
    const response = await this.client.post<Agent>('/agents', agentData);
    return response.data;
  }

  /**
   * Get agent information
   * @param did - Agent DID
   */
  async getAgent(did: string): Promise<Agent> {
    const response = await this.client.get<Agent>(`/agents/${encodeURIComponent(did)}`);
    return response.data;
  }

  // ===== INVOICE MANAGEMENT =====

  /**
   * Create a new invoice
   * @param invoiceData - Invoice information
   */
  async createInvoice(invoiceData: InvoiceRequest): Promise<Invoice> {
    const response = await this.client.post<Invoice>('/invoices', invoiceData);
    return response.data;
  }

  /**
   * Issue an invoice (change status from draft to issued)
   * @param invoiceId - Invoice ID
   */
  async issueInvoice(invoiceId: string): Promise<Invoice> {
    const response = await this.client.post<Invoice>(`/invoices/${invoiceId}/issue`, {});
    return response.data;
  }

  /**
   * Pay an invoice
   * @param invoiceId - Invoice ID
   * @param amount - Payment amount
   * @param walletId - Paying wallet ID
   * @param idempotencyKey - Unique key to prevent duplicate payments
   */
  async payInvoice(
    invoiceId: string,
    amount: number,
    walletId: string,
    idempotencyKey?: string
  ): Promise<Invoice> {
    const response = await this.client.post<Invoice>(`/invoices/${invoiceId}/pay`, {
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
  async getReputationRequirements(transactionType: string, amount: number): Promise<ReputationResponse> {
    const response = await this.client.get<ReputationResponse>(
      `/reputation/requirements?transactionType=${transactionType}&amount=${amount}`
    );
    return response.data;
  }

  /**
   * Generate reputation verification keys
   */
  async generateReputationKeys(): Promise<{ privateKey: string; publicKey: string }> {
    const response = await this.client.post<{ keys: { privateKey: string; publicKey: string } }>('/reputation/generate-keys');
    return response.data.keys;
  }

  /**
   * Get agent reputation score
   * @param agentDid - Agent DID
   * @returns Promise<ReputationScoreResponse>
   */
  async getAgentReputation(agentDid: string): Promise<ReputationScoreResponse> {
    const response = await this.client.get<ReputationScoreResponse>(`/agents/${agentDid}/reputation`);
    return response.data;
  }

  /**
   * Verify agent reputation hash
   * @param agentDid - Agent DID
   * @param reputationHash - Encrypted reputation hash
   * @returns Promise<ReputationVerificationResponse>
   */
  async verifyAgentReputation(agentDid: string, reputationHash: string): Promise<ReputationVerificationResponse> {
    const response = await this.client.post<ReputationVerificationResponse>(`/agents/${agentDid}/reputation/verify`, {
      reputationHash
    });
    return response.data;
  }

  // ===== TRANSACTION QUERIES =====

  /**
   * Get transaction by ID
   * @param transactionId - Transaction ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.client.get<Transaction>(`/transactions/${transactionId}`);
    return response.data;
  }

  /**
   * Get transactions for a wallet
   * @param walletId - Wallet ID
   * @param limit - Number of transactions to return
   * @param after - Cursor for pagination
   */
  async getWalletTransactions(
    walletId: string,
    limit: number = 50,
    after?: string
  ): Promise<Transaction[]> {
    const params = new URLSearchParams({
      walletId,
      limit: limit.toString(),
      ...(after && { after })
    });
    const response = await this.client.get<Transaction[]>(`/transactions?${params}`);
    return response.data;
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if the API is healthy
   */
  async healthCheck(): Promise<{ status: string; mongo: number }> {
    const response = await this.client.get<{ status: string; mongo: number }>('/health');
    return response.data;
  }

  /**
   * Format points amount for display
   * @param amount - Amount in minor units
   * @param scale - Decimal scale (default: 3)
   */
  formatPoints(amount: number, scale: number = 3): string {
    const divisor = Math.pow(10, scale);
    return (amount / divisor).toFixed(scale) + ' NP';
  }

  /**
   * Parse points amount from display format
   * @param pointsString - Points string (e.g., "1.500 NP")
   * @param scale - Decimal scale (default: 3)
   */
  parsePoints(pointsString: string, scale: number = 3): number {
    const numericPart = pointsString.replace(' NP', '');
    return Math.round(parseFloat(numericPart) * Math.pow(10, scale));
  }
}
