// Non lanciarlo. Scrive il claim admin sull’uid passato, solo se IMPOSTA_ADMIN=1.
// Esempio, a mano, con le credenziali del progetto: IMPOSTA_ADMIN=1 npx tsx scripts/imposta-admin.ts UID
if (process.env.IMPOSTA_ADMIN !== '1') {
  console.log('Non eseguito. Lo script resta spento finché non lo lanci a mano con IMPOSTA_ADMIN=1.')
  process.exit(0)
}

const uid = process.argv[2] ?? ''
if (uid === '' || uid === 'shared' || uid.includes('/')) {
  console.error('Uid assente o non valido.')
  process.exit(1)
}

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')
initializeApp({ credential: applicationDefault(), projectId: 'groomly-3128b' })
await getAuth().setCustomUserClaims(uid, { admin: true })
console.log(`claim admin scritto per ${uid}`)
