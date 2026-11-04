import type { Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { htmlDomandaRisposta, paginaRisposta, quandoConferma } from '../../../src/lib/htmlEsito'
import { pianoRichiesta } from '../../../src/lib/pianoRichiesta'
import { linguaRichiesta } from '../postaHtml'
import { animaleInArchivio, applicaPiano, idValido, leggiRichiesta, linkRisposta, mailDopoScrittura, nomeSalone } from './gestisciPrenotazione'

/** Il `lang` del link, poi la lingua della richiesta (link vecchi), poi quella del salone. */
async function linguaPagina(salonId: string, id: string, lang: string): Promise<Lingua> {
  const scelta = linguaValida(lang)
  if (scelta) return scelta
  if (!idValido(salonId)) return 'it'
  try {
    const richiesta = idValido(id) ? (await getFirestore().doc(`salons/${salonId}/richieste/${id}`).get()).data() : undefined
    return await linguaRichiesta(salonId, richiesta ?? {})
  } catch {
    return 'it'
  }
}

function inviaPagina(res: Response, html: string): void {
  res.status(200).set('Cache-Control', 'no-store').set('Content-Type', 'text/html; charset=utf-8').send(html)
}

export { paginaRisposta }

const TIPO_PAGINA = { conferma: 'confermato', liberato: 'liberato', non_valido: 'nonValido' } as const

function inviaEsito(
  res: Response,
  lingua: Lingua,
  tipo: 'conferma' | 'liberato' | 'non_valido',
  campi: { salone: string; cane: string; quando: string } = { salone: '', cane: '', quando: '' },
): void {
  inviaPagina(res, paginaRisposta(lingua, TIPO_PAGINA[tipo], campi))
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
  const lingua = await linguaPagina(salonId, id, parametro(req, 'lang'))
  if (!idValido(salonId) || !idValido(id) || (azione !== 'conferma' && azione !== 'rifiuta')) {
    inviaEsito(res, lingua, 'liberato')
    return
  }
  if (req.method === 'GET') {
    if (token === '') {
      inviaEsito(res, lingua, 'non_valido')
      return
    }
    const scelta = azione === 'rifiuta' ? 'rifiuta' : 'conferma'
    inviaPagina(res, htmlDomandaRisposta({
      lingua,
      azione: scelta,
      azioneUrl: linkRisposta(salonId, id, token, scelta, lingua),
    }))
    return
  }
  const data = (await getFirestore().doc(`salons/${salonId}/richieste/${id}`).get()).data()
  const richiesta = data ? leggiRichiesta(data) : null
  if (!richiesta) {
    inviaEsito(res, lingua, 'liberato')
    return
  }
  let animaleArchivio = false
  if (azione === 'conferma' && richiesta.sceltaAnimale && richiesta.sceltaAnimale !== 'nuovo') {
    const archivio = await animaleInArchivio(salonId, richiesta.sceltaAnimale)
    if (archivio === null) {
      inviaEsito(res, lingua, 'liberato')
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
    inviaEsito(res, lingua, piano.errore === 'token' ? 'non_valido' : 'liberato')
    return
  }
  const scritto = await applicaPiano({ salonId, id, richiesta, piano, adesso })
  if (!scritto.ok) {
    inviaEsito(res, lingua, 'liberato')
    return
  }
  await mailDopoScrittura({ apiKey, salonId, id, richiesta, piano }).catch(() => undefined)
  if (azione === 'rifiuta') {
    inviaEsito(res, lingua, 'liberato')
    return
  }
  const visita = richiesta.appointmentId
    ? (await getFirestore().doc(`salons/${salonId}/appointments/${richiesta.appointmentId}`).get()).data()
    : undefined
  const inizio = new Date(typeof visita?.start === 'number' ? visita.start : richiesta.start)
  const salone = await nomeSalone(salonId)
  const cane = richiesta.cane || richiesta.nome || ''
  const quando = quandoConferma(lingua, inizio)
  inviaEsito(res, lingua, 'conferma', { salone, cane, quando })
}
