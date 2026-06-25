import type { ReactNode } from 'react'

export interface SectionTagProps {
  children: ReactNode
  variant?: 'cyan' | 'blue' | 'purple'
}

const colors: Record<NonNullable<SectionTagProps['variant']>, { bg: string; border: string; text: string }> = {
  cyan: {
    bg: 'rgba(34, 211, 238, 0.1)',
    border: 'rgba(34, 211, 238, 0.25)',
    text: 'var(--lx-accent)',
  },
  blue: {
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.25)',
    text: 'var(--lx-accent-2)',
  },
  purple: {
    bg: 'rgba(129, 140, 248, 0.1)',
    border: 'rgba(129, 140, 248, 0.25)',
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
