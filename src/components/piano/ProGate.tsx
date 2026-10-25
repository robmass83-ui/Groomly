import type { ReactNode } from 'react'
import { usePiano } from '../../hooks/usePiano'
import { haAccesso, mostraBadge, type FeatureKey } from '../../lib/piano'
import { ProBadge } from './ProBadge'

export function ProGate({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const piano = usePiano()
  if (!piano.mostraPiani || haAccesso(piano.stato, feature)) return <>{children}</>
  if (!mostraBadge({ mostraPiani: true }, piano.stato, feature)) return null
  return (
    <button type="button" onClick={() => piano.apriPaywall(feature)} style={{ background: 'transparent', border: 0, color: 'inherit', font: 'inherit' }}>
      <ProBadge />
    </button>
  )
}
