# Git·Visualizer

**An interactive playground for learning git — see what a command does before you run it.**

Pick a command, watch its commit graph go from *before* to *after* in plain language,
then try it yourself in a live sandbox. No git installation required — the whole
simulation runs in your browser.

**Live demo:** [git-visualizer-six.vercel.app](https://git-visualizer-six.vercel.app)
*(backend runs on a free tier and may take ~30–60s to wake up on the first request)*

---

## What it does

- **26 commands** across 8 categories — Setup, Checking State, Saving Work, Branching,
  Rebase, Stash, Undo, and Advanced — each with a plain-language explanation, syntax
  examples, and hints.
- **Before → After commit graphs** for every command, hand-designed to show exactly what
  changes: which nodes move, which refs shift, what gets staged.
- **A live sandbox** — type real git commands against a simulated repository and watch
  the graph react in real time. Nothing is destructive; reset anytime.
- **A guided workflow** — a full daily feature-branch sequence chained across multiple
  commands, for the bigger picture.

## Tech stack

| | |
|---|---|
| **Frontend** | React 19, Vite, React Router — client-side git simulation, no build tooling needed to use it |
| **Backend** | Spring Boot 3.5 (Java 21), PostgreSQL, Redis, Spring Security |
| **Infra** | Docker Compose (2 backend replicas + Nginx load balancing), OWASP Dependency-Check, JaCoCo, SpotBugs |

The backend is a read-only content API — it serves command explanations and graph data
over REST (`/api/v1/commands`, `/api/v1/workflows`); it never executes git itself. All
command *simulation* happens client-side in the frontend.

## Project structure

```
Git Visualizer-Backend/     Spring Boot content API — see its README for setup,
                             environment variables, and verification commands
Git Visualizer-frontend/    React + Vite app — see its README for structure and
                             local development
git-commands-content.json   The authoritative content: commands, hints, graphs
```

## Running it locally

```bash
# Backend — Docker Compose (Postgres + Redis + 2 replicas + Nginx)
cd "Git Visualizer-Backend"
docker compose up -d
# → API at http://localhost:8080, Swagger at http://localhost:8080/swagger-ui.html

# Frontend — Vite dev server
cd "Git Visualizer-frontend"
npm install
npm run dev
# → http://localhost:5173
```

See [`Git Visualizer-Backend/README.md`](Git%20Visualizer-Backend/README.md) and
[`Git Visualizer-frontend/README.md`](Git%20Visualizer-frontend/README.md) for full
details — environment variables, test/verification commands, and how content is
seeded and updated.

---

Built by [Aniruddh Panicker](https://www.linkedin.com/in/aniruddh-panicker-3708b7249/)
