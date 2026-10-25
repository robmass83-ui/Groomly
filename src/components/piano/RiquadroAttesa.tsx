import { it } from '../../i18n/it'

export function RiquadroAttesa({
  mostra,
  accesso,
  posti,
  onPaywall,
}: {
  mostra: boolean
  accesso: boolean
  posti: number
  onPaywall: () => void
}) {
  if (!mostra) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{it.listaAttesa}</button>
  return <section aria-label={it.listaAttesa}><p>{`${it.postiLiberi}: ${posti}`}</p></section>
}
