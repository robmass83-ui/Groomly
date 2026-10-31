import { Zap } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'
import { livelloMinimo, type FeatureKey } from '../../lib/piano'

export function SegnoPlus({ feature }: { feature: FeatureKey }) {
  const frasi = useFrasi()
  const testo = livelloMinimo(feature) === 'salone' ? frasi.segnoSalone : frasi.segnoPlus
  return (
    <span aria-label={testo} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--pri)', fontWeight: 700, fontSize: 12 }}>
      <Zap size={12} strokeWidth={2} aria-hidden />
      {testo}
    </span>
  )
}
