#!/bin/bash

# NANDA Adapter Test Script
# Tests both free and paid endpoints

echo "🧪 Testing NANDA Adapter Endpoints"
echo "=================================="

BASE_URL="http://localhost:8080"

echo ""
echo "1. 🔍 Testing Health Check (FREE)"
echo "--------------------------------"
curl -s "$BASE_URL/api/health" | jq '.'

echo ""
echo "2. 🔍 Testing Agent List (FREE)"
echo "------------------------------"
curl -s "$BASE_URL/api/agents/list" | jq '.'

echo ""
echo "3. 💰 Testing /api/send WITHOUT Payment (Should return HTTP 402)"
echo "----------------------------------------------------------------"
curl -i -X POST "$BASE_URL/api/send" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, agent!",
    "conversation_id": "test-conv-1",
    "client_id": "test-client"
  }'

echo ""
echo ""
echo "4. 🔍 Testing Statistics (FREE)"
echo "------------------------------"
curl -s "$BASE_URL/api/stats" | jq '.'

echo ""
echo "5. 🔍 Testing Messages List (FREE)"
echo "---------------------------------"
curl -s "$BASE_URL/api/messages?limit=5" | jq '.'

echo ""
echo "6. 💰 Testing /api/receive_message WITHOUT Payment (Should return HTTP 402)"
echo "--------------------------------------------------------------------------"
curl -i -X POST "$BASE_URL/api/receive_message" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Response from agent bridge",
    "conversation_id": "test-conv-1",
    "client_id": "agent-bridge"
  }'

echo ""
echo ""
echo "✅ Test completed!"
echo ""
echo "Expected Results:"
echo "- Health check: Should return 200 with server status"
echo "- Agent list: Should return 200 with mock agents"
echo "- /api/send without payment: Should return 402 with payment requirements"
echo "- /api/receive_message without payment: Should return 402 with payment requirements"
echo "- Statistics: Should show 0 paid messages initially"
echo ""
echo "To test WITH payment:"
echo "1. Ensure NANDA Points facilitator is running on localhost:3001"
echo "2. Create a valid NANDA Points payment"
echo "3. Include X-PAYMENT header with base64-encoded payment"