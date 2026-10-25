import { Euro } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import { maskEuro, plainAmount } from '../../lib/earnings'
import { IconTile } from '../ui/IconTile'

export function EarningsTile({ amount, hidden, style, valueStyle, labelStyle }: {
  amount: number
  hidden: boolean
  style: CSSProperties
  valueStyle: CSSProperties
  labelStyle: CSSProperties
}) {
  const frasi = useFrasi()
  const label = hidden ? frasi.incassiNascosti : frasi.incassiEuro.replace('{{importo}}', plainAmount(amount))
  return (
    <Link to="/incassi?periodo=giorno" aria-label={label} style={style}>
      <IconTile tone="ok" size="sm"><Euro size={13} strokeWidth={2} aria-hidden /></IconTile>
      <span style={valueStyle}>{maskEuro(amount, hidden)}</span>
      <span style={labelStyle}>{frasi.homeIncassiOggi}</span>
    </Link>
  )
}
