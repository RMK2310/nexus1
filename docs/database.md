# NEXUS Database System Design

## 1. Schema Storage Strategy

NEXUS uses a hybrid database strategy:
- **Relational SQL Database**: Used for transactional states (users, roles, catalog, inventory, wallets, rides, orders, audit logs). Locally simulated using **SQLite**, written using database-agnostic **Prisma ORM**, ready for **PostgreSQL** in production.
- **NoSQL Document Database**: Used for E2EE chat messages, receipts, and high-frequency stream metadata. Handled using **MongoDB**.
- **In-Memory Cache & Spatial Store**: Used for driver geospatial lookups, rate limiting, and temporary inventory locks. Handled using **Redis**.

---

## 2. Double-Entry Wallet Ledger Design
Balance updates must never use simple mathematical increments (`balance = balance + amount`). Wallet accounts are mutated through **immutable ledger entries** linked to a single transaction reference.

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     LedgerTransaction                       │
   │  - referenceId: UUID                                        │
   │  - description: "P2P Transfer consumer to seller"           │
   └──────────────┬───────────────────────────────┬──────────────┘
                  │                               │
                  ▼                               ▼
       ┌─────────────────────┐         ┌─────────────────────┐
       │     LedgerEntry     │         │     LedgerEntry     │
       │  - type: DEBIT      │         │  - type: CREDIT     │
       │  - amount: 500      │         │  - amount: 500      │
       │  - accountId: Alice │         │  - accountId: Bob   │
       └─────────────────────┘         └─────────────────────┘
```

### Integrity Rules
1. **Zero-Sum Balance**: The sum of all credits minus debits for any single transaction must always equal zero.
2. **Immutability**: Entries are append-only. To undo an operation, a separate reversing transaction must be committed.
3. **Optimistic Locking**: Inventory and wallet balance writes use version locks to prevent race conditions during high-volume sales.
