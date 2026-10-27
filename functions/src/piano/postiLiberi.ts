import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { calendarioPrenotabile, decisioneAntispam, fineOccupata } from '../../../src/lib/disponibilita'
import { salonPrenota } from './gatePrenotazione'

function dataDi(value: unknown): Date | null {
  if (value instanceof Date) return value
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

function voce(data: DocumentData): { inizio: Date; fine: Date; status: string; scadeIl?: Date } | null {
  const inizio = dataDi(data.start)
  const fine = dataDi(data.end)
  if (!inizio || !fine) return null
  const scadeIl = dataDi(data.scadeIl)
  return { inizio, fine, status: testo(data.status), ...(scadeIl ? { scadeIl } : {}) }
}

function durataUtile(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 60
  return Math.min(180, Math.max(15, Math.round(value)))
}

async function mappaLiberi(salonId: string, dal: string, quanti: number, durataMin: number): Promise<Record<string, string[]>> {
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
    appuntamenti: appuntamenti.docs.flatMap((doc) => {
      const letta = voce(doc.data())
      return letta ? [{ inizio: letta.inizio, fine: fineOccupata(letta.inizio, letta.fine), status: letta.status }] : []
    }),
    richieste: richieste.docs.flatMap((doc) => {
      const letta = voce(doc.data())
      return letta && letta.scadeIl
        ? [{ inizio: letta.inizio, fine: fineOccupata(letta.inizio, letta.fine), status: letta.status, scadeIl: letta.scadeIl }]
        : []
    }),
    adesso: new Date(),
  })
}

export async function postiLiberiPer(salonId: string, giorno: string, durataMin: number): Promise<{ orari: string[] }> {
  const giorni = await mappaLiberi(salonId, giorno, 1, durataMin)
  return { orari: giorni[giorno] ?? [] }
}

export async function calendarioLiberiPer(salonId: string, dal: string, quanti: number, durataMin: number): Promise<{ giorni: Record<string, string[]> }> {
  return { giorni: await mappaLiberi(salonId, dal, quanti, durataMin) }
}

export async function preparaRichiestaPer(input: { salonId: string; phone: string; esca: string }): Promise<{ ok: true }> {
  if (input.salonId === '' || input.salonId === 'shared' || input.salonId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(input.salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  const db = getFirestore()
  const aperte = await db.collection(`salons/${input.salonId}/richieste`).where('status', '==', 'nuova').get()
  const delTelefono = aperte.docs.filter((doc) => testo(doc.data().phone) === input.phone).length
  const decisione = decisioneAntispam({ aperteTelefono: delTelefono, aperteSalone: aperte.size, esca: input.esca })
  if (!decisione.ok) throw new HttpsError('resource-exhausted', decisione.message)
  if (!decisione.scrivi) return { ok: true }
  const scade = new Date(Date.now() + 48 * 60 * 60 * 1000)
  await db.collection(`salons/${input.salonId}/richieste`).add({
    status: 'nuova',
    phone: input.phone,
    scadeIl: scade.toISOString(),
    start: scade.toISOString(),
    end: scade.toISOString(),
  })
  return { ok: true }
}
