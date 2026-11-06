import type { CSSProperties } from 'react'

export { ETICHETTA_CATEGORIA } from '../../lib/prodotti'

/** Icona e testo sulla stessa riga dentro un `Button`. */
export const conIcona: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }

export function chipMagazzino(attivo: boolean): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 14px',
    borderRadius: 12,
    border: `1px solid ${attivo ? 'var(--pri-solid)' : 'var(--line)'}`,
    background: attivo ? 'var(--pri-solid)' : 'var(--card)',
    color: attivo ? 'var(--on-pri)' : 'var(--tx)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
