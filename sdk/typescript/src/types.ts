export interface BalanceResult {
  agent_name: string;
  currency: string;
  scale: number;
  balanceMinor: number;
  balancePoints: number;
}

export interface InitTransactionResult {
  txId: string;
  status: string;
  amountPoints: number;
  currency: string;
  scale: number;
  from: string;
  to: string;
  createdAt: string;
  receipt?: Receipt;
  payload?: unknown;
}

export interface Receipt {
  txId: string;
  fromAgent: string;
  toAgent: string;
  amountMinor: number;
  currency: string;
  scale: number;
  createdAt: string;
  task?: string;
  signature?: string;
}

export interface NpSdkOptions {
  baseUrl: string; // e.g. http://localhost:3000
  apiPrefix?: string; // default /api
}

