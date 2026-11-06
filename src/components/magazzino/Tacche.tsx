import { tacche, type StatoProdotto } from '../../lib/prodotti'

const COLORE: Record<StatoProdotto, string> = { ok: 'var(--pri-solid)', ordina: 'var(--warn)', finito: 'var(--line2)' }

export function Tacche({ pezzi, soglia, stato, grandi = false }: { pezzi: number; soglia: number; stato: StatoProdotto; grandi?: boolean }) {
  const { accese, minimo } = tacche(pezzi, soglia)
  return (
    <span aria-hidden style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }, (_, indice) => (
        <span
          key={indice}
          style={{
            flex: grandi ? 1 : 'none',
            width: grandi ? undefined : 13,
            height: grandi ? 12 : 7,
            borderRadius: grandi ? 3 : 2,
            background: indice < accese ? COLORE[stato] : 'var(--line)',
            boxShadow: indice === minimo ? '0 0 0 1.5px var(--tx2)' : undefined,
          }}
        />
      ))}
    </span>
  )
}
