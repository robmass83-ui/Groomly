// Verifica medie «Account e profilo», audit 27-30 (solo emulatore demo-groomly; Task 7 del piano 2026-11-03-medie-account-profilo).
// App Vite in modo emu su 127.0.0.1:5173. Account e salone nuovi a ogni giro (firebase-admin).
// Le callable dell'indirizzo (:5001) si eseguono con .run() sulle funzioni compilate; Google Places è finto (fetch sostituito qui).
// Misure a 320, 360 e 390 px (scrollWidth <= clientWidth, nessuno scorrimento orizzontale), screenshot in QA-tests/results/account-profilo/.
// P1 salone esistente senza paese → Italia, «Partita IVA» e codice fiscale; Francia → «Numero IVA (Numéro de TVA)», niente codice fiscale,
//    la P. IVA italiana già salvata (IT12345678901, valida per IT) resta nel campo con l'errore; FR12345678901 salvata con paese FR; «123» rifiutato con l'esempio; Spagna → NIF / CIF.
// P2 indirizzo da suggerimento francese: paese proposto FR se non scelto a mano; con paese IT scelto a mano resta IT.
// E1 email cambiata e verificata (admin) → al nuovo accesso accounts/<uid>.email allineata.
// A1 cambio password con la password attuale sbagliata → «Password sbagliata». A2 nome toelettatura vuoto → «Campo obbligatorio», nulla salvato.
// R1 registrazione: link a privacy e termini aprono le pagine del sito, la casella resta vuota.
// L1 in inglese: html[lang=en], incassi con giorni e mesi inglesi, esportazione in inglese, Gestione listino senza italiano, ripristino con REPLACE.
// Uso: node QA-tests/.qa-catalog/verify-account-profilo.cjs [--keep] [--solo=P1,L1]
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
process.env.PLACES_API_KEY = 'chiave-finta-qa'
delete process.env.FUNCTIONS_EMULATOR

// Google Places finto: un indirizzo a Parigi.
const fetchVero = globalThis.fetch
globalThis.fetch = async (url, init) => {
  const u = String(url)
  if (u.includes('places.googleapis.com') && u.includes('places:autocomplete')) {
    return new Response(JSON.stringify({ suggestions: [{ placePrediction: { placeId: 'qa-parigi', structuredFormat: { mainText: { text: '10 Rue de Rivoli' }, secondaryText: { text: 'Paris, France' } } } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (u.includes('places.googleapis.com/v1/places/')) {
    return new Response(JSON.stringify({ formattedAddress: '10 Rue de Rivoli, 75004 Paris, France', addressComponents: [{ types: ['locality'], shortText: 'Paris' }, { types: ['country', 'political'], shortText: 'FR' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return fetchVero(url, init)
}

const callable = req('./lib/functions/src/index.js')
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const KEEP = process.argv.includes('--keep')
const SOLO = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean)
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/account-profilo')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '08:00', a: '20:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
]

const creati = []
const em = (nome) => `qa-ap-${nome}-${STAMP}@test.groomly`
async function utente(nome, { business = {}, pro = SALONE } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} AP ${STAMP}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223', vatNumber: '', taxCode: '', address: '', ...business }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
  })
  if (pro) await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  for (const s of SERVIZI) await db.doc(`salons/${u.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  return { uid: u.uid, email, nome }
}
const business = async (uid) => ((await db.doc(`salons/${uid}/settings/main`).get()).data() || {}).business || {}

const esiti = []
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s))) return
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

// ——— browser ———
const errori = []
const esterni = []
function uidDalToken(header) {
  const token = String(header || '').replace(/^Bearer\s+/i, '')
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).user_id || null } catch { return null }
}
async function apri(browser, persona, { lingua = 'it', email = persona.email } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript((l) => { try { localStorage.setItem('groomly.lingua', l) } catch { /* niente */ } }, lingua)
  // Le callable si eseguono con .run() sulle funzioni compilate, come farebbe il server.
  await ctx.route('http://127.0.0.1:5001/**', async (route) => {
    const nome = route.request().url().split('/').pop().split('?')[0]
    const fn = callable[nome]
    if (!fn || typeof fn.run !== 'function') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
    let corpo = {}
    try { corpo = JSON.parse(route.request().postData() || '{}') } catch { /* vuoto */ }
    const uid = uidDalToken(route.request().headers().authorization)
    try {
      const result = await fn.run({ data: corpo.data || {}, auth: uid ? { uid, token: {} } : undefined, rawRequest: {} })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result }) })
    } catch (e) {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { status: 'INTERNAL', message: String(e.message) } }) })
    }
  })
  ctx.on('page', (p) => esterni.push(p.url()))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  const etichette = lingua === 'en' ? { entra: 'Sign in' } : lingua === 'es' ? { entra: 'Entrar' } : { entra: 'Entra' }
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^(Password|Contraseña)$/).fill(PASSWORD)
  await page.getByRole('button', { name: etichette.entra, exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
async function misura(page, nome, locatori) {
  const out = {}
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(600)
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      righe.push({ etichetta, ...(await el.evaluate((n) => {
        let b = n
        while (b && getComputedStyle(b).display === 'inline') b = b.parentElement
        const r = b.getBoundingClientRect()
        return { sw: b.scrollWidth, cw: b.clientWidth, ok: b.scrollWidth <= b.clientWidth + 1 && r.left >= -0.5 && r.right <= window.innerWidth + 0.5 }
      })) })
    }
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out[`${v.width}px`] = { pagina, paginaOk: pagina.sw <= pagina.iw, righe }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  return { ok: Object.values(out).every((m) => m.paginaOk && m.righe.every((r) => r.ok)), out }
}
const sintesi = (m) => Object.entries(m.out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}, ` + v.righe.map((r) => r.assente ? `${r.etichetta} ASSENTE` : `${r.etichetta} ${r.sw}/${r.cw}${r.ok ? '' : ' KO'}`).join(', ')).join(' | ')

async function apriToelettatura(page) {
  await page.goto(`${APP}/impostazioni/account?scheda=personali&modifica=toelettatura`)
  const dialogo = page.getByRole('dialog', { name: 'Toelettatura' })
  await dialogo.waitFor({ timeout: 20000 })
  return dialogo
}

const ITALIANO = /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|Per giorno|completati|Appuntamenti di|Carica logo|Razze|Saluto finale|Esporta per il commercialista|Giorni lavorati|Cosa includere|Mai eseguito)\b/

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    // ——— P1 ———
    const pia = await utente('Pia', { business: { vatNumber: 'IT12345678901', taxCode: 'RSSMRA80A01H501Z' } })
    await caso('P1 salone senza paese → Italia; Francia e Spagna con i propri dati fiscali; P. IVA italiana non cancellata', async () => {
      const { ctx, page } = await apri(browser, pia)
      try {
        let d = await apriToelettatura(page)
        const paese = d.getByLabel('Paese')
        const iniziale = await paese.inputValue()
        const ivaIt = await d.getByLabel('Partita IVA', { exact: true }).count()
        const cfIt = await d.getByLabel('Codice fiscale').count()
        await paese.selectOption('FR')
        const campoFr = d.getByLabel('Numero IVA (Numéro de TVA)')
        await campoFr.waitFor({ timeout: 5000 })
        const valoreRimasto = await campoFr.inputValue()
        const cfFr = await d.getByLabel('Codice fiscale').count()
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(800)
        const erroreSalvato = await d.getByText(/Formato non valido\. Esempio: FR/).count()
        const prima = await business(pia.uid)
        const mm = await misura(page, 'p1-francia', [['dialogo', d], ['paese', paese], ['iva', campoFr]])
        await campoFr.fill('FR12345678901')
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(2500)
        const dopo = await business(pia.uid)
        await page.screenshot({ path: path.join(SHOTS, 'p1-dopo-salva.png') })
        d = await apriToelettatura(page)
        await page.screenshot({ path: path.join(SHOTS, 'p1-riaperto.png') })
        await d.getByLabel('Numero IVA (Numéro de TVA)').fill('123')
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(800)
        const errore123 = await d.getByText(/Formato non valido\. Esempio: FR\d+/).count()
        const dopo123 = await business(pia.uid)
        await d.getByLabel('Paese').selectOption('ES')
        const nif = await d.getByLabel('Numero IVA (NIF / CIF)').count()
        await page.screenshot({ path: path.join(SHOTS, 'p1-spagna.png') })
        atteso(iniziale === 'IT' && ivaIt === 1 && cfIt === 1, 'Italia iniziale con Partita IVA e codice fiscale', { iniziale, ivaIt, cfIt })
        atteso(valoreRimasto === 'IT12345678901' && cfFr === 0, 'Francia: valore italiano rimasto e niente codice fiscale', { valoreRimasto, cfFr })
        atteso(erroreSalvato >= 1 && prima.paese === undefined, 'Francia con P. IVA italiana: errore e nulla salvato', { erroreSalvato, paese: prima.paese })
        atteso(dopo.paese === 'FR' && dopo.paeseScelto === true && /^(FR)?12345678901$/.test(dopo.vatNumber), 'FR12345678901 salvata con paese FR', dopo)
        atteso(errore123 >= 1 && dopo123.vatNumber === dopo.vatNumber, '«123» rifiutato e non salvato', { errore123, vat: dopo123.vatNumber })
        atteso(nif === 1, 'Spagna con NIF / CIF', { nif })
        atteso(mm.ok, 'misura', mm.out)
        return `iniziale ${iniziale}; FR: «${valoreRimasto}» resta con errore; salvato ${JSON.stringify({ paese: dopo.paese, paeseScelto: dopo.paeseScelto, vatNumber: dopo.vatNumber })}; 123 rifiutato; ES → NIF / CIF || ${sintesi(mm)}`
      } finally { await ctx.close() }
    })

    // ——— P2 ———
    const leo = await utente('Leo')
    const ivo = await utente('Ivo', { business: { paese: 'IT', paeseScelto: true } })
    async function scegliParigi(d) {
      const campo = d.getByRole('combobox', { name: 'Indirizzo' })
      await campo.click()
      await campo.pressSequentially('Rue de Rivoli', { delay: 40 })
      const voce = d.getByRole('option', { name: /10 Rue de Rivoli/ })
      await voce.waitFor({ timeout: 15000 })
      await voce.click()
      await d.getByText('10 Rue de Rivoli, 75004 Paris, France').or(d.locator('input[value="10 Rue de Rivoli, 75004 Paris, France"]')).first().waitFor({ timeout: 15000 })
    }
    await caso('P2 indirizzo francese: paese proposto FR se non scelto a mano, IT scelto a mano resta', async () => {
      const a = await apri(browser, leo)
      let paeseLeo; let salvatoLeo
      try {
        const d = await apriToelettatura(a.page)
        await scegliParigi(d)
        paeseLeo = await d.getByLabel('Paese').inputValue()
        await a.page.screenshot({ path: path.join(SHOTS, 'p2-indirizzo-francese.png') })
        await d.getByRole('button', { name: 'Salva' }).click()
        await a.page.waitForTimeout(2500)
        salvatoLeo = await business(leo.uid)
      } finally { await a.ctx.close() }
      const b = await apri(browser, ivo)
      let paeseIvo; let salvatoIvo
      try {
        const d = await apriToelettatura(b.page)
        await scegliParigi(d)
        paeseIvo = await d.getByLabel('Paese').inputValue()
        await d.getByRole('button', { name: 'Salva' }).click()
        await b.page.waitForTimeout(2500)
        salvatoIvo = await business(ivo.uid)
      } finally { await b.ctx.close() }
      atteso(paeseLeo === 'FR' && salvatoLeo.paese === 'FR' && salvatoLeo.placeId === 'qa-parigi', 'paese non scelto: FR dall\'indirizzo', { paeseLeo, salvatoLeo })
      atteso(paeseIvo === 'IT' && salvatoIvo.paese === 'IT', 'paese scelto a mano: resta IT', { paeseIvo, salvatoIvo })
      return `Leo: proposto ${paeseLeo}, salvato ${salvatoLeo.paese} (${salvatoLeo.address}); Ivo (IT scelto): ${paeseIvo}, salvato ${salvatoIvo.paese}`
    })

    // ——— E1 ———
    const eva = await utente('Eva')
    await caso('E1 email cambiata e verificata → accounts/<uid>.email allineata al nuovo accesso', async () => {
      const nuova = em('eva-nuova')
      await auth.updateUser(eva.uid, { email: nuova, emailVerified: true })
      const prima = (await db.doc(`accounts/${eva.uid}`).get()).data().email
      const { ctx } = await apri(browser, eva, { email: nuova })
      await new Promise((r) => setTimeout(r, 2500))
      await ctx.close()
      const dopo = (await db.doc(`accounts/${eva.uid}`).get()).data().email
      atteso(prima === eva.email && dopo === nuova, 'email dell\'account non allineata', { prima, dopo, nuova })
      return `prima ${prima}, dopo ${dopo}`
    })

    // ——— A1 + A2 ———
    const ada = await utente('Ada')
    await caso('A1 password attuale sbagliata → «Password sbagliata»; A2 nome toelettatura vuoto → «Campo obbligatorio»', async () => {
      const { ctx, page } = await apri(browser, ada)
      try {
        await page.goto(`${APP}/impostazioni/account?scheda=sicurezza`)
        await page.getByRole('button', { name: /^Password/ }).first().click()
        const d = page.getByRole('dialog', { name: 'Password' })
        await d.waitFor({ timeout: 10000 })
        await d.getByLabel('Password attuale').fill('sbagliata-qa')
        await d.getByLabel('Password nuova').fill('NuovaPass1!')
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.getByText('Password sbagliata').first().waitFor({ timeout: 15000 })
        const grezzo = await page.getByText(/Firebase|auth\//).count()
        await page.screenshot({ path: path.join(SHOTS, 'a1-password-sbagliata.png') })
        await page.keyboard.press('Escape')
        const t = await apriToelettatura(page)
        const prima = await business(ada.uid)
        await t.getByLabel('Nome toelettatura').fill('   ')
        await t.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(1000)
        const obbligatorio = await t.getByText('Campo obbligatorio').count()
        const mm = await misura(page, 'a2-campo-obbligatorio', [['dialogo', t]])
        const dopo = await business(ada.uid)
        atteso(grezzo === 0, 'testo grezzo di Firebase a schermo', { grezzo })
        atteso(obbligatorio === 1 && dopo.salonName === prima.salonName, 'nome vuoto salvato o senza errore', { obbligatorio, prima: prima.salonName, dopo: dopo.salonName })
        atteso(mm.ok, 'misura', mm.out)
        return `toast «Password sbagliata», nessun testo Firebase; nome vuoto: «Campo obbligatorio», salonName resta «${dopo.salonName}» || ${sintesi(mm)}`
      } finally { await ctx.close() }
    })

    // ——— R1 ———
    await caso('R1 registrazione: privacy e termini si aprono, la casella resta vuota', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
      const aperti = []
      ctx.on('page', (p) => aperti.push(p))
      const page = await ctx.newPage()
      try {
        await page.goto(`${APP}/login`)
        await page.getByRole('button', { name: 'Non hai un account? Crea account' }).click()
        const casella = page.getByRole('checkbox', { name: 'Accetto privacy e termini' })
        await page.getByRole('button', { name: 'l’informativa privacy' }).click()
        await page.getByRole('button', { name: 'i termini d’uso' }).click()
        await page.waitForTimeout(1500)
        const url = aperti.map((p) => p.url())
        const spuntata = await casella.isChecked()
        const mm = await misura(page, 'r1-registrazione', [['casella', page.locator('label', { has: casella }).locator('..')]])
        atteso(url.some((u) => u.includes('groomlyapp.it/privacy')) && url.some((u) => u.includes('groomlyapp.it/termini')), 'pagine non aperte', url)
        atteso(!spuntata, 'casella spuntata dai link', { spuntata })
        atteso(mm.ok, 'misura', mm.out)
        return `aperte ${url.join(', ')}; casella vuota || ${sintesi(mm)}`
      } finally { await ctx.close() }
    })

    // ——— L1 ———
    const ben = await utente('Ben')
    const oggi = new Date()
    for (const [i, giorni] of [[1, 0], [2, -1], [3, -40]]) {
      const g = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + giorni, 9 + i)
      await db.doc(`salons/${ben.uid}/dogs/qa-ap-cane-${STAMP}`).set({ id: `qa-ap-cane-${STAMP}`, name: 'Rex QA', species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'QA', phone: '+39 333 0000000' }, contacts: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: 'rex qa', createdAt: Date.now() - 864e7, updatedAt: Date.now() - 864e7 })
      await db.doc(`salons/${ben.uid}/appointments/qa-ap-v${i}-${STAMP}`).set({ id: `qa-ap-v${i}-${STAMP}`, dogId: `qa-ap-cane-${STAMP}`, kind: 'pelosetto', start: g.getTime(), end: g.getTime() + 1800000, services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }], status: i === 3 ? 'non_venuto' : 'completato', total: 20, paymentMethod: 'contanti', chiusoIl: g.getTime() + 1800000, createdAt: g.getTime(), updatedAt: g.getTime() })
    }
    await caso('L1 in inglese: html lang, incassi, esportazione, Gestione listino, ripristino con REPLACE', async () => {
      const { ctx, page } = await apri(browser, ben, { lingua: 'en' })
      try {
        const lang = await page.evaluate(() => document.documentElement.lang)
        const leggi = async () => page.evaluate(() => document.body.innerText)
        await page.goto(`${APP}/incassi?periodo=settimana`)
        await page.getByText(/By day|Earnings/).first().waitFor({ timeout: 20000 })
        await page.waitForTimeout(1500)
        const settimana = await leggi()
        const barre = (settimana.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/gm) || []).length
        const totale = await page.getByText('€ 40').or(page.getByText('€40')).count()
        const mmInc = await misura(page, 'l1-incassi-settimana', [['pagina', page.locator('main').or(page.locator('body'))]])
        await page.goto(`${APP}/incassi?periodo=mese`)
        await page.waitForTimeout(2000)
        const mese = await leggi()
        await page.goto(`${APP}/incassi/report`)
        await page.getByRole('button', { name: 'Export' }).first().waitFor({ timeout: 20000 })
        const report = await leggi()
        await page.getByRole('button', { name: 'Export' }).first().click()
        await page.waitForTimeout(1500)
        await page.screenshot({ path: path.join(SHOTS, 'l1-dopo-export.png') })
        // Con questo piano «Export» apre l'avviso della funzione in arrivo; il foglio è coperto da ExportSheet.test.tsx.
        const foglio = page.getByRole('dialog').first()
        await foglio.waitFor({ timeout: 10000 })
        const esporta = await foglio.innerText()
        const mmExp = await misura(page, 'l1-esportazione', [['foglio', foglio]])
        await page.keyboard.press('Escape')
        await page.goto(`${APP}/listino/gestione`)
        await page.getByRole('button', { name: 'Upload logo' }).waitFor({ timeout: 20000 })
        const listino = await leggi()
        const mmLis = await misura(page, 'l1-gestione-listino', [['logo', page.getByRole('button', { name: 'Upload logo' })]])
        await page.goto(`${APP}/impostazioni`)
        await page.getByLabel('Choose a backup').waitFor({ state: 'attached', timeout: 20000 })
        const settings = (await db.doc(`salons/${ben.uid}/settings/main`).get()).data()
        await page.getByLabel('Choose a backup').setInputFiles({ name: 'groomly-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ dogs: { a: {} }, appointments: {}, services: {}, settings })) })
        const dialogo = page.getByRole('dialog', { name: 'Restore' })
        await dialogo.waitFor({ timeout: 15000 })
        const testoRipristino = await dialogo.innerText()
        const campo = dialogo.getByLabel('To replace everything')
        const bottone = dialogo.getByRole('button', { name: 'Restore', exact: true }).last()
        await campo.fill('SOSTITUISCI')
        const conItaliano = await bottone.isDisabled()
        await campo.fill('REPLACE')
        const conInglese = await bottone.isEnabled()
        await page.screenshot({ path: path.join(SHOTS, 'l1-ripristino.png') })
        const resti = { settimana: settimana.match(ITALIANO), mese: mese.match(ITALIANO), report: report.match(ITALIANO), esporta: esporta.match(ITALIANO), listino: listino.match(ITALIANO) }
        const inglese = /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(settimana) && /January|February|March|April|May|June|July|August|September|October|November|December/.test(report)
        atteso(lang === 'en', 'html lang', { lang })
        atteso(barre >= 6 && totale >= 1, 'barre dei giorni in inglese con le visite', { barre, totale, settimana: settimana.slice(0, 500) })
        atteso(Object.values(resti).every((r) => r === null), 'testo italiano a schermo', resti)
        atteso(inglese, 'giorni o mesi non in inglese', { settimana: settimana.slice(0, 400), report: report.slice(0, 300) })
        atteso(/Type REPLACE below/.test(testoRipristino) && conItaliano && conInglese, 'parola del ripristino', { testoRipristino, conItaliano, conInglese })
        atteso(mmInc.ok && mmExp.ok && mmLis.ok, 'misure', { inc: mmInc.out, exp: mmExp.out, lis: mmLis.out })
        return `lang ${lang}; ${barre} barre Mon…Sun, incassato 40; incassi/report/esportazione/listino senza italiano; ripristino: SOSTITUISCI spento, REPLACE acceso || ${sintesi(mmInc)} || ${sintesi(mmExp)} || ${sintesi(mmLis)}`
      } finally { await ctx.close() }
    })
  } finally {
    await browser.close().catch(() => {})
  }
}

async function cancellaTutti() {
  for (const uid of creati) {
    await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
    await db.doc(`accounts/${uid}`).delete().catch(() => {})
    await auth.deleteUser(uid).catch(() => {})
  }
}

;(async () => {
  try {
    await browserCasi()
  } finally {
    if (!KEEP) await cancellaTutti()
  }
  console.log(JSON.stringify({ stamp: STAMP, esiti, errori, esterni }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
