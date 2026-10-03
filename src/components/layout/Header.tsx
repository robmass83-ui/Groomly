import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

export function Header({ title, subtitle, backTo, action }: { title: string; subtitle?: string; backTo?: string; action?: ReactNode }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
      {backTo ? (
        <Link to={backTo} aria-label="Indietro" style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' }}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        </Link>
      ) : null}
      <h1 style={{ margin: 0, flex: 1, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15 }}>
        {title}
        {subtitle ? <small aria-hidden="true" style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>{subtitle}</small> : null}
      </h1>
      {action}
    </header>
  )
}
