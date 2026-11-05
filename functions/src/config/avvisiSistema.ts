import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { TESTO_MAX, TIPI_AVVISO, TITOLO_MAX, type TipoAvviso } from '../../../src/lib/avvisiSistema'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { controllaAccessoRecente } from '../accessoRecente'
import { erroreServer } from '../erroriServer'
import { avvisiRateDecision } from '../rateLimit'

type Avviso = { tipo: TipoAvviso; titolo: string; testo: string }

function avvisoValido(dati: unknown): Avviso {
  const { tipo, titolo, testo } = (dati && typeof dati === 'object' ? dati : {}) as Record<string, unknown>
  const pulito = { titolo: typeof titolo === 'string' ? titolo.trim() : '', testo: typeof testo === 'string' ? testo.trim() : null }
  if (!TIPI_AVVISO.includes(tipo as TipoAvviso) || pulito.titolo === '' || pulito.titolo.length > TITOLO_MAX || pulito.testo === null || pulito.testo.length > TESTO_MAX) {
    throw erroreServer('invalid-argument', 'richiesta_non_valida')
  }
  return { tipo: tipo as TipoAvviso, titolo: pulito.titolo, testo: pulito.testo }
}

function richiediAdmin(admin: boolean | undefined): void {
  if (!operatoreAutorizzato({ admin })) throw erroreServer('failed-precondition', 'accesso_negato')
}

export async function pubblicaAvvisoSistemaPer(input: {
  admin?: boolean
  authTime: unknown
  dati: unknown
  consentito: () => Promise<boolean>
  scrivi: (avviso: Avviso) => Promise<void>
  adesso?: number
}): Promise<{ ok: true }> {
  richiediAdmin(input.admin)
  controllaAccessoRecente(input.authTime, input.adesso)
  const avviso = avvisoValido(input.dati)
  if (!await input.consentito()) throw erroreServer('resource-exhausted', 'troppe_richieste')
  await input.scrivi(avviso)
  return { ok: true }
}

export async function eliminaAvvisoSistemaPer(input: {
  admin?: boolean
  id: string
  cancella: (id: string) => Promise<void>
}): Promise<{ ok: true }> {
  richiediAdmin(input.admin)
  if (input.id === '' || input.id.includes('/')) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  await input.cancella(input.id)
  return { ok: true }
}

/** Al massimo 10 avvisi all'ora per admin. */
export async function riservaAvviso(uid: string, db: Firestore = getFirestore(), adesso = Date.now()): Promise<boolean> {
  const ref = db.doc(`avvisiLimiti/${uid}`)
  return db.runTransaction(async (tx) => {
    const decisione = avvisiRateDecision((await tx.get(ref)).get('hits'), adesso)
    if (decisione.ok) tx.set(ref, { hits: decisione.next })
    return decisione.ok
  })
}

export async function scriviAvviso(avviso: Avviso, db: Firestore = getFirestore()): Promise<void> {
  await db.collection('avvisiSistema').add({ ...avviso, creato: FieldValue.serverTimestamp() })
}

export async function cancellaAvviso(id: string, db: Firestore = getFirestore()): Promise<void> {
  await db.doc(`avvisiSistema/${id}`).delete()
}
