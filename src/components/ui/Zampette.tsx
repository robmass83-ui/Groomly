import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import './zampette.css'

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

function Passo({ style, ritardo, miele }: { style: CSSProperties; ritardo: number; miele: boolean }) {
  return (
    <span className={`zampe-p${miele ? ' is-miele' : ''}`} style={style}>
      <i style={{ animationDelay: `${ritardo}s` }}><Impronta /></i>
    </span>
  )
}

/** Tre zampette che camminano dentro un bottone, al posto dei puntini. */
export function ZampeMini() {
  return (
    <span className="zampe-mini" aria-hidden>
      <span><Impronta /></span>
      <span><Impronta /></span>
      <span><Impronta /></span>
    </span>
  )
}

/** Un cane cammina da sinistra a destra: le impronte compaiono una dopo l'altra, sinistra e destra alternate, e svaniscono. */
export function Passeggiata({ passi = 7, misura = 22, miele = false }: { passi?: number; misura?: number; miele?: boolean }) {
  const passo = Math.round(misura * 1.35)
  const larghezza = (passi - 1) * passo + misura
  const altezza = Math.round(misura * 2.6)
  return (
    <div className="zampe-passeggiata" aria-hidden style={{ width: larghezza, height: altezza }}>
      {Array.from({ length: passi }, (_, n) => (
        <Passo
          key={n}
          ritardo={n * 0.24}
          miele={miele && n % 2 === 1}
          style={{ left: n * passo, top: n % 2 ? altezza - misura : 0, width: misura, height: misura, transform: 'rotate(90deg)' }}
        />
      ))}
    </div>
  )
}

/** Il cerchio di caricamento fatto di passi: il cane gira in tondo e il cerchio ruota piano. */
export function Girotondo({ misura = 96, miele = false }: { misura?: number; miele?: boolean }) {
  const passi = 10
  const zampa = Math.round(misura / 6)
  const raggio = misura / 2 - zampa
  return (
    <div className="zampe-girotondo" aria-hidden style={{ width: misura, height: misura, '--zampe-giro': '1.6s' } as CSSProperties}>
      {Array.from({ length: passi }, (_, n) => (
        <Passo
          key={n}
          ritardo={(n * 1.6) / passi}
          miele={miele && n % 2 === 1}
          style={{
            width: zampa,
            height: zampa,
            margin: `${-zampa / 2}px 0 0 ${-zampa / 2}px`,
            transform: `rotate(${(n * 360) / passi}deg) translateY(${-(raggio + (n % 2 ? 5 : -5))}px) rotate(90deg)`,
          }}
        />
      ))}
    </div>
  )
}

/** Riga di attesa dentro una pagina: girotondo piccolo e la frase accanto. */
export function AttesaRiga({ testo, style }: { testo: string; style?: CSSProperties }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx3)', fontSize: TYPE.base, ...USER_TEXT, ...style }}>
      <Girotondo misura={40} />
      <span>{testo}</span>
    </div>
  )
}

/** Finestra sopra la pagina per i lavori lunghi (backup, ripristino, export): non si chiude finché il lavoro non finisce. */
export function AttesaZampe({ testo, dettaglio }: { testo: string | null; dettaglio?: string }) {
  if (!testo || typeof document === 'undefined') return null
  return createPortal(
    <div className="zampe-velo">
      <div className="zampe-scheda" role="status" aria-live="polite">
        <Girotondo misura={92} />
        <p style={{ margin: '12px 0 0', fontSize: TYPE.base, fontWeight: 600, color: 'var(--tx)', ...USER_TEXT }}>{testo}</p>
        {dettaglio ? <p style={{ margin: 0, fontSize: 12.5, color: 'var(--tx2)', ...USER_TEXT }}>{dettaglio}</p> : null}
      </div>
    </div>,
    document.body,
  )
}
