// Task 4 (medie «Dati e caricamento»): la Home non mostra «Nessun appuntamento» / «0» prima dei dati.
// Solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu.
// Semina un salone con un cane e tre visite OGGI (una chiusa con incasso), entra con la rete rallentata
// (CDP Network.emulateNetworkConditions) e campiona la Home ogni 300 ms per 15 s, dopo l'accesso e dopo una ricarica
// (in ricarica si rallentano solo le richieste all'emulatore Firestore).
// Registra gli stati distinti dei riquadri (agenda, «Oggi», «Incassi oggi», «Mensili») e salva uno screenshot a ogni cambio.
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

;(async () => {
  const email = 'qa-home-attesa@test.groomly'
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  const now = Date.now()
  await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: 'Home', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({ business: { salonName: 'Salone Home', name: 'Salone Home' }, updatedAt: '2026-01-01T00:00:00.000Z' })
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

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Test1234!')
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: LATENZA, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 })
  let t0 = Date.now()
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  const accesso = await campiona(page, 15000, 'accesso', t0)
  // Ricarica: con tutta la rete lenta Vite impiega minuti a servire i moduli; si rallenta solo Firestore
  // (ogni richiesta all'emulatore parte 1,5 s dopo), così l'app si apre e i dati arrivano tardi.
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await page.route('http://127.0.0.1:8080/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue().catch(() => {}) })
  t0 = Date.now()
  await page.reload({ waitUntil: 'commit', timeout: 120000 })
  const ricarica = await campiona(page, 15000, 'ricarica', t0)
  await browser.close()
  await db.recursiveDelete(db.doc(`salons/${uid}`)); await db.recursiveDelete(db.doc(`accounts/${uid}`)); await auth.deleteUser(uid)

  // Un riquadro che mostra zero/vuoto e più tardi i dati veri è il difetto cercato.
  const tutte = [...accesso, ...ricarica]
  const difetti = tutte.filter((r) => /NESSUN APPUNTAMENTO|"oggi":"[^"]*\b0 · |"incassi":"[^"]*€\s*0|0\/0/.test(r))
  console.log(`\nStati con zero/vuoto prima dei dati: ${difetti.length}`)
  for (const r of difetti) console.log('  ' + r)
  process.exit(difetti.length === 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
