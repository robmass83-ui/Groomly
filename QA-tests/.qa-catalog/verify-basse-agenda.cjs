// Verifica nel browser delle basse «Agenda» (ramo fix/basse-agenda; Task 6 del piano 2026-11-03-basse-agenda).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite in modo emu su 127.0.0.1:5173. Account e saloni nuovi a ogni giro (firebase-admin).
// Un salone Go (piano base, senza orari) e un salone Plus (piano pro, orari 9-13 / 15-19 dal lunedì al sabato, domenica chiuso).
// S1 Go: visita 10:00-11:00 e un'altra alle 11:00 → «+15» apre «Orario già occupato»; «Sposta comunque» → start 10:15 su Firestore.
// S2 Go: visita alle 19:00 → «+15» disattivato; «Modifica appuntamento» ha 19:00 scelto.
// S3 Plus: nuovo appuntamento di 120 min alle 12:45 → «Finisce dopo la chiusura delle 13:00», salvataggio riuscito.
// S4 Plus, orologio della pagina su domenica: nuovo appuntamento senza data → lunedì 09:00; con ?data= domenica → «Il salone è chiuso questo giorno».
// S5 Go: disdetta del cliente fra 10 giorni nel mese → il Report non la conta in «Mancati» (conta solo quella già passata).
// S6 Incassi → Report → freccia → /incassi; Impostazioni → Report → Statistiche → freccia → Report → freccia → /impostazioni; ricarica → /incassi.
// S7 Calendario, Giorno vuoto: 18:00→19:00 uguale a 17:00→18:00 (±1 px), «19:00» intera dopo lo scorrimento in fondo (getBoundingClientRect).
// Larghezze 320/360/390 px (S7 anche 1280 px), nessuno scorrimento orizzontale della pagina; screenshot in QA-tests/results/basse-agenda/.
// Uso: node QA-tests/.qa-catalog/verify-basse-agenda.cjs [--keep] [--solo=S1,S3]
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const KEEP = process.argv.includes('--keep')
const SOLO = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean)
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/basse-agenda')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const DUE_FASCE = [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }]
const ORARI_PLUS = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), g === 0 ? [] : DUE_FASCE.map((f) => ({ ...f }))]))
const GO = { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true }
const PLUS = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 60, media: 60, grande: 60 }, price: { piccola: 28, media: 28, grande: 28 } },
  { id: 'tosatura', order: 1, name: 'Tosatura completa', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 120, media: 120, grande: 120 }, price: { piccola: 50, media: 50, grande: 50 } },
]

const creati = []
const em = (nome) => `qa-ba-${nome}-${STAMP}@test.groomly`
async function utente(nome, { pro, orari }) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} BA ${STAMP}`
  const settings = { business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' }
  if (orari) settings.orari = orari
  await db.doc(`salons/${u.uid}/settings/main`).set(settings)
  await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  for (const s of SERVIZI) await db.doc(`salons/${u.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  return { uid: u.uid, email, nome }
}
async function cane(salonId, id, name) {
  const now = Date.now()
  await db.doc(`salons/${salonId}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6 })
  return id
}
async function visita(salonId, v) {
  const now = Date.now()
  const doc = { createdAt: now - 864e6, updatedAt: now - 864e6, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end.getTime() }
  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]
  await db.doc(`salons/${salonId}/appointments/${v.id}`).set(doc)
  return v.id
}
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

const esiti = []
let paginaCorrente = null
const daChiudere = [] // i contesti si chiudono dopo lo screenshot dell'errore
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s + ' '))) return
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    if (paginaCorrente) await paginaCorrente.screenshot({ path: path.join(SHOTS, 'FAIL-' + nome.slice(0, 2) + '.png') }).catch(() => {})
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
  while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
  paginaCorrente = null
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})

// ——— date (ora locale, come il browser) ———
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const adesso = new Date()
const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())
const feriale = (d) => (d.getDay() === 0 ? addDays(d, 1) : d)
const giornoVisite = feriale(addDays(oggi, 1)) // S1, S2 (Go) e S3 (Plus)
const giornoVuoto = feriale(addDays(giornoVisite, 5)) // S7: nessuna visita
const domenica = addDays(oggi, -oggi.getDay()) // S4: la domenica di questa settimana (oggi se è domenica)
const disdettaPassata = oggi.getDate() === 1 ? oggi : addDays(oggi, -1) // S5, nel mese e già arrivata
const disdettaFutura = addDays(oggi, 10) // S5, fra 10 giorni
const numero = (testo) => Number(String(testo).replace(/[^\d,]/g, '').replace(',', '.'))

// ——— browser ———
const errori = []
const S4_FREDDO = []
async function apri(browser, persona, { orologio } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  const page = await ctx.newPage()
  if (orologio) await page.clock.setFixedTime(orologio)
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
// Screenshot a 320/360/390 px; la pagina non scorre di lato e gli elementi indicati stanno nello schermo e non tagliano il testo.
async function larghezze(page, nome, locatori = [], prima) {
  const out = []
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(500)
    if (prima) await prima()
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
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out.push({ larghezza: v.width, pagina, ok: pagina.sw <= pagina.iw && righe.every((r) => r.ok), righe })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const ok = out.every((m) => m.ok)
  atteso(ok, `misura ${nome}`, out.filter((m) => !m.ok))
  return out.map((m) => `${m.larghezza}px pagina ${m.pagina.sw}/${m.pagina.iw}` + m.righe.map((r) => ` ${r.etichetta} ${r.sw}/${r.cw}`).join('')).join(' | ')
}

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const go = await utente('Gino', { pro: GO })
  const plus = await utente('Paola', { pro: PLUS, orari: ORARI_PLUS })
  const G = go.uid; const P = plus.uid
  const fido = await cane(G, `qa-ba-fido-${STAMP}`, 'Fido Sposta')
  const rex = await cane(G, `qa-ba-rex-${STAMP}`, 'Rex Accanto')
  const sera = await cane(G, `qa-ba-sera-${STAMP}`, 'Sera Ultima')
  const bobi = await cane(G, `qa-ba-bobi-${STAMP}`, 'Bobi Passato')
  const futuro = await cane(G, `qa-ba-futuro-${STAMP}`, 'Zeno Futuro')
  const luna = await cane(P, `qa-ba-luna-${STAMP}`, 'Luna Lunga')
  const ids = {
    s1: await visita(G, { id: `qa-ba-v-s1-${STAMP}`, dogId: fido, start: at(giornoVisite, 10), end: at(giornoVisite, 11), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' }),
    accanto: await visita(G, { id: `qa-ba-v-acc-${STAMP}`, dogId: rex, start: at(giornoVisite, 11), end: at(giornoVisite, 12), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' }),
    s2: await visita(G, { id: `qa-ba-v-s2-${STAMP}`, dogId: sera, start: at(giornoVisite, 19), end: at(giornoVisite, 20), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' }),
    passata: await visita(G, { id: `qa-ba-v-pas-${STAMP}`, dogId: bobi, start: at(disdettaPassata, 8, 30), end: at(disdettaPassata, 9, 30), services: [riga('bagno', 'Bagno', 60, 28)], status: 'disdetto', cancelReason: 'cliente' }),
    futura: await visita(G, { id: `qa-ba-v-fut-${STAMP}`, dogId: futuro, start: at(disdettaFutura, 10), end: at(disdettaFutura, 12), services: [riga('tosatura', 'Tosatura completa', 120, 50)], status: 'disdetto', cancelReason: 'cliente' }),
  }
  const browser = await chromium.launch()
  try {
    // ——— S1 ———
    await caso('S1 Go: +15 verso una visita accanto → «Orario già occupato», «Sposta comunque» → 10:15', async () => {
      const { ctx, page } = await apri(browser, go)
      try {
        await page.goto(`${APP}/appuntamenti/${ids.s1}`)
        const piu = page.getByRole('button', { name: 'Posticipa +15', exact: true })
        await piu.waitFor({ timeout: 20000 })
        await page.waitForTimeout(800)
        atteso(await piu.isEnabled(), '+15 disattivato alle 10:00', {})
        await piu.click()
        const d = page.getByRole('dialog', { name: 'Orario già occupato' })
        await d.waitFor({ timeout: 10000 })
        const testo = (await d.innerText()).replace(/\s+/g, ' ').trim()
        atteso(/Si sovrappone a Rex Accanto 11:00–12:00/.test(testo), 'testo del dialog', testo)
        const ref = db.doc(`salons/${G}/appointments/${ids.s1}`)
        atteso((await ref.get()).get('start') === at(giornoVisite, 10).getTime(), 'la visita si è spostata prima della conferma', {})
        const mis = await larghezze(page, 's1-dialog-occupato', [['dialog', d], ['Sposta comunque', d.getByRole('button', { name: 'Sposta comunque' })], ['Annulla', d.getByRole('button', { name: 'Annulla' })]])
        await d.getByRole('button', { name: 'Sposta comunque', exact: true }).click()
        await aspetta(async () => (await ref.get()).get('start') === at(giornoVisite, 10, 15).getTime(), 20000).catch(() => {})
        const doc = (await ref.get()).data()
        await page.waitForTimeout(800)
        await page.screenshot({ path: path.join(SHOTS, 's1-dopo-sposta.png') })
        const ora = new Date(doc.start)
        atteso(doc.start === at(giornoVisite, 10, 15).getTime(), 'start su Firestore', { start: ora.toString() })
        return `+15 → dialog «Orario già occupato»: «${testo}»; prima della conferma start invariato; «Sposta comunque» → start ${dayKey(ora)} ${String(ora.getHours()).padStart(2, '0')}:${String(ora.getMinutes()).padStart(2, '0')} su Firestore || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S2 ———
    await caso('S2 Go: visita alle 19:00 → +15 disattivato, «Modifica» con 19:00 scelto', async () => {
      const { ctx, page } = await apri(browser, go)
      try {
        await page.goto(`${APP}/appuntamenti/${ids.s2}`)
        const piu = page.getByRole('button', { name: 'Posticipa +15', exact: true })
        const meno = page.getByRole('button', { name: 'Anticipa −15', exact: true })
        await piu.waitFor({ timeout: 20000 })
        await page.waitForTimeout(800)
        const piuOn = await piu.isEnabled(); const menoOn = await meno.isEnabled()
        const mis1 = await larghezze(page, 's2-visita-19', [['riquadro orario', page.getByTestId('riquadro-orario')]])
        atteso(!piuOn && menoOn, '+15/−15 alle 19:00', { piuOn, menoOn })
        await piu.click({ force: true }).catch(() => {})
        await page.waitForTimeout(600)
        const dialoghi = await page.getByRole('dialog', { name: 'Orario già occupato' }).count() + await page.getByRole('dialog', { name: 'Fuori dall’orario del salone' }).count() + await page.getByRole('dialog', { name: "Fuori dall'orario del salone" }).count()
        const start = (await db.doc(`salons/${G}/appointments/${ids.s2}`).get()).get('start')
        atteso(dialoghi === 0 && start === at(giornoVisite, 19).getTime(), '+15 disattivato ha agito', { dialoghi, start })
        await page.getByRole('button', { name: 'Modifica appuntamento' }).click()
        const gruppo = page.getByRole('group', { name: 'Ora', exact: true })
        await gruppo.waitFor({ timeout: 15000 })
        await page.waitForTimeout(600)
        const b19 = gruppo.getByRole('button', { name: '19:00', exact: true })
        const premuto = await b19.getAttribute('aria-pressed')
        const scelti = await gruppo.locator('button[aria-pressed="true"]').allInnerTexts()
        const mis2 = await larghezze(page, 's2-modifica-19', [['ore', gruppo]], () => b19.scrollIntoViewIfNeeded())
        atteso(premuto === 'true' && scelti.length === 1, '19:00 non scelto in «Modifica»', { premuto, scelti })
        return `+15 disattivato, −15 attivo, il tocco forzato non apre nulla e start resta 19:00; «Modifica appuntamento» → ora scelta ${scelti.join(',')} || ${mis1} || ${mis2}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S3 ———
    await caso('S3 Plus orari 9-13/15-19: 120 min alle 12:45 → «Finisce dopo la chiusura delle 13:00», salvato', async () => {
      const { ctx, page } = await apri(browser, plus)
      try {
        await page.goto(`${APP}/appuntamenti/nuovo?data=${dayKey(giornoVisite)}&cane=${luna}&servizi=tosatura`)
        const gruppo = page.getByRole('group', { name: 'Ora', exact: true })
        await gruppo.waitFor({ timeout: 20000 })
        await page.waitForTimeout(1500)
        const servizio = page.getByRole('button', { name: /^Tosatura completa/ })
        atteso(await servizio.getAttribute('aria-pressed') === 'true', 'servizio da 120 min non scelto', {})
        const b1245 = gruppo.getByRole('button', { name: '12:45', exact: true })
        const b1300 = gruppo.getByRole('button', { name: '13:00', exact: true })
        const on1245 = await b1245.isEnabled(); const chiuso1300 = await b1300.getAttribute('data-chiuso')
        atteso(on1245 && chiuso1300 === 'true', '12:45 selezionabile e 13:00 spento', { on1245, chiuso1300 })
        await b1245.click()
        const avviso = page.getByRole('alert').filter({ hasText: 'Finisce dopo la chiusura delle 13:00' })
        await avviso.waitFor({ timeout: 8000 })
        const testoAvviso = (await avviso.innerText()).trim()
        const mis = await larghezze(page, 's3-avviso-chiusura', [['avviso', avviso]], () => avviso.scrollIntoViewIfNeeded())
        await page.getByRole('button', { name: 'Salva', exact: true }).click()
        const inizio = at(giornoVisite, 12, 45).getTime()
        const trova = async () => (await db.collection(`salons/${P}/appointments`).where('dogId', '==', luna).get()).docs.map((x) => x.data())
        await aspetta(async () => (await trova()).some((d) => d.start === inizio), 20000).catch(() => {})
        await page.waitForTimeout(1200)
        await page.screenshot({ path: path.join(SHOTS, 's3-dopo-salva.png') })
        const salvate = await trova()
        const v = salvate.find((d) => d.start === inizio)
        atteso(v && v.end === at(giornoVisite, 14, 45).getTime(), 'visita 12:45-14:45 non salvata', salvate.map((d) => ({ start: new Date(d.start).toString(), end: d.end && new Date(d.end).toString() })))
        return `12:45 attivo, 13:00 spento (data-chiuso); dopo la scelta «${testoAvviso}»; Salva → visita ${dayKey(giornoVisite)} 12:45-14:45 su Firestore (${salvate.length} visita) , URL ${new URL(page.url()).pathname} || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S4 ———
    await caso('S4 Plus di domenica: nuovo senza data → lunedì 09:00; ?data= domenica → «Il salone è chiuso questo giorno»', async () => {
      const orologio = at(domenica, 10, 30)
      const lunedi = addDays(domenica, 1)
      const { ctx, page } = await apri(browser, plus, { orologio })
      try {
        const oraPagina = await page.evaluate(() => new Date().toString())
        const gruppo = page.getByRole('group', { name: 'Ora', exact: true })
        // Prima il caricamento a freddo dell'indirizzo (ricarica / link diretto): annotato a parte, non decide l'esito.
        await page.goto(`${APP}/appuntamenti/nuovo`)
        await gruppo.waitFor({ timeout: 20000 })
        await page.waitForTimeout(1500)
        const freddo = { giorno: await page.getByLabel('Giorno', { exact: true }).inputValue(), ora: await gruppo.locator('button[aria-pressed="true"]').allInnerTexts() }
        await page.screenshot({ path: path.join(SHOTS, 's4-nuovo-a-freddo.png') })
        S4_FREDDO.push(freddo)
        // Come l'utente: Home, «+» in basso → «Fissa un appuntamento» (impostazioni e piano già caricati).
        await page.goto(`${APP}/`)
        await page.waitForTimeout(2500)
        await page.locator('button.bottom-nav__fab').click()
        await page.getByRole('button', { name: 'Fissa un appuntamento', exact: true }).click()
        await page.waitForURL((u) => u.pathname === '/appuntamenti/nuovo', { timeout: 15000 })
        await gruppo.waitFor({ timeout: 20000 })
        await page.waitForTimeout(1500)
        const giorno = await page.getByLabel('Giorno', { exact: true }).inputValue()
        const scelti = await gruppo.locator('button[aria-pressed="true"]').allInnerTexts()
        const chiusoSenzaData = await page.getByText('Il salone è chiuso questo giorno', { exact: true }).count()
        const mis1 = await larghezze(page, 's4-nuovo-senza-data', [['ore', gruppo]])
        atteso(giorno === dayKey(lunedi) && scelti.length === 1 && scelti[0] === '09:00','giorno/ora proposti', { giorno, atteso: dayKey(lunedi), scelti })
        atteso(chiusoSenzaData === 0, '«chiuso» mostrato sul lunedì', {})
        await page.goto(`${APP}/appuntamenti/nuovo?data=${dayKey(domenica)}`)
        await gruppo.waitFor({ timeout: 20000 })
        await page.waitForTimeout(1200)
        const giorno2 = await page.getByLabel('Giorno', { exact: true }).inputValue()
        const riga = page.getByText('Il salone è chiuso questo giorno', { exact: true })
        const n = await riga.count()
        const accesi = await gruppo.locator('button:not([disabled])').count()
        const mis2 = await larghezze(page, 's4-domenica-chiuso', [['riga chiuso', riga]])
        atteso(giorno2 === dayKey(domenica) && n === 1, 'domenica con ?data=', { giorno2, n })
        return `ora della pagina ${oraPagina}; a freddo (link diretto) giorno ${freddo.giorno} ora ${freddo.ora.join(",")}; dal «+» senza data → giorno ${giorno}, ora ${scelti.join(',')}, nessun «chiuso»; ?data=${dayKey(domenica)} → giorno tenuto (${giorno2}), «Il salone è chiuso questo giorno», ore accese ${accesi} || ${mis1} || ${mis2}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S5 ———
    await caso('S5 Go: disdetta del cliente fra 10 giorni non contata in «Mancati» del Report', async () => {
      const { ctx, page } = await apri(browser, go)
      try {
        const stessoMese = disdettaFutura.getMonth() === oggi.getMonth()
        atteso(stessoMese, 'oggi+10 cade nel mese successivo: caso non applicabile in questa data', { futura: dayKey(disdettaFutura) })
        await page.goto(`${APP}/incassi/report`)
        const mancati = page.getByRole('button').filter({ hasText: 'Mancati' })
        await mancati.first().waitFor({ timeout: 30000 })
        await page.waitForTimeout(1500)
        const testo = (await mancati.first().innerText()).replace(/\s+/g, ' ').trim()
        const mis = await larghezze(page, 's5-report-mancati', [['Mancati', mancati]])
        await mancati.first().click()
        const foglio = page.getByRole('dialog', { name: 'Mancati' })
        await foglio.waitFor({ timeout: 10000 })
        await page.waitForTimeout(600)
        const elenco = (await foglio.innerText()).replace(/\s+/g, ' ').trim()
        await page.screenshot({ path: path.join(SHOTS, 's5-foglio-mancati.png') })
        atteso(/1 disdetto/.test(testo) && numero(testo.replace(/1 disdetto/, '')) === 28, 'figura «Mancati»', testo)
        atteso(elenco.includes('Bobi Passato') && !elenco.includes('Zeno Futuro'), 'elenco dei mancati', elenco)
        return `disdette del cliente: ${dayKey(disdettaPassata)} (Bobi, € 28) e ${dayKey(disdettaFutura)} (Zeno, € 50); «${testo}»; foglio: «${elenco.slice(0, 160)}» senza Zeno || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S6 ———
    await caso('S6 freccia del Report: da Incassi → /incassi, da Impostazioni (anche via Statistiche) → /impostazioni', async () => {
      const { ctx, page } = await apri(browser, plus)
      try {
        const indietro = page.getByRole('link', { name: 'Indietro', exact: true })
        const percorso = []
        const vai = async (u) => { await page.waitForURL((x) => x.pathname === u, { timeout: 15000 }); await page.waitForTimeout(700); percorso.push(u) }
        await page.goto(`${APP}/incassi`); await vai('/incassi')
        await page.getByRole('link', { name: 'Report ed esportazione ›' }).click(); await vai('/incassi/report')
        const mis = await larghezze(page, 's6-report-da-incassi', [['freccia', indietro]])
        await indietro.click(); await vai('/incassi')
        percorso.push('|')
        await page.goto(`${APP}/impostazioni`); await vai('/impostazioni')
        await page.getByRole('link', { name: /^Incassi e report/ }).first().click(); await vai('/incassi/report')
        await page.screenshot({ path: path.join(SHOTS, 's6-report-da-impostazioni.png') })
        await page.getByRole('link', { name: 'Statistiche' }).first().click(); await vai('/incassi/statistiche')
        await indietro.click(); await vai('/incassi/report')
        await indietro.click(); await vai('/impostazioni')
        percorso.push('|')
        await page.goto(`${APP}/incassi/report`); await vai('/incassi/report')
        await page.reload(); await indietro.waitFor({ timeout: 20000 }); await page.waitForTimeout(800)
        await indietro.click(); await vai('/incassi')
        return `percorso ${percorso.join(' → ')} || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S7 ———
    await caso('S7 Calendario Giorno vuoto: 18→19 alta come 17→18, «19:00» intera in fondo (320/360/390/1280)', async () => {
      const { ctx, page } = await apri(browser, go)
      try {
        await page.goto(`${APP}/calendario?vista=giorno&data=${dayKey(giornoVuoto)}`)
        const griglia = page.getByRole('grid', { name: 'Orari' })
        await griglia.waitFor({ timeout: 30000 })
        await page.waitForTimeout(1500)
        const righe = []
        for (const v of [...LARGHEZZE, { width: 1280, height: 800 }]) {
          await page.setViewportSize(v); await page.waitForTimeout(700)
          const r = await page.evaluate(() => {
            const g = document.querySelector('[role=grid][aria-label="Orari"]')
            const etichetta = (t) => [...g.querySelectorAll('span')].find((s) => s.children.length === 0 && s.textContent.trim() === t)
            const centro = (el) => { const b = el.getBoundingClientRect(); return (b.top + b.bottom) / 2 }
            const e17 = etichetta('17:00'); const e18 = etichetta('18:00'); const e19 = etichetta('19:00')
            if (!e17 || !e18 || !e19) return { assenti: [!e17 && '17:00', !e18 && '18:00', !e19 && '19:00'].filter(Boolean) }
            const d1718 = centro(e18) - centro(e17); const d1819 = centro(e19) - centro(e18)
            g.scrollTop = g.scrollHeight
            return { d1718, d1819 }
          })
          await page.waitForTimeout(500)
          const fondo = await page.evaluate(() => {
            const g = document.querySelector('[role=grid][aria-label="Orari"]')
            const e19 = [...g.querySelectorAll('span')].find((s) => s.children.length === 0 && s.textContent.trim() === '19:00')
            const b = e19.getBoundingClientRect(); const c = g.getBoundingClientRect()
            const sopra = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2)
            return {
              e19: [Math.round(b.top * 10) / 10, Math.round(b.bottom * 10) / 10], griglia: [Math.round(c.top * 10) / 10, Math.round(c.bottom * 10) / 10], vh: window.innerHeight,
              scroll: [Math.round(g.scrollTop), g.scrollHeight - g.clientHeight],
              dentro: b.top >= c.top - 0.5 && b.bottom <= c.bottom + 0.5 && b.bottom <= window.innerHeight + 0.5 && b.height > 0,
              scoperta: sopra === e19,
              pagina: document.documentElement.scrollWidth <= window.innerWidth,
            }
          })
          await page.screenshot({ path: path.join(SHOTS, `s7-giorno-vuoto-fondo-${v.width}.png`) })
          const ok = !r.assenti && Math.abs(r.d1819 - r.d1718) <= 1 && fondo.dentro && fondo.scoperta && fondo.pagina
          righe.push({ larghezza: v.width, ...r, ...fondo, ok })
          await page.evaluate(() => { document.querySelector('[role=grid][aria-label="Orari"]').scrollTop = 0 })
        }
        await page.setViewportSize({ width: 390, height: 844 })
        atteso(righe.every((x) => x.ok), 'ultima ora / etichetta 19:00', righe.filter((x) => !x.ok))
        return righe.map((x) => `${x.larghezza}px: 17→18 ${x.d1718.toFixed(1)} px, 18→19 ${x.d1819.toFixed(1)} px; dopo lo scorrimento (${x.scroll.join('/')}) «19:00» ${x.e19.join('–')} in griglia ${x.griglia.join('–')}, non coperta`).join(' | ')
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
}

;(async () => {
  try {
    await browserCasi()
  } finally {
    if (!KEEP) await cancellaTutti()
  }
  console.table(esiti.map((e) => ({ caso: e.nome.slice(0, 80), esito: e.esito })))
  console.log(JSON.stringify({ stamp: STAMP, giornoVisite: dayKey(giornoVisite), giornoVuoto: dayKey(giornoVuoto), domenica: dayKey(domenica), s4AFreddo: S4_FREDDO, esiti, errori }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
