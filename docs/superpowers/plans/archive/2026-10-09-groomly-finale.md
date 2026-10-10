# Groomly Finale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare Groomly dal taglio dei cicli 1–6 al mockup `groomly-design.html` e al §8–§10 di `GROOMLY.md`, con i dati sul dispositivo, Firebase come penultimo passo e l’APK come ultimo.

**Architecture:** Una schermata finita per task, sullo stesso React già in `D:\Groomly`. I calcoli nuovi stanno in funzioni pure (`src/lib`). Le pagine chiamano i hook già esistenti. La regola dei mensili (task 5) esiste prima di Home e Animali, così quelle schermate non si ritoccano quando arriva la pagina Mensili. Firebase sostituisce il repository sotto i hook. Capacitor avvolge la build.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6, date-fns 4, Vitest 3, Testing Library, happy-dom. Firebase (Auth, Firestore, Storage) solo dal task 17. Capacitor Android solo dal task 18.

Specifica: `docs/superpowers/specs/2026-10-09-groomly-finale-design.md`.

Lavorare in `D:\Groomly` sul branch `feat/groomly-finale`, partendo da `master`. Non aprire un worktree. Non cambiare `git config`. Non fare push.

## Global Constraints

- Interfaccia solo in italiano. A 360 px nessuna schermata di questo piano scorre in orizzontale. Controllo manuale in chiaro e in scuro a fine di ogni task di pagina.
- Nessuna chiave `localStorage` nuova. I campi nuovi stanno nel cane, nell’appuntamento o nelle impostazioni già salvate.
- `findCorruptGroomlyKey` non cambia. Un JSON illeggibile resta «Dati locali illeggibili» e il valore non si cancella.
- Esci toglie solo la sessione (`groomly.session` fino al task 17, poi la sessione Firebase). Non cancella cani e appuntamenti.
- Non si usa `window.confirm`. Le conferme stanno in un foglio.
- I test di `App` hanno `// @vitest-environment happy-dom` come prima riga. Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`. Non si alza Vitest.
- I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
- PowerShell: non usare `&&`. Il commit è una here-string. Non usare `git add -A`: elencare i file. Non aggiungere `GROOMLY.md`, `groomly-design.html`, né questo piano.
- Non importare simboli inutilizzati: `npm run build` esegue `tsc --noEmit` e `noUnusedLocals` fa fallire la build.
- Frasi esatte quando un task le nomina: «Salvato», «Salvataggio non riuscito», «Copiato», «Connessione assente», «Permesso foto negato», «Si sovrappone a …», «Fissato per …», «Spostato alle HH:mm», «Completato · fissa il prossimo», «Nessun appuntamento», «Nessun cane», «Nessun mensile», «Nessun file», «Nessun trattamento», «Nessuna nota», «Mai eseguito», «Cane assente», «Appuntamento assente».
- Fuori da questo piano: store, messaggi ai clienti, microchip, modifica delle soglie di età, stato «cancellato», «rendi attuale» su una versione del listino, emulatore Firebase nei test.
- Il 3 ottobre 2026 è sabato. Nei test con data fissa usare `new Date(2026, 9, 3, 12, 0, 0, 0)`.

## File map

- Create `src/lib/display.ts`: durata compatta, età, proprietario abbreviato, prima frase.
- Create `src/lib/cycle.ts`: scadenza, fissato, mese, gruppo «in arrivo».
- Create `src/lib/quote.ts`: prezzo del cane, fine arrotondata, ricerca predittiva.
- Create `src/lib/calendarView.ts`: striscia, riepilogo, colore blocco, snap ai 15 minuti.
- Create `src/lib/backupDoc.ts`: JSON di backup e conteggi.
- Create `src/lib/firebaseMap.ts`: `Date` ↔ `Timestamp` e percorsi Storage.
- Create `src/components/domain/FlagIcon.tsx`.
- Create `src/pages/PriceViewPage.tsx`: `/listino/vedi`.
- Create `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `capacitor.config.ts` nei task 17 e 18.
- Modify i file nominati in ciascun task. Non creare un secondo set di pagine.

---

### Task 1: Durata, età, nome breve, avviso

**Files:**
- Create: `src/lib/display.ts`
- Create: `src/lib/display.test.ts`

**Interfaces:**
- Consumes: `AgeCategory` da `src/types/models.ts`.
- Produces:
  - `formatCompactDuration(minutes: number): string` — `0` → `0m`, sotto 60 → `45m`, ora esatta → `2h`, altrimenti `7h15` con minuti su due cifre.
  - `ageText(birthYear: number | undefined, categoryLabel: string, now: Date): string` — «1 anno», «4 anni», altrimenti `categoryLabel`.
  - `shortOwner(name: string): string` — «Maria Pinna» e «Maria Luisa Pinna» → «M. Pinna»; un solo nome resta intero; stringa vuota → `''`.
  - `splitCritical(note: string): { title: string; rest: string }` — spezza sulla prima `. `; senza punto, `rest` è `''`.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/lib/display.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ageText, formatCompactDuration, shortOwner, splitCritical } from './display'

describe('formatCompactDuration', () => {
  it('compatta minuti e ore', () => {
    expect(formatCompactDuration(0)).toBe('0m')
    expect(formatCompactDuration(45)).toBe('45m')
    expect(formatCompactDuration(120)).toBe('2h')
    expect(formatCompactDuration(65)).toBe('1h05')
    expect(formatCompactDuration(435)).toBe('7h15')
  })
})

describe('ageText', () => {
  const now = new Date(2026, 9, 3, 12, 0, 0, 0)
  it('usa l’anno di nascita', () => {
    expect(ageText(2025, 'Cucciolo', now)).toBe('1 anno')
    expect(ageText(2022, 'Adulto', now)).toBe('4 anni')
    expect(ageText(undefined, 'Adulto', now)).toBe('Adulto')
  })
})

describe('shortOwner', () => {
  it('tiene l’iniziale e il cognome', () => {
    expect(shortOwner('Maria Pinna')).toBe('M. Pinna')
    expect(shortOwner('Maria Luisa Pinna')).toBe('M. Pinna')
    expect(shortOwner('Maria')).toBe('Maria')
    expect(shortOwner('  ')).toBe('')
  })
})

describe('splitCritical', () => {
  it('separa la prima frase', () => {
    expect(splitCritical('Morde. Usare museruola')).toEqual({ title: 'Morde', rest: 'Usare museruola' })
    expect(splitCritical('Solo questo')).toEqual({ title: 'Solo questo', rest: '' })
  })
})
```

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/display.test.ts`

Expected: FAIL perché `./display` non esiste.

- [ ] **Step 3: Scrivere l’implementazione**

Creare `src/lib/display.ts`:

```ts
export function formatCompactDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  if (whole < 60) return `${whole}m`
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h${String(rest).padStart(2, '0')}`
}

export function ageText(birthYear: number | undefined, categoryLabel: string, now: Date): string {
  if (birthYear == null) return categoryLabel
  const years = now.getFullYear() - birthYear
  return years === 1 ? '1 anno' : `${years} anni`
}

export function shortOwner(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '')
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0].charAt(0).toLocaleUpperCase('it-IT')}. ${parts[parts.length - 1]}`
}

export function splitCritical(note: string): { title: string; rest: string } {
  const index = note.indexOf('. ')
  if (index === -1) return { title: note, rest: '' }
  return { title: note.slice(0, index), rest: note.slice(index + 2) }
}
```

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/display.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/display.ts src/lib/display.test.ts
git commit -m @"
feat: compatta durata, età e nome del proprietario

"@
```

---

### Task 2: Impostazioni lette con i campi nuovi

**Files:**
- Modify: `src/data/local/settings.ts`
- Modify: `src/data/local/settings.test.ts`
- Modify: `src/hooks/useSettings.tsx` solo se il tipo `SettingsMain` non passa più da `setTheme`

**Interfaces:**
- Consumes: `ThemeChoice`.
- Produces: `SettingsMain` con i campi sotto, sempre presenti dopo `getSettings`. `rememberDog(settings, dogId): SettingsMain` mette l’id in cima, toglie i duplicati, tiene 8 id, non scrive da sola. `setTheme` conserva gli altri campi.

```ts
export interface FieldLabels {
  species: string
  breed: string
  sex: string
  age: string
  weight: string
  size: string
  clientType: string
  avgDuration: string
}
export interface PriceFile {
  id: string
  fileName: string
  mime: string
  byteSize: number
  uploadedAt: string
  dataUrl: string
}
export interface SettingsMain {
  theme: ThemeChoice
  updatedAt: string
  recentDogIds: string[]
  fieldLabels: FieldLabels
  tagSuggestions: string[]
  toolSuggestions: string[]
  productSuggestions: string[]
  business: { name: string; vatNumber: string; phone: string; address: string }
  priceList?: PriceFile
  priceListHistory: PriceFile[]
  monthlyReminder: { enabled: boolean; time: string; daysBefore: number }
  backup: { lastAt?: string; autoDaily: boolean }
  ageThresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }
}
```

Default: `recentDogIds` `[]`, etichette «Specie», «Razza», «Sesso», «Età», «Peso», «Taglia», «Cliente», «Durata media», suggerimenti `[]`, attività tutta `''`, `priceList` assente, `priceListHistory` `[]`, promemoria `{ enabled: true, time: '18:30', daysBefore: 7 }`, backup `{ autoDaily: false }`, soglie `{ giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 }`. Un JSON vecchio con solo `theme` e `updatedAt` si legge così e non si riscrive finché non c’è un altro salvataggio.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/data/local/settings.test.ts` aggiungere:

```ts
it('legge un json vecchio con i default e non lo riscrive', () => {
  localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'dark', updatedAt: '2026-10-01T00:00:00.000Z' }))
  const before = localStorage.getItem(storageKeys.settings('uid-1'))
  const settings = getSettings('uid-1')
  expect(settings.theme).toBe('dark')
  expect(settings.monthlyReminder).toEqual({ enabled: true, time: '18:30', daysBefore: 7 })
  expect(settings.backup).toEqual({ autoDaily: false })
  expect(settings.ageThresholds).toEqual({ giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 })
  expect(settings.recentDogIds).toEqual([])
  expect(localStorage.getItem(storageKeys.settings('uid-1'))).toBe(before)
})

it('rememberDog mette in cima e tiene otto id', () => {
  const settings = getSettings('uid-1')
  const first = rememberDog(settings, 'a')
  const second = rememberDog({ ...first, recentDogIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }, 'a')
  expect(second.recentDogIds[0]).toBe('a')
  expect(second.recentDogIds).toHaveLength(8)
  expect(second.recentDogIds.filter((id) => id === 'a')).toHaveLength(1)
})
```

Importare `rememberDog`. Il test esistente che si aspetta solo `theme` va aggiornato: `toMatchObject({ theme: 'auto' })` resta vero.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/data/local/settings.test.ts`

Expected: FAIL perché `monthlyReminder` è `undefined` oppure `rememberDog` non esiste.

- [ ] **Step 3: Scrivere l’implementazione**

In `settings.ts`, definire `DEFAULT_LABELS` e `blankSettings(theme, updatedAt): SettingsMain`. `getSettings` fa `{ ...blankSettings(existing.theme, existing.updatedAt), ...existing }` e, per gli oggetti annidati, riempie i pezzi mancanti uno a uno (`monthlyReminder`, `backup`, `business`, `fieldLabels`, `ageThresholds`) senza chiamare `writeJson` se la chiave c’era già. `setTheme` parte da `getSettings(uid)`, cambia `theme` e `updatedAt`, e scrive l’oggetto intero. `rememberDog` non chiama `writeJson`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/data/local/settings.test.ts`

Expected: PASS. Poi `npx vitest run src/pages/SettingsPage.test.tsx` ancora PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/settings.ts src/data/local/settings.test.ts
git commit -m @"
feat: legge le impostazioni vecchie con i campi del finale

"@
```

---

### Task 3: Guscio visivo

**Files:**
- Modify: `src/theme/tokens.css`
- Modify: `src/components/ui/Chip.tsx`
- Modify: `src/components/ui/ui.test.tsx` (o il test del chip già presente)
- Create: `src/components/domain/FlagIcon.tsx`
- Modify: `src/components/domain/DogAvatar.tsx`
- Modify: `src/components/ui/SectionTitle.tsx`
- Modify: `src/components/ui/SearchBar.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/pages/ShellFrame.tsx`

**Interfaces:**
- Consumes: `FLAG_ICONS` da `src/assets/icons/icons.ts`, `SIZES`, `AVATAR_RADIUS`.
- Produces:
  - `Chip` accetta `tone`: `'neutral' | 'ok' | 'warn' | 'bad' | 'sen' | 'tea' | 'pri' | 'out' | 'sel'`.
  - `FlagIcon({ kind, size }: { kind: 'anziano' | 'mensile'; size: number })`.
  - `DogAvatar` accetta `size: 'sm' | 'md' | 'lg' | 'xl' | 'grid'`.
  - `SectionTitle({ children, icon, link }: { children: ReactNode; icon?: ReactNode; link?: ReactNode })`.
  - `SearchBar` con `mode: 'button' | 'input'`. In `input` rende un `<input aria-label="Cerca">` e riceve `value`, `onChange`, `inputRef`.
  - `BottomNav`: il `NavLink` attivo ha `color: var(--pri)`. Il + ha `boxShadow: var(--shadow)`.
  - Il foglio del + ha due bottoni «Nuovo appuntamento» e «Nuovo cane», ognuno con un’icona.

- [ ] **Step 1: Scrivere il test che fallisce**

In un test di componente già su happy-dom, aggiungere:

```tsx
it('il chip selezionato è pieno e la bandiera ha l’alt', () => {
  render(<Chip tone="sel">Tutti</Chip>)
  expect(screen.getByText('Tutti')).toHaveStyle({ background: 'var(--pri)' })
  render(<FlagIcon kind="mensile" size={25} />)
  expect(screen.getByAltText('Mensile')).toBeInTheDocument()
})
```

In `tokens.css` il test non legge il file: assertare solo i componenti.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/components/ui/ui.test.tsx`

Expected: FAIL perché `tone="sel"` non è nel tipo, oppure `FlagIcon` non esiste.

- [ ] **Step 3: Scrivere l’implementazione**

In `tokens.css`, dentro `:root` e dentro `[data-theme="dark"]`, aggiungere `--shadow`. Chiaro: `0 1px 2px rgba(20, 30, 50, .06), 0 4px 14px rgba(20, 30, 50, .06)`. Scuro: `0 1px 2px rgba(0, 0, 0, .4)`.

Toni di `Chip`: `bad` usa `--bad-s` / `--bad`, `sen` `--sen-s` / `--sen`, `tea` `--tea-s` / `--tea`, `pri` `--pri-s` / `--pri`, `out` sfondo trasparente e `border: 1px solid var(--line)`, `sel` sfondo `--pri` e colore `#fff`.

`FlagIcon` è `<img alt={FLAG_ICONS[kind].label} src={FLAG_ICONS[kind].src} width={size} height={size} />`.

`DogAvatar` aggiunge `grid: SIZES.avatar.grid` e `AVATAR_RADIUS.grid`.

`SearchBar` in `mode="input"` non è un bottone. `mode` default `'button'`, così la Home attuale non si rompe.

`BottomNav`: `style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--pri)' : 'var(--tx3)' })}`.

`ShellFrame`: i due bottoni del foglio mostrano `Plus` e il testo esatto. Il comportamento di navigazione resta quello già scritto.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/components/ui/ui.test.tsx src/components/layout/shell.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/theme/tokens.css src/components/ui/Chip.tsx src/components/ui/ui.test.tsx src/components/domain/FlagIcon.tsx src/components/domain/DogAvatar.tsx src/components/ui/SectionTitle.tsx src/components/ui/SearchBar.tsx src/components/layout/BottomNav.tsx src/pages/ShellFrame.tsx
git commit -m @"
feat: allinea chip, bandiere e barra al mockup

"@
```

---

### Task 4: Riga appuntamento in una card

**Files:**
- Modify: `src/components/domain/AppointmentRow.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: `FlagIcon`, `ServiceIcon`, `Chip`, `Card`, `Row`, `formatCompactDuration`.
- Produces: `AppointmentRow({ appointment, dog, services, onOpen }: { appointment: Appointment; dog: Dog | undefined; services: Service[]; onOpen?: () => void })`. Senza `onOpen`, il tocco va a `/appuntamenti/${id}` come oggi. Con `onOpen`, chiama quella funzione e non naviga. Se `dog` manca, l’etichetta è «Cane assente» e il bottone è `disabled`.

La riga mostra ora, `formatCompactDuration`, avatar `sm`, nome, chip con `ServiceIcon` a 13 px (icona da `services.find`), `+N` se non entrano, poi `TemperamentIcon` 25 e le `FlagIcon` di anziano (`ageCategory === 'anziano'`) e mensile. Home e Calendario avvolgono le righe in una sola `Card`. Il primo `Row` ha `borderTop: 'none'`.

- [ ] **Step 1: Scrivere il test che fallisce**

Nel test di Home che apre un appuntamento di oggi, cambiare l’attesa: il clic sul nome del cane resta sul dettaglio finché il task 6 non passa `onOpen`. In questo task il test nuovo sta accanto:

```tsx
it('senza cane la riga non si apre', () => {
  render(<AppointmentRow appointment={appointment} dog={undefined} services={[]} />)
  expect(screen.getByRole('button', { name: 'Apri Cane assente' })).toBeDisabled()
})
```

Adattare `appointment` al helper già usato in `src/pages/appointments.test.tsx`.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL perché il bottone non è disabilitato, oppure `services` non è nella props.

- [ ] **Step 3: Scrivere l’implementazione**

Aggiornare `AppointmentRow` come nell’interfaccia. In `HomePage` e `CalendarPage` passare `services` da `ensureServiceSeed(uid)` e mettere le righe dentro `<Card>`. Non cambiare ancora la destinazione del tocco.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/domain/AppointmentRow.tsx src/pages/HomePage.tsx src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: mette gli appuntamenti del giorno in una card

"@
```

---

### Task 5: Scadenza dei mensili

**Files:**
- Create: `src/lib/cycle.ts`
- Create: `src/lib/cycle.test.ts`
- Modify: `src/lib/monthly.ts`
- Modify: `src/components/domain/MonthlyBanner.tsx`

**Interfaces:**
- Consumes: `Dog`, `Appointment`, `nextAppointment` solo per non usarlo come definizione di fissato.
- Produces:

```ts
export interface CycleRow {
  dog: Dog
  due: Date
  lastCompleted: Appointment | null
  booked: Appointment | null
  state: 'fissato' | 'da_fissare'
}

export function recurrenceWeeksOf(dog: Dog): number
export function cycleRow(dog: Dog, appointments: Appointment[], now: Date): CycleRow | null
export function monthBoard(dogs: Dog[], appointments: Appointment[], month: Date, now: Date): { fissati: CycleRow[]; daFissare: CycleRow[] }
export function dueSoon(dogs: Dog[], appointments: Appointment[], now: Date, daysBefore: number): CycleRow[]
```

`cycleRow` torna `null` se il cane non è attivo o non è mensile. `due` è l’inizio dell’ultimo appuntamento `completato` più `recurrenceWeeks` settimane (4 se il campo manca). Senza completati, `due` è l’inizio del giorno di `now`. Un programmato passato non è l’ultimo trattamento. `booked` è il programmato con `start >= inizio di oggi` e `start <= due + 14 giorni`, il più vicino. Se c’è, `state` è `fissato`, altrimenti `da_fissare`.

`monthBoard` per il mese di `month`: entrano le righe con `due` in quel mese. Se `month` è il mese di `now`, entrano anche i `da_fissare` con `due` prima dell’inizio del mese. `daFissare` ordinati per `due` poi nome. `fissati` ordinati per `booked.start`.

`dueSoon` è il `daFissare` di `monthBoard(..., now, now)` la cui `due` è entro `daysBefore` giorni da `now` oppure è già passata.

`MonthlyBanner` chiama `dueSoon` con `settings.monthlyReminder.daysBefore`. Il titolo resta `bannerCopy`. La riga sotto diventa «scadono entro N gg» con quello stesso N. Sfondo `var(--warn-s)`, colore `var(--warn)`, bottone **Vedi**.

- [ ] **Step 1: Scrivere il test che fallisce**

`src/lib/cycle.test.ts`, orologio 3 ottobre 2026 ore 12. Un mensile il cui ultimo completato è il 5 settembre (4 settimane → 3 ottobre) è da fissare. Lo stesso cane con un programmato il 10 ottobre è fissato. Un programmato il 20 novembre (oltre 14 giorni dal 3 ottobre) non lo fissa. Un mensile senza completati ha `due` il 3 ottobre ed è da fissare. `dueSoon` con `daysBefore: 7` include la scadenza di oggi e non una scadenza del 20 ottobre.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/cycle.test.ts`

Expected: FAIL perché il modulo non esiste.

- [ ] **Step 3: Scrivere l’implementazione**

Implementare `cycle.ts` con `addWeeks` e `startOfLocalDay` da `src/lib/appointments.ts`. Collegare il banner. I test vecchi di `monthlyLists` che descrivono «senza prossimo = da fissare» vanno aggiornati in questo task solo se `monthly.ts` smette di esportare quel comportamento. Lasciare `monthlyLists` com’è per la pagina Mensili fino al task 14: il banner non la chiama più.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/cycle.test.ts src/pages/monthly.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS. Se un test del banner cerca il vecchio sottotitolo, aggiornarlo a «scadono entro 7 gg».

- [ ] **Step 5: Commit**

```powershell
git add src/lib/cycle.ts src/lib/cycle.test.ts src/lib/monthly.ts src/components/domain/MonthlyBanner.tsx src/pages/monthly.test.tsx
git commit -m @"
feat: calcola la scadenza dei mensili dall’ultimo completato

"@
```

---

### Task 6: Home del mockup

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/shellPages.test.tsx`
- Modify: `src/pages/DogPage.tsx` (solo la chiamata a `rememberDog` quando si apre un cane esistente)

**Interfaces:**
- Consumes: `dueSoon`, `monthBoard`, `formatCompactDuration`, `rememberDog`, `getSettings`, `AppointmentRow` con `onOpen`.
- Produces: la Home del §6 della specifica. Il tocco su una riga di oggi esegue `navigate(\`/animali/${dog.id}\`)`. Il campanello ha `aria-label="Avvisi"` e un pallino (`data-testid="bell-dot"`) solo se `dueSoon` non è vuoto; il tocco va a `/mensili`. Il riquadro Oggi mostra il conteggio e `formatCompactDuration` della somma, e linka `/calendario?data=${localDayKey(now)}`. Il riquadro Mensili mostra `fissati/totali` e `Mensili ${format(now, 'MMM', IT_DATE)}` senza punto finale. Il riquadro Listino dice «Apri» (il file arriva al task 15). «Visti di recente» usa `recentDogIds`, salta gli assenti e gli archiviati, «Tutti N» con N = attivi. Se la lista è vuota la sezione non c’è.

- [ ] **Step 1: Scrivere il test che fallisce**

In `shellPages.test.tsx`, con un appuntamento di oggi e un mensile da fissare:

```tsx
expect(screen.getByRole('link', { name: 'Avvisi' })).toBeInTheDocument()
expect(screen.getByTestId('bell-dot')).toBeInTheDocument()
expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
await user.click(screen.getByRole('button', { name: 'Apri Birba' }))
expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
```

Il nome del bottone deve coincidere con `aria-label` di `AppointmentRow` (`Apri ${nome}`).

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/shellPages.test.tsx`

Expected: FAIL perché il campanello non c’è.

- [ ] **Step 3: Scrivere l’implementazione**

Header con logo (quadrato 26 px, raggio 8, `background: linear-gradient(135deg, var(--pri), var(--tea))`, icona `PawPrint` bianca), titolo, data, `IconButton` campanello (`Bell`), `IconButton` ingranaggio. Sotto, `SearchBar` finta con placeholder «Cerca cane, proprietario, razza…». Poi banner, tre riquadri, sezione Oggi, card, sezione recenti. All’apertura di `DogPage` per un id esistente e attivo, `setSettings(rememberDog(getSettings(uid), id))` una volta (`useEffect` sulle dipendenze `id` e `uid`).

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/HomePage.tsx src/pages/shellPages.test.tsx src/pages/DogPage.tsx
git commit -m @"
feat: porta la Home al mockup con riquadri e recenti

"@
```

---

### Task 7: Animali del mockup

**Files:**
- Modify: `src/lib/dogList.ts`
- Modify: `src/lib/dogList.test.ts`
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `shortOwner`, `ageText`, `AGE_LABEL`, `dueSoon`, `nextAppointment`, `FlagIcon`.
- Produces:
  - `DogChip` include `'in_agenda'`.
  - `dogSubtitle(dog, now): string` → `razza · età · shortOwner`.
  - `sortDogs(dogs, mode, nextOf): Dog[]` con `mode: 'alfabetico' | 'prossimo'`.
  - `visibleDogs` accetta gli appuntamenti solo per il chip `in_agenda`: il cane resta se `nextAppointment` non è `null`.

La pagina legge `?tab=archivio` all’avvio e seleziona quel tab. Il filtro apre un `Sheet` titolo «Ordina» con «Alfabetico» e «Per prossimo appuntamento». **Aggiungi** è un `Button` verso `/animali/nuovo`. I chip non vanno a capo (`flexWrap: 'nowrap'`, `overflow: 'hidden'`). In archivio **Ripristina** chiama `api.restore` e `stopPropagation` sul bottone. Terza riga come nella specifica §7, usando `dueSoon` per il caso arancione. Data breve del prossimo: se è oggi «Oggi HH:mm», altrimenti `format(date, 'EEE d MMM HH:mm', IT_DATE)` con iniziale maiuscola (`Mar 6 ott 10:00`). «Da fissare · ultimo 3 set» usa `format(lastCompleted, 'd MMM', IT_DATE)`.

- [ ] **Step 1: Scrivere il test che fallisce**

```ts
it('abbrevia il proprietario e tiene in agenda chi ha un prossimo', () => {
  const dog = dog({ id: '1', name: 'Birba', breed: 'Barboncino toy', contact: { name: 'Maria Pinna', phone: '1' } })
  expect(dogSubtitle(dog, new Date(2026, 9, 3))).toBe('Barboncino toy · Adulto · M. Pinna')
})
```

E in `DogsPage.test.tsx` un clic su **Ripristina** che riporta il cane fra gli attivi.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/dogList.test.ts src/pages/DogsPage.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. `dogMeta` può restare e delegare a `dogSubtitle` se i test vecchi si aggiornano al nuovo formato (età categoria + nome breve). Aggiornare il test che si aspetta «Labrador · Adulto · Sara»: «Sara» resta «Sara».

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/dogList.test.ts src/pages/DogsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/dogList.ts src/lib/dogList.test.ts src/pages/DogsPage.tsx src/pages/DogsPage.test.tsx
git commit -m @"
feat: allinea la lista animali al mockup

"@
```

---

### Task 8: Campi del cane sul dispositivo

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/dogs.ts`
- Modify: `src/data/local/dogs.test.ts`
- Modify: `src/lib/dogList.ts` (`buildSearchKey` accetta tutti i nomi)

**Interfaces:**
- Produces sul tipo `Dog`, oltre ai campi già presenti:

```ts
export interface DogContact { id: string; name: string; role: string; phone: string; isPrimary: boolean }
export interface DogServicePrice { serviceId: string; price: number; durationMin: number }
export interface CustomField { id: string; label: string; value: string }
export interface GalleryPhoto { id: string; photo: string; takenAt: Date }
```

`birthYear?: number`, `isSenior?: boolean`, `weightKg?: number`, `tags: string[]`, `servicePrices: DogServicePrice[]`, `hiddenServiceIds: string[]`, `customFields: CustomField[]`, `gallery: GalleryPhoto[]`, `recurrenceWeeks?: number`, `contacts: DogContact[]`.

In lettura, se `contacts` manca, un contatto `{ id: 'primary', name, role: 'Proprietaria', phone, isPrimary: true }` dal `contact` singolo. `tags` e le liste mancanti sono `[]`. `contact` in scrittura è il contatto `isPrimary`, o il primo. `searchKey` unisce nome, razza e tutti i nomi dei contatti. Un JSON vecchio non si riscrive solo perché lo si legge.

- [ ] **Step 1: Scrivere il test che fallisce**

Un cane salvato senza `contacts` si legge con un contatto primary uguale al vecchio `contact`, `tags` vuoti, e il `localStorage` resta identico. Un salvataggio con due contatti persiste entrambi e il `contact` singolo è il primario.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/data/local/dogs.test.ts`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Estendere `StoredDog` con i campi opzionali. `toDomain` riempie i default senza scrivere. `toStored` scrive `contacts` e `contact`. Aggiornare `dogFromWrite` quando `DogWrite` guadagna gli stessi campi opzionali: se il chiamante non li passa, restano i default vuoti. I test di creazione esistenti continuano a passare un `DogWrite` col solo contatto singolo: `toDomain`/`dogFromWrite` costruiscono `contacts` da quello.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/data/local/dogs.test.ts src/pages/DogsPage.test.tsx`

Expected: PASS. Poi `npm run build` PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/dogs.ts src/data/local/dogs.test.ts src/lib/dogList.ts
git commit -m @"
feat: conserva contatti, prezzi e galleria sul cane già salvato

"@
```

---

### Task 9: Scheda, metà alta

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogFields.tsx`
- Modify: `src/lib/schemas.ts`
- Modify: `src/pages/DogsPage.test.tsx` o `src/pages/DogPage` test se esiste; altrimenti estendere `DogsPage.test.tsx`

**Interfaces:**
- Consumes: `splitCritical`, `ageText`, `FlagIcon`, `TemperamentIcon`, `prepareDogPhoto`.
- Produces: la scheda del §8 fino a **Servizi e prezzi** incluso. `quotedPrice(dog, service): { price: number; durationMin: number }` vive in `src/lib/quote.ts` (creato qui, completato al task 11): torna lo scostamento in `servicePrices` oppure `service.price[dog.size]` e `service.durationMin[dog.size]`.

Obbligatori restano nome e un telefono. **Salva** mostra «Salvato». Indietro abbandona senza conferma. Menu ⋮: le due archive e «Elimina definitivamente». Se ci sono programmati con `start >= now`, il foglio offre «Archivia e cancella i futuri» e «Archivia soltanto». Eliminare chiede «Elimina definitivamente» / «Annulla» e chiama `deleteDog`, che toglie solo quel id dalla mappa cani. Foto 84. Avviso rosso con `splitCritical`. Chip +2/+4/+6 restano. **Successivo +** naviga a `/appuntamenti/nuovo?cane=&data=&ora=&servizi=` con +4 settimane. **Data…** naviga con il solo `cane`.

In modifica il prezzo è un `<input aria-label={"Prezzo " + name}>`. Nascondere scrive l’id in `hiddenServiceIds`. **+ Servizio** rimette un id nascosto. Si salva lo scostamento solo se prezzo o durata differiscono dal listino.

- [ ] **Step 1: Scrivere il test che fallisce**

Aprire un cane con `criticalNote: 'Morde. Museruola'`: si vedono «Morde» e «Museruola» senza scorrere la pagina (sono nel documento appena renderizzato). **Elimina definitivamente** poi **Annulla** lascia il cane. Confermare lo toglie e gli appuntamenti restano leggibili come assenza del cane in lista.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/DogsPage.test.tsx`

Expected: FAIL perché l’avviso non è spezzato o il menu non c’è.

- [ ] **Step 3: Scrivere l’implementazione**

Aggiungere `deleteDog(uid, id)` in `src/data/local/dogs.ts` e `remove` in `useDogs`. La scheda in lettura non usa più solo `DogFields`: `DogFields` resta il cane nuovo e la modifica. La lettura è il layout del mockup nella stessa `DogPage`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/data/local/dogs.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogFields.tsx src/lib/schemas.ts src/lib/quote.ts src/lib/quote.test.ts src/data/local/dogs.ts src/hooks/useDogs.ts src/pages/DogsPage.test.tsx
git commit -m @"
feat: apre la scheda con avviso, prezzi e elimina

"@
```

Il test di `quotedPrice` nasce in questo step: taglia piccola senza scostamento → prezzo 20 e durata 30 per il servizio `bagno` del seed; con `servicePrices` `{ serviceId: 'bagno', price: 25, durationMin: 40 }` tornano 25 e 40.

---

### Task 10: Scheda, metà bassa

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/data/local/settings.ts` (`setFieldLabel`, `setTagSuggestions`)
- Modify: `src/data/local/appointments.ts` (campo opzionale `total?: number` in lettura, senza riscrivere se assente)

**Interfaces:**
- Consumes: `fieldLabels`, `tagSuggestions`, appuntamenti del cane.
- Produces: griglia 2 colonne, contatti, note, storico, galleria, riga archivio. `averageDuration(appointments, dogId): string` in `src/lib/display.ts`: media di `actualDurationMin` degli ultimi 5 completati; se nessuno ha il campo, media di `sumDuration(services)`; se non ci sono completati, «—». Altrimenti `formatCompactDuration`.

Lo storico mostra 3 completati; **Tutti N** alza il limite al conteggio. Prezzo mostrato: `total` se c’è, altrimenti `sumPrice`. In modifica la matita su una riga con un servizio aggiorna quella riga e offre «Aggiorna anche il prezzo in scheda». Con più servizi salva `total` e offre solo «Solo questo appuntamento». Galleria: al massimo 4 miniature da 50 px, poi un bottone «+N» che alza il limite. **Aggiungi** usa `prepareDogPhoto`. Note vuote: «Nessuna nota».

- [ ] **Step 1: Scrivere il test che fallisce**

`averageDuration` con cinque completati di 60, 60, 60, 60 e uno da 90 senza `actualDurationMin` non entra nei cinque più recenti se è il sesto. Con due completati da 30 e 60 minuti previsti e senza `actualDurationMin`, la media è `45m`.

Un contatto aggiunto in modifica compare dopo **Salva** e la `searchKey` contiene il suo nome.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/display.test.ts src/pages/DogsPage.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. `setFieldLabel(uid, key, label)` aggiorna `fieldLabels` e `updatedAt`. La matita della griglia lo chiama subito. I ruoli suggeriti in pagina sono `['Proprietaria', 'Co-proprietario', 'Figlia']` più i ruoli già presenti sui cani, senza duplicati. Se l’anno di nascita cambia, la categoria si ricalcola con le soglie 1, 3 e 8 e `isSenior` diventa `true` solo quando la categoria nuova è `anziano`, altrimenti `false`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/display.test.ts src/pages/DogsPage.test.tsx src/data/local/appointments.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/lib/display.ts src/lib/display.test.ts src/data/local/settings.ts src/data/local/appointments.ts src/pages/DogsPage.test.tsx
git commit -m @"
feat: completa la scheda con storico, contatti e galleria

"@
```

---

### Task 11: Preventivo e ricerca dell’appuntamento

**Files:**
- Create: resto di `src/lib/quote.ts` se il task 9 ha solo `quotedPrice`
- Modify: `src/lib/quote.test.ts`
- Modify: `src/lib/appointments.ts` (`appointmentEnd`)
- Modify: `src/types/models.ts` (`Appointment` guadagna i campi opzionali del §9)
- Modify: `src/data/local/appointments.ts`

**Interfaces:**
- Produces:

```ts
export function roundEnd(start: Date, durationMin: number): Date
export function rankDogs(dogs: Dog[], query: string): Dog[]
```

`roundEnd`: somma i minuti e arrotonda i minuti della fine al multiplo di 5 più vicino; la metà va su (`Math.round`). `rankDogs`: solo `status === 'attivo'`, attesa non inclusa (la fa la pagina). Ordine: nome che inizia, nome che contiene, poi proprietario o razza. Massimo 6. Confronto con `normalizeSearch`.

`Appointment` in lettura accetta `end`, `total`, `tools`, `products`, `cutStyle`, `actualDurationMin`, `photos: { id: string; photo: string; kind: 'prima' | 'dopo' | 'altro' }[]`, `seriesId`. Assenti → liste vuote e campi opzionali `undefined`. Non si riscrive solo leggendo. `createAppointment` accetta `seriesId` opzionale su `AppointmentWrite`.

- [ ] **Step 1: Scrivere il test che fallisce**

`roundEnd(new Date(2026, 9, 3, 9, 0), 70)` è le 10:10 (70 minuti → 10:10 esatti, già multiplo). `roundEnd(..., 72)` è le 10:10 (10:12 → 10:10). `roundEnd(..., 73)` è le 10:15 (10:13 → 10:15). `rankDogs` con «bir» mette prima «Birba» di «Birillo» se entrambi iniziano, e non include un archiviato. Un appuntamento senza `tools` si legge `[]` e il JSON non cambia.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/quote.test.ts src/data/local/appointments.test.ts`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come sopra. `appointmentEnd` delega a `roundEnd`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/quote.test.ts src/lib/appointments.test.ts src/data/local/appointments.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/quote.ts src/lib/quote.test.ts src/lib/appointments.ts src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts
git commit -m @"
feat: calcola la fine, la ricerca e i campi dell’appuntamento

"@
```

---

### Task 12: Fogli nuovo e dettaglio

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/completato.test.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `rankDogs`, `quotedPrice`, `roundEnd`, `formatCompactDuration`, `backTarget` già in `AppointmentPage`.
- Produces: le rotte restano. Il contenuto è un `Sheet` `open` sopra un fondo che linka al calendario del giorno (`/calendario?data=`). Chiudere usa `backTarget`.

Nuovo: input con debounce 120 ms (`useEffect` + `setTimeout`), risultati di `rankDogs`, il testo cercato nel nome dentro `<mark>`. Ultima riga «+ Nuovo cane "…"» verso `/animali/nuovo` con `state: { name: query, returnTo: pathname+search }`. `DogPage` nuovo, se quello state c’è, precompila il nome e dopo il salvataggio torna a `returnTo` con `&cane=id`. Chip servizi con icona e durata di `quotedPrice`. Riquadro «Durata stimata» e «da scheda». Sovrapposizione e **Salva appuntamento** come oggi. Toggle «Ripeti · cliente mensile»: acceso se `clientType === 'mensile'`. Testo «ogni N settimane · prossimo {data}». N modificabile, parte da `recurrenceWeeks` o 4. Se acceso al salvataggio, `saveExisting` del cane con `clientType: 'mensile'` e `recurrenceWeeks: N`, e l’appuntamento nasce con `seriesId` nuovo (`crypto.randomUUID()`). Se spento, il tipo cliente non si tocca e `seriesId` non c’è. I chip +N copiano `seriesId` se c’è.

Dettaglio: testata, **Scheda**, avviso, servizi, **Totale**, strumenti, prodotti, stile, foto Prima/Dopo/**Aggiungi**. Anticipa/Posticipa ±15, toast «Spostato alle HH:mm» con **Annulla** che riscrive lo `start` precedente. **Cancella** conferma nel foglio. **Completato · fissa il prossimo** scrive `actualDurationMin` = somma durate se il campo è vuoto, poi i chip. Un campo «Durata reale» sul completato chiama `complete` già fatto e poi un update che non riporta lo stato a `programmato`.

- [ ] **Step 1: Scrivere il test che fallisce**

Nel test di completato, dopo il clic si aspetta ancora i tre chip. Aggiungere: il completato persiste `actualDurationMin` uguale alla somma. La ricerca «Bir» mostra «Birba» e non un cane archiviato. Il toggle acceso su un occasionale, dopo **Salva appuntamento**, rilegge il cane come mensile.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/appointments.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. Le foto passano da `prepareDogPhoto`. Suggerimenti strumenti: `settings.toolSuggestions` se non vuoto, altrimenti «Tosatrice», «Shampoo», «Profumo» più i valori già presenti negli appuntamenti.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/appointments.test.tsx src/pages/monthly.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/AppointmentForm.tsx src/pages/DogPage.tsx src/pages/completato.test.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: disegna nuovo e dettaglio appuntamento come fogli

"@
```

---

### Task 13: Calendario giorno, settimana, mese

**Files:**
- Create: `src/lib/calendarView.ts`
- Create: `src/lib/calendarView.test.ts`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Produces:

```ts
export type CalendarVista = 'giorno' | 'settimana' | 'mese'
export function parseVista(value: string | null): CalendarVista
export function weekDays(selected: Date): Date[]
export function blockTone(clientType: 'mensile' | 'occasionale', iconKeys: Array<string | undefined>): 'warn' | 'sen' | 'tea' | 'pri'
export function daySummary(dogs: Dog[], appointments: Appointment[]): { dogs: number; minutes: number; mordaci: number }
export function snapQuarter(date: Date): Date
```

`parseVista` torna `giorno` se il valore non è uno dei tre. `weekDays` è il lunedì–domenica che contiene `selected` (`weekStartsOn: 1`). `blockTone`: mensile → `warn`; `bagno_taglio` → `sen`; `dermatologico` o `antiparassitario` → `tea`; altrimenti `pri`. `daySummary` conta cani distinti, somma durate, conta i distinti con `temperament === 'mordace'`. `snapQuarter` aggancia ai 15 minuti e, se l’ora esce da 8–19, la riporta dentro (08:00 o 19:00).

La pagina legge `vista`. Frecce: `addMonths`. **Oggi** cambia solo `data`. Striscia con al massimo 3 pallini. Riepilogo del giorno, dei 7 giorni o del mese. «N mordace» solo se N > 0. Vuoto: «0 cani · 0m stimate». Griglia 08–19, 44 px. Linea «adesso» solo se il giorno selezionato è oggi e l’ora è in fascia. Tocca blocco → `/appuntamenti/:id`. Tocca vuoto → `/appuntamenti/nuovo?data=&ora=` con l’ora in punto. Settimana: sette colonne, scroll verticale, nel blocco solo nome e icona. Mese: pallini; tocco apre `Sheet` con le righe e **+ Aggiungi**. Trascinare in giorno e settimana chiama `saveExisting` con il nuovo `start` da `snapQuarter` e il toast «Spostato alle HH:mm» con **Annulla**. In settimana il giorno può cambiare. La vista mese non ha drag.

- [ ] **Step 1: Scrivere il test che fallisce**

`blockTone('mensile', ['bagno_taglio'])` è `warn`. `blockTone('occasionale', ['bagno_taglio'])` è `sen`. `blockTone('occasionale', ['dermatologico'])` è `tea`. `blockTone('occasionale', ['bagno'])` è `pri`. `parseVista('no')` è `giorno`. `snapQuarter` delle 10:07 è 10:00; delle 10:08 è 10:15; delle 20:00 è 19:00.

In pagina, `?vista=mese` mostra la griglia e non la colonna oraria.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/calendarView.test.ts src/pages/appointments.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. Il drag usa pointer events sul blocco: al `pointerup` calcola i minuti da `offsetY / 44 * 60` nella colonna, poi `snapQuarter`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/calendarView.test.ts src/pages/appointments.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calendarView.ts src/lib/calendarView.test.ts src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: aggiunge settimana, mese e trascinamento al calendario

"@
```

---

### Task 14: Pagina Clienti mensili

**Files:**
- Modify: `src/pages/MonthlyPage.tsx`
- Modify: `src/pages/monthly.test.tsx`
- Modify: `src/pages/ShellFrame.tsx` solo se la pagina deve mostrare la barra: `MonthlyPage` usa `ShellFrame` al posto di `PhoneShell` senza nav. Nessun `NavLink` risulta attivo su `/mensili` perché nessuna voce ha quel `to`.

**Interfaces:**
- Consumes: `monthBoard`, `bookHref`.
- Produces: la schermata §11. Segmenti del mese di `now` e del mese dopo (`format` `MMM`). Filtro in `useState<'tutti' | 'da_fissare' | 'fissati'>`. Copia «N/T», «fissati», «N da fissare», «Nessun mensile», «Scade oggi», «Ultimo d MMM · scade d MMM». **Fissa** usa `bookHref`. Il chip data dei fissati è `format(start, 'd MMM', IT_DATE)`.

- [ ] **Step 1: Scrivere il test che fallisce**

Orologio 3 ottobre 2026. Un mensile con ultimo completato il 5 settembre e nessun programmato entro 14 giorni dalla scadenza sta sotto «Da fissare» e il sottotitolo contiene «scade». Un programmato il 10 ottobre lo sposta sotto «Fissati». Il segmento del mese dopo non lo mostra se la scadenza è in ottobre.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: FAIL sui test che usano ancora la regola «qualsiasi prossimo».

- [ ] **Step 3: Scrivere l’implementazione**

Sostituire il corpo di `MonthlyPage` con `monthBoard`. Lasciare `monthlyLists` esportato finché un test di libreria lo usa; se nessun chiamante resta, cancellare la funzione e i suoi test nello stesso commit, dopo aver spostato le attese su `cycle.ts`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/monthly.test.tsx src/lib/cycle.test.ts src/pages/shellPages.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/MonthlyPage.tsx src/pages/monthly.test.tsx src/lib/monthly.ts src/lib/monthly.test.ts
git commit -m @"
feat: mostra i mensili del mese con fissati e da fissare

"@
```

---

### Task 15: File del listino

**Files:**
- Modify: `src/data/local/settings.ts` (`replacePriceFile`, `dropOldestPrice`)
- Modify: `src/pages/ListinoPage.tsx`
- Create: `src/pages/PriceViewPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/listino.test.tsx`
- Modify: `src/pages/HomePage.tsx` (sottotitolo del riquadro)

**Interfaces:**
- Produces:

```ts
export function replacePriceFile(settings: SettingsMain, file: PriceFile): SettingsMain
export function priceFileMeta(file: PriceFile): string
```

`replacePriceFile` sposta il `priceList` attuale in cima a `priceListHistory` e mette `file` come attuale. `priceFileMeta`: immagine → `Immagine · N KB`; PDF senza pagine → `PDF · N KB`; se `file.pageCount` è stato letto ed è un numero, `2 pagine · N KB`. Il conteggio pagine è opzionale su `PriceFile` (`pageCount?: number`): si riempie solo se il testo del PDF contiene `/Type /Page` e il conteggio delle occorrenze è maggiore di 0. KB interi sotto 1024×1024, altrimenti MB con una cifra `it-IT`.

`replacePriceFile` non scrive. La pagina scrive con `writeJson`. Se `writeJson` lancia, toglie l’ultimo elemento di `priceListHistory` e riprova una volta. Al secondo fallimento toast «Salvataggio non riuscito» e lo stato in memoria torna a quello precedente.

**Sostituisci** accetta `application/pdf,image/*`. **Foto** usa `prepareDogPhoto` e mime `image/jpeg`. Senza file: «Nessun file». **Apri** va a `/listino/vedi`. Una versione va a `/listino/vedi?id=`. La vista mostra `<img>` o `<iframe title="Listino">` e Indietro è `/listino`. La tabella e **Modifica** restano. Sotto la tabella la frase esatta «I prezzi in scheda cane hanno priorità sul listino.» Il sottotitolo della pagina è la data del file se c’è, altrimenti quella del catalogo già calcolata. Home: «PDF · apri» se `priceList` c’è, altrimenti «Apri».

- [ ] **Step 1: Scrivere il test che fallisce**

`replacePriceFile` con un attuale e un nuovo mette il vecchio in history e il nuovo in `priceList`. `priceFileMeta` di un jpeg da 340000 byte contiene «Immagine» e «KB». La pagina senza file mostra «Nessun file» e non mostra «In arrivo».

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/data/local/settings.test.ts src/pages/listino.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. Aggiungere la rotta prima del `*`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/data/local/settings.test.ts src/pages/listino.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/settings.ts src/data/local/settings.test.ts src/pages/ListinoPage.tsx src/pages/PriceViewPage.tsx src/pages/listino.test.tsx src/app/router.tsx src/pages/HomePage.tsx
git commit -m @"
feat: aggiunge il file del listino e le versioni precedenti

"@
```

---

### Task 16: Impostazioni e backup sul dispositivo

**Files:**
- Create: `src/lib/backupDoc.ts`
- Create: `src/lib/backupDoc.test.ts`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Modify: `src/app/App.tsx` o `src/app/providers.tsx` per il backup automatico all’avvio

**Interfaces:**
- Produces:

```ts
export interface BackupBundle { dogs: unknown; appointments: unknown; services: unknown; settings: unknown }
export function buildBackup(uid: string): BackupBundle
export function backupCounts(bundle: BackupBundle): { dogs: number; appointments: number; services: number }
export function restoreBackup(uid: string, bundle: BackupBundle): void
```

`buildBackup` legge le quattro chiavi. `backupCounts` conta le chiavi degli oggetti mappa; se un pezzo non è un oggetto, conta 0. `restoreBackup` scrive le quattro chiavi e non tocca `groomly.session` né `groomly.auth`.

La pagina ha le sezioni della specifica §13. **Copia** usa `navigator.clipboard.writeText` e toast «Copiato». **Esegui** scarica `groomly-backup-aaaa-mm-gg.json` (`Blob` + `<a download>`) e salva `backup.lastAt`. Stato «Mai eseguito» oppure «Oggi HH:mm · completato» se `lastAt` è oggi, altrimenti la data breve. Il toggle automatico parte spento. All’avvio, se `autoDaily` e `lastAt` è assente o più vecchio di 24 ore, riscrive `backup.lastAt` e una copia `groomly.users.${uid}.backup` — questa è l’unica eccezione alla frase «nessuna chiave nuova»: non aggiungerla. La copia automatica sta nel campo `backup.snapshot` dentro le impostazioni già salvate. Non parte un download.

**Esporta** scarica uno ZIP. Senza dipendenza nuova: il ZIP è il JSON con nome `backup.json` dentro un archivio costruito come `Blob` di tipo `application/json` scaricato `groomly-export.json` se aggiungere JSZip non è già nel repo. Il repo non ha JSZip: aggiungere `jszip` e scaricare `groomly-export.zip` con `backup.json` e, per ogni foto `dataUrl` di profilo, galleria, lavoro e listino, un file `foto/{id}.jpg`. **Ripristina** legge un JSON, mostra «N cani, N appuntamenti, N servizi», poi **Ripristina** o **Annulla**.

**Tag caratteristiche** modifica le tre liste (un input e Aggiungi per ciascuna). Sottotitolo «N tag · 4 caratteri» con N = `tagSuggestions.length`. **Archivio animali** linka `/animali?tab=archivio` e mostra il conteggio. Promemoria: toggle, `input type="time"`, numero giorni. Il toggle non condiziona il banner.

- [ ] **Step 1: Scrivere il test che fallisce**

`backupCounts` su `{ dogs: { a: {}, b: {} }, appointments: {}, services: { s: {} }, settings: {} }` è `{ dogs: 2, appointments: 0, services: 1 }`. `restoreBackup` non cancella `groomly.session`. La pagina mostra «Mai eseguito» e «Promemoria mensili».

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/backupDoc.test.ts src/pages/SettingsPage.test.tsx`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

`npm install jszip` prima dello zip. Come nell’interfaccia.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/backupDoc.test.ts src/pages/SettingsPage.test.tsx`

Expected: PASS. `npm run build` PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/lib/backupDoc.ts src/lib/backupDoc.test.ts src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/app/providers.tsx
git commit -m @"
feat: completa impostazioni, esportazione e ripristino

"@
```

---

### Task 17: Firebase sotto gli stessi hook

**Files:**
- Create: `src/lib/firebaseMap.ts`
- Create: `src/lib/firebaseMap.test.ts`
- Create: `src/data/firebase/client.ts`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `storage.rules`
- Modify: `src/hooks/useSession.tsx`
- Modify: `src/hooks/useDogs.ts`
- Modify: `src/hooks/useAppointments.ts`
- Modify: `src/hooks/useSettings.tsx`
- Modify: `src/pages/SettingsPage.tsx` (solo il ramo di **Esegui** e del backup automatico quando `firebaseEnabled()` è true)
- Modify: `.gitignore` se `.env.local` non c’è già

**Interfaces:**
- Produces:

```ts
export function dateToMillis(value: Date): number
export function millisToDate(value: number): Date
export function storagePaths(uid: string): {
  profile: (dogId: string) => string
  gallery: (dogId: string, photoId: string) => string
  work: (appointmentId: string, photoId: string, kind: 'prima' | 'dopo' | 'altro') => string
  price: (fileName: string) => string
  backup: (day: string) => string
}
```

Percorsi: `users/{uid}/dogs/{dogId}/profile.jpg`, `users/{uid}/dogs/{dogId}/gallery/{photoId}.jpg`, `users/{uid}/appointments/{appointmentId}/{kind}-{photoId}.jpg`, `users/{uid}/pricelist/{fileName}`, `users/{uid}/backups/{day}.json`.

`client.ts` esporta `firebaseEnabled(): boolean` che è true solo se `import.meta.env.VITE_FIREBASE_API_KEY` è una stringa non vuota. Se è false, i hook restano su `src/data/local`. Se è true, `useSession` usa `signInWithEmailAndPassword` / `createUserWithEmailAndPassword` / `signOut` e `getAuth`. `useDogs`, `useAppointments`, `useSettings` e `useServices` leggono e scrivono `users/{uid}/dogs`, `users/{uid}/appointments`, `users/{uid}/services` e `users/{uid}/settings/main`. Le pagine che importano `ensureServiceSeed` da `src/data/local/services` passano a `useServices(uid)`. Le date nel dominio restano `Date`, convertite solo in `firebaseMap`. Un campo foto che è ancora un `dataUrl` parte verso lo Storage del percorso corrispondente; finché l’upload non risolve, lo stato del hook tiene il `dataUrl`. Le scritture offline restano nella cache di Firestore. I file in `src/pages` non si modificano per questo, salvo **Esegui** e il backup automatico: se `firebaseEnabled()` e c’è rete, caricano lo stesso JSON su `storagePaths(uid).backup(day)`. Senza rete quel caricamento resta in coda e la copia locale del task 16 rimane. Errore `auth/invalid-credential` → «Email o password non corretti». Errore di rete (`auth/network-request-failed`) senza utente già in `onAuthStateChanged` → «Connessione assente».

Al primo `onAuthStateChanged` con utente, se esistono chiavi `groomly.users.` di qualunque uid locale, copiare cani, appuntamenti, servizi e impostazioni su `users/{firebaseUid}` e i `dataUrl` delle foto sullo Storage dei percorsi sopra. Non copiare `passwordHash`. Se la copia riesce, `removeItem` su `groomly.auth`, `groomly.session` e le chiavi dati locali. Se fallisce, toast «Salvataggio non riuscito» e le chiavi restano; il flag `sessionStorage['groomly.migrate']` non si setta, così al prossimo accesso si riprova. Finché la copia non è riuscita, le pagine leggono il locale.

Firestore: `enableIndexedDbPersistence` (o `persistentLocalCache` della versione modulare installata). `npm install firebase`. Le pagine non si modificano.

Regole Firestore e Storage: `allow read, write: if request.auth != null && request.auth.uid == uid` sui path `users/{uid}/{document=**}`.

`firestore.indexes.json` con gli indici della specifica: `appointments` su `start`, su `dogId`+`start`, su `status`+`start`; `dogs` su `status`+`name` e `clientType`+`status`.

Passi console, da eseguire a mano in questo task e da scrivere in cima a `src/data/firebase/client.ts` come commento:

1. Creare un progetto su console.firebase.google.com.
2. Authentication → email/password → attiva.
3. Creare Firestore in modalità produzione.
4. Creare Storage.
5. Copiare la config in `.env.local` come `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
6. `npx firebase deploy --only firestore:rules,firestore:indexes,storage` dopo `firebase login`.

I test non importano `client.ts` e non chiamano la rete. `firebaseMap.test.ts` controlla solo percorsi e millisecondi.

- [ ] **Step 1: Scrivere il test che fallisce**

```ts
expect(storagePaths('u').profile('d')).toBe('users/u/dogs/d/profile.jpg')
expect(storagePaths('u').work('a', 'p', 'prima')).toBe('users/u/appointments/a/prima-p.jpg')
expect(millisToDate(dateToMillis(new Date(2026, 9, 3, 12))).toISOString()).toBe(new Date(2026, 9, 3, 12).toISOString())
```

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/firebaseMap.test.ts`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. `.env.local` nel `.gitignore`. Non committare chiavi.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/firebaseMap.test.ts`

Expected: PASS. `npm run build` PASS con le env assenti (`firebaseEnabled()` false).

- [ ] **Step 5: Commit**

```powershell
git add src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/client.ts src/hooks/useSession.tsx src/hooks/useDogs.ts src/hooks/useAppointments.ts src/hooks/useSettings.tsx src/pages/SettingsPage.tsx firestore.rules firestore.indexes.json storage.rules .gitignore package.json package-lock.json
git commit -m @"
feat: collega Firebase senza cambiare le schermate

"@
```

---

### Task 18: APK e notifica mensile

**Files:**
- Create: `capacitor.config.ts`
- Modify: `package.json` (script `cap:sync`)
- Create: `src/lib/reminderText.ts`
- Create: `src/lib/reminderText.test.ts`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Produces: `reminderText(rows: { dog: { name: string } }[]): string | null`. `null` se la lista è vuota. Un nome: «1 mensile da programmare: Toby». Più nomi: «3 mensili da programmare: Toby, Kira, Oscar» con al massimo tre nomi, il numero è `rows.length`.

`capacitor.config.ts`: `appId: 'it.groomly.app'`, `appName: 'Groomly'`, `webDir: 'dist'`.

Comandi di questo task, in ordine:

```powershell
npm install @capacitor/core @capacitor/android @capacitor/camera @capacitor/local-notifications
npx cap add android
npx cap sync android
```

In `android/app/src/main/AndroidManifest.xml` i permessi `CAMERA`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS` ci sono dopo `cap add`; se manca `POST_NOTIFICATIONS`, aggiungerlo.

Icona: generare `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` a partire da un canvas 256 px, fondo `#3a5ba0`, zampa bianca al centro. Splash: stesso fondo, zampa e la parola Groomly. Se lo strumento `cordova-res` non è installato, scrivere i PNG con lo script già possibile in Node (`sharp` non è dipendenza: usare i PNG del kit `src/assets/icons` solo come segno, e un file statico committato). Il minimo che il task deve lasciare è `capacitor.config.ts` più le risorse indicate da Capacitor in `android/app/src/main/res`.

`providers.tsx`: se `Capacitor.isNativePlatform()` è false, non chiamare `LocalNotifications`. Se è true e `monthlyReminder.enabled` e `reminderText(dueSoon(...))` non è `null`, `LocalNotifications.schedule` un id fisso `1`, canale «Promemoria mensili», all’orario `time` (se l’ora di oggi è passata, il giorno dopo). Se il testo è `null` o il toggle è spento, `cancel` dell’id `1`. Rifare la schedule quando cambiano impostazioni o all’avvio. Il listener `localNotificationActionPerformed` fa `window.location.assign('/mensili')`.

Prima di `<input type="file" capture>` di foto profilo, galleria, lavoro e listino, se la piattaforma è nativa chiamare `Camera.requestPermissions()`. Se `camera` è `denied`, toast «Permesso foto negato» e aprire comunque il selettore file.

Prova manuale, non automatizzata: installare l’APK debug (`cd android; .\gradlew assembleDebug`), concedere e negare la fotocamera, anticipare l’orario di un minuto, vedere la notifica, toccarla, tornare a 18:30.

- [ ] **Step 1: Scrivere il test che fallisce**

```ts
expect(reminderText([])).toBeNull()
expect(reminderText([{ dog: { name: 'Toby' } }])).toBe('1 mensile da programmare: Toby')
expect(reminderText([{ dog: { name: 'Toby' } }, { dog: { name: 'Kira' } }, { dog: { name: 'Oscar' } }, { dog: { name: 'Luna' } }])).toBe('4 mensili da programmare: Toby, Kira, Oscar')
```

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/reminderText.test.ts`

Expected: FAIL

- [ ] **Step 3: Scrivere l’implementazione**

Come nell’interfaccia. Il test non importa Capacitor.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/reminderText.test.ts`

Expected: PASS. `npm run build` PASS.

- [ ] **Step 5: Commit**

```powershell
git add capacitor.config.ts package.json package-lock.json src/lib/reminderText.ts src/lib/reminderText.test.ts src/app/providers.tsx android
git commit -m @"
feat: impacchetta l’APK e programma il promemoria mensile

"@
```

Non aggiungere cartelle di build (`android/app/build`, `android/.gradle`). Se `git status` le mostra, metterle in `.gitignore` prima del commit.
