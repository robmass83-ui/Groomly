import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { appointmentEnd, sumDuration } from '../../../src/lib/appointments'
import { calendarioPrenotabile, fineOccupata, intervalloLibero } from '../../../src/lib/disponibilita'
import { salonPrenota } from './gatePrenotazione'

export function dataDi(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'number') return Number.isFinite(value) ? new Date(value) : null
  if (typeof value === 'string') {
    const data = new Date(value)
    return Number.isNaN(data.getTime()) ? null : data
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function minutiServizi(value: unknown): number {
  if (!Array.isArray(value)) return 0
  const durate = value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const durata = (item as { durationMin?: unknown }).durationMin
    return typeof durata === 'number' && Number.isFinite(durata) && durata > 0 ? [durata] : []
  })
  return sumDuration(durate.map((durationMin) => ({ durationMin })))
}

function voce(data: DocumentData): { inizio: Date; fine: Date; status: string; scadeIl?: Date } | null {
  const inizio = dataDi(data.start)
  if (!inizio) return null
  const esplicita = dataDi(data.end)
  const minuti = minutiServizi(data.services)
  const fine = esplicita ?? (minuti > 0 ? appointmentEnd(inizio, [{ durationMin: minuti }]) : null)
  if (!fine) return null
  const scadeIl = dataDi(data.scadeIl)
  return { inizio, fine, status: testo(data.status), ...(scadeIl ? { scadeIl } : {}) }
}

// Una «nuova» tiene l'ora anche senza scadenza. Proposta, accettata e rifiutata no: la visita, se c'è, occupa da sola.
export function richiestaOccupata(data: DocumentData): { inizio: Date; fine: Date; status: string; scadeIl?: Date }[] {
  if (testo(data.status) !== 'nuova') return []
  const inizio = dataDi(data.start)
  if (!inizio) return []
  const esplicita = dataDi(data.end)
  const minutiCampo = typeof data.durataMin === 'number' && Number.isFinite(data.durataMin) && data.durataMin > 0 ? data.durataMin : 0
  const minuti = minutiServizi(data.services) || minutiCampo
  const fine = esplicita ?? (minuti > 0 ? appointmentEnd(inizio, [{ durationMin: minuti }]) : null)
  if (!fine) return []
  const scadeIl = dataDi(data.scadeIl)
  return [{
    inizio,
    fine: fineOccupata(inizio, fine),
    status: 'nuova',
    ...(scadeIl ? { scadeIl } : {}),
  }]
}

// Le visite dell'app hanno start in millisecondi. Se la fine manca, si ricava dai servizi: le visite già salvate occupano lo stesso l'ora.
export function appuntamentoOccupato(data: DocumentData): { inizio: Date; fine: Date; status: string; provvisorio: boolean; scadeIl?: Date }[] {
  const letta = voce(data)
  return letta
    ? [{
        inizio: letta.inizio,
        fine: fineOccupata(letta.inizio, letta.fine),
        status: letta.status,
        provvisorio: data.provvisorio === true,
        ...(letta.scadeIl ? { scadeIl: letta.scadeIl } : {}),
      }]
    : []
}

function durataUtile(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 60
  return Math.min(180, Math.max(15, Math.round(value)))
}

export function intervalloAncoraLibero(input: {
  inizio: Date
  fine: Date
  adesso: Date
  appuntamenti: readonly DocumentData[]
  richieste: readonly { id: string; data: DocumentData }[]
  esclusa?: string
}): boolean {
  return intervalloLibero(
    input.inizio,
    input.fine,
    input.adesso,
    input.appuntamenti.flatMap((data) => appuntamentoOccupato(data)),
    input.richieste.flatMap((doc) => (doc.id === input.esclusa ? [] : richiestaOccupata(doc.data))),
  )
}

async function mappaLiberi(salonId: string, dal: string, quanti: number, durataMin: number, esclusa = ''): Promise<Record<string, string[]>> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/') || !/^\d{4}-\d{2}-\d{2}$/.test(dal)) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  const db = getFirestore()
  const [settingsSnap, appuntamenti, richieste, chiusure] = await Promise.all([
    db.doc(`salons/${salonId}/settings/main`).get(),
    db.collection(`salons/${salonId}/appointments`).get(),
    db.collection(`salons/${salonId}/richieste`).get(),
    db.collection(`salons/${salonId}/closures`).get(),
  ])
  const settings = settingsSnap.data() ?? {}
  return calendarioPrenotabile({
    dal,
    quanti,
    orari: settings.orari,
    chiusure: chiusure.docs.flatMap((doc) => {
      const data = doc.data()
      const startDay = testo(data.startDay)
      const endDay = testo(data.endDay)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !/^\d{4}-\d{2}-\d{2}$/.test(endDay) || startDay > endDay) return []
      return [{ startDay, endDay }]
    }),
    passoMin: 60,
    durataMin: durataUtile(durataMin),
    appuntamenti: appuntamenti.docs.flatMap((doc) => appuntamentoOccupato(doc.data())),
    richieste: richieste.docs.flatMap((doc) => (doc.id === esclusa ? [] : richiestaOccupata(doc.data()))),
    adesso: new Date(),
  })
}

export async function postiLiberiPer(salonId: string, giorno: string, durataMin: number, esclusa = ''): Promise<{ orari: string[] }> {
  const giorni = await mappaLiberi(salonId, giorno, 1, durataMin, esclusa)
  return { orari: giorni[giorno] ?? [] }
}

export async function calendarioLiberiPer(salonId: string, dal: string, quanti: number, durataMin: number): Promise<{ giorni: Record<string, string[]> }> {
  return { giorni: await mappaLiberi(salonId, dal, quanti, durataMin) }
}

export async function preparaRichiestaPer(_input: { salonId: string; phone: string; esca: string }): Promise<{ ok: true }> {
  throw new HttpsError('failed-precondition', 'Richiesta non valida')
}
