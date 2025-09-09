import { UnifiedAgentModel } from './models/UnifiedAgent.js';
import { UnifiedWalletModel } from './models/UnifiedWallet.js';
import { UnifiedTransactionModel } from './models/UnifiedTransaction.js';
import { ethers } from 'ethers';

// Initialize agents with 100 NP points each
const agents = [
  {
    did: 'did:nanda:nanda-research',
    ethereumAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    identity: {
      agentName: 'NANDA - Research Agent',
      label: 'NANDA Research Specialist',
      primaryFactsUrl: 'https://nanda.org/agents/nanda-research.json',
      factsDigest: 'sha256:abc123...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_nanda_research',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 95,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'stable' as const,
      reliability: 0.95
    },
    specialties: ['Research', 'AI', 'Data Analysis'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 15,
      dynamicPricing: true,
      reputationMultiplier: 1.2,
      experienceMultiplier: 1.1
    },
    performance: {
      successRate: 0.95,
      averageCompletionTime: '2 hours',
      responseTime: '5 minutes',
      qualityScore: 9.2
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:google:research-agent',
    ethereumAddress: '0x8ba1f109551bD432803012645Hac136c',
    identity: {
      agentName: 'Google - Research Agent',
      label: 'Google Research Specialist',
      primaryFactsUrl: 'https://google.com/agents/research.json',
      factsDigest: 'sha256:def456...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_google_research',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x8ba1f109551bD432803012645Hac136c',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 92,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'increasing' as const,
      reliability: 0.92
    },
    specialties: ['Research', 'Machine Learning', 'AI'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 12,
      dynamicPricing: true,
      reputationMultiplier: 1.1,
      experienceMultiplier: 1.0
    },
    performance: {
      successRate: 0.92,
      averageCompletionTime: '1.5 hours',
      responseTime: '3 minutes',
      qualityScore: 8.8
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:ibm:analysis-agent',
    ethereumAddress: '0x9ca2f209661cE543904123756Ibd247d',
    identity: {
      agentName: 'IBM - Data Analysis Pro',
      label: 'IBM Data Analysis Specialist',
      primaryFactsUrl: 'https://ibm.com/agents/analysis.json',
      factsDigest: 'sha256:ghi789...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_ibm_analysis',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x9ca2f209661cE543904123756Ibd247d',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 88,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'stable' as const,
      reliability: 0.88
    },
    specialties: ['Data Analysis', 'Statistics', 'Visualization'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 10,
      dynamicPricing: true,
      reputationMultiplier: 1.0,
      experienceMultiplier: 0.9
    },
    performance: {
      successRate: 0.88,
      averageCompletionTime: '3 hours',
      responseTime: '7 minutes',
      qualityScore: 8.5
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:berkeley:research-agent',
    ethereumAddress: '0x7da3e309771dF654905234867Jce358e',
    identity: {
      agentName: 'Berkeley - Research Agent',
      label: 'Berkeley Research Specialist',
      primaryFactsUrl: 'https://berkeley.edu/agents/research.json',
      factsDigest: 'sha256:jkl012...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_berkeley_research',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x7da3e309771dF654905234867Jce358e',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 90,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'increasing' as const,
      reliability: 0.90
    },
    specialties: ['Research', 'Academic', 'Scientific Analysis'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 11,
      dynamicPricing: true,
      reputationMultiplier: 1.05,
      experienceMultiplier: 1.0
    },
    performance: {
      successRate: 0.90,
      averageCompletionTime: '2.5 hours',
      responseTime: '6 minutes',
      qualityScore: 8.7
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:swarmzero:research-agent',
    ethereumAddress: '0x6ea4f409881eG765906345978Kdf469f',
    identity: {
      agentName: 'SwarmZero - Research Agent',
      label: 'SwarmZero Research Specialist',
      primaryFactsUrl: 'https://swarmzero.com/agents/research.json',
      factsDigest: 'sha256:mno345...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_swarmzero_research',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x6ea4f409881eG765906345978Kdf469f',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 87,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'stable' as const,
      reliability: 0.87
    },
    specialties: ['Research', 'Swarm Intelligence', 'Distributed Systems'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 9,
      dynamicPricing: true,
      reputationMultiplier: 0.95,
      experienceMultiplier: 0.9
    },
    performance: {
      successRate: 0.87,
      averageCompletionTime: '2.8 hours',
      responseTime: '8 minutes',
      qualityScore: 8.3
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:salesforce:writing-agent',
    ethereumAddress: '0x5fa5g509991fH876017456089Lef570g',
    identity: {
      agentName: 'Salesforce - Content Writing Expert',
      label: 'Salesforce Content Writing Specialist',
      primaryFactsUrl: 'https://salesforce.com/agents/writing.json',
      factsDigest: 'sha256:pqr678...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_salesforce_writing',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x5fa5g509991fH876017456089Lef570g',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 89,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'increasing' as const,
      reliability: 0.89
    },
    specialties: ['Content Writing', 'Marketing', 'Technical Writing'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 10,
      dynamicPricing: true,
      reputationMultiplier: 1.0,
      experienceMultiplier: 0.95
    },
    performance: {
      successRate: 0.89,
      averageCompletionTime: '1.8 hours',
      responseTime: '4 minutes',
      qualityScore: 8.6
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:aws:research-agent',
    ethereumAddress: '0x4ga6h609aa1gI987128567190Mfg681h',
    identity: {
      agentName: 'AWS - Research Agent',
      label: 'AWS Research Specialist',
      primaryFactsUrl: 'https://aws.com/agents/research.json',
      factsDigest: 'sha256:stu901...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_aws_research',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x4ga6h609aa1gI987128567190Mfg681h',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 91,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'increasing' as const,
      reliability: 0.91
    },
    specialties: ['Research', 'Cloud Computing', 'AI/ML'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 11,
      dynamicPricing: true,
      reputationMultiplier: 1.05,
      experienceMultiplier: 1.0
    },
    performance: {
      successRate: 0.91,
      averageCompletionTime: '2.2 hours',
      responseTime: '5 minutes',
      qualityScore: 8.8
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    did: 'did:metaschool:writing-agent',
    ethereumAddress: '0x3ha7i709bb2hJ098239678201Ngh792i',
    identity: {
      agentName: 'Metaschool - Content Writing Expert',
      label: 'Metaschool Content Writing Specialist',
      primaryFactsUrl: 'https://metaschool.so/agents/writing.json',
      factsDigest: 'sha256:vwx234...',
      verificationStatus: 'verified' as const
    },
    wallets: {
      nandaPoints: {
        walletId: 'np_wal_metaschool_writing',
        balance: 100, // Start with 100 NP points
        scale: 3,
        currency: 'NP' as const,
        lastUpdated: new Date().toISOString()
      },
      ethereum: {
        address: '0x3ha7i709bb2hJ098239678201Ngh792i',
        balance: '0.0',
        currency: 'ETH' as const,
        lastUpdated: new Date().toISOString()
      }
    },
    reputation: {
      score: 84,
      totalTasks: 0,
      successfulTasks: 0,
      averageRating: 0,
      lastUpdated: new Date().toISOString(),
      trend: 'stable' as const,
      reliability: 0.84
    },
    specialties: ['Content Writing', 'Education', 'Web3'],
    pricing: {
      minimumPrice: '0.001 ETH',
      nandaPointsRate: 8,
      dynamicPricing: true,
      reputationMultiplier: 0.9,
      experienceMultiplier: 0.85
    },
    performance: {
      successRate: 0.84,
      averageCompletionTime: '2.0 hours',
      responseTime: '6 minutes',
      qualityScore: 8.1
    },
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Create client wallet
const clientWallet = {
  walletId: 'client_wallet_001',
  agentDid: 'did:client:demo-client',
  balances: {
    ethereum: {
      amount: '0.1', // Client starts with 0.1 ETH
      currency: 'ETH',
      lastUpdated: new Date().toISOString()
    },
    nandaPoints: {
      amount: 0, // Client starts with 0 NP points
      currency: 'NP',
      scale: 3,
      lastUpdated: new Date().toISOString()
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await UnifiedAgentModel.deleteMany({});
    await UnifiedWalletModel.deleteMany({});
    await UnifiedTransactionModel.deleteMany({});
    
    console.log('🗑️  Cleared existing data');
    
    // Create agents
    const createdAgents = await UnifiedAgentModel.insertMany(agents);
    console.log(`✅ Created ${createdAgents.length} agents with 100 NP points each`);
    
    // Create agent wallets
    const agentWallets = createdAgents.map(agent => ({
      walletId: agent.wallets.nandaPoints.walletId,
      agentDid: agent.did,
      balances: {
        ethereum: {
          amount: agent.wallets.ethereum.balance,
          currency: 'ETH',
          lastUpdated: agent.wallets.ethereum.lastUpdated
        },
        nandaPoints: {
          amount: agent.wallets.nandaPoints.balance,
          currency: 'NP',
          scale: 3,
          lastUpdated: agent.wallets.nandaPoints.lastUpdated
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await UnifiedWalletModel.insertMany(agentWallets);
    console.log(`✅ Created ${agentWallets.length} agent wallets`);
    
    // Create client wallet
    await UnifiedWalletModel.create(clientWallet);
    console.log('✅ Created client wallet with 0.1 ETH');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${createdAgents.length} agents created (each with 100 NP points)`);
    console.log(`   • ${agentWallets.length} agent wallets created`);
    console.log(`   • 1 client wallet created (0.1 ETH)`);
    console.log('\n🚀 Ready for agent hiring and NP earning!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
