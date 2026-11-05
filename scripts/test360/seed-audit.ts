// Seed dell'audit del 1° novembre 2026: SOLO emulatori (progetto demo-groomly).
// 65 saloni finti: 25 Go, 22 Plus, 18 Salone. 30-40 cani ciascuno. Nessun dato reale.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { appointmentToDoc, dogToDoc, serviceToDoc, settingsToDoc } from '../../src/lib/firebaseMap'
import { blankSettings } from '../../src/data/local/settings'
import { SERVICE_SEED } from '../../src/data/seed/services'
import { storedSearchKey } from '../../src/lib/dogList'
import type { Appointment, Dog, DogSize, Service } from '../../src/types/models'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fermaSeNonDemo } from './guard'

fermaSeNonDemo()
initializeApp({ projectId: 'demo-groomly' })
const auth = getAuth()
const db = getFirestore()

let seed = 2026
// Math.imul tiene il prodotto a 32 bit: con la moltiplicazione normale si superano 2^53 e il generatore ripete gli id.
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 2147483648 }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const id = (p: string) => `${p}-${Math.floor(rnd() * 1e12).toString(36)}`

const DOG_NAMES = ['Fido','Luna','Rocky','Bella','Max','Kira','Leo','Nala','Toby','Penny','Birba','Zeus','Maya','Oscar','Lilly','Charlie','Molly','Thor','Lola','Bobby','Milo','Sole','Pippo','Briciola','Arya','Simba','Tata','Kratos','Ginger','Ugo','Polpetta','Neve','Rex','Dafne','Teo','Brina','Lupo','Mia','Otto','Stella']
const BREEDS: [string, DogSize][] = [['Barboncino','piccola'],['Maltese','piccola'],['Shih Tzu','piccola'],['Yorkshire','piccola'],['Bichon frisé','piccola'],['Cocker spaniel','media'],['Schnauzer','media'],['Bassotto','piccola'],['Border collie','media'],['Golden retriever','grande'],['Labrador','grande'],['Pastore tedesco','grande'],['Terranova','grande'],['Meticcio','media'],['Lagotto','media'],['Westie','piccola'],['Samoiedo','grande'],['Bulldog francese','piccola']]
const FIRST = ['Marco','Giulia','Francesca','Luca','Sara','Paolo','Elena','Andrea','Chiara','Davide','Martina','Simone','Alessia','Matteo','Valentina','Giorgio','Federica','Antonio','Roberta','Stefano']
const LAST = ['Rossi','Bianchi','Sanna','Pinna','Melis','Piras','Serra','Fadda','Mura','Deiana','Ferrari','Esposito','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti']
const CITIES = ['Sassari','Cagliari','Olbia','Alghero','Nuoro','Oristano','Roma','Milano','Torino','Bologna','Napoli','Firenze','Bari','Palermo','Genova','Verona','Padova','Trieste','Pescara','Perugia','Lecce','Trento','Parma','Rimini','Siena']

const NOW = new Date()
const DAY = 86400000
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString()
function at(dayOffset: number, h: number, m: number): Date {
  const d = new Date(NOW.getTime() + dayOffset * DAY)
  d.setHours(h, m, 0, 0)
  return d
}

type Tier = 'go' | 'plus' | 'salone'
type Staff = { role: 'socio' | 'collaboratore'; email: string; name: [string, string]; status?: string }
type Plan = { idx: number; tier: Tier; email: string; name: string; owner: [string, string]; dogs: number; pro?: Record<string, unknown>; staff: Staff[]; verified: boolean; online: boolean; tour: boolean; weird?: boolean; nota: string }

const plans: Plan[] = []
for (let i = 1; i <= 65; i++) {
  const tier: Tier = i <= 25 ? 'go' : i <= 47 ? 'plus' : 'salone'
  let pro: Record<string, unknown> | undefined
  let nota = ''
  if (tier === 'go') {
    if (i === 3 || i === 7) { pro = { piano: 'pro', stato: 'scaduto', fonte: 'prova', scadeIl: iso(-5 * DAY), provaUsata: true }; nota = 'Go dopo prova Plus scaduta' }
    else if (i === 10) { pro = { piano: 'salone', stato: 'sospeso', fonte: 'play', scadeIl: iso(-2 * DAY) }; nota = 'Go: Salone sospeso' }
    else nota = 'Go puro'
  } else if (tier === 'plus') {
    const k = i - 26
    if (k < 8) { pro = { piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: iso(25 * DAY), rinnovoAutomatico: true }; nota = 'Plus attivo (Play)' }
    else if (k < 12) { pro = { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: iso(10 * DAY), provaUsata: true }; nota = 'Plus in prova (10 gg)' }
    else if (k < 14) { pro = { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: iso(0.6 * DAY), provaUsata: true }; nota = 'Plus prova che scade oggi/domani' }
    else if (k < 16) { pro = { piano: 'pro', stato: 'grazia', fonte: 'play', scadeIl: iso(3 * DAY) }; nota = 'Plus in grazia (pagamento fallito)' }
    else if (k < 18) { pro = { piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: iso(12 * DAY), rinnovoAutomatico: false }; nota = 'Plus disdetto, ancora valido' }
    else if (k < 20) { pro = { piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null }; nota = 'Plus omaggio' }
    else { pro = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null }; nota = 'Plus manuale' }
  } else {
    const k = i - 48
    pro = { piano: 'salone', stato: 'attivo', fonte: 'play', scadeIl: iso(20 * DAY), seatsIncluded: 3, seatsExtra: k === 5 ? 1 : 0, rinnovoAutomatico: true }
    nota = 'Salone attivo'
    if (k === 7) { pro = { ...pro, stato: 'grazia', scadeIl: iso(2 * DAY) }; nota = 'Salone in grazia' }
    if (k === 9) { pro = { ...pro, stato: 'prova', fonte: 'prova', scadeIl: iso(6 * DAY) }; nota = 'Salone in prova' }
    if (k === 11) { pro = { piano: 'salone', stato: 'attivo', fonte: 'manuale', scadeIl: null, seatsIncluded: 3, seatsExtra: 0 }; nota = 'Salone manuale' }
  }
  const staff: Staff[] = []
  if (tier === 'salone') {
    const k = i - 48
    const n = k === 0 ? 0 : k === 3 ? 4 : 1 + (k % 3)
    for (let s = 0; s < n; s++) {
      staff.push({ role: s === 0 && k % 2 === 0 ? 'socio' : 'collaboratore', email: `staff${i}${'abcd'[s]}@test.groomly`, name: [pick(FIRST), pick(LAST)], status: k === 4 && s === 1 ? 'revocato' : 'attivo' })
    }
    if (k === 0) nota += ' (nessun collaboratore)'
    if (k === 3) nota += ' (4 collaboratori su 3 posti)'
    if (k === 4) nota += ' (un collaboratore revocato)'
  }
  if (tier === 'go' && (i === 5 || i === 15)) staff.push({ role: 'collaboratore', email: `staff${i}a@test.groomly`, name: [pick(FIRST), pick(LAST)] })
  if (i === 5 || i === 15) nota += ' + collaboratore rimasto senza Salone'
  if (i === 30) staff.push({ role: 'socio', email: `staff${i}a@test.groomly`, name: [pick(FIRST), pick(LAST)] })
  if (i === 30) nota += ' + socio su Plus'
  const weird = i === 19 || i === 40
  plans.push({
    idx: i, tier,
    email: `${tier}${i}@test.groomly`,
    name: weird ? 'Toelettatura «Il Pelo Lunghissimo & Co.» – Centro estetico per cani e gatti 🐾' : `${pick(['Toelettatura', 'Pet Spa', 'Bau Bau', 'Pelo & Coccole', 'Dog Beauty'])} ${CITIES[(i - 1) % CITIES.length]}${i > 25 ? ' ' + i : ''}`,
    owner: [pick(FIRST), pick(LAST)],
    dogs: int(30, 40), pro, staff,
    verified: i !== 11 && i !== 33,
    online: tier !== 'go' && (i % 5 !== 0),
    tour: i !== 2 && i !== 27 && i !== 50,
    weird,
    nota: nota + (i === 11 || i === 33 ? ' [email NON verificata]' : '') + (i === 2 || i === 27 || i === 50 ? ' [tour di benvenuto da fare]' : '') + (weird ? ' [nomi strani/lunghi]' : ''),
  })
}

async function user(email: string, verified: boolean, displayName: string): Promise<string> {
  try { const old = await auth.getUserByEmail(email); await auth.deleteUser(old.uid) } catch { /* nuovo */ }
  return (await auth.createUser({ email, password: 'Test1234!', emailVerified: verified, displayName })).uid
}

function makeDog(i: number, weird: boolean): Dog {
  const [breed, size] = pick(BREEDS)
  const name = weird && i % 7 === 0 ? `${pick(DOG_NAMES)} detto "il Terribile" dell'Ogliastra 😈` : pick(DOG_NAMES) + (rnd() < 0.15 ? ` ${['II', 'jr', 'piccolo'][int(0, 2)]}` : '')
  const owner = `${pick(FIRST)} ${pick(LAST)}`
  const phone = weird && i % 5 === 0 ? '' : `+39 3${int(20, 49)} ${int(100, 999)} ${int(1000, 9999)}`
  const email = rnd() < 0.6 ? `${owner.toLowerCase().replace(/\s+/g, '.')}${i}@cliente.test` : undefined
  const temperament = rnd() < 0.08 ? 'mordace' : rnd() < 0.2 ? 'agitato' : 'bravo'
  const createdAt = new Date(NOW.getTime() - int(30, 700) * DAY)
  const birth = rnd() < 0.5 ? new Date(NOW.getTime() + int(-3, 20) * DAY) : null
  return {
    id: id('dog'),
    name, species: rnd() < 0.06 ? 'gatto' : 'cane', breed, sex: rnd() < 0.5 ? 'M' : 'F',
    ageCategory: pick(['cucciolo', 'giovane', 'adulto', 'adulto', 'anziano']),
    size, temperament, clientType: rnd() < 0.55 ? 'mensile' : 'occasionale',
    criticalNote: temperament === 'mordace' ? 'Usare museruola, morde sulle zampe' : undefined,
    notes: rnd() < 0.3 ? (weird ? 'Nota lunghissima '.repeat(40) : 'Lama 10, orecchie delicate') : undefined,
    contact: { name: owner, phone, ...(email ? { email } : {}) },
    contacts: phone ? [{ id: id('c'), name: owner, role: 'Proprietario', phone, isPrimary: true }] : [],
    tags: rnd() < 0.2 ? ['ipoallergenico'] : [],
    servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [],
    ...(birth ? { birthYear: NOW.getFullYear() - int(1, 14), birthMonth: birth.getMonth() + 1, birthDay: birth.getDate() } : {}),
    weightKg: size === 'piccola' ? int(2, 9) : size === 'media' ? int(10, 24) : int(25, 55),
    recurrenceWeeks: rnd() < 0.5 ? pick([4, 5, 6, 8]) : undefined,
    status: rnd() < 0.05 ? 'non_in_cura' : rnd() < 0.02 ? 'deceduto' : 'attivo',
    searchKey: storedSearchKey(name, breed, [owner], phone ? [phone] : []),
    createdAt, updatedAt: createdAt,
  } as Dog
}

function servicesFor(size: DogSize, services: Service[]) {
  const main = pick(services.filter((s) => s.kind === 'principale'))
  const lines = [main]
  if (rnd() < 0.35) lines.push(pick(services.filter((s) => s.kind === 'extra')))
  return lines.map((s) => ({ serviceId: s.id, name: s.name, durationMin: s.durationMin[size], price: s.price[size] }))
}

const ORARI = { 1: [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }], 2: [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }], 3: [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }], 4: [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }], 5: [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }], 6: [{ da: '09:00', a: '13:00' }] }

async function writeSalon(p: Plan) {
  const ownerUid = await user(p.email, p.verified, `${p.owner[0]} ${p.owner[1]}`)
  const root = db.collection('salons').doc(ownerUid)
  await db.doc(`accounts/${ownerUid}`).set({ firstName: p.owner[0], lastName: p.owner[1], email: p.email, salonId: ownerUid, role: 'titolare', legacy: false })
  const settings = blankSettings('auto', new Date().toISOString())
  settings.business = { ...settings.business, name: p.name, salonName: p.name, titolare: p.owner.join(' '), vatNumber: p.idx % 3 === 0 ? '' : String(10000000000 + p.idx * 7919).slice(0, 11), phone: `079 ${int(100000, 999999)}`, address: `Via Roma ${p.idx}, ${CITIES[(p.idx - 1) % CITIES.length]}`, taxCode: '' }
  if (p.tour) settings.tourBenvenuto = { stato: 'visto', saltati: [] }
  settings.listinoConfermato = true
  if (p.tier !== 'go' || p.idx % 2 === 0) settings.orari = ORARI as never
  if (p.online) { settings.prenotazioniOnline = true; settings.speciePrenotabili = ['cane', 'gatto'] as never }
  if (p.tier !== 'go' && p.idx % 3 === 0) settings.fedeltaAccesa = true
  if (p.tier !== 'go' && p.idx % 4 === 0) settings.linkRecensioni = 'https://g.page/r/finto-test/review'
  await root.collection('settings').doc('main').set(settingsToDoc(settings))
  const services: Service[] = SERVICE_SEED.map((s) => ({ ...s, createdAt: NOW, updatedAt: NOW }))
  if (p.idx % 4 === 0) services.push({ id: 'spa', order: 8, name: 'SPA ozono', kind: 'extra', active: true, durationMin: { piccola: 20, media: 25, grande: 30 }, price: { piccola: 15, media: 18, grande: 22 }, createdAt: NOW, updatedAt: NOW })
  for (const s of services) await root.collection('services').doc(s.id).set(serviceToDoc(s))

  const memberUids: string[] = []
  await root.collection('members').doc(ownerUid).set({ uid: ownerUid, email: p.email, role: 'titolare', firstName: p.owner[0], lastName: p.owner[1], status: 'attivo' })
  for (const st of p.staff) {
    const uid = await user(st.email, true, st.name.join(' '))
    // Come revokeMember: il revocato torna titolare del proprio salone.
    const revocato = st.status === 'revocato'
    await db.doc(`accounts/${uid}`).set({ firstName: st.name[0], lastName: st.name[1], email: st.email, salonId: revocato ? uid : ownerUid, role: revocato ? 'titolare' : st.role, legacy: false })
    await root.collection('members').doc(uid).set({ uid, email: st.email, role: st.role, firstName: st.name[0], lastName: st.name[1], status: st.status ?? 'attivo' })
    memberUids.push(uid)
  }
  if (p.pro) await root.collection('pro').doc('main').set({ ...p.pro, updatedAt: NOW.toISOString() })

  const dogs: Dog[] = []
  for (let i = 0; i < p.dogs; i++) dogs.push(makeDog(i, !!p.weird))
  let batch = db.batch(); let n = 0
  const flush = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0 } }
  for (const d of dogs) { batch.set(root.collection('dogs').doc(d.id), dogToDoc(d)); n++ }

  let appts = 0
  const active = dogs.filter((d) => d.status === 'attivo')
  for (let day = -120; day <= 35; day++) {
    const date = new Date(NOW.getTime() + day * DAY)
    const wd = date.getDay()
    if (wd === 0 || (wd === 1 && p.idx % 2 === 0)) continue
    const perDay = day < 0 ? int(2, 5) : int(2, 6)
    let minute = 9 * 60
    for (let k = 0; k < perDay; k++) {
      const dog = pick(active)
      const lines = servicesFor(dog.size, services)
      const dur = lines.reduce((a, l) => a + l.durationMin, 0)
      const start = at(day, Math.floor(minute / 60), minute % 60)
      minute += rnd() < 0.05 ? 15 : dur + pick([0, 0, 15, 30])
      if (minute > 18 * 60 + 30) break
      let status: Appointment['status'] = 'programmato'
      const past = start.getTime() < NOW.getTime()
      if (past) { const r = rnd(); status = r < 0.86 ? 'completato' : r < 0.93 ? 'non_venuto' : 'disdetto' }
      else if (rnd() < 0.04) status = 'disdetto'
      if (past && day > -3 && rnd() < 0.35) status = 'programmato'
      const total = lines.reduce((a, l) => a + l.price, 0)
      const a: Appointment = {
        id: id('apt'), dogId: dog.id, start, end: new Date(start.getTime() + dur * 60000), services: lines, status,
        cancelReason: status === 'disdetto' ? (rnd() < 0.8 ? 'cliente' : 'salone') : undefined,
        createdAt: new Date(start.getTime() - int(1, 30) * DAY), updatedAt: new Date(start.getTime()),
        kind: 'pelosetto',
      }
      if (status === 'completato') {
        a.total = rnd() < 0.15 ? total + pick([-5, 5, 10]) : total
        a.actualDurationMin = dur + pick([-10, 0, 0, 10, 20])
        a.paymentMethod = rnd() < 0.6 ? 'pos' : 'contanti'
        a.chiusoIl = new Date(start.getTime() + dur * 60000)
      }
      if (memberUids.length && rnd() < 0.5) (a as Appointment & { assigneeUid?: string }).assigneeUid = pick([ownerUid, ...memberUids])
      batch.set(root.collection('appointments').doc(a.id), appointmentToDoc(a)); n++; appts++
      if (n >= 450) await flush()
    }
    if (day >= 0 && day <= 30 && rnd() < 0.1) {
      const pa: Appointment = { id: id('per'), dogId: '', start: at(day, 13, 0), services: [], status: 'programmato', createdAt: NOW, updatedAt: NOW, kind: 'personale', title: pick(['Veterinario', 'Commercialista', 'Fornitore shampoo', 'Dentista']), plannedEnd: at(day, 14, 0) } as Appointment
      batch.set(root.collection('appointments').doc(pa.id), appointmentToDoc(pa)); n++; appts++
    }
  }
  const d0 = new Date(NOW.getTime() + 20 * DAY)
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  batch.set(root.collection('closures').doc(id('chi')), { reason: 'Ferie', startDay: key(d0), endDay: key(new Date(d0.getTime() + 2 * DAY)), createdAt: Date.now(), updatedAt: Date.now() }); n++
  await flush()
  return { salone: p.idx, piano: p.tier, nota: p.nota, email: p.email, password: 'Test1234!', nome: p.name, uid: ownerUid, cani: p.dogs, appuntamenti: appts, prenotazioniOnline: p.online, staff: p.staff.map((s) => `${s.role}${s.status === 'revocato' ? '(revocato)' : ''}:${s.email}`), verificata: p.verified, services: services.map((s) => s.id) }
}

async function main() {
  if (process.env.SOLO_ANDROID) {
    const scelti = [plans[0], plans[30], plans[52]].map((p, k) => ({ ...p, email: ['android-go', 'android-plus', 'android-salone'][k] + '@test.groomly', name: ['Toelettatura Telefono Go', 'Toelettatura Telefono Plus', 'Toelettatura Telefono Salone'][k], staff: k === 2 ? [{ role: 'collaboratore' as const, email: 'android-staff@test.groomly', name: ['Lia', 'Porcu'] as [string, string] }] : [], tour: true, verified: true, online: k > 0 }))
    const done = await Promise.all(scelti.map(writeSalon))
    writeFileSync('test-results/audit/android/seed-android.json', JSON.stringify(done, null, 2)); console.log(done.map((d) => d.email + ' ' + d.cani + ' cani ' + d.appuntamenti + ' app')); return
  }
  const out = process.argv[2] ?? 'test-results/audit/seed-report.json'
  const report: Awaited<ReturnType<typeof writeSalon>>[] = []
  // Più saloni insieme: l'emulatore regge, e il seed resta sotto qualche minuto.
  for (let i = 0; i < plans.length; i += 5) {
    const done = await Promise.all(plans.slice(i, i + 5).map(writeSalon))
    report.push(...done)
    console.log('saloni', Math.min(i + 5, plans.length), '/', plans.length)
  }
  mkdirSync('test-results/audit', { recursive: true })
  writeFileSync(out, JSON.stringify(report, null, 2))
  console.log('FATTO', report.length, 'saloni,', report.reduce((a, r) => a + r.cani, 0), 'cani,', report.reduce((a, r) => a + r.appuntamenti, 0), 'appuntamenti')
}
main().catch((e) => { console.error(e); process.exit(1) })
