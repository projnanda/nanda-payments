from __future__ import annotations

import requests
from typing import Any, Dict, Optional


class McpClient:
    def __init__(self, base_url: str) -> None:
        self.url = base_url.rstrip("/") + "/mcp"

    def call_tool(self, tool_name: str, args: Optional[Dict[str, Any]] = None, *, session_id: Optional[str] = None, headers: Optional[Dict[str, str]] = None) -> Any:
        hdrs: Dict[str, str] = {"Content-Type": "application/json"}
        if session_id:
            hdrs["mcp-session-id"] = session_id
        if headers:
            hdrs.update(headers)

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": args or {}}
        }
        resp = requests.post(self.url, json=payload, headers=hdrs, timeout=30)
        if resp.status_code == 402:
            raise RuntimeError(f"402 Payment Required: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        text = (
            (data.get("result", {})
                 .get("content", [{}])[0]
                 .get("text"))
            if isinstance(data, dict) else None
        )
        if text:
            try:
                import json
                return json.loads(text)
            except Exception:
                return text
        return data.get("result", data)

    def call_paid_tool_with_auto_pay(self, paying_agent: str, tool_name: str, args: Optional[Dict[str, Any]] = None, *, session_id: Optional[str] = None, headers: Optional[Dict[str, str]] = None) -> Any:
        first = self.call_tool(tool_name, args or {}, session_id=session_id, headers=headers)
        info = first if isinstance(first, dict) else _safe_json(first)
        if not isinstance(info, dict) or info.get("error") != "PAYMENT_REQUIRED" or "price" not in info:
            return first

        amount_points = info["price"]["amount"]
        recipient = info["price"]["recipient"]

        tx = self.call_tool("initiateTransaction", {
            "from": paying_agent,
            "to": recipient,
            "amount": amount_points,
            "task": f"payment for {tool_name}"
        }, session_id=session_id, headers=headers)

        tx_id = tx.get("txId") if isinstance(tx, dict) else None
        if not tx_id:
            raise RuntimeError(f"Failed to initiate payment for {tool_name}: {tx}")

        paid_args = {**(args or {}), "_paymentAgent": paying_agent, "_paymentTxId": tx_id, "_paymentAmount": str(amount_points)}
        return self.call_tool(tool_name, paid_args, session_id=session_id, headers=headers)


def _safe_json(value: Any) -> Any:
    try:
        import json
        return json.loads(value) if isinstance(value, str) else value
    except Exception:
        return value


