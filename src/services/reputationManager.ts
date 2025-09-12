import { TransactionReputationService } from './transactionReputationService.js';
import { ReputationVerifier } from './reputationVerifier.js';

// Global reputation service instance
let reputationService: TransactionReputationService | null = null;

/**
 * Initialize the reputation service with verifier keys
 * @param privateKey - Verifier's private key
 * @param publicKey - Verifier's public key
 */
export function initializeReputationService(privateKey: string, publicKey: string) {
  reputationService = new TransactionReputationService({ privateKey, publicKey });
}

/**
 * Get the current reputation service instance
 * @returns The reputation service or null if not initialized
 */
export function getReputationService(): TransactionReputationService | null {
  return reputationService;
}

/**
 * Generate test verifier keys for development/testing
 * @returns Object with privateKey and publicKey
 */
export function generateTestVerifierKeys() {
  return ReputationVerifier.generateKeyPair();
}

/**
 * Check if reputation service is initialized
 * @returns true if service is ready
 */
export function isReputationServiceReady(): boolean {
  return reputationService !== null;
}
