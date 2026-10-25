import { useFrasi } from '../../i18n/LinguaContext'

export function SchedeStatistiche({
  mostra,
  accesso,
  euro,
  atteso,
  ritardo,
  onPaywall,
}: {
  mostra: boolean
  accesso: boolean
  euro: number | null
  atteso: number
  ritardo: number
  onPaywall: () => void
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  const euroTesto = euro === null ? '—' : euro.toFixed(0)
  return (
    <section aria-label={frasi.statistiche}>
      <p>{`${frasi.euroOra}: ${euroTesto}`}</p>
      {accesso ? <p>{`${frasi.previsione}: ${atteso.toFixed(0)}`}</p> : <button type="button" onClick={onPaywall}>{frasi.previsione}</button>}
      {accesso ? <p>{`${frasi.inRitardo}: ${ritardo}`}</p> : <button type="button" onClick={onPaywall}>{frasi.inRitardo}</button>}
    </section>
  )
}
