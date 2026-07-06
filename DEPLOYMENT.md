# Git Visualizer — Deployment Guide

Four paths. All of them keep the local `docker-compose.yml` HA setup (2 replicas +
Redis + Nginx) intact for local demos — in production, a single backend instance is
plenty for this app's traffic, so every path but D intentionally simplifies to one.

| Path | Frontend | Backend | Database | Cost/mo | Cold starts? |
|---|---|---|---|---|---|
| **A** | Vercel | Render (free) | Neon (free) | **$0** | Yes, ~30–60s after 15 min idle |
| **A2** | Vercel | **Railway** | Railway Postgres plugin | **~$5** (Hobby plan flat fee) | No |
| **B** | Vercel | Fly.io (small VM) | Neon (free) | **~$2–3** | No |
| **D** | Vercel | Your own VM, full `docker-compose.yml` | in-VM Postgres + Redis | **$0** (Oracle Free Tier) | No, but you manage the box |

**About Railway (Path A2):** it no longer has an indefinite free tier — the cheapest
real plan is **Hobby at $5/month flat**, which includes $5 of usage credit. A small app
like this would likely stay within that included credit, but you still pay the $5/mo
plan fee to keep anything deployed. That's above your $1–3 target, so if the exact
number matters more than using Railway specifically, **Path B (Fly.io)** is the closer
fit — it's nearly as simple and lands around $2–3/mo with no cold starts. Steps for both
are below; pick whichever trade-off you'd rather make.

---

## Prerequisite: get the code onto GitHub

This folder isn't a git repo yet, and Render/Vercel/Fly all deploy from one.

```bash
cd "D:\Projects\Git Visualizer"
git init
git add Git Visualizer-Backend Git Visualizer-frontend git-commands-content.json ARCHITECTURE.md DEPLOYMENT.md prompt.md
git commit -m "Initial commit"
```
Then create an empty repo on GitHub (no README/license, to avoid conflicts) and:
```bash
git remote add origin https://github.com/<you>/git-visualizer.git
git branch -M main
git push -u origin main
```
`_legacy-frontend/` is intentionally left out — no need to ship the archived prototype.

---

## One required code change (already applied)

`Git Visualizer-Backend/src/main/resources/application.yml` now reads
`server.port: ${PORT:8080}` instead of a hardcoded `8080`. Render, Fly, and Railway all
assign your app a port through a `$PORT` environment variable — this makes the app listen
on whatever they hand it, while still defaulting to 8080 for local/Docker Compose use
where nothing sets `$PORT`.

---

## Path A — $0/month (Render + Neon)

### 1. Database: Neon (free Postgres)
1. Sign up at **neon.tech** → New Project → any region close to you.
2. Copy the connection string it gives you (looks like
   `postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`).
3. Convert it to a JDBC URL for Spring:
   `jdbc:postgresql://ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
   (same host/db/params, just swap `postgresql://` → `jdbc:postgresql://` and drop the
   embedded user:password — those go in separate env vars below).

Neon's free tier autosuspends the compute after inactivity and wakes on the next
connection (a few hundred ms to ~1s) — much friendlier than services that delete free
databases after N days.

### 2. Backend: Render (free web service)
1. Sign up at **render.com** → New → Web Service → connect your GitHub repo.
2. **Root Directory**: `Git Visualizer-Backend`
3. **Runtime**: Docker (Render detects the `Dockerfile` automatically — no build/start
   command needed).
4. **Instance Type**: Free.
5. **Health Check Path**: `/actuator/health`
6. **Environment Variables**:
   | Key | Value |
   |---|---|
   | `DB_URL` | the JDBC URL from step 1 |
   | `DB_USERNAME` | your Neon username |
   | `DB_PASSWORD` | your Neon password |
   | `CORS_ALLOWED_ORIGINS` | leave as `http://localhost:5173` for now — you'll update this in step 4 |
   | `ADMIN_API_KEY` | any long random string (e.g. generate with `openssl rand -hex 32`) |
   | `RATELIMIT_BACKEND` | `local` (already the default — no Redis needed for one instance) |
7. Deploy. First boot creates the schema and seeds content automatically
   (`ContentSeeder` runs on every startup). Watch the logs for `Seeded 26 commands and 1 workflows`.
8. Note your service URL: `https://<your-service>.onrender.com`.

Don't set `SPRING_PROFILES_ACTIVE=docker` here — that profile expects a `redis` hostname
that only exists inside the Compose network. The default profile is exactly right for a
single Render instance.

### 3. Frontend: Vercel (free)
1. Sign up at **vercel.com** → Add New → Project → import the same GitHub repo.
2. **Root Directory**: `Git Visualizer-frontend`
3. Framework preset: Vite (auto-detected).
4. **Environment Variable**: `VITE_API_BASE` = `https://<your-service>.onrender.com`
5. Deploy. Note your URL: `https://<your-app>.vercel.app`.

### 4. Close the loop: CORS
Back in Render → your service → Environment → update `CORS_ALLOWED_ORIGINS` to
`https://<your-app>.vercel.app` (comma-separate if you want to keep localhost too, e.g.
`https://your-app.vercel.app,http://localhost:5173`). Save — Render redeploys
automatically.

### 5. Verify
Open the Vercel URL. First load may take 30–60s if the Render free instance had spun
down — that's expected. Check the browser console for CORS errors if commands don't
load. `curl https://<your-service>.onrender.com/actuator/health` should return `{"status":"UP"}`.

**Mitigating the cold start:** a free uptime pinger (e.g. **cron-job.org**, **UptimeRobot**,
**Freshping**) hitting `/actuator/health` every 10 minutes keeps the instance warm — still
$0, though it does defeat some of the point of a "spin down when idle" free tier, so use
your judgment.

---

## Path A2 — ~$5/month (Vercel + Railway, Postgres included)

Same Vercel frontend as Path A (see step 3 above). Railway replaces Render *and* Neon —
it bundles a managed Postgres plugin in the same project, so it's one dashboard instead
of two.

### 1. Backend + database: Railway
1. Sign up at **railway.app** → New Project → Deploy from GitHub repo → select your repo.
2. In the service's **Settings**, set **Root Directory** to `Git Visualizer-Backend`.
   Railway detects the `Dockerfile` and builds from it automatically.
3. In the same project, click **+ New → Database → Add PostgreSQL**. Railway provisions
   it and exposes connection details as reference variables you can point other services
   at (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`).
4. Back on your backend service → **Variables** tab, add:
   | Key | Value |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
   | `DB_USERNAME` | `${{Postgres.PGUSER}}` |
   | `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
   | `CORS_ALLOWED_ORIGINS` | placeholder for now — update after the Vercel deploy |
   | `ADMIN_API_KEY` | a long random string |
   | `RATELIMIT_BACKEND` | `local` |

   The `${{ServiceName.VAR}}` syntax is Railway's cross-service variable reference — it
   resolves automatically, no copy-pasting credentials between dashboards.
5. Service → **Settings → Networking → Generate Domain** to get a public
   `*.up.railway.app` URL. Set the **Healthcheck Path** to `/actuator/health` in the same
   settings panel.
6. Deploy and watch the logs for the seeding message, same as Path A.

### 2. Frontend + wiring
Same as Path A steps 3–5: deploy `Git Visualizer-frontend` to Vercel with
`VITE_API_BASE` set to your Railway domain, then come back and set
`CORS_ALLOWED_ORIGINS` on Railway to your Vercel URL.

No cold starts on Railway's paid plan — the trade-off is the $5/mo floor instead of $0.

---

## Path B — ~$2–3/month (Fly.io + Neon), no cold starts

Same Neon database as Path A. Swap Render for Fly.io:

1. Install the CLI and log in:
   ```
   iwr https://fly.io/install.ps1 -useb | iex
   fly auth login
   ```
2. From the backend folder:
   ```
   cd "Git Visualizer-Backend"
   fly launch --no-deploy
   ```
   Answer: don't let it provision a Postgres or Redis (you're using Neon). Pick a region
   near you. It generates a `fly.toml` reading your existing `Dockerfile`.
3. Size the VM to stay cheap — the smallest useful size for a JVM app:
   ```
   fly scale vm shared-cpu-1x --memory 512
   ```
4. Set secrets (same values as the Render table above):
   ```
   fly secrets set DB_URL="jdbc:postgresql://ep-xxxx.../neondb?sslmode=require" `
                   DB_USERNAME="..." DB_PASSWORD="..." `
                   CORS_ALLOWED_ORIGINS="https://<your-app>.vercel.app" `
                   ADMIN_API_KEY="..." RATELIMIT_BACKEND="local"
   ```
5. Deploy: `fly deploy`
6. Your API is live at `https://<your-app>.fly.dev` — update `VITE_API_BASE` on Vercel
   to this URL and redeploy the frontend.

Fly bills by actual VM time; a single always-on `shared-cpu-1x`/512MB machine is
typically in the **$2–5/month** range depending on current pricing — check
fly.io/docs/about/pricing before committing, rates do change.

---

## Path D — $0/month, your exact architecture (Oracle Cloud Always Free)

If you want the real 2-replica + Redis + Nginx `docker-compose.yml` running in
production exactly as built (not simplified), Oracle Cloud's **Always Free** tier is the
one genuinely-free option with enough RAM for it: up to 4 Arm (Ampere A1) vCPUs and 24GB
RAM, free forever, no time limit.

1. Sign up at **cloud.oracle.com** (needs a card for identity verification, but the
   Always Free resources are never billed if you stay within them).
2. Create Compute Instance → shape **VM.Standard.A1.Flex** → e.g. 2 OCPU / 12GB RAM →
   Ubuntu image → this fits well inside the Always Free allowance.
3. Open ports 80/443 in the instance's security list (and 8080 if you want direct
   access without a domain).
4. SSH in, install Docker + Compose:
   ```
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER
   ```
5. Clone your repo, `cd "Git Visualizer-Backend"`, create a `.env` or export the same
   variables docker-compose.yml already reads (`ADMIN_API_KEY`, `CORS_ALLOWED_ORIGINS`,
   etc. — see its `environment:` block), then:
   ```
   docker compose up -d --build
   ```
   This is the **exact same command** from local development — nothing to port, the
   compose file already does 2 replicas + Postgres + Redis + Nginx load balancing.
6. Point `CORS_ALLOWED_ORIGINS` at your Vercel frontend URL and `VITE_API_BASE` (on
   Vercel) at `http://<instance-public-ip>` (or a domain you point at it).

Trade-off versus A/B: you're now responsible for OS updates, restarts after a reboot
(add a systemd unit or `docker compose` restart policy — already set implicitly via
Docker's default), and monitoring. Nothing here auto-heals the way a managed platform
does.

---

## Cost & effort summary

- **Today, $0, fine with a slow first load**: Path A (Render + Neon).
- **Want Railway specifically, okay with $5/mo**: Path A2.
- **Want your $1–3/mo target hit exactly, no cold starts**: Path B (Fly.io + Neon) —
  this is the closest match to "Vercel + cheap backend, always warm."
- **Want the full HA architecture live, comfortable with basic sysadmin**: Path D ($0,
  more your own responsibility).

All four keep local development unchanged — `docker compose up -d` in
`Git Visualizer-Backend/` and `npm run dev` in `Git Visualizer-frontend/` still work
exactly as before.
