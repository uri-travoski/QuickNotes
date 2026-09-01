FROM node:26-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:26-alpine AS runner

RUN apk add --no-cache ffmpeg

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./dist/db/schema.sql

RUN mkdir -p uploads/thumbnails

EXPOSE 5000

CMD ["node", "dist/index.js"]
