# Lyndrix Design System — Conventions

## Provider setup (required)

All Lyndrix components must be wrapped in `QueryClientProvider` and `MemoryRouter`. The sync bundles a shared singleton client — use it:

```jsx
import { LyndrixUI } from 'ds'
const { QueryClientProvider, MemoryRouter, queryClient, AppShell } = LyndrixUI

<QueryClientProvider client={queryClient}>
  <MemoryRouter>
    <AppShell>…</AppShell>
  </MemoryRouter>
</QueryClientProvider>
```

`QueryClientProvider` — required by any component that calls `useQuery` or `useMutation` internally (`WelcomeSection`, `Sidebar`, `AppShell`). `MemoryRouter` — required by any component that calls `useNavigate` or renders `NavLink` (`Sidebar`, `AppShell`). `PluginLaunchpad` needs neither, but wrapping universally is safe.

---

## App token system (runtime UI)

Lyndrix uses **Tailwind 3** with a custom token layer bridged through CSS variables. Style new layout glue with token-aliased Tailwind classes where possible; fall back to `[var(--lx-*)]` for one-off overrides.

| Purpose | Tailwind class | CSS variable | Value |
|---|---|---|---|
| Page background | `bg-lx-bg` | `var(--lx-bg)` | `#0f1117` |
| Card/panel surface | `bg-lx-surface` | `var(--lx-surface)` | `#1a1d27` |
| Modal / dropdown background | `bg-lx-elevated` | `var(--lx-elevated)` | `#22263a` |
| Primary accent (cyan) | `text-lx-accent` / `bg-lx-accent` | `var(--lx-accent)` | `#22d3ee` |
| Secondary accent (sky) | `text-lx-accent-2` | `var(--lx-accent-2)` | `#38bdf8` |
| Tertiary accent (violet) | `text-lx-accent-3` | `var(--lx-accent-3)` | `#818cf8` |
| Primary text | `text-lx-text` | `var(--lx-text)` | `#f1f5f9` |
| Muted / secondary text | `text-lx-text-muted` | `var(--lx-text-muted)` | `#94a3b8` |
| Accent border | `border-lx-border` | `var(--lx-border)` | `#22d3ee33` |
| Subtle border | `border-lx-border-soft` | `var(--lx-border-soft)` | `#334155` |
| Status: up/active | — | `var(--lx-state-up)` | `#22d3ee` |
| Status: down/error | — | `var(--lx-state-down)` | `#f87171` |
| Status: paused/warning | — | `var(--lx-state-paused)` | `#fbbf24` |
| Status: unknown | — | `var(--lx-state-unknown)` | `#94a3b8` |
| Box shadow glow | `shadow-glow` | `var(--lx-glow)` | `0 0 16px 0 #22d3ee33` |

Border radius tokens: `rounded-sm` → 4 px, `rounded-md` → 8 px, `rounded-lg` → 12 px.

The theme is **dark by default** — `:root` sets the dark palette. There is no runtime light/dark switcher yet; `darkMode: 'class'` is declared but unused.

---

## Homepage design language (marketing — home.lyndrix.eu)

The public homepage defines the broader Lyndrix visual identity. These patterns inform how marketing-adjacent surfaces (hero banners, empty-state splash, landing overlays) should look and feel. See **`homepage/HomepagePatterns.html`** in this project for a live preview of every pattern.

### Token palette

The homepage uses a `--bg-*` / `--accent-*` / `--text-*` naming scheme (no `lx-` prefix). Values to use when designing marketing surfaces:

| Role | Variable | Hex | App equivalent |
|---|---|---|---|
| Page background | `--bg-primary` | `#0a0e1a` | `--lx-bg` (`#0f1117`) |
| Secondary background | `--bg-secondary` | `#0f1629` | — |
| Glassmorphism card | `--bg-card` | `rgba(15,22,41,0.8)` + `backdrop-filter:blur(8px)` | `--lx-surface` (solid) |
| Accent cyan | `--accent-cyan` | `#00d4ff` | `--lx-accent` (`#22d3ee`) |
| Accent blue | `--accent-blue` | `#0ea5e9` | `--lx-accent-2` (`#38bdf8`) |
| Accent purple | `--accent-purple` | `#8b5cf6` | `--lx-accent-3` (`#818cf8`) |
| Primary text | `--text-primary` | `#f0f6ff` | `--lx-text` (`#f1f5f9`) |
| Secondary text | `--text-secondary` | `#94a3b8` | `--lx-text-muted` |
| Dimmer muted text | `--text-muted` | `#64748b` | — |
| Accent border | `--border-color` | `rgba(0,212,255,0.15)` | `--lx-border` |
| Neutral card border | `--border-card` | `rgba(255,255,255,0.08)` | `--lx-border-soft` |
| Cyan glow (larger) | `--glow-cyan` | `0 0 30px rgba(0,212,255,0.3)` | `--lx-glow` (16 px) |

The homepage background is a deeper, cooler navy (`#0a0e1a`) vs the app's near-black (`#0f1117`). The accent cyan is `#00d4ff` (pure RGB 0–212–255) vs the app's `#22d3ee` (Tailwind cyan-400) — both read as the same brand cyan.

### Typography

The homepage uses **JetBrains Mono** as a display typeface (monospaced for headings, wordmark, and UI chrome text). This is intentional brand positioning — the product is for developers.

```
--font-sans: 'JetBrainsMonoNL Nerd Font Propo', 'JetBrains Mono', 'Noto Sans', system-ui, …
--font-mono: 'JetBrainsMonoNL Nerd Font Mono', 'JetBrains Mono', 'Fira Code', monospace
```

The app uses **Inter** at runtime. When adding splash/onboarding surfaces that should feel homepage-like, use JetBrains Mono for display headings.

Heading scale:
- H1 hero: `clamp(2.5rem, 5vw, 4rem)`, weight 800, tracking −0.03em
- H2 section: `clamp(2rem, 4vw, 3rem)`, weight 800, tracking −0.025em
- H3 card: `1.1rem`, weight 700, tracking −0.01em
- Body: `0.92rem`–`1.1rem`, line-height 1.7, color `--text-secondary`

### Layout constants

| Token | Value |
|---|---|
| `--container-max` | `1200px` |
| `--section-padding` | `6rem 1.5rem` |
| `--radius-sm` | `6px` (vs 4 px in app) |
| `--radius-md` | `12px` (vs 8 px in app) |
| `--radius-lg` | `20px` (vs 12 px in app) |
| `--transition` | `0.2s ease` |

Homepage surfaces are more rounded than the app — use the homepage scale for larger marketing-style panels.

### Visual patterns (with code)

#### Gradient text
Used on nav wordmark, footer brand, hero accent word, CTA:
```css
background: linear-gradient(135deg, #00d4ff, #0ea5e9);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
```

#### Section tag / badge pill
Appears above every section heading:
```css
display: inline-block;
padding: 0.3rem 0.875rem;
background: rgba(0,212,255,0.1);
border: 1px solid rgba(0,212,255,0.2);
border-radius: 999px;
font-size: 0.8rem; font-weight: 600; color: #00d4ff;
text-transform: uppercase; letter-spacing: 0.08em;
```

#### Hero badge with pulse dot
```css
/* outer pill — same as section tag */
/* inner dot */
width: 6px; height: 6px; background: #00d4ff; border-radius: 50%;
animation: pulse 2s ease-in-out infinite;
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
```

#### Glassmorphism card
```css
background: rgba(15,22,41,0.8);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 20px;
padding: 2rem;
backdrop-filter: blur(8px);
/* hover: */
border-color: rgba(0,212,255,0.3);
box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,212,255,0.1);
transform: translateY(-4px);
```

#### Feature card icon container
```css
width: 48px; height: 48px;
display: flex; align-items: center; justify-content: center;
background: rgba(0,212,255,0.1);
border-radius: 12px;
color: #00d4ff;
```

#### CTA buttons
```css
/* Primary */
padding: 0.75rem 1.75rem; font-size: 1rem; font-weight: 600;
color: #0a0e1a;
background: linear-gradient(135deg, #00d4ff, #0ea5e9);
border-radius: 12px;
/* hover: opacity 0.9; box-shadow: 0 0 30px rgba(0,212,255,0.3); transform: translateY(-2px) */

/* Secondary / ghost */
color: #f0f6ff;
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.08);
/* hover: background rgba(255,255,255,0.1); border-color rgba(0,212,255,0.3) */
```

#### Dot grid background
```css
background-image:
  linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px);
background-size: 40px 40px;
mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
```

#### Floating glow blobs (hero atmosphere)
```css
/* cyan blob — top-right */
background: radial-gradient(circle, rgba(0,212,255,0.2), transparent 70%);
filter: blur(80px); opacity: 0.4;
animation: float 8s ease-in-out infinite;

/* purple blob — bottom-left */
background: radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%);
animation: float 10s ease-in-out infinite reverse;

@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
```

#### Browser chrome mockup
Frame: `background: #1a2035`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,0.08)`, `box-shadow: 0 0 0 1px rgba(0,212,255,0.1), 0 40px 80px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,255,0.3)`, optionally `transform: perspective(1000px) rotateY(-5deg) rotateX(2deg)`.
Bar: `background: #111827`. macOS traffic-light dots: red `#ff5f57`, yellow `#ffbd2e`, green `#28c840`.

#### Code panel
Frame: `background: #0d1117`, header: `background: #161b22`. Same macOS dots. Language badge: `background: rgba(0,212,255,0.1); color: #00d4ff; border-radius: 4px`. Code body: `color: #e6edf3; line-height: 1.7; font-size: 0.82rem`.

#### Numbered step row
```css
.step-number { font-size: 2.5rem; font-weight: 800; font-family: monospace;
  color: rgba(0,212,255,0.15); /* hover: color: #00d4ff */ }
```

#### Info/CTA banner
```css
display: flex; align-items: center; justify-content: center; gap: 0.5rem;
padding: 1.25rem 2rem;
background: rgba(0,212,255,0.06);
border: 1px solid rgba(0,212,255,0.15);
border-radius: 20px;
font-size: 0.95rem; color: #94a3b8;
```

### Section header pattern
Every section uses the same three-piece header: `SectionTag` → `H2` → subtitle `<p>`, all centred:
```html
<div style="text-align:center; display:flex; flex-direction:column; align-items:center; gap:1rem">
  <span class="section-tag">Why Lyndrix</span>
  <h2>Everything you need.<br>Nothing you don't.</h2>
  <p>Lyndrix is the foundation your application sits on.</p>
</div>
```

---

## Where the truth lives

- `_ds_bundle.css` (= compiled Tailwind + `:root` CSS variables): loaded by every preview and every design.
- Per-component `.prompt.md`: props API and usage guidance.
- `window.LyndrixUI` exports: `AppShell`, `PluginLaunchpad`, `Sidebar`, `WelcomeSection`, `QueryClientProvider`, `MemoryRouter`, `queryClient`.
- **`homepage/HomepagePatterns.html`** — live preview of all homepage visual patterns.
- Homepage source: `lyndrix-dev/lyndrix-homepage/src/` (Astro) — all patterns above are extracted from there.

## Idiomatic build snippet

```jsx
// A card inside AppShell — the canonical composition pattern
<QueryClientProvider client={queryClient}>
  <MemoryRouter>
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <h1 className="text-2xl font-light text-lx-text">Dashboard</h1>
        <div className="grid grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="p-4 rounded-lg border border-lx-border-soft bg-lx-surface">
              <p className="text-sm font-medium text-lx-text">{item.name}</p>
              <p className="text-[10px] text-lx-text-muted mt-1">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  </MemoryRouter>
</QueryClientProvider>
```

# LyndrixUI (lyndrix-ui@0.0.0)

This design system is the published lyndrix-ui React library, bundled as a single
browser global. All 4 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.LyndrixUI`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.LyndrixUI.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { AppShell } = window.LyndrixUI;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<AppShell />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<QueryClientProvider client={queryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
```

## Tokens

70 CSS custom properties from lyndrix-ui. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (8): `--tw-border-spacing-x`, `--tw-border-spacing-y`, `--tw-ring-offset-color`, …
- **spacing** (1): `--tw-ring-inset`
- **radius** (3): `--lx-radius-sm`, `--lx-radius-md`, `--lx-radius-lg`
- **shadow** (4): `--tw-ring-offset-shadow`, `--tw-ring-shadow`, `--tw-shadow`, …
- **other** (54): `--tw-translate-x`, `--tw-translate-y`, `--tw-rotate`, …

## Components

### layout
- `AppShell`
- `Sidebar`

### dashboard
- `PluginLaunchpad`
- `WelcomeSection`
