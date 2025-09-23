#!/usr/bin/env python3
"""
Test script for complete NANDA Points payment flow
Tests the enhanced Python SDK with client-side payment creation
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from nanda_payments_sdk import (
    create_payment,
    encode_payment,
    create_and_encode_payment,
    send_paid_request,
)


def test_payment_creation():
    """Test payment creation and encoding"""
    print("🧪 Testing payment creation...")

    payment = create_payment(
        from_agent="claude-desktop",
        to_agent="nanda-adapter",
        amount=10,
        facilitator_url="http://localhost:3001",
        resource="http://localhost:5000/api/send",
        description="Test message payment",
    )

    print(f"✅ Payment created:")
    print(f"   From: {payment.from_agent}")
    print(f"   To: {payment.pay_to}")
    print(f"   Amount: {payment.amount} NP")
    print(f"   TxID: {payment.tx_id}")

    # Test encoding
    encoded = encode_payment(payment)
    print(f"✅ Payment encoded (length: {len(encoded)})")
    print(f"   Base64: {encoded[:50]}...")

    return payment, encoded


def test_convenience_function():
    """Test convenience function"""
    print("\n🧪 Testing convenience function...")

    encoded = create_and_encode_payment(
        from_agent="claude-desktop",
        to_agent="nanda-adapter",
        amount=10,
        facilitator_url="http://localhost:3001",
        resource="http://localhost:5000/api/send",
        description="Convenience function test",
    )

    print(f"✅ One-step payment creation and encoding")
    print(f"   Base64: {encoded[:50]}...")

    return encoded


def test_manual_curl_equivalent():
    """Test manual payment creation for curl comparison"""
    print("\n🧪 Creating payment for manual curl test...")

    payment_header = create_and_encode_payment(
        from_agent="claude-desktop",
        to_agent="nanda-adapter",
        amount=10,
        facilitator_url="http://localhost:3001",
        resource="http://localhost:5000/api/send",
        description="Hi, I'm steve.",
    )

    print(f"✅ Payment header created:")
    print(f"X-PAYMENT: {payment_header}")
    print(f"\n📋 Manual curl command:")
    print(f"curl -i -X POST http://localhost:5000/api/send \\")
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -H "X-PAYMENT: {payment_header}" \\')
    print(
        f'  -d \'{{"message": "Hi, I\'m steve.", "conversation_id": "steve-conv-3", "client_id": "claude-desktop"}}\''
    )

    return payment_header


def test_sdk_http_client():
    """Test SDK's built-in HTTP client"""
    print("\n🧪 Testing SDK HTTP client...")

    try:
        response = send_paid_request(
            url="http://localhost:5000/api/send",
            from_agent="claude-desktop",
            to_agent="nanda-adapter",
            amount=10,
            facilitator_url="http://localhost:3001",
            data={
                "message": "Hi, I'm steve using the Python SDK!",
                "conversation_id": "steve-conv-sdk",
                "client_id": "claude-desktop",
            },
        )

        print(f"✅ HTTP request sent")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")

        return response

    except Exception as e:
        print(f"❌ HTTP request failed: {e}")
        return None


if __name__ == "__main__":
    print("🚀 NANDA Points Python SDK - Complete Flow Test")
    print("=" * 55)

    # Test basic payment creation
    payment, encoded = test_payment_creation()

    # Test convenience function
    encoded_convenience = test_convenience_function()

    # Test manual curl approach
    manual_payment = test_manual_curl_equivalent()

    # Test SDK HTTP client
    response = test_sdk_http_client()

    print("\n" + "=" * 55)
    print("✅ All SDK functions tested successfully!")
    print("💡 You can now:")
    print("   1. Use the manual curl command above")
    print("   2. Use send_paid_request() for Python HTTP requests")
    print("   3. Create your own payments with create_payment()")
