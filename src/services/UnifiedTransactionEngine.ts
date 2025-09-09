import { ethers } from 'ethers';
import { UnifiedTransactionModel, UnifiedTransactionDoc } from '../models/UnifiedTransaction.js';
import { UnifiedAgentModel, UnifiedAgentDoc } from '../models/UnifiedAgent.js';
import { UnifiedWalletModel, UnifiedWalletDoc } from '../models/UnifiedWallet.js';
import { emit } from '../lib/eventBus.js';

export interface UnifiedTransactionOptions {
  type: 'hire_agent' | 'point_transfer' | 'eth_transfer' | 'exchange' | 'mint' | 'burn';
  clientDid: string;
  agentDid: string;
  taskId?: string;
  taskDescription?: string;
  taskCategory?: string;
  taskComplexity?: 'low' | 'medium' | 'high';
  estimatedDuration?: string;
  ethAmount: string;
  clientRating?: number;
  idempotencyKey: string;
  metadata?: any;
}

export interface ExchangeOptions {
  fromCurrency: 'NP' | 'ETH';
  toCurrency: 'NP' | 'ETH';
  amount: number;
  agentDid: string;
  idempotencyKey: string;
}

export class UnifiedTransactionEngine {
  private provider: ethers.Provider;
  private exchangeRate: number = 1000000; // 1 ETH = 1,000,000 NP

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Calculate NP points earned or lost based on performance and satisfaction
   * Positive ratings earn NP, negative ratings lose NP
   */
  private calculateNPChange(agentReputation: number, clientRating: number, taskComplexity: string = 'medium'): number {
    // Base NP points for completing a task
    let basePoints = 10;
    
    // Complexity multiplier
    const complexityMultiplier = {
      'low': 1.0,
      'medium': 1.5,
      'high': 2.0
    }[taskComplexity] || 1.5;
    
    // Determine if this is a positive or negative rating
    const isPositiveRating = clientRating >= 60; // 60+ is considered positive
    const isNegativeRating = clientRating < 60;  // Below 60 is considered negative
    
    if (isPositiveRating) {
      // POSITIVE RATING: Agent earns NP points
      const reputationBonus = (agentReputation / 100) * 0.5;
      const satisfactionBonus = (clientRating / 100);
      
      const totalNP = Math.floor(
        basePoints * complexityMultiplier * (1 + reputationBonus + satisfactionBonus)
      );
      
      return Math.max(5, totalNP); // Minimum 5 NP points for positive ratings
    } else {
      // NEGATIVE RATING: Agent loses NP points (penalty system)
      const penaltyMultiplier = this.calculatePenaltyMultiplier(clientRating);
      const reputationPenalty = (agentReputation / 100) * 0.3; // Higher reputation = more to lose
      
      // Calculate penalty: more severe for worse ratings and higher reputation agents
      const penaltyPoints = Math.floor(
        basePoints * complexityMultiplier * penaltyMultiplier * (1 + reputationPenalty)
      );
      
      return -Math.max(2, penaltyPoints); // Return negative value, minimum 2 NP penalty
    }
  }

  /**
   * Calculate penalty multiplier based on client rating
   * Lower ratings = higher penalties
   */
  private calculatePenaltyMultiplier(clientRating: number): number {
    if (clientRating >= 50) return 0.5;  // 50-59: Light penalty
    if (clientRating >= 40) return 0.8;  // 40-49: Medium penalty
    if (clientRating >= 30) return 1.2;  // 30-39: Heavy penalty
    if (clientRating >= 20) return 1.5;  // 20-29: Severe penalty
    if (clientRating >= 10) return 2.0;  // 10-19: Very severe penalty
    return 2.5;  // 0-9: Maximum penalty
  }

  /**
   * Calculate reputation update based on client rating
   * More severe penalty for negative ratings
   */
  private calculateReputationUpdate(currentReputation: number, clientRating: number): number {
    if (clientRating >= 60) {
      // Positive rating: weighted average (70% current + 30% new)
      const newReputation = (currentReputation * 0.7) + (clientRating * 0.3);
      return Math.round(Math.max(0, Math.min(100, newReputation)));
    } else {
      // Negative rating: more severe reputation drop
      const penaltySeverity = (60 - clientRating) / 60; // 0 to 1, higher for worse ratings
      const reputationDrop = penaltySeverity * 15; // Up to 15 point drop
      const newReputation = currentReputation - reputationDrop;
      return Math.round(Math.max(0, Math.min(100, newReputation)));
    }
  }

  /**
   * Create a unified transaction (ETH payment + NP earning/losing)
   */
  async createUnifiedTransaction(options: UnifiedTransactionOptions): Promise<UnifiedTransactionDoc> {
    const { 
      type, 
      clientDid, 
      agentDid, 
      taskId, 
      taskDescription, 
      taskCategory, 
      taskComplexity, 
      estimatedDuration, 
      ethAmount, 
      clientRating, 
      idempotencyKey, 
      metadata 
    } = options;

    // Check for existing transaction with same idempotency key
    const existing = await UnifiedTransactionModel.findOne({ 
      'metadata.idempotencyKey': idempotencyKey 
    });
    if (existing) {
      return existing;
    }

    // Get client and agent data
    const [client, agent] = await Promise.all([
      UnifiedAgentModel.findOne({ did: clientDid }),
      UnifiedAgentModel.findOne({ did: agentDid })
    ]);

    if (!client || !agent) {
      throw new Error('Client or agent not found');
    }

    // Get wallets
    const [clientWallet, agentWallet] = await Promise.all([
      UnifiedWalletModel.findOne({ agentDid: clientDid }),
      UnifiedWalletModel.findOne({ agentDid: agentDid })
    ]);

    if (!clientWallet || !agentWallet) {
      throw new Error('Client or agent wallet not found');
    }

    // Validate client ETH balance
    const ethAmountWei = ethers.parseEther(ethAmount);
    const clientEthBalance = ethers.parseEther(clientWallet.balances.ethereum.amount);
    
    if (clientEthBalance < ethAmountWei) {
      throw new Error('Insufficient ETH balance');
    }

    // Calculate NP points change (positive or negative)
    const npChange = this.calculateNPChange(
      agent.reputation.score, 
      clientRating || 85, 
      taskComplexity
    );

    // Calculate new reputation score
    const newReputationScore = this.calculateReputationUpdate(
      agent.reputation.score, 
      clientRating || 85
    );

    // Determine if this is a penalty (negative NP change)
    const isPenalty = npChange < 0;
    const npAmount = Math.abs(npChange);

    // Create transaction record
    const transaction = new UnifiedTransactionModel({
      type,
      status: 'processing',
      client: {
        did: clientDid,
        ethereumAddress: client.ethereumAddress,
        walletId: clientWallet.walletId
      },
      agent: {
        did: agentDid,
        ethereumAddress: agent.ethereumAddress,
        walletId: agentWallet.walletId
      },
      task: {
        taskId: taskId || `task_${Date.now()}`,
        description: taskDescription || 'AI Agent Task',
        category: taskCategory || 'general',
        complexity: taskComplexity || 'medium',
        estimatedDuration: estimatedDuration || '1 hour',
        result: isPenalty ? 'Task completed with issues' : 'Task completed successfully',
        clientRating: clientRating || 85,
        agentFeedback: isPenalty ? 'Needs improvement' : 'Positive'
      },
      payments: {
        ethereum: {
          amount: ethAmount,
          currency: 'ETH',
          fromAddress: client.ethereumAddress,
          toAddress: agent.ethereumAddress,
          status: 'pending'
        },
        nandaPoints: {
          amount: npAmount,
          currency: 'NP',
          scale: 3,
          fromWallet: isPenalty ? agentWallet.walletId : 'system',
          toWallet: agentWallet.walletId,
          status: 'pending',
          isPenalty: isPenalty
        }
      },
      reputationImpact: {
        oldScore: agent.reputation.score,
        newScore: newReputationScore,
        change: newReputationScore - agent.reputation.score
      },
      metadata: {
        idempotencyKey,
        memo: isPenalty ? 
          `Penalty for ${taskDescription || 'AI Agent Task'} (Rating: ${clientRating})` :
          `Payment for ${taskDescription || 'AI Agent Task'}`,
        tags: ['ai', 'agent', isPenalty ? 'penalty' : 'payment'],
        isPenalty: isPenalty,
        npChange: npChange,
        ...metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      // Process ETH payment (deduct from client, add to agent)
      const newClientEthBalance = clientEthBalance - ethAmountWei;
      const agentEthBalance = ethers.parseEther(agentWallet.balances.ethereum.amount);
      const newAgentEthBalance = agentEthBalance + ethAmountWei;

      // Process NP change (add or subtract from agent)
      const agentNPBalance = agentWallet.balances.nandaPoints.amount;
      const newAgentNPBalance = Math.max(0, agentNPBalance + npChange); // Ensure balance doesn't go below 0

      // Update client wallet (deduct ETH only)
      await UnifiedWalletModel.updateOne(
        { agentDid: clientDid },
        {
          $set: {
            'balances.ethereum.amount': ethers.formatEther(newClientEthBalance),
            'balances.ethereum.lastUpdated': new Date().toISOString()
          }
        }
      );

      // Update agent wallet (add ETH, change NP)
      await UnifiedWalletModel.updateOne(
        { agentDid: agentDid },
        {
          $set: {
            'balances.ethereum.amount': ethers.formatEther(newAgentEthBalance),
            'balances.ethereum.lastUpdated': new Date().toISOString(),
            'balances.nandaPoints.amount': newAgentNPBalance,
            'balances.nandaPoints.lastUpdated': new Date().toISOString()
          }
        }
      );

      // Update agent reputation and task counts
      const newTotalTasks = agent.reputation.totalTasks + 1;
      const newSuccessfulTasks = isPenalty ? 
        agent.reputation.successfulTasks : 
        agent.reputation.successfulTasks + 1;

      await UnifiedAgentModel.updateOne(
        { did: agentDid },
        {
          $set: {
            'reputation.score': newReputationScore,
            'reputation.lastUpdated': new Date().toISOString(),
            'reputation.totalTasks': newTotalTasks,
            'reputation.successfulTasks': newSuccessfulTasks,
            'reputation.averageRating': Math.round(
              (agent.reputation.averageRating * agent.reputation.totalTasks + (clientRating || 85)) / 
              newTotalTasks
            )
          }
        }
      );

      // Update transaction status
      transaction.status = 'completed';
      transaction.payments.ethereum.status = 'completed';
      transaction.payments.nandaPoints.status = 'completed';
      transaction.updatedAt = new Date();

      await transaction.save();

      // Emit events
      if (isPenalty) {
        emit('agent.penalty.applied', {
          transactionId: transaction._id,
          type: 'hire_agent',
          clientDid,
          agentDid,
          ethAmount,
          npPenalty: npAmount,
          newReputationScore,
          clientRating
        });
      } else {
        emit('transaction.completed', {
          transactionId: transaction._id,
          type: 'hire_agent',
          clientDid,
          agentDid,
          ethAmount,
          npEarned: npAmount,
          newReputationScore
        });
      }

      emit('agent.reputation.updated', {
        agentDid,
        oldScore: agent.reputation.score,
        newScore: newReputationScore,
        change: newReputationScore - agent.reputation.score,
        isPenalty: isPenalty
      });

      return transaction;

    } catch (error) {
      // Rollback transaction
      transaction.status = 'failed';
      transaction.metadata.error = error.message;
      await transaction.save();
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<UnifiedTransactionDoc | null> {
    return UnifiedTransactionModel.findById(transactionId);
  }

  /**
   * List transactions for an agent
   */
  async listAgentTransactions(agentDid: string, limit: number = 50): Promise<UnifiedTransactionDoc[]> {
    return UnifiedTransactionModel.find({
      $or: [
        { 'client.did': agentDid },
        { 'agent.did': agentDid }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit);
  }

  /**
   * Exchange NP for ETH or vice versa
   */
  async exchangeCurrency(options: ExchangeOptions): Promise<UnifiedTransactionDoc> {
    const { fromCurrency, toCurrency, amount, agentDid, idempotencyKey } = options;

    const agent = await UnifiedAgentModel.findOne({ did: agentDid });
    if (!agent) {
      throw new Error('Agent not found');
    }

    const wallet = await UnifiedWalletModel.findOne({ agentDid });
    if (!wallet) {
      throw new Error('Agent wallet not found');
    }

    let fromAmount: number;
    let toAmount: number;

    if (fromCurrency === 'NP' && toCurrency === 'ETH') {
      fromAmount = amount;
      toAmount = amount / this.exchangeRate;
    } else if (fromCurrency === 'ETH' && toCurrency === 'NP') {
      fromAmount = amount;
      toAmount = amount * this.exchangeRate;
    } else {
      throw new Error('Invalid exchange pair');
    }

    // Validate balance
    if (fromCurrency === 'NP' && wallet.balances.nandaPoints.amount < fromAmount) {
      throw new Error('Insufficient NP balance');
    }
    if (fromCurrency === 'ETH' && parseFloat(wallet.balances.ethereum.amount) < fromAmount) {
      throw new Error('Insufficient ETH balance');
    }

    // Create exchange transaction
    const transaction = new UnifiedTransactionModel({
      type: 'exchange',
      status: 'processing',
      client: {
        did: agentDid,
        ethereumAddress: agent.ethereumAddress,
        walletId: wallet.walletId
      },
      agent: {
        did: agentDid,
        ethereumAddress: agent.ethereumAddress,
        walletId: wallet.walletId
      },
      payments: {
        ethereum: {
          amount: fromCurrency === 'ETH' ? fromAmount.toString() : toAmount.toString(),
          currency: 'ETH',
          fromAddress: agent.ethereumAddress,
          toAddress: agent.ethereumAddress,
          status: 'pending'
        },
        nandaPoints: {
          amount: fromCurrency === 'NP' ? fromAmount : toAmount,
          currency: 'NP',
          scale: 3,
          fromWallet: wallet.walletId,
          toWallet: wallet.walletId,
          status: 'pending'
        }
      },
      metadata: {
        idempotencyKey,
        memo: `Exchange ${fromAmount} ${fromCurrency} for ${toAmount} ${toCurrency}`,
        tags: ['exchange']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    try {
      // Update balances
      if (fromCurrency === 'NP') {
        await UnifiedWalletModel.updateOne(
          { agentDid },
          {
            $set: {
              'balances.nandaPoints.amount': wallet.balances.nandaPoints.amount - fromAmount,
              'balances.ethereum.amount': (parseFloat(wallet.balances.ethereum.amount) + toAmount).toString(),
              'balances.nandaPoints.lastUpdated': new Date().toISOString(),
              'balances.ethereum.lastUpdated': new Date().toISOString()
            }
          }
        );
      } else {
        await UnifiedWalletModel.updateOne(
          { agentDid },
          {
            $set: {
              'balances.ethereum.amount': (parseFloat(wallet.balances.ethereum.amount) - fromAmount).toString(),
              'balances.nandaPoints.amount': wallet.balances.nandaPoints.amount + toAmount,
              'balances.ethereum.lastUpdated': new Date().toISOString(),
              'balances.nandaPoints.lastUpdated': new Date().toISOString()
            }
          }
        );
      }

      transaction.status = 'completed';
      transaction.payments.ethereum.status = 'completed';
      transaction.payments.nandaPoints.status = 'completed';
      await transaction.save();

      emit('transaction.completed', {
        transactionId: transaction._id,
        type: 'exchange',
        agentDid,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount
      });

      return transaction;

    } catch (error) {
      transaction.status = 'failed';
      transaction.metadata.error = error.message;
      await transaction.save();
      throw error;
    }
  }
}
