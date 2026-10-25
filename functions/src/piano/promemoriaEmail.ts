import { postBrevoTemplate } from '../brevoMail'
import { BREVO_TEMPLATE, selezionaPromemoria, type VocePromemoria } from '../../../src/lib/promemoriaEmail'

export async function inviaPromemoria(input: {
  apiKey?: string
  voci: readonly VocePromemoria[]
  gia: ReadonlySet<string>
  emailOggi: number
  replyTo?: { email: string; name: string }
  fetchImpl?: typeof fetch
}): Promise<{ stato: 'non_inviata' | 'inviata'; inviati: number; inCoda: number }> {
  const scelta = selezionaPromemoria(input.voci, input.gia, input.emailOggi)
  if (!input.apiKey) return { stato: 'non_inviata', inviati: 0, inCoda: scelta.invio.length + scelta.inCoda.length }
  for (const voce of scelta.invio) {
    await postBrevoTemplate(
      input.apiKey,
      BREVO_TEMPLATE.promemoria,
      voce.email,
      { giorno: voce.giorno },
      input.fetchImpl ?? fetch,
      input.replyTo,
    )
  }
  return { stato: 'inviata', inviati: scelta.invio.length, inCoda: scelta.inCoda.length }
}
