import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SIZES.serviceChip.rowGap, minWidth: 0 }}>
      {children}
    </div>
  )
}
