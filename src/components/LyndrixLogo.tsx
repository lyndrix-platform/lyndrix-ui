interface Props {
  size?: number
  className?: string
}

export default function LyndrixLogo({ size = 24, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="Lyndrix"
    >
      <defs>
        <linearGradient id="lx-logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--lx-accent)" />
          <stop offset="100%" stopColor="var(--lx-accent-2)" />
        </linearGradient>
        <linearGradient id="lx-logo-grad-secondary" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--lx-accent-2)" />
          <stop offset="100%" stopColor="var(--lx-accent)" />
        </linearGradient>
        <filter id="lx-logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer shield */}
      <polygon
        points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
        fill="none"
        stroke="url(#lx-logo-grad-primary)"
        strokeWidth="3"
        filter="url(#lx-logo-glow)"
      />

      {/* Inner hexagon (dashed) */}
      <polygon
        points="50,20 76,35 76,65 50,80 24,65 24,35"
        fill="none"
        stroke="color-mix(in srgb, var(--lx-text) 20%, transparent)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />

      {/* Core node */}
      <polygon
        points="50,30 67.5,40 67.5,60 50,70 32.5,60 32.5,40"
        fill="url(#lx-logo-grad-secondary)"
        opacity="0.9"
      />

      {/* Center */}
      <circle cx="50" cy="50" r="6" fill="var(--lx-bg, #0a0e1a)" />
      <circle cx="50" cy="50" r="2.5" fill="var(--lx-text)" filter="url(#lx-logo-glow)" />

      {/* Plugin nodes */}
      <circle cx="50" cy="5" r="3" fill="var(--lx-text)" />
      <circle cx="90" cy="27.5" r="3" fill="var(--lx-text)" />
      <circle cx="90" cy="72.5" r="3" fill="var(--lx-text)" />
      <circle cx="50" cy="95" r="3" fill="var(--lx-text)" />
      <circle cx="10" cy="72.5" r="3" fill="var(--lx-text)" />
      <circle cx="10" cy="27.5" r="3" fill="var(--lx-text)" />

      {/* Connection lines */}
      <line x1="50" y1="30" x2="50" y2="5" stroke="url(#lx-logo-grad-primary)" strokeWidth="1.5" />
      <line x1="67.5" y1="60" x2="90" y2="72.5" stroke="url(#lx-logo-grad-primary)" strokeWidth="1.5" />
      <line x1="32.5" y1="60" x2="10" y2="72.5" stroke="url(#lx-logo-grad-primary)" strokeWidth="1.5" />
    </svg>
  )
}
