import { emailMessaggio } from '../../../src/i18n/emailHtml'
import type { Lingua } from '../../../src/i18n/lingua'
import { selezionaPromemoria, type VocePromemoria } from '../../../src/lib/promemoriaEmail'
import { postBrevoHtml } from '../brevoMail'

export async function inviaPromemoria(input: {
  apiKey?: string
  voci: readonly VocePromemoria[]
  gia: ReadonlySet<string>
  emailOggi: number
  replyTo?: { email: string; name: string }
  fetchImpl?: typeof fetch
  lingua?: Lingua
}): Promise<{ stato: 'non_inviata' | 'inviata'; inviati: number; inCoda: number }> {
  const scelta = selezionaPromemoria(input.voci, input.gia, input.emailOggi)
  if (!input.apiKey) return { stato: 'non_inviata', inviati: 0, inCoda: scelta.invio.length + scelta.inCoda.length }
  const lingua = input.lingua ?? 'it'
  for (const voce of scelta.invio) {
    const nomeReply = input.replyTo?.name ?? ''
    const mail = emailMessaggio(lingua, 'promemoria', {
      salone: nomeReply !== '' && nomeReply !== 'Groomly' ? nomeReply : '',
      rispondi: Boolean(input.replyTo),
    })
    await postBrevoHtml(
      input.apiKey,
      voce.email,
      mail.oggetto,
      mail.html,
      input.fetchImpl ?? fetch,
      input.replyTo,
    )
  }
  return { stato: 'inviata', inviati: scelta.invio.length, inCoda: scelta.inCoda.length }
}
