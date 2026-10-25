import { it } from '../../i18n/it'

export function PaywallSheet({
  open,
  puoProvare,
  onClose,
  onAvvisami,
  onProva,
}: {
  open: boolean
  puoProvare: boolean
  onClose: () => void
  onAvvisami: () => void
  onProva: () => void
}) {
  if (!open) return null
  return (
    <div role="dialog" aria-label={it.abbonamentiInArrivo} style={{ background: 'var(--card)', color: 'var(--tx)', padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{it.abbonamentiInArrivo}</p>
      <p style={{ margin: '8px 0', color: 'var(--tx2)' }}>I prezzi arriveranno con Google Play.</p>
      <button type="button" onClick={onAvvisami}>{it.avvisami}</button>
      {puoProvare ? <button type="button" onClick={onProva}>{it.provaGratis}</button> : null}
      <button type="button" onClick={onClose}>Chiudi</button>
    </div>
  )
}
