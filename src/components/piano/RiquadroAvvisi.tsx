import { useFrasi } from '../../i18n/LinguaContext'
import { renderTemplate, urlWhatsApp } from '../../lib/whatsapp'

export function RiquadroAvvisi({
  mostra,
  voci,
  onInviato,
}: {
  mostra: boolean
  voci: { id: string; telefono: string; chiave: string }[]
  onInviato: (chiave: string) => void
}) {
  const frasi = useFrasi()
  if (!mostra) return null
  const primo = voci[0]
  return (
    <section aria-label={frasi.avvisiDomani}>
      {primo ? (
        <>
          <a href={urlWhatsApp(primo.telefono, renderTemplate(frasi.testoAvviso, { nome: 'cliente' }))}>{frasi.apriWhatsapp}</a>
          <button type="button" onClick={() => onInviato(primo.chiave)}>{frasi.segnaInviato}</button>
        </>
      ) : (
        <p>{frasi.nessunAvviso}</p>
      )}
    </section>
  )
}
