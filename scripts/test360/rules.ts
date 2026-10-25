// Prove delle regole Firestore VERE sull'emulatore (non testo): ogni riga è "chi prova cosa → atteso".
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { initializeApp as adminInit } from 'firebase-admin/app'
import { fermaSeNonDemo } from './guard'

fermaSeNonDemo()
import { getFirestore as adminDb } from 'firebase-admin/firestore'

const report = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[]
adminInit({ projectId: 'demo-groomly' })
const admin = adminDb()
const S = (n: number) => report.find((r) => r.salone === n)
const laura = report.find((r) => r.salone === 'laura-finta')

let appN = 0
async function as(email: string) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-groomly' }, `a${appN++}`)
  const a = getAuth(app); connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true })
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080)
  const cred = await signInWithEmailAndPassword(a, email, 'Test1234!')
  return { db, uid: cred.user.uid, close: () => deleteApp(app) }
}
const results: { prova: string; atteso: string; ottenuto: string; ok: boolean }[] = []
async function check(prova: string, expectOk: boolean, fn: () => Promise<unknown>) {
  let got = 'permesso'
  try { await fn() } catch (e: any) { got = e?.code === 'permission-denied' ? 'negato' : `errore ${e?.code ?? e}` }
  const ok = (got === 'permesso') === expectOk
  results.push({ prova, atteso: expectOk ? 'permesso' : 'negato', ottenuto: got, ok })
}

async function main() {
  const o1 = await as('salone1@test.groomly')
  const s1 = S(1).uid, s2 = S(2).uid, s13 = S(13).uid, s14 = S(14).uid
  const dog2 = (await admin.collection(`salons/${s2}/dogs`).limit(1).get()).docs[0].id
  await check('Titolare 1 legge i suoi cani', true, () => getDocs(query(collection(o1.db, 'salons', s1, 'dogs'), limit(5))))
  await check('Titolare 1 legge i cani del salone 2', false, () => getDocs(query(collection(o1.db, 'salons', s2, 'dogs'), limit(5))))
  await check('Titolare 1 legge un cane preciso del salone 2', false, () => getDoc(doc(o1.db, 'salons', s2, 'dogs', dog2)))
  await check('Titolare 1 scrive un cane nel salone 2', false, () => setDoc(doc(o1.db, 'salons', s2, 'dogs', 'intruso'), { name: 'x', status: 'attivo' }))
  await check('Titolare 1 si accende Pro da solo (pro/main)', false, () => setDoc(doc(o1.db, 'salons', s1, 'pro', 'main'), { enabled: true, seats: 99 }))
  await check('Titolare 1 si aggiunge un membro da solo', false, () => setDoc(doc(o1.db, 'salons', s1, 'members', 'x'), { role: 'socio', status: 'attivo' }))
  await check('Titolare 1 sposta il suo account sul salone 2', false, () => updateDoc(doc(o1.db, 'accounts', o1.uid), { salonId: s2 }))
  await check('Titolare 1 si dà il ruolo socio', false, () => updateDoc(doc(o1.db, 'accounts', o1.uid), { role: 'socio' }))
  await check('Titolare 1 legge l’account di un altro', false, () => getDoc(doc(o1.db, 'accounts', s2)))
  await check('Titolare 1 legge users/{uid} di Laura (vecchi backup)', false, () => getDoc(doc(o1.db, 'users', laura.uid, 'backups', '2026-10-01')))
  await check('Titolare 1 scrive in una raccolta inventata del suo salone (es. crediti)', false, () => setDoc(doc(o1.db, 'salons', s1, 'crediti', 'main'), { inclusi: 9999 }))
  await check('Titolare 1 scrive settings/main', true, () => updateDoc(doc(o1.db, 'salons', s1, 'settings', 'main'), { updatedAt: new Date().toISOString() }))
  await check('Titolare 1 crea invites/{token}', false, () => setDoc(doc(o1.db, 'invites', 'tok'), { salonId: s1 }))
  await o1.close()

  const c13 = await as('collab13@test.groomly')
  const d13 = (await admin.collection(`salons/${s13}/dogs`).where('status', '==', 'attivo').limit(1).get()).docs[0].id
  const done13 = (await admin.collection(`salons/${s13}/appointments`).where('status', '==', 'completato').limit(1).get()).docs[0]
  await check('Collaboratore 13 legge i cani del salone (Pro acceso)', true, () => getDocs(query(collection(c13.db, 'salons', s13, 'dogs'), limit(5))))
  await check('Collaboratore 13 elimina un cane', false, () => deleteDoc(doc(c13.db, 'salons', s13, 'dogs', d13)))
  await check('Collaboratore 13 segna un cane deceduto', false, () => updateDoc(doc(c13.db, 'salons', s13, 'dogs', d13), { status: 'deceduto' }))
  await check('Collaboratore 13 scrive settings/main', false, () => updateDoc(doc(c13.db, 'salons', s13, 'settings', 'main'), { updatedAt: 'x' }))
  await check('Collaboratore 13 cambia la persona di una visita completata', false, () => updateDoc(doc(c13.db, 'salons', s13, 'appointments', done13.id), { assigneeUid: 'uid-altra-persona' }))
  await check('Collaboratore 13 cambia l’IMPORTO di una visita completata', false, () => updateDoc(doc(c13.db, 'salons', s13, 'appointments', done13.id), { total: 1 }))
  await check('Collaboratore 13 elimina un appuntamento', false, () => deleteDoc(doc(c13.db, 'salons', s13, 'appointments', done13.id)))
  await check('Collaboratore 13 legge gli incassi di tutti (appuntamenti degli altri)', true, () => getDocs(query(collection(c13.db, 'salons', s13, 'appointments'), limit(5))))
  await check('Collaboratore 13 cancella il proprio account (posto fantasma)', true, () => deleteDoc(doc(c13.db, 'accounts', c13.uid)))
  await c13.close()

  await admin.doc(`salons/${s14}/pro/main`).set({ enabled: false, seats: 3 })
  const c14 = await as('collab14@test.groomly')
  await check('Collaboratore 14 con Pro SPENTO legge i cani', false, () => getDocs(query(collection(c14.db, 'salons', s14, 'dogs'), limit(5))))
  await c14.close()
  await admin.doc(`salons/${s14}/pro/main`).set({ enabled: true, seats: 3 })

  await admin.doc(`salons/${laura.uid}/pro/main`).set({ enabled: false, seats: 3 })
  const rob = await as('masala.roberto@hotmail.it')
  await check('Roberto socio (accessWithoutPro) legge Laura-finta con Pro spento', true, () => getDocs(query(collection(rob.db, 'salons', laura.uid, 'dogs'), limit(5))))
  await check('Operatore legge settings di un salone qualsiasi', true, () => getDoc(doc(rob.db, 'salons', s2, 'settings', 'main')))
  await check('Operatore legge i cani di un salone qualsiasi', false, () => getDocs(query(collection(rob.db, 'salons', s2, 'dogs'), limit(5))))
  await check('Operatore legge gli account di tutti', true, () => getDoc(doc(rob.db, 'accounts', s2)))
  await rob.close()
  await admin.doc(`salons/${laura.uid}/pro/main`).set({ enabled: true, seats: 3 })

  const o11 = await as('salone11@test.groomly')
  await check('Titolare con email NON confermata scrive cani (le regole non lo bloccano)', true, () => setDoc(doc(o11.db, 'salons', S(11).uid, 'dogs', 'test-nonverif'), { name: 'x', status: 'attivo' }))
  await o11.close()

  console.log(JSON.stringify(results, null, 1))
  const bad = results.filter((r) => !r.ok)
  console.log(`\nREGOLE: ${results.length - bad.length}/${results.length} come atteso`)
  for (const b of bad) console.log('  ✗', b.prova, '→ atteso', b.atteso, 'ottenuto', b.ottenuto)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
