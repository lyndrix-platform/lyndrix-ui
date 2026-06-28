import LyndrixLogo from './LyndrixLogo'

// Neutral, string-free boot splash shown only on a true first run (no cached
// localization catalog yet). It deliberately contains no localized text — there
// is nothing to translate it with until the first catalog load resolves.
export default function LoadingSplash() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[var(--lx-bg)]">
      <div className="flex flex-col items-center gap-5">
        <LyndrixLogo size={40} />
        <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
