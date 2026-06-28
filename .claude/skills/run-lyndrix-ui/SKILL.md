---
name: run-lyndrix-ui
description: Run, launch, build, and screenshot the Lyndrix web UI (React SPA + lyndrix-core backend). Use when asked to run lyndrix, start the dev stack, screenshot a Lyndrix page, drive the UI, or verify a frontend/plugin change in the real running app.
---

# Run the Lyndrix UI

The Lyndrix UI is an **auth-gated React SPA** that talks to **lyndrix-core**
(FastAPI, port 8081). The UI is useless without core: it redirects to `/login`
and every page needs a `lyk_...` bearer token. It can be reached two ways:
- **Vite dev server** at `http://localhost:5173` (the lyndrix-ui dev container,
  hot-reload, proxies `/api` → core). The default driver target.
- **Served from core** at `http://localhost:8081/app` when
  `LYNDRIX_UI_ENGINE=react|both` — the SPA is baked into core (same origin as the
  API, no proxy). Drive it by overriding `UI_URL` (see "Drive the core-served UI").

Because the app is headless-hostile (login wall, token in `localStorage`,
dynamically-registered plugin routes), you drive it with a **CDP driver** that
logs in, seeds the token, navigates, optionally clicks, and screenshots:

```
.claude/skills/run-lyndrix-ui/driver.mjs
```

> Paths below are relative to `lyndrix-ui/` (this repo). The driver reaches the
> sibling `lyndrix-core/` repo for the admin password automatically.

## Prerequisites

```bash
# Headless browser + the node ws module the driver needs (Ubuntu).
sudo apt-get install -y chromium
# `ws` ships in the `node-ws` system package at /usr/share/nodejs/ws (the driver
# requires it from there). curl + python3 are used for login; already present.
```

## Run the stacks (both required)

```bash
# 1. Backend stack: MariaDB + Vault + core API + docs preview.
(cd ../lyndrix-core && docker compose -f docker/docker-compose.dev.yml up -d --build)

# 2. Frontend stack: Vite dev server on :5173, proxies /api → host:8081.
docker compose -f docker/docker-compose.dev.yml up -d --build
```

Vault auto-unseals via `LYNDRIX_MASTER_KEY` in `../lyndrix-core/docker/.env.dev`.
Verify both stacks respond:

```bash
curl -s http://localhost:8081/api/health        # {"status":"unknown"}  — unauth is trimmed to status only
docker compose -f docker/docker-compose.dev.yml ps   # lyndrix-ui-dev Up
```

`status` is `"unknown"` even when healthy — it aggregates plugin `health()`,
which most plugins don't implement (severity `error > degraded > unknown > ok`,
so it lands on `unknown`; treat `unknown`/`ok` as healthy, only `error`/`degraded`
as real problems). **Unauthenticated `/api/health` returns only `{"status":"unknown"}`**
— `core_version` / `api_version` / `plugins` are auth-gated, so send a bearer token
(see "Verify the backend API directly") to get them. A 200 at all means core booted;
the dashboard header shows the real "Vault ready" state.

## Drive it (agent path — START HERE)

The driver takes `<route> <outfile.png> [clickSelector]`. It logs in as `admin`
(password auto-read from `../lyndrix-core/docker/.env.dev`), seeds the token,
and screenshots.

```bash
# Screenshot a top-level page:
node .claude/skills/run-lyndrix-ui/driver.mjs /plugins /tmp/plugins.png

# Cold deep-link to a PLUGIN page works directly (the /apps/* loading guard waits
# for the plugins query, then the real route renders):
node .claude/skills/run-lyndrix-ui/driver.mjs /apps/lyndrix-plugin-docker/docker/settings /tmp/docker.png

# Optional 3rd arg = a CSS selector to click after load (e.g. open a dialog mid-page):
node .claude/skills/run-lyndrix-ui/driver.mjs /plugins /tmp/gear.png 'button[title="Einstellungen"]'
```

Then **look at the PNG** (Read the file). The deep-link command lands on
"Docker Manager — Einstellungen" with the Docker Hosts list + add-host form.

### Verified routes (against core 0.3.1)

| Route | What renders |
|---|---|
| `/dashboard` | Welcome header + top-right Core/Vault status dot, Platform stat tiles, then the sectioned launchpad: **Core** · **Apps** · **Tools** · **Dienste** (only non-empty sections render) |
| `/settings` | Tabbed settings (lx-tabs bar): Allgemein · Darstellung · Auth-Anbieter · Plugins · Profil · System Info · Benachrichtigungen |
| `/settings?section=notifications` | Notification endpoint bindings (active toggle + provider) + per-provider config cards |
| `/users` | Benutzerverwaltung with **Benutzer** / **Gruppen & Rechte** tabs; user rows show role chips |
| `/apps/lyndrix-plugin-docker/docker` | Docker Manager main view — header has **Aktualisieren** + **Settings** buttons, host list |
| `/apps/lyndrix-plugin-docker/docker/settings` | Docker Manager settings — Docker Hosts list + "Host hinzufügen" form |

> For driving a specific plugin's React UI there are per-plugin skills that wrap this
> driver with the plugin's exact route (e.g. `run-docker-manager`, and the React notes in
> `run-server-manager` / `run-iac-orchestrator`).

### Drive the core-served UI (`/app`)

When core serves the SPA (`LYNDRIX_UI_ENGINE=react|both`), point `UI_URL` at
`/app` — same driver, screenshots the UI served **from core (8081)**, not Vite:

```bash
UI_URL=http://localhost:8081/app CORE_URL=http://localhost:8081 \
  node .claude/skills/run-lyndrix-ui/driver.mjs /plugins /tmp/core-served.png
```

Override any target via env: `UI_URL`, `CORE_URL`, `ADMIN_PASS`.

## Verify the backend API directly (no browser)

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<LYNDRIX_ADMIN_PASSWORD from core .env.dev>"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['token'])")

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/plugins | python3 -m json.tool
# Plugin settings (schema-driven): GET/PUT /api/plugins/{id}/settings
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/plugins/lyndrix.plugin.docker/settings
```

## Run (human path)

`(cd ../lyndrix-core && docker compose -f docker/docker-compose.dev.yml up)` then
`docker compose -f docker/docker-compose.dev.yml up`, open http://localhost:5173,
log in as `admin`. Useless headless — for any automated check use the driver.

## Gotchas

- **Login response key is `token`, not `access_token`.** `POST /api/auth/login`
  returns `{"token":"lyk_...","username":...,"roles":[...]}`. The bearer token is
  the opaque `lyk_...` string (a UserApiKey), not a JWT.
- **Cold deep-links to plugin pages now work** (since the B1 fix). `App.tsx` has
  an `/apps/*` route that shows a loader while the `/api/plugins` query is pending,
  then the real `/apps/<safe-id>/...` route renders. Previously a cold hard-nav
  fell through to `/dashboard`; if you ever see that bounce again, the loading
  guard regressed. The clickSelector arg still works for clicking *within* a page.
- **`safe-id` = plugin id with ONLY dots → dashes** (`plugin.id.replace(/\./g, '-')`
  in App.tsx). **Underscores in the id are kept** — `lyndrix.plugin.docker` →
  `lyndrix-plugin-docker`, but `lyndrix.plugin.server_manager` →
  `lyndrix-plugin-server_manager` and `lyndrix.plugin.iac_orchestrator` →
  `lyndrix-plugin-iac_orchestrator`. All-dashing an underscore id silently bounces to
  `/dashboard` (verified) — a common, confusing trap.
- **Core-served base is `/app`.** The built SPA uses Vite `base=/app/` and
  React-Router `basename=/app` (to avoid colliding with core's `/assets` mount).
  So when driving the core-served UI, `UI_URL` must end in `/app` and routes are
  under it (the driver composes `UI_URL + route`).
- **Token lives in `localStorage('lyndrix_token')`.** The driver must visit the
  origin once (`/login`) before it can `setItem`, then navigate to the target.
- **`ws` is at a non-standard path** (`/usr/share/nodejs/ws`), and Node 18 has no
  global `WebSocket`. The driver uses `createRequire('/usr/share/nodejs/ws/')`.
- **`.env.dev` files are CRLF** (Windows line endings). The driver strips `\r`
  when reading the admin password; do the same in any shell extraction.
- **chromium is the snap build** (`/snap/bin/chromium`). `--headless=new
  --no-sandbox` works; `--no-sandbox` is required in this container.
- **Screenshots capture the viewport only — content below the fold is cut off.**
  The app scrolls inside `<main className="flex-1 overflow-y-auto">`
  (`AppShell.tsx`), NOT the document body, so CDP `captureBeyondViewport` does
  **nothing** (the body is always viewport-height). The driver hardcodes
  `--window-size=1400,900`. To see a long page (e.g. the full dashboard with all
  launchpad sections), temporarily raise the window height — edit the
  `--window-size` height in `driver.mjs` (e.g. `1400,1750`) for that run. A
  click-to-scroll selector won't help; the whole page must fit the window.
- **A core reload can HANG and make core unresponsive — `docker restart
  lyndrix-core-dev` is the reliable fix.** uvicorn `--reload` watches core's tree
  *including* mounted `plugins/`, so editing a plugin `.py` triggers a reload. But
  the reload often gets stuck on `Waiting for connections to close. (CTRL+C to
  force quit)` — a long-lived SSE stream or a State-Monitoring probe connection
  never closes — and from then on **every HTTP request to :8081 hangs** (`curl`
  exits 28 / timeout) even though `docker ps` shows the container "Up". Symptom in
  `docker logs lyndrix-core-dev`: `WatchFiles detected changes ... Reloading` then
  `Shutting down / Waiting for connections to close`. Cure: `docker restart
  lyndrix-core-dev` and wait for `/api/health` to answer. Do this proactively after
  editing any plugin `.py`, plugin manifest, or **core locale file**
  (`app/locales/ui.{en,de}.json`) instead of trusting `--reload`. After locale
  edits the React client revalidates the i18n catalog via `?v=` (the version
  fingerprint bumps); sanity-check parity from lyndrix-core with `python3
  scripts/check_i18n_keys.py` (en is source of truth). The Vite UI itself *does*
  hot-reload cleanly — UI-only edits need no restart.
- **Run the driver one at a time.** Login hashes with Argon2 (CPU-heavy); several
  concurrent `driver.mjs` runs hammering `/api/auth/login` pile load on core and
  can tip an already-reloading core over the edge. Screenshot pages sequentially.

## Troubleshooting

- `login failed: ...` → core not up or wrong password. Check
  `curl -s http://localhost:8081/api/health` and the `LYNDRIX_ADMIN_PASSWORD`
  line in `../lyndrix-core/docker/.env.dev`.
- `selector not found: ...` → the clicked element isn't on `/plugins` yet
  (query still loading, or the plugin is disabled so its gear is hidden).
  Increase the post-navigate wait or confirm the plugin is active.
- Screenshot is the dashboard when you expected a plugin page → the `/apps/*`
  loading guard regressed (B1), the plugin is disabled, or (core-served) `UI_URL`
  is missing the `/app` base.
- `chromium remote-debugging endpoint never came up` → chromium failed to launch;
  run `chromium --headless=new --no-sandbox --version` to see the error.
- **Every `curl http://localhost:8081/...` times out (exit 28) but `docker ps`
  shows core "Up"** → core is stuck mid-`--reload` on `Waiting for connections to
  close` (check `docker logs lyndrix-core-dev`). Fix: `docker restart
  lyndrix-core-dev`, then poll `/api/health` until it answers. See Gotchas.
- **Long page is cut off in the screenshot** → the viewport is only 900px tall and
  the page scrolls inside `<main overflow-y-auto>`. Raise the `--window-size`
  height in `driver.mjs` for that run; `captureBeyondViewport` won't help.
