import { NandaPointsSDK } from '../src';

// Initialize the SDK
const sdk = new NandaPointsSDK('http://localhost:3001');

async function reputationExample() {
  try {
    // 1. Create two agents
    console.log('Creating agents...');
    const agentA = await sdk.createAgent({
      did: 'did:nanda:agent-a',
      name: 'Agent A',
      primaryFactsUrl: 'https://agent-a.com/facts'
    });

    const agentB = await sdk.createAgent({
      did: 'did:nanda:agent-b',
      name: 'Agent B',
      primaryFactsUrl: 'https://agent-b.com/facts'
    });

    // 2. Create wallets
    console.log('Creating wallets...');
    const walletA = await sdk.createWallet(agentA.did, 'user');
    const walletB = await sdk.createWallet(agentB.did, 'user');

    // 3. Give agent A some points
    console.log('Giving agent A some points...');
    await sdk.earnPoints(50000, walletA._id, 'WELCOME_GRANT');

    // 4. Check reputation requirements
    console.log('Checking reputation requirements...');
    const requirements = await sdk.getReputationRequirements('transfer', 1000);
    console.log('Required reputation score:', requirements.minimumReputationScore);

    // 5. Generate reputation keys (for demo purposes)
    console.log('Generating reputation keys...');
    const keys = await sdk.generateReputationKeys();
    console.log('Keys generated successfully');

    // 6. Create an invoice
    console.log('Creating invoice...');
    const invoice = await sdk.createInvoice({
      amount: { value: 5000 },
      issuer: { did: agentB.did, walletId: walletB._id },
      recipient: { did: agentA.did, walletId: walletA._id },
      metadata: {
        memo: 'Service payment',
        description: 'Payment for completed task'
      }
    });
    console.log('Invoice created:', invoice.invoiceNumber);

    // 7. Issue the invoice
    console.log('Issuing invoice...');
    const issuedInvoice = await sdk.issueInvoice(invoice._id);
    console.log('Invoice issued:', issuedInvoice.status);

    // 8. Pay the invoice
    console.log('Paying invoice...');
    const paidInvoice = await sdk.payInvoice(
      issuedInvoice._id,
      5000,
      walletA._id
    );
    console.log('Invoice paid:', paidInvoice.status);

    // 9. Check final balances
    console.log('\nFinal balances:');
    const balanceA = await sdk.getWalletBalance(walletA._id);
    const balanceB = await sdk.getWalletBalance(walletB._id);
    console.log('Agent A balance:', sdk.formatPoints(balanceA));
    console.log('Agent B balance:', sdk.formatPoints(balanceB));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
reputationExample();
