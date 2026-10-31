import { useFrasi } from '../../i18n/LinguaContext'

export function SchedeStatistiche({
  mostra,
  euro,
  atteso,
  ritardo,
}: {
  mostra: boolean
  euro: number | null
  atteso: number
  ritardo: number
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  const euroTesto = euro === null ? '—' : euro.toFixed(0)
  return (
    <section aria-label={frasi.statistiche}>
      <p>{`${frasi.euroOra}: ${euroTesto}`}</p>
      <p>{`${frasi.previsione}: ${atteso.toFixed(0)}`}</p>
      <p>{`${frasi.inRitardo}: ${ritardo}`}</p>
    </section>
  )
}
