/**
 * Homepage design-language patterns — extracted from lyndrix-dev/lyndrix-homepage.
 * These are authored previews (no lyndrix-ui components), demonstrating the visual
 * identity used on home.lyndrix.eu so designers can reference and compose with it.
 */

const tokens = {
  bgPrimary:   '#0a0e1a',
  bgSecondary: '#0f1629',
  bgCard:      'rgba(15,22,41,0.8)',
  accentCyan:  '#00d4ff',
  accentBlue:  '#0ea5e9',
  accentPurple:'#8b5cf6',
  textPrimary: '#f0f6ff',
  textSecondary:'#94a3b8',
  textMuted:   '#64748b',
  borderColor: 'rgba(0,212,255,0.15)',
  borderCard:  'rgba(255,255,255,0.08)',
  glowCyan:    '0 0 30px rgba(0,212,255,0.3)',
}

function SectionTag({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.3rem 0.875rem',
      background: 'rgba(0,212,255,0.1)',
      border: `1px solid rgba(0,212,255,0.2)`,
      borderRadius: 999,
      fontSize: '0.8rem',
      fontWeight: 600,
      color: tokens.accentCyan,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      {children}
    </span>
  )
}

function GradientText({ children }) {
  return (
    <span style={{
      background: `linear-gradient(135deg, ${tokens.accentCyan}, ${tokens.accentBlue})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>
      {children}
    </span>
  )
}

function FeatureIcon({ children }) {
  return (
    <div style={{
      width: 48, height: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,212,255,0.1)',
      borderRadius: 12,
      color: tokens.accentCyan,
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: tokens.bgCard,
      border: `1px solid ${tokens.borderCard}`,
      borderRadius: 20,
      padding: '2rem',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Stories ──────────────────────────────────────────────────────────────────

export function SectionHeader() {
  return (
    <div style={{
      minHeight: 280,
      background: tokens.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 2rem',
      gap: '1rem',
      textAlign: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <SectionTag>Why Lyndrix</SectionTag>
      <h2 style={{
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: '-0.025em',
        color: tokens.textPrimary,
        margin: 0,
      }}>
        Everything you need.<br />
        <GradientText>Nothing you don't.</GradientText>
      </h2>
      <p style={{
        fontSize: '1.1rem',
        color: tokens.textSecondary,
        maxWidth: 560,
        lineHeight: 1.7,
        margin: 0,
      }}>
        Lyndrix is the foundation your application sits on. You bring the business logic; Lyndrix brings the platform.
      </p>
    </div>
  )
}

export function FeatureCards() {
  const features = [
    {
      title: 'Plugin-First Architecture',
      description: 'Develop only what makes your app unique. Drop in a plugin with setup(ctx) and the framework handles the rest.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
        </svg>
      ),
    },
    {
      title: 'Vault-Backed Secrets',
      description: 'First-class HashiCorp Vault integration with automatic bootstrap, unseal, and per-plugin secret isolation.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
    },
    {
      title: 'Event-Driven Core',
      description: 'A global event bus decouples every component. Plugins communicate through declared topics — no tight coupling.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{
      background: `linear-gradient(180deg, ${tokens.bgPrimary} 0%, ${tokens.bgSecondary} 50%, ${tokens.bgPrimary} 100%)`,
      padding: '3rem 2rem',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        {features.map((f) => (
          <GlassCard key={f.title}>
            <FeatureIcon>{f.icon}</FeatureIcon>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: tokens.textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '0.92rem', color: tokens.textSecondary, lineHeight: 1.7, margin: 0 }}>
              {f.description}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

export function CTAButtons() {
  return (
    <div style={{
      minHeight: 200,
      background: tokens.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '3rem 2rem',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0.75rem 1.75rem', fontSize: '1rem', fontWeight: 600,
          color: tokens.bgPrimary,
          background: `linear-gradient(135deg, ${tokens.accentCyan}, ${tokens.accentBlue})`,
          borderRadius: 12, cursor: 'pointer',
        }}>
          Get Started →
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0.75rem 1.75rem', fontSize: '1rem', fontWeight: 600,
          color: tokens.textPrimary,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${tokens.borderCard}`,
          borderRadius: 12, cursor: 'pointer',
        }}>
          View Docs
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 600,
          color: tokens.bgPrimary,
          background: `linear-gradient(135deg, ${tokens.accentCyan}, ${tokens.accentBlue})`,
          borderRadius: 6, cursor: 'pointer',
        }}>
          Get Started
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 600,
          color: tokens.textSecondary,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${tokens.borderCard}`,
          borderRadius: 6, cursor: 'pointer',
        }}>
          ★ GitHub
        </span>
      </div>
    </div>
  )
}

export function HeroBadge() {
  return (
    <div style={{
      background: tokens.bgPrimary,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      gap: '1.5rem', padding: '3rem 2.5rem',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {/* Open Source badge with pulse dot */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.875rem',
        background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 999,
        fontSize: '0.8rem', fontWeight: 500, color: tokens.accentCyan,
      }}>
        <span style={{
          width: 6, height: 6, background: tokens.accentCyan, borderRadius: '50%',
          display: 'inline-block',
        }} />
        Open Source · Apache 2.0
      </div>

      {/* Hero title */}
      <h1 style={{
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em',
        color: tokens.textPrimary, margin: 0,
      }}>
        Build Applications,<br />
        <GradientText>Ship Plugins.</GradientText>
      </h1>

      <p style={{
        fontSize: '1.1rem', lineHeight: 1.7,
        color: tokens.textSecondary, maxWidth: 520, margin: 0,
      }}>
        Lyndrix is a secure, extensible application framework. Drop in a plugin and go — authentication, secrets, event bus, UI, and database are already there.
      </p>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {[['Plugin-First','Architecture'],['Vault-Backed','Secrets'],['Event-Driven','Core']].map(([val, label], i, arr) => (
          <React.Fragment key={val}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: tokens.accentCyan }}>{val}</span>
              <span style={{ fontSize: '0.75rem', color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 1, height: 32, background: tokens.borderCard }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export function EcoBanner() {
  return (
    <div style={{
      background: tokens.bgSecondary, padding: '2rem',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '1.25rem 2rem',
        background: 'rgba(0,212,255,0.06)',
        border: `1px solid rgba(0,212,255,0.15)`,
        borderRadius: 20,
        fontSize: '0.95rem', color: tokens.textSecondary,
        flexWrap: 'wrap',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tokens.accentCyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ color: tokens.accentCyan, fontWeight: 600, cursor: 'pointer' }}>Browse all plugins</span>
        <span> · Want to build your own? → </span>
        <span style={{ color: tokens.accentCyan, fontWeight: 600, cursor: 'pointer' }}>Read the Plugin Development Guide</span>
      </div>
    </div>
  )
}
