# Groomly ciclo 2 — Cani — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il segnaposto Animali con la lista e la scheda cane, salvate sul dispositivo in `groomly.users.{uid}.dogs`.

**Architecture:** Le pagine chiamano solo `useDogs`. L’hook chiama solo `src/data/local/dogs.ts`, che usa `readJson` e `writeJson`. Nel dominio le date sono `Date`; su disco sono ISO. La foto è un JPEG già ridotto, scritto sulla scheda. Ricerca, tab e chip sono funzioni pure e non scrivono.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6, react-hook-form, Zod 3, Vitest 3.2.7, Testing Library, happy-dom per i test che montano `App`.

Directory di lavoro: `D:\Groomly`. Shell: PowerShell. Non usare `&&`. Non usare HEREDOC bash: il commit va con la here-string PowerShell mostrata in ogni task. Branch di lavoro: `feat/groomly-cani`, creato dal `master` attuale prima del Task 1. Non committare `GROOMLY.md`, `groomly-design.html`, `groomly-cursor-kit.zip`, né `docs/superpowers/plans/`.

Specifica: `docs/superpowers/specs/2026-10-03-groomly-cani-design.md`.

## Global Constraints

Ogni task include queste regole. I valori sono quelli della specifica.

- Interfaccia solo in italiano.
- Chiave `groomly.users.{uid}.dogs`. Date `Date` nel dominio, ISO nello storage. La foto è `data:image/jpeg;base64,…` sullo stesso oggetto.
- Obbligatori: nome del cane e telefono, trimmati. Errori: «Il nome è obbligatorio», «Il telefono è obbligatorio». Il telefono non ha un formato.
- Default di un cane nuovo: specie `cane`, taglia `piccola`, carattere `bravo`, tipo cliente `occasionale`, categoria `adulto`. Il sesso parte non scelto e, se assente, non si salva.
- Razza e nome del proprietario vuoti si salvano come stringa vuota. Nota e avviso critico vuoti non si salvano.
- `searchKey`: nome, razza e nome del contatto, minuscolo, senza accenti (NFD, segni combinanti rimossi), spazi compressi. Il telefono ne resta fuori. Lo ricostruisce il repository a ogni creazione e aggiornamento.
- Foto: quadrato, ritaglio centrale, lato massimo 256, JPEG qualità `0.7`. File non immagine o compressione fallita: «Foto non utilizzabile», foto precedente invariata.
- Archivio: `non_in_cura` («Non più in cura») o `deceduto` («Deceduto»), con `archivedAt`. Ripristino: `attivo` e senza `archivedAt`. Nessuna eliminazione definitiva. L’archivio è immediato, senza conferma.
- Tab: Attivi, Mensili, Occasionali, Archivio. Un solo chip: Tutti, Mordaci, Anziani, Gatti. I conteggi delle tab e il sottotitolo «N attivi · M in archivio» ignorano chip e ricerca. Ordine `localeCompare('it')` sul nome.
- Lista vuota: «Nessun cane». Nessun cane di esempio.
- Toast «Salvato» con tono `ok`. «Salvataggio non riuscito» e «Foto non utilizzabile» con tono `plain`. Archivio e ripristino riusciti non hanno un toast.
- «Nuovo appuntamento» resta il toast «In arrivo».
- JSON cani illeggibile: «Dati locali illeggibili», e il valore resta nella chiave.
- Esci toglie solo `groomly.session`.
- Colonna massima 390 px. A 360 px nessuno scroll orizzontale.
- I test che montano `<App>` portano `// @vitest-environment happy-dom` come prima riga. Lo spy della scrittura è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`.
- Non alzare Vitest. Non creare `src/lib/firebase.ts`. Non implementare appuntamenti, calendario, agenda, mensili come promemoria, listino PDF, backup, Storage, Capacitor, tag, peso, galleria, prezzi in scheda, contatti extra.
- Non modificare il comportamento già chiuso di `Input`: l’errore resta dentro la `label` e `forwardRef` resta. Non aggiungere `end` al `NavLink` della Home. Dopo un errore di campo, il nome accessibile della label include il testo dell’errore: i test cercano il messaggio con `getByText`, non rifanno `getByLabelText('Nome')`.

## File map

| File | Responsabilità |
|---|---|
| `src/data/errors.ts` | Aggiunge il codice `dog_missing` |
| `src/data/local/storage.ts` | Chiave `dogs` e regex delle chiavi JSON |
| `src/types/models.ts` | Tipi `Dog`, `DogDraft`, `DogWrite` |
| `src/lib/dogList.ts` | `searchKey`, conteggi, filtri, etichette, riga |
| `src/lib/schemas.ts` | `dogFormSchema` |
| `src/lib/dogPhoto.ts` | Ritaglio quadrato e JPEG |
| `src/data/local/dogs.ts` | Lettura e scrittura della mappa |
| `src/hooks/useDogs.ts` | Lista e azioni, booleani, nessun toast |
| `src/pages/DogsPage.tsx` | Lista, ricerca, tab, chip |
| `src/pages/DogFields.tsx` | Campi del modulo |
| `src/pages/DogPage.tsx` | Scheda in lettura e in modifica |
| `src/app/router.tsx` | `/animali`, `/animali/nuovo`, `/animali/:id` |
| `src/pages/ShellFrame.tsx` | «Nuovo cane» naviga; «Nuovo appuntamento» resta «In arrivo» |
| `src/pages/HomePage.tsx` | La ricerca apre Animali e chiede il fuoco |

---

### Task 1: Chiave cani e dati illeggibili

**Files:**
- Modify: `src/data/local/storage.ts`
- Create: `src/data/local/storage.test.ts`
- Create: `src/app/corruptStorage.test.tsx`

**Interfaces:**
- Consumes: `findCorruptGroomlyKey`, `createAccount`, `App`
- Produces: `storageKeys.dogs(uid: string): string`. La regex di `findCorruptGroomlyKey` include `dogs`.

- [ ] **Step 1: Creare il branch e scrivere i test che falliscono**

```powershell
git checkout -b feat/groomly-cani
```

Se il branch esiste già, `git checkout feat/groomly-cani` e non ricrearlo.

Creare `src/data/local/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { findCorruptGroomlyKey, storageKeys } from './storage'

describe('storage cani', () => {
  beforeEach(() => localStorage.clear())

  it('riconosce la mappa cani illeggibile e non la cancella', () => {
    const key = storageKeys.dogs('uid-1')
    localStorage.setItem(key, '{')
    expect(findCorruptGroomlyKey()).toBe(key)
    expect(localStorage.getItem(key)).toBe('{')
  })

  it('riconosce ancora i servizi illeggibili', () => {
    const key = storageKeys.services('uid-1')
    localStorage.setItem(key, '{')
    expect(findCorruptGroomlyKey()).toBe(key)
  })
})
```

Creare `src/app/corruptStorage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { createAccount } from '../data/local/auth'
import { storageKeys } from '../data/local/storage'

describe('mappa cani illeggibile', () => {
  beforeEach(() => localStorage.clear())

  it('mostra il messaggio e lascia il valore nella chiave', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const key = storageKeys.dogs(account.uid)
    localStorage.setItem(key, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe('{')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/storage.test.ts src/app/corruptStorage.test.tsx`

Expected: FAIL. `storageKeys.dogs` non esiste, quindi la mappa `{` non viene vista e l’app mostra il login invece di «Dati locali illeggibili».

- [ ] **Step 3: Write minimal implementation**

Sostituire `src/data/local/storage.ts` con:

```ts
import { AppError } from '../errors'

export const storageKeys = {
  auth: 'groomly.auth',
  session: 'groomly.session',
  settings: (uid: string) => `groomly.users.${uid}.settings`,
  services: (uid: string) => `groomly.users.${uid}.services`,
  dogs: (uid: string) => `groomly.users.${uid}.dogs`,
}

const JSON_KEY = /^groomly\.(auth|users\..+\.(settings|services|dogs))$/

export function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
}

export function findCorruptGroomlyKey(): string | null {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !JSON_KEY.test(key)) continue
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      JSON.parse(raw)
    } catch {
      return key
    }
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/storage.test.ts src/app/corruptStorage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/storage.ts src/data/local/storage.test.ts src/app/corruptStorage.test.tsx
git commit -m @"
feat: riconosce la mappa cani illeggibile

"@
```

---

### Task 2: Tipi, ricerca, tab e chip

**Files:**
- Modify: `src/types/models.ts`
- Create: `src/lib/dogList.ts`
- Test: `src/lib/dogList.test.ts`

**Interfaces:**
- Consumes: niente dal Task 1
- Produces:
  - tipi `Species`, `Sex`, `AgeCategory`, `DogSize`, `Temperament`, `ClientType`, `DogStatus`, `DogContact`, `Dog`, `DogDraft`, `DogWrite`
  - `normalizeSearch(value: string): string`
  - `buildSearchKey(name: string, breed: string, contactName: string): string`
  - `DogTab` = `'attivi' | 'mensili' | 'occasionali' | 'archivio'`
  - `DogChip` = `'tutti' | 'mordaci' | 'anziani' | 'gatti'`
  - `countDogs(dogs: Dog[]): { attivi: number; mensili: number; occasionali: number; archivio: number }`
  - `visibleDogs(dogs: Dog[], tab: DogTab, chip: DogChip, query: string): Dog[]`
  - `dogMeta(dog: Dog): string`
  - `SPECIES_LABEL`, `SEX_LABEL`, `AGE_LABEL`, `SIZE_LABEL`, `TEMPERAMENT_LABEL`, `CLIENT_LABEL`, `ARCHIVE_LABEL`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/dogList.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildSearchKey, countDogs, dogMeta, normalizeSearch, visibleDogs, type DogChip, type DogTab } from './dogList'
import type { Dog, DogStatus } from '../types/models'

function dog(partial: Pick<Dog, 'id' | 'name'> & Partial<Dog>): Dog {
  const breed = partial.breed ?? ''
  const contact = partial.contact ?? { name: '', phone: '111' }
  const status: DogStatus = partial.status ?? 'attivo'
  return {
    species: 'cane',
    breed,
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact,
    status,
    searchKey: '',
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
    updatedAt: new Date('2026-10-03T12:00:00.000Z'),
    ...partial,
    contact,
    breed,
    searchKey: buildSearchKey(partial.name, breed, contact.name),
  }
}

describe('buildSearchKey', () => {
  it('unisce nome, razza e proprietario senza accenti e senza telefono', () => {
    expect(buildSearchKey('  Caffè ', 'Barboncino', 'Lea')).toBe('caffe barboncino lea')
    expect(normalizeSearch('Caffè')).toBe('caffe')
    expect(buildSearchKey('Bobi', '', '')).toBe('bobi')
    expect(buildSearchKey('Bobi', '', '').includes('333')).toBe(false)
  })
})

describe('visibleDogs', () => {
  const dogs = [
    dog({ id: '1', name: 'Zoe', breed: 'Bassotto', contact: { name: 'Sara', phone: '333' } }),
    dog({ id: '2', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }),
    dog({
      id: '3', name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano',
      temperament: 'mordace', clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }),
    dog({ id: '4', name: 'Nero', species: 'gatto', status: 'deceduto', contact: { name: 'Ada', phone: '444' } }),
  ]

  it('filtra tab e chip insieme e ignora il telefono', () => {
    expect(visibleDogs(dogs, 'attivi', 'tutti', '').map((item) => item.name)).toEqual(['Zoe', 'Bobi', 'Micio'])
    const accent = dog({ id: '5', name: 'Caffè' })
    expect(visibleDogs([accent], 'attivi', 'tutti', 'caffe').map((item) => item.name)).toEqual(['Caffè'])
    expect(visibleDogs(dogs, 'mensili', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'archivio', 'gatti', '').map((item) => item.name)).toEqual(['Nero'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'lea').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'Caffè')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'tutti', '222')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'mordaci', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'anziani', '').map((item) => item.name)).toEqual(['Micio'])
  })

  it('conta sull’intera lista', () => {
    expect(countDogs(dogs)).toEqual({ attivi: 3, mensili: 1, occasionali: 2, archivio: 1 })
    const tab: DogTab = 'attivi'
    const chip: DogChip = 'gatti'
    expect(countDogs(visibleDogs(dogs, tab, chip, 'lea')).attivi).toBe(1)
    expect(countDogs(dogs).attivi).toBe(3)
  })
})

describe('dogMeta', () => {
  it('omette i pezzi vuoti e usa l’etichetta italiana', () => {
    expect(dogMeta(dog({ id: '1', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '1' } }))).toBe('Labrador · Adulto · Sara')
    expect(dogMeta(dog({ id: '2', name: 'Bobi', breed: '  ', contact: { name: '', phone: '1' } }))).toBe('Adulto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dogList.test.ts`

Expected: FAIL. Il modulo `./dogList` non esiste.

- [ ] **Step 3: Write minimal implementation**

In coda a `src/types/models.ts`, senza toccare i tipi dei servizi, aggiungere:

```ts
export type Species = 'cane' | 'gatto' | 'altro'
export type Sex = 'M' | 'F'
export type AgeCategory = 'cucciolo' | 'giovane' | 'adulto' | 'anziano'
export type DogSize = 'piccola' | 'media' | 'grande'
export type Temperament = 'bravo' | 'agitato' | 'mordace'
export type ClientType = 'mensile' | 'occasionale'
export type DogStatus = 'attivo' | 'non_in_cura' | 'deceduto'

export interface DogContact {
  name: string
  phone: string
}

export interface DogDraft {
  name: string
  species: Species
  breed: string
  sex?: Sex
  ageCategory: AgeCategory
  size: DogSize
  temperament: Temperament
  clientType: ClientType
  criticalNote?: string
  notes?: string
  contact: DogContact
}

export interface DogWrite extends DogDraft {
  photo?: string
}

export interface Dog extends DogWrite {
  id: string
  status: DogStatus
  archivedAt?: Date
  searchKey: string
  createdAt: Date
  updatedAt: Date
}
```

Creare `src/lib/dogList.ts`:

```ts
import type { AgeCategory, ClientType, Dog, DogSize, DogStatus, Sex, Species, Temperament } from '../types/models'

export type DogTab = 'attivi' | 'mensili' | 'occasionali' | 'archivio'
export type DogChip = 'tutti' | 'mordaci' | 'anziani' | 'gatti'

export const SPECIES_LABEL: Record<Species, string> = { cane: 'Cane', gatto: 'Gatto', altro: 'Altro' }
export const SEX_LABEL: Record<Sex, string> = { M: 'Maschio', F: 'Femmina' }
export const AGE_LABEL: Record<AgeCategory, string> = { cucciolo: 'Cucciolo', giovane: 'Giovane', adulto: 'Adulto', anziano: 'Anziano' }
export const SIZE_LABEL: Record<DogSize, string> = { piccola: 'Piccola', media: 'Media', grande: 'Grande' }
export const TEMPERAMENT_LABEL: Record<Temperament, string> = { bravo: 'Bravo', agitato: 'Agitato', mordace: 'Mordace' }
export const CLIENT_LABEL: Record<ClientType, string> = { mensile: 'Mensile', occasionale: 'Occasionale' }
export const ARCHIVE_LABEL: Record<Exclude<DogStatus, 'attivo'>, string> = { non_in_cura: 'Non più in cura', deceduto: 'Deceduto' }

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function buildSearchKey(name: string, breed: string, contactName: string): string {
  return normalizeSearch([name, breed, contactName].join(' '))
}

export function dogMeta(dog: Dog): string {
  return [dog.breed.trim(), AGE_LABEL[dog.ageCategory], dog.contact.name.trim()].filter((part) => part !== '').join(' · ')
}

function inTab(dog: Dog, tab: DogTab): boolean {
  if (tab === 'archivio') return dog.status === 'non_in_cura' || dog.status === 'deceduto'
  if (dog.status !== 'attivo') return false
  if (tab === 'mensili') return dog.clientType === 'mensile'
  if (tab === 'occasionali') return dog.clientType === 'occasionale'
  return true
}

function inChip(dog: Dog, chip: DogChip): boolean {
  if (chip === 'mordaci') return dog.temperament === 'mordace'
  if (chip === 'anziani') return dog.ageCategory === 'anziano'
  if (chip === 'gatti') return dog.species === 'gatto'
  return true
}

export function countDogs(dogs: Dog[]): { attivi: number; mensili: number; occasionali: number; archivio: number } {
  return {
    attivi: dogs.filter((dog) => inTab(dog, 'attivi')).length,
    mensili: dogs.filter((dog) => inTab(dog, 'mensili')).length,
    occasionali: dogs.filter((dog) => inTab(dog, 'occasionali')).length,
    archivio: dogs.filter((dog) => inTab(dog, 'archivio')).length,
  }
}

export function visibleDogs(dogs: Dog[], tab: DogTab, chip: DogChip, query: string): Dog[] {
  const normalized = normalizeSearch(query)
  return dogs.filter((dog) => {
    if (!inTab(dog, tab)) return false
    if (!inChip(dog, chip)) return false
    if (!normalized) return true
    return dog.searchKey.includes(normalized)
  })
}
```

Il test di `dogMeta` con razza `'  '` dipende da `breed.trim()`. `buildSearchKey` non è chiamato con quella razza nel primo describe. Nel helper del test, `breed` è il valore passato e `searchKey` usa quel valore: per il caso meta, `breed: '  '` resta con gli spazi e `dogMeta` fa `trim`. Non normalizzare la razza dentro `dogMeta` oltre al `trim`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dogList.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/lib/dogList.ts src/lib/dogList.test.ts
git commit -m @"
feat: filtra e conta i cani senza scrivere

"@
```

---

### Task 3: Schema della scheda

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/schemas.test.ts`

**Interfaces:**
- Consumes: `DogDraft` dal Task 2
- Produces: `dogFormSchema`, input con `sex: '' | 'M' | 'F'`, output `DogDraft`

- [ ] **Step 1: Write the failing test**

In coda a `src/lib/schemas.test.ts` aggiungere l’import di `dogFormSchema` e questo describe. L’import esistente diventa `import { dogFormSchema, loginSchema, serviceFormSchema } from './schemas'`.

```ts
const validDog = {
  name: 'Bobi',
  species: 'cane',
  breed: '',
  sex: '',
  ageCategory: 'adulto',
  size: 'piccola',
  temperament: 'bravo',
  clientType: 'occasionale',
  contactName: '',
  phone: '333',
  notes: '',
  criticalNote: '',
}

describe('dogFormSchema', () => {
  it('tiene i default, il sesso vuoto e l’avviso compilato', () => {
    const parsed = dogFormSchema.parse({
      ...validDog,
      name: '  Bobi ',
      breed: '  ',
      contactName: '  Lea ',
      phone: ' 333 ',
      notes: '   ',
      criticalNote: ' morde ',
    })
    expect(parsed).toEqual({
      name: 'Bobi',
      species: 'cane',
      breed: '',
      ageCategory: 'adulto',
      size: 'piccola',
      temperament: 'bravo',
      clientType: 'occasionale',
      contact: { name: 'Lea', phone: '333' },
      criticalNote: 'morde',
    })
    expect(parsed.sex).toBeUndefined()
    expect(parsed.notes).toBeUndefined()
  })

  it('rifiuta nome e telefono vuoti con i messaggi della scheda', () => {
    const failed = dogFormSchema.safeParse({ ...validDog, name: '  ', phone: '  ' })
    expect(failed.success).toBe(false)
    if (!failed.success) {
      const messages = failed.error.issues.map((issue) => issue.message)
      expect(messages).toContain('Il nome è obbligatorio')
      expect(messages).toContain('Il telefono è obbligatorio')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schemas.test.ts`

Expected: FAIL. `dogFormSchema` non è esportato.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/schemas.ts` aggiungere l’import di `DogDraft` da `../types/models` e, in coda al file:

```ts
import type { DogDraft } from '../types/models'

export const dogFormSchema = z.object({
  name: z.string().trim().min(1, 'Il nome è obbligatorio'),
  species: z.enum(['cane', 'gatto', 'altro']),
  breed: z.string().trim(),
  sex: z.enum(['', 'M', 'F']),
  ageCategory: z.enum(['cucciolo', 'giovane', 'adulto', 'anziano']),
  size: z.enum(['piccola', 'media', 'grande']),
  temperament: z.enum(['bravo', 'agitato', 'mordace']),
  clientType: z.enum(['mensile', 'occasionale']),
  contactName: z.string().trim(),
  phone: z.string().trim().min(1, 'Il telefono è obbligatorio'),
  notes: z.string().trim(),
  criticalNote: z.string().trim(),
}).transform((value): DogDraft => ({
  name: value.name,
  species: value.species,
  breed: value.breed,
  sex: value.sex === '' ? undefined : value.sex,
  ageCategory: value.ageCategory,
  size: value.size,
  temperament: value.temperament,
  clientType: value.clientType,
  notes: value.notes === '' ? undefined : value.notes,
  criticalNote: value.criticalNote === '' ? undefined : value.criticalNote,
  contact: { name: value.contactName, phone: value.phone },
}))
```

Se l’import di `DogDraft` è un secondo `import type`, unirlo all’import di tipo già presente: `import type { DogDraft, ServiceInput, SizeTriple } from '../types/models'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schemas.test.ts`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m @"
feat: valida nome e telefono del cane

"@
```

---

### Task 4: Foto quadrata

**Files:**
- Create: `src/lib/dogPhoto.ts`
- Test: `src/lib/dogPhoto.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `fitSquare(width: number, height: number, maxSide?: number): { sx: number; sy: number; source: number; side: number }`
  - `prepareDogPhoto(file: Blob): Promise<string>`

happy-dom e jsdom non hanno un canvas 2d vero: `getContext('2d')` è nullo. Il test della dimensione non decodifica un JPEG reale. Fornisce un canvas che registra il lato, e `prepareDogPhoto` deve assegnare quel lato prima di `toDataURL('image/jpeg', 0.7)`. Nel browser il canvas è quello vero.

- [ ] **Step 1: Write the failing test**

Creare `src/lib/dogPhoto.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { fitSquare, prepareDogPhoto } from './dogPhoto'

describe('fitSquare', () => {
  it('ritaglia il centro e non supera 256', () => {
    expect(fitSquare(800, 400)).toEqual({ sx: 200, sy: 0, source: 400, side: 256 })
    expect(fitSquare(100, 180)).toEqual({ sx: 0, sy: 40, source: 100, side: 100 })
    expect(fitSquare(40, 40)).toEqual({ sx: 0, sy: 0, source: 40, side: 40 })
  })
})

describe('prepareDogPhoto', () => {
  it('esporta un JPEG il cui lato non supera 256', async () => {
    const bitmap = { width: 800, height: 400, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
    const drawn: number[] = []
    const canvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          drawImage(_image: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
            drawn.push(sx, sy, sw, sh, dx, dy, dw, dh)
          },
        }
      },
      toDataURL(type: string, quality: number) {
        expect(type).toBe('image/jpeg')
        expect(quality).toBe(0.7)
        return 'data:image/jpeg;base64,abc'
      },
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') return canvas
      return realCreate(tagName)
    }) as typeof document.createElement)
    const file = new File([new Uint8Array([1, 2, 3])], 'grande.png', { type: 'image/png' })
    await expect(prepareDogPhoto(file)).resolves.toBe('data:image/jpeg;base64,abc')
    expect(canvas.width).toBe(256)
    expect(canvas.height).toBe(256)
    expect(drawn).toEqual([200, 0, 400, 400, 0, 0, 256, 256])
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rifiuta un file che non è un’immagine', async () => {
    const file = new File(['ciao'], 'nota.txt', { type: 'text/plain' })
    await expect(prepareDogPhoto(file)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dogPhoto.test.ts`

Expected: FAIL. Il modulo `./dogPhoto` non esiste.

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/dogPhoto.ts`:

```ts
const MAX_SIDE = 256
const JPEG_QUALITY = 0.7

export function fitSquare(width: number, height: number, maxSide = MAX_SIDE): { sx: number; sy: number; source: number; side: number } {
  const source = Math.min(width, height)
  const side = Math.min(maxSide, source)
  return { sx: (width - source) / 2, sy: (height - source) / 2, source, side }
}

export async function prepareDogPhoto(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('foto')
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width < 1 || bitmap.height < 1) throw new Error('foto')
    const box = fitSquare(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = box.side
    canvas.height = box.side
    const context = canvas.getContext('2d')
    if (!context) throw new Error('foto')
    context.drawImage(bitmap, box.sx, box.sy, box.source, box.source, 0, 0, box.side, box.side)
    const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (!url.startsWith('data:image/jpeg')) throw new Error('foto')
    return url
  } finally {
    bitmap.close()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dogPhoto.test.ts`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/dogPhoto.ts src/lib/dogPhoto.test.ts
git commit -m @"
feat: riduce la foto del cane a un JPEG quadrato

"@
```

---

### Task 5: Repository cani

**Files:**
- Modify: `src/data/errors.ts`
- Create: `src/data/local/dogs.ts`
- Test: `src/data/local/dogs.test.ts`

**Interfaces:**
- Consumes: `storageKeys.dogs`, `readJson`, `writeJson`, `buildSearchKey`, `Dog`, `DogWrite`, `logout`
- Produces:
  - `listDogs(uid: string): Dog[]`
  - `createDog(uid: string, input: DogWrite): Dog`
  - `updateDog(uid: string, id: string, input: DogWrite): Dog`
  - `archiveDog(uid: string, id: string, status: 'non_in_cura' | 'deceduto'): Dog`
  - `restoreDog(uid: string, id: string): Dog`
  - `AppErrorCode` include `'dog_missing'`

- [ ] **Step 1: Write the failing test**

Creare `src/data/local/dogs.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { archiveDog, createDog, listDogs, restoreDog, updateDog } from './dogs'
import { storageKeys } from './storage'
import type { DogWrite } from '../../types/models'

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

describe('dogs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('salva nella mappa, ricostruisce searchKey e rilegge le date', () => {
    const created = createDog('uid-1', write({ name: 'Caffè', breed: 'Barboncino', contact: { name: 'Lea', phone: '333' } }))
    const raw = localStorage.getItem(storageKeys.dogs('uid-1'))
    expect(raw).toBeTruthy()
    const stored = JSON.parse(raw!)[created.id]
    expect(stored.searchKey).toBe('caffe barboncino lea')
    expect(stored.searchKey.includes('333')).toBe(false)
    expect(typeof stored.createdAt).toBe('string')
    expect(stored.sex).toBeUndefined()
    const listed = listDogs('uid-1')
    expect(listed).toHaveLength(1)
    expect(listed[0].createdAt).toBeInstanceOf(Date)
    expect(listed[0].updatedAt).toBeInstanceOf(Date)
    createDog('uid-1', write({ name: 'Caffè' }))
    expect(listDogs('uid-1')).toHaveLength(2)
    logout()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toContain('Caffè')
  })

  it('ordina per nome italiano', () => {
    createDog('uid-1', write({ name: 'Zoe' }))
    createDog('uid-1', write({ name: 'Bobi' }))
    expect(listDogs('uid-1').map((dog) => dog.name)).toEqual(['Bobi', 'Zoe'])
  })

  it('archivia e ripristina', () => {
    const created = createDog('uid-1', write({ name: 'Bobi' }))
    const dead = archiveDog('uid-1', created.id, 'deceduto')
    expect(dead.status).toBe('deceduto')
    expect(dead.archivedAt).toBeInstanceOf(Date)
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id].status).toBe('deceduto')
    const away = archiveDog('uid-1', created.id, 'non_in_cura')
    expect(away.status).toBe('non_in_cura')
    expect(away.archivedAt).toBeInstanceOf(Date)
    const restored = restoreDog('uid-1', created.id)
    expect(restored.status).toBe('attivo')
    expect(restored.archivedAt).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id].archivedAt).toBeUndefined()
  })

  it('un id assente non scrive', () => {
    const created = createDog('uid-1', write({ name: 'Bobi' }))
    const before = localStorage.getItem(storageKeys.dogs('uid-1'))
    expect(() => updateDog('uid-1', 'manca', write({ name: 'Altro' }))).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(() => archiveDog('uid-1', 'manca', 'deceduto')).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(() => restoreDog('uid-1', 'manca')).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(before)
    expect(listDogs('uid-1').map((dog) => dog.id)).toEqual([created.id])
  })

  it('se setItem lancia resta il cane precedente', () => {
    const created = createDog('uid-1', write({ name: 'Bobi', breed: 'Labrador' }))
    const before = localStorage.getItem(storageKeys.dogs('uid-1'))
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => updateDog('uid-1', created.id, write({ name: 'Altro', breed: 'Labrador' }))).toThrowError(expect.objectContaining({ code: 'storage_write' }))
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(before)
    expect(listDogs('uid-1')[0].name).toBe('Bobi')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/dogs.test.ts`

Expected: FAIL. Il modulo `./dogs` non esiste.

- [ ] **Step 3: Write minimal implementation**

In `src/data/errors.ts` aggiungere `'dog_missing'` all’unione `AppErrorCode`, dopo `'service_boundary'`.

Creare `src/data/local/dogs.ts`:

```ts
import { buildSearchKey } from '../../lib/dogList'
import type { Dog, DogWrite } from '../../types/models'
import { AppError } from '../errors'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredDog {
  id: string
  name: string
  species: Dog['species']
  breed: string
  sex?: Dog['sex']
  ageCategory: Dog['ageCategory']
  size: Dog['size']
  temperament: Dog['temperament']
  clientType: Dog['clientType']
  photo?: string
  criticalNote?: string
  notes?: string
  contact: Dog['contact']
  status: Dog['status']
  archivedAt?: string
  searchKey: string
  createdAt: string
  updatedAt: string
}

function toDomain(stored: StoredDog): Dog {
  const dog: Dog = {
    id: stored.id,
    name: stored.name,
    species: stored.species,
    breed: stored.breed,
    ageCategory: stored.ageCategory,
    size: stored.size,
    temperament: stored.temperament,
    clientType: stored.clientType,
    contact: { name: stored.contact.name, phone: stored.contact.phone },
    status: stored.status,
    searchKey: stored.searchKey,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
  if (stored.sex) dog.sex = stored.sex
  if (stored.photo) dog.photo = stored.photo
  if (stored.criticalNote) dog.criticalNote = stored.criticalNote
  if (stored.notes) dog.notes = stored.notes
  if (stored.archivedAt) dog.archivedAt = new Date(stored.archivedAt)
  return dog
}

function toStored(dog: Dog): StoredDog {
  const stored: StoredDog = {
    id: dog.id,
    name: dog.name,
    species: dog.species,
    breed: dog.breed,
    ageCategory: dog.ageCategory,
    size: dog.size,
    temperament: dog.temperament,
    clientType: dog.clientType,
    contact: { name: dog.contact.name, phone: dog.contact.phone },
    status: dog.status,
    searchKey: dog.searchKey,
    createdAt: dog.createdAt.toISOString(),
    updatedAt: dog.updatedAt.toISOString(),
  }
  if (dog.sex) stored.sex = dog.sex
  if (dog.photo) stored.photo = dog.photo
  if (dog.criticalNote) stored.criticalNote = dog.criticalNote
  if (dog.notes) stored.notes = dog.notes
  if (dog.archivedAt) stored.archivedAt = dog.archivedAt.toISOString()
  return stored
}

function readMap(uid: string): Record<string, StoredDog> | null {
  return readJson<Record<string, StoredDog>>(storageKeys.dogs(uid))
}

function writeMap(uid: string, map: Record<string, StoredDog>): void {
  writeJson(storageKeys.dogs(uid), map)
}

function sortDogs(dogs: Dog[]): Dog[] {
  return dogs.sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
}

export function listDogs(uid: string): Dog[] {
  const map = readMap(uid) ?? {}
  return sortDogs(Object.values(map).map(toDomain))
}

function dogFromWrite(input: DogWrite, id: string, status: Dog['status'], createdAt: Date, archivedAt: Date | undefined, previousPhoto: string | undefined): Dog {
  const dog: Dog = {
    id,
    name: input.name,
    species: input.species,
    breed: input.breed,
    ageCategory: input.ageCategory,
    size: input.size,
    temperament: input.temperament,
    clientType: input.clientType,
    contact: { name: input.contact.name, phone: input.contact.phone },
    status,
    searchKey: buildSearchKey(input.name, input.breed, input.contact.name),
    createdAt,
    updatedAt: new Date(),
  }
  if (input.sex) dog.sex = input.sex
  if (input.notes) dog.notes = input.notes
  if (input.criticalNote) dog.criticalNote = input.criticalNote
  if (input.photo) dog.photo = input.photo
  else if (previousPhoto) dog.photo = previousPhoto
  if (archivedAt) dog.archivedAt = archivedAt
  return dog
}

export function createDog(uid: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const now = new Date()
  const dog = dogFromWrite(input, crypto.randomUUID(), 'attivo', now, undefined, undefined)
  map[dog.id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function updateDog(uid: string, id: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const previous = toDomain(current)
  const dog = dogFromWrite(input, id, previous.status, previous.createdAt, previous.archivedAt, previous.photo)
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function archiveDog(uid: string, id: string, status: 'non_in_cura' | 'deceduto'): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const dog = toDomain(current)
  dog.status = status
  dog.archivedAt = new Date()
  dog.updatedAt = new Date()
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function restoreDog(uid: string, id: string): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const dog = toDomain(current)
  dog.status = 'attivo'
  delete dog.archivedAt
  dog.updatedAt = new Date()
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}
```

`dogFromWrite` non riceve il sesso precedente: `input.sex` assente lascia il campo vuoto. `input.photo` assente tiene `previousPhoto`. `input.photo` presente lo sostituisce. `createDog` passa `previousPhoto` undefined.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/dogs.test.ts`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/data/errors.ts src/data/local/dogs.ts src/data/local/dogs.test.ts
git commit -m @"
feat: salva i cani sul dispositivo

"@
```

---

### Task 6: Lista Animali

**Files:**
- Create: `src/hooks/useDogs.ts`
- Create: `src/pages/DogsPage.tsx`
- Create: `src/pages/DogPage.tsx`
- Create: `src/pages/DogsPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: `listDogs`, `countDogs`, `visibleDogs`, `dogMeta`, `ARCHIVE_LABEL`, `Dog`, `DogTab`, `DogChip`, `createAccount`, `createDog`
- Produces: `useDogs(uid: string): { dogs: Dog[] }` in questa versione. Il Task 7 sostituisce l’hook con le azioni. `DogsPage` e le rotte `/animali`, `/animali/nuovo`, `/animali/:id`. `DogPage` in questa versione mostra solo il titolo.

Il test del guscio, oggi, dopo «Cerca» si aspetta il testo «In arrivo» del segnaposto. Va aggiornato nello stesso task, altrimenti la suite diventa rossa.

- [ ] **Step 1: Write the failing test**

Creare `src/pages/DogsPage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import type { DogWrite } from '../types/models'

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

describe('lista cani', () => {
  beforeEach(() => localStorage.clear())

  it('parte vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 0' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Aggiungi' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
  })

  it('ricerca, tab Mensili e chip Gatti filtrano senza cambiare i conteggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }))
    createDog(account.uid, write({
      name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano', temperament: 'mordace',
      clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }))
    createDog(account.uid, write({ name: 'Nina', species: 'gatto', breed: 'Siamese', contact: { name: 'Ada', phone: '444' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('Labrador · Adulto · Sara')).toBeInTheDocument()
    expect(screen.getByText('Europeo · Anziano · Lea')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), 'lea')
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('3 attivi · 0 in archivio')).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), '222')
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.click(screen.getByRole('tab', { name: 'Mensili 1' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Nina' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gatti' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mensili 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gatti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

Sostituire `src/pages/shellPages.test.tsx` con:

```tsx
// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('guscio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 12))
  })

  it('mostra la data, nasconde il campanello e apre Animali dalla ricerca', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByText('Giovedì 1 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifiche' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveFocus())
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
  })

  it('il più annuncia che l’appuntamento arriva dopo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(screen.getByRole('status')).toHaveTextContent('In arrivo')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('nuovo cane apre la scheda vuota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo cane' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/shellPages.test.tsx`

Expected: FAIL. `DogsPage` non è montata: la rotta è ancora il segnaposto e «Cerca» non mette il fuoco nel campo.

- [ ] **Step 3: Write minimal implementation**

Creare `src/hooks/useDogs.ts`:

```ts
import { useState } from 'react'
import { listDogs } from '../data/local/dogs'
import type { Dog } from '../types/models'

export function useDogs(uid: string) {
  const [dogs] = useState<Dog[]>(() => listDogs(uid))
  return { dogs }
}
```

Creare `src/pages/DogPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'

export function DogPage() {
  const { id } = useParams()
  return (
    <PhoneShell>
      <Header title={id ? 'Scheda' : 'Nuovo cane'} backTo="/animali" />
    </PhoneShell>
  )
}
```

Creare `src/pages/DogsPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { Chip } from '../components/ui/Chip'
import { useSession } from '../hooks/useSession'
import { useDogs } from '../hooks/useDogs'
import { ARCHIVE_LABEL, countDogs, dogMeta, visibleDogs, type DogChip, type DogTab } from '../lib/dogList'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

const TABS: { id: DogTab; label: string }[] = [
  { id: 'attivi', label: 'Attivi' },
  { id: 'mensili', label: 'Mensili' },
  { id: 'occasionali', label: 'Occasionali' },
  { id: 'archivio', label: 'Archivio' },
]

const CHIPS: { id: DogChip; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'mordaci', label: 'Mordaci' },
  { id: 'anziani', label: 'Anziani' },
  { id: 'gatti', label: 'Gatti' },
]

export function DogsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DogTab>('attivi')
  const [chip, setChip] = useState<DogChip>('tutti')
  const counts = countDogs(dogs)
  const visible = visibleDogs(dogs, tab, chip, query)

  useEffect(() => {
    const state = location.state as { focusSearch?: boolean } | null
    if (state?.focusSearch) searchRef.current?.focus()
  }, [location.state])

  return (
    <ShellFrame>
      <Header
        title="Animali"
        subtitle={`${counts.attivi} attivi · ${counts.archivio} in archivio`}
        action={<Link to="/animali/nuovo" style={{ color: 'var(--pri)', fontWeight: 600, textDecoration: 'none' }}>Aggiungi</Link>}
      />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <input
          ref={searchRef}
          aria-label="Cerca"
          placeholder="Cerca nome, proprietario, razza"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ height: SIZES.search.h, borderRadius: SIZES.search.radius, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--tx)', padding: '0 10px', font: 'inherit' }}
        />
        <div role="tablist" aria-label="Stato" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => setTab(item.id)} style={{ border: 0, background: 'transparent', color: selected ? 'var(--tx)' : 'var(--tx3)', fontWeight: selected ? 700 : 600, fontSize: TYPE.rowSub, padding: 0 }}>
                {item.label} {counts[item.id]}
              </button>
            )
          })}
        </div>
        <div role="group" aria-label="Filtri" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHIPS.map((item) => (
            <button key={item.id} type="button" aria-pressed={chip === item.id} onClick={() => setChip(item.id)} style={{ border: '1px solid var(--line)', borderRadius: 999, background: chip === item.id ? 'var(--surf)' : 'transparent', color: 'var(--tx2)', fontWeight: 600, fontSize: TYPE.meta, padding: '3px 8px' }}>
              {item.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun cane</p> : visible.map((dog) => <DogRow key={dog.id} dog={dog} onOpen={() => navigate(`/animali/${dog.id}`)} />)}
      </div>
    </ShellFrame>
  )
}

function DogRow({ dog, onOpen }: { dog: Dog; onOpen: () => void }) {
  const archived = dog.status === 'non_in_cura' || dog.status === 'deceduto'
  return (
    <button type="button" aria-label={`Apri ${dog.name}`} onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', color: 'inherit', font: 'inherit', minHeight: SIZES.row.minH, padding: `${SIZES.row.padY}px 0` }}>
      <DogAvatar alt="" src={dog.photo} size="md" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: archived ? 'var(--tx3)' : 'var(--tx)' }}>{dog.name}</span>
          {dog.clientType === 'mensile' ? <Chip>Mensile</Chip> : null}
          {dog.ageCategory === 'anziano' ? <Chip>Anziano</Chip> : null}
        </span>
        <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub }}>{dogMeta(dog)}</span>
        {dog.status === 'non_in_cura' || dog.status === 'deceduto' ? <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{ARCHIVE_LABEL[dog.status]}</span> : null}
      </span>
      <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} />
    </button>
  )
}
```

Sostituire `src/pages/ShellFrame.tsx` con:

```tsx
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  function soon() {
    setOpen(false)
    toast.show('In arrivo', 'plain')
  }
  function newDog() {
    setOpen(false)
    navigate('/animali/nuovo')
  }
  return (
    <PhoneShell showNav onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <button type="button" onClick={soon}>Nuovo appuntamento</button>
        <button type="button" onClick={newDog}>Nuovo cane</button>
      </Sheet>
    </PhoneShell>
  )
}
```

In `src/pages/HomePage.tsx` la ricerca diventa:

```tsx
<SearchBar onClick={() => navigate('/animali', { state: { focusSearch: true } })} />
```

Il resto del file resta com’è, compreso il paragrafo «In arrivo» della Home.

Sostituire `src/app/router.tsx` con:

```tsx
import type { ReactElement } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { DogPage } from '../pages/DogPage'
import { DogsPage } from '../pages/DogsPage'
import { DevKitPage } from '../pages/DevKitPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { ServicesPage } from '../pages/ServicesPage'
import { SettingsPage } from '../pages/SettingsPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const routes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '/animali', element: <Guard><DogsPage /></Guard> },
    { path: '/animali/nuovo', element: <Guard><DogPage /></Guard> },
    { path: '/animali/:id', element: <Guard><DogPage /></Guard> },
    { path: '/calendario', element: <Guard><PlaceholderPage title="Calendario" /></Guard> },
    { path: '/listino', element: <Guard><PlaceholderPage title="Listino" /></Guard> },
    { path: '/impostazioni', element: <Guard><SettingsPage /></Guard> },
    { path: '/impostazioni/servizi', element: <Guard><ServicesPage /></Guard> },
  ]
  if (isDev) routes.push({ path: '/dev/kit', element: <Guard><DevKitPage /></Guard> })
  routes.push({ path: '*', element: <Navigate to="/" replace /> })
  return routes
}

function LoginSwitch() {
  const { gate } = useSession()
  if (gate.kind === 'in') return <Navigate to="/" replace />
  return <LoginPage />
}
```

`/animali/nuovo` sta prima di `/animali/:id`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useDogs.ts src/pages/DogsPage.tsx src/pages/DogPage.tsx src/pages/DogsPage.test.tsx src/app/router.tsx src/pages/HomePage.tsx src/pages/ShellFrame.tsx src/pages/shellPages.test.tsx
git commit -m @"
feat: mostra la lista degli animali

"@
```

---

### Task 7: Creazione e lettura della scheda

**Files:**
- Create: `src/pages/DogFields.tsx`
- Modify: `src/hooks/useDogs.ts`
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `dogFormSchema`, `DogDraft`, `DogWrite`, `createDog`, `updateDog`, `archiveDog`, `restoreDog`, `listDogs`, etichette di `dogList`
- Produces:
  - `useDogs(uid: string): { dogs: Dog[]; error: string | null; lastCreatedId: React.MutableRefObject<string | null>; saveNew(input: DogWrite): boolean; saveExisting(id: string, input: DogWrite): boolean; archive(id: string, status: 'non_in_cura' | 'deceduto'): boolean; restore(id: string): boolean }`
  - `DogFields({ initial, onSubmit }: { initial?: Dog; onSubmit: (draft: DogDraft) => void })`

Il toast lo mostra la pagina in base al booleano. Non copiare l’`useEffect` di `useServices` su `api.error`: una seconda scrittura fallita con la stessa stringa non rifarebbe il toast. L’hook imposta comunque `error` e lo azzera sul successo.

`lastCreatedId` è un ref aggiornato in modo sincrono dentro `saveNew`, così la pagina può sostituire `/animali/nuovo` con `/animali/:id` e restare conforme al ritorno booleano.

- [ ] **Step 1: Write the failing test**

In coda a `src/pages/DogsPage.test.tsx` aggiungere `vi` all’import da `vitest`, l’import di `storageKeys` da `../data/local/storage`, e questo describe:

```tsx
describe('scheda cane', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('non scrive senza nome né telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument()
    expect(screen.getByText('Il telefono è obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('crea il cane, apre la scheda e lo ritrova dopo il rimontaggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(screen.getByRole('radio', { name: 'Cane' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Maschio' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Femmina' })).toHaveAttribute('aria-checked', 'false')
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '333' })).toHaveAttribute('href', 'tel:333')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { species: string; sex?: string; size: string; temperament: string; clientType: string; ageCategory: string; searchKey: string }>
    const saved = Object.values(stored)[0]
    expect(saved).toMatchObject({ species: 'cane', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', ageCategory: 'adulto', searchKey: 'bobi' })
    expect(saved.sex).toBeUndefined()
    view.unmount()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('button', { name: 'Apri Bobi' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 1' })).toHaveAttribute('aria-selected', 'true')
  })

  it('se la scrittura del cane nuovo fallisce resta sul modulo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Telefono'), '333')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('un id sconosciuto non è una scheda vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/id-che-non-c-e" />)
    expect(await screen.findByText('Cane assente')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx`

Expected: FAIL. Manca il pulsante «Salva». I due test della lista restano verdi.

- [ ] **Step 3: Write minimal implementation**

Sostituire `src/hooks/useDogs.ts` con:

```ts
import { useRef, useState } from 'react'
import { AppError } from '../data/errors'
import { archiveDog, createDog, listDogs, restoreDog, updateDog } from '../data/local/dogs'
import type { Dog, DogWrite } from '../types/models'

export function useDogs(uid: string) {
  const [dogs, setDogs] = useState<Dog[]>(() => listDogs(uid))
  const [error, setError] = useState<string | null>(null)
  const lastCreatedId = useRef<string | null>(null)

  function guard(action: () => void): boolean {
    try {
      action()
      setDogs(listDogs(uid))
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'dog_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  return {
    dogs,
    error,
    lastCreatedId,
    saveNew(input: DogWrite) {
      return guard(() => {
        lastCreatedId.current = createDog(uid, input).id
      })
    },
    saveExisting(id: string, input: DogWrite) {
      return guard(() => {
        updateDog(uid, id, input)
      })
    },
    archive(id: string, status: 'non_in_cura' | 'deceduto') {
      return guard(() => {
        archiveDog(uid, id, status)
      })
    },
    restore(id: string) {
      return guard(() => {
        restoreDog(uid, id)
      })
    },
  }
}
```

Creare `src/pages/DogFields.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { dogFormSchema } from '../lib/schemas'
import type { Dog, DogDraft, Sex } from '../types/models'

type DogFormValues = z.input<typeof dogFormSchema>

function toForm(dog?: Dog): DogFormValues {
  return {
    name: dog?.name ?? '',
    species: dog?.species ?? 'cane',
    breed: dog?.breed ?? '',
    sex: dog?.sex ?? '',
    ageCategory: dog?.ageCategory ?? 'adulto',
    size: dog?.size ?? 'piccola',
    temperament: dog?.temperament ?? 'bravo',
    clientType: dog?.clientType ?? 'occasionale',
    contactName: dog?.contact.name ?? '',
    phone: dog?.contact.phone ?? '',
    notes: dog?.notes ?? '',
    criticalNote: dog?.criticalNote ?? '',
  }
}

export function DogFields({ initial, onSubmit }: { initial?: Dog; onSubmit: (draft: DogDraft) => void }) {
  const form = useForm<DogFormValues, unknown, DogDraft>({
    resolver: zodResolver(dogFormSchema) as Resolver<DogFormValues, unknown, DogDraft>,
    defaultValues: toForm(initial),
  })
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input label="Nome" {...form.register('name')} error={form.formState.errors.name?.message} />
      <Segmented label="Specie" value={form.watch('species')} onChange={(value) => form.setValue('species', value)} options={[{ value: 'cane', label: 'Cane' }, { value: 'gatto', label: 'Gatto' }, { value: 'altro', label: 'Altro' }]} />
      <Input label="Razza" {...form.register('breed')} />
      <Segmented<'' | Sex> label="Sesso" value={form.watch('sex')} onChange={(value) => form.setValue('sex', value)} options={[{ value: 'M', label: 'Maschio' }, { value: 'F', label: 'Femmina' }]} />
      <Segmented label="Categoria" value={form.watch('ageCategory')} onChange={(value) => form.setValue('ageCategory', value)} options={[{ value: 'cucciolo', label: 'Cucciolo' }, { value: 'giovane', label: 'Giovane' }, { value: 'adulto', label: 'Adulto' }, { value: 'anziano', label: 'Anziano' }]} />
      <Segmented label="Taglia" value={form.watch('size')} onChange={(value) => form.setValue('size', value)} options={[{ value: 'piccola', label: 'Piccola' }, { value: 'media', label: 'Media' }, { value: 'grande', label: 'Grande' }]} />
      <Segmented label="Carattere" value={form.watch('temperament')} onChange={(value) => form.setValue('temperament', value)} options={[{ value: 'bravo', label: 'Bravo' }, { value: 'agitato', label: 'Agitato' }, { value: 'mordace', label: 'Mordace' }]} />
      <Segmented label="Tipo cliente" value={form.watch('clientType')} onChange={(value) => form.setValue('clientType', value)} options={[{ value: 'mensile', label: 'Mensile' }, { value: 'occasionale', label: 'Occasionale' }]} />
      <Input label="Proprietario" {...form.register('contactName')} />
      <Input label="Telefono" {...form.register('phone')} error={form.formState.errors.phone?.message} />
      <Input label="Nota" {...form.register('notes')} />
      <Input label="Avviso critico" {...form.register('criticalNote')} />
      <Button type="submit">Salva</Button>
    </form>
  )
}
```

Sostituire `src/pages/DogPage.tsx` con:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { useSession } from '../hooks/useSession'
import { useDogs } from '../hooks/useDogs'
import { AGE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL, TEMPERAMENT_LABEL } from '../lib/dogList'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog, DogDraft, DogWrite } from '../types/models'
import { DogFields } from './DogFields'

export function DogPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const dog = id ? api.dogs.find((item) => item.id === id) : undefined
  const [editing, setEditing] = useState(isNew)

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  function save(draft: DogDraft) {
    const write: DogWrite = { ...draft, photo: dog?.photo }
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    if (!dog && api.lastCreatedId.current) {
      navigate(`/animali/${api.lastCreatedId.current}`, { replace: true })
      return
    }
    setEditing(false)
  }

  if (id && !dog) {
    return (
      <PhoneShell>
        <Header title="Scheda" backTo="/animali" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell>
      <Header title={dog ? 'Scheda' : 'Nuovo cane'} backTo="/animali" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? <DogRead dog={dog} /> : <DogFields initial={dog} onSubmit={save} />}
      </div>
    </PhoneShell>
  )
}

function DogRead({ dog }: { dog: Dog }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Nome', value: dog.name },
    { label: 'Specie', value: SPECIES_LABEL[dog.species] },
  ]
  if (dog.breed.trim()) rows.push({ label: 'Razza', value: dog.breed })
  if (dog.sex) rows.push({ label: 'Sesso', value: SEX_LABEL[dog.sex] })
  rows.push(
    { label: 'Categoria', value: AGE_LABEL[dog.ageCategory] },
    { label: 'Taglia', value: SIZE_LABEL[dog.size] },
    { label: 'Carattere', value: TEMPERAMENT_LABEL[dog.temperament] },
    { label: 'Tipo cliente', value: CLIENT_LABEL[dog.clientType] },
  )
  if (dog.contact.name.trim()) rows.push({ label: 'Proprietario', value: dog.contact.name })
  rows.push({ label: 'Telefono', value: dog.contact.phone })
  if (dog.notes) rows.push({ label: 'Nota', value: dog.notes })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DogAvatar alt="" src={dog.photo} size="xl" />
      {dog.criticalNote ? <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderRadius: 8, padding: 8 }}>{dog.criticalNote}</p> : null}
      {rows.map((row) => (
        <div key={row.label}>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.label}</div>
          {row.label === 'Telefono' ? <a href={`tel:${row.value}`}>{row.value}</a> : <div style={{ fontSize: TYPE.base }}>{row.value}</div>}
        </div>
      ))}
    </div>
  )
}
```

In questo task non ci sono ancora «Modifica», «Deceduto», «Non più in cura», «Ripristina» né il campo foto. Ci arrivano nel Task 8. `archive` e `restore` nell’hook ci sono già, ma la pagina non li chiama.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useDogs.ts src/pages/DogFields.tsx src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m @"
feat: crea e apre la scheda del cane

"@
```

---

### Task 8: Modifica, archivio, ripristino e foto

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `useDogs` del Task 7, `prepareDogPhoto`, `DogFields`, `ARCHIVE_LABEL`, `Button`
- Produces: la scheda completa. `DogFields` e `useDogs` non si riscrivono.

- [ ] **Step 1: Write the failing test**

In coda al describe `scheda cane` di `src/pages/DogsPage.test.tsx` aggiungere questi test. Servono anche `waitFor` da `@testing-library/react` e, nel test della foto abbandonata, l’import del modulo foto.

```tsx
  it('Deceduto e Non più in cura si ripristinano, e Modifica resta disponibile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deceduto' }))
    expect(await screen.findByText('Deceduto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ripristina' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deceduto' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('tab', { name: 'Attivi 0' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Archivio 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Ripristina' }))
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(await screen.findByRole('tab', { name: 'Attivi 1' }))
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Non più in cura' }))
    expect(await screen.findByText('Non più in cura')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
  })

  it('Indietro abbandona la modifica e un salvataggio fallito tiene il nome vecchio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Rex')
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('button', { name: 'Apri Bobi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri Bobi' }))
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    const again = screen.getByLabelText('Nome')
    await user.clear(again)
    await user.type(again, 'Rex')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByLabelText('Nome')).toHaveValue('Rex')
    vi.restoreAllMocks()
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string }>
    expect(stored[created.id].name).toBe('Bobi')
  })

  it('una foto non usabile non cambia i campi digitati', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Luna')
    await user.upload(screen.getByLabelText('Foto'), new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Foto non utilizzabile')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Luna')
  })

  it('Indietro abbandona una foto non salvata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    const photo = await import('../lib/dogPhoto')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.upload(screen.getByLabelText('Foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    await waitFor(() => expect(document.querySelector('img[src*="abc"]')).not.toBeNull())
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(await screen.findByRole('button', { name: 'Apri Bobi' }))
    expect(document.querySelector('img[src*="abc"]')).toBeNull()
    spy.mockRestore()
  })

  it('Esci non cancella i cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Bobi')
  })
```

La pagina deve importare `prepareDogPhoto` dal modulo, non copiarne il corpo: lo spy del test agisce su quell’export, e la chiamata avviene nel gestore del file, non all’import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx`

Expected: FAIL. Manca il pulsante «Modifica» o «Deceduto» o il campo «Foto». Il test «Esci non cancella i cani» può già passare, perché logout non tocca la mappa. Gli altri no.

- [ ] **Step 3: Write minimal implementation**

Sostituire per intero `src/pages/DogPage.tsx` con:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { useSession } from '../hooks/useSession'
import { useDogs } from '../hooks/useDogs'
import { AGE_LABEL, ARCHIVE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL, TEMPERAMENT_LABEL } from '../lib/dogList'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog, DogDraft, DogWrite } from '../types/models'
import { DogFields } from './DogFields'

function statusLine(status: Dog['status']): string | null {
  if (status === 'attivo') return null
  return ARCHIVE_LABEL[status]
}

export function DogPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const dog = id ? api.dogs.find((item) => item.id === id) : undefined
  const [editing, setEditing] = useState(isNew)
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      setPhoto(await prepareDogPhoto(file))
      setPhotoError(null)
    } catch {
      setPhotoError('Foto non utilizzabile')
    }
  }

  function save(draft: DogDraft) {
    const write: DogWrite = { ...draft, photo: photo ?? dog?.photo }
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    if (!dog && api.lastCreatedId.current) {
      navigate(`/animali/${api.lastCreatedId.current}`, { replace: true })
      return
    }
    setEditing(false)
    setPhoto(undefined)
  }

  function changeStatus(action: () => boolean) {
    if (!action()) toast.show('Salvataggio non riuscito', 'plain')
  }

  if (id && !dog) {
    return (
      <PhoneShell>
        <Header title="Scheda" backTo="/animali" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
    )
  }

  const line = dog ? statusLine(dog.status) : null

  return (
    <PhoneShell>
      <Header title={dog ? 'Scheda' : 'Nuovo cane'} backTo="/animali" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <DogRead dog={dog} />
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <Button onClick={() => setEditing(true)}>Modifica</Button>
            {dog.status === 'attivo' ? (
              <>
                <Button variant="ghost" onClick={() => changeStatus(() => api.archive(dog.id, 'non_in_cura'))}>Non più in cura</Button>
                <Button variant="ghost" onClick={() => changeStatus(() => api.archive(dog.id, 'deceduto'))}>Deceduto</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button>
            )}
          </>
        ) : (
          <>
            <DogAvatar alt="" src={photo ?? dog?.photo} size="xl" />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
              Foto
              <input aria-label="Foto" type="file" accept="image/*" onChange={(event) => void onPhoto(event.target.files?.[0])} />
            </label>
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            <DogFields initial={dog} onSubmit={save} />
          </>
        )}
      </div>
    </PhoneShell>
  )
}

function DogRead({ dog }: { dog: Dog }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Nome', value: dog.name },
    { label: 'Specie', value: SPECIES_LABEL[dog.species] },
  ]
  if (dog.breed.trim()) rows.push({ label: 'Razza', value: dog.breed })
  if (dog.sex) rows.push({ label: 'Sesso', value: SEX_LABEL[dog.sex] })
  rows.push(
    { label: 'Categoria', value: AGE_LABEL[dog.ageCategory] },
    { label: 'Taglia', value: SIZE_LABEL[dog.size] },
    { label: 'Carattere', value: TEMPERAMENT_LABEL[dog.temperament] },
    { label: 'Tipo cliente', value: CLIENT_LABEL[dog.clientType] },
  )
  if (dog.contact.name.trim()) rows.push({ label: 'Proprietario', value: dog.contact.name })
  rows.push({ label: 'Telefono', value: dog.contact.phone })
  if (dog.notes) rows.push({ label: 'Nota', value: dog.notes })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DogAvatar alt="" src={dog.photo} size="xl" />
      {dog.criticalNote ? <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderRadius: 8, padding: 8 }}>{dog.criticalNote}</p> : null}
      {rows.map((row) => (
        <div key={row.label}>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.label}</div>
          {row.label === 'Telefono' ? <a href={`tel:${row.value}`}>{row.value}</a> : <div style={{ fontSize: TYPE.base }}>{row.value}</div>}
        </div>
      ))}
    </div>
  )
}
```

Indietro è il link dell’header verso `/animali`. Smonta la pagina, quindi abbandona testo e foto non salvati. Non aggiungere un secondo pulsante Annulla.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS. Poi `npx tsc --noEmit`. Expected: exit 0. Se lo spy di `prepareDogPhoto` non arriva alla pagina, il test della foto abbandonata fallisce: la pagina deve chiamare l’export, e lo spy va fatto prima dell’upload.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m @"
feat: modifica, archivia e ripristina il cane

"@
```

---

### Task 9: Verifica del ciclo

**Files:**
- Nessun file nuovo. Si esegue la suite e il controllo manuale della specifica, sezione 8.

- [ ] **Step 1: Suite e build**

Run: `npm test`

Expected: PASS, compresi login, servizi, guscio e cani. I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.

Run: `npm run build`

Expected: exit 0. `tsc --noEmit` e `vite build` entrambi verdi.

- [ ] **Step 2: Controllo manuale a 360 px**

Avviare `npm run dev`. Nel browser, viewport 360×780, prima chiaro e poi scuro da Impostazioni:

1. Animali parte vuota: «0 attivi · 0 in archivio» e «Nessun cane».
2. Aggiungi: solo nome e telefono, Salva. La scheda è in sola lettura. Refresh: il cane è in Attivi.
3. Modifica, cambia il nome, Salva. Il nome nuovo resta dopo il refresh.
4. Modifica, cambia il nome, Indietro. Il nome vecchio è ancora in lista.
5. Ricerca per nome, per razza e per proprietario. Il conteggio della tab Attivi non cambia mentre si scrive.
6. Aprire ogni tab e ogni chip. Mensili più Occasionali coincide con Attivi.
7. Archiviare con «Non più in cura» e, dopo il ripristino, con «Deceduto». Ripristina riporta il cane in Attivi.
8. Su un cane archiviato, Modifica è ancora presente.
9. Compilare «Avviso critico», Salva. Il riquadro rosso sta sotto la foto, visibile senza scorrere fino in fondo.
10. Scegliere un file che non è un’immagine: «Foto non utilizzabile». Scegliere una foto grande, Salva, e vedere il ritaglio al posto del segnaposto.
11. «Nuovo appuntamento» dice ancora «In arrivo». Calendario e Listino sono ancora segnaposto.
12. Nessuno scroll orizzontale. Esci e rientra: il cane c’è ancora.

- [ ] **Step 3: Commit**

Nessun commit se il passaggio non ha modificato file. Se ha corretto un difetto trovato qui, un commit separato con il perché, solo dei file di quel difetto.
