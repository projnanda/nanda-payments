# Product Requirements Document: MCP Server SDK for x402 Payments

## Problem Statement

MCP server developers currently need to understand complex x402 protocol details, payment middleware configuration, and NANDA Points integration to add payments to their servers. This creates barriers to adoption and increases implementation time.

**Current Pain Points:**
- Complex middleware setup with route configuration
- Manual facilitator URL management
- Need to understand x402 protocol internals
- Duplicated payment handling code across projects
- No standardized error handling patterns

## Objective

Create a simple, developer-friendly SDK that abstracts x402 payment complexity and enables MCP server developers to add NANDA Points payments with minimal code changes.

**Vision**: `npm install @nanda/mcp-server-sdk` → Add one decorator → Instant paid endpoints

## Success Criteria

### Must Have
- [ ] Single npm package installation
- [ ] Decorator-based API for marking endpoints as paid
- [ ] Automatic HTTP 402 response generation
- [ ] Built-in facilitator discovery and configuration
- [ ] Zero x402 protocol knowledge required for basic usage
- [ ] TypeScript support with full type definitions
- [ ] Compatible with Express.js and other Node.js frameworks

### Should Have
- [ ] CLI tool for SDK scaffolding and configuration
- [ ] Built-in payment testing utilities
- [ ] Configurable pricing tiers and strategies
- [ ] Automatic retry logic for payment failures
- [ ] Comprehensive error handling with meaningful messages
- [ ] Integration examples for popular MCP frameworks

### Could Have
- [ ] React hooks for frontend integration
- [ ] Payment analytics and reporting
- [ ] A/B testing for pricing strategies
- [ ] WebSocket payment support
- [ ] Multi-currency support preparation

## Target Users

1. **MCP Server Developers**: Adding payments to existing servers
2. **New Project Creators**: Building paid MCP services from scratch
3. **Enterprise Teams**: Standardizing payment implementation across services

## User Stories

### Story 1: Simple Payment Addition
```typescript
// Before: Complex middleware setup
// After: Simple decorator
@requiresPayment({ price: 5, description: "AI analysis" })
app.get('/analyze', (req, res) => {
  res.json({ analysis: "results..." });
});
```

### Story 2: Dynamic Pricing
```typescript
@requiresPayment((req) => ({
  price: req.body.complexity * 2,
  description: `Analysis (complexity: ${req.body.complexity})`
}))
app.post('/custom-analysis', handler);
```

### Story 3: Testing Support
```typescript
// Built-in test utilities
const testClient = createTestClient();
await testClient.testPaymentFlow('/analyze', { price: 5 });
```

## Technical Requirements

### Core SDK Components

1. **Payment Decorator**
   - Simple `@requiresPayment()` decorator
   - Support for static and dynamic pricing
   - Automatic middleware injection

2. **Configuration Management**
   - Auto-discovery of facilitator URL
   - Environment-based configuration
   - Sensible defaults for development

3. **Error Handling**
   - Standardized error responses
   - Meaningful error messages for common issues
   - Graceful degradation when facilitator unavailable

4. **Testing Utilities**
   - Mock payment clients
   - Test payment generators
   - Integration test helpers

### Developer Experience

- **Installation**: Single npm package
- **Setup**: Maximum 3 lines of configuration code
- **Documentation**: Interactive examples and tutorials
- **CLI**: Optional scaffolding and configuration tools

## Implementation Strategy

### Phase 1: Core SDK (Week 1)
- Extract and simplify current middleware
- Create decorator-based API
- Package as standalone npm module
- Basic TypeScript definitions

### Phase 2: Developer Tools (Week 2)
- CLI for project scaffolding
- Testing utilities and mock clients
- Comprehensive documentation
- Integration examples

### Phase 3: Advanced Features (Week 3)
- Dynamic pricing strategies
- Payment analytics hooks
- Advanced error handling
- Performance optimization

## Success Metrics

- **Adoption**: Number of projects using the SDK
- **Developer Satisfaction**: Time to implement first paid endpoint < 10 minutes
- **Code Reduction**: 80% less boilerplate vs manual implementation
- **Error Rate**: < 5% of integrations encounter setup issues

## Non-Goals

- Building a new payment protocol (use existing x402)
- Supporting non-NANDA payment schemes initially
- Frontend payment UI components (focus on backend SDK)
- Payment processing (delegate to existing facilitator)

## Definition of Done

A developer can:
1. `npm install @nanda/mcp-server-sdk`
2. Add `@requiresPayment({ price: 10 })` to an endpoint
3. Start their server and receive proper HTTP 402 responses
4. Process payments automatically without additional code
5. Access comprehensive documentation and examples

The SDK should feel as simple as adding authentication middleware but for payments.