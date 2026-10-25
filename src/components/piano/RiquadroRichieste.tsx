import { useFrasi } from '../../i18n/LinguaContext'

export function RiquadroRichieste({
  mostra,
  accesso,
  richieste,
  onAccetta,
  onPaywall,
}: {
  mostra: boolean
  accesso: boolean
  richieste: readonly { id: string; nome: string }[]
  onAccetta: (id: string) => void
  onPaywall: () => void
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{frasi.prenotazioniOnline}</button>
  return (
    <section aria-label={frasi.prenotazioniOnline}>
      {richieste.length === 0 ? <p>{frasi.nessunaRichiesta}</p> : richieste.map((richiesta) => (
        <button key={richiesta.id} type="button" onClick={() => onAccetta(richiesta.id)}>{frasi.accettaNome.replace('{{nome}}', richiesta.nome)}</button>
      ))}
    </section>
  )
}
