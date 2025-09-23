/**
 * Example MCP Server using @nanda/payments-sdk
 *
 * This demonstrates the "only way" for MCP developers to add payment requirements
 * to their tools going forward.
 *
 * Before: All tools are free
 * After: Some tools require NANDA Points payment
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import our NANDA Payments SDK
import { quickSetup, ToolPaymentRequirement } from '@nanda/payments-sdk';

// Initialize payment configuration
const payments = quickSetup({
  facilitatorUrl: process.env.FACILITATOR_URL || 'http://localhost:3001',
  agentName: process.env.AGENT_NAME || 'example-mcp-server'
});

// Create MCP server
const server = new Server(
  {
    name: 'nanda-payments-example',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// FREE TOOLS (unchanged from original MCP server)
// ============================================================================

/**
 * Free weather tool - no payment required
 * This is how tools work normally in MCP
 */
async function getWeatherTool(args: { location: string }) {
  return {
    content: [
      {
        type: 'text',
        text: `Weather in ${args.location}: Sunny, 72°F. This is a free tool!`
      }
    ]
  };
}

/**
 * Free time tool - no payment required
 */
async function getCurrentTimeTool() {
  return {
    content: [
      {
        type: 'text',
        text: `Current time: ${new Date().toISOString()}. This is also free!`
      }
    ]
  };
}

// ============================================================================
// PAID TOOLS (new with SDK)
// ============================================================================

/**
 * Premium weather analysis - requires 5 NP payment
 * This shows how to add payment requirements to existing tools
 */
const premiumWeatherRequirement: ToolPaymentRequirement = {
  amount: 5,
  description: 'Premium weather analysis with forecasts',
  recipient: 'weather-service'
};

async function premiumWeatherTool(args: { location: string }) {
  // This tool now requires payment before execution
  return {
    content: [
      {
        type: 'text',
        text: `PREMIUM Weather Analysis for ${args.location}:

🌤️ Current: Sunny, 72°F, Humidity 45%
📈 Forecast:
  - Tomorrow: Partly cloudy, High 75°F, Low 62°F
  - This Week: Mild temperatures, 20% chance rain Thursday
  - Air Quality: Good (AQI 42)
  - UV Index: 6 (High)
  - Wind: 8 mph NW

💰 Payment received: 5 NP. Thank you for using premium services!`
      }
    ]
  };
}

/**
 * Code analysis tool - requires 10 NP payment
 * Shows how to create a completely new paid tool
 */
const codeAnalysisRequirement: ToolPaymentRequirement = {
  amount: 10,
  description: 'Advanced code analysis and recommendations',
  recipient: 'code-analyzer'
};

async function codeAnalysisTool(args: { code: string, language?: string }) {
  return {
    content: [
      {
        type: 'text',
        text: `🔍 Advanced Code Analysis Results:

Code Quality Score: 8.5/10
Language: ${args.language || 'auto-detected'}

📊 Analysis:
- Complexity: Medium
- Maintainability: High
- Performance: Good
- Security: No issues found

💡 Recommendations:
- Consider adding unit tests
- Extract magic numbers to constants
- Add error handling for edge cases

💰 Analysis cost: 10 NP. Premium analysis complete!`
      }
    ]
  };
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Free tools
      {
        name: 'weather',
        description: 'Get current weather for a location (FREE)',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location to get weather for'
            }
          },
          required: ['location']
        }
      },
      {
        name: 'time',
        description: 'Get current time (FREE)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      // Paid tools - note the payment info in description
      {
        name: 'premium-weather',
        description: 'Premium weather analysis with forecasts (5 NP)',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location for premium weather analysis'
            }
          },
          required: ['location']
        }
      },
      {
        name: 'code-analysis',
        description: 'Advanced code analysis and recommendations (10 NP)',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Code to analyze'
            },
            language: {
              type: 'string',
              description: 'Programming language (optional)'
            }
          },
          required: ['code']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // Free tools - work as normal
    case 'weather':
      return await getWeatherTool(args as { location: string });

    case 'time':
      return await getCurrentTimeTool();

    // Paid tools - wrapped with payment requirements
    case 'premium-weather':
      // Use SDK to require payment before tool execution
      const paidWeatherTool = payments.requirePayment(premiumWeatherRequirement)(
        premiumWeatherTool
      );
      return await paidWeatherTool(args as { location: string });

    case 'code-analysis':
      // Use SDK to require payment for code analysis
      const paidCodeTool = payments.requirePayment(codeAnalysisRequirement)(
        codeAnalysisTool
      );
      return await paidCodeTool(args as { code: string, language?: string });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NANDA Payments MCP Server running...');
  console.error('Free tools: weather, time');
  console.error('Paid tools: premium-weather (5 NP), code-analysis (10 NP)');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

export { main };