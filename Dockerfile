# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy all source
COPY . .

# Build: vite (frontend) + esbuild (server) → dist/
RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Production deps only
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/taxonomy > /dev/null || exit 1

CMD ["node", "dist/index.cjs"]
