# NEXUS — One App. Every Connection.

NEXUS is a next-generation multi-module super-app platform that consolidates commerce, digital wallets, real-time messaging, ride-hailing, food delivery, location mapping, and model-agnostic AI.

This repository is organized as a clean monorepo containing decoupled, strictly bound modules designed for local development and future production microservices scaling.

---

## 📂 Repository Structure

```
nexus-monorepo/
├── apps/
│   ├── backend/           # NestJS Gateway & Modular Domain Monolith API
│   ├── mobile/            # Simulated High-Fidelity Mobile Web Client (React/Vite)
│   └── admin/             # Platform Analytics & Control Portal (React/Vite)
├── packages/
│   ├── shared/            # Common Zod validation schemas, interfaces & enums
│   └── database/          # Prisma ORM client with local SQLite migrations & seed
├── docs/                  # Architecture & engineering documentation
├── package.json           # Root workspaces configuration
└── tsconfig.json          # Shared TypeScript settings
```

---

## 🛠 Technology Stack

- **Backend Gateway**: NestJS, TypeScript, JWT (session management, role-switching)
- **Database Engine**: Prisma ORM, SQLite (local development), PostgreSQL-compatible schema
- **NoSQL Store**: MongoDB (Messaging storage)
- **Frontend Clients**: React, Vite, TypeScript, Lucide Icons, Custom CSS variables (Dark Theme)
- **Testing Suite**: Jest, ts-jest

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **NPM**: `v10.x` or higher
- **MongoDB**: Ensure the MongoDB service is running on `mongodb://localhost:27017` (used for chat metadata in Phase 4).

### 2. Installation
From the repository root, install dependencies and link workspaces:
```bash
npm install
```

### 3. Database Initialization & Seed
Generate the Prisma client and push the schema to the local SQLite database (`nexus.db`):
```bash
npm run build --workspace=packages/shared
npx prisma db push --schema=packages/database/prisma/schema.prisma
```
Seed the database with default test users, categories, products, and wallets:
```bash
npx ts-node -r dotenv/config packages/database/src/seed.ts
```

### 4. Running the Applications
Run backend and frontends in dev mode simultaneously or individually:
- **Backend API Gateway (Port 3000)**: `npm run dev:backend`
- **Mobile Simulator Portal (Port 3001)**: `npm run dev:mobile`
- **Admin Analytics Portal (Port 3002)**: `npm run dev:admin`

### 5. Running Tests
Run the unit test suite:
```bash
npm run test
```

---

## 👤 Seed Test Accounts

The database is pre-seeded with accounts (default password is **`NexusPass123!`**). You can use these to test the register/login and role-switching flows:

- **Platform Admin**: `admin@nexus.com` (Roles: `ADMIN`, `SUPER_ADMIN`, `CONSUMER`)
- **Alice Consumer**: `consumer@nexus.com` (Role: `CONSUMER`)
- **Bob Seller**: `seller@nexus.com` (Roles: `SELLER`, `CONSUMER`)
- **Charlie Driver**: `driver@nexus.com` (Roles: `DRIVER`, `CONSUMER`)
- **David Restaurant Owner**: `restaurant@nexus.com` (Roles: `RESTAURANT`, `CONSUMER`)
