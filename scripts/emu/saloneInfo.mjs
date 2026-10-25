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

async function utente(uid, email) {
  try { await auth.deleteUser(uid) } catch { /* assente */ }
  await auth.createUser({ uid, email, password, emailVerified: true })
  await db.doc(`accounts/${uid}`).set({
    firstName: 'Ada', lastName: 'Neri', email, salonId: uid, role: 'titolare', legacy: false,
  })
}

async function token(email) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
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

const uno = 'uid-salone-uno'
const due = 'uid-salone-due'
await utente(uno, 'salone-uno@test.groomly')
await utente(due, 'salone-due@test.groomly')
await db.doc(`salons/${uno}/settings/main`).set({
  business: { salonName: 'I Pelosetti', phone: '333', vatNumber: '12345678901', taxCode: 'RSSMRA85T10A562S' },
})
const tok1 = await token('salone-uno@test.groomly')
const tok2 = await token('salone-due@test.groomly')
const prima = await chiama('pubblicaSalone', tok1, { nome: 'I Pelosetti!' })
const seconda = await chiama('pubblicaSalone', tok2, { nome: 'I Pelosetti!' })
const info = await chiama('saloneInfo', '', { slug: 'i-pelosetti' })
const html = String(info.result?.html ?? '')
const profilo = info.result?.profilo ?? {}
const ok = prima.result?.slug === 'i-pelosetti'
  && seconda.error?.message === 'Nome già preso'
  && html.includes('property="og:title" content="I Pelosetti"')
  && profilo.vat === undefined
  && !html.includes('12345678901')
console.log(ok ? 'ok 1/1' : 'NO', JSON.stringify({ prima: prima.result ?? prima.error, seconda: seconda.error ?? seconda.result, html: html.slice(0, 180), profilo }))
process.exit(ok ? 0 : 1)
