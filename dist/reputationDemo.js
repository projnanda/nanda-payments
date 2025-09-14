import { ReputationVerifier, AgentReputationSigner } from './services/reputationVerifier.js';
import { TransactionReputationService } from './services/transactionReputationService.js';
import { initializeReputationService } from './services/reputationManager.js';
async function demonstrateReputationSystem() {
    console.log('🔐 Reputation Verification System Demo');
    console.log('=====================================\n');
    // Step 1: Generate verifier keys
    console.log('1. Generating verifier key pair...');
    const verifierKeys = ReputationVerifier.generateKeyPair();
    console.log('✅ Verifier keys generated');
    console.log(`   Public key length: ${verifierKeys.publicKey.length} characters`);
    console.log(`   Private key length: ${verifierKeys.privateKey.length} characters\n`);
    // Step 2: Initialize reputation service
    console.log('2. Initializing reputation service...');
    initializeReputationService(verifierKeys.privateKey, verifierKeys.publicKey);
    console.log('✅ Reputation service initialized\n');
    // Step 3: Create sample reputation data
    console.log('3. Creating sample reputation data...');
    const agentDid = 'did:nanda:test-agent';
    const reputationScore = {
        agentDid: agentDid,
        score: 85,
        timestamp: new Date().toISOString(),
        source: 'reputation-system'
    };
    console.log(`✅ Reputation data created for ${agentDid} with score ${reputationScore.score}\n`);
    // Step 4: Encrypt reputation hash (what agent would do)
    console.log('4. Agent encrypting reputation hash...');
    const encryptedHash = AgentReputationSigner.encryptReputationScore(reputationScore, verifierKeys.publicKey);
    console.log('✅ Reputation hash encrypted');
    console.log(`   Encrypted hash length: ${encryptedHash.length} characters\n`);
    // Step 5: Verifier decrypts and validates (what verifier would do)
    console.log('5. Verifier decrypting and validating reputation hash...');
    const verifier = new ReputationVerifier(verifierKeys);
    const decryptedScore = await verifier.decryptReputationHash(encryptedHash, agentDid);
    if (decryptedScore) {
        console.log('✅ Reputation hash successfully decrypted and validated');
        console.log(`   Agent DID: ${decryptedScore.agentDid}`);
        console.log(`   Score: ${decryptedScore.score}`);
        console.log(`   Timestamp: ${decryptedScore.timestamp}`);
        console.log(`   Source: ${decryptedScore.source}\n`);
    }
    else {
        console.log('❌ Failed to decrypt or validate reputation hash\n');
        return;
    }
    // Step 6: Test transaction eligibility
    console.log('6. Testing transaction eligibility...');
    const minRequiredScore = 50;
    const isEligible = verifier.verifyTransactionEligibility(decryptedScore, minRequiredScore);
    console.log(`✅ Transaction eligibility check: ${isEligible ? 'APPROVED' : 'REJECTED'}`);
    console.log(`   Required score: ${minRequiredScore}, Agent score: ${decryptedScore.score}\n`);
    // Step 7: Test with different transaction types
    console.log('7. Testing reputation requirements for different transaction types...');
    const reputationService = new TransactionReputationService(verifierKeys);
    const transactionTypes = ['transfer', 'earn', 'spend', 'mint', 'burn'];
    const amounts = [1000, 15000];
    for (const type of transactionTypes) {
        for (const amount of amounts) {
            const minScore = reputationService.getMinimumReputationRequirement(type, amount);
            const eligible = decryptedScore.score >= minScore;
            console.log(`   ${type.padEnd(8)} (${amount.toString().padStart(5)} NP): min score ${minScore.toString().padStart(2)}, status: ${eligible ? '✅ APPROVED' : '❌ REJECTED'}`);
        }
    }
    console.log();
    // Step 8: Simulate reputation update after transaction
    console.log('8. Simulating reputation update after successful transaction...');
    const currentScore = decryptedScore.score;
    const newScore = verifier.updateReputationScore(agentDid, true, currentScore);
    console.log(`✅ Reputation updated: ${currentScore} -> ${newScore} (+${newScore - currentScore})\n`);
    // Step 9: Test with invalid scenarios
    console.log('9. Testing invalid scenarios...');
    // Test with wrong agent DID
    console.log('   Testing with wrong agent DID...');
    const wrongAgentResult = await verifier.decryptReputationHash(encryptedHash, 'did:nanda:wrong-agent');
    console.log(`   Result: ${wrongAgentResult ? '❌ Should have failed' : '✅ Correctly rejected'}`);
    // Test with corrupted hash
    console.log('   Testing with corrupted hash...');
    const corruptedHash = encryptedHash.slice(0, -10) + 'corrupted';
    const corruptedResult = await verifier.decryptReputationHash(corruptedHash, agentDid);
    console.log(`   Result: ${corruptedResult ? '❌ Should have failed' : '✅ Correctly rejected'}`);
    console.log();
    console.log('🎉 Reputation verification system demonstration completed!');
    console.log('=====================================');
    return {
        verifierKeys,
        sampleReputationHash: encryptedHash,
        agentDid,
        reputationScore
    };
}
// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateReputationSystem()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Demo failed:', error);
        process.exit(1);
    });
}
export { demonstrateReputationSystem };
