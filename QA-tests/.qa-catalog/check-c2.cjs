// Controllo C2: campi nel cloud delle visite create dalla fixture C2. Uso: node QA-tests/.qa-catalog/check-c2.cjs <salonId> <nomeCane>
const req = require('module').createRequire(require('path').resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
const iso = (v) => (v == null ? null : typeof v === 'number' ? new Date(v).toISOString() : v.toDate ? v.toDate().toISOString() : String(v))
;(async () => {
  const [salonId, nome] = process.argv.slice(2); const p = nome.toLowerCase().replace(/\W+/g, '')
  const all = await db.collection(`salons/${salonId}/appointments`).get()
  const out = {}
  for (const d of all.docs.filter((x) => x.id.startsWith(p + '-'))) {
    const v = d.data()
    out[d.id] = { status: v.status, assigneeUid: v.assigneeUid ?? null, kind: v.kind ?? null, chiusoIl: iso(v.chiusoIl), total: v.total ?? null, cancelReason: v.cancelReason ?? null }
  }
  console.log(JSON.stringify(out, null, 1))
})()
