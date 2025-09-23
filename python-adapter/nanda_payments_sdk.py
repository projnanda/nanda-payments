"""
NANDA Points Python SDK

A production-ready Python SDK for integrating NANDA Points payments into
applications.
Provides both server-side (Flask decorators) and client-side (payment creation)
capabilities following the x402 payment protocol.

Features:
- Server-side payment verification and settlement
- Client-side payment creation and encoding
- Flask integration with decorators
- Type-safe interfaces with full IntelliSense support
- Comprehensive error handling

Example:
    # Server-side payment protection
    from nanda_payments_sdk import require_payment, PaymentRequirement

    @app.route('/api/premium')
    @require_payment(PaymentRequirement(amount=10, description="Premium API"))
    def premium_endpoint():
        return {"data": "premium content"}

    # Client-side payment creation
    from nanda_payments_sdk import send_paid_request

    response = send_paid_request(
        url="http://localhost:5000/api/premium",
        from_agent="my-agent",
        to_agent="server-agent",
        amount=10,
        facilitator_url="http://localhost:3001"
    )
"""

import base64
import json
import time
import uuid
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Dict, Optional

import requests
from flask import jsonify, request


# =============================================================================
# Core Data Structures
# =============================================================================


@dataclass
class PaymentRequirement:
    """Configuration for payment requirements on protected endpoints.

    Args:
        amount: NANDA Points required for access
        description: Human-readable description of what the payment covers
        recipient: Optional specific recipient (defaults to configured agent)
        timeout: Payment timeout in milliseconds
    """

    amount: int
    description: str = "Payment required"
    recipient: Optional[str] = None
    timeout: int = 30000


@dataclass
class PaymentConfig:
    """Configuration for NANDA Points integration.

    Args:
        facilitator_url: URL of the NANDA Points facilitator service
        agent_name: Name of this agent for payment processing
        timeout: Default timeout for facilitator requests in milliseconds
        retry_count: Number of retries for failed requests
        retry_delay: Delay between retries in milliseconds
    """

    facilitator_url: str
    agent_name: str
    timeout: int = 30000
    retry_count: int = 3
    retry_delay: int = 1000


@dataclass
class PaymentPayload:
    """x402 compliant payment payload structure.

    Represents a payment according to the x402 protocol specification.
    All fields follow the x402 naming conventions.
    """

    x402_version: int = 1
    scheme: str = "nanda-points"
    network: str = "nanda-network"
    pay_to: str = ""
    amount: str = ""
    from_agent: str = ""
    tx_id: str = ""
    timestamp: int = 0
    extra: Optional[Dict[str, Any]] = field(default_factory=dict)


@dataclass
class PaymentRequirements:
    """x402 compliant payment requirements structure.

    Specifies what payment is required for a particular resource.
    Used in HTTP 402 responses and facilitator verification.
    """

    scheme: str = "nanda-points"
    network: str = "nanda-network"
    max_amount_required: str = ""
    resource: str = ""
    description: str = ""
    mime_type: str = "application/json"
    pay_to: str = ""
    max_timeout_seconds: int = 60
    asset: str = "NP"
    extra: Optional[Dict[str, Any]] = field(default_factory=dict)


# =============================================================================
# Exception Classes
# =============================================================================


class NPPaymentError(Exception):
    """Base exception for NANDA Points payment errors.

    Args:
        message: Error description
        code: Error code for programmatic handling
        details: Additional error context
    """

    def __init__(self, message: str, code: str = "PAYMENT_ERROR", details: Any = None):
        super().__init__(message)
        self.code = code
        self.details = details


class NPVerificationError(NPPaymentError):
    """Payment verification failed."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "VERIFICATION_FAILED", details)


class NPSettlementError(NPPaymentError):
    """Payment settlement failed."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "SETTLEMENT_FAILED", details)


class NPNetworkError(NPPaymentError):
    """Network communication error."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "NETWORK_ERROR", details)


# =============================================================================
# Facilitator Client
# =============================================================================


class FacilitatorClient:
    """Client for communicating with NANDA Points facilitator service.

    Handles verification and settlement of payments through the facilitator's
    REST API endpoints.

    Args:
        facilitator_url: Base URL of the facilitator service
    """

    def __init__(self, facilitator_url: str):
        self.facilitator_url = facilitator_url.rstrip("/")
        self.session = requests.Session()

    def verify(
        self, payment: PaymentPayload, requirements: PaymentRequirements
    ) -> Dict[str, Any]:
        """Verify payment against requirements without settling.

        Args:
            payment: Payment payload to verify
            requirements: Payment requirements to verify against

        Returns:
            Verification result from facilitator

        Raises:
            NPNetworkError: If communication with facilitator fails
        """
        try:
            response = self.session.post(
                f"{self.facilitator_url}/verify",
                json={
                    "payment": self._payload_to_dict(payment),
                    "paymentRequirements": self._requirements_to_dict(requirements),
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to verify payment: {e}")

    def settle(
        self, payment: PaymentPayload, requirements: PaymentRequirements
    ) -> Dict[str, Any]:
        """Verify and settle payment.

        Args:
            payment: Payment payload to settle
            requirements: Payment requirements

        Returns:
            Settlement result from facilitator

        Raises:
            NPNetworkError: If communication with facilitator fails
        """
        try:
            response = self.session.post(
                f"{self.facilitator_url}/settle",
                json={
                    "payment": self._payload_to_dict(payment),
                    "paymentRequirements": self._requirements_to_dict(requirements),
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to settle payment: {e}")

    def supported(self) -> Dict[str, Any]:
        """Get supported payment schemes from facilitator.

        Returns:
            Supported payment schemes information

        Raises:
            NPNetworkError: If communication with facilitator fails
        """
        try:
            response = self.session.get(f"{self.facilitator_url}/supported", timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise NPNetworkError(f"Failed to get supported schemes: {e}")

    def _payload_to_dict(self, payment: PaymentPayload) -> Dict[str, Any]:
        """Convert PaymentPayload to facilitator API format."""
        return {
            "x402Version": payment.x402_version,
            "scheme": payment.scheme,
            "network": payment.network,
            "payTo": payment.pay_to,
            "amount": payment.amount,
            "from": payment.from_agent,
            "txId": payment.tx_id,
            "timestamp": payment.timestamp,
            "extra": payment.extra or {},
        }

    def _requirements_to_dict(self, req: PaymentRequirements) -> Dict[str, Any]:
        """Convert PaymentRequirements to facilitator API format."""
        return {
            "scheme": req.scheme,
            "network": req.network,
            "maxAmountRequired": req.max_amount_required,
            "resource": req.resource,
            "description": req.description,
            "mimeType": req.mime_type,
            "payTo": req.pay_to,
            "maxTimeoutSeconds": req.max_timeout_seconds,
            "asset": req.asset,
            "extra": req.extra or {},
        }


# =============================================================================
# Configuration and Setup Functions
# =============================================================================


def create_payment_config(
    facilitator_url: str, agent_name: str, **kwargs
) -> PaymentConfig:
    """Create payment configuration with defaults.

    Args:
        facilitator_url: URL of the NANDA Points facilitator
        agent_name: Name of this agent
        **kwargs: Additional configuration options

    Returns:
        Configured PaymentConfig instance
    """
    return PaymentConfig(
        facilitator_url=facilitator_url,
        agent_name=agent_name,
        timeout=kwargs.get("timeout", 30000),
        retry_count=kwargs.get("retry_count", 3),
        retry_delay=kwargs.get("retry_delay", 1000),
    )


def create_facilitator_client(facilitator_url: str) -> FacilitatorClient:
    """Create facilitator client instance.

    Args:
        facilitator_url: URL of the NANDA Points facilitator

    Returns:
        Configured FacilitatorClient instance
    """
    return FacilitatorClient(facilitator_url)


def create_payment_requirements(
    amount: int,
    resource: str,
    description: str,
    pay_to: str,
    facilitator_url: str,
    **kwargs,
) -> PaymentRequirements:
    """Create payment requirements object.

    Args:
        amount: NANDA Points required
        resource: Resource being protected
        description: Payment description
        pay_to: Payment recipient
        facilitator_url: Facilitator URL
        **kwargs: Additional requirements options

    Returns:
        Configured PaymentRequirements instance
    """
    return PaymentRequirements(
        max_amount_required=str(amount),
        resource=resource,
        description=description,
        pay_to=pay_to,
        mime_type=kwargs.get("mime_type", "application/json"),
        max_timeout_seconds=kwargs.get("max_timeout_seconds", 60),
        extra={"facilitatorUrl": facilitator_url, **kwargs.get("extra", {})},
    )


# =============================================================================
# Payment Processing Functions
# =============================================================================


def decode_payment(x_payment_header: str) -> PaymentPayload:
    """Decode payment from X-PAYMENT header.

    Args:
        x_payment_header: Base64 encoded payment from HTTP header

    Returns:
        Decoded PaymentPayload

    Raises:
        NPPaymentError: If payment cannot be decoded
    """
    try:
        decoded_bytes = base64.b64decode(x_payment_header)
        payment_data = json.loads(decoded_bytes.decode("utf-8"))

        return PaymentPayload(
            x402_version=payment_data.get("x402Version", 1),
            scheme=payment_data.get("scheme", "nanda-points"),
            network=payment_data.get("network", "nanda-network"),
            pay_to=payment_data.get("payTo", ""),
            amount=payment_data.get("amount", ""),
            from_agent=payment_data.get("from", ""),
            tx_id=payment_data.get("txId", ""),
            timestamp=payment_data.get("timestamp", 0),
            extra=payment_data.get("extra"),
        )
    except Exception as e:
        raise NPPaymentError(f"Invalid payment header: {e}", "INVALID_PAYMENT")


def require_payment(requirement: PaymentRequirement, config: PaymentConfig):
    """Flask decorator to require payment for a route.

    Automatically handles payment verification and settlement for Flask routes.
    Returns HTTP 402 with payment requirements if no valid payment provided.

    Args:
        requirement: Payment requirement configuration
        config: Payment system configuration

    Returns:
        Flask route decorator

    Example:
        @app.route('/api/premium')
        @require_payment(PaymentRequirement(amount=10), config)
        def premium_endpoint():
            return {"data": "premium content"}
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get payment header
            x_payment = request.headers.get("X-PAYMENT")

            if not x_payment:
                # Return HTTP 402 with payment requirements
                requirements = create_payment_requirements(
                    amount=requirement.amount,
                    resource=request.url,
                    description=requirement.description,
                    pay_to=requirement.recipient or config.agent_name,
                    facilitator_url=config.facilitator_url,
                )

                return (
                    jsonify(
                        {
                            "x402Version": 1,
                            "error": "X-PAYMENT header is required",
                            "accepts": [
                                {
                                    "scheme": requirements.scheme,
                                    "network": requirements.network,
                                    "maxAmountRequired": requirements.max_amount_required,
                                    "resource": requirements.resource,
                                    "description": requirements.description,
                                    "mimeType": requirements.mime_type,
                                    "payTo": requirements.pay_to,
                                    "maxTimeoutSeconds": requirements.max_timeout_seconds,
                                    "asset": requirements.asset,
                                    "extra": requirements.extra,
                                }
                            ],
                        }
                    ),
                    402,
                )

            try:
                # Decode and verify payment
                payment = decode_payment(x_payment)
                facilitator = create_facilitator_client(config.facilitator_url)

                requirements = create_payment_requirements(
                    amount=requirement.amount,
                    resource=request.url,
                    description=requirement.description,
                    pay_to=requirement.recipient or config.agent_name,
                    facilitator_url=config.facilitator_url,
                )

                # Verify payment
                verification = facilitator.verify(payment, requirements)

                if not verification.get("isValid"):
                    return (
                        jsonify(
                            {
                                "x402Version": 1,
                                "error": verification.get(
                                    "invalidReason", "Payment verification failed"
                                ),
                                "accepts": [
                                    {
                                        "scheme": requirements.scheme,
                                        "network": requirements.network,
                                        "maxAmountRequired": requirements.max_amount_required,
                                        "resource": requirements.resource,
                                        "description": requirements.description,
                                        "mimeType": requirements.mime_type,
                                        "payTo": requirements.pay_to,
                                        "maxTimeoutSeconds": requirements.max_timeout_seconds,
                                        "asset": requirements.asset,
                                        "extra": requirements.extra,
                                    }
                                ],
                            }
                        ),
                        402,
                    )

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
                return (
                    jsonify(
                        {
                            "x402Version": 1,
                            "error": str(e),
                            "code": e.code,
                            "details": e.details,
                        }
                    ),
                    402,
                )

            except Exception as e:
                return jsonify({"error": f"Payment processing failed: {str(e)}"}), 500

        return wrapper

    return decorator


# =============================================================================
# Client-Side Payment Functions
# =============================================================================


def create_payment(
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    resource: str = "",
    description: str = "NANDA Points payment",
) -> PaymentPayload:
    """Create a payment payload for client-side use.

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
            "description": description,
        },
    )


def encode_payment(payment: PaymentPayload) -> str:
    """Encode payment payload as base64 for X-PAYMENT header.

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
        "extra": payment.extra or {},
    }

    # Serialize to JSON and encode as base64
    json_str = json.dumps(payment_dict, separators=(",", ":"))
    return base64.b64encode(json_str.encode("utf-8")).decode("utf-8")


def create_and_encode_payment(
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    resource: str = "",
    description: str = "NANDA Points payment",
) -> str:
    """Convenience function to create and encode payment in one step.

    Args:
        from_agent: Paying agent name
        to_agent: Receiving agent name
        amount: Amount in NANDA Points
        facilitator_url: Facilitator URL
        resource: Optional resource being paid for
        description: Payment description

    Returns:
        Base64 encoded payment string ready for X-PAYMENT header
    """
    payment = create_payment(
        from_agent, to_agent, amount, facilitator_url, resource, description
    )
    return encode_payment(payment)


def send_paid_request(
    url: str,
    from_agent: str,
    to_agent: str,
    amount: int,
    facilitator_url: str,
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    method: str = "POST",
) -> requests.Response:
    """Send HTTP request with NANDA Points payment.

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

    Example:
        response = send_paid_request(
            url="http://localhost:5000/api/premium",
            from_agent="my-agent",
            to_agent="server-agent",
            amount=10,
            facilitator_url="http://localhost:3001",
            data={"message": "Hello, paid world!"}
        )
    """
    # Create payment
    payment_header = create_and_encode_payment(
        from_agent=from_agent,
        to_agent=to_agent,
        amount=amount,
        facilitator_url=facilitator_url,
        resource=url,
        description=f"Payment for {method} {url}",
    )

    # Prepare headers
    request_headers = {"Content-Type": "application/json", "X-PAYMENT": payment_header}
    if headers:
        request_headers.update(headers)

    # Send request
    session = requests.Session()
    if method.upper() == "POST":
        return session.post(url, json=data, headers=request_headers, timeout=30)
    elif method.upper() == "GET":
        return session.get(url, headers=request_headers, timeout=30)
    else:
        return session.request(
            method, url, json=data, headers=request_headers, timeout=30
        )


# =============================================================================
# Quick Setup Functions
# =============================================================================


def quick_setup(facilitator_url: str, agent_name: str) -> Dict[str, Any]:
    """Quick setup for Python applications.

    Provides a convenient way to initialize NANDA Points integration
    with all necessary components.

    Args:
        facilitator_url: URL of the NANDA Points facilitator
        agent_name: Name of this agent

    Returns:
        Dictionary containing configured components:
        - config: PaymentConfig instance
        - facilitator: FacilitatorClient instance
        - require_payment: Configured decorator function
        - create_payment_requirements: Configured requirements function

    Example:
        payments = quick_setup("http://localhost:3001", "my-agent")

        @app.route('/api/premium')
        @payments['require_payment'](PaymentRequirement(amount=10))
        def premium_endpoint():
            return {"data": "premium content"}
    """
    config = create_payment_config(facilitator_url, agent_name)
    facilitator = create_facilitator_client(facilitator_url)

    def create_requirement_decorator(requirement: PaymentRequirement):
        return require_payment(requirement, config)

    return {
        "config": config,
        "facilitator": facilitator,
        "require_payment": create_requirement_decorator,
        "create_payment_requirements": lambda **kwargs: create_payment_requirements(
            pay_to=agent_name, facilitator_url=facilitator_url, **kwargs
        ),
    }


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    # Core data structures
    "PaymentRequirement",
    "PaymentConfig",
    "PaymentPayload",
    "PaymentRequirements",
    # Exception classes
    "NPPaymentError",
    "NPVerificationError",
    "NPSettlementError",
    "NPNetworkError",
    # Client classes
    "FacilitatorClient",
    # Configuration functions
    "create_payment_config",
    "create_facilitator_client",
    "create_payment_requirements",
    # Server-side functions
    "decode_payment",
    "require_payment",
    # Client-side functions
    "create_payment",
    "encode_payment",
    "create_and_encode_payment",
    "send_paid_request",
    # Setup functions
    "quick_setup",
]


# =============================================================================
# Example Usage and Testing
# =============================================================================

if __name__ == "__main__":
    # Test the SDK
    config = create_payment_config(
        facilitator_url="http://localhost:3001", agent_name="test-adapter"
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
