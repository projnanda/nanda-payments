import { ReputationVerifier, ReputationScore, VerifierConfig } from './reputationVerifier.js';
import { TransactionModel } from '../models/index.js';

export class TransactionReputationService {
  private verifier: ReputationVerifier;

  constructor(verifierConfig: VerifierConfig) {
    this.verifier = new ReputationVerifier(verifierConfig);
  }

  /**
   * Verify reputation for a transaction before processing
   * @param transactionData - The transaction data including reputation hash
   * @param agentDid - The agent's DID
   * @param minRequiredScore - Minimum reputation score required (default: 50)
   * @returns Verification result with reputation score or error
   */
  async verifyTransactionReputation(
    transactionData: { reputationHash?: string },
    agentDid: string,
    minRequiredScore: number = 50
  ): Promise<{
    isValid: boolean;
    reputationScore?: ReputationScore;
    error?: string;
  }> {
    try {
      // If no reputation hash provided, allow transaction but log warning
      if (!transactionData.reputationHash) {
        console.warn(`No reputation hash provided for agent: \${agentDid}`);
        return {
          isValid: true,
          error: 'No reputation hash provided'
        };
      }

      // Decrypt and verify the reputation hash
      const reputationScore = await this.verifier.decryptReputationHash(
        transactionData.reputationHash,
        agentDid
      );

      if (!reputationScore) {
        return {
          isValid: false,
          error: 'Failed to decrypt or validate reputation hash'
        };
      }

      // Check if reputation meets minimum requirements
      const isEligible = this.verifier.verifyTransactionEligibility(reputationScore, minRequiredScore);

      if (!isEligible) {
        return {
          isValid: false,
          reputationScore,
          error: `Reputation score \${reputationScore.score} is below minimum required \${minRequiredScore}`
        };
      }

      return {
        isValid: true,
        reputationScore
      };

    } catch (error) {
      console.error('Error verifying transaction reputation:', error);
      return {
        isValid: false,
        error: 'Internal error during reputation verification'
      };
    }
  }

  /**
   * Update reputation score after transaction completion
   * @param transactionId - The transaction ID
   * @param agentDid - The agent's DID
   * @param wasSuccessful - Whether the transaction was successful
   * @param currentScore - Current reputation score
   * @returns Updated reputation score
   */
  async updateReputationAfterTransaction(
    transactionId: string,
    agentDid: string,
    wasSuccessful: boolean,
    currentScore: number
  ): Promise<number> {
    try {
      const newScore = this.verifier.updateReputationScore(agentDid, wasSuccessful, currentScore);
      
      // Log the reputation update
      console.log(`Updated reputation for \${agentDid}: \${currentScore} -> \${newScore} (transaction: \${transactionId}, success: \${wasSuccessful})`);
      
      // In a production system, you would also update the reputation in your reputation database/system
      // await this.updateReputationInDatabase(agentDid, newScore);
      
      return newScore;
    } catch (error) {
      console.error('Error updating reputation after transaction:', error);
      return currentScore; // Return original score if update fails
    }
  }

  /**
   * Validate reputation hash format and structure
   * @param reputationHash - The reputation hash to validate
   * @returns true if valid format
   */
  validateReputationHashFormat(reputationHash: string): boolean {
    try {
      // Check if it's a valid base64 string
      const decoded = Buffer.from(reputationHash, 'base64');
      return decoded.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get minimum reputation requirements for different transaction types
   * @param transactionType - The type of transaction
   * @param transactionAmount - The amount of the transaction
   * @returns Minimum reputation score required
   */
  getMinimumReputationRequirement(transactionType: string, transactionAmount: number): number {
    // Define different reputation requirements based on transaction type and amount
    const requirements = {
      'transfer': transactionAmount > 10000 ? 70 : 50,  // Higher amount needs higher reputation
      'earn': 40,     // Lower requirement for earning
      'spend': 60,    // Higher requirement for spending
      'mint': 80,     // Very high requirement for minting
      'burn': 30,     // Lower requirement for burning
      'hold': 50,     // Standard requirement
      'capture': 65,  // Higher requirement for captures
      'refund': 45,   // Lower requirement for refunds
      'reversal': 90  // Highest requirement for reversals
    };

    return requirements[transactionType as keyof typeof requirements] || 50; // Default to 50
  }

  /**
   * Generate a sample encrypted reputation hash for testing
   * @param agentDid - The agent's DID
   * @param score - The reputation score
   * @param verifierPublicKey - The verifier's public key
   * @returns Encrypted reputation hash
   */
  static generateSampleReputationHash(agentDid: string, score: number, verifierPublicKey: string): string {
    const { AgentReputationSigner } = require('./reputationVerifier.js');
    
    const reputationScore = {
      agentDid,
      score,
      timestamp: new Date().toISOString(),
      source: 'reputation-system'
    };

    return AgentReputationSigner.encryptReputationScore(reputationScore, verifierPublicKey);
  }
}
