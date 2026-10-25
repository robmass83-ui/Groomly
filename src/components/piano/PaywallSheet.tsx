import { useFrasi } from '../../i18n/LinguaContext'

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
  const frasi = useFrasi()
  if (!open) return null
  return (
    <div role="dialog" aria-label={frasi.abbonamentiInArrivo} style={{ background: 'var(--card)', color: 'var(--tx)', padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{frasi.abbonamentiInArrivo}</p>
      <p style={{ margin: '8px 0', color: 'var(--tx2)' }}>{frasi.prezziPlay}</p>
      <button type="button" onClick={onAvvisami}>{frasi.avvisami}</button>
      {puoProvare ? <button type="button" onClick={onProva}>{frasi.provaGratis}</button> : null}
      <button type="button" onClick={onClose}>{frasi.chiudi}</button>
    </div>
  )
}
