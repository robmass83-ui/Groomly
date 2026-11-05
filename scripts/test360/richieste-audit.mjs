// Prenotazioni online e lista d'attesa vere, via le funzioni dell'emulatore. Solo demo-groomly.
import { readFileSync, writeFileSync } from 'node:fs'
if (!process.env.FIRESTORE_EMULATOR_HOST || !(process.env.GCLOUD_PROJECT ?? 'demo-groomly').startsWith('demo-')) throw new Error('Solo emulatore')
const base = 'http://127.0.0.1:5001/demo-groomly/europe-west1'
const report = JSON.parse(readFileSync('test-results/audit/seed-report.json', 'utf8'))
const call = async (name, data) => (await fetch(`${base}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })).json()
const giorno = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10) }
const esiti = []
let k = 0
for (const s of report.filter((x) => x.piano !== 'go' || x.salone <= 3)) {
  for (let r = 0; r < 4; r++) {
    k++
    let g = null, ora = null
    for (let n = 2 + r * 2; n < 20 && !ora; n++) {
      const res = await call('postiLiberi', { salonId: s.uid, giorno: giorno(n), durataMin: 60 })
      if (res.result?.orari?.length) { g = giorno(n); ora = res.result.orari[0] }
    }
    const servizi = [s.services[r % 3]]
    const out = ora
      ? await call('inviaRichiesta', { salonId: s.uid, consenso: true, email: `cliente${k}@cliente.test`, phone: `+39 333 ${String(1000000 + k).slice(1)}`, nome: `Cliente ${k}`, cane: ['Briciola', 'Fuffy', 'Rambo', 'Zara'][r], taglia: ['piccola', 'media', 'grande', 'media'][r], specie: 'cane', razza: 'Meticcio', servizi, giorno: g, ora, inizio: '', fine: '', esca: '' })
      : { nessunOrario: true }
    esiti.push({ salone: s.salone, piano: s.piano, tipo: 'richiesta', g, ora, out })
  }
  for (let a = 0; a < 2; a++) {
    k++
    const out = await call('iscrivitiAttesa', { salonId: s.uid, consenso: true, nome: `Attesa ${k}`, phone: `+39 347 ${String(1000000 + k).slice(1)}`, email: `attesa${k}@cliente.test`, nomeCane: 'Pallina', specie: 'cane', taglia: 'piccola', servizioIds: [s.services[0]], esca: '' })
    esiti.push({ salone: s.salone, piano: s.piano, tipo: 'attesa', out })
  }
}
writeFileSync('test-results/audit/richieste-report.json', JSON.stringify(esiti, null, 1))
const riass = {}
for (const e of esiti) { const key = `${e.piano}/${e.tipo}/${e.out?.error ? 'ERR:' + e.out.error.message : e.out?.nessunOrario ? 'nessun-orario' : e.out?.result?.ok === false ? 'KO:' + e.out.result.errore : 'ok'}`; riass[key] = (riass[key] ?? 0) + 1 }
console.log(JSON.stringify(riass, null, 1))
