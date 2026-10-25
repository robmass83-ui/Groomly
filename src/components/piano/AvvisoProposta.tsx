import { it } from '../../i18n/it'
import { puoProporre } from '../../lib/proposte'

export function AvvisoProposta({
  mostra,
  ultima,
  adesso,
  onNonOra,
}: {
  mostra: boolean
  ultima: Date | null
  adesso: Date
  onNonOra: () => void
}) {
  if (!mostra || !puoProporre(ultima, adesso)) return null
  return (
    <section aria-label={it.propostaPro}>
      <p>{it.propostaPro}</p>
      <button type="button" onClick={onNonOra}>{it.nonOra}</button>
    </section>
  )
}
