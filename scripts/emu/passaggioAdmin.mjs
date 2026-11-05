// Prova scripts/imposta-admin.ts sugli emulatori demo. Si ferma se non è demo.
//   npx firebase emulators:exec --only auth,firestore --config firebase.emu.json --project demo-groomly "node scripts/emu/passaggioAdmin.mjs"
import { spawnSync } from 'node:child_process'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const project = process.env.GCLOUD_PROJECT ?? 'demo-groomly'
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !project.startsWith('demo-')) {
  console.error('Mancano gli emulatori demo. Mi fermo.')
  process.exit(1)
}
initializeApp({ projectId: project })
const auth = getAuth()
const db = getFirestore()

let falliti = 0
function esito(nome, ok, dettaglio = '') {
  if (!ok) falliti += 1
  console.log(`${ok ? 'ok ' : 'NO '} ${nome}${ok ? '' : ` ${dettaglio}`}`)
}

function script(...argomenti) {
  const run = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/imposta-admin.ts', ...argomenti], {
    encoding: 'utf8',
    env: { ...process.env, GCLOUD_PROJECT: project },
  })
  return { status: run.status, testo: `${run.stdout}${run.stderr}` }
}

const esiste = async (percorso) => (await db.doc(percorso).get()).exists

const laura = await auth.createUser({ email: 'laura.masala@tiscali.it', password: 'Test1234!', emailVerified: true })
const hotmail = await auth.createUser({ email: 'masala.roberto@hotmail.it', password: 'Test1234!', emailVerified: true })
const robmass = await auth.createUser({ email: 'robmass83@gmail.com', password: 'Test1234!', emailVerified: true })
await auth.setCustomUserClaims(hotmail.uid, { altro: 1 })

await db.doc(`accounts/${laura.uid}`).set({ email: 'laura.masala@tiscali.it', salonId: laura.uid, role: 'titolare', legacy: false })
await db.doc(`accounts/${hotmail.uid}`).set({ email: 'masala.roberto@hotmail.it', salonId: laura.uid, role: 'socio', legacy: false })
await db.doc(`accounts/${hotmail.uid}/devices/tel`).set({ token: 'x' })
await db.doc(`accounts/${robmass.uid}`).set({ firstName: 'Roberto', lastName: 'M', email: 'robmass83@gmail.com', salonId: robmass.uid, role: 'titolare', legacy: false, lingua: 'it' })
await db.doc(`salons/${laura.uid}/members/${laura.uid}`).set({ uid: laura.uid, role: 'titolare', status: 'attivo' })
await db.doc(`salons/${laura.uid}/members/${hotmail.uid}`).set({ uid: hotmail.uid, role: 'socio', status: 'attivo', accessWithoutPro: true })
await db.doc(`salons/${laura.uid}/pro/main`).set({ enabled: true, seats: 3 })
await db.doc(`salons/${laura.uid}/dogs/rex`).set({ name: 'Rex' })
await db.doc(`salons/${laura.uid}/appointments/a1`).set({ assigneeUid: hotmail.uid })
await db.doc('salon/shared/dogs/vecchio').set({ name: 'Vecchio' })
await db.doc(`salons/${robmass.uid}/dogs/prova`).set({ name: 'Prova' })
await db.doc(`salons/${robmass.uid}/settings/main`).set({ business: { name: 'Troddioni' } })
await db.doc('invites/inv1').set({ salonId: robmass.uid })

const lettura = script('controlla')
esito('controlla mostra salone di prova e appuntamenti della hotmail', lettura.status === 0 && lettura.testo.includes('Troddioni') && lettura.testo.includes('"appuntamentiAssegnatiAllaHotmail": 1'), lettura.testo)

const provaClaim = script('claim', 'on', 'masala.roberto@hotmail.it')
esito('claim senza --esegui non scrive', provaClaim.status === 0 && (await auth.getUser(hotmail.uid)).customClaims?.admin === undefined, provaClaim.testo)
script('claim', 'on', 'masala.roberto@hotmail.it', '--esegui')
const conClaim = (await auth.getUser(hotmail.uid)).customClaims
esito('claim conserva gli altri claim', conClaim?.admin === true && conClaim?.altro === 1, JSON.stringify(conClaim))

const staccaPresto = script('stacca', '--esegui')
esito('stacca si ferma prima del collegamento', staccaPresto.status === 1 && await esiste(`accounts/${hotmail.uid}`), staccaPresto.testo)

const provaCollega = script('collega')
esito('collega senza --esegui non scrive', provaCollega.status === 0 && await esiste(`salons/${robmass.uid}/dogs/prova`), provaCollega.testo)

await db.doc(`salons/${robmass.uid}/members/intruso`).set({ uid: 'intruso' })
const conAltri = script('collega', '--esegui')
esito('collega si ferma se il salone di prova ha altre persone', conAltri.status === 1 && await esiste(`salons/${robmass.uid}/dogs/prova`), conAltri.testo)
await db.doc(`salons/${robmass.uid}/members/intruso`).delete()

await db.doc(`accounts/${laura.uid}`).update({ salonId: 'shared' })
const lauraAltrove = script('collega', '--esegui')
esito('collega si ferma se Laura non è sul suo salone', lauraAltrove.status === 1 && await esiste(`salons/${robmass.uid}/dogs/prova`), lauraAltrove.testo)
await db.doc(`accounts/${laura.uid}`).update({ salonId: laura.uid })

const fatto = script('collega', '--esegui')
const account = (await db.doc(`accounts/${robmass.uid}`).get()).data()
const membro = (await db.doc(`salons/${laura.uid}/members/${robmass.uid}`).get()).data()
esito('collega riesce', fatto.status === 0, fatto.testo)
esito('il salone di prova è sparito', !await esiste(`salons/${robmass.uid}/dogs/prova`) && !await esiste('invites/inv1'))
esito('l’accesso di robmass83 resta', (await auth.getUser(robmass.uid)).uid === robmass.uid)
esito('account socio del salone di Laura', account?.salonId === laura.uid && account?.role === 'socio' && account?.legacy === false && account?.firstName === 'Roberto' && account?.lingua === 'it', JSON.stringify(account))
esito('membro socio con accessWithoutPro', membro?.role === 'socio' && membro?.status === 'attivo' && membro?.accessWithoutPro === true, JSON.stringify(membro))

const ripetuto = script('collega', '--esegui')
esito('collega ripetuto non fa nulla', ripetuto.status === 0 && ripetuto.testo.includes('già a posto'), ripetuto.testo)

const senzaAccesso = script('stacca', '--esegui')
esito('stacca aspetta il primo accesso di robmass83', senzaAccesso.status === 1 && await esiste(`accounts/${hotmail.uid}`), senzaAccesso.testo)

await db.doc(`salons/${laura.uid}/members/${robmass.uid}`).update({ collegatoIl: '2020-01-01T00:00:00.000Z' })
await auth.updateUser(robmass.uid, { displayName: 'Roberto' })
const chiave = process.env.FIREBASE_AUTH_EMULATOR_HOST
await fetch(`http://${chiave}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=finta`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'robmass83@gmail.com', password: 'Test1234!', returnSecureToken: true }),
})
const staccata = script('stacca', '--esegui')
esito('stacca riesce', staccata.status === 0, staccata.testo)
esito('la hotmail non ha più account, dispositivi e membro', !await esiste(`accounts/${hotmail.uid}`) && !await esiste(`accounts/${hotmail.uid}/devices/tel`) && !await esiste(`salons/${laura.uid}/members/${hotmail.uid}`))
esito('l’accesso e il claim della hotmail restano', (await auth.getUser(hotmail.uid)).customClaims?.admin === true)

const intatti = await esiste(`salons/${laura.uid}/dogs/rex`) && await esiste(`salons/${laura.uid}/appointments/a1`) && await esiste('salon/shared/dogs/vecchio') && await esiste(`salons/${laura.uid}/pro/main`)
esito('i dati di Laura e di shared sono intatti', intatti)
esito('l’appuntamento resta assegnato com’era', (await db.doc(`salons/${laura.uid}/appointments/a1`).get()).get('assigneeUid') === hotmail.uid)

console.log(falliti === 0 ? 'Tutto come atteso.' : `${falliti} prove fallite.`)
process.exit(falliti === 0 ? 0 : 1)
