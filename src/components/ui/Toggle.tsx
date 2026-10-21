import { SIZES } from '../../theme/sizes'

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  const pad = (SIZES.switch.h - SIZES.switch.knob) / 2
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-label={label}
      onClick={() => {
        if (!disabled) onChange(!checked)
      }}
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
        opacity: disabled ? 0.45 : 1,
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
