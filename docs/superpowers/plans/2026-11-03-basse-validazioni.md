# Basse «Validazioni» — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'app e la pagina pubblica rifiutano, con un messaggio chiaro, date di nascita future, pesi assurdi, telefoni senza senso, email incomplete, nomi troppo lunghi, servizi doppi e «Non venuto» su visite future.

**Architecture:** le regole sono funzioni pure in `src/lib` con i loro test; i moduli React le usano per mostrare l'errore come fanno oggi per i campi obbligatori. La pagina pubblica (`hosting/s/pagina.js`, JS senza build) replica i limiti del server.

**Tech Stack:** React + TypeScript, react-hook-form + zod, Vitest (`npx vitest run <file> --exclude '.claude/**'`), JS puro per `hosting/s/pagina.js`.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-validazioni-design.md`

## Global Constraints

- Telefono: da 6 a 15 cifre; oltre alle cifre ammessi solo spazi, `+`, `-`, `.`, `/`, `(`, `)`. Telefono vuoto resta ammesso dove oggi è facoltativo; dove oggi è obbligatorio resta il messaggio «obbligatorio».
- Peso: solo cifre con al massimo un separatore decimale (virgola o punto), da 0,1 a 150 kg compresi. Vuoto = nessun peso.
- Data di nascita: nessuna data dopo oggi (giorno locale). Mese e giorno senza anno: se nell'anno in corso cadono dopo oggi, valgono per l'anno prima (non sono un errore).
- Nome del titolare: massimo 80 caratteri dopo `trim`.
- Pagina pubblica: nome cliente e nome animale massimo 80 caratteri (`NOME_PRENOTAZIONE_MAX`), telefono massimo 20 caratteri (`TELEFONO_PRENOTAZIONE_MAX`) e massimo 15 cifre.
- Servizi doppi: confronto con `normalizeSearch` (`src/lib/normalizza.ts`), il servizio che si sta modificando non conta come doppio di sé stesso; vale anche contro servizi disattivati.
- «Non venuto»: visibile solo quando `canComplete(appointment.start, now)` (`src/lib/appointments.ts:69`, stesso giorno locale o dopo).
- Visita con solo un extra: nessun cambiamento al codice.
- Partita IVA con «IT»: nessun cambiamento al codice (già coperta da `src/lib/paese.test.ts:6`).
- I dati già salvati non si toccano; nessuna migrazione; nessun cambiamento alle regole Firestore.
- Ogni testo nuovo va in `src/i18n/it.ts`, `en.ts`, `es.ts` (stesse chiavi).
- Mai dati di produzione: verifica solo sugli emulatori `demo-groomly`.

## Review Focus

- Oggi è il 31 dicembre o il 1° gennaio, o il compleanno è oggi: oggi è valido, domani no — test in Task 1.
- Peso scritto «12,» «,5» «12.5.1» « 12 » «1 000»: «,5» e « 12 » valgono (0,5 e 12), gli altri sono errore — test in Task 1.
- Telefono con prefisso internazionale e parentesi «+39 (02) 1234-5678» valido; «+39» da solo e «333abc4567» non validi — test in Task 1.
- Modifica di un servizio senza cambiare il nome, o cambiando solo le maiuscole del proprio nome: non è un doppio — test in Task 1 e Task 3.
- Scheda cane già salvata con un telefono vecchio non valido: riaprirla e salvarla chiede di correggere il telefono (comportamento voluto, non si salva un dato nuovo invalido) — caso nello script di Task 5.

---

### Task 1: regole pure

**Files:**
- Create: `src/lib/validazioni.ts`, `src/lib/validazioni.test.ts`
- Modify: `src/lib/dogScreen.ts:49-64` (`completeBirthday` riceve `now`), `src/lib/dogScreen.test.ts` (se esiste; altrimenti i test di `completeBirthday` vanno in `validazioni.test.ts`), `src/pages/DogFields.tsx:26-31` (`weightOf` delega a `pesoDaTesto`), chiamanti di `completeBirthday` (`src/pages/DogFields.tsx:46`, `src/pages/DogPage.tsx:355`)

**Interfaces:**
- Produces, in `src/lib/validazioni.ts` (import ammessi: solo `./normalizza`):
  - `TELEFONO_CIFRE_MIN = 6`, `TELEFONO_CIFRE_MAX = 15`, `PESO_MAX_KG = 150`, `TITOLARE_MAX = 80`
  - `telefonoValido(testo: string): boolean` — `true` solo se rispetta la regola delle Global Constraints (stringa vuota → `false`; chi lo usa decide se il vuoto è ammesso)
  - `pesoDaTesto(testo: string): number | null` — `null` se vuoto, `Number.NaN` se non valido, altrimenti il numero
  - `servizioDoppio(nome: string, servizi: readonly { id: string; name: string }[], escludiId?: string): { id: string; name: string } | null` — il primo servizio con lo stesso nome normalizzato, escluso `escludiId`
- `completeBirthday(month, day, year, now: Date)` — stesso ritorno di oggi; `'invalido'` anche per una data dopo `now` quando `year` è dato; senza anno usa l'anno di `now`, o l'anno prima se la data cade dopo `now` (al posto del fisso 2024, così il 29 febbraio resta valido solo se esiste in quell'anno — accettato).

- [ ] **Step 1: test che falliscono** in `src/lib/validazioni.test.ts`:
  - `telefonoValido`: valide `'+39 333 123 4567'`, `'+39 (02) 1234-5678'`, `'02/123.456'`, `'123456'`; non valide `''`, `'abc'`, `'12345'`, `'+39'`, `'333abc4567'`, `'1234567890123456'` (16 cifre).
  - `pesoDaTesto`: `''`→`null`, `'  '`→`null`, `'12,5'`→12.5, `'12.5'`→12.5, `' 12 '`→12, `',5'`→0.5, `'150'`→150, `'0,1'`→0.1; `NaN` per `'1e3'`, `'0x10'`, `'0'`, `'0,05'`, `'150,5'`, `'12,'`, `'12.5.1'`, `'1 000'`, `'-3'`, `'abc'`.
  - `servizioDoppio('  bagno ', [{id:'a', name:'Bagno'}])` → `{id:'a', name:'Bagno'}`; `servizioDoppio('Bàgno', …)` → lo stesso; `servizioDoppio('BAGNO', [{id:'a', name:'Bagno'}], 'a')` → `null`; `servizioDoppio('Taglio', [{id:'a', name:'Bagno'}])` → `null`.
  - `completeBirthday` con `now = new Date(2026, 10, 3)`: `('11','3',2026)` → valido; `('11','4',2026)` → `'invalido'`; `('12','25',2026)` → `'invalido'`; `('12','25',2025)` → valido; `('12','25',null)` → valido; `('2','29',null)` → `'invalido'` (2026 non bisestile, 2025 neanche); `('2','29',2024)` → valido; con `now = new Date(2026, 0, 1)`: `('1','1',2026)` valido, `('1','2',2026)` invalido; `('','',null)` → `'vuoto'`.
- [ ] **Step 2:** `npx vitest run src/lib/validazioni.test.ts --exclude '.claude/**'` → FAIL (modulo mancante).
- [ ] **Step 3:** scrivi `validazioni.ts`, aggiorna `completeBirthday` e i suoi due chiamanti (passano il `now` che hanno già in scope), fai delegare `weightOf` a `pesoDaTesto`.
- [ ] **Step 4:** `npx vitest run src/lib src/pages/DogFields src/pages/DogPage --exclude '.claude/**'` → PASS (a parte il noto `src/lib/driveInvio.test.ts`); `npx tsc --noEmit` → nessun errore.
- [ ] **Step 5:** commit `feat(validazioni): regole per telefono, peso, data di nascita e servizi doppi`.

### Task 2: moduli dell'app — telefono, titolare, email

**Files:**
- Modify: `src/pages/DogFields.tsx` (`screenErrors`, riga 41), `src/pages/DogPage.tsx:684-700` (dialogo contatto), `src/pages/AppointmentForm.tsx:236-247` e il suo `canSave`/errore per il cane nuovo, `src/lib/listaAttesa.ts:128` (`iscrizioneManualeValida`), `src/pages/AccountPage.tsx` (`salvaProfilo` riga 100, `salvaEmail` riga 215, dialogo titolare riga 473, telefono della toelettatura riga 494), `src/i18n/it.ts`/`en.ts`/`es.ts`
- Test: i test esistenti accanto a ciascun file (`*.test.ts(x)`), estesi

**Interfaces:**
- Consumes: `telefonoValido`, `TITOLARE_MAX` da `src/lib/validazioni`; `emailValida` da `src/lib/codaEmail`.
- Produces: chiavi i18n `schedaTelefonoInvalido` («Telefono non valido» / «Phone number is not valid» / «Teléfono no válido») e `accTitolareLungo` («Massimo 80 caratteri» / «80 characters at most» / «Máximo 80 caracteres»).

- [ ] **Step 1: test che falliscono:**
  - `screenErrors` con `phone: 'abc'` → `errors.phone === t('it','schedaTelefonoInvalido')`; con `phone: ''` → resta `schedaTelefonoObbligatorio`; con `'+39 333 1234567'` → nessun errore telefono.
  - `iscrizioneManualeValida` con telefono `'abc'` → `false`; con un telefono valido e gli altri campi validi → `true`.
  - `AccountPage`: titolare di 81 caratteri → non salva e mostra `accTitolareLungo`; email `'a@b'` → toast `authEmailValida` e nessuna chiamata a `cambiaEmailAccesso`; telefono toelettatura `'abc'` → errore sul campo, nessun salvataggio; telefono toelettatura vuoto → salva.
  - Dialogo contatto di `DogPage` e cane nuovo di `AppointmentForm` con telefono `'abc'`: non salvano e mostrano `schedaTelefonoInvalido` (vuoto: comportamento di oggi invariato).
- [ ] **Step 2:** esegui quei test → FAIL.
- [ ] **Step 3:** collega le regole. Campo titolare con `maxLength={TITOLARE_MAX}` e controllo in `salvaProfilo` su `bozza.trim().length`. Errori mostrati con la prop `error` di `Input` o, dove il campo è un `<input>` nudo (`AppointmentForm`), con lo stesso stile di errore già usato in quel modulo.
- [ ] **Step 4:** `npx vitest run src/pages src/lib --exclude '.claude/**'` → PASS (a parte `driveInvio`); `npx tsc --noEmit` → nessun errore.
- [ ] **Step 5:** commit `fix(validazioni): telefono, titolare ed email controllati nei moduli dell'app`.

### Task 3: servizi doppi e «Non venuto»

**Files:**
- Modify: `src/pages/ServicesPage.tsx` (`submit`, righe 61-91), `src/pages/ServiceSheet.tsx` (riceve l'errore sul nome), `src/pages/AppointmentPage.tsx:649-656` (pulsante «Non venuto»), `src/i18n/*.ts`
- Test: `src/pages/ServicesPage.test.tsx`, il test di `AppointmentPage` esistente

**Interfaces:**
- Consumes: `servizioDoppio` da `src/lib/validazioni`; `canComplete` (già calcolato come `completable` a `AppointmentPage.tsx:432`).
- Produces: chiave i18n `servNomeDoppio` con segnaposto `{{nome}}`: «Esiste già il servizio {{nome}}» / «There is already a service called {{nome}}» / «Ya existe el servicio {{nome}}».

- [ ] **Step 1: test che falliscono:**
  - `ServicesPage`: con un servizio «Bagno» esistente, creare « bagno » → nessun salvataggio, errore `servNomeDoppio` con «Bagno» sul campo nome, il foglio resta aperto; modificare «Bagno» in «BAGNO» → salva; creare «Bagno» quando «Bagno» esiste ma è disattivato → errore.
  - `AppointmentPage`: visita `programmato` di domani → nessun pulsante «Non venuto»; visita di oggi più tardi → pulsante presente; il pulsante «Disdici» c'è in entrambi i casi.
- [ ] **Step 2:** esegui quei test → FAIL.
- [ ] **Step 3:** in `submit` controlla `servizioDoppio(input.name, api.services, editing === 'new' ? undefined : editing?.id)` prima di salvare e passa l'errore al foglio (per esempio con `form.setError('name', …)` tramite una prop, a scelta di chi costruisce). Il pulsante «Non venuto» si mostra solo se `completable`; quando manca, «Disdici» occupa tutta la riga.
- [ ] **Step 4:** `npx vitest run src/pages --exclude '.claude/**'` → PASS; `npx tsc --noEmit` → nessun errore.
- [ ] **Step 5:** commit `fix(validazioni): niente servizi con lo stesso nome, «Non venuto» solo dal giorno della visita`.

### Task 4: pagina pubblica

**Files:**
- Modify: `hosting/s/pagina.js` (`campo` riga 632, `problemi` riga 810, testi `nomeKo`/`telKo`/`caneKo` nelle tre lingue, campi della lista d'attesa riga ~1018 e la loro validazione), `src/lib/prenotazione.ts:97-99` (messaggi distinti)
- Test: `src/lib/prenotazione.test.ts`, `src/i18n/paginaPubblica.test.ts` (se controlla le chiavi della pagina)

**Interfaces:**
- Consumes: nessuna dal resto del piano.

- [ ] **Step 1: test che falliscono** in `src/lib/prenotazione.test.ts`: `ingressoRichiestaPubblica` con nome di 81 caratteri → `{ ok: false, message: 'Nome non valido' }`; con telefono di 16 cifre → `{ ok: false, message: 'Telefono non valido' }`; giorno malformato → resta `'Richiesta non valida'`.
- [ ] **Step 2:** esegui → FAIL.
- [ ] **Step 3:** in `prenotazione.ts` separa i due messaggi. In `pagina.js`: `maxLength = 80` sui campi `nome` e `cane` (oltre a `razza`), `maxLength = 20` su `telefono`; in `problemi` errore anche per nome > 80, cane > 80, telefono con più di 15 cifre o più di 20 caratteri; testi `nomeKo` e `telKo` che coprano anche il caso «troppo lungo» (per esempio «Scrivi il tuo nome (massimo 80 caratteri).», «Scrivi un cellulare valido.», e gli equivalenti in inglese e spagnolo). Stessi limiti sui campi nome, telefono e nome animale della lista d'attesa.
- [ ] **Step 4:** `npx vitest run src/lib/prenotazione src/i18n --exclude '.claude/**'` → PASS; `npm --prefix functions run build` → nessun errore.
- [ ] **Step 5:** commit `fix(pagina): limiti di nome e telefono anche sulla pagina pubblica`.

### Task 5: verifica e documenti

**Files:**
- Create: nessun file di prodotto; eventuali script di prova in `QA-tests/.qa-catalog/`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (riga «Validazioni» delle basse: ogni punto risolto con ramo e spec; punto 9 «voluto, non è un difetto»; punto 5 «già risolto dalla media 30»), `PROGRESS.md`

- [ ] **Step 1:** nell'app emu (Vite 5173 con emulatori `demo-groomly`), nel browser: scheda cane con nascita domani, peso «1e3», telefono «abc» → errori; scheda già salvata con telefono «abc» (scritto nell'emulatore) riaperta e salvata → chiede il telefono; Account titolare di 81 caratteri ed email «a@b» → rifiutati; servizio « bagno » accanto a «Bagno» → rifiutato; visita di domani senza «Non venuto», visita di oggi con «Non venuto».
- [ ] **Step 2:** pagina pubblica sull'emulatore: il campo nome non accetta oltre 80 caratteri; un nome di 81 caratteri forzato via console → messaggio «Nome non valido».
- [ ] **Step 3:** aggiorna audit e PROGRESS; commit `docs: basse «Validazioni» risolte`.
