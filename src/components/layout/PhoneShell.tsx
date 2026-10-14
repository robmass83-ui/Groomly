import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BackBar } from './BackBar'
import { BOTTOM_NAV_CONTENT_PAD, BottomNav } from './BottomNav'

export function PhoneShell({ fill = false, showNav = false, backTo, onFab, menuOpen = false, bell = false, children }: { fill?: boolean; showNav?: boolean; backTo?: string; onFab?: () => void; menuOpen?: boolean; bell?: boolean; children: ReactNode }) {
  const { pathname } = useLocation()
  const dock = showNav || Boolean(backTo)
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual'
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 640, minHeight: fill ? 0 : '100dvh', height: fill ? '100dvh' : undefined, maxHeight: fill ? '100dvh' : undefined, overflow: fill ? 'hidden' : undefined, margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top)' }}>
      <div style={{ flex: 1, minHeight: fill ? 0 : undefined, overflow: fill ? 'hidden' : undefined, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? BOTTOM_NAV_CONTENT_PAD : dock ? 58 : 0 }}>{children}</div>
      {showNav ? <BottomNav onFab={onFab} menuOpen={menuOpen} bell={bell} /> : null}
      {!showNav && backTo ? <div style={{ position: 'sticky', bottom: 0 }}><BackBar to={backTo} /></div> : null}
    </div>
  )
}
