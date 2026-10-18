import type { CSSProperties, KeyboardEvent } from 'react'
import { maskEuro, plainAmount, type EarningsBucket } from '../../lib/earnings'
import { USER_TEXT } from '../../theme/text'
import { TYPE } from '../../theme/theme'
import './earningsChart.css'

const PLOT_TOP = 46
const AXIS_W = 52
const AXIS_FONT = 12

function pct(value: number, max: number): string {
  return `${Math.round((value / max) * 10000) / 100}%`
}

function barLabel(bucket: EarningsBucket, hidden: boolean): string {
  if (hidden) return `${bucket.title}: importi nascosti`
  return `${bucket.title}: ${plainAmount(bucket.incassato)} euro incassati${bucket.previsto > 0 ? `, ${plainAmount(bucket.previsto)} previsti` : ''}`
}

function tipText(bucket: EarningsBucket, hidden: boolean): string {
  const earned = bucket.incassato > 0 ? `${maskEuro(bucket.incassato, hidden)} incassati` : 'nessun incasso'
  return bucket.previsto > 0 ? `${earned} · +${maskEuro(bucket.previsto, hidden)} previsti` : earned
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
  if (buckets.length === 0) {
    return (
      <div style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>
            Nessun appuntamento in questo periodo
          </div>
        </div>
      </div>
    )
  }

  const selectedIndex = buckets.findIndex((bucket) => bucket.key === selectedKey)

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const from = selectedIndex < 0 ? 0 : selectedIndex
    const next = Math.max(0, Math.min(buckets.length - 1, from + (event.key === 'ArrowRight' ? 1 : -1)))
    onSelect(buckets[next].key)
  }

  return (
    <div>
      <div role="group" aria-label="Grafico incassi" tabIndex={0} onKeyDown={move} className="earnings-plot" style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          {mediaBarre !== null ? (
            <div
              data-testid="earnings-average"
              style={{ position: 'absolute', left: 0, right: 0, bottom: pct(mediaBarre, scala.max), height: 0, borderTop: '1.5px dashed var(--tx3)', zIndex: 1, pointerEvents: 'none' }}
            />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 6 }}>
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
                  aria-label={barLabel(bucket, hidden)}
                  onClick={() => onSelect(bucket.key)}
                  style={{ flex: 1, minWidth: 0, height: '100%', border: 0, background: 'transparent', padding: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', color: 'inherit' }}
                >
                  {selected ? (
                    <span
                      role="status"
                      aria-live="polite"
                      style={{ ...aboveBar, bottom: `calc(${pct(sum, scala.max)} + 8px)`, background: 'var(--tip-bg)', color: 'var(--tip-tx)', borderRadius: 9, padding: '6px 9px', fontSize: 12, lineHeight: 1.35, textAlign: 'left', boxShadow: 'var(--tip-sh)', ...USER_TEXT }}
                    >
                      <b style={{ display: 'block', fontSize: 12, ...USER_TEXT }}>{bucket.title}</b>
                      <span style={{ color: 'var(--tip-sub)', ...USER_TEXT }}>{tipText(bucket, hidden)}</span>
                    </span>
                  ) : null}
                  {!selected && sum > 0 ? (
                    <span style={{ ...aboveBar, textAlign: 'center', fontSize: 12, fontWeight: 600, lineHeight: 1.15, color: 'var(--tx3)', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{hidden ? '•' : plainAmount(sum)}</span>
                  ) : null}
                  {sum > 0 ? (
                    <span className="earnings-bar" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 28, height: pct(sum, scala.max), opacity: fade, transition: 'opacity 150ms' }}>
                      {bucket.previsto > 0 ? (
                        <span
                          data-part="previsto"
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
