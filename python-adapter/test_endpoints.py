#!/usr/bin/env python3
"""
Test script for NANDA Adapter with Payment Integration
Tests both free and paid endpoints
"""

import requests
import json
import time
import base64

BASE_URL = "http://localhost:5000"

def test_endpoint(method, path, data=None, headers=None, expected_status=200):
    """Test an endpoint and return response"""
    url = f"{BASE_URL}{path}"

    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers)
        else:
            print(f"❌ Unsupported method: {method}")
            return None

        print(f"📡 {method} {path}")
        print(f"   Status: {response.status_code}")

        if response.status_code == expected_status:
            print("   ✅ Expected status")
        else:
            print(f"   ⚠️  Expected {expected_status}, got {response.status_code}")

        try:
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2)}")
            return result
        except:
            print(f"   Response: {response.text}")
            return response.text

    except Exception as e:
        print(f"❌ Error testing {path}: {e}")
        return None

def main():
    print("🧪 Testing NANDA Adapter with Payment Integration")
    print("=" * 55)

    # Test 1: Health check (FREE)
    print("\n1. 🔍 Testing Health Check (FREE)")
    print("-" * 35)
    test_endpoint('GET', '/api/health')

    # Test 2: Agent list (FREE)
    print("\n2. 🔍 Testing Agent List (FREE)")
    print("-" * 32)
    test_endpoint('GET', '/api/agents/list')

    # Test 3: Payment info (FREE)
    print("\n3. 🔍 Testing Payment Info (FREE)")
    print("-" * 33)
    test_endpoint('GET', '/api/test/payment-info')

    # Test 4: Free send test (FREE)
    print("\n4. 🔍 Testing Free Send (FREE)")
    print("-" * 30)
    test_endpoint('POST', '/api/test/send-free', {
        "message": "This is a free test message"
    })

    # Test 5: Send message without payment (should return 402)
    print("\n5. 💰 Testing /api/send WITHOUT Payment (Should return HTTP 402)")
    print("-" * 66)
    test_endpoint('POST', '/api/send', {
        "message": "Hello, agent!",
        "conversation_id": "test-conv-1",
        "client_id": "test-client"
    }, expected_status=402)

    # Test 6: Receive message without payment (should return 402)
    print("\n6. 💰 Testing /api/receive_message WITHOUT Payment (Should return HTTP 402)")
    print("-" * 78)
    test_endpoint('POST', '/api/receive_message', {
        "message": "Response from agent bridge",
        "conversation_id": "test-conv-1",
        "client_id": "agent-bridge"
    }, expected_status=402)

    # Test 7: Statistics (FREE)
    print("\n7. 🔍 Testing Statistics (FREE)")
    print("-" * 30)
    test_endpoint('GET', '/api/stats')

    # Test 8: Messages list (FREE)
    print("\n8. 🔍 Testing Messages List (FREE)")
    print("-" * 33)
    test_endpoint('GET', '/api/messages?limit=5')

    print("\n" + "=" * 55)
    print("✅ Test completed!")
    print("")
    print("Expected Results:")
    print("- Health check: Should return 200 with server status")
    print("- Agent list: Should return 200 with mock agents")
    print("- Payment info: Should show payment configuration")
    print("- Free send: Should return 200 with free response")
    print("- /api/send without payment: Should return 402 with payment requirements")
    print("- /api/receive_message without payment: Should return 402 with payment requirements")
    print("- Statistics: Should show payment stats")
    print("")
    print("To test WITH payment:")
    print("1. Ensure NANDA Points facilitator is running on localhost:3001")
    print("2. Create a valid NANDA Points payment")
    print("3. Include X-PAYMENT header with base64-encoded payment")
    print("")
    print("Example with payment:")
    print("curl -X POST http://localhost:5000/api/send \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -H 'X-PAYMENT: <base64-encoded-payment>' \\")
    print("  -d '{\"message\": \"Hello!\", \"conversation_id\": \"test\"}'")

if __name__ == "__main__":
    main()