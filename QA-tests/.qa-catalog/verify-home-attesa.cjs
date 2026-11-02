// Task 4 (medie «Dati e caricamento»): la Home non mostra «Nessun appuntamento» / «0» prima dei dati.
// Solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu.
// Semina un salone con un cane e tre visite OGGI (una chiusa con incasso), entra con la rete rallentata
// (CDP Network.emulateNetworkConditions) e campiona la Home ogni 300 ms per 15 s, dopo l'accesso e dopo una ricarica
// (in ricarica si rallentano solo le richieste all'emulatore Firestore).
// Registra gli stati distinti dei riquadri (agenda, «Oggi», «Incassi oggi», «Mensili») e salva uno screenshot a ogni cambio.
// Scenari: (1) rete lenta all'accesso e ricarica; (2) primo accesso con le richieste a Firestore trattenute 12 s
// (la rivelazione del vuoto a 8,5 s scatta prima dei dati); (3) salone davvero vuoto: «Nessun appuntamento» e «0 · 0m».
// Uso: node QA-tests/.qa-catalog/verify-home-attesa.cjs [latenzaMs]
const path = require('path')
const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const LATENZA = Number(process.argv[2] || 600)
const OUT = path.resolve('QA-tests/.qa-catalog/work/home-attesa')
fs.mkdirSync(OUT, { recursive: true })

// Stato visibile dei riquadri della Home (testo, senza dipendere dallo stile).
async function stato(page) {
  return page.evaluate(() => {
    const testo = document.body.innerText
    const tile = (etichetta) => {
      const el = [...document.querySelectorAll('a,span')].find((n) => n.children.length >= 2 && [...n.children].some((c) => c.textContent === etichetta))
      if (!el) return null
      return [...el.children].map((c) => c.textContent).filter(Boolean).join(' | ')
    }
    const mensili = [...document.querySelectorAll('a[href="/mensili"]')].map((n) => n.innerText.replace(/\s+/g, ' ')).join(' ')
    return {
      url: location.pathname,
      agenda: testo.includes('Nessun appuntamento') ? 'NESSUN APPUNTAMENTO' : testo.includes("Carico l'agenda") ? 'attesa' : testo.includes('Fido Oggi') ? 'visite' : '-',
      oggi: tile('Oggi'),
      incassi: tile('Incassi oggi') ?? (document.querySelector('[aria-label="Incassi di oggi in caricamento"]') ? 'attesa …' : null),
      mensili: mensili || null,
    }
  }).catch((e) => ({ errore: String(e.message || e).slice(0, 80) }))
}

async function campiona(page, ms, etichetta, t0) {
  const righe = []
  let ultimo = ''
  let n = 0
  const inizio = Date.now()
  while (Date.now() - inizio < ms) {
    const s = await stato(page)
    const k = JSON.stringify(s)
    if (k !== ultimo) {
      n += 1
      const file = path.join(OUT, `${etichetta}-${String(n).padStart(2, '0')}.png`)
      await page.screenshot({ path: file }).catch(() => {})
      const riga = `${String(Date.now() - t0).padStart(6)}ms [${etichetta}] ${k}`
      console.log(riga); righe.push(riga); ultimo = k
    }
    await page.waitForTimeout(300)
  }
  return righe
}

const DIFETTO = /NESSUN APPUNTAMENTO|"oggi":"[^"]*\b0 · |"incassi":"[^"]*€\s*0|0\/0/

async function semina(email, conDati) {
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) await cancella(old.uid)
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  const now = Date.now()
  await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: 'Home', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({ business: { salonName: 'Salone Home', name: 'Salone Home' }, updatedAt: '2026-01-01T00:00:00.000Z' })
  if (!conDati) return uid
  const dogId = 'qa-home-cane'
  await db.doc(`salons/${uid}/dogs/${dogId}`).set({ id: dogId, name: 'Fido Oggi', species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'mensile', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: 'fido oggi', createdAt: now - 864e6, updatedAt: now - 864e6 })
  const svc = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 35 }]
  const oggi = new Date(); const ore = (h) => new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), h, 0, 0, 0).getTime()
  const visite = [
    ['qa-home-v1', ore(9), { status: 'completato', total: 35, chiusoIl: ore(10) }],
    ['qa-home-v2', ore(11), {}],
    ['qa-home-v3', ore(23), {}],
  ]
  for (const [id, start, extra] of visite) {
    await db.doc(`salons/${uid}/appointments/${id}`).set({ id, dogId, start, end: start + 1800000, services: svc, status: 'programmato', kind: 'pelosetto', createdAt: now - 864e6, updatedAt: now - 864e6, ...extra })
  }
  return uid
}
async function cancella(uid) {
  await db.recursiveDelete(db.doc(`salons/${uid}`)); await db.recursiveDelete(db.doc(`accounts/${uid}`)); await auth.deleteUser(uid).catch(() => {})
}
async function entra(page, email) {
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Test1234!')
}

;(async () => {
  const uids = []
  let browser = null
  const esiti = []
  try {
    const email = 'qa-home-attesa@test.groomly'
    const emailVuoto = 'qa-home-vuoto@test.groomly'
    uids.push(await semina(email, true), await semina(emailVuoto, false))
    browser = await chromium.launch()

    // (1) Rete lenta all'accesso (CDP), poi ricarica con le sole richieste all'emulatore ritardate di 1,5 s.
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
      const page = await ctx.newPage()
      const cdp = await ctx.newCDPSession(page)
      await entra(page, email)
      await cdp.send('Network.enable')
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: LATENZA, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 })
      let t0 = Date.now()
      await page.getByRole('button', { name: 'Entra', exact: true }).click()
      const accesso = await campiona(page, 15000, 'accesso', t0)
      // Con tutta la rete lenta Vite impiega minuti a servire i moduli: in ricarica si rallenta solo Firestore.
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
      await page.route('http://127.0.0.1:8080/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue().catch(() => {}) })
      t0 = Date.now()
      await page.reload({ waitUntil: 'commit', timeout: 120000 })
      const ricarica = await campiona(page, 15000, 'ricarica', t0)
      esiti.push({ scenario: 'rallentata', difetti: [...accesso, ...ricarica].filter((r) => DIFETTO.test(r)) })
      await ctx.close()
    }

    // (2) Primo accesso, IndexedDB vuoto: per 12 s da quando l'app lascia /login il server tace (le richieste all'emulatore
    // aspettano la fine della finestra), così la rivelazione del vuoto (2,5 s + 6 s) scatta prima che arrivino agenda e cani.
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
      const page = await ctx.newPage()
      let silenzioFino = 0
      let trattenute = 0
      const silenzio = () => { if (silenzioFino === 0) silenzioFino = Date.now() + 12000 }
      await page.route('http://127.0.0.1:8080/**', async (route) => {
        const resta = silenzioFino - Date.now()
        if (resta > 0) { trattenute += 1; await new Promise((r) => setTimeout(r, resta)) }
        await route.continue().catch(() => {})
      })
      await entra(page, email)
      const t0 = Date.now()
      // Il silenzio parte quando l'app lascia /login: account già letto, ascolti di agenda e cani non ancora partiti.
      page.on('framenavigated', (f) => { if (f === page.mainFrame() && !f.url().includes('/login')) silenzio() })
      await page.evaluate(() => {
        const push = history.pushState.bind(history)
        history.pushState = (...a) => { window.__lasciatoLogin = true; return push(...a) }
      })
      const sorveglia = setInterval(() => { page.evaluate(() => window.__lasciatoLogin === true).then((v) => { if (v) silenzio() }).catch(() => {}) }, 20)
      await page.getByRole('button', { name: 'Entra', exact: true }).click()
      const righe = await campiona(page, 40000, 'trattenuta', t0)
      clearInterval(sorveglia)
      console.log(`richieste trattenute: ${trattenute}`)
      const finale = righe[righe.length - 1]
      // Alla fine i dati veri devono esserci: visite di oggi e mensili contati.
      if (!/"agenda":"visite"/.test(finale) || !/"mensili":"1\/1/.test(finale)) righe.push(`FINALE SENZA DATI ${finale}`)
      esiti.push({ scenario: 'trattenuta', trattenute, difetti: righe.filter((r) => DIFETTO.test(r) || r.startsWith('FINALE')), finale })
      await ctx.close()
    }

    // (3) Salone davvero vuoto, rete normale: a dati arrivati deve dire «Nessun appuntamento» e «0 · 0m».
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
      const page = await ctx.newPage()
      await entra(page, emailVuoto)
      const t0 = Date.now()
      await page.getByRole('button', { name: 'Entra', exact: true }).click()
      const righe = await campiona(page, 10000, 'vuoto', t0)
      const ultimo = righe[righe.length - 1]
      esiti.push({ scenario: 'vuoto', ok: /NESSUN APPUNTAMENTO/.test(ultimo) && /"oggi":"0 · 0m/.test(ultimo), finale: ultimo })
      await ctx.close()
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    for (const uid of uids) await cancella(uid).catch(() => {})
  }

  console.log('\n' + JSON.stringify(esiti, null, 1))
  const ok = esiti.every((e) => (e.difetti ? e.difetti.length === 0 : e.ok))
  process.exit(ok ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
