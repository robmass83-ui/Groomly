import type { Firestore } from 'firebase-admin/firestore'
import { livelloElenco } from '../../../src/lib/funzioniPiano'
import { isLauraEmail } from '../../../src/lib/salonPath'
import { giornoPrecedenteRoma, limitiGiornoRoma, lunediRoma, type Coorte, type StatisticheGiorno } from '../../../src/lib/statisticheGiorno'
import { GIORNO_MS, proMainDi, salonIdValido } from '../beta/comune'
import type { UltimiAccessi } from '../beta/contatoriAdmin'

const COORTI = 12
const MESI_REGISTRO = 24
const GRUPPO_CANCELLA = 400

type Persona = { uid: string; email: string; role?: unknown; createdAt?: unknown }

function mailDi(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function salonePrivato(persone: Persona[]): boolean {
  return persone.some(({ email }) => isLauraEmail(email) || email.endsWith('@test.groomly'))
}

/** Le persone dei saloni da contare. Di `shared`, Laura e saloni finti non si apre nessun documento del salone. */
async function saloniDaContare(db: Firestore, adesso: Date): Promise<{ saloni: Map<string, Persona[]>; esclusi: number }> {
  const tutti = new Map<string, Persona[]>()
  let shared = 0
  for (const doc of (await db.collection('accounts').get()).docs) {
    const { salonId, email, role, createdAt } = doc.data() ?? {}
    if (salonId === 'shared') shared = 1
    if (!salonIdValido(salonId)) continue
    tutti.set(salonId, [...(tutti.get(salonId) ?? []), { uid: doc.id, email: mailDi(email), role, createdAt }])
  }
  const saloni = new Map<string, Persona[]>()
  let esclusi = shared
  for (const [salonId, persone] of tutti) {
    if (salonePrivato(persone)) {
      esclusi += 1
      continue
    }
    const pro = proMainDi((await db.doc(`salons/${salonId}/pro/main`).get()).data())
    if (livelloElenco(pro, adesso) === 'vip') esclusi += 1
    else saloni.set(salonId, persone)
  }
  return { saloni, esclusi }
}

function piuRecente(uids: string[], accessi: Map<string, string | null>): number | null {
  const tempi = uids.map((uid) => Date.parse(accessi.get(uid) ?? '')).filter(Number.isFinite)
  return tempi.length > 0 ? Math.max(...tempi) : null
}

function registrato(persone: Persona[]): number | null {
  const titolare = persone.find(({ role }) => role === 'titolare')
  const quando = typeof titolare?.createdAt === 'string' ? Date.parse(titolare.createdAt) : NaN
  return Number.isFinite(quando) ? quando : null
}

function coorti(righe: { creato: number; ultimo: number | null }[], adesso: Date): Coorte[] {
  const prima = lunediRoma(new Date(adesso.getTime() - (COORTI - 1) * 7 * GIORNO_MS))
  const settimane = new Map<string, Coorte>()
  for (const { creato, ultimo } of righe) {
    const settimana = lunediRoma(new Date(creato))
    if (settimana < prima) continue
    const voce = settimane.get(settimana) ?? { settimana, saloni: 0, rimasti7: 0, rimasti30: 0 }
    voce.saloni += 1
    if (ultimo !== null && ultimo - creato >= 7 * GIORNO_MS) voce.rimasti7 += 1
    if (ultimo !== null && ultimo - creato >= 30 * GIORNO_MS) voce.rimasti30 += 1
    settimane.set(settimana, voce)
  }
  return [...settimane.values()].sort((a, b) => a.settimana.localeCompare(b.settimana))
}

export async function calcolaStatistiche(input: { db: Firestore; adesso: Date; ultimiAccessi: UltimiAccessi }): Promise<StatisticheGiorno> {
  const { db, adesso } = input
  const giorno = giornoPrecedenteRoma(adesso)
  const [inizio, fine] = limitiGiornoRoma(giorno)
  const { saloni, esclusi } = await saloniDaContare(db, adesso)
  const accessi = await input.ultimiAccessi([...saloni.values()].flat().map(({ uid }) => uid))

  const totali = { nuovi: 0, attivi1: 0, attivi7: 0, attivi30: 0, attivati: 0, appuntamenti: 0, plus: 0, salon: 0 }
  const coorte: { creato: number; ultimo: number | null }[] = []
  for (const [salonId, persone] of saloni) {
    const ultimo = piuRecente(persone.map(({ uid }) => uid), accessi)
    const fa = ultimo === null ? Infinity : adesso.getTime() - ultimo
    if (fa <= GIORNO_MS) totali.attivi1 += 1
    if (fa <= 7 * GIORNO_MS) totali.attivi7 += 1
    if (fa <= 30 * GIORNO_MS) totali.attivi30 += 1
    const creato = registrato(persone)
    if (creato !== null) {
      coorte.push({ creato, ultimo })
      if (creato >= inizio && creato < fine) totali.nuovi += 1
    }
    const radice = `salons/${salonId}`
    const appuntamenti = db.collection(`${radice}/appointments`)
    const [cani, visite, delGiorno, plus, salon] = await Promise.all([
      db.collection(`${radice}/dogs`).limit(1).count().get(),
      appuntamenti.limit(1).count().get(),
      appuntamenti.where('start', '>=', inizio).where('start', '<=', fine - 1).count().get(),
      db.doc(`${radice}/interesse/piano-plus`).get(),
      db.doc(`${radice}/interesse/piano-salone`).get(),
    ])
    if (cani.data().count > 0 && visite.data().count > 0) totali.attivati += 1
    totali.appuntamenti += delGiorno.data().count
    if (plus.exists) totali.plus += 1
    if (salon.exists) totali.salon += 1
  }

  return {
    giorno,
    saloni: saloni.size,
    nuovi: totali.nuovi,
    attivi1: totali.attivi1,
    attivi7: totali.attivi7,
    attivi30: totali.attivi30,
    attivati: totali.attivati,
    appuntamenti: totali.appuntamenti,
    mediaAppuntamenti: totali.attivi1 > 0 ? Math.round((totali.appuntamenti / totali.attivi1) * 10) / 10 : 0,
    coorti: coorti(coorte, adesso),
    avvisami: { plus: totali.plus, salon: totali.salon },
    esclusi,
    calcolatoIl: adesso.toISOString(),
  }
}

export async function salvaStatistiche(db: Firestore, riga: StatisticheGiorno): Promise<void> {
  await db.doc(`statsGiornaliere/${riga.giorno}`).set(riga)
}

/** La Privacy promette 24 mesi per il registro della Console. */
export async function pulisciRegistroAdmin(db: Firestore, adesso: Date): Promise<number> {
  const limite = new Date(adesso)
  limite.setMonth(limite.getMonth() - MESI_REGISTRO)
  let tolte = 0
  for (;;) {
    const { docs } = await db.collection('adminLog').where('quando', '<=', limite.toISOString()).limit(GRUPPO_CANCELLA).get()
    await Promise.all(docs.map((doc) => doc.ref.delete()))
    tolte += docs.length
    if (docs.length < GRUPPO_CANCELLA) return tolte
  }
}
