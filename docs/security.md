# NEXUS Security Architecture

## 1. Authentication Standards
- **Access Tokens**: Short-lived (15 minutes) stateless JWTs containing userId, email, list of roles, and the active session role.
- **Refresh Tokens**: Long-lived (7 days) stateful tokens stored in secure, HttpOnly, SameSite=Strict cookies to mitigate XSS and CSRF risks.
- **Refresh Token Rotation (RTR)**: Each session refresh revokes the old refresh token and issues a new pair. If a reuse is detected (indicating token theft), all active sessions for that user are immediately revoked.

---

## 2. Password Hashing & Encryption
- NEXUS uses Node.js's native `crypto.scrypt` hashing algorithm with a random 16-byte salt and timing-safe equal comparison.
- Password hashes are stored in the format `${hashedPassword}.${salt}`.

---

## 3. End-to-End Encryption (E2EE) Chat Architecture
To protect user conversations, chat payloads use the **Signal Protocol** design:
1. **Device Keys**: Users publish cryptographic identity pre-keys, signed pre-keys, and one-time pre-keys to the database (`DeviceKey` table) during signup/device registration.
2. **Ciphertext Storage**: The server stores only base64-encoded ciphertext, nonces, and sender key tags. Plaintext messages are decrypted client-side and never logged or cached on the server.
3. **Key Exchange**: The server acts as a key distribution center, facilitating initial double-ratchet key setup.
