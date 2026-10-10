import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Tone = 'default' | 'ok' | 'warn' | 'bad'

const BAR: Record<Tone, string> = {
  default: 'var(--pri)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
}

export function SectionTitle({
  children,
  icon,
  link,
  color = 'var(--tx3)',
  tone = 'default',
  count,
}: {
  children: ReactNode
  icon?: ReactNode
  link?: ReactNode
  color?: string
  tone?: Tone
  count?: number
}) {
  return (
    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.section, fontWeight: 700, color }}>
      <span
        aria-hidden
        style={{
          width: SIZES.sectionBar.w,
          height: SIZES.sectionBar.h,
          borderRadius: SIZES.sectionBar.radius,
          background: BAR[tone],
          flexShrink: 0,
        }}
      />
      {icon}
      <span style={{ flex: 1, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase' }}>{children}</span>
      {typeof count === 'number' ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: SIZES.sectionBar.countH,
            padding: '0 6px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--surf3)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--tx)',
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      ) : null}
      {link}
    </h2>
  )
}

export { SectionTitle as SectionHeader }
