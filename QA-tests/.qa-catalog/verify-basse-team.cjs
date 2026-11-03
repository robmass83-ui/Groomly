// Verifica basse «Team» (solo emulatore demo-groomly, funzioni compilate: `cd functions && npx tsc`).
// Server (handler veri di index.js chiamati con .run()):
// (a) Salone senza members/<titolare>: il primo invito accettato crea il titolare (email normalizzata, attivo),
//     le scadenze scendono di uno solo; un secondo invito accettato non riscrive il titolare.
// (b) Titolare che lavora in un altro salone (accounts.salonId diverso): nessun titolare creato.
// Con --browser (app Vite in modo emu, APP=http://127.0.0.1:<porta>, default 5183; le chiamate a :5001 si eseguono con .run()),
// a 320, 360 e 390 px con misura delle righe (scrollWidth <= clientWidth):
// B1 Team: «Invita una persona» in una riga, il titolare in elenco; in inglese «Invite someone» e foglio tradotto.
// B2 «Chi lo fa» nel nuovo appuntamento del titolare mostra il titolare.
// B3 Invito scaduto: «Invito scaduto», «Vai alla Home», nessun codice grezzo.
// B4 Dopo Accetta: per 12 s nessun «Salvataggio non riuscito» né «Dati non aggiornati».
// B5 Listino del collaboratore senza Gestione listino / Aggiorna prezzi / Gestisci.
// Screenshot in QA-tests/results/basse-team/.
// Uso: node QA-tests/.qa-catalog/verify-basse-team.cjs [--browser] [--keep]
const path = require('path'); const fs = require('fs'); const crypto = require('crypto')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const fn = req('./lib/functions/src/index.js')
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const BROWSER = process.argv.includes('--browser'); const KEEP = process.argv.includes('--keep')
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = process.env.APP || 'http://127.0.0.1:5183'
const SHOTS = path.resolve('QA-tests/results/basse-team')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const nuovoToken = () => crypto.randomBytes(32).toString('hex')
let scarto = 0
const scadenza = () => new Date(Date.now() + 7 * 86400000 + (scarto += 1000)).toISOString()
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'play', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }

const creati = []
const em = (nome) => `team-bt-${nome}-${STAMP}@test.groomly`
async function utente(nome, { salone, pro = null, emailMaiuscole = false } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email: emailMaiuscole ? email.toUpperCase() : email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = salone ?? `Salone di ${nome}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
  })
  if (pro) await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  return { uid: u.uid, email, nome }
}
// Come createInvite (senza Brevo).
async function invito(salonId, email, role = 'collaboratore', expiresAt = scadenza()) {
  const token = nuovoToken()
  await db.doc(`invites/${token}`).set({ salonId, email, role, createdAt: new Date().toISOString(), expiresAt, status: 'aperto' })
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data() ?? {}
  await db.doc(`salons/${salonId}/pro/main`).set({ openInviteExpiries: [...(pro.openInviteExpiries ?? []), expiresAt] }, { merge: true })
  return { token, expiresAt }
}
async function aggancia(persona, salonId, role = 'collaboratore') {
  await db.doc(`accounts/${persona.uid}`).set({ salonId, role }, { merge: true })
  await db.doc(`salons/${salonId}/members/${persona.uid}`).set({ uid: persona.uid, email: persona.email, role, firstName: persona.nome, lastName: 'QA', status: 'attivo' })
}
const scadenze = async (salonId) => (await db.doc(`salons/${salonId}/pro/main`).get()).get('openInviteExpiries') ?? []
const membro = async (salonId, uid) => (await db.doc(`salons/${salonId}/members/${uid}`).get()).data()
const call = (f, chi, data = {}) => f.run({ auth: { uid: chi.uid, token: { email: chi.email, email_verified: true } }, data, rawRequest: { headers: {} } })
const errore = (p) => p.then((r) => ({ ok: true, r }), (e) => ({ ok: false, code: e.code, message: e.message }))

const esiti = []
async function caso(nome, fnc) {
  try {
    esiti.push({ nome, esito: 'PASS', note: await fnc() })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 800) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

async function server() {
  await caso('(a) il primo invito accettato crea il titolare in members, il secondo non lo riscrive', async () => {
    const host = await utente('Hana', { salone: `Salone Hana ${STAMP}`, pro: SALONE, emailMaiuscole: true })
    atteso(!(await membro(host.uid, host.uid)), 'il titolare non deve esserci all’inizio', {})
    const u1 = await utente('Ugo'); const i1 = await invito(host.uid, u1.email)
    const prima = (await scadenze(host.uid)).length
    const r1 = await errore(call(fn.acceptInvite, u1, { token: i1.token }))
    atteso(r1.ok, 'accettazione 1', r1)
    const t = await membro(host.uid, host.uid)
    atteso(t && t.role === 'titolare' && t.status === 'attivo' && t.uid === host.uid && t.email === host.email && t.firstName === 'Hana' && t.lastName === 'QA', 'titolare creato', t)
    const dopo = (await scadenze(host.uid)).length
    atteso(dopo === prima - 1, 'scadenze', { prima, dopo })
    // Un titolare già presente (anche con dati diversi) non si riscrive.
    await db.doc(`salons/${host.uid}/members/${host.uid}`).set({ firstName: 'Cambiato' }, { merge: true })
    const u2 = await utente('Vale'); const i2 = await invito(host.uid, u2.email, 'socio')
    const r2 = await errore(call(fn.acceptInvite, u2, { token: i2.token }))
    atteso(r2.ok, 'accettazione 2', r2)
    const t2 = await membro(host.uid, host.uid)
    atteso(t2.firstName === 'Cambiato', 'il titolare è stato riscritto', t2)
    return `titolare creato ${JSON.stringify(t)}; scadenze ${prima}→${dopo}; secondo invito → titolare invariato (firstName «${t2.firstName}»)`
  })

  await caso('(b) titolare che lavora in un altro salone: nessun titolare creato', async () => {
    const host = await utente('Ines', { pro: SALONE }); const altro = await utente('Otto', { pro: SALONE })
    await db.doc(`accounts/${host.uid}`).set({ salonId: altro.uid, role: 'collaboratore' }, { merge: true })
    const u = await utente('Pia'); const i = await invito(host.uid, u.email)
    const r = await errore(call(fn.acceptInvite, u, { token: i.token }))
    const t = await membro(host.uid, host.uid)
    atteso(!t, 'titolare creato anche se l’account è altrove', { r, t })
    return `accettazione ${r.ok ? 'riuscita' : `rifiutata («${r.message}»)`}; members/<titolare> assente`
  })
}

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
    chiamate.push(nome)
    const f = fn[nome]
    if (!f || typeof f.run !== 'function') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) })
    try {
      const result = await f.run({ auth: payload.user_id ? { uid: payload.user_id, token: { email: payload.email, email_verified: payload.email_verified === true } } : undefined, data, rawRequest: { headers: {} } })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: result ?? null }) })
    } catch (e) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { status: STATUS[e.code] || 'INTERNAL', message: e.message } }) })
    }
  })
}
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(true) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
async function apri(browser, persona, { lingua = 'it' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lingua === 'it' ? 'it-IT' : 'en-US', timezoneId: 'Europe/Rome' })
  await instrada(ctx)
  await ctx.addInitScript((l) => { try { localStorage.setItem('groomly.lingua', l) } catch { /* niente */ } }, lingua)
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.locator('input[type="email"]').fill(persona.email)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  return { ctx, page }
}
async function misura(page, nome, locatori) {
  const out = {}
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(400)
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      righe.push({ etichetta, ...(await el.evaluate((n) => {
        let b = n
        while (b && getComputedStyle(b).display === 'inline') b = b.parentElement
        const r = b.getBoundingClientRect()
        const altezzaRiga = parseFloat(getComputedStyle(b).lineHeight) || 20
        const testo = n.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)
        // Una riga sola: il testo non va a capo (range del testo alto al massimo una riga e mezza).
        const range = document.createRange(); range.selectNodeContents(n)
        const righeTesto = range.getClientRects().length ? Math.round(range.getBoundingClientRect().height / altezzaRiga) : 0
        return { testo, sw: b.scrollWidth, cw: b.clientWidth, righeTesto, ok: b.scrollWidth <= b.clientWidth && r.left >= -0.5 && r.right <= window.innerWidth + 0.5 }
      })) })
    }
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out[`${v.width}px`] = { pagina, paginaOk: pagina.sw <= pagina.iw, righe }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const ok = Object.values(out).every((m) => m.paginaOk && m.righe.every((r) => r.ok))
  return { ok, out }
}
const sintesi = (m) => Object.entries(m.out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}, ` + v.righe.map((r) => r.assente ? `${r.etichetta} ASSENTE` : `${r.etichetta} ${r.sw}/${r.cw} righe ${r.righeTesto}${r.ok ? '' : ' KO'}`).join(', ')).join(' | ')
const unaRiga = (m, etichetta) => Object.values(m.out).every((v) => v.righe.filter((r) => r.etichetta === etichetta).every((r) => r.righeTesto === 1))
const nessunCodice = async (page) => {
  const t = await page.locator('body').innerText()
  const m = t.match(/\[\d{3}\]|failed-precondition|permission-denied|\bINTERNAL\b|FirebaseError/)
  if (m) throw new Error('codice grezzo in pagina: ' + m[0])
}

async function browserCasi() {
  const { chromium } = require('playwright')
  fs.mkdirSync(SHOTS, { recursive: true })
  const host = await utente('Hilde', { salone: `Salone Hilde ${STAMP}`, pro: SALONE })
  const browser = await chromium.launch()
  try {
    // Il titolare entra in members solo con il primo invito accettato (via acceptInvite, come dall'app).
    const collab = await utente('Carla')
    const iCollab = await invito(host.uid, collab.email)
    await call(fn.acceptInvite, collab, { token: iCollab.token })
    atteso((await membro(host.uid, host.uid))?.role === 'titolare', 'preparazione: titolare non creato', {})

    await caso('B1 Team: «Invita una persona» in una riga, titolare in elenco; in inglese tradotto', async () => {
      const { ctx, page } = await apri(browser, host)
      await page.goto(`${APP}/impostazioni/team`)
      const btn = page.getByRole('button', { name: 'Invita una persona' })
      await btn.waitFor({ timeout: 30000 })
      atteso(await page.getByText('Invita nuovo collaboratore').count() === 0, 'testo vecchio ancora presente', {})
      const titolare = page.getByText('Hilde QA', { exact: true })
      const m = await misura(page, 'b1-team-it', [['Invita una persona', btn], ['titolare', titolare], ['Carla', page.getByText('Carla QA', { exact: true })]])
      atteso(m.ok && unaRiga(m, 'Invita una persona'), 'misura Team it', m.out)
      await btn.click()
      const dlg = page.getByRole('dialog')
      await dlg.getByRole('form', { name: 'Invita' }).waitFor()
      atteso(await dlg.getByRole('button', { name: 'Invia', exact: true }).count() === 1, 'tasto Invia', {})
      await page.screenshot({ path: path.join(SHOTS, 'b1-foglio-it.png') })
      await ctx.close()
      const en = await apri(browser, host, { lingua: 'en' })
      await en.page.goto(`${APP}/impostazioni/team`)
      const btnEn = en.page.getByRole('button', { name: 'Invite someone' })
      await btnEn.waitFor({ timeout: 30000 })
      const mEn = await misura(en.page, 'b1-team-en', [['Invite someone', btnEn]])
      atteso(mEn.ok && unaRiga(mEn, 'Invite someone'), 'misura Team en', mEn.out)
      await btnEn.click()
      const dEn = en.page.getByRole('dialog')
      await dEn.getByRole('form', { name: 'Invite' }).waitFor()
      atteso(await dEn.getByLabel('Email').count() === 1 && await dEn.getByRole('button', { name: 'Send', exact: true }).count() === 1, 'foglio en', await dEn.innerText())
      const testoEn = await dEn.innerText()
      atteso(!/\bInvia\b|\bInvita\b/.test(testoEn), 'italiano nel foglio en', testoEn)
      await en.page.screenshot({ path: path.join(SHOTS, 'b1-foglio-en.png') })
      await en.ctx.close()
      return `it ${sintesi(m)} || en ${sintesi(mEn)} || foglio it «Invita»/«Invia», en «Invite»/«Email»/«Send»`
    })

    await caso('B2 «Chi lo fa» del titolare mostra il titolare', async () => {
      const { ctx, page } = await apri(browser, host)
      await page.goto(`${APP}/appuntamenti/nuovo`)
      const gruppo = page.getByRole('group', { name: 'Chi lo fa' })
      await gruppo.waitFor({ timeout: 30000 })
      const tit = gruppo.getByRole('button', { name: /Hilde QA/ })
      atteso(await tit.count() === 1 && await gruppo.getByRole('button', { name: /Carla QA/ }).count() === 1, 'persone in «Chi lo fa»', await gruppo.innerText())
      const m = await misura(page, 'b2-chi-lo-fa', [['titolare', tit]])
      atteso(m.ok, 'misura Chi lo fa', m.out)
      const premuto = await tit.getAttribute('aria-pressed')
      await ctx.close()
      return `${sintesi(m)} || titolare presente (aria-pressed=${premuto}), collaboratrice presente`
    })

    await caso('B3 invito scaduto: testo chiaro, «Vai alla Home», nessun codice', async () => {
      const s = await utente('Sara')
      const i = await invito(host.uid, s.email, 'collaboratore', new Date(Date.now() - 86400000).toISOString())
      const { ctx, page } = await apri(browser, s)
      await page.goto(`${APP}/invito/${i.token}`)
      const testo = page.getByText('Invito scaduto', { exact: true })
      await testo.waitFor({ timeout: 30000 })
      const home = page.getByRole('button', { name: 'Vai alla Home' })
      atteso(await home.count() === 1, 'manca «Vai alla Home»', {})
      await nessunCodice(page)
      const m = await misura(page, 'b3-invito-scaduto', [['testo', testo], ['Vai alla Home', home]])
      atteso(m.ok, 'misura invito scaduto', m.out)
      await home.click()
      await page.waitForURL(`${APP}/`, { timeout: 20000 })
      await ctx.close()
      return `${sintesi(m)} || Vai alla Home → /`
    })

    await caso('B4 dopo Accetta nessun «Salvataggio non riuscito» né «Dati non aggiornati»', async () => {
      const n = await utente('Nora')
      const i = await invito(host.uid, n.email)
      const { ctx, page } = await apri(browser, n)
      await page.goto(`${APP}/invito/${i.token}`)
      const accetta = page.getByRole('button', { name: 'Accetta', exact: true })
      await accetta.waitFor({ timeout: 30000 })
      await accetta.click()
      const visti = new Set()
      const t0 = Date.now()
      let entrata = false
      while (Date.now() - t0 < 15000) {
        try {
          const t = await page.locator('body').innerText({ timeout: 1000 })
          for (const f of ['Salvataggio non riuscito', 'Dati non aggiornati']) if (t.includes(f)) visti.add(f)
        } catch { /* pagina in ricarica */ }
        if (!entrata) {
          try { entrata = (await db.doc(`accounts/${n.uid}`).get()).get('salonId') === host.uid } catch { /* riprova */ }
        }
        await page.waitForTimeout(250)
      }
      await page.screenshot({ path: path.join(SHOTS, 'b4-dopo-accetta.png') })
      atteso(entrata, 'invito non accettato', {})
      atteso(visti.size === 0, 'avvisi dopo l’accettazione', [...visti])
      const url = new URL(page.url()).pathname
      await ctx.close()
      return `accettato, url ${url}, 15 s senza «Salvataggio non riuscito» né «Dati non aggiornati»`
    })

    await caso('B5 Listino del collaboratore in sola lettura', async () => {
      const { ctx, page } = await apri(browser, collab)
      await page.goto(`${APP}/listino`)
      await page.waitForTimeout(4000)
      const corpo = await page.locator('body').innerText()
      atteso(/Listino/i.test(corpo), 'pagina Listino non aperta', corpo.slice(0, 300))
      const resti = []
      for (const nome of ['Gestione listino', 'Aggiorna prezzi']) if (await page.getByRole('button', { name: nome }).count()) resti.push(nome)
      if (await page.getByRole('link', { name: 'Gestisci' }).count()) resti.push('Gestisci')
      atteso(resti.length === 0, 'azioni visibili al collaboratore', resti)
      const m = await misura(page, 'b5-listino-collab', [])
      atteso(m.ok, 'pagina Listino scorre di lato', m.out)
      await ctx.close()
      return `nessuna di Gestione listino / Aggiorna prezzi / Gestisci; ${sintesi(m)}`
    })
  } finally {
    await browser.close().catch(() => {})
  }
}

async function cancellaTutti() {
  for (const uid of creati) {
    const inv = await db.collection('invites').where('salonId', '==', uid).get()
    for (const d of inv.docs) await d.ref.delete().catch(() => {})
    await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
    await db.doc(`accounts/${uid}`).delete().catch(() => {})
    await auth.deleteUser(uid).catch(() => {})
  }
}

;(async () => {
  try {
    if (BROWSER) await browserCasi()
    else await server()
  } finally {
    if (!KEEP) await cancellaTutti()
  }
  console.log(JSON.stringify({ stamp: STAMP, esiti, chiamate: BROWSER ? chiamate : undefined }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
