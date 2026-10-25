// Prova le callable del piano sull'emulatore. Si ferma se non è demo-groomly.
const project = process.env.GCLOUD_PROJECT ?? 'demo-groomly'
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Mancano gli emulatori. Mi fermo.')
  process.exit(1)
}
if (!project.startsWith('demo-')) {
  console.error('Project id non demo. Mi fermo.')
  process.exit(1)
}

const { createRequire } = await import('node:module')
const requireFn = createRequire(new URL('../../functions/package.json', import.meta.url))
const { initializeApp } = requireFn('firebase-admin/app')
const { getAuth } = requireFn('firebase-admin/auth')
const { getFirestore } = requireFn('firebase-admin/firestore')

initializeApp({ projectId: project })
const auth = getAuth()
const db = getFirestore()

const password = 'Test1234!'

async function utente(uid, email, account) {
  try { await auth.deleteUser(uid) } catch { /* assente */ }
  await auth.createUser({ uid, email, password, emailVerified: true })
  if (account) await db.doc(`accounts/${uid}`).set(account)
}

async function token(email) {
  const response = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const body = await response.json()
  if (!body.idToken) throw new Error(`login ${email}: ${JSON.stringify(body)}`)
  return body.idToken
}

async function chiama(name, idToken, data) {
  const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  const body = await response.json()
  return body
}

const risultati = []
function esito(nome, ok, dettaglio) {
  risultati.push({ nome, ok, dettaglio })
  console.log(`${ok ? 'ok' : 'NO'} ${nome} ${dettaglio ?? ''}`)
}

const titolare = 'uid-prova-piano'
const altro = 'uid-non-titolare'
await utente(titolare, 'prova-piano@test.groomly', {
  firstName: 'Prova', lastName: 'Piano', email: 'prova-piano@test.groomly', salonId: titolare, role: 'titolare', legacy: false,
})
await utente(altro, 'non-titolare@test.groomly', {
  firstName: 'No', lastName: 'No', email: 'non-titolare@test.groomly', salonId: altro, role: 'collaboratore', legacy: false,
})
await utente('uid-operatore-prova', 'laura.masala@tiscali.it', {
  firstName: 'Laura', lastName: 'Finta', email: 'laura.masala@tiscali.it', salonId: 'uid-operatore-prova', role: 'titolare', legacy: false,
})

await db.doc(`salons/${titolare}/pro/main`).delete().catch(() => undefined)
const tokTitolare = await token('prova-piano@test.groomly')
const prima = await chiama('avviaProva', tokTitolare, {})
const doc1 = (await db.doc(`salons/${titolare}/pro/main`).get()).data() ?? {}
esito('avviaProva prima volta', prima.result?.ok === true && doc1.piano === 'pro' && doc1.stato === 'prova' && doc1.provaUsata === true && doc1.enabled === false, JSON.stringify({ prima: prima.result ?? prima.error, piano: doc1.piano, enabled: doc1.enabled }))

const seconda = await chiama('avviaProva', tokTitolare, {})
esito('seconda prova rifiutata', seconda.error?.message === 'Prova già usata', JSON.stringify(seconda.error ?? seconda))

const tokAltro = await token('non-titolare@test.groomly')
const negato = await chiama('avviaProva', tokAltro, {})
esito('collaboratore non avvia la prova', negato.error?.message === 'Accesso negato', JSON.stringify(negato.error ?? negato))

const tokOp = await token('laura.masala@tiscali.it')
const shared = await chiama('impostaPianoManuale', tokOp, { salonId: 'shared', azione: 'salone' })
esito('omaggio su shared rifiutato', shared.error?.message === 'Accesso negato', JSON.stringify(shared.error ?? shared))

const omaggio = await chiama('impostaPianoManuale', tokOp, { salonId: titolare, azione: 'salone' })
const doc2 = (await db.doc(`salons/${titolare}/pro/main`).get()).data() ?? {}
esito('salone omaggio', omaggio.result?.ok === true && doc2.enabled === true && doc2.seats === 3 && doc2.piano === 'salone' && doc2.fonte === 'omaggio', JSON.stringify({ piano: doc2.piano, enabled: doc2.enabled, seats: doc2.seats }))

const spento = await chiama('setSalonPro', tokOp, { salonId: titolare, enabled: false })
const doc3 = (await db.doc(`salons/${titolare}/pro/main`).get()).data() ?? {}
esito('setSalonPro false torna a base', spento.result?.ok === true && doc3.piano === 'base' && doc3.stato === 'scaduto' && doc3.enabled === false, JSON.stringify({ piano: doc3.piano, stato: doc3.stato, enabled: doc3.enabled }))

const nonOp = await chiama('impostaPianoManuale', tokTitolare, { salonId: altro, azione: 'pro' })
esito('non operatore rifiutato', nonOp.error?.message === 'Accesso negato', JSON.stringify(nonOp.error ?? nonOp))

const scaduta = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
await db.doc(`salons/${altro}/pro/main`).set({
  piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: scaduta, provaUsata: true, enabled: false, seats: 0,
})
const { chiudiProveScadute } = requireFn('./lib/functions/src/piano/chiudiProve.js')
const chiusi = await chiudiProveScadute(new Date())
const doc4 = (await db.doc(`salons/${altro}/pro/main`).get()).data() ?? {}
esito('chiudiProve sull’emulatore', chiusi >= 1 && doc4.piano === 'base' && doc4.stato === 'scaduto' && doc4.enabled === false, JSON.stringify({ chiusi, piano: doc4.piano, stato: doc4.stato }))

const ko = risultati.filter((r) => !r.ok)
console.log(`\nCALLABLE: ${risultati.length - ko.length}/${risultati.length}`)
process.exit(ko.length === 0 ? 0 : 1)
