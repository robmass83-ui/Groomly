// Verifica delle tre piccole decisioni dopo A7 (solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu).
// 1) confermaAttesaPer compilata: con la lista spenta solo «esci» passa.
// 2) Browser: collaboratore con l'app aperta, il titolare lo revoca → l'app riparte nel suo salone.
// Uso: node QA-tests/.qa-catalog/verify-piccole-dopo-a7.cjs   (screenshot in QA-tests/results/piccole-a7/)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const fn = req('./lib/functions/src/index.js')
const { confermaAttesaPer } = req('./lib/functions/src/piano/confermaAttesa.js')
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/piccole-a7'); fs.mkdirSync(SHOTS, { recursive: true })
const esiti = []
const prova = async (nome, f) => { try { esiti.push({ nome, esito: 'PASS', note: await f() }) } catch (e) { esiti.push({ nome, esito: 'FAIL', note: String(e.message || e).slice(0, 400) }) } }
const aspetta = (cond, ms = 30000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(true) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
async function utente(email, nome, salone) {
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: 'QA', createdAt: new Date().toISOString() })
  await db.doc(`salons/${u.uid}/settings/main`).set({ business: { salonName: salone, name: salone }, updatedAt: '2026-01-01T00:00:00.000Z' })
  return u.uid
}

;(async () => {
  // 1) lista d'attesa spenta: esci passa, conferma no
  await prova('lista spenta: esci passa, conferma no', async () => {
    const S = 'qa-piccole-attesa'
    await db.recursiveDelete(db.doc(`salons/${S}`))
    await db.doc(`salons/${S}/settings/main`).set({ serviziEmail: { attesa: { modo: 'spento' } } })
    await db.doc(`salons/${S}/attesa/i1`).set({ attivo: true, nomeCane: 'Fido', email: 'c@test.groomly' })
    const token = 'qaPiccoleToken12345678'
    await db.doc(`salons/${S}/offerteAttesa/o1`).set({ token, appointmentId: 'v1', iscrittoId: 'i1', inizio: new Date(Date.now() + 86400000).toISOString() })
    const adesso = new Date()
    const conferma = await confermaAttesaPer({ salonId: S, token, azione: 'conferma', adesso })
    const esci = await confermaAttesaPer({ salonId: S, token, azione: 'esci', adesso })
    const attivo = (await db.doc(`salons/${S}/attesa/i1`).get()).data().attivo
    if (conferma.errore !== 'spento' || esci.esito !== 'uscito' || attivo !== false) throw new Error(JSON.stringify({ conferma, esci, attivo }))
    return JSON.stringify({ conferma, esci, attivo })
  })

  // 2) collaboratore con l'app aperta, revocato dal titolare
  const eH = 'qa-piccole-host@test.groomly'; const eC = 'qa-piccole-collab@test.groomly'
  const H = await utente(eH, 'Host', 'Salone Host Piccole')
  const C = await utente(eC, 'Collab', 'Salone di Collab')
  await db.doc(`salons/${H}/pro/main`).set({ enabled: true, piano: 'salone', stato: 'attivo', fonte: 'omaggio' })
  await db.doc(`salons/${H}/members/${C}`).set({ uid: C, email: eC, role: 'collaboratore', firstName: 'Collab', lastName: 'QA', status: 'attivo' })
  await db.doc(`accounts/${C}`).set({ salonId: H, role: 'collaboratore' }, { merge: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const page = await ctx.newPage()
  await prova('collaboratore revocato con l’app aperta riparte nel suo salone', async () => {
    await page.goto(`${APP}/login`)
    await page.getByLabel('Email').fill(eC)
    await page.getByLabel('Password', { exact: true }).fill('Test1234!')
    await page.getByRole('button', { name: 'Entra', exact: true }).click()
    await page.waitForURL(`${APP}/`, { timeout: 30000 }); await page.waitForTimeout(4000)
    await page.goto(`${APP}/impostazioni`); await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(SHOTS, 'prima-revoca.png') })
    const primaHost = await page.getByText('Salone Host Piccole').count()
    let navigazioni = 0; page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigazioni++ })
    await fn.revokeMember.run({ auth: { uid: H, token: { email: eH, email_verified: true } }, data: { uid: C }, rawRequest: { headers: {} } })
    await aspetta(async () => navigazioni > 0)
    await page.waitForTimeout(5000)
    await page.goto(`${APP}/impostazioni`); await page.waitForTimeout(4000)
    await page.screenshot({ path: path.join(SHOTS, 'dopo-revoca.png') })
    if (await page.getByText('Il titolare ha spento il piano').count()) throw new Error('messaggio «spento» ancora visibile')
    const dopoProprio = await page.getByText('Salone di Collab').count()
    const tornaVisibile = await page.getByText('Torna al mio salone').count()
    if (!dopoProprio || tornaVisibile) throw new Error(JSON.stringify({ primaHost, dopoProprio, tornaVisibile }))
    return JSON.stringify({ primaHost, navigazioni, dopoProprio })
  })
  await browser.close()
  console.log(JSON.stringify(esiti, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
