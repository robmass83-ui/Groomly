// Verifica (solo emulatore demo-groomly, app 127.0.0.1:5173 in modo emu): accesso con Firestore irraggiungibile.
// Telefono nuovo (cache vuota), traffico verso Firestore bloccato: deve comparire «Connessione assente», non il modulo
// «Il salone non è stato salvato»; sbloccato il traffico, entra da solo nel salone.
// Uso: node QA-tests/.qa-catalog/verify-accesso-db-irraggiungibile.cjs   (screenshot in QA-tests/results/db-irraggiungibile/)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/db-irraggiungibile'); fs.mkdirSync(SHOTS, { recursive: true })

;(async () => {
  const email = 'qa-dbkO@test.groomly'
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: 'Rete', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${u.uid}/settings/main`).set({ business: { salonName: 'Salone Rete QA', name: 'Salone Rete QA' }, updatedAt: '2026-01-01T00:00:00.000Z' })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const page = await ctx.newPage()
  let blocca = true
  await ctx.route('http://127.0.0.1:8080/**', (route) => (blocca ? route.abort() : route.continue()))
  const esito = {}
  try {
    await page.goto(`${APP}/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('Test1234!')
    await page.getByRole('button', { name: 'Entra', exact: true }).click()
    await page.getByText('Connessione assente').first().waitFor({ timeout: 30000 })
    esito.connessioneAssente = true
    esito.moduloRiparazione = await page.getByText('Il salone non è stato salvato').count()
    await page.screenshot({ path: path.join(SHOTS, '1-bloccato.png') })
    blocca = false
    await page.waitForURL(`${APP}/`, { timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(SHOTS, '2-entrato.png') })
    esito.entrato = true
    esito.pass = esito.moduloRiparazione === 0
  } catch (e) {
    esito.errore = String(e.message || e).slice(0, 300)
    await page.screenshot({ path: path.join(SHOTS, 'errore.png') }).catch(() => undefined)
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify(esito, null, 1)); process.exit(esito.pass ? 0 : 1)
})().catch((e) => { console.error(e); process.exit(1) })
