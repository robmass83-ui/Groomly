# Note sull’appuntamento Implementation Plan

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Eseguito — vedi registro.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le note libere si scrivono sulla visita di un cane, si leggono aprendo quella visita, e in calendario `altro` compare solo se quella visita ha almeno una nota.

**Architecture:** `extraNotes` si sposta sul documento dell’appuntamento, con le stesse regole di pulizia già in `src/lib/dogNotes.ts`. Il modulo di prenotazione e l’appuntamento aperto condividono un elenco. Il calendario legge le note della visita, non più quelle del cane. Le note vecchie sul cane restano memorizzate e non si mostrano.

**Tech Stack:** React, TypeScript, Vitest, happy-dom, Firestore tramite `firebaseMap`, archivio locale `localStorage`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-23-note-appuntamento-design.md`. In caso di conflitto vince la spec.
- Il campo si chiama `extraNotes`. La riga resta `DogExtraNote`: `id`, `text`, `createdAt`.
- Testo vuoto o oltre 240 caratteri non si salva. Massimo 40 righe. In lettura una riga di soli spazi sparisce.
- `undefined` in un aggiornamento tiene le note già salvate. Un elenco, anche vuoto, le sostituisce.
- In locale la data è ISO. Su Firestore è in millisecondi.
- `criticalNote` e `notes` del cane non cambiano ruolo. `extraNotes` già sul cane non si cancellano e non si copiano sulle visite.
- Un appuntamento personale e una chiusura non hanno questo elenco.
- La ripetizione non copia le note sulla visita successiva.
- Non si modifica una riga sul posto. «Togli» non chiede conferma.
- `altro` è esattamente quella parola, minuscolo, peso 700, colore `var(--tx2)`, sulla stessa riga, senza andare a capo.
- I task 1–7 non alzano `APP_VERSION`. Pubblica solo il task 8, a suite verde. All’inizio del task 8 la versione installata è `1.1.74` (`versionCode` `10174`): si pubblica `1.1.75` (`versionCode` `10175`). Se `APP_VERSION` non è più `1.1.74`, alza la patch rispetto al valore trovato, con `versionCode = major * 10000 + minor * 100 + patch`.
- `tsconfig` ha `noUnusedLocals` e `noUnusedParameters`. Prima di ogni commit: `npx tsc --noEmit`. Vitest non fa il controllo tipi.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.
- Un commit del task elenca solo i file di quel task.
- Shell PowerShell. Un comando alla volta. Non usare `&&`. Non cambiare la git config. Non saltare gli hook. Non fare amend. Non fare force push.

---

### Task 1: Archivio locale della visita

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/appointments.ts`
- Test: `src/data/local/appointments.test.ts`

**Interfaces:**
- Consumes: `DogExtraNote` in `src/types/models.ts`. `cleanExtraNote` non serve qui: la lettura scarta testo vuoto dopo `trim`, id vuoto e data illeggibile.
- Produces: `Appointment.extraNotes?: DogExtraNote[]` e lo stesso campo su `AppointmentWrite`. `createAppointment` e `updateAppointment` lo rispettano. `completeAppointment`, `saveClose` e `setAppointmentStatus` lo conservano perché copiano l’appuntamento intero.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/data/local/appointments.test.ts`, nello stesso stile degli altri `it`, aggiungere:

```ts
it('tiene le note della visita, le azzera solo con un elenco vuoto e ignora gli spazi', () => {
  const createdAt = new Date('2026-10-01T00:00:00.000Z')
  const created = createAppointment('uid-1', {
    ...write(),
    extraNotes: [{ id: 'n1', text: 'si muove', createdAt }],
  })
  expect(listAppointments('uid-1').find((item) => item.id === created.id)?.extraNotes).toEqual([
    { id: 'n1', text: 'si muove', createdAt },
  ])
  const kept = updateAppointment('uid-1', created.id, write())
  expect(kept.extraNotes).toEqual([{ id: 'n1', text: 'si muove', createdAt }])
  const cleared = updateAppointment('uid-1', created.id, { ...write(), extraNotes: [] })
  expect(cleared.extraNotes ?? []).toEqual([])
  const blank = createAppointment('uid-1', {
    ...write(),
    extraNotes: [{ id: 'spazi', text: '   ', createdAt }],
  })
  expect(listAppointments('uid-1').find((item) => item.id === blank.id)?.extraNotes ?? []).toEqual([])
  const personal = createAppointment('uid-1', {
    dogId: '',
    start: new Date('2026-10-15T10:00:00.000Z'),
    services: [],
    kind: 'personale',
    title: 'Dentista',
    extraNotes: [{ id: 'n2', text: 'non qui', createdAt }],
  })
  expect(personal.extraNotes).toBeUndefined()
})
```

`write()` è già l’helper del file. Se la firma di `createAppointment` per il personale nel test esistente è diversa, usa quella firma e aggiungi solo `extraNotes`.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/data/local/appointments.test.ts -t "tiene le note della visita"`

Atteso: FAIL, `extraNotes` assente o non riletto.

- [ ] **Step 3: Implementare**

In `src/types/models.ts`, su `Appointment` e su `AppointmentWrite`, aggiungere `extraNotes?: DogExtraNote[]`.

In `src/data/local/appointments.ts`:

- Su `StoredAppointment` aggiungere `extraNotes?: { id: string; text: string; createdAt: string }[]`.
- Copiare la lettura del cane: id non vuoto, `text.trim().length > 0`, `createdAt` ISO valida. Se l’elenco tenuto è vuoto, non assegnare il campo.
- In `toDomain`, dopo gli altri campi del pelo, assegnare le note lette. Il ramo `personale` non le assegna.
- In `toStored`, per il pelo, se `appointment.extraNotes` ha righe, salvarle con `createdAt.toISOString()`. Il ramo personale non le salva.
- In `appointmentFromWrite`, solo nel ramo non personale: se `input.extraNotes` è un array, copiare le righe con `new Date(item.createdAt)` scartando id vuoto, testo vuoto dopo trim e data illeggibile. Un array vuoto lascia il campo assente.
- In `updateAppointment`, dopo la copia degli altri campi precedenti: se `input.extraNotes === undefined` e `previous.extraNotes` c’è, copiarlo; se `input.extraNotes` è un array, è già stato applicato da `appointmentFromWrite`.

`completeAppointment`, `saveClose` e `setAppointmentStatus` passano da `toDomain` e `toStored`: non vanno toccati se la copia dell’oggetto tiene `extraNotes`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/data/local/appointments.test.ts -t "tiene le note della visita"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts
git commit -m "feat: le note libere stanno sulla visita"
```

---

### Task 2: Documento Firestore e seme locale

**Files:**
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/data/firebase/localSeed.ts`
- Test: `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: `Appointment.extraNotes` dal task 1. `readExtraNotes` è già in `firebaseMap.ts` e scarta id vuoto, testo senza trim e data illeggibile.
- Produces: `appointmentToDoc` scrive `extraNotes` con `createdAt` in millisecondi. `appointmentFromDoc` le rilegge. Il personale non le scrive e non le legge. `appointmentsToLocalMap` in `localSeed.ts` le copia in ISO, così un ripristino dal cloud non le perde.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/firebaseMap.test.ts`, accanto ai test delle note del cane, aggiungere:

```ts
it('le note della visita vanno in millisecondi e gli spazi non tornano', () => {
  const createdAt = new Date('2026-10-01T00:00:00.000Z')
  const doc = appointmentToDoc(appointment({ extraNotes: [{ id: 'n1', text: 'si muove', createdAt }] }))
  expect(doc.extraNotes).toEqual([{ id: 'n1', text: 'si muove', createdAt: dateToMillis(createdAt) }])
  const loaded = appointmentFromDoc('a1', {
    ...doc,
    extraNotes: [
      ...(doc.extraNotes as unknown[]),
      { id: 'spazi', text: '   ', createdAt: dateToMillis(createdAt) },
    ],
  })
  expect(loaded.extraNotes).toEqual([{ id: 'n1', text: 'si muove', createdAt }])
})
```

`appointment` e `dateToMillis` sono già nel file di test.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/lib/firebaseMap.test.ts -t "note della visita"`

Atteso: FAIL, `extraNotes` assente dal documento.

- [ ] **Step 3: Implementare**

In `appointmentToDoc`, nel ramo non personale, aggiungere:

```ts
extraNotes: appointment.extraNotes?.map((item) => ({
  id: item.id,
  text: item.text,
  createdAt: dateToMillis(item.createdAt),
})),
```

In `appointmentFromDoc`, nel ramo non personale, dopo gli altri campi:

```ts
const extraNotes = readExtraNotes(data.extraNotes)
if (extraNotes) appointment.extraNotes = extraNotes
```

Il ramo `personale` di entrambe le funzioni non cita `extraNotes`.

In `src/data/firebase/localSeed.ts`, nella funzione che traduce un appuntamento di pelo in mappa locale, se `appointment.extraNotes` ha righe:

```ts
stored.extraNotes = appointment.extraNotes.map((item) => ({
  id: item.id,
  text: item.text,
  createdAt: item.createdAt.toISOString(),
}))
```

Il ramo personale di `localSeed` non le copia.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/lib/firebaseMap.test.ts -t "note della visita"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/localSeed.ts
git commit -m "feat: le note della visita viaggiano nel documento cloud"
```

---

### Task 3: Registro

**Files:**
- Modify: `src/lib/registroModello.ts`
- Test: `src/lib/registroModello.test.ts`

**Interfaces:**
- Consumes: `extraNoteLines` già nel file. I dati del registro sono il JSON di backup, non `appointmentFromDoc`.
- Produces: la cella `note` del cane unisce solo `criticalNote` e `notes`. La cella `note` della visita unisce i testi di `extraNotes` di quella visita, ordinati per `createdAt` e poi per `id`, e dopo, se c’è, `adjustmentNote`.

- [ ] **Step 1: Aggiornare il test**

Il test `mette avviso, note e nota aggiuntiva su tre righe` oggi aspetta `Mordace\nvecchia\nin piedi` sulla riga del cane. Cambiarlo così:

- sul cane restano `criticalNote: 'Mordace'` e `notes: 'vecchia'`, senza `extraNotes`;
- sull’appuntamento di quel cane, nel `dati()`, aggiungere `extraNotes: [{ id: 'n1', text: 'in piedi', createdAt: '2026-10-01T00:00:00.000Z' }]` e `adjustmentNote: 'dieci minuti in più'`;
- aspettarsi `registro.cani[0].note` uguale a `Mordace\nvecchia`;
- aspettarsi `registro.visite[0].note` uguale a `in piedi\ndieci minuti in più`.

Se il test non ha già un appuntamento, copiare la visita `a1` del test precedente e metterla in `appointments`.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/lib/registroModello.test.ts -t "nota aggiuntiva"`

Atteso: FAIL, la cella della visita non contiene `in piedi`.

- [ ] **Step 3: Implementare**

In `visitaDa`, dopo `adjustmentNote`:

```ts
const lines = extraNoteLines(raw.extraNotes)
if (lines.length > 0) {
  visit.extraNotes = lines.map((text, index) => {
    const row = Array.isArray(raw.extraNotes) ? raw.extraNotes[index] : null
    const source = row && typeof row === 'object' ? row as { id?: unknown; createdAt?: unknown } : {}
    const createdAt = iso(source.createdAt) ?? visit.start
    return { id: typeof source.id === 'string' && source.id ? source.id : `${visit.id}-${index}`, text, createdAt }
  })
}
```

`extraNoteLines` ordina prima di restituire i testi. Per ogni riga legge `id`, `text` e `createdAt`. `createdAt` può essere una `Date`, un numero o una stringa ISO; se non si legge, il tempo è `Number.POSITIVE_INFINITY`. Ordine: tempo, poi `id` con `localeCompare`. Il testo è `trim`, e una riga senza testo si salta.

La riga del cane diventa:

```ts
const note = [text(dog.criticalNote), text(dog.notes)].filter(Boolean).join('\n')
```

La riga della visita diventa:

```ts
note: [...extraNoteLines(visit.extraNotes), text(visit.adjustmentNote)].filter(Boolean).join('\n'),
```

`visit.extraNotes` qui è già l’elenco pulito. `extraNoteLines` su un array di `{ text }` funziona se ignora gli item senza `text`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/lib/registroModello.test.ts`

Atteso: PASS, compreso il test del cane che già aspetta `Allergico\nLame 4`.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/registroModello.ts src/lib/registroModello.test.ts
git commit -m "feat: il registro legge le note sulla visita"
```

---

### Task 4: La scheda del cane non aggiunge più note

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: niente dal task 1. `copyExtraNotes` in `DogPage` resta, perché `writeFromScreen` e `dogToWrite` devono continuare a rimandare `extraNotes` già salvate, così Modifica non le azzera.
- Produces: nella vista lettura non ci sono «Aggiungi nota», «Togli» né il dialogo. Restano `CriticalNote` e il blocco «Note».

- [ ] **Step 1: Riscrivere il test**

Sostituire il test `sotto l’avviso rosso si aggiunge una nota e si toglie, senza aprire Modifica` con:

```ts
it('la scheda in lettura non offre più Aggiungi nota', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const created = createDog(account.uid, write({ name: 'Bobi', criticalNote: 'Mordace' }))
  render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
  expect(await screen.findByText('Mordace')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Aggiungi nota' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/DogsPage.test.tsx -t "non offre più Aggiungi nota"`

Atteso: FAIL, il pulsante c’è ancora.

- [ ] **Step 3: Implementare**

Nella vista lettura di `DogPage.tsx` togliere il blocco delle card, il pulsante «Aggiungi nota», la scritta «Troppe note» e il `Dialog` «Aggiungi nota». Togliere lo stato e le funzioni usate solo da quel blocco (`noteOpen`, `noteDraft`, `saveExtraNote`, `removeExtraNote`, `orderedExtraNotes`, `shownExtraNotes`). Non togliere `copyExtraNotes` se `writeFromScreen` o `dogToWrite` lo usano. Non togliere `CriticalNote` né il blocco «Note».

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/DogsPage.test.tsx -t "non offre più Aggiungi nota"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore. Se un import (`EXTRA_NOTE_LIMIT`, `Dialog`, `cleanExtraNote`) resta inutilizzato, toglierlo.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: la scheda del cane non raccoglie più le note libere"
```

---

### Task 5: Elenco note in prenotazione

**Files:**
- Create: `src/components/domain/ExtraNoteList.tsx`
- Modify: `src/pages/AppointmentForm.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `DogExtraNote`, `cleanExtraNote`, `EXTRA_NOTE_MAX`, `EXTRA_NOTE_LIMIT` da `src/lib/dogNotes.ts`. `AppointmentWrite.extraNotes` dal task 1.
- Produces:

```ts
export function ExtraNoteList(props: {
  notes: DogExtraNote[]
  onAdd: (text: string) => void
  onRemove: (id: string) => void
}): JSX.Element
```

`onAdd` riceve il testo già passato da `cleanExtraNote`. Il dialogo non chiama `onAdd` se il testo è vuoto o troppo lungo, e in quel caso resta aperto.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/pages/appointments.test.tsx`, usando `pickRex`:

```ts
it('in prenotazione una nota va sulla visita e non sul cane', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const user = await pickRex(account.uid, { criticalNote: 'Mordace' })
  expect(screen.getByText('Mordace')).toBeInTheDocument()
  expect(screen.queryByText('altro')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Aggiungi nota' }))
  const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
  await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
  expect(screen.getByRole('dialog', { name: 'Aggiungi nota' })).toBeInTheDocument()
  await user.type(within(dialog).getByLabelText('Nota'), 'Si muove tanto')
  await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
  expect(screen.queryByRole('dialog', { name: 'Aggiungi nota' })).not.toBeInTheDocument()
  expect(screen.getByText('Si muove tanto')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
  const visits = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { extraNotes?: { text: string }[] }>)
  expect(visits.some((item) => item.extraNotes?.some((note) => note.text === 'Si muove tanto'))).toBe(true)
  const dogs = Object.values(JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { extraNotes?: unknown }>)
  expect(dogs.every((item) => item.extraNotes === undefined)).toBe(true)
})
```

Importare `within` se manca.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/appointments.test.tsx -t "una nota va sulla visita"`

Atteso: FAIL, «Aggiungi nota» non c’è.

- [ ] **Step 3: Implementare**

Creare `src/components/domain/ExtraNoteList.tsx`. Ordina le note per `createdAt.getTime()` e poi `id`, con `localeCompare`. Per ognuna, una card con il testo e un pulsante «Togli» il cui `aria-label` è `` `Togli nota: ${text}` ``. Sotto, il pulsante «Aggiungi nota», disabilitato a `notes.length >= EXTRA_NOTE_LIMIT`, e in quel caso il paragrafo «Troppe note» con `color: 'var(--tx3)'`. Il dialogo ha titolo «Aggiungi nota», una `textarea` con `aria-label` «Nota» e `maxLength={EXTRA_NOTE_MAX}`, «Annulla» e «Salva». «Salva» chiama `cleanExtraNote`: se torna `null`, non chiude. Se torna un testo, chiama `onAdd(text)` e chiude.

In `AppointmentForm.tsx`:

- Prop nuova opzionale `initialNotes?: DogExtraNote[]`.
- Stato `notes`, inizializzato copiando `initialNotes` (nuovo `Date` per ogni `createdAt`). Cambiare cane non azzera `notes`.
- Il blocco si vede quando `selected` oppure `virtual` (cane nuovo) è visibile, sotto la card del cane e prima della sezione «Servizi». Non si vede mentre si sta ancora cercando il cane.
- `onAdd` aggiunge `{ id: crypto.randomUUID(), text, createdAt: new Date() }` solo se `notes.length < EXTRA_NOTE_LIMIT`.
- `onRemove` filtra per id.
- In `submit`, dopo `withCardQuote`, mettere sul write `extraNotes: notes.map(...)`. Un elenco vuoto si manda comunque, così una modifica che toglie l’ultima nota la cancella.
- In `DogCard`, il riquadro rosso mostra solo `dog.criticalNote`, per intero, senza `NoteAltro` e senza `hasExtraNotes(dog.extraNotes)`. Se non c’è l’avviso, il riquadro non c’è.

L’appuntamento personale non usa `AppointmentForm`. Non aggiungere il blocco altrove in questo task.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/appointments.test.tsx -t "una nota va sulla visita"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/components/domain/ExtraNoteList.tsx src/pages/AppointmentForm.tsx src/pages/appointments.test.tsx
git commit -m "feat: in prenotazione la nota si scrive sulla visita"
```

---

### Task 6: Appuntamento aperto e ripetizione

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Test: `src/pages/appointments.test.tsx`
- Test: `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `ExtraNoteList` dal task 5. `AppointmentForm` accetta `initialNotes`. `updateAppointment` tiene le note se il write non ha `extraNotes`, e le sostituisce se l’elenco c’è.
- Produces: sull’appuntamento aperto si aggiunge e si toglie una nota, anche se la visita è chiusa. La seconda visita di una ripetizione nasce senza `extraNotes`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `appointments.test.tsx`, estendere il flusso di `su un occasionale crea due appuntamenti` non cambiando quel test. Aggiungerne uno nuovo che, dopo `pickRex`, aggiunge la nota «Solo questa», preme «Fissa anche il prossimo» e «Salva», poi legge lo storage ordinato per `start`. La prima visita ha la nota. La seconda no.

In `AppointmentPage.test.tsx`, creare un cane e una visita con `createAppointment`, poi aprire `/appuntamenti/` più l'id, con lo stesso `render(<App memory isDev={false} initialPath=... />)` già usato nel file. Cliccare «Aggiungi nota», scrivere «Sta in piedi», salvare, e aspettarsi il testo nel foglio. Poi cliccare «Togli nota: Sta in piedi» e aspettarsi che il testo non ci sia.

Un terzo caso, nello stesso file o in `appointments.test.tsx`: una visita già `completato` mostra ancora «Aggiungi nota».

- [ ] **Step 2: Eseguire i test e vederli fallire**

`npx vitest run src/pages/appointments.test.tsx src/pages/AppointmentPage.test.tsx -t "Solo questa|Sta in piedi|completato"`

Atteso: FAIL.

- [ ] **Step 3: Implementare**

In `AppointmentPage.tsx`, nella vista dell’appuntamento aperto (non nel modulo di modifica), sotto il riquadro rosso:

- il riquadro rosso contiene solo `dog?.criticalNote`, senza `NoteAltro` e senza le note del cane;
- se l’avviso manca, il riquadro non c’è;
- `ExtraNoteList` c’è sempre per una visita di pelo, anche con stato `completato`, `disdetto` o `non_venuto`.

`onAdd` costruisce il write con `coreWrite(appointment)` e ci mette `extraNotes` uguale alle note precedenti più la nuova. Salva con la funzione già usata per aggiornare la visita (`saveEdit` o l’api locale che il foglio già chiama per i servizi). Se torna falso, `toast.show('Salvataggio non riuscito', 'plain')` e non si chiude un elenco cambiato: la lista rilegge l’appuntamento, quindi non include la riga nuova. `onRemove` fa lo stesso con l’elenco filtrato. `coreWrite` non deve guadagnare `extraNotes` di default: gli altri salvataggi (orario, servizi, chiusura) omettono il campo e il task 1 li conserva.

Quando il foglio è in modifica, passare a `AppointmentForm` `initialNotes={appointment.extraNotes}`.

Nel ciclo che crea due visite (`starts.entries()`), la voce con `index === 0` tiene `extraNotes`. Le altre fanno `{ ...write }` e poi `delete item.extraNotes` prima di `saveNew`.

- [ ] **Step 4: Eseguire i test e vederli passare**

`npx vitest run src/pages/appointments.test.tsx src/pages/AppointmentPage.test.tsx -t "Solo questa|Sta in piedi|completato"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/appointments.test.tsx src/pages/AppointmentPage.test.tsx
git commit -m "feat: nell'appuntamento aperto si aggiungono e si tolgono le note"
```

---

### Task 7: `altro` legge la visita

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/calendar/WeekRows.tsx`
- Modify: `src/components/domain/AppointmentRow.tsx`
- Test: `src/pages/appointments.test.tsx`
- Test: `src/components/calendar/WeekRows.test.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `hasExtraNotes(appointment.extraNotes)`. `NoteAltro` resta com’è. `splitCritical(dog.criticalNote).title` resta il testo rosso in agenda.
- Produces: `altro` solo se la visita ha note. Le `extraNotes` del cane non lo accendono. Home e la lista del giorno lo mettono accanto al nome.

- [ ] **Step 1: Spostare i dati dei test**

Nel test `nel giorno una card breve con nota non taglia il testo della nota`, togliere `extraNotes` dal cane e metterle nel `createAppointment`. Il cane tiene `criticalNote`. Il test continua ad aspettarsi il titolo rosso, la parola `altro`, e non il testo «Pelo cortissimo».

Aggiungere un caso: cane con `extraNotes` e visita senza note. Non compare `altro`.

In `WeekRows.test.tsx` e `HomePage.test.tsx`, la stessa spostata: le note che oggi stanno sul cane `kratos` o sull’oggetto dog del test vanno sull’appuntamento, se il test vuole vedere `altro`. Un cane con note vecchie e una visita senza note non mostra `altro`.

- [ ] **Step 2: Eseguire i test e vederli fallire**

`npx vitest run src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx -t "altro|Pelo cortissimo"`

Atteso: FAIL, `altro` non compare perché il componente legge ancora il cane.

- [ ] **Step 3: Implementare**

Sostituire ogni `hasExtraNotes(dog?.extraNotes)` usato per `altro` con `hasExtraNotes(appointment.extraNotes)`:

- `CalendarPage.tsx`: `dayScaleItems` (`hasNote`) e il render della card (`hasExtra`). Il rosso resta `splitCritical` del cane.
- `WeekRows.tsx`: la variabile `extra`.
- `AppointmentRow.tsx`: la riga accanto al nome.

Non passare il testo della nota a `NoteAltro`. Si passa il titolo rosso, oppure `note=""` nella vista compatta e in `AppointmentRow`.

- [ ] **Step 4: Eseguire i test e vederli passare**

`npx vitest run src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx -t "altro|Pelo cortissimo"`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/CalendarPage.tsx src/components/calendar/WeekRows.tsx src/components/domain/AppointmentRow.tsx src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx
git commit -m "feat: in calendario altro segna le note di quella visita"
```

---

### Task 8: Pubblicazione 1.1.75

**Files:**
- Modify: `src/lib/appVersion.ts`
- Modify: `package.json`
- Modify: `android/app/build.gradle`
- Modify: `hosting/release.json`

**Interfaces:**
- Consumes: i task 1–7 già committati e verdi.

- [ ] **Step 1: Suite**

`npm test`

Atteso: PASS. Se fallisce, non si alza la versione.

- [ ] **Step 2: Versione**

Se `APP_VERSION` è `1.1.74`, i quattro file diventano `1.1.75` e `versionCode` `10175`. `url` diventa `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.75/groomly.apk`. `notes` di `release.json`:

```json
["Le note si scrivono sulla visita, non più sulla scheda del cane. In calendario altro compare solo se quella visita ha una nota."]
```

Se `APP_VERSION` non è `1.1.74`, alza la patch del valore trovato e ricalcola `versionCode`.

- [ ] **Step 3: APK**

`npm run build`

`npx cap sync android`

Nella cartella `android`: `.\gradlew assembleDebug`

Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del repo. Non metterlo in `hosting/` e non aggiungerlo al commit.

- [ ] **Step 4: Commit, push, release, Firebase**

Se questi due file sono ancora non tracciati, committarli da soli prima del bump, con messaggio `docs: note sull'appuntamento`:

- `docs/superpowers/specs/2026-10-23-note-appuntamento-design.md`
- `docs/superpowers/plans/2026-10-23-note-appuntamento.md`

Poi:

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "chore: pubblica 1.1.75"
git push origin HEAD
gh release create v1.1.75 groomly.apk --repo robmass83-ui/Groomly --target HEAD --title "v1.1.75" --notes "Le note si scrivono sulla visita, non più sulla scheda del cane. In calendario altro compare solo se quella visita ha una nota."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

`gh release create` deve avere `--target HEAD`, così il tag punta al commit della versione e non a `main`. Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook.

Le regole Firestore non cambiano.
