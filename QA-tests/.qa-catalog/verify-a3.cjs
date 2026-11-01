// Verifica A3 (solo emulatore): postiLiberiPer compilata su un salone con prenotazioni online,
// prima e dopo aver messo un impegno / un promemoria / un impegno che non blocca / un impegno senza fine.
// Uso: node QA-tests/.qa-catalog/verify-a3.cjs <email-titolare>  (dopo `cd functions && npx tsc`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
const { postiLiberiPer } = req('./lib/functions/src/piano/postiLiberi.js')
const { istanteRoma } = req('./lib/src/lib/disponibilita.js')
;(async () => {
  const email = process.argv[2] || 'salone56@test.groomly'
  const uid = (await getAuth().getUserByEmail(email)).uid
  const salonId = (await db.doc(`accounts/${uid}`).get()).data().salonId
  const col = db.collection(`salons/${salonId}/appointments`)
  let giorno = '', base = []
  for (let d = 8; d < 30 && base.length < 4; d++) {
    const g = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
    const r = await postiLiberiPer(salonId, g, 30).catch((e) => ({ orari: [], errore: e.message }))
    if (r.errore) { console.log('postiLiberi:', r.errore); process.exit(1) }
    if (r.orari.length >= 4) { giorno = g; base = r.orari }
  }
  const ora = base[Math.floor(base.length / 2)]
  const start = istanteRoma(giorno, ora).getTime()
  const id = 'qa-a3-impegno'
  const prova = async (nome, doc) => {
    if (doc) await col.doc(id).set({ id, kind: 'personale', title: 'QA A3', start, createdAt: Date.now(), updatedAt: Date.now(), ...doc })
    else await col.doc(id).delete()
    const { orari } = await postiLiberiPer(salonId, giorno, 30)
    return { caso: nome, [ora]: orari.includes(ora) ? 'offerta' : 'NON offerta', orariTolti: base.filter((o) => !orari.includes(o)) }
  }
  const out = { salone: email, giorno, ora, orariPrima: base.length, casi: [
    await prova('impegno con fine (+90 min)', { plannedEnd: start + 90 * 60000 }),
    await prova('impegno vecchio senza fine', {}),
    await prova('promemoria', { promemoria: true }),
    await prova('impegno con interruttore spento', { plannedEnd: start + 90 * 60000, bloccaOnline: false }),
    await prova('nessun impegno', null),
  ] }
  console.log(JSON.stringify(out, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
