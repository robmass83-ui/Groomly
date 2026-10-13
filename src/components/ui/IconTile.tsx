import type { ReactNode } from 'react'
import { PRICE_ICONS, type PriceIconKey } from '../../assets/icons/icons'
import { priceTone } from '../../lib/uiStyle'
import { SIZES } from '../../theme/sizes'

type TileTone = PriceIconKey | 'prim' | 'ok' | 'warn' | 'bad'

function tileTone(tone: TileTone): { color: string; background: string } {
  if (tone === 'prim') return { color: 'var(--pri)', background: 'var(--pri-s)' }
  if (tone === 'ok' || tone === 'warn' || tone === 'bad') return { color: `var(--${tone})`, background: `var(--${tone}-s)` }
  if (tone in PRICE_ICONS) {
    const t = priceTone(tone)
    return { color: t.ink, background: t.bg }
  }
  return { color: 'var(--s-strip)', background: 'var(--s-strip-bg)' }
}

export function IconTile({ tone, size, children }: { tone: TileTone; size?: 'sm'; children: ReactNode }) {
  const sm = size === 'sm'
  const ink = tileTone(tone)
  return (
    <span
      style={{
        width: sm ? SIZES.iconTile.sm : SIZES.iconTile.size,
        height: sm ? SIZES.iconTile.sm : SIZES.iconTile.size,
        borderRadius: sm ? SIZES.iconTile.smRadius : SIZES.iconTile.radius,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        color: ink.color,
        background: ink.background,
      }}
    >
      {children}
    </span>
  )
}
