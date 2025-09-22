# Docker Setup for NANDA Points Combined Server

This document explains how to run the NANDA Points Combined Server (MCP + API) using Docker with NANDA's actual database.

## Services

The combined server runs both services on separate ports:

-   **MCP Server**: `http://localhost:3000` - Model Context Protocol server for AI agents
-   **API Server**: `http://localhost:8080` - REST API for UI teams to access data

## Prerequisites

-   Docker and Docker Compose installed
-   Access to NANDA's MongoDB database
-   Environment variables configured (see below)

## Quick Start

### Using Docker Compose (Recommended)

1. **Set up environment variables:**

    ```bash
    # Create .env file with NANDA's database credentials
    echo "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nanda_points?retryWrites=true&w=majority" > .env
    echo "NP_DB_NAME=nanda_points" >> .env
    ```

2. **Start the server:**

    ```bash
    docker-compose up -d
    ```

3. **Seed the database (if needed):**

    ```bash
    docker-compose exec nanda-points-server node seed.js
    ```

4. **Check health:**

    ```bash
    # MCP Server health
    curl http://localhost:3000/health

    # API Server health
    curl http://localhost:8080/api/health
    ```

5. **Test API endpoints:**

    ```bash
    # Get all wallets
    curl http://localhost:8080/api/wallets

    # Get all transactions
    curl http://localhost:8080/api/transactions

    # Get all receipts
    curl http://localhost:8080/api/receipts
    ```

6. **Stop services:**
    ```bash
    docker-compose down
    ```

### Using Docker directly

1. **Build the image:**

    ```bash
    docker build -t nanda-points-mcp .
    ```

2. **Run with NANDA's database:**
    ```bash
    docker run -p 3000:3000 \
      -e MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/nanda_points?retryWrites=true&w=majority" \
      -e NP_DB_NAME="nanda_points" \
      nanda-points-mcp
    ```

## Environment Variables

| Variable      | Default        | Description               |
| ------------- | -------------- | ------------------------- |
| `NODE_ENV`    | `production`   | Node.js environment       |
| `PORT`        | `3000`         | Server port               |
| `HOST`        | `0.0.0.0`      | Server host               |
| `MONGODB_URI` | Required       | MongoDB connection string |
| `NP_DB_NAME`  | `nanda_points` | Database name             |

## Services

### NANDA Points MCP Server

-   **Port:** 3000
-   **Health Check:** `GET /health`
-   **MCP Endpoint:** `POST /mcp`
-   **SSE Stream:** `GET /mcp`
-   **Database:** Connects to NANDA's MongoDB cluster

## Development

### Local Development with Docker

```bash
# Set up environment variables
export MONGODB_URI="link-to-your-registry"
export NP_DB_NAME="nanda_points"

# Run the server locally
npm run dev
```

### Debugging

```bash
# View logs
docker-compose logs -f nanda-points-server

# Access container shell
docker-compose exec nanda-points-server sh

# View MongoDB logs
docker-compose logs -f mongodb
```

## Production Deployment

### Environment Variables for Production

```bash
# .env file
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nanda_points?retryWrites=true&w=majority
NP_DB_NAME=nanda_points
```

### Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"
services:
    nanda-points-server:
        environment:
            MONGODB_URI: ${MONGODB_URI}
        restart: always
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

    - Verify NANDA's database connection string in environment variables
    - Check if you have access to NANDA's MongoDB cluster
    - Verify network connectivity to the database

2. **Port Already in Use**

    - Change port in docker-compose.yml
    - Kill existing process: `lsof -ti:3000 | xargs kill -9`

3. **Permission Denied**
    - Ensure proper file permissions
    - Check if running as correct user

### Health Checks

```bash
# Check server health
curl http://localhost:3000/health

# Check MongoDB connection
docker-compose exec nanda-points-server node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
client.connect().then(() => {
  console.log('MongoDB connected successfully');
  process.exit(0);
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
"
```
