import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.NP_DB_NAME || 'nanda_points';

const NP_CURRENCY = 'NP';
const NP_SCALE = 0;
const DEFAULT_POINTS = 1000; // seed points per agent wallet (in minor units since NP_SCALE=0)

const nowIso = () => new Date().toISOString();
const addDays = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

function agentDoc({ agent_name, label, description, serviceCharge = 10, endpointsStatic = [], username, email }) {
  const issuedAt = nowIso();
  const issuanceDate = issuedAt.slice(0, 10);
  const expirationDate = addDays(30).toISOString().slice(0, 10);
  const walletId = randomUUID();
  
  return {
    id: randomUUID(),
    agent_name,
    label,
    description,
    version: "1.0",
    documentationUrl: "",
    jurisdiction: "USA",
    provider: {
      name: "NANDA",
      url: "https://projectnanda.org",
      did: ""
    },
    endpoints: {
      static: endpointsStatic,
      adaptive_resolver: { url: "", policies: [] }
    },
    capabilities: {
      modalities: ["text"],
      streaming: false,
      batch: false,
      authentication: { methods: [], requiredScopes: [] }
    },
    skills: [{
      id: "chat",
      description: "personal AI agent and chatbot",
      inputModes: ["text"],
      outputModes: ["text"],
      supportedLanguages: ["en"]
    }],
    evaluations: {
      performanceScore: 0,
      availability90d: "",
      lastAudited: "",
      auditTrail: "",
      auditorID: ""
    },
    telemetry: {
      enabled: false,
      retention: "7d",
      sampling: 0.1,
      metrics: {
        latency_p95_ms: 0,
        throughput_rps: 0,
        error_rate: 0,
        availability: ""
      }
    },
    certification: {
      level: "verified",
      issuer: "NANDA",
      issuanceDate,
      expirationDate
    },
    username,
    email,
    created_at: issuedAt,
    updated_at: issuedAt,
    walletId,
    serviceCharge // points (not minor units)
  };
}

// One payer agent (Claude Desktop)
const payer = agentDoc({
  agent_name: 'claude-desktop',
  label: 'payer',
  description: 'Claude Desktop (Payer)',
  serviceCharge: 10,
  endpointsStatic: ['mcp://claude-desktop'],
  username: 'claude-desktop',
  email: 'claude@anthropic.com'
});

// System agent for x402-NP payments
const systemAgent = agentDoc({
  agent_name: 'system',
  label: 'system',
  description: 'System payment recipient for x402-NP',
  serviceCharge: 0,
  endpointsStatic: [],
  username: 'system',
  email: 'system@nanda.org'
});

// 10 other agents with different "capabilities" (encoded via name/label)
const capabilityAgents = [
  { key: 'search',        name: 'Search Agent',        label: 'search',        description: 'Search Agent' },
  { key: 'summarize',     name: 'Summarization Agent', label: 'summarize',     description: 'Summarization Agent' },
  { key: 'extract',       name: 'Extraction Agent',    label: 'extract',       description: 'Extraction Agent' },
  { key: 'classify',      name: 'Classification Agent',label: 'classify',      description: 'Classification Agent' },
  { key: 'translate',     name: 'Translation Agent',   label: 'translate',     description: 'Translation Agent' },
  { key: 'vector',        name: 'Vector Store Agent',  label: 'vector-store',  description: 'Vector Store Agent' },
  { key: 'ocr',           name: 'OCR Agent',           label: 'ocr',           description: 'OCR Agent' },
  { key: 'web',           name: 'Web Browse Agent',    label: 'web-browse',    description: 'Web Browse Agent' },
  { key: 'sql',           name: 'SQL Runner Agent',    label: 'sql-runner',    description: 'SQL Runner Agent' },
  { key: 'image-caption', name: 'Image Caption Agent', label: 'image-caption', description: 'Image Caption Agent' }
].map(({ key, name, label, description }) =>
  agentDoc({
    agent_name: `${key}-agent`,
    label,
    description,
    serviceCharge: 10,
    endpointsStatic: [`https://agents.example.com/${key}`],
    username: `${key}-agent`,
    email: `${key}@example.com`
  })
);

const ALL_AGENTS = [payer, systemAgent, ...capabilityAgents];

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const Agents = db.collection('agents');
  const Wallets = db.collection('wallets');

  // Indexes (idempotent)
  await Promise.all([
    Agents.createIndex({ agent_name: 1 }, { unique: true }),
    Agents.createIndex({ walletId: 1 }, { unique: true, sparse: true }),
    Wallets.createIndex({ walletId: 1 }, { unique: true }),
    Wallets.createIndex({ agent_name: 1 }, { unique: true })
  ]);

  const results = [];
  for (const a of ALL_AGENTS) {
    // Insert agent facts only if new; do nothing if the agent already exists
    const agentRes = await Agents.updateOne(
      { agent_name: a.agent_name },
      { $setOnInsert: a },
      { upsert: true }
    );

    // Ensure wallet exists and is seeded with 1000 NP (minor units since NP_SCALE=0)
    const now = nowIso();
    await Wallets.updateOne(
      { agent_name: a.agent_name },
      {
        $setOnInsert: {
          walletId: a.walletId,
          agent_name: a.agent_name,
          currency: NP_CURRENCY,
          scale: NP_SCALE,
          balanceMinor: DEFAULT_POINTS,
          createdAt: now,
          updatedAt: now
        }
      },
      { upsert: true }
    );

    results.push({ agent_name: a.agent_name, upserted: !!agentRes.upsertedId });
  }

  // Summarize
  const countAgents = await Agents.countDocuments({ agent_name: { $in: ALL_AGENTS.map(a => a.agent_name) } });
  const countWallets = await Wallets.countDocuments({ agent_name: { $in: ALL_AGENTS.map(a => a.agent_name) } });

  console.log(JSON.stringify({
    seededAgents: countAgents,
    seededWallets: countWallets,
    agent_names: ALL_AGENTS.map(a => a.agent_name)
  }, null, 2));

  await client.close();
}

main().catch(err => {
  console.error('[seed] error:', err);
  process.exit(1);
});
