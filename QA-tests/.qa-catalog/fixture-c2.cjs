// Fixture C2 (solo emulatore): nel salone del titolare crea un cane con 4 visite di ieri «da chiudere», tutte assegnate al collaboratore.
// Uso: node QA-tests/.qa-catalog/fixture-c2.cjs <email-titolare> <email-collaboratore> <nomeCane>  → JSON con salonId, ownerUid, assigneeUid, dogId, visitIds
const req = require('module').createRequire(require('path').resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
;(async () => {
  const [emailTitolare, emailCollab, nome] = process.argv.slice(2)
  const ownerUid = (await getAuth().getUserByEmail(emailTitolare)).uid
  const assigneeUid = (await getAuth().getUserByEmail(emailCollab)).uid
  const salonId = (await db.doc(`accounts/${ownerUid}`).get()).data().salonId
  const now = Date.now(), H = 3600000, t = (n) => `${nome.toLowerCase().replace(/\W+/g, '')}-${n}`
  const dogId = t('dog')
  await db.doc(`salons/${salonId}/dogs/${dogId}`).set({ id: dogId, name: nome, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: nome.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6 })
  const svc = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 37 }]
  const ids = { completato: t('completato'), salvaCompleta: t('salvacompleta'), nonVenuto: t('nonvenuto'), disdetto: t('disdetto') }
  let i = 0
  for (const id of Object.values(ids)) {
    const start = now - (30 - i++) * H
    await db.doc(`salons/${salonId}/appointments/${id}`).set({ id, dogId, start, end: start + 1800000, services: svc, status: 'programmato', kind: 'pelosetto', assigneeUid, createdAt: now - 864e6, updatedAt: now - 864e6 })
  }
  console.log(JSON.stringify({ salonId, ownerUid, assigneeUid, dogId, nome, visitIds: ids }))
})().catch((e) => { console.error(e); process.exit(1) })
