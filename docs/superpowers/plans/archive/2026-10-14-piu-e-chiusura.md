# Popup del «+» e chiusura con variazione — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il «+» apre un popup centrale con Appuntamento e Aggiungi Pelosetto, e Completato chiede prezzo, tempo impiegato e nota prima di chiudere.

**Architecture:** Le regole di variazione stanno in `src/lib/closeVisit.ts`, pure. Un solo `saveClose` scrive cifra, minuti e nota senza toccare le righe servizio. Il popup di scelta e il popup di chiusura sono due componenti sul `Dialog` già centrato. Dettaglio, Home e storico lo riusano.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, lucide-react, Firestore tramite `firebaseMap`.

## Global Constraints

- Il «+» è un `Dialog` centrato titolo **Nuovo**, non il foglio basso. Prima **Appuntamento**, poi **Aggiungi Pelosetto**. Icona, nome, freccia. Righe alte almeno 44 px, bordo, raggio 14, icona su `var(--pri-s)`.
- In Animali sparisce **Aggiungi** in alto. A lista vuota restano **Aggiungi il primo cane** e **Aggiungi un cane**.
- **Completato** apre il modulo a colonna. **Nessuna modifica** chiude com'è. **Salva e completa** solo se c'è variazione e la nota, senza spazi, ha da 1 a 280 caratteri.
- Il tempo è quello impiegato. Inizio e fine in agenda non si spostano. Le righe servizio non si riscrivono.
- Nota obbligatoria solo se prezzo (in centesimi) o minuti sono diversi dal previsto. `50` e `50,00` non sono una variazione.
- Ore intere da 0 a 24, minuti da 0 a 59, niente riporto, somma da 1 minuto a 24 ore e 0 minuti. Errori: «Importo non valido», «Tempo non valido».
- `total` solo se la cifra è diversa. `actualDurationMin` sempre dopo una chiusura riuscita. `adjustmentNote` solo se c'è variazione. Se tornano al previsto, i due campi si tolgono.
- Sul dettaglio completato il tempo si legge `2 h 00` se le ore sono almeno 1, altrimenti `45 min`.
- X, **Annulla** e il tocco fuori non scrivono. Da domani **Completato** resta spento (`canComplete`).
- La domanda sul prezzo in scheda esce solo dalla matita dello storico, con un solo servizio e cifra diversa da quella del cane.
- Gli incassi non mostrano la nota. Nessun colore nuovo. Non si usa `window.confirm`.
- Non alzare `APP_VERSION` in questi task. La release la fa il controller a lavoro finito.

---

### Task 1: Regole di chiusura

**Files:**
- Create: `src/lib/closeVisit.ts`
- Test: `src/lib/closeVisit.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `NOTE_MAX = 280`
  - `splitDuration(minutes: number): { hours: number; minutes: number }`
  - `formatSpent(minutes: number): string`
  - `parseClosePrice(raw: string): { ok: true; value: number } | { ok: false; message: 'Importo non valido' }`
  - `parseCloseDuration(hoursRaw: string, minutesRaw: string): { ok: true; value: number } | { ok: false; message: 'Tempo non valido' }`
  - `hasVariation(quotedPrice: number, quotedMinutes: number, price: number, minutes: number): boolean`
  - `closePatch(input: { quotedPrice: number; quotedMinutes: number; price: number; minutes: number; note: string }): { total: number | null; actualDurationMin: number; adjustmentNote: string | null }`
  - `canSkipClose(input: { quotedPrice: number; quotedMinutes: number; priceRaw: string; hoursRaw: string; minutesRaw: string }): boolean`
  - `canSaveClose(input: { quotedPrice: number; quotedMinutes: number; priceRaw: string; hoursRaw: string; minutesRaw: string; note: string }): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/lib/closeVisit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canSaveClose, canSkipClose, closePatch, formatSpent, hasVariation, parseCloseDuration, parseClosePrice, splitDuration } from './closeVisit'

describe('closeVisit', () => {
  it('spezza i minuti e li legge', () => {
    expect(splitDuration(90)).toEqual({ hours: 1, minutes: 30 })
    expect(formatSpent(120)).toBe('2 h 00')
    expect(formatSpent(45)).toBe('45 min')
  })

  it('accetta importo e tempo nei limiti', () => {
    expect(parseClosePrice('70,5')).toEqual({ ok: true, value: 70.5 })
    expect(parseClosePrice('abc')).toEqual({ ok: false, message: 'Importo non valido' })
    expect(parseCloseDuration('2', '00')).toEqual({ ok: true, value: 120 })
    expect(parseCloseDuration('24', '0')).toEqual({ ok: true, value: 1440 })
    expect(parseCloseDuration('0', '0').ok).toBe(false)
    expect(parseCloseDuration('24', '1').ok).toBe(false)
    expect(parseCloseDuration('1', '90').ok).toBe(false)
  })

  it('la variazione è in centesimi o in minuti', () => {
    expect(hasVariation(50, 60, 50, 60)).toBe(false)
    expect(hasVariation(50, 60, 50.0, 60)).toBe(false)
    expect(hasVariation(50, 60, 70, 60)).toBe(true)
    expect(hasVariation(50, 60, 50, 120)).toBe(true)
  })

  it('il patch tiene il listino e la nota solo se serve', () => {
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 50, minutes: 60, note: '  niente  ' })).toEqual({
      total: null,
      actualDurationMin: 60,
      adjustmentNote: null,
    })
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 70, minutes: 120, note: '  Pieno di nodi  ' })).toEqual({
      total: 70,
      actualDurationMin: 120,
      adjustmentNote: 'Pieno di nodi',
    })
  })

  it('Nessuna modifica e Salva seguono la variazione', () => {
    const same = { quotedPrice: 50, quotedMinutes: 60, priceRaw: '50', hoursRaw: '1', minutesRaw: '0', note: 'x' }
    expect(canSkipClose(same)).toBe(true)
    expect(canSaveClose(same)).toBe(false)
    const changed = { ...same, priceRaw: '70', hoursRaw: '2', note: '   ' }
    expect(canSkipClose(changed)).toBe(false)
    expect(canSaveClose(changed)).toBe(false)
    expect(canSaveClose({ ...changed, note: 'Nodi' })).toBe(true)
    expect(canSkipClose({ ...same, priceRaw: 'no' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/closeVisit.test.ts`
Expected: FAIL, cannot find module `./closeVisit`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/closeVisit.ts` with the functions above. `formatSpent`: ore almeno 1 → `` `${hours} h ${String(rest).padStart(2, '0')}` ``, altrimenti `` `${rest} min` ``. Prezzo: trim, virgola in punto, `/^\d+(\.\d{1,2})?$/`. Durata: ore e minuti `/^\d+$/`, ore 0–24, minuti 0–59, totale 1–1440. `hasVariation` confronta `Math.round(n * 100)`. `closePatch` mette `total: null` se i centesimi coincidono, e `adjustmentNote` solo se `hasVariation` e `note.trim()` non è vuoto. `canSkipClose` è vero solo se entrambi i parse sono ok e non c'è variazione. `canSaveClose` è vero solo se i parse sono ok, c'è variazione e la nota tagliata ha lunghezza 1–280.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/closeVisit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/closeVisit.ts src/lib/closeVisit.test.ts
git commit -m "feat: regole di prezzo, tempo e nota in chiusura"
```

---

### Task 2: Salvare la chiusura senza toccare le righe

**Files:**
- Modify: `src/types/models.ts` (`Appointment`)
- Modify: `src/data/local/appointments.ts`
- Modify: `src/data/local/appointments.test.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/data/firebase/localSeed.ts`
- Modify: `src/hooks/useAppointments.ts`

**Interfaces:**
- Consumes: `closePatch` da Task 1, tipo risultato `{ total: number | null; actualDurationMin: number; adjustmentNote: string | null }`
- Produces:
  - `Appointment.adjustmentNote?: string`
  - `saveClose(uid: string, id: string, patch: { total: number | null; actualDurationMin: number; adjustmentNote: string | null }, complete: boolean): Appointment`
  - `useAppointments(uid).saveClose(id, patch, complete): boolean`

- [ ] **Step 1: Write the failing test**

In `src/data/local/appointments.test.ts` aggiungi un test: crea un appuntamento con una riga prezzo 50 e durata 60. `saveClose` con `{ total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi' }` e `complete: true` lascia `services[0].price === 50`, `status === 'completato'`, `total === 70`, `actualDurationMin === 120`, `adjustmentNote === 'Pieno di nodi'`. Un secondo `saveClose` con `{ total: null, actualDurationMin: 60, adjustmentNote: null }` e `complete: false` toglie `total` e `adjustmentNote` e lascia `completato`. `updateAppointment` con le stesse righe non cancella `adjustmentNote` se il write non lo nomina.

In `src/lib/firebaseMap.test.ts` aggiungi: `appointmentToDoc` di un appuntamento con `adjustmentNote: 'Nodi'` contiene quella stringa; `appointmentFromDoc` la rilegge; una stringa di soli spazi o assente non finisce sul modello.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`
Expected: FAIL perché `saveClose` o `adjustmentNote` non esistono

- [ ] **Step 3: Write minimal implementation**

Aggiungi `adjustmentNote?: string` a `Appointment`. In `appointments.ts` leggilo e scrivilo come `actualDurationMin`: stringa trim non vuota, altrimenti il campo non c'è. `updateAppointment` ricopia `previous.adjustmentNote`.

`saveClose` legge la mappa, se l'id manca lancia `AppError` come le altre. Copia il dominio, non tocca `services` né `start`. Se `patch.total` è un numero lo assegna, se è `null` fa `delete appointment.total`. Assegna `actualDurationMin`. Se `patch.adjustmentNote` è stringa non vuota la assegna, se è `null` fa `delete appointment.adjustmentNote`. Se `complete` è true, `status = 'completato'`. Aggiorna `updatedAt` e scrive una volta sola.

`appointmentToDoc` include `adjustmentNote`. `appointmentFromDoc` la copia solo se è una stringa con trim non vuoto. `appointmentToLocal` in `localSeed.ts` fa lo stesso di `toStored`.

In `useAppointments`, `saveClose` segue il corpo di `complete`: in locale `guard`, in cloud `withLocalKey` + `remember`, e ritorna boolean.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/localSeed.ts src/hooks/useAppointments.ts
git commit -m "feat: salva cifra, minuti e nota senza riscrivere il listino"
```

---

### Task 3: Popup del «+»

**Files:**
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/pages/shellPages.test.tsx`
- Modify: `src/pages/DogsPage.test.tsx` (il test `parte vuota`)

**Interfaces:**
- Consumes: `Dialog` in `src/components/layout/Dialog.tsx`
- Produces: dal «+», dialog **Nuovo** con **Appuntamento** e **Aggiungi Pelosetto**

- [ ] **Step 1: Write the failing test**

In `shellPages.test.tsx` il test del «+» deve cercare **Aggiungi Pelosetto**, non **Animale**. Dopo il click sul fab `Aggiungi`, il dialog ha `aria-label` **Nuovo** e il suo contenitore ha `align-items: center` (non il foglio in basso). **Appuntamento** precede **Aggiungi Pelosetto**. Ogni riga contiene un `svg` e ha `min-height: 44px`. **Appuntamento** porta ancora a **Nuovo appuntamento**. **Aggiungi Pelosetto** porta a **Nuovo cane**.

In `DogsPage.test.tsx`, `parte vuota` non clicca più un **Aggiungi** dell'intestazione. Afferma che l'unico bottone `Aggiungi` è il fab (`.bottom-nav__fab`) e che **Aggiungi il primo cane** c'è ancora.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx -t "parte vuota|«\\+|nuovo cane|nuovo appuntamento"`
Expected: FAIL su **Animale** o sull'Aggiungi dell'intestazione

- [ ] **Step 3: Write minimal implementation**

In `ShellFrame`, togli `Sheet`. Importa `Dialog`, `Calendar`, `PawPrint`, `ChevronRight` da `lucide-react`. Il popup è:

```tsx
<Dialog open={open} title="Nuovo" onClose={() => setOpen(false)}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <button type="button" onClick={newAppointment} style={choice}>
      <span style={iconTile}><Calendar size={20} strokeWidth={2} aria-hidden /></span>
      <span style={{ flex: 1 }}>Appuntamento</span>
      <ChevronRight size={16} aria-hidden />
    </button>
    <button type="button" onClick={newDog} style={choice}>
      <span style={iconTile}><PawPrint size={20} strokeWidth={2} aria-hidden /></span>
      <span style={{ flex: 1 }}>Aggiungi Pelosetto</span>
      <ChevronRight size={16} aria-hidden />
    </button>
  </div>
</Dialog>
```

`choice`: flex, align center, gap 10, width 100%, minHeight 44, border `1px solid var(--line)`, borderRadius 14, background `var(--card)`, color inherit, font inherit, fontWeight 600, textAlign left, padding `10px`. `iconTile`: grid, placeItems center, width 40, height 40, borderRadius 12, background `var(--pri-s)`, color `var(--pri)`, flex none.

`newAppointment` e `newDog` restano quelli di oggi, e chiudono il dialog prima di navigare.

In `DogsPage` togli il `Button` **Aggiungi** dall'azione dell'header. Resta `IconButton` Ordina. Togli l'import di `Plus` e `Button` se non servono più. Il pulsante a lista vuota resta.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx src/components/layout/shell.test.tsx src/components/layout/chrome.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShellFrame.tsx src/pages/DogsPage.tsx src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: il + apre Appuntamento e Aggiungi Pelosetto"
```

---

### Task 4: Popup di chiusura

**Files:**
- Create: `src/components/appointment/CloseVisitDialog.tsx`
- Test: `src/components/appointment/CloseVisitDialog.test.tsx`

**Interfaces:**
- Consumes: `canSaveClose`, `canSkipClose`, `closePatch`, `formatSpent`, `parseCloseDuration`, `parseClosePrice`, `splitDuration`
- Produces: `CloseVisitDialog` con `mode: 'complete' | 'correct'`, campi controllati dal genitore via callback `onNone` e `onSave(patch)`

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CloseVisitDialog } from './CloseVisitDialog'

const base = {
  open: true,
  quotedPrice: 50,
  quotedMinutes: 60,
  initialPrice: 50,
  initialMinutes: 60,
  initialNote: '',
  onClose: vi.fn(),
  onNone: vi.fn(),
  onSave: vi.fn(),
}

describe('CloseVisitDialog', () => {
  it('Nessuna modifica completa senza variazione', async () => {
    const onNone = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onNone={onNone} />)
    expect(screen.getByRole('dialog', { name: 'Completare' })).toHaveTextContent('Previsto € 50 · 1 h 00')
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    expect(onNone).toHaveBeenCalledOnce()
  })

  it('con variazione Salva e completa chiede la nota', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onSave={onSave} />)
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '70')
    await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
    await user.type(screen.getByRole('textbox', { name: 'Ore' }), '2')
    expect(screen.getByRole('button', { name: 'Nessuna modifica' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Nota' }), 'Pieno di nodi')
    await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
    expect(onSave).toHaveBeenCalledWith({ total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi' })
  })

  it('in correzione Salva toglie nota e totale se si torna al previsto', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="correct" initialPrice={70} initialMinutes={120} initialNote="Nodi" onSave={onSave} />)
    expect(screen.getByRole('dialog', { name: 'Correggi' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '50')
    await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
    await user.type(screen.getByRole('textbox', { name: 'Ore' }), '1')
    await user.clear(screen.getByRole('textbox', { name: 'Minuti' }))
    await user.type(screen.getByRole('textbox', { name: 'Minuti' }), '0')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(onSave).toHaveBeenCalledWith({ total: null, actualDurationMin: 60, adjustmentNote: null })
  })

  it('mostra gli errori e la X non salva', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onClose={onClose} onSave={onSave} />)
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), 'no')
    expect(screen.getByText('Importo non valido')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/appointment/CloseVisitDialog.test.tsx`
Expected: FAIL, module assente

- [ ] **Step 3: Write minimal implementation**

`CloseVisitDialog` usa `Dialog`. Stato locale di prezzo, ore, minuti e nota, inizializzato da `initialPrice` (`String`), `splitDuration(initialMinutes)` e `initialNote`. `key` non serve se il genitore smonta il dialog quando `open` è false: se `open` resta true e cambiano gli initial, rimonta con `key={\`${initialPrice}-${initialMinutes}-${initialNote}\`}` sul componente, messo dal genitore. Dentro, leggi i valori solo allo stato iniziale (`useState`).

Titolo `mode === 'complete' ? 'Completare' : 'Correggi'`. Riga previsto: `Previsto ${formatEuro(quotedPrice)} · ${formatSpent(quotedMinutes)}`. Campi: textbox **Prezzo**, **Ore**, **Minuti**, **Nota** (`maxLength={280}`). Messaggi dai parse. In `complete`: **Nessuna modifica** disabilitato se `!canSkipClose`, **Salva e completa** disabilitato se `!canSaveClose`. In `correct`: **Annulla** chiama `onClose`, **Salva** disabilitato se non (`canSkipClose` o `canSaveClose`). Al click, parsa e chiama `onNone` oppure `onSave(closePatch(...))`. Bottoni uno sotto l'altro, **Salva e completa** / **Salva** con `variant="primary"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/appointment/CloseVisitDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/appointment/CloseVisitDialog.tsx src/components/appointment/CloseVisitDialog.test.tsx
git commit -m "feat: popup per chiudere o correggere prezzo, tempo e nota"
```

---

### Task 5: Dettaglio appuntamento

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/completato.test.tsx`
- Modify: `src/pages/AppointmentPage.test.tsx` se un test clicca il totale o **Durata reale**

**Interfaces:**
- Consumes: `CloseVisitDialog`, `saveClose`, `formatSpent`, `sumPrice`, `sumDuration`
- Produces: dal dettaglio, **Completato** apre il popup; dopo, totale testo, tempo letto, **Correggi**

- [ ] **Step 1: Write the failing test**

Aggiorna il test `Completato tiene il prezzo...` in `completato.test.tsx`. Il click su **Completato** apre il dialog **Completare** e lo stato resta `programmato`. **Nessuna modifica** mette `completato`, `actualDurationMin` 30, senza `total` e senza `adjustmentNote`. Non esiste più il textbox **Durata reale**. C'è il testo `30 min` e il bottone **Correggi**. **Fissa il prossimo** resta.

Aggiungi un test: stesso appuntamento (prezzo 99, 30 min). Nel popup scrivi prezzo `70`, ore `2`, minuti `0`, nota `Pieno di nodi`, poi **Salva e completa**. Lo stato è `completato`, `total` 70, `actualDurationMin` 120, `adjustmentNote` `Pieno di nodi`, `services[0].price` 99. Poi **Correggi**, rimetti `99`, `0` ore, `30` minuti, **Salva**: `total` e `adjustmentNote` assenti, stato ancora `completato`.

Aggiungi: la X del dialog **Completare** lascia `programmato`. Un appuntamento di domani ha **Completato** disabilitato e il click non apre **Completare**.

Cerca in `AppointmentPage.test.tsx` e `completato.test.tsx` i textbox **Durata reale** e il totale cliccabile. Sostituisci quelle attese con il popup. Non lasciare un test che pretende di editare il totale toccandolo sul dettaglio programmato.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/AppointmentPage.test.tsx`
Expected: FAIL perché **Completato** chiude subito e **Durata reale** esiste ancora

- [ ] **Step 3: Write minimal implementation**

In `AppointmentPage`, `markDone` non chiama più `complete` da solo. Click **Completato** (solo se `canComplete`) mette uno stato `closing = true`. Il `CloseVisitDialog` `mode="complete"` usa `sumPrice` e `sumDuration` come previsto, e gli stessi come valori iniziali se `total` e `actualDurationMin` mancano.

`onNone`: `saveClose(id, { total: null, actualDurationMin: quotedMinutes, adjustmentNote: null }, true)`. Se false, toast «Salvataggio non riuscito» e il popup resta. Se true, chiudi il popup.

`onSave`: `saveClose(id, patch, true)` con la stessa gestione.

Togli l'edit del totale (`totalEdit`, input, bottone sul numero). Il totale è testo `formatEuro`. Togli `DurationField` e il label **Durata reale**. Se `done`, mostra `Tempo impiegato` con `formatSpent(actualDurationMin ?? sumDuration)` e, se c'è, `adjustmentNote`. Bottone **Correggi** apre lo stesso dialog in `mode="correct"` con i valori salvati. `onSave` lì usa `saveClose(..., false)`. `onClose` chiude senza scrivere.

`commitDuration` non è più raggiungibile: toglilo se non ha altri chiamanti.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/AppointmentPage.test.tsx src/app/firebaseGate.test.tsx`
Expected: PASS. Se `firebaseGate` completa ancora senza il popup perché chiama `complete` dal basso, aggiorna quel test perché anche quel gesto passi dal popup: **Nessuna modifica** deve scrivere `actualDurationMin`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AppointmentPage.tsx src/pages/completato.test.tsx src/pages/AppointmentPage.test.tsx src/app/firebaseGate.test.tsx
git commit -m "feat: il dettaglio chiede prezzo, tempo e nota prima di completare"
```

---

### Task 6: Completato in Home

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `CloseVisitDialog`, `saveClose`, `sumPrice`, `sumDuration`, `canComplete`
- Produces: **Completato** in Oggi apre lo stesso popup e, dopo il successo, la riga è completata senza cambiare pagina

- [ ] **Step 1: Write the failing test**

In `src/pages/HomePage.test.tsx`, nel test `Da chiudere offre Completato, Non venuto e Disdetto solo sui giorni passati`, dopo il click su **Completato Rex** lo stato di `past` resta `programmato` e compare il dialog **Completare**. Poi click su **Nessuna modifica**: `past` diventa `completato`, `future` resta `programmato`, e **Da chiudere** sparisce. Il test di **Non venuto** e **Disdetto** non deve vedere il dialog **Completare**.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL perché **Completato Rex** chiude subito, senza il dialog **Completare**

- [ ] **Step 3: Write minimal implementation**

`closeVisit(..., 'completato')` non chiama `setStatus`. Salva l'id in stato e apri `CloseVisitDialog`. `onNone` / `onSave` chiamano `saveClose` come nel dettaglio. Al successo azzera lo stato. **Non venuto** e **Disdici** restano su `setStatus`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/shellPages.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: Completato in Home passa dal popup di chiusura"
```

---

### Task 7: Storico

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx` (storico e freccia, intorno alle righe 1340 e 1380)

**Interfaces:**
- Consumes: `CloseVisitDialog`, `saveClose`, `visitPrice` (già locale in `DogPage`), `priceChange`
- Produces: storico con cifra incassata, nota su riga propria, matita che apre **Correggi**, domanda scheda solo da lì

- [ ] **Step 1: Write the failing test**

Nel test dello storico che già apre una visita: se `adjustmentNote` è `Pieno di nodi` e `total` è 70, la riga mostra `€ 70` e il testo `Pieno di nodi` su un elemento proprio, non dentro la stringa degli strumenti. La freccia confronta le cifre incassate: una visita `total` 70 dopo una visita somma 40 mostra **Prezzo più alto del precedente**.

La matita `Correggi prezzo ...` apre il dialog **Correggi**, non il foglio **Prezzo**. **Salva** con una cifra nuova e la nota scrive `total` e `adjustmentNote` e non cambia `services[0].price`. Se il servizio è uno solo e la cifra è diversa da `dog.servicePrices`, dopo **Salva** compaiono **Solo questo appuntamento** e **Aggiorna anche il prezzo in scheda**. **Aggiorna anche il prezzo in scheda** copia la cifra incassata sul prezzo del cane. Dal dettaglio appuntamento questa domanda non c'è: coprilo con un assert nel test del Task 5 se manca, senza rifare quel flusso qui se il test del dettaglio già non la mostra.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "storico|Prezzo più alto|Correggi prezzo"`
Expected: FAIL sulla nota o sul dialog **Correggi**

- [ ] **Step 3: Write minimal implementation**

`historyDetail` usa `visitPrice`. Sotto quella riga, se `item.adjustmentNote`, un div con la frase. `priceChange(visitPrice(item), before ? visitPrice(before) : null)`.

La matita non apre più il foglio con l'input **Prezzo appuntamento**. Apre `CloseVisitDialog` `mode="correct"`. `onSave` chiama `saveClose(id, patch, false)`. Se riesce e `services.length === 1` e la cifra incassata (patch.total ?? sumPrice) è diversa dal `servicePrices` del cane per quel `serviceId`, tieni il foglio con **Solo questo appuntamento** e **Aggiorna anche il prezzo in scheda**, che chiama `copyHistoryPrice` con la cifra incassata. Altrimenti chiudi.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/completato.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: lo storico mostra la variazione e la corregge dallo stesso popup"
```

---

### Task 8: Verifica finale dei due flussi

**Files:**
- Modify: solo se un test esistente è rimasto rosso

**Interfaces:**
- Consumes: tutto quanto sopra
- Produces: suite verde sui file toccati

- [ ] **Step 1: Gli incassi non mostrano la nota**

In `src/pages/EarningsPage.test.tsx` aggiungi un caso: un appuntamento completato nel periodo, con `total` 70 e `adjustmentNote` `Pieno di nodi`. La pagina incassi mostra la cifra e non il testo `Pieno di nodi`. Se per completarlo devi passare dal popup, usa `saveClose` o scrivi i campi nello storage prima del render, senza cliccare la UI.

- [ ] **Step 2: Run the touched suites**

Run: `npx vitest run src/lib/closeVisit.test.ts src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts src/components/appointment/CloseVisitDialog.test.tsx src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx src/pages/completato.test.tsx src/pages/AppointmentPage.test.tsx src/pages/HomePage.test.tsx src/pages/EarningsPage.test.tsx src/app/firebaseGate.test.tsx`

Expected: PASS

- [ ] **Step 3: Commit solo se hai dovuto aggiustare un test**

Se non hai cambiato file, non fare un commit vuoto.
