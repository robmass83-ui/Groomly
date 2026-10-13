import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { BrandBar } from './BrandBar'

const backStyle = { width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' } as const

export function Header({ title, subtitle, backTo, onBack, action }: { title: string; subtitle?: string; backTo?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: SIZES.brandBar.gap, padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
      <BrandBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Indietro" style={backStyle}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          </button>
        ) : backTo ? (
          <Link to={backTo} aria-label="Indietro" style={backStyle}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15 }}>
            {title}
          </h1>
          {subtitle ? <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>{subtitle}</small> : null}
        </div>
        {action}
      </div>
    </header>
  )
}
