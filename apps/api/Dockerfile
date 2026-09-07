FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN npm ci --workspace=api --include-workspace-root

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY apps/api/ ./apps/api/
RUN npx --workspace=api prisma generate
RUN npm run build --workspace=api

# ── production ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
RUN npm ci --workspace=api --include-workspace-root --omit=dev

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
