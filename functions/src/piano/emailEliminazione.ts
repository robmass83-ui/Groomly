import type { Lingua } from '../../../src/i18n/lingua'
import { saloneNellaFrase } from '../../../src/i18n/emailHtml'

const OGGETTO: Record<Lingua, string> = {
  it: 'Il tuo account Groomly è stato eliminato',
  en: 'Your Groomly account has been deleted',
  es: 'Tu cuenta de Groomly ha sido eliminada',
  fr: 'Votre compte Groomly a été supprimé',
  de: 'Ihr Groomly-Konto wurde gelöscht',
}

const CORPO: Record<Lingua, (conto: string) => string> = {
  it: (conto) => `Ciao, ti confermiamo che ${conto} è stato eliminato, insieme ai dati del salone gestiti da Groomly. I file che avevi salvato sul telefono o sul tuo Google Drive restano tuoi. Grazie per aver lavorato con noi: se un giorno vorrai tornare, ti aspettiamo. Se non sei stato tu, scrivi subito a info@groomlyapp.it.`,
  en: (conto) => `Hi, this is to confirm that ${conto} has been deleted, together with the salon data managed by Groomly. Any files you saved on your phone or Google Drive remain yours. Thank you for working with us: if you ever want to come back, we'll be glad to have you. If this wasn't you, please write to info@groomlyapp.it straight away.`,
  es: (conto) => `Hola, te confirmamos que ${conto} ha sido eliminada, junto con los datos de la peluquería gestionados por Groomly. Los archivos que guardaste en tu teléfono o en tu Google Drive siguen siendo tuyos. Gracias por trabajar con nosotros: si algún día quieres volver, te esperamos. Si no has sido tú, escribe cuanto antes a info@groomlyapp.it.`,
  fr: (conto) => `Bonjour, nous vous confirmons que ${conto} a été supprimé, avec les données du salon gérées par Groomly. Les fichiers enregistrés sur votre téléphone ou votre Google Drive restent les vôtres. Merci d’avoir travaillé avec nous : si un jour vous souhaitez revenir, nous vous attendons. Si ce n’est pas vous, écrivez immédiatement à info@groomlyapp.it.`,
  de: (conto) => `Hallo, wir bestätigen Ihnen, dass ${conto} gelöscht wurde, zusammen mit den von Groomly verwalteten Salondaten. Dateien, die Sie auf Ihrem Telefon oder in Ihrem Google Drive gespeichert haben, gehören weiterhin Ihnen. Vielen Dank für die Zusammenarbeit: Wenn Sie eines Tages zurückkommen möchten, freuen wir uns auf Sie. Wenn Sie das nicht waren, schreiben Sie bitte sofort an info@groomlyapp.it.`,
}

const CONTO: Record<Lingua, (nome: string, vuoto: string) => string> = {
  it: (nome, vuoto) => (nome ? `l’account di ${nome}` : `l’account ${vuoto}`),
  en: (nome, vuoto) => (nome ? `the ${nome} account` : `${vuoto} account`),
  es: (nome, vuoto) => (nome ? `la cuenta de ${nome}` : `la cuenta ${vuoto}`),
  fr: (nome, vuoto) => (nome ? `le compte de ${nome}` : `le compte ${vuoto}`),
  de: (nome, vuoto) => (nome ? `das Konto von ${nome}` : `das Konto ${vuoto}`),
}

// «the salon account» vuole il soggetto, le altre lingue il complemento.
const RUOLO_VUOTO: Record<Lingua, 'soggetto' | 'di'> = { it: 'di', en: 'soggetto', es: 'di', fr: 'di', de: 'di' }

export function emailEliminazione(nome: string, lingua: Lingua = 'it'): { oggetto: string; html: string } {
  const oggetto = OGGETTO[lingua]
  const corpo = CORPO[lingua](contoEliminato(lingua, nome))
  const html = `<!doctype html><html lang="${lingua}"><body style="background:#f4f7fb;font-family:sans-serif;color:#123">
<img src="https://groomlyapp.it/groomly-logo-email.png" alt="Groomly" width="180">
<h1 style="font-size:28px;color:#123">${oggetto}</h1>
<p>${corpo}</p>
</body></html>`
  return { oggetto, html }
}

function contoEliminato(lingua: Lingua, nome: string): string {
  const pulito = nome.trim()
  const salone = pulito ? saloneNellaFrase(lingua, pulito, 'di') : ''
  return CONTO[lingua](salone, saloneNellaFrase(lingua, '', RUOLO_VUOTO[lingua]))
}
