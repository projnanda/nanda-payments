
// === Agent Facts ===
// Based on the provided agent format with serviceCharge added
export interface AgentFacts {
  _id?: string; // registry id (e.g., "agt_8f21c9"); Mongo may also supply ObjectId if omitted
  id: string; // unique agent identifier
  agent_name: string;
  label: string;
  description: string;
  version: string;
  documentationUrl: string;
  jurisdiction: string;
  provider: {
    name: string;
    url: string;
    did: string;
  };
  endpoints: {
    static: string[];
    adaptive_resolver: {
      url: string;
      policies: any[];
    };
  };
  capabilities: {
    modalities: string[];
    streaming: boolean;
    batch: boolean;
    authentication: {
      methods: any[];
      requiredScopes: any[];
    };
  };
  skills: Array<{
    id: string;
    description: string;
    inputModes: string[];
    outputModes: string[];
    supportedLanguages: string[];
  }>;
  evaluations: {
    performanceScore: number;
    availability90d: string;
    lastAudited: string;
    auditTrail: string;
    auditorID: string;
  };
  telemetry: {
    enabled: boolean;
    retention: string;
    sampling: number;
    metrics: {
      latency_p95_ms: number;
      throughput_rps: number;
      error_rate: number;
      availability: string;
    };
  };
  certification: {
    level: string;
    issuer: string;
    issuanceDate: string;
    expirationDate: string;
  };
  username: string;
  email: string;
  created_at: string; // ISO
  updated_at: string; // ISO

  // Added: wallet ID and service charge
  walletId?: string; // unique wallet identifier
  serviceCharge?: number; // default 10 NP, in POINTS (not minor units)
}
