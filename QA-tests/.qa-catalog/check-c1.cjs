// Controllo C1: stato nel cloud delle visite create dalla fixture. Uso: node QA-tests/.qa-catalog/check-c1.cjs <salonId> <nomeCane>
const req = require('module').createRequire(require('path').resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
;(async () => {
  const [salonId, nome] = process.argv.slice(2); const p = nome.toLowerCase().replace(/\W+/g, '')
  const all = await db.collection(`salons/${salonId}/appointments`).get()
  const mine = Object.fromEntries(all.docs.filter((d) => d.id.startsWith(p + '-')).map((d) => [d.id, d.data().status]))
  const dog = (await db.doc(`salons/${salonId}/dogs/${p}-dog`).get()).exists
  const incassato = all.docs.filter((d) => d.data().status === 'completato').reduce((a, d) => a + (d.data().total || 0), 0)
  const meta = (await db.doc(`salons/${salonId}/meta/deleted-dogs`).get()).data() || {}
  console.log(JSON.stringify({ visiteNelSalone: all.size, caneEsiste: dog, visiteDelCane: mine, incassatoTotale: incassato, storicoIds: (meta.storicoIds || []).filter((x) => x.startsWith(p)), appointmentIdsSegnati: (meta.appointmentIds || []).filter((x) => x.startsWith(p)) }))
})()
