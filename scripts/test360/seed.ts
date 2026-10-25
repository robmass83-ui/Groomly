// Seed di test 360°: SOLO per gli emulatori Firebase (progetto demo-groomly).
// Crea 20 saloni finti + un salone "tipo Laura" con Roberto socio, tutto finto.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { appointmentToDoc, dogToDoc, serviceToDoc, settingsToDoc } from '../../src/lib/firebaseMap'
import { blankSettings } from '../../src/data/local/settings'
import { SERVICE_SEED } from '../../src/data/seed/services'
import { storedSearchKey } from '../../src/lib/dogList'
import type { Appointment, Dog, DogSize, Service } from '../../src/types/models'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fermaSeNonDemo } from './guard'

fermaSeNonDemo()
initializeApp({ projectId: 'demo-groomly' })
const auth = getAuth()
const db = getFirestore()

let seed = 42
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

const DOG_NAMES = ['Fido','Luna','Rocky','Bella','Max','Kira','Leo','Nala','Toby','Penny','Birba','Zeus','Maya','Oscar','Lilly','Charlie','Molly','Thor','Lola','Bobby','Milo','Sole','Pippo','Briciola','Arya','Simba','Tata','Kratos','Ginger','Ugo','Polpetta','Neve','Rex','Dafne','Teo','Brina','Lupo','Mia','Otto','Stella']
const BREEDS: [string, DogSize][] = [['Barboncino','piccola'],['Maltese','piccola'],['Shih Tzu','piccola'],['Yorkshire','piccola'],['Bichon frisé','piccola'],['Chihuahua','piccola'],['Cocker spaniel','media'],['Schnauzer','media'],['Bassotto','piccola'],['Border collie','media'],['Golden retriever','grande'],['Labrador','grande'],['Pastore tedesco','grande'],['Terranova','grande'],['Meticcio','media'],['Lagotto','media'],['Westie','piccola'],['Samoiedo','grande'],['Bulldog francese','piccola'],['Setter inglese','grande']]
const FIRST = ['Marco','Giulia','Francesca','Luca','Sara','Paolo','Elena','Andrea','Chiara','Davide','Martina','Simone','Alessia','Matteo','Valentina','Giorgio','Federica','Antonio','Roberta','Stefano']
const LAST = ['Rossi','Bianchi','Sanna','Pinna','Melis','Piras','Serra','Fadda','Mura','Deiana','Ferrari','Esposito','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti']
const CITIES = ['Sassari','Cagliari','Olbia','Alghero','Nuoro','Oristano','Roma','Milano','Torino','Bologna','Napoli','Firenze','Bari','Palermo','Genova','Verona','Padova','Trieste','Pescara','Perugia']

const NOW = new Date()
const DAY = 86400000
function at(dayOffset: number, h: number, m: number): Date {
  const d = new Date(NOW.getTime() + dayOffset * DAY)
  d.setHours(h, m, 0, 0)
  return d
}
const id = (p: string) => `${p}-${Math.floor(rnd() * 1e12).toString(36)}`

type SalonPlan = { idx: number; email: string; name: string; owner: [string, string]; dogs: number; pro: boolean; staff: { role: 'socio' | 'collaboratore'; email: string; name: [string, string] }[]; verified: boolean; empty?: boolean; weird?: boolean }

const plans: SalonPlan[] = []
for (let i = 1; i <= 20; i++) {
  const pro = i >= 13 && i <= 17
  const staff: SalonPlan['staff'] = []
  if (pro) {
    staff.push({ role: 'collaboratore', email: `collab${i}@test.groomly`, name: [pick(FIRST), pick(LAST)] })
    if (i % 2 === 1) staff.push({ role: 'socio', email: `socio${i}@test.groomly`, name: [pick(FIRST), pick(LAST)] })
    if (i === 15) staff.push({ role: 'collaboratore', email: `collab${i}b@test.groomly`, name: [pick(FIRST), pick(LAST)] })
  }
  plans.push({
    idx: i,
    email: `salone${i}@test.groomly`,
    name: i === 19 ? 'Toelettatura «Il Pelo Lunghissimo & Co.» – Centro estetico per cani e gatti 🐾' : `Toelettatura ${CITIES[i - 1]}`,
    owner: [pick(FIRST), pick(LAST)],
    dogs: i === 18 ? 0 : i === 20 ? 130 : int(50, 60),
    pro,
    staff,
    verified: i !== 11,
    empty: i === 18,
    weird: i === 19,
  })
}

async function user(email: string, password: string, verified: boolean, displayName: string): Promise<string> {
  const u = await auth.createUser({ email, password, emailVerified: verified, displayName })
  return u.uid
}

function makeDog(i: number, now: Date, weird: boolean): Dog {
  const [breed, size] = pick(BREEDS)
  const name = weird && i % 7 === 0 ? `${pick(DOG_NAMES)} detto "il Terribile" dell'Ogliastra 😈` : pick(DOG_NAMES) + (rnd() < 0.15 ? ` ${['II', 'jr', 'piccolo'][int(0, 2)]}` : '')
  const owner = `${pick(FIRST)} ${pick(LAST)}`
  const phone = weird && i % 5 === 0 ? '' : `+39 3${int(20, 49)} ${int(100, 999)} ${int(1000, 9999)}`
  const temperament = rnd() < 0.08 ? 'mordace' : rnd() < 0.2 ? 'agitato' : 'bravo'
  const createdAt = new Date(now.getTime() - int(30, 700) * DAY)
  return {
    id: id('dog'),
    name, species: rnd() < 0.06 ? 'gatto' : 'cane', breed, sex: rnd() < 0.5 ? 'M' : 'F',
    ageCategory: pick(['cucciolo', 'giovane', 'adulto', 'adulto', 'anziano']),
    size, temperament, clientType: rnd() < 0.55 ? 'mensile' : 'occasionale',
    criticalNote: temperament === 'mordace' ? 'Usare museruola, morde sulle zampe' : undefined,
    notes: rnd() < 0.3 ? (weird ? 'Nota lunghissima '.repeat(40) : 'Lama 10, orecchie delicate') : undefined,
    contact: { name: owner, phone },
    contacts: phone ? [{ id: id('c'), name: owner, role: 'Proprietario', phone, isPrimary: true }] : [],
    tags: rnd() < 0.2 ? ['ipoallergenico'] : [],
    servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [],
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

async function writeSalon(p: SalonPlan, report: Record<string, unknown>[]) {
  const ownerUid = await user(p.email, 'Test1234!', p.verified, `${p.owner[0]} ${p.owner[1]}`)
  const root = db.collection('salons').doc(ownerUid)
  await db.doc(`accounts/${ownerUid}`).set({ firstName: p.owner[0], lastName: p.owner[1], email: p.email, salonId: ownerUid, role: 'titolare', legacy: false })
  const settings = blankSettings('auto', new Date().toISOString())
  settings.business = { ...settings.business, name: p.name, salonName: p.name, vatNumber: p.idx % 3 === 0 ? '' : `0${String(1234567890 + p.idx).slice(0, 10)}`, phone: `079 ${int(100000, 999999)}`, address: `Via Roma ${p.idx}, ${CITIES[p.idx - 1]}`, taxCode: '' }
  await root.collection('settings').doc('main').set(settingsToDoc(settings))
  const now = new Date()
  const services: Service[] = SERVICE_SEED.map((s) => ({ ...s, createdAt: now, updatedAt: now }))
  if (p.idx % 4 === 0) services.push({ id: 'spa', order: 8, name: 'SPA ozono', kind: 'extra', active: true, durationMin: { piccola: 20, media: 25, grande: 30 }, price: { piccola: 15, media: 18, grande: 22 }, createdAt: now, updatedAt: now })
  for (const s of services) await root.collection('services').doc(s.id).set(serviceToDoc(s))

  const memberUids: string[] = []
  await root.collection('members').doc(ownerUid).set({ uid: ownerUid, email: p.email, role: 'titolare', firstName: p.owner[0], lastName: p.owner[1], status: 'attivo' })
  for (const st of p.staff) {
    const uid = await user(st.email, 'Test1234!', true, st.name.join(' '))
    await db.doc(`accounts/${uid}`).set({ firstName: st.name[0], lastName: st.name[1], email: st.email, salonId: ownerUid, role: st.role, legacy: false })
    await root.collection('members').doc(uid).set({ uid, email: st.email, role: st.role, firstName: st.name[0], lastName: st.name[1], status: 'attivo' })
    memberUids.push(uid)
  }
  if (p.pro) await root.collection('pro').doc('main').set({ enabled: true, seats: 3, updatedAt: new Date().toISOString() })

  const dogs: Dog[] = []
  for (let i = 0; i < p.dogs; i++) dogs.push(makeDog(i, now, !!p.weird))
  let batch = db.batch(); let n = 0
  const flush = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0 } }
  for (const d of dogs) { batch.set(root.collection('dogs').doc(d.id), dogToDoc(d)); n++; if (n >= 400) await flush() }

  // Appuntamenti: storico 6 mesi + mese corrente + mese prossimo, giorni lavorativi, 08:30–18:30
  let appts = 0
  const active = dogs.filter((d) => d.status === 'attivo')
  if (active.length) {
    for (let day = -180; day <= 40; day++) {
      const date = new Date(NOW.getTime() + day * DAY)
      const wd = date.getDay()
      if (wd === 0 || (wd === 1 && p.idx % 2 === 0)) continue
      const perDay = day < 0 ? int(3, 6) : int(4, 8)
      let minute = 8 * 60 + 30
      for (let k = 0; k < perDay; k++) {
        const dog = pick(active)
        const lines = servicesFor(dog.size, services)
        const dur = lines.reduce((a, l) => a + l.durationMin, 0)
        // a volte una sovrapposizione voluta
        const start = at(day, Math.floor(minute / 60), minute % 60)
        minute += rnd() < 0.08 ? 15 : dur + pick([0, 0, 15, 30])
        if (minute > 18 * 60 + 30) break
        let status: Appointment['status'] = 'programmato'
        const past = start.getTime() < NOW.getTime()
        if (past) { const r = rnd(); status = r < 0.86 ? 'completato' : r < 0.93 ? 'non_venuto' : 'disdetto' }
        else if (rnd() < 0.04) status = 'disdetto'
        if (past && day > -3 && rnd() < 0.3) status = 'programmato' // "da chiudere"
        const total = lines.reduce((a, l) => a + l.price, 0)
        const a: Appointment = {
          id: id('apt'), dogId: dog.id, start, services: lines, status,
          cancelReason: status === 'disdetto' ? (rnd() < 0.8 ? 'cliente' : 'salone') : undefined,
          createdAt: new Date(start.getTime() - int(1, 30) * DAY), updatedAt: new Date(start.getTime()),
          kind: 'pelosetto',
        }
        if (status === 'completato') {
          a.total = rnd() < 0.15 ? total + pick([-5, 5, 10]) : total
          a.actualDurationMin = dur + pick([-10, 0, 0, 10, 20])
          a.paymentMethod = rnd() < 0.6 ? 'pos' : 'contanti'
        }
        if (p.pro && memberUids.length && rnd() < 0.5) a.assigneeUid = pick([ownerUid, ...memberUids])
        batch.set(root.collection('appointments').doc(a.id), appointmentToDoc(a)); n++; appts++
        if (n >= 400) await flush()
      }
      if (day >= 0 && day <= 30 && rnd() < 0.1) {
        const pa: Appointment = { id: id('per'), dogId: '', start: at(day, 13, 0), services: [], status: 'programmato', createdAt: NOW, updatedAt: NOW, kind: 'personale', title: pick(['Veterinario Tata', 'Commercialista', 'Fornitore shampoo', 'Dentista']), plannedEnd: at(day, 14, 0) }
        batch.set(root.collection('appointments').doc(pa.id), appointmentToDoc(pa)); n++; appts++
      }
    }
  }
  // chiusure
  const d0 = new Date(NOW.getTime() + 20 * DAY)
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (!p.empty) batch.set(root.collection('closures').doc(id('chi')), { reason: 'Ferie', startDay: key(d0), endDay: key(new Date(d0.getTime() + 2 * DAY)), createdAt: Date.now(), updatedAt: Date.now() })
  n++
  await flush()
  report.push({ salone: p.idx, email: p.email, nome: p.name, uid: ownerUid, cani: p.dogs, appuntamenti: appts, pro: p.pro, staff: p.staff.map((s) => `${s.role}:${s.email}`), verificata: p.verified })
}

async function main() {
  const report: Record<string, unknown>[] = []
  for (const p of plans) { await writeSalon(p, report); console.log('salone', p.idx, 'ok') }
  // "Laura finta" + Roberto socio (accessWithoutPro), solo emulatore: replica la struttura reale per provarne il percorso
  const lauraUid = await user('laura.masala@tiscali.it', 'Test1234!', true, 'Laura Finta')
  const robUid = await user('masala.roberto@hotmail.it', 'Test1234!', true, 'Roberto Finto')
  await db.doc(`accounts/${lauraUid}`).set({ firstName: 'Laura', lastName: 'Finta', email: 'laura.masala@tiscali.it', salonId: lauraUid, role: 'titolare', legacy: false })
  await db.doc(`accounts/${robUid}`).set({ firstName: 'Roberto', lastName: 'Finto', email: 'masala.roberto@hotmail.it', salonId: lauraUid, role: 'socio', legacy: false })
  const lr = db.collection('salons').doc(lauraUid)
  const s = blankSettings('auto', new Date().toISOString()); s.business = { ...s.business, name: 'iPelosetti (FINTO)', salonName: 'iPelosetti (FINTO)' }
  await lr.collection('settings').doc('main').set(settingsToDoc(s))
  await lr.collection('members').doc(lauraUid).set({ uid: lauraUid, email: 'laura.masala@tiscali.it', role: 'titolare', status: 'attivo', firstName: 'Laura', lastName: 'Finta' })
  await lr.collection('members').doc(robUid).set({ uid: robUid, email: 'masala.roberto@hotmail.it', role: 'socio', status: 'attivo', accessWithoutPro: true, firstName: 'Roberto', lastName: 'Finto' })
  await lr.collection('pro').doc('main').set({ enabled: true, seats: 3, updatedAt: new Date().toISOString() })
  for (const sv of SERVICE_SEED) await lr.collection('services').doc(sv.id).set(serviceToDoc({ ...sv, createdAt: new Date(), updatedAt: new Date() }))
  for (let i = 0; i < 30; i++) { const d = makeDog(i, new Date(), false); await lr.collection('dogs').doc(d.id).set(dogToDoc(d)) }
  // vecchio users/{uid} di Laura finta, per provare la regola users/{uid}
  await db.doc(`users/${lauraUid}/backups/2026-10-01`).set({ dati: 'backup privato di Laura (finto)' })
  report.push({ salone: 'laura-finta', uid: lauraUid, roberto: robUid })
  const out = process.argv[2] ?? 'seed-report.json'
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(report, null, 2))
  console.log('FATTO', report.length)
}
main().catch((e) => { console.error(e); process.exit(1) })
