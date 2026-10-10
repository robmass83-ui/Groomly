import type { FlagKey, TemperamentKey } from '../../assets/icons/icons'
import { FlagIcon } from './FlagIcon'
import { TemperamentIcon } from './TemperamentIcon'

export function TemperamentSticker({ kind, size, flags }: { kind: TemperamentKey; size: number; flags?: FlagKey[] }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, boxShadow: '0 0 0 2px var(--card), var(--sh-stk)' }}>
      <TemperamentIcon kind={kind} size={size} />
      {flags?.map((flag) => (
        <FlagIcon key={flag} kind={flag} size={size} />
      ))}
    </span>
  )
}
