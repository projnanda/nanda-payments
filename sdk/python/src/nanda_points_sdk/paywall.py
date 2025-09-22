from __future__ import annotations

from typing import Any, Dict, Callable
from .rest import RestClient


def x402_np_flask(price_np: float, recipient: str, *, nanda_base_url: str) -> Callable:
    rest = RestClient(nanda_base_url)

    def middleware(fn: Callable):
        def wrapper(*args: Any, **kwargs: Any):
            from flask import request, jsonify
            agent = request.headers.get("X-PAYMENT-AGENT")
            tx_id = request.headers.get("X-PAYMENT-TX-ID")
            amount = request.headers.get("X-PAYMENT-AMOUNT")

            if not agent or not tx_id or not amount:
                return jsonify(_payment_required_body(price_np, recipient)), 402

            receipt = rest.get_receipt_by_tx(tx_id)
            if isinstance(receipt, dict) and receipt.get("error"):
                return jsonify(_error_body("Payment receipt not found", {"txId": tx_id})), 402

            r = receipt  # type: ignore
            scale = r.get("scale")
            amount_points = r.get("amountMinor") / (10 ** scale) if scale is not None else None
            if r.get("fromAgent") != agent or r.get("toAgent") != recipient:
                return jsonify(_error_body("Payment party mismatch", {"expected": {"from": agent, "to": recipient}, "actual": {"from": r.get("fromAgent"), "to": r.get("toAgent")}})), 402

            if amount_points != price_np or str(amount) != str(price_np):
                return jsonify(_error_body("Invalid payment amount", {"expected": price_np, "received": amount_points})), 402

            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return middleware


def x402_np_fastapi(price_np: float, recipient: str, *, nanda_base_url: str):
    rest = RestClient(nanda_base_url)

    async def dependency(request):  # type: ignore
        agent = request.headers.get("x-payment-agent")
        tx_id = request.headers.get("x-payment-tx-id")
        amount = request.headers.get("x-payment-amount")
        from fastapi import HTTPException
        if not agent or not tx_id or not amount:
            raise HTTPException(status_code=402, detail=_payment_required_body(price_np, recipient))
        receipt = rest.get_receipt_by_tx(tx_id)
        if isinstance(receipt, dict) and receipt.get("error"):
            raise HTTPException(status_code=402, detail=_error_body("Payment receipt not found", {"txId": tx_id}))
        r = receipt  # type: ignore
        scale = r.get("scale")
        amount_points = r.get("amountMinor") / (10 ** scale) if scale is not None else None
        if r.get("fromAgent") != agent or r.get("toAgent") != recipient:
            raise HTTPException(status_code=402, detail=_error_body("Payment party mismatch", {"expected": {"from": agent, "to": recipient}, "actual": {"from": r.get("fromAgent"), "to": r.get("toAgent")}}))
        if amount_points != price_np or str(amount) != str(price_np):
            raise HTTPException(status_code=402, detail=_error_body("Invalid payment amount", {"expected": price_np, "received": amount_points}))
    return dependency


def _payment_required_body(price_np: float, recipient: str) -> Dict[str, Any]:
    return {
        "error": "PAYMENT_REQUIRED",
        "protocol": "x402-np",
        "price": {"amount": price_np, "currency": "NP"},
        "recipient": recipient,
        "instructions": {
            "steps": [
                f"Pay {price_np} NP to {recipient} using initiateTransaction",
                "Retry with headers: X-PAYMENT-AGENT, X-PAYMENT-TX-ID, X-PAYMENT-AMOUNT",
            ]
        },
    }


def _error_body(message: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return {"error": message, "details": data}


