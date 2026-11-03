// Verifica nel browser delle basse «Validazioni» (ramo fix/basse-validazioni; Task 5 del piano 2026-11-03-basse-validazioni).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite in modo emu su 127.0.0.1:5173. Account e salone nuovi a ogni giro (firebase-admin).
// Le callable (:5001 e quelle della pagina pubblica, indirizzo di produzione) NON escono dalla macchina: si intercettano e si eseguono con .run()
// sulle funzioni compilate (functions/lib). La pagina pubblica (hosting/s/pagina.js) si serve da qui sull'origine dell'app, con ?demo=1 per gli orari.
// S1 scheda cane nuova: nascita domani, peso «1e3», telefono «abc» → errori, nulla salvato.
// S2 scheda già salvata con telefono «abc» riaperta e salvata → chiede il telefono (nulla scritto).
// S3 scheda già salvata con telefono «333» (scritto con admin) riaperta e salvata → «Telefono non valido».
// S4 Account: titolare di 81 caratteri → «Massimo 80 caratteri»; digitando se ne tengono 80; email «a@b» → rifiutata.
// S5 servizio « bagno » accanto a «Bagno» → «Esiste già il servizio Bagno», nessun doppione.
// S6 visita di domani senza «Non venuto»; visita di oggi con «Non venuto».
// S7 lista d'attesa (AttesaPage): telefono «12ab» → «Telefono non valido», non «Compila tutti i campi».
// S8 pagina pubblica: il campo nome non accetta oltre 80 caratteri; 81 forzati → messaggio client e, dal server, «Nome non valido».
// Uso: node QA-tests/.qa-catalog/verify-validazioni-browser.cjs [--keep] [--solo=S1,S8]   (dopo `npm --prefix functions run build`)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR

const callable = req('./lib/functions/src/index.js')
const { paginaPubblicaHttp } = req('./lib/functions/src/piano/paginaPubblica.js')
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const KEEP = process.argv.includes('--keep')
const DEBUG = process.argv.includes('--debug')
const SOLO = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean)
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/validazioni')
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '08:00', a: '20:00' }]]))
const PIANO = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
]

const creati = []
const em = (nome) => `qa-va-${nome}-${STAMP}@test.groomly`
async function utente(nome) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} VA ${STAMP}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223', vatNumber: '', taxCode: '', address: '', titolare: 'Titolare QA' }, orari: ORARI,
    prenotazioniOnline: true, linguaClienti: 'it',
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
  })
  await db.doc(`salons/${u.uid}/pro/main`).set(PIANO)
  for (const s of SERVIZI) await db.doc(`salons/${u.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  return { uid: u.uid, email, nome }
}
async function cane(uid, id, nome, phone) {
  await db.doc(`salons/${uid}/dogs/${id}`).set({ id, name: nome, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Proprietario QA', phone }, contacts: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: nome.toLowerCase(), createdAt: Date.now() - 864e7, updatedAt: Date.now() - 864e7 })
}
async function visita(uid, id, dogId, inizio) {
  await db.doc(`salons/${uid}/appointments/${id}`).set({ id, dogId, kind: 'pelosetto', start: inizio.getTime(), end: inizio.getTime() + 1800000, services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }], status: 'programmato', total: 20, createdAt: Date.now() - 864e5, updatedAt: Date.now() - 864e5 })
}
const dogDoc = async (uid, id) => (await db.doc(`salons/${uid}/dogs/${id}`).get()).data()

const esiti = []
let paginaCorrente = null
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s))) return
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    if (paginaCorrente) await paginaCorrente.screenshot({ path: path.join(SHOTS, 'FAIL-' + nome.slice(0, 2) + '.png') }).catch(() => {})
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
async function eseguiCallable(route, nomeFn) {
  const fn = callable[nomeFn]
  if (!fn || typeof fn.run !== 'function') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
  let corpo = {}
  try { corpo = JSON.parse(route.request().postData() || '{}') } catch { /* vuoto */ }
  const uid = uidDalToken(route.request().headers().authorization)
  try {
    const result = await fn.run({ data: corpo.data || {}, auth: uid ? { uid, token: {} } : undefined, rawRequest: { headers: {}, ip: '127.0.0.1' } })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result }) })
  } catch (e) {
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { status: e.code || 'INTERNAL', message: String(e.message) } }) })
  }
}
async function contesto(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  // Le callable si eseguono con .run() sulle funzioni compilate, come farebbe il server; nulla va in produzione.
  await ctx.route('http://127.0.0.1:5001/**', (route) => eseguiCallable(route, route.request().url().split('/').pop().split('?')[0]))
  await ctx.route('https://europe-west1-groomly-3128b.cloudfunctions.net/**', (route) => eseguiCallable(route, route.request().url().split('/').pop().split('?')[0]))
  ctx.on('page', (p) => esterni.push(p.url()))
  if (DEBUG) {
    const chiudi = ctx.close.bind(ctx)
    ctx.close = async () => {
      for (const [i, p] of ctx.pages().entries()) {
        await p.screenshot({ path: path.join(SHOTS, `debug-${Date.now()}-${i}.png`) }).catch(() => {})
        console.log('DEBUG', p.url(), JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('label')].map((l) => l.htmlFor + '|' + l.textContent)).catch(() => null)))
      }
      return chiudi()
    }
  }
  return ctx
}
async function apri(browser, persona) {
  const ctx = await contesto(browser)
  const page = await ctx.newPage()
  paginaCorrente = page
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel(/^(Password|Contraseña)$/).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
const foto = (page, nome) => page.screenshot({ path: path.join(SHOTS, `${nome}.png`) })
const testoPagina = (page) => page.evaluate(() => document.body.innerText)

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    const ugo = await utente('Ugo')
    const oggi = new Date()
    const domani = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1)

    // ——— S1 ———
    await caso('S1 scheda nuova: nascita domani, peso «1e3», telefono «abc» → errori, nulla salvato', async () => {
      const { ctx, page } = await apri(browser, ugo)
      try {
        const prima = (await db.collection(`salons/${ugo.uid}/dogs`).get()).size
        await page.goto(`${APP}/animali/nuovo`)
        await page.locator('[id="Nome"]').waitFor({ timeout: 20000 })
        await page.locator('[id="Nome"]').fill('Fido Prova')
        const proprietario = page.locator('[id="Proprietario"]')
        if (await proprietario.count()) await proprietario.fill('Mario Rossi')
        await page.locator('[id="Telefono"]').fill('abc')
        await page.getByRole('button', { name: /Altri dettagli/ }).click()
        await page.locator('[id="Anno di nascita"]').fill(String(domani.getFullYear()))
        await page.locator('[id="Peso"]').fill('1e3')
        await page.locator('[id="Giorno"]').fill(String(domani.getDate()))
        await page.locator('[id="Mese"]').fill(String(domani.getMonth() + 1))
        await page.getByRole('button', { name: 'Salva', exact: true }).click()
        await page.waitForTimeout(1200)
        const testo = await testoPagina(page)
        await foto(page, 's1-scheda-nuova-errori')
        const dopo = (await db.collection(`salons/${ugo.uid}/dogs`).get()).size
        const tel = testo.includes('Telefono non valido'); const peso = testo.includes('Peso non valido'); const data = testo.includes('Giorno o mese non validi')
        atteso(tel && peso && data, 'errori di telefono, peso e nascita futura', { tel, peso, data })
        atteso(dopo === prima, 'cane salvato nonostante gli errori', { prima, dopo })
        // Con telefono, peso e data corretti la scheda si salva (prova che il blocco era solo per quei valori).
        await page.locator('[id="Telefono"]').fill('+39 333 1234567')
        await page.locator('[id="Peso"]').fill('12,5')
        await page.locator('[id="Giorno"]').fill('1')
        await page.locator('[id="Mese"]').fill('1')
        await page.getByRole('button', { name: 'Salva', exact: true }).click()
        await page.waitForTimeout(2500)
        const finale = (await db.collection(`salons/${ugo.uid}/dogs`).get()).docs.map((d) => d.data()).filter((d) => d.name === 'Fido Prova')
        atteso(finale.length === 1 && Number(finale[0].weight ?? finale[0].weightKg) === 12.5, 'scheda corretta salvata con peso 12,5', finale.map((d) => ({ weight: d.weight, weightKg: d.weightKg })))
        return 'Telefono non valido, Peso non valido, Giorno o mese non validi; nessun cane scritto; con valori corretti (12,5 kg) si salva'
      } finally { await ctx.close() }
    })

    // ——— S2 + S3 ———
    await cane(ugo.uid, `qa-va-abc-${STAMP}`, 'Cane Abc', 'abc')
    await cane(ugo.uid, `qa-va-333-${STAMP}`, 'Cane Breve', '333')
    for (const [sigla, id, telefono] of [['S2', `qa-va-abc-${STAMP}`, 'abc'], ['S3', `qa-va-333-${STAMP}`, '333']]) {
      await caso(`${sigla} scheda già salvata con telefono «${telefono}» riaperta e salvata → chiede un telefono valido`, async () => {
        const { ctx, page } = await apri(browser, ugo)
        try {
          await page.goto(`${APP}/animali/${id}`)
          await page.getByRole('button', { name: 'Modifica', exact: true }).click()
          await page.locator('[id="Nome"]').waitFor({ timeout: 20000 })
          const mostrato = await page.locator('[id="Telefono"]').inputValue()
          await page.getByRole('button', { name: 'Salva', exact: true }).click()
          await page.waitForTimeout(1200)
          const testo = await testoPagina(page)
          await foto(page, `${sigla.toLowerCase()}-telefono-${telefono}`)
          const doc = await dogDoc(ugo.uid, id)
          atteso(mostrato === telefono, 'telefono salvato non mostrato nella scheda', { mostrato })
          atteso(testo.includes('Telefono non valido'), 'manca «Telefono non valido»', testo.slice(0, 400))
          atteso(doc.contact.phone === telefono, 'il telefono sbagliato è stato riscritto', doc.contact)
          return `riaperta con «${mostrato}», Salva → «Telefono non valido», dato nel database invariato («${doc.contact.phone}»)`
        } finally { await ctx.close() }
      })
    }

    // ——— S4 ———
    await caso('S4 Account: titolare di 81 caratteri e email «a@b» rifiutati', async () => {
      const { ctx, page } = await apri(browser, ugo)
      try {
        await page.goto(`${APP}/impostazioni/account?scheda=personali`)
        await page.getByRole('button', { name: /Nome del titolare/ }).first().click()
        const d = page.getByRole('dialog', { name: 'Nome del titolare' })
        await d.waitFor({ timeout: 10000 })
        const campo = d.getByLabel('Nome del titolare')
        await campo.fill('')
        await campo.pressSequentially('x'.repeat(90), { delay: 0 })
        const digitati = (await campo.inputValue()).length
        // Il campo ferma a 80 caratteri anche con fill(): per forzarne 81 si toglie il limite dal DOM.
        await campo.evaluate((n) => n.removeAttribute('maxlength'))
        await campo.fill('y'.repeat(81))
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(800)
        const errore = await d.getByText('Massimo 80 caratteri').count()
        await foto(page, 's4-titolare-81')
        const salvato = ((await db.doc(`salons/${ugo.uid}/settings/main`).get()).data().business || {}).titolare
        atteso(digitati === 80, 'il campo non ferma a 80 caratteri digitando', { digitati })
        atteso(errore === 1 && salvato === 'Titolare QA', 'titolare di 81 caratteri non rifiutato', { errore, salvato })
        await campo.fill('z'.repeat(80))
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(1500)
        const ottanta = ((await db.doc(`salons/${ugo.uid}/settings/main`).get()).data().business || {}).titolare
        atteso(ottanta === 'z'.repeat(80), '80 caratteri non salvati', { len: (ottanta || '').length })
        // email «a@b»
        await page.goto(`${APP}/impostazioni/account?scheda=sicurezza`)
        await page.getByRole('button', { name: /^Cambia email/ }).first().click()
        const e = page.getByRole('dialog', { name: 'Cambia email' })
        await e.waitFor({ timeout: 10000 })
        await e.getByLabel('Nuova email').fill('a@b')
        await e.getByLabel('Password attuale').fill(PASSWORD)
        await e.getByRole('button', { name: 'Salva' }).click()
        await page.getByText('Inserisci un’email valida').first().waitFor({ timeout: 8000 })
        await foto(page, 's4-email-a-at-b')
        const utenteAuth = await auth.getUser(ugo.uid)
        atteso(utenteAuth.email === ugo.email, 'email cambiata con «a@b»', { email: utenteAuth.email })
        return `digitando si fermano ${digitati} caratteri; 81 → «Massimo 80 caratteri», non salvato; 80 salvato; «a@b» → «Inserisci un’email valida», email dell'account invariata`
      } finally { await ctx.close() }
    })

    // ——— S5 ———
    await caso('S5 servizio « bagno » accanto a «Bagno» → rifiutato', async () => {
      const { ctx, page } = await apri(browser, ugo)
      try {
        await page.goto(`${APP}/impostazioni/servizi`)
        await page.getByRole('button', { name: 'Aggiungi servizio' }).click()
        const d = page.getByRole('dialog', { name: 'Nuovo servizio' })
        await d.waitFor({ timeout: 10000 })
        await d.locator('[id="Nome"]').fill(' bagno ')
        for (const t of ['piccola', 'media', 'grande']) {
          await d.getByLabel(`Durata ${t}`).fill('30')
          await d.getByLabel(`Prezzo ${t}`).fill('20')
        }
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(1200)
        const errore = await d.getByText('Esiste già il servizio Bagno').count()
        await foto(page, 's5-servizio-doppio')
        const nomi = (await db.collection(`salons/${ugo.uid}/services`).get()).docs.map((x) => x.data().name)
        atteso(errore === 1 && nomi.length === 1, 'doppione non rifiutato', { errore, nomi })
        await d.locator('[id="Nome"]').fill('Bagno speciale')
        await d.getByRole('button', { name: 'Salva' }).click()
        await page.waitForTimeout(2000)
        const dopo = (await db.collection(`salons/${ugo.uid}/services`).get()).docs.map((x) => x.data().name).sort()
        atteso(dopo.length === 2 && dopo.includes('Bagno speciale'), 'servizio con nome diverso non salvato', dopo)
        return '« bagno » → «Esiste già il servizio Bagno», un solo servizio; «Bagno speciale» si salva'
      } finally { await ctx.close() }
    })

    // ——— S6 ———
    await cane(ugo.uid, `qa-va-visite-${STAMP}`, 'Cane Visita', '+39 333 7654321')
    await visita(ugo.uid, `qa-va-domani-${STAMP}`, `qa-va-visite-${STAMP}`, new Date(domani.getFullYear(), domani.getMonth(), domani.getDate(), 10))
    await visita(ugo.uid, `qa-va-oggi-${STAMP}`, `qa-va-visite-${STAMP}`, new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 12))
    await caso('S6 visita di domani senza «Non venuto», visita di oggi con «Non venuto»', async () => {
      const { ctx, page } = await apri(browser, ugo)
      try {
        const nonVenuto = page.getByRole('button', { name: 'Non venuto', exact: true })
        await page.goto(`${APP}/appuntamenti/qa-va-domani-${STAMP}`)
        await page.getByRole('button', { name: 'Disdici' }).waitFor({ timeout: 20000 })
        await page.waitForTimeout(500)
        const domaniN = await nonVenuto.count()
        await foto(page, 's6-visita-domani')
        await page.goto(`${APP}/appuntamenti/qa-va-oggi-${STAMP}`)
        await page.getByRole('button', { name: 'Disdici' }).waitFor({ timeout: 20000 })
        await page.waitForTimeout(500)
        const oggiN = await nonVenuto.count()
        await foto(page, 's6-visita-oggi')
        atteso(domaniN === 0 && oggiN === 1, '«Non venuto» fuori posto', { domaniN, oggiN })
        return 'domani: nessun «Non venuto» (restano Disdici); oggi: «Non venuto» presente'
      } finally { await ctx.close() }
    })

    // ——— S7 ———
    await caso('S7 lista d’attesa: telefono «12ab» → «Telefono non valido», non «Compila tutti i campi»', async () => {
      const { ctx, page } = await apri(browser, ugo)
      try {
        await page.goto(`${APP}/animali/attesa`)
        await page.getByLabel('Nome di chi aspetta').waitFor({ timeout: 20000 })
        await page.getByLabel('Nome di chi aspetta').fill('Mario Attesa')
        await page.locator('[id="Telefono"]').fill('12ab')
        await page.getByLabel('Email', { exact: true }).fill('mario@example.com')
        await page.getByLabel('Nome del cane').fill('Briciola')
        await page.getByLabel('Trattamento').selectOption({ label: 'Bagno' })
        await page.getByRole('button', { name: 'Salva', exact: true }).click()
        await page.waitForTimeout(1000)
        const testo = await testoPagina(page)
        await foto(page, 's7-attesa-telefono')
        const scritti = (await db.collection(`salons/${ugo.uid}/attesa`).get()).size
        atteso(testo.includes('Telefono non valido'), 'manca «Telefono non valido»', testo.slice(0, 500))
        atteso(!testo.includes('Compila tutti i campi'), '«Compila tutti i campi» a schermo', testo.slice(0, 500))
        atteso(scritti === 0, 'iscritto scritto con telefono «12ab»', { scritti })
        await page.locator('[id="Telefono"]').fill('+39 333 5550000')
        await page.getByRole('button', { name: 'Salva', exact: true }).click()
        await page.waitForTimeout(2500)
        const dopo = (await db.collection(`salons/${ugo.uid}/attesa`).get()).size
        atteso(dopo === 1, 'con telefono valido l’iscritto non è stato salvato', { dopo })
        return '«12ab» → «Telefono non valido» (non «Compila tutti i campi»), nulla scritto; con +39 333 5550000 l’iscritto entra in lista'
      } finally { await ctx.close() }
    })

    // ——— S8 ———
    const pub = await utente('Pia')
    const slug = `qa-va-${STAMP}`
    await db.doc(`pubblici/${slug}`).set({ salonId: pub.uid, nome: `Salone Pia VA ${STAMP}` })
    await caso('S8 pagina pubblica: nome max 80 caratteri; 81 forzati → «Nome non valido» dal server', async () => {
      const ctx = await contesto(browser)
      // La pagina e il suo script si servono qui: stesso HTML della funzione paginaPubblica, pagina.js dal ramo.
      await ctx.route(`${APP}/s/${slug}**`, async (route) => {
        let body = ''; let status = 0
        const res = { status(s) { status = s; return this }, set() { return this }, send(b) { body = String(b); return this } }
        await paginaPubblicaHttp({ path: `/s/${slug}`, query: {} }, res)
        await route.fulfill({ status, contentType: 'text/html; charset=utf-8', body })
      })
      await ctx.route(`${APP}/s/pagina.js`, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.resolve('hosting/s/pagina.js'), 'utf8') }))
      const page = await ctx.newPage()
      page.on('pageerror', (e) => errori.push(`pagina: ${e.message}`))
      try {
        await page.goto(`${APP}/s/${slug}?demo=1`)
        await page.getByRole('button', { name: 'Cane', exact: true }).click()
        await page.getByRole('button', { name: 'Media', exact: true }).click()
        const radio = page.getByRole('radio').first()
        if (await radio.count() && !(await radio.isChecked())) await radio.check()
        await page.locator('button.giorno.aperto:not([disabled])').first().click()
        await page.locator('#orari-giorno button').first().click()
        const nome = page.locator('#nome')
        await nome.waitFor({ timeout: 10000 })
        await nome.pressSequentially('N'.repeat(90), { delay: 0 })
        const digitati = (await nome.inputValue()).length
        const maxLength = await nome.evaluate((n) => n.maxLength)
        // Forzato: tolto il limite del campo, 81 caratteri → il controllo della pagina lo respinge.
        await nome.evaluate((n) => { n.removeAttribute('maxlength') })
        await nome.fill('N'.repeat(81))
        await page.locator('#telefono').fill('+39 333 1234567')
        await page.locator('#email').fill('cliente@example.com')
        await page.locator('#cane').fill('Briciola')
        await page.locator('#razza').fill('Meticcio')
        await page.locator('#consenso').check()
        await page.locator('button.invia').click()
        await page.waitForTimeout(800)
        const clientKo = await page.getByText('Scrivi il tuo nome (massimo 80 caratteri).').count()
        await foto(page, 's8-pagina-nome-81')
        // Forzato dalla console, oltre i controlli della pagina: la richiesta arriva alla callable vera e il server risponde.
        const risposta = await page.evaluate(async (salonId) => {
          const r = await fetch('https://europe-west1-groomly-3128b.cloudfunctions.net/inviaRichiesta', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { salonId, nome: 'N'.repeat(81), phone: '+39 333 1234567', email: 'cliente@example.com', cane: 'Briciola', razza: 'Meticcio', foto: [], taglia: 'media', specie: 'cane', servizi: ['bagno'], voci: [], totaleIndicativo: 28, durataMin: 45, giorno: '2030-01-07', ora: '10:00', inizio: '2030-01-07T10:00:00', fine: '2030-01-07T10:45:00', esca: '', consenso: true } }),
          })
          return { status: r.status, corpo: await r.json() }
        }, pub.uid)
        const richieste = (await db.collection(`salons/${pub.uid}/richieste`).get()).size
        atteso(digitati === 80 && maxLength === 80, 'il campo nome non si ferma a 80', { digitati, maxLength })
        atteso(clientKo >= 1, 'la pagina non respinge 81 caratteri', { clientKo })
        const messaggio = risposta.corpo && risposta.corpo.error && risposta.corpo.error.message
        atteso(messaggio === 'Nome non valido', 'il server non risponde «Nome non valido»', risposta)
        atteso(richieste === 0, 'richiesta scritta con nome di 81 caratteri', { richieste })
        // Anche il messaggio mostrato dalla pagina è quello del server (non il generico).
        return `campo: digitati ${digitati}, maxlength ${maxLength}; 81 forzati nella pagina → «Scrivi il tuo nome (massimo 80 caratteri).»; server (81 da console) → «${messaggio}», nessuna richiesta scritta`
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
  await db.doc(`pubblici/qa-va-${STAMP}`).delete().catch(() => {})
}

;(async () => {
  try {
    await browserCasi()
  } finally {
    if (!KEEP) await cancellaTutti()
  }
  console.table(esiti.map((e) => ({ caso: e.nome.slice(0, 70), esito: e.esito })))
  console.log(JSON.stringify({ stamp: STAMP, esiti, errori, esterni }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
