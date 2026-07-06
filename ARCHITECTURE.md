# Git Visualizer — Architecture Reference

An interactive git-learning playground: pick a command, see its before/after commit
graph, then try it in a live sandbox. Two independently deployable pieces — a Spring
Boot content API and a React frontend — talking over plain REST.

```
Git Visualizer/
├── Git Visualizer-Backend/     Spring Boot 3.5.16 content API (Java 21)
├── Git Visualizer-frontend/    React 19 + Vite app
├── _legacy-frontend/           original Claude-Design prototype (archived, unused)
├── git-commands-content.json   authoritative content: 26 commands, 1 workflow, graphs
└── prompt.md                   original backend build spec
```

---

## Backend — `Git Visualizer-Backend/`

**What it does:** serves git command explanations, hints, and pre-designed before/after
commit-graph data over a versioned REST API (`/api/v1/...`). Read-only and public — no
accounts, no login. Content lives in PostgreSQL and is re-seeded from
`git-commands-content.json` on every boot, so that file is the single source of truth.
Command *simulation* (the live sandbox) runs entirely in the browser — the backend never
executes git.

**Stack:** Java 21, Spring Boot 3.5.16, Spring Data JPA, Spring Security (headers/CORS
only, no auth), springdoc-openapi, Bucket4j (rate limiting), PostgreSQL 17, Redis 7,
Nginx (load balancer), Docker Compose.

### Request flow
```
client → Nginx (least_conn, :8080) → backend-1 / backend-2 (Spring Boot)
                                          ├─→ PostgreSQL   (content)
                                          └─→ Redis        (shared rate-limit buckets)
```
Both backend replicas are stateless and interchangeable; every response carries an
`X-Instance-Id` header so you can see which replica answered.

### Source files — `src/main/java/com/gitvisualizer/backend/`

| File | Purpose |
|---|---|
| `GitVisualizerBackendApplication.java` | Spring Boot entry point. |
| **domain/** `GitCommandEntity.java` | JPA entity for one git command — id, title, category, syntax, hints, howItWorks, plus `beforeGraph`/`afterGraph` (opaque JSONB) and `sandboxSeed`. |
| **domain/** `WorkflowEntity.java` | JPA entity for a guided multi-command lesson (steps + note). |
| **repository/** `GitCommandRepository.java`, `WorkflowRepository.java` | Spring Data JPA repositories (id lookup, category filter). |
| **seed/** `SeedFile.java` | Jackson record mirroring the shape of `git-commands-content.json`. |
| **seed/** `ContentSeeder.java` | Loads the seed JSON into Postgres on startup; idempotent upsert-and-prune so concurrent replicas booting against a fresh DB don't collide; exposed via the admin reseed endpoint too. |
| **service/** `ContentService.java` | Read-only business logic — maps entities to DTOs, applies category filtering. |
| **service/** `NotFoundException.java` | Thrown for unknown command/workflow ids → mapped to HTTP 404. |
| **dto/** `CommandSummaryDto.java` | `{id, title, category, shortExplanation}` — picker-grid shape. |
| **dto/** `CommandDetailDto.java` | Full command detail incl. `beforeGraph`, `afterGraph`, `sandboxSeed`. |
| **dto/** `WorkflowSummaryDto.java`, `WorkflowDetailDto.java` | Workflow list/detail shapes. |
| **dto/** `ErrorResponseDto.java` | Standard `{timestamp, status, error, message}` error body. |
| **web/** `CommandController.java` | `GET /api/v1/commands`, `GET /api/v1/commands/{id}` — validated id/category params. |
| **web/** `WorkflowController.java` | `GET /api/v1/workflows`, `GET /api/v1/workflows/{id}`. |
| **web/** `AdminController.java` | `POST /api/v1/admin/reseed` — re-loads the seed file on demand. |
| **web/** `ApiExceptionHandler.java` | `@RestControllerAdvice` — turns `NotFoundException`/validation errors into the standard error DTO. |
| **web/** `ApiKeyFilter.java` | Guards `/api/v1/admin/**` with a constant-time `X-API-Key` check; returns 404 (not 401) when no key is configured, to hide the endpoint's existence. |
| **web/** `InstanceIdFilter.java` | Stamps every response with `X-Instance-Id` (container hostname) for load-balancer verification. |
| **config/** `SecurityConfig.java` | Spring Security chain: CSP, X-Frame-Options, X-Content-Type-Options, referrer policy, stateless sessions, CORS wiring. |
| **config/** `CorsProperties.java`, `AdminProperties.java` | Typed `@ConfigurationProperties` for allowed origins and the admin API key. |
| **config/** `OpenApiConfig.java` | springdoc bean — powers `/swagger-ui.html` and `/v3/api-docs`. |
| **ratelimit/** `RateLimitFilter.java` | Servlet filter applied to all `/api/**` traffic; IP-derived key (`X-Forwarded-For` aware), 429 + `Retry-After` when the bucket is empty. |
| **ratelimit/** `RateLimiterBackend.java` | Interface for pluggable bucket storage. |
| **ratelimit/** `LocalRateLimiter.java` | In-memory Bucket4j buckets — used in dev/tests (single instance, no shared state needed). |
| **ratelimit/** `RedisRateLimiter.java` | Bucket4j buckets backed by Redis via Lettuce — used in Docker so the limit holds across both replicas. |
| **ratelimit/** `RateLimitConfig.java`, `RateLimitProperties.java` | Picks local vs. Redis backend from config; typed capacity/refill properties. |

### Resources & config

| File | Purpose |
|---|---|
| `src/main/resources/application.yml` | Default config — DB/Redis connection, CORS origins, rate-limit defaults, local-mode rate limiter. |
| `src/main/resources/application-docker.yml` | Docker-profile overrides — Redis-backed rate limiting, container hostnames. |
| `src/main/resources/git-commands-content.json` | **Copy of the root seed file** — loaded at boot. Keep in sync if the root file changes. |
| `src/test/resources/application-test.yml` | Test profile — H2 in-memory DB, local rate limiter with a generous bucket. |

### Infra & tooling

| File | Purpose |
|---|---|
| `pom.xml` | Maven build — pinned dependency versions, JaCoCo (70% coverage gate), SpotBugs, OWASP Dependency-Check (fails on CVSS ≥ 7). |
| `Dockerfile` | Multi-stage build (Maven → JRE), non-root user. |
| `docker-compose.yml` | Full stack: 2 backend replicas, Postgres, Redis, Nginx. |
| `nginx/nginx.conf` | Load balancer config — `least_conn` across the two replicas. |
| `Makefile` | Convenience targets wrapping the scripts below. |
| `scripts/health-check.sh` | Curls `/actuator/health` on each replica + the LB entrypoint. |
| `scripts/seed-verify.sh` | Confirms every id in the seed JSON is retrievable via the live API. |
| `scripts/lb-check.sh` | Fires repeated requests and checks `X-Instance-Id` values are distributed across replicas. |
| `scripts/rate-limit-check.sh` | Bursts requests past the bucket capacity, asserts 429 + `Retry-After`. |
| `scripts/security-headers-check.sh` | Asserts CSP/X-Frame-Options/X-Content-Type-Options are present. |
| `scripts/verify-all.sh` | Runs build, tests, static analysis, dependency scan, then all of the above against a live Docker stack; prints a pass/fail summary table. |
| `.gitignore`, `.dockerignore`, `spotbugs-exclude.xml` | Housekeeping. |

### Tests — `src/test/java/com/gitvisualizer/backend/`
`SeedVerificationIT` (every seed id retrievable + list contents match), `CommandApiIT` /
`WorkflowApiIT` (exact JSON shape, 404s, validation errors), `SecurityHeadersIT` (headers
+ CORS allow/deny), `RateLimitIT` (429 + Retry-After, per-IP isolation, actuator exempt),
`AdminApiIT` (401/200 on the reseed endpoint).

### Key endpoints
```
GET  /api/v1/commands[?category=]     picker-grid list
GET  /api/v1/commands/{id}            full detail incl. graphs
GET  /api/v1/workflows                workflow list
GET  /api/v1/workflows/{id}           workflow detail
POST /api/v1/admin/reseed             requires X-API-Key
GET  /actuator/health                 health check
GET  /swagger-ui.html                 interactive API docs
```

---

## Frontend — `Git Visualizer-frontend/`

**What it does:** fetches the whole command library from the backend once at boot,
renders the picker grid / lesson pages / live sandbox, and runs git command *simulation*
entirely client-side (no server round-trip when you type a command in the sandbox).

**Stack:** React 19.2.7, Vite 8, react-router-dom 7 (client-side routing), no CSS
framework — hand-written inline styles driven by CSS custom properties for theming.

### Source files — `src/`

| File | Purpose |
|---|---|
| `main.jsx` | Entry point — mounts `<App>` inside `<BrowserRouter>`. |
| `App.jsx` | Top-level state: loads content once, owns dark-theme + "visited" progress (both in `localStorage`), owns the reset-confirmation modal, defines the three routes. |
| `api.js` | All backend calls — fetches `/api/v1/commands` + `/api/v1/workflows` lists, then every detail in parallel; `VITE_API_BASE` env var overrides the default `http://localhost:8080`. |
| `index.css` | Design tokens as CSS variables (`--gv-*`, light + `.gv-dark` overrides), keyframes (pop/draw/fade/word-swap), and the responsive media queries (sidebar → mobile drawer at ≤1024px, typography/spacing at ≤640px). |
| **lib/** `gitSim.js` | Client-side git simulator — parses typed commands (`init`, `add`, `commit`, `branch`, `checkout`, `merge`, `rebase`, `reset`, `stash`, etc.), maintains an in-memory repo model, and lays out the live sandbox graph (nodes/edges/ref-labels) for rendering. Pure JS, no framework dependency. |
| **lib/** `graphRender.js` | Lays out the *designed* before/after lesson graphs from the backend's `beforeGraph`/`afterGraph` JSON into positioned nodes/edges/labels + a computed SVG viewBox (auto-sized so stacked ref pills never clip). |
| **lib/** `format.jsx` | Renders `` `code` `` and `*bold*` markers inside hint text; shared `areaChipStyle` helper for staging/working-tree chips. |
| **components/** `Landing.jsx` | Home page — logo, visited-count/progress bar, reset button, theme toggle, rotating hero line ("See what Git is *thinking/doing/tracking…*"), the category-grouped command grid, and the free-play banner. |
| **components/** `Workspace.jsx` | The command-lesson / sandbox screen — collapsible sidebar (accordion categories + off-canvas mobile drawer), tabs (Before→After vs. Live sandbox), the lesson graph with Play-transition button, the live terminal + sandbox graph, and the right-hand "How it works"/hints panel. |
| **components/** `graphs.jsx` | Two SVG renderer components: `LessonGraph` (designed before/after, entrance animation gated behind an `animate` prop so it only plays on "▶ Play transition") and `LiveGraph` (sandbox, animates as commands run). |
| **components/** `ErrorScreen.jsx` | Full-page "We're facing some interruption" screen shown when the backend is unreachable, with a retry button. |
| **components/** `ResetModal.jsx` | Themed confirmation dialog for clearing visited-progress (replaces the native `window.confirm`). |
| **components/** `ThemeButton.jsx` | The 🌙/☀ dark-mode toggle button (rendered in two places — mobile top bar and desktop right column — only one is ever visible per breakpoint). |
| **components/** `Footer.jsx` | Site footer — wordmark, tagline, LinkedIn credit link. |

### Routing
```
/                → Landing (picker grid)
/commands/:id    → Workspace, lesson + sandbox for one command
/free            → Workspace in free-play mode (no lesson tab, every command unlocked)
```
Unknown paths redirect to `/`. Navigating updates the URL (shareable/bookmarkable
links); back/forward work via `react-router-dom`.

### State & persistence
- **`gv-learned-v2`** (`localStorage`) — which commands have been visited; drives the
  progress bar and per-card checkmarks. Cleared via the reset modal.
- **`gv-theme`** (`localStorage`) — `"dark"` or `"light"`; applied as a class
  (`html.gv-dark`) that flips the CSS variables in `index.css`. Also read synchronously
  in `index.html` before React mounts, to avoid a light-theme flash.
- Everything else (sandbox repo state, which tab is open, sidebar-drawer open/closed) is
  in-memory component state — resets on navigation/reload by design.

### Build & run
```
npm install
npm run dev      # http://localhost:5173, dev server
npm run build    # production bundle → dist/
```
`vite.config.js` pins the dev server to port 5173 (one of the origins the backend's CORS
config allows).

---

## How the two halves talk

The frontend is the only consumer of the backend's public API — it fetches the entire
content library at boot (list + every detail, ~29 requests) and caches it in memory for
the session; there's no per-navigation API call after that. The backend has no notion of
the frontend beyond the CORS allow-list. Update `git-commands-content.json` at the repo
root, copy it into `Git Visualizer-Backend/src/main/resources/`, and either restart the
backend or `POST /api/v1/admin/reseed` (with the API key) to push new content live.
