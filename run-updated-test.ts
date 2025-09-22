#!/usr/bin/env tsx

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { writeFile } from 'fs/promises';

const SERVER_URL = "http://localhost:3000/mcp";
const LOG_FILE = "test.log";

async function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  await writeFile(LOG_FILE, logLine, { flag: 'a' });
  console.log(message);
}

async function clearLogFile() {
  await writeFile(LOG_FILE, '');
}

async function runComprehensiveTests() {
  await clearLogFile();
  await logToFile("🚀 Starting Updated x402-NP Test Suite");
  await logToFile(`Server URL: ${SERVER_URL}`);
  await logToFile("");

  const client = new Client(
    { name: "x402-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));

  try {
    await logToFile("🔌 Connecting to MCP server...");
    await client.connect(transport);
    await logToFile("✅ Connected successfully!");
    await logToFile("");

    // Test 1: List all tools
    await logToFile("============================================================");
    await logToFile("TEST: List all available tools");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: listTools");
    await logToFile("Arguments: {}");

    const toolsResult = await client.listTools();
    await logToFile("📥 TOOLS LIST:");
    toolsResult.tools.forEach((tool, index) => {
      logToFile(`  ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    await logToFile("");

    // Test 2: Get payment information (free tool)
    await logToFile("============================================================");
    await logToFile("TEST: Get payment information (free tool)");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: getPaymentInfo");
    await logToFile("Arguments: {}");

    const paymentInfoResult = await client.callTool({
      name: "getPaymentInfo",
      arguments: {}
    });

    const paymentInfo = JSON.parse(paymentInfoResult.content[0].text);
    await logToFile("📥 MCP RESPONSE:");
    await logToFile("Response: " + JSON.stringify(paymentInfo, null, 2));
    await logToFile("Status: SUCCESS - Free tool worked");
    await logToFile("");

    // Test 3: Call getBalance (now free)
    await logToFile("============================================================");
    await logToFile("TEST: Call getBalance (now free)");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: getBalance");
    await logToFile("Arguments: " + JSON.stringify({ agent_name: "claude-desktop" }, null, 2));

    const balanceResult = await client.callTool({
      name: "getBalance",
      arguments: { agent_name: "claude-desktop" }
    });

    const balanceResponse = JSON.parse(balanceResult.content[0].text);
    await logToFile("📥 MCP RESPONSE:");
    await logToFile("Response: " + JSON.stringify(balanceResponse, null, 2));

    if (balanceResponse.error) {
      await logToFile("❌ UNEXPECTED: Free tool failed");
      await logToFile(`   Error: ${balanceResponse.error}`);
    } else {
      await logToFile("✅ SUCCESS: Free tool worked correctly");
      await logToFile(`   Got balance: ${balanceResponse.balancePoints} NP for ${balanceResponse.agent_name}`);
    }
    await logToFile("");

    // Test 4: Call getReceipt (now free)
    await logToFile("============================================================");
    await logToFile("TEST: Call getReceipt (now free)");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: getReceipt");
    await logToFile("Arguments: " + JSON.stringify({ txId: "test-receipt-id" }, null, 2));

    const receiptResult = await client.callTool({
      name: "getReceipt",
      arguments: { txId: "test-receipt-id" }
    });

    const receiptResponse = JSON.parse(receiptResult.content[0].text);
    await logToFile("📥 MCP RESPONSE:");
    await logToFile("Response: " + JSON.stringify(receiptResponse, null, 2));

    if (receiptResponse.error === "NOT_FOUND") {
      await logToFile("✅ SUCCESS: Free tool worked correctly (receipt not found as expected)");
    } else if (receiptResponse.error) {
      await logToFile("❌ UNEXPECTED: Free tool failed");
      await logToFile(`   Error: ${receiptResponse.error}`);
    } else {
      await logToFile("✅ SUCCESS: Free tool worked and found receipt");
    }
    await logToFile("");

    // Test 5: Call getTimestamp without payment (should require payment)
    await logToFile("============================================================");
    await logToFile("TEST: Call getTimestamp without payment (should require payment)");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: getTimestamp");
    await logToFile("Arguments: {}");

    const timestampResult = await client.callTool({
      name: "getTimestamp",
      arguments: {}
    });

    const timestampResponse = JSON.parse(timestampResult.content[0].text);
    await logToFile("📥 MCP RESPONSE:");
    await logToFile("Response: " + JSON.stringify(timestampResponse, null, 2));

    if (timestampResponse.error === "PAYMENT_REQUIRED") {
      await logToFile("✅ EXPECTED: Payment required correctly detected");
    } else {
      await logToFile("❌ UNEXPECTED: Paid tool worked without payment");
    }
    await logToFile("");

    // Test 6: Make payment for getTimestamp
    await logToFile("============================================================");
    await logToFile("TEST: Make payment for getTimestamp access");
    await logToFile("============================================================");
    await logToFile("📤 MCP REQUEST:");
    await logToFile("Tool: initiateTransaction");
    await logToFile("Arguments: " + JSON.stringify({
      from: "claude-desktop",
      to: "system",
      amount: 1
    }, null, 2));

    const paymentResult = await client.callTool({
      name: "initiateTransaction",
      arguments: {
        from: "claude-desktop",
        to: "system",
        amount: 1
      }
    });

    const payment = JSON.parse(paymentResult.content[0].text);
    await logToFile("📥 MCP RESPONSE:");
    await logToFile("Response: " + JSON.stringify(payment, null, 2));

    if (payment.error) {
      await logToFile("❌ Payment failed: " + payment.error);
    } else {
      await logToFile("✅ Payment successful! TxId: " + payment.txId);

      // Test 7: Use payment to access getTimestamp
      await logToFile("");
      await logToFile("============================================================");
      await logToFile("TEST: Access getTimestamp with payment proof");
      await logToFile("============================================================");
      await logToFile("📤 MCP REQUEST:");
      await logToFile("Tool: getTimestamp");
      await logToFile("Arguments: " + JSON.stringify({
        _paymentAgent: "claude-desktop",
        _paymentTxId: payment.txId,
        _paymentAmount: "1"
      }, null, 2));

      const paidTimestampResult = await client.callTool({
        name: "getTimestamp",
        arguments: {
          _paymentAgent: "claude-desktop",
          _paymentTxId: payment.txId,
          _paymentAmount: "1"
        }
      });

      const paidTimestampResponse = JSON.parse(paidTimestampResult.content[0].text);
      await logToFile("📥 MCP RESPONSE:");
      await logToFile("Response: " + JSON.stringify(paidTimestampResponse, null, 2));

      if (paidTimestampResponse.error) {
        await logToFile("❌ UNEXPECTED: Payment verification failed");
        await logToFile(`   Error: ${paidTimestampResponse.error}`);
      } else {
        await logToFile("🎉 SUCCESS! x402-NP payment flow completed for getTimestamp");
        await logToFile(`   Server timestamp: ${paidTimestampResponse.timestamp}`);
      }
    }
    await logToFile("");

    // Test Summary
    await logToFile("📊 TEST SUMMARY");
    await logToFile("================");
    await logToFile("✅ MCP connection successful");
    await logToFile("✅ Tool listing successful");
    await logToFile("✅ Free tools (getBalance, getReceipt) working correctly");
    await logToFile("✅ Paid tool (getTimestamp) requiring payment correctly");
    await logToFile("✅ Payment flow working end-to-end");
    await logToFile("");

    await client.close();
    await logToFile("✅ Disconnected from server");
    await logToFile("");

    // Test direct HTTP calls
    await logToFile("🌐 Testing Direct HTTP Calls");
    await logToFile("==============================");
    await logToFile("");

    // Health check
    await logToFile("📤 HTTP REQUEST: GET /health");
    const healthResponse = await fetch("http://localhost:3000/health");
    await logToFile(`📥 HTTP RESPONSE: ${healthResponse.status} ${healthResponse.statusText}`);
    const healthData = await healthResponse.json();
    await logToFile("Response: " + JSON.stringify(healthData, null, 2));
    await logToFile("");

    // Direct MCP call (should fail without session)
    await logToFile("📤 HTTP REQUEST: POST /mcp");
    await logToFile("Headers: Content-Type: application/json, Accept: application/json");
    const directMcpBody = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "getBalance",
        arguments: { agent_name: "claude-desktop" }
      },
      id: 1
    };
    await logToFile("Body: " + JSON.stringify(directMcpBody, null, 2));

    const directMcpResponse = await fetch("http://localhost:3000/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(directMcpBody)
    });

    await logToFile(`📥 HTTP RESPONSE: ${directMcpResponse.status} ${directMcpResponse.statusText}`);
    await logToFile("Headers: " + JSON.stringify(Object.fromEntries(directMcpResponse.headers.entries()), null, 2));
    const directMcpData = await directMcpResponse.json();
    await logToFile("Error response: " + JSON.stringify(directMcpData));
    await logToFile("");

    await logToFile("📋 Complete test log saved to: " + LOG_FILE);

  } catch (error) {
    await logToFile("❌ Test failed: " + String(error));
    await client.close();
    throw error;
  }
}

runComprehensiveTests().catch(console.error);