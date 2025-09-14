import * as crypto from 'crypto';
export class ReputationVerifier {
    privateKey;
    publicKey;
    constructor(config) {
        this.privateKey = config.privateKey;
        this.publicKey = config.publicKey;
    }
    /**
     * Decrypt and verify a reputation hash signed by an agent
     * @param encryptedHash - The encrypted reputation hash from the transaction
     * @param agentDid - The DID of the agent who signed the hash
     * @returns The decrypted reputation score or null if invalid
     */
    async decryptReputationHash(encryptedHash, agentDid) {
        try {
            // Decode the base64 encrypted hash
            const encryptedBuffer = Buffer.from(encryptedHash, 'base64');
            // Parse the hybrid encrypted data
            const encryptedData = JSON.parse(encryptedBuffer.toString('utf8'));
            const { encryptedKey, encryptedData: encryptedPayload, iv } = encryptedData;
            // Decrypt the AES key using RSA
            const aesKey = crypto.privateDecrypt({
                key: this.privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            }, Buffer.from(encryptedKey, 'base64'));
            // Decrypt the actual data using AES
            const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, Buffer.from(iv, 'base64'));
            let decrypted = decipher.update(encryptedPayload, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            // Parse the decrypted JSON
            const reputationData = JSON.parse(decrypted);
            // Validate that the agent DID matches
            if (reputationData.agentDid !== agentDid) {
                console.warn(`Agent DID mismatch: expected ${agentDid}, got ${reputationData.agentDid}`);
                return null;
            }
            // Validate reputation score is within valid range (0-100)
            if (reputationData.score < 0 || reputationData.score > 100) {
                console.warn(`Invalid reputation score: ${reputationData.score}`);
                return null;
            }
            // Validate timestamp is recent (within 1 hour)
            const timestamp = new Date(reputationData.timestamp);
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (timestamp < hourAgo) {
                console.warn(`Reputation hash is too old: ${reputationData.timestamp}`);
                return null;
            }
            return reputationData;
        }
        catch (error) {
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
    verifyTransactionEligibility(reputationScore, minRequiredScore = 50) {
        return reputationScore.score >= minRequiredScore;
    }
    /**
     * Update reputation score based on transaction outcome
     * @param agentDid - The agent's DID
     * @param transactionSuccessful - Whether the transaction was successful
     * @param currentScore - Current reputation score
     * @returns Updated reputation score
     */
    updateReputationScore(agentDid, transactionSuccessful, currentScore) {
        // Simple reputation update logic
        // In production, this would integrate with the reputation system
        if (transactionSuccessful) {
            return Math.min(100, currentScore + 1); // Increase by 1, max 100
        }
        else {
            return Math.max(0, currentScore - 5); // Decrease by 5, min 0
        }
    }
    /**
     * Generate verifier key pair (for setup/testing)
     */
    static generateKeyPair() {
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
     * Encrypt a reputation score with the verifier's public key using hybrid encryption
     * @param reputationScore - The reputation score to encrypt
     * @param verifierPublicKey - The verifier's public key
     * @returns Base64 encoded encrypted hash
     */
    static encryptReputationScore(reputationScore, verifierPublicKey) {
        try {
            // Generate a random AES key and IV
            const aesKey = crypto.randomBytes(32); // 256-bit key
            const iv = crypto.randomBytes(16); // 128-bit IV
            // Encrypt the data with AES
            const dataToEncrypt = JSON.stringify(reputationScore);
            const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
            let encryptedData = cipher.update(dataToEncrypt, 'utf8', 'base64');
            encryptedData += cipher.final('base64');
            // Encrypt the AES key with RSA
            const encryptedKey = crypto.publicEncrypt({
                key: verifierPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            }, aesKey);
            // Combine everything
            const hybridEncrypted = {
                encryptedKey: encryptedKey.toString('base64'),
                encryptedData: encryptedData,
                iv: iv.toString('base64')
            };
            return Buffer.from(JSON.stringify(hybridEncrypted)).toString('base64');
        }
        catch (error) {
            console.error('Failed to encrypt reputation score:', error);
            throw error;
        }
    }
}
