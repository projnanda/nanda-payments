import { NandaPointsRest, NandaMcpClient } from '../src/index.js';

const BASE_URL = process.env.NP_BASE_URL || 'http://localhost:3000';

async function main() {
  const rest = new NandaPointsRest({ baseUrl: BASE_URL });
  const mcp = new NandaMcpClient(BASE_URL);

  console.log('Testing REST /api/health...');
  const health = await rest.getHealth();
  console.log('Health:', health);

  console.log('Testing MCP getPaymentInfo...');
  const payInfo = await mcp.callTool('getPaymentInfo');
  console.log('PaymentInfo:', payInfo);

  console.log('SDK smoke tests passed.');
}

main().catch((err) => {
  console.error('SDK test failed:', err);
  process.exit(1);
});


