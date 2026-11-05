// Flussi T7 delle lingue su emulatori di firebase.lingue.json, con Brevo finto (brevo-finto.cjs): nessuna email esce.
// Prenotazione da browser tedesco su salone italiano, con invio vero a inviaRichiesta, risposte del salone e pagine dei link.
// Uso: BREVO_FINTO_FILE=<file> node QA-tests/.qa-catalog/verify-lingue-flussi.cjs [--out=<cartella>]
process.env.TZ = 'Europe/Rome'
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8180'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require(path.resolve('node_modules/playwright'))
const db = getFirestore(); const auth = getAuth()
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d }
const OUT = path.resolve(arg('out', 'QA-tests/results/cinque-lingue/flussi')); fs.mkdirSync(OUT, { recursive: true })
const HOST = 'http://127.0.0.1:5195'; const FUNZ = 'http://127.0.0.1:5101/demo-groomly/europe-west1'
const BREVO = process.env.BREVO_FINTO_FILE
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const posta = () => (fs.existsSync(BREVO) ? fs.readFileSync(BREVO, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const SERVIZI = [['bagno', 'Bagno', 'principale'], ['taglio', 'Taglio / tosatura', 'principale'], ['unghie', 'Unghie', 'extra']]
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), g === 0 ? [] : [{ da: '09:00', a: '18:00' }]]))
const risultati = []
const esito = (nome, ok, nota = '') => { risultati.push({ nome, ok, nota }); console.log(`${ok ? 'OK ' : 'NO '} ${nome}${nota ? ' — ' + nota : ''}`) }

async function salone(nome, { linguaClienti = 'it', linguaTitolare = 'it' } = {}) {
  const email = `flussi-${nome}-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  const S = u.uid; const slug = `flussi-${nome}-${STAMP}`
  await db.doc(`accounts/${S}`).set({ uid: S, email, salonId: S, role: 'titolare', legacy: false, firstName: 'Tina', lastName: 'QA', lingua: linguaTitolare, createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${S}/settings/main`).set({ business: { salonName: 'Pelo e Coda', name: 'Pelo e Coda', phone: '+39 333 1112223', vatNumber: '01234567890', address: 'Via Roma 1, Cagliari' }, prenotazioniOnline: true, slug, linguaClienti, serviziEmail: { attesa: { modo: 'automatico' } }, orari: ORARI, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${S}/members/${S}`).set({ uid: S, email, role: 'titolare', firstName: 'Tina', lastName: 'QA', status: 'attivo' })
  await db.doc(`salons/${S}/pro/main`).set({ piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false })
  for (const [i, [id, name, kind]] of SERVIZI.entries()) await db.doc(`salons/${S}/services/${id}`).set({ id, order: i, name, kind, active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 }, createdAt: 1, updatedAt: 1 })
  await db.doc(`pubblici/${slug}`).set({ salonId: S, nome: 'Pelo e Coda' })
  return { uid: S, email, slug }
}

async function browser(b, locale) {
  const ctx = await b.newContext({ locale, viewport: { width: 320, height: 640 }, timezoneId: 'Europe/Rome' })
  await ctx.route('**/*', async (route) => {
    const r = route.request(); const u = new URL(r.url())
    if (u.hostname === '127.0.0.1') return route.continue()
    if (u.hostname.endsWith('cloudfunctions.net')) {
      const risposta = await fetch(FUNZ + u.pathname + u.search, { method: r.method(), headers: { 'content-type': 'application/json' }, body: r.postData() ?? undefined })
      return route.fulfill({ status: risposta.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: await risposta.text() })
    }
    return route.abort()
  })
  return ctx
}
module.exports = { salone, apriBrowser: browser, posta, esito, risultati, db, auth, HOST, FUNZ, OUT, STAMP, PASSWORD, chromium, fs, path }
if (require.main === module) require('./lingue-flussi-casi.cjs').main().catch((e) => { console.error(e); process.exit(1) })
