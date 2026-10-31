import { useFrasi } from '../../i18n/LinguaContext'
import { usePlus } from '../../hooks/usePlus'
import { copieDisponibili } from '../../lib/copieCloud'
import type { StatoPiano } from '../../lib/piano'
import { SegnoPlus } from './SegnoPlus'

export function CopieCloudRiga({ stato, bucket }: { stato: StatoPiano; bucket: string | null }) {
  const frasi = useFrasi()
  const { visibile, apri } = usePlus('copieCloud')
  if (!visibile) return null
  const modo = copieDisponibili(stato, bucket)
  if (modo === 'paywall') {
    return (
      <button type="button" onClick={apri}>
        {frasi.copieFoto}
        {' '}
        <SegnoPlus feature="copieCloud" />
      </button>
    )
  }
  if (modo === 'assenti') return <p>{frasi.copieNonDisponibili}</p>
  return <p>{frasi.copieFoto}</p>
}
