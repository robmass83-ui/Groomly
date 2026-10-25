import { it } from '../../i18n/it'
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
  if (!mostra) return null
  const primo = voci[0]
  return (
    <section aria-label={it.avvisiDomani}>
      {primo ? (
        <>
          <a href={urlWhatsApp(primo.telefono, renderTemplate(it.testoAvviso, { nome: 'cliente' }))}>{it.apriWhatsapp}</a>
          <button type="button" onClick={() => onInviato(primo.chiave)}>{it.segnaInviato}</button>
        </>
      ) : (
        <p>{it.nessunAvviso}</p>
      )}
    </section>
  )
}
