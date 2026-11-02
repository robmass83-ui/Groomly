// Verifica medie «Team e ruoli» gruppo B, audit 16-17 (solo emulatore demo-groomly, funzioni compilate: `cd functions && npx tsc`).
// App Vite in modo emu su 127.0.0.1:5173; le chiamate a :5001 si intercettano ed eseguono con .run() (come verify-team-inviti.cjs).
// Account e saloni nuovi a ogni giro (firebase-admin). Misure a 390 e 360 px (scrollWidth <= clientWidth), screenshot in QA-tests/results/team-ruoli/.
// R1 collaboratore › Listino in sola lettura (file e prezzi visibili, nessuna azione di modifica).
// R2 collaboratore › visita completata senza «Correggi», con «Per correggere la chiusura chiedi al titolare» (controllo: il titolare vede «Correggi»).
// R3 collaboratore › Elimina account: testo da membro, niente backup, «Scrivi ELIMINA», il nome del salone non abilita, ELIMINA sì (non si preme).
// R4 collaboratore › /impostazioni con state openBackup non apre il foglio Backup (controllo: per il titolare sì).
// R5 collaboratore › Account senza «Scarica i miei dati», «Nome del titolare» non modificabile (controllo: il titolare può).
// R6 titolare › Team: «Rendi socio» → conferma → Conferma → members/<uid> e accounts/<uid> role 'socio'; riga «Socio» + «Rendi collaboratore»;
//    nessun tasto di ruolo sulla propria riga; «Togli» presente (non «Revoca»); misura delle righe con due tasti.
// R7 secondo contesto (la persona promossa, già aperta prima del cambio): menu da socio senza ricaricare? (si annota).
// Uso: node QA-tests/.qa-catalog/verify-team-ruoli.cjs [--keep]
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const fn = req('./lib/functions/src/index.js')
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const KEEP = process.argv.includes('--keep')
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/team-ruoli')
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 21, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 33, media: 35, grande: 45 } },
  { id: 'unghie', order: 2, name: 'Unghie', kind: 'extra', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 } },
]

const creati = []
const em = (nome) => `qa-tr-${nome}-${STAMP}@test.groomly`
async function utente(nome, { cognome = 'QA', salone, pro = null, extra = {} } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: cognome, createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = salone ?? `Salone di ${nome}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z', ...extra,
  })
  if (pro) await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  return { uid: u.uid, email, nome, cognome, label: `${nome} ${cognome}` }
}
async function aggancia(persona, salonId, role = 'collaboratore') {
  await db.doc(`accounts/${persona.uid}`).set({ salonId, role }, { merge: true })
  await db.doc(`salons/${salonId}/members/${persona.uid}`).set({ uid: persona.uid, email: persona.email, role, firstName: persona.nome, lastName: persona.cognome, status: 'attivo' })
}
const account = async (uid) => (await db.doc(`accounts/${uid}`).get()).data() ?? {}

const esiti = []
async function caso(nome, fnc) {
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 900) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

// ——— browser ———
const STATUS = { 'failed-precondition': 'FAILED_PRECONDITION', 'permission-denied': 'PERMISSION_DENIED', internal: 'INTERNAL', unauthenticated: 'UNAUTHENTICATED', 'invalid-argument': 'INVALID_ARGUMENT', 'not-found': 'NOT_FOUND' }
const chiamate = []
async function instrada(context) {
  await context.route('http://127.0.0.1:5001/**', async (route) => {
    const nome = new URL(route.request().url()).pathname.split('/').pop()
    const bearer = (route.request().headers().authorization || '').replace(/^Bearer /, '')
    let payload = {}
    try { payload = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()) } catch { /* senza accesso */ }
    const data = JSON.parse(route.request().postData() || '{}').data ?? {}
    chiamate.push({ nome, chi: payload.email })
    const f = fn[nome]
    if (nome === 'sendVerificationEmail' || !f || typeof f.run !== 'function') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
    try {
      const result = await f.run({ auth: payload.user_id ? { uid: payload.user_id, token: { email: payload.email, email_verified: payload.email_verified === true } } : undefined, data, rawRequest: { headers: {} } })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: result ?? null }) })
    } catch (e) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { status: STATUS[e.code] || 'INTERNAL', message: e.message } }) })
    }
  })
}
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
async function apri(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await instrada(ctx)
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
// Navigazione interna con lo state di React Router (come <Link state>): pushState + popstate, senza ricaricare.
async function vaiConStato(page, percorso, stato) {
  await page.evaluate(([p, s]) => {
    const idx = (window.history.state && typeof window.history.state.idx === 'number') ? window.history.state.idx + 1 : 1
    window.history.pushState({ usr: s, key: 'qa' + Date.now().toString(36), idx }, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
  }, [percorso, stato])
}
async function misura(page, nome, locatori) {
  const out = {}
  for (const v of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(v); await page.waitForTimeout(500)
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      righe.push({ etichetta, ...(await el.evaluate((n) => {
        let b = n
        while (b && getComputedStyle(b).display === 'inline') b = b.parentElement
        const r = b.getBoundingClientRect()
        return { testo: n.innerText.replace(/\s+/g, ' ').trim().slice(0, 120), sw: b.scrollWidth, cw: b.clientWidth, sinistra: Math.round(r.left), destra: Math.round(r.right), ok: b.scrollWidth <= b.clientWidth && r.left >= -0.5 && r.right <= window.innerWidth + 0.5 }
      })) })
    }
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`), fullPage: true })
    out[`${v.width}px`] = { pagina, paginaOk: pagina.sw <= pagina.iw, righe }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const ok = Object.values(out).every((m) => m.paginaOk && m.righe.every((r) => r.ok))
  return { ok, out }
}
const sintesi = (m) => Object.entries(m.out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}, ` + v.righe.map((r) => r.assente ? `${r.etichetta} ASSENTE` : `${r.etichetta} ${r.sw}/${r.cw}${r.ok ? '' : ' KO'}`).join(', ')).join(' | ')
const quanti = async (loc) => loc.count()

async function semina() {
  const host = await utente('Tina', { cognome: 'Titolare', salone: `Salone Tina TR ${STAMP}`, pro: SALONE, extra: {
    priceList: { id: 'qa-listino-1', fileName: `Listino QA ${STAMP}.png`, mime: 'image/png', byteSize: 1234, uploadedAt: '2026-10-01T10:00:00.000Z', dataUrl: `${APP}/favicon.png` },
  } })
  await db.doc(`salons/${host.uid}/settings/main`).set({ business: { titolare: 'Tina Titolare' } }, { merge: true })
  const now = Date.now()
  for (const s of SERVIZI) await db.doc(`salons/${host.uid}/services/${s.id}`).set({ ...s, createdAt: now - 864e6, updatedAt: now - 864e6 })
  // collaboratore che resta tale (R1-R5); nome lungo per la misura della riga Team
  const cleo = await utente('Cleopatra', { cognome: 'Dell’Acqua Bianchi' }); await aggancia(cleo, host.uid)
  // collaboratore che verrà promosso (R6-R7)
  const pino = await utente('Pino', { cognome: 'Promosso' }); await aggancia(pino, host.uid)
  // socio già socio, per vedere una riga con «Rendi collaboratore» prima del cambio
  const sara = await utente('Sara', { cognome: 'Socia' }); await aggancia(sara, host.uid, 'socio')
  const dogId = `qa-tr-cane-${STAMP}`
  await db.doc(`salons/${host.uid}/dogs/${dogId}`).set({ id: dogId, name: 'Fido Ruoli', species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: 'fido ruoli', createdAt: now - 864e6, updatedAt: now - 864e6 })
  const visitaId = `qa-tr-visita-${STAMP}`
  const start = now - 26 * 3600000
  await db.doc(`salons/${host.uid}/appointments/${visitaId}`).set({ id: visitaId, dogId, start, end: start + 1800000, services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 21 }], status: 'completato', total: 21, paymentMethod: 'contanti', chiusoIl: start + 1800000, kind: 'pelosetto', assigneeUid: cleo.uid, createdAt: now - 864e6, updatedAt: now - 864e6 })
  return { host, cleo, pino, sara, visitaId }
}

async function browserCasi() {
  const { chromium } = require('playwright')
  fs.mkdirSync(SHOTS, { recursive: true })
  const { host, cleo, pino, sara, visitaId } = await semina()
  const browser = await chromium.launch()
  try {
    // ——— collaboratore ———
    const c = await apri(browser, cleo)
    const page = c.page

    await caso('R1 collaboratore › Listino in sola lettura, file e prezzi visibili', async () => {
      await page.goto(`${APP}/listino`)
      const file = page.getByText(`Listino QA ${STAMP}.png`, { exact: true })
      await file.waitFor({ timeout: 30000 })
      await page.getByText('Prezzi e tempi standard').waitFor({ timeout: 15000 })
      await page.getByText('Taglio / tosatura').first().waitFor({ timeout: 15000 })
      const vietati = {
        'Gestione listino': await quanti(page.getByRole('button', { name: 'Gestione listino' })),
        'Aggiorna prezzi': await quanti(page.getByRole('button', { name: 'Aggiorna prezzi' })),
        'Aggiungi il tuo listino prezzi': await quanti(page.getByText('Aggiungi il tuo listino prezzi')),
        'Rinomina': await quanti(page.getByRole('button', { name: /^Rinomina / })),
        'Elimina file': await quanti(page.getByRole('button', { name: /^Elimina / })),
        'Gestisci': await quanti(page.getByRole('link', { name: 'Gestisci', exact: true })),
        'Modifica': await quanti(page.getByRole('link', { name: 'Modifica', exact: true })),
        'input file': await quanti(page.locator('input[type=file]')),
      }
      const presenti = Object.entries(vietati).filter(([, n]) => n > 0)
      atteso(presenti.length === 0, 'azioni di modifica visibili al collaboratore', vietati)
      const corpo = await page.locator('body').innerText()
      atteso(/\b21\b/.test(corpo) && /\b33\b/.test(corpo), 'prezzi dei servizi non visibili', corpo.slice(0, 800))
      const stampa = await quanti(page.getByRole('button', { name: 'Stampa e condividi' }))
      const m = await misura(page, 'r1-listino-collaboratore', [['file', file], ['Prezzi e tempi', page.getByText('Prezzi e tempi standard')]])
      atteso(m.ok, 'misura listino', m.out)
      return `nessuna azione di modifica (${Object.keys(vietati).join(', ')} tutte 0); file «Listino QA….png» visibile, prezzi 21/33 visibili, «Stampa e condividi» ${stampa ? 'presente' : 'assente'}; ${sintesi(m)}`
    })

    await caso('R2 collaboratore › visita completata senza «Correggi», con la riga «chiedi al titolare»', async () => {
      await page.goto(`${APP}/appuntamenti/${visitaId}`)
      const riga = page.getByText('Per correggere la chiusura chiedi al titolare', { exact: true })
      await riga.waitFor({ timeout: 30000 })
      const correggi = await quanti(page.getByRole('button', { name: 'Correggi', exact: true }))
      atteso(correggi === 0, '«Correggi» visibile al collaboratore', { correggi })
      const m = await misura(page, 'r2-visita-collaboratore', [['riga chiedi al titolare', riga]])
      atteso(m.ok, 'misura riga', m.out)
      return `«Correggi» assente, riga presente; ${sintesi(m)}`
    })

    await caso('R3 collaboratore › Elimina account: testo da membro, niente backup, «Scrivi ELIMINA»', async () => {
      await page.goto(`${APP}/impostazioni/account/elimina`)
      const t0 = page.getByText('Si cancella solo il tuo account. I dati del salone restano al titolare.', { exact: true })
      await t0.waitFor({ timeout: 30000 })
      atteso(await quanti(page.getByText(/^Profilo, salone, cani/)) === 0, 'elenco da titolare al passo 0', {})
      await page.screenshot({ path: path.join(SHOTS, 'r3-elimina-passo0.png') })
      const visti = []
      // si avanza fino alla password; nessun passo deve essere «Prima salva una copia» / «Salva su…»
      for (let i = 0; i < 4; i++) {
        if (await quanti(page.getByRole('heading', { name: 'Conferma con la password' }))) break
        atteso(await quanti(page.getByText('Prima salva una copia')) === 0 && await quanti(page.getByRole('button', { name: 'Salva su…' })) === 0, 'passo backup mostrato al membro', { passo: i })
        visti.push((await page.locator('main, body').first().innerText()).replace(/\s+/g, ' ').slice(0, 140))
        await page.getByRole('button', { name: 'Continua', exact: true }).click()
        await page.waitForTimeout(400)
      }
      await page.getByRole('heading', { name: 'Conferma con la password' }).waitFor({ timeout: 5000 })
      await page.getByLabel('Password attuale').fill(PASSWORD)
      await page.getByRole('button', { name: 'Continua', exact: true }).click()
      const h = page.getByRole('heading', { name: 'Scrivi ELIMINA', exact: true })
      await h.waitFor({ timeout: 20000 })
      const btn = page.getByRole('button', { name: 'Sì, elimina l’account' })
      const campo = page.getByLabel('ELIMINA', { exact: true })
      await campo.fill(`Salone Tina TR ${STAMP}`)
      await page.waitForTimeout(300)
      const conNome = await btn.isDisabled()
      await campo.fill('ELIMINA')
      await page.waitForTimeout(300)
      const conParola = await btn.isEnabled()
      atteso(conNome && conParola, 'abilitazione del tasto finale', { disabilitatoColNome: conNome, abilitatoConELIMINA: conParola })
      const m = await misura(page, 'r3-elimina-scrivi', [['titolo', h], ['campo', campo], ['tasto', btn]])
      atteso(m.ok, 'misura ultimo passo', m.out)
      atteso((await account(cleo.uid)).salonId === host.uid, 'account cambiato', {})
      const passi = visti.length
      await page.goto(`${APP}/`) // non si preme il tasto finale
      return `passo 0 testo da membro; ${passi} «Continua» prima della password, nessun passo backup; ultimo passo «Scrivi ELIMINA»: nome del salone → tasto disabilitato, ELIMINA → abilitato (non premuto); ${sintesi(m)}`
    })

    await caso('R4 collaboratore › /impostazioni con openBackup non apre il foglio Backup', async () => {
      await page.goto(`${APP}/impostazioni`)
      await page.waitForTimeout(2500)
      await vaiConStato(page, '/', null); await page.waitForTimeout(800)
      await vaiConStato(page, '/impostazioni', { openBackup: true })
      await page.waitForTimeout(3000)
      const url = new URL(page.url()).pathname
      const dlg = await quanti(page.getByRole('dialog', { name: 'Backup' }))
      const stato = await page.evaluate(() => window.history.state && window.history.state.usr)
      await page.screenshot({ path: path.join(SHOTS, 'r4-impostazioni-openbackup-collaboratore.png') })
      atteso(url === '/impostazioni' && dlg === 0, 'foglio Backup aperto al collaboratore', { url, dlg })
      caso.r4 = `collaboratore: url ${url}, foglio Backup ${dlg}, state dopo ${JSON.stringify(stato)}`
      return caso.r4 + ' (controllo col titolare in R6)'
    })

    await caso('R5 collaboratore › Account senza «Scarica i miei dati», «Nome del titolare» non modificabile', async () => {
      await page.goto(`${APP}/impostazioni/account`)
      await page.getByRole('button', { name: 'Privacy e dati' }).click()
      await page.waitForTimeout(1200)
      const scarica = await quanti(page.getByText('Scarica i miei dati'))
      const tuoi = await quanti(page.getByText('I tuoi dati', { exact: true }))
      await page.screenshot({ path: path.join(SHOTS, 'r5-account-privacy-collaboratore.png'), fullPage: true })
      atteso(scarica === 0 && tuoi === 0, '«Scarica i miei dati» visibile al collaboratore', { scarica, tuoi })
      await page.goto(`${APP}/impostazioni/account`)
      await page.getByRole('button', { name: 'Info personali' }).click()
      const riga = page.getByText('Nome del titolare', { exact: true })
      await riga.waitFor({ timeout: 15000 })
      const valore = await quanti(page.getByText('Tina Titolare', { exact: true }))
      const comeBottone = await quanti(page.getByRole('button', { name: /Nome del titolare/ }))
      const dentroBottone = await riga.evaluate((n) => !!n.closest('button,a,[role=button]'))
      await riga.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(800)
      const dialogo = await quanti(page.getByRole('dialog'))
      await page.screenshot({ path: path.join(SHOTS, 'r5-account-personali-collaboratore.png'), fullPage: true })
      atteso(comeBottone === 0 && !dentroBottone && dialogo === 0, '«Nome del titolare» modificabile dal collaboratore', { comeBottone, dentroBottone, dialogo })
      return `Privacy: «I tuoi dati»/«Scarica i miei dati» assenti; Personali: «Nome del titolare» (valore «Tina Titolare» ${valore ? 'visibile' : 'assente'}) non è un tasto, il tocco non apre nulla`
    })
    await c.ctx.close()

    // ——— titolare + persona promossa ———
    const p = await apri(browser, pino) // aperta PRIMA del cambio
    const pp = p.page
    await pp.goto(`${APP}/`)
    await pp.getByText('Oggi', { exact: true }).first().waitFor({ timeout: 30000 })
    await pp.waitForTimeout(2000)
    const primaIncassi = await quanti(pp.getByText('Incassi oggi', { exact: true }))
    await pp.screenshot({ path: path.join(SHOTS, 'r7-pino-home-prima.png') })

    const t = await apri(browser, host)
    const tp = t.page
    await caso('R6 titolare › Team: «Rendi socio» → conferma → ruolo socio in members e accounts', async () => {
      // controllo R4: per il titolare openBackup apre il foglio
      await tp.goto(`${APP}/impostazioni`); await tp.waitForTimeout(2500)
      await vaiConStato(tp, '/', null); await tp.waitForTimeout(800)
      await vaiConStato(tp, '/impostazioni', { openBackup: true })
      let backupTitolare = 0
      try { await tp.getByRole('dialog', { name: 'Backup' }).waitFor({ timeout: 8000 }); backupTitolare = 1 } catch { /* resta 0 */ }
      caso.controlloR4 = backupTitolare
      // controllo R2: il titolare vede «Correggi» sulla stessa visita
      await tp.goto(`${APP}/appuntamenti/${visitaId}`)
      let correggiTitolare = 0
      try { await tp.getByRole('button', { name: 'Correggi', exact: true }).waitFor({ timeout: 20000 }); correggiTitolare = 1 } catch { /* resta 0 */ }
      caso.controlloR2 = correggiTitolare

      await tp.goto(`${APP}/impostazioni/team`)
      const rendiPino = tp.getByRole('button', { name: `Rendi socio ${pino.label}` })
      await rendiPino.waitFor({ timeout: 30000 })
      const togliPino = tp.getByRole('button', { name: `Togli ${pino.label}` })
      const rendiCleo = tp.getByRole('button', { name: `Rendi socio ${cleo.label}` })
      const rendiSara = tp.getByRole('button', { name: `Rendi collaboratore ${sara.label}` })
      const propri = await quanti(tp.getByRole('button', { name: new RegExp(`^(Rendi socio|Rendi collaboratore|Togli) ${host.label}$`) }))
      const revoca = await quanti(tp.getByRole('button', { name: /^Revoca/ })) + await quanti(tp.getByText('Revoca', { exact: true }))
      const togliTesto = await quanti(tp.getByRole('button', { name: /^Togli / }))
      atteso(propri === 0, 'tasti di ruolo o Togli sulla propria riga', { propri })
      atteso(revoca === 0 && togliTesto >= 3 && (await togliPino.innerText()).trim() === 'Togli', '«Togli» al posto di «Revoca»', { revoca, togliTesto })
      atteso(await rendiCleo.count() === 1 && await rendiSara.count() === 1, 'tasti di ruolo sugli altri', {})
      const riga = (loc) => loc.locator('xpath=ancestor::div[2]')
      const m = await misura(tp, 'r6-team-prima', [['riga Cleopatra (nome lungo, 2 tasti)', riga(rendiCleo)], ['riga Pino (2 tasti)', riga(rendiPino)], ['riga Sara socio (2 tasti)', riga(rendiSara)], ['tasti Cleopatra', rendiCleo.locator('xpath=..')]])
      atteso(m.ok, 'misura righe Team', m.out)
      // Annulla non cambia nulla
      await rendiPino.click()
      const dlg = tp.getByRole('dialog')
      const domanda = dlg.getByText(`Rendere ${pino.label} socio? Avrà il pieno controllo del salone, incassi compresi.`, { exact: true })
      await domanda.waitFor({ timeout: 10000 })
      const md = await misura(tp, 'r6-conferma-rendi-socio', [['domanda', domanda], ['Conferma', dlg.getByRole('button', { name: 'Conferma', exact: true })], ['Annulla', dlg.getByRole('button', { name: 'Annulla', exact: true })]])
      atteso(md.ok, 'misura conferma', md.out)
      await dlg.getByRole('button', { name: 'Annulla', exact: true }).click()
      await tp.waitForTimeout(1200)
      atteso(!chiamate.some((x) => x.nome === 'changeMemberRole') && (await account(pino.uid)).role === 'collaboratore', 'Annulla ha cambiato il ruolo', {})
      await rendiPino.click()
      await domanda.waitFor({ timeout: 10000 })
      await dlg.getByRole('button', { name: 'Conferma', exact: true }).click()
      caso.tCambio = Date.now()
      await aspetta(async () => (await db.doc(`salons/${host.uid}/members/${pino.uid}`).get()).get('role') === 'socio' && (await account(pino.uid)).role === 'socio', 20000)
      const mem = (await db.doc(`salons/${host.uid}/members/${pino.uid}`).get()).data(); const acc = await account(pino.uid)
      await aspetta(async () => (await quanti(dlg)) === 0, 10000)
      const rendiCollPino = tp.getByRole('button', { name: `Rendi collaboratore ${pino.label}` })
      await rendiCollPino.waitFor({ timeout: 15000 })
      const chip = await riga(rendiCollPino).innerText()
      atteso(/\bSocio\b/.test(chip) && (await rendiCollPino.innerText()).trim() === 'Rendi collaboratore', 'riga dopo il cambio', chip)
      const m2 = await misura(tp, 'r6-team-dopo', [['riga Pino (socio, 2 tasti)', riga(rendiCollPino)], ['riga Cleopatra', riga(rendiCleo)]])
      atteso(m2.ok, 'misura righe dopo', m2.out)
      atteso(correggiTitolare === 1, 'controllo: il titolare non vede «Correggi»', {})
      atteso(backupTitolare === 1, 'controllo: openBackup non apre il foglio nemmeno al titolare (il metodo di R4 non prova nulla)', {})
      return `nessun tasto a nome del titolare (la sua riga non è nel Team: propria riga provata col socio in R6b), «Togli» ×${togliTesto} e nessun «Revoca»; Annulla → nessuna chiamata; Conferma → members.role=${mem.role}, accounts.role=${acc.role}; riga «${chip.replace(/\s+/g, ' ')}»; prima ${sintesi(m)} || conferma ${sintesi(md)} || dopo ${sintesi(m2)} || controlli: titolare vede «Correggi», openBackup apre il foglio al titolare`
    })

    await caso('R7 persona promossa (contesto aperto prima): menu da socio senza ricaricare', async () => {
      atteso(caso.tCambio, 'serve R6', {})
      atteso(primaIncassi === 0, 'Pino collaboratore vedeva già «Incassi oggi»', { primaIncassi })
      let senzaRicarica = true; let ms = 0
      try {
        await aspetta(async () => (await quanti(pp.getByText('Incassi oggi', { exact: true }))) > 0, 30000)
        ms = Date.now() - caso.tCambio
      } catch {
        senzaRicarica = false
      }
      if (!senzaRicarica) {
        await pp.reload(); await pp.waitForTimeout(5000)
        await pp.getByText('Incassi oggi', { exact: true }).first().waitFor({ timeout: 20000 })
      }
      await pp.screenshot({ path: path.join(SHOTS, 'r7-pino-home-dopo.png') })
      // Impostazioni con navigazione interna (tab in basso), senza ricaricare
      const navImp = pp.getByRole('link', { name: 'Impostazioni' }).first()
      if (await navImp.count()) await navImp.click()
      else await vaiConStato(pp, '/impostazioni', null)
      await pp.waitForURL(/\/impostazioni$/, { timeout: 15000 })
      const servizi = pp.getByRole('link', { name: /Servizi e durate/ })
      await servizi.waitFor({ timeout: 15000 })
      const listino = await quanti(pp.getByRole('link', { name: /Listino prezzi/ }))
      await pp.screenshot({ path: path.join(SHOTS, 'r7-pino-impostazioni-dopo.png'), fullPage: true })
      const acc = await account(pino.uid)
      return `${senzaRicarica ? `SENZA ricarica: «Incassi oggi» comparso entro ${Math.round(ms / 100) / 10}s da «Conferma» (per eccesso: si controlla dopo R6)` : 'serve una RICARICA: nessun cambio in 30 s'}; Impostazioni → «Servizi e durate» e «Listino prezzi» (${listino}) visibili; accounts.role=${acc.role}`
    })
    await t.ctx.close(); await p.ctx.close()

    // La riga del titolare non c'è nel Team (nessun members/<titolare>): la «propria riga» si prova col socio.
    await caso('R6b socio › Team: nessun tasto sulla propria riga, tasti di ruolo sugli altri', async () => {
      const s = await apri(browser, sara)
      await s.page.goto(`${APP}/impostazioni/team`)
      const propria = s.page.getByText(sara.label, { exact: true })
      await propria.waitFor({ timeout: 30000 })
      await s.page.getByRole('button', { name: `Rendi socio ${cleo.label}` }).waitFor({ timeout: 15000 })
      const tastiPropri = await quanti(s.page.getByRole('button', { name: new RegExp(`${sara.label}$`) }))
      const rigaPropria = await propria.locator('xpath=ancestor::div[2]').innerText()
      const rendiPino = await quanti(s.page.getByRole('button', { name: `Rendi collaboratore ${pino.label}` }))
      const m = await misura(s.page, 'r6b-team-socio', [['propria riga', propria.locator('xpath=ancestor::div[2]')]])
      await s.ctx.close()
      atteso(tastiPropri === 0 && !/Rendi|Togli/.test(rigaPropria), 'tasti sulla propria riga', { tastiPropri, rigaPropria })
      atteso(rendiPino === 1, 'il socio non vede «Rendi collaboratore» su Pino', {})
      return `propria riga «${rigaPropria.replace(/\s+/g, ' ')}» senza tasti; «Rendi socio» su Cleopatra e «Rendi collaboratore» su Pino presenti; ${sintesi(m)}`
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
  console.log(JSON.stringify({ stamp: STAMP, esiti, chiamate: chiamate.map((c) => `${c.nome}(${c.chi})`) }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
