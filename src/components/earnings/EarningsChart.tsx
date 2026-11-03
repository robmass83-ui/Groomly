import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { maskEuro, PARTE_PREVISTO, plainAmount, type EarningsBucket } from '../../lib/earnings'
import { posizioneFumetto } from '../../lib/posizioneFumetto'
import { TYPE } from '../../theme/theme'
import './earningsChart.css'

const PLOT_TOP = 46
const AXIS_W = 52
const AXIS_FONT = 12

function pct(value: number, max: number): string {
  return `${Math.round((value / max) * 10000) / 100}%`
}

function barLabel(bucket: EarningsBucket, hidden: boolean, lingua: ReturnType<typeof useLingua>['lingua']): string {
  if (hidden) return t(lingua, 'incBarraNascosta', { titolo: bucket.title })
  if (bucket.previsto > 0) return t(lingua, 'incBarraPrevisti', { titolo: bucket.title, importo: plainAmount(bucket.incassato), previsti: plainAmount(bucket.previsto) })
  return t(lingua, 'incBarra', { titolo: bucket.title, importo: plainAmount(bucket.incassato) })
}

function tipText(bucket: EarningsBucket, hidden: boolean, lingua: ReturnType<typeof useLingua>['lingua']): string {
  const earned = bucket.incassato > 0 ? t(lingua, 'incTipIncassati', { importo: maskEuro(bucket.incassato, hidden) }) : t(lingua, 'incNessunIncasso')
  return bucket.previsto > 0 ? t(lingua, 'incTipPiu', { base: earned, previsto: maskEuro(bucket.previsto, hidden) }) : earned
}

function Grid({ scala, hidden }: { scala: { step: number; max: number }; hidden: boolean }) {
  const lines: number[] = []
  for (let value = 0; value <= scala.max; value += scala.step) lines.push(value)
  return (
    <>
      {lines.map((value) => (
        <div
          key={value}
          style={{ position: 'absolute', left: 0, right: 0, bottom: pct(value, scala.max), height: 0, borderTop: value === 0 ? '1px solid var(--line2)' : '1px dashed var(--grid)' }}
        >
          <span style={{ position: 'absolute', left: -AXIS_W, top: 0, transform: 'translateY(-50%)', width: AXIS_W - 8, textAlign: 'right', fontSize: AXIS_FONT, lineHeight: 1.2, color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
            {hidden ? '' : value === 0 ? '0' : `${value}€`}
          </span>
        </div>
      ))}
    </>
  )
}

const plot: CSSProperties = { position: 'absolute', left: AXIS_W, right: 0, top: PLOT_TOP, bottom: 0 }

export function EarningsChart({ buckets, scala, mediaBarre, selectedKey, onSelect, hidden }: {
  buckets: EarningsBucket[]
  scala: { step: number; max: number }
  mediaBarre: number | null
  selectedKey: string | null
  onSelect: (key: string) => void
  hidden: boolean
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const barsRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tip, setTip] = useState<{ left: number; height: number } | null>(null)
  const selectedIndex = buckets.findIndex((bucket) => bucket.key === selectedKey)

  useLayoutEffect(() => {
    const area = barsRef.current
    const box = tipRef.current
    const bar = selectedIndex >= 0 ? area?.children[selectedIndex] : undefined
    if (!area || !box || !bar) { setTip(null); return }
    function measure() {
      if (!area || !box || !bar) return
      const areaRect = area.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      const left = posizioneFumetto({ centroBarra: barRect.left - areaRect.left + barRect.width / 2, larghezzaFumetto: box.getBoundingClientRect().width, larghezzaGrafico: areaRect.width })
      const height = box.getBoundingClientRect().height
      setTip((old) => (old && old.left === left && old.height === height ? old : { left, height }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    observer.observe(box)
    return () => observer.disconnect()
  }, [selectedIndex, selectedKey, buckets, hidden, lingua])

  if (buckets.length === 0) {
    return (
      <div style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>
            {frasi.incNessunAppPeriodo}
          </div>
        </div>
      </div>
    )
  }

  const selectedBucket = selectedIndex >= 0 ? buckets[selectedIndex] : null
  const selectedSum = selectedBucket ? selectedBucket.incassato + selectedBucket.previsto : 0

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const from = selectedIndex < 0 ? 0 : selectedIndex
    const next = Math.max(0, Math.min(buckets.length - 1, from + (event.key === 'ArrowRight' ? 1 : -1)))
    onSelect(buckets[next].key)
  }

  return (
    <div>
      <div role="group" aria-label={frasi.incGrafico} tabIndex={0} onKeyDown={move} className="earnings-plot" style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          {mediaBarre !== null ? (
            <div
              data-testid="earnings-average"
              style={{ position: 'absolute', left: 0, right: 0, bottom: pct(mediaBarre, scala.max), height: 0, borderTop: '1.5px dashed var(--tx3)', zIndex: 1, pointerEvents: 'none' }}
            />
          ) : null}
          <div ref={barsRef} style={{ position: 'absolute', inset: 0, display: 'flex', gap: 6 }}>
            {buckets.map((bucket) => {
              const selected = bucket.key === selectedKey
              const sum = bucket.incassato + bucket.previsto
              const fade = selectedKey !== null && !selected ? 0.5 : 1
              const aboveBar: CSSProperties = { position: 'absolute', zIndex: 2, left: 0, right: 0, bottom: `calc(${pct(sum, scala.max)} + 4px)`, pointerEvents: 'none' }
              return (
                <button
                  key={bucket.key}
                  type="button"
                  aria-pressed={selected}
                  aria-label={barLabel(bucket, hidden, lingua)}
                  onClick={() => onSelect(bucket.key)}
                  style={{ flex: 1, minWidth: 0, height: '100%', border: 0, background: 'transparent', padding: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', color: 'inherit' }}
                >
                  {!selected && sum > 0 ? (
                    <span style={{ ...aboveBar, textAlign: 'center', fontSize: 12, fontWeight: 600, lineHeight: 1.15, color: 'var(--tx3)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{hidden ? '•' : plainAmount(sum)}</span>
                  ) : null}
                  {sum > 0 ? (
                    <span className="earnings-bar" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 28, height: pct(sum, scala.max), opacity: fade, transition: 'opacity 150ms' }}>
                      {bucket.previsto > 0 ? (
                        <span
                          data-part={PARTE_PREVISTO}
                          style={{ flexGrow: bucket.previsto, flexBasis: 0, background: 'repeating-linear-gradient(135deg, var(--prev-a) 0 4px, var(--prev-b) 4px 8px)', border: '1.5px dashed var(--prev-line)', borderBottom: bucket.incassato > 0 ? 0 : undefined, borderRadius: bucket.incassato > 0 ? '7px 7px 0 0' : '7px 7px 3px 3px' }}
                        />
                      ) : null}
                      {bucket.incassato > 0 ? (
                        <span
                          data-part="incassato"
                          style={{ flexGrow: bucket.incassato, flexBasis: 0, minHeight: 3, background: selected ? 'linear-gradient(180deg, var(--bar-sa), var(--bar-sb))' : 'linear-gradient(180deg, var(--bar-a), var(--bar-b))', borderRadius: bucket.previsto > 0 ? '0 0 3px 3px' : '7px 7px 3px 3px' }}
                        />
                      ) : null}
                    </span>
                  ) : null}
                </button>
              )
            })}
            {selectedBucket ? (
              <span
                ref={tipRef}
                role="status"
                aria-live="polite"
                style={{
                  position: 'absolute',
                  zIndex: 2,
                  left: tip ? tip.left : 4,
                  width: 'max-content',
                  maxWidth: 'calc(100% - 8px)',
                  bottom: `min(calc(${pct(selectedSum, scala.max)} + 8px), calc(100% + ${PLOT_TOP - 2}px - ${tip ? tip.height : 0}px))`,
                  visibility: tip ? 'visible' : 'hidden',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                  background: 'var(--tip-bg)',
                  color: 'var(--tip-tx)',
                  borderRadius: 9,
                  padding: '6px 9px',
                  fontSize: 12,
                  lineHeight: 1.35,
                  textAlign: 'left',
                  boxShadow: 'var(--tip-sh)',
                  whiteSpace: 'normal',
                  overflowWrap: 'normal',
                  wordBreak: 'normal',
                }}
              >
                <b style={{ display: 'block', fontSize: 12 }}>{selectedBucket.title}</b>
                <span style={{ display: 'block', color: 'var(--tip-sub)' }}>{tipText(selectedBucket, hidden, lingua)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div aria-hidden style={{ display: 'flex', gap: 6, margin: `6px 0 0 ${AXIS_W}px` }}>
        {buckets.map((bucket) => {
          const selected = bucket.key === selectedKey
          return (
            <div
              key={bucket.key}
              style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 12, lineHeight: 1.2, fontWeight: bucket.isToday ? 800 : selected ? 700 : 600, color: bucket.isToday ? 'var(--pri)' : selected ? 'var(--tx)' : 'var(--tx2)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
            >
              {bucket.label}
              <small style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--tx3)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{bucket.sublabel || '\u00a0'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}
