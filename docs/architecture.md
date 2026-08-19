# NEXUS System Architecture

## 1. Architectural Philosophy
NEXUS uses a **Modular Monolith** architecture for local development and initial deployments. This keeps operations simple while enforcing strict separation of domain boundaries.

```
CLIENTS (Mobile, Web Portals)
   │
   ▼
[ NestJS API Gateway / BFF ]
   │
   ├── [ Identity / Session Module ]  ──► SQLite (Postgres schema)
   ├── [ Commerce / Catalog Module ]   ──► SQLite
   ├── [ Payments / Wallet Module ]   ──► SQLite (Double-entry Ledger)
   ├── [ Ride-Hailing Module ]        ──► SQLite + In-Memory Redis
   ├── [ Food Delivery Module ]       ──► SQLite
   └── [ AI Orchestrator Module ]     ──► LLM Gateway (Gemini, OpenAI, Claude)
```

### Strategic Domain Boundaries
- Each domain operates as an isolated NestJS Module.
- Direct database cross-joins between modules are strictly forbidden. Reference keys (e.g., `userId`, `productId`) are stored, but queries are resolved programmatically.
- This allows any NestJS module to be extracted into a separate, independent microservice running in its own container, placed behind the API Gateway without rewriting core business logic.

---

## 2. Shared Common Core Services

### Identity & RBAC Session Control
- Global authentication handles token generation, rotation, and role validation.
- Safe role-switching allows a single logged-in session to dynamically toggle its operational persona (e.g., Consumer ◄► Driver) while maintaining strict resource access control.

### Wallet & Ledger System
- Wallet mutations must execute through double-entry ledger transactions to guarantee audit integrity and prevent race conditions.

### Location & Maps Provider Interface
- A unified geofencing and routing interface abstracts external map vendors (Google Maps, OpenStreetMap).

### Model-Agnostic AI Gateway
- Evaluates task complexity, latencies, and costs to dynamically route LLM requests (OpenAI, Claude, Gemini) with automated failover handling.
