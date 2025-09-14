# NANDA Points API Frontend Tester

A simple, modern web interface for testing the NANDA Points API.

## Features

- 🏥 **Health Check** - Test API connectivity
- 👤 **Agent Management** - Create and manage agents
- 💼 **Wallet Management** - Create wallets and check balances
- 💰 **Transactions** - Earn and spend points
- 🎨 **Modern UI** - Clean, responsive design
- 📱 **Mobile Friendly** - Works on all devices

## Quick Start

1. **Start the API server** (in another terminal):
   ```bash
   cd ../nanda-payments
   npm run dev
   ```

2. **Start the frontend**:
   ```bash
   npm start
   ```

3. **Open your browser**:
   ```
   http://localhost:8080
   ```

## Usage

### 1. Health Check
- Click "Check API Health" to verify the API is running
- Green indicator = API online, Red = API offline

### 2. Create an Agent
- Fill in the Agent DID, Name, and Facts URL
- Click "Create Agent" to register a new agent

### 3. Create a Wallet
- Enter the Agent DID
- Select wallet type (User, Treasury, Fee Pool, or Escrow)
- Click "Create Wallet" to create a new wallet

### 4. Test Transactions
- Enter the wallet ID (auto-filled after creating a wallet)
- Set the amount in minor units (1000 = 1.000 NP)
- Choose a reason code
- Click "Earn Points" or "Spend Points"

## API Endpoints Tested

- `GET /health` - API health check
- `POST /agents` - Create agent
- `GET /agents/:did` - Get agent info
- `POST /wallets` - Create wallet
- `GET /wallets/:id/balance` - Get wallet balance
- `POST /transactions` - Create transactions (mint/burn)

## Troubleshooting

- **API Offline**: Make sure the backend server is running on port 3000
- **CORS Errors**: The API server should handle CORS for localhost:8080
- **Wallet Not Found**: Make sure to create a wallet before testing transactions

## Development

To modify the frontend:
1. Edit `index.html`
2. Refresh the browser to see changes
3. No build process required - pure HTML/CSS/JavaScript

## License

MIT
