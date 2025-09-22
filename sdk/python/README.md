# NANDA Points SDK (Python)

Minimal Python client for NANDA Points Combined Server (REST + MCP).

## Install (editable)

```bash
cd sdk/python
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

## Usage

```python
from nanda_points_sdk import RestClient, McpClient

base = "http://localhost:3000"
rest = RestClient(base)

print(rest.get_health())
print(rest.get_balance("alice"))

mcp = McpClient(base)
print(mcp.call_tool("getPaymentInfo"))
```

### Agent Paywall (Flask)

```python
from flask import Flask, jsonify
from nanda_points_sdk import x402_np_flask

app = Flask(__name__)

@app.route("/premium")
@x402_np_flask(price_np=1, recipient="system", nanda_base_url="http://localhost:3000")
def premium():
    return jsonify({"secret": 42})
```

### Agent Paywall (FastAPI)

```python
from fastapi import FastAPI, Depends
from nanda_points_sdk import x402_np_fastapi

app = FastAPI()
paywall = x402_np_fastapi(price_np=1, recipient="system", nanda_base_url="http://localhost:3000")

@app.get("/premium")
async def premium(_=Depends(paywall)):
    return {"secret": 42}
```

Client retry flow:

-   Request paywalled route → 402 JSON with `{ error: "PAYMENT_REQUIRED", price: { amount, recipient } }`.
-   Pay via MCP `initiateTransaction` (or REST `/api/transactions/initiate`).
-   Retry with headers: `X-PAYMENT-AGENT`, `X-PAYMENT-TX-ID`, `X-PAYMENT-AMOUNT`.

Client auto-pay (Python):

```python
from nanda_points_sdk import McpClient
mcp = McpClient("http://localhost:3000")
result = mcp.call_paid_tool_with_auto_pay("alice", "getTimestamp")
```

## Test

```bash
python tests/smoke_test.py
```
