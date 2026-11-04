import { createHash } from 'node:crypto'
import type { Firestore, Transaction } from 'firebase-admin/firestore'
import { isStaffRole, type StaffRole, type StatoInvito } from '../../../src/lib/salonAccess'
import { normalizeEmail, salonCollection } from '../../../src/lib/salonPath'
import { removeOneOpenInviteExpiry } from '../salonInvite'
import { messaggioServer } from '../erroriServer'

type Chi = { uid: string; email: string }
type Esito = { ok: true } | { ok: false; message: string }

const TOKEN_VALIDO = /^[0-9a-f]{64}$/
const NON_VALIDO = { ok: false, message: messaggioServer('invito_non_valido') } as const
const NEGATO = { ok: false, message: messaggioServer('accesso_negato') } as const
const NON_IN_SOSPESO = { ok: false, message: messaggioServer('invito_non_in_sospeso') } as const

function percorso(uid: string, ...parti: string[]): string {
  return [...salonCollection(uid), ...parti].join('/')
}

/** Identificativo pubblico di un invito: non rivela il token, che è il segreto del link. */
export function idInvito(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

type DatiInvito = { salonId: string; email: string; role: StaffRole; scadeMs: number; expiresAt: string; status: string; usedBy: string }

function leggiDati(dati: Record<string, unknown> | undefined): DatiInvito | null {
  if (!dati) return null
  const { salonId, email, role, expiresAt, status, usedBy } = dati
  if (typeof salonId !== 'string' || salonId === '' || salonId.includes('/')) return null
  if (typeof email !== 'string' || typeof status !== 'string' || typeof expiresAt !== 'string') return null
  if (typeof role !== 'string' || !isStaffRole(role)) return null
  return {
    salonId,
    email,
    role,
    expiresAt,
    status,
    scadeMs: Date.parse(expiresAt),
    usedBy: typeof usedBy === 'string' ? usedBy : '',
  }
}

function aperto(invito: DatiInvito, adesso: Date): boolean {
  return invito.status === 'aperto' && invito.scadeMs > adesso.getTime()
}

function stessaEmail(invito: DatiInvito, chi: Chi): boolean {
  return normalizeEmail(invito.email) === normalizeEmail(chi.email)
}

/** Com'è l'invito per chi lo apre: nulla sul salone se non è il suo. */
export async function leggiInvitoPer(
  db: Firestore,
  chi: Chi,
  token: string,
  adesso: Date = new Date(),
): Promise<{ stato: StatoInvito; salone: string; ruolo: StaffRole | null }> {
  const vuoto = (stato: StatoInvito) => ({ stato, salone: '', ruolo: null })
  if (!TOKEN_VALIDO.test(token)) return vuoto('non-valido')
  const invito = leggiDati((await db.doc(`invites/${token}`).get()).data())
  if (!invito) return vuoto('non-valido')
  const mio = invito.status === 'usato' && invito.usedBy !== '' && invito.usedBy === chi.uid
  if (!mio) {
    if (invito.status !== 'aperto') return vuoto('non-valido')
    if (!stessaEmail(invito, chi)) return vuoto('altra-email')
  }
  const settings = (await db.doc(percorso(invito.salonId, 'settings', 'main')).get()).data()
  const business = settings?.business as { salonName?: unknown } | undefined
  const salone = typeof business?.salonName === 'string' ? business.salonName : ''
  const stato: StatoInvito = mio ? 'gia-tuo' : invito.scadeMs > adesso.getTime() ? 'aperto' : 'scaduto'
  return { stato, salone, ruolo: invito.role }
}

/** Toglie una scadenza da `pro/main.openInviteExpiries` (solo scritture: le letture sono già fatte). */
function liberaPosto(tx: Transaction, db: Firestore, salonId: string, scadenze: unknown, expiresAt: string): void {
  const resto = removeOneOpenInviteExpiry(scadenze, expiresAt)
  if (resto) tx.set(db.doc(percorso(salonId, 'pro', 'main')), { openInviteExpiries: resto }, { merge: true })
}

/** Chi riceve l'invito dice di no: l'invito si chiude e il posto si libera. */
export async function rifiutaInvitoPer(db: Firestore, chi: Chi, token: string, adesso: Date = new Date()): Promise<Esito> {
  if (!TOKEN_VALIDO.test(token)) return NON_VALIDO
  return db.runTransaction(async (tx) => {
    const inviteRef = db.doc(`invites/${token}`)
    const invito = leggiDati((await tx.get(inviteRef)).data())
    if (!invito || !aperto(invito, adesso) || !stessaEmail(invito, chi)) return NON_VALIDO
    const pro = await tx.get(db.doc(percorso(invito.salonId, 'pro', 'main')))
    tx.set(inviteRef, { status: 'rifiutato', rifiutatoIl: adesso.toISOString() }, { merge: true })
    liberaPosto(tx, db, invito.salonId, pro.get('openInviteExpiries'), invito.expiresAt)
    return { ok: true } as const
  })
}

/** Il salone di chi può gestire il team (titolare o socio), altrimenti null. */
async function salonePerGestione(db: Firestore, uid: string): Promise<string | null> {
  if (uid === '' || uid.includes('/')) return null
  const dati = (await db.doc(`accounts/${uid}`).get()).data()
  const salonId = typeof dati?.salonId === 'string' ? dati.salonId : ''
  if (salonId === '' || salonId.includes('/')) return null
  const ruolo = dati?.role
  if (ruolo !== undefined && ruolo !== 'titolare' && ruolo !== 'socio') return null
  return salonId
}

export type InvitoInSospeso = { id: string; email: string; ruolo: StaffRole; scade: string }

/** Gli inviti ancora aperti del salone, per chi lo gestisce. */
export async function invitiInSospesoPer(
  db: Firestore,
  uid: string,
  adesso: Date = new Date(),
): Promise<{ ok: true; inviti: InvitoInSospeso[] } | { ok: false; message: string }> {
  const salonId = await salonePerGestione(db, uid)
  if (!salonId) return NEGATO
  const snap = await db.collection('invites').where('salonId', '==', salonId).get()
  const inviti: InvitoInSospeso[] = []
  for (const doc of snap.docs) {
    const invito = leggiDati(doc.data())
    if (invito && aperto(invito, adesso)) {
      inviti.push({ id: idInvito(doc.id), email: invito.email, ruolo: invito.role, scade: invito.expiresAt })
    }
  }
  inviti.sort((a, b) => Date.parse(a.scade) - Date.parse(b.scade))
  return { ok: true, inviti }
}

/** Il titolare o il socio ritira un invito ancora aperto: il documento sparisce e il posto si libera. */
export async function annullaInvitoPer(db: Firestore, uid: string, id: string, adesso: Date = new Date()): Promise<Esito> {
  void adesso
  const salonId = await salonePerGestione(db, uid)
  if (!salonId) return NEGATO
  const snap = await db.collection('invites').where('salonId', '==', salonId).get()
  const trovato = snap.docs.find((doc) => idInvito(doc.id) === id)
  if (!trovato) return NON_IN_SOSPESO
  return db.runTransaction(async (tx) => {
    const inviteRef = db.doc(`invites/${trovato.id}`)
    const invito = leggiDati((await tx.get(inviteRef)).data())
    if (!invito || invito.salonId !== salonId || invito.status !== 'aperto') return NON_IN_SOSPESO
    const pro = await tx.get(db.doc(percorso(salonId, 'pro', 'main')))
    tx.delete(inviteRef)
    liberaPosto(tx, db, salonId, pro.get('openInviteExpiries'), invito.expiresAt)
    return { ok: true } as const
  })
}

/** Lascia a chi esce dal team un avviso da mostrare al prossimo accesso. */
export function scriviAvvisoUscita(tx: Transaction, db: Firestore, uid: string, salone: string, adesso: Date): void {
  tx.set(db.doc(percorso(uid, 'avvisi', 'uscita')), { salone, quando: adesso.toISOString(), letto: false })
}

/** L'avviso d'uscita è stato visto. */
export async function segnaAvvisoUscitaPer(db: Firestore, uid: string): Promise<void> {
  await db.doc(percorso(uid, 'avvisi', 'uscita')).set({ letto: true }, { merge: true })
}
