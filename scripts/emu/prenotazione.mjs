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

const salonId = 'uid-prenotazione'
const senzaEmail = await chiama('inviaRichiesta', { salonId, email: '', phone: '333', nome: 'Ada', inizio: '2026-10-26T09:00:00+01:00', fine: '2026-10-26T10:00:00+01:00', esca: '' })
const esca = await chiama('inviaRichiesta', { salonId, email: 'ada@cliente.it', phone: '333', nome: 'Ada', inizio: '2026-10-26T09:00:00+01:00', fine: '2026-10-26T10:00:00+01:00', esca: 'bot' })
const prima = await chiama('inviaRichiesta', { salonId, email: 'ada@cliente.it', phone: '3334444444', nome: 'Ada', inizio: '2026-10-26T09:00:00+01:00', fine: '2026-10-26T10:00:00+01:00', esca: '' })
const id = prima.result?.id
const doc = id ? (await db.doc(`salons/${salonId}/richieste/${id}`).get()).data() : null
const sbagliato = await chiama('gestisciPrenotazione', { salonId, id, token: 'no', azione: 'accettata' })
const dopoSbagliato = id ? (await db.doc(`salons/${salonId}/richieste/${id}`).get()).data() : null
const giusto = await chiama('gestisciPrenotazione', { salonId, id, token: doc?.token, azione: 'accettata' })
const escaCount = (await db.collection(`salons/${salonId}/richieste`).where('nome', '==', 'bot').get()).size
const ok = senzaEmail.error?.message === 'Email obbligatoria'
  && esca.result?.ok === true
  && escaCount === 0
  && doc?.status === 'nuova'
  && doc?.emailStato === 'non_inviata'
  && sbagliato.result?.stato === 'nuova'
  && dopoSbagliato?.status === 'nuova'
  && giusto.result?.stato === 'accettata'
  && giusto.result?.emailStato === 'non_inviata'
  && String(giusto.result?.ics ?? '').includes('TZID=Europe/Rome:20261026T100000')
console.log(ok ? 'ok 1/1' : 'NO', JSON.stringify({ senzaEmail: senzaEmail.error ?? senzaEmail.result, esca: esca.result, stato: doc?.status, sbagliato: sbagliato.result, giusto: giusto.result }))
process.exit(ok ? 0 : 1)
