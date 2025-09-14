import { TransactionModel, AgentModel } from '../models/index.js';
export class ReputationCalculator {
    static SCORE_WEIGHTS = {
        transactionSuccess: 0.3, // 30% - Success rate
        transactionVolume: 0.2, // 20% - Total volume handled
        accountAge: 0.15, // 15% - How long account has been active
        transactionFrequency: 0.15, // 15% - Regular activity
        transactionDiversity: 0.1, // 10% - Different types of transactions
        recentActivity: 0.1 // 10% - Recent transaction activity
    };
    static REPUTATION_LEVELS = {
        excellent: { min: 85, max: 100 },
        good: { min: 70, max: 84 },
        fair: { min: 50, max: 69 },
        poor: { min: 0, max: 49 }
    };
    /**
     * Calculate reputation score for an agent based on their transaction history
     */
    static async calculateReputationScore(agentDid) {
        try {
            // Get agent information
            const agent = await AgentModel.findOne({ did: agentDid });
            if (!agent) {
                throw new Error(`Agent with DID ${agentDid} not found`);
            }
            // Get all transactions for this agent
            const transactions = await TransactionModel.find({
                'actor.did': agentDid,
                status: { $in: ['posted', 'failed'] }
            }).sort({ createdAt: -1 });
            // Calculate metrics
            const metrics = this.calculateMetrics(transactions, agent.createdAt);
            // Calculate individual score components
            const successScore = this.calculateSuccessScore(transactions);
            const volumeScore = this.calculateVolumeScore(transactions);
            const ageScore = this.calculateAgeScore(agent.createdAt);
            const frequencyScore = this.calculateFrequencyScore(transactions);
            const diversityScore = this.calculateDiversityScore(transactions);
            const recentActivityScore = this.calculateRecentActivityScore(transactions);
            // Calculate weighted final score
            const finalScore = Math.round(successScore * this.SCORE_WEIGHTS.transactionSuccess +
                volumeScore * this.SCORE_WEIGHTS.transactionVolume +
                ageScore * this.SCORE_WEIGHTS.accountAge +
                frequencyScore * this.SCORE_WEIGHTS.transactionFrequency +
                diversityScore * this.SCORE_WEIGHTS.transactionDiversity +
                recentActivityScore * this.SCORE_WEIGHTS.recentActivity);
            // Ensure score is between 0 and 100
            const clampedScore = Math.max(0, Math.min(100, finalScore));
            // Determine reputation level
            const reputationLevel = this.determineReputationLevel(clampedScore);
            // Calculate transaction type requirements
            const requirements = this.calculateTransactionRequirements(clampedScore);
            return {
                agentDid,
                score: clampedScore,
                timestamp: new Date().toISOString(),
                source: 'nanda-reputation-system',
                lastUpdated: new Date().toISOString(),
                transactionCount: transactions.length,
                reputationLevel,
                requirements,
                metrics
            };
        }
        catch (error) {
            console.error(`Error calculating reputation for ${agentDid}:`, error);
            throw error;
        }
    }
    static calculateMetrics(transactions, accountCreatedAt) {
        const successfulTransactions = transactions.filter(tx => tx.status === 'posted');
        const failedTransactions = transactions.filter(tx => tx.status === 'failed');
        const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount.value, 0);
        const averageTransactionValue = transactions.length > 0 ? totalVolume / transactions.length : 0;
        const lastTransaction = transactions[0];
        const accountAge = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
            totalTransactions: transactions.length,
            successfulTransactions: successfulTransactions.length,
            failedTransactions: failedTransactions.length,
            totalVolume,
            averageTransactionValue: Math.round(averageTransactionValue),
            lastTransactionDate: lastTransaction ? lastTransaction.createdAt.toISOString() : null,
            accountAge
        };
    }
    static calculateSuccessScore(transactions) {
        if (transactions.length === 0)
            return 0;
        const successfulCount = transactions.filter(tx => tx.status === 'posted').length;
        const successRate = successfulCount / transactions.length;
        // Convert to 0-100 scale with bonus for high success rates
        return Math.min(100, successRate * 100 + (successRate > 0.95 ? 10 : 0));
    }
    static calculateVolumeScore(transactions) {
        if (transactions.length === 0)
            return 0;
        const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount.value, 0);
        // Logarithmic scale for volume (higher volume = higher score, but with diminishing returns)
        const volumeScore = Math.log10(totalVolume + 1) * 20;
        return Math.min(100, volumeScore);
    }
    static calculateAgeScore(accountCreatedAt) {
        const ageInDays = (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
        // Older accounts get higher scores, capped at 100
        const ageScore = Math.min(100, ageInDays * 2);
        return ageScore;
    }
    static calculateFrequencyScore(transactions) {
        if (transactions.length === 0)
            return 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentTransactions = transactions.filter(tx => tx.createdAt >= thirtyDaysAgo);
        // More recent transactions = higher score
        const frequencyScore = Math.min(100, recentTransactions.length * 5);
        return frequencyScore;
    }
    static calculateDiversityScore(transactions) {
        if (transactions.length === 0)
            return 0;
        const transactionTypes = new Set(transactions.map(tx => tx.type));
        const diversityRatio = transactionTypes.size / 9; // 9 possible transaction types
        return diversityRatio * 100;
    }
    static calculateRecentActivityScore(transactions) {
        if (transactions.length === 0)
            return 0;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentTransactions = transactions.filter(tx => tx.createdAt >= sevenDaysAgo);
        // Recent activity bonus
        return Math.min(100, recentTransactions.length * 20);
    }
    static determineReputationLevel(score) {
        if (score >= this.REPUTATION_LEVELS.excellent.min)
            return 'excellent';
        if (score >= this.REPUTATION_LEVELS.good.min)
            return 'good';
        if (score >= this.REPUTATION_LEVELS.fair.min)
            return 'fair';
        return 'poor';
    }
    static calculateTransactionRequirements(score) {
        const requirements = {
            transfer: { minScore: 50, eligible: score >= 50 },
            earn: { minScore: 40, eligible: score >= 40 },
            spend: { minScore: 60, eligible: score >= 60 },
            mint: { minScore: 80, eligible: score >= 80 },
            burn: { minScore: 30, eligible: score >= 30 },
            hold: { minScore: 50, eligible: score >= 50 },
            capture: { minScore: 65, eligible: score >= 65 },
            refund: { minScore: 45, eligible: score >= 45 },
            reversal: { minScore: 90, eligible: score >= 90 }
        };
        return requirements;
    }
    /**
     * Get cached reputation score or calculate if not cached
     */
    static async getReputationScore(agentDid, useCache = true) {
        // TODO: Implement caching mechanism here
        // For now, always calculate fresh
        return this.calculateReputationScore(agentDid);
    }
}
