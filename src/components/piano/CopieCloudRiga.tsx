import { useFrasi } from '../../i18n/LinguaContext'
import { copieDisponibili } from '../../lib/copieCloud'
import type { StatoPiano } from '../../lib/piano'

export function CopieCloudRiga({
  mostraPiani,
  stato,
  bucket,
  onPaywall,
}: {
  mostraPiani: boolean
  stato: StatoPiano
  bucket: string | null
  onPaywall: () => void
}) {
  const frasi = useFrasi()
  if (!mostraPiani) return null
  const modo = copieDisponibili(stato, bucket)
  if (modo === 'paywall') {
    return (
      <button type="button" onClick={onPaywall}>
        {frasi.copieFoto}
        <span> Pro</span>
      </button>
    )
  }
  if (modo === 'assenti') return <p>{frasi.copieNonDisponibili}</p>
  return <p>{frasi.copieFoto}</p>
}
