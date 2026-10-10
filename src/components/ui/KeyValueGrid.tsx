import { SIZES } from '../../theme/sizes'

export function KeyValueGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--line)',
        borderRadius: SIZES.kv.radius,
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      {items.map((item) => (
        <div
          key={`${item.label}:${item.value}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'var(--card)',
            padding: `${SIZES.kv.padY}px ${SIZES.kv.padX}px`,
          }}
        >
          <small style={{ fontSize: SIZES.kv.label, textTransform: 'uppercase', color: 'var(--tx3)' }}>{item.label}</small>
          <b style={{ fontSize: SIZES.kv.value, fontWeight: 700 }}>{item.value}</b>
        </div>
      ))}
    </div>
  )
}
