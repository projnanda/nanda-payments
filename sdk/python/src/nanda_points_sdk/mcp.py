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


