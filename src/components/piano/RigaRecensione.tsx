import { useFrasi } from '../../i18n/LinguaContext'

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
  if (!mostra || !proponi) return null
  return (
    <section aria-label={frasi.recensione}>
      <p>{frasi.testoRecensione}</p>
      <button type="button" onClick={onChiedi}>{frasi.chiediRecensione}</button>
    </section>
  )
}
