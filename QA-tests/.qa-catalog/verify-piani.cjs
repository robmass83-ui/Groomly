// Verifica medie «Piani» (audit 8, 10, 11) — solo emulatore demo-groomly, funzioni compilate.
// (a) Salone in grazia con scadeIl passata + collaboratore attivo → chiudiProveScadute → pro/main.enabled === false;
// (b) regole vere dell'emulatore: il collaboratore (SDK client autenticato) legge salons/<id>/dogs prima della chiusura
//     e riceve permission-denied dopo (dogs è protetta da canUse; il membro non ha accessWithoutPro);
// (c) omaggio Salone senza data → pro/main invariato.
// chiudiProveScadute scorre tutti i pro/main dell'emulatore: lo script fotografa la collezione prima e dopo
// ed elenca anche i documenti seminati da altri (QA) che la chiusura ha cambiato.
// Con --browser (app Vite in modo emu su 127.0.0.1:5173, viewport da telefono 390x844 e 360x800):
// titolari Salone in grazia e disdetto → la scheda «Il tuo piano» delle Impostazioni mostra titolo e dettaglio dell'avviso
// per intero (scrollWidth <= clientWidth e scrollHeight <= clientHeight su ogni riga, righe dentro la scheda, niente puntini)
// e la pagina Abbonamento mostra l'avviso (grazia con il link a Google Play, disdetto con la data);
// titolare Go che apre /impostazioni/pro → arriva su /impostazioni/abbonamento. Screenshot in QA-tests/results/piani/.
// Uso: node QA-tests/.qa-catalog/verify-piani.cjs [--browser]  (dopo `cd functions && npx tsc`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const { initializeApp, getApps } = req('firebase-admin/app')
if (!getApps().length) initializeApp({ projectId: 'demo-groomly' })
const firestoreMod = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = firestoreMod.getFirestore(); const auth = getAuth()
const { chiudiProveScadute } = req('./lib/functions/src/piano/chiudiProve.js')

const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const GIORNO = 86400000
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))

const creati = []
async function titolare(email, nome, pro) {
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  const uid = u.uid
  creati.push(uid)
  await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({
    business: { salonName: `Salone ${nome} QA`, name: `Salone ${nome} QA`, phone: '+39 333 1112223' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
  })
  if (pro) await db.doc(`salons/${uid}/pro/main`).set(pro)
  return uid
}

async function cancellaTutti() {
  for (const uid of creati) {
    await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
    await db.doc(`accounts/${uid}`).delete().catch(() => {})
    await auth.deleteUser(uid).catch(() => {})
  }
}

// Piano Salone come lo scrive scriviPiano (enabled true finché vivo).
const salone = (stato, fonte, scadeIl) => ({
  piano: 'salone', stato, fonte, scadeIl, seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true,
  provaUsata: true, rinnovoAutomatico: fonte === 'play', updatedAt: '2026-10-01T00:00:00.000Z',
})

async function fotografaPro() {
  const snap = await db.collectionGroup('pro').get()
  return new Map(snap.docs.map((d) => [d.ref.path, JSON.stringify(d.data())]))
}

const esiti = []
async function caso(nome, fn) {
  try {
    const { ok, dettagli } = await fn()
    esiti.push({ caso: nome, esito: ok ? 'OK' : 'FALLITO', dettagli })
  } catch (e) {
    esiti.push({ caso: nome, esito: 'FALLITO', dettagli: { errore: e && e.message ? e.message : String(e) } })
  }
}

;(process.argv.includes('--browser') ? provaBrowser() : (async () => {
  let client = null
  try {
    const adesso = new Date()
    const graziaUid = await titolare(`qa-piani-grazia-${STAMP}@test.groomly`, 'Grazia', salone('grazia', 'play', new Date(adesso.getTime() - 2 * GIORNO).toISOString()))
    const omaggioUid = await titolare(`qa-piani-omaggio-${STAMP}@test.groomly`, 'Omaggio', salone('attivo', 'omaggio', null))
    // Collaboratore come lo registra l'app: account con salonId e ruolo, membro attivo, senza accessWithoutPro.
    const emailColl = `qa-piani-coll-${STAMP}@test.groomly`
    const coll = await auth.createUser({ email: emailColl, password: PASSWORD, emailVerified: true })
    creati.push(coll.uid)
    await db.doc(`accounts/${coll.uid}`).set({ uid: coll.uid, email: emailColl, salonId: graziaUid, role: 'collaboratore', firstName: 'Carlo', lastName: 'Collab', createdAt: '2020-01-01T00:00:00.000Z' })
    await db.doc(`salons/${graziaUid}/members/${coll.uid}`).set({ uid: coll.uid, email: emailColl, role: 'collaboratore', status: 'attivo', firstName: 'Carlo', lastName: 'Collab' })
    await db.doc(`salons/${graziaUid}/dogs/qa-piani-cane`).set({ name: 'Briciola', species: 'cane', status: 'attivo', contact: { name: 'Carla' } })
    const omaggioPrima = (await db.doc(`salons/${omaggioUid}/pro/main`).get()).data()

    // SDK client contro gli emulatori: la lettura passa dalle regole vere.
    const { initializeApp: initClient } = require('firebase/app')
    const { connectAuthEmulator, getAuth: getClientAuth, signInWithEmailAndPassword } = require('firebase/auth')
    const { connectFirestoreEmulator, getFirestore: getClientDb, doc, getDocFromServer, terminate } = require('firebase/firestore')
    const app = initClient({ apiKey: 'demo-key', projectId: 'demo-groomly' }, `qa-piani-${STAMP}`)
    const cAuth = getClientAuth(app); connectAuthEmulator(cAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    const cDb = getClientDb(app); connectFirestoreEmulator(cDb, '127.0.0.1', 8080)
    client = { cDb, terminate }
    await signInWithEmailAndPassword(cAuth, emailColl, PASSWORD)
    const leggiCane = () => getDocFromServer(doc(cDb, 'salons', graziaUid, 'dogs', 'qa-piani-cane'))
      .then((s) => ({ letto: s.exists(), nome: s.data()?.name }), (e) => ({ errore: e.code ?? e.message }))

    const primaLettura = await leggiCane()
    const prima = await fotografaPro()
    const chiusi = await chiudiProveScadute(new Date())
    const dopo = await fotografaPro()
    const cambiati = [...dopo.keys()].filter((p) => prima.get(p) !== dopo.get(p))
    const altri = cambiati.filter((p) => !p.startsWith(`salons/${graziaUid}/`) && !p.startsWith(`salons/${omaggioUid}/`))
      .map((p) => ({ doc: p, prima: JSON.parse(prima.get(p)), dopo: JSON.parse(dopo.get(p)) }))

    await caso('(a) Salone in grazia con data passata → chiuso', async () => {
      const d = (await db.doc(`salons/${graziaUid}/pro/main`).get()).data()
      return { ok: d.enabled === false && d.piano === 'base' && d.stato === 'scaduto', dettagli: { chiusiInTutto: chiusi, pianoDopo: { piano: d.piano, stato: d.stato, fonte: d.fonte, scadeIl: d.scadeIl, enabled: d.enabled, seats: d.seats, provaUsata: d.provaUsata, updatedAt: d.updatedAt } } }
    })

    await caso('(b) regole: il collaboratore legge dogs prima, permission-denied dopo', async () => {
      const dopoLettura = await leggiCane()
      return { ok: primaLettura.letto === true && dopoLettura.errore === 'permission-denied', dettagli: { primaDellaChiusura: primaLettura, dopoLaChiusura: dopoLettura } }
    })

    await caso('(c) omaggio Salone senza data → invariato', async () => {
      const d = (await db.doc(`salons/${omaggioUid}/pro/main`).get()).data()
      return { ok: JSON.stringify(d) === JSON.stringify(omaggioPrima) && d.enabled === true, dettagli: { invariato: JSON.stringify(d) === JSON.stringify(omaggioPrima), piano: d.piano, stato: d.stato, fonte: d.fonte, scadeIl: d.scadeIl, enabled: d.enabled } }
    })

    esiti.push({ caso: 'altri pro/main cambiati da chiudiProveScadute (dati già nell\'emulatore)', esito: 'INFO', dettagli: { quanti: altri.length, documenti: altri } })
  } finally {
    if (client) await client.terminate(client.cDb).catch(() => {})
    await cancellaTutti()
  }
  console.log(JSON.stringify(esiti, null, 1))
  const casi = esiti.filter((e) => e.esito !== 'INFO')
  const ok = casi.filter((e) => e.esito === 'OK').length
  console.log(`\n${ok}/${casi.length} OK`)
  process.exit(ok === casi.length && casi.length === 3 ? 0 : 2)
})()).catch((e) => { console.error(e); process.exit(1) })

const LARGHEZZE = [{ width: 390, height: 844 }, { width: 360, height: 800 }]
// Funzione e non costante: provaBrowser parte prima che il modulo arrivi a queste righe.
function cartellaOut() { return path.resolve('QA-tests/results/piani') }

async function entra(browser, email) {
  const page = await browser.newPage({ viewport: LARGHEZZE[0] })
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  return page
}

// Misura nel browser le due righe della scheda con l'avviso: il testo visibile, e se qualcosa esce o si taglia.
// innerText da solo non basta: restituisce il testo intero anche quando il CSS lo taglia con i puntini.
async function misuraScheda(page) {
  const scheda = page.locator('a[data-avviso-piano]')
  await scheda.first().waitFor({ timeout: 20000 })
  return scheda.first().evaluate((el) => {
    const box = el.getBoundingClientRect()
    const righe = [...el.querySelectorAll('[data-riga]')].map((r) => {
      const b = r.getBoundingClientRect()
      const cs = getComputedStyle(r)
      return {
        testo: r.innerText.replace(/\s+/g, ' ').trim(),
        intera: r.scrollWidth <= r.clientWidth && r.scrollHeight <= r.clientHeight,
        dentro: b.left >= box.left - 0.5 && b.right <= box.right + 0.5 && b.top >= box.top - 0.5 && b.bottom <= box.bottom + 0.5,
        puntini: cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap',
        larghezza: Math.round(b.width),
        altezza: Math.round(b.height),
      }
    })
    return { tipo: el.getAttribute('data-avviso-piano'), larghezzaScheda: Math.round(box.width), altezzaScheda: Math.round(box.height), nelloSchermo: box.left >= 0 && box.right <= window.innerWidth, righe }
  })
}

const schedaLeggibile = (m, attese) => m.nelloSchermo && m.righe.length === 2
  && m.righe.every((r, i) => r.testo === attese[i] && r.intera && r.dentro && !r.puntini)

async function controllaImpostazioni(page, nome, attese) {
  const misure = {}
  await page.goto('http://127.0.0.1:5173/impostazioni')
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v)
    await page.waitForTimeout(300)
    const m = await misuraScheda(page)
    misure[`${v.width}px`] = { ...m, ok: schedaLeggibile(m, attese) }
    await page.screenshot({ path: path.join(cartellaOut(), `impostazioni-${nome}-${v.width}.png`) })
  }
  await page.setViewportSize(LARGHEZZE[0])
  return { url: new URL(page.url()).pathname, attese, misure, ok: Object.values(misure).every((m) => m.ok) }
}

async function provaBrowser() {
  const fs = require('fs')
  const { chromium } = require('playwright')
  fs.mkdirSync(cartellaOut(), { recursive: true })
  const esito = {}
  let browser = null
  try {
    const emailGrazia = `qa-piani-bg-${STAMP}@test.groomly`
    const emailDisdetto = `qa-piani-bd-${STAMP}@test.groomly`
    const emailGo = `qa-piani-bgo-${STAMP}@test.groomly`
    const fineDisdetto = new Date(Date.now() + 20 * GIORNO)
    await titolare(emailGrazia, 'Grazia', salone('grazia', 'play', new Date(Date.now() + 5 * GIORNO).toISOString()))
    await titolare(emailDisdetto, 'Disdetto', salone('disdetto', 'play', fineDisdetto.toISOString()))
    await titolare(emailGo, 'Go', null)
    browser = await chromium.launch()

    // Titolare Salone in grazia: scheda leggibile in Impostazioni, avviso e link nella pagina Abbonamento.
    const p1 = await entra(browser, emailGrazia)
    esito.impostazioniGrazia = await controllaImpostazioni(p1, 'grazia', ['Pagamento non riuscito', 'Aggiorna su Google Play'])
    await p1.goto('http://127.0.0.1:5173/impostazioni/abbonamento')
    const avvisoAbb = p1.getByText('Pagamento non riuscito')
    await avvisoAbb.first().waitFor({ timeout: 20000 })
    const link = p1.getByRole('link', { name: 'Aggiorna il pagamento su Google Play' })
    esito.abbonamentoGrazia = {
      url: new URL(p1.url()).pathname,
      avviso: (await avvisoAbb.first().innerText()).replace(/\s+/g, ' '),
      link: await link.getAttribute('href').catch(() => null),
    }
    await p1.screenshot({ path: path.join(cartellaOut(), 'abbonamento-grazia.png') })
    await p1.close()

    // Titolare Salone disdetto: la data di fine si legge nella scheda e nella pagina Abbonamento.
    const breve = fineDisdetto.toLocaleDateString('it', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const lunga = fineDisdetto.toLocaleDateString('it')
    const p3 = await entra(browser, emailDisdetto)
    esito.impostazioniDisdetto = await controllaImpostazioni(p3, 'disdetto', ['Disdetto', `Attivo fino al ${breve}`])
    await p3.goto('http://127.0.0.1:5173/impostazioni/abbonamento')
    const avvisoDis = p3.getByText(/Disdetto · attivo fino al/)
    await avvisoDis.first().waitFor({ timeout: 20000 })
    esito.abbonamentoDisdetto = {
      url: new URL(p3.url()).pathname,
      avviso: (await avvisoDis.first().innerText()).replace(/\s+/g, ' '),
      attesa: `Disdetto · attivo fino al ${lunga}`,
    }
    await p3.screenshot({ path: path.join(cartellaOut(), 'abbonamento-disdetto.png') })
    await p3.close()

    // Titolare Go: /impostazioni/pro porta ad Abbonamento.
    const p2 = await entra(browser, emailGo)
    await p2.goto('http://127.0.0.1:5173/impostazioni/pro')
    await p2.waitForURL('**/impostazioni/abbonamento', { timeout: 20000 }).catch(() => {})
    await p2.waitForTimeout(800)
    esito.goSuPro = { url: new URL(p2.url()).pathname }
    await p2.screenshot({ path: path.join(cartellaOut(), 'go-pro-abbonamento.png') })
    await p2.close()

    esito.ok = esito.impostazioniGrazia.url === '/impostazioni' && esito.impostazioniGrazia.ok
      && esito.impostazioniDisdetto.url === '/impostazioni' && esito.impostazioniDisdetto.ok
      && esito.abbonamentoGrazia.url === '/impostazioni/abbonamento' && /Pagamento non riuscito/.test(esito.abbonamentoGrazia.avviso)
      && esito.abbonamentoGrazia.link === 'https://play.google.com/store/account/subscriptions'
      && esito.abbonamentoDisdetto.url === '/impostazioni/abbonamento' && esito.abbonamentoDisdetto.avviso.includes(esito.abbonamentoDisdetto.attesa)
      && esito.goSuPro.url === '/impostazioni/abbonamento'
  } catch (e) {
    esito.ok = false; esito.errore = e && e.message ? e.message.slice(0, 300) : String(e)
  } finally {
    if (browser) await browser.close().catch(() => {})
    await cancellaTutti()
  }
  console.log(JSON.stringify(esito, null, 1))
  console.log(esito.ok ? '\nbrowser OK' : '\nbrowser FALLITO')
  process.exit(esito.ok ? 0 : 2)
}
