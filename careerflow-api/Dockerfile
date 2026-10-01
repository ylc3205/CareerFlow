# ==========================================
# Stage 1: Production Dependencies Builder
# ==========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package manifests only for optimal layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# ==========================================
# Stage 2: Minimal Production Runner
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

# Prepare local storage directory with non-root ownership
RUN mkdir -p /app/.storage && chown -R node:node /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

# Run under unprivileged user
USER node

EXPOSE 5000

# Native health check against readiness probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/ready || exit 1

CMD ["node", "src/server.js"]
