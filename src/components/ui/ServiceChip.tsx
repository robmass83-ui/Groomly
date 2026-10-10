import type { ReactNode } from 'react'
import { serviceTone } from '../../lib/uiStyle'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import type { ServiceIconKey } from '../../types/models'
import { ServiceIcon } from '../domain/ServiceIcon'

export function ServiceChip({ iconKey, children }: { iconKey?: ServiceIconKey; children: ReactNode }) {
  const tone = serviceTone(iconKey)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: SIZES.serviceChip.h,
        padding: `0 ${SIZES.serviceChip.padX}px`,
        gap: SIZES.serviceChip.gap,
        borderRadius: SIZES.serviceChip.radius,
        fontSize: TYPE.chip,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: tone.ink,
        background: tone.bg,
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 20%, transparent)',
      }}
    >
      <ServiceIcon iconKey={iconKey} size={SIZES.chip.serviceIconInChip} />
      {children}
    </span>
  )
}
