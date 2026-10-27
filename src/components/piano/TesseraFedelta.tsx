import { useFrasi } from '../../i18n/LinguaContext'
import { SegniFedelta } from './SegniFedelta'

export function TesseraFedelta({
  mostra,
  accesso,
  accesa,
  timbri,
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
      <SegniFedelta timbri={timbri} onUsa={onUsa} />
    </section>
  )
}
