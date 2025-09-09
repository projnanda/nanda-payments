const { createClientWallet } = require('./create-client-wallet.js');

async function runDemo() {
  console.log('🎬 Starting Client Wallet Demo');
  console.log('==============================\n');

  try {
    const result = await createClientWallet();
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('================================');
    console.log('Your new client wallet is ready to use.');
    console.log('\n📋 Summary:');
    console.log(`• Client DID: ${result.clientDid}`);
    console.log(`• Wallet ID: ${result.walletId}`);
    console.log(`• ETH Address: ${result.ethereumAddress}`);
    console.log(`• Private Key: ${result.privateKey.substring(0, 10)}...`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Add some ETH to the address for testing');
    console.log('2. Start the server: npm run dev');
    console.log('3. Use the API to create transactions');
    console.log('4. Monitor real-time events via WebSocket');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

runDemo();
