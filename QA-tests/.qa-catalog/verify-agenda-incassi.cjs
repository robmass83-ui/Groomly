// Verifica medie «Agenda e incassi», audit 18-22 (solo emulatore demo-groomly; Task 6 del piano 2026-11-03-medie-agenda-incassi).
// App Vite in modo emu su 127.0.0.1:5173. Account e salone nuovi a ogni giro (firebase-admin), visite scritte nel formato di appointmentToDoc.
// Misure a 320, 360 e 390 px (scrollWidth <= clientWidth, nessuno scorrimento orizzontale della pagina), screenshot in QA-tests/results/agenda-incassi/.
// A1 visita 19:00 → 00:25: Giorno del giorno 1 col blocco fino in fondo alla griglia (24:00), Giorno del giorno 2 col pezzo 00:00-00:25 che apre la
//    stessa visita, intestazione del giorno 2 senza la visita; Settimana: la visita compare nel giorno 1 (elenco per giorno d'inizio, decisione della spec).
// A2 titolare › «Rimetti in programma» su una completata → documento con status programmato e senza total/paymentMethod/actualDurationMin/chiusoIl/adjustmentNote.
// A3 collaboratore › «Rimetti in programma» su una disdetta → programmato senza cancelReason; su una completata la voce non c'è; nessun filtro persona.
// A4 titolare › Salone con due collaboratori: iniziali sui blocchi (Giorno, Settimana, pezzo del giorno 2), chip del filtro in Calendario e Incassi,
//    la scelta filtra visite e totale di Incassi e resta dopo una ricarica.
// A5 titolare › Statistiche: tre schede con «€», «Previsione del mese» col mese in corso; con «Nascondi importi» «•••» e nessuna cifra in euro.
// A6 titolare › grafico Incassi: fumetto sulla prima, una centrale e l'ultima barra dentro l'area del grafico, parole intere, totale non coperto, importo intero.
// Uso: node QA-tests/.qa-catalog/verify-agenda-incassi.cjs [--keep]
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
const SHOTS = path.resolve('QA-tests/results/agenda-incassi')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const SALONE = { piano: 'salone', stato: 'attivo', fonte: 'omaggio', seatsIncluded: 3, seatsExtra: 3, seats: 6, enabled: true, provaUsata: true, updatedAt: '2026-10-01T00:00:00.000Z' }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 21, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 33, media: 35, grande: 45 } },
]
const CAMPI_CHIUSURA = ['total', 'paymentMethod', 'actualDurationMin', 'chiusoIl', 'adjustmentNote']

const creati = []
const em = (nome) => `qa-ai-${nome}-${STAMP}@test.groomly`
async function utente(nome, { cognome = 'QA', salone, pro = null } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', firstName: nome, lastName: cognome, createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = salone ?? `Salone di ${nome}`
  await db.doc(`salons/${u.uid}/settings/main`).set({
    business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, orari: ORARI,
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
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
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 1500) })
  }
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }

// ——— date (ora locale, come il browser) ———
const DAY = 86400000
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lunedi = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7))
const adesso = new Date()
const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())
let giorno1 = addDays(oggi, 2); if (giorno1.getDay() === 0) giorno1 = addDays(giorno1, 1) // il giorno 2 resta nella stessa settimana
const giorno2 = addDays(giorno1, 1)
const giornoDisdetta = addDays(giorno2, 2) // lontano dai giorni 1 e 2, così le loro intestazioni contano solo la visita della notte
const settPrec = addDays(lunedi(oggi), -7)
const settCorr = lunedi(oggi)
const meseIt = (() => { const s = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(adesso); return s.charAt(0).toUpperCase() + s.slice(1) })()
const numero = (testo) => Number(String(testo).replace(/[^\d,]/g, '').replace(',', '.'))

// ——— browser ———
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})
async function apri(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
const errori = []
async function misura(page, nome, locatori, { dentro = [] } = {}) {
  const out = {}
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(600)
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      const interna = dentro.includes(etichetta) // contenitore che scorre di proposito dentro sé stesso: conta solo che stia nello schermo
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
const visite = []
async function visita(salonId, v) {
  const now = Date.now()
  const doc = { createdAt: now - 864e6, updatedAt: now - 864e6, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end ? v.end.getTime() : undefined }
  if (v.chiusoIl) doc.chiusoIl = v.chiusoIl.getTime()
  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]
  await db.doc(`salons/${salonId}/appointments/${v.id}`).set(doc)
  visite.push({ ...v })
  return v.id
}
async function cane(salonId, id, name) {
  const now = Date.now()
  await db.doc(`salons/${salonId}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6 })
  return id
}
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

async function semina() {
  const host = await utente('Tina', { cognome: 'Titolare', salone: `Salone Tina AI ${STAMP}`, pro: SALONE })
  for (const s of SERVIZI) await db.doc(`salons/${host.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  const anna = await utente('Anna', { cognome: 'Rossi' }); await aggancia(anna, host.uid)
  const teo = await utente('Teo', { cognome: 'Bianchi' }); await aggancia(teo, host.uid)
  const S = host.uid
  const notte = await cane(S, `qa-ai-notte-${STAMP}`, 'Fido Notte')
  const bobi = await cane(S, `qa-ai-bobi-${STAMP}`, 'Bobi Incassi')
  const luna = await cane(S, `qa-ai-luna-${STAMP}`, 'Luna Riapri')
  const rex = await cane(S, `qa-ai-rex-${STAMP}`, 'Rex Disdetto')
  const ids = {}
  // A1 / A4: 19:00 → 00:25 del giorno dopo, di Anna
  ids.notte = await visita(S, { id: `qa-ai-v-notte-${STAMP}`, dogId: notte, start: at(giorno1, 19), end: at(giorno2, 0, 25), services: [riga('taglio', 'Taglio / tosatura', 325, 90)], status: 'programmato', assigneeUid: anna.uid })
  // A4 / A6: settimana scorsa, completate (Anna lun 40 + gio 120, Teo lun 55 + dom 1234)
  const chiusa = (id, d, h, persona, tot, metodo = 'contanti') => visita(S, { id, dogId: bobi, start: at(d, h), end: at(d, h, 45), services: [riga('bagno', 'Bagno', 45, tot)], status: 'completato', total: tot, paymentMethod: metodo, chiusoIl: at(d, h, 45), actualDurationMin: 45, assigneeUid: persona.uid })
  await chiusa(`qa-ai-v-lun-a-${STAMP}`, settPrec, 10, anna, 40)
  await chiusa(`qa-ai-v-lun-t-${STAMP}`, settPrec, 14, teo, 55, 'pos')
  await chiusa(`qa-ai-v-gio-a-${STAMP}`, addDays(settPrec, 3), 11, anna, 120)
  await chiusa(`qa-ai-v-dom-t-${STAMP}`, addDays(settPrec, 6), 16, teo, 1234, 'pos')
  // A2: completata del titolare da riaprire (assegnata ad Anna), con tutti i campi di chiusura
  const sR = new Date(adesso.getTime() - 26 * 3600000)
  ids.riapri = await visita(S, { id: `qa-ai-v-riapri-${STAMP}`, dogId: luna, start: sR, end: new Date(sR.getTime() + 3600000), services: [riga('bagno', 'Bagno', 30, 21), riga('taglio', 'Taglio / tosatura', 45, 33)], status: 'completato', total: 50, paymentMethod: 'contanti', actualDurationMin: 60, adjustmentNote: 'Nodi', chiusoIl: new Date(sR.getTime() + 3600000), extraNotes: [{ id: 'n1', text: 'nota QA', createdAt: sR.getTime() }], assigneeUid: anna.uid })
  // A3: disdetta di Teo (futura) e completata di Teo
  const sD = at(giornoDisdetta, 10)
  ids.disdetta = await visita(S, { id: `qa-ai-v-disd-${STAMP}`, dogId: rex, start: sD, end: new Date(sD.getTime() + 1800000), services: [riga('bagno', 'Bagno', 30, 21)], status: 'disdetto', cancelReason: 'cliente', assigneeUid: teo.uid })
  const sT = new Date(adesso.getTime() - 50 * 3600000)
  ids.completaTeo = await visita(S, { id: `qa-ai-v-ctdo-${STAMP}`, dogId: rex, start: sT, end: new Date(sT.getTime() + 1800000), services: [riga('bagno', 'Bagno', 30, 21)], status: 'completato', total: 21, paymentMethod: 'contanti', chiusoIl: new Date(sT.getTime() + 1800000), assigneeUid: teo.uid })
  return { host, anna, teo, ids }
}
// totali attesi della settimana scorsa (stessa regola di Incassi: completate con start nel periodo)
function totaliSettPrec(uidFiltro) {
  return visite.filter((v) => v.status === 'completato' && v.start >= settPrec && v.start < settCorr && (!uidFiltro || v.assigneeUid === uidFiltro)).reduce((s, v) => s + v.total, 0)
}

async function blocco(page, nome) { return page.getByRole('grid', { name: 'Orari' }).getByRole('button', { name: `Apri ${nome}`, exact: true }) }
async function vaiGiorno(page, d) {
  await page.goto(`${APP}/calendario?vista=giorno&data=${dayKey(d)}`)
  await page.getByRole('grid', { name: 'Orari' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
}
async function filtro(page) { return page.getByRole('group', { name: 'Filtra per persona' }) }

async function browserCasi() {
  const { chromium } = require('playwright')
  fs.mkdirSync(SHOTS, { recursive: true })
  const { host, anna, teo, ids } = await semina()
  const browser = await chromium.launch()
  try {
    const t = await apri(browser, host)
    const page = t.page

    await caso('A1 visita 19:00 → 00:25: giorno 1 fino in fondo, pezzo 00:00-00:25 il giorno 2, intestazione del giorno 2 senza la visita, Settimana', async () => {
      // giorno 1
      await vaiGiorno(page, giorno1)
      const b1 = await blocco(page, 'Fido Notte')
      await b1.waitFor({ timeout: 20000 })
      const geo1 = await b1.evaluate((n) => {
        const col = n.offsetParent; const r = n.getBoundingClientRect(); const c = col.getBoundingClientRect()
        return { bloccoTop: Math.round(r.top - c.top), bloccoBottom: Math.round(r.bottom - c.top), colonna: Math.round(c.height), testo: n.innerText.replace(/\s+/g, ' ').trim() }
      })
      const griglia = await page.getByRole('grid', { name: 'Orari' }).innerText()
      const fine24 = /(^|\s)24:00(\s|$)/.test(griglia)
      const intest1 = (await page.getByText(/ stimate$/).first().innerText()).trim()
      atteso(Math.abs(geo1.colonna - geo1.bloccoBottom) <= 4, 'il blocco del giorno 1 non arriva in fondo alla griglia', geo1)
      atteso(fine24, 'la griglia del giorno 1 non finisce alle 24:00', griglia.slice(-200))
      atteso(/^1 cane/.test(intest1), 'intestazione del giorno 1', intest1)
      atteso(/19:00/.test(geo1.testo), 'ora del blocco del giorno 1', geo1)
      const m1 = await misura(page, 'a1-giorno1', [['blocco giorno 1', b1]])
      atteso(m1.ok, 'misura giorno 1', m1.out)
      // giorno 2
      await vaiGiorno(page, giorno2)
      const b2 = await blocco(page, 'Fido Notte')
      await b2.waitFor({ timeout: 20000 })
      const geo2 = await b2.evaluate((n) => ({ testo: n.innerText.replace(/\s+/g, ' ').trim(), altezza: Math.round(n.getBoundingClientRect().height) }))
      const intest2 = (await page.getByText(/ stimate$/).first().innerText()).trim()
      atteso(/00:00/.test(geo2.testo), 'il pezzo del giorno 2 non mostra 00:00', geo2)
      atteso(/^0 cani/.test(intest2), 'intestazione del giorno 2 conta la visita', intest2)
      const m2 = await misura(page, 'a1-giorno2', [['pezzo giorno 2', b2]])
      atteso(m2.ok, 'misura giorno 2', m2.out)
      await b2.click()
      await page.waitForURL((u) => u.pathname === `/appuntamenti/${ids.notte}`, { timeout: 15000 })
      await page.getByRole('button', { name: 'Altre azioni' }).waitFor({ timeout: 15000 })
      await page.screenshot({ path: path.join(SHOTS, 'a1-giorno2-apre-visita.png') })
      // Settimana
      await page.goto(`${APP}/calendario?vista=settimana&data=${dayKey(giorno1)}`)
      const reg = page.getByRole('region', { name: 'Settimana' })
      await reg.waitFor({ timeout: 20000 }); await page.waitForTimeout(1500)
      const nelleRighe = reg.getByRole('button', { name: 'Apri Fido Notte', exact: true })
      await nelleRighe.first().waitFor({ timeout: 15000 })
      const n = await nelleRighe.count()
      const giornoRiga = await nelleRighe.first().evaluate((el) => {
        let r = el; while (r && !(r.style && r.style.gridTemplateColumns && r.style.gridTemplateColumns.startsWith('52px'))) r = r.parentElement
        return r ? r.querySelector('button').getAttribute('aria-label') : null
      })
      atteso(n === 1 && giornoRiga && giornoRiga.includes(String(giorno1.getDate())), 'Settimana: visita non nel giorno 1 (o ripetuta)', { n, giornoRiga })
      const m3 = await misura(page, 'a1-settimana', [['visita in Settimana', nelleRighe]])
      atteso(m3.ok, 'misura Settimana', m3.out)
      return `giorno 1 (${dayKey(giorno1)}): blocco «${geo1.testo.slice(0, 60)}» ${geo1.bloccoTop}→${geo1.bloccoBottom} px su colonna ${geo1.colonna} px, griglia fino a 24:00, intestazione «${intest1}»; giorno 2: pezzo «${geo2.testo.slice(0, 60)}» alto ${geo2.altezza} px, intestazione «${intest2}», il tocco apre /appuntamenti/${ids.notte}; Settimana: 1 volta, nella riga «${giornoRiga}» || ${sintesi(m1)} || ${sintesi(m2)} || ${sintesi(m3)}`
    })

    await caso('A4 Salone: iniziali, filtro in Calendario (anche col pezzo del giorno 2), scelta ricordata', async () => {
      await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('groomly.filtroPersona.')) localStorage.removeItem(k) })
      await vaiGiorno(page, giorno1)
      const g = await filtro(page)
      await g.waitFor({ timeout: 20000 })
      const chip = await g.getByRole('button').allInnerTexts()
      atteso(JSON.stringify(chip) === JSON.stringify(['Tutti', 'Anna Rossi', 'Teo Bianchi']), 'chip del filtro', chip)
      const b1 = await blocco(page, 'Fido Notte')
      const ini1 = await b1.getByRole('img', { name: 'Visita di Anna Rossi' }).innerText()
      atteso(ini1 === 'AR', 'iniziali sul blocco del giorno 1', ini1)
      const m = await misura(page, 'a4-calendario-filtro', [['filtro', g], ['blocco con iniziali', b1]], { dentro: ['filtro'] })
      atteso(m.ok, 'misura filtro/blocco', m.out)
      // pezzo del giorno 2 + filtro
      await vaiGiorno(page, giorno2)
      const b2 = await blocco(page, 'Fido Notte')
      await b2.waitFor({ timeout: 15000 })
      const ini2 = await b2.getByRole('img', { name: 'Visita di Anna Rossi' }).innerText()
      atteso(ini2 === 'AR', 'iniziali sul pezzo del giorno 2', ini2)
      await (await filtro(page)).getByRole('button', { name: 'Teo Bianchi', exact: true }).click()
      await page.waitForTimeout(800)
      const conTeo = await (await blocco(page, 'Fido Notte')).count()
      await page.screenshot({ path: path.join(SHOTS, 'a4-giorno2-filtro-teo.png') })
      atteso(conTeo === 0, 'filtro Teo: il pezzo di Anna resta visibile', { conTeo })
      await (await filtro(page)).getByRole('button', { name: 'Anna Rossi', exact: true }).click()
      await page.waitForTimeout(800)
      const conAnna = await (await blocco(page, 'Fido Notte')).count()
      atteso(conAnna === 1, 'filtro Anna: pezzo non visibile', { conAnna })
      // ricarica
      await page.reload(); await page.getByRole('grid', { name: 'Orari' }).waitFor({ timeout: 30000 }); await page.waitForTimeout(2500)
      const premuto = await (await filtro(page)).getByRole('button', { name: 'Anna Rossi', exact: true }).getAttribute('aria-pressed')
      const dopo = await (await blocco(page, 'Fido Notte')).count()
      atteso(premuto === 'true' && dopo === 1, 'scelta non ricordata dopo la ricarica', { premuto, dopo })
      // Settimana: iniziali
      await page.goto(`${APP}/calendario?vista=settimana&data=${dayKey(giorno1)}`)
      const reg = page.getByRole('region', { name: 'Settimana' })
      await reg.waitFor({ timeout: 20000 }); await page.waitForTimeout(1500)
      const vs = reg.getByRole('button', { name: 'Apri Fido Notte', exact: true })
      await vs.first().waitFor({ timeout: 15000 })
      const iniS = await vs.first().getByRole('img', { name: 'Visita di Anna Rossi' }).innerText()
      atteso(iniS === 'AR', 'iniziali in Settimana', iniS)
      const ms = await misura(page, 'a4-settimana-iniziali', [['visita Settimana con iniziali', vs], ['filtro', await filtro(page)]], { dentro: ['filtro'] })
      atteso(ms.ok, 'misura Settimana', ms.out)
      return `chip ${chip.join(' · ')}; «AR» sul blocco del giorno 1, sul pezzo del giorno 2 e in Settimana; giorno 2 con filtro Teo → pezzo nascosto, Anna → visibile; dopo la ricarica «Anna Rossi» resta scelto (aria-pressed=${premuto}) || ${sintesi(m)} || ${sintesi(ms)}`
    })

    await caso('A4b Incassi: filtro persona e totale della settimana, scelta ricordata', async () => {
      await page.goto(`${APP}/incassi?periodo=settimana&data=${dayKey(settPrec)}`)
      const tot = page.getByTestId('earnings-total')
      await tot.waitFor({ timeout: 30000 })
      const g = await filtro(page)
      await g.waitFor({ timeout: 20000 })
      const ereditata = await g.getByRole('button', { name: 'Anna Rossi', exact: true }).getAttribute('aria-pressed')
      const leggi = async (chi) => {
        await (await filtro(page)).getByRole('button', { name: chi, exact: true }).click()
        await page.waitForTimeout(900)
        return numero(await tot.innerText())
      }
      const tutti = await leggi('Tutti'); const sAnna = await leggi('Anna Rossi'); const sTeo = await leggi('Teo Bianchi')
      const att = { tutti: totaliSettPrec(), anna: totaliSettPrec(anna.uid), teo: totaliSettPrec(teo.uid) }
      atteso(tutti === att.tutti && sAnna === att.anna && sTeo === att.teo, 'totali di Incassi col filtro', { letti: { tutti, sAnna, sTeo }, att })
      await page.reload(); await tot.waitFor({ timeout: 30000 }); await page.waitForTimeout(2500)
      const premuto = await (await filtro(page)).getByRole('button', { name: 'Teo Bianchi', exact: true }).getAttribute('aria-pressed')
      const dopo = numero(await tot.innerText())
      atteso(premuto === 'true' && dopo === att.teo, 'scelta non ricordata in Incassi', { premuto, dopo })
      const m = await misura(page, 'a4-incassi-filtro', [['filtro', await filtro(page)], ['totale', tot]], { dentro: ['filtro'] })
      atteso(m.ok, 'misura Incassi', m.out)
      await (await filtro(page)).getByRole('button', { name: 'Tutti', exact: true }).click()
      return `Tutti ${tutti} · Anna ${sAnna} · Teo ${sTeo} (attesi ${att.tutti}/${att.anna}/${att.teo}); scelta del Calendario già applicata entrando (Anna aria-pressed=${ereditata}, stessa chiave per salone); dopo la ricarica Teo resta scelto (${dopo}) || ${sintesi(m)}`
    })

    await caso('A6 grafico Incassi: fumetto su prima, centrale e ultima barra dentro i bordi, parole intere, totale non coperto', async () => {
      await page.goto(`${APP}/incassi?periodo=settimana&data=${dayKey(settPrec)}`)
      const grafico = page.getByRole('group', { name: 'Grafico incassi' })
      await grafico.waitFor({ timeout: 30000 }); await page.waitForTimeout(1200)
      const barre = grafico.locator('button[aria-pressed]')
      const nb = await barre.count()
      atteso(nb === 7, 'barre della settimana', { nb })
      const righe = []
      let ok = true
      for (const v of LARGHEZZE) {
        await page.setViewportSize(v); await page.waitForTimeout(600)
        for (const i of [0, 3, nb - 1]) {
          await barre.nth(i).click(); await page.waitForTimeout(700)
          const etichetta = await barre.nth(i).getAttribute('aria-label')
          const importo = (/: ([\d.]+) euro/.exec(etichetta) || [])[1]
          const r = await page.evaluate(() => {
            const g = document.querySelector('[role=group][aria-label="Grafico incassi"]')
            const tip = g.querySelector('[role=status]')
            const tot = document.querySelector('[data-testid=earnings-total]')
            if (!tip) return { assente: true }
            const gr = g.getBoundingClientRect(); const tr = tip.getBoundingClientRect(); const to = tot.getBoundingClientRect()
            // parole spezzate: ogni parola deve stare su una sola riga
            const spezzate = []
            const walker = document.createTreeWalker(tip, NodeFilter.SHOW_TEXT)
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const re = /\S+/g; let m
              while ((m = re.exec(n.data))) {
                const range = document.createRange(); range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length)
                const tops = new Set([...range.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)))
                if (tops.size > 1) spezzate.push(m[0])
              }
            }
            const interseca = !(tr.right <= to.left || tr.left >= to.right || tr.bottom <= to.top || tr.top >= to.bottom)
            const dentro = tr.left >= gr.left - 0.5 && tr.right <= gr.right + 0.5 && tr.top >= gr.top - 0.5 && tr.bottom <= gr.bottom + 0.5
            return { testo: tip.innerText.replace(/\s+/g, ' ').trim(), dentro, interseca, spezzate, sw: tip.scrollWidth, cw: tip.clientWidth, tip: [Math.round(tr.left - gr.left), Math.round(tr.top - gr.top), Math.round(tr.width), Math.round(tr.height)], area: [Math.round(gr.width), Math.round(gr.height)], righe: Math.round(tr.height / 16) }
          })
          const intero = !importo || importo === '0' ? /nessun incasso/.test(r.testo || '') : ((/€ ([\d.]+)/.exec(r.testo || '') || [])[1] || '').replace(/\./g, '') === importo.replace(/\./g, '')
          const okq = !r.assente && r.dentro && !r.interseca && r.spezzate.length === 0 && r.sw <= r.cw && intero
          if (!okq) ok = false
          righe.push({ larghezza: v.width, barra: i, importo, ...r, intero, ok: okq })
          if (v.width === 320) await page.screenshot({ path: path.join(SHOTS, `a6-fumetto-320-barra${i}.png`) })
        }
      }
      await page.setViewportSize({ width: 390, height: 844 })
      atteso(ok, 'fumetto fuori posto', righe.filter((x) => !x.ok))
      return righe.map((x) => `${x.larghezza}px barra ${x.barra}: «${x.testo}» box ${x.tip.join('/')} in area ${x.area.join('×')}`).join(' | ')
    })

    await caso('A5 Statistiche: tre schede con €, Previsione del mese col mese in corso, Nascondi importi → •••', async () => {
      await page.goto(`${APP}/incassi/statistiche`)
      const sez = page.getByRole('region', { name: 'Statistiche' }).or(page.locator('section[aria-label="Statistiche"]'))
      await sez.first().waitFor({ timeout: 30000 }); await page.waitForTimeout(1500)
      const schede = sez.first().locator(':scope > *')
      const testi = (await schede.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
      atteso(testi.length === 3, 'numero di schede', testi)
      atteso(/^€ all’ora € [\d.,]+ visite completate$/.test(testi[0]), 'scheda € all’ora', testi[0])
      atteso(new RegExp(`^Previsione del mese € [\\d.,]+ ${meseIt}$`).test(testi[1]), 'scheda Previsione del mese', testi[1])
      atteso(/^Clienti in ritardo \d+ oltre il loro ritmo abituale$/.test(testi[2]), 'scheda Clienti in ritardo', testi[2])
      const m = await misura(page, 'a5-statistiche', [['scheda 1', schede.nth(0)], ['scheda 2', schede.nth(1)], ['scheda 3', schede.nth(2)]])
      atteso(m.ok, 'misura Statistiche', m.out)
      // Nascondi importi (da Incassi, come l'utente)
      await page.goto(`${APP}/incassi`)
      await page.getByRole('button', { name: 'Nascondi importi' }).click()
      await page.getByRole('button', { name: 'Mostra importi' }).waitFor({ timeout: 10000 })
      await page.waitForTimeout(1500)
      await page.goto(`${APP}/incassi/statistiche`)
      await sez.first().waitFor({ timeout: 30000 }); await page.waitForTimeout(1500)
      const nascosti = (await schede.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
      const tutto = nascosti.join(' | ')
      const cifreEuro = /€\s?\d|\d\s?€/.test(tutto)
      const punti = (tutto.match(/•••/g) || []).length
      const mh = await misura(page, 'a5-statistiche-nascosti', [['scheda 1', schede.nth(0)], ['scheda 2', schede.nth(1)]])
      // si rimette com'era
      await page.goto(`${APP}/incassi`)
      await page.getByRole('button', { name: 'Mostra importi' }).click()
      await page.waitForTimeout(1200)
      atteso(punti === 2 && !cifreEuro, 'Nascondi importi', nascosti)
      atteso(mh.ok, 'misura con importi nascosti', mh.out)
      return `«${testi.join('» · «')}»; nascosti: «${nascosti.join('» · «')}» (••• ×${punti}, nessuna cifra in euro) || ${sintesi(m)}`
    })

    await caso('A2 titolare › «Rimetti in programma» su una completata: campi di chiusura tolti su Firestore', async () => {
      await page.goto(`${APP}/appuntamenti/${ids.riapri}`)
      await page.getByRole('button', { name: 'Altre azioni' }).click()
      const menu = page.getByRole('dialog', { name: 'Altre azioni' })
      await menu.getByRole('button', { name: 'Rimetti in programma', exact: true }).click()
      const conf = page.getByRole('dialog', { name: 'Rimettere la visita in programma?' })
      await conf.waitFor({ timeout: 10000 })
      const frase = await conf.getByText('L’incasso registrato verrà tolto.', { exact: true }).count()
      const mc = await misura(page, 'a2-conferma-rimetti', [['conferma', conf], ['Tieni', conf.getByRole('button', { name: 'Tieni', exact: true })], ['Rimetti', conf.getByRole('button', { name: 'Rimetti in programma', exact: true })]])
      await conf.getByRole('button', { name: 'Rimetti in programma', exact: true }).click()
      const ref = db.doc(`salons/${host.uid}/appointments/${ids.riapri}`)
      await aspetta(async () => (await ref.get()).get('status') === 'programmato', 25000).catch(() => {})
      await page.waitForTimeout(1500)
      const d = (await ref.get()).data()
      const rimasti = CAMPI_CHIUSURA.filter((k) => k in d)
      await page.screenshot({ path: path.join(SHOTS, 'a2-dopo-rimetti.png') })
      atteso(frase === 1, 'frase sull’incasso assente', {})
      atteso(d.status === 'programmato' && rimasti.length === 0, 'documento dopo «Rimetti in programma»', { status: d.status, rimasti })
      atteso(d.services.length === 2 && d.assigneeUid === anna.uid && d.start === visite.find((v) => v.id === ids.riapri).start.getTime() && Array.isArray(d.extraNotes) && d.extraNotes.length === 1, 'servizi/assegnatario/orario/note cambiati', d)
      atteso(mc.ok, 'misura conferma', mc.out)
      return `conferma con «L’incasso registrato verrà tolto.»; documento: status=${d.status}, nessuno di ${CAMPI_CHIUSURA.join('/')}, servizi ${d.services.length}, assegnatario Anna, orario e note invariati || ${sintesi(mc)}`
    })
    await t.ctx.close()

    // ——— collaboratore ———
    const c = await apri(browser, teo)
    const cp = c.page
    await caso('A3 collaboratore › «Rimetti in programma» su una disdetta (senza cancelReason), voce assente su una completata, nessun filtro', async () => {
      await cp.goto(`${APP}/appuntamenti/${ids.completaTeo}`)
      await cp.getByRole('button', { name: 'Altre azioni' }).click()
      const menu = cp.getByRole('dialog', { name: 'Altre azioni' })
      await menu.waitFor({ timeout: 10000 })
      const suCompletata = await menu.getByRole('button', { name: 'Rimetti in programma', exact: true }).count()
      await cp.screenshot({ path: path.join(SHOTS, 'a3-collaboratore-completata-menu.png') })
      await cp.keyboard.press('Escape')
      await cp.goto(`${APP}/appuntamenti/${ids.disdetta}`)
      await cp.getByRole('button', { name: 'Altre azioni' }).click()
      await menu.getByRole('button', { name: 'Rimetti in programma', exact: true }).click()
      const conf = cp.getByRole('dialog', { name: 'Rimettere la visita in programma?' })
      await conf.waitFor({ timeout: 10000 })
      const frase = await conf.getByText('L’incasso registrato verrà tolto.', { exact: true }).count()
      const mc = await misura(cp, 'a3-conferma-disdetta', [['conferma', conf]])
      await conf.getByRole('button', { name: 'Rimetti in programma', exact: true }).click()
      const ref = db.doc(`salons/${host.uid}/appointments/${ids.disdetta}`)
      await aspetta(async () => (await ref.get()).get('status') === 'programmato', 25000).catch(() => {})
      await cp.waitForTimeout(1500)
      const d = (await ref.get()).data()
      const toast = await cp.getByText(/non salvat|Salvataggio/i).count()
      await cp.screenshot({ path: path.join(SHOTS, 'a3-dopo-rimetti-disdetta.png') })
      // Calendario del collaboratore: nessun filtro; iniziali (M3, solo annotate)
      await cp.goto(`${APP}/calendario?vista=giorno&data=${dayKey(giornoDisdetta)}`)
      await cp.getByRole('grid', { name: 'Orari' }).waitFor({ timeout: 30000 }); await cp.waitForTimeout(2500)
      const filtri = await cp.getByRole('group', { name: 'Filtra per persona' }).count()
      const iniziali = await cp.getByRole('img', { name: 'Visita di Teo Bianchi' }).count()
      await cp.screenshot({ path: path.join(SHOTS, 'a3-calendario-collaboratore.png') })
      atteso(suCompletata === 0, 'voce «Rimetti in programma» visibile al collaboratore su una completata', {})
      atteso(frase === 0, 'frase sull’incasso su una disdetta', {})
      atteso(d.status === 'programmato' && !('cancelReason' in d), 'documento disdetta dopo «Rimetti»', { status: d.status, cancelReason: d.cancelReason, toast })
      atteso(filtri === 0, 'filtro persona visibile al collaboratore', {})
      atteso(mc.ok, 'misura conferma', mc.out)
      caso.m3 = iniziali
      return `completata: voce assente; disdetta: conferma senza frase sull’incasso → status=${d.status}, cancelReason assente (regole Firestore ok); Calendario: nessun filtro; iniziali «Visita di Teo Bianchi» sul blocco: ${iniziali ? 'presenti' : 'ASSENTI (M3: il collaboratore non legge il roster)'} || ${sintesi(mc)}`
    })
    await c.ctx.close()
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
  console.log(JSON.stringify({ stamp: STAMP, giorno1: dayKey(giorno1), settimanaIncassi: dayKey(settPrec), esiti, errori }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
