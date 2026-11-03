// Giro di misura «basse Grafica»: contrasto, area toccabile, testo tagliato e scorrimento orizzontale su ogni rotta.
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite del ramo in modo emu (default 127.0.0.1:5180).
// Tre saloni nuovi a ogni giro (firebase-admin): Go (piano base), Plus (piano pro), Salone titolare (piano salone).
// In ognuno: 8 servizi predefiniti (SERVICE_SEED), 3 cani con nomi brevi, visite di oggi già passate, una futura da 45 min,
// una completata, un impegno personale, una chiusura. Si cancella tutto alla fine, salvo --keep.
// Regole (vedi il piano): contrasto testo >= 4,5:1 (>= 3:1 se >= 18,66 px grassetto o >= 24 px); zona toccabile >= 40x40 px;
// nessun elemento con text-overflow: ellipsis e scrollWidth > clientWidth; nessuno scorrimento orizzontale della pagina.
// Uso: node QA-tests/.qa-catalog/verify-basse-grafica.cjs [--app=http://127.0.0.1:5180] [--giro] [--solo=G,P,T] [--keep]
//        [--larghezze=320,360,390] [--temi=light,dark]
//   --giro  : tutte le rotte, scrive QA-tests/results/basse-grafica/giro-<stamp>.json, esce 1 se ci sono violazioni.
//   senza   : solo Home (prova di collegamento) alla prima larghezza e al primo tema, con screenshot.
//   --solo  : ruoli da misurare (G = Go, P = Plus, T = Salone titolare).
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = getFirestore(); const auth = getAuth()

const arg = (nome, def) => { const a = process.argv.find((x) => x.startsWith(`--${nome}=`)); return a ? a.slice(nome.length + 3) : def }
const KEEP = process.argv.includes('--keep')
const GIRO = process.argv.includes('--giro')
const APP = arg('app', 'http://127.0.0.1:5180')
const SOLO = arg('solo', '').split(',').filter(Boolean).map((s) => s.toUpperCase())
const LARGHEZZE = arg('larghezze', '320,360,390').split(',').map(Number).slice(0, process.argv.includes('--giro') ? 99 : 1)
const ALTEZZE = { 320: 640, 360: 800, 390: 844 }
const TEMI = arg('temi', 'light,dark').split(',').slice(0, process.argv.includes('--giro') ? 99 : 1)
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
const SHOTS = path.resolve('QA-tests/results/basse-grafica')
const FILE_GIRO = path.join(SHOTS, `giro-${STAMP}.json`)

// ——— dati ———
// Gli stessi servizi che l'app crea al primo avvio (src/data/seed/services.ts).
const SERVIZI = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 30, media: 35, grande: 45 } },
  { id: 'bagno-taglio', order: 2, name: 'Bagno + taglio', kind: 'principale', iconKey: 'bagno_taglio', active: true, durationMin: { piccola: 60, media: 90, grande: 120 }, price: { piccola: 35, media: 45, grande: 60 } },
  { id: 'stripping', order: 3, name: 'Stripping', kind: 'principale', active: true, durationMin: { piccola: 120, media: 150, grande: 180 }, price: { piccola: 50, media: 65, grande: 85 } },
  { id: 'nodi', order: 4, name: 'Gestione nodi', kind: 'extra', iconKey: 'nodi', active: true, durationMin: { piccola: 20, media: 20, grande: 20 }, price: { piccola: 5, media: 5, grande: 5 } },
  { id: 'dermatologico', order: 5, name: 'Dermatologico', kind: 'extra', iconKey: 'dermatologico', active: true, durationMin: { piccola: 15, media: 15, grande: 15 }, price: { piccola: 10, media: 10, grande: 10 } },
  { id: 'antiparassitario', order: 6, name: 'Antiparassitario', kind: 'extra', iconKey: 'antiparassitario', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 12, media: 12, grande: 12 } },
  { id: 'unghie', order: 7, name: 'Unghie', kind: 'extra', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 } },
]
// Come scrive functions/src/piano/scriviPiano.ts.
const PIANO_GO = { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false }
const PIANO_PLUS = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false }
const PIANO_SALONE = { piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true }
const RUOLI = [
  { codice: 'G', nome: 'go', cognome: 'Gino', pro: PIANO_GO },
  { codice: 'P', nome: 'plus', cognome: 'Paola', pro: PIANO_PLUS },
  { codice: 'T', nome: 'titolare', cognome: 'Tina', pro: PIANO_SALONE },
].filter((r) => !SOLO.length || SOLO.includes(r.codice))

const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const adesso = new Date()
const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

const creati = []
async function creaSalone(ruolo) {
  const email = `grafica-${ruolo.nome}-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  const S = u.uid
  const vecchio = Date.now() - 864e6
  await db.doc(`accounts/${S}`).set({ uid: S, email, salonId: S, role: 'titolare', legacy: false, firstName: ruolo.cognome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = `Salone ${ruolo.cognome}`
  await db.doc(`salons/${S}/settings/main`).set({ business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${S}/pro/main`).set(ruolo.pro)
  for (const s of SERVIZI) await db.doc(`salons/${S}/services/${s.id}`).set({ ...s, createdAt: vecchio, updatedAt: vecchio })
  const cane = async (id, name, extra = {}) => {
    await db.doc(`salons/${S}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Anna Rossi', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: vecchio, updatedAt: vecchio, ...extra })
    return id
  }
  const fido = await cane(`dog-fido-${STAMP}`, 'Fido', { clientType: 'mensile', recurrenceWeeks: 4, contacts: [{ id: 'c1', name: 'Anna Rossi', role: 'Proprietaria', phone: '+39 333 0000000', isPrimary: true }] })
  const rex = await cane(`dog-rex-${STAMP}`, 'Rex', { breed: 'Barboncino', size: 'media' })
  const lilla = await cane(`dog-lilla-${STAMP}`, 'Lilla', { breed: 'Maltese', temperament: 'agitato' })
  const visita = async (id, v) => {
    const doc = { id, createdAt: vecchio, updatedAt: vecchio, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end.getTime() }
    if (v.chiusoIl) doc.chiusoIl = v.chiusoIl.getTime()
    await db.doc(`salons/${S}/appointments/${id}`).set(doc)
    return id
  }
  // oggi, già passate (da chiudere in Home)
  const inizioGiorno = oggi.getTime() + 60000
  const passata1 = Math.max(inizioGiorno, adesso.getTime() - 3 * 3600e3)
  const passata2 = Math.max(inizioGiorno + 60000, adesso.getTime() - 2 * 3600e3)
  await visita(`apt-oggi1-${STAMP}`, { dogId: rex, start: new Date(passata1), end: new Date(passata1 + 45 * 60000), services: [riga('bagno', 'Bagno', 45, 28)], status: 'programmato' })
  await visita(`apt-oggi2-${STAMP}`, { dogId: lilla, start: new Date(passata2), end: new Date(passata2 + 45 * 60000), services: [riga('taglio', 'Taglio / tosatura', 45, 30)], status: 'programmato' })
  // futura da 45 min
  const domani = addDays(oggi, 1)
  const apt = await visita(`apt-fut-${STAMP}`, { dogId: fido, start: at(domani, 10), end: at(domani, 10, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'programmato' })
  // completate (ieri e tre giorni fa) per Incassi
  const aptDone = await visita(`apt-fatta-${STAMP}`, { dogId: fido, start: at(addDays(oggi, -1), 15), end: at(addDays(oggi, -1), 15, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'completato', total: 20, paymentMethod: 'contanti', actualDurationMin: 45, chiusoIl: at(addDays(oggi, -1), 16) })
  await visita(`apt-fatta2-${STAMP}`, { dogId: rex, start: at(addDays(oggi, -3), 9), end: at(addDays(oggi, -3), 10), services: [riga('bagno-taglio', 'Bagno + taglio', 60, 45)], status: 'completato', total: 45, paymentMethod: 'pos', actualDurationMin: 60, chiusoIl: at(addDays(oggi, -3), 10, 10) })
  // impegno personale
  const pers = `per-${STAMP}`
  await db.doc(`salons/${S}/appointments/${pers}`).set({ id: pers, kind: 'personale', title: 'Dentista', dogId: '', services: [], status: 'programmato', start: at(addDays(oggi, 2), 14).getTime(), plannedEnd: at(addDays(oggi, 2), 15).getTime(), createdAt: vecchio, updatedAt: vecchio })
  // chiusura
  const clo = `chi-${STAMP}`
  await db.doc(`salons/${S}/closures/${clo}`).set({ reason: 'Ferie', startDay: dayKey(addDays(oggi, 10)), endDay: dayKey(addDays(oggi, 12)), createdAt: vecchio, updatedAt: vecchio })
  return { ...ruolo, uid: S, email, dog: fido, apt, aptDone, pers, clo }
}

async function cancellaTutti() {
  for (const uid of creati) {
    await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
    await db.doc(`accounts/${uid}`).delete().catch(() => {})
    await auth.deleteUser(uid).catch(() => {})
  }
}

// ——— rotte (giro.cjs dell'audit), senza abbonamento, /dev/kit, /benvenuto e aggiornamenti ———
const SALTATE = [/^\/impostazioni\/abbonamento/, /^\/dev\/kit$/, /^\/benvenuto$/, /^\/impostazioni\/aggiornamenti$/]
function rotte(i) {
  return ['/', '/animali', '/animali/nuovo', '/animali/attesa', `/animali/${i.dog}`, '/calendario', '/mensili', '/incassi', '/incassi/report', '/incassi/statistiche',
    '/listino', '/listino/vedi', '/listino/prezzi', '/listino/gestione', '/listino/stampa', '/impostazioni', '/impostazioni/account', '/impostazioni/suggerimenti',
    '/impostazioni/legale', '/impostazioni/licenze', '/impostazioni/info', '/impostazioni/servizi', '/impostazioni/archivio', '/impostazioni/pro', '/impostazioni/piano',
    '/impostazioni/team', '/impostazioni/notifiche', '/impostazioni/avvisi', '/impostazioni/utenti', '/impostazioni/privacy',
    '/impostazioni/account/elimina', '/appuntamenti/nuovo', `/appuntamenti/${i.apt}`, `/appuntamenti/${i.aptDone}`, '/appuntamenti/personale/nuovo', `/appuntamenti/personale/${i.pers}`,
    '/chiusure/nuovo', `/chiusure/${i.clo}`, '/pagina-che-non-esiste'].filter((r) => !SALTATE.some((x) => x.test(r)))
}
const slug = (r) => (r === '/' ? 'home' : r.slice(1).replace(/[\/:]/g, '_'))

// ——— misure nella pagina ———
// Contrasto: da giro.cjs (CHECK, parte lowContrast); soglie del piano.
const MISURA_CONTRASTO_TAGLI = () => {
  const W = innerWidth
  const dlg = [...document.querySelectorAll('[role=dialog][aria-modal=true]')].pop()
  const root = dlg || document.body
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  const lum = (c) => { if (!/^rgba?\(/.test(c)) return null; const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return { l: 0.2126 * r + 0.7152 * g + 0.0722 * b, a: m[3] === undefined ? 1 : +m[3] } }
  const bgOf = (el) => { for (let p = el; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const L = lum(s.backgroundColor); if (L && L.a > 0.9) return L.l } return lum(getComputedStyle(document.body).backgroundColor)?.l ?? 1 }
  const quale = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
  const contrasto = []
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el)) continue
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
    if (!own) continue
    const s = getComputedStyle(el); const fg = lum(s.color); if (!fg) continue
    const bg = bgOf(el); if (bg == null) continue
    let op = 1; for (let p = el; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity)
    const ratio = (Math.max(fg.l, bg) + 0.05) / (Math.min(fg.l, bg) + 0.05)
    const px = parseFloat(s.fontSize)
    const min = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700) ? 3 : 4.5
    if (ratio < min && fg.a > 0.5 && op > 0.5 && !el.closest('[disabled],[aria-disabled=true]')) contrasto.push(`${ratio.toFixed(2)} (min ${min}) "${own.slice(0, 40)}" ${s.color} ${s.fontSize}/${s.fontWeight} ${quale(el)}`)
  }
  const tagli = [...root.querySelectorAll('*')].filter((el) => vis(el) && getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
    .map((el) => `${quale(el)} "${(el.innerText || el.textContent || '').trim().slice(0, 40)}" ${el.scrollWidth}/${el.clientWidth}`)
  return { dialog: !!dlg, hscroll: document.documentElement.scrollWidth > W + 1, contrasto: [...new Set(contrasto)], tagli: [...new Set(tagli)] }
}

// Tocco: ogni controllo visibile, portato al centro, deve essere raggiungibile nei 4 punti a 20 px dal centro
// (limitati al riquadro che lo contiene e allo schermo): cade sull'elemento o su un suo discendente. Dunque almeno 40x40 px liberi.
// Eccezioni, tutte con motivo:
//  - disabilitati: non si toccano;
//  - barre del grafico di Incassi (.earnings-plot button): colonne strette per forza, altre mille barre per giorno;
//  - caselle della griglia del Calendario (rotta /calendario: celle con aria-pressed e ore vuote senza testo): sono una griglia fitta;
//  - link dentro una frase (un a con testo fratello nello stesso paragrafo): la riga di testo non va gonfiata.
const MISURA_TOCCO = () => {
  const dlg = [...document.querySelectorAll('[role=dialog][aria-modal=true]')].pop()
  const root = dlg || document.body
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  const nome = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join('') || '').trim().replace(/\s+/g, ' ').slice(0, 30)
  const sel = 'button, a[href], [role=button], [role=tab], [role=switch], [role=radio], input[type=checkbox], input[type=radio], select'
  const inCalendario = location.pathname === '/calendario'
  const eccezione = (el) => {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return true
    if (el.closest('.earnings-plot')) return true
    if (inCalendario && el.tagName === 'BUTTON' && !el.hasAttribute('data-apri') && (el.hasAttribute('aria-pressed') || !(el.innerText || '').trim())) return true
    if (el.tagName === 'A' && el.parentElement && [...el.parentElement.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim())) return true
    return false
  }
  const scatola = (el) => {
    let b = { l: 0, t: 0, r: innerWidth, b: innerHeight }
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX + s.overflowY)) {
        const r = p.getBoundingClientRect()
        b = { l: Math.max(b.l, r.left), t: Math.max(b.t, r.top), r: Math.min(b.r, r.right), b: Math.min(b.b, r.bottom) }
      }
    }
    return b
  }
  const fuori = []
  for (const el of [...root.querySelectorAll(sel)].filter(vis)) {
    if (eccezione(el)) continue
    el.scrollIntoView({ block: 'center', inline: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const box = scatola(el)
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2
    const cl = (v, a, b2) => Math.min(Math.max(v, a + 1), Math.max(a + 1, b2 - 1))
    const punti = [[cx - 20, cy], [cx + 20, cy], [cx, cy - 20], [cx, cy + 20]].map(([x, y]) => [cl(x, box.l, box.r), cl(y, box.t, box.b)])
    const male = punti.filter(([x, y]) => {
      const h = document.elementFromPoint(x, y)
      return !(h && (el.contains(h) || (el.labels && [...el.labels].some((l) => l.contains(h))) || h.closest('label')?.control === el))
    })
    if (male.length) fuori.push(`${el.tagName.toLowerCase()} "${nome(el)}" ${Math.round(r.width)}x${Math.round(r.height)} (${male.length}/4 punti fuori)`)
  }
  return [...new Set(fuori)]
}

async function aspettaStabile(page, t0, max = 12000) {
  let last = ''; let lastChange = Date.now(); let loading = true
  while (Date.now() - t0 < max) {
    const t = await page.evaluate(() => { const tx = document.body.innerText; return [tx.length + '|' + document.querySelectorAll('img,svg,button').length, /Carico l|Caricamento|Loading|Cargando/.test(tx) || document.querySelectorAll('[aria-label*="aricamento"],[aria-busy=true]').length > 0] }).catch(() => ['', true])
    loading = t[1]
    if (t[0] !== last) { last = t[0]; lastChange = Date.now() } else if (!loading && Date.now() - lastChange > 1200) break
    await page.waitForTimeout(150)
  }
  return loading
}

async function apri(browser, persona, larghezza, tema) {
  const ctx = await browser.newContext({ viewport: { width: larghezza, height: ALTEZZE[larghezza] || 800 }, timezoneId: 'Europe/Rome', locale: 'it-IT', colorScheme: tema })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  // Le funzioni callable non girano negli emulatori di questo giro: risposta finta, mai verso la produzione.
  await ctx.route('**/*', (route) => {
    const url = route.request().url(); const host = new URL(url).hostname
    if (host === '127.0.0.1' || host === 'localhost') return url.startsWith('http://127.0.0.1:5001/') ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }) : route.continue()
    if (/groomly-3128b|firebaseio\.com|googleapis\.com\/(?!css)|cloudfunctions\.net|brevo|sendinblue|github\.com|githubusercontent/.test(url) && !/fonts\.googleapis/.test(url)) return route.abort()
    return route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').first().fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  await aspettaStabile(page, Date.now(), 15000)
  return { ctx, page }
}

async function giro(browser, persone) {
  const risultati = []
  for (const persona of persone) for (const larghezza of LARGHEZZE) for (const tema of TEMI) {
    const { ctx, page } = await apri(browser, persona, larghezza, tema)
    const elenco = GIRO ? rotte(persona) : ['/']
    for (const rotta of elenco) {
      await page.evaluate((r) => { window.scrollTo(0, 0); window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, rotta)
      const ancoraCarica = await aspettaStabile(page, Date.now())
      const finalUrl = new URL(page.url()).pathname
      let m = { dialog: false, hscroll: false, contrasto: [], tagli: [] }; let tocco = []
      try { m = await page.evaluate(MISURA_CONTRASTO_TAGLI); tocco = await page.evaluate(MISURA_TOCCO) } catch (e) { m.errore = String(e).slice(0, 200) }
      if (!GIRO) await page.screenshot({ path: path.join(SHOTS, `home-${persona.codice}-${larghezza}-${tema}.png`) }).catch(() => {})
      const rec = { ruolo: persona.codice, larghezza, tema, rotta, finalUrl, foglio: m.dialog, contrasto: m.contrasto, tocco, tagli: m.tagli, hscroll: m.hscroll, ancoraCarica, ...(m.errore ? { errore: m.errore } : {}) }
      risultati.push(rec)
      console.log(`${persona.codice} ${larghezza} ${tema} ${rotta}${finalUrl !== rotta ? ' -> ' + finalUrl : ''} contrasto=${rec.contrasto.length} tocco=${rec.tocco.length} tagli=${rec.tagli.length} hscroll=${rec.hscroll}${ancoraCarica ? ' (ancora in caricamento)' : ''}`)
      await page.keyboard.press('Escape').catch(() => {})
      if (GIRO) fs.writeFileSync(FILE_GIRO, JSON.stringify(risultati, null, 1))
    }
    await ctx.close()
  }
  return risultati
}

function riepilogo(risultati) {
  const perRotta = new Map()
  for (const r of risultati) {
    const v = perRotta.get(r.rotta) || { contrasto: new Set(), tocco: new Set(), tagli: new Set(), hscroll: false }
    r.contrasto.forEach((x) => v.contrasto.add(x)); r.tocco.forEach((x) => v.tocco.add(x)); r.tagli.forEach((x) => v.tagli.add(x)); if (r.hscroll) v.hscroll = true
    perRotta.set(r.rotta, v)
  }
  let totale = 0
  for (const [rotta, v] of perRotta) {
    const n = v.contrasto.size + v.tocco.size + v.tagli.size + (v.hscroll ? 1 : 0)
    totale += n
    if (n) console.log(`${rotta}: contrasto ${v.contrasto.size}, tocco ${v.tocco.size}, tagli ${v.tagli.size}${v.hscroll ? ', scorrimento orizzontale' : ''}`)
  }
  console.log(`\nRotte misurate: ${perRotta.size}; violazioni distinte: ${totale}`)
  return risultati.some((r) => r.contrasto.length || r.tocco.length || r.tagli.length || r.hscroll)
}

;(async () => {
  let violazioni = false
  try {
    fs.mkdirSync(SHOTS, { recursive: true })
    const { chromium } = require('playwright')
    const persone = []
    for (const r of RUOLI) persone.push(await creaSalone(r))
    const browser = await chromium.launch()
    try {
      const risultati = await giro(browser, persone)
      violazioni = riepilogo(risultati)
      if (GIRO) console.log(`JSON: ${FILE_GIRO}`)
    } finally { await browser.close().catch(() => {}) }
  } finally {
    if (!KEEP) await cancellaTutti()
    else console.log('Account tenuti:', creati.join(', '))
  }
  process.exit(violazioni ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(2) })
