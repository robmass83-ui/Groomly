import { useFrasi } from '../../i18n/LinguaContext'
import { firmaCollage, messaggioWhatsapp, notaVocale } from '../../lib/affidabilita'
import { nuovaPagellaVisibile } from '../../lib/pagella'

export function StrumentiManuali({
  mostra,
  accessoPagella,
  base,
  senzaFirma,
  microfono,
}: {
  mostra: boolean
  accessoPagella: boolean
  base: boolean
  senzaFirma: boolean
  microfono: boolean
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  const messaggio = messaggioWhatsapp('Ciao {{nome}}', { nome: 'cliente' }, '')
  const voce = notaVocale(microfono)
  const firma = firmaCollage(base, senzaFirma)
  return (
    <section aria-label={frasi.strumenti}>
      <a href={messaggio.url}>Scrivi su WhatsApp</a>
      <p>{voce.ok ? 'Nota vocale' : voce.message}</p>
      {nuovaPagellaVisibile(accessoPagella) ? <button type="button">Nuova pagella</button> : null}
      {firma ? <p>{firma}</p> : null}
    </section>
  )
}
