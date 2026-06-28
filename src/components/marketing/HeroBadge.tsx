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
        background: 'color-mix(in srgb, var(--lx-accent) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--lx-accent) 25%, transparent)',
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
