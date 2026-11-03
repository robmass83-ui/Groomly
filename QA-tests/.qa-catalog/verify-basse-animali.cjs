// Verifica nel browser delle basse «Animali e mensili» (ramo claude/basse-animali-3be20b; Task 5 del piano 2026-11-03-basse-animali).
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite di questo ramo in modo emu su 127.0.0.1:5183.
// Account e saloni nuovi a ogni giro (firebase-admin, email animali-*, legacy: false), cancellati alla fine salvo --keep.
// M1 Mensili: due «Pippo» mensili con razze diverse → riga razza · cognome sotto il nome (anche tra i Fissati);
//    Sole con visite nel mese corrente (19) e il 1 del mese dopo → il mese dopo la mostra tra i Fissati con 1/1, il mese corrente col 19.
// D1 Deceduto senza visite future → dialogo; Annulla lascia status attivo, Conferma → deceduto.
// C1 «Rendi principale» sul figlio + Salva → contact = figlio senza email, contacts con il padre non principale; a 320 px la riga si legge.
// S1 Sesso «Non indicato» + Salva → campo sex assente su Firestore.
// O1 Ordina: spunta sulla scelta attiva, ricordata dopo la ricarica.
// P1 Prezzo e durata svuotati → hiddenServiceIds senza il servizio, nessuna riga «—»; al secondo Modifica l'interruttore è spento e resta fuori.
// F1 «Mensile · ogni 6 settimane»; A1 «Anziano» una volta sola nella testata. N1: nessuno scorrimento orizzontale nelle righe toccate.
// Larghezze 320/360/390 px; screenshot in QA-tests/results/basse-animali/.
// Uso: node QA-tests/.qa-catalog/verify-basse-animali.cjs [--keep] [--solo=M1,C1]
const path = require('path'); const fs = require('fs')
// firebase-admin dalle functions di questa cartella; in un worktree senza node_modules, da quelle del checkout principale (solo lettura).
const FUNZIONI = [path.resolve('functions'), path.resolve(__dirname, '../../../../../functions')].find((d) => fs.existsSync(path.join(d, 'node_modules/firebase-admin'))) || path.resolve('functions')
const req = require('module').createRequire(path.join(FUNZIONI, 'package.json'))
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
const APP = 'http://127.0.0.1:5183'
const SHOTS = path.resolve('QA-tests/results/basse-animali')
const LARGHEZZE = [{ width: 320, height: 720 }, { width: 360, height: 800 }, { width: 390, height: 844 }]
const GO = { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true }
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 60, media: 60, grande: 60 }, price: { piccola: 28, media: 28, grande: 28 } },
  { id: 'tosatura', order: 1, name: 'Tosatura completa', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 120, media: 120, grande: 120 }, price: { piccola: 50, media: 50, grande: 50 } },
]

const creati = []
const em = (nome) => `animali-${nome}-${STAMP}@test.groomly`
async function utente(nome, { emailInScheda } = {}) {
  const email = em(nome.toLowerCase())
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  await db.doc(`accounts/${u.uid}`).set({ uid: u.uid, email, salonId: u.uid, role: 'titolare', legacy: false, firstName: nome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${nome} AN ${STAMP}`
  const settings = { business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' }
  if (emailInScheda) settings.serviziEmail = { promemoria: { modo: 'manuale' } }
  await db.doc(`salons/${u.uid}/settings/main`).set(settings)
  await db.doc(`salons/${u.uid}/pro/main`).set(GO)
  for (const s of SERVIZI) await db.doc(`salons/${u.uid}/services/${s.id}`).set({ ...s, createdAt: Date.now() - 864e6, updatedAt: Date.now() - 864e6 })
  return { uid: u.uid, email, nome }
}
async function cane(salonId, id, name, extra = {}) {
  const now = Date.now()
  const doc = { id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: now - 864e6, updatedAt: now - 864e6, ...extra }
  await db.doc(`salons/${salonId}/dogs/${id}`).set(doc)
  return id
}
async function visita(salonId, v) {
  const now = Date.now()
  const doc = { createdAt: now - 864e6, updatedAt: now - 864e6, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end.getTime() }
  for (const k of Object.keys(doc)) if (doc[k] === undefined) delete doc[k]
  await db.doc(`salons/${salonId}/appointments/${v.id}`).set(doc)
  return v.id
}
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

const esiti = []
let paginaCorrente = null
const daChiudere = []
async function caso(nome, fnc) {
  if (SOLO.length && !SOLO.some((s) => nome.startsWith(s + ' '))) return
  try {
    const note = await fnc()
    esiti.push({ nome, esito: 'PASS', note })
  } catch (e) {
    if (paginaCorrente) await paginaCorrente.screenshot({ path: path.join(SHOTS, 'FAIL-' + nome.slice(0, 2) + '.png'), fullPage: true }).catch(() => {})
    esiti.push({ nome, esito: 'FAIL', note: String(e && e.message ? e.message : e).slice(0, 2000) })
  }
  while (daChiudere.length) await daChiudere.pop().close().catch(() => {})
  paginaCorrente = null
}
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati)}`) }
const aspetta = (cond, ms = 20000) => new Promise((ok, ko) => {
  const t0 = Date.now(); const giro = async () => { try { if (await cond()) return ok(Date.now() - t0) } catch { /* riprova */ } if (Date.now() - t0 > ms) return ko(new Error('tempo scaduto')); setTimeout(giro, 400) }; void giro()
})

// ——— date (ora locale, come il browser) ———
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const adesso = new Date()
const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())
const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)
const giornoCorrente = oggi.getDate() < 19 ? new Date(oggi.getFullYear(), oggi.getMonth(), 19) : fineMese // Sole, mese corrente
const primoDopo = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 1) // Sole, mese dopo
const pippoFissato = addDays(oggi, 1) <= fineMese ? addDays(oggi, 1) : oggi
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const corto = (d) => `${d.getDate()} ${MESI[d.getMonth()]}`

// ——— browser ———
const errori = []
async function apri(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  const page = await ctx.newPage()
  paginaCorrente = page
  page.on('pageerror', (e) => errori.push(`${persona.nome}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  return { ctx, page }
}
// Screenshot a 320/360/390 px; la pagina non scorre di lato e gli elementi indicati stanno nello schermo e non sbordano.
async function larghezze(page, nome, locatori = [], prima) {
  const out = []
  for (const v of LARGHEZZE) {
    await page.setViewportSize(v); await page.waitForTimeout(500)
    if (prima) await prima()
    const righe = []
    for (const [etichetta, loc] of locatori) {
      const el = loc.first()
      if (!(await el.count())) { righe.push({ etichetta, assente: true, ok: false }); continue }
      await el.scrollIntoViewIfNeeded().catch(() => {})
      righe.push({ etichetta, ...(await el.evaluate((n) => {
        const r = n.getBoundingClientRect()
        return { sw: n.scrollWidth, cw: n.clientWidth, sinistra: Math.round(r.left), destra: Math.round(r.right), ok: n.scrollWidth <= n.clientWidth + 1 && r.left >= -0.5 && r.right <= window.innerWidth + 0.5 }
      })) })
    }
    const pagina = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(SHOTS, `${nome}-${v.width}.png`) })
    out.push({ larghezza: v.width, pagina, ok: pagina.sw <= pagina.iw && righe.every((r) => r.ok), righe })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  atteso(out.every((m) => m.ok), `misura ${nome}`, out.filter((m) => !m.ok))
  return out.map((m) => `${m.larghezza}px pagina ${m.pagina.sw}/${m.pagina.iw}` + m.righe.map((r) => ` ${r.etichetta} ${r.sw}/${r.cw}`).join('')).join(' | ')
}
const testo = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim()

async function apriScheda(page, id) {
  await page.goto(`${APP}/animali/${id}`)
  await page.getByRole('button', { name: 'Modifica', exact: true }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1200)
}
async function modifica(page) {
  await page.getByRole('button', { name: 'Modifica', exact: true }).click()
  await page.getByRole('button', { name: 'Salva', exact: true }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
}
async function apriSezione(page, titolo) {
  const b = page.getByRole('button', { name: titolo, exact: true })
  if (await b.getAttribute('aria-expanded') !== 'true') await b.click()
  await page.waitForTimeout(400)
}
async function salva(page) {
  await page.getByRole('button', { name: 'Salva', exact: true }).last().click()
  await page.getByRole('button', { name: 'Modifica', exact: true }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(800)
}

async function browserCasi() {
  fs.mkdirSync(SHOTS, { recursive: true })
  const { chromium } = require('playwright')
  const mensili = await utente('Mensili')
  const scheda = await utente('Scheda', { emailInScheda: true })
  const M = mensili.uid; const S = scheda.uid
  // M1
  const pippoA = await cane(M, `animali-pippoa-${STAMP}`, 'Pippo', { breed: 'Barboncino', clientType: 'mensile', recurrenceWeeks: 4, contact: { name: 'Mario Rossi', phone: '+39 333 1000001' } })
  const pippoB = await cane(M, `animali-pippob-${STAMP}`, 'Pippo', { breed: 'Maltese', clientType: 'mensile', recurrenceWeeks: 4, contact: { name: 'Luca Bianchi', phone: '+39 333 1000002' } })
  const sole = await cane(M, `animali-sole-${STAMP}`, 'Sole', { breed: 'Beagle', clientType: 'mensile', recurrenceWeeks: 4, contact: { name: 'Anna Sole', phone: '+39 333 1000003' } })
  await visita(M, { id: `animali-v-pippob-${STAMP}`, dogId: pippoB, start: at(pippoFissato, 15), end: at(pippoFissato, 16), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' })
  const soleFatta = addDays(giornoCorrente, -28)
  await visita(M, { id: `animali-v-sole0-${STAMP}`, dogId: sole, start: at(soleFatta, 10), end: at(soleFatta, 11), services: [riga('bagno', 'Bagno', 60, 28)], status: 'completato', total: 28 })
  await visita(M, { id: `animali-v-sole1-${STAMP}`, dogId: sole, start: at(giornoCorrente, 10), end: at(giornoCorrente, 11), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' })
  await visita(M, { id: `animali-v-sole2-${STAMP}`, dogId: sole, start: at(primoDopo, 10), end: at(primoDopo, 11), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' })
  // scheda
  const dora = await cane(S, `animali-dora-${STAMP}`, 'Dora Deceduta')
  const carlo = await cane(S, `animali-carlo-${STAMP}`, 'Carlo Contatti', {
    contact: { name: 'Paolo Padre', phone: '+39 333 1111111', email: 'padre@test.groomly' },
    contacts: [
      { id: 'primary', name: 'Paolo Padre', role: 'Proprietario', phone: '+39 333 1111111', isPrimary: true },
      { id: 'figlio', name: 'Francesco Figlio', role: 'Figlio', phone: '+39 333 2222222', isPrimary: false },
    ],
  })
  const sara = await cane(S, `animali-sara-${STAMP}`, 'Sara Sesso', { sex: 'F' })
  const pino = await cane(S, `animali-pino-${STAMP}`, 'Pino Prezzo', { servicePrices: [{ serviceId: 'bagno', price: 30, durationMin: 45 }], hiddenServiceIds: ['bagno', 'tosatura'] })
  const fede = await cane(S, `animali-fede-${STAMP}`, 'Fede Frequenza', { clientType: 'mensile', recurrenceWeeks: 6 })
  const alba = await cane(S, `animali-alba-${STAMP}`, 'Alba Anziana', { ageCategory: 'anziano', breed: 'Setter' })
  await cane(S, `animali-zeno-${STAMP}`, 'Zeno Prossimo')
  await visita(S, { id: `animali-v-zeno-${STAMP}`, dogId: `animali-zeno-${STAMP}`, start: at(addDays(oggi, 2), 10), end: at(addDays(oggi, 2), 11), services: [riga('bagno', 'Bagno', 60, 28)], status: 'programmato' })

  const browser = await chromium.launch()
  try {
    // ——— M1 ———
    await caso('M1 Mensili: omonimi con razza · cognome; Sole nel mese corrente e nel mese dopo (1/1)', async () => {
      const { ctx, page } = await apri(browser, mensili)
      try {
        await page.goto(`${APP}/mensili`)
        const meseOra = MESI[oggi.getMonth()]; const meseDopo = MESI[primoDopo.getMonth()]
        const radioOra = page.getByRole('radio', { name: new RegExp(`^${meseOra}`) })
        const radioDopo = page.getByRole('radio', { name: new RegExp(`^${meseDopo}`) })
        await radioOra.waitFor({ timeout: 30000 })
        await aspetta(async () => (await page.getByText('Sole', { exact: true }).count()) > 0, 20000)
        await page.waitForTimeout(1000)
        const main = page.locator('main').or(page.locator('body')).first()
        const corrente = await testo(main)
        const segnoA = await page.getByText('Barboncino · Rossi', { exact: true }).count()
        const segnoB = await page.getByText('Maltese · Bianchi', { exact: true }).count()
        const conto1 = (corrente.match(/(\d+)\/(\d+) fissati/) || [])[0]
        atteso(segnoA === 1 && segnoB === 1, 'righe razza · cognome degli omonimi', { segnoA, segnoB })
        atteso(corrente.includes(corto(giornoCorrente)), `Sole col ${corto(giornoCorrente)} nel mese corrente`, corrente.slice(0, 600))
        // la riga del fissato Pippo B è un link alla visita e contiene la riga del segno
        const fissatoB = page.locator('a').filter({ hasText: 'Maltese · Bianchi' })
        const misCorr = await larghezze(page, 'm1-mensili-corrente', [['fissato Pippo B', fissatoB], ['Sole', page.locator('a').filter({ hasText: 'Sole' })]])
        await radioDopo.click()
        await page.waitForTimeout(1000)
        const dopo = await testo(main)
        const conto2 = (dopo.match(/(\d+)\/(\d+) fissati/) || [])[0]
        const soleDopo = page.locator('a').filter({ hasText: 'Sole' })
        const rigaSole = (await soleDopo.count()) ? await testo(soleDopo.first()) : ''
        atteso(await radioDopo.getAttribute('aria-checked') === 'true', 'mese dopo non scelto', {})
        atteso(rigaSole.includes(corto(primoDopo)), `Sole col ${corto(primoDopo)} nel mese dopo`, { rigaSole, dopo: dopo.slice(0, 600) })
        atteso(conto2 === '1/1 fissati', 'contatore del mese dopo', { conto2 })
        atteso(!dopo.includes('Pippo'), 'Pippo nel mese dopo', dopo.slice(0, 600))
        const misDopo = await larghezze(page, 'm1-mensili-dopo', [['Sole', soleDopo]])
        return `${meseOra}: ${conto1}, «Barboncino · Rossi» (nuovo) e «Maltese · Bianchi» (fissato), Sole ${corto(giornoCorrente)}; ${meseDopo}: ${conto2}, riga «${rigaSole}» || ${misCorr} || ${misDopo}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— D1 ———
    await caso('D1 Deceduto senza visite future: dialogo, Annulla non archivia, Conferma archivia', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        const ref = db.doc(`salons/${S}/dogs/${dora}`)
        await apriScheda(page, dora)
        const apriDialogo = async () => {
          await page.getByRole('button', { name: 'Menu', exact: true }).click()
          await page.getByRole('button', { name: /^Deceduto/ }).first().click()
          const d = page.getByRole('dialog', { name: 'Deceduto' })
          await d.waitFor({ timeout: 10000 })
          await page.waitForTimeout(500)
          return d
        }
        let d = await apriDialogo()
        const t = await testo(d)
        atteso(t.includes('Segnare Dora Deceduta come deceduto?'), 'testo del dialogo', t)
        const mis = await larghezze(page, 'd1-dialogo-deceduto', [['dialogo', d], ['Conferma', d.getByRole('button', { name: 'Conferma', exact: true })], ['Annulla', d.getByRole('button', { name: 'Annulla', exact: true })]])
        await d.getByRole('button', { name: 'Annulla', exact: true }).click()
        await page.waitForTimeout(1500)
        const dopoAnnulla = (await ref.get()).get('status')
        const aperto = await page.getByRole('dialog', { name: 'Deceduto' }).count()
        atteso(dopoAnnulla === 'attivo' && aperto === 0, 'Annulla', { dopoAnnulla, aperto })
        d = await apriDialogo()
        await d.getByRole('button', { name: 'Conferma', exact: true }).click()
        await aspetta(async () => (await ref.get()).get('status') === 'deceduto', 20000).catch(() => {})
        const dopoConferma = (await ref.get()).get('status')
        await page.waitForTimeout(800)
        await page.screenshot({ path: path.join(SHOTS, 'd1-dopo-conferma.png') })
        atteso(dopoConferma === 'deceduto', 'Conferma', { dopoConferma })
        return `dialogo «${t}»; Annulla → status ${dopoAnnulla}; Conferma → status ${dopoConferma} || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— C1 ———
    await caso('C1 Rendi principale + Salva: contact = figlio senza email, padre tra gli extra; riga leggibile a 320 px', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        const ref = db.doc(`salons/${S}/dogs/${carlo}`)
        await apriScheda(page, carlo)
        await modifica(page)
        await apriSezione(page, 'Altri dettagli')
        const rendi = page.getByRole('button', { name: 'Rendi principale Francesco Figlio', exact: true })
        await rendi.waitFor({ timeout: 10000 })
        const misure = []
        for (const v of LARGHEZZE) {
          await page.setViewportSize(v); await page.waitForTimeout(500)
          await rendi.scrollIntoViewIfNeeded()
          const m = await rendi.evaluate((b) => {
            const row = b.parentElement
            const nome = row.querySelector('span > span')
            const r = nome.getBoundingClientRect()
            const bottoni = [...row.querySelectorAll('button')].map((x) => { const q = x.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)] })
            return { row: [row.scrollWidth, row.clientWidth], nomeLargo: Math.round(r.width), nomeTesto: nome.textContent, nomeSw: [nome.scrollWidth, nome.clientWidth], righeNome: Math.round(r.height), bottoni, pagina: [document.documentElement.scrollWidth, window.innerWidth] }
          })
          m.larghezza = v.width
          m.ok = m.row[0] <= m.row[1] + 1 && m.nomeSw[0] <= m.nomeSw[1] + 1 && m.nomeLargo >= 60 && m.pagina[0] <= m.pagina[1]
          misure.push(m)
          await page.screenshot({ path: path.join(SHOTS, `c1-riga-contatto-${v.width}.png`) })
        }
        await page.setViewportSize({ width: 390, height: 844 })
        atteso(misure.every((m) => m.ok), 'riga del contatto extra', misure.filter((m) => !m.ok))
        const email = page.getByLabel('Email', { exact: true })
        const emailPrima = (await email.count()) ? await email.inputValue() : '(campo assente)'
        await rendi.click()
        await page.waitForTimeout(500)
        const proprietario = await page.getByLabel('Proprietario', { exact: true }).inputValue()
        const telefono = await page.getByLabel('Telefono', { exact: true }).inputValue()
        const emailDopo = (await email.count()) ? await email.inputValue() : '(campo assente)'
        const exRiga = await page.getByRole('button', { name: 'Rendi principale Paolo Padre', exact: true }).count()
        await page.getByRole('button', { name: 'Rendi principale Paolo Padre', exact: true }).scrollIntoViewIfNeeded().catch(() => {})
        await page.screenshot({ path: path.join(SHOTS, 'c1-dopo-scambio.png') })
        atteso(proprietario === 'Francesco Figlio' && telefono.replace(/\s/g, '') === '+393332222222' && exRiga === 1, 'campi dopo lo scambio', { proprietario, telefono, exRiga })
        atteso(emailPrima === 'padre@test.groomly' && emailDopo === '', 'email dopo lo scambio', { emailPrima, emailDopo })
        await salva(page)
        await aspetta(async () => (await ref.get()).get('contact.name') === 'Francesco Figlio', 20000).catch(() => {})
        const doc = (await ref.get()).data()
        await page.screenshot({ path: path.join(SHOTS, 'c1-dopo-salva.png'), fullPage: true })
        const principale = (doc.contacts || []).filter((c) => c.isPrimary)
        const padre = (doc.contacts || []).find((c) => c.name === 'Paolo Padre')
        atteso(doc.contact.name === 'Francesco Figlio' && doc.contact.phone.replace(/\s/g, '') === '+393332222222' && !('email' in doc.contact), 'contact su Firestore', doc.contact)
        atteso(principale.length === 1 && principale[0].name === 'Francesco Figlio' && principale[0].role === 'Figlio' && padre && padre.isPrimary === false && padre.role === 'Proprietario', 'contacts su Firestore', doc.contacts)
        return `320/360/390: ${misure.map((m) => `${m.larghezza}px riga ${m.row.join('/')} nome «${m.nomeTesto}» ${m.nomeLargo}px (alto ${m.righeNome}) pagina ${m.pagina.join('/')}`).join(' | ')}; dopo lo scambio Proprietario «${proprietario}», email «${emailPrima}» → «${emailDopo}»; Firestore contact ${JSON.stringify(doc.contact)}, contacts ${JSON.stringify(doc.contacts.map((c) => `${c.name}/${c.role}/${c.isPrimary}`))}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— S1 ———
    await caso('S1 Sesso «Non indicato» + Salva → sex assente su Firestore', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        const ref = db.doc(`salons/${S}/dogs/${sara}`)
        await apriScheda(page, sara)
        await modifica(page)
        await apriSezione(page, 'Altri dettagli')
        const gruppo = page.getByRole('radiogroup', { name: 'Sesso' })
        const prima = await gruppo.getByRole('radio', { name: 'Femmina', exact: true }).getAttribute('aria-checked')
        const non = gruppo.getByRole('radio', { name: 'Non indicato', exact: true })
        const mis = await larghezze(page, 's1-sesso', [['Sesso', gruppo]], () => gruppo.scrollIntoViewIfNeeded())
        await non.click()
        atteso(prima === 'true' && await non.getAttribute('aria-checked') === 'true', 'scelta del sesso', { prima })
        await salva(page)
        await aspetta(async () => !(await ref.get()).data().hasOwnProperty('sex'), 20000).catch(() => {})
        const doc = (await ref.get()).data()
        atteso(!('sex' in doc), 'sex ancora su Firestore', { sex: doc.sex })
        await modifica(page)
        await apriSezione(page, 'Altri dettagli')
        const riaperto = await page.getByRole('radiogroup', { name: 'Sesso' }).getByRole('radio', { name: 'Non indicato', exact: true }).getAttribute('aria-checked')
        atteso(riaperto === 'true', '«Non indicato» non scelto riaprendo', { riaperto })
        return `Femmina scelto all'inizio; «Non indicato» + Salva → sex assente su Firestore; riaprendo Modifica «Non indicato» è scelto || ${mis}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— O1 ———
    await caso('O1 Ordina: spunta sulla scelta attiva, ricordata dopo la ricarica', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        await page.goto(`${APP}/animali`)
        const ordina = page.getByRole('button', { name: 'Ordina', exact: true })
        await ordina.waitFor({ timeout: 30000 })
        await page.waitForTimeout(1200)
        const leggi = async () => {
          await ordina.click()
          const prox = page.getByRole('button', { name: 'Per prossimo appuntamento', exact: true })
          await prox.waitFor({ timeout: 10000 })
          await page.waitForTimeout(400)
          const alfa = page.getByRole('button', { name: 'Alfabetico', exact: true })
          return { alfa, prox, stato: { alfa: [await alfa.getAttribute('aria-pressed'), await alfa.locator('svg').count()], prox: [await prox.getAttribute('aria-pressed'), await prox.locator('svg').count()] } }
        }
        let r = await leggi()
        const iniziale = r.stato
        atteso(iniziale.alfa[0] === 'true' && iniziale.alfa[1] === 1 && iniziale.prox[1] === 0, 'stato iniziale', iniziale)
        const mis1 = await larghezze(page, 'o1-ordina-alfabetico', [['Alfabetico', r.alfa], ['Prossimo', r.prox]])
        await r.prox.click()
        await page.waitForTimeout(800)
        const chiave = await page.evaluate(() => localStorage.getItem('groomly.ordinamentoAnimali'))
        r = await leggi()
        const dopoScelta = r.stato
        atteso(dopoScelta.prox[0] === 'true' && dopoScelta.prox[1] === 1 && dopoScelta.alfa[1] === 0, 'dopo la scelta', dopoScelta)
        await page.keyboard.press('Escape')
        await page.reload()
        await ordina.waitFor({ timeout: 30000 })
        await page.waitForTimeout(1500)
        r = await leggi()
        const dopoRicarica = r.stato
        const mis2 = await larghezze(page, 'o1-ordina-dopo-ricarica', [['Alfabetico', r.alfa], ['Prossimo', r.prox]])
        atteso(dopoRicarica.prox[0] === 'true' && dopoRicarica.prox[1] === 1 && dopoRicarica.alfa[1] === 0, 'dopo la ricarica', dopoRicarica)
        return `iniziale ${JSON.stringify(iniziale)}; scelta «Per prossimo appuntamento» → localStorage ${chiave}, ${JSON.stringify(dopoScelta)}; dopo la ricarica ${JSON.stringify(dopoRicarica)} || ${mis1} || ${mis2}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— P1 ———
    await caso('P1 Prezzo svuotato: niente riga «—», hiddenServiceIds senza il servizio anche al secondo Salva', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        const ref = db.doc(`salons/${S}/dogs/${pino}`)
        await apriScheda(page, pino)
        const lista = page.getByRole('list', { name: 'Prezzi personalizzati' })
        await lista.waitFor({ timeout: 10000 })
        const prima = await testo(lista)
        atteso(prima.includes('Bagno') && !prima.includes('Tosatura') && !prima.includes('—'), 'prezzi prima (tosatura nascosta senza prezzo non deve apparire)', prima)
        await modifica(page)
        const apriPrezzi = async () => {
          const b = page.getByRole('button', { name: 'Prezzi personalizzati' })
          if (await b.getAttribute('aria-expanded') !== 'true') await b.click()
          await page.getByLabel('Prezzo Bagno', { exact: true }).waitFor({ timeout: 10000 })
        }
        await apriPrezzi()
        const gruppoBagno = page.getByRole('group', { name: 'Bagno', exact: true })
        const misEd = await larghezze(page, 'p1-prezzi-modifica', [['riga Bagno', gruppoBagno]], () => gruppoBagno.scrollIntoViewIfNeeded())
        await page.getByLabel('Prezzo Bagno', { exact: true }).fill('')
        await page.getByLabel('Durata Bagno', { exact: true }).fill('')
        await salva(page)
        await aspetta(async () => !((await ref.get()).get('hiddenServiceIds') || []).includes('bagno'), 20000).catch(() => {})
        const doc1 = (await ref.get()).data()
        atteso(!doc1.hiddenServiceIds.includes('bagno') && !doc1.servicePrices.some((p) => p.serviceId === 'bagno'), 'Firestore dopo il primo Salva', { hidden: doc1.hiddenServiceIds, prezzi: doc1.servicePrices })
        const corpo = await testo(page.locator('body'))
        const righeLista = await lista.count()
        atteso(!/—\s*·?\s*—/.test(corpo) && righeLista === 0, 'riga «— —» o lista ancora visibile', { righeLista, corpo: corpo.slice(0, 500) })
        await page.screenshot({ path: path.join(SHOTS, 'p1-dopo-salva.png'), fullPage: true })
        await modifica(page)
        await apriPrezzi()
        const interruttore = await gruppoBagno.getByRole('switch').getAttribute('aria-checked')
        atteso(interruttore === 'false', 'interruttore «mostra nel profilo» di Bagno ancora acceso', { interruttore })
        await salva(page)
        await page.waitForTimeout(1500)
        const doc2 = (await ref.get()).data()
        atteso(!doc2.hiddenServiceIds.includes('bagno'), 'Bagno tornato in hiddenServiceIds al secondo Salva', doc2.hiddenServiceIds)
        return `prima «${prima}»; svuotati prezzo e durata + Salva → hiddenServiceIds ${JSON.stringify(doc1.hiddenServiceIds)}, servicePrices ${JSON.stringify(doc1.servicePrices)}, nessuna lista/riga «—»; secondo Modifica interruttore Bagno ${interruttore}, secondo Salva hiddenServiceIds ${JSON.stringify(doc2.hiddenServiceIds)} || ${misEd}`
      } finally { daChiudere.push(ctx) }
    })

    // ——— F1 + A1 ———
    await caso('F1 «Mensile · ogni 6 settimane» nella scheda', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        await apriScheda(page, fede)
        const voce = page.getByText('Mensile · ogni 6 settimane', { exact: true })
        await voce.waitFor({ timeout: 10000 })
        const mis = await larghezze(page, 'f1-frequenza', [['frequenza', voce]], () => voce.scrollIntoViewIfNeeded())
        return `«Mensile · ogni 6 settimane» presente || ${mis}`
      } finally { daChiudere.push(ctx) }
    })
    await caso('A1 «Anziano» una volta sola nella testata (senza anno di nascita)', async () => {
      const { ctx, page } = await apri(browser, scheda)
      try {
        await apriScheda(page, alba)
        const nome = page.getByText('Alba Anziana', { exact: true }).first()
        const conteggio = async () => nome.evaluate((n) => {
          const card = n.parentElement.parentElement.parentElement
          return { volte: (card.innerText.match(/Anziano/g) || []).length, testo: card.innerText.replace(/\s+/g, ' ').slice(0, 200) }
        })
        const c = await conteggio()
        const testata = nome.locator('xpath=../../..')
        const mis = await larghezze(page, 'a1-anziano', [['testata', testata]])
        atteso(c.volte === 1, '«Anziano» nella testata', c)
        return `testata «${c.testo}»: «Anziano» ${c.volte} volta || ${mis}`
      } finally { daChiudere.push(ctx) }
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
  console.table(esiti.map((e) => ({ caso: e.nome.slice(0, 80), esito: e.esito })))
  console.log(JSON.stringify({ stamp: STAMP, giornoCorrente: dayKey(giornoCorrente), primoDopo: dayKey(primoDopo), esiti, errori }, null, 1))
  const ok = esiti.filter((e) => e.esito === 'PASS').length
  console.log(`\n${ok}/${esiti.length} PASS`)
  process.exit(ok === esiti.length && esiti.length > 0 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
