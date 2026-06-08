FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN groupadd -g 1001 -r nodejs && useradd -r -u 1001 -g nodejs nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "until npx prisma migrate deploy; do echo 'Migration retrying in 5s...'; sleep 5; done && exec node src/index.js"]
