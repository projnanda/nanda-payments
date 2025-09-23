"""
NANDA Points Python SDK
Provides Python integration for NANDA Points payment requirements
"""

import os
import json
import base64
import time
import uuid
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass
import requests
from functools import wraps
from flask import request, jsonify


@dataclass
class PaymentRequirement:
    """Payment requirement configuration"""
    amount: int  # NANDA Points required
    description: str = "Payment required"
    recipient: Optional[str] = None
    timeout: int = 30000  # milliseconds


@dataclass
class PaymentConfig:
    """Payment configuration"""
    facilitator_url: str
    agent_name: str
    timeout: int = 30000
    retry_count: int = 3
    retry_delay: int = 1000


@dataclass
class PaymentPayload:
    """x402 Payment payload structure"""
    x402_version: int = 1
    scheme: str = "nanda-points"
    network: str = "nanda-network"
    pay_to: str = ""
    amount: str = ""
    from_agent: str = ""
    tx_id: str = ""
    timestamp: int = 0
    extra: Optional[Dict[str, Any]] = None


@dataclass
class PaymentRequirements:
    """x402 Payment requirements structure"""
    scheme: str = "nanda-points"
    network: str = "nanda-network"
    max_amount_required: str = ""
    resource: str = ""
    description: str = ""
    mime_type: str = "application/json"
    pay_to: str = ""
    max_timeout_seconds: int = 60
    asset: str = "NP"
    extra: Optional[Dict[str, Any]] = None


class NPPaymentError(Exception):
    """Base class for NANDA Points payment errors"""
    def __init__(self, message: str, code: str = "PAYMENT_ERROR", details: Any = None):
        super().__init__(message)
        self.code = code
        self.details = details


class NPVerificationError(NPPaymentError):
    """Payment verification failed"""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "VERIFICATION_FAILED", details)


class NPSettlementError(NPPaymentError):
    """Payment settlement failed"""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "SETTLEMENT_FAILED", details)


class NPNetworkError(NPPaymentError):
    """Network communication error"""
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "NETWORK_ERROR", details)


class FacilitatorClient:
    """Client for communicating with NANDA Points facilitator"""

    def __init__(self, facilitator_url: str):
        self.facilitator_url = facilitator_url.rstrip('/')
        self.session = requests.Session()

    def verify(self, payment: PaymentPayload, requirements: PaymentRequirements) -> Dict[str, Any]:
        """Verify payment against requirements"""
        try:
            response = self.session.post(
                f"{self.facilitator_url}/verify",
                json={
                    "payment": {
                        "x402Version": payment.x402_version,
                        "scheme": payment.scheme,
                        "network": payment.network,
                        "payTo": payment.pay_to,
                        "amount": payment.amount,
                        "from": payment.from_agent,
                        "txId": payment.tx_id,
                        "timestamp": payment.timestamp,
                        "extra": payment.extra or {}
                    },
                    "paymentRequirements": {
                        "scheme": requirements.scheme,
                        "network": requirements.network,
                        "maxAmountRequired": requirements.max_amount_required,
                        "resource": requirements.resource,
                        "description": requirements.description,
                        "mimeType": requirements.mime_type,
                        "payTo": requirements.pay_to,
                        "maxTimeoutSeconds": requirements.max_timeout_seconds,
                        "asset": requirements.asset,
                        "extra": requirements.extra or {}
                    }
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 402:
                result = response.json()
                raise NPVerificationError(
                    result.get('invalidReason', 'Payment verification failed'),
                    result
                )
            else:
                raise NPNetworkError(f"Facilitator returned {response.status_code}")

        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to communicate with facilitator: {e}")

    def settle(self, payment: PaymentPayload, requirements: PaymentRequirements) -> Dict[str, Any]:
        """Settle payment after successful service delivery"""
        try:
            response = self.session.post(
                f"{self.facilitator_url}/settle",
                json={
                    "payment": {
                        "x402Version": payment.x402_version,
                        "scheme": payment.scheme,
                        "network": payment.network,
                        "payTo": payment.pay_to,
                        "amount": payment.amount,
                        "from": payment.from_agent,
                        "txId": payment.tx_id,
                        "timestamp": payment.timestamp,
                        "extra": payment.extra or {}
                    },
                    "paymentRequirements": {
                        "scheme": requirements.scheme,
                        "network": requirements.network,
                        "maxAmountRequired": requirements.max_amount_required,
                        "resource": requirements.resource,
                        "description": requirements.description,
                        "mimeType": requirements.mime_type,
                        "payTo": requirements.pay_to,
                        "maxTimeoutSeconds": requirements.max_timeout_seconds,
                        "asset": requirements.asset,
                        "extra": requirements.extra or {}
                    }
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                result = response.json()
                raise NPSettlementError(
                    result.get('errorReason', 'Payment settlement failed'),
                    result
                )

        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to communicate with facilitator: {e}")

    def supported(self) -> Dict[str, Any]:
        """Get supported payment schemes"""
        try:
            response = self.session.get(f"{self.facilitator_url}/supported", timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to get supported schemes: {e}")


def create_payment_config(facilitator_url: str, agent_name: str, **kwargs) -> PaymentConfig:
    """Create payment configuration with defaults"""
    return PaymentConfig(
        facilitator_url=facilitator_url,
        agent_name=agent_name,
        timeout=kwargs.get('timeout', 30000),
        retry_count=kwargs.get('retry_count', 3),
        retry_delay=kwargs.get('retry_delay', 1000)
    )


def create_facilitator_client(facilitator_url: str) -> FacilitatorClient:
    """Create facilitator client"""
    return FacilitatorClient(facilitator_url)


def create_payment_requirements(
    amount: int,
    resource: str,
    description: str,
    pay_to: str,
    facilitator_url: str,
    **kwargs
) -> PaymentRequirements:
    """Create payment requirements object"""
    return PaymentRequirements(
        max_amount_required=str(amount),
        resource=resource,
        description=description,
        pay_to=pay_to,
        max_timeout_seconds=kwargs.get('timeout', 60),
        mime_type=kwargs.get('mime_type', 'application/json'),
        extra={
            'facilitatorUrl': facilitator_url,
            **kwargs.get('extra', {})
        }
    )


def decode_payment(x_payment_header: str) -> PaymentPayload:
    """Decode X-PAYMENT header to PaymentPayload"""
    try:
        # Decode base64
        decoded = base64.b64decode(x_payment_header).decode('utf-8')
        payment_data = json.loads(decoded)

        return PaymentPayload(
            x402_version=payment_data.get('x402Version', 1),
            scheme=payment_data.get('scheme', 'nanda-points'),
            network=payment_data.get('network', 'nanda-network'),
            pay_to=payment_data.get('payTo', ''),
            amount=payment_data.get('amount', ''),
            from_agent=payment_data.get('from', ''),
            tx_id=payment_data.get('txId', ''),
            timestamp=payment_data.get('timestamp', 0),
            extra=payment_data.get('extra')
        )
    except Exception as e:
        raise NPPaymentError(f"Invalid payment header: {e}", "INVALID_PAYMENT")


def require_payment(requirement: PaymentRequirement, config: PaymentConfig):
    """Flask decorator to require payment for a route"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get payment header
            x_payment = request.headers.get('X-PAYMENT')

            if not x_payment:
                # Return HTTP 402 with payment requirements
                requirements = create_payment_requirements(
                    amount=requirement.amount,
                    resource=request.url,
                    description=requirement.description,
                    pay_to=requirement.recipient or config.agent_name,
                    facilitator_url=config.facilitator_url
                )

                return jsonify({
                    "x402Version": 1,
                    "error": "X-PAYMENT header is required",
                    "accepts": [{
                        "scheme": requirements.scheme,
                        "network": requirements.network,
                        "maxAmountRequired": requirements.max_amount_required,
                        "resource": requirements.resource,
                        "description": requirements.description,
                        "mimeType": requirements.mime_type,
                        "payTo": requirements.pay_to,
                        "maxTimeoutSeconds": requirements.max_timeout_seconds,
                        "asset": requirements.asset,
                        "extra": requirements.extra
                    }]
                }), 402

            try:
                # Decode and verify payment
                payment = decode_payment(x_payment)
                facilitator = create_facilitator_client(config.facilitator_url)

                requirements = create_payment_requirements(
                    amount=requirement.amount,
                    resource=request.url,
                    description=requirement.description,
                    pay_to=requirement.recipient or config.agent_name,
                    facilitator_url=config.facilitator_url
                )

                # Verify payment
                verification = facilitator.verify(payment, requirements)

                if not verification.get('isValid'):
                    return jsonify({
                        "x402Version": 1,
                        "error": verification.get('invalidReason', 'Payment verification failed'),
                        "accepts": [{
                            "scheme": requirements.scheme,
                            "network": requirements.network,
                            "maxAmountRequired": requirements.max_amount_required,
                            "resource": requirements.resource,
                            "description": requirements.description,
                            "mimeType": requirements.mime_type,
                            "payTo": requirements.pay_to,
                            "maxTimeoutSeconds": requirements.max_timeout_seconds,
                            "asset": requirements.asset,
                            "extra": requirements.extra
                        }]
                    }), 402

                # Execute the original function
                result = func(*args, **kwargs)

                # Settle payment after successful execution
                try:
                    settlement = facilitator.settle(payment, requirements)
                    print(f"✅ Payment settled: {settlement.get('txId')}")
                except Exception as e:
                    print(f"⚠️ Settlement warning: {e}")
                    # Don't fail the response for settlement issues

                return result

            except NPPaymentError as e:
                return jsonify({
                    "x402Version": 1,
                    "error": str(e),
                    "code": e.code,
                    "details": e.details
                }), 402

            except Exception as e:
                return jsonify({
                    "error": f"Payment processing failed: {str(e)}"
                }), 500

        return wrapper
    return decorator


def quick_setup(facilitator_url: str, agent_name: str) -> Dict[str, Any]:
    """Quick setup for Python applications"""
    config = create_payment_config(facilitator_url, agent_name)
    facilitator = create_facilitator_client(facilitator_url)

    def create_requirement_decorator(requirement: PaymentRequirement):
        return require_payment(requirement, config)

    return {
        'config': config,
        'facilitator': facilitator,
        'require_payment': create_requirement_decorator,
        'create_payment_requirements': lambda **kwargs: create_payment_requirements(
            pay_to=agent_name,
            facilitator_url=facilitator_url,
            **kwargs
        )
    }


def create_payment(
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    resource: str = "",
    description: str = "NANDA Points payment"
) -> PaymentPayload:
    """
    Create a payment payload for client-side use

    Args:
        from_agent: Paying agent name
        to_agent: Receiving agent name
        amount: Amount in NANDA Points
        facilitator_url: Facilitator URL
        resource: Optional resource being paid for
        description: Payment description

    Returns:
        PaymentPayload ready for encoding
    """
    return PaymentPayload(
        x402_version=1,
        scheme="nanda-points",
        network="nanda-network",
        pay_to=to_agent,
        amount=str(amount),
        from_agent=from_agent,
        tx_id=str(uuid.uuid4()),
        timestamp=int(time.time() * 1000),
        extra={
            "facilitatorUrl": facilitator_url,
            "resource": resource,
            "description": description
        }
    )


def encode_payment(payment: PaymentPayload) -> str:
    """
    Encode payment payload as base64 for X-PAYMENT header

    Args:
        payment: PaymentPayload to encode

    Returns:
        Base64 encoded payment string for X-PAYMENT header
    """
    # Convert PaymentPayload to dict with correct field names for x402 protocol
    payment_dict = {
        "x402Version": payment.x402_version,
        "scheme": payment.scheme,
        "network": payment.network,
        "payTo": payment.pay_to,
        "amount": payment.amount,
        "from": payment.from_agent,
        "txId": payment.tx_id,
        "timestamp": payment.timestamp,
        "extra": payment.extra or {}
    }

    # Serialize to JSON and encode as base64
    json_str = json.dumps(payment_dict, separators=(',', ':'))
    return base64.b64encode(json_str.encode('utf-8')).decode('utf-8')


def create_and_encode_payment(
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    resource: str = "",
    description: str = "NANDA Points payment"
) -> str:
    """
    Convenience function to create and encode payment in one step

    Returns:
        Base64 encoded payment string ready for X-PAYMENT header
    """
    payment = create_payment(from_agent, to_agent, amount, facilitator_url, resource, description)
    return encode_payment(payment)


def send_paid_request(
    url: str,
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    method: str = "POST"
) -> requests.Response:
    """
    Send HTTP request with NANDA Points payment

    Args:
        url: Target URL
        from_agent: Paying agent name
        to_agent: Receiving agent name
        amount: Payment amount in NANDA Points
        facilitator_url: Facilitator URL
        data: Request body data
        headers: Additional headers
        method: HTTP method

    Returns:
        Response object
    """
    # Create payment
    payment_header = create_and_encode_payment(
        from_agent=from_agent,
        to_agent=to_agent,
        amount=amount,
        facilitator_url=facilitator_url,
        resource=url,
        description=f"Payment for {method} {url}"
    )

    # Prepare headers
    request_headers = {
        "Content-Type": "application/json",
        "X-PAYMENT": payment_header
    }
    if headers:
        request_headers.update(headers)

    # Send request
    session = requests.Session()
    if method.upper() == "POST":
        return session.post(url, json=data, headers=request_headers, timeout=30)
    elif method.upper() == "GET":
        return session.get(url, headers=request_headers, timeout=30)
    else:
        return session.request(method, url, json=data, headers=request_headers, timeout=30)


# Example usage and testing
if __name__ == "__main__":
    # Test the SDK
    config = create_payment_config(
        facilitator_url="http://localhost:3001",
        agent_name="test-adapter"
    )

    facilitator = create_facilitator_client(config.facilitator_url)

    try:
        supported = facilitator.supported()
        print("✅ Facilitator connection successful")
        print(f"   Supported schemes: {supported}")
    except Exception as e:
        print(f"❌ Facilitator connection failed: {e}")

    print("\n📦 NANDA Points Python SDK loaded successfully!")
    print(f"   Facilitator: {config.facilitator_url}")
    print(f"   Agent: {config.agent_name}")