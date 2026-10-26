import type { CSSProperties } from 'react'

export type LogoForma = 'tondo' | 'quadrato'

/** Senza una scelta il logo resta intero: il cerchio ritagliava i marchi quadrati. */
export function formaLogo(value: unknown): LogoForma {
  return value === 'tondo' ? 'tondo' : 'quadrato'
}

export function riquadroLogo(forma: LogoForma, size: number): CSSProperties {
  const tondo = forma === 'tondo'
  return {
    width: size,
    height: size,
    borderRadius: tondo ? size / 2 : Math.round(size * 0.22),
    objectFit: tondo ? 'cover' : 'contain',
    background: 'var(--card)',
    flex: 'none',
  }
}
