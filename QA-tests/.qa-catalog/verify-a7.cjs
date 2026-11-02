// Verifica A7 (solo emulatore demo-groomly): chiama le callable compilate con .run() e controlla pausa, ritorno e ripresa.
// Uso: node QA-tests/.qa-catalog/verify-a7.cjs
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const fn = req('./lib/functions/src/index.js')
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { eliminaSalonePer } = req('./lib/functions/src/piano/eliminaSalone.js')
const db = getFirestore(); const auth = getAuth()
const giorni = (n) => new Date(Date.now() + n * 86400000).toISOString()
const tok = (c) => c.repeat(64)

async function utente(email, nome) {
  const u = await auth.getUserByEmail(email).catch(() => null) ?? await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: 'QA' })
  return u.uid
}
async function invito(token, email, salonId, role = 'collaboratore') {
  await db.doc(`invites/${token}`).set({ status: 'aperto', email, salonId, role, expiresAt: giorni(7) })
}
const call = (f, uid, email, data = {}) => f.run({ auth: { uid, token: { email, email_verified: true } }, data, rawRequest: {} })
async function stato(uid) {
  const s = (await db.doc(`salons/${uid}/settings/main`).get()).data() ?? {}
  const p = (await db.doc(`salons/${uid}/pro/main`).get()).data() ?? {}
  const a = (await db.doc(`accounts/${uid}`).get()).data() ?? null
  return { prenotazioni: s.prenotazioniOnline, attesa: s.serviziEmail?.attesa?.modo, pausa: p.pausa ? 'sì' : 'no', account: a && `${a.salonId === uid ? '<proprio>' : a.salonId}/${a.role}`, accesso: await auth.getUser(uid).then(() => true, () => false) }
}
const out = []
const passo = async (nome, fnc) => { try { await fnc(); out.push([nome, 'ok']) } catch (e) { out.push([nome, 'ERRORE ' + (e.message || e)]) } }

;(async () => {
  const eA = 'qa-a7-luna@test.groomly'; const eB = 'qa-a7-host@test.groomly'; const eC = 'qa-a7-vuota@test.groomly'
  const A = await utente(eA, 'Luna'); const B = await utente(eB, 'Host'); const C = await utente(eC, 'Vuota')
  for (const uid of [A, B, C]) await db.recursiveDelete(db.doc(`salons/${uid}`))
  await db.doc(`salons/${A}/dogs/qa-a7-cane`).set({ name: 'Fido', status: 'attivo' })
  await db.doc(`salons/${A}/settings/main`).set({ business: { salonName: 'Toelettatura Luna' }, prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'automatico' } }, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${B}/pro/main`).set({ enabled: true, piano: 'salone', stato: 'attivo', fonte: 'omaggio' })
  const r = {}

  await invito(tok('a'), eA, B)
  await passo('1 senza scelta con salone pieno → rifiuto', async () => {
    const e = await call(fn.acceptInvite, A, eA, { token: tok('a') }).then(() => 'accettato', (x) => x.message)
    if (e !== "Aggiorna l'app per accettare l'invito") throw new Error(e)
  })
  await passo('2 accetta con pausa', () => call(fn.acceptInvite, A, eA, { token: tok('a'), sceltaSalone: 'pausa' }))
  r.dopoPausa = await stato(A)
  await passo('3 torna al mio salone', () => call(fn.tornaAlMioSalone, A, eA))
  r.dopoRitorno = await stato(A)
  r.membroDopoRitorno = (await db.doc(`salons/${B}/members/${A}`).get()).data()?.status

  await invito(tok('b'), eA, B)
  await passo('4 accetta con pausa (2)', () => call(fn.acceptInvite, A, eA, { token: tok('b'), sceltaSalone: 'pausa' }))
  await passo('5 revoca dall\'host', () => call(fn.revokeMember, B, eB, { uid: A }))
  r.dopoRevoca = await stato(A)

  await invito(tok('c'), eA, B)
  await passo('6 accetta lasciando aperto', () => call(fn.acceptInvite, A, eA, { token: tok('c'), sceltaSalone: 'aperto' }))
  r.dopoAperto = await stato(A)
  await passo('7 torna (salone aperto)', () => call(fn.tornaAlMioSalone, A, eA))

  await invito(tok('d'), eA, B); await invito(tok('e'), eC, B)
  await passo('8 accetta con pausa (3)', () => call(fn.acceptInvite, A, eA, { token: tok('d'), sceltaSalone: 'pausa' }))
  await passo('9 salone vuoto accetta senza scelta', () => call(fn.acceptInvite, C, eC, { token: tok('e') }))
  await passo('10 operatore elimina il salone host', () => eliminaSalonePer({ operatorEmail: 'qa@test.groomly', admin: true, chiamante: 'qa-operatore', salonId: B }))
  r.dopoEliminaSalone = await stato(A)
  r.vuotaDopoEliminaSalone = await stato(C)
  await passo('11 riprendi', () => call(fn.riprendiSalone, A, eA))
  r.dopoRiprendi = await stato(A)
  console.log(JSON.stringify({ passi: out, stati: r }, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
