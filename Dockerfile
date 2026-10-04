# Multi-stage Dockerfile for NEXUS Monorepo Backend on Render
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies including devDependencies for compilation
RUN npm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/backend ./apps/backend
COPY nexus.db ./nexus.db

# Build packages and backend
RUN npm run build --workspace=packages/shared
RUN cd packages/database && npx prisma generate && npm run build
RUN npm run build --workspace=apps/backend

# Stage 2: Minimal Production Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/database/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/public ./apps/backend/public
COPY --from=builder /app/nexus.db ./nexus.db

EXPOSE 10000

CMD ["node", "apps/backend/dist/src/main.js"]
