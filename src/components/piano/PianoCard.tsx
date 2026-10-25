import { it } from '../../i18n/it'
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
  return (
    <section aria-label={it.tuoPiano} style={{ background: 'var(--card)', color: 'var(--tx)', padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{it.tuoPiano}</p>
      {livello === 'base' && !provaUsata
        ? <button type="button" onClick={onProva} style={{ color: 'var(--pri)', background: 'transparent', border: 0, font: 'inherit', fontWeight: 700 }}>{it.provaGratis}</button>
        : <button type="button" onClick={onApri} style={{ color: 'var(--tx2)', background: 'transparent', border: 0, font: 'inherit' }}>{it.abbonamentiInArrivo}</button>}
    </section>
  )
}
