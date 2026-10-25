import { it } from '../../i18n/it'

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
  if (!mostra) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{it.prenotazioniOnline}</button>
  return (
    <section aria-label={it.prenotazioniOnline}>
      {richieste.length === 0 ? <p>{it.nessunaRichiesta}</p> : richieste.map((richiesta) => (
        <button key={richiesta.id} type="button" onClick={() => onAccetta(richiesta.id)}>{`Accetta ${richiesta.nome}`}</button>
      ))}
    </section>
  )
}
