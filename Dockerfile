# ----------------------------------------------------
# Stage 1: Build React SPA Frontend
# ----------------------------------------------------
FROM node:26-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build && cp -r public/* dist/ 2>/dev/null || true

# ----------------------------------------------------
# Stage 2: Build Node.js TypeScript Backend
# ----------------------------------------------------
FROM node:26-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json server/tsconfig.json ./
RUN npm ci

COPY server/src ./src
RUN npm run build && mkdir -p dist/db && cp src/db/schema.sql dist/db/schema.sql

# ----------------------------------------------------
# Stage 3: Unified Production Runtime Container
# ----------------------------------------------------
FROM node:26-alpine AS runner

# Install runtime dependencies for thumbnail & media processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install production dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./dist

# Copy compiled frontend assets
COPY --from=client-builder /app/client/dist ./client-dist

# Create uploads & backups directories
RUN mkdir -p /app/uploads/thumbnails /app/backups

# Set production environment defaults
ENV NODE_ENV=production     PORT=3000     CLIENT_DIST_DIR=/app/client-dist     UPLOAD_DIR=/app/uploads

EXPOSE 3000

VOLUME ["/app/uploads", "/app/backups"]

CMD ["node", "dist/index.js"]
