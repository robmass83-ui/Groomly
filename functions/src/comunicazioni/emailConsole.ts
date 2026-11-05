import { escapaHtml } from '../../../src/i18n/emailHtml'

const paragrafo = (testo: string) => `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(testo).replaceAll('\n', '<br>')}</p>`

/** La cornice delle email scritte dalla Console: titolo, testo dell'admin, riga finale facoltativa. */
export function emailConsole(input: { titolo: string; testo: string; piede?: string }): string {
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1B2533">',
    `<h1 style="margin:0;font-size:20px;line-height:1.3">${escapaHtml(input.titolo)}</h1>`,
    paragrafo(input.testo),
    input.piede ? paragrafo(input.piede) : '',
    '</div>',
  ].join('')
}
