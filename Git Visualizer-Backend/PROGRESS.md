# PROGRESS — Git Visualizer Backend

State-of-the-build log (prompt §8). If picking this up in a new session, re-read this
file plus the actual sources — do not trust conversational memory.

## Authoritative inputs
- Contract/seed: `../git-commands-content.json` (26 commands, 1 workflow; beforeGraph/afterGraph
  are `{}` placeholders to be filled by the frontend team later). A copy lives at
  `src/main/resources/git-commands-content.json` — **keep both in sync when the root file updates**
  (or point `CONTENT_SEED_FILE=file:...` at the root file directly).
- Requirements: `../prompt.md`.

## Completed
1. **Scaffold** — Maven Wrapper 3.3.2 (script-only mode; downloads Maven 3.9.10 — host has
   no `mvn`, JDK is 25 compiling with `--release 21`). `pom.xml`: Spring Boot 3.5.3 parent,
   springdoc 2.8.6, Bucket4j 8.14.0 (`bucket4j_jdk17-core`/`-lettuce`), H2 (test),
   JaCoCo 0.8.13 (70% line gate on `verify`), SpotBugs 4.9.3.0, OWASP Dependency-Check 12.1.3
   (CVSS ≥ 7 fails, `NVD_API_KEY` env speeds it up). Surefire configured to include `*IT` classes
   so `./mvnw test` runs everything.
2. **Schema + seeding** — `domain/GitCommandEntity` (`git_commands`), `domain/WorkflowEntity`
   (`workflows`); `syntax`/`hints`/`steps` as JSON arrays, `beforeGraph`/`afterGraph` as opaque
   JSON/JSONB (`@JdbcTypeCode(SqlTypes.JSON)`, JsonNode — works on Postgres jsonb and H2).
   `seed/ContentSeeder` (ApplicationRunner) wholesale-replaces content from the seed file each
   startup inside a TransactionTemplate (deliberate: file is authoritative). Refuses to wipe if
   the file parses to zero commands. `spring.jpa.hibernate.ddl-auto=update` creates the schema.
3. **API** — exact contract shapes via records in `dto/`. `web/CommandController`,
   `web/WorkflowController` (GET list/detail, optional validated `?category=` filter),
   `web/AdminController` POST `/api/v1/admin/reseed`. 404 via `service/NotFoundException` +
   `web/ApiExceptionHandler`; validation errors → 400. springdoc at `/swagger-ui.html`,
   `/v3/api-docs`.
4. **Security** — `config/SecurityConfig`: CSP, X-Frame-Options DENY, nosniff,
   Referrer-Policy no-referrer, Permissions-Policy; stateless; strict CORS from
   `CORS_ALLOWED_ORIGINS` (scoped to `/api/**`, GET/HEAD/OPTIONS only). `web/ApiKeyFilter`
   guards `/api/v1/admin/**` (constant-time compare; 404 when `ADMIN_API_KEY` unset).
   `web/InstanceIdFilter` adds `X-Instance-Id` for LB verification.
5. **Rate limiting** — `ratelimit/`: `RateLimitFilter` (IP-based, `/api/**` only, actuator
   exempt, 429 + `Retry-After`), backends selected by `app.ratelimit.backend`:
   `redis` (Bucket4j LettuceBasedProxyManager, shared across replicas — docker default) or
   `local` (in-process — dev/test default). Defaults 120 req/min per IP.
6. **Tests** (all green, 47 tests) — `SeedVerificationIT` (every seed id retrievable, required
   check), `CommandApiIT`/`WorkflowApiIT` (exact JSON key sets, 404, 400 on bad input),
   `SecurityHeadersIT` (headers + CORS allow/deny), `RateLimitIT` (429 + Retry-After, per-IP
   buckets, actuator exempt; tiny bucket via @TestPropertySource), `AdminApiIT` (401/200,
   counts read from seed file). Test profile: H2 mem, local ratelimit backend, huge bucket.
7. **Infra** — multi-stage `Dockerfile` (maven:3.9.10-eclipse-temurin-21 → temurin 21-jre-alpine,
   non-root). `docker-compose.yml`: postgres:17.5-alpine, redis:7.4-alpine, backend-1/-2
   (docker profile, Redis rate limiting, healthchecks, host ports 8081/8082), nginx:1.27-alpine
   least_conn on :8080 (`nginx/nginx.conf`, sets X-Forwarded-For).
8. **Scripts/docs** — `scripts/`: health-check, seed-verify (parses seed json, curls live API),
   lb-check (distinct X-Instance-Id), rate-limit-check (fires until 429, asserts Retry-After),
   security-headers-check, verify-all (chains everything, summary table; env:
   SKIP_DEP_CHECK=1, KEEP_STACK=1). `Makefile` targets mirror them. `README.md` has every
   §7 command verbatim.

## FINAL: verify-all end-to-end — ALL PASS (2026-07-05)
`bash scripts/verify-all.sh` summary table: unit+integration tests, SpotBugs, OWASP
dependency audit, docker-compose up, health checks, seed verification (27/27 live),
LB distribution (10/10 split), security headers, rate limit (429 from request #85 of
160-burst, Retry-After present) — all PASS. Stack left running (KEEP_STACK=1).

### Dependency-security follow-up found by the OWASP scan
The initial pins came from search.maven.org, whose index is FROZEN/stale — Spring Boot
3.5.3 (reported "latest") had multiple CVSS ≥ 9 CVEs in its Framework/Security/Tomcat
jars. Upgraded to **Spring Boot 3.5.16**, springdoc 2.8.17, Bucket4j 8.19.0, JaCoCo
0.8.15, SpotBugs 4.10.2.0 (bundles ASM 9.10.1 — plugin-level ASM override removed),
dependency-check 12.2.2, plus managed-property overrides `tomcat.version=10.1.56`,
`netty.version=4.2.15.Final`, `log4j2.version=2.26.1`. Scan now passes the CVSS ≥ 7 gate;
remaining sub-threshold findings (commons-lang3 CVE-2025-48924, jackson-databind
CVE-2026-54515, DOMPurify inside swagger-ui 5.32.2) are documented, not suppressed.
When bumping versions, resolve from repo.maven.apache.org maven-metadata.xml, never
search.maven.org.

## Frontend restructured as a React app (2026-07-05)
- New `../Git Visualizer-frontend/` — Vite 8 + React 19.2.7 + react-router-dom 7.18.1
  (see its README). Full feature-parity port of the Claude Design app: routing
  (/commands/:id, /free), collapsible sidebar categories + mobile drawer, dark theme
  (CSS vars + `dark` param on graph layouts), play-gated lesson animations, reset-progress
  modal, interruption screen, footer, hero word rotation, localStorage progress/theme
  (same keys, so existing browsers keep state). gitSim/graphRender converted to ES modules.
- Verified against the live backend: landing (26 commands), lesson graphs, sandbox
  terminal + live graph, theme toggle, production build (90KB gzip).
- Old loose files (dc.html, support.js, etc.) archived in `../_legacy-frontend/` — safe
  to delete once the React app has been used for a while.

## Frontend wired to backend (2026-07-05)
- The Claude Design frontend's `content-data.js` contained the UPDATED content: designed
  `beforeGraph`/`afterGraph` per command plus a new `sandboxSeed` field (which demo repo
  the sandbox seeds). Per prompt §1a ("updated file is authoritative"), extracted it back
  to `../git-commands-content.json` + `src/main/resources/git-commands-content.json`
  (70KB, replaces the placeholder version) and re-seeded via the idempotent upsert.
- Contract extension: `sandboxSeed` added to the command DETAIL shape only
  (entity + SeedFile + CommandDetailDto + ContentService + exact-shape test). Summary
  shape unchanged. Driven by the authoritative content file.
- `../content-service.js` swapped to backend mode: fetches lists + all details once at
  boot from `window.GV_API_BASE` (default http://localhost:8080), caches in memory,
  keeps the synchronous accessor API; assigns `window.contentService` only after load
  (app shows its loading screen until then); falls back to bundled `window.GV_CONTENT`
  if the backend is unreachable. Boot costs ~29 API calls — fine vs the 120/min limit.
- `../serve-frontend.mjs` (node, zero deps) serves the frontend on :5173 (CORS-allowed
  origin). Must be served over http — file:// would break fetch. `../.claude/launch.json`
  has a "frontend" config.
- Verified in browser: landing grid loads from /api/v1, commit lesson renders designed
  before/after graphs, staging panel, captions — data confirmed coming from the API.

## Earlier verification detail (2026-07-04)
- `./mvnw test` — **PASS** (47/47).
- `./mvnw clean verify` — **PASS** (JaCoCo "All coverage checks have been met").
- `./mvnw spotbugs:check` — **PASS** (0 bugs). First run FAILED on JDK 25 host
  ("Unsupported class file major version 69", SpotBugs 4.9.3 bundles ASM 9.7.1); fixed by
  overriding ASM to 9.10.1 in the plugin's `<dependencies>`.
- docker-compose full stack — **PASS**: all 5 containers healthy from a clean DB.
- `scripts/health-check.sh` — **PASS** (both replicas + nginx UP).
- `scripts/seed-verify.sh` — **PASS** (27/27 ids retrievable via live API).
- `scripts/lb-check.sh` — **PASS** (20 requests split 10/10 across replicas).
- `scripts/security-headers-check.sh` — **PASS** (CSP, X-Frame-Options, nosniff).
- `scripts/rate-limit-check.sh` — **PASS** (429s from request #88 of a 160-burst,
  Retry-After present; Redis bucket shared across replicas — single key
  `gitviz:ratelimit:<ip>` observed).
- Contract spot-checks through nginx — **PASS** (exact detail keys, 404 unknown id,
  400 invalid category, admin 404 when ADMIN_API_KEY unset, swagger-ui + api-docs 200).
- OWASP dependency-check — in progress: first NVD download is throttled without
  `NVD_API_KEY` (~2%/min). The plugin is configured (fails on CVSS ≥ 7) and resumes
  cached downloads on re-run.

## Fixed during full-stack verification
- **Concurrent seeding race**: two replicas booting against a fresh DB both inserted seed
  rows → duplicate key on `git_commands_pkey`. Fix: `ContentSeeder` now upserts + prunes
  (idempotent) and retries once on `DataIntegrityViolationException`; additionally
  backend-2 `depends_on` backend-1 healthy in compose so first-boot schema creation is
  serialized.
- **rate-limit-check.sh too slow to trip the bucket**: fork-per-request curl loop ran at
  ~2-3 req/s while the bucket refills at 2/s. Rewritten with curl URL globbing (single
  keep-alive connection); Retry-After is asserted from the burst's own header dump because
  a follow-up probe races the refill.

## Known decisions / gotchas
- Local dev without Redis works because `RATELIMIT_BACKEND` defaults to `local` and the Redis
  health indicator is off outside the docker profile.
- Rate-limit counters are per-IP; behind nginx the first `X-Forwarded-For` entry is used.
- Admin endpoint returns 404 (not 403) when no key is configured — deliberate, hides existence.
- `verify-all.sh` runs the rate-limit check LAST because it exhausts the shared IP bucket.
