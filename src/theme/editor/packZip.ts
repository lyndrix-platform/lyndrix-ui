// Client-side theme-pack export.
//
// Builds a theme ZIP entirely in the browser (fflate, ~8 kB) and uploads it to
// core's `POST /api/themes` — the exact same multipart contract the "Upload
// theme ZIP" affordance uses. The ZIP layout mirrors what the server extracts:
//
//   tokens.json        (root)   — the full base⊕edits token document
//   components.json    (root)   — the base theme's components, verbatim
//   assets/<name>.<ext>         — optional carried-over background images
//
// Load-bearing: the server derives the theme id from the *filename stem* of the
// uploaded file, so the File MUST be named exactly `<id>.zip` (see uploadThemePack).

import { zipSync, strToU8 } from 'fflate'
import { getToken, clearToken, ApiError } from '../../lib/api'

/** A background-image asset to embed under `assets/<name>` in the pack. */
export interface PackAsset {
  name: string
  bytes: Uint8Array
}

/**
 * Build a theme-pack ZIP: tokens.json + components.json at root, plus one
 * `assets/<name>` entry per asset. Returns the raw ZIP bytes (deflate level 6).
 */
export function buildThemeZip(
  tokens: unknown,
  components: unknown,
  assets: PackAsset[] = [],
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'tokens.json': strToU8(JSON.stringify(tokens, null, 2)),
    'components.json': strToU8(JSON.stringify(components, null, 2)),
  }
  for (const a of assets) {
    // Basename only — never a path — so it lands directly in `assets/`.
    const base = a.name.replace(/\\/g, '/').split('/').pop() ?? a.name
    if (base) files[`assets/${base}`] = a.bytes
  }
  return zipSync(files, { level: 6 })
}

/** Result of a successful pack upload; carries any server validation warnings. */
export interface UploadResult {
  warnings?: string[]
}

/**
 * Fetch a theme asset's bytes (unauthenticated endpoint — the browser reaches
 * it via CSS url()). Returns null if the asset is missing so the save flow can
 * best-effort skip it rather than aborting the whole pack.
 */
export async function fetchAssetBytes(
  themeId: string,
  filename: string,
): Promise<Uint8Array | null> {
  try {
    const res = await fetch(
      `/api/themes/${encodeURIComponent(themeId)}/assets/${encodeURIComponent(filename)}`,
    )
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

/**
 * Upload a pre-built ZIP as theme `<id>` via multipart POST /api/themes,
 * mirroring the existing handleUpload flow (bearer token, FormData). The File is
 * named `<id>.zip` because the server takes the id from the filename stem.
 *
 * On 401 it clears the session and redirects to /login (matching apiFetch), then
 * throws. Other non-2xx responses throw an ApiError carrying the status so the
 * caller can distinguish 403 (no api:write → disable save) from 422 (validation).
 */
export async function uploadThemePack(id: string, zip: Uint8Array): Promise<UploadResult> {
  const fd = new FormData()
  // Copy into a fresh ArrayBuffer so the Blob part is a plain BlobPart (avoids
  // SharedArrayBuffer-typed views tripping the File constructor in strict TS).
  const file = new File([zip.slice()], `${id}.zip`, { type: 'application/zip' })
  fd.append('file', file)

  const token = getToken()
  const res = await fetch('/api/themes', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })

  if (res.status === 401) {
    clearToken()
    if (window.location.pathname !== '/login') window.location.href = '/login'
    throw new ApiError('Unauthorized', 401)
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ detail: res.statusText }))) as {
      detail?: unknown
    }
    const detail = body?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join(', ')
          : `HTTP ${res.status}`
    throw new ApiError(message, res.status)
  }

  const body = (await res.json().catch(() => ({}))) as { validation_warnings?: string[] }
  return { warnings: body.validation_warnings }
}
