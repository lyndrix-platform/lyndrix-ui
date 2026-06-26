# Lyndrix Homepage Visual Patterns

Reference for the marketing/homepage design language used on `home.lyndrix.eu`. All patterns use `--lx-*` tokens from the design system — see the token table in conventions for the mapping.

---

## Color palette

| Role | Hex | Token |
|---|---|---|
| Page background | `#0a0e1a` | `var(--lx-bg)` |
| Section alt background | `#0f1629` | `var(--lx-surface)` |
| Card (frosted) | `rgba(15,22,41,0.8)` | `var(--lx-surface)` + `backdrop-filter` |
| Primary accent (cyan) | `#00d4ff` | `var(--lx-accent)` |
| Secondary accent (sky blue) | `#0ea5e9` | `var(--lx-accent-2)` |
| Tertiary accent (violet) | `#8b5cf6` | `var(--lx-accent-3)` |
| Primary text | `#f0f6ff` | `var(--lx-text)` |
| Secondary text | `#94a3b8` | `var(--lx-text-muted)` |
| Muted text | `#64748b` | — |
| Accent border | `rgba(0,212,255,0.15)` | `var(--lx-border)` |
| Subtle border | `rgba(255,255,255,0.08)` | `var(--lx-border-soft)` |
| Cyan glow | `0 0 30px rgba(0,212,255,0.3)` | `var(--lx-glow)` |
| Language badge (blue) | `rgba(59,130,246,0.12)` + `#60a5fa` | — |

---

## Typography

- **Body / heading font**: JetBrains Mono (loaded from Google Fonts in `_ds_bundle.css`). The homepage uses this monospace font as its primary typeface — a deliberately developer-first choice.
- **Code / labels**: same JetBrains Mono, no fallback needed when loaded.
- **Headline scale**: `clamp(2.5rem, 5vw, 4rem)` for hero; `clamp(2rem, 4vw, 3rem)` for section titles.
- **Headline weight**: 800 with `letter-spacing: -0.03em` (hero) or `-0.025em` (sections).
- **Line height**: 1.1–1.15 for headlines; 1.7 for body text.
- **Section labels**: uppercase, `letter-spacing: 0.08em`, `font-weight: 600`, `font-size: 0.8rem`.

---

## Section tag / pill badge

Used as a section label before every major heading. Comes in three accent variants:

```
┌─────────────────┐
│  WHY LYNDRIX    │  ← cyan pill, 999px radius
└─────────────────┘
```

```jsx
<SectionTag>Why Lyndrix</SectionTag>           // cyan (default)
<SectionTag variant="blue">Plugins</SectionTag>
<SectionTag variant="purple">Theming</SectionTag>
```

Raw CSS:
```css
background: rgba(34,211,238,0.1);
border: 1px solid rgba(34,211,238,0.25);
border-radius: 999px;
color: var(--lx-accent);
font-size: 0.8rem; font-weight: 600;
text-transform: uppercase; letter-spacing: 0.08em;
```

---

## Hero badge (pulsing pill)

Used at the top of hero sections for status/version announcements. The dot pulses with `lx-badge-pulse` keyframe (opacity 1↔0.35, 2 s).

```jsx
<HeroBadge>Open Source · Apache 2.0</HeroBadge>
```

---

## Gradient text headline

The hero accent line uses a cyan→sky gradient clipped to text:

```jsx
<span style={{
  background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}>
  Ship Plugins.
</span>
```

Also used on: logo wordmark, nav CTA, brand name in footer.

---

## Section header block

Standard header pattern — always centered, used before every section:

```
         [SECTION TAG]

   Big Bold Headline Here.
   Second line if needed.

   Supporting subtitle text in muted color,
   up to 560px wide.
```

```jsx
<div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
  <SectionTag>Why Lyndrix</SectionTag>
  <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, color: 'var(--lx-text)', margin: 0 }}>
    Everything you need.<br />Nothing you don't.
  </h2>
  <p style={{ fontSize: '1.1rem', color: 'var(--lx-text-muted)', maxWidth: '560px', lineHeight: 1.7, margin: 0 }}>
    Lyndrix is the foundation your application sits on.
  </p>
</div>
```

---

## Feature cards

3-column frosted-glass grid. Hover lifts the card and adds a cyan glow border:

```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
  <FeatureCard icon={<PluginIcon />} title="Plugin-First Architecture" description="…" />
  <FeatureCard icon={<LockIcon />} title="Vault-Backed Secrets" description="…" />
  <FeatureCard icon={<EventIcon />} title="Event-Driven Core" description="…" />
</div>
```

Card hover target (apply via CSS or onMouseEnter):
```css
border-color: rgba(0, 212, 255, 0.3);
box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,212,255,0.1);
transform: translateY(-4px);
```

---

## Dot-grid section background

A subtle 40 px or 60 px grid of 1 px cyan lines, faded with a radial mask:

```jsx
<section style={{
  position: 'relative',
  backgroundImage: [
    'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
}}>
```

Ecosystem / docs sections use a 50–60 px grid at lower opacity (`0.025`).

---

## Animated glow orbs

Two blurred radial gradients positioned absolutely behind hero content. They use `lx-float` keyframe (translateY 0 → -20px, 8–10 s).

```jsx
// Cyan orb — top right
<div style={{ position: 'absolute', width: '600px', height: '600px', top: '-100px', right: '-100px',
  background: 'radial-gradient(circle, rgba(34,211,238,0.2), transparent 70%)',
  filter: 'blur(80px)', opacity: 0.4, animation: 'lx-float 8s ease-in-out infinite' }} />

// Purple orb — bottom left
<div style={{ position: 'absolute', width: '400px', height: '400px', bottom: '50px', left: '-100px',
  background: 'radial-gradient(circle, rgba(129,140,248,0.2), transparent 70%)',
  filter: 'blur(80px)', opacity: 0.4, animation: 'lx-float 10s ease-in-out infinite reverse' }} />
```

---

## Navigation bar (frosted)

Fixed sticky nav with `backdrop-filter: blur(16px)`. On scroll, gains a `border-bottom` and elevated shadow:

```
base:     background: rgba(10,14,26,0.6);  border-bottom: 1px solid transparent
scrolled: background: rgba(10,14,26,0.92); border-bottom: 1px solid rgba(0,212,255,0.15);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4)
```

Logo: SVG mark + gradient wordmark. Nav links: `text-secondary`, hover → `text-primary` + subtle white bg. CTA: gradient button (same as primary button style).

---

## CTA buttons

**Primary** — gradient, dark text:
```css
background: linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2));
color: var(--lx-bg);   border-radius: 12px;
padding: 0.75rem 1.75rem;  font-weight: 600;
/* hover */ opacity: 0.9;  box-shadow: 0 0 30px rgba(0,212,255,0.3);  transform: translateY(-2px);
```

**Secondary** — frosted glass:
```css
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.08);
color: var(--lx-text);  border-radius: 12px;
/* hover */ background: rgba(255,255,255,0.1);  border-color: rgba(0,212,255,0.3);  transform: translateY(-2px);
```

---

## Browser / app mockup

Shows the live Lyndrix UI inside a browser chrome frame with macOS-style traffic-light dots. On the homepage it has a subtle 3D perspective tilt:

```
┌─────────────────────────────────────────┐  bg: #1a2035, rounded-xl
│  ● ● ●   lyndrix.local/dashboard       │  bar: #111827
├─────────────────────────────────────────┤
│                                         │
│         [screenshot or content]         │
│                                         │
└─────────────────────────────────────────┘
transform: perspective(1000px) rotateY(-5deg) rotateX(2deg)
box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,238,0.1)
```

Dots: `#ff5f57` (red) · `#ffbd2e` (yellow) · `#28c840` (green).

---

## Code panel

Dark GitHub-style code window used alongside numbered steps. Sticky on desktop (`position: sticky; top: 6rem`).

```
┌─────────────────────────────────────────┐  bg: #0d1117, rounded-xl
│  ● ● ●   entrypoint.py   [Python]      │  header: #161b22
├─────────────────────────────────────────┤
│                                         │
│   from core.api import ModuleManifest   │  pre, JetBrains Mono 0.82rem
│   …                                    │  color: #e6edf3
└─────────────────────────────────────────┘
```

Language badge: `background: rgba(34,211,238,0.1); color: var(--lx-accent); border-radius: 4px`.

---

## Numbered steps

Step row with large monospace step number (dimmed by default, highlights cyan on hover):

```
02    ← font-size: 2.5rem; font-weight: 800; color: rgba(34,211,238,0.15)
                             ↑ on hover: color: var(--lx-accent)

Write Your Plugin
Create entrypoint.py with a manifest and setup(ctx) function…
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← 1px border-bottom rgba(255,255,255,0.08)
```

Inline code inside descriptions: `background: rgba(34,211,238,0.1); color: var(--lx-accent); border-radius: 4px; padding: 0.1em 0.4em; font-family: monospace`.

---

## Plugin / ecosystem cards

Compact variant of FeatureCard — smaller padding (`1.5rem`), smaller icon (36 px), shows repo slug in monospace, and two footer links (Docs + GitHub).

```
┌────────────────────────────────────────┐
│  [icon]          [Python badge]        │
│  IaC Orchestrator                      │
│  lyndrix-plugin-iac-orchestrator       │  ← mono, 0.74rem, 70% opacity
│  GitOps controller for Terraform…      │
│                                        │
│  Docs ↗   GitHub ↗                    │
└────────────────────────────────────────┘
```

Plugin badge (language): `rgba(59,130,246,0.12)` bg, `#60a5fa` text, 999px radius.

---

## Stats bar

Horizontal row of key-value stats with vertical dividers, used in the hero:

```
Plugin-First  |  Vault-Backed  |  Event-Driven
Architecture     Secrets          Core
```

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--lx-accent)' }}>Plugin-First</span>
    <span style={{ fontSize: '0.75rem', color: 'var(--lx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Architecture</span>
  </div>
  <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)' }} />
  {/* repeat for each stat */}
</div>
```

---

## Info banner

Full-width highlighted bar used at the bottom of sections:

```jsx
<div style={{
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  padding: '1.25rem 2rem',
  background: 'rgba(34,211,238,0.06)',
  border: '1px solid rgba(34,211,238,0.15)',
  borderRadius: '20px',
  fontSize: '0.95rem',
  color: 'var(--lx-text-muted)',
}}>
  <InfoIcon style={{ color: 'var(--lx-accent)' }} />
  Browse all plugins · Want to build your own? → Read the Plugin Development Guide
</div>
```

---

## Footer

Two-column layout: brand column (logo + tagline + GitHub link) and 3-column link grid. Background `var(--lx-surface)`, top border `rgba(255,255,255,0.08)`.

Column titles: `0.8rem`, uppercase, `letter-spacing: 0.1em`. Links: `var(--lx-text-muted)`, hover → `var(--lx-accent)`.
