// Prova eliminaAccount sull'emulatore demo. Si ferma se non è demo.
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
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const body = await response.json()
  if (!body.idToken) throw new Error(`login ${email}: ${JSON.stringify(body)}`)
  return body.idToken
}

async function chiama(idToken, data) {
  const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/eliminaAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  return response.json()
}

function account(uid, email, salonId) {
  return { firstName: 'Prova', lastName: 'Elimina', email, salonId, role: 'titolare', legacy: false }
}

const risultati = []
function esito(nome, ok, dettaglio) {
  risultati.push({ nome, ok })
  console.log(`${ok ? 'ok' : 'NO'} ${nome} ${dettaglio ?? ''}`)
}

const play = 'uid-elimina-play'
await utente(play, 'elimina-play@test.groomly', account(play, 'elimina-play@test.groomly', play))
await db.doc(`salons/${play}/pro/main`).set({ fonte: 'play', stato: 'attivo', piano: 'pro' })
const tokPlay = await token('elimina-play@test.groomly')
const rifiutoPlay = await chiama(tokPlay, {})
esito('Play attivo rifiutato', rifiutoPlay.error?.message === 'Disdici prima su Google Play', JSON.stringify(rifiutoPlay.error ?? rifiutoPlay))
esito('utente Play ancora presente', Boolean(await auth.getUser(play).catch(() => null)))

const altro = 'uid-elimina-altro'
await utente(altro, 'elimina-altro@test.groomly', account(altro, 'elimina-altro@test.groomly', altro))
const tokAltro = await token('elimina-altro@test.groomly')
const rifiutoAltro = await chiama(tokAltro, { salonId: 'uid-di-un-altro' })
esito('salonId diverso rifiutato', rifiutoAltro.error?.message === 'Accesso negato', JSON.stringify(rifiutoAltro.error ?? rifiutoAltro))

const shared = 'uid-elimina-shared'
await utente(shared, 'elimina-shared@test.groomly', account(shared, 'elimina-shared@test.groomly', 'shared'))
const tokShared = await token('elimina-shared@test.groomly')
const rifiutoShared = await chiama(tokShared, {})
const accountShared = (await db.doc(`accounts/${shared}`).get()).data() ?? {}
esito('shared rifiutato', rifiutoShared.error?.message === 'Accesso negato' && accountShared.salonId === 'shared', JSON.stringify(rifiutoShared.error ?? rifiutoShared))

const okUid = 'uid-elimina-ok'
await utente(okUid, 'elimina-ok@test.groomly', account(okUid, 'elimina-ok@test.groomly', okUid))
await db.doc(`salons/${okUid}/dogs/rex`).set({ name: 'Rex' })
await db.doc(`salons/${okUid}/members/m1`).set({ status: 'attivo', role: 'collaboratore' })
const tokOk = await token('elimina-ok@test.groomly')
const cancellato = await chiama(tokOk, {})
const utenteRimasto = await auth.getUser(okUid).then(() => true).catch(() => false)
const caneRimasto = (await db.doc(`salons/${okUid}/dogs/rex`).get()).exists
esito('account cancellato', cancellato.result?.ok === true && utenteRimasto === false && caneRimasto === false, JSON.stringify({ result: cancellato.result ?? cancellato.error, utenteRimasto, caneRimasto }))

const falliti = risultati.filter((item) => !item.ok)
console.log(falliti.length === 0 ? `ok ${risultati.length}/${risultati.length}` : `NO ${falliti.length}`)
process.exit(falliti.length === 0 ? 0 : 1)
