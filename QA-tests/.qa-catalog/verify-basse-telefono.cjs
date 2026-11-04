// Verifica sul telefono virtuale delle basse «Telefono» (Task 4 del piano 2026-11-03-basse-telefono).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099), APK di prova con build emu e cleartext temporaneo (memoria test-apk-emulatore-android).
// Usa gli helper locali (non versionati) di test-results/audit/android/phone.cjs: CDP per leggere la WebView, adb input per i tocchi veri.
// T1 avvio a freddo: nessun «reading 'triggerEvent'» nel logcat.
// T2 Galleria → Aggiungi → «Scegli dalla galleria» con permesso fotocamera revocato: si apre il selettore, nessun dialogo del permesso.
// T3 «Scatta foto» → dialogo del permesso → «Non consentire» → «Permesso foto negato».
// T4 «Scatta foto» → consenti → si apre la fotocamera; tornando indietro nessun avviso.
// T5 Account → «Cambia logo»: selettore senza dialogo del permesso.
// Uso: node QA-tests/.qa-catalog/verify-basse-telefono.cjs   (screenshot in QA-tests/results/basse-telefono/)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const db = req('firebase-admin/firestore').getFirestore(); const auth = req('firebase-admin/auth').getAuth()
const P0 = require(process.env.GROOMLY_PHONE || 'D:/Groomly/test-results/audit/android/phone.cjs')

const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const PKG = 'it.groomly.app'
const SHOTS = path.resolve('QA-tests/results/basse-telefono')
fs.mkdirSync(SHOTS, { recursive: true })
const shot = (n) => fs.writeFileSync(path.join(SHOTS, n + '.png'), P0.adb('exec-out', 'screencap', '-p'))
const focus = () => (P0.sh('dumpsys window | grep mCurrentFocus') || '').trim()
const esiti = []
const esito = (nome, ok, nota) => { esiti.push({ nome, ok, nota }); console.log(`${ok ? 'OK ' : 'NO '} ${nome}${nota ? ' — ' + nota : ''}`) }

async function preparaAccount() {
  const email = `telefono-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: 'Telefono', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nome = `Salone Telefono ${STAMP}`
  await db.doc(`salons/${u.uid}/settings/main`).set({ business: { salonName: nome, name: nome, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${u.uid}/pro/main`).set({ piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true })
  const now = Date.now()
  const dogId = 'telefono-fido'
  await db.doc(`salons/${u.uid}/dogs/${dogId}`).set({ id: dogId, name: 'Fido Telefono', species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, gallery: [], createdAt: now, updatedAt: now })
  return { email, dogId }
}

async function avviaFreddo() {
  P0.sh(`am force-stop ${PKG}`)
  P0.adb('logcat', '-c')
  P0.sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`)
  await P0.wait(9000)
}

async function vai(P, percorso, atteso) {
  for (let giro = 0; giro < 4; giro++) {
    await P.ev(`history.pushState({}, '', '${percorso}'); dispatchEvent(new PopStateEvent('popstate')); 1`)
    for (let i = 0; i < 8; i++) { if (await P.has(atteso)) return; await P0.wait(1000) }
  }
  throw new Error(`pagina ${percorso} non raggiunta`)
}

const permessoInVista = () => /permissioncontroller|GrantPermissions/i.test(focus())

async function main() {
  const { email, dogId } = await preparaAccount()
  P0.sh(`pm revoke ${PKG} android.permission.CAMERA`)
  P0.sh(`pm clear-permission-flags ${PKG} android.permission.CAMERA user-set user-fixed`)

  await avviaFreddo()
  const log = P0.adb('logcat', '-d').toString()
  esito('T1 avvio senza errore triggerEvent', !/reading 'triggerEvent'/.test(log))
  shot('t1-avvio')

  let P = await P0.connect()
  for (let i = 0; i < 20 && !(await P.has('Email')) && /login/.test(await P.url()); i++) await P0.wait(1000)
  if (await P.has('Email')) {
    await P.type('Email', email)
    await P.type('Password', PASSWORD); await P.hideKb()
    await P.tap('re:^Entra$', 3000)
    for (let i = 0; i < 20 && /login/.test(await P.url()); i++) await P0.wait(1000)
  }
  await vai(P, `/animali/${dogId}`, 'Fido Telefono'); await P0.wait(1500)
  shot('t2a-scheda')

  await P.tap('re:^Aggiungi$', 1500)
  shot('t2b-scelta')
  const scelta = (await P.has('Scatta foto')) && (await P.has('Scegli dalla galleria'))
  await P.tap('Scegli dalla galleria', 3000)
  shot('t2c-galleria')
  esito('T2 galleria senza permesso fotocamera', scelta && !permessoInVista(), focus())
  await P.back(); await P0.wait(1500)

  await vai(P, '/impostazioni/account', 'Info personali')
  await P.tap('Info personali', 2000)
  await P.tap('Cambia logo', 3000)
  shot('t5-logo')
  esito('T5 logo senza permesso fotocamera', !permessoInVista() && !/groomly/i.test(focus()), focus())
  await P.back(); await P0.wait(1500)
  await vai(P, `/animali/${dogId}`, 'Fido Telefono'); await P0.wait(1500)

  // L'avviso dura poco: un osservatore lo registra appena compare.
  await P.ev(`window.__avvisi = 0; new MutationObserver(() => { if (/Permesso foto negato/.test(document.body.innerText)) window.__avvisi++ }).observe(document.body, { childList: true, subtree: true, characterData: true }); 1`)
  await P.tap('re:^Aggiungi$', 1500)
  await P.tap('Scatta foto', 3000)
  shot('t3a-permesso')
  const chiesto = permessoInVista()
  await P0.tap(/^(Non consentire|Don.t allow)$/i, { wait: 2500 })
  shot('t3b-negato')
  const avvisi = await P.ev('window.__avvisi')
  esito('T3 Scatta foto chiede il permesso; rifiutato → avviso', chiesto && avvisi > 0, chiesto ? '' : focus())
  await P0.wait(4000)

  await P.tap('re:^Aggiungi$', 1500)
  await P.tap('Scatta foto', 3000)
  if (permessoInVista()) await P0.tap(/^(Mentre usi l.app|While using the app)$/i, { wait: 4000 })
  await P.ev('window.__avvisi = 0; 1')
  shot('t4a-fotocamera')
  const fotocamera = /camera/i.test(focus()) && !/groomly/i.test(focus())
  const f4 = focus()
  await P.back(); await P0.wait(2500)
  const dopo = await P.ev('window.__avvisi')
  esito('T4 consentito → fotocamera; annullata → nessun avviso', fotocamera && dopo === 0, f4)

  await P.back()
  P.close()

  const ko = esiti.filter((e) => !e.ok)
  console.log(`\n${esiti.length - ko.length}/${esiti.length} ok`)
  process.exit(ko.length ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
