import type { Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { oraRoma } from '../../../src/lib/disponibilita'
import { htmlEsito } from '../../../src/lib/htmlEsito'
import { pianoRichiesta } from '../../../src/lib/pianoRichiesta'
import { linguaClientiSalon } from '../postaHtml'
import { animaleInArchivio, applicaPiano, idValido, leggiRichiesta, mailDopoScrittura, nomeSalone } from './gestisciPrenotazione'

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

async function inviaEsito(
  res: Response,
  salonId: string,
  tipo: 'conferma' | 'liberato' | 'non_valido',
  campi: { salone: string; cane: string; quando: string } = { salone: '', cane: '', quando: '' },
): Promise<void> {
  inviaPagina(res, htmlEsito({ lingua: await linguaPagina(salonId), tipo, ...campi }))
}

function parametro(req: Request, nome: string): string {
  const valore = req.query[nome]
  return typeof valore === 'string' ? valore : ''
}

function giornoRoma(data: Date): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' }).format(data)
}

export async function rispondiRichiestaHttp(req: Request, res: Response, apiKey: string): Promise<void> {
  // Gli anteprima dei programmi di posta fanno HEAD: non devono muovere niente.
  if (req.method !== 'GET') {
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
  const salone = await nomeSalone(salonId)
  const cane = richiesta.cane || richiesta.nome || ''
  const quando = Number.isNaN(inizio.getTime()) ? '' : `${giornoRoma(inizio)} alle ${oraRoma(inizio)}`
  await inviaEsito(res, salonId, 'conferma', { salone, cane, quando })
}
