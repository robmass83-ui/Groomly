import { getFirestore } from 'firebase-admin/firestore'
import { PAGHERESTI, type Pagheresti } from '../../../src/lib/betaFeedback'
import { STATI_INVITO_BETA, invitoBetaDi, type StatoInvitoBeta } from '../../../src/lib/betaInvito'
import { livelloElenco, type LivelloElenco } from '../../../src/lib/funzioniPiano'
import { FONTI_PIANO, statoPiano, type FontePiano } from '../../../src/lib/piano'
import { GIORNO_MS, betaInCorso, proMainDi, richiediOperatore, salonIdValido, type TokenOperatore } from './comune'

export type UltimiAccessi = (uids: string[]) => Promise<Map<string, string | null>>

export type ContatoriAdmin = {
  saloni: { totali: number; attivi7: number; attivi30: number }
  perPiano: Record<LivelloElenco, number>
  perFonte: Record<FontePiano | 'nessuna', number>
  inviti: Record<StatoInvitoBeta, number>
  avvisami: Record<string, number>
  interesse: Record<string, string[]>
  feedback: { totali: number; pagheresti: Record<Pagheresti, number> }
  inBeta: number
  ultimoAccesso: Record<string, string | null>
}

function zeri<K extends string>(chiavi: readonly K[]): Record<K, number> {
  return Object.fromEntries(chiavi.map((chiave) => [chiave, 0])) as Record<K, number>
}

function piuRecente(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(b) > Date.parse(a) ? b : a
}

/** I numeri della Panoramica dell'Admin Manager, in una sola chiamata. */
export async function contatoriAdminPer(input: { token: TokenOperatore; adesso?: Date; ultimiAccessi: UltimiAccessi }): Promise<ContatoriAdmin> {
  richiediOperatore(input.token)
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()

  const persone = new Map<string, string[]>()
  for (const doc of (await db.collection('accounts').get()).docs) {
    const salonId = doc.data()?.salonId
    if (!salonIdValido(salonId)) continue
    persone.set(salonId, [...(persone.get(salonId) ?? []), doc.id])
  }
  const saloni = [...persone.keys()]
  const accessi = await input.ultimiAccessi([...persone.values()].flat())

  const perPiano = zeri<LivelloElenco>(['base', 'pro', 'salone', 'vip'])
  const perFonte = zeri<FontePiano | 'nessuna'>([...FONTI_PIANO, 'nessuna'])
  const ultimoAccesso: Record<string, string | null> = {}
  const pro = new Map<string, ReturnType<typeof proMainDi>>()
  let attivi7 = 0
  let attivi30 = 0
  await Promise.all(saloni.map(async (salonId) => {
    const doc = proMainDi((await db.doc(`salons/${salonId}/pro/main`).get()).data())
    pro.set(salonId, doc)
    perPiano[livelloElenco(doc, adesso)] += 1
    const stato = statoPiano(doc, adesso)
    perFonte[stato.livello !== 'base' && stato.fonte ? stato.fonte : 'nessuna'] += 1
    const ultimo = (persone.get(salonId) ?? []).reduce<string | null>((acc, uid) => piuRecente(acc, accessi.get(uid) ?? null), null)
    ultimoAccesso[salonId] = ultimo
    const fa = ultimo ? adesso.getTime() - Date.parse(ultimo) : Infinity
    if (fa <= 7 * GIORNO_MS) attivi7 += 1
    if (fa <= 30 * GIORNO_MS) attivi30 += 1
  }))

  const inviti = zeri<StatoInvitoBeta>(STATI_INVITO_BETA)
  let inBeta = 0
  for (const doc of (await db.collection('betaInviti').get()).docs) {
    const invito = invitoBetaDi(doc.data())
    if (!invito) continue
    const scaduto = invito.stato === 'invitato' && Date.parse(invito.scadeInvitoIl) <= adesso.getTime()
    inviti[scaduto ? 'scaduto' : invito.stato] += 1
    if (invito.stato === 'accettato' && betaInCorso(pro.get(doc.id), adesso)) inBeta += 1
  }

  const avvisami: Record<string, number> = {}
  const interesse: Record<string, string[]> = {}
  for (const doc of (await db.collectionGroup('interesse').get()).docs) {
    const [radice, salonId] = doc.ref.path.split('/')
    if (radice !== 'salons' || !salonIdValido(salonId)) continue
    avvisami[doc.id] = (avvisami[doc.id] ?? 0) + 1
    interesse[salonId] = [...(interesse[salonId] ?? []), doc.id]
  }

  const pagheresti = zeri<Pagheresti>(PAGHERESTI)
  const feedback = (await db.collection('betaFeedback').get()).docs
  for (const doc of feedback) {
    const voto = doc.data()?.pagheresti
    if (PAGHERESTI.includes(voto)) pagheresti[voto as Pagheresti] += 1
  }

  const ordinato = Object.fromEntries(saloni.sort().map((id) => [id, ultimoAccesso[id] ?? null]))
  return {
    saloni: { totali: saloni.length, attivi7, attivi30 },
    perPiano,
    perFonte,
    inviti,
    avvisami,
    interesse,
    feedback: { totali: feedback.length, pagheresti },
    inBeta,
    ultimoAccesso: ordinato,
  }
}
