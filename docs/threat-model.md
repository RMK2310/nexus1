# NEXUS Security Threat Model

## STRIDE Vulnerability Analysis

| STRIDE Category | Threat Detail | Mitigation Implementation |
| :--- | :--- | :--- |
| **Spoofing (Identity)** | User steals another session's token or hijacks active role context. | Token signature uses HS256 with rotation (RTR) on HttpOnly cookies. Active role context requires DB-level profile checks. |
| **Tampering (Data)** | Client sends pre-calculated cart price or wallet balance updates. | Price and wallet calculations are strictly validated server-side. Transaction entries in the double-entry ledger are immutable. |
| **Repudiation** | User denies performing a financial wallet transfer. | System records audit logs linked to transaction references (`LedgerTransaction` and `AuditLog` tables). |
| **Information Disclosure** | Server logs leak private E2EE conversation messages. | The server stores only ciphertext (Signal Protocol pre-keys). Plaintext is decrypted on the client. |
| **Denial of Service** | Bot floods auth gateway, triggering database lock exhaustion. | Standard NestJS Throttler/Rate Limiter (locally configured in Memory, Redis-ready for production). |
| **Elevation of Privilege** | Normal user accesses `/api/v1/admin/audit` by manipulation. | RolesGuard checks user profile settings. Switches to high-level roles require re-authorization. |
