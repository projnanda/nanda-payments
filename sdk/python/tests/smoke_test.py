from __future__ import annotations

import os
from nanda_points_sdk import RestClient, McpClient


def main() -> None:
    base = os.getenv("NP_BASE_URL", "http://localhost:3000")
    rest = RestClient(base)
    mcp = McpClient(base)

    print("Testing /api/health...")
    print(rest.get_health())

    print("Testing MCP getPaymentInfo...")
    print(mcp.call_tool("getPaymentInfo"))

    print("Python SDK smoke test passed.")


if __name__ == "__main__":
    main()


