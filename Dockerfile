# Multi-stage build: compile the client (Vite/React) separately, then ship
# only the production server + built static assets in the final image.
# Explicit Dockerfile (instead of Railway's Railpack/Nixpacks auto-builders)
# so build steps are fully under our control — no auto-detected "build
# secrets" requirement for runtime-only env vars like GEMINI_API_KEY.

# ---- Stage 1: build the client ----
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: production server ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./

# bcrypt falls back to compiling a native binary (node-gyp) when no prebuilt
# matches the target platform/Node ABI; the toolchain is installed, used by
# `npm ci`, and purged within this single layer so it never ends up in the
# final image (splitting this across separate RUN layers would not — Docker
# layers are additive, a later layer can't shrink an earlier one).
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 5000
CMD ["node", "server/app.js"]
