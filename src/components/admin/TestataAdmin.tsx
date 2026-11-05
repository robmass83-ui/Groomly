import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

/** Il titolo di una pagina della Console: la marca sta già nella barra in alto. */
export function TestataAdmin({ titolo, sottotitolo, onBack, azione }: { titolo: string; sottotitolo?: string; onBack?: () => void; azione?: ReactNode }) {
  const frasi = useFrasi()
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `10px ${SIZES.pagePadX}px 0`, minHeight: 44 }}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={frasi.homeIndietro} style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, border: 0, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{titolo}</h1>
        {sottotitolo ? <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)' }}>{sottotitolo}</small> : null}
      </div>
      {azione}
    </header>
  )
}
