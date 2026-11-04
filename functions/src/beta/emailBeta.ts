import { escapaHtml } from '../../../src/i18n/emailHtml'
import { LOCALE_INTL, type Lingua } from '../../../src/i18n/lingua'
import { postBrevoHtml } from '../brevoMail'

export type TipoEmailBeta = 'invito' | 'invito-ritirato' | 'revoca' | 'estensione' | 'fine-7' | 'fine-1'
export type DatiEmailBeta = { piano: 'pro' | 'salone'; giorni?: number | null; scadeIl?: string | null; testo?: string | null }
export type MailBeta = { oggetto: string; html: string }
export type Posta = (apiKey: string, to: string, oggetto: string, html: string) => Promise<unknown>

export const EMAIL_OPERATORE = 'info@groomlyapp.it'

export function dataBeta(lingua: Lingua, iso: string | null | undefined): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_INTL[lingua], { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric' }).format(data)
}

function nomePiano(piano: 'pro' | 'salone'): string {
  return piano === 'salone' ? 'Salon' : 'Plus'
}

const APRI: Record<Lingua, string> = {
  it: 'Apri Groomly sul telefono: trovi tutto negli Avvisi.',
  en: 'Open Groomly on your phone: you’ll find everything under Notices.',
  es: 'Abre Groomly en tu teléfono: lo encontrarás todo en Avisos.',
  fr: 'Ouvrez Groomly sur votre téléphone\u00a0: vous trouverez tout dans les Alertes.',
  de: 'Öffnen Sie Groomly auf Ihrem Telefon: Sie finden alles unter Hinweise.',
}

type Testi = (p: string, giorni: string, data: string) => { oggetto: string; titolo: string; corpo: string }

const TESTI: Record<TipoEmailBeta, Record<Lingua, Testi>> = {
  invito: {
    it: (p, g, d) => ({
      oggetto: `Sei invitato alla beta di Groomly ${p}`,
      titolo: `Prova ${p} gratis per ${g} giorni`,
      corpo: `Roberto di Groomly ti invita a provare le funzioni ${p} prima di tutti. Nessun pagamento, nessun rinnovo: in cambio ti chiediamo solo un feedback di 2 minuti. L’invito vale fino al ${d}.`,
    }),
    en: (p, g, d) => ({
      oggetto: `You’re invited to the Groomly ${p} beta`,
      titolo: `Try ${p} free for ${g} days`,
      corpo: `Roberto from Groomly invites you to try the ${p} features before anyone else. No payment, no renewal: all we ask in return is a 2-minute feedback. The invitation is valid until ${d}.`,
    }),
    es: (p, g, d) => ({
      oggetto: `Te invitamos a la beta de Groomly ${p}`,
      titolo: `Prueba ${p} gratis durante ${g} días`,
      corpo: `Roberto, de Groomly, te invita a probar las funciones ${p} antes que nadie. Sin pagos y sin renovación: a cambio solo te pedimos una opinión de 2 minutos. La invitación es válida hasta el ${d}.`,
    }),
    fr: (p, g, d) => ({
      oggetto: `Vous êtes invité à la bêta de Groomly ${p}`,
      titolo: `Essayez ${p} gratuitement pendant ${g} jours`,
      corpo: `Roberto, de Groomly, vous invite à essayer les fonctions ${p} avant tout le monde. Aucun paiement, aucun renouvellement\u00a0: en échange, nous vous demandons seulement un avis de 2 minutes. L’invitation est valable jusqu’au ${d}.`,
    }),
    de: (p, g, d) => ({
      oggetto: `Einladung zur Beta von Groomly ${p}`,
      titolo: `Testen Sie ${p} ${g} Tage kostenlos`,
      corpo: `Roberto von Groomly lädt Sie ein, die ${p}-Funktionen vor allen anderen zu testen. Keine Zahlung, keine Verlängerung: Im Gegenzug bitten wir Sie nur um 2 Minuten Feedback. Die Einladung gilt bis zum ${d}.`,
    }),
  },
  'invito-ritirato': {
    it: (p) => ({
      oggetto: `L’invito alla beta ${p} è stato ritirato`,
      titolo: 'Invito ritirato',
      corpo: `L’invito a provare ${p} non è più valido. Groomly resta com’era, con tutti i tuoi dati.`,
    }),
    en: (p) => ({
      oggetto: `Your ${p} beta invitation was withdrawn`,
      titolo: 'Invitation withdrawn',
      corpo: `The invitation to try ${p} is no longer valid. Groomly stays as it was, with all your data.`,
    }),
    es: (p) => ({
      oggetto: `Se ha retirado la invitación a la beta ${p}`,
      titolo: 'Invitación retirada',
      corpo: `La invitación para probar ${p} ya no es válida. Groomly sigue como estaba, con todos tus datos.`,
    }),
    fr: (p) => ({
      oggetto: `L’invitation à la bêta ${p} a été retirée`,
      titolo: 'Invitation retirée',
      corpo: `L’invitation à essayer ${p} n’est plus valable. Groomly reste comme avant, avec toutes vos données.`,
    }),
    de: (p) => ({
      oggetto: `Die Einladung zur ${p}-Beta wurde zurückgezogen`,
      titolo: 'Einladung zurückgezogen',
      corpo: `Die Einladung, ${p} zu testen, gilt nicht mehr. Groomly bleibt, wie es war, mit all Ihren Daten.`,
    }),
  },
  revoca: {
    it: (p) => ({
      oggetto: `La tua beta ${p} è stata chiusa`,
      titolo: 'Beta chiusa',
      corpo: `La beta ${p} è finita e Groomly torna al piano Go. I tuoi clienti, gli animali e gli appuntamenti restano tutti. Grazie per averla provata.`,
    }),
    en: (p) => ({
      oggetto: `Your ${p} beta has been closed`,
      titolo: 'Beta closed',
      corpo: `The ${p} beta has ended and Groomly goes back to the Go plan. Your clients, pets and appointments all stay. Thank you for trying it.`,
    }),
    es: (p) => ({
      oggetto: `Tu beta ${p} se ha cerrado`,
      titolo: 'Beta cerrada',
      corpo: `La beta ${p} ha terminado y Groomly vuelve al plan Go. Tus clientes, animales y citas se quedan todos. Gracias por probarla.`,
    }),
    fr: (p) => ({
      oggetto: `Votre bêta ${p} a été clôturée`,
      titolo: 'Bêta clôturée',
      corpo: `La bêta ${p} est terminée et Groomly repasse à la formule Go. Vos clients, animaux et rendez-vous restent tous là. Merci de l’avoir essayée.`,
    }),
    de: (p) => ({
      oggetto: `Ihre ${p}-Beta wurde beendet`,
      titolo: 'Beta beendet',
      corpo: `Die ${p}-Beta ist beendet und Groomly wechselt zurück zum Tarif Go. Ihre Kunden, Tiere und Termine bleiben alle erhalten. Vielen Dank fürs Testen.`,
    }),
  },
  estensione: {
    it: (p, g, d) => ({
      oggetto: `La tua beta ${p} dura di più`,
      titolo: `${g} giorni in più di ${p}`,
      corpo: `Buone notizie: la tua beta ${p} è stata allungata. Ora finisce il ${d}. Sempre gratis, sempre senza rinnovo.`,
    }),
    en: (p, g, d) => ({
      oggetto: `Your ${p} beta lasts longer`,
      titolo: `${g} more days of ${p}`,
      corpo: `Good news: your ${p} beta has been extended. It now ends on ${d}. Still free, still with no renewal.`,
    }),
    es: (p, g, d) => ({
      oggetto: `Tu beta ${p} dura más`,
      titolo: `${g} días más de ${p}`,
      corpo: `Buenas noticias: tu beta ${p} se ha ampliado. Ahora termina el ${d}. Sigue siendo gratis y sin renovación.`,
    }),
    fr: (p, g, d) => ({
      oggetto: `Votre bêta ${p} dure plus longtemps`,
      titolo: `${g} jours de plus avec ${p}`,
      corpo: `Bonne nouvelle\u00a0: votre bêta ${p} a été prolongée. Elle se termine maintenant le ${d}. Toujours gratuite, toujours sans renouvellement.`,
    }),
    de: (p, g, d) => ({
      oggetto: `Ihre ${p}-Beta dauert länger`,
      titolo: `${g} Tage mehr ${p}`,
      corpo: `Gute Nachrichten: Ihre ${p}-Beta wurde verlängert. Sie endet jetzt am ${d}. Weiterhin kostenlos und ohne Verlängerung.`,
    }),
  },
  'fine-7': {
    it: (p, _g, d) => ({
      oggetto: `La tua beta ${p} finisce il ${d}`,
      titolo: 'Ancora una settimana di beta',
      corpo: `La tua beta ${p} finisce il ${d}. Se hai 2 minuti, raccontaci com’è andata: il tuo parere ci aiuta a decidere funzioni e prezzi. Poi torni a Go con tutti i tuoi dati.`,
    }),
    en: (p, _g, d) => ({
      oggetto: `Your ${p} beta ends on ${d}`,
      titolo: 'One more week of beta',
      corpo: `Your ${p} beta ends on ${d}. If you have 2 minutes, tell us how it went: your feedback helps us decide features and prices. Then you go back to Go with all your data.`,
    }),
    es: (p, _g, d) => ({
      oggetto: `Tu beta ${p} termina el ${d}`,
      titolo: 'Una semana más de beta',
      corpo: `Tu beta ${p} termina el ${d}. Si tienes 2 minutos, cuéntanos qué tal: tu opinión nos ayuda a decidir funciones y precios. Después vuelves a Go con todos tus datos.`,
    }),
    fr: (p, _g, d) => ({
      oggetto: `Votre bêta ${p} se termine le ${d}`,
      titolo: 'Encore une semaine de bêta',
      corpo: `Votre bêta ${p} se termine le ${d}. Si vous avez 2 minutes, dites-nous comment ça s’est passé\u00a0: votre avis nous aide à décider des fonctions et des prix. Ensuite, vous repassez à Go avec toutes vos données.`,
    }),
    de: (p, _g, d) => ({
      oggetto: `Ihre ${p}-Beta endet am ${d}`,
      titolo: 'Noch eine Woche Beta',
      corpo: `Ihre ${p}-Beta endet am ${d}. Wenn Sie 2 Minuten haben, erzählen Sie uns, wie es war: Ihr Feedback hilft uns bei Funktionen und Preisen. Danach wechseln Sie mit all Ihren Daten zurück zu Go.`,
    }),
  },
  'fine-1': {
    it: (p, _g, d) => ({
      oggetto: `La tua beta ${p} finisce domani`,
      titolo: 'Ultimo giorno di beta',
      corpo: `La tua beta ${p} finisce il ${d}. Poi torni a Go: i tuoi clienti, gli animali e gli appuntamenti restano tutti. Ci dici se vorresti continuare con ${p}?`,
    }),
    en: (p, _g, d) => ({
      oggetto: `Your ${p} beta ends tomorrow`,
      titolo: 'Last day of beta',
      corpo: `Your ${p} beta ends on ${d}. Then you go back to Go: your clients, pets and appointments all stay. Would you like to keep ${p}? Let us know.`,
    }),
    es: (p, _g, d) => ({
      oggetto: `Tu beta ${p} termina mañana`,
      titolo: 'Último día de beta',
      corpo: `Tu beta ${p} termina el ${d}. Después vuelves a Go: tus clientes, animales y citas se quedan todos. ¿Nos dices si te gustaría seguir con ${p}?`,
    }),
    fr: (p, _g, d) => ({
      oggetto: `Votre bêta ${p} se termine demain`,
      titolo: 'Dernier jour de bêta',
      corpo: `Votre bêta ${p} se termine le ${d}. Ensuite, vous repassez à Go\u00a0: vos clients, animaux et rendez-vous restent tous là. Souhaitez-vous continuer avec ${p}\u00a0? Dites-le-nous.`,
    }),
    de: (p, _g, d) => ({
      oggetto: `Ihre ${p}-Beta endet morgen`,
      titolo: 'Letzter Tag der Beta',
      corpo: `Ihre ${p}-Beta endet am ${d}. Danach wechseln Sie zurück zu Go: Ihre Kunden, Tiere und Termine bleiben alle erhalten. Möchten Sie mit ${p} weitermachen? Sagen Sie es uns.`,
    }),
  },
}

function cornice(lingua: Lingua, titolo: string, corpo: string, citazione: string, nota: string): string {
  return `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 18px"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:block;border:0;width:200px;max-width:70%;height:auto"></td></tr>
<tr><td style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 0"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${titolo}</h1>
<p style="margin:0;font-size:16px;line-height:1.5;color:#4b5a6b">${corpo}</p>${citazione}</td></tr>
<tr><td style="padding:18px 28px 28px"><p style="margin:0;font-size:14px;line-height:1.5;color:#6B7A8C">${nota}</p></td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 12px 0;font-size:12px;line-height:1.5;color:#8a97a6">Groomly · groomlyapp.it</td></tr>
</table></td></tr></table>
</body></html>`
}

export function emailBeta(lingua: Lingua, tipo: TipoEmailBeta, dati: DatiEmailBeta): MailBeta {
  const testi = TESTI[tipo][lingua](nomePiano(dati.piano), String(dati.giorni ?? ''), dataBeta(lingua, dati.scadeIl))
  const messaggio = (dati.testo ?? '').trim()
  const citazione = messaggio
    ? `<blockquote style="margin:16px 0 0;padding:12px 16px;border-left:4px solid #8ADBD9;background:#f4f8fb;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(messaggio).replaceAll('\n', '<br>')}</blockquote>`
    : ''
  return { oggetto: testi.oggetto, html: cornice(lingua, escapaHtml(testi.titolo), escapaHtml(testi.corpo), citazione, APRI[lingua]) }
}

/** Email semplice per Roberto (rifiuti e feedback), come quella dei Suggerimenti. */
/** Riga del feedback per Roberto: le email all'operatore restano in italiano. */
export function rigaFeedbackOperatore(ricontatto: boolean, fineBeta: boolean, versioneApp: string): string {
  return `Ricontatto: ${ricontatto ? 'sì' : 'no'} · fine beta: ${fineBeta ? 'sì' : 'no'} · app ${versioneApp}`
}

export function emailOperatore(tipo: 'rifiuto' | 'feedback', righe: string[]): MailBeta {
  const oggetto = tipo === 'feedback' ? 'Feedback beta Groomly' : 'Invito beta rifiutato'
  return { oggetto, html: righe.map((riga) => `<p>${escapaHtml(riga).replaceAll('\n', '<br>')}</p>`).join('') }
}

export async function inviaEmail(apiKey: string, to: string, mail: MailBeta, posta: Posta = postBrevoHtml): Promise<'inviata' | 'non_inviata'> {
  if (apiKey === '' || to === '') return 'non_inviata'
  try {
    await posta(apiKey, to, mail.oggetto, mail.html)
    return 'inviata'
  } catch {
    return 'non_inviata'
  }
}
