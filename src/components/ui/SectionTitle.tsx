import type { ReactNode } from 'react'
import { TYPE } from '../../theme/theme'

export function SectionTitle({ children, icon, link }: { children: ReactNode; icon?: ReactNode; link?: ReactNode }) {
  return (
    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.section, fontWeight: 700, color: 'var(--tx3)' }}>
      {icon}
      <span style={{ flex: 1, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase' }}>{children}</span>
      {link}
    </h2>
  )
}
