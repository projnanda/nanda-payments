# NANDA Adapter with Python Payment Integration

A Python implementation that adds NANDA Points payment requirements to the original [NANDA Adapter](https://github.com/projnanda/adapter) `/api/send` route, using a custom Python SDK for NANDA Points payments.

## Overview

This implementation takes the existing Python adapter code as a baseline and integrates NANDA Points payment requirements using a Flask decorator approach. The `/api/send` route now requires 10 NANDA Points per message, while maintaining backward compatibility for free endpoints.

## Key Features

- 🐍 **Pure Python Implementation**: Uses the original Python adapter as baseline
- 💰 **NANDA Points Integration**: Custom Python SDK for payment handling
- 🔒 **Flask Decorators**: Clean integration using `@require_payment` decorator
- 🔄 **Backward Compatible**: Free endpoints remain unchanged
- ⚡ **x402 Compliant**: Returns proper HTTP 402 responses
- 🏥 **Health Monitoring**: Payment statistics and monitoring endpoints

## File Structure

```
python-adapter/
├── run_ui_agent_https.py                    # Original adapter (reference)
├── run_ui_agent_https_with_payments.py     # Modified adapter with payments
├── agent_bridge.py                         # Agent bridge component
├── nanda_payments_sdk.py                   # Custom Python SDK
├── requirements.txt                        # Python dependencies
├── .env.example                            # Environment configuration
├── test_endpoints.py                       # Test script
└── README.md                               # This file
```

## Quick Start

### Prerequisites

- Python 3.8+
- MongoDB running on localhost:27017
- NANDA Points facilitator running on localhost:3001
- Valid NANDA Points agent account

### Installation

```bash
# Navigate to python adapter directory
cd python-adapter

# Install Python dependencies
pip install -r requirements.txt

# Note: python_a2a library may need separate installation
# pip install python_a2a

# Copy environment configuration
cp .env.example .env
# Edit .env with your settings
```

### Configuration

Edit `.env` file:

```bash
# Server Configuration
UI_PORT=5000
HOST=0.0.0.0
AGENT_PORT=3000

# NANDA Points Configuration
FACILITATOR_URL=http://localhost:3001
AGENT_NAME=nanda-adapter

# Optional: Claude API for enhanced processing
CLAUDE_API_KEY=your_claude_api_key_here
```

### Start the Adapter

```bash
python run_ui_agent_https_with_payments.py
```

Your adapter will be running at `http://localhost:5000`

## API Endpoints

### Free Endpoints (Unchanged)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with payment status |
| `GET` | `/api/agents/list` | List available agents |
| `GET` | `/api/messages/stream` | Server-Sent Events stream |
| `GET` | `/api/render` | Get latest message |
| `GET` | `/api/conversations/:id` | Get conversation history |
| `GET` | `/api/messages` | Get all messages (paginated) |
| `GET` | `/api/stats` | Payment and usage statistics |
| `GET` | `/api/test/payment-info` | Payment configuration info |
| `POST` | `/api/test/send-free` | Free send test endpoint |

### Paid Endpoints 💰

| Method | Endpoint | Cost | Description |
|--------|----------|------|-------------|
| `POST` | `/api/send` | 10 NP | Send message to agent bridge |
| `POST` | `/api/receive_message` | 5 NP | Receive message from agent bridge |

## Python SDK Usage

### Basic Setup

```python
from nanda_payments_sdk import quick_setup, PaymentRequirement, require_payment

# Initialize payments
payments = quick_setup(
    facilitator_url="http://localhost:3001",
    agent_name="my-adapter"
)

# Create payment requirement
requirement = PaymentRequirement(
    amount=10,  # 10 NANDA Points
    description="Premium API access"
)

# Use as Flask decorator
@app.route('/api/premium', methods=['POST'])
@require_payment(requirement, payments['config'])
def premium_endpoint():
    return {"data": "premium content"}
```

### Manual Payment Verification

```python
from nanda_payments_sdk import (
    create_facilitator_client,
    decode_payment,
    create_payment_requirements
)

# Create facilitator client
facilitator = create_facilitator_client("http://localhost:3001")

# Decode payment from header
payment = decode_payment(request.headers.get('X-PAYMENT'))

# Create requirements
requirements = create_payment_requirements(
    amount=10,
    resource=request.url,
    description="API access",
    pay_to="my-agent",
    facilitator_url="http://localhost:3001"
)

# Verify payment
verification = facilitator.verify(payment, requirements)
if verification['isValid']:
    # Process request
    result = process_request()

    # Settle payment
    facilitator.settle(payment, requirements)
    return result
```

## Testing

### Run Test Script

```bash
python test_endpoints.py
```

### Manual Testing

#### Test Free Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Payment configuration
curl http://localhost:5000/api/test/payment-info

# Free send test
curl -X POST http://localhost:5000/api/test/send-free \
  -H "Content-Type: application/json" \
  -d '{"message": "Free test message"}'
```

#### Test Paid Endpoints (Without Payment)

```bash
# Should return HTTP 402
curl -i -X POST http://localhost:5000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, agent!",
    "conversation_id": "test-conv-1",
    "client_id": "test-client"
  }'
```

**Expected Response:**
```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "nanda-points",
    "network": "nanda-network",
    "maxAmountRequired": "10",
    "resource": "http://localhost:5000/api/send",
    "description": "Send message to agent bridge",
    "payTo": "nanda-adapter",
    "asset": "NP",
    "extra": {
      "facilitatorUrl": "http://localhost:3001"
    }
  }]
}
```

#### Test With Payment

```bash
# With valid NANDA Points payment
curl -X POST http://localhost:5000/api/send \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64-encoded-payment>" \
  -d '{
    "message": "Hello, agent!",
    "conversation_id": "test-conv-1",
    "client_id": "test-client"
  }'
```

## Payment Integration Details

### Flask Decorator Approach

The payment integration uses a clean decorator pattern:

```python
@app.route('/api/send', methods=['POST'])
@require_payment(SEND_MESSAGE_REQUIREMENT, payments['config'])
def send_message():
    # Original function logic here
    # Payment verification happens automatically
    return {"response": "processed"}
```

### Payment Flow

1. **Request without payment** → HTTP 402 with payment requirements
2. **Request with payment** → Verify with facilitator → Execute function → Settle payment
3. **Payment failure** → HTTP 402 with error details
4. **Settlement failure** → Warning logged, request succeeds

### Error Handling

The SDK provides comprehensive error handling:

```python
from nanda_payments_sdk import NPPaymentError, NPVerificationError, NPSettlementError

try:
    # Payment processing
    pass
except NPVerificationError as e:
    # Handle verification failure
    return jsonify({"error": str(e), "code": e.code}), 402
except NPSettlementError as e:
    # Handle settlement failure
    logger.warning(f"Settlement failed: {e}")
except NPPaymentError as e:
    # Handle general payment error
    return jsonify({"error": str(e)}), 500
```

## Comparison with Original

### What's Added

- **NANDA Points SDK**: Custom Python SDK for payment processing
- **Payment Decorators**: `@require_payment` for clean integration
- **x402 Compliance**: Proper HTTP 402 responses with payment requirements
- **Payment Statistics**: Usage and revenue tracking
- **Test Endpoints**: Free comparison endpoints for testing

### What's Unchanged

- **Core Functionality**: Agent bridge communication remains the same
- **Free Endpoints**: All monitoring and utility endpoints remain free
- **API Format**: Request/response formats unchanged for compatibility
- **Flask Structure**: Original Flask app structure preserved

### Integration Benefits

- **Non-invasive**: Original code mostly unchanged
- **Flexible**: Easy to adjust payment amounts and requirements
- **Testable**: Free endpoints for development and testing
- **Monitorable**: Payment statistics and health checks

## Python SDK Components

### Core Classes

```python
@dataclass
class PaymentRequirement:
    amount: int
    description: str = "Payment required"
    recipient: Optional[str] = None
    timeout: int = 30000

@dataclass
class PaymentConfig:
    facilitator_url: str
    agent_name: str
    timeout: int = 30000
    retry_count: int = 3
    retry_delay: int = 1000
```

### Facilitator Client

```python
class FacilitatorClient:
    def verify(self, payment, requirements) -> Dict[str, Any]
    def settle(self, payment, requirements) -> Dict[str, Any]
    def supported(self) -> Dict[str, Any]
```

### Utility Functions

```python
def quick_setup(facilitator_url: str, agent_name: str) -> Dict[str, Any]
def create_payment_config(facilitator_url: str, agent_name: str, **kwargs) -> PaymentConfig
def create_facilitator_client(facilitator_url: str) -> FacilitatorClient
def decode_payment(x_payment_header: str) -> PaymentPayload
def require_payment(requirement: PaymentRequirement, config: PaymentConfig)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_PORT` | 5000 | Flask server port |
| `HOST` | 0.0.0.0 | Server host |
| `AGENT_PORT` | 3000 | Agent bridge port |
| `FACILITATOR_URL` | http://localhost:3001 | NANDA Points facilitator |
| `AGENT_NAME` | nanda-adapter | Agent name for payments |
| `CLAUDE_API_KEY` | - | Optional Claude API key |
| `DEBUG` | False | Flask debug mode |

## Deployment

### Development

```bash
python run_ui_agent_https_with_payments.py
```

### Production with Gunicorn

```bash
gunicorn -w 4 -b 0.0.0.0:5000 run_ui_agent_https_with_payments:app
```

### Production with Waitress

```bash
waitress-serve --host=0.0.0.0 --port=5000 run_ui_agent_https_with_payments:app
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run_ui_agent_https_with_payments.py"]
```

## Monitoring and Analytics

### Payment Statistics

```bash
curl http://localhost:5000/api/stats
```

```json
{
  "total_messages": 150,
  "paid_messages": 120,
  "free_requests": 30,
  "total_revenue_np": 1200,
  "facilitator_url": "http://localhost:3001",
  "agent_name": "nanda-adapter",
  "timestamp": 1705123456.789
}
```

### Health Monitoring

```bash
curl http://localhost:5000/api/health
```

```json
{
  "status": "healthy",
  "timestamp": 1705123456.789,
  "agent_port": 3000,
  "ui_port": 5000,
  "payments": "enabled",
  "facilitator": "http://localhost:3001",
  "agent_name": "nanda-adapter"
}
```

## Troubleshooting

### Common Issues

1. **"Payment SDK not loaded"**
   - Check facilitator URL is accessible
   - Verify NANDA Points facilitator is running
   - Check environment variables

2. **"Agent bridge connection failed"**
   - Ensure agent bridge is running on configured port
   - Check AGENT_PORT environment variable
   - Verify network connectivity

3. **"Payment verification failed"**
   - Check payment format and encoding
   - Verify sufficient balance in payer account
   - Ensure facilitator is accessible

4. **"python_a2a not found"**
   - Install the python_a2a library separately
   - Check if alternative agent communication method needed

### Debug Mode

Enable debug logging:

```bash
DEBUG=True python run_ui_agent_https_with_payments.py
```

### Test Without Facilitator

The adapter gracefully handles facilitator unavailability:

```python
# Will show "payments": "disabled" in health check
# Payment decorators will still work but show warnings
```

## Migration from Original

### Step-by-Step Migration

1. **Keep original**: `run_ui_agent_https.py` as reference
2. **Use new version**: `run_ui_agent_https_with_payments.py` as main
3. **Test free endpoints**: Ensure compatibility
4. **Configure payments**: Set up facilitator connection
5. **Test paid endpoints**: Verify payment flow
6. **Monitor usage**: Check statistics and health

### Gradual Rollout

- Start with test endpoints to verify payment integration
- Use free send endpoint for comparison testing
- Gradually migrate users to paid endpoints
- Monitor payment statistics and adjust as needed

## Related Projects

- **Original Adapter**: [https://github.com/projnanda/adapter](https://github.com/projnanda/adapter)
- **TypeScript SDK**: [../sdks/payments-sdk/](../sdks/payments-sdk/)
- **NANDA Points Facilitator**: [../packages/facilitator/](../packages/facilitator/)
- **x402 Protocol**: [https://github.com/coinbase/x402](https://github.com/coinbase/x402)

## Contributing

1. Test with original adapter functionality
2. Ensure payment integration doesn't break existing features
3. Add tests for payment scenarios
4. Update documentation for any changes
5. Maintain backward compatibility

## License

Same license as the original NANDA Adapter project.