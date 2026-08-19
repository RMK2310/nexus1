# NEXUS Deployment Guide

## 1. Local Run Environments
- **Development**: Run apps directly via npm workspaces:
  ```bash
  npm run dev:backend
  npm run dev:mobile
  npm run dev:admin
  ```
- **Staging / Production**: Compile assets and bundle Node:
  ```bash
  npm run build
  npm start
  ```

---

## 2. Docker Configuration Templates
Each application and package can be dockerized.
- **apps/backend Dockerfile**: Configured for multi-stage building.
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/src/main"]
```

---

## 3. Environment Variable Security
- `.env` files must be ignored from Git tracking.
- Local values use mock values; staging/production use secure vaults (Vault, AWS Secrets Manager, GitHub secrets).
