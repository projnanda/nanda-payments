import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const UnifiedAgentSchema = z.object({
  did: z.string(),
  ethereumAddress: z.string(),
  
  identity: z.object({
    agentName: z.string(),
    label: z.string(),
    primaryFactsUrl: z.string().url(),
    factsDigest: z.string().optional(),
    verificationStatus: z.enum(['pending', 'verified', 'rejected'])
  }),
  
  wallets: z.object({
    nandaPoints: z.object({
      walletId: z.string(),
      balance: z.number().min(0),
      scale: z.number().default(3),
      currency: z.literal('NP'),
      lastUpdated: z.string()
    }),
    ethereum: z.object({
      address: z.string(),
      balance: z.string(),
      currency: z.literal('ETH'),
      lastUpdated: z.string()
    })
  }),
  
  reputation: z.object({
    score: z.number().min(0).max(100),
    totalTasks: z.number().min(0),
    successfulTasks: z.number().min(0),
    averageRating: z.number().min(0).max(100),
    lastUpdated: z.string(),
    trend: z.enum(['increasing', 'decreasing', 'stable']),
    reliability: z.number().min(0).max(1)
  }),
  
  specialties: z.array(z.string()),
  
  pricing: z.object({
    minimumPrice: z.string(),
    nandaPointsRate: z.number().min(0),
    dynamicPricing: z.boolean(),
    reputationMultiplier: z.number().min(0),
    experienceMultiplier: z.number().min(0)
  }),
  
  performance: z.object({
    averageCompletionTime: z.string(),
    successRate: z.number().min(0).max(1),
    clientSatisfaction: z.number().min(0).max(5),
    responseTime: z.string(),
    availability: z.string()
  }),
  
  earnings: z.object({
    totalETH: z.string(),
    totalNP: z.number().min(0),
    thisMonthETH: z.string(),
    thisMonthNP: z.number().min(0),
    lifetimeEarnings: z.string()
  }),
  
  status: z.enum(['active', 'inactive', 'suspended', 'banned']),
  createdAt: z.string(),
  lastActiveAt: z.string(),
  updatedAt: z.string()
});

// Mongoose schema
const unifiedAgentSchema = new Schema({
  did: { type: String, required: true, unique: true, index: true },
  ethereumAddress: { type: String, required: true, unique: true, index: true },
  
  identity: {
    agentName: { type: String, required: true },
    label: { type: String, required: true },
    primaryFactsUrl: { type: String, required: true },
    factsDigest: String,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },
  
  wallets: {
    nandaPoints: {
      walletId: { type: String, required: true, unique: true },
      balance: { type: Number, default: 0, min: 0 },
      scale: { type: Number, default: 3 },
      currency: { type: String, default: 'NP' },
      lastUpdated: { type: String, required: true }
    },
    ethereum: {
      address: { type: String, required: true },
      balance: { type: String, default: '0' },
      currency: { type: String, default: 'ETH' },
      lastUpdated: { type: String, required: true }
    }
  },
  
  reputation: {
    score: { type: Number, default: 50, min: 0, max: 100 },
    totalTasks: { type: Number, default: 0, min: 0 },
    successfulTasks: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: { type: String, required: true },
    trend: { type: String, enum: ['increasing', 'decreasing', 'stable'], default: 'stable' },
    reliability: { type: Number, default: 0.5, min: 0, max: 1 }
  },
  
  specialties: [String],
  
  pricing: {
    minimumPrice: { type: String, required: true },
    nandaPointsRate: { type: Number, required: true, min: 0 },
    dynamicPricing: { type: Boolean, default: true },
    reputationMultiplier: { type: Number, default: 1.0, min: 0 },
    experienceMultiplier: { type: Number, default: 1.0, min: 0 }
  },
  
  performance: {
    averageCompletionTime: { type: String, default: '2 hours' },
    successRate: { type: Number, default: 0.5, min: 0, max: 1 },
    clientSatisfaction: { type: Number, default: 3.0, min: 0, max: 5 },
    responseTime: { type: String, default: '1 hour' },
    availability: { type: String, default: '24/7' }
  },
  
  earnings: {
    totalETH: { type: String, default: '0' },
    totalNP: { type: Number, default: 0, min: 0 },
    thisMonthETH: { type: String, default: '0' },
    thisMonthNP: { type: Number, default: 0, min: 0 },
    lifetimeEarnings: { type: String, default: '0 ETH + 0 NP' }
  },
  
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'banned'], default: 'active' },
  createdAt: { type: String, required: true },
  lastActiveAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'unified_agents'
});

// Indexes for performance
unifiedAgentSchema.index({ 'reputation.score': -1 });
unifiedAgentSchema.index({ 'reputation.totalTasks': -1 });
unifiedAgentSchema.index({ 'reputation.averageRating': -1 });
unifiedAgentSchema.index({ specialties: 1 });
unifiedAgentSchema.index({ status: 1 });
unifiedAgentSchema.index({ 'wallets.nandaPoints.balance': -1 });
unifiedAgentSchema.index({ 'performance.successRate': -1 });

export interface UnifiedAgentDoc extends Document {
  did: string;
  ethereumAddress: string;
  identity: {
    agentName: string;
    label: string;
    primaryFactsUrl: string;
    factsDigest?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  wallets: {
    nandaPoints: {
      walletId: string;
      balance: number;
      scale: number;
      currency: 'NP';
      lastUpdated: string;
    };
    ethereum: {
      address: string;
      balance: string;
      currency: 'ETH';
      lastUpdated: string;
    };
  };
  reputation: {
    score: number;
    totalTasks: number;
    successfulTasks: number;
    averageRating: number;
    lastUpdated: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    reliability: number;
  };
  specialties: string[];
  pricing: {
    minimumPrice: string;
    nandaPointsRate: number;
    dynamicPricing: boolean;
    reputationMultiplier: number;
    experienceMultiplier: number;
  };
  performance: {
    averageCompletionTime: string;
    successRate: number;
    clientSatisfaction: number;
    responseTime: string;
    availability: string;
  };
  earnings: {
    totalETH: string;
    totalNP: number;
    thisMonthETH: string;
    thisMonthNP: number;
    lifetimeEarnings: string;
  };
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  createdAt: string;
  lastActiveAt: string;
  updatedAt: string;
}

export const UnifiedAgentModel = mongoose.model<UnifiedAgentDoc>('UnifiedAgent', unifiedAgentSchema);
