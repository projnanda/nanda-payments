# @nanda/payments-sdk

A TypeScript SDK for integrating NANDA Points payments into MCP servers and Express.js applications. This SDK provides server-side utilities for developers who want to monetize their tools using the x402 payment protocol.

## Overview

The NANDA Payments SDK is designed to be the **"only way"** developers integrate NANDA Points payments into their MCP (Model Context Protocol) servers. It abstracts the complexity of the x402 protocol while providing developer-friendly APIs that feel as natural as adding any other middleware.

### Key Features

- **🔧 MCP Tool Monetization**: Convert free tools to paid tools with a simple decorator
- **⚡ Quick Setup**: Get started with payments in 3 lines of code
- **🛡️ Type Safety**: Full TypeScript support with comprehensive type definitions
- **🌐 Express Middleware**: Route-level payment protection for HTTP APIs
- **🔄 x402 Compliant**: Follows Coinbase's x402 reference implementation
- **📦 Zero Dependencies**: Minimal external dependencies beyond essential HTTP libraries

## Installation

```bash
npm install @nanda/payments-sdk
```

## Quick Start

### MCP Server Integration

```typescript
import { quickSetup } from '@nanda/payments-sdk';

// 1. Quick setup for MCP servers
const payments = await quickSetup({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'my-mcp-server'
});

// 2. Convert free tool to paid tool
const freeWeatherTool = (args) => getBasicWeather(args.location);

const paidWeatherTool = payments.requirePayment({
  amount: 50, // 50 NANDA Points
  description: 'Premium weather data with forecasts'
})(freeWeatherTool);

// 3. Create new paid tool
const premiumAnalyticsTool = payments.createPaidTool(
  'premium_analytics',
  { amount: 100, description: 'Advanced analytics data' },
  async (args) => {
    return await getAdvancedAnalytics(args.dataset);
  }
);
```

### Express.js API Integration

```typescript
import express from 'express';
import { paymentMiddleware, createPaymentConfig } from '@nanda/payments-sdk';

const app = express();

// Configure payment settings
const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'api-server'
});

// Apply payment requirements to specific routes
app.use(paymentMiddleware({
  '/api/premium': { amount: 25, description: 'Premium API access' },
  '/api/analytics': { amount: 50, description: 'Analytics data' },
  'POST /api/compute': { amount: 100, description: 'Heavy computation' }
}, config));

// Your protected routes
app.get('/api/premium', (req, res) => {
  res.json({ data: 'premium content' });
});
```

## API Reference

### Core Functions

#### `quickSetup(config)`

Rapid configuration for MCP servers. Returns an object with configured payment utilities.

```typescript
const payments = await quickSetup({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'my-server'
});
```

**Returns:**
- `config`: Payment configuration object
- `requirePayment`: Function to wrap existing tools with payment requirements
- `createPaidTool`: Function to create new payment-protected tools
- `facilitator`: Direct facilitator client for advanced usage

#### `requirePayment(requirement, config)`

Decorator function that wraps existing tools with payment requirements.

```typescript
const paidTool = requirePayment({
  amount: 50,
  description: 'Premium tool access',
  recipient: 'service-provider', // optional
  timeout: 30000 // optional
}, config)(originalTool);
```

#### `createPaidTool(name, requirement, config, handler)`

Creates a new payment-protected tool with MCP-compatible structure.

```typescript
const tool = createPaidTool(
  'weather_premium',
  { amount: 100, description: 'Premium weather analysis' },
  config,
  async (args) => {
    return await getPremiumWeather(args.location);
  }
);
```

#### `paymentMiddleware(routes, config)`

Express middleware for route-level payment protection.

```typescript
app.use(paymentMiddleware({
  '/api/protected': { amount: 25, description: 'Protected endpoint' }
}, config));
```

#### `createPaymentConfig(config)`

Creates a payment configuration with defaults.

```typescript
const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'my-service',
  timeout: 30000, // optional
  retryCount: 3, // optional
  retryDelay: 1000 // optional
});
```

### Type Definitions

#### `ToolPaymentRequirement`

```typescript
interface ToolPaymentRequirement {
  amount: number; // NANDA Points required
  description?: string; // Human-readable description
  recipient?: string; // Payment recipient (defaults to agentName)
  timeout?: number; // Payment timeout in milliseconds
}
```

#### `PaymentConfig`

```typescript
interface PaymentConfig {
  facilitatorUrl: string; // NANDA Points facilitator URL
  agentName: string; // Your service/agent name
  timeout?: number; // Request timeout (default: 30000ms)
  retryCount?: number; // Retry attempts (default: 3)
  retryDelay?: number; // Delay between retries (default: 1000ms)
}
```

## Payment Flow

### 1. Tool Execution Without Payment

When a paid tool is called without payment, it throws an `NPPaymentError` with payment requirements:

```typescript
try {
  await paidTool(args);
} catch (error) {
  if (error.code === 'PAYMENT_REQUIRED') {
    console.log('Payment required:', error.details.requirements);
    // Client should create payment and retry
  }
}
```

### 2. HTTP API Payment Flow

For Express routes, the middleware returns HTTP 402 with x402-compliant response:

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "nanda-points",
      "network": "nanda-network",
      "maxAmountRequired": "25",
      "resource": "https://api.example.com/premium",
      "description": "Premium API access",
      "payTo": "api-server",
      "asset": "NP"
    }
  ]
}
```

### 3. Payment Verification

The SDK automatically:
1. Extracts payment from `X-PAYMENT` header or context
2. Verifies payment with the NANDA Points facilitator
3. Executes the protected function/route
4. Settles the payment after successful execution

## Error Handling

The SDK provides typed error classes for different scenarios:

```typescript
import {
  NPPaymentError,
  NPVerificationError,
  NPSettlementError,
  NPNetworkError
} from '@nanda/payments-sdk';

try {
  await paidTool(args);
} catch (error) {
  if (error instanceof NPPaymentError) {
    switch (error.code) {
      case 'PAYMENT_REQUIRED':
        // Handle payment requirement
        break;
      case 'VERIFICATION_FAILED':
        // Handle verification failure
        break;
      case 'PAYMENT_ERROR':
        // Handle general payment error
        break;
    }
  }
}
```

## Advanced Usage

### Custom Facilitator Client

```typescript
import { createFacilitatorClient } from '@nanda/payments-sdk';

const facilitator = createFacilitatorClient('http://localhost:3001');

// Check supported payment schemes
const supported = await facilitator.supported();

// Verify payment manually
const verification = await facilitator.verify(payment, requirements);

// Settle payment manually
const settlement = await facilitator.settle(payment, requirements);
```

### Manual Payment Requirements

```typescript
import { createPaymentRequirements } from '@nanda/payments-sdk';

const requirements = createPaymentRequirements(
  100, // amount
  'https://api.example.com/resource', // resource
  'Payment for premium access', // description
  'service-provider', // recipient
  'http://localhost:3001' // facilitator URL
);
```

## Configuration

### Environment Variables

The SDK respects these environment variables for default configuration:

```bash
FACILITATOR_URL=http://localhost:3001
AGENT_NAME=my-service
PAYMENT_TIMEOUT=30000
PAYMENT_RETRY_COUNT=3
PAYMENT_RETRY_DELAY=1000
```

### Production Configuration

For production deployments:

```typescript
const config = createPaymentConfig({
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://facilitator.nanda.ai',
  agentName: process.env.AGENT_NAME || 'production-service',
  timeout: 10000, // Lower timeout for production
  retryCount: 2,
  retryDelay: 500
});
```

## Examples

### Complete MCP Server

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { quickSetup } from '@nanda/payments-sdk';

const payments = await quickSetup({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'weather-service'
});

const server = new Server(
  { name: 'weather-service', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Free tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'basic_weather',
      description: 'Get basic weather information',
      inputSchema: { type: 'object', properties: { location: { type: 'string' } } }
    },
    payments.createPaidTool(
      'premium_weather',
      { amount: 50, description: 'Premium weather with forecasts' },
      async (args) => getPremiumWeather(args.location)
    )
  ]
}));
```

### Express API with Mixed Routes

```typescript
import express from 'express';
import { paymentMiddleware, createPaymentConfig } from '@nanda/payments-sdk';

const app = express();
const config = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3001',
  agentName: 'data-api'
});

// Free endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/public', (req, res) => res.json({ data: 'public data' }));

// Protected endpoints
app.use(paymentMiddleware({
  '/api/premium': { amount: 25, description: 'Premium data access' },
  '/api/analytics': { amount: 50, description: 'Analytics data' },
  'POST /api/process': { amount: 100, description: 'Data processing' }
}, config));

app.get('/api/premium', (req, res) => {
  res.json({ data: 'premium content', timestamp: Date.now() });
});

app.get('/api/analytics', (req, res) => {
  res.json({
    analytics: { users: 1250, revenue: 15750 },
    timestamp: Date.now()
  });
});

app.post('/api/process', (req, res) => {
  // Heavy computation that requires payment
  const result = processLargeDataset(req.body.dataset);
  res.json({ result, processingTime: result.duration });
});
```

## Testing

### Mock Facilitator

For testing, you can create a mock facilitator that always approves payments:

```typescript
import { createFacilitatorClient } from '@nanda/payments-sdk';

// In tests, use a mock facilitator
const mockConfig = createPaymentConfig({
  facilitatorUrl: 'http://localhost:3999', // Test facilitator
  agentName: 'test-service'
});

// Test your paid tools
const paidTool = requirePayment({ amount: 10 }, mockConfig)(originalTool);
```

## Troubleshooting

### Common Issues

**1. "Payment required" error when expecting free access**
- Ensure the tool/route is not wrapped with payment requirements
- Check if middleware is applied to the correct routes

**2. "Payment verification failed"**
- Verify the facilitator URL is correct and accessible
- Check that the payment payload format matches requirements
- Ensure sufficient balance in the payer's account

**3. "Facilitator connection failed"**
- Check network connectivity to facilitator
- Verify facilitator is running and healthy
- Check firewall and proxy settings

**4. TypeScript compilation errors**
- Ensure you're using TypeScript 4.5+
- Import types correctly: `import type { PaymentConfig } from '@nanda/payments-sdk'`
- Enable `strict` mode for better type checking

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=nanda:payments npm start
```

## Migration Guide

### From Manual x402 Implementation

If you're currently handling x402 payments manually:

1. **Replace payment verification logic**:
   ```typescript
   // Before: Manual verification
   if (!req.headers['x-payment']) {
     return res.status(402).json({ error: 'Payment required' });
   }

   // After: SDK middleware
   app.use(paymentMiddleware({
     '/api/route': { amount: 25, description: 'API access' }
   }, config));
   ```

2. **Replace facilitator calls**:
   ```typescript
   // Before: Manual facilitator calls
   const response = await fetch(`${facilitatorUrl}/verify`, { ... });

   // After: SDK facilitator client
   const facilitator = createFacilitatorClient(facilitatorUrl);
   const verification = await facilitator.verify(payment, requirements);
   ```

### From Other Payment Systems

The SDK is designed to be the primary payment system for NANDA Points. If migrating from other systems:

1. Replace existing payment decorators with `requirePayment()`
2. Update payment amount units to NANDA Points
3. Replace HTTP status codes with x402-compliant responses
4. Update client integrations to use x402 protocol

## Support and Contributing

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/projnanda/nanda-payments/issues)
- **Documentation**: Find more examples and guides in the [project documentation](https://github.com/projnanda/nanda-payments/docs)
- **Contributing**: See [CONTRIBUTING.md](https://github.com/projnanda/nanda-payments/blob/main/CONTRIBUTING.md) for development setup

## License

MIT License - see [LICENSE](https://github.com/projnanda/nanda-payments/blob/main/LICENSE) for details.