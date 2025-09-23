# Claude Instructions for NANDA Points Server SDK

## Current Context

You are working on the completed NANDA Points Server SDK (`feature/mcp-server-sdk`) that provides server-side utilities for MCP developers who want to monetize their tools using NANDA Points.

## Project Overview

This SDK provides language-native server libraries for integrating NANDA Points payments into MCP servers and Express.js applications. The focus is on server-side tool monetization, not client-side payment utilities.

**Goal**: The "only way" developers integrate NANDA Points payments into MCP servers: `npm install @nanda/payments-sdk`

## Key Documents

- **PRD.md**: Updated product requirements focused on server-side MCP tool monetization
- **PLAN.md**: Implementation plan with Phase 1 completed, Phase 2 (documentation) in progress
- **sdks/payments-sdk/**: Complete TypeScript server SDK implementation

## Current Status ✅ PHASE 1 COMPLETED

- ✅ Feature branch: `feature/mcp-server-sdk` with all SDK commits
- ✅ TypeScript Server SDK: Complete and ready for npm publication
- ✅ MCP-specific payment utilities: requirePayment(), createPaidTool(), quickSetup()
- ✅ Express middleware: paymentMiddleware() for route-level payment protection
- ✅ Working examples: Complete MCP server showing free vs paid tools
- ✅ Type safety: Zero TypeScript compilation errors
- 📝 Phase 2: Documentation and examples in progress

## Implementation Architecture ✅ COMPLETED

### Core Components
1. **MCP Payment Utilities** (`src/server/index.ts`)
   - `requirePayment()`: Decorator to wrap free tools with payment requirements
   - `createPaidTool()`: Create new payment-protected MCP tools
   - `quickSetup()`: Rapid configuration for MCP servers
   - `paymentMiddleware()`: Express middleware for route-level protection

2. **Facilitator Integration** (`src/facilitator/index.ts`)
   - Type-safe wrapper for facilitator endpoints (/verify, /settle, /supported)
   - Extracted from working `packages/shared` implementation
   - Automatic retry logic and error handling

3. **Type System** (`src/shared/types.ts`)
   - Complete x402 protocol type definitions
   - NANDA Points specific interfaces
   - Payment requirement and configuration types
   - Comprehensive error hierarchy

4. **Examples** (`src/examples/`)
   - Complete MCP server demonstrating paid tool integration
   - Free vs paid tool comparison
   - Real-world usage patterns

## Package Structure ✅ IMPLEMENTED

```
sdks/payments-sdk/              # @nanda/payments-sdk
├── src/
│   ├── shared/                 # Core x402 and NANDA Points types
│   ├── facilitator/            # Facilitator API wrapper
│   ├── server/                 # MCP server utilities
│   ├── examples/               # Working MCP server examples
│   └── index.ts                # Main entry with quickSetup()
├── dist/                       # Compiled TypeScript output
├── package.json                # npm package ready for publication
└── tsconfig.json              # TypeScript configuration
```

## API Usage Patterns ✅ IMPLEMENTED

### Quick Setup for MCP Servers
```typescript
import { quickSetup } from '@nanda/payments-sdk';

const payments = await quickSetup({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'my-mcp-server'
});

// Convert free tool to paid tool
const paidTool = payments.requirePayment({
  amount: 50,
  description: 'Premium tool access'
})(originalFreeTool);
```

### Express Middleware Integration
```typescript
import { paymentMiddleware, createPaymentConfig } from '@nanda/payments-sdk';

const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'api-server'
});

app.use(paymentMiddleware({
  '/api/premium': { amount: 25, description: 'Premium API access' }
}, config));
```

### MCP Tool Creation
```typescript
import { createPaidTool } from '@nanda/payments-sdk';

const weatherTool = createPaidTool(
  'premium_weather',
  { amount: 100, description: 'Premium weather analysis' },
  config,
  async (args) => getPremiumWeatherData(args.location)
);
```

## Quality Standards ✅ ACHIEVED

- ✅ Zero TypeScript compilation errors
- ✅ Complete type safety with IntelliSense support
- ✅ Extracted from working packages/shared implementation
- ✅ x402 protocol compliance following Coinbase patterns
- ✅ npm package configuration ready for publication
- ✅ Working examples demonstrating all features

## Implementation Decisions

### Server-Side Focus
- **Primary Use Case**: MCP server developers monetizing tools
- **Secondary Use Case**: Express.js developers adding payment protection
- **Future Expansion**: Client-side utilities for A2A/A2P scenarios

### Technical Choices
- Extracted working middleware from `packages/shared` (no reinvention)
- TypeScript-first with comprehensive type definitions
- Modular design allowing future client-side expansion
- Zero external dependencies beyond essential HTTP/Express libraries

## Current Phase: Documentation 📝

### Completed Documentation Updates
- ✅ PLAN.md: Updated with Phase 1 completion status
- ✅ PRD.md: Refocused on server-side MCP tool monetization
- 📝 CLAUDE.md: Updated with current implementation status

### Remaining Documentation Tasks
- [ ] Create comprehensive README.md for the SDK package
- [ ] Document developer journey from free to paid tools
- [ ] Add API reference documentation
- [ ] Create troubleshooting guide
- [ ] Build additional MCP server examples

## Commands to Remember

- `npm run build` - Build the SDK package (TypeScript compilation)
- `npm run lint` - Check code quality (must pass before commits)
- `npm run test` - Run test suites (when implemented)
- `npm run dev` - Start development servers for testing

## Integration Notes

- **Facilitator**: Uses existing facilitator endpoints without modification
- **x402 Protocol**: Follows Coinbase reference implementation patterns
- **NANDA Points**: Compatible with existing NANDA Points transaction system
- **MongoDB**: Works with existing transaction schema and patterns

## Success Metrics ✅ ACHIEVED

- **Package Ready**: npm package configured and buildable
- **Zero Errors**: Complete TypeScript compilation without errors
- **Type Safety**: Full IntelliSense support for all APIs
- **Working Examples**: Complete MCP server demonstrating monetization
- **Developer Experience**: Three-line setup with quickSetup()

## Future Expansion Plans

### Client-Side SDK (Future)
- Payment creation utilities for requesting agents
- Agent balance management and transaction history
- A2A (Agent-to-Agent) payment flows
- A2P (Agent-to-Person) payment scenarios

### Additional Languages (Future)
- Python SDK for server-side tool monetization
- Same API patterns adapted to Python conventions
- FastAPI/Django middleware integration

### Enhanced Developer Experience (Future)
- Mock facilitator utilities for testing
- CLI tools for payment debugging
- Comprehensive logging and monitoring
- Performance optimization features

## Important Notes

- **"Only Way" Philosophy**: This SDK is designed to be the standard way to add payments to MCP tools
- **No Migration Needed**: We are the first/only users, so no existing integrations to migrate
- **Extraction Strategy**: Leveraged existing working implementation rather than rebuilding
- **x402 Compliance**: Follows established patterns from Coinbase reference implementation

## Definition of Done ✅ COMPLETED

An MCP developer can:
1. ✅ `npm install @nanda/payments-sdk`
2. ✅ Setup payments with quickSetup() in 3 lines of code
3. ✅ Wrap free tools with requirePayment() to monetize them
4. ✅ Create new paid tools with createPaidTool()
5. ✅ Access full TypeScript IntelliSense and type safety
6. ✅ Use Express middleware for route-level payment protection
7. ✅ See working examples in a complete MCP server

The TypeScript Server SDK is complete and ready for developer use. Phase 2 focuses on comprehensive documentation to support adoption.