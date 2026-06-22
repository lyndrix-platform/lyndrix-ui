/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lx: {
          bg: 'var(--lx-bg)',
          surface: 'var(--lx-surface)',
          elevated: 'var(--lx-elevated)',
          accent: 'var(--lx-accent)',
          'accent-2': 'var(--lx-accent-2)',
          'accent-3': 'var(--lx-accent-3)',
          text: 'var(--lx-text)',
          'text-muted': 'var(--lx-text-muted)',
          border: 'var(--lx-border)',
          'border-soft': 'var(--lx-border-soft)',
        },
      },
      boxShadow: {
        glow: 'var(--lx-glow)',
      },
      borderRadius: {
        sm: 'var(--lx-radius-sm)',
        md: 'var(--lx-radius-md)',
        lg: 'var(--lx-radius-lg)',
      },
    },
  },
  plugins: [],
}
