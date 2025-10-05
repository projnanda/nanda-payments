# CLAUDE Development Notes

## Current Project: x402 Compliance Implementation

### Overview
Replacing the current custom x402-NP implementation with a proper x402-compliant system that reuses the reference x402-mcp codebase while substituting MongoDB/NANDA Points for blockchain/USDC settlement.

### Current Status
- ✅ Analyzed existing x402-NP implementation gaps
- ✅ Researched reference x402 specification and x402-mcp
- ✅ Defined implementation strategy

### Key Decisions Made

#### 1. Package Strategy: Fork x402-mcp + Monorepo
- **Decision**: Fork x402-mcp directly and create monorepo structure
- **Reasoning**: Maximum code reuse, support external Resource Servers
- **Structure**: facilitator + server SDK packages
- **Alternative rejected**: Separate npm package due to complexity

#### 2. Security/Wallet: Defer EIP-712
- **Decision**: Continue with agent-name + transaction ID approach for now
- **Reasoning**: EIP-712 wallet implementation is significant scope creep
- **Future work**: Implement proper wallet with EIP-712 signatures

#### 3. Architecture: Single Server Initially
- **Decision**: Integrate facilitator logic into MCP server
- **Reasoning**: Simpler deployment, fewer moving parts for first release
- **Future work**: Can refactor to separate facilitator service later

#### 4. Migration Strategy: Clean Slate
- **Decision**: Replace existing implementation completely
- **Requirements**:
  - TypeScript best practices
  - Zero linting errors
  - Proper x402 spec compliance
  - New README matching implementation
  - Document any spec deviations with reasoning

#### 5. SDK Strategy: Resource Server Focus
- **Decision**: Build Resource Server SDK, Client SDK only if needed
- **Reasoning**: Support external MCP servers, clients can use standard x402
- **Facilitator Discovery**: Via HTTP 402 response (standard x402 pattern)

### Implementation Plan

#### Phase 1: Analysis & Setup
- [ ] Fork x402-mcp repository
- [ ] Analyze x402-mcp codebase structure
- [ ] Identify integration points for NP payment scheme
- [ ] Research HTTP 402 response format for facilitator discovery
- [ ] Design monorepo structure
- [x] Set up new feature branch

#### Phase 2: Core Implementation
- [ ] Design NP payment scheme to replace EIP-712/USDC
- [ ] Create Resource Server SDK package
- [ ] Implement NP facilitator endpoints within MCP server
- [ ] Modify x402-mcp to use NP settlement instead of blockchain
- [ ] Add proper HTTP 402 responses with X-PAYMENT headers
- [ ] Include facilitator URL in payment requirements

#### Phase 3: Integration & Testing
- [ ] Update MCP server to use new x402 implementation
- [ ] Create test suite for x402 compliance
- [ ] Test with Claude Web via ngrok
- [ ] Verify payment flow end-to-end

#### Phase 4: Documentation & Cleanup
- [ ] Write new README from scratch
- [ ] Document NP payment scheme specification
- [ ] Add API documentation for facilitator endpoints
- [ ] Clean up old implementation files

### Technical Requirements

#### Must Have:
- HTTP 402 status codes for payment required
- X-PAYMENT and X-PAYMENT-RESPONSE headers
- Standard x402 payment requirements JSON format
- NP-based payment scheme implementation
- Facilitator API endpoints (/verify, /settle, /supported)

#### Current Environment:
- MongoDB running on port 27017
- MCP server running on port 3000
- ngrok tunnel: https://cd79c8029a69.ngrok-free.app
- Database: `nanda_points` with proper schema

### Commands to Remember:
```bash
# Development
npm run dev

# Testing
npm run test
npm run test:x402-full

# Linting (must be zero errors)
npm run lint
npm run typecheck
```

### Notes:
- Always maintain zero linting errors
- Follow TypeScript best practices
- Document any deviations from x402 spec with clear reasoning
- Keep README.md in sync with implementation