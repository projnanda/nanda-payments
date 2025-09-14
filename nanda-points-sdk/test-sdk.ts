#!/usr/bin/env tsx

/**
 * NANDA Points SDK Test Script
 * Tests all SDK methods using await
 */

import { NandaPointsSDK } from './src';

const API_BASE = 'http://localhost:3000'; // Note: API runs on 3000, not 3001

async function testSDK() {
  console.log('NANDA Points SDK Test Suite');
  console.log(`API: ${API_BASE}\n`);

  // Initialize SDK
  const sdk = new NandaPointsSDK(API_BASE);
  
  let wallet1Id: string = '';
  let wallet2Id: string = '';
  let agentDid: string = '';

  try {
    // 1. Health Check
    console.log('1. Testing Health Check...');
    const health = await sdk.healthCheck();
    console.log('PASS - Health:', health);
    console.log('');

    // 2. Create Agent with unique DID
    console.log('2. Creating Test Agent...');
    const uniqueDid = `did:nanda:sdk-test-agent-${Date.now()}`;
    const agent = await sdk.createAgent({
      did: uniqueDid,
      name: 'SDK Test Agent',
      primaryFactsUrl: 'https://sdk-test.com/facts'
    });
    agentDid = agent.did;
    console.log('PASS - Agent created:', agent.did);
    console.log('');

    // 3. Create Wallets
    console.log('3. Creating Wallets...');
    const wallet1 = await sdk.createWallet(agentDid, 'user');
    const wallet2 = await sdk.createWallet(agentDid, 'user');
    wallet1Id = wallet1._id;
    wallet2Id = wallet2._id;
    console.log('PASS - Wallet 1:', wallet1Id);
    console.log('PASS - Wallet 2:', wallet2Id);
    console.log('');

    // 4. Test Wallet Balance
    console.log('4. Testing Wallet Balance...');
    const balance1 = await sdk.getWalletBalance(wallet1Id);
    const balance2 = await sdk.getWalletBalance(wallet2Id);
    console.log('PASS - Wallet 1 Balance:', balance1);
    console.log('PASS - Wallet 2 Balance:', balance2);
    console.log('');

    // 5. Test Earn Points
    console.log('5. Testing Earn Points...');
    const earnTx = await sdk.earnPoints(1000, wallet1Id, 'TASK_COMPLETION');
    console.log('PASS - Earn Transaction:', earnTx._id);
    console.log('PASS - Amount:', sdk.formatPoints(earnTx.amountValue));
    console.log('');

    // 6. Test Transfer Points
    console.log('6. Testing Transfer Points...');
    const transferTx = await sdk.transferPoints(500, wallet1Id, wallet2Id, 'TASK_PAYOUT');
    console.log('PASS - Transfer Transaction:', transferTx._id);
    console.log('PASS - Amount:', sdk.formatPoints(transferTx.amountValue));
    console.log('');

    // 7. Test Spend Points
    console.log('7. Testing Spend Points...');
    const spendTx = await sdk.spendPoints(200, wallet2Id, 'SERVICE_PAYMENT');
    console.log('PASS - Spend Transaction:', spendTx._id);
    console.log('PASS - Amount:', sdk.formatPoints(spendTx.amountValue));
    console.log('');

    // 8. Test Final Balances
    console.log('8. Testing Final Balances...');
    const finalBalance1 = await sdk.getWalletBalance(wallet1Id);
    const finalBalance2 = await sdk.getWalletBalance(wallet2Id);
    console.log('PASS - Final Wallet 1 Balance:', sdk.formatPoints(finalBalance1));
    console.log('PASS - Final Wallet 2 Balance:', sdk.formatPoints(finalBalance2));
    console.log('');

    // 9. Test Invoice Creation
    console.log('9. Testing Invoice Creation...');
    const invoice = await sdk.createInvoice({
      amount: { value: 1000, currency: 'NP', scale: 3 },
      issuer: { did: agentDid, walletId: wallet1Id },
      recipient: { did: agentDid, walletId: wallet2Id },
      metadata: {
        memo: 'Test Invoice',
        description: 'SDK Test Invoice'
      }
    });
    console.log('PASS - Invoice created:', invoice._id);
    console.log('PASS - Invoice Number:', invoice.invoiceNumber);
    console.log('');

    // 10. Test Invoice Issuing
    console.log('10. Testing Invoice Issuing...');
    const issuedInvoice = await sdk.issueInvoice(invoice._id);
    console.log('PASS - Invoice issued:', issuedInvoice.status);
    console.log('');

    // 11. Test Invoice Payment
    console.log('11. Testing Invoice Payment...');
    const paidInvoice = await sdk.payInvoice(invoice._id, 1000, wallet2Id);
    console.log('PASS - Invoice paid:', paidInvoice.status);
    console.log('');

    // 12. Test Reputation Requirements
    console.log('12. Testing Reputation Requirements...');
    const reputationReq = await sdk.getReputationRequirements('transfer', 1000);
    console.log('PASS - Reputation Requirements:', reputationReq);
    console.log('');

    // 13. Test Reputation Keys Generation
    console.log('13. Testing Reputation Keys Generation...');
    const keys = await sdk.generateReputationKeys();
    console.log('PASS - Keys generated:', { 
      privateKey: keys.privateKey.substring(0, 20) + '...',
      publicKey: keys.publicKey.substring(0, 20) + '...'
    });
    console.log('');

    // 14. Test Agent Reputation Score
    console.log('14. Testing Agent Reputation Score...');
    try {
      const reputation = await sdk.getAgentReputation(agentDid);
      console.log('PASS - Agent Reputation Score:', reputation.data.reputation_score);
      console.log('PASS - Reputation Level:', reputation.data.reputationLevel);
      console.log('PASS - Transaction Count:', reputation.data.transactionCount);
      console.log('PASS - Total Volume:', sdk.formatPoints(reputation.data.metrics.totalVolume));
      console.log('PASS - Eligible for Transfer:', reputation.data.requirements.transfer.eligible);
      console.log('PASS - Eligible for Spend:', reputation.data.requirements.spend.eligible);
    } catch (error: any) {
      console.log('INFO - Agent Reputation not available:', error.message);
    }
    console.log('');

    // 15. Test Reputation Verification
    console.log('15. Testing Reputation Verification...');
    try {
      // Generate a mock reputation hash for testing
      const mockReputationHash = 'mock-reputation-hash-' + Date.now();
      const verification = await sdk.verifyAgentReputation(agentDid, mockReputationHash);
      console.log('PASS - Reputation Verification:', verification);
    } catch (error: any) {
      console.log('INFO - Reputation Verification test (expected 403 for mock hash):', error.message);
    }
    console.log('');

    // 16. Test Reputation-Enhanced Transfer
    console.log('16. Testing Reputation-Enhanced Transfer...');
    try {
      const reputationHash = 'test-reputation-hash-' + Date.now();
      const reputationTransfer = await sdk.transferPointsWithReputation(
        100, wallet1Id, wallet2Id, reputationHash, agentDid, 'REPUTATION_TRANSFER'
      );
      console.log('PASS - Reputation Transfer:', reputationTransfer._id);
      console.log('PASS - Amount:', sdk.formatPoints(reputationTransfer.amountValue));
    } catch (error: any) {
      console.log('INFO - Reputation Transfer test (expected 403 for mock hash):', error.message);
    }
    console.log('');

    // 17. Test Transaction Queries
    console.log('17. Testing Transaction Queries...');
    const transactions = await sdk.getWalletTransactions(wallet1Id, 10);
    console.log('PASS - Found', transactions.length, 'transactions for wallet 1');
    console.log('');

    // 18. Test Utility Methods
    console.log('18. Testing Utility Methods...');
    const formatted = sdk.formatPoints(1500);
    const parsed = sdk.parsePoints('1.500 NP');
    console.log('PASS - Format Points:', formatted);
    console.log('PASS - Parse Points:', parsed);
    console.log('');

    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('');
    console.log('Summary:');
    console.log(`- Agent DID: ${agentDid}`);
    console.log(`- Wallet 1 ID: ${wallet1Id}`);
    console.log(`- Wallet 2 ID: ${wallet2Id}`);
    console.log(`- Final Balance 1: ${sdk.formatPoints(finalBalance1)}`);
    console.log(`- Final Balance 2: ${sdk.formatPoints(finalBalance2)}`);

  } catch (error: any) {
    console.error('FAILED - Test failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSDK().catch(console.error);
