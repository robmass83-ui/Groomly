import { addMonths, format } from 'date-fns'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { type DayPoint, niceScale } from '../../lib/earnings'
import { formatEuro, IT_DATE } from '../../lib/format'

const VB_W = 320
const VB_H = 118
const PAD_L = 28
const PAD_R = 8
const PAD_T = 14
const PAD_B = 16

function monthName(month: Date): string {
  return format(month, 'MMMM yyyy', IT_DATE)
}

function shortMonth(month: Date): string {
  return format(month, 'MMM', IT_DATE).replace(/\.$/, '')
}

export function CumulativeChart({ points, month, hidden }: { points: DayPoint[]; month: Date; hidden: boolean }) {
  const mese = monthName(month)
  const label = hidden ? `Andamento di ${mese}, importi nascosti` : `Andamento di ${mese}`
  const peak = Math.max(0, ...points.flatMap((point) => [point.current, point.previous].filter((value): value is number => value !== null)))
  const scala = niceScale(peak)
  const [active, setActive] = useState<number | null>(null)
  const span = Math.max(1, points.length - 1)
  const plotW = VB_W - PAD_L - PAD_R
  const plotH = VB_H - PAD_T - PAD_B

  function xOf(day: number): number {
    return PAD_L + ((day - 1) / span) * plotW
  }

  function yOf(value: number): number {
    return PAD_T + plotH - (value / scala.max) * plotH
  }

  function line(pick: (point: DayPoint) => number | null): string {
    const parts: string[] = []
    points.forEach((point, index) => {
      const value = pick(point)
      if (value === null) return
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${xOf(index + 1).toFixed(2)} ${yOf(value).toFixed(2)}`)
    })
    return parts.join(' ')
  }

  function area(): string {
    const spots = points.flatMap((point, index) => (point.current === null ? [] : [{ x: xOf(index + 1), y: yOf(point.current) }]))
    if (spots.length === 0) return ''
    const base = yOf(0)
    const head = spots.map((spot, index) => `${index === 0 ? 'M' : 'L'}${spot.x.toFixed(2)} ${spot.y.toFixed(2)}`).join(' ')
    return `${head} L${spots[spots.length - 1].x.toFixed(2)} ${base.toFixed(2)} L${spots[0].x.toFixed(2)} ${base.toFixed(2)} Z`
  }

  const ticks: number[] = []
  for (let value = 0; value <= scala.max; value += scala.step) ticks.push(value)
  const markers = [1, 10, 20, points.length].filter((day, index, list) => day >= 1 && day <= points.length && list.indexOf(day) === index)
  let lastIndex = -1
  points.forEach((point, index) => {
    if (point.current !== null) lastIndex = index
  })
  const lastCurrent = lastIndex >= 0 ? points[lastIndex].current : null
  const last = lastCurrent === null ? null : { x: xOf(lastIndex + 1), y: yOf(lastCurrent), value: lastCurrent }
  const activePoint = active === null ? null : points[active]

  function indexFrom(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect()
    const width = rect.width || 1
    const x = event.clientX - rect.left
    const plotLeft = (PAD_L / VB_W) * width
    const plotRight = ((VB_W - PAD_R) / VB_W) * width
    const ratio = (x - plotLeft) / Math.max(1, plotRight - plotLeft)
    return Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))))
  }

  function pick(event: PointerEvent<HTMLDivElement>) {
    if (points.length === 0) return
    if (event.type === 'pointermove' && event.buttons === 0) return
    setActive(indexFrom(event))
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    if (points.length === 0) return
    const direction = event.key === 'ArrowRight' ? 1 : -1
    setActive((current) => {
      const from = current ?? (direction > 0 ? -1 : points.length)
      return Math.max(0, Math.min(points.length - 1, from + direction))
    })
  }

  function bubble(point: DayPoint): string {
    if (hidden) return 'importi nascosti'
    const day = new Date(month.getFullYear(), month.getMonth(), point.day)
    const when = format(day, 'd MMMM', IT_DATE)
    if (point.current === null && point.previous === null) return when
    const previous = point.previous === null ? '' : ` (${shortMonth(addMonths(day, -1))} ${formatEuro(point.previous)})`
    const current = point.current === null ? '' : formatEuro(point.current)
    return `${when}${current ? ` · ${current}` : ''}${previous}`
  }

  function axisLabel(value: number): string {
    if (hidden || value === 0) return value === 0 && !hidden ? '0' : ''
    if (value >= 1000 && value % 1000 === 0) return `${value / 1000}k`
    return String(value)
  }

  return (
    <div tabIndex={0} aria-label={label} onKeyDown={onKey} onPointerDown={pick} onPointerMove={pick} style={{ position: 'relative', touchAction: 'none' }}>
      <svg role="img" aria-label={label} width="100%" height={118} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {ticks.map((value) => (
          <g key={value}>
            <line x1={PAD_L} x2={VB_W - PAD_R} y1={yOf(value)} y2={yOf(value)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD_L - 4} y={yOf(value)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--tx3)">
              {axisLabel(value)}
            </text>
          </g>
        ))}
        <path d={area()} fill="var(--pri)" fillOpacity={0.12} />
        <path d={line((point) => point.previous)} fill="none" stroke="var(--tx3)" strokeWidth={2} strokeDasharray="4 3" />
        <path d={line((point) => point.current)} fill="none" stroke="var(--pri)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {last ? <circle cx={last.x} cy={last.y} r={4} fill="var(--pri)" stroke="#fff" strokeWidth={2} /> : null}
        {activePoint ? (
          <line x1={xOf(activePoint.day)} x2={xOf(activePoint.day)} y1={PAD_T} y2={VB_H - PAD_B} stroke="var(--tx3)" strokeWidth={1} />
        ) : null}
        {markers.map((day) => (
          <text key={day} x={xOf(day)} y={VB_H - 3} textAnchor="middle" fontSize={9} fill="var(--tx3)">
            {day}
          </text>
        ))}
      </svg>
      {activePoint ? (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--tip-bg)',
            color: 'var(--tip-tx)',
            borderRadius: 9,
            padding: '4px 8px',
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {bubble(activePoint)}
        </div>
      ) : null}
      {last && active === null && !hidden ? (
        <span
          style={{
            position: 'absolute',
            left: `${(last.x / VB_W) * 100}%`,
            top: `${(last.y / VB_H) * 100}%`,
            transform: 'translate(-100%, -130%)',
            background: 'var(--tip-bg)',
            color: 'var(--tip-tx)',
            borderRadius: 999,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          {formatEuro(last.value)}
        </span>
      ) : null}
    </div>
  )
}
