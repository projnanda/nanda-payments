const { ethers } = require('ethers');
const mongoose = require('mongoose');
const { UnifiedAgentModel } = require('../src/models/UnifiedAgent.js');
const { UnifiedWalletModel } = require('../src/models/UnifiedWallet.js');

// Load environment variables
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/unified-system';

async function createClientWallet() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;
    const mnemonic = wallet.mnemonic?.phrase;

    console.log('\n🔑 Generated New Client Wallet:');
    console.log('================================');
    console.log(`📍 Ethereum Address: ${address}`);
    console.log(`🔐 Private Key: ${privateKey}`);
    if (mnemonic) {
      console.log(`📝 Mnemonic: ${mnemonic}`);
    }

    // Create client DID
    const clientDid = `did:nanda:client_${Date.now()}`;
    
    // Create client agent
    const clientAgent = new UnifiedAgentModel({
      did: clientDid,
      ethereumAddress: address,
      identity: {
        agentName: 'Client User',
        label: 'Client',
        primaryFactsUrl: `https://client.nanda.org/${clientDid}`,
        verificationStatus: 'verified'
      },
      wallets: {
        nandaPoints: {
          walletId: 'pending',
          balance: 0,
          scale: 3,
          currency: 'NP',
          lastUpdated: new Date().toISOString()
        },
        ethereum: {
          address: address,
          balance: '0',
          currency: 'ETH',
          lastUpdated: new Date().toISOString()
        }
      },
      reputation: {
        score: 50,
        totalTasks: 0,
        successfulTasks: 0,
        averageRating: 0,
        lastUpdated: new Date().toISOString(),
        trend: 'stable',
        reliability: 0.5
      },
      specialties: ['client'],
      pricing: {
        minimumPrice: '0.001 ETH',
        nandaPointsRate: 1000,
        dynamicPricing: false,
        reputationMultiplier: 1.0,
        experienceMultiplier: 1.0
      },
      performance: {
        averageCompletionTime: 'N/A',
        successRate: 0,
        clientSatisfaction: 0,
        responseTime: 'N/A',
        availability: 'N/A'
      },
      earnings: {
        totalETH: '0',
        totalNP: 0,
        thisMonthETH: '0',
        thisMonthNP: 0,
        lifetimeEarnings: '0 ETH + 0 NP'
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await clientAgent.save();
    console.log(`✅ Created client agent: ${clientDid}`);

    // Create unified wallet
    const unifiedWallet = new UnifiedWalletModel({
      walletId: `wal_client_${Date.now()}`,
      agentDid: clientDid,
      ethereumAddress: address,
      balances: {
        nandaPoints: {
          amount: 0,
          scale: 3,
          currency: 'NP',
          lastUpdated: new Date().toISOString()
        },
        ethereum: {
          amount: '0',
          currency: 'ETH',
          lastUpdated: new Date().toISOString()
        }
      },
      limits: {
        dailyNP: 10000000, // Higher limits for clients
        dailyETH: '10.0',
        maxNP: 100000000,
        maxETH: '100.0',
        allowOverdraft: true
      },
      transactionHistory: [],
      exchangeRate: {
        npToEth: 0.000001,
        ethToNp: 1000000,
        lastUpdated: new Date().toISOString()
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    await unifiedWallet.save();
    console.log(`✅ Created unified wallet: ${unifiedWallet.walletId}`);

    // Update agent with wallet ID
    clientAgent.wallets.nandaPoints.walletId = unifiedWallet.walletId;
    await clientAgent.save();

    console.log('\n📊 Wallet Summary:');
    console.log('==================');
    console.log(`🆔 Client DID: ${clientDid}`);
    console.log(`💼 Wallet ID: ${unifiedWallet.walletId}`);
    console.log(`📍 ETH Address: ${address}`);
    console.log(`💰 NP Balance: 0`);
    console.log(`💰 ETH Balance: 0`);
    console.log(`📈 Status: Active`);

    console.log('\n🔧 Next Steps:');
    console.log('==============');
    console.log('1. Add ETH to this address for testing');
    console.log('2. Use the private key to sign transactions');
    console.log('3. Start hiring agents from the marketplace');
    console.log('4. Monitor balances and transaction history');

    console.log('\n⚠️  Security Warning:');
    console.log('====================');
    console.log('🔐 Keep your private key secure!');
    console.log('🚫 Never share it with anyone');
    console.log('💾 Store it in a safe place');
    console.log('🔒 Consider using a hardware wallet for production');

    console.log('\n🎯 Ready to use!');
    console.log('================');
    console.log('You can now use this wallet to:');
    console.log('• Hire AI agents from the marketplace');
    console.log('• Pay for tasks with ETH');
    console.log('• Earn NP rewards based on agent performance');
    console.log('• Exchange between NP and ETH');

    return {
      success: true,
      clientDid,
      walletId: unifiedWallet.walletId,
      ethereumAddress: address,
      privateKey,
      mnemonic
    };

  } catch (error) {
    console.error('❌ Error creating client wallet:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createClientWallet()
    .then((result) => {
      console.log('\n✅ Client wallet created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to create client wallet:', error);
      process.exit(1);
    });
}

module.exports = { createClientWallet };
