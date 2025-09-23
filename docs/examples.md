# Examples and Integration Guide

## Quick Start Example

### 1. Start the Services

```bash
# Terminal 1: Start facilitator
cd packages/facilitator
npm run dev
# Runs on http://localhost:3001

# Terminal 2: Start Express server
cd packages/express-server
npm run dev
# Runs on http://localhost:3000
```

### 2. Test Free Endpoints

```bash
# Health check (free)
curl http://localhost:3000/health

# Weather data (free)
curl http://localhost:3000/weather
```

### 3. Test Paid Endpoints (Expect 402)

```bash
# Premium content (10 NP required)
curl http://localhost:3000/premium/content

# Premium analysis (10 NP required)
curl http://localhost:3000/premium/analysis
```

### 4. Make a Payment

```bash
# Create payment payload
PAYMENT='{
  "x402Version": 1,
  "scheme": "nanda-points",
  "network": "nanda-network",
  "payTo": "system",
  "amount": "10",
  "from": "claude-desktop",
  "txId": "example-tx-'$(date +%s)'",
  "timestamp": '$(date +%s)'000'
}'

# Encode and make request
ENCODED=$(echo "$PAYMENT" | base64 -w 0)
curl -H "X-PAYMENT: $ENCODED" http://localhost:3000/premium/content
```

## Integration Examples

### Express Server with Payments

```typescript
import express from "express";
import { npPaymentMiddleware } from "x402-nanda-shared";

const app = express();
const facilitatorUrl = "http://localhost:3001";
const recipient = "my-service";

// Configure payment routes
app.use(
  npPaymentMiddleware(
    {
      // Exact route match
      "GET /api/premium-analysis": {
        priceNP: 5,
        recipient,
        description: "AI-powered analysis",
      },

      // Wildcard patterns
      "/api/premium/*": {
        priceNP: 10,
        recipient,
        description: "Premium API access",
      },

      // Method-specific
      "POST /api/generate": {
        priceNP: 15,
        recipient,
        description: "AI content generation",
        maxTimeoutSeconds: 120,
      }
    },
    facilitatorUrl
  )
);

// Free endpoints (no middleware applied)
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

app.get("/api/info", (req, res) => {
  res.json({
    service: "AI API",
    version: "1.0.0",
    freeEndpoints: ["/api/health", "/api/info"],
    paidEndpoints: ["/api/premium/*", "/api/generate"]
  });
});

// Paid endpoints (automatically protected)
app.get("/api/premium-analysis", (req, res) => {
  res.json({
    analysis: "Detailed AI analysis results...",
    confidence: 0.95,
    cost: "5 NP",
    processingTime: "2.3s"
  });
});

app.get("/api/premium/forecast", (req, res) => {
  res.json({
    forecast: "Predictive modeling results...",
    timeframe: "30 days",
    cost: "10 NP"
  });
});

app.post("/api/generate", (req, res) => {
  const { prompt } = req.body;
  res.json({
    generated: `Generated content based on: ${prompt}`,
    tokens: 150,
    cost: "15 NP"
  });
});

app.listen(3000, () => {
  console.log("AI API running on http://localhost:3000");
});
```

### Tiered Pricing Example

```typescript
const tieredRoutes = {
  // Free tier (no payment middleware)
  // Applied directly to routes

  // Basic tier - 1 NP
  "GET /basic/*": {
    priceNP: 1,
    recipient: "api-service",
    description: "Basic API access",
    maxTimeoutSeconds: 30,
  },

  // Standard tier - 5 NP
  "GET /standard/*": {
    priceNP: 5,
    recipient: "api-service",
    description: "Standard API access",
    maxTimeoutSeconds: 60,
  },

  // Premium tier - 10 NP
  "GET /premium/*": {
    priceNP: 10,
    recipient: "api-service",
    description: "Premium API access",
    maxTimeoutSeconds: 120,
  },

  // Enterprise tier - 25 NP
  "GET /enterprise/*": {
    priceNP: 25,
    recipient: "api-service",
    description: "Enterprise API access",
    maxTimeoutSeconds: 300,
  }
};

app.use(npPaymentMiddleware(tieredRoutes, facilitatorUrl));
```

### Dynamic Pricing Example

```typescript
// Custom middleware for dynamic pricing
function dynamicPricingMiddleware(basePrice: number, recipient: string) {
  return npPaymentMiddleware(
    {
      "*": {
        priceNP: basePrice, // Will be overridden
        recipient,
        description: "Dynamic pricing endpoint",
      }
    },
    facilitatorUrl
  );
}

// Pre-process to set dynamic price
app.use("/api/dynamic", (req, res, next) => {
  const complexity = parseInt(req.query.complexity as string) || 1;
  const basePrice = 5;
  const dynamicPrice = basePrice * complexity;

  // Store in request for middleware
  (req as any).dynamicPrice = dynamicPrice;
  next();
});

// Apply payment middleware
app.use("/api/dynamic", dynamicPricingMiddleware(5, "dynamic-service"));

app.get("/api/dynamic/process", (req, res) => {
  const complexity = req.query.complexity || 1;
  const price = (req as any).dynamicPrice || 5;

  res.json({
    result: `Processed with complexity level ${complexity}`,
    cost: `${price} NP`,
    formula: "basePrice * complexity"
  });
});
```

## Client Integration

### Node.js Client Example

```typescript
import fetch from "node-fetch";

class NandaPointsClient {
  constructor(
    private baseUrl: string,
    private agentName: string
  ) {}

  async makeRequest(endpoint: string, payment?: any) {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (payment) {
      const encoded = Buffer.from(JSON.stringify(payment)).toString('base64');
      headers['X-PAYMENT'] = encoded;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });

    if (response.status === 402) {
      const paymentInfo = await response.json();
      return { needsPayment: true, paymentInfo };
    }

    const data = await response.json();
    const settlementHeader = response.headers.get('X-PAYMENT-RESPONSE');

    return {
      data,
      settlement: settlementHeader ?
        JSON.parse(Buffer.from(settlementHeader, 'base64').toString()) : null
    };
  }

  async accessPremiumContent() {
    // Try without payment first
    let result = await this.makeRequest('/premium/content');

    if (result.needsPayment) {
      console.log('Payment required:', result.paymentInfo);

      // Create payment
      const payment = {
        x402Version: 1,
        scheme: "nanda-points",
        network: "nanda-network",
        payTo: result.paymentInfo.accepts[0].payTo,
        amount: result.paymentInfo.accepts[0].maxAmountRequired,
        from: this.agentName,
        txId: `client-${Date.now()}`,
        timestamp: Date.now()
      };

      // Retry with payment
      result = await this.makeRequest('/premium/content', payment);
    }

    return result;
  }
}

// Usage
const client = new NandaPointsClient('http://localhost:3000', 'my-agent');
const content = await client.accessPremiumContent();
console.log('Content:', content.data);
console.log('Settlement:', content.settlement);
```

### Error Handling Patterns

```typescript
async function robustRequest(endpoint: string, agentName: string) {
  try {
    const result = await client.makeRequest(endpoint);

    if (result.needsPayment) {
      const { accepts } = result.paymentInfo;
      const requirement = accepts[0];

      // Check if we support this payment scheme
      if (requirement.scheme !== 'nanda-points') {
        throw new Error(`Unsupported payment scheme: ${requirement.scheme}`);
      }

      // Create and submit payment
      const payment = createPayment(agentName, requirement);
      const paidResult = await client.makeRequest(endpoint, payment);

      if (paidResult.needsPayment) {
        // Payment failed
        throw new Error(`Payment failed: ${paidResult.paymentInfo.error}`);
      }

      return paidResult;
    }

    return result;

  } catch (error) {
    console.error(`Request to ${endpoint} failed:`, error);
    throw error;
  }
}

function createPayment(agentName: string, requirement: any) {
  return {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payTo: requirement.payTo,
    amount: requirement.maxAmountRequired,
    from: agentName,
    txId: `${agentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  };
}
```

## Testing Scenarios

### Manual Testing with curl

```bash
# 1. Test all free endpoints
curl -s http://localhost:3000/health | jq
curl -s http://localhost:3000/weather | jq

# 2. Test payment required responses
curl -s http://localhost:3000/premium/content | jq
curl -s http://localhost:3000/premium/analysis | jq

# 3. Test with valid payment
PAYMENT='{"x402Version":1,"scheme":"nanda-points","network":"nanda-network","payTo":"system","amount":"10","from":"test-agent","txId":"test-'$(date +%s)'","timestamp":'$(date +%s)'000'}'
ENCODED=$(echo "$PAYMENT" | base64 -w 0)
curl -s -H "X-PAYMENT: $ENCODED" http://localhost:3000/premium/content | jq

# 4. Test error scenarios
INVALID_PAYMENT='{"invalid": "payment"}'
ENCODED_INVALID=$(echo "$INVALID_PAYMENT" | base64 -w 0)
curl -s -H "X-PAYMENT: $ENCODED_INVALID" http://localhost:3000/premium/content | jq
```

### Database State Verification

```bash
# Check balances before and after payments
mongosh nanda_points --eval "
  db.wallets.find({agent_name: {\$in: ['claude-desktop', 'system']}},
                   {agent_name: 1, balanceMinor: 1, _id: 0})
"

# Check recent transactions
mongosh nanda_points --eval "
  db.transactions.find({}, {txId: 1, fromAgent: 1, toAgent: 1, amountMinor: 1, createdAt: 1, _id: 0})
    .sort({createdAt: -1}).limit(5)
"

# Check receipts
mongosh nanda_points --eval "
  db.receipts.find({}, {txId: 1, fromAgent: 1, toAgent: 1, amountMinor: 1, issuedAt: 1, _id: 0})
    .sort({issuedAt: -1}).limit(5)
"
```

## Production Considerations

### Environment Configuration

```bash
# .env for production
MONGODB_URI=mongodb://prod-server:27017
NP_DB_NAME=nanda_points_prod
FACILITATOR_BASE_URL=https://facilitator.yourcompany.com
FACILITATOR_PORT=3001
PORT=3000
ADDRESS=production-service
```

### Security Recommendations

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Authentication**: Consider agent authentication for production
3. **Monitoring**: Log all payment attempts and failures
4. **Validation**: Strict input validation on all endpoints
5. **HTTPS**: Use HTTPS in production environments

### Scaling Considerations

1. **Database Connections**: Use connection pooling
2. **Facilitator High Availability**: Deploy multiple facilitator instances
3. **Caching**: Cache agent and balance lookups
4. **Async Processing**: Consider async payment processing for high volume
5. **Monitoring**: Set up alerts for failed payments