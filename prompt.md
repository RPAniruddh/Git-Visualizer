Build the backend and infrastructure for "Git Visualizer", an educational web app about 
Git commands. The frontend is being built separately (React, via Claude Design) and will 
call this backend over REST — do not build any frontend code. No user accounts or login.

## 1. Purpose
This backend serves static/structured content (command explanations, hints, lesson 
metadata, and visualization graph data) to a separately-built React frontend. It does not 
run git commands itself — command simulation logic lives entirely in the frontend.

## 1a. API Contract & Seed Data (must match exactly — do not invent content)
A file named `git-commands-content.json` will be provided to you. It is the authoritative 
seed data and API contract — do not invent, guess, or restructure the content.

- On startup (or via a seed migration/script run once), load every entry from the file's 
  "commands" array and "workflows" array into corresponding database tables.
- Map fields directly to columns: id, title, category, shortExplanation, hints (array), 
  howItWorks, syntax (array). Store beforeGraph and afterGraph as JSON/JSONB columns — 
  their internal shape is defined by the frontend team's visualization design, so store 
  whatever structure they contain without assuming a fixed schema for them.
- Workflow entries (id, title, description, steps, note) get their own table, linked or 
  standalone as makes sense.
- If I later provide an updated version of this file (e.g. once beforeGraph/afterGraph 
  are filled in by the frontend team instead of being empty placeholders), treat the new 
  version as authoritative and re-seed accordingly.

Required endpoints (exact shape, do not deviate without discussing first):

  GET /api/v1/commands
    -> [{ id, title, category, shortExplanation }, ...]   (for the picker grid)

  GET /api/v1/commands/{id}
    -> {
         id, title, category, shortExplanation,
         syntax: [ "...", ... ],
         hints: [ "...", ... ],
         howItWorks: "...",
         beforeGraph: { ... },
         afterGraph: { ... }
       }

  GET /api/v1/workflows
    -> [{ id, title, description }, ...]

  GET /api/v1/workflows/{id}
    -> { id, title, description, steps: [ "...", ... ], note }

Provide OpenAPI/Swagger docs reflecting these exact endpoints and shapes so the frontend 
team can verify integration against them.

## 2. Architecture
- Monolithic Spring Boot backend (Java 21 LTS, Spring Boot 3.x) — single deployable unit.
- REST API, versioned (/api/v1/...), returning DTOs (not raw entities).
- PostgreSQL for content persistence (commands, workflows) as described above. No 
  user/account tables.

## 3. Dependency Security (strict requirement)
- Verify every dependency's current version has no known unpatched CVEs; use only actively 
  maintained packages with a recent release history — no abandoned libraries.
- Avoid any library previously subject to a supply-chain compromise (malicious version 
  publish, hijacked maintainer, typosquat), even if the current version is currently clean.
- Pin exact versions in pom.xml.
- Run OWASP Dependency-Check as part of the build; fail the build on any high/critical 
  finding.
- Prefer official Spring ecosystem libraries (Spring Data JPA, Spring Security, etc.) over 
  third-party wrappers wherever functionality overlaps.

## 4. Security (no auth needed, but still harden the app)
- No login/JWT/BCrypt/RBAC needed — this is a public, read-mostly content API.
- Strict CORS configuration (explicit allowed origin(s) for the frontend's domain, not "*").
- Input validation on every endpoint (Bean Validation / @Valid), including any query params 
  (e.g. filtering by category).
- Parameterized queries via JPA (no string concatenation) for any admin/content-write 
  endpoints.
- Security headers via Spring Security (Content-Security-Policy, X-Frame-Options, 
  X-Content-Type-Options, etc.) even without auth.
- If a content-management endpoint exists (for admins to add/edit/re-seed content), protect 
  it with a simple API key or basic auth restricted to internal use — not a full user system.

## 5. Rate Limiting
- IP-based rate limiting via Bucket4j (Redis-backed bucket) integrated as a Spring filter, 
  applied globally to all public endpoints to prevent scraping/abuse.
- Return HTTP 429 with a Retry-After header when the limit is exceeded.

## 6. Load Balancing & Scalability
- Keep the application fully stateless: no server-side session state, and rate-limit 
  counters backed by Redis (not local memory) so they stay consistent across instances.
- Provide an Nginx (or Spring Cloud Gateway) reverse-proxy config that load-balances across 
  multiple backend instances (round-robin or least-connections).
- Provide a docker-compose.yml that spins up: 2+ backend replicas, Postgres, Redis, and the 
  Nginx load balancer.

## 7. Verification & Test Commands (required)
Include a `scripts/` folder (or Makefile) with runnable commands for every check below, and 
list them verbatim in the README so the whole stack can be verified with copy-paste commands.

### Backend (Spring Boot / Maven)
- Build:                 `./mvnw clean install`
- Unit + integration tests: `./mvnw test`
- Test coverage report:  `./mvnw test jacoco:report`   (fail build if coverage < 70%)
- Dependency vulnerability scan: `./mvnw org.owasp:dependency-check-maven:check`
  (configure to fail the build on CVSS >= 7)
- Static code analysis:  `./mvnw spotbugs:check` (or Checkstyle, if preferred)
- Run locally:           `./mvnw spring-boot:run`
- Seed verification:     a test/script that confirms every id in git-commands-content.json 
  is retrievable via GET /api/v1/commands/{id} and /api/v1/workflows/{id} after seeding

### Full Stack / Infra
- Bring up full stack:   `docker-compose up --build`
- Health checks:         expose and curl-test `/actuator/health` on each backend replica
- Load-balancer sanity:  `curl` the Nginx entrypoint N times and confirm requests are 
  distributed across backend replica logs (round-robin verification)
- Rate-limit verification: script that fires >N requests/sec at a public endpoint and 
  asserts HTTP 429 + Retry-After header appears once the threshold is crossed
- Security headers check: `curl -I` against the deployed app and assert CSP, 
  X-Frame-Options, X-Content-Type-Options are present
- Single command to run everything: `make verify-all` (or equivalent) that chains build + 
  test + dependency scan + seed verification, then spins up docker-compose and runs the 
  full-stack checks above

Print a final pass/fail summary table at the end of `verify-all` covering: unit/integration 
tests, seed verification, dependency audit, lint/static analysis, and load/rate-limit 
checks. Do not consider the project "done" until every item in that table passes.

## 8. Context & Continuity Management
- This is a multi-file, multi-stage build. Do not rely purely on conversational memory of 
  earlier files as the build progresses — context can be lost or truncated over a long 
  session.
- Before editing any file (especially security config, rate-limit filters, seed logic, or 
  docker-compose.yml), dispatch a sub-agent/tool call to re-read that file from disk rather 
  than trusting memory of its earlier contents. Treat this as a hard rule for anything 
  security-, seed-data-, or infra-related.
- Before running `verify-all` or any step in Section 7, re-read the relevant source, config, 
  and the git-commands-content.json file fresh rather than assuming it still matches what 
  was loaded earlier in the session.
- Maintain a `PROGRESS.md` updated after each major step (schema + seeding, API endpoints, 
  rate limiting, load balancing, tests, docs) so that if context is compacted or a new 
  session/agent picks up the task, it can reconstruct full state by re-reading PROGRESS.md 
  plus the actual source files — not by guessing from memory.
- For any multi-file refactor (e.g. changing the content schema or the rate-limit key 
  scheme across several files), read every affected file first, confirm current 
  implementation, and only then apply changes.

## 9. Deliverables
- Full Spring Boot source, organized cleanly.
- Dockerfile + docker-compose.yml as described.
- OpenAPI/Swagger documentation matching Section 1a exactly.
- Seed logic/migration that loads git-commands-content.json into the database.
- README covering setup, environment variables, rate limiting/load balancing explanation, 
  and every command from Section 7.
- `verify-all` script/Makefile target as described in Section 7.
- `PROGRESS.md` kept current throughout the build.
- JUnit + Spring Test unit/integration tests wired into the commands above, including the 
  seed verification test.

Ask clarifying questions only if something above is ambiguous; otherwise proceed with 
reasonable, clearly-stated assumptions and build the full backend.