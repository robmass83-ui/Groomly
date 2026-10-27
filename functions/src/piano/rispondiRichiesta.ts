import type { Request, Response } from 'express'
import { getFirestore } from 'firebase-admin/firestore'
import { oraRoma } from '../../../src/lib/disponibilita'
import { pianoRichiesta } from '../../../src/lib/pianoRichiesta'
import { animaleInArchivio, applicaPiano, idValido, leggiRichiesta, mailDopoScrittura, nomeSalone } from './gestisciPrenotazione'

function esc(valore: string): string {
  return valore.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function pagina(titolo: string, righe: string[]): string {
  const corpo = righe.map((riga) => `<p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#4b5a6b">${esc(riga)}</p>`).join('')
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titolo)}</title></head><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<main style="max-width:520px;margin:0 auto;padding:28px 12px"><div style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;padding:32px 28px"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${esc(titolo)}</h1>${corpo}</div>
<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a97a6">Groomly · groomlyapp.it</p></main></body></html>`
}

function paginaLiberato(): string {
  return pagina('Posto liberato', ['Il posto è libero. Se vuoi un altro orario, scrivi di nuovo al salone.'])
}

function paginaNonValido(): string {
  return pagina('Link non valido', ['Questo link non è valido.'])
}

function inviaPagina(res: Response, html: string): void {
  res.status(200).set('Cache-Control', 'no-store').set('Content-Type', 'text/html; charset=utf-8').send(html)
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
    inviaPagina(res, paginaLiberato())
    return
  }
  const data = (await getFirestore().doc(`salons/${salonId}/richieste/${id}`).get()).data()
  const richiesta = data ? leggiRichiesta(data) : null
  if (!richiesta) {
    inviaPagina(res, paginaLiberato())
    return
  }
  let animaleArchivio = false
  if (azione === 'conferma' && richiesta.sceltaAnimale && richiesta.sceltaAnimale !== 'nuovo') {
    const archivio = await animaleInArchivio(salonId, richiesta.sceltaAnimale)
    if (archivio === null) {
      inviaPagina(res, paginaLiberato())
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
    inviaPagina(res, piano.errore === 'token' ? paginaNonValido() : paginaLiberato())
    return
  }
  const scritto = await applicaPiano({ salonId, id, richiesta, piano, adesso })
  if (!scritto.ok) {
    inviaPagina(res, paginaLiberato())
    return
  }
  await mailDopoScrittura({ apiKey, salonId, id, richiesta, piano }).catch(() => undefined)
  if (azione === 'rifiuta') {
    inviaPagina(res, paginaLiberato())
    return
  }
  const visita = richiesta.appointmentId
    ? (await getFirestore().doc(`salons/${salonId}/appointments/${richiesta.appointmentId}`).get()).data()
    : undefined
  const inizio = new Date(typeof visita?.start === 'number' ? visita.start : richiesta.start)
  const salone = await nomeSalone(salonId)
  const righe = [
    salone || 'Il salone',
    richiesta.cane || richiesta.nome,
    Number.isNaN(inizio.getTime()) ? '' : `${giornoRoma(inizio)} alle ${oraRoma(inizio)}`,
  ].filter((riga) => riga !== '')
  inviaPagina(res, pagina('Appuntamento confermato', righe))
}
