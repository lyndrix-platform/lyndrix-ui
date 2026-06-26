# Design-sync notes — lyndrix-ui

## Setup (first sync)

- Added `src/index.ts` barrel exporting 4 components + public types.
- Added `vite.lib.config.ts` for library build (externalizes react, @tanstack/react-query, react-router-dom, lucide-react).
- Added `tsconfig.lib.json` for declaration emit (`dist/types/`).
- Added `src/design-sync-providers.ts` — exports `QueryClientProvider`, `MemoryRouter`, `queryClient` for use by `cfg.provider`.
- `tailwind.config.js` content array extended to include `.design-sync/previews/**/*.tsx` so preview wrapper classes are compiled.
- Build command: `npm run build:lib` (= vite lib build + tsc declarations + tailwindcss compile).
- Compiled CSS lives at `dist/lyndrix.css` (12 KB). `cfg.cssEntry` points here (not the raw `src/index.css`).

## Why @tanstack/react-query and react-router-dom are externalized in vite.lib.config.ts

If bundled into `dist/index.es.js` by Vite AND imported separately by `src/design-sync-providers.ts` via esbuild, they produce TWO module instances inside `_ds_bundle.js`. React context doesn't cross module boundaries, so `QueryClientProvider` (from extraEntries) can't reach `useQueryClient()` (from the Vite-bundled copy). Externalizing them forces esbuild to resolve both from `node_modules` once → single instance → context works.

## Known render warns

- `[RENDER_THIN]` on Sidebar was benign — two stories rendered identically because `cfg.provider` wraps with a default `MemoryRouter` (no `initialEntries`), so per-story route customisation isn't possible. Simplified to 1 story.
- `[GRID_OVERFLOW]` on AppShell — resolved with `cfg.overrides.AppShell: { "cardMode": "column" }`.

## Re-sync commands

```sh
# From lyndrix-ui/
npm run build:lib   # rebuild dist/ + types + lyndrix.css

# Stage fresh converter scripts first
cp -r /path/to/design-sync-skill/* .ds-sync/

# Fetch remote anchor
DesignSync get_file _ds_sync.json → .design-sync/.cache/remote-sync.json

node .ds-sync/resync.mjs \
  --config .design-sync/config.json \
  --node-modules ./node_modules \
  --entry ./dist/index.es.js \
  --out ./ds-bundle \
  --remote .design-sync/.cache/remote-sync.json
```

## Homepage enrichment (2026-06-22)

Added 3 marketing pattern components extracted from `lyndrix-dev/lyndrix-homepage` (Astro site):
- `SectionTag` — uppercase pill/badge with cyan/blue/purple variant; matches homepage section labels
- `FeatureCard` — frosted-glass card (backdrop-filter: blur(8px)) with icon slot, title, description; matches homepage feature grid
- `HeroBadge` — pulsing announcement pill; matches the "Open Source · Apache 2.0" hero badge

All 3 live in `src/components/marketing/` and export from `src/index.ts`.

CSS additions to `src/index.css`:
- `@import url('https://fonts.googleapis.com/...')` for JetBrains Mono (homepage primary font)
- `@keyframes lx-badge-pulse` (HeroBadge dot animation, 2s, opacity 1↔0.35)
- `@keyframes lx-float` (hero glow blob float, for inline-style use)

Config additions:
- `cfg.overrides.FeatureCard: {"cardMode": "column"}` — FeatureCard.Grid story is wider than a default grid cell

Uploaded to project:
- 3 new component dirs under `components/marketing/`
- `guidelines/homepage-patterns.md` — complete visual reference for marketing surfaces
- Updated bundle + README with homepage conventions

## Re-sync risks

- **Mock data in previews**: WelcomeSection.tsx has hardcoded user data (username: 'marvin', email: 'marvin@fam-feser.de'). If the preview needs to look different, edit `.design-sync/previews/WelcomeSection.tsx`.
- **queryClient singleton in extraEntries**: `src/design-sync-providers.ts` creates a shared `QueryClient` instance. If TanStack Query's API changes, this module may need updating alongside `cfg.provider`.
- **Tailwind JIT content scan**: `.design-sync/previews/**/*.tsx` is added to `tailwind.config.js` content. New preview classes not already in `src/` will be compiled correctly.
- **Inter font**: Relies on system Inter being installed. `runtimeFontPrefixes: ["Inter"]` suppresses the [FONT_MISSING] warn. If designers use a system without Inter, falls back to `system-ui`.
- **4 components only**: This repo is a React application, not a component library. As new pages/components are added to `src/`, they need to be manually exported from `src/index.ts` and `src/design-sync-providers.ts` (if new context is needed), then a re-sync run.
- **Sidebar "Apps" section empty in previews**: The plugins query calls `/api/plugins` which returns nothing in the static preview context. The sidebar renders with only the static nav items — no dynamic app links. This is expected.
