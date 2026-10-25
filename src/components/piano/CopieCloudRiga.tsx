import { it } from '../../i18n/it'
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
  if (!mostraPiani) return null
  const modo = copieDisponibili(stato, bucket)
  if (modo === 'paywall') {
    return (
      <button type="button" onClick={onPaywall}>
        {it.copieFoto}
        <span> Pro</span>
      </button>
    )
  }
  if (modo === 'assenti') return <p>{it.copieNonDisponibili}</p>
  return <p>{it.copieFoto}</p>
}
