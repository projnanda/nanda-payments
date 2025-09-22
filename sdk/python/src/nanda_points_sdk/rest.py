from __future__ import annotations

import requests
from typing import Any, Dict, Optional


class RestClient:
    def __init__(self, base_url: str, api_prefix: str = "/api") -> None:
        self.base = base_url.rstrip("/") + api_prefix

    def get_health(self) -> Dict[str, Any]:
        resp = requests.get(f"{self.base}/health", timeout=20)
        resp.raise_for_status()
        return resp.json()

    def get_balance(self, agent_name: str) -> Dict[str, Any]:
        resp = requests.get(f"{self.base}/wallets/balance", params={"agent": agent_name}, timeout=20)
        resp.raise_for_status()
        return resp.json()

    def attach_wallet(self, agent_name: str, seed_points: Optional[int] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"agent_name": agent_name}
        if seed_points is not None:
            payload["seedPoints"] = seed_points
        resp = requests.post(f"{self.base}/wallets/attach", json=payload, timeout=20)
        resp.raise_for_status()
        return resp.json()

    def initiate_transaction(self, from_agent: str, to_agent: str, amount_points: int, task: str) -> Dict[str, Any]:
        payload = {"from": from_agent, "to": to_agent, "amountPoints": amount_points, "task": task}
        resp = requests.post(f"{self.base}/transactions/initiate", json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def get_receipt_by_tx(self, tx_id: str) -> Dict[str, Any]:
        resp = requests.get(f"{self.base}/receipts/{tx_id}", timeout=20)
        resp.raise_for_status()
        return resp.json()


