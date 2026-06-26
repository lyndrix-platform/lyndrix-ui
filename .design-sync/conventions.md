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

`QueryClientProvider` — required by any component that calls `useQuery` or `useMutation` internally (`WelcomeSection`, `Sidebar`, `AppShell`). `MemoryRouter` — required by any component that calls `useNavigate` or renders `NavLink` (`Sidebar`, `AppShell`). `PluginLaunchpad`, `SectionTag`, `FeatureCard`, and `HeroBadge` need neither, but wrapping universally is safe.

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

## Homepage design language (marketing / lyndrix.eu)

The public-facing homepage at `home.lyndrix.eu` defines the broader Lyndrix visual identity. These patterns inform how new marketing-facing surfaces, onboarding screens, and splash pages should look and feel inside the application.

### Homepage token palette

The homepage uses a parallel `--bg-*` / `--accent-*` / `--text-*` naming scheme (no `lx-` prefix) for its global CSS variables. When designing marketing-adjacent surfaces (hero banners, empty-state splash, landing overlays), use these reference values:

| Role | Variable | Hex / value | App equivalent |
|---|---|---|---|
| Page background | `--bg-primary` | `#0a0e1a` | `--lx-bg` (`#0f1117`) — homepage is deeper navy |
| Secondary background | `--bg-secondary` | `#0f1629` | — |
| Glassmorphism card | `--bg-card` | `rgba(15,22,41,0.8)` | `--lx-surface` (solid) |
| Accent cyan | `--accent-cyan` | `#00d4ff` | `--lx-accent` (`#22d3ee`) |
| Accent blue | `--accent-blue` | `#0ea5e9` | `--lx-accent-2` (`#38bdf8`) |
| Accent purple | `--accent-purple` | `#8b5cf6` | `--lx-accent-3` (`#818cf8`) |
| Primary text | `--text-primary` | `#f0f6ff` | `--lx-text` (`#f1f5f9`) |
| Secondary text | `--text-secondary` | `#94a3b8` | `--lx-text-muted` |
| Dimmer muted text | `--text-muted` | `#64748b` | — |
| Accent border | `--border-color` | `rgba(0,212,255,0.15)` | `--lx-border` |
| Neutral card border | `--border-card` | `rgba(255,255,255,0.08)` | `--lx-border-soft` |
| Cyan glow | `--glow-cyan` | `0 0 30px rgba(0,212,255,0.3)` | `--lx-glow` (smaller) |
| Blue glow | `--glow-blue` | `0 0 30px rgba(14,165,233,0.3)` | — |

The homepage background is a deeper, cooler navy (`#0a0e1a`) compared to the app's near-black (`#0f1117`). The accent cyan on the homepage is `#00d4ff` (pure RGB 0-212-255) while the app uses `#22d3ee` (Tailwind cyan-400). Both read as the same brand cyan to the eye.

### Typography

The homepage prioritises **JetBrains Mono** as a display typeface — monospaced type used for headings, the logo wordmark, and UI chrome text. This is intentional brand positioning: the product is for developers, so the marketing font is a developer's font.

```css
/* Homepage font stacks (reference — not compiled into lyndrix-ui) */
--font-sans: 'JetBrainsMonoNL Nerd Font Propo', 'JetBrains Mono', 'Noto Sans', system-ui, …;
--font-mono: 'JetBrainsMonoNL Nerd Font Mono', 'JetBrains Mono', 'Fira Code', monospace;
```

The app currently uses **Inter** (loaded at runtime). When adding surfaces that should feel more "homepage-like" (splash screens, onboarding), consider adding `font-mono` (JetBrains Mono) for display headings while keeping Inter for body text.

Heading scale used on the homepage:
- H1 hero title: `clamp(2.5rem, 5vw, 4rem)`, weight 800, tracking -0.03em
- H2 section title: `clamp(2rem, 4vw, 3rem)`, weight 800, tracking -0.025em
- H3 card title: `1.1rem`, weight 700, tracking -0.01em
- Body/description: `0.92rem`–`1.1rem`, line-height 1.7, color `--text-secondary`

### Key visual patterns

#### Gradient text (brand wordmark / hero headline accent)
```jsx
<span style={{
  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}>
  Lyndrix
</span>
```
Used on: nav wordmark, footer brand name, hero title accent word ("Ship Plugins."), CTA button.

#### Section tag / badge pill
Small uppercase pill above every section heading:
```jsx
<span style={{
  display: 'inline-block',
  padding: '0.3rem 0.875rem',
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#00d4ff',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}}>
  Why Lyndrix
</span>
```

#### Hero badge (with animated dot)
The "Open Source · Apache 2.0" pill at the top of the hero:
```jsx
<div style={{
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.375rem 0.875rem',
  background: 'rgba(0,212,255,0.1)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '999px',
  fontSize: '0.8rem', fontWeight: 500, color: '#00d4ff',
}}>
  <span style={{
    width: 6, height: 6, background: '#00d4ff', borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  }} />
  Open Source · Apache 2.0
</div>
```

#### Glassmorphism card
Cards across Features, Ecosystem, Docs sections:
```jsx
<div style={{
  background: 'rgba(15,22,41,0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  padding: '2rem',
  backdropFilter: 'blur(8px)',
  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
}}>
  {/* on hover: */}
  {/* borderColor: 'rgba(0,212,255,0.3)', */}
  {/* boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,212,255,0.1)', */}
  {/* transform: 'translateY(-4px)', */}
</div>
```

#### Feature card anatomy
Each feature card has: icon container → title → description (with inline `<code>` styled cyan).
```jsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
  <div style={{
    width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,212,255,0.1)', borderRadius: 12, color: '#00d4ff', flexShrink: 0,
  }}>
    {/* SVG icon, 24×24, stroke="currentColor" strokeWidth="1.75" */}
  </div>
  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f6ff', letterSpacing: '-0.01em' }}>
    Plugin-First Architecture
  </h3>
  <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.7 }}>
    Drop in a plugin with <code style={{ fontFamily: 'monospace', fontSize: '0.85em',
      background: 'rgba(0,212,255,0.1)', color: '#00d4ff', padding: '0.1em 0.4em',
      borderRadius: 4 }}>setup(ctx)</code> and go.
  </p>
</div>
```

#### CTA button pair
Primary (gradient fill, dark text) + Secondary (ghost):
```jsx
<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
  <a style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '0.75rem 1.75rem', fontSize: '1rem', fontWeight: 600,
    color: '#0a0e1a',
    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
    borderRadius: 12, textDecoration: 'none',
  }}>
    Get Started →
  </a>
  <a style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '0.75rem 1.75rem', fontSize: '1rem', fontWeight: 600,
    color: '#f0f6ff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, textDecoration: 'none',
  }}>
    View Docs
  </a>
</div>
```

#### Dot grid background
Repeating 40 px grid using the brand cyan at very low opacity, masked to an ellipse at the centre:
```css
background-image:
  linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
  linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px);
background-size: 40px 40px;
mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
```

#### Floating glow blobs (hero atmosphere)
Two large, blurred radial gradients positioned off the corners, animated with `float`:
```css
/* blob 1 — cyan, top-right */
width: 600px; height: 600px;
background: radial-gradient(circle, rgba(0,212,255,0.2), transparent 70%);
filter: blur(80px); opacity: 0.4;
animation: float 8s ease-in-out infinite;

/* blob 2 — purple, bottom-left (reverse) */
background: radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%);
animation: float 10s ease-in-out infinite reverse;

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
```

#### Browser chrome mockup
Used in the hero to frame a screenshot with a realistic browser bar:
```jsx
<div style={{
  background: '#1a2035', borderRadius: 20, overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 0 0 1px rgba(0,212,255,0.1), 0 40px 80px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,255,0.3)',
  transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
}}>
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.75rem 1rem', background: '#111827',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}>
    <div style={{ display: 'flex', gap: 5 }}>
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57' }} />
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#ffbd2e' }} />
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#28c840' }} />
    </div>
    <div style={{
      flex:1, background:'rgba(255,255,255,0.06)', borderRadius:4,
      padding:'0.25rem 0.75rem', fontSize:'0.75rem', fontFamily:'monospace', color:'#64748b',
    }}>
      lyndrix.local/dashboard
    </div>
  </div>
  <img src="…" alt="Dashboard screenshot" style={{ width:'100%', display:'block' }} />
</div>
```

#### Code panel (dark, sticky, macOS dots)
```jsx
<div style={{
  background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20, overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
}}>
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.75rem 1.25rem', background: '#161b22',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}>
    {/* macOS dots */}
    <div style={{ display:'flex', gap:5 }}>
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#ff5f57' }} />
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#ffbd2e' }} />
      <span style={{ width:10, height:10, borderRadius:'50%', background:'#28c840' }} />
    </div>
    <span style={{ fontFamily:'monospace', fontSize:'0.8rem', color:'#94a3b8', flex:1 }}>entrypoint.py</span>
    <span style={{
      fontSize:'0.75rem', padding:'0.2rem 0.5rem',
      background:'rgba(0,212,255,0.1)', color:'#00d4ff', borderRadius:4, fontWeight:600,
    }}>Python</span>
  </div>
  <pre style={{
    margin:0, padding:'1.5rem', fontFamily:'monospace', fontSize:'0.82rem',
    lineHeight:1.7, color:'#e6edf3', overflowX:'auto', whiteSpace:'pre',
  }}>
    {codeSnippet}
  </pre>
</div>
```

#### Numbered step row
The "How it works" 01–04 step list:
```jsx
<div style={{ display:'flex', gap:'1.5rem', padding:'1.75rem 0', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
  <div style={{
    fontSize:'2.5rem', fontWeight:800, fontFamily:'monospace',
    color:'rgba(0,212,255,0.15)', lineHeight:1, flexShrink:0, width:'3rem',
    /* on hover: color: '#00d4ff' */
  }}>01</div>
  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', paddingTop:'0.25rem' }}>
    <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'#f0f6ff' }}>Deploy Lyndrix Core</h3>
    <p style={{ fontSize:'0.92rem', color:'#94a3b8', lineHeight:1.7 }}>…</p>
  </div>
</div>
```

#### Info / CTA banner
Used at the bottom of the Ecosystem section — full-width tinted strip:
```jsx
<div style={{
  display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem',
  padding:'1.25rem 2rem',
  background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)',
  borderRadius:20, fontSize:'0.95rem', color:'#94a3b8',
}}>
  {/* icon in --accent-cyan */}
  <a style={{ color:'#00d4ff', fontWeight:600 }}>Browse all plugins</a>
  &nbsp;·&nbsp;Want to build your own? →&nbsp;
  <a style={{ color:'#00d4ff', fontWeight:600 }}>Plugin Development Guide</a>
</div>
```

### Layout constants

| Token | Value | Use |
|---|---|---|
| `--container-max` | `1200px` | Max-width constraint on all section inner containers |
| `--section-padding` | `6rem 1.5rem` | Vertical breathing room between sections |
| `--radius-sm` | `6px` | Nav links, small badges |
| `--radius-md` | `12px` | Buttons, icon containers |
| `--radius-lg` | `20px` | Feature cards, code panels, browser mockup |
| `--transition` | `0.2s ease` | All hover state changes |

The app's `--lx-radius-*` tokens are tighter (4/8/12 px). Homepage surfaces feel more rounded, breathing more — use the homepage scale when building larger marketing-style panels.

### Section header pattern

Every homepage section uses the same three-piece header (tag → title → subtitle), centred:

```jsx
<div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
  <SectionTag>Why Lyndrix</SectionTag>
  <h2 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:800, lineHeight:1.15,
    letterSpacing:'-0.025em', color:'#f0f6ff' }}>
    Everything you need.<br/>Nothing you don't.
  </h2>
  <p style={{ fontSize:'1.1rem', color:'#94a3b8', maxWidth:560, lineHeight:1.7 }}>
    Lyndrix is the foundation your application sits on.
  </p>
</div>
```

---

## Where the truth lives

- `_ds_bundle.css` (= compiled Tailwind + `:root` CSS variables): loaded by every preview and every design — check this file for the exact palette values and utility classes available.
- Per-component `.prompt.md`: props API and usage guidance.
- `window.LyndrixUI` exports: `AppShell`, `PluginLaunchpad`, `Sidebar`, `WelcomeSection`, `SectionTag`, `FeatureCard`, `HeroBadge`, `QueryClientProvider`, `MemoryRouter`, `queryClient`.
- Homepage source: `lyndrix-dev/lyndrix-homepage/src/` — Astro components, all patterns above are extracted from there.
- See `guidelines/homepage-patterns.md` for the complete visual reference for marketing surfaces.

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
