# Product Requirements Document: NANDA Points Server SDK for MCP Developers

## Problem Statement

MCP (Model Context Protocol) server developers who want to monetize their tools currently need to understand complex x402 protocol details, facilitator APIs, payment verification, and middleware integration. This creates significant barriers to adding payment requirements to MCP tools.

**Current Pain Points:**
- No standardized server-side libraries for MCP tool monetization
- Complex x402 protocol implementation requirements
- Manual payment middleware and verification handling
- No MCP-specific payment wrapper utilities
- Duplicated payment integration code across MCP servers
- Steep learning curve for tool monetization

## Objective

Create a comprehensive server-side SDK focused on MCP developers who want to monetize their tools. The SDK provides language-native interfaces to the x402 protocol and facilitator APIs, enabling developers to add payment requirements to their tools without understanding protocol details.

**Vision**: The "only way" developers integrate NANDA Points payments into MCP servers, with developer-friendly APIs that feel as natural as adding any other middleware.

## Success Criteria

### Must Have - TypeScript Server SDK ✅ COMPLETED
- [x] npm package installation (`npm install @nanda/payments-sdk`)
- [x] MCP-specific payment wrapper utilities (requirePayment, createPaidTool)
- [x] Express middleware for payment verification (paymentMiddleware)
- [x] x402-compliant payment middleware extracted from working implementation
- [x] TypeScript definitions and full IntelliSense support
- [x] Facilitator API wrapper with retry logic
- [x] Comprehensive error handling with typed exceptions
- [x] Working MCP server example demonstrating paid tools

### Future Expansion - Client SDK Support
- [ ] Client-side payment utilities for A2A/A2P scenarios
- [ ] Agent balance management and transaction history
- [ ] Payment creation utilities for requesting agents
- [ ] Python SDK for server-side tool monetization

### Should Have
- [ ] Built-in payment testing and mocking utilities
- [ ] Configurable environments (dev, staging, prod)
- [ ] Automatic facilitator discovery and health checking
- [ ] Payment webhook handling utilities
- [ ] Comprehensive logging and debugging support
- [ ] Integration examples for popular frameworks

### Could Have (Future Work)
- [ ] Go SDK for high-performance applications
- [ ] Rust SDK for systems programming
- [ ] React hooks and components library
- [ ] Payment analytics and reporting SDKs
- [ ] GraphQL integration utilities

## Target Users

1. **MCP Server Developers**: Adding payment requirements to existing MCP tools (PRIMARY)
2. **Express.js Developers**: Creating paid APIs and services with NANDA Points
3. **Tool Monetization Teams**: Converting free tools to paid services
4. **AI Service Providers**: Building usage-based billing for AI tools
5. **Enterprise MCP Teams**: Standardizing payment integration across MCP servers

## User Stories

### Story 1: MCP Server - Quick Setup ✅ IMPLEMENTED
```typescript
import { quickSetup } from '@nanda/payments-sdk';

const payments = await quickSetup({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'my-mcp-server'
});

// Convert free tool to paid tool
const paidWeatherTool = payments.requirePayment({
  amount: 50, // 50 NANDA Points
  description: 'Premium weather data with forecasts'
})(originalWeatherTool);
```

### Story 2: MCP Tool Creation ✅ IMPLEMENTED
```typescript
import { createPaidTool, createPaymentConfig } from '@nanda/payments-sdk';

const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'weather-service'
});

// Create new paid tool for MCP server
const premiumWeatherTool = createPaidTool(
  'premium_weather',
  { amount: 100, description: 'Premium weather analysis' },
  config,
  async (args) => {
    // Tool implementation
    return await getPremiumWeatherData(args.location);
  }
);
```

### Story 3: Express Middleware ✅ IMPLEMENTED
```typescript
import express from 'express';
import { paymentMiddleware, createPaymentConfig } from '@nanda/payments-sdk';

const app = express();
const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'api-server'
});

// Apply payment requirements to specific routes
app.use(paymentMiddleware({
  '/api/premium': { amount: 25, description: 'Premium API access' },
  '/api/analytics': { amount: 50, description: 'Analytics data' }
}, config));
```

## Technical Requirements

### TypeScript Server SDK Core Components ✅ IMPLEMENTED

1. **MCP Payment Utilities**
   - requirePayment() decorator for tool monetization
   - createPaidTool() for new payment-protected tools
   - quickSetup() for rapid MCP server configuration
   - Type-safe payment requirement definitions

2. **Facilitator API Wrapper**
   - Type-safe facilitator endpoints (/verify, /settle, /supported)
   - Extracted from working packages/shared implementation
   - Automatic retry logic and error handling
   - NANDA Points scheme compliance

3. **Express Middleware**
   - paymentMiddleware() for route-level payment protection
   - Automatic x402 response generation
   - Payment verification and settlement
   - Error handling and debugging support

4. **Type System**
   - Complete TypeScript definitions for x402 protocol
   - NANDA Points specific type definitions
   - Tool payment requirement interfaces
   - Comprehensive error type hierarchy

### Future SDK Expansion

1. **Client-Side Utilities** (Future)
   - Payment creation for requesting agents
   - Agent balance management and transaction history
   - A2A (Agent-to-Agent) payment flows
   - A2P (Agent-to-Person) payment scenarios

2. **Python Server SDK** (Future)
   - Python-native MCP tool monetization utilities
   - FastAPI/Django middleware for payment verification
   - Async payment handling with aiohttp
   - Type hints and mypy compatibility

3. **Developer Experience Enhancements** (Future)
   - Mock facilitator utilities for testing
   - CLI tools for payment debugging
   - Comprehensive logging and monitoring
   - Migration guides and examples

## Implementation Strategy

### Phase 1: TypeScript Server SDK ✅ COMPLETED
- [x] Extract working payment middleware from packages/shared
- [x] Build MCP-specific payment wrapper utilities (requirePayment, createPaidTool)
- [x] Implement x402-compliant payment middleware for Express servers
- [x] Add comprehensive TypeScript definitions for all payment types
- [x] Create developer-friendly API following x402 patterns
- [x] Build working MCP server example demonstrating paid tools
- [x] Package configured for npm publication as @nanda/payments-sdk
- [x] Fix TypeScript compilation and ensure zero lint errors

### Phase 2: Documentation & Examples 📝 IN PROGRESS
- [ ] Update PRD.md to reflect server-side focus
- [ ] Create comprehensive README.md for the SDK
- [ ] Document the developer journey from free to paid tools
- [ ] Create additional MCP server examples
- [ ] Add API reference documentation
- [ ] Create troubleshooting guide

### Phase 3: SDK Expansion (Future)
- [ ] Client-side payment utilities for A2A/A2P scenarios
- [ ] Python SDK for server-side tool monetization
- [ ] Advanced testing and mocking utilities
- [ ] Performance optimization and connection pooling
- [ ] Community feedback integration and feature requests

## Current SDK Structure ✅ IMPLEMENTED

```
sdks/
└── payments-sdk/           # @nanda/payments-sdk
    ├── src/
    │   ├── shared/         # Core x402 and NANDA Points types
    │   ├── facilitator/    # Facilitator API wrapper
    │   ├── server/         # MCP server utilities (requirePayment, createPaidTool)
    │   ├── examples/       # MCP server examples
    │   └── index.ts        # Main entry point with quickSetup
    ├── dist/               # Compiled TypeScript output
    ├── package.json        # npm package configuration
    └── tsconfig.json       # TypeScript configuration
```

### Future Expansion Structure
```
sdks/
├── payments-sdk/           # Current @nanda/payments-sdk (server-focused)
└── client-sdk/             # Future client-side utilities (A2A/A2P)
    ├── src/
    │   ├── client/         # Payment client for requesting agents
    │   ├── agent/          # Agent balance management
    │   └── testing/        # Mock facilitator utilities
    └── package.json
```

## Success Metrics

- **TypeScript Server SDK**: ✅ Successful npm package ready for publication
- **MCP Developer Adoption**: Time to monetize first tool < 10 minutes
- **API Coverage**: ✅ 100% of facilitator endpoints wrapped with type safety
- **Error Rate**: ✅ Zero TypeScript compilation errors
- **Integration Simplicity**: ✅ Three-line setup with quickSetup()

## Non-Goals

- Client-side payment utilities (deferred to future expansion)
- Supporting non-NANDA payment schemes initially
- Blockchain or cryptocurrency integrations
- Payment UI components (pure server-side libraries)
- Database direct access (only through facilitator APIs)
- Migration tools (we are the "only way" - no existing integrations to migrate)

## Definition of Done

### TypeScript Server SDK ✅ COMPLETED
An MCP developer can:
1. ✅ `npm install @nanda/payments-sdk`
2. ✅ Setup payments with quickSetup() in 3 lines of code
3. ✅ Wrap free tools with requirePayment() to monetize them
4. ✅ Create new paid tools with createPaidTool()
5. ✅ Access full TypeScript IntelliSense and type safety
6. ✅ Use Express middleware for route-level payment protection
7. ✅ See working examples in a complete MCP server

### Future SDK Expansion
A developer will be able to:
- Install client-side utilities for A2A/A2P payment scenarios
- Access agent balance management and transaction history
- Use Python SDK for server-side tool monetization
- Leverage comprehensive testing and mocking utilities

The server SDK provides the foundation for MCP tool monetization with a focus on developer experience and x402 protocol compliance.