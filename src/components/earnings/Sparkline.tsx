export function Sparkline({ values }: { values: number[] }) {
  const max = values.reduce((peak, value) => Math.max(peak, value), 0)
  const span = Math.max(values.length - 1, 1)
  const points = values.map((value, index) => {
    const x = (index / span) * 40
    const y = max === 0 ? 18 : 18 - (value / max) * 18
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="40" height="18" aria-hidden style={{ flex: 'none', overflow: 'visible' }}>
      {values.length === 0 ? null : <polyline points={points} fill="none" stroke="var(--ok)" strokeWidth="2" />}
    </svg>
  )
}
