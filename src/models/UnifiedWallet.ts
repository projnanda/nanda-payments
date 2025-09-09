import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const UnifiedWalletSchema = z.object({
  walletId: z.string(),
  agentDid: z.string(),
  ethereumAddress: z.string(),
  
  balances: z.object({
    nandaPoints: z.object({
      amount: z.number().min(0),
      scale: z.number().default(3),
      currency: z.literal('NP'),
      lastUpdated: z.string()
    }),
    ethereum: z.object({
      amount: z.string(),
      currency: z.literal('ETH'),
      lastUpdated: z.string()
    })
  }),
  
  limits: z.object({
    dailyNP: z.number().min(0),
    dailyETH: z.string(),
    maxNP: z.number().min(0),
    maxETH: z.string(),
    allowOverdraft: z.boolean()
  }),
  
  transactionHistory: z.array(z.object({
    transactionId: z.string(),
    type: z.enum(['deposit', 'withdrawal', 'transfer', 'earn', 'spend', 'exchange']),
    amount: z.number(),
    currency: z.enum(['NP', 'ETH']),
    timestamp: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'completed', 'failed'])
  })),
  
  exchangeRate: z.object({
    npToEth: z.number(),
    ethToNp: z.number(),
    lastUpdated: z.string()
  }),
  
  status: z.enum(['active', 'inactive', 'suspended', 'frozen']),
  createdAt: z.string(),
  lastUpdated: z.string()
});

// Mongoose schema
const unifiedWalletSchema = new Schema({
  walletId: { type: String, required: true, unique: true, index: true },
  agentDid: { type: String, required: true, index: true },
  ethereumAddress: { type: String, required: true, index: true },
  
  balances: {
    nandaPoints: {
      amount: { type: Number, default: 0, min: 0 },
      scale: { type: Number, default: 3 },
      currency: { type: String, default: 'NP' },
      lastUpdated: { type: String, required: true }
    },
    ethereum: {
      amount: { type: String, default: '0' },
      currency: { type: String, default: 'ETH' },
      lastUpdated: { type: String, required: true }
    }
  },
  
  limits: {
    dailyNP: { type: Number, default: 1000000, min: 0 },
    dailyETH: { type: String, default: '1.0' },
    maxNP: { type: Number, default: 10000000, min: 0 },
    maxETH: { type: String, default: '10.0' },
    allowOverdraft: { type: Boolean, default: false }
  },
  
  transactionHistory: [{
    transactionId: { type: String, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'earn', 'spend', 'exchange'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['NP', 'ETH'], required: true },
    timestamp: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
  }],
  
  exchangeRate: {
    npToEth: { type: Number, default: 0.000001 },
    ethToNp: { type: Number, default: 1000000 },
    lastUpdated: { type: String, required: true }
  },
  
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'frozen'], default: 'active' },
  createdAt: { type: String, required: true },
  lastUpdated: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'unified_wallets'
});

// Indexes for performance
unifiedWalletSchema.index({ 'balances.nandaPoints.amount': -1 });
unifiedWalletSchema.index({ 'balances.ethereum.amount': -1 });
unifiedWalletSchema.index({ status: 1 });
unifiedWalletSchema.index({ 'transactionHistory.timestamp': -1 });

export interface UnifiedWalletDoc extends Document {
  walletId: string;
  agentDid: string;
  ethereumAddress: string;
  balances: {
    nandaPoints: {
      amount: number;
      scale: number;
      currency: 'NP';
      lastUpdated: string;
    };
    ethereum: {
      amount: string;
      currency: 'ETH';
      lastUpdated: string;
    };
  };
  limits: {
    dailyNP: number;
    dailyETH: string;
    maxNP: number;
    maxETH: string;
    allowOverdraft: boolean;
  };
  transactionHistory: Array<{
    transactionId: string;
    type: 'deposit' | 'withdrawal' | 'transfer' | 'earn' | 'spend' | 'exchange';
    amount: number;
    currency: 'NP' | 'ETH';
    timestamp: string;
    description: string;
    status: 'pending' | 'completed' | 'failed';
  }>;
  exchangeRate: {
    npToEth: number;
    ethToNp: number;
    lastUpdated: string;
  };
  status: 'active' | 'inactive' | 'suspended' | 'frozen';
  createdAt: string;
  lastUpdated: string;
}

export const UnifiedWalletModel = mongoose.model<UnifiedWalletDoc>('UnifiedWallet', unifiedWalletSchema);
