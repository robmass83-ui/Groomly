import type { CSSProperties } from 'react'

/** Testo scritto dalla toelettatura: va a capo e resta tutto visibile. */
export const USER_TEXT: CSSProperties = {
  minWidth: 0,
  maxWidth: '100%',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  hyphens: 'auto',
}

/** Riga della razza nelle visite: una sola riga, un nome lungo si taglia con i puntini. */
export const RIGA_RAZZA: CSSProperties = {
  display: 'block',
  minWidth: 0,
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
