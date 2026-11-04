import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import {
  CHIAVE_SDK_MAX,
  dataIsoValida,
  LINGUE_OFFERTA,
  leggiConfigPiani,
  OFFERING_ID_MAX,
  OFFERTA_MAX,
  type ConfigPiani,
} from '../../../src/lib/configPiani'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'

const CAMPI = new Set(['provaSelfService', 'showPrezziInBeta', 'offertaEarlyAdopter', 'revenueCat', 'annuncioPagamentiIl'])

function nonValido(): never {
  throw new HttpsError('invalid-argument', 'Impostazione non valida')
}

function mappa(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) nonValido()
  return value as Record<string, unknown>
}

function testo(value: unknown, max: number, vuotoOk = true): string {
  if (typeof value !== 'string') nonValido()
  const pulito = value.trim()
  if (pulito.length > max || (!vuotoOk && pulito === '')) nonValido()
  return pulito
}

/** Applica le modifiche alla config attuale; qualunque campo non valido rifiuta tutto. */
export function configPianiDopo(attuale: ConfigPiani, modifiche: unknown): ConfigPiani {
  const m = mappa(modifiche)
  const chiavi = Object.keys(m)
  if (chiavi.length === 0 || chiavi.some((chiave) => !CAMPI.has(chiave))) nonValido()
  const dopo: ConfigPiani = {
    ...attuale,
    offertaEarlyAdopter: { ...attuale.offertaEarlyAdopter },
    revenueCat: { ...attuale.revenueCat },
  }
  for (const flag of ['provaSelfService', 'showPrezziInBeta'] as const) {
    if (!(flag in m)) continue
    if (typeof m[flag] !== 'boolean') nonValido()
    dopo[flag] = m[flag] as boolean
  }
  if ('offertaEarlyAdopter' in m) {
    const offerta = mappa(m.offertaEarlyAdopter)
    for (const [lingua, valore] of Object.entries(offerta)) {
      if (!LINGUE_OFFERTA.includes(lingua as never)) nonValido()
      dopo.offertaEarlyAdopter[lingua as keyof ConfigPiani['offertaEarlyAdopter']] = testo(valore, OFFERTA_MAX)
    }
  }
  if ('revenueCat' in m) {
    const rc = mappa(m.revenueCat)
    for (const [campo, valore] of Object.entries(rc)) {
      if (campo === 'chiaveSdk') dopo.revenueCat.chiaveSdk = testo(valore, CHIAVE_SDK_MAX)
      else if (campo === 'offeringId') dopo.revenueCat.offeringId = testo(valore, OFFERING_ID_MAX, false)
      else nonValido()
    }
  }
  if ('annuncioPagamentiIl' in m) {
    const data = m.annuncioPagamentiIl
    if (data !== null && !dataIsoValida(data)) nonValido()
    dopo.annuncioPagamentiIl = data as string | null
  }
  return dopo
}

export async function impostaConfigPianiPer(input: {
  operatorEmail: string
  emailVerified?: boolean
  admin?: boolean
  modifiche: unknown
}): Promise<{ ok: true; piani: ConfigPiani }> {
  if (!operatoreAutorizzato({ email: input.operatorEmail, emailVerified: input.emailVerified, admin: input.admin })) {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  const db = getFirestore()
  const ref = db.doc('config/globale')
  const piani = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const dopo = configPianiDopo(leggiConfigPiani(snap.data()), input.modifiche)
    tx.set(ref, { piani: dopo }, { merge: true })
    return dopo
  })
  return { ok: true, piani }
}
