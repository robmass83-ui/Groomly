// Passaggio degli accessi admin. Parte sempre in sola prova: scrive solo con --esegui.
// Credenziali: GOOGLE_APPLICATION_CREDENTIALS verso un service account fuori dal repo.
// Sugli emulatori: FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST e GCLOUD_PROJECT=demo-...
//
//   node --experimental-strip-types scripts/imposta-admin.ts controlla
//   node --experimental-strip-types scripts/imposta-admin.ts claim on masala.roberto@hotmail.it [--esegui]
//   node --experimental-strip-types scripts/imposta-admin.ts collega [--esegui]
//   node --experimental-strip-types scripts/imposta-admin.ts stacca [--esegui]
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth, type UserRecord } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { ambienteValido, bersaglioSaloneProva, decidiCollega, decidiStacca, type Decisione } from '../src/lib/passaggioAdmin.ts'

const LAURA = 'laura.masala@tiscali.it'
const HOTMAIL = 'masala.roberto@hotmail.it'
const ROBMASS = 'robmass83@gmail.com'
const RACCOLTE_DEL_SALONE = ['invites', 'pubblici', 'schede', 'suggerimenti']

const progetto = process.env.GCLOUD_PROJECT ?? 'groomly-3128b'
if (!ambienteValido({ progetto, firestore: process.env.FIRESTORE_EMULATOR_HOST, auth: process.env.FIREBASE_AUTH_EMULATOR_HOST })) {
  console.error('Emulatori e progetto non coincidono. Mi fermo.')
  process.exit(1)
}
const emulatori = progetto.startsWith('demo-')
console.log(`Progetto: ${progetto}${emulatori ? ' (emulatori)' : ' (PRODUZIONE)'}`)
initializeApp(emulatori ? { projectId: progetto } : { credential: applicationDefault(), projectId: progetto })
const auth = getAuth()
const db = getFirestore()

const argomenti = process.argv.slice(2)
const esegui = argomenti.includes('--esegui')
const [comando, ...resto] = argomenti.filter((voce) => voce !== '--esegui')

async function utente(email: string): Promise<UserRecord | null> {
  return auth.getUserByEmail(email).catch((error: { code?: string }) => {
    if (error.code === 'auth/user-not-found') return null
    throw error
  })
}

async function account(uid: string | undefined): Promise<Record<string, unknown> | null> {
  if (!uid) return null
  return (await db.doc(`accounts/${uid}`).get()).data() ?? null
}

function salonDi(dati: Record<string, unknown> | null): string | null {
  return typeof dati?.salonId === 'string' ? dati.salonId : null
}

function testo(valore: unknown): string {
  return typeof valore === 'string' ? valore : ''
}

async function conta(percorso: string): Promise<number> {
  return (await db.collection(percorso).count().get()).data().count
}

async function altrePersone(uid: string): Promise<number> {
  const legati = await db.collection('accounts').where('salonId', '==', uid).get()
  const membri = await db.collection(`salons/${uid}/members`).get()
  return new Set([...legati.docs, ...membri.docs].map((doc) => doc.id).filter((id) => id !== uid)).size
}

function riassunto(persona: UserRecord | null, dati: Record<string, unknown> | null) {
  if (!persona) return null
  return {
    uid: persona.uid,
    emailVerificata: persona.emailVerified,
    claim: persona.customClaims ?? {},
    ultimoAccesso: persona.metadata.lastRefreshTime ?? persona.metadata.lastSignInTime ?? null,
    account: dati ? { salonId: dati.salonId ?? null, role: dati.role ?? null, legacy: dati.legacy ?? null } : null,
  }
}

async function controlla(): Promise<void> {
  const [laura, hotmail, robmass] = await Promise.all([utente(LAURA), utente(HOTMAIL), utente(ROBMASS)])
  const [datiLaura, datiHotmail, datiRobmass] = await Promise.all([account(laura?.uid), account(hotmail?.uid), account(robmass?.uid)])
  const report: Record<string, unknown> = {
    progetto,
    laura: riassunto(laura, datiLaura),
    hotmail: riassunto(hotmail, datiHotmail),
    robmass83: riassunto(robmass, datiRobmass),
  }
  const salonRobmass = salonDi(datiRobmass)
  if (robmass && salonRobmass === robmass.uid) {
    const impostazioni = (await db.doc(`salons/${robmass.uid}/settings/main`).get()).data()
    report.saloneProva = {
      nome: (impostazioni?.business as { name?: unknown } | undefined)?.name ?? null,
      cani: await conta(`salons/${robmass.uid}/dogs`),
      appuntamenti: await conta(`salons/${robmass.uid}/appointments`),
      altrePersone: await altrePersone(robmass.uid),
    }
  }
  if (laura) {
    const membri = await db.collection(`salons/${laura.uid}/members`).get()
    const pro = (await db.doc(`salons/${laura.uid}/pro/main`).get()).data()
    report.saloneLaura = {
      posti: pro?.seats ?? null,
      membri: membri.docs.map((doc) => ({ uid: doc.id, email: doc.get('email'), role: doc.get('role'), status: doc.get('status'), accessWithoutPro: doc.get('accessWithoutPro') ?? false })),
      appuntamentiAssegnatiAllaHotmail: hotmail
        ? (await db.collection(`salons/${laura.uid}/appointments`).where('assigneeUid', '==', hotmail.uid).count().get()).data().count
        : 0,
    }
  }
  console.log(JSON.stringify(report, null, 2))
}

async function claim(): Promise<void> {
  const [verso, email] = resto
  if ((verso !== 'on' && verso !== 'off') || !email) throw new Error('Uso: claim on|off <email>')
  const persona = await auth.getUserByEmail(email)
  const { admin: _prima, ...altri } = persona.customClaims ?? {}
  const claims = verso === 'on' ? { ...altri, admin: true } : altri
  console.log(`${email} (${persona.uid}): ${JSON.stringify(persona.customClaims ?? {})} → ${JSON.stringify(claims)}`)
  if (!esegui) return solaProva()
  await auth.setCustomUserClaims(persona.uid, claims)
  console.log('Claim scritto.')
}

function solaProva(): void {
  console.log('Sola prova: non ho scritto nulla. Per scrivere aggiungi --esegui.')
}

function fermatiSeNegato<P>(decisione: Decisione<P>): P[] {
  if (!decisione.ok) {
    console.error(`Mi fermo: ${decisione.motivo}`)
    process.exit(1)
  }
  console.log(`Passi: ${decisione.passi.length === 0 ? 'nessuno, è già a posto' : decisione.passi.join(', ')}`)
  return decisione.passi
}

async function eliminaSaloneProva(uid: string, lauraUid: string): Promise<void> {
  const percorso = bersaglioSaloneProva(uid, lauraUid)
  await db.recursiveDelete(db.doc(percorso))
  for (const raccolta of RACCOLTE_DEL_SALONE) {
    const trovati = await db.collection(raccolta).where('salonId', '==', uid).get()
    await Promise.all(trovati.docs.map((doc) => doc.ref.delete()))
  }
}

async function collega(): Promise<void> {
  const [laura, robmass] = await Promise.all([utente(LAURA), utente(ROBMASS)])
  const [datiLaura, datiRobmass] = await Promise.all([account(laura?.uid), account(robmass?.uid)])
  const membro = laura && robmass ? (await db.doc(`salons/${laura.uid}/members/${robmass.uid}`).get()).data() : undefined
  const salonRobmass = salonDi(datiRobmass)
  const passi = fermatiSeNegato(decidiCollega({
    uid: robmass?.uid ?? null,
    salonId: salonRobmass,
    altrePersone: robmass && salonRobmass === robmass.uid ? await altrePersone(robmass.uid) : 0,
    membroAttivo: membro?.status === 'attivo',
    lauraUid: laura?.uid ?? null,
    lauraSalonId: salonDi(datiLaura),
  }))
  if (passi.length === 0) return
  if (!esegui) return solaProva()
  if (!laura || !robmass) throw new Error('Persone assenti.')
  if (passi.includes('elimina-salone-prova')) await eliminaSaloneProva(robmass.uid, laura.uid)
  const nomi = { firstName: testo(datiRobmass?.firstName), lastName: testo(datiRobmass?.lastName) }
  await db.doc(`accounts/${robmass.uid}`).set({ ...nomi, email: ROBMASS, salonId: laura.uid, role: 'socio', legacy: !robmass.emailVerified }, { merge: true })
  await db.doc(`salons/${laura.uid}/members/${robmass.uid}`).set({
    ...nomi,
    uid: robmass.uid,
    email: ROBMASS,
    role: 'socio',
    status: 'attivo',
    accessWithoutPro: true,
    collegatoIl: new Date().toISOString(),
  })
  console.log('Collegato. robmass83 può entrare in I Pelosetti.')
}

async function stacca(): Promise<void> {
  const [laura, hotmail, robmass] = await Promise.all([utente(LAURA), utente(HOTMAIL), utente(ROBMASS)])
  const membro = laura && robmass ? (await db.doc(`salons/${laura.uid}/members/${robmass.uid}`).get()).data() : undefined
  const collegatoIl = Date.parse(testo(membro?.collegatoIl))
  const ultimoAccesso = Date.parse(robmass?.metadata.lastRefreshTime ?? robmass?.metadata.lastSignInTime ?? '')
  fermatiSeNegato(decidiStacca({
    hotmailUid: hotmail?.uid ?? null,
    claimAdmin: hotmail?.customClaims?.admin === true,
    robmassSalonId: salonDi(await account(robmass?.uid)),
    lauraUid: laura?.uid ?? null,
    robmassEntratoDopoCollegamento: ultimoAccesso > collegatoIl,
  }))
  if (!esegui) return solaProva()
  if (!laura || !hotmail) throw new Error('Persone assenti.')
  await db.recursiveDelete(db.doc(`accounts/${hotmail.uid}`))
  await db.doc(`salons/${laura.uid}/members/${hotmail.uid}`).delete()
  console.log('Hotmail staccata dal salone. L’accesso resta: ora entra solo in /admin.')
}

const comandi: Record<string, () => Promise<void>> = { controlla, claim, collega, stacca }
const scelto = comandi[comando ?? '']
if (!scelto) {
  console.error('Comandi: controlla, claim on|off <email>, collega, stacca. Aggiungi --esegui per scrivere.')
  process.exit(1)
}
await scelto()
process.exit(0)
