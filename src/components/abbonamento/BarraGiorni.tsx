import { useFrasi } from '../../i18n/LinguaContext'

// Giorni rimasti della beta: barra alta 6 px (bianca su bianco al 25% sulle sfumature) con «N gg» a destra.
// Senza il totale (traccia incompleta) resta solo il numero.
export function BarraGiorni({ rimasti, totali, chiara = true }: { rimasti: number; totali: number | null; chiara?: boolean }) {
  const frasi = useFrasi()
  const etichetta = frasi.betaGg.replace('{{n}}', String(rimasti))
  const quota = totali && totali > 0 ? Math.min(100, Math.max(0, Math.round((rimasti / totali) * 100))) : null
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      {quota !== null ? (
        <span
          role="progressbar"
          aria-label={frasi.betaGiorniRimasti.replace('{{n}}', String(rimasti))}
          aria-valuemin={0}
          aria-valuemax={totali ?? undefined}
          aria-valuenow={rimasti}
          style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', background: chiara ? 'rgba(255,255,255,.25)' : 'var(--surf2)' }}
        >
          <span data-testid="barra-piena" style={{ display: 'block', height: '100%', width: `${quota}%`, borderRadius: 3, background: chiara ? '#fff' : 'var(--plus-cta)' }} />
        </span>
      ) : <span style={{ flex: 1 }} />}
      <span aria-hidden={quota !== null} style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', flex: 'none' }}>{etichetta}</span>
    </span>
  )
}
