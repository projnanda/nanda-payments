# Claude Instructions for NANDA Points SDKs Development

## Current Context

You are working on the NANDA Points SDKs feature branch (`feature/mcp-server-sdk`) to create comprehensive client libraries for TypeScript and Python that simplify NANDA Points payment integration.

## Project Overview

These SDKs will provide language-native client libraries for integrating with NANDA Points payments and the x402 protocol. Starting with TypeScript, then Python, each SDK should feel native to its ecosystem while providing identical functionality.

**Goal**: Enable developers to integrate NANDA Points payments with simple client libraries: `npm install @nanda/payments-sdk` or `pip install nanda-payments`

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

### Phase 1: TypeScript SDK (Current Focus)
Create `sdks/typescript/` with:
- Complete x402 protocol client implementation
- Facilitator API wrapper with type safety
- Agent balance and transaction management
- Testing utilities and mock servers
- npm package publication

### Phase 2: Python SDK
- Python-native async payment client
- Framework integrations (FastAPI, Django, Flask)
- Type hints and mypy compatibility
- pytest fixtures and testing utilities
- PyPI package publication

### Phase 3: Documentation & Polish
- Comprehensive API documentation
- Integration tutorials and examples
- Advanced error handling and debugging
- Performance optimization
- CLI tools for developers

## Expected Deliverables

1. **TypeScript Package**: `@nanda/payments-sdk` on npm
2. **Python Package**: `nanda-payments` on PyPI
3. **Client Libraries**: Complete x402 protocol clients
4. **Documentation**: API docs and integration tutorials
5. **Testing**: Comprehensive test suites and mock utilities

## Integration Notes

- Reuse facilitator endpoints from main implementation
- Maintain compatibility with existing NANDA Points system
- Support same MongoDB schema and transaction patterns
- Abstract x402 protocol complexity from developers

## Success Criteria

### TypeScript SDK
A developer should be able to:
1. `npm install @nanda/payments-sdk`
2. Create payment client with 3 lines of configuration
3. Make x402-compliant HTTP requests automatically
4. Handle payment flows without understanding protocol details

### Python SDK
A developer should be able to:
1. `pip install nanda-payments`
2. Create async payment client following Python conventions
3. Use framework integrations with FastAPI/Django
4. Access full type hints and mypy compatibility

**Target**: < 5 minutes from install to first payment request

## Previous Work Context

The main x402 implementation (PR #6) provides:
- Working facilitator with MongoDB integration (/verify, /settle, /supported endpoints)
- Express server with payment middleware (server-side components)
- Comprehensive x402 protocol compliance
- Real transaction processing with NANDA Points

These SDKs provide the client-side libraries that applications use to interact with those servers.

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

1. Create `sdks/typescript/` package structure with proper npm configuration
2. Implement x402 protocol client with HTTP header handling
3. Build facilitator API wrapper (/verify, /settle, /supported)
4. Create payment client with automatic retry logic
5. Add comprehensive TypeScript definitions
6. Build testing utilities and mock facilitator
7. Create integration examples and documentation

Remember: These are client libraries, not server middleware. Focus on making it easy for applications to interact with NANDA Points services, not to become payment servers themselves.