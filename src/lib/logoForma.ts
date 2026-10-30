import type { CSSProperties } from 'react'

/**
 * Il logo si mostra nella sua forma vera: niente riquadro, cerchio o sfondo attorno.
 * È alto `altezza` e largo quanto chiedono le sue proporzioni, fino a `larghezzaMax`;
 * un logo molto largo si rimpicciolisce dentro lo spazio trasparente che avanza.
 */
export function stileLogo(altezza: number, larghezzaMax = Math.round(altezza * 2.2)): CSSProperties {
  return {
    display: 'block',
    height: altezza,
    width: 'auto',
    maxWidth: larghezzaMax,
    objectFit: 'contain',
    flex: 'none',
  }
}
