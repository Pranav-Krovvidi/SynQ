# =============================================================
# SynQ UI — Multi-stage Dockerfile
#
# Stages
#   development  — hot-reload dev server  (node:20-alpine)
#   builder      — production build
#   production   — minimal nginx/node runtime
# =============================================================

# ── Development ───────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-p", "3000", "--hostname", "0.0.0.0"]

# ── Builder ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build args injected at image build time for production deployments
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_DEMO_PROJECT_ID
ARG NEXT_PUBLIC_PAYMENT_SERVICE_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_DEMO_PROJECT_ID=$NEXT_PUBLIC_DEMO_PROJECT_ID
ENV NEXT_PUBLIC_PAYMENT_SERVICE_ID=$NEXT_PUBLIC_PAYMENT_SERVICE_ID
RUN npm run build

# ── Production ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
