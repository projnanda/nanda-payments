import { config } from "dotenv";
import express from "express";
import { npPaymentMiddleware } from "x402-nanda-shared";

config();

const facilitatorUrl = process.env.FACILITATOR_URL || "http://localhost:3001";
const payTo = process.env.ADDRESS || "system"; // Agent name instead of blockchain address

if (!facilitatorUrl || !payTo) {
  console.error("Missing required environment variables: FACILITATOR_URL, ADDRESS");
  process.exit(1);
}

const app = express();

// Apply NANDA Points payment middleware
app.use(
  npPaymentMiddleware(
    {
      "/premium/*": {
        priceNP: 10, // 10 NANDA Points for premium content
        recipient: payTo,
        description: "Access to premium content",
        maxTimeoutSeconds: 60,
      },
    },
    facilitatorUrl
  )
);

// Free endpoint (no payment required)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    server: "x402-nanda-express",
    version: "1.0.0",
    facilitator: facilitatorUrl,
  });
});

// Free endpoint (no payment required)
app.get("/weather", (req, res) => {
  res.json({
    report: {
      weather: "sunny",
      temperature: 72,
      location: "San Francisco",
      timestamp: new Date().toISOString(),
    },
    cost: "Free",
    message: "Weather data accessed for free!",
  });
});

// Premium paid endpoint - requires 10 NP
app.get("/premium/content", (req, res) => {
  res.json({
    content: "This is premium content available for 10 NANDA Points",
    features: [
      "Advanced analytics",
      "Real-time updates",
      "Priority support",
      "Extended API limits",
    ],
    cost: "10 NP",
    message: "Premium content accessed successfully!",
  });
});

// Another premium endpoint with different content
app.get("/premium/analysis", (req, res) => {
  res.json({
    analysis: {
      insights: [
        "Market trends indicate growth",
        "User engagement up 25%",
        "Revenue projections look positive",
      ],
      confidence: 0.92,
      generated_at: new Date().toISOString(),
    },
    cost: "10 NP",
    message: "Advanced analysis completed using NANDA Points!",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 x402 NANDA Points Express Server running at http://localhost:${PORT}`);
  console.log(`🏦 Using facilitator: ${facilitatorUrl}`);
  console.log(`💰 Payment recipient: ${payTo}`);
  console.log("");
  console.log("📡 Endpoints:");
  console.log(`   GET  /health           - Free health check`);
  console.log(`   GET  /weather          - Free weather data`);
  console.log(`   GET  /premium/content  - Premium content (10 NP)`);
  console.log(`   GET  /premium/analysis - Premium analysis (10 NP)`);
  console.log("");
  console.log("🔧 Test with curl:");
  console.log(`   curl http://localhost:${PORT}/weather`);
  console.log("   (Free endpoint, returns weather data)");
});

export { app };
