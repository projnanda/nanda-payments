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

## Test

```bash
python tests/smoke_test.py
```
