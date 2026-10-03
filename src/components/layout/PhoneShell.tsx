import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function PhoneShell({ showNav = false, onFab, children }: { showNav?: boolean; onFab?: () => void; children: ReactNode }) {
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? 58 : 0 }}>{children}</div>
      {showNav ? <div style={{ position: 'sticky', bottom: 0 }}><BottomNav onFab={onFab} /></div> : null}
    </div>
  )
}
