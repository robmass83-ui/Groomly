export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      style={{ width: 36, height: 22, borderRadius: 999, border: 0, background: checked ? 'var(--ok)' : 'var(--line)', position: 'relative' }}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 16 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff' }} />
    </button>
  )
}
