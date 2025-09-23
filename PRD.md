# Product Requirements Document: x402 Compliance Implementation

## Problem Statement

The current x402-NP implementation in this codebase takes shortcuts that bypass the core x402 specification:
- Uses MCP tool arguments instead of HTTP headers
- Returns JSON errors instead of HTTP 402 status codes
- Lacks X-PAYMENT and X-PAYMENT-RESPONSE header support
- Non-standard payment requirements format

**Key Insight**: Coinbase's x402-mcp AND their MCP example are both client-side implementations that call external x402 APIs. We need to build the **server-side infrastructure** that those clients would call. Our servers will be compatible with existing x402 clients.

## Objective

Build the **server-side infrastructure** for x402-compliant payment systems that:
- Creates MCP servers that return proper HTTP 402 responses
- Substitutes MongoDB/NANDA Points for blockchain/USDC settlement
- Works with existing x402 clients (like Coinbase's x402-mcp)
- Follows HTTP 402 specification properly
- Provides SDK for Resource Server developers to add x402 payments
- Supports facilitator URL discovery via HTTP 402 responses
- Enables our MCP servers to be called by any x402-compatible client

## Success Criteria

### Must Have
- [ ] HTTP 402 "Payment Required" status codes
- [ ] X-PAYMENT header support for payment payloads
- [ ] X-PAYMENT-RESPONSE header for settlement receipts
- [ ] Standard x402 payment requirements JSON format
- [ ] Full compatibility with x402 protocol specification
- [ ] Zero TypeScript linting errors
- [ ] Comprehensive test suite

### Should Have
- [ ] NP-based payment scheme ("nanda-points")
- [ ] Facilitator API endpoints (/verify, /settle, /supported)
- [ ] Integration with existing MongoDB/NP infrastructure
- [ ] Resource Server SDK for easy MCP server integration
- [ ] Monorepo structure with facilitator + server SDK
- [ ] Updated documentation matching implementation

### Could Have (Future Work)
- [ ] EIP-712 signature support for enhanced security
- [ ] Separate facilitator service deployment
- [ ] Client SDK for Requesting Agents (if needed)
- [ ] Multiple payment scheme support
- [ ] Payment caching and optimization

## Technical Requirements

### Core Components
1. **HTTP Protocol Layer**: Proper 402 responses and header handling via Streamable HTTP
2. **MCP Transport**: Streamable HTTP transport (not stdio) for MCP integration
3. **Payment Scheme**: "nanda-points" scheme replacing EIP-712/USDC
4. **Settlement Layer**: MongoDB transactions instead of blockchain
5. **Facilitator API**: Standard x402 facilitator endpoints

### Architecture Decisions
- **Base Implementation**: Build from scratch using x402 protocol specification
- **Role**: Server-side infrastructure (not client like Coinbase's x402-mcp)
- **Transport Protocol**: Streamable HTTP for MCP (required for proper HTTP 402 handling)
- **Security Model**: Continue with agent-name + transaction ID (defer EIP-712)
- **Deployment**: Single server with integrated facilitator (initially)
- **Migration**: Complete rebuild - NO backward compatibility, NO retained code
- **SDK Strategy**: Resource Server SDK for MCP developers to add x402 payments
- **Client Compatibility**: Work with existing x402 clients (x402-axios, x402-mcp)
- **Facilitator Discovery**: Via HTTP 402 response (standard x402 pattern)
- **Database**: Retain MongoDB data, create new schema if needed with seed documentation

### Quality Standards
- TypeScript best practices throughout
- Zero linting errors mandatory
- Proper x402 spec compliance
- Any deviations must be documented with reasoning

## Non-Goals

- Implementing EIP-712 wallet functionality (future work)
- Supporting the existing custom x402-NP argument-based system
- Maintaining ANY backward compatibility with current implementation
- Retaining ANY existing code from current branch
- Separate facilitator service deployment (initially)
- Supporting stdio transport (Streamable HTTP only)

## Risks & Mitigation

### Technical Risks
- **x402-mcp integration complexity**: Mitigate by thorough analysis before implementation
- **HTTP layer changes in MCP**: Ensure proper testing with real MCP clients
- **Payment verification edge cases**: Comprehensive test coverage

### Timeline Risks
- **Scope creep with security features**: Defer EIP-712 to future iterations
- **Over-engineering facilitator separation**: Start with integrated approach

## Definition of Done

A payment flow where:
1. Client calls paid MCP tool without payment
2. Server returns HTTP 402 with standard payment requirements
3. Client makes NP transaction via existing system
4. Client retries with X-PAYMENT header containing payment proof
5. Server verifies payment, executes tool, returns result with X-PAYMENT-RESPONSE
6. All steps follow x402 specification exactly