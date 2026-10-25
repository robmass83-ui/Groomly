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
const password = 'Test1234!'
const uid = 'uid-scheda-cliente'
try { await auth.deleteUser(uid) } catch { /* assente */ }
await auth.createUser({ uid, email: 'scheda@test.groomly', password, emailVerified: true })
await db.doc(`accounts/${uid}`).set({ firstName: 'Ada', lastName: 'Neri', email: 'scheda@test.groomly', salonId: uid, role: 'titolare', legacy: false })
await db.doc(`salons/${uid}/dogs/rex`).set({ name: 'Rex', species: 'cane', notes: 'segreto', tags: ['vip'], behavior: 'mordace' })

async function token() {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'scheda@test.groomly', password, returnSecureToken: true }),
  })
  const body = await response.json()
  if (!body.idToken) throw new Error(JSON.stringify(body))
  return body.idToken
}
async function chiama(name, idToken, data) {
  const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data }),
  })
  return response.json()
}
const idToken = await token()
const creata = await chiama('pubblicaScheda', idToken, { dogId: 'rex' })
const carta = await chiama('schedaCliente', '', { token: creata.result?.token })
const testo = JSON.stringify(carta.result ?? {})
await chiama('revocaScheda', idToken, { token: creata.result?.token })
const dopo = await chiama('schedaCliente', '', { token: creata.result?.token })
const ok = carta.result?.stato === 'ok'
  && carta.result?.scheda?.nome === 'Rex'
  && !testo.includes('segreto')
  && !testo.includes('vip')
  && !testo.includes('mordace')
  && !('notes' in (carta.result?.scheda ?? {}))
  && !('tags' in (carta.result?.scheda ?? {}))
  && !('behavior' in (carta.result?.scheda ?? {}))
  && dopo.result?.stato === 'non_trovata'
console.log(ok ? 'ok 1/1' : 'NO', JSON.stringify({ carta: carta.result ?? carta.error, dopo: dopo.result ?? dopo.error }))
process.exit(ok ? 0 : 1)
