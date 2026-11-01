// Fixture C1 (solo emulatore): crea nel salone del ruolo un cane con 1 visita chiusa, 1 da chiudere, 2 future, e opzionale 1 visita ospite da chiudere.
// Uso: node QA-tests/.qa-catalog/fixture-c1.cjs <email-titolare> <nomeCane>   → stampa JSON con salonId, dogId, visitIds, conteggi
const req = require('module').createRequire(require('path').resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
;(async () => {
  const [email, nome] = process.argv.slice(2)
  const uid = (await getAuth().getUserByEmail(email)).uid
  const salonId = (await db.doc(`accounts/${uid}`).get()).data().salonId
  const now = Date.now(), H = 3600000, t = (n) => `${nome.toLowerCase().replace(/\W+/g, '')}-${n}`
  const dogId = t('dog')
  await db.doc(`salons/${salonId}/dogs/${dogId}`).set({ id: dogId, name: nome, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: nome.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6 })
  const svc = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
  const mk = (id, start, status, extra = {}) => db.doc(`salons/${salonId}/appointments/${id}`).set({ id, dogId, start, end: start + 1800000, services: svc, status, kind: 'pelosetto', createdAt: now - 864e6, updatedAt: now - 864e6, ...extra })
  await mk(t('chiusa'), now - 240 * H, 'completato', { total: 20, paymentMethod: 'pos', chiusoIl: now - 240 * H })
  await mk(t('dachiudere'), now - 26 * H, 'programmato')
  await mk(t('futura1'), now + 72 * H, 'programmato')
  await mk(t('futura2'), now + 216 * H, 'programmato')
  await db.doc(`salons/${salonId}/appointments/${t('ospite')}`).set({ id: t('ospite'), dogId: '', ospiteNome: `Ospite ${nome}`, start: now - 28 * H, end: now - 27 * H, services: svc, status: 'programmato', kind: 'pelosetto', createdAt: now - 864e6, updatedAt: now - 864e6 })
  const all = await db.collection(`salons/${salonId}/appointments`).get()
  console.log(JSON.stringify({ salonId, dogId, nome, visitIds: { chiusa: t('chiusa'), daChiudere: t('dachiudere'), future: [t('futura1'), t('futura2')], ospite: t('ospite') }, visiteNelSalone: all.size }))
})().catch((e) => { console.error(e); process.exit(1) })
