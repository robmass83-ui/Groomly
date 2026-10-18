import { SIZES } from '../../theme/sizes'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  const pad = (SIZES.switch.h - SIZES.switch.knob) / 2
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: Math.max(44, SIZES.switch.w),
        height: 44,
        borderRadius: 999,
        border: 0,
        background: 'transparent',
        padding: 0,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: SIZES.switch.w,
          height: SIZES.switch.h,
          borderRadius: 999,
          background: checked ? 'var(--ok)' : 'var(--line2)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: pad,
            left: checked ? SIZES.switch.w - SIZES.switch.knob - pad : pad,
            width: SIZES.switch.knob,
            height: SIZES.switch.knob,
            borderRadius: 999,
            background: 'var(--on-pri)',
            transition: 'left 150ms ease',
          }}
        />
      </span>
    </button>
  )
}

export { Toggle as Switch }
