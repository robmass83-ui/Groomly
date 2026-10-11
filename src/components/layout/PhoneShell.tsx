import type { ReactNode } from 'react'
import { BackBar } from './BackBar'
import { BOTTOM_NAV_CONTENT_PAD, BottomNav } from './BottomNav'

export function PhoneShell({ showNav = false, backTo, onFab, menuOpen = false, bell = false, children }: { showNav?: boolean; backTo?: string; onFab?: () => void; menuOpen?: boolean; bell?: boolean; children: ReactNode }) {
  const dock = showNav || Boolean(backTo)
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? BOTTOM_NAV_CONTENT_PAD : dock ? 58 : 0 }}>{children}</div>
      {showNav ? <BottomNav onFab={onFab} menuOpen={menuOpen} bell={bell} /> : null}
      {!showNav && backTo ? <div style={{ position: 'sticky', bottom: 0 }}><BackBar to={backTo} /></div> : null}
    </div>
  )
}
