import type { BalanceResult, InitTransactionResult, Receipt, NpSdkOptions } from './types.js';

export class NandaPointsRest {
  private readonly apiBase: string;

  constructor(options: NpSdkOptions) {
    const apiPrefix = options.apiPrefix ?? '/api';
    this.apiBase = `${options.baseUrl.replace(/\/$/, '')}${apiPrefix}`;
  }

  async getHealth(): Promise<{ status: string; message: string }>{
    const res = await fetch(`${this.apiBase}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  async getBalance(agentName: string): Promise<BalanceResult> {
    const url = new URL(`${this.apiBase}/wallets/balance`);
    url.searchParams.set('agent', agentName);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`getBalance failed: ${res.status}`);
    return res.json();
  }

  async attachWallet(agentName: string, seedPoints?: number): Promise<{ walletId: string; balanceMinor: number; balancePoints: number }> {
    const res = await fetch(`${this.apiBase}/wallets/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_name: agentName, seedPoints })
    });
    if (!res.ok) throw new Error(`attachWallet failed: ${res.status}`);
    return res.json();
  }

  async initiateTransaction(from: string, to: string, amountPoints: number, task: string): Promise<InitTransactionResult> {
    const res = await fetch(`${this.apiBase}/transactions/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, amountPoints, task })
    });
    if (!res.ok) throw new Error(`initiateTransaction failed: ${res.status}`);
    return res.json();
  }

  async getReceiptByTx(txId: string): Promise<Receipt | { error: string }>{
    const res = await fetch(`${this.apiBase}/receipts/${encodeURIComponent(txId)}`);
    if (!res.ok) throw new Error(`getReceipt failed: ${res.status}`);
    return res.json();
  }
}


