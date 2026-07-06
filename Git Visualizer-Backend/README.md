# Git Visualizer — Backend

Monolithic Spring Boot (Java 21, Spring Boot 3.5.16) content API for the Git Visualizer
educational app. Serves git command explanations, hints, workflow lessons and
visualization graph data to a separately-built React frontend over versioned REST
(`/api/v1/...`). No user accounts; command simulation happens entirely client-side.

## API contract

Seed data and contract live in [`src/main/resources/git-commands-content.json`](src/main/resources/git-commands-content.json)
(a copy of the authoritative file in the repo root). The file is loaded into PostgreSQL
on every startup — the file always wins, so shipping an updated version re-seeds on the
next boot (or immediately via the admin endpoint).

| Endpoint | Returns |
|---|---|
| `GET /api/v1/commands` | `[{ id, title, category, shortExplanation }]` — picker grid. Optional `?category=` filter. |
| `GET /api/v1/commands/{id}` | Full object incl. `syntax[]`, `hints[]`, `howItWorks`, `beforeGraph`, `afterGraph` |
| `GET /api/v1/workflows` | `[{ id, title, description }]` |
| `GET /api/v1/workflows/{id}` | `{ id, title, description, steps[], note }` |
| `POST /api/v1/admin/reseed` | Internal: re-loads the seed file. Requires `X-API-Key` header (disabled if no key configured). |

Interactive OpenAPI/Swagger docs (reflecting these exact shapes): **`/swagger-ui.html`**,
raw spec at **`/v3/api-docs`**.

`beforeGraph`/`afterGraph` are stored as JSON/JSONB columns and passed through opaquely —
their internal shape is owned by the frontend team's visualization design.

## Architecture

```
                   ┌────────────► backend-1 ──┐
client ──► nginx ──┤   least_conn             ├──► PostgreSQL (content)
 :8080             └────────────► backend-2 ──┘
                                     │
                                     └───► Redis (shared rate-limit buckets)
```

- **Stateless**: no sessions; any replica can serve any request.
- **Rate limiting**: IP-based token bucket (Bucket4j) applied globally to `/api/**` as a
  servlet filter. Over-limit → HTTP 429 + `Retry-After` (seconds). In docker the buckets
  live in Redis so the limit holds across the whole pool; local dev/tests fall back to an
  in-process bucket (`RATELIMIT_BACKEND=local`). Actuator health is never throttled.
- **Load balancing**: Nginx `least_conn` across two replicas. Every response carries an
  `X-Instance-Id` header (container hostname) so distribution is verifiable with curl.
- **Security** (no auth by design, still hardened): strict CORS with an explicit origin
  allowlist (never `*`), Bean Validation on all inputs (ids, category filter), JPA
  parameterized queries only, security headers on every response (CSP, X-Frame-Options
  DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy), admin
  endpoint gated by a constant-time-compared API key and disabled entirely when no key
  is set.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/gitviz` | PostgreSQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | `gitviz` / `gitviz` | DB credentials |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis for rate-limit buckets |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated frontend origins |
| `ADMIN_API_KEY` | *(empty → admin endpoints disabled)* | Key for `X-API-Key` header |
| `RATELIMIT_ENABLED` | `true` | Toggle the filter |
| `RATELIMIT_BACKEND` | `local` (`redis` in docker profile) | Bucket storage |
| `RATELIMIT_CAPACITY` | `120` | Bucket size (requests) |
| `RATELIMIT_REFILL_TOKENS` / `RATELIMIT_REFILL_PERIOD_SECONDS` | `120` / `60` | Refill rate |
| `CONTENT_SEED_FILE` | `classpath:git-commands-content.json` | Override with `file:/path/to.json` |
| `NVD_API_KEY` | *(empty)* | Speeds up the OWASP dependency scan enormously — get one free at nvd.nist.gov |

## Verification & test commands (Section 7 — verbatim)

Backend (Spring Boot / Maven) — run from this directory (Git Bash on Windows, or use `mvnw.cmd`):

- Build:                          `./mvnw clean install`
- Unit + integration tests:      `./mvnw test`
- Test coverage report:          `./mvnw test jacoco:report`   (build fails below 70% line coverage during `verify`)
- Dependency vulnerability scan: `./mvnw org.owasp:dependency-check-maven:check`   (fails the build on CVSS >= 7)
- Static code analysis:          `./mvnw spotbugs:check`
- Run locally:                   `./mvnw spring-boot:run`   (needs a local PostgreSQL, see env vars above)
- Seed verification (in-JVM):    part of `./mvnw test` (`SeedVerificationIT` checks every id in git-commands-content.json)
- Seed verification (live API):  `bash scripts/seed-verify.sh`

Full stack / infra:

- Bring up full stack:      `docker-compose up --build`   (`docker compose up --build` on modern Docker)
- Health checks:            `bash scripts/health-check.sh`   (curls `/actuator/health` on each replica — ports 8081/8082 — and the LB)
- Load-balancer sanity:     `bash scripts/lb-check.sh`   (curls Nginx 20× and asserts ≥2 distinct `X-Instance-Id`s)
- Rate-limit verification:  `bash scripts/rate-limit-check.sh`   (rapid-fires requests, asserts 429 + `Retry-After`)
- Security headers check:   `bash scripts/security-headers-check.sh`   (`curl -I`, asserts CSP / X-Frame-Options / X-Content-Type-Options)
- **Everything in one go:** `make verify-all`   (or `bash scripts/verify-all.sh`)

`verify-all` chains build + tests + coverage gate + SpotBugs + OWASP scan, then spins up
docker-compose and runs health, seed, load-balancer, header and rate-limit checks, and
prints a final pass/fail summary table. Options: `SKIP_DEP_CHECK=1` (skip the slow OWASP
scan), `KEEP_STACK=1` (leave containers running).

Ports when the stack is up: Nginx entrypoint **:8080**, replicas directly on **:8081** / **:8082**.

## Dependency security

- All versions pinned exactly in `pom.xml` (Spring Boot 3.5.16 BOM + explicit pins for
  springdoc 2.8.17, Bucket4j 8.19.0; plugins JaCoCo 0.8.15, SpotBugs 4.10.2.0,
  OWASP Dependency-Check 12.2.2). Note: Maven Central's legacy search index
  (search.maven.org) is frozen and reports stale "latest" versions — always check
  `maven-metadata.xml` on repo.maven.apache.org when bumping pins.
- Only official Spring ecosystem libraries plus two well-maintained, never-compromised
  additions: springdoc (OpenAPI) and Bucket4j (rate limiting).
- OWASP Dependency-Check is wired into the build and fails on CVSS ≥ 7:
  `./mvnw org.owasp:dependency-check-maven:check`.

## Project layout

```
src/main/java/com/gitvisualizer/backend/
├── config/      Security (headers/CORS), OpenAPI, typed properties
├── domain/      JPA entities (git_commands, workflows) with JSON/JSONB columns
├── dto/         Response records matching the API contract exactly
├── ratelimit/   Bucket4j filter + Redis/local backends
├── repository/  Spring Data JPA repositories
├── seed/        git-commands-content.json loader (authoritative re-seed)
├── service/     Read-only content service
└── web/         Controllers, API-key filter, X-Instance-Id filter, error handler
```
