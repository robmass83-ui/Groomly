import { useFrasi } from '../../i18n/LinguaContext'

export function RiquadroAttesa({
  mostra,
  accesso,
  posti,
  onPaywall,
}: {
  mostra: boolean
  accesso: boolean
  posti: number
  onPaywall: () => void
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{frasi.listaAttesa}</button>
  return <section aria-label={frasi.listaAttesa}><p>{`${frasi.postiLiberi}: ${posti}`}</p></section>
}
