import type { ReactNode } from 'react'
import { serviceTone } from '../../lib/uiStyle'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
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
        maxWidth: '100%',
        minHeight: SIZES.serviceChip.h,
        height: 'auto',
        padding: `4px ${SIZES.serviceChip.padX}px`,
        gap: SIZES.serviceChip.gap,
        borderRadius: SIZES.serviceChip.radius,
        fontSize: TYPE.chip,
        fontWeight: 600,
        ...USER_TEXT,
        color: tone.ink,
        background: tone.bg,
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 20%, transparent)',
      }}
    >
      <span style={{ display: 'inline-flex', flex: 'none' }}>
        <ServiceIcon iconKey={iconKey} size={SIZES.chip.serviceIconInChip} />
      </span>
      {children}
    </span>
  )
}
