import { randomBytes } from 'node:crypto'
import { fraseDisiscriviti } from '../../../src/i18n/emailHtml'
import { postBrevoHtml } from '../brevoMail'
import type { ArchivioPromo } from './consensoPromo'

type Posta = (to: string, oggetto: string, html: string, headers: Record<string, string>) => Promise<void>

// L'unica strada per le email promozionali di Groomly ai saloni: anche le Comunicazioni della Console passano da qui.
export async function inviaPromo(
  input: { uid: string; oggetto: string; html: string; apiKey: string },
  archivio: ArchivioPromo,
  posta: Posta = (to, oggetto, html, headers) => postBrevoHtml(input.apiKey, to, oggetto, html, fetch, undefined, headers),
): Promise<'inviata' | 'senza-consenso'> {
  const account = await archivio.leggi(input.uid)
  const consenso = account?.emailPromo
  if (!account || account.email === '' || consenso?.attivo !== true) return 'senza-consenso'
  const token = consenso.token ?? randomBytes(16).toString('hex')
  if (!consenso.token) await archivio.scrivi(input.uid, { ...consenso, token })
  const lingua = account.lingua ?? 'it'
  const query = new URLSearchParams({ mode: 'promo', uid: input.uid, token, lang: lingua })
  const link = `https://groomlyapp.it/azione?${query.toString()}`
  const piede = `<p style="margin:12px 0 0;font-size:13px;line-height:1.5"><a href="${link.replaceAll('&', '&amp;')}" style="color:#6B7A8C">${fraseDisiscriviti(lingua)}</a></p>`
  await posta(account.email, input.oggetto, `${input.html}${piede}`, { 'List-Unsubscribe': `<${link}>` })
  return 'inviata'
}
