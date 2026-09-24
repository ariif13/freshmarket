# ============================================================
# FreshMarket - Dockerfile (multi-stage)
# ============================================================

# ---------- Stage 1: Build React frontend ----------
FROM node:22-slim AS client-builder

WORKDIR /app/client

# Pastikan devDependencies terinstall untuk proses build frontend
ENV NODE_ENV=development

# Copy package files
COPY client/package.json client/package-lock.json* ./
RUN npm ci --include=dev --no-audit --no-fund

# Copy source & build
COPY client/ ./
RUN npm run build

# ---------- Stage 2: Install server dependencies ----------
FROM node:22-slim AS server-deps

WORKDIR /app/server

ENV NODE_ENV=production

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Stage 3: Runtime ----------
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy server code + node_modules
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/

# Copy built React static from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (Zeabur akan set PORT sendiri via env)
EXPOSE 5000

# Health check menggunakan Node.js built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
