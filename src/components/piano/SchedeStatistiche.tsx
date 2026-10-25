import { it } from '../../i18n/it'

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
  if (!mostra) return null
  const euroTesto = euro === null ? '—' : euro.toFixed(0)
  return (
    <section aria-label={it.statistiche}>
      <p>{`${it.euroOra}: ${euroTesto}`}</p>
      {accesso ? <p>{`${it.previsione}: ${atteso.toFixed(0)}`}</p> : <button type="button" onClick={onPaywall}>{it.previsione}</button>}
      {accesso ? <p>{`${it.inRitardo}: ${ritardo}`}</p> : <button type="button" onClick={onPaywall}>{it.inRitardo}</button>}
    </section>
  )
}
