import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import './zampette.css'

/** Prima di comparire l'attesa aspetta un attimo: i lavori che finiscono subito non fanno lampeggiare niente. */
const RITARDO_MS = 300
const PASSO = 28

/** Impronta di cane, punta verso l'alto (viewBox 0 0 100 100). */
function Impronta() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden focusable="false">
      <path d="M50 46c-15 0-28 15-28 28 0 10 7 16 16 16 6 0 8-4 12-4s6 4 12 4c9 0 16-6 16-16 0-13-13-28-28-28z" />
      <ellipse cx="19" cy="44" rx="9.5" ry="12.5" transform="rotate(-24 19 44)" />
      <ellipse cx="37" cy="22" rx="9.5" ry="13" transform="rotate(-8 37 22)" />
      <ellipse cx="63" cy="22" rx="9.5" ry="13" transform="rotate(8 63 22)" />
      <ellipse cx="81" cy="44" rx="9.5" ry="12.5" transform="rotate(24 81 44)" />
    </svg>
  )
}

/** La pallina da tennis palleggia attraversando il campo; dietro, le impronte (sinistra e destra alternate) la inseguono. */
export function Palleggio({ larghezza = 220 }: { larghezza?: number }) {
  const passi = Math.floor((larghezza - 24) / PASSO) + 1
  return (
    <div className="zampe-campo" aria-hidden style={{ '--zampe-w': `${larghezza}px` } as CSSProperties}>
      <div className="zampe-palla-x">
        <span className="zampe-ombra" />
        <div className="zampe-palla-y"><div className="zampe-palla-s"><div className="zampe-palla">
          <svg viewBox="0 0 32 32" aria-hidden focusable="false">
            <circle className="zampe-feltro" cx="16" cy="16" r="15" />
            <path className="zampe-lato" d="M16 1a15 15 0 0 1 0 30a13 15 0 0 0 0-30z" />
            <path className="zampe-cucitura" d="M5.5 5.3C11 10 11 22 5.5 26.7" />
            <path className="zampe-cucitura" d="M26.5 5.3C21 10 21 22 26.5 26.7" />
          </svg>
        </div></div></div>
      </div>
      {Array.from({ length: passi }, (_, n) => {
        const x = 6 + n * PASSO
        // ogni impronta compare poco dopo che la pallina è passata sopra quel punto
        const ritardo = 0.45 + ((x + 20) / (larghezza + 10)) * 2.4
        return (
          <span key={n} className="zampe-p" style={{ left: x, top: n % 2 ? 74 : 54, transform: 'rotate(90deg)' }}>
            <i style={{ animationDelay: `${ritardo}s` }}><Impronta /></i>
          </span>
        )
      })}
    </div>
  )
}

function useDopoUnAttimo(attivo: boolean): boolean {
  const [visibile, setVisibile] = useState(false)
  useEffect(() => {
    if (!attivo) {
      setVisibile(false)
      return
    }
    const timer = window.setTimeout(() => setVisibile(true), RITARDO_MS)
    return () => window.clearTimeout(timer)
  }, [attivo])
  return attivo && visibile
}

/** Attesa dentro una pagina (liste che si caricano): pallina, zampe e la frase sotto. */
export function AttesaRiga({ testo, style }: { testo: string; style?: CSSProperties }) {
  return (
    <div role="status" style={{ display: 'grid', justifyItems: 'center', gap: 4, padding: '8px 0', color: 'var(--tx2)', fontSize: TYPE.base, textAlign: 'center', ...USER_TEXT, ...style }}>
      <Palleggio />
      <span>{testo}</span>
    </div>
  )
}

/** Scheda di vetro al centro dello schermo per i lavori che richiedono qualche secondo: resta finché il lavoro non finisce. */
export function AttesaZampe({ testo, dettaglio }: { testo: string | null; dettaglio?: string }) {
  const visibile = useDopoUnAttimo(testo !== null)
  if (!visibile || !testo || typeof document === 'undefined') return null
  return createPortal(
    <div className="zampe-velo">
      <div className="zampe-vetro" role="status" aria-live="polite">
        <Palleggio />
        <p style={{ margin: 0, fontSize: TYPE.base, fontWeight: 650, color: 'var(--tx)', ...USER_TEXT }}>{testo}</p>
        {dettaglio ? <p style={{ margin: 0, fontSize: 12.5, color: 'var(--tx2)', ...USER_TEXT }}>{dettaglio}</p> : null}
      </div>
    </div>,
    document.body,
  )
}
