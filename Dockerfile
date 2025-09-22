# ---------- Builder ----------
FROM node:20-alpine AS builder

# Workdir
WORKDIR /app

# Install ALL deps (including dev) so TypeScript can compile
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only the files needed at runtime
COPY package*.json ./
# Install ONLY production deps for a smaller image
RUN npm ci --omit=dev

# Bring over the compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

# If you have any non-TS runtime assets (configs/public files), copy them as needed.
# Example: uncomment if you ship an MCP manifest or static assets at runtime
# COPY --from=builder /app/mcp.json ./mcp.json
# COPY --from=builder /app/public ./public

# Use the pre-created non-root `node` user in the official image
USER node

# Network
EXPOSE 3000 8080

# Environment
ENV NODE_ENV=production
ENV MCP_PORT=3000
ENV API_PORT=8080
ENV HOST=0.0.0.0

# Health check (adjust path if your server exposes a different health route)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the app (expects your package.json start script to run the built server, e.g., `node dist/index.js`)
CMD ["npm", "start"]