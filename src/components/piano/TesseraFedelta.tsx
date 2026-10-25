import { useFrasi } from '../../i18n/LinguaContext'

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
  const frasi = useFrasi()
  if (!mostra || !accesa) return null
  if (!accesso) return <button type="button" onClick={onPaywall}>{frasi.tesseraFedelta}</button>
  return (
    <section aria-label={frasi.tesseraFedelta}>
      <p>{`${frasi.timbri}: ${timbri}`}</p>
      {premio ? <button type="button" onClick={onUsa}>{frasi.usaPremio}</button> : null}
    </section>
  )
}
