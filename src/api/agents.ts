import express from 'express';
import { UnifiedAgentModel } from '../models/UnifiedAgent.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const RegisterAgentSchema = z.object({
  did: z.string(),
  ethereumAddress: z.string(),
  agentName: z.string(),
  label: z.string(),
  primaryFactsUrl: z.string().url(),
  specialties: z.array(z.string()),
  minimumPrice: z.string()
});

const UpdateAgentSchema = z.object({
  agentName: z.string().optional(),
  label: z.string().optional(),
  primaryFactsUrl: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
  minimumPrice: z.string().optional()
});

/**
 * Register a new agent
 * POST /agents/register
 */
router.post('/register', async (req, res) => {
  try {
    const data = RegisterAgentSchema.parse(req.body);

    // Check if agent already exists
    const existingAgent = await UnifiedAgentModel.findOne({ 
      $or: [{ did: data.did }, { ethereumAddress: data.ethereumAddress }] 
    });
    
    if (existingAgent) {
      return res.status(409).json({ error: 'Agent already exists' });
    }

    const agent = new UnifiedAgentModel({
      did: data.did,
      ethereumAddress: data.ethereumAddress,
      identity: {
        agentName: data.agentName,
        label: data.label,
        primaryFactsUrl: data.primaryFactsUrl,
        verificationStatus: 'pending'
      },
      wallets: {
        nandaPoints: {
          walletId: 'pending',
          balance: 0,
          scale: 3,
          currency: 'NP',
          lastUpdated: new Date().toISOString()
        },
        ethereum: {
          address: data.ethereumAddress,
          balance: '0',
          currency: 'ETH',
          lastUpdated: new Date().toISOString()
        }
      },
      reputation: {
        score: 50,
        totalTasks: 0,
        successfulTasks: 0,
        averageRating: 0,
        lastUpdated: new Date().toISOString(),
        trend: 'stable',
        reliability: 0.5
      },
      specialties: data.specialties,
      pricing: {
        minimumPrice: data.minimumPrice,
        nandaPointsRate: 1000,
        dynamicPricing: true,
        reputationMultiplier: 1.0,
        experienceMultiplier: 1.0
      },
      performance: {
        averageCompletionTime: '2 hours',
        successRate: 0.5,
        clientSatisfaction: 3.0,
        responseTime: '1 hour',
        availability: '24/7'
      },
      earnings: {
        totalETH: '0',
        totalNP: 0,
        thisMonthETH: '0',
        thisMonthNP: 0,
        lifetimeEarnings: '0 ETH + 0 NP'
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await agent.save();

    res.status(201).json({
      success: true,
      agent: {
        did: agent.did,
        ethereumAddress: agent.ethereumAddress,
        identity: agent.identity,
        reputation: agent.reputation,
        specialties: agent.specialties,
        pricing: agent.pricing,
        status: agent.status,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

/**
 * Get agent details
 * GET /agents/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await UnifiedAgentModel.findOne({ 
      $or: [{ did: id }, { ethereumAddress: id }] 
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      success: true,
      agent: {
        did: agent.did,
        ethereumAddress: agent.ethereumAddress,
        identity: agent.identity,
        wallets: agent.wallets,
        reputation: agent.reputation,
        specialties: agent.specialties,
        pricing: agent.pricing,
        performance: agent.performance,
        earnings: agent.earnings,
        status: agent.status,
        createdAt: agent.createdAt,
        lastActiveAt: agent.lastActiveAt,
        updatedAt: agent.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

/**
 * Update agent profile
 * PUT /agents/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = UpdateAgentSchema.parse(req.body);

    const agent = await UnifiedAgentModel.findOne({ 
      $or: [{ did: id }, { ethereumAddress: id }] 
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Update fields
    if (data.agentName) agent.identity.agentName = data.agentName;
    if (data.label) agent.identity.label = data.label;
    if (data.primaryFactsUrl) agent.identity.primaryFactsUrl = data.primaryFactsUrl;
    if (data.specialties) agent.specialties = data.specialties;
    if (data.minimumPrice) agent.pricing.minimumPrice = data.minimumPrice;

    agent.updatedAt = new Date().toISOString();
    await agent.save();

    res.json({
      success: true,
      agent: {
        did: agent.did,
        ethereumAddress: agent.ethereumAddress,
        identity: agent.identity,
        reputation: agent.reputation,
        specialties: agent.specialties,
        pricing: agent.pricing,
        status: agent.status,
        updatedAt: agent.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

/**
 * Deactivate agent
 * DELETE /agents/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await UnifiedAgentModel.findOne({ 
      $or: [{ did: id }, { ethereumAddress: id }] 
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    agent.status = 'inactive';
    agent.updatedAt = new Date().toISOString();
    await agent.save();

    res.json({
      success: true,
      message: 'Agent deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating agent:', error);
    res.status(500).json({ error: 'Failed to deactivate agent' });
  }
});

/**
 * List all agents
 * GET /agents
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'active', specialty, limit = 50, offset = 0 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (specialty) filter.specialties = { $in: [specialty] };

    const agents = await UnifiedAgentModel.find(filter)
      .sort({ 'reputation.score': -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .select('did ethereumAddress identity reputation specialties pricing status createdAt');

    const total = await UnifiedAgentModel.countDocuments(filter);

    res.json({
      success: true,
      agents,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total
      }
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

export default router;
