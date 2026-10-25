const project = process.env.GCLOUD_PROJECT ?? 'demo-groomly'
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !project.startsWith('demo-')) {
  console.error('Emulatore demo assente. Mi fermo.')
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
const uid = 'uid-messaggio'
const password = 'Test1234!'
try { await auth.deleteUser(uid) } catch { /* assente */ }
await auth.createUser({ uid, email: 'messaggio@test.groomly', password, emailVerified: true })
await db.doc(`accounts/${uid}`).set({ firstName: 'Ada', lastName: 'Neri', email: 'messaggio@test.groomly', salonId: uid, role: 'titolare', legacy: false })
const login = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'messaggio@test.groomly', password, returnSecureToken: true }),
})
const idToken = (await login.json()).idToken
const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/segnaMessaggio`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  body: JSON.stringify({ data: { dogId: 'rex', testo: 'Ciao Ada' } }),
})
const body = await response.json()
const scritti = await db.collection(`salons/${uid}/messaggi`).get()
const primo = scritti.docs[0]?.data()
const ok = body.result?.ok === true && scritti.size === 1 && primo?.canale === 'wa_manuale' && primo?.stato === 'aperto'
console.log(ok ? 'ok 1/1' : 'NO', JSON.stringify({ body: body.result ?? body.error, canale: primo?.canale, stato: primo?.stato }))
process.exit(ok ? 0 : 1)
