// Giro di misura «basse Grafica»: contrasto, area toccabile, testo tagliato e scorrimento orizzontale su ogni rotta.
// Solo emulatori demo-groomly (Firestore 8080, Auth 9099) e app Vite del ramo in modo emu (default 127.0.0.1:5180).
// Tre saloni nuovi a ogni giro (firebase-admin): Go (piano base), Plus (piano pro), Salone titolare (piano salone).
// In ognuno: 8 servizi predefiniti (SERVICE_SEED), 3 cani con nomi brevi, visite di oggi già passate, una futura da 45 min,
// una completata, un impegno personale, una chiusura. Si cancella tutto alla fine, salvo --keep.
// Regole (vedi il piano): contrasto testo >= 4,5:1 (>= 3:1 se >= 18,66 px grassetto o >= 24 px); zona toccabile >= 40x40 px;
// nessun elemento con text-overflow: ellipsis e scrollWidth > clientWidth; nessuno scorrimento orizzontale della pagina.
// Oltre al giro ci sono i casi mirati (B1 backup, D1 durata, T1 toast, A1 «← Animali», L1 listino vuoto, E1 lingua, N1 nome lungo, NAV barra in basso),
// ognuno con screenshot in QA-tests/results/basse-grafica/caso-*.png. Servono due saloni in piu': «casi» (piano Go, con un servizio da 65 min
// e un cane con visite da 65 min) e «lungo» (piano Salone, nome di 40 caratteri).
// Uso: node QA-tests/.qa-catalog/verify-basse-grafica.cjs [--app=http://127.0.0.1:5180] [--giro] [--solo=G,P,T,B1,D1,...] [--keep]
//        [--larghezze=320,360,390] [--temi=light,dark]
//   senza --giro e senza --solo : tutti i casi mirati.
//   --giro  : aggiunge il giro (tutte le rotte), scrive QA-tests/results/basse-grafica/giro-<stamp>.json.
//   --solo  : codici da eseguire. Ruoli del giro: G = Go, P = Plus, T = Salone titolare (senza --giro: solo Home, prima larghezza e primo tema).
//             Casi: B1, D1, T1, A1, L1, E1, N1, NAV. Un codice sconosciuto -> uscita 2.
//   Esce 1 se c'e' una violazione, una rotta non misurata o un caso fallito.
// Il giorno dei dati e l'orologio del browser sono in Europe/Rome, come l'app, qualunque sia il fuso di questo computer.
process.env.TZ = 'Europe/Rome'
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
const CODICI_CASI = ['B1', 'D1', 'T1', 'A1', 'L1', 'E1', 'N1', 'NAV']
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
// Solo nel salone dei casi: un servizio da 65 minuti per ogni taglia (D1: «1h05»).
const SERVIZIO_LUNGO = { id: 'trattamento', order: 8, name: 'Trattamento lungo', kind: 'principale', active: true, durationMin: { piccola: 65, media: 65, grande: 65 }, price: { piccola: 40, media: 40, grande: 40 } }
// Come scrive functions/src/piano/scriviPiano.ts.
const PIANO_GO = { piano: 'base', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false }
const PIANO_PLUS = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 0, seatsExtra: 0, seats: 0, enabled: false }
const PIANO_SALONE = { piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null, provaUsata: true, seatsIncluded: 3, seatsExtra: 0, seats: 3, enabled: true }
const RUOLI_TUTTI = [
  { codice: 'G', nome: 'go', cognome: 'Gino', pro: PIANO_GO },
  { codice: 'P', nome: 'plus', cognome: 'Paola', pro: PIANO_PLUS },
  { codice: 'T', nome: 'titolare', cognome: 'Tina', pro: PIANO_SALONE },
]
const SOLO_RUOLI = RUOLI_TUTTI.filter((r) => SOLO.includes(r.codice))
// Ruoli del giro: quelli scelti con --solo; con --giro e nessun ruolo scelto, tutti; altrimenti nessuno (solo casi).
const RUOLI = SOLO_RUOLI.length ? SOLO_RUOLI : (GIRO ? RUOLI_TUTTI : [])
// Casi: quelli scelti; senza --solo, tutti; con soli ruoli scelti, nessuno.
const CASI_SCELTI = SOLO.some((s) => CODICI_CASI.includes(s)) ? CODICI_CASI.filter((c) => SOLO.includes(c)) : (SOLO.length ? [] : CODICI_CASI)
// Saloni dei casi (non fanno parte del giro).
const NOME_40 = 'Toelettatura Il Pelo Lunghissimo di Anna'
const SALONE_CASI = { codice: 'C', nome: 'casi', cognome: 'Casi', pro: PIANO_GO, extra: true }
const SALONE_LUNGO = { codice: 'N', nome: 'lungo', cognome: 'Lungo', pro: PIANO_SALONE, salonName: NOME_40 }

const at = (d, h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Oggi (a Roma) e un "adesso" fisso alle 15:00: indipendenti dall'ora in cui gira lo script (il browser ha lo stesso orologio fisso).
const ora0 = new Date()
const oggi = new Date(ora0.getFullYear(), ora0.getMonth(), ora0.getDate())
const adesso = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 15, 0, 0, 0)
const riga = (serviceId, name, durationMin, price) => ({ serviceId, name, durationMin, price })

const creati = []
async function creaSalone(ruolo) {
  const email = `grafica-${ruolo.nome}-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: PASSWORD, emailVerified: true })
  creati.push(u.uid)
  const S = u.uid
  const vecchio = Date.now() - 864e6
  await db.doc(`accounts/${S}`).set({ uid: S, email, salonId: S, role: 'titolare', legacy: false, firstName: ruolo.cognome, lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  const nomeSalone = ruolo.salonName || `Salone ${ruolo.cognome}`
  await db.doc(`salons/${S}/settings/main`).set({ business: { salonName: nomeSalone, name: nomeSalone, phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${S}/pro/main`).set(ruolo.pro)
  const servizi = ruolo.extra ? [...SERVIZI, SERVIZIO_LUNGO] : SERVIZI
  for (const s of servizi) await db.doc(`salons/${S}/services/${s.id}`).set({ ...s, createdAt: vecchio, updatedAt: vecchio })
  const cane = async (id, name, extra = {}) => {
    await db.doc(`salons/${S}/dogs/${id}`).set({ id, name, species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Anna Rossi', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: name.toLowerCase(), createdAt: vecchio, updatedAt: vecchio, ...extra })
    return id
  }
  const fido = await cane(`dog-fido-${STAMP}`, 'Fido', { clientType: 'mensile', recurrenceWeeks: 4, contacts: [{ id: 'c1', name: 'Anna Rossi', role: 'Proprietaria', phone: '+39 333 0000000', isPrimary: true }] })
  const rex = await cane(`dog-rex-${STAMP}`, 'Rex', { breed: 'Barboncino', size: 'media' })
  const lilla = await cane(`dog-lilla-${STAMP}`, 'Lilla', { breed: 'Maltese', temperament: 'agitato' })
  // Cane con due visite completate da 65 minuti: durata media «1h05» (solo nel salone dei casi).
  const bruno = ruolo.extra ? await cane(`dog-bruno-${STAMP}`, 'Bruno', { breed: 'Labrador' }) : ''
  const visita = async (id, v) => {
    const doc = { id, createdAt: vecchio, updatedAt: vecchio, kind: 'pelosetto', ...v, start: v.start.getTime(), end: v.end.getTime() }
    if (v.chiusoIl) doc.chiusoIl = v.chiusoIl.getTime()
    await db.doc(`salons/${S}/appointments/${id}`).set(doc)
    return id
  }
  // oggi, già passate (da chiudere in Home)
  const passata1 = at(oggi, 10).getTime()
  const passata2 = at(oggi, 11).getTime()
  await visita(`apt-oggi1-${STAMP}`, { dogId: rex, start: new Date(passata1), end: new Date(passata1 + 45 * 60000), services: [riga('bagno', 'Bagno', 45, 28)], status: 'programmato' })
  await visita(`apt-oggi2-${STAMP}`, { dogId: lilla, start: new Date(passata2), end: new Date(passata2 + 45 * 60000), services: [riga('taglio', 'Taglio / tosatura', 45, 30)], status: 'programmato' })
  // futura da 45 min
  const domani = addDays(oggi, 1)
  const apt = await visita(`apt-fut-${STAMP}`, { dogId: fido, start: at(domani, 10), end: at(domani, 10, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'programmato' })
  // completate (ieri e tre giorni fa) per Incassi
  const aptDone = await visita(`apt-fatta-${STAMP}`, { dogId: fido, start: at(addDays(oggi, -1), 15), end: at(addDays(oggi, -1), 15, 45), services: [riga('bagno', 'Bagno', 45, 20)], status: 'completato', total: 20, paymentMethod: 'contanti', actualDurationMin: 45, chiusoIl: at(addDays(oggi, -1), 16) })
  await visita(`apt-fatta2-${STAMP}`, { dogId: rex, start: at(addDays(oggi, -3), 9), end: at(addDays(oggi, -3), 10), services: [riga('bagno-taglio', 'Bagno + taglio', 60, 45)], status: 'completato', total: 45, paymentMethod: 'pos', actualDurationMin: 60, chiusoIl: at(addDays(oggi, -3), 10, 10) })
  if (bruno) {
    for (const [n, giorni] of [[1, 5], [2, 9]]) await visita(`apt-bruno${n}-${STAMP}`, { dogId: bruno, start: at(addDays(oggi, -giorni), 11), end: at(addDays(oggi, -giorni), 12, 5), services: [riga('bagno-taglio', 'Bagno + taglio', 65, 45)], status: 'completato', total: 45, paymentMethod: 'contanti', actualDurationMin: 65, chiusoIl: at(addDays(oggi, -giorni), 12, 10) })
  }
  // impegno personale
  const pers = `per-${STAMP}`
  await db.doc(`salons/${S}/appointments/${pers}`).set({ id: pers, kind: 'personale', title: 'Dentista', dogId: '', services: [], status: 'programmato', start: at(addDays(oggi, 2), 14).getTime(), plannedEnd: at(addDays(oggi, 2), 15).getTime(), createdAt: vecchio, updatedAt: vecchio })
  // chiusura
  const clo = `chi-${STAMP}`
  await db.doc(`salons/${S}/closures/${clo}`).set({ reason: 'Ferie', startDay: dayKey(addDays(oggi, 10)), endDay: dayKey(addDays(oggi, 12)), createdAt: vecchio, updatedAt: vecchio })
  return { ...ruolo, uid: S, email, dog: fido, bruno, apt, aptDone, pers, clo }
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
// Contrasto: da giro.cjs (CHECK, parte lowContrast); soglie del piano. Il colore del testo e' fuso con l'opacita' dell'elemento e dei suoi antenati
// e con il suo alfa, sopra i fondi (anche semitrasparenti) impilati fino al primo opaco. Fondi con immagine/gradiente o colori non rgb
// (lab, oklch...) non sono misurabili: finiscono in `nonMisurabile`, non fra le violazioni. Input/textarea/select (valore, segnaposto) non sono misurati.
const MISURA_CONTRASTO_TAGLI = () => {
  const W = innerWidth
  const dlg = [...document.querySelectorAll('[role=dialog][aria-modal=true]')].pop()
  const root = dlg || document.body
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0' }
  // rgb(r g b / a), rgba(r, g, b, a), color(srgb r g b / a) -> { r, g, b, a } in 0..255; altro -> null
  const parse = (c) => {
    const m = c.match(/^(rgba?|color\(srgb)\s*\(?([^)]*)\)?$/); if (!m) return null
    const n = m[2].replace('/', ' ').split(/[\s,]+/).filter(Boolean).map(Number); if (n.length < 3 || n.some(Number.isNaN)) return null
    const k = m[1] === 'color(srgb' ? 255 : 1
    return { r: n[0] * k, g: n[1] * k, b: n[2] * k, a: n[3] === undefined ? 1 : n[3] }
  }
  const mix = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 })
  const lum = ({ r, g, b }) => { const [R, G, B] = [r, g, b].map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * R + 0.7152 * G + 0.0722 * B }
  // sfondo effettivo: strati dal piu' vicino al primo opaco; null se non misurabile
  const fondo = (el) => {
    const strati = []
    let opaco = false
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (s.backgroundImage && s.backgroundImage !== 'none') return null
      const c = parse(s.backgroundColor); if (!c) return null
      if (c.a > 0) strati.push(c)
      if (c.a >= 0.999) { opaco = true; break }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    if (!opaco) { const cb = parse(getComputedStyle(document.documentElement).backgroundColor); if (cb && cb.a >= 0.999) base = cb }
    for (const c of strati.reverse()) base = mix(c, base)
    return base
  }
  const quale = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`
  const contrasto = []; const nonMisurabile = []
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el)) continue
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
    if (!own || el.closest('[disabled],[aria-disabled=true]')) continue
    const s = getComputedStyle(el)
    const txt = `"${own.slice(0, 40)}" ${s.color} ${quale(el)}`
    const fg0 = parse(s.color); if (!fg0) { nonMisurabile.push(`colore non rgb ${txt}`); continue }
    const bg = fondo(el); if (!bg) { nonMisurabile.push(`sfondo con immagine/gradiente o non rgb ${txt}`); continue }
    let op = 1; for (let p = el; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity)
    const fg = mix({ ...fg0, a: fg0.a * op }, bg)
    const l1 = lum(fg); const l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const px = parseFloat(s.fontSize)
    const min = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700) ? 3 : 4.5
    if (ratio < min) contrasto.push(`${ratio.toFixed(2)} (min ${min}) "${own.slice(0, 40)}" ${s.color}${op < 1 ? ' op ' + op.toFixed(2) : ''} ${s.fontSize}/${s.fontWeight} ${quale(el)}`)
  }
  const tagli = [...root.querySelectorAll('*')].filter((el) => vis(el) && getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
    .map((el) => `${quale(el)} "${(el.innerText || el.textContent || '').trim().slice(0, 40)}" ${el.scrollWidth}/${el.clientWidth}`)
  const hscroll = [document.documentElement, document.body, document.getElementById('root')].some((e) => e && e.scrollWidth > W + 1)
  return { dialog: !!dlg, hscroll, contrasto: [...new Set(contrasto)], nonMisurabile: [...new Set(nonMisurabile)], tagli: [...new Set(tagli)] }
}

// Tocco: ogni controllo visibile, portato al centro, deve essere raggiungibile nei 4 punti a 20 px dal centro (19,5: un controllo di 40 px esatti
// passa; soglia effettiva ~39,5 px), limitati solo allo schermo: ogni punto cade sull'elemento o su un suo discendente. Dunque almeno 40x40 px liberi.
// Una zona estesa con ::after conta (elementFromPoint restituisce il proprietario). I punti stanno sugli assi, non sugli angoli.
// Eccezioni, tutte con motivo:
//  - disabilitati: non si toccano;
//  - barre del grafico di Incassi (.earnings-plot button): colonne strette per forza, altre mille barre per giorno;
//  - celle della griglia del Calendario (rotta /calendario: i pulsanti dentro [role=grid] che non sono visite, cioe' le caselle del mese e le ore libere del giorno): griglia fitta per forza;
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
    if (inCalendario && el.tagName === 'BUTTON' && !el.hasAttribute('data-apri') && el.closest('[role=grid]')) return true
    if (el.tagName === 'A' && el.parentElement && [...el.parentElement.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim())) return true
    return false
  }
  const fuori = []
  for (const el of [...root.querySelectorAll(sel)].filter(vis)) {
    if (eccezione(el)) continue
    el.scrollIntoView({ block: 'center', inline: 'center' })
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const cx = r.left + r.width / 2; const cy = r.top + r.height / 2
    const cl = (v, max) => Math.min(Math.max(v, 1), max - 1)
    const punti = [[cx - 19.5, cy], [cx + 19.5, cy], [cx, cy - 19.5], [cx, cy + 19.5]].map(([x, y]) => [cl(x, innerWidth), cl(y, innerHeight)])
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

async function apri(browser, persona, larghezza, tema, opz = {}) {
  const ctx = await browser.newContext({ viewport: { width: larghezza, height: opz.altezza || ALTEZZE[larghezza] || 800 }, timezoneId: 'Europe/Rome', locale: 'it-IT', colorScheme: tema })
  // Italiano per entrare; una lingua scelta dopo (cambiaLingua) non viene riscritta dal ricaricamento.
  await ctx.clock.setFixedTime(adesso)
  await ctx.addInitScript(() => { try { if (localStorage.getItem('groomly.lingua') === null) localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  // Le funzioni callable non girano negli emulatori di questo giro: risposta finta, mai verso la produzione.
  await ctx.route('**/*', (route) => {
    const url = route.request().url(); const host = new URL(url).hostname
    if (host === '127.0.0.1' || host === 'localhost') return url.startsWith('http://127.0.0.1:5001/') ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }) : route.continue()
    if (/groomly-3128b|firebaseio\.com|googleapis\.com\/(?!css)|cloudfunctions\.net|brevo|sendinblue|github\.com|githubusercontent/.test(url) && !/fonts\.googleapis/.test(url)) return route.abort()
    return route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').first().waitFor({ timeout: 15000 }).catch(async () => { await page.screenshot({ path: path.join(SHOTS, 'login-fallito.png') }); console.log(await page.locator('body').innerText().catch(() => '?')) })
  await page.getByLabel('Email').first().fill(persona.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(2500)
  await aspettaStabile(page, Date.now(), 15000)
  return { ctx, page }
}

// Reindirizzi attesi per ruolo (rotta chiesta -> pagina finale), con il motivo. Qualsiasi altro reindirizzo e' un fallimento.
const REINDIRIZZI = {
  '*': { '/impostazioni/utenti': ['/impostazioni', 'pagina vecchia: porta alle impostazioni'], '/pagina-che-non-esiste': ['/', 'rotta sconosciuta: torna alla Home'] },
  G: { '/animali/attesa': ['/animali', 'senza richieste online la lista d\'attesa porta ad Animali'], '/impostazioni/pro': ['/impostazioni/abbonamento', 'Go: la gestione Plus rimanda all\'abbonamento (pagina esclusa)'], '/impostazioni/team': ['/impostazioni/abbonamento', 'Go: il team rimanda all\'abbonamento (pagina esclusa)'] },
  P: { '/impostazioni/pro': ['/impostazioni/abbonamento', 'Plus: senza salone la gestione rimanda all\'abbonamento (pagina esclusa)'], '/impostazioni/team': ['/impostazioni/abbonamento', 'Plus: il team rimanda all\'abbonamento (pagina esclusa)'] },
  T: { '/impostazioni/pro': ['/impostazioni/team', 'Salone: la gestione porta al team'] },
}
const attesoRedirect = (ruolo, rotta) => (REINDIRIZZI[ruolo] || {})[rotta] || REINDIRIZZI['*'][rotta]

async function giro(browser, persone) {
  const risultati = []
  for (const persona of persone) for (const larghezza of LARGHEZZE) for (const tema of TEMI) {
    const { ctx, page } = await apri(browser, persona, larghezza, tema)
    const elenco = GIRO ? rotte(persona) : ['/']
    for (const rotta of elenco) {
      await page.evaluate((r) => { window.scrollTo(0, 0); window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, rotta)
      const ancoraCarica = await aspettaStabile(page, Date.now())
      const finalUrl = new URL(page.url()).pathname
      const rid = attesoRedirect(persona.codice, rotta)
      const redirectNoto = finalUrl !== rotta && rid && rid[0] === finalUrl
      const saltata = SALTATE.some((x) => x.test(finalUrl))
      const motivi = [] // perche' la rotta non e' stata misurata o e' fallita
      if (finalUrl !== rotta && !redirectNoto) motivi.push(`reindirizzo imprevisto a ${finalUrl}`)
      if (ancoraCarica) motivi.push('ancora in caricamento')
      let m = { dialog: false, hscroll: false, contrasto: [], nonMisurabile: [], tagli: [] }; let tocco = []
      if (!saltata) {
        try { m = await page.evaluate(MISURA_CONTRASTO_TAGLI); tocco = await page.evaluate(MISURA_TOCCO) } catch (e) { motivi.push(`misura fallita: ${String(e).slice(0, 150)}`) }
      }
      if (!GIRO) await page.screenshot({ path: path.join(SHOTS, `home-${persona.codice}-${larghezza}-${tema}.png`) }).catch(() => {})
      const rec = { ruolo: persona.codice, larghezza, tema, rotta, finalUrl, dialog: m.dialog, saltata, ...(redirectNoto ? { redirectAtteso: rid[1] } : {}), contrasto: m.contrasto, tocco, tagli: m.tagli, hscroll: m.hscroll, nonMisurabile: m.nonMisurabile, nonMisurata: motivi }
      risultati.push(rec)
      console.log(`${persona.codice} ${larghezza} ${tema} ${rotta}${finalUrl !== rotta ? ' -> ' + finalUrl : ''}${m.dialog ? ' [dialog]' : ''} contrasto=${rec.contrasto.length} tocco=${rec.tocco.length} tagli=${rec.tagli.length} hscroll=${rec.hscroll} nonMisurabile=${m.nonMisurabile.length}${motivi.length ? ' NON MISURATA: ' + motivi.join('; ') : ''}`)
      await page.keyboard.press('Escape').catch(() => {})
      if (GIRO) fs.writeFileSync(FILE_GIRO, JSON.stringify(risultati, null, 1))
    }
    await ctx.close()
  }
  return risultati
}

// Esce 1 se c'e' una violazione o una rotta non misurata (reindirizzo imprevisto, caricamento, errore di misura).
function riepilogo(risultati) {
  const perRotta = new Map()
  for (const r of risultati) {
    const v = perRotta.get(r.rotta) || { contrasto: new Set(), tocco: new Set(), tagli: new Set(), hscroll: false, non: new Set(), nonMis: new Set(), dialog: false }
    r.contrasto.forEach((x) => v.contrasto.add(x)); r.tocco.forEach((x) => v.tocco.add(x)); r.tagli.forEach((x) => v.tagli.add(x)); if (r.hscroll) v.hscroll = true
    r.nonMisurata.forEach((x) => v.non.add(`${r.ruolo} ${r.larghezza} ${r.tema}: ${x}`)); r.nonMisurabile.forEach((x) => v.nonMis.add(x)); if (r.dialog) v.dialog = true
    perRotta.set(r.rotta, v)
  }
  let totale = 0; let non = 0; let nonMis = 0
  for (const [rotta, v] of perRotta) {
    const n = v.contrasto.size + v.tocco.size + v.tagli.size + (v.hscroll ? 1 : 0)
    totale += n; non += v.non.size; nonMis += v.nonMis.size
    if (n || v.non.size) console.log(`${rotta}${v.dialog ? ' [dialog]' : ''}: contrasto ${v.contrasto.size}, tocco ${v.tocco.size}, tagli ${v.tagli.size}${v.hscroll ? ', scorrimento orizzontale' : ''}${v.non.size ? `, NON MISURATA ${v.non.size} volte` : ''}`)
    for (const x of v.non) console.log(`   non misurata - ${x}`)
  }
  console.log(`\nMisurate in un foglio (dialog): ${[...perRotta].filter(([, v]) => v.dialog).map(([r]) => r).join(', ') || 'nessuna'}`)
  if (nonMis) {
    console.log(`\nContrasto non misurabile (sfondo con gradiente/immagine o colore non rgb; non sono violazioni): ${nonMis} voci distinte`)
    const tutte = new Set(); for (const v of perRotta.values()) v.nonMis.forEach((x) => tutte.add(x))
    for (const x of [...tutte].slice(0, 15)) console.log(`   ${x}`)
  }
  console.log(`\nRotte misurate: ${perRotta.size}; violazioni distinte: ${totale}; rotte non misurate: ${non}`)
  return totale > 0 || non > 0
}

// ——— casi mirati ———
// Ogni caso apre le sue sessioni con `sessione(persona, larghezza, tema, opz)` e torna { ok, note, shot? }.
const vai = async (page, rotta) => {
  await page.evaluate((r) => { window.scrollTo(0, 0); window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, rotta)
  return aspettaStabile(page, Date.now())
}
const foto = async (page, nome) => { const f = path.join(SHOTS, `caso-${nome}.png`); await page.screenshot({ path: f }).catch(() => {}); return f }
// Lingua dell'app: localStorage prima del caricamento (l'accesso e' gia' fatto in italiano), poi si ricarica.
const cambiaLingua = async (page, lingua) => {
  await page.evaluate((l) => localStorage.setItem('groomly.lingua', l), lingua)
  await page.reload()
  await page.waitForTimeout(1500)
  await aspettaStabile(page, Date.now(), 15000)
}
const colorePulito = (page, variabile) => page.evaluate((v) => { const p = document.createElement('span'); p.style.color = `var(${v})`; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c }, variabile)
const pillolaBackup = (page) => page.evaluate(() => {
  const riga = document.querySelector('button[aria-label^="Backup."]'); if (!riga) return null
  const pill = [...riga.querySelectorAll('span')].find((s) => s.children.length === 1 && s.firstElementChild.tagName === 'SPAN' && s.firstElementChild.getAttribute('aria-hidden') === 'true')
  return pill ? { testo: pill.textContent.trim(), colore: getComputedStyle(pill).color, aria: riga.getAttribute('aria-label') } : null
})
const interseca = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
const rr = (r) => `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`

const CASI = {
  // Go senza backup: pillola gialla; «Completo con foto» -> «Oggi…» e backup.lastAt in Firestore.
  async B1({ sessione, persone }) {
    const p = persone.C; const page = await sessione(p, 390)
    await vai(page, '/impostazioni')
    const warn = await colorePulito(page, '--warn')
    const ok = await colorePulito(page, '--ok')
    const prima = await pillolaBackup(page)
    if (!prima) return { ok: false, note: 'pillola del backup non trovata', shot: await foto(page, 'B1-nopillola') }
    const shotPrima = await foto(page, 'B1-prima')
    if (prima.colore !== warn) return { ok: false, note: `pillola "${prima.testo}" colore ${prima.colore}, atteso --warn ${warn}; riga "${prima.aria}"`, shot: shotPrima }
    await page.locator('button[aria-label^="Backup."]').click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ timeout: 10000 })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      dialog.getByRole('button', { name: 'Completo con foto', exact: true }).click(),
    ])
    await page.waitForFunction(() => /Oggi/.test(document.querySelector('button[aria-label^="Backup."]')?.getAttribute('aria-label') || ''), null, { timeout: 30000 }).catch(() => {})
    const dopo = await pillolaBackup(page)
    let lastAt = null
    for (let i = 0; i < 30 && !lastAt; i++) { lastAt = ((await db.doc(`salons/${p.uid}/settings/main`).get()).data() || {}).backup?.lastAt || null; if (!lastAt) await page.waitForTimeout(500) }
    const shot = await foto(page, 'B1-dopo')
    if (!dopo || !/Oggi/.test(dopo.testo)) return { ok: false, note: `dopo il backup la riga dice "${dopo?.testo}" invece di «Oggi…»`, shot }
    if (!lastAt || Number.isNaN(Date.parse(lastAt))) return { ok: false, note: `backup.lastAt assente in Firestore (${lastAt})`, shot }
    if (dopo.colore !== ok) return { ok: false, note: `dopo il backup la pillola "${dopo.testo}" ha colore ${dopo.colore}, atteso --ok ${ok}`, shot }
    return { ok: true, note: `prima "${prima.testo}" = --warn ${warn}; scaricato ${download.suggestedFilename()}; dopo "${dopo.testo}" = --ok ${ok}; lastAt ${lastAt}`, shot }
  },

  // Durata media 65 min -> «1h05» nella scheda; servizio da 65 min -> «1h05» nel modulo nuovo appuntamento.
  async D1({ sessione, persone }) {
    const p = persone.C; const page = await sessione(p, 390)
    await vai(page, `/animali/${p.bruno}`)
    const media = await page.evaluate(() => { const l = [...document.querySelectorAll('small')].find((x) => x.textContent.trim() === 'Durata media'); return l ? l.nextElementSibling?.textContent.trim() : null })
    const shotScheda = await foto(page, 'D1-scheda')
    if (media !== '1h05') return { ok: false, note: `durata media nella scheda: ${JSON.stringify(media)}, attesa "1h05"`, shot: shotScheda }
    await vai(page, `/appuntamenti/nuovo?cane=${p.bruno}`)
    const bottone = page.getByRole('button', { name: /^Trattamento lungo/ })
    await bottone.waitFor({ timeout: 15000 })
    const etichetta = await bottone.getAttribute('aria-label')
    // il modulo propone gia' un servizio: si tolgono gli altri, cosi' il totale e' solo quello da 65 minuti
    const altri = page.locator('button[aria-pressed="true"][aria-label*="· €"]')
    for (let i = 0; i < 6 && await altri.count(); i++) await altri.first().click()
    await bottone.click()
    const totale = await page.getByTestId('services-total').textContent({ timeout: 10000 })
    const shot = await foto(page, 'D1-modulo')
    if (!/1h05/.test(etichetta || '') || !/1h05/.test(totale || '')) return { ok: false, note: `servizio "${etichetta}", totale "${totale}": manca "1h05"`, shot }
    return { ok: true, note: `scheda "${media}"; servizio "${etichetta}"; totale "${totale}"`, shot }
  },

  // Home: «Non venuto» -> toast senza «·» e con «Annulla».
  async T1({ sessione, persone }) {
    const page = await sessione(persone.C, 390)
    await vai(page, '/')
    await page.getByRole('button', { name: /^Non venuto /i }).first().click({ timeout: 15000 })
    const toast = page.getByRole('status')
    await toast.waitFor({ timeout: 5000 })
    const testo = (await toast.textContent()) || ''
    const annulla = await toast.getByRole('button', { name: 'Annulla', exact: true }).count()
    const shot = await foto(page, 'T1-toast')
    if (testo.includes('·')) return { ok: false, note: `il toast contiene «·»: "${testo}"`, shot }
    if (!annulla) return { ok: false, note: `il toast non ha «Annulla»: "${testo}"`, shot }
    return { ok: true, note: `toast "${testo}" senza «·», con «Annulla»`, shot }
  },

  // Scheda cane: dopo lo scorrimento in fondo «← Animali» (48x48) non copre ne' i pulsanti di chiamata ne' «Galleria».
  async A1({ sessione, persone }) {
    const p = persone.C; const note = []; let shotUltimo = ''
    for (const [w, h] of [[390, 844], [844, 390]]) {
      const page = await sessione(p, w, 'light', { altezza: h })
      await vai(page, `/animali/${p.dog}`)
      await page.waitForTimeout(500)
      // porta in fondo ogni contenitore scorrevole (la pagina o il suo riquadro)
      await page.evaluate(() => {
        for (const el of [document.scrollingElement, ...document.querySelectorAll('*')]) {
          if (!el) continue
          const o = getComputedStyle(el).overflowY
          if (el.scrollHeight > el.clientHeight + 1 && (el === document.scrollingElement || o === 'auto' || o === 'scroll')) el.scrollTop = el.scrollHeight
        }
      })
      await page.waitForTimeout(400)
      const r = await page.evaluate(() => {
        const box = (e) => { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height } }
        const ritorno = document.querySelector('.animals-return')
        const visibile = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 }
        const chiamate = [...document.querySelectorAll('a[href^="tel:"]')].filter(visibile).map(box)
        const galleria = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim() === 'Galleria' && visibile(e)).map(box)
        const scheda = document.querySelector('[data-testid="scheda"]')
        const dentro = scheda ? [...scheda.querySelectorAll('button, a[href]')].filter(visibile) : []
        const testoDi = (e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) || e.getAttribute('aria-label') || e.tagName
        const aggiungi = dentro.filter((e) => /^Aggiungi/.test(testoDi(e))).map((e) => ({ nome: testoDi(e), ...box(e) }))
        const prossimo = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^Prossimo/.test((e.textContent || '').trim()) && visibile(e)).map((e) => { const c = e.closest('button, a[href], section, article, div[class], div') || e; return { nome: 'Prossimo', ...box(c) } })
        const figli = scheda ? [...scheda.children].filter(visibile) : []
        const ultima = figli.length ? { nome: 'ultima card', ...box(figli[figli.length - 1]) } : null
        const controlli = dentro.map((e) => ({ nome: testoDi(e), ...box(e) }))
        return { ritorno: ritorno ? box(ritorno) : null, chiamate, galleria, aggiungi, prossimo, ultima, controlli }
      })
      shotUltimo = await foto(page, `A1-${w}x${h}`)
      if (!r.ritorno) return { ok: false, note: `${w}x${h}: «← Animali» non trovato`, shot: shotUltimo }
      if (Math.abs(r.ritorno.width - 48) > 0.6 || Math.abs(r.ritorno.height - 48) > 0.6) return { ok: false, note: `${w}x${h}: «← Animali» misura ${Math.round(r.ritorno.width)}x${Math.round(r.ritorno.height)}, attesi 48x48`, shot: shotUltimo }
      if (!r.galleria.length) return { ok: false, note: `${w}x${h}: «Galleria» non trovata`, shot: shotUltimo }
      if (!r.chiamate.length) return { ok: false, note: `${w}x${h}: nessun pulsante di chiamata`, shot: shotUltimo }
      if (!r.aggiungi.length) return { ok: false, note: `${w}x${h}: pulsante «Aggiungi» della galleria non trovato`, shot: shotUltimo }
      if (!r.prossimo.length) return { ok: false, note: `${w}x${h}: scheda «Prossimo» non trovata`, shot: shotUltimo }
      if (!r.ultima) return { ok: false, note: `${w}x${h}: ultima card della scheda non trovata`, shot: shotUltimo }
      const extra = [...r.aggiungi, ...r.prossimo, r.ultima, ...r.controlli].filter((c) => interseca(r.ritorno, c)).map((c) => `${c.nome} ${rr(c)}`)
      const urti = [...extra, ...r.chiamate.filter((c) => interseca(r.ritorno, c)).map((c) => `chiamata ${rr(c)}`), ...r.galleria.filter((g) => interseca(r.ritorno, g)).map((g) => `Galleria ${rr(g)}`)]
      if (urti.length) return { ok: false, note: `${w}x${h}: «← Animali» ${rr(r.ritorno)} interseca ${urti.join(', ')}`, shot: shotUltimo }
      note.push(`${w}x${h}: 48x48 libero (${r.chiamate.length} chiamate, ${r.galleria.length} Galleria)`)
    }
    return { ok: true, note: note.join('; '), shot: shotUltimo }
  },

  // Vista listino vuota: frase e «Vai al listino» -> /listino.
  async L1({ sessione, persone }) {
    const page = await sessione(persone.C, 390)
    await vai(page, '/listino/vedi')
    const frase = await page.getByText('Qui vedi il listino che carichi nella pagina Listino.').count()
    const shot = await foto(page, 'L1-vuoto')
    if (!frase) return { ok: false, note: 'frase della vista vuota non trovata', shot }
    await page.getByRole('button', { name: 'Vai al listino', exact: true }).click({ timeout: 5000 })
    await page.waitForURL((u) => u.pathname === '/listino', { timeout: 10000 })
    return { ok: true, note: 'frase presente, «Vai al listino» porta a /listino', shot }
  },

  // Lingua en: sotto il logo in Impostazioni c'e' «Grooming salon» (il maiuscolo e' CSS).
  async E1({ sessione, persone }) {
    const page = await sessione(persone.C, 390)
    await cambiaLingua(page, 'en')
    await vai(page, '/impostazioni')
    const n = await page.getByText('Grooming salon', { exact: true }).count()
    const shot = await foto(page, 'E1-en')
    if (!n) return { ok: false, note: '«Grooming salon» non trovato in /impostazioni con lingua en', shot }
    return { ok: true, note: '«Grooming salon» presente', shot }
  },

  // Salone con nome di 40 caratteri: /impostazioni senza tagli e senza scorrimento orizzontale a 320/360/390.
  async N1({ sessione, persone }) {
    const p = persone.N; const note = []; let shot = ''
    if (NOME_40.length !== 40) return { ok: false, note: `NOME_40 ha ${NOME_40.length} caratteri` }
    for (const w of [320, 360, 390]) {
      const page = await sessione(p, w)
      await vai(page, '/impostazioni')
      const m = await page.evaluate(MISURA_CONTRASTO_TAGLI)
      const presente = await page.getByText(NOME_40, { exact: true }).count()
      shot = await foto(page, `N1-${w}`)
      if (!presente) return { ok: false, note: `${w}: il nome di 40 caratteri non compare`, shot }
      if (m.tagli.length || m.hscroll) return { ok: false, note: `${w}: tagli ${JSON.stringify(m.tagli)}, scorrimento orizzontale ${m.hscroll}`, shot }
      note.push(`${w}: nessun taglio`)
    }
    return { ok: true, note: note.join('; '), shot }
  },

  // Barra in basso a 320x640 in it/en/es: etichette intere, senza ellissi, almeno 9 px.
  async NAV({ sessione, persone }) {
    const note = []; let shot = ''
    for (const lingua of ['it', 'en', 'es']) {
      const page = await sessione(persone.C, 320, 'light', { altezza: 640 })
      if (lingua !== 'it') await cambiaLingua(page, lingua)
      await vai(page, '/')
      const r = await page.evaluate(() => [...document.querySelectorAll('.bottom-nav__label')].map((l) => {
        const tab = l.closest('.bottom-nav__tab'); const s = getComputedStyle(l)
        const barra = l.closest('.bottom-nav__bar') || tab?.parentElement; const bb = barra ? barra.getBoundingClientRect().bottom : 0
        return { fuori: l.getBoundingClientRect().bottom > bb + 0.5, testo: l.textContent.trim(), scroll: l.scrollWidth, tab: tab ? tab.clientWidth : 0, ellissi: s.textOverflow === 'ellipsis', px: parseFloat(s.fontSize) }
      }))
      shot = await foto(page, `NAV-${lingua}`)
      if (!r.length) return { ok: false, note: `${lingua}: nessuna etichetta nella barra`, shot }
      const male = r.filter((x) => x.scroll > x.tab || x.ellissi || x.px < 9 || x.fuori)
      if (male.length) return { ok: false, note: `${lingua}: ${male.map((x) => `"${x.testo}" scroll ${x.scroll}/tab ${x.tab} ellissi ${x.ellissi} ${x.px}px${x.fuori ? ' FUORI dalla barra' : ''}`).join('; ')}`, shot }
      note.push(`${lingua}: ${r.length} etichette intere e dentro la barra, font ${[...new Set(r.map((x) => x.px))].join('/')}px`)
    }
    return { ok: true, note: note.join('; '), shot }
  },
}

async function eseguiCasi(browser, codici, persone) {
  const esiti = []
  for (const codice of codici) {
    const aperti = []
    const sessione = async (persona, larghezza, tema = 'light', opz = {}) => { const s = await apri(browser, persona, larghezza, tema, opz); aperti.push(s); return s.page }
    let esito
    try { esito = await CASI[codice]({ sessione, persone }) } catch (e) {
      esito = { ok: false, note: `eccezione: ${String(e).slice(0, 400)}` }
      const ultima = aperti[aperti.length - 1]
      if (ultima) esito.shot = await foto(ultima.page, `${codice}-errore`)
    }
    for (const s of aperti) await s.ctx.close().catch(() => {})
    esiti.push({ codice, ...esito })
    console.log(`${esito.ok ? 'PASS' : 'FAIL'} ${codice} - ${esito.note}${esito.shot ? ` [${path.relative(process.cwd(), esito.shot)}]` : ''}`)
  }
  return esiti
}

function validaSolo() {
  const valide = [...RUOLI_TUTTI.map((r) => r.codice), ...CODICI_CASI]
  const sbagliate = SOLO.filter((s) => !valide.includes(s))
  if (sbagliate.length || (SOLO.length === 0 && arg('solo', '') !== '')) { console.error(`--solo sconosciuto: ${sbagliate.join(',') || arg('solo', '')} (valide: ${valide.join(',')})`); process.exit(2) }
}

;(async () => {
  validaSolo()
  let fallito = false
  try {
    fs.mkdirSync(SHOTS, { recursive: true })
    const { chromium } = require('playwright')
    const persone = []
    for (const r of RUOLI) persone.push(await creaSalone(r))
    const dei = {}
    if (CASI_SCELTI.some((c) => c !== 'N1')) dei.C = await creaSalone(SALONE_CASI)
    if (CASI_SCELTI.includes('N1')) dei.N = await creaSalone(SALONE_LUNGO)
    const browser = await chromium.launch()
    try {
      if (CASI_SCELTI.length) {
        const esiti = await eseguiCasi(browser, CASI_SCELTI, dei)
        const ko = esiti.filter((e) => !e.ok)
        console.log(`
Casi mirati: ${esiti.length - ko.length} PASS, ${ko.length} FAIL${ko.length ? ` (${ko.map((e) => e.codice).join(', ')})` : ''}`)
        if (ko.length) fallito = true
      }
      if (persone.length) {
        const risultati = await giro(browser, persone)
        if (!risultati.length) throw new Error('Nessuna rotta misurata')
        if (riepilogo(risultati)) fallito = true
        if (GIRO) console.log(`JSON: ${FILE_GIRO}`)
      }
    } finally { await browser.close().catch(() => {}) }
  } finally {
    if (!KEEP) await cancellaTutti()
    else console.log('Account tenuti:', creati.join(', '))
  }
  process.exit(fallito ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(2) })
