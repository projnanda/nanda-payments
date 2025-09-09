import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const UnifiedTransactionSchema = z.object({
  type: z.enum(['unified_payment', 'point_transfer', 'eth_payment', 'exchange', 'task_completion']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']),
  
  client: z.object({
    did: z.string(),
    ethereumAddress: z.string(),
    walletId: z.string()
  }),
  
  agent: z.object({
    did: z.string(),
    ethereumAddress: z.string(),
    walletId: z.string(),
    reputationScore: z.number().min(0).max(100)
  }),
  
  task: z.object({
    taskId: z.string(),
    description: z.string(),
    category: z.string(),
    complexity: z.enum(['low', 'medium', 'high']),
    estimatedDuration: z.string()
  }).optional(),
  
  payments: z.object({
    ethereum: z.object({
      amount: z.string(),
      currency: z.literal('ETH'),
      txHash: z.string().optional(),
      blockNumber: z.number().optional(),
      gasUsed: z.number().optional(),
      gasPrice: z.string().optional()
    }),
    nandaPoints: z.object({
      amount: z.number(),
      currency: z.literal('NP'),
      scale: z.number(),
      baseAmount: z.number(),
      performanceBonus: z.number(),
      reputationBonus: z.number(),
      totalEarned: z.number()
    })
  }),
  
  reputation: z.object({
    clientRating: z.number().min(1).max(100),
    previousScore: z.number().min(0).max(100),
    newScore: z.number().min(0).max(100),
    factors: z.object({
      ratingWeight: z.number(),
      reputationWeight: z.number(),
      experienceBonus: z.number(),
      consistencyBonus: z.number()
    })
  }),
  
  exchange: z.object({
    rate: z.number(),
    npToEth: z.number(),
    ethToNp: z.number(),
    conversionTx: z.string().optional()
  }).optional(),
  
  timestamps: z.object({
    createdAt: z.string(),
    taskAssignedAt: z.string().optional(),
    taskCompletedAt: z.string().optional(),
    paymentProcessedAt: z.string().optional(),
    reputationUpdatedAt: z.string().optional()
  }),
  
  metadata: z.object({
    platform: z.string(),
    version: z.string(),
    clientSatisfaction: z.enum(['low', 'medium', 'high']),
    agentPerformance: z.enum(['poor', 'fair', 'good', 'excellent']),
    tags: z.array(z.string())
  })
});

// Mongoose schema
const unifiedTransactionSchema = new Schema({
  type: { type: String, enum: ['unified_payment', 'point_transfer', 'eth_payment', 'exchange', 'task_completion'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'reversed'], required: true },
  
  client: {
    did: { type: String, required: true, index: true },
    ethereumAddress: { type: String, required: true, index: true },
    walletId: { type: String, required: true, index: true }
  },
  
  agent: {
    did: { type: String, required: true, index: true },
    ethereumAddress: { type: String, required: true, index: true },
    walletId: { type: String, required: true, index: true },
    reputationScore: { type: Number, min: 0, max: 100, required: true }
  },
  
  task: {
    taskId: { type: String, index: true },
    description: String,
    category: String,
    complexity: { type: String, enum: ['low', 'medium', 'high'] },
    estimatedDuration: String
  },
  
  payments: {
    ethereum: {
      amount: { type: String, required: true },
      currency: { type: String, default: 'ETH' },
      txHash: String,
      blockNumber: Number,
      gasUsed: Number,
      gasPrice: String
    },
    nandaPoints: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'NP' },
      scale: { type: Number, default: 3 },
      baseAmount: { type: Number, required: true },
      performanceBonus: { type: Number, default: 0 },
      reputationBonus: { type: Number, default: 0 },
      totalEarned: { type: Number, required: true }
    }
  },
  
  reputation: {
    clientRating: { type: Number, min: 1, max: 100, required: true },
    previousScore: { type: Number, min: 0, max: 100, required: true },
    newScore: { type: Number, min: 0, max: 100, required: true },
    factors: {
      ratingWeight: { type: Number, default: 0.6 },
      reputationWeight: { type: Number, default: 0.4 },
      experienceBonus: { type: Number, default: 0 },
      consistencyBonus: { type: Number, default: 0 }
    }
  },
  
  exchange: {
    rate: Number,
    npToEth: Number,
    ethToNp: Number,
    conversionTx: String
  },
  
  timestamps: {
    createdAt: { type: String, required: true },
    taskAssignedAt: String,
    taskCompletedAt: String,
    paymentProcessedAt: String,
    reputationUpdatedAt: String
  },
  
  metadata: {
    platform: { type: String, default: 'unified-marketplace' },
    version: { type: String, default: '1.0.0' },
    clientSatisfaction: { type: String, enum: ['low', 'medium', 'high'] },
    agentPerformance: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'unified_transactions'
});

// Indexes for performance
unifiedTransactionSchema.index({ 'client.did': 1, 'timestamps.createdAt': -1 });
unifiedTransactionSchema.index({ 'agent.did': 1, 'timestamps.createdAt': -1 });
unifiedTransactionSchema.index({ 'task.taskId': 1 });
unifiedTransactionSchema.index({ 'payments.ethereum.txHash': 1 });
unifiedTransactionSchema.index({ status: 1, 'timestamps.createdAt': -1 });

export interface UnifiedTransactionDoc extends Document {
  type: 'unified_payment' | 'point_transfer' | 'eth_payment' | 'exchange' | 'task_completion';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  client: {
    did: string;
    ethereumAddress: string;
    walletId: string;
  };
  agent: {
    did: string;
    ethereumAddress: string;
    walletId: string;
    reputationScore: number;
  };
  task?: {
    taskId: string;
    description: string;
    category: string;
    complexity: 'low' | 'medium' | 'high';
    estimatedDuration: string;
  };
  payments: {
    ethereum: {
      amount: string;
      currency: 'ETH';
      txHash?: string;
      blockNumber?: number;
      gasUsed?: number;
      gasPrice?: string;
    };
    nandaPoints: {
      amount: number;
      currency: 'NP';
      scale: number;
      baseAmount: number;
      performanceBonus: number;
      reputationBonus: number;
      totalEarned: number;
    };
  };
  reputation: {
    clientRating: number;
    previousScore: number;
    newScore: number;
    factors: {
      ratingWeight: number;
      reputationWeight: number;
      experienceBonus: number;
      consistencyBonus: number;
    };
  };
  exchange?: {
    rate: number;
    npToEth: number;
    ethToNp: number;
    conversionTx?: string;
  };
  timestamps: {
    createdAt: string;
    taskAssignedAt?: string;
    taskCompletedAt?: string;
    paymentProcessedAt?: string;
    reputationUpdatedAt?: string;
  };
  metadata: {
    platform: string;
    version: string;
    clientSatisfaction: 'low' | 'medium' | 'high';
    agentPerformance: 'poor' | 'fair' | 'good' | 'excellent';
    tags: string[];
  };
}

export const UnifiedTransactionModel = mongoose.model<UnifiedTransactionDoc>('UnifiedTransaction', unifiedTransactionSchema);
