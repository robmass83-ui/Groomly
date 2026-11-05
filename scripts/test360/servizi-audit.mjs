// Accende i servizi email su parte dei saloni Plus/Salone e prova la lista d'attesa. Solo demo.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Solo emulatore')
const req = createRequire(new URL('../../functions/package.json', import.meta.url))
const { initializeApp } = req('firebase-admin/app'); const { getFirestore } = req('firebase-admin/firestore')
initializeApp({ projectId: 'demo-groomly' }); const db = getFirestore()
const report = JSON.parse(readFileSync('test-results/audit/seed-report.json', 'utf8'))
const call = async (name, data) => (await fetch(`http://127.0.0.1:5001/demo-groomly/europe-west1/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })).json()
const esiti = {}; let k = 500
for (const s of report) {
  if (s.salone % 2 === 1 && s.piano === 'go') {
    await db.doc(`salons/${s.uid}/settings/main`).set({ serviziEmail: { attesa: { modo: 'automatico' }, promemoria: { modo: 'automatico' } } }, { merge: true })
  }
  if (s.piano === 'go') { const o = await call('iscrivitiAttesa', { salonId: s.uid, consenso: true, nome: 'Go', phone: '+39 340 0000' + k++, email: `go${k}@cliente.test`, nomeCane: 'X', specie: 'cane', taglia: 'piccola', servizioIds: ['bagno'], esca: '' }); const key = 'go:' + (o.result?.errore ?? (o.error?.message || 'ok')); esiti[key] = (esiti[key] ?? 0) + 1; continue }
  const modo = s.salone % 3 === 0 ? 'manuale' : 'automatico'
  if (s.salone % 7 !== 0) await db.doc(`salons/${s.uid}/settings/main`).set({ serviziEmail: { attesa: { modo }, promemoria: { modo }, pronto: { modo: 'manuale' }, auguri: { modo }, recensione: { modo: 'manuale' }, fedelta: { modo } } }, { merge: true })
  for (let a = 0; a < 3; a++) {
    const o = await call('iscrivitiAttesa', { salonId: s.uid, consenso: true, nome: `Attesa ${k}`, phone: `+39 347 ${String(1000000 + k).slice(1)}`, email: `attesa${k}@cliente.test`, nomeCane: ['Pallina', 'Ettore', 'Mou'][a], specie: 'cane', taglia: ['piccola', 'media', 'grande'][a], servizioIds: [s.services[a]], esca: '' }); k++
    const key = `${s.piano}:` + (o.result?.ok === false ? o.result.errore : o.error ? o.error.message : 'ok'); esiti[key] = (esiti[key] ?? 0) + 1
  }
}
console.log(esiti)
