import type { Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { escapaHtml, saloneNellaFrase } from '../../../src/i18n/emailHtml'
import type { Lingua } from '../../../src/i18n/lingua'
import { htmlDomandaRisposta, quandoConferma } from '../../../src/lib/htmlEsito'
import { pianoRichiesta } from '../../../src/lib/pianoRichiesta'
import { linguaClientiSalon } from '../postaHtml'
import { animaleInArchivio, applicaPiano, idValido, leggiRichiesta, linkRisposta, mailDopoScrittura, nomeSalone } from './gestisciPrenotazione'

async function linguaPagina(salonId: string): Promise<'it' | 'en' | 'es'> {
  if (!idValido(salonId)) return 'it'
  try {
    return await linguaClientiSalon(salonId)
  } catch {
    return 'it'
  }
}

function inviaPagina(res: Response, html: string): void {
  res.status(200).set('Cache-Control', 'no-store').set('Content-Type', 'text/html; charset=utf-8').send(html)
}

function luogoConferma(lingua: Lingua, nome: string): string {
  if (lingua === 'en') return nome.trim() ? `at ${saloneNellaFrase(lingua, nome, 'dopoDi')}` : saloneNellaFrase(lingua, '', 'dopoDi')
  if (lingua === 'es') return nome.trim() ? `en ${saloneNellaFrase(lingua, nome, 'dopoDi')}` : saloneNellaFrase(lingua, '', 'dopoDi')
  return nome.trim() ? `da ${saloneNellaFrase('it', nome, 'da')}` : saloneNellaFrase('it', '', 'da')
}

function fraseConferma(lingua: Lingua, cane: string, dove: string, quando: string): string {
  const animale = escapaHtml(cane.trim())
  const ora = escapaHtml(quando.trim())
  if (lingua === 'en') {
    const chi = animale ? `${animale}'s appointment` : 'The appointment'
    return `${chi} ${dove} is confirmed${ora ? ` for ${ora}` : ''}.`
  }
  if (lingua === 'es') {
    const chi = animale ? `La cita de ${animale}` : 'La cita'
    return `${chi} ${dove} está confirmada${ora ? ` para ${ora}` : ''}.`
  }
  const chi = animale ? `L’appuntamento di ${animale}` : 'L’appuntamento'
  return `${chi} ${dove} è confermato${ora ? ` per ${ora}` : ''}.`
}

const TITOLO_PAGINA = {
  confermato: { it: 'Appuntamento confermato', en: 'Appointment confirmed', es: 'Cita confirmada' },
  liberato: { it: 'Posto liberato', en: 'Slot released', es: 'Hueco liberado' },
  nonValido: { it: 'Link non più valido', en: 'This link is no longer valid', es: 'Este enlace ya no es válido' },
} as const

const RESTO_PAGINA = {
  liberato: {
    it: 'Va bene, il posto è stato liberato. Se vuoi un altro orario, puoi inviare una nuova richiesta al salone quando vuoi.',
    en: "No problem, the slot has been released. If you'd like a different time, you can send a new request to the salon whenever you like.",
    es: 'De acuerdo, el hueco ha quedado libre. Si quieres otro horario, puedes enviar una nueva solicitud a la peluquería cuando quieras.',
  },
  nonValido: {
    it: 'Potrebbe essere scaduto o già stato usato. Per qualsiasi cosa, contatta direttamente il salone.',
    en: 'It may have expired or already been used. For anything else, please contact the salon directly.',
    es: 'Puede que haya caducado o que ya se haya usado. Para cualquier cosa, contacta directamente con la peluquería.',
  },
} as const

const SPUNTA_PAGINA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style="display:block;margin:0 0 16px"><circle cx="24" cy="24" r="22" fill="none" stroke="#4A9FCB" stroke-width="2.5"/><path fill="none" stroke="#2C4560" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M14 25l6 6 14-14"/></svg>'

function htmlPaginaRisposta(lingua: Lingua, titolo: string, paragrafo: string, spunta: boolean): string {
  const segno = spunta ? SPUNTA_PAGINA : ''
  return `<!doctype html><html lang="${lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titolo}</title></head><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<main style="max-width:520px;margin:0 auto;padding:28px 12px"><p style="margin:0 0 18px;text-align:center"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:inline-block;border:0;width:200px;max-width:70%;height:auto"></p><div style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;overflow:hidden"><div style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB)"></div><div style="padding:32px 28px">${segno}<h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${titolo}.</h1><p style="margin:0;font-size:16px;line-height:1.5;color:#2C4560">${paragrafo}</p></div></div>
<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a97a6">Groomly · groomlyapp.it</p></main></body></html>`
}

export function paginaRisposta(
  lingua: Lingua,
  esito: 'confermato' | 'liberato' | 'nonValido',
  dati: { salone?: string; cane?: string; quando?: string },
): string {
  const codice: Lingua = lingua === 'en' || lingua === 'es' ? lingua : 'it'
  const tipo = esito === 'liberato' || esito === 'nonValido' ? esito : 'confermato'
  const titolo = TITOLO_PAGINA[tipo][codice]
  const paragrafo = tipo === 'confermato'
    ? introConferma(codice, fraseConferma(codice, dati.cane ?? '', luogoConferma(codice, dati.salone ?? ''), dati.quando ?? ''))
    : RESTO_PAGINA[tipo][codice]
  return htmlPaginaRisposta(codice, titolo, paragrafo, tipo === 'confermato')
}

function introConferma(lingua: Lingua, frase: string): string {
  if (lingua === 'en') return `Thank you! ${frase} We look forward to seeing you.`
  if (lingua === 'es') return `¡Gracias! ${frase} Te esperamos.`
  return `Grazie! ${frase} Ti aspettiamo.`
}

const TIPO_PAGINA = { conferma: 'confermato', liberato: 'liberato', non_valido: 'nonValido' } as const

async function inviaEsito(
  res: Response,
  salonId: string,
  tipo: 'conferma' | 'liberato' | 'non_valido',
  campi: { salone: string; cane: string; quando: string } = { salone: '', cane: '', quando: '' },
  lingua?: 'it' | 'en' | 'es',
): Promise<void> {
  inviaPagina(res, paginaRisposta(lingua ?? await linguaPagina(salonId), TIPO_PAGINA[tipo], campi))
}

function parametro(req: Request, nome: string): string {
  const valore = req.query[nome]
  return typeof valore === 'string' ? valore : ''
}

export async function rispondiRichiestaHttp(req: Request, res: Response, apiKey: string): Promise<void> {
  // HEAD e gli altri metodi non scrivono. La GET mostra solo il pulsante: i filtri della posta aprono il link da soli.
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(200).set('Cache-Control', 'no-store').end()
    return
  }
  const salonId = parametro(req, 'salonId')
  const id = parametro(req, 'id')
  const token = parametro(req, 'token')
  const azione = parametro(req, 'azione')
  if (!idValido(salonId) || !idValido(id) || (azione !== 'conferma' && azione !== 'rifiuta')) {
    await inviaEsito(res, salonId, 'liberato')
    return
  }
  if (req.method === 'GET') {
    if (token === '') {
      await inviaEsito(res, salonId, 'non_valido')
      return
    }
    const lingua = await linguaPagina(salonId)
    const scelta = azione === 'rifiuta' ? 'rifiuta' : 'conferma'
    inviaPagina(res, htmlDomandaRisposta({
      lingua,
      azione: scelta,
      azioneUrl: linkRisposta(salonId, id, token, scelta),
    }))
    return
  }
  const data = (await getFirestore().doc(`salons/${salonId}/richieste/${id}`).get()).data()
  const richiesta = data ? leggiRichiesta(data) : null
  if (!richiesta) {
    await inviaEsito(res, salonId, 'liberato')
    return
  }
  let animaleArchivio = false
  if (azione === 'conferma' && richiesta.sceltaAnimale && richiesta.sceltaAnimale !== 'nuovo') {
    const archivio = await animaleInArchivio(salonId, richiesta.sceltaAnimale)
    if (archivio === null) {
      await inviaEsito(res, salonId, 'liberato')
      return
    }
    animaleArchivio = archivio
  }
  const adesso = new Date()
  const piano = pianoRichiesta({
    richiesta,
    comando: { azione: azione === 'conferma' ? 'confermaCliente' : 'rifiutaCliente' },
    token,
    adesso,
    orarioLibero: false,
    animaleArchivio,
  })
  if (!piano.ok) {
    await inviaEsito(res, salonId, piano.errore === 'token' ? 'non_valido' : 'liberato')
    return
  }
  const scritto = await applicaPiano({ salonId, id, richiesta, piano, adesso })
  if (!scritto.ok) {
    await inviaEsito(res, salonId, 'liberato')
    return
  }
  await mailDopoScrittura({ apiKey, salonId, id, richiesta, piano }).catch(() => undefined)
  if (azione === 'rifiuta') {
    await inviaEsito(res, salonId, 'liberato')
    return
  }
  const visita = richiesta.appointmentId
    ? (await getFirestore().doc(`salons/${salonId}/appointments/${richiesta.appointmentId}`).get()).data()
    : undefined
  const inizio = new Date(typeof visita?.start === 'number' ? visita.start : richiesta.start)
  const lingua = await linguaPagina(salonId)
  const salone = await nomeSalone(salonId)
  const cane = richiesta.cane || richiesta.nome || ''
  const quando = quandoConferma(lingua, inizio)
  await inviaEsito(res, salonId, 'conferma', { salone, cane, quando }, lingua)
}
