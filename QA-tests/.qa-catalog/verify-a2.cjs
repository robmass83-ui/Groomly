// Verifica A2 (solo emulatore): chiama avviaProvaPer e impostaPianoManualePer compilate (functions/lib) su Firestore emulato.
// Uso: node QA-tests/.qa-catalog/verify-a2.cjs  (dopo `cd functions && npx tsc`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
const { avviaProvaPer } = req('./lib/functions/src/piano/avviaProva.js')
const { impostaPianoManualePer } = req('./lib/functions/src/piano/impostaPianoManuale.js')
const D = 86400000, iso = (ms) => new Date(Date.now() + ms).toISOString()
const OP = { operatorEmail: 'masala.roberto@hotmail.it', emailVerified: true }
async function salone(email) { const uid = (await getAuth().getUserByEmail(email)).uid; return { uid, ref: db.doc(`salons/${uid}/pro/main`) } }
async function prova(email) {
  const { uid, ref } = await salone(email)
  try { await avviaProvaPer(uid, { salonId: uid, role: 'titolare' }); return 'CONCESSA' } catch (e) { return `rifiutata: ${e.message}` }
}
const vista = (d) => d ? { piano: d.piano, stato: d.stato, fonte: d.fonte ?? null, provaUsata: d.provaUsata } : null
;(async () => {
  const out = {}
  const casi = [
    ['plus41@test.groomly', 'grazia', { piano: 'pro', stato: 'grazia', fonte: 'play', scadeIl: iso(10 * D) }],
    ['plus44@test.groomly', 'omaggio senza scadenza (vecchio, senza segno)', { piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null }],
    ['plus42@test.groomly', 'disdetto ancora valido', { piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: iso(5 * D) }],
    ['plus40@test.groomly', 'ex-Plus pagato, scaduto', { piano: 'pro', stato: 'scaduto', fonte: 'play', scadeIl: iso(-10 * D) }],
    ['go1@test.groomly', 'Go puro (nessun documento)', null],
  ]
  for (const [email, nome, doc] of casi) {
    const { ref } = await salone(email)
    if (doc) await ref.set(doc); else await ref.delete()
    const esito = await prova(email)
    out[`${nome} (${email})`] = { esito, dopo: vista((await ref.get()).data()) }
  }
  // Omaggio vecchio spento dall'operatore → niente prova da sé; l'operatore può comunque avviarla.
  const { uid: u45, ref: r45 } = await salone('plus45@test.groomly')
  await r45.set({ piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
  await impostaPianoManualePer({ ...OP, salonId: u45, azione: 'spegni-omaggio' })
  out['omaggio vecchio spento (plus45)'] = { dopoSpegni: vista((await r45.get()).data()), provaDaSe: await prova('plus45@test.groomly') }
  await impostaPianoManualePer({ ...OP, salonId: u45, azione: 'prova' })
  out['operatore avvia la prova (plus45)'] = { dopo: vista((await r45.get()).data()) }
  const { uid: u46, ref: r46 } = await salone('plus46@test.groomly')
  await r46.set({ piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null })
  await impostaPianoManualePer({ ...OP, salonId: u46, azione: 'base' })
  out['manuale vecchio riportato a Go (plus46)'] = { dopoBase: vista((await r46.get()).data()), provaDaSe: await prova('plus46@test.groomly') }
  console.log(JSON.stringify(out, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
