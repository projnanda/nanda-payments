/**
 * @nanda/payments-sdk
 *
 * NANDA Points payments SDK for x402-compliant servers and clients
 * Primary focus: MCP server developers who want to monetize their tools
 */

// Main server-side exports (primary use case)
export {
  createPaymentConfig,
  requirePayment,
  createPaidTool,
  paymentMiddleware,
  createFacilitatorClient,
  createPaymentRequirements,
} from "./server/index.js";

// Core types
export type {
  PaymentConfig,
  ToolPaymentRequirement,
  PaymentRequirements,
  PaymentPayload,
  VerificationResponse,
  SettlementResponse,
  NPReceipt,
  NPAgent,
  NPWallet,
  NPTransaction,
} from "./shared/types.js";

// Error classes
export {
  NPPaymentError,
  NPVerificationError,
  NPSettlementError,
  NPNetworkError,
} from "./shared/types.js";

// Convenience functions
export { createPaymentConfig as createConfig } from "./server/index.js";

/**
 * Quick setup function for MCP servers
 *
 * @example
 * ```typescript
 * import { quickSetup } from '@nanda/payments-sdk';
 *
 * const payments = quickSetup({
 *   facilitatorUrl: 'http://localhost:3001',
 *   agentName: 'my-mcp-server'
 * });
 *
 * // Use payments.requirePayment() or payments.createPaidTool()
 * ```
 */
export async function quickSetup(config: { facilitatorUrl: string; agentName: string }) {
  const server = await import("./server/index.js");

  const paymentConfig = server.createPaymentConfig(config);

  return {
    config: paymentConfig,
    requirePayment: (requirement: any) =>
      server.requirePayment(requirement, paymentConfig),
    createPaidTool: (name: string, requirement: any, handler: any) =>
      server.createPaidTool(name, requirement, paymentConfig, handler),
    facilitator: server.createFacilitatorClient(config.facilitatorUrl),
  };
}

// Re-export everything from server for convenience
export * from "./server/index.js";