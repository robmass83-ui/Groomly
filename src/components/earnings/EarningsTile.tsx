import { Euro } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { maskEuro, plainAmount } from '../../lib/earnings'
import { IconTile } from '../ui/IconTile'

export function EarningsTile({ amount, hidden, style, valueStyle, labelStyle }: {
  amount: number
  hidden: boolean
  style: CSSProperties
  valueStyle: CSSProperties
  labelStyle: CSSProperties
}) {
  const label = hidden ? 'Incassi di oggi: nascosti. Apri incassi' : `Incassi di oggi: ${plainAmount(amount)} euro. Apri incassi`
  return (
    <Link to="/incassi?periodo=giorno" aria-label={label} style={style}>
      <IconTile tone="ok" size="sm"><Euro size={13} strokeWidth={2} aria-hidden /></IconTile>
      <span style={valueStyle}>{maskEuro(amount, hidden)}</span>
      <span style={labelStyle}>Incassi oggi</span>
    </Link>
  )
}
