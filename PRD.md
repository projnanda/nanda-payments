# Product Requirements Document: NANDA Points SDKs for x402 Integration

## Problem Statement

Developers building applications with NANDA Points payments currently need to understand complex x402 protocol details, facilitator APIs, payment verification, and MongoDB transaction handling. This creates significant barriers to adoption across different programming languages and frameworks.

**Current Pain Points:**
- No standardized client libraries for NANDA Points integration
- Complex facilitator API interactions requiring protocol knowledge
- Manual payment verification and error handling
- No language-specific SDKs for popular ecosystems
- Duplicated integration code across projects
- Steep learning curve for x402 protocol compliance

## Objective

Create comprehensive SDKs starting with TypeScript, then Python, that abstract NANDA Points payment complexity and enable developers to integrate payments with minimal protocol knowledge.

**Vision**: Language-native SDKs that handle the complexity of x402 protocol, facilitator communication, and NANDA Points transactions

## Success Criteria

### Must Have - TypeScript SDK
- [ ] npm package installation (`npm install @nanda/payments-sdk`)
- [ ] Complete x402 protocol client implementation
- [ ] Facilitator API wrapper with automatic retry logic
- [ ] Payment creation and verification utilities
- [ ] TypeScript definitions and full IntelliSense support
- [ ] Agent balance management and transaction history
- [ ] Comprehensive error handling with typed exceptions

### Must Have - Python SDK
- [ ] PyPI package installation (`pip install nanda-payments`)
- [ ] Python-native API design following PEP conventions
- [ ] Async/await support with asyncio compatibility
- [ ] Type hints throughout for mypy/PyCharm support
- [ ] Same feature parity as TypeScript SDK
- [ ] Integration with popular Python web frameworks

### Should Have
- [ ] Built-in payment testing and mocking utilities
- [ ] Configurable environments (dev, staging, prod)
- [ ] Automatic facilitator discovery and health checking
- [ ] Payment webhook handling utilities
- [ ] Comprehensive logging and debugging support
- [ ] Integration examples for popular frameworks

### Could Have (Future Work)
- [ ] Go SDK for high-performance applications
- [ ] Rust SDK for systems programming
- [ ] React hooks and components library
- [ ] Payment analytics and reporting SDKs
- [ ] GraphQL integration utilities

## Target Users

1. **Application Developers**: Building NANDA Points-enabled applications
2. **MCP Server Developers**: Adding payments to existing MCP servers
3. **Web Service Developers**: Creating paid APIs and services
4. **Enterprise Teams**: Standardizing NANDA Points integration across services
5. **Python Developers**: Building AI/ML services with usage-based billing

## User Stories

### Story 1: TypeScript - Simple Payment Client
```typescript
import { NandaPaymentsClient } from '@nanda/payments-sdk';

const client = new NandaPaymentsClient({
  agentName: 'my-app',
  facilitatorUrl: 'http://localhost:3001'
});

// Check if payment required
const response = await client.makeRequest('http://api.example.com/premium');
if (response.paymentRequired) {
  // Create and submit payment
  const payment = await client.createPayment({
    amount: response.price,
    recipient: response.payTo
  });
  const result = await client.makeRequest('http://api.example.com/premium', payment);
}
```

### Story 2: Python - Agent Balance Management
```python
from nanda_payments import NandaPaymentsClient

client = NandaPaymentsClient(
    agent_name="python-service",
    facilitator_url="http://localhost:3001"
)

# Check balance
balance = await client.get_balance()
print(f"Current balance: {balance} NP")

# Get transaction history
transactions = await client.get_transactions(limit=10)
for tx in transactions:
    print(f"{tx.created_at}: {tx.amount} NP to {tx.to_agent}")
```

### Story 3: Testing and Mocking
```typescript
// TypeScript testing utilities
import { createMockFacilitator } from '@nanda/payments-sdk/testing';

const mockFacilitator = createMockFacilitator();
const client = new NandaPaymentsClient({
  facilitatorUrl: mockFacilitator.url
});

// Test payment flows without real transactions
await client.testPaymentFlow({ amount: 10, recipient: 'test-service' });
```

## Technical Requirements

### TypeScript SDK Core Components

1. **Payment Client**
   - HTTP client for x402 protocol compliance
   - Automatic X-PAYMENT header handling
   - Payment creation and verification
   - Retry logic and error handling

2. **Facilitator API Wrapper**
   - Type-safe facilitator endpoints (/verify, /settle, /supported)
   - Connection pooling and health checking
   - Automatic failover and retry logic
   - Request/response logging and debugging

3. **Agent Management**
   - Balance inquiries and transaction history
   - Agent registration and authentication
   - Transaction receipt handling
   - Webhook support for real-time updates

4. **Testing Utilities**
   - Mock facilitator server
   - Test payment generators
   - Integration test helpers
   - Assertion utilities for payment flows

### Python SDK Core Components

1. **Async Payment Client**
   - asyncio-based HTTP client with aiohttp
   - Python-native error handling with custom exceptions
   - Context managers for resource cleanup
   - Type hints for mypy compatibility

2. **Framework Integrations**
   - FastAPI middleware and dependencies
   - Django REST framework integration
   - Flask extensions and decorators
   - Automatic serialization/deserialization

3. **Developer Experience**
   - Pythonic API design following PEP conventions
   - Comprehensive logging with structured output
   - Configuration via environment variables or files
   - CLI tools for testing and debugging

## Implementation Strategy

### Phase 1: TypeScript SDK (Weeks 1-2)
- Core payment client with x402 protocol support
- Facilitator API wrapper with retry logic
- Agent balance and transaction management
- Testing utilities and mock servers
- Comprehensive TypeScript definitions
- npm package publication

### Phase 2: Python SDK (Weeks 3-4)
- Python-native async payment client
- Framework integrations (FastAPI, Django, Flask)
- Type hints and mypy compatibility
- Testing utilities and pytest fixtures
- PyPI package publication
- Feature parity with TypeScript SDK

### Phase 3: Documentation & Examples (Week 5)
- Comprehensive API documentation
- Integration tutorials for popular frameworks
- Real-world usage examples
- Migration guides from manual integration
- Performance benchmarking
- Community feedback integration

## Monorepo Structure

```
sdks/
├── typescript/              # TypeScript SDK
│   ├── src/
│   │   ├── client/         # Payment client core
│   │   ├── facilitator/    # Facilitator API wrapper
│   │   ├── types/          # TypeScript definitions
│   │   └── testing/        # Test utilities
│   ├── examples/           # Integration examples
│   └── package.json
├── python/                 # Python SDK
│   ├── nanda_payments/
│   │   ├── client.py       # Payment client core
│   │   ├── facilitator.py  # Facilitator API wrapper
│   │   ├── types.py        # Type definitions
│   │   └── testing/        # Test utilities
│   ├── examples/           # Integration examples
│   └── pyproject.toml
└── docs/                   # Shared documentation
```

## Success Metrics

- **TypeScript**: Successful npm package with 100+ downloads/week
- **Python**: Successful PyPI package with 50+ downloads/week
- **Developer Satisfaction**: < 5 minutes to make first payment request
- **API Coverage**: 100% of facilitator endpoints wrapped
- **Error Rate**: < 2% of integrations encounter setup issues

## Non-Goals

- Building server-side payment middleware (that's separate packages)
- Supporting non-NANDA payment schemes initially
- Blockchain or cryptocurrency integrations
- Payment UI components (pure client libraries)
- Database direct access (only through facilitator APIs)

## Definition of Done

### TypeScript SDK
A developer can:
1. `npm install @nanda/payments-sdk`
2. Create payment client with 3 lines of code
3. Make payment requests with automatic x402 handling
4. Access full TypeScript IntelliSense and type safety
5. Use comprehensive testing utilities

### Python SDK
A developer can:
1. `pip install nanda-payments`
2. Create async payment client following Python conventions
3. Integrate with FastAPI/Django with provided middleware
4. Access full type hints and mypy compatibility
5. Use pytest fixtures for testing

Both SDKs should feel native to their respective ecosystems while providing identical functionality.