import readline from 'readline';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// Simulate agent performance
function simulateAgentPerformance(agent, taskDescription) {
  console.log(`\n🤖 ${agent.name} is working on: "${taskDescription}"`);
  console.log('⏳ Processing...');
  
  // Simulate work with dots
  return new Promise((resolve) => {
    let dots = 0;
    const interval = setInterval(() => {
      process.stdout.write('.');
      dots++;
      if (dots >= 10) {
        clearInterval(interval);
        console.log('\n');
        resolve();
      }
    }, 200);
  });
}

// Show dummy performance results
function showPerformanceResults(agent, taskDescription, rating) {
  console.log('\n📊 PERFORMANCE RESULTS:');
  console.log('========================');
  console.log(`Agent: ${agent.name}`);
  console.log(`Task: ${taskDescription}`);
  console.log(`Specialties: ${agent.specialties.join(', ')}`);
  console.log(`Current Reputation: ${agent.reputation}/100`);
  console.log(`Current NP Balance: ${agent.npBalance} NP`);
  console.log('');
  
  // Show dummy task completion details
  console.log('✅ TASK COMPLETED:');
  console.log('==================');
  
  if (rating >= 80) {
    console.log('🎉 Excellent work! The agent delivered:');
    console.log('• High-quality research with detailed analysis');
    console.log('• Comprehensive documentation and insights');
    console.log('• Met all requirements and exceeded expectations');
    console.log('• Delivered on time with professional communication');
  } else if (rating >= 60) {
    console.log('👍 Good work! The agent delivered:');
    console.log('• Solid research with adequate analysis');
    console.log('• Good documentation and clear insights');
    console.log('• Met most requirements satisfactorily');
    console.log('• Delivered on time with good communication');
  } else if (rating >= 40) {
    console.log('⚠️  Average work. The agent delivered:');
    console.log('• Basic research with limited analysis');
    console.log('• Minimal documentation and unclear insights');
    console.log('• Met some requirements but missed others');
    console.log('• Delivered late with poor communication');
  } else {
    console.log('❌ Poor work. The agent delivered:');
    console.log('• Incomplete research with no analysis');
    console.log('• No documentation and confusing insights');
    console.log('• Failed to meet most requirements');
    console.log('• Delivered very late with no communication');
  }
  
  console.log('');
}

// Calculate expected NP change
function calculateExpectedNPChange(agent, rating, complexity) {
  const basePoints = 10;
  const complexityMultiplier = {
    'low': 1.0,
    'medium': 1.5,
    'high': 2.0
  }[complexity] || 1.5;
  
  if (rating >= 60) {
    // Positive rating: earn NP
    const reputationBonus = (agent.reputation / 100) * 0.5;
    const satisfactionBonus = (rating / 100);
    
    const totalNP = Math.floor(
      basePoints * complexityMultiplier * (1 + reputationBonus + satisfactionBonus)
    );
    
    return Math.max(5, totalNP);
  } else {
    // Negative rating: lose NP (penalty)
    const penaltyMultiplier = {
      50: 0.5, 40: 0.8, 30: 1.2, 20: 1.5, 10: 2.0, 0: 2.5
    }[Math.floor(rating / 10) * 10] || 2.5;
    
    const reputationPenalty = (agent.reputation / 100) * 0.3;
    
    const penaltyPoints = Math.floor(
      basePoints * complexityMultiplier * penaltyMultiplier * (1 + reputationPenalty)
    );
    
    return -Math.max(2, penaltyPoints);
  }
}

// Calculate reputation change
function calculateReputationChange(currentReputation, rating) {
  if (rating >= 60) {
    // Positive rating: weighted average (70% current + 30% new)
    const newReputation = (currentReputation * 0.7) + (rating * 0.3);
    return Math.round(Math.max(0, Math.min(100, newReputation)));
  } else {
    // Negative rating: more severe reputation drop
    const penaltySeverity = (60 - rating) / 60; // 0 to 1, higher for worse ratings
    const reputationDrop = penaltySeverity * 15; // Up to 15 point drop
    const newReputation = currentReputation - reputationDrop;
    return Math.round(Math.max(0, Math.min(100, newReputation)));
  }
}

// Main demo function
async function runInteractiveDemo() {
  console.log('🎯 INTERACTIVE AI AGENT MARKETPLACE DEMO');
  console.log('========================================\n');
  
  // Mock agents data
  const agents = [
    {
      name: 'NANDA - Research Agent',
      reputation: 95,
      npBalance: 100,
      specialties: ['Research', 'AI', 'Data Analysis']
    },
    {
      name: 'Google - Research Agent',
      reputation: 92,
      npBalance: 100,
      specialties: ['Research', 'Machine Learning', 'AI']
    },
    {
      name: 'IBM - Data Analysis Pro',
      reputation: 88,
      npBalance: 100,
      specialties: ['Data Analysis', 'Statistics', 'Visualization']
    },
    {
      name: 'Berkeley - Research Agent',
      reputation: 90,
      npBalance: 100,
      specialties: ['Research', 'Academic', 'Scientific Analysis']
    },
    {
      name: 'SwarmZero - Research Agent',
      reputation: 87,
      npBalance: 100,
      specialties: ['Research', 'Swarm Intelligence', 'Distributed Systems']
    },
    {
      name: 'Salesforce - Content Writing Expert',
      reputation: 89,
      npBalance: 100,
      specialties: ['Content Writing', 'Marketing', 'Technical Writing']
    },
    {
      name: 'AWS - Research Agent',
      reputation: 91,
      npBalance: 100,
      specialties: ['Research', 'Cloud Computing', 'AI/ML']
    },
    {
      name: 'Metaschool - Content Writing Expert',
      reputation: 84,
      npBalance: 100,
      specialties: ['Content Writing', 'Education', 'Web3']
    }
  ];
  
  // Display agents
  console.log('🤖 AVAILABLE AI AGENTS:');
  console.log('========================');
  
  agents.forEach((agent, index) => {
    console.log(`${index + 1}. ${agent.name}`);
    console.log(`   Reputation: ${agent.reputation}/100`);
    console.log(`   NP Balance: ${agent.npBalance} NP`);
    console.log(`   Specialties: ${agent.specialties.join(', ')}`);
    console.log(`   Price: 0.001 ETH per task`);
    console.log('');
  });
  
  // Ask client to select agent
  const agentChoice = await askQuestion('👤 Please select an agent (enter number 1-8): ');
  const agentIndex = parseInt(agentChoice) - 1;
  
  if (agentIndex < 0 || agentIndex >= agents.length) {
    console.log('❌ Invalid selection. Please run the demo again.');
    rl.close();
    return;
  }
  
  const selectedAgent = agents[agentIndex];
  
  console.log(`\n✅ You selected: ${selectedAgent.name}`);
  console.log(`   Reputation: ${selectedAgent.reputation}/100`);
  console.log(`   Current NP Balance: ${selectedAgent.npBalance} NP`);
  
  // Ask for task description
  const taskDescription = await askQuestion('\n📝 Enter task description: ');
  
  // Ask for complexity
  const complexityChoice = await askQuestion('\n⚡ Select task complexity (1=Low, 2=Medium, 3=High): ');
  const complexityMap = { '1': 'low', '2': 'medium', '3': 'high' };
  const complexity = complexityMap[complexityChoice] || 'medium';
  
  console.log(`\n🎯 Task Details:`);
  console.log(`   Agent: ${selectedAgent.name}`);
  console.log(`   Task: ${taskDescription}`);
  console.log(`   Complexity: ${complexity.toUpperCase()}`);
  console.log(`   Cost: 0.001 ETH`);
  
  const confirm = await askQuestion('\n💰 Confirm hiring this agent? (y/n): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Transaction cancelled.');
    rl.close();
    return;
  }
  
  // Simulate agent performance
  await simulateAgentPerformance(selectedAgent, taskDescription);
  
  // Show performance results
  console.log('✅ Task completed! Now please rate the agent\'s performance.');
  
  // Ask for rating
  const ratingInput = await askQuestion('\n⭐ Rate the agent\'s performance (0-100): ');
  const rating = parseInt(ratingInput);
  
  if (isNaN(rating) || rating < 0 || rating > 100) {
    console.log('❌ Invalid rating. Please enter a number between 0-100.');
    rl.close();
    return;
  }
  
  // Show performance results
  showPerformanceResults(selectedAgent, taskDescription, rating);
  
  // Calculate expected changes
  const expectedNPChange = calculateExpectedNPChange(selectedAgent, rating, complexity);
  const newReputation = calculateReputationChange(selectedAgent.reputation, rating);
  const isPenalty = expectedNPChange < 0;
  
  console.log('📊 EXPECTED CHANGES:');
  console.log('====================');
  console.log(`Client Rating: ${rating}/100`);
  console.log(`ETH Payment: 0.001 ETH (deducted from client, added to agent)`);
  console.log(`NP Change: ${expectedNPChange > 0 ? '+' : ''}${expectedNPChange} NP ${isPenalty ? '(PENALTY)' : '(EARNED)'}`);
  console.log(`New NP Balance: ${selectedAgent.npBalance + expectedNPChange} NP`);
  console.log(`Reputation Change: ${newReputation - selectedAgent.reputation > 0 ? '+' : ''}${newReputation - selectedAgent.reputation}`);
  console.log(`New Reputation: ${newReputation}/100`);
  
  // Process transaction
  console.log('\n💳 Processing transaction...');
  
  // Simulate transaction processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n🎉 TRANSACTION COMPLETED SUCCESSFULLY!');
  console.log('=====================================');
  console.log(`Transaction ID: tx_${Date.now()}`);
  console.log(`ETH Paid: 0.001 ETH`);
  console.log(`NP ${isPenalty ? 'Penalty' : 'Earned'}: ${Math.abs(expectedNPChange)} NP`);
  console.log(`Reputation Change: ${newReputation - selectedAgent.reputation > 0 ? '+' : ''}${newReputation - selectedAgent.reputation}`);
  console.log(`New Reputation: ${newReputation}/100`);
  
  console.log('\n📈 UPDATED AGENT STATUS:');
  console.log('========================');
  console.log(`Agent: ${selectedAgent.name}`);
  console.log(`New NP Balance: ${selectedAgent.npBalance + expectedNPChange} NP`);
  console.log(`New Reputation: ${newReputation}/100`);
  console.log(`Total Tasks: 1`);
  console.log(`Successful Tasks: ${rating >= 60 ? 1 : 0}`);
  console.log(`Success Rate: ${rating >= 60 ? 100 : 0}%`);
  
  console.log('\n🎯 DEMO COMPLETED!');
  console.log('==================');
  console.log('Thank you for trying the AI Agent Marketplace!');
  console.log('The system successfully:');
  console.log('• Processed your agent selection');
  console.log('• Simulated task performance');
  console.log('• Applied your rating');
  console.log('• Updated NP points and reputation');
  console.log('• Processed ETH payment');
  
  if (isPenalty) {
    console.log('\n⚠️  PENALTY APPLIED:');
    console.log('===================');
    console.log(`The agent received a penalty of ${Math.abs(expectedNPChange)} NP points`);
    console.log(`due to the low rating (${rating}/100).`);
    console.log('This incentivizes agents to maintain high quality performance.');
  } else {
    console.log('\n🎉 REWARD EARNED:');
    console.log('=================');
    console.log(`The agent earned ${expectedNPChange} NP points`);
    console.log(`due to the good rating (${rating}/100).`);
    console.log('This rewards agents for excellent performance.');
  }
  
  rl.close();
}

// Run the interactive demo
runInteractiveDemo();
