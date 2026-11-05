// Giro T7 delle cinque lingue. Solo emulatori demo-groomly di firebase.lingue.json e app Vite di vite-lingue.config.ts.
// Per ogni ruolo, larghezza e lingua apre ogni rotta e misura:
//  - frasi di un'altra lingua: testo uguale a una frase del catalogo di un'altra lingua, che la lingua attiva non ha;
//  - frasi fuori catalogo con parole di un'altra lingua, mesi e giorni compresi;
//  - testo tagliato o fuori dal suo riquadro, scorrimento orizzontale, parole spezzate a metà.
// Con --dialoghi tocca anche ogni pulsante di ogni rotta, a due livelli, e misura ciò che si apre.
// Uso: node QA-tests/.qa-catalog/verify-cinque-lingue.cjs --frasi=<frasi.json> [--ruoli=T,P,G,C,V] [--lingue=it,en,es,fr,de]
//        [--larghezze=320,360,390] [--rotte=/,/animali] [--dialoghi] [--foto] [--paralleli=4] [--out=<cartella>]
process.env.TZ = 'Europe/Rome'
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8180'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require(path.resolve('node_modules/playwright'))
const db = getFirestore(); const auth = getAuth()

const arg = (nome, def) => { const a = process.argv.find((x) => x.startsWith(`--${nome}=`)); return a ? a.slice(nome.length + 3) : def }
const elenco = (nome, def) => arg(nome, def).split(',').filter(Boolean)
const APP = arg('app', 'http://127.0.0.1:5190')
const RUOLI = elenco('ruoli', 'T,P,G,C,V')
const LINGUE = elenco('lingue', 'it,en,es,fr,de')
const LARGHEZZE = elenco('larghezze', '320,360,390').map(Number)
const SOLO_ROTTE = elenco('rotte', '')
const DIALOGHI = process.argv.includes('--dialoghi')
const FOTO = process.argv.includes('--foto')
const PARALLELI = Number(arg('paralleli', '4'))
const OUT = path.resolve(arg('out', 'QA-tests/results/cinque-lingue'))
const FRASI = JSON.parse(fs.readFileSync(arg('frasi', path.join(OUT, 'frasi.json')), 'utf8'))
const ALTEZZE = { 320: 640, 360: 800, 390: 844 }
const STAMP = Date.now().toString(36)
const PASSWORD = 'Test1234!'
fs.mkdirSync(OUT, { recursive: true })

// ——— classificazione del testo ———
const norm = (s) => String(s).replace(/­/g, '').replace(/[   ]/g, ' ').replace(/[’‘]/g, "'").replace(/[“”„«»]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase()
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const insiemi = {}; const modelli = {}
for (const l of Object.keys(FRASI)) {
  insiemi[l] = new Map(); modelli[l] = []
  for (const [k, v] of Object.entries(FRASI[l])) {
    if (typeof v !== 'string') continue
    for (const pezzo of v.split(/\n+/)) {
      const n = norm(pezzo); if (!n) continue
      if (n.includes('{{')) {
        const fissi = n.split(/\{\{[^}]+\}\}/).join(' ').replace(/[^\p{L}]+/gu, ' ').trim()
        if (fissi.length >= 6) modelli[l].push({ k, re: new RegExp('^' + n.split(/\{\{[^}]+\}\}/).map(esc).join('.{1,80}?') + '$') })
      } else if (!insiemi[l].has(n)) insiemi[l].set(n, k)
    }
  }
}
const PAROLE = {
  it: ['il', 'lo', 'la', 'gli', 'le', 'della', 'delle', 'dello', 'degli', 'nel', 'nella', 'per', 'con', 'del', 'non', 'sono', 'questo', 'questa', 'una', 'che', 'nessun', 'nessuna', 'tutti', 'tuo', 'tua', 'puoi', 'salva', 'annulla', 'oggi', 'domani', 'ieri', 'ancora', 'anche', 'dal', 'dalla', 'alla', 'sul', 'sulla'],
  en: ['the', 'your', 'with', 'this', 'you', 'for', 'and', 'from', 'are', 'not', 'have', 'has', 'will', 'can', 'all', 'save', 'cancel', 'delete', 'today', 'tomorrow', 'yesterday', 'open', 'close', 'back', 'new', 'of', 'to', 'in', 'on', 'is'],
  es: ['el', 'los', 'las', 'una', 'con', 'para', 'del', 'tu', 'tus', 'que', 'por', 'hoy', 'mañana', 'ayer', 'guardar', 'cancelar', 'todos', 'puedes', 'este', 'esta', 'sin', 'más'],
  fr: ['le', 'les', 'des', 'une', 'avec', 'pour', 'vous', 'votre', 'vos', 'dans', 'sur', 'aujourd', 'demain', 'hier', 'enregistrer', 'annuler', 'tous', 'pouvez', 'cette', 'est', 'aux', 'sans', 'plus'],
  de: ['der', 'die', 'das', 'und', 'mit', 'für', 'nicht', 'sie', 'ihre', 'ihr', 'ein', 'eine', 'heute', 'morgen', 'gestern', 'speichern', 'abbrechen', 'alle', 'können', 'dieser', 'diese', 'auf', 'von', 'zu', 'im'],
}
const LOCALI = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' }
const nomiCalendario = {}
for (const l of Object.keys(LOCALI)) {
  const s = new Set()
  for (let m = 0; m < 12; m++) s.add(new Intl.DateTimeFormat(LOCALI[l], { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m, 15))).toLowerCase())
  for (let g = 0; g < 7; g++) s.add(new Intl.DateTimeFormat(LOCALI[l], { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 2 + g))).toLowerCase())
  nomiCalendario[l] = s
}
// Testo dei dati di prova, che non è dell'app.
const DATI = /fido|rex|lilla|anna rossi|salone |meticcio|barboncino|maltese|dentista|ferie|pippo|grafica|@test\.groomly|lingue-|groomly|mario bianchi|giulia|qa\b/i
const cache = new Map()
function classifica(testo, lingua) {
  const n = norm(testo)
  const chiave = lingua + '|' + n
  if (cache.has(chiave)) return cache.get(chiave)
  let esito = null
  const lettere = n.replace(/[^\p{L}]+/gu, '')
  if (lettere.length >= 3 && !insiemi[lingua].has(n) && !modelli[lingua].some((m) => m.re.test(n))) {
    for (const altra of Object.keys(FRASI)) {
      if (altra === lingua) continue
      if (insiemi[altra].has(n)) { esito = { tipo: 'frase', altra, chiave: insiemi[altra].get(n) }; break }
      const m = modelli[altra].find((x) => x.re.test(n))
      if (m) { esito = { tipo: 'frase', altra, chiave: m.k }; break }
    }
    if (!esito && !DATI.test(n)) {
      const parole = n.split(/[^\p{L}]+/u).filter(Boolean)
      for (const altra of Object.keys(nomiCalendario)) {
        if (altra === lingua) continue
        const p = parole.find((x) => nomiCalendario[altra].has(x) && !nomiCalendario[lingua].has(x))
        if (p) { esito = { tipo: 'data', altra, parola: p }; break }
      }
      if (!esito && parole.length >= 3) {
        const conta = {}
        for (const l of Object.keys(PAROLE)) conta[l] = parole.filter((p) => PAROLE[l].includes(p)).length
        const migliore = Object.keys(conta).sort((a, b) => conta[b] - conta[a])[0]
        if (migliore !== lingua && conta[migliore] >= 2 && conta[migliore] > conta[lingua]) esito = { tipo: 'parole', altra: migliore, conta }
      }
    }
  }
  cache.set(chiave, esito)
  return esito
}

// ——— misure nella pagina ———
const MISURA = () => {
  const W = innerWidth
  const dlg = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter((d) => d.getBoundingClientRect().width > 0).pop()
  const root = dlg || document.body
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  const quale = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`
  const testi = new Set(); const tagli = []; const fuori = []; const spezzate = []
  const dentroScorrevole = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true } return false }
  const camminatore = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = camminatore.nextNode(); n; n = camminatore.nextNode()) {
    const el = n.parentElement
    if (!el || !n.textContent.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !vis(el)) continue
    if (el.closest('[aria-hidden=true]') && !dlg) continue
    const t = n.textContent.trim()
    testi.add(t.slice(0, 400))
    range.selectNodeContents(n)
    const r = range.getBoundingClientRect()
    if (r.width === 0) continue
    if ((r.right > W + 1 || r.left < -1) && !dentroScorrevole(el)) fuori.push(`schermo ${quale(el)} "${t.slice(0, 50)}" ${Math.round(r.left)}-${Math.round(r.right)}/${W}`)
    // Testo che esce dal contenitore con bordo o fondo più vicino.
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (s.display === 'inline') continue
      const b = p.getBoundingClientRect()
      if (r.right > b.right + 2 && !dentroScorrevole(el)) fuori.push(`riquadro ${quale(p)} "${t.slice(0, 50)}" testo ${Math.round(r.right)} > ${Math.round(b.right)}`)
      break
    }
    // Parola spezzata a metà: la stessa parola occupa due righe senza trattino morbido.
    const testo = n.textContent
    const re = /[\p{L}]{6,}/gu
    if (range.getClientRects().length > 1 && !testo.includes('\u00ad')) {
      for (let m = re.exec(testo); m; m = re.exec(testo)) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length)
        const righe = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)))
        if (righe.size > 1) spezzate.push(`${quale(el)} "${m[0]}"`)
      }
    }
  }
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el) || !el.childElementCount && !el.textContent.trim()) continue
    const s = getComputedStyle(el)
    const conTesto = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())
    if (!conTesto) continue
    const clipX = s.overflowX === 'hidden' || s.overflowX === 'clip'
    const clipY = s.overflowY === 'hidden' || s.overflowY === 'clip'
    if ((s.textOverflow === 'ellipsis' || clipX) && el.scrollWidth > el.clientWidth + 1) tagli.push(`largo ${quale(el)} "${el.textContent.trim().slice(0, 50)}" ${el.scrollWidth}/${el.clientWidth}`)
    if (clipY && el.scrollHeight > el.clientHeight + 2) tagli.push(`alto ${quale(el)} "${el.textContent.trim().slice(0, 50)}" ${el.scrollHeight}/${el.clientHeight}`)
  }
  for (const el of root.querySelectorAll('input,textarea,[aria-label],[title],img[alt]')) {
    if (!vis(el)) continue
    for (const a of ['placeholder', 'aria-label', 'title', 'alt']) { const v = el.getAttribute(a); if (v && v.trim()) testi.add(v.trim()) }
  }
  for (const o of root.querySelectorAll('option')) if (o.textContent.trim()) testi.add(o.textContent.trim())
  const hscroll = [document.documentElement, document.body, document.getElementById('root')].some((e) => e && e.scrollWidth > W + 1)
  return { dialogo: !!dlg, hscroll, testi: [...testi], tagli: [...new Set(tagli)], fuori: [...new Set(fuori)], spezzate: [...new Set(spezzate)], url: location.pathname, lang: document.documentElement.lang }
}

// ——— dati ———
const SERVIZI = [
  ['bagno', 'Bagno', 'principale', 'bagno', 30, 20], ['taglio', 'Taglio / tosatura', 'principale', 'taglio', 45, 30], ['bagno-taglio', 'Bagno + taglio', 'principale', 'bagno_taglio', 60, 35],
  ['stripping', 'Stripping', 'principale', undefined, 120, 50], ['nodi', 'Gestione nodi', 'extra', 'nodi', 20, 5], ['dermatologico', 'Dermatologico', 'extra', 'dermatologico', 15, 10],
  ['antiparassitario', 'Antiparassitario', 'extra', 'antiparassitario', 10, 12], ['unghie', 'Unghie', 'extra', undefined, 10, 5],
].map(([id, name, kind, iconKey, d, p], order) => ({ id, order, name, kind, ...(iconKey ? { iconKey } : {}), active: true, durationMin: { piccola: d, media: d + 15, grande: d + 30 }, price: { piccola: p, media: p + 8, grande: p + 18 } }))
const PIANI = {
  go: { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false },
  plus: { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false },
  salone: { piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true },
}
const ora0 = new Date()
const oggi = new Date(ora0.getFullYear(), ora0.getMonth(), ora0.getDate())
const adesso = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 15, 0, 0, 0)
const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

async function creaUtente(nome, extra = {}) {
  const email = `lingue-${nome}-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  return { uid: u.uid, email, ...extra }
}

async function creaSalone(codice, piano, { vuoto = false, online = false } = {}) {
  const p = await creaUtente(codice.toLowerCase(), { codice })
  const S = p.uid
  const vecchio = Date.now() - 864e6
  await db.doc(`accounts/${S}`).set({ uid: S, email: p.email, salonId: S, role: 'titolare', legacy: false, firstName: 'Tina', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nome = `Salone ${codice}`
  await db.doc(`salons/${S}/settings/main`).set({
    business: { salonName: nome, name: nome, phone: '+39 333 1112223', vatNumber: '01234567890', address: 'Via Roma 1, Cagliari' },
    tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
    ...(online ? { prenotazioniOnline: true, slug: `lingue-${codice.toLowerCase()}-${STAMP}`, linguaClienti: 'it' } : {}),
  })
  await db.doc(`salons/${S}/members/${S}`).set({ uid: S, email: p.email, role: 'titolare', firstName: 'Tina', lastName: 'QA', status: 'attivo' })
  await db.doc(`salons/${S}/pro/main`).set(PIANI[piano])
  for (const s of SERVIZI) await db.doc(`salons/${S}/services/${s.id}`).set({ ...s, createdAt: vecchio, updatedAt: vecchio })
  if (vuoto) return p
  const cane = async (id, name, extra = {}) => { await db.doc(`salons/${S}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Anna Rossi', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: vecchio, updatedAt: vecchio, ...extra }); return id }
  const fido = await cane(`dog-fido-${STAMP}`, 'Fido', { clientType: 'mensile', recurrenceWeeks: 4, sex: 'M', contacts: [{ id: 'c1', name: 'Anna Rossi', role: 'Proprietaria', phone: '+39 333 0000000', isPrimary: true }], criticalNote: 'Fido' })
  const rex = await cane(`dog-rex-${STAMP}`, 'Rex', { breed: 'Barboncino', size: 'media', sex: 'F' })
  const lilla = await cane(`dog-lilla-${STAMP}`, 'Lilla', { breed: 'Maltese', temperament: 'agitato', size: 'grande' })
  await cane(`dog-arch-${STAMP}`, 'Pippo', { status: 'non_in_cura' })
  const visita = async (id, v) => { const doc = { id, createdAt: vecchio, updatedAt: vecchio, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end.getTime() }; if (v.chiusoIl) doc.chiusoIl = v.chiusoIl.getTime(); await db.doc(`salons/${S}/appointments/${id}`).set(doc); return id }
  await visita(`apt-oggi1-${STAMP}`, { dogId: rex, start: at(oggi, 10), end: at(oggi, 10, 45), services: [riga('bagno', 'Bagno', 45, 28)], status: 'programmato' })
  await visita(`apt-oggi2-${STAMP}`, { dogId: lilla, start: at(oggi, 11), end: at(oggi, 11, 45), services: [riga('taglio', 'Taglio / tosatura', 45, 30)], status: 'programmato' })
  await visita(`apt-dopo-${STAMP}`, { dogId: rex, start: at(oggi, 17), end: at(oggi, 17, 45), services: [riga('bagno', 'Bagno', 45, 28)], status: 'programmato' })
  const domani = addDays(oggi, 1)
  const apt = await visita(`apt-fut-${STAMP}`, { dogId: fido, start: at(domani, 10), end: at(domani, 10, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'programmato' })
  const aptDone = await visita(`apt-fatta-${STAMP}`, { dogId: fido, start: at(addDays(oggi, -1), 15), end: at(addDays(oggi, -1), 15, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'completato', total: 20, paymentMethod: 'contanti', actualDurationMin: 45, chiusoIl: at(addDays(oggi, -1), 16) })
  await visita(`apt-fatta2-${STAMP}`, { dogId: rex, start: at(addDays(oggi, -3), 9), end: at(addDays(oggi, -3), 10), services: [riga('bagno-taglio', 'Bagno + taglio', 60, 45)], status: 'completato', total: 45, paymentMethod: 'pos', actualDurationMin: 60, chiusoIl: at(addDays(oggi, -3), 10, 10) })
  await visita(`apt-nv-${STAMP}`, { dogId: lilla, start: at(addDays(oggi, -2), 9), end: at(addDays(oggi, -2), 10), services: [riga('bagno', 'Bagno', 45, 28)], status: 'non_venuto' })
  await visita(`apt-dis-${STAMP}`, { dogId: rex, start: at(addDays(oggi, 3), 9), end: at(addDays(oggi, 3), 10), services: [riga('bagno', 'Bagno', 45, 28)], status: 'disdetto', cancelReason: 'cliente' })
  const pers = `per-${STAMP}`
  await db.doc(`salons/${S}/appointments/${pers}`).set({ id: pers, kind: 'personale', title: 'Dentista', dogId: '', services: [], status: 'programmato', start: at(addDays(oggi, 2), 14).getTime(), plannedEnd: at(addDays(oggi, 2), 15).getTime(), createdAt: vecchio, updatedAt: vecchio })
  const clo = `chi-${STAMP}`
  await db.doc(`salons/${S}/closures/${clo}`).set({ reason: 'Ferie', startDay: dayKey(addDays(oggi, 10)), endDay: dayKey(addDays(oggi, 12)), createdAt: vecchio, updatedAt: vecchio })
  if (online) {
    const dopodomani = addDays(oggi, 4)
    await db.doc(`salons/${S}/richieste/ric-${STAMP}`).set({ status: 'nuova', token: 'tok-' + STAMP, nome: 'Mario Bianchi', phone: '+39 333 2223334', email: 'cliente@example.test', cane: 'Pippo', razza: 'Meticcio', specie: 'cane', taglia: 'media', servizi: ['bagno'], start: at(dopodomani, 10).getTime(), end: at(dopodomani, 11).getTime(), createdAt: Date.now(), lingua: 'de' })
    await db.doc(`salons/${S}/attesa/att-${STAMP}`).set({ nome: 'Mario Bianchi', cane: 'Pippo', phone: '+39 333 2223334', email: 'cliente@example.test', stato: 'attivo', createdAt: Date.now(), token: 'tok2-' + STAMP, lingua: 'fr' })
  }
  return { ...p, dog: fido, apt, aptDone, pers, clo }
}

async function creaCollaboratore(salone) {
  const c = await creaUtente('c', { codice: 'C', dog: salone.dog, apt: salone.apt, aptDone: salone.aptDone, pers: salone.pers, clo: salone.clo })
  await db.doc(`accounts/${c.uid}`).set({ uid: c.uid, firstName: 'Carlo', lastName: 'QA', email: c.email, salonId: salone.uid, role: 'collaboratore', legacy: false })
  await db.doc(`salons/${salone.uid}/members/${c.uid}`).set({ uid: c.uid, email: c.email, role: 'collaboratore', firstName: 'Carlo', lastName: 'QA', status: 'attivo' })
  return c
}

function rotte(i) {
  const base = ['/', '/animali', '/animali/nuovo', '/animali/attesa', '/calendario', '/mensili', '/incassi', '/incassi/report', '/incassi/statistiche',
    '/listino', '/listino/vedi', '/listino/prezzi', '/listino/gestione', '/listino/stampa', '/impostazioni', '/impostazioni/account', '/impostazioni/suggerimenti',
    '/impostazioni/legale', '/impostazioni/licenze', '/impostazioni/info', '/impostazioni/servizi', '/impostazioni/archivio', '/impostazioni/pro', '/impostazioni/piano',
    '/impostazioni/team', '/impostazioni/abbonamento', '/impostazioni/abbonamento/pro', '/impostazioni/abbonamento/salone', '/impostazioni/notifiche', '/impostazioni/avvisi',
    '/impostazioni/aggiornamenti', '/impostazioni/privacy', '/impostazioni/account/elimina', '/benvenuto', '/appuntamenti/nuovo', '/appuntamenti/personale/nuovo', '/chiusure/nuovo']
  if (i.dog) base.push(`/animali/${i.dog}`, `/appuntamenti/${i.apt}`, `/appuntamenti/${i.aptDone}`, `/appuntamenti/personale/${i.pers}`, `/chiusure/${i.clo}`)
  return SOLO_ROTTE.length ? base.filter((r) => SOLO_ROTTE.some((s) => r === s || r.startsWith(s + '/dog') )) : base
}

async function aspettaStabile(page, max = 8000) {
  const t0 = Date.now(); let last = ''; let cambio = Date.now()
  while (Date.now() - t0 < max) {
    const t = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('img,svg,button').length + '|' + document.querySelectorAll('[aria-busy=true]').length).catch(() => '')
    if (t !== last) { last = t; cambio = Date.now() } else if (Date.now() - cambio > 500) return
    await page.waitForTimeout(100)
  }
}

async function apri(browser, persona, larghezza) {
  const ctx = await browser.newContext({ viewport: { width: larghezza, height: ALTEZZE[larghezza] || 800 }, timezoneId: 'Europe/Rome', locale: 'it-IT', hasTouch: false })
  await ctx.clock.setFixedTime(adesso)
  await ctx.addInitScript(() => { try { if (localStorage.getItem('groomly.lingua') === null) localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('**/*', (route) => {
    const url = route.request().url(); const host = new URL(url).hostname
    if (host === '127.0.0.1' || host === 'localhost') return route.continue()
    if (/fonts\.g/.test(url)) return route.continue()
    return route.abort()
  })
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').first().waitFor({ timeout: 30000 })
  await page.getByLabel('Email').first().fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await aspettaStabile(page, 10000)
  return { ctx, page }
}

const vai = (page, r) => page.evaluate((x) => { window.scrollTo(0, 0); window.history.pushState({}, '', x); window.dispatchEvent(new PopStateEvent('popstate')) }, r)

function valuta(m, lingua) {
  const estranee = []
  for (const t of m.testi) { const e = classifica(t, lingua); if (e) estranee.push({ testo: t.slice(0, 120), ...e }) }
  return estranee
}

const risultati = []
function salva(rec) {
  risultati.push(rec)
  fs.appendFileSync(path.join(OUT, 'giro.jsonl'), JSON.stringify(rec) + '\n')
}
const slug = (r) => (r === '/' ? 'home' : r.slice(1).replace(/[\/:]/g, '_')).replace(/-[a-z0-9]{8,}$/, '')

async function misura(page, base, rotta, foto) {
  const m = await page.evaluate(MISURA)
  const rec = { ...base, rotta, url: m.url, dialogo: m.dialogo, lang: m.lang, hscroll: m.hscroll, estranee: valuta(m, base.lingua), tagli: m.tagli, fuori: m.fuori, spezzate: m.spezzate, frasi: m.testi.length }
  salva(rec)
  if (foto) await page.screenshot({ path: foto, fullPage: !m.dialogo }).catch(() => {})
  return rec
}

// Pulsanti da non toccare nel giro dei dialoghi: portano fuori dalla pagina o cancellano i dati di prova.
const VIETATI = ['homeEsci', 'esci', 'eliminaAccount']
async function esplora(page, base, rotta, cartella) {
  const pulsanti = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    return [...document.querySelectorAll('main button, main [role=button], main [role=tab], button')].filter((b) => vis(b) && !b.disabled && !b.closest('nav')).length
  })
  const visti = new Set()
  for (let i = 0; i < Math.min(pulsanti, 40); i++) {
    await vai(page, '/__x'); await vai(page, rotta); await aspettaStabile(page, 3000)
    const prima = await page.evaluate(() => document.body.innerText)
    const nome = await page.evaluate((idx) => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
      const b = [...document.querySelectorAll('main button, main [role=button], main [role=tab], button')].filter((x) => vis(x) && !x.disabled && !x.closest('nav'))[idx]
      if (!b) return null
      if (b.type === 'submit') return null
      const t = (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40)
      b.setAttribute('data-giro', '1'); return t
    }, i)
    if (nome === null) continue
    await page.locator('[data-giro="1"]').first().click({ timeout: 1500, force: true }).catch(() => {})
    await page.waitForTimeout(350)
    const dopo = await page.evaluate(() => ({ t: document.body.innerText, u: location.pathname, d: !!document.querySelector('[role=dialog],[role=alertdialog]') }))
    if (dopo.u !== rotta || (!dopo.d && dopo.t === prima)) continue
    const firma = dopo.t.slice(0, 200)
    if (visti.has(firma)) continue
    visti.add(firma)
    await misura(page, { ...base, tocco: nome }, rotta, cartella ? path.join(cartella, `${slug(rotta)}-${i}.png`) : null)
  }
}

async function main() {
  fs.writeFileSync(path.join(OUT, 'giro.jsonl'), '')
  const persone = {}
  if (RUOLI.includes('T') || RUOLI.includes('C')) persone.T = await creaSalone('T', 'salone', { online: true })
  if (RUOLI.includes('C')) persone.C = await creaCollaboratore(persone.T)
  if (RUOLI.includes('P')) persone.P = await creaSalone('P', 'plus', { online: true })
  if (RUOLI.includes('G')) persone.G = await creaSalone('G', 'go')
  if (RUOLI.includes('V')) persone.V = await creaSalone('V', 'salone', { vuoto: true })
  fs.writeFileSync(path.join(OUT, 'persone.json'), JSON.stringify(persone, null, 1))
  const browser = await chromium.launch()
  const lavori = []
  for (const r of RUOLI) for (const l of LARGHEZZE) lavori.push({ r, l })
  let fatto = 0
  const operaio = async () => {
    for (;;) {
      const lavoro = lavori.shift(); if (!lavoro) return
      const { ctx, page } = await apri(browser, persone[lavoro.r], lavoro.l)
      for (const lingua of LINGUE) {
        await page.evaluate((x) => localStorage.setItem('groomly.lingua', x), lingua)
        await page.goto(`${APP}/`); await aspettaStabile(page, 10000)
        const cartella = FOTO ? path.join(OUT, 'foto', `${lavoro.r}-${lavoro.l}-${lingua}`) : null
        if (cartella) fs.mkdirSync(cartella, { recursive: true })
        for (const rotta of rotte(persone[lavoro.r])) {
          const base = { ruolo: lavoro.r, larghezza: lavoro.l, lingua }
          try {
            await vai(page, rotta); await aspettaStabile(page)
            const rec = await misura(page, base, rotta, cartella ? path.join(cartella, `${slug(rotta)}.png`) : null)
            await page.keyboard.press('Escape').catch(() => {})
            if (DIALOGHI) await esplora(page, base, rotta, cartella)
            fatto++
            if (rec.estranee.length || rec.hscroll || rec.fuori.length || rec.tagli.length || rec.spezzate.length) console.log(`${lavoro.r} ${lavoro.l} ${lingua} ${rotta} estranee=${rec.estranee.length} tagli=${rec.tagli.length} fuori=${rec.fuori.length} spezzate=${rec.spezzate.length} hscroll=${rec.hscroll}`)
          } catch (e) { salva({ ...base, rotta, errore: String(e).slice(0, 200) }); console.log('ERRORE', lavoro.r, lavoro.l, lingua, rotta, String(e).slice(0, 120)) }
        }
      }
      await ctx.close()
    }
  }
  await Promise.all(Array.from({ length: PARALLELI }, operaio))
  await browser.close()
  console.log(`FATTO ${fatto} pagine, ${risultati.length} misure`)
}
module.exports = { MISURA, valuta, FRASI, aspettaStabile, chromium, db, auth, APP, PASSWORD, creaUtente }
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
