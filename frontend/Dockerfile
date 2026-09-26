# ============================================================
# Stage 1: development
# Runs the Vite dev server with hot-reload.
# Used by docker-compose.yml.
# ============================================================
FROM node:20-alpine AS development

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
# Source is volume-mounted at runtime
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ============================================================
# Stage 2: build
# Produces a static production build.
# Output is copied to Vercel via CI, not Docker.
# ============================================================
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build


# ============================================================
# Stage 3: production preview (optional — for local prod test)
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json .
RUN npm install --omit=dev
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
