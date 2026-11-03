# Basse «Animali e mensili» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le dieci basse «Animali e mensili»: Mensili del mese dopo e omonimi, conferma di Deceduto/Non più in cura, «Rendi principale», sesso «Non indicato», «ogni N settimane», ordinamento visibile e ricordato, prezzo svuotato, «Troppe note», «Anziano» una volta.

**Architecture:** Regole pure in `src/lib/` (`cycle.ts` per il mese dei Mensili, `contattoPrincipale.ts` per lo scambio, `ordinamentoAnimali.ts` per il ricordo, `display.ts` per l'età della scheda); le pagine (`MonthlyPage.tsx`, `DogPage.tsx`, `DogFields.tsx`, `DogsPage.tsx`, `ExtraNoteList.tsx`) le usano.

**Tech Stack:** React + TypeScript, Vitest + Testing Library (happy-dom), date-fns, i18n in `src/i18n/{it,en,es}.ts`.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-animali-design.md`

## Global Constraints

- Solo app (APK): niente functions, regole Firestore, hosting; niente cambi di versione.
- Testi nuovi in it/en/es con chiavi nuove; nessun letterale italiano nel codice (test `src/i18n/frasiFisse.test.ts`). Testi italiani fissati: «Rendi principale», «Non indicato», «{{etichetta}} · ogni {{n}} settimane», «{{etichetta}} · ogni settimana», «Troppe note», «Segnare {{nome}} come deceduto?», «Segnare {{nome}} come non più in cura?», «Conferma», «Annulla» (riusare chiavi esistenti se ci sono già con lo stesso testo).
- Test con `npx vitest run --dir src <file>`. Fallimenti già presenti su `main` da ignorare: `src/lib/driveInvio.test.ts`, 21 test di `src/pages/DogPage.test.tsx`, 3 di `src/pages/appointments.test.tsx` (confrontare l'elenco dei falliti prima/dopo: nessun nuovo fallito). I test nuovi della scheda vanno in un file nuovo `src/pages/DogPage.basse.test.tsx` (stesso schema di setup di `DogPage.test.tsx`: `createAccount`, `createDog`, `render(<App memory isDev={false} initialPath=… />)`).
- localStorage sempre dentro try/catch.

## Review Focus

- Mensili, mese dopo: un cane con visite il 19 nov e il 1 dic compare **una volta** a novembre e **una volta** a dicembre, mai due volte nello stesso mese; con due visite a dicembre (1 e 15 dic) compare una volta con il 1 dic. Test in Task 1.
- Mensili: il mese corrente non cambia (stessi gruppi e conteggi di oggi). Test in Task 1 (`monthlyRowsFor` sul mese corrente = `monthlyStatus` + `visibleInMonth`).
- «Rendi principale» poi «Annulla»/uscita senza salvare: la scheda salvata resta com'era. «Rendi principale» due volte di seguito (A↔B↔A) torna al punto di partenza senza duplicare contatti. Test in Task 2.
- Prezzo svuotato con «mostra nel profilo» acceso: dopo Salva `hiddenServiceIds` non contiene più quel servizio; un prezzo con solo durata resta. Test in Task 3.
- Dialogo Deceduto senza visite future: «Annulla» non archivia; con visite future resta il dialogo di oggi (Archivia e disdici). Test in Task 3.

---

### Task 1: Mensili — mese dopo e omonimi

**Files:**
- Modify: `src/lib/cycle.ts` (nuova funzione vicino a `visibleInMonth`)
- Modify: `src/pages/MonthlyPage.tsx` (righe, contatore, badge `openInMonth`, riga omonimo)
- Test: `src/lib/cycle.test.ts`, `src/pages/monthly.test.tsx`

**Interfaces:**
- Produces: `cycle.ts`: `monthlyRowsFor(dogs: Dog[], appointments: Appointment[], now: Date, daysBefore: number, month: Date): MonthlyRow[]` (non ordinate).
  - Per ogni cane `row = monthlyStatus(...)`; `null` → salta. Se `visibleInMonth(row, month, now)` → `row`.
  - Altrimenti, solo se `month` è il mese **successivo** a `now`: se il cane ha visite `programmato` con inizio in quel mese (giorno locale), riga `group: 'fissato'`, `booked` = la prima (per `start`, poi `id`), `lastCompleted` = `row.lastCompleted`, `due` = `booked.coveredDue ?? nextDueAfter(prec, weeks)` dove `prec` è la visita più recente del cane `completato` o `programmato` con `start < booked.start` (`null` se non c'è → `due: null`), `late` = `due !== null && booked.start > addDays(due, 14)`.
- `MonthlyPage`: `rows` = `monthlyRowsFor(dogs, appointments, now, daysBefore, month)`; `openInMonth` conta i gruppi aperti di `monthlyRowsFor` del mese. Riga omonimo: `dogMark(row.dog, dogs.filter((d) => d.status === 'attivo'))`; se non `null` compare come riga piccola (`TYPE.meta`, `var(--tx3)`, `USER_TEXT`) sotto il nome, in tutti i gruppi compresi i fissati.

- [ ] **Step 1: Test che falliscono in `cycle.test.ts`** (`describe('monthlyRowsFor')`, `now` = 3 nov 2026 10:00, cane mensile ogni 4 settimane):
  - Sole, completato 22 set, programmati 19 nov e 1 dic: mese nov → una riga `fissato` con `booked.start` 19 nov; mese dic → una riga `fissato` con `booked.start` 1 dic, `due` = 19 nov + 4 settimane (17 dic), `late: false`.
  - Programmati 1 dic e 15 dic, nessuno a nov: mese dic → una sola riga, `booked` 1 dic (regola di oggi: `visibleInMonth`).
  - Programmati 5 nov e 20 dic, completato 22 set: dic → `fissato` 20 dic con `due` 3 dic (5 nov + 4 sett) e `late: true` (20 dic > 3 dic + 14 g).
  - Un cane solo in ritardo senza visite (completato 1 set): nov → `in_ritardo`; dic → nessuna riga.
  - Mese corrente: per un insieme di 4 cani misti il risultato è uguale a `dogs.map(monthlyStatus).filter(visibleInMonth(nov))`.
- [ ] **Step 2:** `npx vitest run --dir src src/lib/cycle.test.ts` → FAIL (`monthlyRowsFor` non esportata).
- [ ] **Step 3:** Implementare `monthlyRowsFor` in `cycle.ts`.
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5: Test pagina in `monthly.test.tsx`** (seguire il setup già presente nel file): con due mensili attivi entrambi «Pippo» (razze «Barboncino» e «Maltese», proprietari diversi) la pagina mostra «Barboncino · …» e «Maltese · …» sotto i nomi; un mensile con visite in nov e dic: toccando la scheda del mese successivo compare tra «Fissati» e il riquadro dice `1/1`. Usare il mese reale (`new Date()`) come fanno gli altri test del file, o `vi.setSystemTime` se il file lo usa già.
- [ ] **Step 6:** Aggiornare `MonthlyPage.tsx` (righe, `openInMonth`, riga omonimo). `npx vitest run --dir src src/pages/monthly.test.tsx src/lib/cycle.test.ts` → PASS.
- [ ] **Step 7:** Commit `feat(mensili): il mese dopo mostra le sue visite, omonimi distinguibili`.

### Task 2: «Rendi principale»

**Files:**
- Create: `src/lib/contattoPrincipale.ts`, `src/lib/contattoPrincipale.test.ts`
- Modify: `src/pages/DogPage.tsx` (`contattiExtra` ~1352-1368: tasto accanto a «Togli»), `src/i18n/{it,en,es}.ts` (chiave `schedaRendiPrincipale`: it «Rendi principale», en «Make primary», es «Hacer principal»)
- Test: `src/pages/DogPage.basse.test.tsx` (nuovo)

**Interfaces:**
- Produces:
  ```ts
  export function rendiPrincipale(
    contacts: DogContact[],
    owner: { name: string; phone: string },
    id: string,
  ): { contacts: DogContact[]; owner: { name: string; phone: string } } | null
  ```
  `null` se `id` non è un contatto extra (non `isPrimary`). Altrimenti: `owner` = nome e telefono dell'extra scelto; nell'elenco l'extra scelto **diventa** la voce principale (`isPrimary: true`, stesso `id`, suo `role`, nome/telefono suoi) nella posizione della vecchia principale (o in testa se non c'era); il vecchio proprietario diventa un extra nella posizione dell'extra scelto con `isPrimary: false`, nome e telefono di `owner`, `role` della vecchia voce principale (se non c'era o è vuoto: `ruoloDelProprietario(owner.name)`), `id` della vecchia voce principale o `'primary'` se non c'era — ma mai uguale a un id già presente (in quel caso `crypto.randomUUID()`).
- `DogPage`: il tasto (stesso stile di «Togli», testo visibile «Rendi principale», `aria-label` con il nome usando una chiave `schedaRendiPrincipaleNome`: «Rendi principale {{nome}}» / «Make {{nome}} primary» / «Hacer principal a {{nome}}») chiama `rendiPrincipale(contacts, { name: screen.owner, phone: screen.phone }, contact.id)` e, se non `null`, `setContacts` e aggiorna `screen.owner`/`screen.phone` (stesso setter usato dai campi Proprietario/Telefono). Il salvataggio passa già da `mergeContacts`, che riscrive la voce principale con i campi.

- [ ] **Step 1: Test in `contattoPrincipale.test.ts`:** primario `{id:'primary', name:'Mario Rossi', role:'Proprietario', phone:'3331111111', isPrimary:true}` + extra `{id:'c1', name:'Luca Rossi', role:'Figlio', phone:'3332222222'}`:
  - `rendiPrincipale(contacts, {name:'Mario Rossi', phone:'3331111111'}, 'c1')` → `owner` Luca/3332222222; contatti `[{id:'c1', name:'Luca Rossi', role:'Figlio', isPrimary:true,…}, {id:'primary', name:'Mario Rossi', role:'Proprietario', isPrimary:false,…}]`.
  - Applicato due volte (prima `'c1'`, poi `'primary'`) torna all'elenco iniziale (stessi id, ruoli, numero di voci).
  - Senza voce principale nell'elenco (solo extra `c1`) → in testa `c1` principale, poi il vecchio proprietario con `id 'primary'` e ruolo `ruoloDelProprietario('Mario Rossi')`.
  - `id` inesistente o della voce principale → `null`.
- [ ] **Step 2:** `npx vitest run --dir src src/lib/contattoPrincipale.test.ts` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Test pagina in `DogPage.basse.test.tsx`:** cane con proprietario «Mario Rossi» e contatto extra «Luca Rossi · Figlio»; Modifica → «Rendi principale» su Luca → i campi Proprietario/Telefono mostrano Luca; Salva → la scheda mostra Luca come principale (nome nel riquadro Cliente) e Mario tra i contatti; in un secondo test «Rendi principale» poi «Annulla» (o freccia indietro del modulo) → dati salvati invariati (`listDogs`/`readJson` del cane).
- [ ] **Step 6:** Implementare il tasto e i testi; `npx vitest run --dir src src/pages/DogPage.basse.test.tsx src/lib/contattoPrincipale.test.ts src/i18n` → PASS.
- [ ] **Step 7:** Commit `feat(scheda): rendi principale un contatto extra`.

### Task 3: Scheda cane — conferma, sesso, frequenza, Anziano, prezzo svuotato

**Files:**
- Modify: `src/pages/DogPage.tsx` (`askArchive` ~1232, dialogo ~1651; `profilePrices` ~192; `save` ~1159-1170; sottotitolo ~1466), `src/pages/DogFields.tsx:319` (Segmented del sesso), `src/lib/display.ts` (età della scheda), `src/i18n/{it,en,es}.ts`
- Test: `src/pages/DogPage.basse.test.tsx`, `src/lib/display.test.ts` (crearlo se manca, o aggiungere al test esistente di `display.ts`)

**Interfaces:**
- Produces: `display.ts`: `etaScheda(birthYear: number | undefined, ageCategory: AgeCategory, categoryLabel: string, now: Date, lingua?: Lingua): string` — `''` se `birthYear == null && ageCategory === 'anziano'`, altrimenti `ageText(birthYear, categoryLabel, now, lingua)`. La riga ~1466 di `DogPage.tsx` la usa (una sola chiamata, niente doppio calcolo).
- Chiavi nuove: `schedaSessoNonIndicato` («Non indicato» / «Not specified» / «No indicado»), `schedaOgni` diventa «{{etichetta}} · ogni {{n}} settimane» / «{{etichetta}} · every {{n}} weeks» / «{{etichetta}} · cada {{n}} semanas», nuova `schedaOgniSettimana` («{{etichetta}} · ogni settimana» / «every week» / «cada semana») per `n === 1` (riga ~532), `schedaConfermaDeceduto` («Segnare {{nome}} come deceduto?» / «Mark {{nome}} as deceased?» / «¿Marcar a {{nome}} como fallecido?»), `schedaConfermaNonInCura` («Segnare {{nome}} come non più in cura?» / «Mark {{nome}} as no longer a client?» / «¿Marcar a {{nome}} como ya no cliente?»). «Conferma»/«Annulla»: riusare le chiavi esistenti.

- [ ] **Step 1: Test che falliscono in `DogPage.basse.test.tsx`:**
  - Cane senza visite future → Menu › Deceduto: compare il dialogo con «Segnare Lupo come deceduto?»; «Annulla» → il cane resta `attivo`; di nuovo Deceduto › «Conferma» → `deceduto`. Lo stesso con «Non più in cura» → `non_in_cura`.
  - Cane con una visita futura → Menu › Non più in cura: compare il dialogo di oggi con «Archivia e disdici» (nessun cambiamento).
  - Cane con sesso `F` → Modifica › Altri dettagli › «Non indicato» › Salva → il cane salvato non ha `sex`.
  - Mensile `recurrenceWeeks: 6` → la scheda mostra «Mensile · ogni 6 settimane»; con 1 → «Mensile · ogni settimana».
  - Cane `ageCategory: 'anziano'` senza `birthYear` → «Anziano» compare una volta sola nella scheda (`getAllByText('Anziano')` lunghezza 1); con `birthYear` 2014 → «12 anni» e il bollino.
  - Cane con `servicePrices: [{serviceId:'bagno', price: 27.5, durationMin: 50}]`, `hiddenServiceIds: ['bagno']` → Modifica, svuotare prezzo e durata del Bagno, Salva → salvato `servicePrices` senza bagno e `hiddenServiceIds` senza `'bagno'`; la scheda non mostra «Prezzi personalizzati». Variante: svuotare solo il prezzo (durata 50 resta) → `hiddenServiceIds` contiene ancora `'bagno'`.
  - (dati già salvati) `servicePrices: []`, `hiddenServiceIds: ['bagno']` → la scheda non mostra la riga «— · —» (`profilePrices` salta le voci senza prezzo né durata).
- [ ] **Step 2:** `npx vitest run --dir src src/pages/DogPage.basse.test.tsx` → FAIL.
- [ ] **Step 3: Implementare:**
  - `askArchive`: senza visite future apre comunque il dialogo; il dialogo, con `futureCount === 0`, mostra la domanda (`schedaConfermaDeceduto`/`schedaConfermaNonInCura` con il nome) e due pulsanti «Conferma» (chiama `archiveOnly`) e «Annulla» (chiude). Con visite future invariato.
  - `DogFields.tsx`: aggiungere l'opzione `{ value: '', label: frasi.schedaSessoNonIndicato }` (ultima); `patch({ sex: undefined })` già gestito; verificare che `writeFromScreen`/`saveExisting` tolgano davvero `sex` dal documento (se `...draft` con `sex: undefined` non lo cancella su Firestore/local, cancellarlo esplicitamente come fanno gli altri campi svuotati).
  - `save`: dopo `collectPrices`, `hidden` filtrato ai soli `serviceId` presenti in `prices`; `profilePrices` salta le voci senza prezzo né durata.
  - Riga ~532: `n === 1` → `schedaOgniSettimana`.
  - Riga ~1466: `etaScheda`.
- [ ] **Step 4:** `npx vitest run --dir src src/pages/DogPage.basse.test.tsx src/lib/display.test.ts src/i18n` → PASS; `npx vitest run --dir src src/pages/DogPage.test.tsx` → solo i 21 falliti già presenti (stessi nomi).
- [ ] **Step 5:** Commit `fix(scheda): conferma archiviazione, sesso non indicato, frequenza, anziano, prezzo svuotato`.

### Task 4: Lista animali — ordinamento visibile e ricordato; «Troppe note»

**Files:**
- Create: `src/lib/ordinamentoAnimali.ts`, `src/lib/ordinamentoAnimali.test.ts`
- Modify: `src/pages/DogsPage.tsx` (stato `sortMode` ~76, foglio ~210-213), `src/components/domain/ExtraNoteList.tsx:105`, `src/i18n/{it,en,es}.ts` (chiave `noteTroppe`: «Troppe note» / «Too many notes» / «Demasiadas notas»)
- Test: `src/pages/DogsPage.test.tsx` (aggiungere in fondo un `describe` nuovo) o `src/pages/DogsPage.ordina.test.tsx` se il setup lo rende più semplice

**Interfaces:**
- Produces: `ordinamentoAnimali.ts`: `leggiOrdinamento(): DogSort` (default `'alfabetico'`, valori sconosciuti o errori → default), `salvaOrdinamento(mode: DogSort): void`; chiave `groomly.ordinamentoAnimali`; entrambe in try/catch.
- `DogsPage`: `useState<DogSort>(leggiOrdinamento)`; `chooseSort` chiama anche `salvaOrdinamento`. Nel foglio la scelta attiva ha un'icona `Check` (lucide, 18 px, `var(--pri)`, `aria-hidden`) a destra e testo in grassetto; `aria-pressed` resta.

- [ ] **Step 1: Test:** `ordinamentoAnimali.test.ts`: vuoto → `'alfabetico'`; `salvaOrdinamento('prossimo')` poi `leggiOrdinamento()` → `'prossimo'`; valore `'xyz'` salvato a mano → `'alfabetico'`; `localStorage.getItem` che lancia → `'alfabetico'`. Pagina: scelto «Per prossimo appuntamento», smontare e rimontare `/animali` → aprendo Ordina il pulsante «Per prossimo appuntamento» ha `aria-pressed="true"` e contiene un'icona (`svg`); «Alfabetico» no.
- [ ] **Step 2:** eseguire → FAIL.
- [ ] **Step 3:** Implementare; «Troppe note» → `frasi.noteTroppe`.
- [ ] **Step 4:** `npx vitest run --dir src src/lib/ordinamentoAnimali.test.ts src/pages/DogsPage.test.tsx src/i18n` → i nuovi PASS, in `DogsPage.test.tsx` solo i 21 falliti già presenti.
- [ ] **Step 5:** Commit `fix(animali): ordinamento visibile e ricordato, «Troppe note» tradotto`.

### Task 5: Verifica sull'emulatore

**Files:**
- Create: `QA-tests/.qa-catalog/verify-basse-animali.cjs` (modello: `verify-basse-agenda.cjs`, stessa creazione account con firebase-admin e `legacy: false`, prefisso email `animali-`, account cancellati alla fine salvo `--keep`, `--solo=`)

- [ ] **Step 1:** Script con i casi, ognuno a 320/360/390 px e screenshot in `QA-tests/results/basse-animali/`:
  - M1 Mensili: due «Pippo» mensili con razze diverse → righe razza visibili; Sole con visite 19 nov e 1 dic → «dic» mostra Sole tra i Fissati e `1/1`, «nov» la mostra col 19 nov.
  - D1 Deceduto senza futuri → dialogo, Annulla non archivia, Conferma archivia.
  - C1 Rendi principale + Salva → Firestore: `contact` = figlio, `contacts` con il padre non principale.
  - S1 Sesso «Non indicato» + Salva → campo `sex` assente su Firestore.
  - O1 Ordina: spunta visibile sulla scelta, ricordata dopo ricarica.
  - P1 Prezzo svuotato → niente riga «— · —», `hiddenServiceIds` senza il servizio.
  - F1 «Mensile · ogni 6 settimane»; A1 «Anziano» una volta; N1 nessuna riga che sborda (`scrollWidth <= clientWidth`) nelle righe toccate.
- [ ] **Step 2:** Eseguire con emulatori e Vite già accesi (non riavviarli; se serve un Vite di questo ramo usare un'altra porta, es. 5183). Expected: tutti i casi PASS.
- [ ] **Step 3:** Commit dello script.
