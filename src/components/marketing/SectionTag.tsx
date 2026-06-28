import type { ReactNode } from 'react'

export interface SectionTagProps {
  children: ReactNode
  variant?: 'cyan' | 'blue' | 'purple'
}

// Each variant tints one of the theme accent tokens (so marketing chips follow
// the active theme rather than fixed hex values).
const colors: Record<NonNullable<SectionTagProps['variant']>, { bg: string; border: string; text: string }> = {
  cyan: {
    bg: 'color-mix(in srgb, var(--lx-accent) 10%, transparent)',
    border: 'color-mix(in srgb, var(--lx-accent) 25%, transparent)',
    text: 'var(--lx-accent)',
  },
  blue: {
    bg: 'color-mix(in srgb, var(--lx-accent-2) 10%, transparent)',
    border: 'color-mix(in srgb, var(--lx-accent-2) 25%, transparent)',
    text: 'var(--lx-accent-2)',
  },
  purple: {
    bg: 'color-mix(in srgb, var(--lx-accent-3) 10%, transparent)',
    border: 'color-mix(in srgb, var(--lx-accent-3) 25%, transparent)',
    text: 'var(--lx-accent-3)',
  },
}

export default function SectionTag({ children, variant = 'cyan' }: SectionTagProps) {
  const c = colors[variant]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.3rem 0.875rem',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: c.text,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </span>
  )
}
