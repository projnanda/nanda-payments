# x402 NANDA Points - Server-Side Infrastructure

**Complete x402-compliant payment system using NANDA Points instead of blockchain/USDC settlement.**

## Overview

This monorepo provides the **server-side infrastructure** for x402-compliant payment systems. While Coinbase's x402-mcp and MCP examples are client-side implementations that call external x402 APIs, this project builds the server infrastructure that those clients can call.

## What This Enables

- **MCP servers** that return proper HTTP 402 "Payment Required" responses
- **NANDA Points** as the settlement layer instead of blockchain transactions
- **Compatibility** with existing x402 clients (x402-axios, x402-mcp, etc.)
- **Standard x402 protocol** compliance for ecosystem interoperability

## Architecture

```
┌─────────────────┐    HTTP 402    ┌─────────────────┐
│  x402 Clients   │ ──────────────► │   Our MCP       │
│ (Coinbase MCP,  │    Payments    │   Servers       │
│  x402-axios)    │ ◄────────────── │ (This Project)  │
└─────────────────┘                └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │ NANDA Points    │
                                   │ Facilitator     │
                                   │ (MongoDB)       │
                                   └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB running on port 27017
- NANDA Points database seeded

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB settings
```

### 3. Seed Database
```bash
npm run seed
```

### 4. Start Reference Server
```bash
npm run dev
```

Your x402-compliant MCP server will be running at:
- **MCP Endpoint**: `http://localhost:3000/mcp`
- **Health Check**: `http://localhost:3000/health`
- **Facilitator**: `http://localhost:3000/facilitator`

### 5. Test with ngrok (for Claude Web)
```bash
ngrok http 3000
```

## Packages

### [@nanda/x402-facilitator](./packages/facilitator/)
**NANDA Points Facilitator Service**
- Implements standard x402 facilitator API (`/verify`, `/settle`, `/supported`)
- Handles "nanda-points" payment scheme
- Integrates with MongoDB instead of blockchain
- Returns proper x402 payment receipts

### [@nanda/x402-mcp-server](./packages/mcp-server-sdk/)
**SDK for MCP Server Developers**
- Middleware to add x402 payments to MCP tools
- Returns proper HTTP 402 responses with payment requirements
- Includes facilitator URL discovery
- Works with Streamable HTTP transport

### [@nanda/x402-shared](./packages/shared/)
**Shared Utilities & Types**
- Common x402 types and interfaces
- NANDA Points transaction utilities
- Payment validation helpers

### [@nanda/x402-reference-server](./packages/reference-server/)
**Reference Implementation**
- Complete MCP server using our SDK
- Examples of paid vs free tools
- Replaces the previous custom implementation

## Testing

### Unit Tests
```bash
npm test
```

### x402 Protocol Compliance
```bash
npm run test:x402
```

### Integration with Clients
```bash
npm run test:clients
```

## Development

This project uses:
- **TypeScript** with strict type checking
- **Monorepo** structure with workspaces
- **ESLint/Prettier** for code quality
- **MCP SDK** for Model Context Protocol
- **Express** for HTTP servers

### Adding a Paid Tool

```typescript
import { createPaidTool } from '@nanda/x402-mcp-server';

const server = new MCPServer(/* ... */);

// Add a paid tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    createPaidTool("expensive-analysis", {
      priceNP: 10,
      recipient: "system",
      description: "Run expensive AI analysis"
    }, {
      inputSchema: { /* ... */ }
    })
  ]
}));
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with full test coverage
4. Ensure zero lint errors: `npm run lint`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Documentation

- [Facilitator API](./packages/facilitator/README.md)
- [MCP Server SDK](./packages/mcp-server-sdk/README.md)
- [Payment Protocol](./docs/x402-nanda-protocol.md)
- [Examples](./examples/)