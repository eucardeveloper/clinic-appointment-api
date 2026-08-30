# Clinic Appointment API

A production-grade REST API for managing clinic appointments, built with **Spring Boot 3**, **Java 21**, and **PostgreSQL**.

---

## Architecture Decision: Why Monolith?

This project is intentionally built as a **monolith**, not a microservice.

A microservice split (separate services for appointments, users, notifications) would introduce:
- Distributed transaction complexity (2PC / Saga pattern)
- Network latency between services
- Operational overhead (multiple deployments, service discovery)

For a clinic with a single domain and a small team, a well-structured monolith delivers faster development, easier debugging, and simpler deployment — without sacrificing code quality. Kafka and event streaming are **not added** because there is no genuine async boundary in this domain. Adding them would be complexity theater, not engineering maturity.

*If the system grows to >5 bounded contexts or requires independent scaling of specific features, extract then — not before.*

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Backend     | Spring Boot 3.5, Java 21            |
| Database    | PostgreSQL 16                       |
| Migrations  | Flyway                              |
| Security    | Spring Security + JWT (httpOnly cookie / BFF pattern) |
| Docs        | Springdoc OpenAPI / Swagger UI      |
| Tests       | JUnit 5, Mockito                    |
| CI/CD       | GitHub Actions                      |
| Container   | Docker, Docker Compose              |

---

## State Machine

```
PENDING ──→ CONFIRMED ──→ COMPLETED
   │              │
   └──→ CANCELLED └──→ CANCELLED
                  │
                  └──→ NO_SHOW
```

- Only **ADMIN** and **DOCTOR** roles may trigger transitions
- Backend returns `allowedTransitions` in every response — frontend uses this to enable/disable buttons (no hardcoding on the UI side)
- Illegal transitions return `409 Conflict` with RFC 7807 ProblemDetail

---

## Roles & Permissions

| Endpoint                          | PATIENT | DOCTOR | ADMIN |
|-----------------------------------|---------|--------|-------|
| GET /api/appointments             | ✅      | ✅     | ✅    |
| GET /api/appointments/search      | ✅      | ✅     | ✅    |
| POST /api/appointments            | ✅      | ✅     | ✅    |
| PUT /api/appointments/{id}        | ✅      | ✅     | ✅    |
| PATCH /api/appointments/{id}/status | ❌    | ✅     | ✅    |
| DELETE /api/appointments/{id}     | ❌      | ❌     | ✅    |

---

## DSGVO / GDPR Note

Patient appointment data qualifies as **health data under Art. 9 GDPR** (sensitive personal data).

Measures implemented:
- Passwords stored as BCrypt hashes (never plaintext)
- JWT in httpOnly cookie — not accessible to JavaScript (XSS protection)
- `.env` files excluded from version control via `.gitignore`

In production, additionally consider: audit logging, data retention policies, right-to-erasure endpoint.

---

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Java 21 (for local development without Docker)

### Run with Docker Compose

```bash
docker-compose up -d
```

API: `http://localhost:8084`
Swagger UI: `http://localhost:8084/swagger-ui/index.html`

### Environment Variables

| Variable              | Default                         | Description              |
|-----------------------|---------------------------------|--------------------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5437/clinic_db` | PostgreSQL URL |
| `PGUSER`              | `postgres`                      | DB username              |
| `PGPASSWORD`          | `postgres123`                   | DB password              |
| `JWT_SECRET`          | *(change in production!)*       | Min 32 chars             |
| `PORT`                | `8084`                          | Server port              |

### Default Users (seed data)

| Username   | Password    | Role          |
|------------|-------------|---------------|
| admin      | admin123    | ROLE_ADMIN    |
| dr.weber   | doctor123   | ROLE_DOCTOR   |
| mueller    | patient123  | ROLE_PATIENT  |

---

## API Overview

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/appointments
GET    /api/appointments/search?status=PENDING&doctorName=weber&page=0&size=10
GET    /api/appointments/{id}
POST   /api/appointments
PUT    /api/appointments/{id}
PATCH  /api/appointments/{id}/status
DELETE /api/appointments/{id}
```

---

## Running Tests

```bash
./mvnw test
```

---

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project → "Deploy from GitHub repo"
3. Add PostgreSQL plugin
4. Set environment variables: `SPRING_DATASOURCE_URL`, `PGUSER`, `PGPASSWORD`, `JWT_SECRET`
5. Railway auto-detects Dockerfile and builds on every push to `main`

---

## Frontend (Next.js 15)

| Feature | Details |
|---|---|
| Stack | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Auth | JWT via httpOnly cookie — BFF proxy pattern (no CORS, no localStorage) |
| Role routing | `/admin` → Admin dashboard · `/doctor` → Doctor portal · `/patient` → Patient wizard |
| State | TanStack Query v5 (optimistic updates) |
| Forms | React Hook Form + Zod (field-level validation) |
| Table | TanStack Table (sorting, filtering, pagination) |
| UX | Ctrl+K command palette · skeleton loading · 409 conflict → alternative slots |
| i18n | English / Deutsch / Türkçe |
| a11y | WCAG 2.1 AA — aria-label, aria-live, keyboard navigation |
| Theme | Dark / Light mode (next-themes) |

### Run Frontend

```bash
cd frontend/clinic-app
npm install
npm run dev        # http://localhost:3000
```

Or with Docker Compose (recommended — runs backend + frontend + DB together):

```bash
docker compose up -d
```

Frontend: `http://localhost:3000`

---

## Testing Strategy

```
Unit tests      → JUnit 5 + Mockito  (AppointmentService, state machine logic)
Integration     → Testcontainers + real PostgreSQL 16-alpine (no H2 mocks)
CI              → GitHub Actions (build → test → Docker build on main)
```

Testcontainers spins up a real PostgreSQL container per test run — no mocked database, no false confidence from H2 dialect differences.

---

## Architecture Diagram

```
Browser
  │
  ▼
Next.js (port 3000)          ← BFF layer
  │  Route Handlers (/api/*)
  │  Reads httpOnly cookie
  │  Forwards to backend
  ▼
Spring Boot (port 8084)
  │  Spring Security (JWT filter)
  │  @PreAuthorize (ADMIN/DOCTOR/PATIENT)
  │  Service layer (state machine, conflict detection)
  ▼
PostgreSQL 16 (port 5437)
  │  Flyway migrations (V1–V5)
  │  appointment + app_user tables
```

No direct browser → backend calls. All requests go through Next.js Route Handlers, which attach the cookie automatically. This eliminates CORS and keeps the JWT off the client.
