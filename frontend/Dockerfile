# =============================================================================
# Genba Management System — Frontend Dockerfile (Multi-Stage)
# Follows TEST§3.2 standalone Next.js output pattern
# =============================================================================

# Stage 1: Dependencies — install npm packages
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install exact dependencies from lockfile
RUN npm ci --frozen-lockfile


# -------------------------------------------------------------------
# Stage 2: Development — hot reload with Next.js dev server
# -------------------------------------------------------------------
FROM node:20-alpine AS dev

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "run", "dev"]


# -------------------------------------------------------------------
# Stage 3: Builder — production build
# -------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application (standalone output for smaller image)
RUN npm run build


# -------------------------------------------------------------------
# Stage 4: Runner — minimal production image
# Uses Next.js standalone output mode (configured in next.config.ts)
# -------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public

# Set proper permissions on .next directory
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
