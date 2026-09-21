# ============================================================
# FreshMarket - Dockerfile (multi-stage)
# ============================================================

# ---------- Stage 1: Build React frontend ----------
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy package files
COPY client/package.json client/package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy source & build
COPY client/ ./
RUN npm run build

# ---------- Stage 2: Install server dependencies ----------
FROM node:20-alpine AS server-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Stage 3: Runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy server code + node_modules
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built React static from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (Zeabur akan set PORT sendiri via env)
EXPOSE 5000

# Health check (opsional, Zeabur akan pakai /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-5000}/api/health || exit 1

CMD ["node", "server/index.js"]
