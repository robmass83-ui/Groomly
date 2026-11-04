import { FlaskConical } from 'lucide-react'
import type { CSSProperties } from 'react'

const COLORI = {
  pro: { testo: 'var(--plus-ink)', fondo: 'var(--plus-s)', bordo: '#7B3FE4' },
  salone: { testo: 'var(--sal-ink)', fondo: 'var(--sal-s)', bordo: '#C99200' },
} as const

// Pillola «BETA» comune ad Admin Manager e app (spec admin-manager-design, sezione 8).
// Piena: sulle sfumature del piano (scheda «Il tuo piano», testata Abbonamento), bianca al 22% senza bordo.
export function EtichettaBeta({ piano, piena = false, testo = 'BETA' }: { piano: 'pro' | 'salone'; piena?: boolean; testo?: string }) {
  const colori = COLORI[piano]
  const stile: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    height: 18,
    padding: '0 6px',
    borderRadius: 5,
    border: piena ? 'none' : `1.5px solid ${colori.bordo}`,
    background: piena ? 'rgba(255,255,255,.22)' : colori.fondo,
    color: piena ? '#fff' : colori.testo,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.08em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    flex: 'none',
  }
  return (
    <span data-etichetta-beta={piena ? 'piena' : piano} style={stile}>
      <FlaskConical size={10} strokeWidth={2.4} aria-hidden />
      {testo}
    </span>
  )
}
