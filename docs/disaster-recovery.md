# NEXUS Disaster Recovery Plan

## 1. High Availability Architecture
- **Stateless Gateways**: Backend NestJS server runs inside load-balanced clusters. If a node fails, traffic redirects automatically.
- **Relational Replicas**: PostgreSQL production configuration uses primary-secondary replication. Read requests distribute to replicas; write operations failover to secondary nodes.

---

## 2. Backup Strategy
- **Prisma SQL backups**: Automated daily snapshots (stored in S3-compatible cold storage).
- **Point-in-Time Recovery (PITR)**: Production databases run Write-Ahead Logging (WAL) archivers, allowing recovery to exact timestamps in case of corruption.
- **Ledger Audits**: Reconciliation scripts run hourly to verify that sum(Credits) - sum(Debits) === 0 across all wallets.
