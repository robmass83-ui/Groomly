import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BOTTOM_NAV_CONTENT_PAD, BottomNav } from './BottomNav'

export function PhoneShell({ fill = false, frameHeight, showNav = false, showFab = true, onFab, menuOpen = false, alerts = 0, tax = false, children }: { fill?: boolean; frameHeight?: number; showNav?: boolean; showFab?: boolean; onFab?: () => void; menuOpen?: boolean; alerts?: number; tax?: boolean; children: ReactNode }) {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual'
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])
  const locked = fill ? (frameHeight && frameHeight > 0 ? `${frameHeight}px` : '100dvh') : undefined
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 640, minHeight: fill ? 0 : '100dvh', height: locked, maxHeight: locked, overflow: fill ? 'hidden' : undefined, margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top)' }}>
      <div style={{ flex: 1, minHeight: fill ? 0 : undefined, overflow: fill ? 'hidden' : undefined, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? BOTTOM_NAV_CONTENT_PAD : 0 }}>{children}</div>
      {showNav ? <BottomNav onFab={onFab} menuOpen={menuOpen} alerts={alerts} tax={tax} showFab={showFab} /> : null}
    </div>
  )
}
