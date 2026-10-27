import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { decisioneAntispam, giornoRoma, orariLiberi } from '../../../src/lib/disponibilita'
import type { Fascia, Giorno, OrariSettimana } from '../../../src/lib/orari'
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

function fasceDelGiorno(orari: unknown, giorno: string): Fascia[] {
  if (!orari || typeof orari !== 'object') return []
  const indice = giornoRoma(giorno) as Giorno
  const fasce = (orari as OrariSettimana)[indice]
  return Array.isArray(fasce) ? fasce : []
}

function voce(data: DocumentData): { inizio: Date; fine: Date; status: string; scadeIl?: Date } | null {
  const inizio = dataDi(data.start)
  const fine = dataDi(data.end)
  if (!inizio || !fine) return null
  const scadeIl = dataDi(data.scadeIl)
  return { inizio, fine, status: testo(data.status), ...(scadeIl ? { scadeIl } : {}) }
}

export async function postiLiberiPer(salonId: string, giorno: string, durataMin: number): Promise<{ orari: string[] }> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/') || !/^\d{4}-\d{2}-\d{2}$/.test(giorno)) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  const db = getFirestore()
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
  const appuntamenti = await db.collection(`salons/${salonId}/appointments`).get()
  const richieste = await db.collection(`salons/${salonId}/richieste`).get()
  const adesso = new Date()
  return {
    orari: orariLiberi({
      giorno,
      fasce: fasceDelGiorno(settings.orari, giorno),
      passoMin: 60,
      durataMin,
      appuntamenti: appuntamenti.docs.flatMap((doc) => {
        const letta = voce(doc.data())
        return letta ? [{ inizio: letta.inizio, fine: letta.fine, status: letta.status }] : []
      }),
      richieste: richieste.docs.flatMap((doc) => {
        const letta = voce(doc.data())
        return letta && letta.scadeIl ? [{ inizio: letta.inizio, fine: letta.fine, status: letta.status, scadeIl: letta.scadeIl }] : []
      }),
      adesso,
    }),
  }
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
