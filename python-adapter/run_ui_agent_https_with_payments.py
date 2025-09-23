"""
NANDA Adapter with Payment Integration
Modified version of run_ui_agent_https.py with NANDA Points payment requirements
"""

import os
import json
import uuid
import threading
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from python_a2a import A2AClient
import time

# Import NANDA Payments SDK
from nanda_payments_sdk import (
    quick_setup,
    PaymentRequirement,
    require_payment,
    create_payment_config,
    NPPaymentError,
)

app = Flask(__name__)
CORS(app)

# Global variables
messages = []
latest_message = ""
client_map = {}

# Payment configuration
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "http://localhost:3001")
AGENT_NAME = os.getenv("AGENT_NAME", "nanda-adapter")


def get_agent_port():
    return int(os.getenv("AGENT_PORT", 3000))


def get_ui_port():
    return int(os.getenv("UI_PORT", 5000))


def get_agent_id():
    return os.getenv("AGENT_ID", "default_agent")


def get_agent_url():
    port = get_agent_port()
    return f"http://localhost:{port}"


# Initialize NANDA Payments
print("🔧 Initializing NANDA Payments...")
try:
    payments = quick_setup(facilitator_url=FACILITATOR_URL, agent_name=AGENT_NAME)
    print(f"✅ NANDA Payments initialized")
    print(f"   Facilitator: {FACILITATOR_URL}")
    print(f"   Agent: {AGENT_NAME}")
except Exception as e:
    print(f"❌ Failed to initialize NANDA Payments: {e}")
    payments = None

# Payment requirements
SEND_MESSAGE_REQUIREMENT = PaymentRequirement(
    amount=10, description="Send message to agent bridge"  # 10 NANDA Points
)

RECEIVE_MESSAGE_REQUIREMENT = PaymentRequirement(
    amount=5, description="Receive message from agent bridge"  # 5 NANDA Points
)

# ==============================================================================
# FREE ENDPOINTS (unchanged from original)
# ==============================================================================


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "healthy",
            "timestamp": time.time(),
            "agent_port": get_agent_port(),
            "ui_port": get_ui_port(),
            "payments": "enabled" if payments else "disabled",
            "facilitator": FACILITATOR_URL,
            "agent_name": AGENT_NAME,
        }
    )


@app.route("/api/agents/list", methods=["GET"])
def list_agents():
    # This would normally fetch from a registry
    return jsonify(
        {
            "agents": [
                {"name": "local_agent", "url": get_agent_url(), "status": "active"}
            ]
        }
    )


@app.route("/api/render", methods=["GET"])
def render_latest():
    return jsonify({"message": latest_message, "timestamp": time.time()})


@app.route("/api/messages/stream", methods=["GET"])
def stream_messages():
    def generate():
        while True:
            if messages:
                latest = messages[-1]
                yield f"data: {json.dumps(latest, default=str)}\n\n"
            time.sleep(1)

    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/messages", methods=["GET"])
def get_messages():
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)

    paginated_messages = messages[offset : offset + limit]

    return jsonify(
        {
            "messages": paginated_messages,
            "total": len(messages),
            "limit": limit,
            "offset": offset,
        }
    )


@app.route("/api/conversations/<conversation_id>", methods=["GET"])
def get_conversation(conversation_id):
    conversation_messages = [
        m for m in messages if m.get("conversation_id") == conversation_id
    ]

    return jsonify(
        {
            "conversation_id": conversation_id,
            "messages": conversation_messages,
            "count": len(conversation_messages),
        }
    )


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Payment and usage statistics"""
    total_messages = len(messages)
    paid_messages = len([m for m in messages if m.get("payment_verified")])
    total_revenue = paid_messages * 10  # Assuming 10 NP average per message

    return jsonify(
        {
            "total_messages": total_messages,
            "paid_messages": paid_messages,
            "free_requests": total_messages - paid_messages,
            "total_revenue_np": total_revenue,
            "facilitator_url": FACILITATOR_URL,
            "agent_name": AGENT_NAME,
            "timestamp": time.time(),
        }
    )


# ==============================================================================
# PAID ENDPOINTS (with NANDA Points requirements)
# ==============================================================================


@app.route("/api/send", methods=["POST"])
@require_payment(SEND_MESSAGE_REQUIREMENT, payments["config"] if payments else None)
def send_message():
    """Send message to agent bridge - REQUIRES 10 NANDA POINTS"""
    global latest_message

    try:
        data = request.get_json()
        message = data.get("message")
        conversation_id = data.get("conversation_id", str(uuid.uuid4()))
        client_id = data.get("client_id", "default_client")

        if not message:
            return jsonify({"error": "Message is required"}), 400

        print(f"💰 Processing paid message from {client_id}")
        print(f"   Message: {message[:100]}...")
        print(f"   Payment verified: 10 NP")

        # Create A2A client for communication with agent bridge
        agent_url = get_agent_url()
        client = A2AClient(agent_url)

        # Prepare metadata
        metadata = {
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "agent_id": get_agent_id(),
            "payment_verified": True,
            "payment_amount": "10 NP",
        }

        # Send message to agent bridge
        try:
            response = client.send_message(message, metadata)
        except Exception as e:
            # Mock response if agent bridge is not available
            response = f"Agent bridge response: Processed '{message[:50]}...' (Bridge may be offline: {e})"

        # Store message with payment info
        message_record = {
            "id": str(uuid.uuid4()),
            "message": message,
            "response": response,
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "agent_id": get_agent_id(),
            "payment_verified": True,
            "payment_amount": "10 NP",
            "cost": "10 NP",
        }

        messages.append(message_record)
        latest_message = response

        # Store client mapping
        client_map[client_id] = {
            "conversation_id": conversation_id,
            "last_activity": time.time(),
        }

        print(f"✅ Message processed and payment settled")

        return jsonify(
            {
                "response": response,
                "conversation_id": conversation_id,
                "agent_id": get_agent_id(),
                "message_id": message_record["id"],
                "timestamp": message_record["timestamp"],
                "cost": "10 NP",
                "payment_verified": True,
                "success": True,
            }
        )

    except NPPaymentError:
        # Payment errors are handled by the decorator
        raise
    except Exception as e:
        print(f"❌ Error in send_message: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/receive_message", methods=["POST"])
@require_payment(RECEIVE_MESSAGE_REQUIREMENT, payments["config"] if payments else None)
def receive_message():
    """Receive message from agent bridge - REQUIRES 5 NANDA POINTS"""
    global latest_message

    try:
        data = request.get_json()
        message = data.get("message")
        conversation_id = data.get("conversation_id")
        client_id = data.get("client_id", "agent_bridge")

        if not message:
            return jsonify({"error": "Message is required"}), 400

        print(f"💰 Processing paid received message")
        print(f"   From: {client_id}")
        print(f"   Payment verified: 5 NP")

        # Store received message with payment info
        message_record = {
            "id": str(uuid.uuid4()),
            "message": message,
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "type": "received",
            "payment_verified": True,
            "payment_amount": "5 NP",
            "cost": "5 NP",
        }

        messages.append(message_record)
        latest_message = message

        print(f"✅ Received message processed and payment settled")

        return jsonify(
            {
                "status": "received",
                "message_id": message_record["id"],
                "timestamp": message_record["timestamp"],
                "cost": "5 NP",
                "payment_verified": True,
                "success": True,
            }
        )

    except NPPaymentError:
        # Payment errors are handled by the decorator
        raise
    except Exception as e:
        print(f"❌ Error in receive_message: {e}")
        return jsonify({"error": str(e)}), 500


# ==============================================================================
# PAYMENT TESTING ENDPOINTS
# ==============================================================================


@app.route("/api/test/payment-info", methods=["GET"])
def test_payment_info():
    """Test endpoint to get payment configuration info"""
    return jsonify(
        {
            "facilitator_url": FACILITATOR_URL,
            "agent_name": AGENT_NAME,
            "payment_requirements": {
                "send_message": {
                    "amount": SEND_MESSAGE_REQUIREMENT.amount,
                    "description": SEND_MESSAGE_REQUIREMENT.description,
                },
                "receive_message": {
                    "amount": RECEIVE_MESSAGE_REQUIREMENT.amount,
                    "description": RECEIVE_MESSAGE_REQUIREMENT.description,
                },
            },
            "payment_sdk_loaded": payments is not None,
        }
    )


@app.route("/api/test/send-free", methods=["POST"])
def test_send_free():
    """Free version of send for testing comparison"""
    data = request.get_json()
    message = data.get("message", "Test message")

    return jsonify(
        {
            "response": f"Free response to: {message}",
            "cost": "FREE",
            "timestamp": time.time(),
            "note": "This is the free version. Compare with /api/send which requires payment.",
        }
    )


def run_app():
    port = get_ui_port()
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() == "true"

    # SSL configuration
    ssl_cert = os.getenv("SSL_CERT_PATH")
    ssl_key = os.getenv("SSL_KEY_PATH")

    ssl_context = None
    if ssl_cert and ssl_key:
        ssl_context = (ssl_cert, ssl_key)

    print("\n🚀 NANDA Adapter with Payments Started")
    print("=" * 45)
    print(f"   Server: http://{host}:{port}")
    print(f"   Agent Bridge: {get_agent_url()}")
    print(f"   Agent Name: {AGENT_NAME}")
    print(f"   Facilitator: {FACILITATOR_URL}")
    print("")
    print("📡 Available Endpoints:")
    print("   GET  /api/health              - Health check (FREE)")
    print("   GET  /api/agents/list         - List agents (FREE)")
    print("   GET  /api/messages/stream     - SSE stream (FREE)")
    print("   POST /api/send                - Send message (10 NP) 💰")
    print("   POST /api/receive_message     - Receive message (5 NP) 💰")
    print("   GET  /api/render              - Latest message (FREE)")
    print("   GET  /api/conversations/:id   - Conversation history (FREE)")
    print("   GET  /api/messages            - All messages (FREE)")
    print("   GET  /api/stats               - Payment statistics (FREE)")
    print("   GET  /api/test/payment-info   - Payment config (FREE)")
    print("   POST /api/test/send-free      - Free send test (FREE)")
    print("")
    print("💰 Payment Requirements:")
    print("   /api/send: 10 NANDA Points")
    print("   /api/receive_message: 5 NANDA Points")
    print("")
    if payments:
        print("✅ NANDA Payments enabled and ready!")
    else:
        print("⚠️  NANDA Payments disabled - check facilitator connection")
    print("")

    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context)


if __name__ == "__main__":
    run_app()
