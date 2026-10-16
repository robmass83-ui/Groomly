# Chiusura senza salvare, nota, pagamento e «Fissa il prossimo» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il «Chiudere senza salvare?» è un popup centrale; si completa e si corregge cambiando solo il tempo senza nota; il popup chiede POS, Contanti o N/A; Incassi mostra i due totali; «Fissa il prossimo» apre il modulo nuovo con data e ora vuote.

**Architecture:** Le regole di nota e pagamento stanno in `src/lib/closeVisit.ts` e il popup in `CloseVisitDialog`. `paymentMethod` viaggia sull'`Appointment` come `adjustmentNote` (locale, `firebaseMap`, `localSeed`, `saveClose`). I totali POS/Contanti li calcola `summarize` in `earnings.ts` e `EarningsPage` li disegna. «Fissa il prossimo» naviga a `/appuntamenti/nuovo?da=prossimo` invece di creare l'appuntamento.

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library (happy-dom sui file di pagina), nessun pacchetto nuovo.

**Spec:** `docs/superpowers/specs/2026-10-16-chiusura-pagamento-prossimo-design.md`

## Global Constraints

- Lingua UI: italiano. Stile del codice come i file intorno. Niente commenti superflui.
- `PaymentMethod = 'pos' | 'contanti' | 'na'`. Testo errore, alla lettera: `Con N/A il prezzo deve essere 0`.
- La nota è obbligatoria solo se i centesimi del prezzo differiscono dal previsto **e** il metodo è `pos` o `contanti`. Solo tempo: niente nota. `na` solo con prezzo 0, senza nota.
- Una nota non vuota (dopo `trim`, max 280) si salva sempre, anche se non era obbligatoria. Vuota o soli spazi: assente.
- Icone: `src/assets/icons/svg/icona-pos-chiaro.svg`, `icona-pos-scuro.svg`, `icona-contanti-chiaro.svg`, `icona-contanti-scuro.svg`, copiate da `Icon and logo/icone2/`. Tema da `useDocumentTheme()` (`src/theme/useDocumentTheme.ts`): `dark` → scuro, altrimenti chiaro.
- Tre riquadri in griglia a 3 colonne, gap 8, alti almeno 44 px, icona 46 px, `aria-pressed`, nomi accessibili `POS`, `Contanti`, `N/A`. Scelto: bordo 2 px `var(--pri)`, sfondo `var(--pri-s)`, spunta. Gli altri, quando uno è scelto, opacità 0.45. Nessun colore scritto a mano.
- In Incassi i riquadri stanno tra la `Card` del grafico e la griglia dei tre KPI. «Non indicato € …» e «Offerti (N/A) N» solo se il conteggio è > 0, separati da ` · `. Occhio chiuso: cifre `•••` via `maskEuro`, i conteggi restano.
- `da=prossimo` svuota data e ora. Senza quel parametro il modulo nuovo resta com'è oggi.
- Non si usa `window.confirm`. Salvataggio fallito: toast `Salvataggio non riuscito`, tono `plain`.
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto. Shell: PowerShell, cartella `d:\Groomly`.
- `git add` con percorsi espliciti. Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`, né i file non tracciati estranei.
- Ramo di lavoro: quello corrente (`feat/listino-razze`). I task fanno solo commit. La pubblicazione (versione, APK, release, deploy) la fa il coordinatore a piano finito, non un task.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/types/models.ts` | `PaymentMethod`, campo su `Appointment` |
| `src/data/local/appointments.ts` | leggere/scrivere il campo, `saveClose` |
| `src/lib/firebaseMap.ts` | andata e ritorno cloud |
| `src/data/firebase/localSeed.ts` | copia locale usata dal cloud |
| `src/hooks/useAppointments.ts` | tipo del patch di `saveClose` |
| `src/lib/closeVisit.ts` | quando i bottoni si accendono e cosa si scrive |
| `src/components/appointment/CloseVisitDialog.tsx` | campi, tre riquadri, errore N/A |
| `src/pages/AppointmentPage.tsx` | popup chiusura centrale, passaggio del patch, «Fissa il prossimo» |
| `src/pages/HomePage.tsx`, `src/pages/DogPage.tsx` | stesso patch, stesso metodo iniziale |
| `src/lib/earnings.ts`, `src/pages/EarningsPage.tsx` | totali e riquadri |

---

### Task 1: Il campo `paymentMethod` si salva

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/appointments.ts`
- Modify: `src/data/local/appointments.test.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/data/firebase/localSeed.ts`
- Modify: `src/hooks/useAppointments.ts`
- Test: `src/data/local/appointments.test.ts`, `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: niente dai task precedenti.
- Produces: `export type PaymentMethod = 'pos' | 'contanti' | 'na'` da `src/types/models.ts`. `Appointment.paymentMethod?: PaymentMethod`. `saveClose(uid, id, patch, complete)` con `patch.paymentMethod?: PaymentMethod | null`: un valore dei tre si scrive, `null` o assente cancella il campo. `appointmentToDoc` / `appointmentFromDoc` e `appointmentToLocal` includono il campo. Un valore diverso dai tre si legge come assente.

- [ ] **Step 1: Write the failing test**

In `src/data/local/appointments.test.ts`, accanto al test `saveClose scrive cifra, minuti e nota`, aggiungi:

```ts
it('saveClose scrive il metodo e null lo toglie, un valore estraneo non si legge', () => {
  const created = createAppointment('uid-1', { dogId: 'd1', start: new Date(2026, 9, 3, 9, 0, 0, 0), services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 50 }] })
  const paid = saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'pos' }, true)
  expect(paid.paymentMethod).toBe('pos')
  expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].paymentMethod).toBe('pos')
  const cash = saveClose('uid-1', created.id, { total: 70, actualDurationMin: 90, adjustmentNote: 'Nodi', paymentMethod: 'contanti' }, false)
  expect(cash.paymentMethod).toBe('contanti')
  expect(cash.status).toBe('completato')
  const cleared = saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: null }, false)
  expect(cleared.paymentMethod).toBeUndefined()
  const map = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, { paymentMethod?: string }>
  map[created.id].paymentMethod = 'bonifico'
  localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify(map))
  expect(listAppointments('uid-1')[0].paymentMethod).toBeUndefined()
})
```

In `src/lib/firebaseMap.test.ts`, accanto al test di `adjustmentNote`:

```ts
it('paymentMethod va e torna, un valore estraneo o assente non entra', () => {
  const doc = appointmentToDoc(appointment({ paymentMethod: 'na' }))
  expect(doc.paymentMethod).toBe('na')
  expect(appointmentFromDoc('a1', doc).paymentMethod).toBe('na')
  expect(appointmentFromDoc('a1', { ...doc, paymentMethod: 'bonifico' }).paymentMethod).toBeUndefined()
  expect(appointmentToDoc(appointment()).paymentMethod).toBeUndefined()
})
```

`appointment()` nel test accetta già un partial: aggiungi `paymentMethod` al tipo dell'helper se è un `Partial<Appointment>` (lo è).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`
Expected: FAIL, `paymentMethod` assente dal tipo o dal risultato.

- [ ] **Step 3: Write minimal implementation**

In `src/types/models.ts`, prima di `Appointment`:

```ts
export type PaymentMethod = 'pos' | 'contanti' | 'na'
```

Su `Appointment`, dopo `adjustmentNote?`:

```ts
paymentMethod?: PaymentMethod
```

In `src/data/local/appointments.ts`:
- importa `PaymentMethod`;
- su `StoredAppointment` aggiungi `paymentMethod?: string`;
- `function readPayment(value: unknown): PaymentMethod | undefined` restituisce il valore solo se è `'pos'`, `'contanti'` o `'na'`;
- `assignAppointmentDetails` e `toDomain` / `toStored` leggono e scrivono il campo come fanno con `adjustmentNote` (presente solo se valido);
- `saveClose` patch diventa `{ total: number | null; actualDurationMin: number; adjustmentNote: string | null; paymentMethod?: PaymentMethod | null }`. Se `patch.paymentMethod` è uno dei tre, assegnalo; se la chiave c'è ed è `null`, `delete appointment.paymentMethod`. Se la chiave manca, non toccare il campo già salvato.

In `src/hooks/useAppointments.ts` allarga lo stesso tipo del patch di `saveClose` (riga ~175). Il resto della funzione non cambia.

In `src/lib/firebaseMap.ts`, in `appointmentToDoc` aggiungi `paymentMethod: appointment.paymentMethod`. In `appointmentFromDoc`, dopo la nota:

```ts
if (data.paymentMethod === 'pos' || data.paymentMethod === 'contanti' || data.paymentMethod === 'na') appointment.paymentMethod = data.paymentMethod
```

In `src/data/firebase/localSeed.ts`, in `appointmentToLocal`, dopo la nota:

```ts
if (appointment.paymentMethod) stored.paymentMethod = appointment.paymentMethod
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/localSeed.ts src/hooks/useAppointments.ts
git commit -m "feat: salva il metodo di pagamento sull'appuntamento"
```

---

### Task 2: Regole di nota e N/A

**Files:**
- Modify: `src/lib/closeVisit.ts`
- Modify: `src/lib/closeVisit.test.ts`
- Test: `src/lib/closeVisit.test.ts`

**Interfaces:**
- Consumes: `PaymentMethod` da `src/types/models.ts`.
- Produces, da `src/lib/closeVisit.ts`:

```ts
export const NA_PRICE_MESSAGE = 'Con N/A il prezzo deve essere 0'
export type ClosePatch = { total: number | null; actualDurationMin: number; adjustmentNote: string | null; paymentMethod: PaymentMethod }
export function closePatch(input: { quotedPrice: number; quotedMinutes: number; price: number; minutes: number; note: string; paymentMethod: PaymentMethod }): ClosePatch
export function canSkipClose(input: { quotedPrice: number; quotedMinutes: number; priceRaw: string; hoursRaw: string; minutesRaw: string; payment: PaymentMethod | null }): boolean
export function canSaveClose(input: { quotedPrice: number; quotedMinutes: number; priceRaw: string; hoursRaw: string; minutesRaw: string; note: string; payment: PaymentMethod | null; allowSame: boolean }): boolean
export function naBlocks(input: { priceRaw: string; payment: PaymentMethod | null }): boolean
```

`naBlocks` è true solo se `payment === 'na'` e il prezzo è un importo valido diverso da 0. Prezzo non valido → false (vale «Importo non valido»).

`canSkipClose`: campi validi, pagamento scelto, nessuna variazione, e non `naBlocks`. Con nessuna variazione e `na`, il previsto è già 0.

`canSaveClose`: campi validi, pagamento scelto, non `naBlocks`, e la nota c'è (1–280 dopo trim) se i centesimi del prezzo differiscono e il metodo non è `na`. Se `allowSame` è false serve una variazione (prezzo o tempo). Se `allowSame` è true va bene anche senza variazione. `na` con prezzo 0 è una variazione quando il previsto non è 0, e non chiede la nota.

`closePatch`: `total` null se i centesimi coincidono, altrimenti il prezzo (con `na` e previsto > 0 è `0`). `adjustmentNote` è la nota tagliata se non vuota, anche senza variazione; altrimenti null. `paymentMethod` è quello passato.

- [ ] **Step 1: Write the failing test**

Sostituisci in `closeVisit.test.ts` il test del patch e quello di Nessuna modifica/Salva con questi, e aggiungi gli altri. Aggiorna l'import con `NA_PRICE_MESSAGE` e `naBlocks`.

```ts
it('il patch tiene il listino, salva la nota anche senza variazione e porta il metodo', () => {
  expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 50, minutes: 60, note: '  niente  ', paymentMethod: 'pos' })).toEqual({
    total: null, actualDurationMin: 60, adjustmentNote: 'niente', paymentMethod: 'pos',
  })
  expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 70, minutes: 120, note: '  Pieno di nodi  ', paymentMethod: 'contanti' })).toEqual({
    total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi', paymentMethod: 'contanti',
  })
  expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 0, minutes: 60, note: '   ', paymentMethod: 'na' })).toEqual({
    total: 0, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'na',
  })
})

it('solo il tempo si salva senza nota, il prezzo no, N/A a zero sì', () => {
  const same = { quotedPrice: 50, quotedMinutes: 60, priceRaw: '50', hoursRaw: '1', minutesRaw: '0', note: '', payment: 'pos' as const }
  expect(canSkipClose(same)).toBe(true)
  expect(canSaveClose({ ...same, allowSame: false })).toBe(false)
  expect(canSaveClose({ ...same, allowSame: true })).toBe(true)
  expect(canSkipClose({ ...same, payment: null })).toBe(false)
  const timeOnly = { ...same, hoursRaw: '2' }
  expect(canSkipClose(timeOnly)).toBe(false)
  expect(canSaveClose({ ...timeOnly, allowSame: false })).toBe(true)
  const price = { ...same, priceRaw: '70', payment: 'contanti' as const }
  expect(canSaveClose({ ...price, allowSame: false })).toBe(false)
  expect(canSaveClose({ ...price, note: 'Nodi', allowSame: false })).toBe(true)
  const offered = { ...same, priceRaw: '0', payment: 'na' as const }
  expect(naBlocks(offered)).toBe(false)
  expect(canSaveClose({ ...offered, allowSame: false })).toBe(true)
  expect(naBlocks({ priceRaw: '38', payment: 'na' })).toBe(true)
  expect(canSaveClose({ ...same, priceRaw: '38', payment: 'na', allowSame: false })).toBe(false)
  expect(canSkipClose({ ...same, priceRaw: '38', payment: 'na' })).toBe(false)
  expect(NA_PRICE_MESSAGE).toBe('Con N/A il prezzo deve essere 0')
  expect(canSkipClose({ quotedPrice: 0, quotedMinutes: 60, priceRaw: '0', hoursRaw: '1', minutesRaw: '0', payment: 'na' })).toBe(true)
})
```

Il vecchio test «Nessuna modifica e Salva seguono la variazione» va rimosso: è sostituito da questo.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/closeVisit.test.ts`
Expected: FAIL, funzioni o argomenti assenti.

- [ ] **Step 3: Write minimal implementation**

Riscrivi `canSkipClose`, `canSaveClose`, `closePatch` in `src/lib/closeVisit.ts` secondo le firme di **Interfaces**. Tieni `hasVariation`, `parseClosePrice`, `parseCloseDuration`, `splitDuration`, `formatSpent`, `NOTE_MAX`.

`readClose` restituisce `{ varied, priceChanged, price, minutes } | null`. `priceChanged` confronta i centesimi. `noteRequired(priceChanged, payment)` è true se `priceChanged && payment !== 'na'`. `noteOk(note, required)` è true se non è required, oppure se il trim ha lunghezza 1–280.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/closeVisit.test.ts`
Expected: PASS. `npm test` può fallire finché il Task 3 non aggiorna il dialogo: è previsto, perché `CloseVisitDialog` chiama ancora la firma vecchia. Non allargare questo task al dialogo.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/closeVisit.ts src/lib/closeVisit.test.ts
git commit -m "feat: la nota serve solo se cambia il prezzo, N/A solo a zero"
```

---

### Task 3: I tre riquadri nel popup

**Files:**
- Create: `src/assets/icons/svg/icona-pos-chiaro.svg`, `icona-pos-scuro.svg`, `icona-contanti-chiaro.svg`, `icona-contanti-scuro.svg` (copia byte per byte da `Icon and logo/icone2/`)
- Modify: `src/components/appointment/CloseVisitDialog.tsx`
- Modify: `src/components/appointment/CloseVisitDialog.test.tsx`
- Modify: `src/pages/AppointmentPage.tsx` (solo il tipo `ClosePatch`, le chiamate `onNone`/`onSave` e `initialPayment`)
- Modify: `src/pages/HomePage.tsx` (stesso)
- Modify: `src/pages/DogPage.tsx` (stesso)
- Modify: i test che premono «Nessuna modifica» o «Salva e completa»: `src/pages/completato.test.tsx`, `src/pages/HomePage.test.tsx`, `src/app/firebaseGate.test.tsx`, `src/pages/DogsPage.test.tsx` se aprono il dialogo
- Test: `src/components/appointment/CloseVisitDialog.test.tsx`

**Interfaces:**
- Consumes: `ClosePatch`, `canSkipClose`, `canSaveClose`, `closePatch`, `naBlocks`, `NA_PRICE_MESSAGE` dal Task 2. `PaymentMethod` dal Task 1. `useDocumentTheme`.
- Produces: `CloseVisitDialog` accetta `initialPayment: PaymentMethod | null`. `onNone(patch: ClosePatch)` e `onSave(patch: ClosePatch)`. I genitori passano il patch a `saveClose` così com'è, con `complete: true` per entrambi i bottoni di **Completare** e `complete: false` per **Salva** di **Correggi**.

- [ ] **Step 1: Write the failing test**

In `CloseVisitDialog.test.tsx` aggiungi `initialPayment: null` a `base`. Aggiorna i test esistenti: prima di «Nessuna modifica» clicca `POS`; prima di «Salva e completa» con prezzo 70 clicca `Contanti` e poi la nota; nel test di correzione passa `initialPayment="pos"`. Aggiungi:

```tsx
it('solo le ore accendono Salva e completa senza nota', async () => {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<CloseVisitDialog {...base} mode="complete" onSave={onSave} />)
  await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
  await user.type(screen.getByRole('textbox', { name: 'Ore' }), '2')
  expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'POS' }))
  await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
  expect(onSave).toHaveBeenCalledWith({ total: null, actualDurationMin: 120, adjustmentNote: null, paymentMethod: 'pos' })
})

it('N/A con prezzo diverso da zero spiega l\'errore e non salva', async () => {
  const user = userEvent.setup()
  render(<CloseVisitDialog {...base} mode="complete" />)
  await user.click(screen.getByRole('button', { name: 'N/A' }))
  expect(screen.getByText('Con N/A il prezzo deve essere 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
  await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
  await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '0')
  expect(screen.queryByText('Con N/A il prezzo deve essere 0')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
})

it('in correzione parte dal metodo salvato', () => {
  render(<CloseVisitDialog {...base} mode="correct" initialPayment="contanti" initialPrice={50} initialMinutes={60} />)
  expect(screen.getByRole('button', { name: 'Contanti' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'POS' })).toHaveAttribute('aria-pressed', 'false')
})
```

Il test «N/A con prezzo…» deve anche aspettarsi `onSave` con `paymentMethod: 'na'` e `total: 0`: passa `onSave` e fai l'assert dopo il click.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/appointment/CloseVisitDialog.test.tsx`
Expected: FAIL, bottone `POS` assente.

- [ ] **Step 3: Write minimal implementation**

Copia i quattro svg. In `CloseVisitDialog.tsx`:

- prop `initialPayment: PaymentMethod | null`;
- stato `payment` inizializzato con `initialPayment`;
- `canSkipClose` / `canSaveClose` con `payment` e `allowSame: mode === 'correct'`;
- `naBlocks({ priceRaw: price, payment })` mostra `NA_PRICE_MESSAGE` sotto il prezzo, con lo stesso bordo rosso di «Importo non valido». Se il prezzo non è valido, mostra solo «Importo non valido»;
- griglia di tre bottoni fra i minuti e la nota. Icone importate come url (`import posLight from '...'`) e scelte con `useDocumentTheme() === 'dark'`. Il riquadro N/A non ha svg: testo «N/A» su `var(--surf)`. `aria-pressed={payment === 'pos'}` ecc. Spunta: un `span` con `✓` assoluto in alto a destra solo se premuto. Opacità 0.45 sugli altri solo se `payment !== null`;
- `onNone` e `onSave` ricevono `closePatch({...})`. «Nessuna modifica» chiama `onNone`. «Salva e completa» e «Salva» chiamano `onSave`.

In `AppointmentPage.tsx`, `HomePage.tsx`, `DogPage.tsx` sostituisci il tipo locale `ClosePatch` con quello esportato da `closeVisit`. Passa `initialPayment={appointment.paymentMethod ?? null}` (in Home è `closingVisit`). `onNone` diventa `(patch) => commit...(patch, true)` e non costruisce più il patch a mano. `onSave` passa il patch ricevuto. `saveClose` riceve `patch.paymentMethod`.

Nei test di pagina che cliccano «Nessuna modifica» senza aver cambiato il prezzo, prima clicca il bottone `POS`. In quelli che cambiano il prezzo e scrivono la nota, clicca `POS` prima di «Salva e completa». Non cambiare le asserzioni sul resto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/appointment/CloseVisitDialog.test.tsx src/pages/completato.test.tsx src/pages/HomePage.test.tsx src/app/firebaseGate.test.tsx src/pages/DogsPage.test.tsx src/lib/closeVisit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/assets/icons/svg/icona-pos-chiaro.svg src/assets/icons/svg/icona-pos-scuro.svg src/assets/icons/svg/icona-contanti-chiaro.svg src/assets/icons/svg/icona-contanti-scuro.svg src/components/appointment/CloseVisitDialog.tsx src/components/appointment/CloseVisitDialog.test.tsx src/pages/AppointmentPage.tsx src/pages/HomePage.tsx src/pages/DogPage.tsx src/pages/completato.test.tsx src/pages/HomePage.test.tsx src/app/firebaseGate.test.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: scegli POS, contanti o N/A prima di completare"
```

---

### Task 4: «Chiudere senza salvare?» al centro

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (`CloseConfirm`, `AppointmentSheet`, dove si monta `confirmBox`)
- Test: `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `Dialog` da `src/components/layout/Dialog.tsx`.
- Produces: con modifiche non salvate, Indietro apre un `dialog` con nome accessibile «Chiudere senza salvare?», fuori dallo scroll della scheda. **Resta**, la X, Esc e lo sfondo chiudono solo la domanda. **Chiudi senza salvare** esce. Senza modifiche si esce subito. La prop `confirm` di `AppointmentSheet` si toglie.

- [ ] **Step 1: Write the failing test**

In `AppointmentPage.test.tsx`, nel test che già produce «Chiudere senza salvare?» su un nuovo appuntamento sporco, aggiungi dopo la comparsa del testo:

```tsx
const ask = screen.getByRole('dialog', { name: 'Chiudere senza salvare?' })
expect(ask).toBeInTheDocument()
expect(ask.compareDocumentPosition(screen.getByRole('dialog', { name: 'Nuovo appuntamento' })) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBe(0)
```

Così si verifica che la domanda non è dentro la scheda. Se un test cerca il testo dentro la scheda, aggiornalo: il testo sta nel dialogo centrale.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx`
Expected: FAIL, il dialogo con quel nome non esiste (oggi è un `alertdialog` dentro la scheda).

- [ ] **Step 3: Write minimal implementation**

`CloseConfirm` diventa:

```tsx
function CloseConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <Dialog open title="Chiudere senza salvare?" onClose={onStay}>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="button" onClick={onStay} style={{ flex: 1 }}>Resta</Button>
        <Button type="button" variant="secondary" onClick={onLeave} style={{ flex: 1 }}>Chiudi senza salvare</Button>
      </div>
    </Dialog>
  )
}
```

Togli `confirm` da `AppointmentSheet` e le chiamate. Monta `{confirmBox}` come fratello della scheda dentro `withRhythm`, accanto al dialogo «Cane Mensile», così copre sia il nuovo appuntamento sia la modifica. `requestClose` resta: se la domanda è già aperta, Indietro la chiude (`showConfirm(false)`), che è **Resta**.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/pages/appointments.test.tsx src/pages/monthly.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/AppointmentPage.test.tsx
git commit -m "fix: chiudere senza salvare è un popup centrale"
```

Se gli altri due file di test sono stati toccati, aggiungili al `git add`.

---

### Task 5: POS e Contanti in Incassi

**Files:**
- Modify: `src/lib/earnings.ts`
- Modify: `src/lib/earnings.test.ts`
- Modify: `src/pages/EarningsPage.tsx`
- Modify: `src/pages/EarningsPage.test.tsx`
- Test: `src/lib/earnings.test.ts`, `src/pages/EarningsPage.test.tsx`

**Interfaces:**
- Consumes: `Appointment.paymentMethod` dal Task 1. `appointmentAmount` e `classify` già in `earnings.ts`.
- Produces: `EarningsSummary.pagamenti`:

```ts
pagamenti: {
  pos: { importo: number; count: number }
  contanti: { importo: number; count: number }
  nonIndicato: { importo: number; count: number }
  offerti: number
}
```

Contano solo i `completato` del periodo (`classify === 'incassato'`). Importo = `appointmentAmount`. `offerti` è il conteggio dei `'na'` (importo 0, non entra negli altri). `nonIndicato` = senza metodo. `pos.importo + contanti.importo + nonIndicato.importo === totali.incassato`.

- [ ] **Step 1: Write the failing test**

In `earnings.test.ts`, un test con quattro completati nello stesso giorno: 40 `pos`, 25 `contanti`, 15 senza metodo, 0 `na` (`total: 0`). Atteso: `pos { importo: 40, count: 1 }`, `contanti { importo: 25, count: 1 }`, `nonIndicato { importo: 15, count: 1 }`, `offerti: 1`, e la somma degli importi uguale a `totali.incassato`. Un programmato non entra. Usa gli helper di appuntamento già presenti nel file.

In `EarningsPage.test.tsx`, con quegli stessi dati aperti su `/incassi?periodo=giorno&data=...`:

```tsx
expect(screen.getByText('POS')).toBeInTheDocument()
expect(screen.getByText('Contanti')).toBeInTheDocument()
expect(screen.getByText('€ 40')).toBeInTheDocument()
expect(screen.getByText('€ 25')).toBeInTheDocument()
expect(screen.getByText('1 cane')).toBeInTheDocument()
expect(screen.getByText(/Non indicato/)).toHaveTextContent('Non indicato € 15')
expect(screen.getByText(/Offerti \(N\/A\)/)).toHaveTextContent('Offerti (N/A) 1')
```

Adatta i matcher se `formatEuro` scrive `€ 40` con spazio diverso: leggi `formatEuro` e usa la stringa vera. Poi attiva l'occhio e verifica che le cifre dei due riquadri diventano `•••` e «1 cane» resta.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earnings.test.ts src/pages/EarningsPage.test.tsx`
Expected: FAIL, `pagamenti` assente.

- [ ] **Step 3: Write minimal implementation**

In `summarize`, calcola `pagamenti` dai `done` e mettilo nel ritorno. Aggiorna ogni oggetto letterale di `EarningsSummary` nei test esistenti con `pagamenti` a zero se il test costruisce il summary a mano; se i test chiamano solo `summarize`, non serve.

In `EarningsPage.tsx`, fra la `Card` del grafico e la `div` dei tre KPI:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
  <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
    <img alt="" src={theme === 'dark' ? posDark : posLight} width={36} height={36} />
    <div>
      <div style={kpiLabel}>POS</div>
      <div style={kpiValue}>{maskEuro(summary.pagamenti.pos.importo, hidden)}</div>
      <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(summary.pagamenti.pos.count, 'cane', 'cani')}</div>
    </div>
  </Card>
  {/* Contanti, stessa forma */}
</div>
{summary.pagamenti.nonIndicato.count > 0 || summary.pagamenti.offerti > 0 ? (
  <p style={{ margin: 0, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
    {[
      summary.pagamenti.nonIndicato.count > 0 ? `Non indicato ${maskEuro(summary.pagamenti.nonIndicato.importo, hidden)}` : '',
      summary.pagamenti.offerti > 0 ? `Offerti (N/A) ${summary.pagamenti.offerti}` : '',
    ].filter(Boolean).join(' · ')}
  </p>
) : null}
```

`theme` da `useDocumentTheme()`. `plural` è già nel file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earnings.test.ts src/pages/EarningsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts src/pages/EarningsPage.tsx src/pages/EarningsPage.test.tsx
git commit -m "feat: incassi divisi fra POS e contanti"
```

---

### Task 6: «Fissa il prossimo» apre il modulo

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (`bookNext` circa riga 817, valori iniziali circa riga 988)
- Modify: `src/pages/completato.test.tsx`
- Test: `src/pages/completato.test.tsx`

**Interfaces:**
- Consumes: `activeServiceIds`, `acceptedDay`, `acceptedTime` già in `AppointmentPage.tsx`. La rotta `/appuntamenti/nuovo` esiste.
- Produces: dal dettaglio completato, **Fissa il prossimo** fa `navigate('/appuntamenti/nuovo?da=prossimo&cane=' + dogId + '&servizi=' + ids + (seriesId ? '&serie=' + seriesId : ''))`. Se c'è già un programmato futuro, prima la domanda di oggi; **Crea** naviga, **Non creare** no. Con `da=prossimo` il form ha quel cane, quei servizi attivi, `day: ''` e `time: ''`. Al salvataggio, `serie` non vuota diventa `write.seriesId` prima del `save` esistente. Nessun toast «Fissato per».

- [ ] **Step 1: Write the failing test**

Riscrivi in `completato.test.tsx` i test che oggi aspettano «Fissato per …». Il nuovo comportamento:

```tsx
it('Fissa il prossimo apre il modulo con cane e servizi e senza data', async () => {
  // cane mensile, appuntamento completato con servizio bagno, come il test attuale della frequenza
  await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
  expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
  expect(screen.queryByRole('status')).toBeNull()
  expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(1)
})
```

Tieni la lunghezza 1 (solo quello completato). Aggiungi: con un futuro già presente, il click mostra «Crearne un altro?» e non cambia pagina finché non si preme **Crea**; **Non creare** lascia un solo programmato futuro. Aggiungi: un completato con `seriesId: 'serie-1'` porta, dopo **Fissa il prossimo**, l'indirizzo a contenere `serie=serie-1` (`screen` non legge l'URL: usa `expect(window.location` no, l'app di test è memory router). Leggi l'href non c'è. Asserisci dopo il salvataggio del modulo che il nuovo appuntamento ha `seriesId === 'serie-1'`. Per salvarlo il test compila la data con il controllo già usato dagli altri test del modulo (cerca in `appointments.test.tsx` come impostano il giorno) e preme **Salva**.

Il test «Fissa il prossimo di un ritmo scrive il 26 febbraio senza chiedere» diventa: il click apre **Nuovo appuntamento** e non scrive il 26 febbraio da solo. La domanda «Cane Mensile» non esce prima della scelta della data.

Per il test del `seriesId`, dopo l'apertura del modulo:

```tsx
fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-11-02' } })
await user.click(screen.getByRole('button', { name: '09:30' }))
await user.click(screen.getByRole('button', { name: 'Salva' }))
```

Poi il nuovo programmato in localStorage ha `seriesId === 'serie-1'`. `fireEvent` è già importato nei test del modulo (`appointments.test.tsx`); aggiungilo all'import di `completato.test.tsx` se manca.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/completato.test.tsx`
Expected: FAIL, compare ancora «Fissato per».

- [ ] **Step 3: Write minimal implementation**

Sostituisci il corpo di `bookNext` (quello che chiama `saveNew`) con la navigazione descritta. `onBookNext` nel read view chiama questa funzione dopo la conferma del futuro, com'è oggi (`asking === 'prossimo'` poi `onBookNext`). Non creare l'appuntamento lì.

Nel ramo senza `id` (nuovo appuntamento):

```tsx
const fromNext = searchParams.get('da') === 'prossimo'
const serie = searchParams.get('serie')
```

`day` iniziale: `fromNext ? '' : (day ?? localDayKey(now))`. `time` iniziale: `fromNext ? '' : (quotedTime || ...)`.

In `save`, prima di `rhythmChoice` / `saveNew`:

```tsx
if (!write.seriesId && serie) write = { ...write, seriesId: serie }
```

`serie` è nello scope del componente. Un `serie` vuoto o assente non si copia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/AppointmentPage.test.tsx src/pages/monthly.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/completato.test.tsx
git commit -m "feat: fissa il prossimo apre il modulo con la data vuota"
```

---

### Task 7: Verifica dell'insieme

**Files:** nessuno di nuovo, salvo correzioni emerse dai test.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS. Se fallisce, sistema solo ciò che questo piano ha rotto e rifai il commit di correzione sul task interessato, con messaggio `fix: ...`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS (`tsc --noEmit` incluso).

Non alzare la versione e non pubblicare: lo fa il coordinatore dopo il review finale.
