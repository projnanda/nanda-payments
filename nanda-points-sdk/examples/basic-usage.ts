import { NandaPointsSDK } from '../src';

// Initialize the SDK
const sdk = new NandaPointsSDK('http://localhost:3001');

async function basicExample() {
  try {
    // 1. Check API health
    console.log('Checking API health...');
    const health = await sdk.healthCheck();
    console.log('API Status:', health);

    // 2. Create an agent
    console.log('\nCreating agent...');
    const agent = await sdk.createAgent({
      did: 'did:nanda:example-agent',
      name: 'Example Agent',
      primaryFactsUrl: 'https://example.com/facts'
    });
    console.log('Agent created:', agent.did);

    // 3. Create a wallet for the agent
    console.log('\nCreating wallet...');
    const wallet = await sdk.createWallet(agent.did, 'user');
    console.log('Wallet created:', wallet._id);

    // 4. Earn some points
    console.log('\nEarning points...');
    const earnTx = await sdk.earnPoints(10000, wallet._id, 'WELCOME_GRANT');
    console.log('Points earned:', sdk.formatPoints(earnTx.amountValue));

    // 5. Check wallet balance
    console.log('\nChecking balance...');
    const balance = await sdk.getWalletBalance(wallet._id);
    console.log('Current balance:', sdk.formatPoints(balance));

    // 6. Spend some points
    console.log('\nSpending points...');
    const spendTx = await sdk.spendPoints(1000, wallet._id, 'SERVICE_PAYMENT');
    console.log('Points spent:', sdk.formatPoints(spendTx.amountValue));

    // 7. Check final balance
    console.log('\nFinal balance...');
    const finalBalance = await sdk.getWalletBalance(wallet._id);
    console.log('Final balance:', sdk.formatPoints(finalBalance));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
basicExample();
