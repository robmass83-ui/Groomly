import { useEffect, useRef } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'
import { Bollino } from './comuni'

export const TAB_ADMIN = ['panoramica', 'saloni', 'beta', 'feedback', 'suggerimenti', 'piani'] as const
export type TabAdmin = typeof TAB_ADMIN[number]

export function tabDi(valore: string | null): TabAdmin {
  return TAB_ADMIN.find((t) => t === valore) ?? 'panoramica'
}

/** Barra dei tab fissa in alto: pillole che scorrono di lato, col numero delle cose nuove. */
export function BarraTab({ tab, onTab, nuovi }: { tab: TabAdmin; onTab: (tab: TabAdmin) => void; nuovi: Partial<Record<TabAdmin, number>> }) {
  const frasi = useFrasi()
  const attivo = useRef<HTMLButtonElement>(null)
  const nomi: Record<TabAdmin, string> = {
    panoramica: frasi.amTabPanoramica,
    saloni: frasi.amTabSaloni,
    beta: frasi.amTabBeta,
    feedback: frasi.amTabFeedback,
    suggerimenti: frasi.amTabSuggerimenti,
    piani: frasi.amTabPiani,
  }
  useEffect(() => {
    attivo.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [tab])
  return (
    <div
      role="tablist"
      aria-label={frasi.amSezioni}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: 'var(--bg)',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: `3px ${SIZES.pagePadX}px`,
      }}
    >
      {TAB_ADMIN.map((voce) => {
        const selezionato = voce === tab
        const n = nuovi[voce] ?? 0
        return (
          <button
            key={voce}
            ref={selezionato ? attivo : undefined}
            type="button"
            role="tab"
            aria-selected={selezionato}
            onClick={() => onTab(voce)}
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 14px',
              borderRadius: 999,
              border: 0,
              font: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: selezionato ? 'var(--tx)' : 'transparent',
              color: selezionato ? 'var(--bg)' : 'var(--tx2)',
            }}
          >
            {nomi[voce]}
            <Bollino n={n} etichetta={frasi.amNuovi.replace('{{n}}', String(n))} />
          </button>
        )
      })}
    </div>
  )
}
