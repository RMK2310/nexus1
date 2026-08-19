# NEXUS API Design Specification

## 1. REST Standards & Versioning
All public HTTP API endpoints are versioned and prefixed:
```
http://localhost:3000/api/v1
```

### Standard Response Schema
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "..."
    }
  }
}
```

### Standard Error Schema
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient wallet balance",
    "request_id": "req-9a8b7c"
  }
}
```

---

## 2. API Gateways & Swagger Spec
NEXUS automatically generates OpenAPI 3.0 documentation using NestJS Swagger integration.
- **Local documentation path**: `http://localhost:3000/api/docs`

---

## 3. WebSocket Realtime Namespace
WebSockets handle real-time modules (messaging, locations, delivery states).
- **Messaging Namespace**: `/ws/chat`
- **Mobility/Rides Namespace**: `/ws/mobility`
- **Food Delivery Namespace**: `/ws/food`
