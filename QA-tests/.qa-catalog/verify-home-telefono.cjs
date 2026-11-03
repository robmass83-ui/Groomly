// Verifica medie «Home e telefono», audit 31 e 34 (solo emulatore demo-groomly; Task 4 del piano 2026-11-03-medie-home-telefono).
// Il 32 (schermata «Sveglie e promemoria» di Android) non si vede nel browser: coperto da src/lib/notificheLocali.test.ts.
// App Vite in modo emu su 127.0.0.1:5173. Account e salone nuovi a ogni giro (firebase-admin).
// H1 Home a 320, 360 e 390 px con un promemoria e gli auguri di un cane dal nome lungo: ogni riga in una scheda,
//    nessun testo tagliato (scrollWidth <= clientWidth per ogni elemento di testo), nessuno scorrimento orizzontale.
// R1 ripristino in cloud di un backup con 37 cani e 499 visite in un salone vuoto: compare «Ripristino i dati… N di 536»,
//    N cresce, finisce con «Ripristinato»; tempo misurato; su Firestore 37 cani e 499 visite.
// Uso: node QA-tests/.qa-catalog/verify-home-telefono.cjs [--keep] [--solo=H1,R1]
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
const SHOTS = path.resolve('QA-tests/results/home-telefono')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '08:00', a: '20:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
const BAGNO = { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } }
const LUNGO = 'Gingerina Principessa del Borgo Antico'

const creati = []
async function utente(nome, extra = {}) {
  const email = `qa-ht-${nome.toLowerCase()}-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} HT ${STAMP}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223', vatNumber: '', taxCode: '', address: '' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z', ...extra,
  })
  await db.doc(`salons/${u.uid}/pro/main`).set(SALONE)
  await db.doc(`salons/${u.uid}/services/bagno`).set({ ...BAGNO, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  return { uid: u.uid, email, nome }
}
function caneDoc(id, name, extra = {}) {
  const now = Date.now()
  return { id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6, ...extra }
}

const esiti = []
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s))) return
  try {
    esiti.push({ nome, esito: 'PASS', note: await fnc() })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

const errori = []
async function apri(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    // ——— H1 ———
    const oggi = new Date()
    const nora = await utente('Nora', { serviziEmail: { promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, auguri: { modo: 'automatico', ora: '09:00' } } })
    await db.doc(`salons/${nora.uid}/dogs/qa-ht-comp-${STAMP}`).set(caneDoc(`qa-ht-comp-${STAMP}`, LUNGO, { birthMonth: oggi.getMonth() + 1, birthDay: oggi.getDate(), birthYear: 2020, contact: { name: 'Prova QA', phone: '+39 333 0000002', email: 'gingerina@example.com' } }))
    await db.doc(`salons/${nora.uid}/dogs/qa-ht-dom-${STAMP}`).set(caneDoc(`qa-ht-dom-${STAMP}`, `${LUNGO} Seconda`, { contact: { name: 'Prova QA', phone: '+39 333 0000003', email: 'seconda@example.com' } }))
    const dom = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1, 11)
    await db.doc(`salons/${nora.uid}/appointments/qa-ht-v-dom-${STAMP}`).set({ id: `qa-ht-v-dom-${STAMP}`, dogId: `qa-ht-dom-${STAMP}`, kind: 'pelosetto', start: dom.getTime(), end: dom.getTime() + 1800000, services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }], status: 'programmato', createdAt: Date.now() - 864e5, updatedAt: Date.now() - 864e5 })
    await caso('H1 Home: promemoria e auguri in una scheda, nessun testo tagliato a 320/360/390', async () => {
      const { ctx, page } = await apri(browser, nora)
      try {
        await page.goto(`${APP}/`)
        await page.locator('[data-scheda="riga-home"]').first().waitFor({ timeout: 30000 })
        await page.waitForTimeout(1500)
        const out = {}
        for (const v of LARGHEZZE) {
          await page.setViewportSize(v); await page.waitForTimeout(700)
          const schede = page.locator('[data-scheda="riga-home"]')
          const n = await schede.count()
          const misure = []
          for (let i = 0; i < n; i += 1) {
            misure.push(await schede.nth(i).evaluate((scheda) => {
              const r = scheda.getBoundingClientRect()
              const tagliati = [...scheda.querySelectorAll('span, button')].filter((el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === 'ellipsis').map((el) => el.textContent)
              return { testo: scheda.innerText.replace(/\n/g, ' | '), tagliati, dentro: r.left >= -0.5 && r.right <= window.innerWidth + 0.5, sw: scheda.scrollWidth, cw: scheda.clientWidth }
            }))
          }
          const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
          await schede.first().scrollIntoViewIfNeeded()
          await page.screenshot({ path: path.join(SHOTS, `h1-home-${v.width}.png`) })
          out[`${v.width}px`] = { pagina, misure }
        }
        const tutte = Object.values(out).flatMap((m) => m.misure)
        const promemoria = tutte.some((m) => m.testo.includes(`${LUNGO} Seconda`) && m.testo.includes('Promemoria'))
        const auguri = tutte.some((m) => m.testo.includes(`È il compleanno di ${LUNGO}`))
        atteso(promemoria && auguri, 'righe promemoria e auguri presenti', tutte.map((m) => m.testo))
        atteso(tutte.every((m) => m.tagliati.length === 0 && m.dentro && m.sw <= m.cw + 1), 'testo tagliato o fuori schermo', out)
        atteso(Object.values(out).every((m) => m.pagina.sw <= m.pagina.iw), 'scorrimento orizzontale', out)
        return Object.entries(out).map(([k, m]) => `${k}: pagina ${m.pagina.sw}/${m.pagina.iw}, ${m.misure.length} schede ok`).join(' | ') + ` || ${tutte.slice(0, 2).map((m) => m.testo).join(' ## ')}`
      } finally { await ctx.close() }
    })

    // ——— R1 ———
    const rita = await utente('Rita')
    await caso('R1 ripristino di 37 cani e 499 visite: avanzamento visibile, finisce, dati su Firestore', async () => {
      const ora = Date.now()
      const iso = (ms) => new Date(ms).toISOString()
      const dogs = {}; const appointments = {}
      for (let i = 0; i < 37; i += 1) {
        const id = `qa-ht-r-cane-${i}-${STAMP}`
        dogs[id] = { id, name: `Cane ${i}`, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'QA', phone: '+39 333 0000000' }, contacts: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', createdAt: iso(ora - 9e9), updatedAt: iso(ora - 9e9) }
      }
      const cani = Object.keys(dogs)
      for (let i = 0; i < 499; i += 1) {
        const id = `qa-ht-r-v-${i}-${STAMP}`
        const start = ora - (i + 1) * 864e5 / 2
        appointments[id] = { id, dogId: cani[i % cani.length], start: iso(start), end: iso(start + 1800000), services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }], status: 'completato', total: 20, paymentMethod: 'contanti', createdAt: iso(start), updatedAt: iso(start), tools: [], products: [], photos: [] }
      }
      const settings = (await db.doc(`salons/${rita.uid}/settings/main`).get()).data()
      const { ctx, page } = await apri(browser, rita)
      try {
        await page.goto(`${APP}/impostazioni`)
        await page.getByLabel('Scegli backup').waitFor({ state: 'attached', timeout: 20000 })
        await page.getByLabel('Scegli backup').setInputFiles({ name: 'groomly-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ dogs, appointments, services: { bagno: { ...BAGNO, createdAt: iso(ora - 9e9), updatedAt: iso(ora - 9e9) } }, settings })) })
        const dialogo = page.getByRole('dialog', { name: 'Ripristina' })
        await dialogo.waitFor({ timeout: 20000 })
        await dialogo.getByLabel('Per sostituire tutto').fill('SOSTITUISCI')
        const t0 = Date.now()
        await dialogo.getByRole('button', { name: 'Ripristina', exact: true }).last().click()
        const visti = []
        let fine = null
        while (Date.now() - t0 < 25 * 60 * 1000) {
          const testo = await page.evaluate(() => document.body.innerText)
          const m = testo.match(/Ripristino i dati… (\d+) di (\d+)/)
          if (m) visti.push([Number(m[1]), Number(m[2]), Math.round((Date.now() - t0) / 1000)])
          if (/Ripristinato/.test(testo)) { fine = Date.now(); break }
          if (/Ripristino incompleto/.test(testo)) throw new Error('Ripristino incompleto')
          if (visti.length === 3) await page.screenshot({ path: path.join(SHOTS, 'r1-avanzamento.png') })
          await page.waitForTimeout(1000)
        }
        atteso(fine !== null, 'ripristino non finito in 25 minuti', visti.slice(-3))
        const secondi = Math.round((fine - t0) / 1000)
        await page.screenshot({ path: path.join(SHOTS, 'r1-fine.png') })
        const nCani = (await db.collection(`salons/${rita.uid}/dogs`).get()).size
        const nVisite = (await db.collection(`salons/${rita.uid}/appointments`).get()).size
        const crescente = visti.every((v, i) => i === 0 || v[0] >= visti[i - 1][0])
        atteso(visti.length > 0 && visti.every((v) => v[1] === 536) && crescente, 'avanzamento non visto o non crescente', visti)
        atteso(nCani === 37 && nVisite === 499, 'dati su Firestore', { nCani, nVisite })
        return `finito in ${secondi} s; avanzamento visto ${visti.length} volte (${visti.slice(0, 2).map((v) => `${v[0]} di ${v[1]} a ${v[2]} s`).join(', ')} … ${visti.slice(-1).map((v) => `${v[0]} di ${v[1]} a ${v[2]} s`)}); Firestore ${nCani} cani, ${nVisite} visite`
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
  console.log(JSON.stringify({ stamp: STAMP, esiti, errori }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
