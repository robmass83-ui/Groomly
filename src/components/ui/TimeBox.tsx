import { SIZES } from '../../theme/sizes'

export function TimeBox({ time, duration, active }: { time: string; duration: string; active: boolean }) {
  return (
    <div
      style={{
        width: SIZES.timeBox.w,
        borderRadius: SIZES.timeBox.radius,
        padding: `${SIZES.timeBox.padY}px 0`,
        textAlign: 'center',
        flex: 'none',
        background: active ? 'var(--pri-solid)' : 'transparent',
        color: active ? 'var(--on-pri)' : 'var(--tx)',
        border: active ? '1px solid transparent' : undefined,
        boxShadow: active ? 'var(--sh-btn)' : undefined,
      }}
    >
      <div style={{ fontSize: SIZES.timeBox.time, fontWeight: 800, lineHeight: 1.15 }}>{time}</div>
      <div style={{ fontSize: SIZES.timeBox.duration, color: active ? 'rgba(255,255,255,.8)' : 'var(--tx3)', lineHeight: 1.2 }}>
        {duration}
      </div>
    </div>
  )
}
