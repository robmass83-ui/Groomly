# Registro Excel — piano

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Eseguito — vedi commit ee03fb5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il pulsante Registro Excel nella card Dati e backup, che scrive `Registro Groomly.xlsx` dal raccoglitore senza scaricare le foto.

**Architecture:** `costruisciRegistro` legge il JSON del backup e produce le righe. `registroXlsx` le scrive con exceljs. La pagina chiama `raccogliBackup` con `includiByte: false`, poi condivide il file. `risolviLink` è un parametro del generatore: questo piano non lo passa dal pulsante.

**Tech Stack:** TypeScript, Vitest, happy-dom, exceljs già in dipendenza. Nessuna dipendenza nuova. Shell: PowerShell, un comando per volta, senza `&&`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-registro-excel-design.md`. Per codici, fuso, lapidi e lettura del salone prevale `docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`.
- Il pulsante chiama `raccogliBackup(now, { includiByte: false })`. Nessun byte di foto.
- Senza `risolviLink` la colonna «Cartella foto» non esiste. Con `risolviLink` il testo è «Apri cartella» e il collegamento è il valore restituito.
- Le date del JSON sono ISO. Non usare `dogFromDoc`.
- Giorno, ora e mese sono quelli di `Europe/Rome`. `2026-10-22T21:30:00.000Z` è il giorno `2026-10-22` e l’ora `23:30`. La data Excel si costruisce con `new Date(anno, mese - 1, giorno)` usando quei numeri di Roma: exceljs salva i componenti locali, e così il giorno resta quello di Roma anche in un altro fuso.
- Un appuntamento `kind: 'personale'` non entra in nessun foglio.
- «Esegui ora», il toggle, Esporta, Ripristina, il chip e `uploadBackupFile` non si modificano. Il chip non si aggiorna.
- Sul nativo, `shareFiles`. Nel browser, `downloadAnchor`. Annullare la condivisione non mostra un avviso.
- Senza rete: toast «Serve la connessione per creare il backup». Ogni altro errore del pulsante: «Esportazione non riuscita».
- Non c’è colonna email. Il telefono è la stringa salvata, formato testo.
- I task 1–3 non alzano `APP_VERSION` e non pubblicano. Pubblica solo il task 4, a suite verde.
- I test del task passano prima del commit. Comando: `npx vitest run <file>`.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.

---

### Task 1: Righe del registro

**Files:**
- Create: `src/lib/registroModello.ts`
- Create: `src/lib/registroModello.test.ts`

**Interfaces:**
- Consumes: `GroomlyDati`, `buildManifest`, `romeIso`, `appointmentAmount`, `classify`, `sumDuration`, `SIZE_LABEL`, `SEX_LABEL`, `TEMPERAMENT_LABEL`, `APP_VERSION`
- Produces:

```ts
export type RegistroModello = {
  salone: string
  creatoIl: string
  versione: string
  conteggi: { cani: number; clienti: number; appuntamenti: number; foto: number; fileListino: number }
  cani: RigaCane[]
  visite: RigaVisita[]
  clienti: RigaCliente[]
  mesi: RigaMese[]
  anni: RigaAnno[]
  servizi: RigaServizio[]
  razze: RigaRazza[]
}

export function costruisciRegistro(dati: GroomlyDati, now: Date): RegistroModello
```

I tipi riga sono esportati dallo stesso file, con i campi usati nel sorgente sotto.

- [ ] **Step 1: Write the failing test**

Creare `src/lib/registroModello.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contaClienti, type GroomlyDati } from './backupBundle'
import { appointmentAmount, classify } from './earnings'
import { costruisciRegistro } from './registroModello'
import type { Appointment } from '../types/models'

const NOW = new Date('2026-10-23T12:00:00.000Z')
const VISITA = '2026-10-22T21:30:00.000Z'

function dati(extra: Partial<GroomlyDati> = {}): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
    ...extra,
  }
}

function cane(id: string, phone: string, name = 'Fido') {
  return {
    id,
    name,
    breed: 'Barboncino',
    size: 'piccola',
    sex: 'M',
    birthYear: 2019,
    temperament: 'bravo',
    contact: { name: 'Ada', phone },
    contacts: [{ id: 'c', name: 'Ada', role: '', phone, isPrimary: true }],
    photo: 'file:f1',
    gallery: [{ id: 'g', photo: 'file:f2', takenAt: VISITA }],
    status: 'attivo',
    criticalNote: 'Allergico',
    notes: 'Lame 4',
  }
}

describe('costruisciRegistro', () => {
  it('mette il giorno di Roma, il codice e il telefono testo', () => {
    const base = dati({
      dogs: { d1: cane('d1', '0333') },
      appointments: {
        a1: {
          id: 'a1', dogId: 'd1', start: VISITA, status: 'completato',
          services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
          actualDurationMin: 40,
          photos: [{ id: 'p', photo: 'file:f1', kind: 'prima' }],
        },
        personale: { id: 'personale', kind: 'personale', title: 'Dentista', start: VISITA },
      },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
      files: { f1: { id: 'f1', kind: 'foto', owner: 'dog:d1', name: 'profilo.webp', createdAt: 1, createdBy: 'u', estensione: '.webp', percorsoBackup: 'cani/C0001/profilo.webp', esito: 'ok' } },
    })
    const registro = costruisciRegistro(base, NOW)
    expect(registro.cani).toHaveLength(1)
    expect(registro.cani[0]).toMatchObject({
      codice: 'C0001', cane: 'Fido', telefono: '0333', padrone: 'Ada',
      anno: 2019, foto: 3, stato: 'Attivo', ultimoServizio: 'Bagno',
      ultimoPrezzo: 10, totaleSpeso: 10, tempoMedio: 40, note: 'Allergico\nLame 4',
      percorso: 'cani/C0001/profilo.webp',
    })
    expect(registro.cani[0].primo?.getFullYear()).toBe(2026)
    expect(registro.cani[0].primo?.getMonth()).toBe(9)
    expect(registro.cani[0].primo?.getDate()).toBe(22)
    expect(registro.visite.map((row) => row.cane)).toEqual(['Fido'])
    expect(registro.visite[0].ora).toBe('23:30')
    expect(registro.visite[0].prezzo).toBe(10)
    expect(registro.clienti).toHaveLength(contaClienti(base.dogs))
    expect(registro.mesi.map((row) => row.mese)).toEqual(['ott 2026'])
    expect(registro.mesi[0].totale).toBe(10)
    expect(registro.anni[0]).toMatchObject({ etichetta: 'Totale 2026', totale: 10, appuntamenti: 1 })
  })

  it('unisce due cani con lo stesso telefono e segna la lapide', () => {
    const base = dati({
      dogs: {
        d1: cane('d1', '333 111', 'Fido'),
        d2: { ...cane('d2', '333111', 'Luna'), photo: '', gallery: [] },
      },
      deletedDogs: { ids: ['d1'], appointmentIds: [] },
      codiciCane: { next: 3, cartella: 'cani', byId: { d1: 'C0001', d2: 'C0002' } },
    })
    const registro = costruisciRegistro(base, NOW)
    expect(registro.cani.map((row) => row.stato)).toEqual(['Nascosto', 'Attivo'])
    expect(registro.clienti).toHaveLength(1)
    expect(registro.clienti[0].cani).toBe('C0001 Fido, C0002 Luna')
    expect(registro.clienti[0].padrone).toBe('Ada')
    expect(registro.clienti[0].telefono).toBe('333 111')
  })

  it('il totale del mese è la somma di classify incassato', () => {
    const base = dati({
      dogs: { d1: cane('d1', '1') },
      appointments: {
        fatto: { id: 'fatto', dogId: 'd1', start: VISITA, status: 'completato', services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 12 }] },
        perso: { id: 'perso', dogId: 'd1', start: VISITA, status: 'non_venuto', services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 99 }] },
      },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    })
    const registro = costruisciRegistro(base, NOW)
    const visite = Object.values(base.appointments).map((raw) => {
      const row = raw as { id: string; dogId: string; start: string; status: Appointment['status']; services: Appointment['services'] }
      return { id: row.id, dogId: row.dogId, start: new Date(row.start), services: row.services, status: row.status, createdAt: new Date(row.start), updatedAt: new Date(row.start) } as Appointment
    })
    const atteso = visite.filter((item) => classify(item, NOW) === 'incassato').reduce((sum, item) => sum + appointmentAmount(item), 0)
    expect(registro.mesi[0].totale).toBe(atteso)
    expect(registro.mesi[0].appuntamenti).toBe(1)
  })

  it('trecento cani e duemila visite stanno sotto i dieci secondi', () => {
    const dogs: GroomlyDati['dogs'] = {}
    const appointments: GroomlyDati['appointments'] = {}
    const byId: Record<string, string> = {}
    for (let index = 0; index < 300; index += 1) {
      const id = `d${index}`
      dogs[id] = cane(id, String(1000 + index), `Cane ${index}`)
      byId[id] = `C${String(index + 1).padStart(4, '0')}`
    }
    for (let index = 0; index < 2000; index += 1) {
      appointments[`a${index}`] = {
        id: `a${index}`, dogId: `d${index % 300}`, start: VISITA, status: 'completato',
        services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
      }
    }
    const started = Date.now()
    const registro = costruisciRegistro(dati({ dogs, appointments, codiciCane: { next: 301, cartella: 'cani', byId } }), NOW)
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(registro.cani).toHaveLength(300)
    expect(registro.visite).toHaveLength(2000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/registroModello.test.ts`

Expected: FAIL, cannot find module `./registroModello`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/registroModello.ts` con questo sorgente.

```ts
import type { Appointment, AppointmentStatus, DogSize, Temperament } from '../types/models'
import { APP_VERSION } from './appVersion'
import { sumDuration } from './appointments'
import { buildManifest, type GroomlyDati } from './backupBundle'
import { appointmentAmount, classify } from './earnings'
import { SEX_LABEL, SIZE_LABEL, TEMPERAMENT_LABEL } from './dogList'
import { romeIso } from './romeTime'

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const STATI = new Set<AppointmentStatus>(['programmato', 'completato', 'disdetto', 'non_venuto'])

export type RigaCane = {
  codice: string
  cane: string
  razza: string
  taglia: string
  sesso: string
  anno: number | null
  carattere: string
  padrone: string
  telefono: string
  appuntamenti: number
  primo: Date | null
  ultimo: Date | null
  prossimo: Date | null
  ultimoServizio: string
  ultimoPrezzo: number | null
  totaleSpeso: number
  tempoMedio: number | null
  note: string
  foto: number
  stato: string
  percorso: string
}

export type RigaVisita = {
  data: Date | null
  ora: string
  codice: string
  cane: string
  razza: string
  padrone: string
  telefono: string
  servizio: string
  prezzo: number
  durata: number
  stato: string
  note: string
  foto: number
  percorso: string
}

export type RigaCliente = {
  padrone: string
  telefono: string
  cani: string
  appuntamenti: number
  totaleSpeso: number
  ultimo: Date | null
}

export type RigaMese = { mese: string; anno: number; appuntamenti: number; totale: number; media: number | null }
export type RigaAnno = { etichetta: string; appuntamenti: number; totale: number; media: number | null }
export type RigaServizio = {
  nome: string
  tipo: string
  prezzoPiccola: number | null
  prezzoMedia: number | null
  prezzoGrande: number | null
  durataPiccola: number | null
  durataMedia: number | null
  durataGrande: number | null
  attivo: string
}
export type RigaRazza = { razza: string; taglia: string; voce: string; tipo: string; prezzo: number | null }

export type RegistroModello = {
  salone: string
  creatoIl: string
  versione: string
  conteggi: { cani: number; clienti: number; appuntamenti: number; foto: number; fileListino: number }
  cani: RigaCane[]
  visite: RigaVisita[]
  clienti: RigaCliente[]
  mesi: RigaMese[]
  anni: RigaAnno[]
  servizi: RigaServizio[]
  razze: RigaRazza[]
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function romeCampi(date: Date): { year: number; month: number; day: number; hour: string; minute: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(romeIso(date))
  if (!match) return { year: 1970, month: 1, day: 1, hour: '00', minute: '00' }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: match[4], minute: match[5] }
}

function giornoExcel(date: Date): Date {
  const campi = romeCampi(date)
  return new Date(campi.year, campi.month - 1, campi.day)
}

function iso(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function chiaveCliente(id: string, dog: Record<string, unknown>): string {
  const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
    const row = record(item)
    return row ? [row] : []
  }) : []
  const primary = contacts.find((item) => item.isPrimary === true) ?? contacts[0]
  const contact = record(dog.contact)
  const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
  const name = typeof primary?.name === 'string' ? primary.name : typeof contact?.name === 'string' ? contact.name : ''
  const digits = phone.replace(/\D/g, '')
  const trimmed = name.trim().toLowerCase()
  return digits ? `tel:${digits}` : trimmed ? `nome:${trimmed}` : `id:${typeof dog.id === 'string' ? dog.id : id}`
}

function padroneDi(dog: Record<string, unknown>): { name: string; phone: string } {
  const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
    const row = record(item)
    return row ? [row] : []
  }) : []
  const primary = contacts.find((item) => item.isPrimary) ?? contacts[0]
  const contact = record(dog.contact)
  const name = text(primary?.name) || text(contact?.name)
  const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
  return { name, phone }
}

function percorsoDi(files: GroomlyDati['files'], ref: unknown): string {
  if (typeof ref !== 'string' || !ref.startsWith('file:')) return ''
  return files[ref.slice(5)]?.percorsoBackup ?? ''
}

function serviziDi(value: unknown): Appointment['services'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = record(item)
    if (!row || typeof row.serviceId !== 'string') return []
    return [{
      serviceId: row.serviceId,
      name: text(row.name),
      durationMin: typeof row.durationMin === 'number' ? row.durationMin : 0,
      price: typeof row.price === 'number' ? row.price : 0,
    }]
  })
}

function visitaDa(id: string, raw: Record<string, unknown>, files: GroomlyDati['files']): { visit: Appointment; percorso: string } | null {
  if (raw.kind === 'personale') return null
  const start = iso(raw.start)
  if (!start || typeof raw.status !== 'string' || !STATI.has(raw.status as AppointmentStatus)) return null
  const photos = Array.isArray(raw.photos) ? raw.photos.flatMap((item) => {
    const row = record(item)
    if (!row || typeof row.photo !== 'string') return []
    const kind = row.kind === 'prima' || row.kind === 'dopo' || row.kind === 'altro' ? row.kind : 'altro'
    return [{ id: text(row.id) || id, photo: row.photo, kind }]
  }) : []
  const visit = {
    id,
    dogId: typeof raw.dogId === 'string' ? raw.dogId : '',
    start,
    services: serviziDi(raw.services),
    status: raw.status as AppointmentStatus,
    createdAt: start,
    updatedAt: start,
    kind: 'pelosetto',
    photos,
  } as Appointment
  if (typeof raw.total === 'number') visit.total = raw.total
  if (typeof raw.actualDurationMin === 'number') visit.actualDurationMin = raw.actualDurationMin
  if (typeof raw.adjustmentNote === 'string') visit.adjustmentNote = raw.adjustmentNote
  if (raw.cancelReason === 'cliente' || raw.cancelReason === 'salone' || raw.cancelReason === 'deceduto') visit.cancelReason = raw.cancelReason
  const percorso = photos.map((item) => percorsoDi(files, item.photo)).find((item) => item) ?? ''
  return { visit, percorso }
}

function ordineCodice(code: string, id: string): string {
  const match = /^C(\d+)$/.exec(code)
  return `${(match ? match[1] : '99999999').padStart(8, '0')}\u0000${id}`
}

function mediaEuro(totale: number, count: number): number | null {
  if (count === 0) return null
  return Math.round((totale / count) * 100) / 100
}

function numero(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function tripla(value: unknown): { piccola: number | null; media: number | null; grande: number | null } {
  const row = record(value)
  return {
    piccola: numero(row?.piccola),
    media: numero(row?.media),
    grande: numero(row?.grande),
  }
}

export function costruisciRegistro(dati: GroomlyDati, now: Date): RegistroModello {
  const files = dati.files
  const deleted = new Set(dati.deletedDogs.ids)
  const codici = dati.codiciCane.byId
  const parsed = Object.entries(dati.appointments).flatMap(([id, raw]) => {
    const row = record(raw)
    const visit = row ? visitaDa(id, row, files) : null
    return visit ? [visit] : []
  })
  const visite = parsed.map((item) => item.visit).sort((a, b) => b.start.getTime() - a.start.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const perCane = new Map<string, Appointment[]>()
  for (const visit of visite) {
    const list = perCane.get(visit.dogId) ?? []
    list.push(visit)
    perCane.set(visit.dogId, list)
  }
  const cani = Object.entries(dati.dogs).flatMap(([id, raw]) => {
    const dog = record(raw)
    if (!dog) return []
    const code = codici[id] ?? ''
    const owner = padroneDi(dog)
    const own = perCane.get(id) ?? []
    const done = own.filter((item) => item.status === 'completato').sort((a, b) => a.start.getTime() - b.start.getTime())
    const next = own.filter((item) => item.status === 'programmato' && item.start.getTime() >= now.getTime()).sort((a, b) => a.start.getTime() - b.start.getTime())[0]
    const last = done[done.length - 1]
    const minutes = done.flatMap((item) => typeof item.actualDurationMin === 'number' ? [item.actualDurationMin] : [])
    const gallery = Array.isArray(dog.gallery) ? dog.gallery.length : 0
    const photo = text(dog.photo)
    const size = dog.size === 'piccola' || dog.size === 'media' || dog.size === 'grande' ? SIZE_LABEL[dog.size as DogSize] : ''
    const sex = dog.sex === 'M' || dog.sex === 'F' ? SEX_LABEL[dog.sex] : ''
    const temperament = dog.temperament === 'bravo' || dog.temperament === 'agitato' || dog.temperament === 'mordace' ? TEMPERAMENT_LABEL[dog.temperament as Temperament] : ''
    const note = [text(dog.criticalNote), text(dog.notes)].filter(Boolean).join('\n')
    const percorso = percorsoDi(files, dog.photo) || (Array.isArray(dog.gallery) ? dog.gallery.map((item) => percorsoDi(files, record(item)?.photo)).find((item) => item) ?? '' : '')
    const row: RigaCane = {
      codice: code,
      cane: text(dog.name),
      razza: text(dog.breed),
      taglia: size,
      sesso: sex,
      anno: typeof dog.birthYear === 'number' ? dog.birthYear : null,
      carattere: temperament,
      padrone: owner.name,
      telefono: owner.phone,
      appuntamenti: done.length,
      primo: done[0] ? giornoExcel(done[0].start) : null,
      ultimo: last ? giornoExcel(last.start) : null,
      prossimo: next ? giornoExcel(next.start) : null,
      ultimoServizio: last ? last.services.map((item) => item.name).filter(Boolean).join(' e ') : '',
      ultimoPrezzo: last ? appointmentAmount(last) : null,
      totaleSpeso: done.reduce((sum, item) => sum + appointmentAmount(item), 0),
      tempoMedio: minutes.length ? Math.round((minutes.reduce((sum, item) => sum + item, 0) / minutes.length) * 10) / 10 : null,
      note,
      foto: (photo ? 1 : 0) + gallery + own.reduce((sum, item) => sum + (item.photos?.length ?? 0), 0),
      stato: deleted.has(id) ? 'Nascosto' : dog.status === 'deceduto' ? 'Deceduto' : dog.status === 'non_in_cura' ? 'Non più in cura' : 'Attivo',
      percorso,
    }
    return [{ id, chiave: chiaveCliente(id, dog), row }]
  }).sort((a, b) => ordineCodice(a.row.codice, a.id) < ordineCodice(b.row.codice, b.id) ? -1 : 1)

  const byId = new Map(cani.map((item) => [item.id, item.row]))
  const righeVisita: RigaVisita[] = parsed
    .sort((a, b) => b.visit.start.getTime() - a.visit.start.getTime() || (a.visit.id < b.visit.id ? -1 : 1))
    .map(({ visit, percorso }) => {
      const dog = byId.get(visit.dogId)
      const campi = romeCampi(visit.start)
      return {
        data: giornoExcel(visit.start),
        ora: `${campi.hour}:${campi.minute}`,
        codice: dog?.codice ?? '',
        cane: dog?.cane ?? '',
        razza: dog?.razza ?? '',
        padrone: dog?.padrone ?? '',
        telefono: dog?.telefono ?? '',
        servizio: visit.services.map((item) => item.name).filter(Boolean).join(' e '),
        prezzo: appointmentAmount(visit),
        durata: typeof visit.actualDurationMin === 'number' ? visit.actualDurationMin : sumDuration(visit.services),
        stato: visit.status === 'completato' ? 'Completato' : visit.status === 'disdetto' ? 'Disdetto' : visit.status === 'non_venuto' ? 'Non venuto' : 'Programmato',
        note: visit.adjustmentNote ?? '',
        foto: visit.photos?.length ?? 0,
        percorso,
      }
    })

  const groups = new Map<string, typeof cani>()
  for (const item of cani) {
    const list = groups.get(item.chiave) ?? []
    list.push(item)
    groups.set(item.chiave, list)
  }
  const clienti = [...groups.values()].map((group) => {
    const first = group[0].row
    const ids = new Set(group.map((item) => item.id))
    const done = visite.filter((item) => ids.has(item.dogId) && item.status === 'completato').sort((a, b) => a.start.getTime() - b.start.getTime())
    const last = done[done.length - 1]
    return {
      padrone: first.padrone,
      telefono: first.telefono,
      cani: group.map((item) => `${item.row.codice} ${item.row.cane}`.trim()).join(', '),
      appuntamenti: done.length,
      totaleSpeso: done.reduce((sum, item) => sum + appointmentAmount(item), 0),
      ultimo: last ? giornoExcel(last.start) : null,
    }
  }).sort((a, b) => (a.padrone < b.padrone ? -1 : a.padrone > b.padrone ? 1 : a.telefono < b.telefono ? -1 : 1))

  const incassate = visite.filter((item) => classify(item, now) === 'incassato')
  const mesi: RigaMese[] = []
  const anni: RigaAnno[] = []
  if (incassate.length > 0) {
    const first = romeCampi(incassate[incassate.length - 1].start)
    const end = romeCampi(now)
    const buckets = new Map<string, Appointment[]>()
    for (const item of incassate) {
      const campi = romeCampi(item.start)
      const key = `${campi.year}-${campi.month}`
      buckets.set(key, [...(buckets.get(key) ?? []), item])
    }
    let year = 0
    let yearCount = 0
    let yearTotal = 0
    for (let cursor = first.year * 12 + first.month - 1; cursor <= end.year * 12 + end.month - 1; cursor += 1) {
      const y = Math.floor(cursor / 12)
      const m = cursor % 12
      if (year !== 0 && y !== year) {
        anni.push({ etichetta: `Totale ${year}`, appuntamenti: yearCount, totale: yearTotal, media: mediaEuro(yearTotal, yearCount) })
        yearCount = 0
        yearTotal = 0
      }
      year = y
      const list = buckets.get(`${y}-${m + 1}`) ?? []
      const totale = list.reduce((sum, item) => sum + appointmentAmount(item), 0)
      yearCount += list.length
      yearTotal += totale
      mesi.push({ mese: `${MESI[m]} ${y}`, anno: y, appuntamenti: list.length, totale, media: mediaEuro(totale, list.length) })
    }
    if (year !== 0) anni.push({ etichetta: `Totale ${year}`, appuntamenti: yearCount, totale: yearTotal, media: mediaEuro(yearTotal, yearCount) })
  }

  const servizi = Object.values(dati.services).flatMap((raw) => {
    const row = record(raw)
    if (!row) return []
    const price = tripla(row.price)
    const duration = tripla(row.durationMin)
    return [{
      nome: text(row.name),
      tipo: row.kind === 'extra' ? 'Extra' : 'Principale',
      prezzoPiccola: price.piccola,
      prezzoMedia: price.media,
      prezzoGrande: price.grande,
      durataPiccola: duration.piccola,
      durataMedia: duration.media,
      durataGrande: duration.grande,
      attivo: row.active === true ? 'sì' : 'no',
      order: typeof row.order === 'number' ? row.order : 0,
    }]
  }).sort((a, b) => a.order - b.order || (a.nome < b.nome ? -1 : 1)).map((row) => ({
    nome: row.nome,
    tipo: row.tipo,
    prezzoPiccola: row.prezzoPiccola,
    prezzoMedia: row.prezzoMedia,
    prezzoGrande: row.prezzoGrande,
    durataPiccola: row.durataPiccola,
    durataMedia: row.durataMedia,
    durataGrande: row.durataGrande,
    attivo: row.attivo,
  }))

  const settings = record(dati.settings)
  const sheet = record(settings?.priceSheet)
  const breeds = Array.isArray(sheet?.razze) ? sheet.razze : []
  const razze = breeds.flatMap((raw) => {
    const breed = record(raw)
    if (!breed) return []
    const taglia = breed.taglia === 'piccola' || breed.taglia === 'media' || breed.taglia === 'grande' ? SIZE_LABEL[breed.taglia] : text(breed.taglia)
    const voci = Array.isArray(breed.voci) ? breed.voci : []
    return voci.flatMap((item) => {
      const voce = record(item)
      if (!voce) return []
      const tipo = voce.tipo === 'da' ? 'Da' : voce.tipo === 'fisso' ? 'Fisso' : voce.tipo === 'valutazione' ? 'Valutazione' : text(voce.tipo)
      return [{ razza: text(breed.nome), taglia, voce: text(voce.nome), tipo, prezzo: tipo === 'Valutazione' ? null : numero(voce.prezzo) }]
    })
  })

  const manifest = buildManifest(dati, { now, salonId: '', checksum: '', includiByte: false })
  return {
    salone: manifest.salone.nome || 'Groomly',
    creatoIl: romeIso(now),
    versione: APP_VERSION,
    conteggi: {
      cani: manifest.conteggi.cani,
      clienti: manifest.conteggi.clienti,
      appuntamenti: manifest.conteggi.appuntamenti,
      foto: manifest.conteggi.foto,
      fileListino: manifest.conteggi.fileListino,
    },
    cani: cani.map((item) => item.row),
    visite: righeVisita,
    clienti,
    mesi,
    anni,
    servizi,
    razze,
  }
}
```

Il filtro clienti usa `visite`, l’array di `Appointment` dichiarato prima di `perCane`, non `righeVisita`. `done` lo riordina per `start` crescente prima di prendere l’ultimo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/registroModello.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/registroModello.ts src/lib/registroModello.test.ts
git commit -m "feat: righe del Registro Excel dal json del backup"
```

---

### Task 2: File xlsx

**Files:**
- Create: `src/lib/registroXlsx.ts`
- Create: `src/lib/registroXlsx.test.ts`

**Interfaces:**
- Consumes: `costruisciRegistro` e `RegistroModello` da `src/lib/registroModello.ts`
- Produces:

```ts
export type RegistroOpzioni = { now: Date; risolviLink?: (percorsoBackup: string) => string }
export function registroXlsx(dati: GroomlyDati, opzioni: RegistroOpzioni): Promise<Blob>
```

- [ ] **Step 1: Write the failing test**

Creare `src/lib/registroXlsx.test.ts`. Il caso felice riusa la stessa forma del test del task 1: un cane `d1` telefono `0333`, visita `a1` completata a `2026-10-22T21:30:00.000Z` prezzo 10, codice `C0001`, `now` = `2026-10-23T12:00:00.000Z`.

```ts
import { describe, expect, it } from 'vitest'
import type { GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-23T12:00:00.000Z')
const VISITA = '2026-10-22T21:30:00.000Z'

function dati(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {
      d1: {
        id: 'd1', name: 'Fido', breed: 'Barboncino', size: 'piccola', sex: 'M', birthYear: 2019,
        temperament: 'bravo', contact: { name: 'Ada', phone: '0333' },
        contacts: [{ id: 'c', name: 'Ada', role: '', phone: '0333', isPrimary: true }],
        photo: 'file:f1', gallery: [], status: 'attivo', notes: 'Lame 4',
      },
    },
    appointments: {
      a1: {
        id: 'a1', dogId: 'd1', start: VISITA, status: 'completato',
        services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
        photos: [{ id: 'p', photo: 'file:f1', kind: 'prima' }],
      },
    },
    services: {
      s: { id: 's', name: 'Bagno', kind: 'principale', price: { piccola: 10, media: 20, grande: 30 }, durationMin: { piccola: 30, media: 40, grande: 50 }, order: 1, active: true },
    },
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: { f1: { id: 'f1', kind: 'foto', owner: 'dog:d1', name: 'profilo.webp', createdAt: 1, createdBy: 'u', estensione: '.webp', percorsoBackup: 'cani/C0001/profilo.webp', esito: 'ok' } },
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    fotoMancanti: [],
  }
}

async function book(blob: Blob) {
  const excel = await import('exceljs')
  const ExcelJS = excel.default ?? excel
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  return workbook
}

describe('registroXlsx', () => {
  it('apre su Cani, con data di Roma e telefono testo', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW }))
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Cani', 'Appuntamenti', 'Clienti', 'Incassi mensili', 'Listino', 'Info'])
    expect(workbook.views?.[0]?.activeTab ?? 0).toBe(0)
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).not.toContain('Cartella foto')
    expect(headers).toContain('Telefono')
    const phone = cani?.getRow(2).getCell(headers.indexOf('Telefono') + 1)
    expect(phone?.value).toBe('0333')
    expect(phone?.numFmt).toBe('@')
    const visite = workbook.getWorksheet('Appuntamenti')
    const visitHeaders = (visite?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const data = visite?.getRow(2).getCell(visitHeaders.indexOf('Data') + 1).value as Date
    expect(data.getFullYear()).toBe(2026)
    expect(data.getMonth()).toBe(9)
    expect(data.getDate()).toBe(22)
    expect(visite?.getRow(2).getCell(visitHeaders.indexOf('Ora') + 1).value).toBe('23:30')
    const stato = visite?.getRow(2).getCell(visitHeaders.indexOf('Stato') + 1)
    expect(stato?.value).toBe('Completato')
    expect(stato?.fill && 'fgColor' in stato.fill ? stato.fill.fgColor?.argb : '').toBe('FFE2F4EA')
    const info = workbook.getWorksheet('Info')
    expect(info?.getCell('B1').value).toBe('Pelosetti')
    expect(String(info?.getCell('B2').value)).toContain('+02:00')
  })

  it('con risolviLink aggiunge Apri cartella', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW, risolviLink: () => 'https://esempio/cartella' }))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    const href = raw && typeof raw === 'object' && 'hyperlink' in raw ? raw.hyperlink : cell?.hyperlink
    expect(text).toBe('Apri cartella')
    expect(href).toBe('https://esempio/cartella')
  })

  it('un registro vuoto si apre', async () => {
    const empty = dati()
    empty.dogs = {}
    empty.appointments = {}
    empty.services = {}
    empty.files = {}
    const workbook = await book(await registroXlsx(empty, { now: NOW }))
    expect(workbook.getWorksheet('Cani')?.getRow(1).getCell(1).value).toBe('Codice')
    expect(workbook.getWorksheet('Incassi mensili')?.getRow(1).getCell(1).value).toBe('Mese')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/registroXlsx.test.ts`

Expected: FAIL, cannot find module `./registroXlsx`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/registroXlsx.ts`.

```ts
import { Workbook, type FillPattern, type Worksheet } from 'exceljs'
import type { GroomlyDati } from './backupBundle'
import { costruisciRegistro, type RigaMese } from './registroModello'

export type RegistroOpzioni = { now: Date; risolviLink?: (percorsoBackup: string) => string }

const HEADER: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A5BA0' } }
const STRIPE: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6ECF8' } }
const FONDI: Record<string, FillPattern> = {
  Completato: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F4EA' } },
  Programmato: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } },
  Disdetto: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF0D8' } },
  'Non venuto': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE6E4' } },
}

type Cella = string | number | Date | null | { text: string; hyperlink: string }

function larghezza(sheet: Worksheet, headers: string[], rows: Cella[][]) {
  headers.forEach((header, index) => {
    const longest = rows.reduce((max, row) => {
      const cell = row[index]
      const text = cell instanceof Date ? '00/00/0000' : typeof cell === 'object' && cell ? cell.text : String(cell ?? '')
      return Math.max(max, text.length)
    }, header.length)
    sheet.getColumn(index + 1).width = Math.min(40, Math.max(10, longest + 2))
  })
}

function scriviTabella(sheet: Worksheet, name: string, headers: string[], rows: Cella[][], freezeCols: number) {
  if (rows.length === 0) {
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  } else {
    sheet.addTable({
      name,
      ref: 'A1',
      headerRow: true,
      style: { showRowStripes: false },
      columns: headers.map((header) => ({ name: header, filterButton: true })),
      rows,
    })
    headers.forEach((_header, index) => {
      const cell = sheet.getCell(1, index + 1)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  }
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: freezeCols, showGridLines: true }]
  rows.forEach((row, rowIndex) => {
    row.forEach((value, column) => {
      const cell = sheet.getCell(rowIndex + 2, column + 1)
      if (value instanceof Date) cell.numFmt = 'dd/mm/yyyy'
      if (headers[column] === 'Telefono') cell.numFmt = '@'
      if (headers[column] === 'Ultimo prezzo' || headers[column] === 'Totale speso' || headers[column] === 'Prezzo' || headers[column].startsWith('Prezzo ')) cell.numFmt = '€ #,##0.00'
      if (headers[column] === 'Tempo medio' && typeof value === 'number') cell.numFmt = '0.0'
      if (headers[column] === 'Note') cell.alignment = { wrapText: true, vertical: 'top' }
      if (rowIndex % 2 === 1 && headers[column] !== 'Stato') cell.fill = STRIPE
      if (headers[column] === 'Stato' && typeof value === 'string' && FONDI[value]) cell.fill = FONDI[value]
      if (value && typeof value === 'object' && 'hyperlink' in value) {
        cell.value = value
        cell.font = { color: { argb: 'FF3A5BA0' }, underline: true }
      }
    })
  })
  larghezza(sheet, headers, rows)
}

function link(opzioni: RegistroOpzioni, percorso: string): Cella {
  if (!opzioni.risolviLink || !percorso) return null
  return { text: 'Apri cartella', hyperlink: opzioni.risolviLink(percorso) }
}

export async function registroXlsx(dati: GroomlyDati, opzioni: RegistroOpzioni): Promise<Blob> {
  const registro = costruisciRegistro(dati, opzioni.now)
  const book = new Workbook()
  book.title = 'Registro Groomly'
  book.creator = registro.salone
  book.views = [{ activeTab: 0 }]
  const conLink = Boolean(opzioni.risolviLink)

  const caniHeaders = ['Codice', 'Cane', 'Razza', 'Taglia', 'Sesso', 'Anno', 'Carattere', 'Padrone', 'Telefono', 'Appuntamenti', 'Primo', 'Ultimo', 'Prossimo', 'Ultimo servizio', 'Ultimo prezzo', 'Totale speso', 'Tempo medio', 'Note', 'Foto', 'Stato']
  if (conLink) caniHeaders.push('Cartella foto')
  const cani = book.addWorksheet('Cani')
  scriviTabella(cani, 'Cani', caniHeaders, registro.cani.map((row) => {
    const values: Cella[] = [row.codice, row.cane, row.razza, row.taglia, row.sesso, row.anno, row.carattere, row.padrone, row.telefono, row.appuntamenti, row.primo, row.ultimo, row.prossimo, row.ultimoServizio, row.ultimoPrezzo, row.totaleSpeso, row.tempoMedio, row.note, row.foto, row.stato]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 2)

  const visitaHeaders = ['Data', 'Ora', 'Codice', 'Cane', 'Razza', 'Padrone', 'Telefono', 'Servizio', 'Prezzo', 'Durata', 'Stato', 'Note', 'Foto']
  if (conLink) visitaHeaders.push('Cartella foto')
  const visite = book.addWorksheet('Appuntamenti')
  scriviTabella(visite, 'Appuntamenti', visitaHeaders, registro.visite.map((row) => {
    const values: Cella[] = [row.data, row.ora, row.codice, row.cane, row.razza, row.padrone, row.telefono, row.servizio, row.prezzo, row.durata, row.stato, row.note, row.foto]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 0)

  const clienti = book.addWorksheet('Clienti')
  scriviTabella(clienti, 'Clienti', ['Padrone', 'Telefono', 'Cani', 'Appuntamenti', 'Totale speso', 'Ultimo appuntamento'], registro.clienti.map((row) => [row.padrone, row.telefono, row.cani, row.appuntamenti, row.totaleSpeso, row.ultimo]), 0)

  const incassi = book.addWorksheet('Incassi mensili')
  const mesi: Cella[][] = registro.mesi.map((row: RigaMese) => [row.mese, row.appuntamenti, row.totale, row.media])
  scriviTabella(incassi, 'IncassiMensili', ['Mese', 'Appuntamenti', 'Totale', 'Media'], mesi, 0)
  registro.anni.forEach((row, index) => {
    const line = mesi.length + 3 + index
    ;[row.etichetta, row.appuntamenti, row.totale, row.media].forEach((value, column) => {
      const cell = incassi.getCell(line, column + 1)
      cell.value = value
      cell.font = { bold: true }
      if (column >= 2 && typeof value === 'number') cell.numFmt = '€ #,##0.00'
    })
  })

  const listino = book.addWorksheet('Listino')
  const serviziHeaders = ['Nome', 'Tipo', 'Prezzo piccola', 'Prezzo media', 'Prezzo grande', 'Durata piccola', 'Durata media', 'Durata grande', 'Attivo']
  const serviziRighe = registro.servizi.map((row) => [row.nome, row.tipo, row.prezzoPiccola, row.prezzoMedia, row.prezzoGrande, row.durataPiccola, row.durataMedia, row.durataGrande, row.attivo])
  scriviTabella(listino, 'Servizi', serviziHeaders, serviziRighe, 0)
  const start = serviziRighe.length + 3
  const razzeHeaders = ['Razza', 'Taglia', 'Voce', 'Tipo', 'Prezzo']
  if (registro.razze.length === 0) {
    razzeHeaders.forEach((header, index) => {
      const cell = listino.getCell(start, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  } else {
    listino.addTable({
      name: 'Razze',
      ref: `A${start}`,
      headerRow: true,
      style: { showRowStripes: false },
      columns: razzeHeaders.map((header) => ({ name: header, filterButton: true })),
      rows: registro.razze.map((row) => [row.razza, row.taglia, row.voce, row.tipo, row.prezzo]),
    })
    razzeHeaders.forEach((_header, index) => {
      const cell = listino.getCell(start, index + 1)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  }

  const info = book.addWorksheet('Info')
  const voci: Array<[string, string | number]> = [
    ['Salone', registro.salone],
    ['Creato il', registro.creatoIl],
    ['Versione app', registro.versione],
    ['Cani', registro.conteggi.cani],
    ['Clienti', registro.conteggi.clienti],
    ['Appuntamenti', registro.conteggi.appuntamenti],
    ['Foto', registro.conteggi.foto],
    ['File di listino', registro.conteggi.fileListino],
    ['Cartelle', 'La colonna delle cartelle foto arriva con il backup completo.'],
    ['Legenda', 'Completato verde, Programmato grigio, Disdetto ambra, Non venuto rosso'],
  ]
  voci.forEach(([label, value], index) => {
    info.getCell(index + 1, 1).value = label
    info.getCell(index + 1, 1).font = { bold: true }
    info.getCell(index + 1, 2).value = value
  })
  info.getColumn(1).width = 22
  info.getColumn(2).width = 72

  const buffer = await book.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
```

Non aggiungere altre colonne.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/registroXlsx.test.ts src/lib/registroModello.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/registroXlsx.ts src/lib/registroXlsx.test.ts
git commit -m "feat: file Registro Groomly in excel"
```

---

### Task 3: Pulsante sulla card

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `registroXlsx` da `src/lib/registroXlsx.ts`, `raccogliBackup` da `src/data/firebase/backupCollect.ts`, `shareFiles`, `downloadAnchor`, `isShareCancel` da `src/lib/shareFile.ts`, `AppError` da `src/data/errors.ts`, `Capacitor` da `@capacitor/core`
- Produces: il pulsante **Registro Excel** nella card Dati e backup

- [ ] **Step 1: Write the failing test**

In cima a `src/pages/SettingsPage.test.tsx`, dopo gli import esistenti, aggiungere:

```ts
import { AppError } from '../data/errors'
import type { GroomlyDati } from '../lib/backupBundle'

const { raccogliBackup } = vi.hoisted(() => ({ raccogliBackup: vi.fn() }))
vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup }))

function datiRegistro(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
  }
}
```

Dentro `describe('impostazioni')`, aggiungere questi due test. `captureDownloads` ed `enter` esistono già nel file.

```ts
  it('Registro Excel consegna Registro Groomly.xlsx e intanto è disabilitato', async () => {
    let release: (value: { dati: GroomlyDati }) => void = () => undefined
    const gate = new Promise<{ dati: GroomlyDati }>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Registro Excel' })
    await user.click(button)
    expect(button).toBeDisabled()
    release({ dati: datiRegistro() })
    await waitFor(() => expect(downloads.some((item) => item.name === 'Registro Groomly.xlsx')).toBe(true))
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
  })

  it('Registro Excel senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Registro Excel' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL, unable to find a button named Registro Excel

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx`:

1. Aggiungere agli import: `Capacitor` da `@capacitor/core`, `AppError` da `../data/errors`, `downloadAnchor`, `isShareCancel`, `shareFiles` da `../lib/shareFile`.
2. Accanto a `restoring`, aggiungere `const [registroBusy, setRegistroBusy] = useState(false)`.
3. Aggiungere questa funzione nel componente, senza modificare `runBackup`, `exportZip`, `onRestoreFile` o `onAuto`.

```ts
  async function exportRegistro() {
    if (!uid || registroBusy) return
    setRegistroBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const raccolto = await raccogliBackup(now, { includiByte: false })
      const blob = await registroXlsx(raccolto.dati, { now })
      const file = { blob, name: 'Registro Groomly.xlsx' }
      if (Capacitor.isNativePlatform()) await shareFiles([file], 'Registro Groomly')
      else downloadAnchor(blob, file.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setRegistroBusy(false)
    }
  }
```

4. Subito dopo la `SRow` che contiene Esporta e Ripristina, aggiungere:

```tsx
          <SRow>
            <Button onClick={() => void exportRegistro()} disabled={registroBusy} aria-busy={registroBusy} style={{ flex: 1 }}>
              Registro Excel
            </Button>
          </SRow>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/registroXlsx.test.ts src/lib/registroModello.test.ts`

Expected: PASS

Poi, una volta sola: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: pulsante Registro Excel nella scheda backup"
```

---

### Task 4: Pubblicazione

Solo dopo che il task 3 ha la suite verde. La scheda è cambiata: si alza la patch da `1.1.68` a `1.1.69`. `versionCode` diventa `10169`.

- [ ] **Step 1: Alzare la versione negli stessi quattro punti**

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.69'`
- `package.json` → `"version": "1.1.69"`
- `android/app/build.gradle` → `versionName "1.1.69"` e `versionCode 10169`
- `hosting/release.json` → `version` `1.1.69`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.69/groomly.apk`, e nelle note la frase «In Dati e backup, Registro Excel crea un file da aprire e filtrare, senza le foto.»

- [ ] **Step 2: Verificare e costruire**

`npm test`, poi `npm run build`, `npx cap sync android`, e in `android` `.\gradlew assembleDebug`. Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice, fuori da `hosting/` e fuori dal commit.

- [ ] **Step 3: Commit, push e release**

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "release: 1.1.69, Registro Excel nella scheda backup"
git push origin HEAD
gh release create v1.1.69 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.69" --notes "In Dati e backup, Registro Excel crea un file da aprire e filtrare, senza le foto."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook. Non committare `groomly.apk`.

---

## Copertura della specifica

- Flusso del pulsante e confini con gli altri controlli: task 3.
- Lettura ISO, Roma, lapide, clienti, personali, incassi, listino: task 1.
- Fogli, formati, colonna condizionale, file vuoto: task 2.
- Prove di pagina e pubblicazione: task 3 e task 4.
