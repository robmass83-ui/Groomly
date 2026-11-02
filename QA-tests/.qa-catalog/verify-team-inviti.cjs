// Verifica medie «Team e ruoli» 12-15 (solo emulatore demo-groomly, funzioni compilate: `cd functions && npx tsc`).
// Server (handler veri di index.js chiamati con .run(), fuori dal ramo FUNCTIONS_EMULATOR):
// (a) acceptInvite: email non confermata → «Conferma la tua email…», invito ancora aperto; confermata → accettato.
// (b) leggiInvito aperto / già tuo / altra email; rifiutaInvito chiude l'invito e libera il posto (openInviteExpiries −1).
// (c) invitiInSospeso dal titolare senza token (id = sha256); annullaInvito cancella e libera; annullare un invito «usato» non tocca nulla.
// (d) titolare Go con collaboratore agganciato: revokeMember riesce, l'account torna al suo salone e
//     salons/<collab>/avvisi/uscita ha il nome del salone; tornaAlMioSalone di un altro membro non scrive avvisi/uscita.
// Con --browser (app Vite in modo emu su 127.0.0.1:5173; le chiamate a :5001 si intercettano ed eseguono con .run(),
// email_verified preso dal token vero dell'emulatore Auth), a 390 e 360 px con misura delle righe (scrollWidth <= clientWidth):
// B1 pagina d'invito (Accetta/Rifiuta, email non confermata, «Fai già parte di …»), B2 Team (inviti in sospeso, conferma di revoca),
// B3 Abbonamento del titolare Go con persona collegata → «Togli», B4 blocco del collaboratore → «Torna al mio salone»,
// B5 Home del revocato → avviso e «Ok». Screenshot in QA-tests/results/team-inviti/.
// Uso: node QA-tests/.qa-catalog/verify-team-inviti.cjs [--browser] [--keep]
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
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/team-inviti')
const MSG_EMAIL = 'Conferma la tua email per accettare l’invito'
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
const nuovoToken = () => crypto.randomBytes(32).toString('hex')
let scarto = 0
const scadenza = () => new Date(Date.now() + 7 * 86400000 + (scarto += 1000)).toISOString()
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
const GO = { piano: 'go', stato: 'attivo', fonte: 'omaggio', enabled: false, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }

const creati = []
const em = (nome) => `qa-ti-${nome}-${STAMP}@test.groomly`
async function utente(nome, { salone, verificata = true, pro = null } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: verificata })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = salone ?? `Salone di ${nome}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
  })
  if (pro) await db.doc(`salons/${u.uid}/pro/main`).set(pro)
  return { uid: u.uid, email, nome }
}
// Come createInvite (senza Brevo): documento dell'invito + scadenza in pro/main.openInviteExpiries.
async function invito(salonId, email, role = 'collaboratore') {
  const token = nuovoToken(); const expiresAt = scadenza()
  await db.doc(`invites/${token}`).set({ salonId, email, role, createdAt: new Date().toISOString(), expiresAt, status: 'aperto' })
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data() ?? {}
  await db.doc(`salons/${salonId}/pro/main`).set({ openInviteExpiries: [...(pro.openInviteExpiries ?? []), expiresAt] }, { merge: true })
  return { token, expiresAt }
}
// Persona già agganciata a un salone (come dopo acceptInvite).
async function aggancia(persona, salonId, role = 'collaboratore') {
  await db.doc(`accounts/${persona.uid}`).set({ salonId, role }, { merge: true })
  await db.doc(`salons/${salonId}/members/${persona.uid}`).set({ uid: persona.uid, email: persona.email, role, firstName: persona.nome, lastName: 'QA', status: 'attivo' })
}
const scadenze = async (salonId) => (await db.doc(`salons/${salonId}/pro/main`).get()).get('openInviteExpiries') ?? []
const account = async (uid) => (await db.doc(`accounts/${uid}`).get()).data() ?? {}
const call = (f, chi, data = {}, verificata = true) => f.run({ auth: { uid: chi.uid, token: { email: chi.email, email_verified: verificata } }, data, rawRequest: { headers: {} } })
const errore = (p) => p.then((r) => ({ ok: true, r }), (e) => ({ ok: false, code: e.code, message: e.message }))

const esiti = []
async function caso(nome, fnc) {
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 600) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

async function server() {
  const host = await utente('Host', { salone: `Salone Host TI ${STAMP}`, pro: SALONE })
  const go = await utente('Gogo', { salone: `Salone Go TI ${STAMP}`, pro: GO })

  await caso('(a) acceptInvite: non confermata rifiutata, confermata accettata', async () => {
    const u = await utente('Ugo', { verificata: false })
    const inv = await invito(host.uid, u.email)
    const prima = (await scadenze(host.uid)).length
    const no = await errore(call(fn.acceptInvite, u, { token: inv.token }, false))
    atteso(!no.ok && no.message === MSG_EMAIL, 'rifiuto atteso «Conferma la tua email…»', no)
    const dopoNo = (await db.doc(`invites/${inv.token}`).get()).data()
    atteso(dopoNo.status === 'aperto' && (await account(u.uid)).salonId === u.uid && (await scadenze(host.uid)).length === prima, 'nulla deve cambiare dopo il rifiuto', dopoNo)
    await auth.updateUser(u.uid, { emailVerified: true })
    const si = await errore(call(fn.acceptInvite, u, { token: inv.token }, true))
    atteso(si.ok, 'accettazione da confermata', si)
    const a = await account(u.uid); const i = (await db.doc(`invites/${inv.token}`).get()).data()
    const m = (await db.doc(`salons/${host.uid}/members/${u.uid}`).get()).data()
    const dopo = await scadenze(host.uid)
    atteso(a.salonId === host.uid && a.role === 'collaboratore' && i.status === 'usato' && i.usedBy === u.uid && m?.status === 'attivo' && dopo.length === prima - 1 && !dopo.includes(inv.expiresAt), 'stato dopo accettazione', { a, i, m, dopo: dopo.length, prima })
    caso.ugo = u; caso.invUgo = inv
    return `rifiuto: «${no.message}» (${no.code}); poi account→${a.salonId === host.uid ? 'host' : a.salonId}/${a.role}, invito usato, scadenze ${prima}→${dopo.length}`
  })

  await caso('(b) leggiInvito aperto / già tuo / altra email; rifiutaInvito libera il posto', async () => {
    const v = await utente('Vera'); const w = await utente('Walter')
    const inv = await invito(host.uid, v.email, 'socio')
    const aperto = await call(fn.leggiInvito, v, { token: inv.token })
    atteso(aperto.stato === 'aperto' && aperto.salone === `Salone Host TI ${STAMP}` && aperto.ruolo === 'socio', 'aperto', aperto)
    atteso(caso.ugo, 'serve il caso (a)', {})
    const mio = await call(fn.leggiInvito, caso.ugo, { token: caso.invUgo.token })
    atteso(mio.stato === 'gia-tuo' && mio.salone === `Salone Host TI ${STAMP}`, 'già tuo', mio)
    const altra = await call(fn.leggiInvito, w, { token: inv.token })
    atteso(altra.stato === 'altra-email' && altra.salone === '' && altra.ruolo === null, 'altra email senza nome del salone', altra)
    const rifAltro = await errore(call(fn.rifiutaInvito, w, { token: inv.token }))
    atteso(!rifAltro.ok && (await db.doc(`invites/${inv.token}`).get()).get('status') === 'aperto', 'un’altra email non può rifiutare', rifAltro)
    const prima = await scadenze(host.uid)
    const rif = await errore(call(fn.rifiutaInvito, v, { token: inv.token }))
    atteso(rif.ok, 'rifiuto', rif)
    const i = (await db.doc(`invites/${inv.token}`).get()).data(); const dopo = await scadenze(host.uid)
    atteso(i.status === 'rifiutato' && dopo.length === prima.length - 1 && !dopo.includes(inv.expiresAt) && (await account(v.uid)).salonId === v.uid, 'dopo il rifiuto', { status: i.status, prima: prima.length, dopo: dopo.length })
    return `aperto=${JSON.stringify(aperto)}; già tuo=${JSON.stringify(mio)}; altra=${JSON.stringify(altra)}; Walter rifiuta → «${rifAltro.message}»; Vera rifiuta → ${i.status}, scadenze ${prima.length}→${dopo.length}`
  })

  await caso('(c) invitiInSospeso senza token; annullaInvito libera; annullare un usato non tocca nulla', async () => {
    const i1 = await invito(host.uid, em('inv1')); const i2 = await invito(host.uid, em('inv2'), 'socio')
    const r = await call(fn.invitiInSospeso, host)
    const testo = JSON.stringify(r)
    const tuttiToken = (await db.collection('invites').where('salonId', '==', host.uid).get()).docs.map((d) => d.id)
    const trapela = tuttiToken.filter((t) => testo.includes(t))
    const ids = r.inviti.map((x) => x.id)
    atteso(trapela.length === 0, 'token nella risposta', trapela)
    atteso(ids.includes(sha(i1.token)) && ids.includes(sha(i2.token)) && r.inviti.every((x) => Object.keys(x).sort().join() === 'email,id,ruolo,scade'), 'elenco', r)
    atteso(!ids.includes(sha(caso.invUgo.token)), 'invito usato nell’elenco', ids)
    const collab = await errore(call(fn.invitiInSospeso, caso.ugo))
    atteso(!collab.ok, 'il collaboratore non deve leggere l’elenco', collab)
    const prima = await scadenze(host.uid)
    const ann = await errore(call(fn.annullaInvito, host, { id: sha(i1.token) }))
    atteso(ann.ok, 'annullamento', ann)
    const dopo = await scadenze(host.uid)
    atteso(!(await db.doc(`invites/${i1.token}`).get()).exists && dopo.length === prima.length - 1 && !dopo.includes(i1.expiresAt), 'dopo annulla', { prima: prima.length, dopo: dopo.length })
    const r2 = await call(fn.invitiInSospeso, host)
    atteso(!r2.inviti.some((x) => x.id === sha(i1.token)) && r2.inviti.some((x) => x.id === sha(i2.token)), 'elenco riletto', r2)
    const usato = await errore(call(fn.annullaInvito, host, { id: sha(caso.invUgo.token) }))
    const docUsato = (await db.doc(`invites/${caso.invUgo.token}`).get()).data(); const dopo2 = await scadenze(host.uid)
    atteso(!usato.ok && docUsato?.status === 'usato' && JSON.stringify(dopo2) === JSON.stringify(dopo), 'annullare un usato', { usato, status: docUsato?.status, dopo2: dopo2.length, dopo: dopo.length })
    return `elenco ${r.inviti.length} inviti, campi id/email/ruolo/scade, nessun token (${tuttiToken.length} controllati); collaboratore → «${collab.message}»; annulla → doc cancellato, scadenze ${prima.length}→${dopo.length}; annulla usato → «${usato.message}», doc ancora usato, scadenze invariate (${dopo2.length})`
  })

  await caso('(d) titolare Go: revokeMember + avvisi/uscita; tornaAlMioSalone non scrive l’avviso', async () => {
    const c = await utente('Carla'); const m = await utente('Mario')
    await aggancia(c, go.uid); await aggancia(m, go.uid)
    const daCollab = await errore(call(fn.revokeMember, m, { uid: c.uid }))
    atteso(!daCollab.ok && (await db.doc(`salons/${go.uid}/members/${c.uid}`).get()).get('status') === 'attivo', 'un collaboratore non deve revocare', daCollab)
    const titolare = await errore(call(fn.revokeMember, go, { uid: go.uid }))
    atteso(!titolare.ok, 'il titolare non si revoca', titolare)
    const rev = await errore(call(fn.revokeMember, go, { uid: c.uid }))
    atteso(rev.ok, 'revoca dal titolare Go', rev)
    const a = await account(c.uid); const mem = (await db.doc(`salons/${go.uid}/members/${c.uid}`).get()).data()
    const avv = (await db.doc(`salons/${c.uid}/avvisi/uscita`).get()).data()
    atteso(a.salonId === c.uid && a.role === 'titolare' && mem.status === 'revocato', 'account e membro dopo revoca', { a, mem })
    atteso(avv && avv.salone === `Salone Go TI ${STAMP}` && avv.letto === false && typeof avv.quando === 'string', 'avvisi/uscita', avv)
    const torna = await errore(call(fn.tornaAlMioSalone, m))
    atteso(torna.ok, 'tornaAlMioSalone', torna)
    const am = await account(m.uid); const avvM = await db.doc(`salons/${m.uid}/avvisi/uscita`).get()
    const memM = (await db.doc(`salons/${go.uid}/members/${m.uid}`).get()).data()
    atteso(am.salonId === m.uid && am.role === 'titolare' && memM.status === 'revocato' && !avvM.exists, 'dopo tornaAlMioSalone', { am, memM, avviso: avvM.exists })
    const letto = await errore(call(fn.segnaAvvisoUscita, c))
    const avv2 = (await db.doc(`salons/${c.uid}/avvisi/uscita`).get()).data()
    atteso(letto.ok && avv2.letto === true, 'segnaAvvisoUscita', { letto, avv2 })
    return `collaboratore che revoca → «${daCollab.message}»; revoca del titolare → «${titolare.message}»; revoca Go ok, account Carla→proprio/titolare, avvisi/uscita=${JSON.stringify(avv)}; Mario torna → proprio/titolare, avvisi/uscita assente; segnaAvvisoUscita → letto:true`
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
    chiamate.push({ nome, verificata: payload.email_verified === true })
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
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(true) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
async function apri(browser, persona, { attendiFuoriLogin = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await instrada(ctx)
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  if (attendiFuoriLogin) await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  else await page.waitForTimeout(5000)
  return { ctx, page }
}
// Misura: per ogni locatore, il primo blocco che lo contiene deve avere scrollWidth <= clientWidth e stare nello schermo;
// la pagina non deve scorrere di lato.
async function misura(page, nome, locatori) {
  const out = {}
  for (const v of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(v); await page.waitForTimeout(400)
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
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out[`${v.width}px`] = { pagina, paginaOk: pagina.sw <= pagina.iw, righe }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const ok = Object.values(out).every((m) => m.paginaOk && m.righe.every((r) => r.ok))
  return { ok, out }
}
const sintesi = (m) => Object.entries(m.out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}, ` + v.righe.map((r) => r.assente ? `${r.etichetta} ASSENTE` : `${r.etichetta} ${r.sw}/${r.cw}${r.ok ? '' : ' KO'}`).join(', ')).join(' | ')
const nessunCodice = async (page) => {
  const t = await page.locator('body').innerText()
  const m = t.match(/\[\d{3}\]|failed-precondition|permission-denied|\bINTERNAL\b|FirebaseError/)
  if (m) throw new Error('codice grezzo in pagina: ' + m[0])
}

async function browserCasi() {
  const { chromium } = require('playwright')
  fs.mkdirSync(SHOTS, { recursive: true })
  // Posti in più: Teo e i due inviti si scrivono con admin, senza il controllo dei posti di createInvite.
  const host = await utente('Hilde', { salone: `Salone Hilde ${STAMP}`, pro: { ...SALONE, seatsExtra: 3, seats: 6 } })
  const go = await utente('Gino', { salone: `Salone Gino ${STAMP}`, pro: GO })
  const browser = await chromium.launch()
  try {
    await caso('B1 pagina d’invito: Accetta/Rifiuta, email non confermata, «Fai già parte di …»', async () => {
      const note = []
      // B1.1 Rifiuta
      const a = await utente('Anna')
      const i1 = await invito(host.uid, a.email)
      const { ctx, page } = await apri(browser, a)
      await page.goto(`${APP}/invito/${i1.token}`)
      const titolo = page.getByRole('heading', { name: `Entra nel salone Salone Hilde ${STAMP} come Collaboratore` })
      await titolo.waitFor({ timeout: 30000 })
      const m1 = await misura(page, 'b1-invito-aperto', [['titolo', titolo], ['Accetta', page.getByRole('button', { name: 'Accetta', exact: true })], ['Rifiuta', page.getByRole('button', { name: 'Rifiuta', exact: true })]])
      atteso(m1.ok, 'misura invito aperto', m1.out)
      note.push('aperto ' + sintesi(m1))
      const prima = (await scadenze(host.uid)).length
      await page.getByRole('button', { name: 'Rifiuta', exact: true }).click()
      await page.waitForURL(`${APP}/`, { timeout: 20000 })
      await aspetta(async () => (await db.doc(`invites/${i1.token}`).get()).get('status') === 'rifiutato')
      const dopo = (await scadenze(host.uid)).length
      const sospeso = await page.evaluate(() => localStorage.getItem('groomly.invitoInSospeso'))
      atteso(dopo === prima - 1 && !sospeso && (await account(a.uid)).salonId === a.uid, 'dopo Rifiuta', { prima, dopo, sospeso })
      note.push(`Rifiuta → Home, invito rifiutato, scadenze ${prima}→${dopo}`)
      // B1.2 Accetta poi «Fai già parte di …»
      const i2 = await invito(host.uid, a.email)
      await page.goto(`${APP}/invito/${i2.token}`)
      await titolo.waitFor({ timeout: 30000 })
      await page.getByRole('button', { name: 'Accetta', exact: true }).click()
      await aspetta(async () => (await account(a.uid)).salonId === host.uid, 30000)
      await page.waitForURL(`${APP}/`, { timeout: 30000 }); await page.waitForTimeout(2500)
      await page.goto(`${APP}/invito/${i2.token}`)
      const gia = page.getByText(`Fai già parte di Salone Hilde ${STAMP}`)
      await gia.waitFor({ timeout: 30000 })
      const home = page.getByRole('button', { name: 'Vai alla Home' })
      atteso(await home.count() === 1, 'manca «Vai alla Home»', {})
      await nessunCodice(page)
      const m2 = await misura(page, 'b1-gia-tuo', [['testo', gia], ['Vai alla Home', home]])
      atteso(m2.ok, 'misura già tuo', m2.out)
      note.push('già tuo ' + sintesi(m2))
      await ctx.close()
      // B1.3 email non confermata → «Conferma la tua email…» → confermata → Accetta (token rinnovato)
      const n = await utente('Nina', { verificata: false })
      const i3 = await invito(host.uid, n.email)
      const s = await apri(browser, n, { attendiFuoriLogin: false })
      await s.page.goto(`${APP}/invito/${i3.token}`)
      const conf = s.page.getByText(MSG_EMAIL)
      await conf.waitFor({ timeout: 30000 })
      atteso(await s.page.getByRole('button', { name: 'Accetta', exact: true }).count() === 0, 'Accetta visibile con email non confermata', {})
      const ho = s.page.getByRole('button', { name: 'Ho confermato' })
      const m3 = await misura(s.page, 'b1-email-da-confermare', [['testo', conf], ['Ho confermato', ho], ['Vai alla Home', s.page.getByRole('button', { name: 'Vai alla Home' })]])
      atteso(m3.ok, 'misura email da confermare', m3.out)
      note.push('da confermare ' + sintesi(m3))
      await auth.updateUser(n.uid, { emailVerified: true })
      await ho.click()
      await s.page.getByRole('button', { name: 'Accetta', exact: true }).waitFor({ timeout: 30000 })
      await s.page.getByRole('button', { name: 'Accetta', exact: true }).click()
      await aspetta(async () => (await account(n.uid)).salonId === host.uid, 30000)
      const ultimaAccept = chiamate.filter((c) => c.nome === 'acceptInvite').pop()
      atteso(ultimaAccept && ultimaAccept.verificata, 'acceptInvite senza email_verified nel token', ultimaAccept)
      await s.page.waitForTimeout(2500)
      await s.page.screenshot({ path: path.join(SHOTS, 'b1-confermata-accettato.png') })
      note.push('confermata → Ho confermato → Accetta → dentro il salone (token con email_verified:true)')
      await s.ctx.close()
      return note.join(' || ')
    })

    await caso('B2 Team: inviti in sospeso e conferma di revoca', async () => {
      const t = await utente('Teo'); await aggancia(t, host.uid)
      const e1 = em('sospeso-uno'); const e2 = em('sospeso-due-con-un-indirizzo-lungo')
      const i1 = await invito(host.uid, e1); const i2 = await invito(host.uid, e2, 'socio')
      const { ctx, page } = await apri(browser, host)
      await page.goto(`${APP}/impostazioni/team`)
      const sez = page.getByRole('heading', { name: 'Inviti in sospeso' })
      await sez.waitFor({ timeout: 30000 })
      const riga1 = page.getByText(e1, { exact: true }); const riga2 = page.getByText(e2, { exact: true })
      await riga2.waitFor()
      const btn2 = page.getByRole('button', { name: `Annulla l’invito a ${e2}` })
      const m = await misura(page, 'b2-team-sospesi', [['sezione', sez], ['email 1', riga1], ['email 2 (lunga)', riga2], ['scade', page.getByText(/^Socio · scade il /)], ['Annulla 2', btn2], ['Revoca', page.getByRole('button', { name: 'Revoca Teo QA' })]])
      atteso(m.ok, 'misura Team', m.out)
      await btn2.click()
      const dlg = page.getByRole('dialog')
      await dlg.getByText(`Annullare l’invito a ${e2}? Il posto si libera subito.`).waitFor()
      await page.screenshot({ path: path.join(SHOTS, 'b2-conferma-annulla.png') })
      const prima = (await scadenze(host.uid)).length
      await dlg.getByRole('button', { name: 'Annulla invito' }).click()
      await aspetta(async () => !(await db.doc(`invites/${i2.token}`).get()).exists)
      await aspetta(async () => (await page.getByText(e2, { exact: true }).count()) === 0)
      const dopo = (await scadenze(host.uid)).length
      atteso(dopo === prima - 1 && (await page.getByText(e1, { exact: true }).count()) === 1, 'dopo annulla', { prima, dopo })
      // Revoca: Annulla lascia tutto com'è, Togli toglie
      await page.getByRole('button', { name: 'Revoca Teo QA' }).click()
      const domanda = dlg.getByText('Togliere Teo QA dal salone? Non vedrà più cani e appuntamenti del salone.')
      await domanda.waitFor()
      const md = await misura(page, 'b2-conferma-revoca', [['domanda', domanda], ['Togli', dlg.getByRole('button', { name: 'Togli', exact: true })], ['Annulla', dlg.getByRole('button', { name: 'Annulla', exact: true })]])
      atteso(md.ok, 'misura conferma revoca', md.out)
      await dlg.getByRole('button', { name: 'Annulla', exact: true }).click()
      await page.waitForTimeout(1500)
      atteso((await db.doc(`salons/${host.uid}/members/${t.uid}`).get()).get('status') === 'attivo' && !chiamate.some((c) => c.nome === 'revokeMember'), 'Annulla ha revocato', {})
      await page.getByRole('button', { name: 'Revoca Teo QA' }).click()
      await dlg.getByRole('button', { name: 'Togli', exact: true }).click()
      await aspetta(async () => (await db.doc(`salons/${host.uid}/members/${t.uid}`).get()).get('status') === 'revocato')
      const avv = (await db.doc(`salons/${t.uid}/avvisi/uscita`).get()).data()
      atteso((await account(t.uid)).salonId === t.uid && avv?.salone === `Salone Hilde ${STAMP}`, 'dopo Togli', avv)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(SHOTS, 'b2-dopo-revoca.png') })
      void i1
      await ctx.close()
      return `${sintesi(m)} || conferma ${sintesi(md)} || annulla invito → doc cancellato, scadenze ${prima}→${dopo}, elenco riletto; Revoca→Annulla nessuna chiamata; Revoca→Togli → revocato, avvisi/uscita «${avv.salone}»`
    })

    const carla = await utente('Carola'); await aggancia(carla, go.uid)
    await caso('B3 Abbonamento del titolare Go con persona collegata → «Togli»', async () => {
      const { ctx, page } = await apri(browser, go)
      await page.goto(`${APP}/impostazioni/abbonamento`)
      const sez = page.getByRole('heading', { name: 'Persone ancora collegate al tuo salone' })
      await sez.waitFor({ timeout: 30000 })
      const togliA = page.getByRole('button', { name: 'Togli Carola QA' })
      const m = await misura(page, 'b3-abbonamento-collegati', [['sezione', sez], ['dettaglio', page.getByText(/^Il piano Salone non è attivo: queste persone/)], ['nome', page.getByText('Carola QA', { exact: true })], ['Togli', togliA]])
      atteso(m.ok, 'misura Abbonamento', m.out)
      await togliA.click()
      const dlg = page.getByRole('dialog')
      await dlg.getByText('Togliere Carola QA dal salone? Non vedrà più cani e appuntamenti del salone.').waitFor()
      await page.screenshot({ path: path.join(SHOTS, 'b3-conferma-togli.png') })
      await dlg.getByRole('button', { name: 'Togli', exact: true }).click()
      await aspetta(async () => (await account(carla.uid)).salonId === carla.uid)
      await aspetta(async () => (await page.getByRole('heading', { name: 'Persone ancora collegate al tuo salone' }).count()) === 0)
      const mem = (await db.doc(`salons/${go.uid}/members/${carla.uid}`).get()).data()
      const avv = (await db.doc(`salons/${carla.uid}/avvisi/uscita`).get()).data()
      atteso(mem.status === 'revocato' && avv?.salone === `Salone Gino ${STAMP}` && avv.letto === false, 'dopo Togli', { mem, avv })
      await page.screenshot({ path: path.join(SHOTS, 'b3-dopo-togli.png') })
      await ctx.close()
      return `${sintesi(m)} || Togli → membro revocato, account Carola al suo salone, riquadro sparito, avvisi/uscita «${avv.salone}»`
    })

    await caso('B4 blocco del collaboratore → «Torna al mio salone»', async () => {
      const b = await utente('Bruno'); await aggancia(b, go.uid)
      const { ctx, page } = await apri(browser, b)
      const btn = page.getByRole('button', { name: 'Torna al mio salone' })
      await btn.waitFor({ timeout: 30000 })
      const titolo = page.getByText(/^Il tuo accesso (a .+|al salone) è sospeso$/)
      const dettaglio = page.getByText(/^Il piano Salone (di .+ )?non è attivo\. I dati del salone non sono persi\.$/)
      atteso(await dettaglio.count() === 1, 'testo del blocco', await page.locator('body').innerText())
      atteso(!(await page.getByText('Il titolare ha spento il piano').count()), 'testo vecchio', {})
      const m = await misura(page, 'b4-blocco', [['titolo', titolo], ['dettaglio', dettaglio], ['Torna al mio salone', btn], ['Esci', page.getByRole('button', { name: 'Esci', exact: true })]])
      atteso(m.ok, 'misura blocco', m.out)
      const testoDettaglio = await dettaglio.innerText()
      await btn.click()
      const dlg = page.getByRole('dialog')
      await dlg.getByText(/^Lascerai (il salone .+|questo salone)\. Potrai rientrarci solo con un nuovo invito\.$/).waitFor()
      await page.screenshot({ path: path.join(SHOTS, 'b4-conferma-torna.png') })
      await dlg.getByRole('button', { name: 'Torna al mio salone' }).click()
      await aspetta(async () => (await account(b.uid)).salonId === b.uid, 30000)
      await page.waitForTimeout(5000)
      const mem = (await db.doc(`salons/${go.uid}/members/${b.uid}`).get()).data()
      const avv = await db.doc(`salons/${b.uid}/avvisi/uscita`).get()
      atteso(mem.status === 'revocato' && !avv.exists, 'dopo Torna', { mem, avviso: avv.exists })
      atteso(!(await page.getByText(/Non fai più parte di/).count()) && !(await page.getByRole('button', { name: 'Torna al mio salone' }).count()), 'dopo Torna l’app mostra ancora il blocco o un avviso d’uscita', await page.locator('body').innerText())
      await page.screenshot({ path: path.join(SHOTS, 'b4-tornato.png') })
      await ctx.close()
      return `«${testoDettaglio}» ${sintesi(m)} || Torna → account al suo salone, membro revocato, avvisi/uscita assente, nessun avviso in Home (url ${new URL(page.url()).pathname})`
    })

    await caso('B5 Home del revocato → avviso e «Ok»', async () => {
      const avv0 = (await db.doc(`salons/${carla.uid}/avvisi/uscita`).get()).data()
      atteso(avv0 && avv0.letto === false, 'serve B3 (avviso non letto)', avv0)
      const { ctx, page } = await apri(browser, carla)
      await page.goto(`${APP}/`)
      const testo = page.getByText(`Non fai più parte di Salone Gino ${STAMP}. Ora sei nel tuo salone.`)
      await testo.waitFor({ timeout: 30000 })
      const ok = page.getByRole('button', { name: 'Ok', exact: true })
      const m = await misura(page, 'b5-home-avviso', [['avviso', testo], ['Ok', ok]])
      atteso(m.ok, 'misura avviso Home', m.out)
      await ok.click()
      await aspetta(async () => (await db.doc(`salons/${carla.uid}/avvisi/uscita`).get()).get('letto') === true)
      await aspetta(async () => (await page.getByText(/Non fai più parte di/).count()) === 0)
      await page.reload(); await page.waitForTimeout(4000)
      atteso(!(await page.getByText(/Non fai più parte di/).count()), 'avviso di nuovo dopo il ricaricamento', {})
      await page.screenshot({ path: path.join(SHOTS, 'b5-dopo-ok.png') })
      await ctx.close()
      return `${sintesi(m)} || Ok → letto:true, avviso sparito e non torna dopo il ricaricamento`
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
  console.log(JSON.stringify({ stamp: STAMP, esiti, chiamate: BROWSER ? chiamate.map((c) => `${c.nome}${c.verificata ? '' : '(non verificata)'}`) : undefined }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
