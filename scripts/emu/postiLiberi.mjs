const project = process.env.GCLOUD_PROJECT ?? 'demo-groomly'
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !project.startsWith('demo-')) {
  console.error('Emulatore demo assente. Mi fermo.')
  process.exit(1)
}
const { createRequire } = await import('node:module')
const requireFn = createRequire(new URL('../../functions/package.json', import.meta.url))
const { initializeApp } = requireFn('firebase-admin/app')
const { getFirestore } = requireFn('firebase-admin/firestore')
initializeApp({ projectId: project })
const db = getFirestore()

async function chiama(name, data) {
  const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  return response.json()
}

const salonId = 'uid-posti-liberi'
const giorno = '2026-10-26'
const blocco = (ora, status, cane) => {
  const inizio = new Date(`${giorno}T${ora}:00+01:00`)
  return { start: inizio.toISOString(), end: new Date(inizio.getTime() + 60 * 60 * 1000).toISOString(), status, dogName: cane }
}
await db.doc(`salons/${salonId}/settings/main`).set({ orari: { 1: [{ da: '09:00', a: '13:00' }] } })
await db.doc(`salons/${salonId}/appointments/preso`).set(blocco('10:00', 'programmato', 'Rex'))
await db.doc(`salons/${salonId}/appointments/libero`).set(blocco('11:00', 'disdetto', 'Fido'))
await db.doc(`salons/${salonId}/richieste/nuova`).set({ ...blocco('12:00', 'nuova', 'Luna'), scadeIl: '2026-10-26T18:00:00+01:00', phone: '3331111111' })

const letti = await chiama('postiLiberi', { salonId, giorno, durataMin: 60 })
const orari = letti.result?.orari ?? []
const testo = JSON.stringify(letti)
const esca = await chiama('preparaRichiesta', { salonId, phone: '3332222222', esca: 'sono un bot' })
const dopoEsca = await db.collection(`salons/${salonId}/richieste`).where('phone', '==', '3332222222').get()
const prima = await chiama('preparaRichiesta', { salonId, phone: '3333333333', esca: '' })
const seconda = await chiama('preparaRichiesta', { salonId, phone: '3333333333', esca: '' })
const terza = await chiama('preparaRichiesta', { salonId, phone: '3333333333', esca: '' })
const ok = Array.isArray(orari)
  && orari.includes('09:00')
  && orari.includes('11:00')
  && !orari.includes('10:00')
  && !orari.includes('12:00')
  && !testo.includes('Rex')
  && !testo.includes('Fido')
  && esca.result?.ok === true
  && dopoEsca.empty
  && prima.result?.ok === true
  && seconda.result?.ok === true
  && terza.error?.message === 'Troppe richieste'
console.log(ok ? 'ok 1/1' : 'NO', JSON.stringify({ orari, esca: esca.result ?? esca.error, terza: terza.error ?? terza.result, prima: prima.result ?? prima.error, seconda: seconda.result ?? seconda.result }))
process.exit(ok ? 0 : 1)
