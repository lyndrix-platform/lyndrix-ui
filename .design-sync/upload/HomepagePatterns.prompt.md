# Homepage Design Patterns

Visual identity patterns extracted from `lyndrix-dev/lyndrix-homepage` (Astro/CSS).
These are reference components — not part of the `lyndrix-ui` React library, but the authoritative
source for how Lyndrix looks on the public web at `home.lyndrix.eu`.

Use these patterns when designing:
- Marketing-style sections inside the app (splash, onboarding, empty states)
- Landing-page or campaign overlays
- Documentation preview panes
- Any surface that should match the homepage visual identity rather than the runtime dashboard look

---

## Token palette

The homepage tokens differ slightly from the app's `--lx-*` system:

| Homepage token | Value | App equivalent |
|---|---|---|
| `--bg-primary` | `#0a0e1a` | `--lx-bg` `#0f1117` |
| `--bg-secondary` | `#0f1629` | — |
| `--bg-card` + `backdrop-filter:blur(8px)` | `rgba(15,22,41,0.8)` | `--lx-surface` (solid) |
| `--accent-cyan` | `#00d4ff` | `--lx-accent` `#22d3ee` |
| `--accent-blue` | `#0ea5e9` | `--lx-accent-2` `#38bdf8` |
| `--accent-purple` | `#8b5cf6` | `--lx-accent-3` `#818cf8` |
| `--glow-cyan` | `0 0 30px rgba(0,212,255,0.3)` | `--lx-glow` `0 0 16px …` |

The homepage uses rounder corners: sm=6 px, md=12 px, lg=20 px (vs app's 4/8/12 px).

---

## Patterns shown in this preview

### 1. Navbar (scrolled state)
Fixed, glass navbar with brand wordmark (gradient text), text nav links, and gradient CTA pill.
On scroll: `background: rgba(10,14,26,0.92); backdrop-filter: blur(16px)`.

### 2. Hero — headline + badge + stats
- **Hero badge**: pill with animated pulse dot, "Open Source · Apache 2.0"
- **H1 headline**: weight 800, `-0.03em` tracking; accent word uses `linear-gradient(135deg, #00d4ff, #0ea5e9)` gradient text
- **Dot grid background**: `rgba(0,212,255,0.04)` repeating 40 px grid masked to centre ellipse
- **Floating glow blobs**: cyan top-right + purple bottom-left, `blur(80px)`, `animation: float 8–10s infinite`
- **Stats row**: three key phrases (Plugin-First / Vault-Backed / Event-Driven) separated by 1 px hairlines

### 3. Section header
Used at the top of every section: `SectionTag` pill → `<h2>` with optional gradient accent → subtitle `<p>`.

### 4. Feature cards (glassmorphism)
`background: rgba(15,22,41,0.8); backdrop-filter: blur(8px)`.
Hover: `border-color rgba(0,212,255,0.3)`, `box-shadow 0 8px 32px + 1px cyan rim`, `translateY(-4px)`.
Icon container: 48×48 px, `rgba(0,212,255,0.1)` bg, `border-radius:12px`.
Inline `<code>`: cyan bg (`rgba(0,212,255,0.1)`), `border-radius:4px`.

### 5. CTA buttons
- **Large primary**: `linear-gradient(135deg, #00d4ff, #0ea5e9)`, dark text, `border-radius:12px`
- **Large ghost**: `rgba(255,255,255,0.06)`, white border, hover→cyan border
- **Small primary**: same gradient, `border-radius:6px` (nav size)
- **Small ghost**: GitHub link variant

### 6. Numbered steps + code panel
Step list: large dim number (`rgba(0,212,255,0.15)`) → reveals cyan on hover.
Code panel: `background:#0d1117`, header `#161b22`, macOS traffic-light dots, language badge.

### 7. Plugin cards (ecosystem grid)
Smaller cards (1.5 rem padding). Language badge: blue pill `rgba(59,130,246,0.12)` / `#60a5fa`.
Footer row with "Docs ↗" (cyan) and "GitHub ↗" (muted) links.

### 8. Browser chrome mockup
3D perspective frame for dashboard screenshots. Outer: `#1a2035`, inner bar: `#111827`.
Optional `transform: perspective(1000px) rotateY(-5deg) rotateX(2deg)` for hero placement.

### 9. Info / CTA banner
Full-width tinted strip: `background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.15)`.
Used at the bottom of the Ecosystem section.

### 10. Footer
Two-column grid (brand column + 3-column link grid). Brand name uses gradient text. GitHub chip:
`background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08)`.
Footer bar: copyright left, "Full Documentation →" link right (accent cyan).

---

## Typography guidance

The homepage uses **JetBrains Mono** as the primary display typeface.
The app uses **Inter**. When mixing the two:
- Use JetBrains Mono for large headings and the logo wordmark on marketing surfaces
- Keep Inter for body text and UI controls
- Monospace numbers in step lists reinforce the developer-product positioning
