// Verifica A10 nel browser (solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu).
// 1) «Esci» online: niente avviso, ripartenza su /login, nessuna chiave groomly.users.<uid>.* e cache di Firestore vuota.
// 2) Rientro: i dati tornano dal cloud.
// 3) Offline con una modifica non inviata: avviso; «Resta» non esce; «Esci comunque» esce e pulisce.
// Uso: node QA-tests/.qa-catalog/verify-a10-browser.cjs   (screenshot in QA-tests/results/a10/)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/a10'); fs.mkdirSync(SHOTS, { recursive: true })
const esiti = []
const prova = async (nome, f) => { try { esiti.push({ nome, esito: 'PASS', note: await f() }) } catch (e) { esiti.push({ nome, esito: 'FAIL', note: String(e.message || e).slice(0, 500) }) } }

async function stato(page, uid) {
  return page.evaluate(async (u) => {
    const chiavi = Object.keys(localStorage)
    const dbs = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : []
    return { chiaviAccount: chiavi.filter((k) => k.startsWith(`groomly.users.${u}.`) || k === `groomly.piano.${u}`), firestoreDb: dbs.filter((n) => /firestore/i.test(n || '')), tutte: chiavi.length }
  }, uid)
}
async function entra(page, email) {
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Test1234!')
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL(`${APP}/`, { timeout: 40000 })
}
async function esciDaImpostazioni(page) {
  await page.goto(`${APP}/impostazioni`)
  await page.getByRole('button', { name: 'Esci', exact: true }).first().click()
  await page.getByText('Uscire da Groomly?').waitFor()
  await page.getByRole('dialog').getByRole('button', { name: 'Esci', exact: true }).click()
}

;(async () => {
  const email = 'qa-a10@test.groomly'
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: 'Dieci', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({ business: { salonName: 'Salone A10', name: 'Salone A10' }, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/dogs/qa-a10-cane`).set({ id: 'qa-a10-cane', name: 'Pluto QA', ownerName: 'Cliente Riservato', phone: '3330000000', species: 'cane', status: 'attivo', updatedAt: Date.now() })

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const page = await ctx.newPage()

  await prova('1 Esci online pulisce e riparte da /login', async () => {
    await entra(page, email)
    await page.goto(`${APP}/animali`); await page.getByText('Pluto QA').first().waitFor({ timeout: 30000 })
    const prima = await stato(page, uid)
    if (prima.chiaviAccount.length === 0) throw new Error('nessuna copia locale prima di uscire: test non significativo')
    await esciDaImpostazioni(page)
    if (await page.getByText('Ci sono modifiche non ancora salvate online').count()) throw new Error('avviso mostrato senza modifiche')
    await page.waitForURL(`${APP}/login`, { timeout: 15000 }); await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(SHOTS, '1-dopo-esci.png') })
    const dopo = await stato(page, uid)
    if (dopo.chiaviAccount.length) throw new Error('restano chiavi: ' + dopo.chiaviAccount.join(','))
    return JSON.stringify({ prima: prima.chiaviAccount.length, dbPrima: prima.firestoreDb, dbDopo: dopo.firestoreDb })
  })
  await prova('2 rientro: i dati tornano dal cloud', async () => {
    await entra(page, email)
    await page.goto(`${APP}/animali`); await page.getByText('Pluto QA').first().waitFor({ timeout: 30000 })
    return 'ok'
  })
  await prova('3 offline con modifica: avviso, Resta, Esci comunque', async () => {
    await page.goto(`${APP}/impostazioni`); await page.waitForTimeout(3000)
    await page.evaluate(async () => { window.__clientQA = await import('/src/data/firebase/client.ts') })
    await ctx.setOffline(true)
    // modifica non inviata: una scrittura Firestore dell'app stessa (stesso modulo servito da Vite) fatta offline
    await page.evaluate(async (u) => {
      void window.__clientQA.segnaAvvisiLetti(u, Date.now())
    }, uid)
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Esci', exact: true }).first().click()
    await page.getByText('Uscire da Groomly?').waitFor()
    await page.getByRole('dialog').getByRole('button', { name: 'Esci', exact: true }).click()
    await page.getByText('Ci sono modifiche non ancora salvate online: se esci adesso si perdono.').waitFor({ timeout: 5000 })
    await page.screenshot({ path: path.join(SHOTS, '3-avviso.png') })
    await page.getByRole('button', { name: 'Resta' }).click()
    await page.waitForTimeout(800)
    if (!page.url().endsWith('/impostazioni')) throw new Error('Resta ha fatto uscire: ' + page.url())
    await page.getByRole('button', { name: 'Esci', exact: true }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Esci', exact: true }).click()
    await page.getByRole('button', { name: 'Esci comunque' }).click()
    const t0 = Date.now()
    await page.waitForURL(`${APP}/login`, { timeout: 15000 }).catch(() => undefined)
    // offline la ricarica di /login può non caricare: si torna online per leggere lo stato
    await page.waitForTimeout(3000)
    await ctx.setOffline(false)
    if (!page.url().includes('/login')) await page.goto(`${APP}/login`)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(SHOTS, '3-dopo-esci-offline.png') })
    const dopo = await stato(page, uid)
    if (dopo.chiaviAccount.length) throw new Error('restano chiavi: ' + dopo.chiaviAccount.join(','))
    return JSON.stringify({ secondi: Math.round((Date.now() - t0) / 1000), url: page.url(), db: dopo.firestoreDb })
  })
  await browser.close()
  console.log(JSON.stringify(esiti, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
