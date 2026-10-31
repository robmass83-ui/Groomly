import type { ReactNode } from 'react'
import { usePlus } from '../../hooks/usePlus'
import type { FeatureKey } from '../../lib/piano'
import { SegnoPlus } from './SegnoPlus'

export function ProGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { accesso, visibile, apri } = usePlus(feature)
  if (accesso) return <>{children}</>
  if (!visibile) return null
  return (
    <button type="button" onClick={apri} style={{ background: 'transparent', border: 0, color: 'inherit', font: 'inherit' }}>
      <SegnoPlus feature={feature} />
    </button>
  )
}
