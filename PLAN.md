# Implementation Plan: NANDA Points Server SDK (TypeScript)

## Overview

Build server-side SDK focused on MCP server developers who want to monetize their tools. The SDK provides language-native interfaces to the x402 protocol and facilitator APIs, enabling developers to add payment requirements to their tools without understanding protocol details.

**Updated Focus**: Server-side SDK for MCP developers (not client SDK)

## Phase 1: TypeScript Server SDK Foundation ✅ COMPLETED

### Goal
Create the core TypeScript SDK for MCP server developers to easily add payment requirements to their tools.

### Tasks
- [x] Create `sdks/payments-sdk/` package structure
- [x] Extract working facilitator client from packages/shared
- [x] Build MCP-specific payment wrapper utilities (requirePayment, createPaidTool)
- [x] Implement x402-compliant payment middleware for Express servers
- [x] Add comprehensive TypeScript definitions for all payment types
- [x] Create developer-friendly API following x402 patterns
- [x] Build working MCP server example demonstrating paid tools
- [x] Package configured for npm publication as @nanda/payments-sdk
- [x] Fix TypeScript compilation and ensure zero lint errors

### Deliverables ✅ COMPLETED
- [x] Working `@nanda/payments-sdk` TypeScript package
- [x] Server-side payment utilities for MCP developers
- [x] Facilitator API wrapper extracted from working implementation
- [x] MCP-specific tools: requirePayment(), createPaidTool(), paymentMiddleware()
- [x] Complete example MCP server showing free vs paid tools
- [x] npm package ready for publication
- [x] TypeScript definitions with zero compilation errors

### Actual Time: 1 day (leveraged existing working implementation)

## Phase 2: Documentation & Examples 📝 IN PROGRESS

### Goal
Complete documentation and create comprehensive examples for the TypeScript SDK.

### Tasks
- [x] Update PLAN.md with current progress and completion status
- [ ] Update PRD.md to reflect server-side focus
- [ ] Create comprehensive README.md for the SDK
- [ ] Document the developer journey from free to paid tools
- [ ] Create additional MCP server examples
- [ ] Add API reference documentation
- [ ] Create troubleshooting guide

### Deliverables
- [ ] Complete SDK documentation
- [ ] Multiple example MCP servers
- [ ] API reference guide
- [ ] Migration guide for existing MCP servers

## Phase 3: Documentation & Polish (Week 3)

### Goal
Complete documentation, examples, and production readiness features.

### Tasks
- [ ] Create comprehensive API documentation for both SDKs
- [ ] Build integration tutorials for popular frameworks
- [ ] Create real-world usage examples and case studies
- [ ] Add advanced error handling and debugging features
- [ ] Implement connection pooling and performance optimization
- [ ] Create migration guides from manual integration
- [ ] Build CLI tools for testing and debugging
- [ ] Add webhook support and event handling

### Deliverables
- [ ] Complete API documentation for both SDKs
- [ ] Integration tutorials and examples
- [ ] Performance optimization features
- [ ] CLI tools for developers
- [ ] Production deployment guides

### Estimated Time: 5-7 days

## Technical Architecture

### Monorepo Structure
```
sdks/
├── typescript/              # TypeScript SDK (@nanda/payments-sdk)
│   ├── src/
│   │   ├── client/         # x402 Payment client
│   │   ├── facilitator/    # Facilitator API wrapper
│   │   ├── agent/          # Agent management utilities
│   │   ├── types/          # TypeScript definitions
│   │   └── testing/        # Mock servers and test utils
│   ├── examples/           # Integration examples
│   ├── docs/               # TypeScript-specific docs
│   └── package.json
├── python/                 # Python SDK (nanda-payments)
│   ├── nanda_payments/
│   │   ├── client.py       # Async payment client
│   │   ├── facilitator.py  # Facilitator API wrapper
│   │   ├── agent.py        # Agent management
│   │   ├── types.py        # Type definitions
│   │   ├── testing/        # Mock servers and pytest fixtures
│   │   └── integrations/   # Framework integrations
│   ├── examples/           # Python integration examples
│   ├── docs/               # Python-specific docs
│   └── pyproject.toml
└── shared-docs/            # Cross-language documentation
```

### TypeScript SDK API Design
```typescript
import { NandaPaymentsClient } from '@nanda/payments-sdk';

const client = new NandaPaymentsClient({
  agentName: 'my-app',
  facilitatorUrl: 'http://localhost:3001'
});

// Make x402-compliant requests
const response = await client.makeRequest('http://api.example.com/premium');
if (response.paymentRequired) {
  const payment = await client.createPayment({
    amount: response.price,
    recipient: response.payTo
  });
  const result = await client.makeRequest('http://api.example.com/premium', payment);
}

// Agent management
const balance = await client.getBalance();
const transactions = await client.getTransactionHistory();
```

### Python SDK API Design
```python
from nanda_payments import NandaPaymentsClient

async with NandaPaymentsClient(
    agent_name="my-app",
    facilitator_url="http://localhost:3001"
) as client:
    # Make x402-compliant requests
    response = await client.make_request("http://api.example.com/premium")
    if response.payment_required:
        payment = await client.create_payment(
            amount=response.price,
            recipient=response.pay_to
        )
        result = await client.make_request("http://api.example.com/premium", payment)

    # Agent management
    balance = await client.get_balance()
    transactions = await client.get_transaction_history()
```

### Dependencies Strategy
- **TypeScript**: Minimal dependencies (axios/fetch, node built-ins)
- **Python**: aiohttp for async HTTP, pydantic for data validation
- Reuse protocol knowledge from `packages/shared/` but not code
- Focus on language-native patterns and conventions
- Comprehensive testing with minimal external test dependencies

## Integration with Existing Code

### Extract from Current Implementation
- Payment middleware logic from `packages/shared/src/middleware.ts`
- Type definitions from `packages/shared/src/types.ts`
- MongoDB utilities from `packages/shared/src/mongodb.ts`
- NANDA Points scheme from `packages/shared/src/nanda-points-scheme.ts`

### Simplify and Abstract
- Hide x402 protocol complexity behind decorators
- Automatic facilitator URL discovery and configuration
- Sensible defaults for development and production
- Clear error messages for common developer mistakes

### Maintain Compatibility
- Use same facilitator API endpoints
- Maintain compatibility with existing NANDA Points system
- Support existing MongoDB schema and transaction patterns

## Testing Strategy

### Unit Tests
- Decorator functionality and metadata extraction
- Configuration parsing and validation
- Error handling scenarios

### Integration Tests
- End-to-end payment flows
- HTTP 402 response validation
- Database transaction verification

### Developer Testing
- Mock payment client utilities
- Test payment payload generators
- Facilitator interaction mocking

## Documentation Strategy

### Getting Started Guide
- 5-minute quick start tutorial
- Common use case examples
- Troubleshooting common issues

### API Reference
- Complete TypeScript API documentation
- All decorator options and configurations
- Error codes and handling

### Integration Examples
- Express.js integration
- Next.js API routes
- Fastify integration
- Custom framework examples

## Quality Gates

### Phase 1 Requirements
- [ ] Zero TypeScript compilation errors
- [ ] All unit tests passing
- [ ] Basic integration test suite passing
- [ ] Getting started guide complete

### Phase 2 Requirements
- [ ] CLI tool functional
- [ ] All example projects working
- [ ] Documentation complete and reviewed
- [ ] Developer feedback incorporated

### Phase 3 Requirements
- [ ] Production deployment tested
- [ ] Performance benchmarks established
- [ ] Advanced feature documentation complete
- [ ] Security review completed

## Risk Mitigation

### Technical Risks
- **Decorator complexity**: Start with simple implementation, expand gradually
- **Framework compatibility**: Begin with Express.js, abstract later
- **Performance overhead**: Profile and optimize during Phase 3

### Adoption Risks
- **Learning curve**: Extensive examples and documentation
- **Migration complexity**: Provide migration tools and guides
- **Feature gaps**: Regular developer feedback collection

## Success Metrics

- **Time to first payment**: < 10 minutes from npm install
- **Code reduction**: 80% less boilerplate vs manual implementation
- **Error rate**: < 5% of developers encounter setup issues
- **Adoption rate**: Track npm downloads and GitHub usage

## Notes

This SDK will serve as the primary way developers integrate NANDA Points payments into their MCP servers. It should feel as natural as adding any other Express middleware but with the power of the full x402 payment protocol.

Focus on developer experience above all else - if it's not simple enough for a developer to add payments in under 10 minutes, we haven't succeeded.