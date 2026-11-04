// Verifica nel browser delle basse «Account» (spec docs/superpowers/specs/2026-11-03-basse-account-design.md).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e un Vite in modo emu (APP, di base http://127.0.0.1:5193).
// Account propri con prefisso account-…@test.groomly, creati e cancellati a ogni giro (firebase-admin). Le callable (5001) sono simulate.
// S1 Registrazione dall'app: titolare = «Nome Cognome»; conferma email col conto alla rovescia dell'invio vero, che dopo la ricarica non riparte da 60;
//    su un telefono senza invio salvato «Invia di nuovo» è subito attivo e la riga dei secondi non c'è.
// S2 «Il tuo nome»: il foglio cambia accounts/<uid>.firstName/lastName e la riga; nome vuoto → «Campo obbligatorio».
// S3 Link profondo: /impostazioni/notifiche da sloggati → login → si arriva su /impostazioni/notifiche.
// S4 Tour: il benvenuto dice il numero dei passi; indietro → passo prima → benvenuto → fuori dal tour.
// S5 «Verifica email» su un account già verificato → «La tua email è già verificata».
// S6 Traduzioni: EN «Suggestions»; ES «Notificaciones» e un solo «Avisos» in Ajustes.
// Larghezze 320/360/390 px senza scorrimento orizzontale; screenshot in QA-tests/results/basse-account/.
// Uso: node QA-tests/.qa-catalog/verify-basse-account.cjs [--keep] [--solo=S1,S3]   (APP=http://127.0.0.1:5193)
const path = require('path'); const fs = require('fs')
// firebase-admin sta nelle dipendenze delle functions (in un worktree senza, quelle del checkout principale)
const fnPkg = fs.existsSync(path.resolve('functions/node_modules')) ? path.resolve('functions/package.json') : path.resolve(__dirname, '../../../../../functions/package.json')
const req = require('module').createRequire(fnPkg)
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
const APP = process.env.APP || 'http://127.0.0.1:5193'
const SHOTS = path.resolve('QA-tests/results/basse-account')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const GO = { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true }

const creati = []
const em = (nome) => `account-${nome}-${STAMP}@test.groomly`
async function utente(nome, { tour = { stato: 'visto', saltati: [] } } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} ${STAMP}`
  const settings = { business: { salonName: nomeSalone, name: nomeSalone, titolare: `${nome} QA` }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' }
  if (tour) settings.tourBenvenuto = tour
  await db.doc(`salons/${u.uid}/settings/main`).set(settings)
  await db.doc(`salons/${u.uid}/pro/main`).set(GO)
  return { uid: u.uid, email, nome }
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
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
  while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
  paginaCorrente = null
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})

const errori = []
async function contesto(browser, { lingua = 'it', giaVerificata = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript((l) => { try { localStorage.setItem('groomly.lingua', l) } catch { /* niente */ } }, lingua)
  // Le callable non girano in questo emulatore: l'invio delle email risponde come il server.
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true, alreadyVerified: giaVerificata } }) }))
  const page = await ctx.newPage()
  paginaCorrente = page
  page.on('pageerror', (e) => errori.push(e.message))
  daChiudere.push(ctx)
  return { ctx, page }
}
async function entra(page, persona, pulsante = 'Entra') {
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: pulsante, exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
}
async function larghezze(page, nome) {
  const out = []
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(400)
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out.push({ larghezza: v.width, ...pagina, ok: pagina.sw <= pagina.iw })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  atteso(out.every((m) => m.ok), `scorrimento orizzontale in ${nome}`, out.filter((m) => !m.ok))
  return out.map((m) => `${m.larghezza}px ${m.sw}/${m.iw}`).join(' ')
}
const secondi = async (page) => {
  const riga = page.getByText(/Puoi inviarne un’altra tra \d+ secondi/)
  if (!(await riga.count())) return null
  return Number((await riga.first().innerText()).match(/(\d+) secondi/)[1])
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    await caso('S1 Registrazione: titolare dal nome, conto alla rovescia vero', async () => {
      const { page } = await contesto(browser)
      const email = em('reg')
      await page.goto(`${APP}/login`)
      await page.getByRole('button', { name: 'Non hai un account? Crea account' }).click()
      await page.getByLabel('Nome', { exact: true }).fill('Prova')
      await page.getByLabel('Cognome').fill('Account')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
      await page.getByLabel('Nome della toelettatura').fill(`Salone Reg ${STAMP}`)
      await page.getByRole('checkbox', { name: 'Accetto privacy e termini' }).check()
      await page.getByRole('button', { name: 'Crea account', exact: true }).click()
      const invia = page.getByRole('button', { name: 'Invia di nuovo' })
      await invia.waitFor({ timeout: 30000 })
      const utente = await auth.getUserByEmail(email)
      creati.push(utente.uid)
      const titolare = await aspetta(async () => (await db.doc(`salons/${utente.uid}/settings/main`).get()).get('business.titolare') === 'Prova Account', 15000).then(() => 'Prova Account').catch(async () => (await db.doc(`salons/${utente.uid}/settings/main`).get()).get('business.titolare'))
      atteso(titolare === 'Prova Account', 'titolare dalla registrazione', { titolare })
      const subito = await secondi(page)
      atteso(subito !== null && subito <= 60 && !(await invia.isEnabled()), 'conto alla rovescia dopo la registrazione', { subito })
      await page.waitForTimeout(5000)
      await page.reload()
      await invia.waitFor({ timeout: 30000 })
      const dopo = await secondi(page)
      atteso(dopo !== null && dopo <= 56, 'dopo la ricarica il conto non riparte da 60', { subito, dopo })
      const mis = await larghezze(page, 's1-conferma')
      // un altro telefono, senza invio salvato: subito attivo
      const altro = await contesto(browser)
      await altro.page.goto(`${APP}/login`)
      await entra(altro.page, { email }).catch(() => {})
      await altro.page.getByRole('button', { name: 'Invia di nuovo' }).waitFor({ timeout: 30000 })
      const senza = await secondi(altro.page)
      atteso(senza === null && await altro.page.getByRole('button', { name: 'Invia di nuovo' }).isEnabled(), 'senza invio salvato', { senza })
      return `titolare «${titolare}»; conto ${subito}s → dopo ricarica ${dopo}s; altro telefono: nessun conto, Invia di nuovo attivo || ${mis}`
    })

    await caso('S2 «Il tuo nome» cambia l’account', async () => {
      const p = await utente('Nina')
      const { page } = await contesto(browser)
      await page.goto(`${APP}/login`)
      await entra(page, p)
      await page.goto(`${APP}/impostazioni/account?scheda=personali`)
      const riga = page.getByRole('button', { name: /Il tuo nome/ })
      await riga.waitFor({ timeout: 20000 })
      atteso(/Nina QA/.test(await riga.innerText()), 'riga con il nome', await riga.innerText())
      await riga.click()
      const d = page.getByRole('dialog', { name: 'Il tuo nome' })
      await d.waitFor()
      await d.getByLabel('Nome', { exact: true }).fill('   ')
      await d.getByRole('button', { name: 'Salva' }).click()
      await d.getByText('Campo obbligatorio').waitFor({ timeout: 5000 })
      const mis = await larghezze(page, 's2-foglio-nome')
      await d.getByRole('textbox').nth(0).fill('Ada')
      await d.getByRole('textbox').nth(1).fill('Neri')
      await d.getByRole('button', { name: 'Salva' }).click()
      await aspetta(async () => { const a = (await db.doc(`accounts/${p.uid}`).get()).data(); return a.firstName === 'Ada' && a.lastName === 'Neri' })
      await page.reload()
      await page.getByRole('button', { name: /Il tuo nome.*Ada Neri/s }).waitFor({ timeout: 20000 })
      const titolare = (await db.doc(`salons/${p.uid}/settings/main`).get()).get('business.titolare')
      atteso(titolare === 'Nina QA', 'il titolare non cambia', { titolare })
      return `vuoto → «Campo obbligatorio»; Ada Neri su accounts/${p.uid} e dopo la ricarica; titolare resta «${titolare}» || ${mis}`
    })

    await caso('S3 Link profondo dopo l’accesso', async () => {
      const p = await utente('Dario')
      const { page } = await contesto(browser)
      await page.goto(`${APP}/impostazioni/notifiche`)
      await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 20000 })
      await entra(page, p)
      await page.waitForURL((u) => u.pathname === '/impostazioni/notifiche', { timeout: 20000 })
      await page.waitForTimeout(1500)
      atteso(new URL(page.url()).pathname === '/impostazioni/notifiche', 'pagina dopo l’accesso', page.url())
      const mis = await larghezze(page, 's3-notifiche')
      return `/impostazioni/notifiche → /login → ${new URL(page.url()).pathname} || ${mis}`
    })

    await caso('S4 Tour: numero vero e indietro tra i passi', async () => {
      const p = await utente('Tea', { tour: null })
      const { page } = await contesto(browser)
      await page.goto(`${APP}/login`)
      await entra(page, p)
      await page.goto(`${APP}/impostazioni`)
      await page.waitForTimeout(1000)
      await page.goto(`${APP}/benvenuto`)
      const iniziamo = page.getByRole('button', { name: 'Iniziamo' })
      await iniziamo.waitFor({ timeout: 20000 })
      await aspetta(async () => iniziamo.isEnabled())
      const sotto = (await page.getByText(/piccol[ae] cos[ae] e Groomly/).first().textContent()).trim()
      const mis = await larghezze(page, 's4-benvenuto')
      await iniziamo.click()
      const contatore = page.getByText(/Prepariamo il salone · 1 di \d+/).first()
      await contatore.waitFor({ timeout: 10000 })
      const m = Number((await contatore.textContent()).match(/di (\d+)/)[1])
      const n = /^Una piccola/.test(sotto) ? 1 : Number((sotto.match(/^(\d+) piccole/) || [])[1])
      atteso(n === m, 'il benvenuto dice il numero dei passi', { sotto, m })
      await page.getByRole('button', { name: 'Salta' }).first().click()
      await page.getByText(`Prepariamo il salone · 2 di ${m}`).first().waitFor({ timeout: 10000 })
      await page.goBack()
      await page.getByText(`Prepariamo il salone · 1 di ${m}`).first().waitFor({ timeout: 10000 })
      await page.goBack()
      await iniziamo.waitFor({ timeout: 10000 })
      await page.goBack()
      await page.waitForURL((u) => u.pathname === '/impostazioni', { timeout: 10000 })
      return `«${sotto.slice(0, 40)}…» = ${m} passi; 2 → indietro 1 → indietro benvenuto → indietro /impostazioni || ${mis}`
    })

    await caso('S5 «Verifica email» già verificata', async () => {
      const p = await utente('Vera')
      const { page } = await contesto(browser, { giaVerificata: true })
      await page.goto(`${APP}/login`)
      await entra(page, p)
      await page.goto(`${APP}/impostazioni/account?scheda=sicurezza`)
      await page.getByRole('button', { name: /Verifica email/ }).click({ timeout: 20000 })
      await page.getByText('La tua email è già verificata').waitFor({ timeout: 10000 })
      const mis = await larghezze(page, 's5-gia-verificata')
      return `toast «La tua email è già verificata» || ${mis}`
    })

    await caso('S6 Traduzioni EN/ES nelle Impostazioni', async () => {
      const p = await utente('Lia')
      const en = await contesto(browser, { lingua: 'en' })
      await en.page.goto(`${APP}/login`)
      await entra(en.page, p, 'Sign in')
      await en.page.goto(`${APP}/impostazioni`)
      await en.page.getByText('Suggestions', { exact: true }).first().waitFor({ timeout: 20000 })
      atteso(!(await en.page.getByText('Tips', { exact: true }).count()), 'Tips ancora presente', {})
      const misEn = await larghezze(en.page, 's6-en-impostazioni')
      const es = await contesto(browser, { lingua: 'es' })
      await es.page.goto(`${APP}/login`)
      await es.page.getByLabel(/Email|Correo/).fill(p.email)
      await es.page.getByLabel(/Contraseña|Password/).first().fill(PASSWORD)
      await es.page.getByRole('button', { name: /^Entrar$/ }).click()
      await es.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
      await es.page.goto(`${APP}/impostazioni`)
      await es.page.getByText('Notificaciones', { exact: true }).first().waitFor({ timeout: 20000 })
      const avisos = await es.page.getByText('Avisos', { exact: true }).count()
      atteso(avisos === 1, 'un solo «Avisos»', { avisos })
      const misEs = await larghezze(es.page, 's6-es-ajustes')
      return `EN Suggestions; ES Notificaciones + 1 «Avisos» || EN ${misEn} || ES ${misEs}`
    })
  } finally {
    await browser.close()
    if (!KEEP) {
      for (const uid of creati) {
        await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
        await db.doc(`accounts/${uid}`).delete().catch(() => {})
        await auth.deleteUser(uid).catch(() => {})
      }
    }
  }
  for (const e of esiti) console.log(`${e.esito} ${e.nome}\n   ${e.note}`)
  if (errori.length) console.log('Errori della pagina:', errori.slice(0, 10))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(2) })
