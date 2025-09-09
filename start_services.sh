#!/bin/bash

echo "🚀 Starting Unified AI Agent Marketplace Services"
echo "================================================"

# Set environment variables
export MONGO_URL=${MONGO_URL:-"mongodb://localhost:27017/unified-system"}
export PORT=${PORT:-3000}
export NODE_ENV=${NODE_ENV:-development}

echo "🔧 Environment Configuration:"
echo "  • MongoDB: $MONGO_URL"
echo "  • Port: $PORT"
echo "  • Environment: $NODE_ENV"

# Check if MongoDB is running
echo ""
echo "🔍 Checking MongoDB connection..."
if ! mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "❌ MongoDB is not running. Please start MongoDB first:"
    echo "   mongod --dbpath /your/db/path"
    exit 1
fi
echo "✅ MongoDB is running"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
fi

echo ""
echo "🎯 Starting services..."

# Start the main server
echo "🌐 Starting API server..."
npm run dev &

# Wait a moment for the server to start
sleep 3

# Check if server is running
if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo "✅ API server is running on http://localhost:$PORT"
    echo "📚 API documentation: http://localhost:$PORT/api"
    echo "🏥 Health check: http://localhost:$PORT/api/health"
else
    echo "❌ API server failed to start"
    exit 1
fi

echo ""
echo "🎉 All services started successfully!"
echo "====================================="
echo ""
echo "🔧 Available Commands:"
echo "  • Create client wallet: node scripts/create-client-wallet.js"
echo "  • Run demo: node scripts/demo-client-wallet.js"
echo "  • View logs: tail -f logs/app.log"
echo ""
echo "📱 WebSocket endpoint: ws://localhost:$PORT/ws"
echo "🔌 Connect to WebSocket for real-time events"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running and handle Ctrl+C
trap 'echo ""; echo "🛑 Stopping services..."; kill $(jobs -p); exit 0' INT
wait
