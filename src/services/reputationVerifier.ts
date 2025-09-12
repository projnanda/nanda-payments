import * as crypto from 'crypto';

export interface ReputationScore {
  agentDid: string;
  score: number;
  timestamp: string;
  source: string;
}
export interface VerifierConfig {
  privateKey: string;  // Verifier's private key for decryption
  publicKey: string;   // Verifier's public key (for reference)
}
export class ReputationVerifier {
  private privateKey: string;
  private publicKey: string;

  constructor(config: VerifierConfig) {
    this.privateKey = config.privateKey;
    this.publicKey = config.publicKey;
  }
  /**
   * Decrypt and verify a reputation hash signed by an agent
   * @param encryptedHash - The encrypted reputation hash from the transaction
   * @param agentDid - The DID of the agent who signed the hash
   * @returns The decrypted reputation score or null if invalid
   */
  async decryptReputationHash(encryptedHash: string, agentDid: string): Promise<ReputationScore | null> {
    try {
      // Decode the base64 encrypted hash
      const encryptedBuffer = Buffer.from(encryptedHash, 'base64');
      // Decrypt using the verifier's private key
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedBuffer
      );
      
      // Parse the decrypted JSON
      const reputationData: ReputationScore = JSON.parse(decrypted.toString('utf8'));
      
      // Validate that the agent DID matches
      if (reputationData.agentDid !== agentDid) {
        console.warn(`Agent DID mismatch: expected \${agentDid}, got \${reputationData.agentDid}`);
        return null;
      }
      
      // Validate reputation score is within valid range (0-100)
      if (reputationData.score < 0 || reputationData.score > 100) {
        console.warn(`Invalid reputation score: \${reputationData.score}`);
        return null;
      }
      
      // Validate timestamp is recent (within 1 hour)
      const timestamp = new Date(reputationData.timestamp);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (timestamp < hourAgo) {
        console.warn(`Reputation hash is too old: \${reputationData.timestamp}`);
        return null;
      }
      
      return reputationData;
      
    } catch (error) {
      console.error('Failed to decrypt reputation hash:', error);
      return null;
    }
  }

  /**
   * Verify if a transaction should be allowed based on reputation score
   * @param reputationScore - The decrypted reputation score
   * @param minRequiredScore - Minimum reputation score required (default: 50)
   * @returns true if transaction should be allowed
   */
  verifyTransactionEligibility(reputationScore: ReputationScore, minRequiredScore: number = 50): boolean {
    return reputationScore.score >= minRequiredScore;
  }

  /**
   * Update reputation score based on transaction outcome
   * @param agentDid - The agent's DID
   * @param transactionSuccessful - Whether the transaction was successful
   * @param currentScore - Current reputation score
   * @returns Updated reputation score
   */
  updateReputationScore(agentDid: string, transactionSuccessful: boolean, currentScore: number): number {
    // Simple reputation update logic
    // In production, this would integrate with the reputation system
    if (transactionSuccessful) {
      return Math.min(100, currentScore + 1); // Increase by 1, max 100
    } else {
      return Math.max(0, currentScore - 5); // Decrease by 5, min 0
    }
  }

  /**
   * Generate verifier key pair (for setup/testing)
   */
  static generateKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }
}

// Utility functions for agents to encrypt reputation hashes
export class AgentReputationSigner {
  /**
   * Encrypt a reputation score with the verifier's public key
   * @param reputationScore - The reputation score to encrypt
   * @param verifierPublicKey - The verifier's public key
   * @returns Base64 encoded encrypted hash
   */
  static encryptReputationScore(reputationScore: ReputationScore, verifierPublicKey: string): string {
    const dataToEncrypt = JSON.stringify(reputationScore);
    const buffer = Buffer.from(dataToEncrypt, 'utf8');
    
    const encrypted = crypto.publicEncrypt(
      {
        key: verifierPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );
    
    return encrypted.toString('base64');
  }
}
