type ToolArgs = Record<string, unknown>;

export interface McpCallOptions {
  sessionId?: string;
  headers?: Record<string, string>;
}

export class NandaMcpClient {
  private readonly mcpUrl: string;

  constructor(baseUrl: string) {
    this.mcpUrl = `${baseUrl.replace(/\/$/, '')}/mcp`;
  }

  async callTool(toolName: string, args: ToolArgs = {}, options: McpCallOptions = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.sessionId ? { 'mcp-session-id': options.sessionId } : {}),
      ...(options.headers ?? {})
    };

    const res = await fetch(this.mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name: toolName, arguments: args }
      })
    });

    if (res.status === 402) {
      const body = await res.text();
      throw new Error(`402 Payment Required: ${body}`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MCP error ${res.status}: ${body}`);
    }

    const json = await res.json();
    // Extract tool result content
    const result = json?.result?.content?.[0]?.text;
    try {
      return result ? JSON.parse(result) : json?.result ?? json;
    } catch {
      return result ?? json?.result ?? json;
    }
  }
}


