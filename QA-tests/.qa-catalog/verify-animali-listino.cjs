// Verifica medie «Animali, mensili, listino», audit 23-26 e 35 (solo emulatore demo-groomly; Task 6 del piano 2026-11-03-medie-animali-listino).
// App Vite in modo emu su 127.0.0.1:5173. Account e salone nuovi a ogni giro (firebase-admin), dati nel formato dei mapper di src/lib/firebaseMap.ts.
// Misure a 320, 360 e 390 px (scrollWidth <= clientWidth, nessuno scorrimento orizzontale), screenshot in QA-tests/results/animali-listino/.
// L1 salone senza listino salvato: Yorkshire piccolo, nuovo appuntamento con Bagno → 25 € «dal listino Yorkshire»; salvato → riga a 25 su Firestore;
//    scheda del cane: segnaposto del prezzo personale di Bagno = 25.
// L2 Gestione listino: riga «Bagno» dello Yorkshire abbinata a «Taglio / tosatura», salvata; un'altra razza modificata e salvata; riaperta → abbinamento
//    rimasto; nuovo appuntamento: Taglio 25 dal listino, Bagno 20 (taglia). Visita con Taglio salvata a 25.
// L3 «Aggiorna prezzi» +10% → Taglio proposto col nuovo prezzo; la visita salvata prima, aperta e salvata di nuovo, resta a 25.
// L4 «Nessun servizio» sulla riga → Taglio e Bagno dai prezzi per taglia (30 e 20), nessun «dal listino».
// M1 Mensili: completata 22/09, fissati 19/11 e 01/12 (oggi 03/11; date spostate rispetto a oggi se si è oltre) → «Fissato in ritardo · 19 nov».
// T1 Cane con tags: ['ipoallergenico'] → nessun tag nell'elenco né nella scheda; dopo Modifica + Salva il documento non ha più `tags`.
// S1 Servizi e durate a 320/360/390: nomi interi (nessuna parola spezzata o tagliata), durata · prezzo sotto il nome.
// H1 Header a 320 (e 360/390) su Animali, Report incassi, Servizi e durate (Utenti solo per l'operatore): titolo, sottotitolo e pulsanti senza sovrapposizioni.
// C1 collaboratore chiude una visita di un cane con premio in attesa: nessun «Salvataggio non riuscito», settings/main identico, nessun «Elimina»;
//    Home senza riga compleanno («Sì»/Cestino) e senza Cestino sul promemoria. Controllo: il titolare vede la riga del compleanno.
// Uso: node QA-tests/.qa-catalog/verify-animali-listino.cjs [--keep]
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const KEEP = process.argv.includes('--keep')
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const APP = 'http://127.0.0.1:5173'
const SHOTS = path.resolve('QA-tests/results/animali-listino')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '08:00', a: '20:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
// come SERVICE_SEED (src/data/seed/services.ts): Bagno piccola 20, Taglio piccola 30
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 30, media: 35, grande: 45 } },
  { id: 'bagno-taglio', order: 2, name: 'Bagno + taglio', kind: 'principale', iconKey: 'bagno_taglio', active: true, durationMin: { piccola: 60, media: 90, grande: 120 }, price: { piccola: 35, media: 45, grande: 60 } },
  { id: 'stripping', order: 3, name: 'Stripping', kind: 'principale', active: true, durationMin: { piccola: 120, media: 150, grande: 180 }, price: { piccola: 50, media: 65, grande: 85 } },
  { id: 'nodi', order: 4, name: 'Gestione nodi', kind: 'extra', iconKey: 'nodi', active: true, durationMin: { piccola: 20, media: 20, grande: 20 }, price: { piccola: 5, media: 5, grande: 5 } },
  { id: 'dermatologico', order: 5, name: 'Dermatologico', kind: 'extra', iconKey: 'dermatologico', active: true, durationMin: { piccola: 15, media: 15, grande: 15 }, price: { piccola: 10, media: 10, grande: 10 } },
  { id: 'antiparassitario', order: 6, name: 'Antiparassitario', kind: 'extra', iconKey: 'antiparassitario', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 12, media: 12, grande: 12 } },
  { id: 'unghie', order: 7, name: 'Unghie', kind: 'extra', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 } },
  { id: 'lungo', order: 8, name: 'Trattamento rigenerante antinodo', kind: 'extra', active: true, durationMin: { piccola: 25, media: 25, grande: 25 }, price: { piccola: 15, media: 15, grande: 15 } },
]

const creati = []
const LUNGO = 'Trattamento rigenerante antinodo' // nome di 3 parole lunghe: a 320 px servono 3 righe (oltre il limite di 2 righe, M5 della revisione)
const lunghiTagliati = []
const em = (nome) => `qa-al-${nome}-${STAMP}@test.groomly`
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

const esiti = []
async function caso(nome, fnc) {
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

// ——— date (ora locale, come il browser) ———
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const adesso = new Date()
const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())
// caso dell'audit: completata 22/09, fissati 19/11 e 01/12 con oggi 03/11; oltre il 19/11 le stesse distanze da oggi
const AUDIT = oggi < new Date(2026, 10, 19)
const mDone = AUDIT ? new Date(2026, 8, 22) : addDays(oggi, -42)
const mBook1 = AUDIT ? new Date(2026, 10, 19) : addDays(oggi, 16)
const mBook2 = AUDIT ? new Date(2026, 11, 1) : addDays(oggi, 28)
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const etichettaRitardo = `Fissato in ritardo · ${mBook1.getDate()} ${MESI[mBook1.getMonth()]}`
const numero = (testo) => Number(String(testo).replace(/[^\d,]/g, '').replace(',', '.'))

// ——— browser ———
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
const errori = []
const toastFalliti = []
async function apri(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  // osserva i toast «Salvataggio non riuscito» per tutta la sessione (anche dopo le navigazioni)
  const conta = { n: 0 }
  await ctx.exposeBinding('__toastKo', () => { conta.n++; toastFalliti.push(persona.nome) })
  await ctx.addInitScript(() => {
    let visto = false
    const guarda = () => {
      const c = document.body && document.body.innerText.includes('Salvataggio non riuscito')
      if (c && !visto) window.__toastKo()
      visto = !!c
    }
    document.addEventListener('DOMContentLoaded', () => new MutationObserver(guarda).observe(document.body, { childList: true, subtree: true, characterData: true }))
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page, conta }
}
async function misura(page, nome, locatori, { dentro = [] } = {}) {
  const out = {}
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(600)
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      const interna = dentro.includes(etichetta)
      righe.push({ etichetta, ...(await el.evaluate((n, interna) => {
        let b = n
        while (b && getComputedStyle(b).display === 'inline') b = b.parentElement
        const r = b.getBoundingClientRect()
        const dentroSchermo = r.left >= -0.5 && r.right <= window.innerWidth + 0.5
        return { sw: b.scrollWidth, cw: b.clientWidth, sinistra: Math.round(r.left), destra: Math.round(r.right), ok: (interna || b.scrollWidth <= b.clientWidth) && dentroSchermo }
      }, interna)) })
    }
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    const primo = locatori[locatori.length - 1][1].first()
    if (await primo.count()) await primo.scrollIntoViewIfNeeded().catch(() => {})
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out[`${v.width}px`] = { pagina, paginaOk: pagina.sw <= pagina.iw, righe }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const ok = Object.values(out).every((m) => m.paginaOk && m.righe.every((r) => r.ok))
  return { ok, out }
}
const sintesi = (m) => Object.entries(m.out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}, ` + v.righe.map((r) => r.assente ? `${r.etichetta} ASSENTE` : `${r.etichetta} ${r.sw}/${r.cw}${r.ok ? '' : ' KO'}`).join(', ')).join(' | ')

// ——— dati ———
async function visita(salonId, v) {
  const now = Date.now()
  const doc = { createdAt: now - 864e6, updatedAt: now - 864e6, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end ? v.end.getTime() : undefined }
  if (v.chiusoIl) doc.chiusoIl = v.chiusoIl.getTime()
  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]
  await db.doc(`salons/${salonId}/appointments/${v.id}`).set(doc)
  return v.id
}
async function cane(salonId, id, name, extra = {}) {
  const now = Date.now()
  await db.doc(`salons/${salonId}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6, ...extra })
  return id
}
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

async function semina() {
  const host = await utente('Lia', {
    cognome: 'Titolare', salone: `Salone Lia AL ${STAMP}`, pro: SALONE,
    extra: { serviziEmail: { promemoria: { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, auguri: { modo: 'automatico', ora: '09:00' } } },
  })
  const S = host.uid
  for (const s of SERVIZI) await db.doc(`salons/${S}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  const ugo = await utente('Ugo', { cognome: 'Collab' }); await aggancia(ugo, S)
  const ids = {}
  ids.york = await cane(S, `qa-al-york-${STAMP}`, 'Pepe York', { breed: 'Yorkshire' })
  ids.mensile = await cane(S, `qa-al-mens-${STAMP}`, 'Mina Mensile', { clientType: 'mensile', recurrenceWeeks: 4 })
  ids.tag = await cane(S, `qa-al-tag-${STAMP}`, 'Tito Tag', { tags: ['ipoallergenico'] })
  ids.premio = await cane(S, `qa-al-prem-${STAMP}`, 'Paco Premio', { contact: { name: 'Prova QA', phone: '+39 333 0000001', email: 'paco@example.com' } })
  ids.compleanno = await cane(S, `qa-al-comp-${STAMP}`, 'Bea Compleanno', { birthMonth: oggi.getMonth() + 1, birthDay: oggi.getDate(), birthYear: 2020, contact: { name: 'Prova QA', phone: '+39 333 0000002', email: 'bea@example.com' } })
  ids.domani = await cane(S, `qa-al-dom-${STAMP}`, 'Dino Domani', { contact: { name: 'Prova QA', phone: '+39 333 0000003', email: 'dino@example.com' } })
  // M1
  await visita(S, { id: `qa-al-v-mdone-${STAMP}`, dogId: ids.mensile, start: at(mDone, 10), end: at(mDone, 11), services: [riga('bagno', 'Bagno', 30, 20)], status: 'completato', total: 20, paymentMethod: 'contanti', chiusoIl: at(mDone, 11), actualDurationMin: 60 })
  await visita(S, { id: `qa-al-v-mb1-${STAMP}`, dogId: ids.mensile, start: at(mBook1, 10), end: at(mBook1, 10, 30), services: [riga('bagno', 'Bagno', 30, 20)], status: 'programmato' })
  await visita(S, { id: `qa-al-v-mb2-${STAMP}`, dogId: ids.mensile, start: at(mBook2, 10), end: at(mBook2, 10, 30), services: [riga('bagno', 'Bagno', 30, 20)], status: 'programmato' })
  // C1: visita del collaboratore iniziata un'ora fa, cane con premio in attesa
  const sP = new Date(adesso.getTime() - 3600000)
  ids.vPremio = await visita(S, { id: `qa-al-v-prem-${STAMP}`, dogId: ids.premio, start: sP, end: new Date(sP.getTime() + 1800000), services: [riga('bagno', 'Bagno', 30, 20)], status: 'programmato', assigneeUid: ugo.uid })
  const dD = addDays(oggi, 9)
  ids.vDisdetta = await visita(S, { id: `qa-al-v-disd-${STAMP}`, dogId: ids.premio, start: at(dD, 15), end: at(dD, 15, 30), services: [riga('bagno', 'Bagno', 30, 20)], status: 'disdetto', cancelReason: 'cliente', assigneeUid: ugo.uid })
  // promemoria: visita domani (parte oggi alle 18)
  const dom = addDays(oggi, 1)
  ids.vDomani = await visita(S, { id: `qa-al-v-dom-${STAMP}`, dogId: ids.domani, start: at(dom, 11), end: at(dom, 11, 30), services: [riga('bagno', 'Bagno', 30, 20)], status: 'programmato', assigneeUid: ugo.uid })
  // premio fedeltà in attesa per Paco
  await db.doc(`salons/${S}/settings/main`).set({ fedeltaAccesa: true, premiInAttesa: { [ids.premio]: true } }, { merge: true })
  return { host, ugo, ids }
}

async function visiteDi(salonId, dogId) {
  const q = await db.collection(`salons/${salonId}/appointments`).where('dogId', '==', dogId).get()
  return q.docs.map((d) => ({ id: d.id, ...d.data() }))
}
async function settingsDi(salonId) { return (await db.doc(`salons/${salonId}/settings/main`).get()).data() || {} }
const yorkDi = (s) => (s.priceSheet && Array.isArray(s.priceSheet.razze) ? s.priceSheet.razze.find((r) => r.nome === 'Yorkshire') : null)
function stabile(v) {
  if (Array.isArray(v)) return v.map(stabile)
  if (v && typeof v === 'object' && !(v.toDate)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stabile(v[k])]))
  if (v && v.toDate) return v.toDate().toISOString()
  return v
}

// chip dei servizi nel modulo appuntamento: { nome, prezzo, listino }
async function chip(page, nome) {
  const b = page.getByRole('button', { name: new RegExp(`^${nome.replace(/[/+]/g, (c) => `\\${c}`)} · `) }).first()
  await b.waitFor({ timeout: 20000 })
  const label = await b.getAttribute('aria-label')
  const parti = label.split(' · ')
  return { el: b, label, prezzo: numero(parti[2]), listino: parti[3] || '', testo: (await b.innerText()).replace(/\s+/g, ' ').trim() }
}
let oraLibera = 8
async function nuovo(page, dogId, servizi, giorno) {
  oraLibera += 1
  const ora = `${String(oraLibera).padStart(2, '0')}:00`
  await page.goto(`${APP}/appuntamenti/nuovo?cane=${dogId}&data=${dayKey(giorno)}&ora=${ora}&servizi=${servizi.join(',')}`)
  await page.getByRole('heading', { name: 'Nuovo appuntamento' }).or(page.getByText('Nuovo appuntamento')).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
}
async function salvaModulo(page) {
  await page.getByRole('button', { name: 'Salva', exact: true }).last().click()
  await page.waitForTimeout(1200)
  const comunque = page.getByRole('button', { name: 'Salva comunque' })
  if (await comunque.count()) { await comunque.first().click(); await page.waitForTimeout(1000) }
}
async function apriRazza(page, regione, nome) {
  const reg = page.getByRole('region', { name: regione })
  await reg.waitFor({ timeout: 30000 })
  const bottoni = reg.getByRole('button')
  const n = await bottoni.count()
  for (let i = 0; i < n; i++) {
    const t = (await bottoni.nth(i).innerText()).trim()
    if (t.startsWith(nome)) { await bottoni.nth(i).click(); break }
  }
  const dialog = page.getByRole('dialog', { name: 'Modifica razza' })
  await dialog.waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
  return dialog
}

async function browserCasi() {
  const { chromium } = require('playwright')
  fs.mkdirSync(SHOTS, { recursive: true })
  const { host, ugo, ids } = await semina()
  const S = host.uid
  const giorno = (n) => addDays(oggi, n)
  const browser = await chromium.launch()
  let visitaTaglio = null
  try {
    const t = await apri(browser, host)
    const page = t.page

    await caso('L1 senza listino salvato: Yorkshire + Bagno → 25 «dal listino Yorkshire», salvato a 25, segnaposto della scheda 25', async () => {
      const s0 = await settingsDi(S)
      atteso(s0.priceSheet === undefined, 'il salone ha già un listino salvato', Object.keys(s0))
      await nuovo(page, ids.york, ['bagno'], giorno(3))
      const b = await chip(page, 'Bagno')
      atteso(b.prezzo === 25 && b.listino === 'dal listino Yorkshire', 'chip Bagno', b.label)
      atteso(/dal listino Yorkshire/.test(b.testo), 'scritta «dal listino Yorkshire» non visibile nel chip', b.testo)
      const tot = await page.getByTestId('services-total').innerText()
      const m = await misura(page, 'l1-chip-bagno', [['chip Bagno', b.el], ['totale', page.getByTestId('services-total')]])
      const prima = new Set((await visiteDi(S, ids.york)).map((v) => v.id))
      await salvaModulo(page)
      let nuova
      await aspetta(async () => { nuova = (await visiteDi(S, ids.york)).find((v) => !prima.has(v.id)); return !!nuova }, 20000).catch(() => {})
      atteso(nuova, 'visita non salvata su Firestore', {})
      atteso(nuova.services.length === 1 && nuova.services[0].serviceId === 'bagno' && nuova.services[0].price === 25, 'riga su Firestore', nuova.services)
      // scheda: segnaposto del prezzo personale
      await page.goto(`${APP}/animali/${ids.york}`)
      await page.getByRole('button', { name: 'Modifica', exact: true }).first().click()
      await page.getByRole('button', { name: /Prezzi personalizzati/ }).first().click()
      const input = page.locator('#prezzo-bagno')
      await input.waitFor({ timeout: 15000 })
      const ph = await input.getAttribute('placeholder')
      const phT = await page.locator('#prezzo-taglio').getAttribute('placeholder')
      await input.scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(SHOTS, 'l1-scheda-segnaposto.png') })
      atteso(ph === '25', 'segnaposto Bagno nella scheda', { ph, phT })
      atteso(phT === '30', 'segnaposto Taglio nella scheda (taglia)', { phT })
      atteso(m.ok, 'misura chip', m.out)
      return `chip «${b.label}», totale «${tot.trim()}»; Firestore ${nuova.id}: Bagno ${nuova.services[0].price}; scheda: segnaposto Bagno ${ph}, Taglio ${phT}; settings.priceSheet assente || ${sintesi(m)}`
    })

    await caso('L2 Gestione listino: Bagno dello Yorkshire → Taglio / tosatura, altra razza salvata, abbinamento rimasto; Taglio 25, Bagno 20', async () => {
      await page.goto(`${APP}/listino/gestione`)
      let dialog = await apriRazza(page, 'Taglia piccola', 'Yorkshire')
      const abb = dialog.getByRole('button', { name: /^In agenda: Bagno$/ })
      await abb.first().waitFor({ timeout: 15000 })
      const mRiga = await misura(page, 'l2-riga-abbinamento', [['riga abbinamento', abb]])
      await abb.first().click()
      const gruppo = dialog.getByRole('group', { name: /servizio/i })
      const mScelte = await misura(page, 'l2-scelte-servizio', [['scelte', dialog.getByRole('button', { name: 'Taglio / tosatura', exact: true })]])
      await dialog.getByRole('button', { name: 'Taglio / tosatura', exact: true }).click()
      await page.waitForTimeout(400)
      await dialog.getByRole('button', { name: 'Salva', exact: true }).click()
      await aspetta(async () => { const y = yorkDi(await settingsDi(S)); return y && y.voci.find((v) => v.nome === 'Bagno').servizioId === 'taglio' }, 20000).catch(() => {})
      const y1 = yorkDi(await settingsDi(S))
      atteso(y1 && y1.voci.find((v) => v.nome === 'Bagno').servizioId === 'taglio', 'abbinamento non salvato', y1)
      // un'altra razza: Beagle a 41
      dialog = await apriRazza(page, 'Taglia media', 'Beagle')
      const campi = dialog.getByRole('textbox')
      const nc = await campi.count(); let fatto = false
      for (let i = 0; i < nc; i++) {
        const al = (await campi.nth(i).getAttribute('aria-label')) || ''
        if (al.startsWith('Prezzo')) { await campi.nth(i).fill('41'); fatto = true; break }
      }
      atteso(fatto, 'campo prezzo del Beagle non trovato', {})
      await dialog.getByRole('button', { name: 'Salva', exact: true }).click()
      await aspetta(async () => { const s = await settingsDi(S); const b = s.priceSheet.razze.find((r) => r.nome.startsWith('Beagle')); return b && b.voci.some((v) => v.prezzo === 41) }, 20000).catch(() => {})
      const s2 = await settingsDi(S)
      const beagle = s2.priceSheet.razze.find((r) => r.nome.startsWith('Beagle'))
      const y2 = yorkDi(s2)
      atteso(beagle.voci.some((v) => v.prezzo === 41), 'Beagle non salvato', beagle)
      atteso(y2.voci.find((v) => v.nome === 'Bagno').servizioId === 'taglio', 'abbinamento perso dopo il salvataggio di un\'altra razza', y2.voci)
      // riapertura
      await page.reload()
      dialog = await apriRazza(page, 'Taglia piccola', 'Yorkshire')
      const riaperto = await dialog.getByRole('button', { name: /^In agenda: Taglio \/ tosatura$/ }).count()
      await page.screenshot({ path: path.join(SHOTS, 'l2-riaperto.png') })
      atteso(riaperto === 1, 'riaperto: la riga non mostra «In agenda: Taglio / tosatura»', { riaperto })
      await page.keyboard.press('Escape')
      // appuntamento
      await nuovo(page, ids.york, ['taglio'], giorno(4))
      const tg = await chip(page, 'Taglio / tosatura'); const bg = await chip(page, 'Bagno')
      const m = await misura(page, 'l2-chip-taglio', [['chip Taglio', tg.el], ['chip Bagno', bg.el]])
      atteso(tg.prezzo === 25 && tg.listino === 'dal listino Yorkshire', 'chip Taglio', tg.label)
      atteso(bg.prezzo === 20 && bg.listino === '', 'chip Bagno', bg.label)
      const prima = new Set((await visiteDi(S, ids.york)).map((v) => v.id))
      await salvaModulo(page)
      await aspetta(async () => { visitaTaglio = (await visiteDi(S, ids.york)).find((v) => !prima.has(v.id)); return !!visitaTaglio }, 20000).catch(() => {})
      atteso(visitaTaglio && visitaTaglio.services[0].serviceId === 'taglio' && visitaTaglio.services[0].price === 25, 'visita con Taglio su Firestore', visitaTaglio && visitaTaglio.services)
      atteso(mRiga.ok && mScelte.ok && m.ok, 'misure', { r: mRiga.out, s: mScelte.out, m: m.out })
      void gruppo
      return `Firestore Yorkshire/Bagno servizioId=taglio dopo il salvataggio del Beagle (41); riaperto «In agenda: Taglio / tosatura»; chip «${tg.label}» e «${bg.label}»; visita ${visitaTaglio.id} Taglio ${visitaTaglio.services[0].price} || ${sintesi(mRiga)} || ${sintesi(mScelte)} || ${sintesi(m)}`
    })

    await caso('L3 «Aggiorna prezzi» +10% → Taglio proposto col nuovo prezzo; la visita salvata prima resta a 25 dopo Modifica + Salva', async () => {
      atteso(visitaTaglio, 'manca la visita di L2', {})
      await page.goto(`${APP}/listino/prezzi`)
      await page.getByRole('button', { name: '+10%', exact: true }).click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: 'Salva', exact: true }).click()
      await aspetta(async () => { const y = yorkDi(await settingsDi(S)); return y && y.voci.find((v) => v.nome === 'Bagno').prezzo !== 25 }, 20000).catch(() => {})
      const y = yorkDi(await settingsDi(S))
      const bagnoRiga = y.voci.find((v) => v.nome === 'Bagno')
      atteso(bagnoRiga.prezzo > 25 && bagnoRiga.servizioId === 'taglio', 'listino dopo +10%', bagnoRiga)
      await nuovo(page, ids.york, ['taglio'], giorno(5))
      const tg = await chip(page, 'Taglio / tosatura')
      atteso(tg.prezzo === bagnoRiga.prezzo && tg.listino === 'dal listino Yorkshire', 'nuovo prezzo proposto', { label: tg.label, atteso: bagnoRiga.prezzo })
      await page.screenshot({ path: path.join(SHOTS, 'l3-nuovo-prezzo.png') })
      // visita salvata prima: apri, Modifica, Salva
      const ref = db.doc(`salons/${S}/appointments/${visitaTaglio.id}`)
      const u0 = (await ref.get()).get('updatedAt')
      await page.goto(`${APP}/appuntamenti/${visitaTaglio.id}`)
      await page.getByRole('button', { name: 'Modifica appuntamento' }).click()
      const tgE = await chip(page, 'Taglio / tosatura')
      await page.screenshot({ path: path.join(SHOTS, 'l3-visita-esistente-modulo.png') })
      await salvaModulo(page)
      await aspetta(async () => (await ref.get()).get('updatedAt') !== u0, 12000).catch(() => {})
      const d = (await ref.get()).data()
      atteso(tgE.prezzo === 25, 'il modulo della visita salvata propone il nuovo prezzo', tgE.label)
      atteso(d.services[0].price === 25, 'visita salvata prima: prezzo cambiato su Firestore', d.services)
      return `listino Yorkshire/Bagno ${bagnoRiga.prezzo} (servizioId ${bagnoRiga.servizioId}); nuovo: «${tg.label}»; visita ${visitaTaglio.id}: modulo «${tgE.label}», Firestore ${d.services[0].price} (updatedAt ${u0 === d.updatedAt ? 'invariato: nessuna scrittura' : 'aggiornato'})`
    })

    await caso('L4 «Nessun servizio» sulla riga → Taglio 30 e Bagno 20 dalla taglia, senza «dal listino»', async () => {
      await page.goto(`${APP}/listino/gestione`)
      const dialog = await apriRazza(page, 'Taglia piccola', 'Yorkshire')
      await dialog.getByRole('button', { name: /^In agenda: Taglio \/ tosatura$/ }).click()
      await dialog.getByRole('button', { name: 'Nessun servizio', exact: true }).click()
      await page.waitForTimeout(400)
      await dialog.getByRole('button', { name: 'Salva', exact: true }).click()
      await aspetta(async () => yorkDi(await settingsDi(S)).voci.find((v) => v.nome === 'Bagno').servizioId === '', 20000).catch(() => {})
      const y = yorkDi(await settingsDi(S))
      atteso(y.voci.find((v) => v.nome === 'Bagno').servizioId === '', 'servizioId vuoto non salvato', y.voci)
      await nuovo(page, ids.york, ['taglio', 'bagno'], giorno(6))
      const tg = await chip(page, 'Taglio / tosatura'); const bg = await chip(page, 'Bagno')
      await page.screenshot({ path: path.join(SHOTS, 'l4-nessun-servizio.png') })
      atteso(tg.prezzo === 30 && tg.listino === '' && bg.prezzo === 20 && bg.listino === '', 'prezzi dopo «Nessun servizio»', { tg: tg.label, bg: bg.label })
      return `Firestore servizioId=''; «${tg.label}», «${bg.label}»`
    })

    await caso('M1 Mensili: completata, fissato oltre soglia e un altro dopo → «Fissato in ritardo · <data>»', async () => {
      await page.goto(`${APP}/mensili`)
      await page.waitForTimeout(3500)
      const riga = page.getByText(etichettaRitardo, { exact: true })
      await riga.first().waitFor({ timeout: 20000 }).catch(() => {})
      const n = await riga.count()
      const testoRiga = n ? await riga.first().evaluate((el) => { let r = el; for (let i = 0; i < 5 && r.parentElement; i++) { r = r.parentElement; if (r.innerText.includes('Mina Mensile')) break } return r.innerText.replace(/\s+/g, ' ').trim() }) : ''
      const m = n ? await misura(page, 'm1-mensili', [['etichetta', riga]]) : { ok: false, out: {} }
      atteso(n === 1 && /Mina Mensile/.test(testoRiga), `«${etichettaRitardo}» non trovato`, { n, testoRiga, body: (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 800) })
      atteso(m.ok, 'misura', m.out)
      return `date ${dayKey(mDone)} / ${dayKey(mBook1)} / ${dayKey(mBook2)} (${AUDIT ? 'quelle dell\'audit' : 'spostate rispetto a oggi'}); riga «${testoRiga.slice(0, 120)}» || ${sintesi(m)}`
    })

    await caso('T1 tag nei dati: nessun «ipoallergenico» in elenco e scheda; dopo Modifica + Salva il documento non ha `tags`', async () => {
      await page.goto(`${APP}/animali`)
      await page.getByText('Tito Tag').first().waitFor({ timeout: 20000 })
      await page.waitForTimeout(800)
      const elenco = (await page.innerText('body')).toLowerCase()
      await page.screenshot({ path: path.join(SHOTS, 't1-elenco.png') })
      // ricerca per tag
      const cerca = page.getByRole('searchbox').or(page.getByLabel(/cerca/i)).first()
      let trovatiPerTag = null
      if (await cerca.count()) {
        await cerca.fill('ipoallergenico'); await page.waitForTimeout(800)
        trovatiPerTag = await page.getByText('Tito Tag').count()
        await cerca.fill('')
      }
      await page.goto(`${APP}/animali/${ids.tag}`)
      await page.getByText('Tito Tag').first().waitFor({ timeout: 20000 })
      await page.waitForTimeout(800)
      const scheda = (await page.innerText('body')).toLowerCase()
      await page.screenshot({ path: path.join(SHOTS, 't1-scheda.png'), fullPage: true })
      const ref = db.doc(`salons/${S}/dogs/${ids.tag}`)
      const prima = (await ref.get()).data()
      await page.getByRole('button', { name: 'Modifica', exact: true }).first().click()
      const modulo = (await page.innerText('body')).toLowerCase()
      const nome = page.getByLabel('Nome', { exact: true })
      await nome.fill('Tito Tag Due')
      await page.getByRole('button', { name: 'Salva', exact: true }).last().click()
      await aspetta(async () => (await ref.get()).get('name') === 'Tito Tag Due', 20000).catch(() => {})
      const dopo = (await ref.get()).data()
      atteso(Array.isArray(prima.tags) && prima.tags[0] === 'ipoallergenico', 'seme senza tags', prima.tags)
      atteso(!elenco.includes('ipoallergenico'), 'tag visibile nell\'elenco', {})
      atteso(!scheda.includes('ipoallergenico'), 'tag visibile nella scheda', {})
      atteso(!modulo.includes('ipoallergenico'), 'tag visibile nel modulo di modifica', {})
      atteso(trovatiPerTag === null || trovatiPerTag === 0, 'la ricerca trova il cane per tag', { trovatiPerTag })
      atteso(dopo.name === 'Tito Tag Due', 'salvataggio non avvenuto', { name: dopo.name })
      atteso(!('tags' in dopo), 'il documento ha ancora `tags` dopo il salvataggio', { tags: dopo.tags })
      return `elenco/scheda/modulo senza «ipoallergenico»; ricerca «ipoallergenico» → ${trovatiPerTag === null ? 'campo di ricerca non trovato' : trovatiPerTag + ' risultati'}; documento prima tags=${JSON.stringify(prima.tags)}, dopo il salvataggio campo assente`
    })

    await caso('S1 Servizi e durate a 320/360/390: nomi interi, durata · prezzo sotto il nome', async () => {
      await page.goto(`${APP}/impostazioni/servizi`)
      await page.getByTestId('srv-nome').first().waitFor({ timeout: 20000 })
      await page.waitForTimeout(800)
      const out = {}; let ok = true; lunghiTagliati.length = 0
      for (const v of LARGHEZZE) {
        await page.setViewportSize(v); await page.waitForTimeout(600)
        const r = await page.evaluate(() => {
          const nomi = [...document.querySelectorAll('[data-testid=srv-nome]')]
          return nomi.map((n) => {
            const meta = n.parentElement.querySelector('[data-testid=srv-meta]')
            const rn = n.getBoundingClientRect(); const rm = meta.getBoundingClientRect()
            const spezzate = []
            const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT)
            for (let t = walker.nextNode(); t; t = walker.nextNode()) {
              const re = /\S+/g; let m
              while ((m = re.exec(t.data))) {
                const range = document.createRange(); range.setStart(t, m.index); range.setEnd(t, m.index + m[0].length)
                const rr = [...range.getClientRects()].filter((x) => x.width > 0)
                const tops = new Set(rr.map((x) => Math.round(x.top)))
                const fuori = rr.some((x) => x.right > rn.right + 0.5 || x.bottom > rn.bottom + 0.5)
                if (tops.size > 1 || fuori) spezzate.push(m[0])
              }
            }
            return { nome: n.innerText.trim(), meta: meta.innerText.trim(), larghezza: Math.round(rn.width), righe: Math.round(rn.height / 17.5), tagliato: n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1, sotto: rm.top >= rn.bottom - 1, spezzate }
          })
        })
        const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
        await page.screenshot({ path: path.join(SHOTS, `s1-servizi-${v.width}.png`), fullPage: true })
        const okv = pagina.sw <= pagina.iw && r.length === SERVIZI.length && r.filter((x) => x.nome !== LUNGO).every((x) => !x.tagliato && x.sotto && x.spezzate.length === 0 && x.nome.length > 1)
        const lungo = r.find((x) => x.nome === LUNGO)
        if (lungo && (lungo.tagliato || lungo.spezzate.length)) lunghiTagliati.push(`${v.width}px: «${LUNGO}» ${lungo.righe} righe, tagliato (parole fuori: ${lungo.spezzate.join(', ')})`)
        if (!okv) ok = false
        out[`${v.width}px`] = { pagina, righe: r }
      }
      await page.setViewportSize({ width: 390, height: 844 })
      atteso(ok, 'riga servizio', out)
      return (lunghiTagliati.length ? `NOTA (M5 noto, non bloccante per S1): ${lunghiTagliati.join('; ')} || ` : '') + Object.entries(out).map(([k, v]) => `${k}: pagina ${v.pagina.sw}/${v.pagina.iw}; ` + v.righe.map((x) => `«${x.nome}» ${x.larghezza}px/${x.righe}r → «${x.meta}»`).join(', ')).join(' | ')
    })

    await caso('H1 Header a 320/360/390: titolo, sottotitolo e pulsanti senza sovrapposizioni (Animali, Report incassi, Servizi e durate; Utenti se raggiungibile)', async () => {
      const pagine = [['animali', '/animali'], ['report', '/incassi/report'], ['servizi', '/impostazioni/servizi'], ['utenti', '/impostazioni/utenti']]
      const righe = []; let ok = true; const saltate = []
      for (const [nome, url] of pagine) {
        await page.goto(`${APP}${url}`)
        await page.waitForTimeout(2500)
        const qui = new URL(page.url()).pathname
        if (qui !== url) { saltate.push(`${nome} (→ ${qui})`); continue }
        for (const v of LARGHEZZE) {
          await page.setViewportSize(v); await page.waitForTimeout(600)
          const r = await page.evaluate(() => {
            const h1 = document.querySelector('header h1')
            if (!h1) return { assente: true }
            const header = h1.closest('header')
            const riga = h1.parentElement.parentElement
            const sub = header.querySelector(':scope > small')
            const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom } }
            const pezzi = [['titolo', h1]]
            if (sub) pezzi.push(['sottotitolo', sub])
            for (const c of riga.children) if (c !== h1.parentElement) pezzi.push([c.getAttribute('aria-label') || c.innerText.trim() || c.tagName, c])
            const bx = pezzi.map(([n, el]) => [n, box(el)])
            // il titolo conta per la larghezza del testo, non del contenitore
            const rg = document.createRange(); rg.selectNodeContents(h1); const tb = rg.getBoundingClientRect(); bx[0][1] = { l: tb.left, t: tb.top, r: tb.right, b: tb.bottom }
            if (sub) { const rs = document.createRange(); rs.selectNodeContents(sub); const sb = rs.getBoundingClientRect(); bx[1][1] = { l: sb.left, t: sb.top, r: sb.right, b: sb.bottom } }
            const sovr = []
            for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
              const a = bx[i][1]; const b = bx[j][1]
              if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) sovr.push(`${bx[i][0]}×${bx[j][0]}`)
            }
            const fuori = bx.filter(([, b]) => b.l < -0.5 || b.r > window.innerWidth + 0.5).map(([n]) => n)
            return { pezzi: bx.map(([n, b]) => `${n}[${Math.round(b.l)},${Math.round(b.t)},${Math.round(b.r)},${Math.round(b.b)}]`), sovr, fuori, h1ok: h1.scrollWidth <= h1.clientWidth, sottotitolo: sub ? sub.innerText : null, pagina: { sw: document.documentElement.scrollWidth, iw: window.innerWidth } }
          })
          await page.screenshot({ path: path.join(SHOTS, `h1-${nome}-${v.width}.png`) })
          const okv = !r.assente && r.sovr.length === 0 && r.fuori.length === 0 && r.h1ok && r.pagina.sw <= r.pagina.iw && r.sottotitolo
          if (!okv) ok = false
          righe.push({ ...r, nomePagina: nome, larghezza: v.width, ok: okv })
        }
      }
      await page.setViewportSize({ width: 390, height: 844 })
      atteso(ok, 'header', righe.filter((x) => !x.ok))
      return righe.map((x) => `${x.nomePagina}@${x.larghezza}: ${x.pezzi.join(' ')} pagina ${x.pagina.sw}/${x.pagina.iw}`).join(' | ') + (saltate.length ? ` || saltate: ${saltate.join(', ')} (UsersPage solo per l'operatore)` : '')
    })
    await t.ctx.close()

    // ——— collaboratore ———
    await new Promise((r) => setTimeout(r, 2500))
    const prima = stabile(await settingsDi(S))
    const c = await apri(browser, ugo)
    const cp = c.page
    await caso('C1 collaboratore chiude la visita di un cane con premio in attesa: niente errore, settings/main identico, nessun «Elimina»; Home senza compleanno né Cestino', async () => {
      // Home
      await cp.goto(`${APP}/`)
      await cp.waitForTimeout(5000)
      const home = await cp.innerText('body')
      const compleanno = /È il compleanno di/.test(home)
      const cestini = await cp.getByRole('button', { name: 'Cestino', exact: true }).count()
      const si = await cp.getByRole('button', { name: 'Sì', exact: true }).count()
      const promemoria = await cp.getByText('Dino Domani').count()
      await cp.screenshot({ path: path.join(SHOTS, 'c1-home-collaboratore.png'), fullPage: true })
      // chiusura
      await cp.goto(`${APP}/appuntamenti/${ids.vPremio}`)
      const altreAzioniAperta = cp.getByRole('button', { name: 'Altre azioni' })
      await cp.getByRole('button', { name: 'Completato', exact: true }).waitFor({ timeout: 20000 })
      const menuSuProgrammata = await altreAzioniAperta.count()
      await cp.getByRole('button', { name: 'Completato', exact: true }).click()
      const dlg = cp.getByRole('dialog', { name: 'Completare' })
      await dlg.waitFor({ timeout: 10000 })
      await dlg.getByRole('button', { name: /Contanti/ }).click()
      await dlg.getByRole('button', { name: 'Salva e completa', exact: true }).click()
      const ref = db.doc(`salons/${S}/appointments/${ids.vPremio}`)
      await aspetta(async () => (await ref.get()).get('status') === 'completato', 20000).catch(() => {})
      await cp.waitForTimeout(3000)
      const v = (await ref.get()).data()
      const pronto = await cp.getByRole('dialog').count()
      await cp.screenshot({ path: path.join(SHOTS, 'c1-dopo-chiusura.png') })
      const menuSuCompletata = await cp.getByRole('button', { name: 'Altre azioni' }).count()
      // disdetta: il menu c'è (Rimetti in programma) ma senza Elimina
      await cp.goto(`${APP}/appuntamenti/${ids.vDisdetta}`)
      await cp.getByRole('button', { name: 'Altre azioni' }).click()
      const menu = cp.getByRole('dialog', { name: 'Altre azioni' })
      await menu.waitFor({ timeout: 10000 })
      const voci = (await menu.getByRole('button').allInnerTexts()).map((s) => s.trim())
      const mm = await misura(cp, 'c1-menu-disdetta', [['menu', menu]])
      await cp.keyboard.press('Escape')
      await cp.waitForTimeout(1500)
      const toastKo = c.conta.n
      await c.ctx.close()
      await new Promise((r) => setTimeout(r, 2000))
      const dopo = stabile(await settingsDi(S))
      const uguali = JSON.stringify(prima) === JSON.stringify(dopo)
      const diff = uguali ? [] : [...new Set([...Object.keys(prima), ...Object.keys(dopo)])].filter((k) => JSON.stringify(prima[k]) !== JSON.stringify(dopo[k]))
      atteso(!compleanno && si === 0, 'Home del collaboratore con la riga del compleanno', { compleanno, si })
      atteso(cestini === 0, 'Home del collaboratore con un Cestino', { cestini })
      atteso(v.status === 'completato' && (v.total === undefined || v.total === null || v.total === 20) && !v.adjustmentNote, 'visita chiusa (premio non applicato: totale = prezzo, nessuna nota premio)', { status: v.status, total: v.total, nota: v.adjustmentNote })
      atteso(toastKo === 0, '«Salvataggio non riuscito» mostrato', { toastKo })
      atteso(uguali, 'settings/main cambiato', diff)
      atteso(prima.premiInAttesa && prima.premiInAttesa[ids.premio] === true && dopo.premiInAttesa[ids.premio] === true, 'premio in attesa consumato', dopo.premiInAttesa)
      atteso(!voci.includes('Elimina'), '«Elimina» nel menu del collaboratore', voci)
      atteso(menuSuProgrammata === 0 && menuSuCompletata === 0, '«Altre azioni» su programmata/completata del collaboratore (menu vuoto)', { menuSuProgrammata, menuSuCompletata })
      atteso(mm.ok, 'misura menu', mm.out)
      return `Home: compleanno ${compleanno ? 'SÌ' : 'no'}, «Sì» ${si}, Cestino ${cestini}, promemoria Dino ${promemoria ? 'visibile' : 'non visibile'}; chiusura: status ${v.status}, total ${v.total === undefined ? 'assente (= prezzo proposto 20)' : v.total}, nota ${v.adjustmentNote || 'nessuna'} (premio non applicato), dialoghi dopo la chiusura ${pronto}, toast KO ${toastKo}; settings/main identico (${Object.keys(prima).length} campi), premiInAttesa[${ids.premio}] ancora true; «Altre azioni» assente su programmata e completata; disdetta: voci ${JSON.stringify(voci)} || ${sintesi(mm)}`
    })

    // controllo: il titolare vede la riga del compleanno (le righe esistono davvero)
    await caso('C1b controllo: il titolare vede «È il compleanno di Bea Compleanno» con «Sì» e Cestino', async () => {
      const t2 = await apri(browser, host)
      await t2.page.goto(`${APP}/`)
      await t2.page.getByText(/È il compleanno di Bea Compleanno/).first().waitFor({ timeout: 25000 }).catch(() => {})
      const n = await t2.page.getByText(/È il compleanno di Bea Compleanno/).count()
      const cestini = await t2.page.getByRole('button', { name: 'Cestino', exact: true }).count()
      await t2.page.screenshot({ path: path.join(SHOTS, 'c1b-home-titolare.png'), fullPage: true })
      await t2.ctx.close()
      atteso(n === 1 && cestini >= 1, 'righe della coda assenti anche per il titolare', { n, cestini })
      return `riga compleanno presente, Cestino ${cestini}`
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
  console.log(JSON.stringify({ stamp: STAMP, mensili: [dayKey(mDone), dayKey(mBook1), dayKey(mBook2)], esiti, errori, toastFalliti }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
