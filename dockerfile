FROM oven/bun:1 AS builder
  ENV DO_NOT_TRACK=1

  WORKDIR /app

  COPY package.json bun.lockb .
  RUN bun install

  COPY . .
  ENV NODE_ENV=production
  RUN bun build --outfile ./dist/xentom --compile ./src/index.ts

FROM debian:stable-slim AS runner
  WORKDIR /app

  RUN addgroup --system --gid 1001 xentom
  RUN adduser --system --uid 1001 xentom
  
  COPY --from=builder --chown=xentom:xentom /app/dist/xentom .

  USER xentom

  ENV DO_NOT_TRACK=1
  ENV NODE_ENV=production
  ENTRYPOINT ["./xentom"]
