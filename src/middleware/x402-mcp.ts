import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getReceiptByTx } from '../routes/receiptRoutes.js';
import { getAgentWithWallet } from '../routes/agentRoutes.js';
import { NP } from '../models/index.js';
import type { Receipt } from '../models/receipt.js';

export interface NPToolConfig {
  readonly priceNP: number; // Price in NP points
  readonly recipient: string; // Receiving agent name
  readonly description?: string;
}

interface PaymentHeaders {
  readonly agent: string;
  readonly txId: string;
  readonly amount: string;
}

// MCP tool handler type - takes parsed arguments and returns result
type MCPToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/**
 * Wraps an MCP tool handler with x402-NP payment verification
 */
export function withPayment(
  toolName: string,
  config: NPToolConfig,
  handler: MCPToolHandler
): MCPToolHandler {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    console.log(`🔍 Payment wrapper called for ${toolName} with args:`, args);

    // Extract payment headers from the arguments
    const paymentHeaders = extractPaymentHeaders(args);

    if (!paymentHeaders) {
      console.log(`💰 No payment provided for ${toolName}, requiring payment`);
      // Return 402 Payment Required response
      return createPaymentRequiredResponse(toolName, config);
    }

    console.log(`🔐 Payment headers found for ${toolName}:`, paymentHeaders);

    // Verify payment
    const verificationResult = await verifyPayment(paymentHeaders, config);
    if (!verificationResult.success) {
      console.log(`❌ Payment verification failed for ${toolName}:`, verificationResult.error);
      return createErrorResponse(verificationResult.error!);
    }

    console.log(`✅ Payment verified: ${paymentHeaders.agent} paid ${verificationResult.amount} NP to ${config.recipient} for ${toolName}`);

    // Payment verified, execute the original handler with cleaned args
    const cleanArgs = { ...args };
    delete cleanArgs._paymentAgent;
    delete cleanArgs._paymentTxId;
    delete cleanArgs._paymentAmount;

    return await handler(cleanArgs);
  };
}

function extractPaymentHeaders(args: Record<string, unknown>): PaymentHeaders | null {
  // In MCP, we need to pass payment info through the arguments
  // This is a limitation of the MCP protocol - we'll use special argument fields
  const agent = args._paymentAgent as string;
  const txId = args._paymentTxId as string;
  const amount = args._paymentAmount as string;

  if (!agent || !txId || !amount) {
    return null;
  }

  return { agent, txId, amount };
}

function createPaymentRequiredResponse(toolName: string, config: NPToolConfig): CallToolResult {
  const paymentInfo = {
    error: 'PAYMENT_REQUIRED',
    protocol: 'x402-np',
    tool: toolName,
    price: {
      amount: config.priceNP,
      currency: NP.code,
      scale: NP.scale,
      recipient: config.recipient
    },
    description: config.description ?? `Payment required for ${toolName}`,
    instructions: {
      steps: [
        `Use initiateTransaction tool to transfer ${config.priceNP} NP from your agent to ${config.recipient}`,
        'Include the payment details when calling this tool:',
        '- Add "_paymentAgent": "your-agent-name" to arguments',
        '- Add "_paymentTxId": "transaction-id" to arguments',
        '- Add "_paymentAmount": "amount-paid" to arguments',
        'Retry the tool call with payment arguments'
      ]
    }
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(paymentInfo, null, 2)
    }]
  };
}

interface PaymentVerificationResult {
  readonly success: boolean;
  readonly error?: {
    readonly message: string;
    readonly data?: unknown;
  };
  readonly amount?: number;
  readonly receipt?: Receipt;
}

async function verifyPayment(
  headers: PaymentHeaders,
  toolConfig: NPToolConfig
): Promise<PaymentVerificationResult> {
  // Verify payment amount matches tool price
  const amountNP = parseFloat(headers.amount);
  if (Number.isNaN(amountNP) || amountNP !== toolConfig.priceNP) {
    return {
      success: false,
      error: {
        message: 'Invalid payment amount',
        data: {
          expected: toolConfig.priceNP,
          received: amountNP
        }
      }
    };
  }

  // Verify paying agent exists
  const payingAgent = await getAgentWithWallet(headers.agent);
  if (!payingAgent) {
    return {
      success: false,
      error: {
        message: 'Invalid payment agent',
        data: { agent: headers.agent }
      }
    };
  }

  // Verify payment receipt
  const receipt = await getReceiptByTx(headers.txId);
  if (!receipt) {
    return {
      success: false,
      error: {
        message: 'Payment receipt not found',
        data: { txId: headers.txId }
      }
    };
  }

  // Verify receipt details match payment
  const receiptAmountNP = NP.toMajorUnits(receipt.amountMinor);
  if (receipt.fromAgent !== headers.agent ||
      receipt.toAgent !== toolConfig.recipient ||
      receiptAmountNP !== toolConfig.priceNP) {
    return {
      success: false,
      error: {
        message: 'Payment verification failed',
        data: {
          expected: {
            from: headers.agent,
            to: toolConfig.recipient,
            amount: toolConfig.priceNP
          },
          actual: {
            from: receipt.fromAgent,
            to: receipt.toAgent,
            amount: receiptAmountNP
          }
        }
      }
    };
  }

  return {
    success: true,
    amount: amountNP,
    receipt
  };
}

function createErrorResponse(error: { message: string; data?: unknown }): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: error.message,
        details: error.data
      }, null, 2)
    }]
  };
}