import type { ReactNode } from 'react'
import { BackBar } from './BackBar'
import { BottomNav } from './BottomNav'

export function PhoneShell({ showNav = false, backTo, onFab, children }: { showNav?: boolean; backTo?: string; onFab?: () => void; children: ReactNode }) {
  const dock = showNav || Boolean(backTo)
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: dock ? 58 : 0 }}>{children}</div>
      {showNav ? <div style={{ position: 'sticky', bottom: 0 }}><BottomNav onFab={onFab} /></div> : null}
      {!showNav && backTo ? <div style={{ position: 'sticky', bottom: 0 }}><BackBar to={backTo} /></div> : null}
    </div>
  )
}
