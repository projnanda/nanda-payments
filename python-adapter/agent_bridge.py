import os
import json
import time
import asyncio
import logging
from python_a2a import run_server, AgentBridge as BaseAgentBridge
import requests
from anthropic import Anthropic


class AgentBridge(BaseAgentBridge):
    def __init__(self, name="agent_bridge", registry_url=None, claude_api_key=None):
        super().__init__(name)
        self.registry_url = registry_url or os.getenv(
            "REGISTRY_URL", "http://localhost:8000"
        )
        self.claude_client = None

        if claude_api_key or os.getenv("CLAUDE_API_KEY"):
            self.claude_client = Anthropic(
                api_key=claude_api_key or os.getenv("CLAUDE_API_KEY")
            )

        self.conversations = {}

        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    async def handle_message(self, message, metadata=None):
        """Main message handling logic"""
        try:
            sender = metadata.get("sender", "unknown") if metadata else "unknown"
            conversation_id = metadata.get("conversation_id") if metadata else None

            self.logger.info(f"Received message from {sender}: {message[:100]}...")

            # Store conversation
            if conversation_id:
                if conversation_id not in self.conversations:
                    self.conversations[conversation_id] = []

                self.conversations[conversation_id].append(
                    {
                        "timestamp": time.time(),
                        "sender": sender,
                        "message": message,
                        "metadata": metadata,
                    }
                )

            # Process message based on type
            if message.startswith("/mcp"):
                return await self.handle_mcp_query(message, metadata)
            elif message.startswith("/claude"):
                return await self.handle_claude_query(message, metadata)
            elif message.startswith("/send"):
                return await self.handle_send_to_agent(message, metadata)
            else:
                return await self.improve_message(message, metadata)

        except Exception as e:
            self.logger.error(f"Error handling message: {e}")
            return f"Error processing message: {str(e)}"

    async def improve_message(self, message, metadata=None):
        """Improve message using Claude AI or default processing"""
        try:
            if self.claude_client:
                response = self.claude_client.messages.create(
                    model="claude-3-sonnet-20240229",
                    max_tokens=1000,
                    messages=[
                        {
                            "role": "user",
                            "content": f"Please improve this message while maintaining its meaning: {message}",
                        }
                    ],
                )
                return response.content[0].text
            else:
                # Default improvement without Claude
                return f"Processed: {message}"

        except Exception as e:
            self.logger.error(f"Error improving message: {e}")
            return f"Default response: {message}"

    async def handle_mcp_query(self, message, metadata=None):
        """Handle MCP server queries"""
        try:
            # Extract MCP command
            command = message[4:].strip()  # Remove '/mcp'

            # This would normally query an MCP server
            # For now, return a mock response
            return f"MCP Query Result: {command}"

        except Exception as e:
            return f"MCP Error: {str(e)}"

    async def handle_claude_query(self, message, metadata=None):
        """Handle direct Claude queries"""
        try:
            if not self.claude_client:
                return "Claude API not configured"

            query = message[7:].strip()  # Remove '/claude'

            response = self.claude_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1500,
                messages=[{"role": "user", "content": query}],
            )

            return response.content[0].text

        except Exception as e:
            return f"Claude Error: {str(e)}"

    async def handle_send_to_agent(self, message, metadata=None):
        """Send message to specific agent"""
        try:
            parts = message[5:].strip().split(" ", 1)  # Remove '/send'
            if len(parts) < 2:
                return "Usage: /send <agent_name> <message>"

            agent_name, agent_message = parts

            # This would normally send to the specified agent
            # For now, return a mock response
            return f"Message sent to {agent_name}: {agent_message}"

        except Exception as e:
            return f"Send Error: {str(e)}"

    async def register_with_registry(self):
        """Register this agent with the registry"""
        try:
            registration_data = {
                "name": self.name,
                "url": f"http://localhost:{self.port}",
                "capabilities": ["message_processing", "claude_ai", "mcp_queries"],
                "status": "active",
            }

            response = requests.post(
                f"{self.registry_url}/register", json=registration_data, timeout=5
            )

            if response.status_code == 200:
                self.logger.info(
                    f"Successfully registered with registry: {self.registry_url}"
                )
            else:
                self.logger.warning(
                    f"Registry registration failed: {response.status_code}"
                )

        except Exception as e:
            self.logger.warning(f"Could not register with registry: {e}")

    def get_conversation_history(self, conversation_id):
        """Get conversation history"""
        return self.conversations.get(conversation_id, [])

    def get_all_conversations(self):
        """Get all conversation IDs"""
        return list(self.conversations.keys())


def create_agent_bridge(name="agent_bridge", port=3000, **kwargs):
    """Factory function to create an agent bridge"""
    bridge = AgentBridge(name, **kwargs)
    bridge.port = port
    return bridge


def main():
    # Configuration from environment
    name = os.getenv("AGENT_NAME", "agent_bridge")
    port = int(os.getenv("AGENT_PORT", 3000))
    registry_url = os.getenv("REGISTRY_URL")
    claude_api_key = os.getenv("CLAUDE_API_KEY")

    # Create and configure agent bridge
    bridge = create_agent_bridge(
        name=name, port=port, registry_url=registry_url, claude_api_key=claude_api_key
    )

    print(f"Starting Agent Bridge: {name}")
    print(f"Port: {port}")
    print(f"Registry: {registry_url}")
    print(f"Claude API: {'Configured' if claude_api_key else 'Not configured'}")

    # Register with registry in background
    asyncio.create_task(bridge.register_with_registry())

    # Start the server
    run_server(bridge, port=port)


if __name__ == "__main__":
    main()
