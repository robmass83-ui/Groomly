import { FlaskConical } from 'lucide-react'

// Etichetta BETA (spec admin-manager § 8). La possiede B3: questa è identica e all'unione vale la sua.
// I colori ripiegano sui valori chiari finché i token --plus-* e --sal-* non sono in tokens.css.
export function EtichettaBeta({ piano, piena = false }: { piano: 'plus' | 'salone'; piena?: boolean }) {
  const plus = piano === 'plus'
  const colori = piena
    ? { color: '#fff', background: 'rgba(255,255,255,.22)', border: '1.5px solid transparent' }
    : plus
      ? { color: 'var(--plus-ink, #5A2BC0)', background: 'var(--plus-s, #F0E9FD)', border: '1.5px solid var(--plus-ink, #5A2BC0)' }
      : { color: 'var(--sal-ink, #7A5600)', background: 'var(--sal-s, #FBF1D6)', border: '1.5px solid var(--sal-ink, #7A5600)' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        height: 18,
        boxSizing: 'border-box',
        padding: '0 5px',
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.08em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flex: 'none',
        ...colori,
      }}
    >
      <FlaskConical size={10} strokeWidth={2.5} aria-hidden />
      BETA
    </span>
  )
}
