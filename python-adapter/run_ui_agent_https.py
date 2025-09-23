import os
import json
import uuid
import threading
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from python_a2a import A2AClient
import time

app = Flask(__name__)
CORS(app)

# Global variables
messages = []
latest_message = ""
client_map = {}

def get_agent_port():
    return int(os.getenv('AGENT_PORT', 3000))

def get_ui_port():
    return int(os.getenv('UI_PORT', 5000))

def get_agent_id():
    return os.getenv('AGENT_ID', 'default_agent')

def get_agent_url():
    port = get_agent_port()
    return f"http://localhost:{port}"

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "agent_port": get_agent_port(),
        "ui_port": get_ui_port()
    })

@app.route('/api/agents/list', methods=['GET'])
def list_agents():
    # This would normally fetch from a registry
    return jsonify({
        "agents": [
            {"name": "local_agent", "url": get_agent_url(), "status": "active"}
        ]
    })

@app.route('/api/send', methods=['POST'])
def send_message():
    global latest_message

    try:
        data = request.get_json()
        message = data.get('message')
        conversation_id = data.get('conversation_id', str(uuid.uuid4()))
        client_id = data.get('client_id', 'default_client')

        if not message:
            return jsonify({"error": "Message is required"}), 400

        # Create A2A client for communication with agent bridge
        agent_url = get_agent_url()
        client = A2AClient(agent_url)

        # Prepare metadata
        metadata = {
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "agent_id": get_agent_id()
        }

        # Send message to agent bridge
        response = client.send_message(message, metadata)

        # Store message
        message_record = {
            "id": str(uuid.uuid4()),
            "message": message,
            "response": response,
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "agent_id": get_agent_id()
        }

        messages.append(message_record)
        latest_message = response

        # Store client mapping
        client_map[client_id] = {
            "conversation_id": conversation_id,
            "last_activity": time.time()
        }

        return jsonify({
            "response": response,
            "conversation_id": conversation_id,
            "agent_id": get_agent_id(),
            "message_id": message_record["id"],
            "timestamp": message_record["timestamp"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/receive_message', methods=['POST'])
def receive_message():
    global latest_message

    try:
        data = request.get_json()
        message = data.get('message')
        conversation_id = data.get('conversation_id')
        client_id = data.get('client_id', 'agent_bridge')

        if not message:
            return jsonify({"error": "Message is required"}), 400

        # Store received message
        message_record = {
            "id": str(uuid.uuid4()),
            "message": message,
            "conversation_id": conversation_id,
            "client_id": client_id,
            "timestamp": time.time(),
            "type": "received"
        }

        messages.append(message_record)
        latest_message = message

        return jsonify({
            "status": "received",
            "message_id": message_record["id"],
            "timestamp": message_record["timestamp"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/render', methods=['GET'])
def render_latest():
    return jsonify({
        "message": latest_message,
        "timestamp": time.time()
    })

@app.route('/api/messages/stream', methods=['GET'])
def stream_messages():
    def generate():
        while True:
            if messages:
                latest = messages[-1]
                yield f"data: {json.dumps(latest)}\n\n"
            time.sleep(1)

    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/messages', methods=['GET'])
def get_messages():
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    paginated_messages = messages[offset:offset + limit]

    return jsonify({
        "messages": paginated_messages,
        "total": len(messages),
        "limit": limit,
        "offset": offset
    })

@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    conversation_messages = [m for m in messages if m.get('conversation_id') == conversation_id]

    return jsonify({
        "conversation_id": conversation_id,
        "messages": conversation_messages,
        "count": len(conversation_messages)
    })

def run_app():
    port = get_ui_port()
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'False').lower() == 'true'

    # SSL configuration
    ssl_cert = os.getenv('SSL_CERT_PATH')
    ssl_key = os.getenv('SSL_KEY_PATH')

    ssl_context = None
    if ssl_cert and ssl_key:
        ssl_context = (ssl_cert, ssl_key)

    print(f"Starting NANDA Adapter UI Agent on {host}:{port}")
    print(f"Agent Bridge URL: {get_agent_url()}")

    app.run(
        host=host,
        port=port,
        debug=debug,
        ssl_context=ssl_context
    )

if __name__ == '__main__':
    run_app()