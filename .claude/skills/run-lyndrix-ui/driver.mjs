// CDP driver for the Lyndrix UI — an auth-gated React SPA served by Vite.
//
//   node driver.mjs <route> <outfile.png> [clickSelector]
//
// What it does:
//   1. Logs in to lyndrix-core (POST /api/auth/login) to get a `lyk_...` token.
//   2. Launches headless chromium with remote debugging and drives it over CDP.
//   3. Seeds the token into localStorage('lyndrix_token'), then navigates to <route>.
//   4. Optionally clicks [clickSelector] (real SPA navigation), then screenshots.
//
// Why the clickSelector path exists:
//   Plugin routes in App.tsx (`/apps/<safe-id>/...`) are registered DYNAMICALLY
//   from the /api/plugins query. A cold hard-load of a plugin URL renders before
//   that query resolves, so React Router's `*` fallback redirects to /dashboard.
//   To reach a plugin page you must navigate CLIENT-SIDE: load /plugins (warms
//   the query), then click the link/button that routes there. Hence:
//     node driver.mjs /plugins out.png 'button[title="Einstellungen"]'
//
// Requires: chromium, curl, python3, and node's `ws` (system: /usr/share/nodejs/ws).
import { spawn, execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire('/usr/share/nodejs/ws/')
const WebSocket = require('ws')

const HERE = dirname(fileURLToPath(import.meta.url))
const UI = process.env.UI_URL || 'http://localhost:5173'
const CORE = process.env.CORE_URL || 'http://localhost:8081'
const route = process.argv[2] || '/plugins'
const outFile = process.argv[3] || resolve(HERE, 'shot.png')
const clickSel = process.argv[4] || null
const DEBUG_PORT = 9222

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

// Admin password: env var, else read from lyndrix-core's dev env file (CRLF-safe).
function adminPassword() {
  if (process.env.ADMIN_PASS) return process.env.ADMIN_PASS
  // Skill lives at lyndrix-ui/.claude/skills/run-lyndrix-ui/ → core env is a sibling repo.
  const envPath = resolve(HERE, '../../../../lyndrix-core/docker/.env.dev')
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('LYNDRIX_ADMIN_PASSWORD='))
  if (!line) throw new Error(`LYNDRIX_ADMIN_PASSWORD not found in ${envPath}`)
  return line.split('=')[1].trim()
}

function login(pass) {
  const body = JSON.stringify({ username: 'admin', password: pass })
  const out = sh(`curl -s -X POST ${CORE}/api/auth/login -H 'Content-Type: application/json' -d ${JSON.stringify(body)}`)
  const token = JSON.parse(out).token
  if (!token || !token.startsWith('lyk_')) throw new Error('login failed: ' + out)
  return token
}

async function rpc(ws, id, method, params) {
  return new Promise((res) => {
    const onMsg = (d) => { const m = JSON.parse(d); if (m.id === id) { ws.off('message', onMsg); res(m.result) } }
    ws.on('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function waitForDebugger(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return JSON.parse(sh(`curl -s http://localhost:${DEBUG_PORT}/json`)) } catch { await sleep(250) }
  }
  throw new Error('chromium remote-debugging endpoint never came up')
}

const main = async () => {
  const token = login(adminPassword())
  console.error('login ok')

  const chrome = spawn('chromium', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`, '--window-size=1400,900', 'about:blank',
  ], { stdio: 'ignore' })

  try {
    const page = (await waitForDebugger()).find((t) => t.type === 'page')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((r) => ws.on('open', r))
    let id = 1
    await rpc(ws, id++, 'Page.enable', {})
    await rpc(ws, id++, 'Runtime.enable', {})

    await rpc(ws, id++, 'Page.navigate', { url: UI + '/login' })
    await sleep(1500)
    await rpc(ws, id++, 'Runtime.evaluate', { expression: `localStorage.setItem('lyndrix_token', ${JSON.stringify(token)})` })
    await rpc(ws, id++, 'Page.navigate', { url: UI + route })
    await sleep(3000)

    if (clickSel) {
      const r = await rpc(ws, id++, 'Runtime.evaluate', {
        expression: `(() => { const el = document.querySelector(${JSON.stringify(clickSel)}); if (!el) return 'NOT_FOUND'; el.click(); return 'CLICKED'; })()`,
        returnByValue: true,
      })
      console.error(`click ${clickSel} -> ${r.result.value}`)
      if (r.result.value === 'NOT_FOUND') throw new Error(`selector not found: ${clickSel}`)
      await sleep(2500)
    }

    const { data } = await rpc(ws, id++, 'Page.captureScreenshot', { format: 'png' })
    writeFileSync(outFile, Buffer.from(data, 'base64'))
    console.error('screenshot ->', outFile)
    ws.close()
  } finally {
    chrome.kill()
  }
}
main().catch((e) => { console.error(e.message || e); process.exit(1) })
