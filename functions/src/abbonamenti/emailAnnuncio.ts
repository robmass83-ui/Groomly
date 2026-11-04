import { escapaHtml } from '../../../src/i18n/emailHtml'
import type { Lingua } from '../../../src/i18n/lingua'

const TESTI: Record<Lingua, { oggetto: string; titolo: string; corpo: string; fondatori: string; firma: string }> = {
  it: {
    oggetto: 'Groomly: Plus e Salon diventano a pagamento',
    titolo: 'Dal {{data}} Plus e Salon saranno a pagamento',
    corpo: 'Go resta gratis e i tuoi clienti, gli animali e gli appuntamenti restano tutti. Se vuoi continuare con Plus o Salon, potrai abbonarti dall’app scaricata da Google Play.',
    fondatori: 'Hai partecipato alla beta o sei tra i primi: per te c’è un prezzo di favore riservato.',
    firma: 'Grazie per averci aiutato a costruire Groomly. Roberto',
  },
  en: {
    oggetto: 'Groomly: Plus and Salon become paid plans',
    titolo: 'From {{data}} Plus and Salon will be paid plans',
    corpo: 'Go stays free and all your clients, pets and appointments stay where they are. If you want to keep Plus or Salon, you can subscribe from the app downloaded from Google Play.',
    fondatori: 'You joined the beta or were among the first: a special price is reserved for you.',
    firma: 'Thank you for helping us build Groomly. Roberto',
  },
  es: {
    oggetto: 'Groomly: Plus y Salon pasan a ser de pago',
    titolo: 'Desde el {{data}} Plus y Salon serán de pago',
    corpo: 'Go sigue siendo gratis y todos tus clientes, mascotas y citas se quedan. Si quieres seguir con Plus o Salon, podrás suscribirte desde la app descargada de Google Play.',
    fondatori: 'Participaste en la beta o fuiste de los primeros: tienes un precio especial reservado.',
    firma: 'Gracias por ayudarnos a construir Groomly. Roberto',
  },
}

function dataBreve(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export function emailAnnuncio(lingua: Lingua, pagamentiDal: string): { oggetto: string; html: string } {
  const t = TESTI[lingua]
  const p = (testo: string) => `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(testo)}</p>`
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1B2533">',
    `<h1 style="margin:0;font-size:20px;line-height:1.3">${escapaHtml(t.titolo.replace('{{data}}', dataBreve(pagamentiDal)))}</h1>`,
    p(t.corpo),
    p(t.fondatori),
    p(t.firma),
    '</div>',
  ].join('')
  return { oggetto: t.oggetto, html }
}
