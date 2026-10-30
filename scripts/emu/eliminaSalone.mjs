// Prova eliminaSalone sull'emulatore demo. Si ferma se non è demo.
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

async function utente(uid, email, salonId, role = 'titolare') {
  try { await auth.deleteUser(uid) } catch { /* assente */ }
  await auth.createUser({ uid, email, password, emailVerified: true })
  await db.doc(`accounts/${uid}`).set({ firstName: 'Prova', lastName: uid, email, salonId, role, legacy: false })
}

async function token(email) {
  if (diretto) {
    const persona = await auth.getUserByEmail(email)
    chi.set(email, { email, uid: persona.uid })
    return email
  }
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
  const body = await response.json()
  if (!body.idToken) throw new Error(`login ${email}: ${JSON.stringify(body)}`)
  return body.idToken
}

// Con ELIMINA_DIRETTO=1 chiama la logica compilata senza passare dall'emulatore delle Functions.
const diretto = process.env.ELIMINA_DIRETTO === '1'
const { eliminaSalonePer } = diretto
  ? requireFn('./lib/functions/src/piano/eliminaSalone.js')
  : { eliminaSalonePer: null }
const chi = new Map()

async function chiama(idToken, data) {
  if (diretto) {
    const persona = chi.get(idToken)
    try {
      return { result: await eliminaSalonePer({ operatorEmail: persona.email, emailVerified: true, chiamante: persona.uid, salonId: data.salonId }) }
    } catch (error) {
      return { error: { message: error.message } }
    }
  }
  const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/eliminaSalone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  return response.json()
}

const risultati = []
function esito(nome, ok, dettaglio) {
  risultati.push({ nome, ok })
  console.log(`${ok ? 'ok' : 'NO'} ${nome} ${dettaglio ?? ''}`)
}

async function esiste(path) {
  return (await db.doc(path).get()).exists
}

/** Un salone completo: dati, persone, telefoni, inviti, pagina pubblica, limiti, suggerimenti. */
async function seminaSalone(id, collab, telefono) {
  await utente(id, `${id}@test.groomly`, id)
  await utente(collab, `${collab}@test.groomly`, id, 'collaboratore')
  await db.doc(`salons/${id}/settings/main`).set({ business: { salonName: `Salone ${id}` } })
  await db.doc(`salons/${id}/pro/main`).set({ piano: 'salone', fonte: 'omaggio', stato: 'attivo' })
  await db.doc(`salons/${id}/members/${collab}`).set({ status: 'attivo', role: 'collaboratore' })
  await db.doc(`salons/${id}/dogs/rex`).set({ name: 'Rex' })
  await db.doc(`salons/${id}/dogs/rex/note/n1`).set({ testo: 'annidato' })
  await db.doc(`salons/${id}/appointments/a1`).set({ dogId: 'rex' })
  await db.doc(`accounts/${id}/devices/${telefono}`).set({ token: `tok-${telefono}` })
  await db.doc(`accounts/${id}/push/prefs`).set({ updates: true })
  await db.doc(`users/${collab}/backups/b1`).set({ x: 1 })
  await db.doc(`invites/inv-${id}`).set({ salonId: id, email: `nuovo-${id}@test.groomly`, status: 'aperto' })
  await db.doc(`pubblici/slug-${id}`).set({ salonId: id })
  await db.doc(`schede/sch-${id}`).set({ salonId: id, dogId: 'rex', revocato: false })
  await db.doc(`suggerimenti/sug-${id}`).set({ uid: id, salonId: id, testo: 'prova prova' })
  await db.doc(`suggerimenti/sug-vecchio-${collab}`).set({ uid: collab, salonId: 'prima', testo: 'prova prova' })
  for (const limite of ['suggerimentiLimiti', 'placesRateLimits', 'pushRateLimits']) {
    await db.doc(`${limite}/${id}`).set({ hits: [1] })
    await db.doc(`${limite}/${collab}`).set({ hits: [1] })
  }
  await db.doc(`emailRateLimits/${id}@test.groomly`).set({ hits: [1] })
  await db.doc(`pushSfide/sfida${id}`).set({ uid: id, deviceId: telefono, token: 't', scade: 1 })
  await db.doc(`pushDeliveries/${telefono}__updates__1_1_137`).set({ claim: 1 })
}

const prova = 'uid-salone-prova'
const collabProva = 'uid-collab-prova'
const altro = 'uid-salone-altro'
const collabAltro = 'uid-collab-altro'
await seminaSalone(prova, collabProva, 'telProva')
await seminaSalone(altro, collabAltro, 'telAltro')
await utente('uid-roberto', 'masala.roberto@hotmail.it', 'shared')
await utente('uid-estraneo', 'estraneo@test.groomly', 'uid-estraneo')
const conLaura = 'uid-salone-laura'
await utente(conLaura, 'titolare-laura@test.groomly', conLaura)
await db.doc(`salons/${conLaura}/dogs/fido`).set({ name: 'Fido' })
await db.doc('accounts/uid-laura-membro').set({ email: 'laura.masala@tiscali.it', salonId: conLaura, role: 'collaboratore' })
// Il trigger del link pubblico parte a ogni salvataggio del nome: lo lascio finire prima di cancellare.
await new Promise((ok) => setTimeout(ok, 3000))

const tokRoberto = await token('masala.roberto@hotmail.it')
const tokEstraneo = await token('estraneo@test.groomly')

const negato = await chiama(tokEstraneo, { salonId: prova })
esito('chi non è operatore è rifiutato', negato.error?.message === 'Accesso negato' && await esiste(`salons/${prova}/dogs/rex`), JSON.stringify(negato.error ?? negato))

const shared = await chiama(tokRoberto, { salonId: 'shared' })
esito('il salone condiviso è rifiutato', shared.error?.message === 'Accesso negato', JSON.stringify(shared.error ?? shared))

const laura = await chiama(tokRoberto, { salonId: conLaura })
esito('un salone con Laura dentro resta', laura.error?.message === 'Questa toelettatura non si può eliminare' && await esiste(`salons/${conLaura}/dogs/fido`), JSON.stringify(laura.error ?? laura))

const fatto = await chiama(tokRoberto, { salonId: prova })
esito('Roberto elimina la toelettatura di prova', fatto.result?.ok === true && fatto.result?.persone === 2, JSON.stringify(fatto.result ?? fatto.error))

const tracce = []
for (const path of [
  `salons/${prova}/settings/main`, `salons/${prova}/pro/main`, `salons/${prova}/members/${collabProva}`,
  `salons/${prova}/dogs/rex`, `salons/${prova}/dogs/rex/note/n1`, `salons/${prova}/appointments/a1`,
  `accounts/${prova}`, `accounts/${collabProva}`, `accounts/${prova}/devices/telProva`, `accounts/${prova}/push/prefs`,
  `users/${collabProva}/backups/b1`, `invites/inv-${prova}`, `pubblici/slug-${prova}`, `schede/sch-${prova}`,
  `suggerimenti/sug-${prova}`, `suggerimenti/sug-vecchio-${collabProva}`,
  `suggerimentiLimiti/${prova}`, `placesRateLimits/${collabProva}`, `pushRateLimits/${prova}`,
  `emailRateLimits/${prova}@test.groomly`, `pushSfide/sfida${prova}`, 'pushDeliveries/telProva__updates__1_1_137',
]) {
  if (await esiste(path)) tracce.push(path)
}
const pubblicoDaTrigger = await db.collection('pubblici').where('salonId', '==', prova).get()
if (!pubblicoDaTrigger.empty) tracce.push('pubblici (dal trigger)')
for (const uid of [prova, collabProva]) {
  if (await auth.getUser(uid).then(() => true).catch(() => false)) tracce.push(`auth ${uid}`)
}
esito('non resta nessuna traccia', tracce.length === 0, JSON.stringify(tracce))

const intatti = []
for (const path of [
  `salons/${altro}/dogs/rex`, `salons/${altro}/dogs/rex/note/n1`, `accounts/${altro}`, `accounts/${collabAltro}`,
  `accounts/${altro}/devices/telAltro`, `invites/inv-${altro}`, `pubblici/slug-${altro}`, `schede/sch-${altro}`,
  `suggerimenti/sug-${altro}`, `pushDeliveries/telAltro__updates__1_1_137`, `pushSfide/sfida${altro}`,
  'accounts/uid-roberto', `salons/${conLaura}/dogs/fido`,
]) {
  if (!(await esiste(path))) intatti.push(path)
}
for (const uid of [altro, collabAltro, 'uid-roberto']) {
  if (!(await auth.getUser(uid).then(() => true).catch(() => false))) intatti.push(`auth ${uid}`)
}
esito('le altre toelettature restano intatte', intatti.length === 0, JSON.stringify(intatti))

const riprova = await chiama(tokRoberto, { salonId: prova })
esito('rilanciare su un salone già cancellato non dà errore', riprova.result?.ok === true, JSON.stringify(riprova.result ?? riprova.error))

const nuovo = await auth.createUser({ email: `${prova}@test.groomly`, password, emailVerified: true }).catch((error) => error)
esito('la stessa email si può registrare di nuovo', typeof nuovo?.uid === 'string', nuovo?.uid ?? String(nuovo?.code))
if (typeof nuovo?.uid === 'string') await auth.deleteUser(nuovo.uid)

const falliti = risultati.filter((item) => !item.ok)
console.log(falliti.length === 0 ? `ok ${risultati.length}/${risultati.length}` : `NO ${falliti.length}`)
process.exit(falliti.length === 0 ? 0 : 1)
