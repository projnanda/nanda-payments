# NANDA Points Python SDK

A production-ready Python SDK for integrating NANDA Points payments into web applications and services. Transform any endpoint into a paid service with just a decorator.

## Quick Start

```python
from nanda_payments_sdk import quick_setup, PaymentRequirement
from flask import Flask

app = Flask(__name__)

# One-line setup
payments = quick_setup(
    facilitator_url="http://localhost:3001",
    agent_name="my-app"
)

# Transform any route into paid with a decorator
@app.route('/api/premium', methods=['POST'])
@payments['require_payment'](PaymentRequirement(amount=10, description="Premium API access"))
def premium_endpoint():
    return {"result": "premium content"}

if __name__ == '__main__':
    app.run()
```

That's it! Your endpoint now requires 10 NANDA Points per request.

## Features

- **🚀 Zero-Config Setup**: Get started with `quick_setup()` in seconds
- **🎯 Flask Integration**: Seamless `@require_payment` decorator
- **📦 Client & Server Tools**: Both request creation and payment verification
- **🔒 x402 Compliant**: Follows HTTP 402 Payment Required standard
- **💎 Production Ready**: Type hints, error handling, comprehensive logging
- **🧪 Easy Testing**: Built-in test utilities and examples

## Installation

```bash
# Install the SDK
pip install -r requirements.txt

# Or install individually
pip install flask requests python_a2a anthropic
```

## Core Concepts

### 1. Payment Requirements
Define what payment you need:

```python
from nanda_payments_sdk import PaymentRequirement

# Simple requirement
req = PaymentRequirement(amount=10, description="API access")

# Advanced requirement
req = PaymentRequirement(
    amount=50,
    description="Premium weather data",
    recipient="weather-service",  # Optional: override default recipient
    timeout=60000  # Optional: payment timeout in ms
)
```

### 2. Server-Side Protection
Protect Flask routes with payments:

```python
from nanda_payments_sdk import require_payment, create_payment_config

# Manual setup
config = create_payment_config(
    facilitator_url="http://localhost:3001",
    agent_name="my-service"
)

@app.route('/api/data')
@require_payment(PaymentRequirement(amount=25), config)
def get_data():
    return {"data": "valuable information"}
```

### 3. Client-Side Payment Creation
Create payments to send with requests:

```python
from nanda_payments_sdk import create_and_encode_payment, send_paid_request

# Create payment header
payment_header = create_and_encode_payment(
    from_agent="my-client",
    to_agent="api-server",
    amount=25,
    facilitator_url="http://localhost:3001",
    resource="http://api.example.com/data"
)

# Use with any HTTP client
import requests
response = requests.post(
    "http://api.example.com/data",
    headers={"X-PAYMENT": payment_header},
    json={"query": "weather"}
)

# Or use built-in client
response = send_paid_request(
    url="http://api.example.com/data",
    from_agent="my-client",
    to_agent="api-server",
    amount=25,
    facilitator_url="http://localhost:3001",
    data={"query": "weather"}
)
```

## Complete Example: Weather API

Here's a complete paid weather service:

```python
from flask import Flask, request, jsonify
from nanda_payments_sdk import quick_setup, PaymentRequirement

app = Flask(__name__)

# Setup payments
payments = quick_setup(
    facilitator_url="http://localhost:3001",
    agent_name="weather-api"
)

# Free tier: basic weather
@app.route('/weather/basic', methods=['GET'])
def basic_weather():
    location = request.args.get('location', 'Unknown')
    return {"weather": f"Sunny in {location}", "tier": "basic"}

# Premium tier: detailed forecast (costs 10 NP)
@app.route('/weather/premium', methods=['POST'])
@payments['require_payment'](PaymentRequirement(
    amount=10,
    description="Premium weather forecast"
))
def premium_weather():
    data = request.json
    location = data.get('location', 'Unknown')
    return {
        "weather": f"Detailed forecast for {location}",
        "temperature": 72,
        "humidity": 65,
        "wind_speed": 8,
        "forecast": ["Sunny", "Partly cloudy", "Rain"],
        "tier": "premium"
    }

# Ultra tier: AI-powered analysis (costs 50 NP)
@app.route('/weather/ai', methods=['POST'])
@payments['require_payment'](PaymentRequirement(
    amount=50,
    description="AI weather analysis"
))
def ai_weather():
    data = request.json
    location = data.get('location', 'Unknown')
    return {
        "weather": f"AI-powered analysis for {location}",
        "insights": "Perfect day for outdoor activities",
        "recommendations": ["Bring sunglasses", "Light jacket for evening"],
        "confidence": 0.95,
        "tier": "ai"
    }

if __name__ == '__main__':
    app.run(debug=True)
```

### Testing the Weather API

```python
# Test script for weather API
from nanda_payments_sdk import send_paid_request

# Free endpoint - no payment needed
import requests
response = requests.get('http://localhost:5000/weather/basic?location=Boston')
print("Basic:", response.json())

# Premium endpoint - requires 10 NP
response = send_paid_request(
    url='http://localhost:5000/weather/premium',
    from_agent='weather-client',
    to_agent='weather-api',
    amount=10,
    facilitator_url='http://localhost:3001',
    data={'location': 'Boston'}
)
print("Premium:", response.json())

# AI endpoint - requires 50 NP
response = send_paid_request(
    url='http://localhost:5000/weather/ai',
    from_agent='weather-client',
    to_agent='weather-api',
    amount=50,
    facilitator_url='http://localhost:3001',
    data={'location': 'Boston'}
)
print("AI:", response.json())
```

## Advanced Usage

### Custom Error Handling

```python
from nanda_payments_sdk import NPPaymentError, NPVerificationError

@app.route('/api/custom')
@payments['require_payment'](PaymentRequirement(amount=10))
def custom_endpoint():
    try:
        # Your business logic
        return {"result": "success"}
    except NPVerificationError as e:
        # Payment verification failed
        return {"error": f"Payment failed: {e.code}"}, 402
    except NPPaymentError as e:
        # General payment error
        return {"error": str(e)}, 500
```

### Manual Payment Processing

```python
from nanda_payments_sdk import (
    create_facilitator_client,
    decode_payment,
    create_payment_requirements
)

@app.route('/api/manual', methods=['POST'])
def manual_payment():
    # Get payment from header
    x_payment = request.headers.get('X-PAYMENT')
    if not x_payment:
        return {"error": "Payment required"}, 402

    # Decode payment
    payment = decode_payment(x_payment)

    # Create requirements
    requirements = create_payment_requirements(
        amount=15,
        resource=request.url,
        description="Manual processing",
        pay_to="my-service",
        facilitator_url="http://localhost:3001"
    )

    # Verify with facilitator
    facilitator = create_facilitator_client("http://localhost:3001")
    verification = facilitator.verify(payment, requirements)

    if not verification['isValid']:
        return {"error": verification['invalidReason']}, 402

    # Process request
    result = {"message": "Manually processed"}

    # Settle payment
    try:
        settlement = facilitator.settle(payment, requirements)
        print(f"Payment settled: {settlement['txId']}")
    except Exception as e:
        print(f"Settlement warning: {e}")

    return result
```

### Environment Configuration

```python
# .env file
FACILITATOR_URL=http://localhost:3001
AGENT_NAME=my-service
UI_PORT=5000
DEBUG=True

# Load in your app
import os
from dotenv import load_dotenv

load_dotenv()

payments = quick_setup(
    facilitator_url=os.getenv('FACILITATOR_URL'),
    agent_name=os.getenv('AGENT_NAME')
)
```

## API Reference

### Quick Setup

```python
def quick_setup(facilitator_url: str, agent_name: str) -> Dict[str, Any]
```
One-line setup returning configured payment tools.

**Returns:**
- `config`: Payment configuration
- `facilitator`: Facilitator client
- `require_payment`: Decorator factory
- `create_payment_requirements`: Requirements builder

### Payment Requirement

```python
@dataclass
class PaymentRequirement:
    amount: int                    # NANDA Points required
    description: str = "Payment required"  # Payment description
    recipient: Optional[str] = None         # Override recipient
    timeout: int = 30000                   # Timeout in milliseconds
```

### Decorator Usage

```python
@require_payment(requirement: PaymentRequirement, config: PaymentConfig)
def protected_function():
    # Your code here
    pass
```

### Client Functions

```python
# Create payment payload
payment = create_payment(
    from_agent="client",
    to_agent="server",
    amount=10,
    facilitator_url="http://localhost:3001"
)

# Encode for HTTP header
header = encode_payment(payment)

# One-step creation and encoding
header = create_and_encode_payment(
    from_agent="client",
    to_agent="server",
    amount=10,
    facilitator_url="http://localhost:3001"
)

# Send HTTP request with payment
response = send_paid_request(
    url="http://api.example.com/endpoint",
    from_agent="client",
    to_agent="server",
    amount=10,
    facilitator_url="http://localhost:3001",
    data={"key": "value"}
)
```

### Error Types

```python
NPPaymentError          # Base payment error
NPVerificationError     # Payment verification failed
NPSettlementError       # Payment settlement failed
NPNetworkError          # Facilitator communication failed
```

## Testing & Development

### Run the Examples

```bash
# Start the example adapter
python run_ui_agent_https_with_payments.py

# Test payment flow
python test_paid_flow.py

# Test all endpoints
python test_endpoints.py
```

### Test Without Payment (Expected 402)

```bash
curl -i -X POST http://localhost:5000/api/send \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "client_id": "test"}'
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
    "payTo": "classify-agent",
    "asset": "NP"
  }]
}
```

### Test With Payment

```python
from nanda_payments_sdk import send_paid_request

response = send_paid_request(
    url="http://localhost:5000/api/send",
    from_agent="claude-desktop",
    to_agent="classify-agent",
    amount=10,
    facilitator_url="http://localhost:3001",
    data={
        "message": "Hello, paid world!",
        "conversation_id": "test-conv",
        "client_id": "claude-desktop"
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

## Prerequisites

1. **Python 3.8+**
2. **NANDA Points Facilitator** running on port 3001
3. **MongoDB** for agent wallet storage
4. **Agent accounts** with sufficient NANDA Points balance

### Setup Facilitator

```bash
# In another terminal
cd ../packages/facilitator
npm install
npm run dev
```

### Setup MongoDB & Agents

```bash
# Start MongoDB
mongod

# Seed agent accounts (if needed)
cd ../packages/facilitator
npm run seed
```

## Production Deployment

### Environment Variables

```bash
export FACILITATOR_URL=https://facilitator.nanda.network
export AGENT_NAME=my-production-service
export UI_PORT=8080
export DEBUG=False
```

### With Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 run_ui_agent_https_with_payments:app
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run_ui_agent_https_with_payments.py"]
```

## Troubleshooting

### Common Issues

**"Facilitator connection failed"**
```python
# Check facilitator status
from nanda_payments_sdk import create_facilitator_client

facilitator = create_facilitator_client("http://localhost:3001")
try:
    status = facilitator.supported()
    print("✅ Facilitator connected:", status)
except Exception as e:
    print("❌ Facilitator error:", e)
```

**"Agent not found"**
```bash
# Check available agents in database
mongo
> use nanda_points
> db.agents.find({}, {name: 1, balance: 1})
```

**"Insufficient balance"**
```python
# The facilitator manages balances automatically
# Ensure your agents have been seeded with initial balance
```

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Now all payment operations will show detailed logs
```

### Test Without Facilitator

```python
# The SDK gracefully handles facilitator unavailability
# Protected routes will return HTTP 500 instead of 402
```

## Examples & Use Cases

### API Monetization
Transform any REST API into a paid service with per-endpoint pricing.

### Content Paywalls
Protect premium content, articles, or media with micro-payments.

### Computational Services
Charge for expensive operations like AI inference, data processing, or analysis.

### Rate Limiting
Use payments as a natural rate limiting mechanism.

### Freemium Models
Offer free tiers alongside paid premium features.

## Contributing

1. Ensure all code passes linting: `python -m flake8 *.py`
2. Test payment flows thoroughly
3. Update documentation for API changes
4. Maintain backward compatibility

## License

Same license as the NANDA Points project.

---

**Ready to monetize your Python APIs? Start with `quick_setup()` and see the magic happen! 🚀**