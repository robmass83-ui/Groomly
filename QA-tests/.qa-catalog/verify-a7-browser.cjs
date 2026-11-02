// Verifica A7 nel browser (solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu).
// Le callable dell'emulatore danno INTERNAL: le chiamate a :5001 si intercettano e si eseguono con le funzioni compilate (.run).
// Uso: node QA-tests/.qa-catalog/verify-a7-browser.cjs   (screenshot in QA-tests/results/a7/)
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const fn = req('./lib/functions/src/index.js')
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/a7'); fs.mkdirSync(SHOTS, { recursive: true })
const tok = (c) => c.repeat(64)
const giorni = (n) => new Date(Date.now() + n * 86400000).toISOString()
const STATUS = { 'failed-precondition': 'FAILED_PRECONDITION', 'permission-denied': 'PERMISSION_DENIED', internal: 'INTERNAL', unauthenticated: 'UNAUTHENTICATED', 'invalid-argument': 'INVALID_ARGUMENT' }
const chiamate = []

async function utente(email, nome, salone, conDati) {
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: 'QA', createdAt: new Date().toISOString() })
  await db.doc(`salons/${u.uid}/settings/main`).set({ business: { salonName: salone, name: salone }, prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'automatico' } }, updatedAt: '2026-01-01T00:00:00.000Z' })
  if (conDati) await db.doc(`salons/${u.uid}/dogs/qa-a7-cane`).set({ id: 'qa-a7-cane', name: 'Fido QA', ownerName: 'Cliente QA', species: 'cane', status: 'attivo', updatedAt: Date.now() })
  return u.uid
}
async function stato(uid) {
  const s = (await db.doc(`salons/${uid}/settings/main`).get()).data() ?? {}
  const p = (await db.doc(`salons/${uid}/pro/main`).get()).data() ?? {}
  const a = (await db.doc(`accounts/${uid}`).get()).data() ?? null
  return { prenotazioni: s.prenotazioniOnline, attesa: s.serviziEmail?.attesa?.modo, pausa: !!p.pausa, salonId: a?.salonId === uid ? '<proprio>' : a?.salonId, role: a?.role, nomeSalone: s.business?.salonName }
}
async function instrada(context) {
  await context.route('http://127.0.0.1:5001/**', async (route) => {
    const nome = new URL(route.request().url()).pathname.split('/').pop()
    const bearer = (route.request().headers().authorization || '').replace(/^Bearer /, '')
    let payload = {}
    try { payload = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()) } catch { /* senza accesso */ }
    const data = JSON.parse(route.request().postData() || '{}').data ?? {}
    chiamate.push({ nome, data })
    const f = fn[nome]
    if (nome === 'sendVerificationEmail' || !f || typeof f.run !== 'function') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
    try {
      const result = await f.run({ auth: payload.user_id ? { uid: payload.user_id, token: { email: payload.email, email_verified: true } } : undefined, data, rawRequest: { headers: {} } })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: result ?? null }) })
    } catch (e) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { status: STATUS[e.code] || 'INTERNAL', message: e.message } }) })
    }
  })
}
const esiti = []
async function prova(nome, fnc) {
  try { const note = await fnc(); esiti.push({ nome, esito: 'PASS', note }) } catch (e) { esiti.push({ nome, esito: 'FAIL', note: String(e.message || e).slice(0, 400) }) }
}
async function entra(page, email) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('Test1234!')
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
}
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(true) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})

;(async () => {
  const eA = 'qa-a7b-luna@test.groomly'; const eB = 'qa-a7b-host@test.groomly'; const eD = 'qa-a7b-dora@test.groomly'
  const A = await utente(eA, 'Luna', 'Toelettatura Luna', true)
  const B = await utente(eB, 'Host', 'Salone Host QA', true)
  await db.doc(`salons/${B}/pro/main`).set({ enabled: true, piano: 'salone', stato: 'attivo', fonte: 'omaggio' })
  const vecchioD = await auth.getUserByEmail(eD).catch(() => null)
  if (vecchioD) { await db.recursiveDelete(db.doc(`salons/${vecchioD.uid}`)); await db.recursiveDelete(db.doc(`accounts/${vecchioD.uid}`)); await auth.deleteUser(vecchioD.uid) }
  for (const [t, e] of [['f', eA], ['9', eD]]) await db.doc(`invites/${tok(t)}`).set({ status: 'aperto', email: e, salonId: B, role: 'collaboratore', expiresAt: giorni(7) })

  const browser = await chromium.launch()
  // F1: da sloggata → Entra → torna all'invito → avviso col nome → pausa → dentro il salone che invita
  const ctx1 = await browser.newContext({ viewport: { width: 400, height: 860 } }); await instrada(ctx1)
  const p1 = await ctx1.newPage()
  await prova('F1 link da sloggata, Entra, avviso, pausa', async () => {
    await p1.goto(`${APP}/invito/${tok('f')}`)
    await p1.getByRole('link', { name: 'Crea account' }).or(p1.getByRole('button', { name: 'Crea account' })).first().waitFor()
    await p1.getByRole('link', { name: 'Entra', exact: true }).or(p1.getByRole('button', { name: 'Entra', exact: true })).first().click()
    await entra(p1, eA)
    await p1.getByText('Hai già un salone su Groomly').waitFor({ timeout: 30000 })
    const testo = await p1.getByText(/Hai già un account Groomly con il salone Toelettatura Luna/).count()
    if (!testo) throw new Error('nome del salone assente nell’avviso')
    await p1.screenshot({ path: path.join(SHOTS, 'f1-avviso.png') })
    await p1.getByRole('button', { name: /Metti in pausa il mio salone/ }).click()
    await aspetta(async () => (await stato(A)).salonId === B)
    await p1.waitForURL(`${APP}/`, { timeout: 30000 }); await p1.waitForTimeout(3000)
    await p1.screenshot({ path: path.join(SHOTS, 'f1-dentro-host.png') })
    const s = await stato(A); const inv = (await db.doc(`invites/${tok('f')}`).get()).data()
    if (s.prenotazioni !== false || s.attesa !== 'spento' || !s.pausa || s.role !== 'collaboratore' || inv.status !== 'usato') throw new Error(JSON.stringify({ s, inv: inv.status }))
    const sospeso = await p1.evaluate(() => localStorage.getItem('groomly.invitoInSospeso'))
    if (sospeso) throw new Error('token ancora ricordato')
    const vediCaneHost = await p1.getByText('Salone Host QA').count()
    return JSON.stringify(s) + ` | nome host in pagina: ${vediCaneHost}`
  })
  // F2: Impostazioni → Torna al mio salone → conferma → di nuovo nel suo salone, com'era
  await prova('F2 Torna al mio salone', async () => {
    await p1.goto(`${APP}/impostazioni`)
    await p1.getByText('Torna al mio salone').first().click()
    await p1.getByText(/Lascerai il salone Salone Host QA\. Potrai rientrarci solo con un nuovo invito\./).waitFor()
    await p1.screenshot({ path: path.join(SHOTS, 'f2-conferma.png') })
    await p1.getByRole('button', { name: 'Torna al mio salone' }).last().click()
    await aspetta(async () => (await stato(A)).salonId === '<proprio>')
    await p1.waitForURL(`${APP}/`, { timeout: 30000 }); await p1.waitForTimeout(4000)
    await p1.screenshot({ path: path.join(SHOTS, 'f2-tornata.png') })
    const s = await stato(A)
    if (s.prenotazioni !== true || s.attesa !== 'automatico' || s.pausa || s.role !== 'titolare') throw new Error(JSON.stringify(s))
    if (s.nomeSalone !== 'Toelettatura Luna') throw new Error('impostazioni del suo salone sovrascritte: ' + s.nomeSalone)
    if (await p1.getByText('Il tuo salone è in pausa').count()) throw new Error('avviso pausa visibile dopo il ritorno')
    return JSON.stringify(s)
  })
  // F3: salone in pausa (come dopo «Elimina salone» dell'operatore) → avviso in Home → Riprendi
  await prova('F3 avviso in pausa e Riprendi', async () => {
    await db.doc(`salons/${A}/pro/main`).set({ pausa: { prenotazioniOnline: true, attesa: { modo: 'automatico' }, dal: new Date().toISOString() } }, { merge: true })
    await db.doc(`salons/${A}/settings/main`).set({ prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } }, updatedAt: new Date().toISOString() }, { merge: true })
    await p1.goto(`${APP}/`)
    await p1.getByText('Il tuo salone è in pausa').first().waitFor({ timeout: 30000 })
    await p1.screenshot({ path: path.join(SHOTS, 'f3-pausa.png') })
    await p1.getByRole('button', { name: 'Riprendi' }).first().click()
    await aspetta(async () => !(await stato(A)).pausa)
    await aspetta(async () => (await p1.getByText('Il tuo salone è in pausa').count()) === 0)
    await p1.screenshot({ path: path.join(SHOTS, 'f3-ripreso.png') })
    return JSON.stringify(await stato(A))
  })
  await ctx1.close()
  // F4: da sloggata → Crea account (senza dati del salone) → conferma email → invito accettato da solo
  const ctx2 = await browser.newContext({ viewport: { width: 400, height: 860 } }); await instrada(ctx2)
  const p2 = await ctx2.newPage()
  await prova('F4 Crea account per invito, conferma, accettato', async () => {
    await p2.goto(`${APP}/invito/${tok('9')}`)
    await p2.getByRole('link', { name: 'Crea account' }).or(p2.getByRole('button', { name: 'Crea account' })).first().click()
    await p2.getByLabel('Nome', { exact: true }).waitFor()
    if (await p2.getByLabel('Nome della toelettatura').count()) throw new Error('il modulo chiede ancora il nome del salone')
    if (await p2.getByLabel('Partita IVA').count()) throw new Error('il modulo chiede ancora la partita IVA')
    await p2.getByLabel('Nome', { exact: true }).fill('Dora')
    await p2.getByLabel('Cognome').fill('QA')
    await p2.getByLabel('Email').fill(eD)
    await p2.getByLabel('Password', { exact: true }).fill('Test1234!')
    await p2.getByText('Accetto privacy e termini').click()
    await p2.screenshot({ path: path.join(SHOTS, 'f4-modulo.png') })
    await p2.getByRole('button', { name: 'Crea account' }).last().click()
    await p2.getByRole('button', { name: 'Ho confermato' }).waitFor({ timeout: 30000 })
    const d = await auth.getUserByEmail(eD); await auth.updateUser(d.uid, { emailVerified: true })
    await p2.getByRole('button', { name: 'Ho confermato' }).click()
    await aspetta(async () => (await stato(d.uid)).salonId === B, 40000)
    await p2.waitForTimeout(4000)
    await p2.screenshot({ path: path.join(SHOTS, 'f4-dentro-host.png') })
    const s = await stato(d.uid)
    const proprio = (await db.doc(`salons/${d.uid}/settings/main`).get()).data()?.business?.salonName
    if (s.role !== 'collaboratore' || proprio !== 'Salone di Dora') throw new Error(JSON.stringify({ s, proprio }))
    if (await p2.getByText('Hai già un salone su Groomly').count()) throw new Error('avviso mostrato a chi ha il salone vuoto')
    return JSON.stringify({ ...s, proprio, url: p2.url() })
  })
  await browser.close()
  console.log(JSON.stringify({ esiti, chiamate: chiamate.map((c) => c.nome) }, null, 1)); process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
