import type { ReactNode } from 'react'
import { TYPE } from '../../theme/theme'

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontSize: TYPE.section, fontWeight: 700, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase', color: 'var(--tx3)' }}>
      {children}
    </h2>
  )
}
