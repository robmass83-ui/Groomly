import { useFrasi } from '../../i18n/LinguaContext'
import { usePlus } from '../../hooks/usePlus'
import { SegnoPlus } from './SegnoPlus'

export function RigaRecensione({
  mostra,
  proponi,
  onChiedi,
}: {
  mostra: boolean
  proponi: boolean
  onChiedi: () => void
}) {
  const frasi = useFrasi()
  const plus = usePlus('recensioni')
  if (!mostra) return null
  if (!plus.accesso) {
    return (
      <section aria-label={frasi.recensione}>
        <p>{frasi.testoRecensione}</p>
        <button type="button" onClick={plus.apri} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {frasi.chiediRecensione}
          <SegnoPlus feature="recensioni" />
        </button>
      </section>
    )
  }
  if (!proponi) return null
  return (
    <section aria-label={frasi.recensione}>
      <p>{frasi.testoRecensione}</p>
      <button type="button" onClick={onChiedi}>{frasi.chiediRecensione}</button>
    </section>
  )
}
