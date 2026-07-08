# Git·Visualizer

**An interactive playground for learning git — see what a command does before you run it.**

Pick a command, watch its commit graph go from *before* to *after* in plain language,
then try it yourself in a live sandbox. No git installation required — the whole
simulation runs in your browser.

**Live demo:** [git-visualizer-six.vercel.app](https://git-visualizer-six.vercel.app)
*(the backend is kept warm through the day; roughly between 2–6 AM IST it's allowed to
sleep, so the first request in that window can take ~50s to wake up)*

---

## What it does

- **32 commands** across 8 categories — Setup, Checking State, Saving Work, Branching,
  Rebase, Stash, Undo, and Advanced — each with a plain-language explanation, syntax
  examples, and hints.
- **Before → After commit graphs** for every command, hand-designed to show exactly what
  changes: which nodes move, which refs shift, what gets staged.
- **A live sandbox** — type real git commands against a simulated repository and watch
  the graph react in real time. Nothing is destructive; reset anytime.
- **Browse by category, or search** — filter commands with the category pills or the
  search box (press `/` to jump to it), plus light/dark themes.
- **No accounts, no install** — the whole simulation runs in your browser.

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

## FAQ

**Do I need to install Git or sign up for anything?**
No. There are no accounts and nothing to install — the entire git simulation runs in
your browser. Open the site and start.

**How is my progress tracked?**
The "X of 32 visited" counter and the per-command checkmarks live only in your browser's
`localStorage` (under the key `gv-learned-v2`) — there's no account, and nothing is sent
to any server. Because it's per-browser, your progress doesn't follow you to another
device or browser, and clearing your browser data (or using the in-app **Reset progress**
button) wipes it. Your light/dark theme choice is stored the same way (`gv-theme`).

**Does anything I type in the live sandbox get sent to a server?**
No. The sandbox is a pure client-side simulation — commands never touch a real repository
or the backend. The backend only serves the read-only lesson content (explanations,
hints, and graph data).

**Why is the first load sometimes slow?**
The backend runs on a free tier that sleeps after inactivity. It's kept warm through the
day, but roughly between 2–6 AM IST it's allowed to sleep, so the first request in that
window can take ~50 seconds while it wakes up. After that it's instant.

---

Built by [Aniruddh Panicker](https://www.linkedin.com/in/aniruddh-panicker-3708b7249/)
