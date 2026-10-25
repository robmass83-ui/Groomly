import { useFrasi } from '../../i18n/LinguaContext'
import type { Livello } from '../../lib/piano'

export function PianoCard({
  livello,
  provaUsata,
  onProva,
  onApri,
}: {
  livello: Livello
  provaUsata: boolean
  onProva: () => void
  onApri: () => void
}) {
  const frasi = useFrasi()
  return (
    <section aria-label={frasi.tuoPiano} style={{ background: 'var(--card)', color: 'var(--tx)', padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{frasi.tuoPiano}</p>
      {livello === 'base' && !provaUsata
        ? <button type="button" onClick={onProva} style={{ color: 'var(--pri)', background: 'transparent', border: 0, font: 'inherit', fontWeight: 700 }}>{frasi.provaGratis}</button>
        : livello !== 'salone'
          ? <button type="button" onClick={onApri} style={{ color: 'var(--tx2)', background: 'transparent', border: 0, font: 'inherit' }}>{frasi.abbonamentiInArrivo}</button>
          : null}
    </section>
  )
}
