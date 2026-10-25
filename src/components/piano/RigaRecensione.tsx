import { it } from '../../i18n/it'
import { TESTO_RECENSIONE } from '../../lib/recensioni'

export function RigaRecensione({
  mostra,
  proponi,
  onChiedi,
}: {
  mostra: boolean
  proponi: boolean
  onChiedi: () => void
}) {
  if (!mostra || !proponi) return null
  return (
    <section aria-label={it.recensione}>
      <p>{TESTO_RECENSIONE}</p>
      <button type="button" onClick={onChiedi}>{it.chiediRecensione}</button>
    </section>
  )
}
