import { it } from '../../i18n/it'

export function TesseraFedelta({
  mostra,
  accesso,
  accesa,
  timbri,
  premio,
  onPaywall,
  onUsa,
}: {
  mostra: boolean
  accesso: boolean
  accesa: boolean
  timbri: number
  premio: boolean
  onPaywall: () => void
  onUsa: () => void
}) {
  if (!mostra || !accesa) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{it.tesseraFedelta}</button>
  return (
    <section aria-label={it.tesseraFedelta}>
      <p>{`${it.timbri}: ${timbri}`}</p>
      {premio ? <button type="button" onClick={onUsa}>{it.usaPremio}</button> : null}
    </section>
  )
}
