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

  // Auto-pay flow for x402-NP-wrapped tools exposed by withPayment
  async callPaidToolWithAutoPay(
    payingAgent: string,
    toolName: string,
    args: ToolArgs = {},
    options: McpCallOptions = {}
  ): Promise<any> {
    const first = await this.callTool(toolName, args, options);
    const maybe = typeof first === 'string' ? safeParse(first) : first;
    const info = maybe && typeof maybe === 'object' ? maybe as any : null;

    // Detect 402-style body from withPayment
    if (!info || info.error !== 'PAYMENT_REQUIRED' || !info.price) {
      return first;
    }

    const amountPoints = info.price.amount as number; // NP points
    const recipient = info.price.recipient as string;

    // Pay using MCP initiateTransaction
    const txResp = await this.callTool('initiateTransaction', {
      from: payingAgent,
      to: recipient,
      amount: amountPoints,
      task: `payment for ${toolName}`
    }, options);

    const tx = typeof txResp === 'string' ? safeParse(txResp) : txResp;
    const txId = tx?.txId;
    if (!txId) {
      throw new Error(`Failed to initiate payment for ${toolName}: ${JSON.stringify(txResp)}`);
    }

    // Retry tool with payment headers as args
    const paidArgs: ToolArgs = {
      ...args,
      _paymentAgent: payingAgent,
      _paymentTxId: txId,
      _paymentAmount: String(amountPoints)
    };
    return this.callTool(toolName, paidArgs, options);
  }
}

function safeParse(text: any): any {
  try { return JSON.parse(text); } catch { return text; }
}

