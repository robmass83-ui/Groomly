// Verifica A1 (solo emulatore): chiama le funzioni compilate (functions/lib) su Firestore emulato per un salone Go
// (prova Plus scaduta, lista accesa nelle impostazioni) e un salone Plus attivo.
// Uso: node QA-tests/.qa-catalog/verify-a1.cjs  (dopo `cd functions && npx tsc`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
const { iscrivitiAttesaPer } = req('./lib/functions/src/piano/iscrivitiAttesa.js')
const { confermaAttesaPer } = req('./lib/functions/src/piano/confermaAttesa.js')
const { paginaPubblicaHttp } = req('./lib/functions/src/piano/paginaPubblica.js')
const H = 3600000
async function pagina(slug) {
  let body = '', status = 0
  const res = { status(s) { status = s; return this }, set() { return this }, send(b) { body = String(b); return this } }
  await paginaPubblicaHttp({ path: `/s/${slug}`, query: {} }, res)
  const m = body.match(/"attesa"\s*:\s*(true|false)/)
  return { status, attesa: m ? m[1] === 'true' : null }
}
async function prova(email, etichetta) {
  const uid = (await getAuth().getUserByEmail(email)).uid
  const salonId = (await db.doc(`accounts/${uid}`).get()).data().salonId
  const base = `salons/${salonId}`
  const pro = (await db.doc(`${base}/pro/main`).get()).data() ?? null
  await db.doc(`${base}/settings/main`).set({ serviziEmail: { attesa: { modo: 'manuale' } } }, { merge: true })
  const slug = `qa-a1-${etichetta}`
  await db.doc(`pubblici/${slug}`).set({ salonId })
  const servizio = (await db.collection(`${base}/services`).get()).docs.find((d) => d.data().kind === 'principale' || !d.data().kind)
  // offerta vecchia: visita disdetta tra 2 giorni, buco, iscritto, offerta col token
  const inizio = new Date(Date.now() + 48 * H); inizio.setUTCMinutes(0, 0, 0)
  const tag = `qaa1${etichetta}`, token = (tag + 'x'.repeat(40)).slice(0, 40)
  await db.doc(`${base}/appointments/${tag}-v`).set({ id: `${tag}-v`, dogId: '', start: inizio.getTime(), end: inizio.getTime() + H, status: 'disdetto', services: [], createdAt: Date.now(), updatedAt: Date.now() })
  await db.doc(`${base}/buchiAttesa/${tag}-v`).set({ appointmentId: `${tag}-v`, inizio: inizio.toISOString(), nomeCane: 'Luna' })
  await db.doc(`${base}/attesa/${tag}-i`).set({ attivo: true, nome: 'Cliente QA', phone: '+390000000', email: 'qa-a1@example.com', nomeCane: `Rex ${etichetta}`, specie: 'cane', taglia: 'media', servizioId: servizio?.id ?? 'bagno', trattamento: 'Bagno', durataMin: 60, creatoIl: new Date(Date.now() - 72 * H).toISOString() })
  await db.doc(`${base}/offerteAttesa/attesa:${tag}-v:${tag}-i`).set({ token, appointmentId: `${tag}-v`, iscrittoId: `${tag}-i`, inizio: inizio.toISOString(), inviataIl: new Date(Date.now() - H).toISOString() })
  const visitePrima = (await db.collection(`${base}/appointments`).get()).size
  const caniPrima = (await db.collection(`${base}/dogs`).get()).size
  const attesaPrima = (await db.collection(`${base}/attesa`).get()).size
  const p = await pagina(slug)
  const iscr = await iscrivitiAttesaPer({ salonId, nome: 'Nuovo QA', phone: `+39333${Date.now() % 10000000}`, email: `nuovo-${etichetta}@example.com`, nomeCane: 'Fido', specie: 'cane', taglia: 'media', servizioIds: servizio ? [servizio.id] : [], consenso: true, adesso: new Date() }, db)
  const leggi = await confermaAttesaPer({ salonId, token, azione: 'leggi', adesso: new Date() }, db)
  const conf = await confermaAttesaPer({ salonId, token, azione: 'conferma', adesso: new Date() }, db)
  const visiteDopo = (await db.collection(`${base}/appointments`).get()).size
  const caniDopo = (await db.collection(`${base}/dogs`).get()).size
  const attesaDopo = (await db.collection(`${base}/attesa`).get()).size
  return { salone: email, pro, pagina: p, iscrizione: iscr, leggiOfferta: leggi, confermaOfferta: conf, visite: [visitePrima, visiteDopo], cani: [caniPrima, caniDopo], iscrittiInLista: [attesaPrima, attesaDopo] }
}
;(async () => {
  const out = [await prova('go3@test.groomly', 'go'), await prova('plus31@test.groomly', 'plus')]
  console.log(JSON.stringify(out, null, 1))
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
