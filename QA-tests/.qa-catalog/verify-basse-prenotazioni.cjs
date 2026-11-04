// Verifica delle basse «Prenotazioni» (ramo fix/basse-prenotazioni; Task 8 del piano 2026-11-03-basse-prenotazioni).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite in modo emu su 127.0.0.1:5173. Account e saloni nuovi a ogni giro, prefisso «pren-».
// Le funzioni sono quelle compilate di questo ramo (`cd functions && npx tsc`): le callable si eseguono in questo processo con .run()
// (sull'emulatore delle functions darebbero INTERNAL per la credenziale finta). Brevo è finto: nessuna richiesta lascia la macchina.
// La pagina pubblica (hosting/s/pagina.js) chiama le functions di produzione con un indirizzo fisso: qui ogni richiesta a quell'indirizzo
// è intercettata ed eseguita in locale, e tutto ciò che non è locale viene bloccato. L'HTML della pagina lo fa paginaPubblicaHttp compilata.
// P1 pagina pubblica: tre richieste con «+39 …», «0039 …», «…» dello stesso cellulare (320/360/390 px) → la terza «Troppe richieste», 2 documenti.
// P2 lista d'attesa: iscrizione dalla riga di una settimana piena → documento con `settimana`; disdetta una visita in quella settimana e una
//    fuori, giro della coda (giraInvioCoda) → una sola offerta, nella settimana scelta. Poi lo stesso cliente si riscrive da un'altra settimana
//    piena → stesso documento con la nuova settimana; due posti liberati (nuova settimana e fuori) → solo l'offerta della nuova settimana.
// P3 Home: richiesta «nuova» → Accetta (mail non inviata, il riquadro resta aperto) → visita creata e nessun «A quest’ora c’è già una visita.».
// P4 Go con la prova disponibile: paywall da «Backup automatico giornaliero» e pagina Plus mostrano «Prova Plus gratis per 30 giorni» e «Avvisami», niente «Abbonati».
// P5 dopo «Prova gratis» (avviaProva compilata) Impostazioni dice «ancora 30 giorni»; la scheda a mezza larghezza mostra le due righe intere
//    (scrollHeight ≤ clientHeight, nessun taglio sopra o sotto) e non copre le schede accanto.
// P6 Abbonamento con Plus: un solo «Attivo», sulla scheda Plus.
// P7 riquadro prenotazioni di un Plus senza logo: «Per accendere le prenotazioni manca: Logo.»; con prenotazioni accese la frase non c'è.
// Ogni caso misura a 320/360/390 px (nessuno scorrimento orizzontale, elementi dentro lo schermo); screenshot in QA-tests/results/basse-prenotazioni/.
// Uso: node QA-tests/.qa-catalog/verify-basse-prenotazioni.cjs [--keep] [--solo=P1,P3]  (dopo `cd functions && npx tsc`)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
// index.js inizializza l'app admin (progetto da GCLOUD_PROJECT); fuori dal ramo FUNCTIONS_EMULATOR, come verify-prenotazioni-online.cjs.
delete process.env.FUNCTIONS_EMULATOR
delete process.env.BREVO_API_KEY
const callable = req('./lib/functions/src/index.js')
const firestoreMod = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = firestoreMod.getFirestore(); const auth = getAuth()
const { paginaPubblicaHttp } = req('./lib/functions/src/piano/paginaPubblica.js')
const { giraInvioCoda } = req('./lib/functions/src/piano/giraCoda.js')
const { istanteRoma, chiaveGiornoRoma } = req('./lib/src/lib/disponibilita.js')
const { settimanaDi } = req('./lib/src/lib/listaAttesa.js')

const KEEP = process.argv.includes('--keep')
const SOLO = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean)
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const PUBBLICA = 'http://pren-pagina.localhost'
const PROD_FUNZIONI = 'https://europe-west1-groomly-3128b.cloudfunctions.net/'
const SHOTS = path.resolve('QA-tests/results/basse-prenotazioni')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const PLUS = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 60, media: 60, grande: 60 }, price: { piccola: 28, media: 28, grande: 28 } },
]
const TUTTI_I_GIORNI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
// Salone della lista: aperto solo il mercoledì 09:00-10:00, un posto a settimana; una visita su quel posto riempie la settimana.
const SOLO_MERCOLEDI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), g === 3 ? [{ da: '09:00', a: '10:00' }] : []]))

// ——— Brevo finto e saloni ristretti a quelli di prova ———
const mailBrevo = []
const fetchVero = globalThis.fetch
const brevoFinto = async (url, init) => {
  if (String(url).includes('api.brevo.com')) {
    mailBrevo.push({ url: String(url), body: JSON.parse(init?.body ?? '{}') })
    return new Response('{"messageId":"finto"}', { status: 201, headers: { 'content-type': 'application/json' } })
  }
  return fetchVero(url, init)
}
globalThis.fetch = brevoFinto
const saloniDiProva = new Set()
const listaVera = firestoreMod.CollectionReference.prototype.listDocuments
firestoreMod.CollectionReference.prototype.listDocuments = async function (...a) {
  const docs = await listaVera.apply(this, a)
  return this.path === 'salons' ? docs.filter((d) => saloniDiProva.has(d.id)) : docs
}

// ——— dati ———
const creati = []
const slugCreati = []
const em = (nome) => `pren-${nome}-${STAMP}@test.groomly`
async function utente(nome, { pro, orari, extra = {}, servizi = SERVIZI, slug } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid); saloniDiProva.add(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} Pren ${STAMP}`
  const settings = {
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223', address: 'Via Prova 1, Roma', vatNumber: '12345678903', taxCode: '' },
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, linguaClienti: 'it', updatedAt: '2026-01-01T00:00:00.000Z',
    ...(orari ? { orari } : {}), ...extra,
  }
  await db.doc(`salons/${u.uid}/settings/main`).set(settings)
  if (pro) await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  for (const s of servizi) await db.doc(`salons/${u.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  if (slug) { await db.doc(`pubblici/${slug}`).set({ salonId: u.uid, nome: nomeSalone }); slugCreati.push(slug) }
  return { uid: u.uid, email, nome, slug, nomeSalone }
}
async function cane(salonId, id, name) {
  const now = Date.now()
  await db.doc(`salons/${salonId}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'media', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6 })
  return id
}
async function visita(salonId, v) {
  const now = Date.now()
  await db.doc(`salons/${salonId}/appointments/${v.id}`).set({ createdAt: now - 864e6, updatedAt: now - 864e6, kind: 'pelosetto', status: 'programmato', services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 28 }], ...v, start: v.start.getTime(), end: v.end.getTime() })
  return v.id
}

const esiti = []
let paginaCorrente = null
const daChiudere = []
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s + ' '))) return
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    if (paginaCorrente) await paginaCorrente.screenshot({ path: path.join(SHOTS, 'FAIL-' + nome.slice(0, 2) + '.png') }).catch(() => {})
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2500) })
  }
  while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
  paginaCorrente = null
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 300) }; void giro()
})
const testo = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim()

// ——— date di Roma ———
const giornoTra = (n) => chiaveGiornoRoma(new Date(Date.now() + n * 86400000))
const aggiungi = (giorno, n) => { const [y, m, d] = giorno.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10) }
const mercoledi = (settimana) => aggiungi(settimana.inizio, 2)
const formatoSettimana = new Intl.DateTimeFormat('it', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const etichettaSettimana = (s) => [s.inizio, s.fine].map((g) => { const [y, m, d] = g.split('-').map(Number); return formatoSettimana.format(new Date(Date.UTC(y, m - 1, d))) }).join(' – ')
// Quattro settimane piene (da +2 a +5 settimane), dentro i 42 giorni che la pagina guarda.
const SETTIMANE = [14, 21, 28, 35].map((n) => settimanaDi(giornoTra(n)))

// ——— callable in locale ———
function uidDalToken(header) {
  const token = String(header || '').replace(/^Bearer\s+/i, '')
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).user_id || null } catch { return null }
}
async function esegui(nome, data, uid) {
  const fn = callable[nome]
  if (!fn || typeof fn.run !== 'function') return { status: 404, body: { error: { status: 'NOT_FOUND', message: `callable ${nome} assente` } } }
  try {
    const result = await fn.run({ data: data || {}, auth: uid ? { uid, token: {} } : undefined, rawRequest: { headers: {}, ip: '' } })
    return { status: 200, body: { result } }
  } catch (e) {
    const http = e && e.httpErrorCode ? e.httpErrorCode : { status: 500, canonicalName: 'INTERNAL' }
    return { status: http.status, body: { error: { status: http.canonicalName, message: String(e && e.message) } } }
  }
}
const chiamate = []
const bloccati = []
const errori = []
// Il contesto blocca tutto ciò che non è locale; le functions di produzione della pagina e :5001 dell'app girano qui.
async function contesto(browser, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname.endsWith('.localhost')) return route.continue()
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    bloccati.push(u.origin + u.pathname)
    return route.abort()
  })
  await ctx.route('https://groomlyapp.it/**', (route) => route.fulfill({ status: 204, body: '' }))
  await ctx.route(PROD_FUNZIONI + '**', async (route) => {
    const nome = route.request().url().slice(PROD_FUNZIONI.length).split('?')[0]
    let corpo = {}
    try { corpo = JSON.parse(route.request().postData() || '{}') } catch { /* vuoto */ }
    chiamate.push({ da: 'pagina', nome, data: corpo.data })
    const r = await esegui(nome, corpo.data, null)
    return route.fulfill({ status: r.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.body) })
  })
  await ctx.route(PUBBLICA + '/**', async (route) => {
    const u = new URL(route.request().url())
    if (u.pathname === '/s/pagina.js') return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.resolve('hosting/s/pagina.js'), 'utf8') })
    if (u.pathname.startsWith('/s/')) {
      let codice = 0; let html = ''
      const res = { status(c) { codice = c; return this }, set() { return this }, send(b) { html = String(b); return this } }
      await paginaPubblicaHttp({ path: u.pathname, query: Object.fromEntries(u.searchParams) }, res)
      return route.fulfill({ status: codice || 200, contentType: 'text/html; charset=utf-8', body: html })
    }
    return route.fulfill({ status: 204, body: '' })
  })
  const SERVITE = new Set(['gestisciPrenotazione', 'avviaProva', 'pubblicaSalone', 'postiLiberi'])
  await ctx.route('http://127.0.0.1:5001/**', async (route) => {
    const nome = route.request().url().split('/').pop().split('?')[0]
    let corpo = {}
    try { corpo = JSON.parse(route.request().postData() || '{}') } catch { /* vuoto */ }
    chiamate.push({ da: 'app', nome })
    if (!SERVITE.has(nome)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
    const r = await esegui(nome, corpo.data, uidDalToken(route.request().headers().authorization))
    return route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) })
  })
  return ctx
}
async function apri(browser, persona) {
  const ctx = await contesto(browser)
  const page = await ctx.newPage()
  paginaCorrente = page
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
async function apriPubblica(browser, slug, viewport) {
  const ctx = await contesto(browser, viewport)
  const page = await ctx.newPage()
  paginaCorrente = page
  page.on('pageerror', (e) => errori.push(`pagina ${slug}: ${e.message}`))
  await page.goto(`${PUBBLICA}/s/${slug}`)
  await page.getByRole('button', { name: 'Cane', exact: true }).click()
  await page.getByRole('button', { name: 'Media', exact: true }).click()
  await page.locator('input[name=principale]').first().check()
  await page.getByRole('button', { name: 'Mese successivo' }).waitFor({ timeout: 20000 })
  return { ctx, page }
}
// Misura in una larghezza: pagina senza scorrimento di lato, elementi dentro lo schermo e senza testo tagliato.
async function misura(page, larghezza, locatori) {
  const righe = []
  for (const [etichetta, loc] of locatori) {
    const el = loc.first()
    if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
    await el.scrollIntoViewIfNeeded().catch(() => {})
    righe.push({ etichetta, ...(await el.evaluate((n) => {
      const r = n.getBoundingClientRect()
      return { sw: n.scrollWidth, cw: n.clientWidth, sinistra: Math.round(r.left), destra: Math.round(r.right), ok: n.scrollWidth <= n.clientWidth + 1 && r.left >= -0.5 && r.right <= window.innerWidth + 0.5 }
    })) })
  }
  const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  const ok = pagina.sw <= pagina.iw && righe.every((r) => r.ok)
  atteso(ok, `misura a ${larghezza}px`, { pagina, righe })
  return `${larghezza}px pagina ${pagina.sw}/${pagina.iw}` + righe.map((r) => ` ${r.etichetta} ${r.sw}/${r.cw}`).join('')
}
async function larghezze(page, nome, locatori = [], prima) {
  const out = []
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(500)
    if (prima) await prima()
    out.push(await misura(page, v.width, typeof locatori === 'function' ? locatori() : locatori))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  return out.join(' | ')
}
// Il pulsante «Lista d’attesa» della riga di una settimana, sfogliando i mesi se serve.
async function rigaSettimana(page, settimana) {
  const nome = `Lista d’attesa, ${etichettaSettimana(settimana)}`
  for (let i = 0; i < 3; i += 1) {
    const b = page.getByRole('button', { name: nome, exact: true })
    if (await b.count()) return b.first()
    const dopo = page.getByRole('button', { name: 'Mese successivo' })
    if (!(await dopo.isEnabled())) break
    await dopo.click(); await page.waitForTimeout(300)
  }
  throw new Error(`riga «${nome}» non trovata`)
}
async function iscriviti(page, settimana, cliente) {
  await (await rigaSettimana(page, settimana)).click()
  const form = page.locator('form#lista-attesa')
  await form.waitFor({ timeout: 10000 })
  await page.locator('#lista-nome').fill(cliente.nome)
  await page.locator('#lista-telefono').fill(cliente.telefono)
  await page.locator('#lista-email').fill(cliente.email)
  await page.locator('#lista-cane').fill(cliente.cane)
  await page.locator('#lista-consenso').check()
  return form
}
// Impostazioni → «Backup e ripristino» → interruttore «Backup automatico giornaliero» (Go: apre il paywall).
async function paywallBackup(page) {
  await page.goto(`${APP}/impostazioni`)
  await page.getByText('Backup e ripristino', { exact: true }).first().click()
  const toggle = page.getByRole('switch', { name: 'Backup automatico giornaliero' })
  await toggle.waitFor({ timeout: 20000 })
  await toggle.click()
  const pw = page.getByRole('dialog', { name: 'Backup automatico' })
  await pw.waitFor({ timeout: 10000 })
  return pw
}
async function giroCoda() {
  const prima = mailBrevo.length
  const r = await giraInvioCoda({ apiKey: 'chiave-finta-qa', adesso: new Date(), fetchImpl: brevoFinto })
  return { ...r, mail: mailBrevo.slice(prima) }
}

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const anna = await utente('Anna', { pro: PLUS, orari: TUTTI_I_GIORNI, slug: `pren-a-${STAMP}`, extra: { prenotazioniOnline: true } })
  const bruno = await utente('Bruno', { pro: PLUS, orari: SOLO_MERCOLEDI, slug: `pren-b-${STAMP}`, extra: { prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'manuale' } } } })
  const carla = await utente('Carla', { orari: TUTTI_I_GIORNI }) // Go: nessun pro/main, prova concessa
  const dario = await utente('Dario', { pro: PLUS, orari: TUTTI_I_GIORNI, extra: { backup: { autoDaily: false, impostato: true }, prenotazioniOnline: false } })
  // Salone della lista: una visita per ogni mercoledì delle quattro settimane piene.
  const visiteB = []
  for (const [i, s] of SETTIMANE.entries()) {
    const dog = await cane(bruno.uid, `pren-dog-b${i}-${STAMP}`, `Pieno ${i + 1}`)
    const g = mercoledi(s)
    visiteB.push(await visita(bruno.uid, { id: `pren-v-b${i}-${STAMP}`, dogId: dog, start: istanteRoma(g, '09:00'), end: istanteRoma(g, '10:00') }))
  }
  const disdici = async (i) => db.doc(`salons/${bruno.uid}/appointments/${visiteB[i]}`).set({ status: 'disdetto', cancelReason: 'cliente', updatedAt: Date.now() }, { merge: true })
  const offerteDi = async () => (await db.collection(`salons/${bruno.uid}/offerteAttesa`).get()).docs.map((d) => d.data())
  const browser = await chromium.launch()
  try {
    // ——— P1 ———
    await caso('P1 pagina pubblica: stesso cellulare con +39, 0039 e senza prefisso → la terza «Troppe richieste»', async () => {
      const tentativi = [
        { telefono: '+39 320 555 0000', email: `pren-cli1-${STAMP}@example.test`, cane: 'Pippo' },
        { telefono: '0039 320 5550000', email: `pren-cli2-${STAMP}@example.test`, cane: 'Pluto' },
        { telefono: '320 5550000', email: `pren-cli3-${STAMP}@example.test`, cane: 'Paperino' },
      ]
      const righe = []
      for (const [i, t] of tentativi.entries()) {
        const v = LARGHEZZE[i]
        const { ctx, page } = await apriPubblica(browser, anna.slug, v)
        try {
          await page.locator('button.giorno.aperto').first().click()
          await page.locator('#orari-giorno button.ora').first().click()
          await page.locator('#nome').fill('Ada Rossi')
          await page.locator('#telefono').fill(t.telefono)
          await page.locator('#email').fill(t.email)
          await page.locator('#cane').fill(t.cane)
          await page.locator('#razza').fill('Meticcio')
          await page.locator('#consenso').check()
          const giorno = await page.locator('button.giorno[aria-pressed="true"]').getAttribute('aria-label')
          const ora = await testo(page.locator('#orari-giorno button.ora[aria-pressed="true"]'))
          await page.getByRole('button', { name: 'Invia la richiesta', exact: true }).click()
          const esito = page.locator('p.esito[role=status], form#dati-richiesta p.errore[role=alert]')
          await esito.first().waitFor({ timeout: 20000 })
          const scritto = await testo(esito.first())
          const mis = await misura(page, v.width, [['esito', esito]])
          await page.screenshot({ path: path.join(SHOTS, `p1-richiesta-${i + 1}-${v.width}.png`) })
          righe.push({ telefono: t.telefono, quando: `${giorno} ${ora}`, scritto, mis })
        } finally { daChiudere.push(ctx) }
        while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
      }
      const docs = (await db.collection(`salons/${anna.uid}/richieste`).get()).docs.map((d) => d.data())
      atteso(/^Richiesta inviata|^Grazie, richiesta inviata/.test(righe[0].scritto) && /^Richiesta inviata|^Grazie, richiesta inviata/.test(righe[1].scritto), 'le prime due non sono partite', righe)
      atteso(righe[2].scritto === 'Troppe richieste', 'la terza non è rifiutata', righe[2])
      atteso(docs.length === 2 && docs.every((d) => d.status === 'nuova'), 'richieste salvate', docs.map((d) => ({ phone: d.phone, status: d.status })))
      return righe.map((r, i) => `${i + 1}) «${r.telefono}» ${r.quando} → «${r.scritto.slice(0, 60)}» [${r.mis}]`).join(' || ') + ` || su Firestore ${docs.length} richieste: ${docs.map((d) => d.phone).join(', ')}`
    })

    // ——— P2 ———
    await caso('P2 lista d’attesa: iscrizione da una settimana piena → solo l’offerta di quella settimana; riscriversi da un’altra la sostituisce', async () => {
      const [w1, w2, w3, w4] = SETTIMANE
      const cliente = { nome: 'Lia Attesa', telefono: '+39 347 1234567', email: `pren-lista-${STAMP}@example.test`, cane: 'Birba' }
      const note = []
      // Iscrizione dalla riga della settimana w1.
      {
        const { ctx, page } = await apriPubblica(browser, bruno.slug, { width: 390, height: 844 })
        try {
          const righeSettimana = await page.getByRole('button', { name: /^Lista d’attesa, / }).allInnerTexts().then((x) => x.length)
          const form = await iscriviti(page, w1, cliente)
          note.push(await larghezze(page, 'p2-modulo-lista', [['modulo', form], ['iscriviti', form.getByRole('button', { name: 'Lista d’attesa', exact: true })]]))
          await form.getByRole('button', { name: 'Lista d’attesa', exact: true }).click()
          const fatto = page.locator('#lista-attesa[role=status]')
          await fatto.waitFor({ timeout: 20000 })
          note.push(`righe «Lista d’attesa» viste ${righeSettimana}; dopo l’invio «${await testo(fatto)}»`)
          await page.screenshot({ path: path.join(SHOTS, 'p2-iscritto-390.png') })
        } finally { daChiudere.push(ctx) }
        while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
      }
      const iscrittiSnap = await db.collection(`salons/${bruno.uid}/attesa`).get()
      const iscritti = iscrittiSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      atteso(iscritti.length === 1 && iscritti[0].settimana && iscritti[0].settimana.inizio === w1.inizio && iscritti[0].settimana.fine === w1.fine, 'documento dell’iscritto senza la settimana w1', iscritti)
      const id = iscritti[0].id
      const ultima = iscritti[0].settimana
      // Posti liberati: uno nella settimana w1 e uno fuori (w2), dopo l'iscrizione.
      await new Promise((r) => setTimeout(r, 50))
      await disdici(0); await disdici(1)
      const giro1 = await giroCoda()
      const offerte1 = await offerteDi()
      const mieOfferte1 = offerte1.filter((o) => o.iscrittoId === id)
      atteso(mieOfferte1.length === 1 && chiaveGiornoRoma(new Date(mieOfferte1[0].inizio)) === mercoledi(w1), 'offerte dopo il primo giro', { offerte: offerte1, giro: giro1.saloni })
      atteso(mieOfferte1[0].inviataIl && giro1.mail.length === 1 && giro1.mail[0].body.to[0].email === cliente.email, 'mail dell’offerta', { mail: giro1.mail.map((m) => m.body.to), offerta: mieOfferte1[0] })
      note.push(`iscritto ${id} settimana ${ultima.inizio}…${ultima.fine}; disdette ${mercoledi(w1)} (dentro) e ${mercoledi(w2)} (fuori) → 1 offerta per ${mieOfferte1[0].inizio}, 1 mail a ${giro1.mail[0].body.to[0].email}`)
      // Lo stesso cliente si riscrive dalla riga della settimana w3 (ancora piena), a 320 px e con il numero senza prefisso.
      {
        const { ctx, page } = await apriPubblica(browser, bruno.slug, LARGHEZZE[0])
        try {
          const form = await iscriviti(page, w3, { ...cliente, telefono: '347 1234567' })
          await form.getByRole('button', { name: 'Lista d’attesa', exact: true }).click()
          const fatto = page.locator('#lista-attesa[role=status]')
          await fatto.waitFor({ timeout: 20000 })
          note.push(await misura(page, 320, [['esito riscrittura', fatto]]))
          await page.screenshot({ path: path.join(SHOTS, 'p2-riscritto-320.png') })
        } finally { daChiudere.push(ctx) }
        while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
      }
      const dopo = (await db.collection(`salons/${bruno.uid}/attesa`).get()).docs.map((d) => ({ id: d.id, ...d.data() }))
      atteso(dopo.length === 1 && dopo[0].id === id && dopo[0].settimana && dopo[0].settimana.inizio === w3.inizio && dopo[0].settimana.fine === w3.fine, 'la riscrittura non ha sostituito la settimana', dopo)
      await disdici(2); await disdici(3)
      const giro2 = await giroCoda()
      const nuove = (await offerteDi()).filter((o) => o.iscrittoId === id && !mieOfferte1.some((v) => v.appointmentId === o.appointmentId))
      atteso(nuove.length === 1 && chiaveGiornoRoma(new Date(nuove[0].inizio)) === mercoledi(w3) && giro2.mail.length === 1, 'offerte dopo la riscrittura', { nuove, mail: giro2.mail.length })
      const giorniOfferti = (await offerteDi()).filter((o) => o.iscrittoId === id).map((o) => chiaveGiornoRoma(new Date(o.inizio))).sort()
      atteso(!giorniOfferti.includes(mercoledi(w2)) && !giorniOfferti.includes(mercoledi(w4)), 'offerta fuori settimana', giorniOfferti)
      note.push(`riscritto dalla riga ${w3.inizio}…${w3.fine}: stesso documento, settimana sostituita; disdette ${mercoledi(w3)} (dentro) e ${mercoledi(w4)} (fuori) → 1 offerta nuova per ${nuove[0].inizio}; giorni offerti in tutto ${giorniOfferti.join(', ')}`)
      return note.join(' || ')
    })

    // ——— P3 ———
    await caso('P3 Home: Accetta di una richiesta → visita creata, nessun «A quest’ora c’è già una visita.»', async () => {
      const { ctx, page } = await apri(browser, anna)
      try {
        const riga = page.getByRole('button', { name: /chiede per Pippo/ })
        await riga.waitFor({ timeout: 30000 })
        await riga.click()
        const d = page.getByRole('dialog', { name: 'Richiesta' })
        await d.waitFor({ timeout: 10000 })
        await d.getByRole('radio', { name: 'Nuovo profilo' }).check()
        const avviso = d.getByText('A quest’ora c’è già una visita.', { exact: true })
        atteso(await avviso.count() === 0, 'avviso prima di Accetta', {})
        const mis = await larghezze(page, 'p3-riquadro', [['riquadro', d], ['Accetta', d.getByRole('button', { name: 'Accetta', exact: true })]])
        await d.getByRole('button', { name: 'Accetta', exact: true }).click()
        // La mail non parte (nessuna chiave Brevo): il riquadro resta aperto con «Email non inviata», mentre la visita arriva sull'app.
        let visto = 0
        const t0 = Date.now()
        let visite = []
        while (Date.now() - t0 < 8000) {
          visto += await avviso.count()
          visite = (await db.collection(`salons/${anna.uid}/appointments`).get()).docs.map((x) => x.data())
          if (visite.length && Date.now() - t0 > 4000) break
          await page.waitForTimeout(200)
        }
        const aperto = await d.count() > 0 && await d.isVisible()
        const emailKo = aperto ? await d.getByText('Email non inviata', { exact: true }).count() : 0
        const ric = (await db.collection(`salons/${anna.uid}/richieste`).get()).docs.map((x) => ({ id: x.id, ...x.data() })).find((x) => x.cane === 'Pippo')
        await page.screenshot({ path: path.join(SHOTS, 'p3-dopo-accetta-390.png') })
        const mis2 = aperto ? await larghezze(page, 'p3-dopo-accetta', [['riquadro', d]]) : 'riquadro chiuso'
        atteso(visite.some((v) => v.richiestaId === ric.id) && ric.status === 'accettata', 'visita/richiesta su Firestore', { visite: visite.map((v) => v.richiestaId), stato: ric.status })
        atteso(visto === 0 && await avviso.count() === 0, 'avviso giallo dopo Accetta', { visto })
        return `Accetta → richiesta «${ric.status}», visita con richiestaId; riquadro ${aperto ? 'aperto' : 'chiuso'}${emailKo ? ' con «Email non inviata»' : ''}; avviso «A quest’ora c’è già una visita.» mai comparso in 4-8 s di controllo || ${mis} || ${mis2}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— P4 + P5 ———
    await caso('P4 Go con prova: paywall da Backup automatico e pagina Plus offrono «Prova Plus gratis per 30 giorni» e «Avvisami»', async () => {
      const { ctx, page } = await apri(browser, carla)
      try {
        const config = (await db.doc('config/globale').get()).data() || null
        const pw = await paywallBackup(page)
        const bottoniPw = await pw.getByRole('button').allInnerTexts()
        const mis1 = await larghezze(page, 'p4-paywall-backup', [['paywall', pw], ['prova', pw.getByRole('button', { name: 'Prova Plus gratis per 30 giorni' })], ['avvisami', pw.getByRole('button', { name: 'Avvisami', exact: true })]])
        atteso(await pw.getByRole('button', { name: 'Prova Plus gratis per 30 giorni', exact: true }).count() === 1 && await pw.getByRole('button', { name: 'Avvisami', exact: true }).count() === 1 && await pw.getByRole('button', { name: 'Abbonati', exact: true }).count() === 0, 'pulsanti del paywall', bottoniPw)
        await page.keyboard.press('Escape'); await page.waitForTimeout(500)
        await page.goto(`${APP}/impostazioni/abbonamento/plus`)
        const prova = page.getByRole('button', { name: 'Prova Plus gratis per 30 giorni', exact: true })
        await prova.waitFor({ timeout: 20000 })
        const avvisami = page.getByRole('button', { name: 'Avvisami', exact: true })
        const abbonati = await page.getByRole('button', { name: 'Abbonati', exact: true }).count()
        const inArrivo = await page.getByText('In arrivo', { exact: true }).count()
        const mis2 = await larghezze(page, 'p4-pagina-plus', [['prova', prova], ['avvisami', avvisami]])
        atteso(await avvisami.count() === 1 && abbonati === 0, 'pulsanti della pagina Plus', { avvisami: await avvisami.count(), abbonati })
        return `config/globale ${config ? JSON.stringify(config).slice(0, 120) : 'assente (mostraPiani e abbonamentiAttivi spenti)'}; paywall «Backup automatico»: ${bottoniPw.map((b) => `«${b.trim()}»`).join(' ')}; pagina Plus: «Prova Plus gratis per 30 giorni» + «Avvisami», nessun «Abbonati», «In arrivo» ${inArrivo} || ${mis1} || ${mis2}`
      } finally { daChiudere.push(ctx) }
    })

    await caso('P5 dopo «Prova gratis» Impostazioni dice «ancora 30 giorni»', async () => {
      const { ctx, page } = await apri(browser, carla)
      try {
        const pw = await paywallBackup(page)
        await pw.getByRole('button', { name: 'Prova Plus gratis per 30 giorni', exact: true }).click()
        await pw.getByText('La prova Plus è attiva per 30 giorni.', { exact: false }).waitFor({ timeout: 20000 })
        const pro = (await db.doc(`salons/${carla.uid}/pro/main`).get()).data()
        await pw.getByRole('button', { name: 'Ho capito', exact: true }).click()
        // Dietro il paywall resta aperto il foglio «Backup»: si chiude per tornare alla pagina.
        const foglio = page.getByRole('dialog', { name: 'Backup' })
        if (await foglio.count()) { await foglio.getByRole('button', { name: /Chiudi/ }).first().click().catch(() => page.keyboard.press('Escape')); await foglio.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {}) }
        await page.waitForTimeout(500)
        const giorni = page.getByText(/ancora \d+ giorn/)
        await giorni.first().waitFor({ timeout: 20000 })
        const scritto = await testo(giorni.first())
        // La scheda del piano in Impostazioni (SchedaAbbonamento): le righe della prova vanno a capo. Si controlla che ogni riga
        // stia intera dentro la scheda (nessun taglio di lato, sopra o sotto) e che la scheda non copra quella sotto.
        const righeMis = []
        for (const v of LARGHEZZE) {
          await page.setViewportSize(v); await page.waitForTimeout(500)
          const r = await giorni.first().evaluate((n) => {
            const tile = n.closest('a')
            const t = tile.getBoundingClientRect()
            const righe = [...tile.querySelectorAll('span')].filter((x) => x.children.length === 0 && /Prova Plus|ancora \d+ giorn/.test(x.textContent || '')).map((x) => { const b = x.getBoundingClientRect(); return { testo: x.textContent, top: Math.round(b.top), bottom: Math.round(b.bottom), sw: x.scrollWidth, cw: x.clientWidth, sh: x.scrollHeight, ch: x.clientHeight } })
            // Il contenuto sta in un riquadro assoluto con overflow nascosto: le righe devono stare dentro quello e dentro la scheda.
            const box = [...tile.querySelectorAll('*')].find((x) => getComputedStyle(x).position === 'absolute' && getComputedStyle(x).overflow === 'hidden')
            const bb = (box || tile).getBoundingClientRect()
            const contenuto = box ? { sh: box.scrollHeight, ch: box.clientHeight, top: Math.round(bb.top), bottom: Math.round(bb.bottom) } : null
            const dentro = righe.every((x) => x.top >= Math.max(t.top, bb.top) - 0.5 && x.bottom <= Math.min(t.bottom, bb.bottom) + 0.5 && x.sw <= x.cw + 1 && x.sh <= x.ch + 1) && (!contenuto || contenuto.sh <= contenuto.ch + 1)
            const sotto = document.elementFromPoint(t.left + t.width / 2, t.bottom + 6)
            // Le schede accanto (stessa griglia) non devono sovrapporsi a questa.
            let griglia = tile.parentElement
            while (griglia && griglia.children.length < 2) griglia = griglia.parentElement
            const accanto = griglia ? [...griglia.children].filter((c) => !c.contains(tile)).map((c) => c.getBoundingClientRect()) : []
            const sovrapposte = accanto.filter((c) => c.left < t.right - 0.5 && c.right > t.left + 0.5 && c.top < t.bottom - 0.5 && c.bottom > t.top + 0.5).length
            const tileContenuto = { sh: tile.scrollHeight, ch: tile.clientHeight }
            return { scheda: [Math.round(t.top), Math.round(t.bottom)], tileContenuto, accanto: accanto.length, sovrapposte, contenuto, righe, dentro: dentro && tileContenuto.sh <= tileContenuto.ch + 1, sottoNonCoperto: !sotto || !tile.contains(sotto) }
          })
          await page.screenshot({ path: path.join(SHOTS, `p5-impostazioni-prova-${v.width}.png`) })
          const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
          righeMis.push({ larghezza: v.width, ...r, pagina })
        }
        await page.setViewportSize({ width: 390, height: 844 })
        atteso(righeMis.every((m) => m.pagina.sw <= m.pagina.iw && m.dentro && m.sottoNonCoperto && m.sovrapposte === 0 && m.accanto > 0 && m.righe.length === 2), 'scheda della prova', righeMis)
        const mis = righeMis.map((m) => `${m.larghezza}px pagina ${m.pagina.sw}/${m.pagina.iw} scheda ${m.scheda.join('–')} scheda sh/ch ${m.tileContenuto.sh}/${m.tileContenuto.ch}, accanto ${m.accanto} senza sovrapposizioni, righe ${m.righe.map((x) => `«${x.testo}» ${x.top}–${x.bottom}`).join(', ')}`).join(' | ')
        // Anche dopo una ricarica (il conto riparte dall'ora attuale).
        await page.reload(); await page.getByText(/ancora \d+ giorn/).first().waitFor({ timeout: 20000 })
        const dopoRicarica = await testo(page.getByText(/ancora \d+ giorn/).first())
        atteso(/ancora 30 giorni/.test(scritto) && /ancora 30 giorni/.test(dopoRicarica), 'giorni della prova', { scritto, dopoRicarica, scadeIl: pro && pro.scadeIl })
        return `avviaProva → pro/main ${JSON.stringify({ piano: pro.piano, stato: pro.stato, scadeIl: pro.scadeIl })}; Impostazioni «${scritto}», dopo la ricarica «${dopoRicarica}» || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— P6 ———
    await caso('P6 Abbonamento con Plus: un solo «Attivo»', async () => {
      const { ctx, page } = await apri(browser, dario)
      try {
        await page.goto(`${APP}/impostazioni/abbonamento`)
        const schedaPlus = page.getByRole('link', { name: /Plus/ }).first()
        await schedaPlus.waitFor({ timeout: 20000 })
        await page.waitForTimeout(1200)
        const attivi = page.getByText('Attivo', { exact: true })
        const n = await attivi.count()
        const dove = []
        for (let i = 0; i < n; i += 1) dove.push(await attivi.nth(i).evaluate((el) => (el.closest('a') ? el.closest('a').getAttribute('href') : '?')))
        const schede = await page.locator('a[href^="/impostazioni/abbonamento/"]').allInnerTexts()
        const mis = await larghezze(page, 'p6-abbonamento-plus', [['Attivo', attivi]])
        atteso(n === 1 && dove[0] === '/impostazioni/abbonamento/plus', '«Attivo»', { n, dove, schede })
        return `«Attivo» ${n} volta, su ${dove.join(',')}; schede: ${schede.map((s) => `«${s.replace(/\s+/g, ' ').trim()}»`).join(' ')} || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— P7 ———
    await caso('P7 riquadro prenotazioni senza logo: «…manca: Logo.»; a prenotazioni accese la frase non c’è', async () => {
      const { ctx, page } = await apri(browser, dario)
      try {
        await page.goto(`${APP}/impostazioni/abbonamento/plus`)
        const frase = page.getByText(/^Per accendere le prenotazioni manca:/)
        await frase.first().waitFor({ timeout: 20000 })
        const scritta = await testo(frase.first())
        const href = await frase.first().evaluate((el) => (el.closest('a') ? el.closest('a').getAttribute('href') : ''))
        const vecchia = await page.getByText(/5 su 5|completa il profilo/).count()
        const mis1 = await larghezze(page, 'p7-manca-logo', [['frase', frase.first().locator('xpath=ancestor::p[1]')]])
        atteso(scritta === 'Per accendere le prenotazioni manca: Logo.' && vecchia === 0, 'frase dei passi mancanti', { scritta, vecchia })
        await db.doc(`salons/${dario.uid}/settings/main`).set({ prenotazioniOnline: true }, { merge: true })
        await page.reload()
        await page.getByText('Prenotazioni online', { exact: true }).first().waitFor({ timeout: 20000 })
        await page.waitForTimeout(2000)
        const dopo = await page.getByText(/Per accendere le prenotazioni/).count()
        const mis2 = await larghezze(page, 'p7-accese', [['interruttore', page.getByText('Prenotazioni online', { exact: true })]])
        atteso(dopo === 0, 'frase a prenotazioni accese', { dopo })
        return `spente: «${scritta}» (link ${href}), nessun «5 su 5»; accese (logo ancora mancante): nessuna frase «Per accendere le prenotazioni…» || ${mis1} || ${mis2}`
      } finally { daChiudere.push(ctx) }
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
  for (const s of slugCreati) await db.doc(`pubblici/${s}`).delete().catch(() => {})
  // Gli slug registrati da pubblicaSalone per i saloni di prova.
  for (const uid of creati) {
    const q = await db.collection('pubblici').where('salonId', '==', uid).get().catch(() => null)
    if (q) for (const d of q.docs) await d.ref.delete().catch(() => {})
  }
}

;(async () => {
  // Il contatore giornaliero della posta è condiviso: si rimette com'era dopo i giri della coda.
  const posta = db.doc('sistema/postaGiorno')
  const postaPrima = await posta.get()
  try {
    await browserCasi()
  } finally {
    if (postaPrima.exists) await posta.set(postaPrima.data()); else await posta.delete().catch(() => {})
    if (!KEEP) await cancellaTutti()
  }
  console.table(esiti.map((e) => ({ caso: e.nome.slice(0, 90), esito: e.esito })))
  console.log(JSON.stringify({ stamp: STAMP, settimane: SETTIMANE, esiti, errori, bloccati: [...new Set(bloccati)], chiamate: chiamate.map((c) => `${c.da}:${c.nome}`) }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
