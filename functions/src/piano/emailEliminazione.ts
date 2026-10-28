import type { Lingua } from '../../../src/i18n/lingua'
import { saloneNellaFrase } from '../../../src/i18n/emailHtml'

export function emailEliminazione(nome: string, lingua: Lingua = 'it'): { oggetto: string; html: string } {
  const oggetto = lingua === 'en'
    ? 'Your Groomly account has been deleted'
    : lingua === 'es'
      ? 'Tu cuenta de Groomly ha sido eliminada'
      : 'Il tuo account Groomly è stato eliminato'
  const conto = contoEliminato(lingua, nome)
  const corpo = lingua === 'en'
    ? `Hi, this is to confirm that ${conto} has been deleted, together with the salon data managed by Groomly. Any files you saved on your phone or Google Drive remain yours. Thank you for working with us: if you ever want to come back, we'll be glad to have you. If this wasn't you, please write to info@groomlyapp.it straight away.`
    : lingua === 'es'
      ? `Hola, te confirmamos que ${conto} ha sido eliminada, junto con los datos de la peluquería gestionados por Groomly. Los archivos que guardaste en tu teléfono o en tu Google Drive siguen siendo tuyos. Gracias por trabajar con nosotros: si algún día quieres volver, te esperamos. Si no has sido tú, escribe cuanto antes a info@groomlyapp.it.`
      : `Ciao, ti confermiamo che ${conto} è stato eliminato, insieme ai dati del salone gestiti da Groomly. I file che avevi salvato sul telefono o sul tuo Google Drive restano tuoi. Grazie per aver lavorato con noi: se un giorno vorrai tornare, ti aspettiamo. Se non sei stato tu, scrivi subito a info@groomlyapp.it.`
  const html = `<!doctype html><html lang="${lingua}"><body style="background:#f4f7fb;font-family:sans-serif;color:#123">
<img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="180">
<h1 style="font-size:28px;color:#123">${oggetto}</h1>
<p>${corpo}</p>
</body></html>`
  return { oggetto, html }
}

function contoEliminato(lingua: Lingua, nome: string): string {
  const pulito = nome.trim()
  if (lingua === 'en') {
    return pulito
      ? `the ${saloneNellaFrase('en', pulito, 'soggetto')} account`
      : `${saloneNellaFrase('en', '', 'soggetto')} account`
  }
  if (lingua === 'es') {
    return pulito
      ? `la cuenta de ${saloneNellaFrase('es', pulito, 'di')}`
      : `la cuenta ${saloneNellaFrase('es', '', 'di')}`
  }
  return pulito ? `l’account di ${saloneNellaFrase('it', pulito, 'di')}` : `l’account ${saloneNellaFrase('it', '', 'di')}`
}
