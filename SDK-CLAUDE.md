# Claude Instructions for MCP Server SDK Development

## Current Context

You are working on the MCP Server SDK feature branch (`feature/mcp-server-sdk`) to create a developer-friendly SDK that simplifies x402 payment integration for MCP servers.

## Project Overview

This SDK will abstract the complexity from the current `packages/shared/` implementation and provide a clean, decorator-based API for adding NANDA Points payments to MCP servers.

**Goal**: Enable developers to add payments with `@requiresPayment({ price: 10 })` decorator instead of complex middleware setup.

## Key Documents

- **SDK-PRD.md**: Complete product requirements and user stories
- **SDK-PLAN.md**: Detailed implementation plan with 3 phases
- **packages/shared/**: Existing implementation to extract and simplify

## Current Status

- ✅ Feature branch created: `feature/mcp-server-sdk`
- ✅ PRD completed with clear user stories and success criteria
- ✅ Implementation plan with 3 phases and detailed tasks
- ⏳ Ready to begin Phase 1: Core SDK Architecture

## Implementation Guidelines

### Architecture Principles
1. **Developer Experience First**: API should be intuitive and require minimal setup
2. **Extract, Don't Rewrite**: Reuse battle-tested logic from `packages/shared/`
3. **TypeScript Native**: Full type safety and IntelliSense support
4. **Framework Agnostic**: Start with Express.js, design for expansion

### Code Quality Standards
- Zero TypeScript compilation errors
- Comprehensive test coverage (unit + integration)
- JSDoc documentation for all public APIs
- Follow existing code style from main packages

### Key Technical Decisions
- Use TypeScript decorators for payment requirements
- Extract middleware logic from `packages/shared/src/middleware.ts`
- Reuse MongoDB utilities and NANDA Points scheme
- Maintain compatibility with existing facilitator API

## Implementation Phases

### Phase 1: Core SDK (Current Focus)
Create `packages/mcp-server-sdk/` with:
- TypeScript decorator API (`@requiresPayment`)
- Automatic middleware injection
- HTTP 402 response generation
- Basic configuration system

### Phase 2: Developer Experience
- CLI scaffolding tool
- Testing utilities
- Comprehensive documentation
- Example projects

### Phase 3: Advanced Features
- Dynamic pricing strategies
- Analytics hooks
- Advanced error handling
- Performance optimization

## Expected Deliverables

1. **npm Package**: `@nanda/mcp-server-sdk`
2. **Core API**: Decorator-based payment requirements
3. **Documentation**: Getting started guide and API reference
4. **Examples**: Working integration examples
5. **Tests**: Unit and integration test suites

## Integration Notes

- Reuse facilitator endpoints from main implementation
- Maintain compatibility with existing NANDA Points system
- Support same MongoDB schema and transaction patterns
- Abstract x402 protocol complexity from developers

## Success Criteria

A developer should be able to:
1. `npm install @nanda/mcp-server-sdk`
2. Add `@requiresPayment({ price: 10 })` to an endpoint
3. Receive proper HTTP 402 responses automatically
4. Process payments without additional configuration

**Target**: 10-minute implementation time from install to first payment

## Previous Work Context

The main x402 implementation (PR #6) provides:
- Working facilitator with MongoDB integration
- Express server with payment middleware
- Comprehensive x402 protocol compliance
- Real transaction processing

This SDK work extracts that complexity into a simple developer API.

## Commands to Remember

- `npm run dev` - Start development servers
- `npm run build` - Build TypeScript packages
- `npm run test` - Run test suites
- `npm run lint` - Check code quality

## Important Constraints

- Do not modify existing packages (facilitator, express-server, shared)
- Focus only on SDK package creation and documentation
- Maintain compatibility with current x402 implementation
- Follow PRD requirements exactly

## Next Steps

1. Create `packages/mcp-server-sdk/` package structure
2. Design decorator API and TypeScript definitions
3. Extract and simplify middleware from `packages/shared/`
4. Build basic integration tests
5. Create getting started documentation

Remember: Developer experience is the primary success metric. If it's not simple enough for a 10-minute implementation, it needs more work.