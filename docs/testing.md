# NEXUS Testing Framework

## 1. Test Levels
- **Unit Tests**: Focus on business rules, password verification, token issuance, and RBAC guards. Configured using Jest.
  - Command: `npm run test`
- **Integration Tests**: Verify database transactions, Ledger consistency, and checkout workflows.
- **E2E Tests**: Automate workflows (e.g., Register -> Login -> Shop -> Checkout -> Pay).
- **Security Tests**: Validate token lifecycle and IDOR checks.

---

## 2. Load Testing Metrics & SLOs
NEXUS target metrics under test load (using `k6`):
- **API Availability**: `>= 99.9%`
- **Standard API Latency**: `p95 < 300 ms`
- **Realtime Messages Latency**: `p95 < 500 ms`
- **Payment transactions Latency**: `p95 < 800 ms`
- **AI Router Failover Success**: `>= 99%`
