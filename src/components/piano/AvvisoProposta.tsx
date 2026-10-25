import { useFrasi } from '../../i18n/LinguaContext'
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
  const frasi = useFrasi()
  if (!mostra || !puoProporre(ultima, adesso)) return null
  return (
    <section aria-label={frasi.propostaPro}>
      <p>{frasi.propostaPro}</p>
      <button type="button" onClick={onNonOra}>{frasi.nonOra}</button>
    </section>
  )
}
