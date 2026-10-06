# Design decisions — Clinic Appointment API

| Concern | Decision | Why / trade-off |
|---|---|---|
| Double booking | Doctor row locked with `PESSIMISTIC_WRITE` during booking **and** a PostgreSQL `btree_gist` `EXCLUDE` constraint on (doctor, time range) | The lock gives clean 409 errors in the normal path; the constraint is the last line of defence if code is bypassed. Trade-off: serialises bookings per doctor, which is fine at clinic scale. |
| Authentication | JWT in an HttpOnly, SameSite=Strict, Secure cookie | Not readable by JavaScript, so XSS cannot steal it. |
| CSRF | `OriginCheckFilter` rejects state-changing requests with a foreign `Origin` | Simple, stateless; works with SameSite cookies. |
| Anonymous requests | `HttpStatusEntryPoint(401)` | Spring's default would answer 403, which hides the difference between "not logged in" and "not allowed". |
| Roles | URL rules in `SecurityConfig` plus `@PreAuthorize` | Two layers; a missing annotation does not open an endpoint. |
| Object-level access (IDOR) | `AppointmentAccessPolicy`: patients see only their own appointments, doctors only theirs, admins all. Foreign ids answer **404**, not 403 | 404 does not reveal that the id exists. `patientUsername` is forced server-side on create/update so it cannot be spoofed. |
| Listing | Page size capped at 100, sort fields whitelisted | Prevents expensive queries and sort-injection. |
| Schema | Flyway migrations, Hibernate `ddl-auto=validate` | The schema is reviewed code, not generated at runtime. |
| Tests | `ApiAuthorizationTest` runs against a real PostgreSQL (Testcontainers) with the real Flyway migrations | An H2 test would not exercise the `EXCLUDE` constraint. |
| Persistence | Named Docker volume, `restart: unless-stopped` | Data survives reboot; only `docker compose down -v` deletes it. |

## Known limitations
- Seed accounts live in the regular migrations (convenient for demos; a production deployment would move them to a demo-only location).
- Rate limiting is per instance (in memory).
