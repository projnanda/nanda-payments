# Implementation Plan: x402 Compliance

## Overview
Complete rebuild implementation plan for x402-compliant **server-side infrastructure**. Will study x402-mcp (client) to understand protocol, then build server-side components. Create monorepo with facilitator service and Resource Server SDK using Streamable HTTP transport. NO code retention from existing implementation.

## Phase 1: Analysis & Setup
**Goal**: Understand x402 protocol and design server-side infrastructure

### Tasks
- [ ] Study x402-mcp (client) to understand expected server behavior
- [ ] Research x402 HTTP 402 response format specification
- [ ] Document what HTTP 402 responses should look like
- [ ] Map NP payment scheme requirements for server-side
- [ ] Document facilitator API interface that servers should provide
- [ ] Design server-side monorepo structure (facilitator + MCP server SDK)
- [ ] Create complete rebuild plan - NO existing code retention
- [ ] Identify Streamable HTTP transport requirements for MCP servers

**Deliverables**:
- x402 protocol analysis (from studying client behavior)
- HTTP 402 response format specification
- Server-side architecture design document
- Monorepo structure design
- NP payment scheme specification
- Complete rebuild specification

**Estimated Time**: 1-2 days

## Phase 2: Core Implementation (REVISED)
**Goal**: Fork and adapt existing x402 server implementations

### Tasks
- [x] Copy x402 Express server example to our repo
- [x] Copy x402 Advanced server example to our repo
- [x] Create proper monorepo structure with npm workspaces
- [x] Analyze x402 package dependencies and facilitator interface

## Key Dependencies to Replace:
- **x402-express**: Middleware package with `paymentMiddleware` function
- **x402**: Core package with schemes, types, verification, facilitator clients
- **Schemes**: `exact.evm.decodePayment()` → NP scheme decoder
- **Facilitator**: `useFacilitator()` → NP facilitator client
- **Verification**: Blockchain verification → MongoDB/NP verification
- [x] Create "nanda-points" payment scheme module (replace EVM schemes)
- [x] Implement NP payment verification (replace blockchain verification)
- [x] Replace facilitator blockchain calls with MongoDB transactions
- [x] Create shared package with types and utilities
- [x] Implement NP facilitator API (/verify, /settle, /supported)
- [x] Adapt payment middleware for MCP Streamable HTTP transport
- [x] Update payment requirements to include NP-specific fields
- [x] Test HTTP 402 responses work with existing x402 clients
- [x] Integrate with existing MongoDB/NP transaction system

**Deliverables**:
- [x] Complete monorepo structure
- [x] Base README with organization and quick start
- [x] Working NP payment scheme
- [x] Facilitator API implementation
- [x] Adapted x402 servers for NP settlement
- [x] MongoDB integration with existing schema

**Estimated Time**: 3-4 days

## Phase 3: MCP Integration
**Goal**: Replace current MCP server with x402-compliant version

### Tasks
- [ ] Modify MCP server to use new x402 implementation
- [ ] Remove old x402-NP middleware
- [ ] Update tool definitions to use x402-mcp
- [ ] Ensure proper HTTP 402 responses
- [ ] Test header handling (X-PAYMENT, X-PAYMENT-RESPONSE)
- [ ] Validate payment flow end-to-end

**Deliverables**:
- Updated MCP server with x402 compliance
- Working payment flow
- Header-based payment processing

**Estimated Time**: 2-3 days

## Phase 4: Testing & Validation
**Goal**: Comprehensive testing of x402 compliance

### Tasks
- [ ] Create test suite for x402 protocol compliance
- [ ] Test with standard x402 clients
- [ ] Verify Claude Web integration via ngrok
- [ ] Performance testing with payment flows
- [ ] Error handling and edge case testing
- [ ] Lint and type checking validation

**Deliverables**:
- Comprehensive test suite
- Performance benchmarks
- Validated Claude Web integration

**Estimated Time**: 2-3 days

## Phase 5: Documentation & Cleanup
**Goal**: Complete documentation and remove legacy code

### Tasks
- [x] Write new README.md from scratch
- [ ] Create missing documentation files referenced in README.md:
  - [ ] Facilitator API documentation
  - [ ] MCP Server SDK documentation
  - [ ] Payment Protocol documentation
  - [ ] Examples documentation
- [ ] Document NP payment scheme specification
- [ ] Create API documentation for facilitator endpoints
- [ ] Add usage examples and integration guide
- [ ] Remove old x402-NP implementation files
- [ ] Update package.json and dependencies

**Deliverables**:
- Complete project documentation
- Clean codebase without legacy components
- Usage examples and guides

**Estimated Time**: 1-2 days

## Current Status

### ✅ Phase 1: Analysis & Setup - COMPLETE
- [x] PRD created and updated with server-side focus
- [x] Implementation plan defined and corrected
- [x] Feature branch established
- [x] Studied Coinbase x402-mcp documentation (client-side)
- [x] Analyzed Coinbase MCP example (also client-side)
- [x] Researched x402 HTTP 402 response format specification
- [x] Confirmed our server-side approach is correct and will be compatible with existing clients
- [x] Designed monorepo structure
- [x] Created base README with architecture and quick start

### ✅ Phase 2: Core Implementation - COMPLETE
- [x] **MAJOR DISCOVERY**: Found working x402 server implementations at `/examples/typescript/servers/`
- [x] Fork and adapt existing x402 Express server instead of building from scratch
- [x] Copy x402 Express server example to our repo
- [x] Copy x402 Advanced server example to our repo
- [x] Create proper monorepo structure with npm workspaces
- [x] Analyze x402 package dependencies and facilitator interface
- [x] Create "nanda-points" payment scheme module (replace EVM schemes)
- [x] Implement NP payment verification (replace blockchain verification)
- [x] Replace facilitator blockchain calls with MongoDB transactions
- [x] Create shared package with types and utilities
- [x] Implement NP facilitator API (/verify, /settle, /supported)
- [x] Adapt Express server to use NANDA Points instead of x402 packages
- [x] **CRITICAL**: Replace simulated transactions with real MongoDB operations
- [x] Integrate with working payment implementation from main branch

## What We Found
- **Express Server**: Complete working implementation with `paymentMiddleware`
- **Advanced Server**: Manual payment verification with async settlement
- **Proven Architecture**: Real HTTP 402 responses, X-PAYMENT headers, facilitator integration
- **Working Code**: Successfully replaced blockchain/USDC with MongoDB/NP
- **Real Transactions**: Facilitator now executes actual MongoDB balance updates, transactions, and receipts

## HTTP 402 Response Format (from x402 spec)
```json
{
  "paymentRequirements": [{
    "scheme": "string",
    "network": "string",
    "maxAmountRequired": "uint256 as string",
    "resource": "string",
    "description": "string",
    "mimeType": "string",
    "outputSchema": "object | null",
    "payTo": "string",
    "maxTimeoutSeconds": "number",
    "asset": "string",
    "extra": "object | null"
  }]
}
```

## Proposed Monorepo Structure
```
packages/
├── facilitator/          # NP Facilitator Service
│   ├── src/
│   │   ├── endpoints/    # /verify, /settle, /supported
│   │   ├── schemes/      # nanda-points payment scheme
│   │   └── server.ts     # Express server
│   ├── package.json
│   └── README.md
├── mcp-server-sdk/       # SDK for MCP Server developers
│   ├── src/
│   │   ├── middleware/   # x402 payment middleware
│   │   ├── types/        # Payment types & interfaces
│   │   └── index.ts      # Main SDK exports
│   ├── package.json
│   └── README.md
├── shared/               # Shared utilities
│   ├── src/
│   │   ├── types/        # Common x402 types
│   │   ├── utils/        # Helper functions
│   │   └── nanda/        # NP-specific utilities
│   ├── package.json
│   └── README.md
├── reference-server/     # Reference MCP server implementation
│   ├── src/
│   │   ├── tools/        # MCP tools with x402 payments
│   │   └── server.ts     # MCP server using our SDK
│   ├── package.json
│   └── README.md
└── examples/             # Usage examples
    ├── basic-mcp/        # Basic MCP server example
    ├── custom-tools/     # Custom paid tools example
    └── client-usage/     # How clients use x402 servers
```

## Package Responsibilities

### @nanda/x402-facilitator
- Implements x402 facilitator API (/verify, /settle, /supported)
- Handles "nanda-points" payment scheme
- Integrates with MongoDB for NP transactions
- Can be deployed standalone or embedded

### @nanda/x402-mcp-server
- SDK for MCP server developers
- Middleware to add x402 payments to MCP tools
- Returns proper HTTP 402 responses
- Includes facilitator URL in payment requirements

### @nanda/x402-shared
- Common x402 types and interfaces
- NP transaction utilities
- Payment validation helpers
- Shared between facilitator and server SDK

### @nanda/x402-reference-server
- Complete MCP server using our SDK
- Replaces current implementation
- Examples of paid vs free tools
- MongoDB integration

## Dependencies
- Existing MongoDB/NP infrastructure
- MCP Streamable HTTP transport
- ngrok tunnel for testing

## Quality Gates
Each phase must pass:
- [ ] Zero TypeScript/lint errors
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated

## Risks & Blockers
- **x402-mcp complexity**: May require more analysis time
- **HTTP layer changes**: Could impact MCP client compatibility
- **Payment verification**: Edge cases in NP transaction validation

## Notes
- Focus on x402 spec compliance over custom features
- Document any deviations with clear reasoning
- Maintain clean commit history throughout implementation