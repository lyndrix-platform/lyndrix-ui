import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport is at least the `md` breakpoint (768px) wide.
 * Drives the settings master-detail layout: stacked/back-button on mobile,
 * tile-grid → split-view on desktop. Updates live on resize/orientation change.
 */
export function useIsDesktop(query = '(min-width: 768px)'): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [isDesktop, setIsDesktop] = useState<boolean>(get)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setIsDesktop(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return isDesktop
}
