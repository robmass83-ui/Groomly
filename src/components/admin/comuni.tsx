import type { CSSProperties, ReactNode } from 'react'
import { BollinoPiano, MarchioGo } from '../abbonamento/MarchioPiano'
import type { useFrasi } from '../../i18n/LinguaContext'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'

// Pezzi condivisi dai tab dell'Admin Manager.

export type Frasi = ReturnType<typeof useFrasi>

export const RIGA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'left',
  border: 0,
  borderTop: '1px solid var(--line)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
  minHeight: SIZES.row.minH,
  cursor: 'pointer',
}

// I Button dell'app non sono flex: per un'icona accanto al testo.
export const CON_ICONA: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }

export const AIUTO: CSSProperties = { display: 'block', fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }
export const NOME: CSSProperties = { display: 'block', fontWeight: 700, ...USER_TEXT }

// Colori fissi dei piani (come la barra della proposta 2).
export const COLORI_LIVELLO: Record<LivelloElenco, string> = { base: '#9AA6B8', pro: '#7B3FE4', salone: '#DCA50E', vip: '#B8962E' }
export const SFUMATURA_PLUS = 'linear-gradient(135deg, #7B3FE4, #4F2BB8)'
export const SFUMATURA_SALONE = 'linear-gradient(135deg, #F2C230, #DCA50E)'

// Bollino del piano: Go, Plus, Salon o VIP, come nella scheda Abbonamento.
export function MarchioLivello({ livello }: { livello: LivelloElenco }) {
  if (livello === 'base') return <MarchioGo altezza={16} />
  return <BollinoPiano piano={livello === 'pro' ? 'plus' : livello} altezza={16} />
}

const TINTE = ['#2F7D5B', '#3A5BA0', '#8A4FB8', '#B0603A', '#2E7F8C', '#7A6A2E', '#A2456A', '#4B5D73']

function tinta(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTE[h % TINTE.length]
}

export function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter((p) => p !== '')
  const lettere = parole.length >= 2 ? parole[0][0] + parole[1][0] : (parole[0] ?? '?').slice(0, 2)
  return lettere.toUpperCase()
}

/** Avatar con le iniziali, colore fisso per salone. */
export function AvatarSalone({ id, nome }: { id: string; nome: string }) {
  return (
    <span
      aria-hidden
      style={{ width: SIZES.avatar.md, height: SIZES.avatar.md, borderRadius: 10, background: tinta(id), color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flex: 'none' }}
    >
      {iniziali(nome)}
    </span>
  )
}

/** Bollino rosso col numero delle cose nuove. */
export function Bollino({ n, etichetta }: { n: number; etichetta?: string }) {
  if (n <= 0) return null
  return (
    <span
      aria-label={etichetta}
      style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--bad)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-grid', placeItems: 'center', lineHeight: 1 }}
    >
      {n}
    </span>
  )
}

/** Barra dei giorni: quanto è passato di un periodo. */
export function BarraGiorniAdmin({ fatto, colore }: { fatto: number; colore: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(fatto * 100)))
  return (
    <span aria-hidden style={{ display: 'block', flex: 1, height: 6, borderRadius: 999, background: 'var(--surf3)', overflow: 'hidden' }}>
      <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: colore, borderRadius: 999 }} />
    </span>
  )
}

export function Nota({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, padding: '8px 10px', borderRadius: 10, background: 'var(--surf)', fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{children}</p>
}

/**
 * Riquadro scuro della beta e della barra d'invito (in tema scuro un po' più chiaro, col bordo).
 * Più i colori tonali dei piani della spec § 8, valori identici ai token che B3 aggiunge in tokens.css:
 * vivono solo mentre la pagina è aperta e all'unione si possono togliere.
 */
export const STILE_ADMIN = [
  '.am-scuro{background:#141B2B}',
  '[data-theme="dark"] .am-scuro{background:#1E2738;box-shadow:inset 0 0 0 1px var(--line2)}',
  ':root{--plus-s:#F0E9FD;--plus-ink:#5A2BC0;--sal-s:#FBF1D6;--sal-ink:#7A5600}',
  '[data-theme="dark"]{--plus-s:rgba(183,148,255,.15);--plus-ink:#C9AEFF;--sal-s:rgba(235,185,40,.14);--sal-ink:#F2CC5E}',
].join('')
