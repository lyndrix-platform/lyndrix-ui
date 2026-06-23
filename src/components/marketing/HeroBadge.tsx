import type { ReactNode } from 'react'

export interface HeroBadgeProps {
  children: ReactNode
  pulse?: boolean
}

export default function HeroBadge({ children, pulse = true }: HeroBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.875rem',
        background: 'rgba(34, 211, 238, 0.1)',
        border: '1px solid rgba(34, 211, 238, 0.25)',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: 'var(--lx-accent)',
        width: 'fit-content',
      }}
    >
      {pulse && (
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            background: 'var(--lx-accent)',
            borderRadius: '50%',
            animation: 'lx-badge-pulse 2s ease-in-out infinite',
          }}
        />
      )}
      {children}
    </span>
  )
}
