import type { ReactNode } from 'react'

export interface FeatureCardProps {
  icon?: ReactNode
  title: string
  description: string
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      style={{
        background: 'var(--lx-surface-glass)',
        border: '1px solid var(--lx-border-soft)',
        borderRadius: '20px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {icon != null && (
        <div
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--lx-accent) 10%, transparent)',
            borderRadius: '12px',
            color: 'var(--lx-accent)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--lx-text)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '0.92rem',
          color: 'var(--lx-text-muted)',
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  )
}
