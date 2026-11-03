# Medie «Account e profilo» (27-30) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paese del salone con dati fiscali del paese, email dell'account allineata a quella di accesso, errori di accesso chiari, campi obbligatori, link a privacy e termini, date e testi tradotti in en/es.

**Architecture:** Logica pura nuova in `src/lib/paese.ts` (elenco paesi, formati IVA, paese dal fuso) e `src/lib/erroriAuth.ts`; `settings.business.paese`; la callable `dettaglioIndirizzo` restituisce anche il paese; un helper di locale date-fns per lingua sostituisce `IT_DATE`.

**Tech Stack:** React + TypeScript + Vite, date-fns, Firebase (Auth, Firestore, Functions v2), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-medie-account-profilo-design.md`

## Global Constraints
- Testi in it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`); ogni chiave nuova in tutti e tre; nessun testo italiano fisso nei componenti toccati (aria-label compresi). Prima di cambiare o togliere una chiave esistente, grep che nessun'altra pagina la usi.
- Codici paese ISO a due lettere maiuscoli; `ALTRO` per fuori elenco. Elenco: i 27 paesi UE + `GB`, `CH`, `NO` + `ALTRO`.
- Saloni esistenti senza `paese` → `IT` (comportamento di oggi invariato per Laura).
- Nessun cambio a `firestore.rules`. Unica function toccata: `dettaglioIndirizzo`.
- Leggibile a 320, 360 e 390 px.
- Test dalla radice `npx vitest run <file> --exclude '.claude/**'` (alcune pagine solo con `--config vitest.slow.config.ts`; `LoginPage.test.tsx` solo con quella); functions dalla radice; typecheck `npx tsc --noEmit` e `cd functions && npx tsc --noEmit`. Fallimento noto: `src/lib/driveInvio.test.ts`; con la config lenta 3 in `appointments.test.tsx` e quelli in `DogsPage.test.tsx`.
- Commit con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Paese scelto a mano non sovrascritto:** se il titolare ha scelto il paese, un nuovo indirizzo da un altro paese non lo cambia. Test nel Task 2.
2. **Partita IVA già salvata in un formato che il nuovo paese non accetta** (es. salone IT che passa a FR): il campo mostra l'errore ma non cancella il valore; il salvataggio è bloccato solo se il campo è stato toccato o il paese cambiato. Test nel Task 1.
3. **Email cambiata ma non ancora confermata:** la scheda dell'account non si aggiorna finché Firebase non dice verificata. Test nel Task 3.
4. **Lingua cambiata durante l'uso:** date e `<html lang>` seguono subito la nuova lingua. Test nei Task 4 e 5.
5. **Parola di conferma del ripristino:** in en/es si accetta solo la parola della lingua attiva; mai bloccato per sempre se la lingua cambia a metà. Test nel Task 6.

---

### Task 1: Paese del salone e dati fiscali del paese

**Files:**
- Create: `src/lib/paese.ts`
- Modify: `src/lib/profile.ts` (`vatError`, `taxCodeError`), `src/data/local/settings.ts` (`business.paese`, normalizzazione ~213), mappa Firestore delle impostazioni se separata, `src/pages/AccountPage.tsx` (scheda Attività ~127), `src/components/tour/TourPassi.tsx` (~426), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/lib/paese.test.ts`, `src/lib/profile.test.ts`, test di AccountPage e TourPassi

**Interfaces:**
- Produces (in `src/lib/paese.ts`):
  - `export type CodicePaese = 'AT'|'BE'|'BG'|'CY'|'CZ'|'DE'|'DK'|'EE'|'ES'|'FI'|'FR'|'GR'|'HR'|'HU'|'IE'|'IT'|'LT'|'LU'|'LV'|'MT'|'NL'|'PL'|'PT'|'RO'|'SE'|'SI'|'SK'|'GB'|'CH'|'NO'|'ALTRO'`
  - `export const PAESI: CodicePaese[]` (ordine di `nomePaese` nella lingua, `ALTRO` per ultimo — ordinamento fatto dal selettore).
  - `nomePaese(lingua: Lingua, codice: CodicePaese): string` — `Intl.DisplayNames([lingua], { type: 'region' })`; `ALTRO` → chiave i18n `paeseAltro`.
  - `paeseValido(valore: unknown): CodicePaese | null`.
  - `paeseDalFuso(fuso: string | null | undefined): CodicePaese | null` — tabella fuso IANA → paese per i paesi in elenco (es. `Europe/Rome`→IT, `Europe/Paris`→FR, `Europe/Madrid`/`Atlantic/Canary`/`Africa/Ceuta`→ES, `Europe/Berlin`/`Europe/Busingen`→DE, `Europe/London`→GB, `Europe/Zurich`→CH, `Europe/Oslo`→NO, … una voce per ogni capitale/fuso ufficiale dei paesi in elenco); sconosciuto → null.
  - `normalizzaIva(valore: string, paese: CodicePaese): string` — maiuscole, senza spazi/punti/trattini, senza prefisso del paese se presente (per GR il prefisso è `EL`).
  - `erroreIva(valore: string, paese: CodicePaese): 'formato' | null` — vuoto → null; `ALTRO` → null; altrimenti regex del formato ufficiale del paese sul valore normalizzato (IT `^\d{11}$`; FR `^[0-9A-Z]{2}\d{9}$`; ES `^[0-9A-Z]\d{7}[0-9A-Z]$`; DE `^\d{9}$`; AT `^U\d{8}$`; BE `^[01]\d{9}$`; NL `^\d{9}B\d{2}$`; PT `^\d{9}$`; GB `^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$`; CH `^CHE?\d{9}(MWST|TVA|IVA)?$` accettando anche le forme con punti già tolti; NO `^\d{9}(MVA)?$`; gli altri UE con i formati ufficiali VIES).
  - `esempioIva(paese: CodicePaese): string` — un esempio per paese (IT `12345678901`, FR `FR12345678901`, ES `ESX1234567X`, DE `DE123456789`, …).
  - `haCodiceFiscale(paese: CodicePaese): boolean` — solo `IT`.
- `settings.business.paese?: CodicePaese` e `settings.business.paeseScelto?: boolean` (true quando il titolare l'ha scelto a mano); lettura: valore non valido o assente → `IT`.
- In `src/lib/profile.ts`: `vatError(value: string, paese: CodicePaese = 'IT', lingua: Lingua = 'it'): string | null` e `taxCodeError(value: string, lingua: Lingua = 'it'): string | null` con messaggi i18n: `ivaFormato: 'Formato non valido. Esempio: {{esempio}}'`, `cfFormato: '16 lettere o numeri'` (tradurre).
- Etichette campo IVA per paese (chiavi i18n): `ivaIT: 'Partita IVA'`, `ivaES: 'NIF / CIF'`, `ivaFR: 'Numéro de TVA'` (in tutte e tre le lingue resta il termine del paese tra parentesi dopo «Numero IVA»/«VAT number»/«Número de IVA»), generica `ivaAltro: 'Numero IVA'`; chiave `paese: 'Paese'`, `paeseAltro: 'Altro'`.
- UI: in Account (scheda Attività) e nel passo «dati fiscali» del tour: selettore «Paese» (elenco ordinato per nome nella lingua, «Altro» per ultimo) sopra il campo IVA; il campo IVA usa etichetta, controllo ed esempio del paese; il codice fiscale si mostra solo se `haCodiceFiscale(paese)`. Scegliere il paese a mano imposta `paeseScelto: true`.
- Il controllo IVA mostra l'errore anche su un valore già salvato, ma non lo cancella; si blocca il salvataggio solo se il valore non è valido per il paese scelto.

- [ ] **Step 1: Test che falliscono:** `erroreIva('12345678901','IT')` → null, `('IT12345678901','IT')` → null, `('1234','IT')` → `'formato'`; `('FR12345678901','FR')` → null; `('X1234567X','ES')` → null; `('DE123456789','DE')` → null, `('12345678','DE')` → `'formato'`; `('U12345678','AT')` → null; `('NL123456789B01','NL')` → null; `('0123456789','BE')` → null; `('123456789','PT')` → null; `('GB123456789','GB')` → null; `('qualsiasi','ALTRO')` → null; `paeseDalFuso('Europe/Paris')` → `'FR'`, `('America/New_York')` → null; `nomePaese('it','FR')` → «Francia»; lettura impostazioni senza `paese` → `'IT'`; Account: scegliendo «Francia» l'etichetta diventa quella francese, il codice fiscale sparisce, `IT…` di 11 cifre già salvato mostra l'errore e resta nel campo; tour: stesso comportamento.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(profilo): paese del salone e partita IVA nel formato del paese`

### Task 2: Paese dall'indirizzo e dal telefono

**Files:**
- Modify: `functions/src/indirizzi/places.ts` (~72-77, field mask e risposta), `functions/src/index.ts` (callable `dettaglioIndirizzo`), `src/data/firebase/client.ts` (`callDettaglioIndirizzo` ~590), `src/components/ui/IndirizzoInput.tsx`, `src/pages/AccountPage.tsx`, `src/components/tour/TourPassi.tsx`
- Test: `functions/src/indirizzi/places.test.ts`, `src/components/ui/IndirizzoInput.test.tsx`, test di AccountPage

**Interfaces:**
- Consumes: `paeseValido`, `paeseDalFuso` (Task 1).
- `dettaglioDa`/la funzione di dettaglio chiede a Places anche `addressComponents` e restituisce `{ indirizzo: string; paese: string | null }` (paese = `shortText` del componente con tipo `country`, maiuscolo).
- `callDettaglioIndirizzo(placeId, sessione, lingua): Promise<{ indirizzo: string; placeId: string; paese: CodicePaese | null } | null>` (`paeseValido` sul valore ricevuto, fuori elenco → `ALTRO`, assente → null).
- `IndirizzoInput` chiama `onChange` con il paese quando viene scelto un suggerimento (estendere la firma esistente con un campo opzionale `paese`).
- Compilazione automatica in Account e tour: se `paeseScelto !== true`, un paese dall'indirizzo imposta `paese`; altrimenti nulla. Al primo salvataggio di un salone senza `paese` né indirizzo con paese, si usa `paeseDalFuso(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? 'IT'`.

- [ ] **Step 1: Test che falliscono:** places: risposta con `addressComponents: [{ types: ['country'], shortText: 'FR' }]` → `paese: 'FR'`; senza componenti → `paese: null`; client: valore `'US'` → `'ALTRO'`; IndirizzoInput: scegliendo un suggerimento `onChange` riceve `paese`; Account: salone con `paeseScelto` false + indirizzo francese → paese FR; con `paeseScelto` true (IT) + indirizzo francese → resta IT.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS; `cd functions && npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(profilo): il paese si propone dall'indirizzo e dal fuso del telefono`

### Task 3: Email dell'account, errori di accesso, campi obbligatori

**Files:**
- Create: `src/lib/erroriAuth.ts`
- Modify: `src/data/firebase/client.ts` (lettura dell'account all'accesso ~2225-2260 e cambio email ~2495), pagine con cambio password/email/accesso/eliminazione (`src/pages/AccountPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/EliminaAccountPage.tsx`), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/lib/erroriAuth.test.ts`, test del client per l'email, test di AccountPage/LoginPage

**Interfaces:**
- `messaggioAuth(lingua: Lingua, errore: unknown): string` — legge `error.code` (`auth/...`) e restituisce: `wrong-password` e `invalid-credential` → `authPasswordSbagliata` («Password sbagliata»); `too-many-requests` → `authTroppiTentativi` («Troppi tentativi. Riprova tra qualche minuto.»); `email-already-in-use` → `authEmailUsata` («Questa email è già usata da un altro account»); `invalid-email` → `authEmailNonValida`; `requires-recent-login` → `authRientra` («Per sicurezza esci e rientra, poi riprova»); `weak-password` → `authPasswordDebole` («La password deve avere almeno 6 caratteri»); `network-request-failed` → `authRete` («Connessione assente. Riprova.»); `user-not-found` → `authUtenteAssente`; altro → `operazioneKo`. Mai il testo grezzo dell'errore.
- Allineamento email: `allineaEmailAccount(user: { uid: string; email: string | null; emailVerified: boolean }): Promise<void>` in `client.ts` — se `emailVerified` e `normalizeEmail(user.email)` ≠ `accounts/<uid>.email`, `updateDoc` di `{ email }`; chiamata dopo la lettura dell'account all'accesso e quando l'app torna in primo piano; errori ignorati (si riprova al prossimo accesso).
- Campi obbligatori: in Account e nel tour, «Nome della toelettatura» (`business.salonName`) e «Ragione sociale» (`business.name`) vuoti (dopo trim) → errore `campoObbligatorio` («Campo obbligatorio») sotto il campo e salvataggio bloccato. Grep i nomi dei campi nel componente per collegarli correttamente.

- [ ] **Step 1: Test che falliscono:** `messaggioAuth('it', { code: 'auth/wrong-password', message: 'Firebase: Error (auth/wrong-password).' })` → «Password sbagliata»; codice sconosciuto → testo di `operazioneKo`; mai stringhe che contengono «Firebase»; `allineaEmailAccount` con email verificata diversa → `updateDoc` con email minuscola; non verificata → nessuna scrittura; uguale → nessuna scrittura; Account: cambio password con errore `auth/wrong-password` → «Password sbagliata»; salvataggio con nome toelettatura vuoto → «Campo obbligatorio» e nessun salvataggio.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `fix(account): email dell'account allineata, errori di accesso chiari, campi obbligatori`

### Task 4: Privacy e termini in registrazione e lingua della pagina

**Files:**
- Modify: `src/pages/LoginPage.tsx` (~165), punto in cui si applica la lingua (`src/i18n/LinguaContext.tsx`), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/LoginPage.test.tsx` (config lenta), `src/i18n/LinguaContext.test.tsx` (crearlo se manca)

**Interfaces:**
- Testo della casella: chiavi `accettaTerminiPrima: 'Accetto la'`, `accettaTerminiPrivacy: 'privacy'`, `accettaTerminiE: 'e i'`, `accettaTerminiTermini: 'termini'` (o un'unica frase con due segnaposto resi come link, a scelta dell'implementatore purché tradotta); i link puntano a `https://groomlyapp.it/privacy` e `https://groomlyapp.it/termini` (verificare il dominio usato altrove nell'app per i link al sito, es. grep `groomlyapp.it`), si aprono con il meccanismo dei link esterni già usato nell'app (Capacitor Browser o `target="_blank"`); il tocco sul link non cambia la casella (`event.stopPropagation()` e link fuori dalla `<label>` se serve).
- `document.documentElement.lang` = lingua attiva, aggiornato a ogni cambio.

- [ ] **Step 1: Test che falliscono:** registrazione: due link con nomi «privacy» e «termini» e `href` alle due pagine; click sul link → casella ancora non spuntata; cambio lingua a `en` → `document.documentElement.lang === 'en'`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(registrazione): link a privacy e termini; lingua della pagina`

### Task 5: Date e giorni nella lingua dell'app

**Files:**
- Modify: `src/lib/format.ts` (`IT_DATE`), e tutti i suoi usi: `src/components/calendar/WeekRows.tsx`, `src/components/earnings/CumulativeChart.tsx`, `src/components/earnings/ExportSheet.tsx`, `src/lib/backupDoc.ts`, `src/lib/calendarView.ts`, `src/lib/dogList.ts`, `src/lib/earnings.ts`, `src/lib/monthly.ts`, `src/pages/AppointmentForm.tsx`, `src/pages/AppointmentPage.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/DogPage.tsx`, `src/pages/ListinoPage.tsx`, `src/pages/MonthlyPage.tsx`, `src/pages/ReleaseHistoryPage.tsx`
- Test: test esistenti di questi file + nuovi casi in en/es

**Interfaces:**
- `opzioniDate(lingua: Lingua): { locale: Locale; weekStartsOn: 0 | 1 }` in `src/lib/format.ts` — locale date-fns `it`/`enGB`/`es`, settimana da lunedì (1) per tutte e tre. `IT_DATE` resta come alias di `opzioniDate('it')` solo dove il testo è sicuramente per l'italiano (backup/esportazioni intestate in italiano? no: anche queste seguono la lingua) — obiettivo: nessun uso di `IT_DATE` nei componenti; le funzioni di libreria che formattano ricevono `lingua` come parametro (default `'it'` per non rompere i chiamanti non toccati).
- Nessun cambio di formato in italiano.

- [ ] **Step 1: Test che falliscono:** in `en` la vista Settimana mostra «Mon» (non «lun»), il grafico cumulativo mostra «November 2026», l'esportazione degli incassi intesta il mese in inglese; in `es` «noviembre de 2026» (o il formato date-fns `es` corrispondente); in `it` invariato.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare (passare `lingua` da `useLingua()` dove serve).
- [ ] **Step 4:** run → PASS; poi grep `IT_DATE` → solo la definizione (o nessun uso nei componenti).
- [ ] **Step 5: Commit** `feat(i18n): date e giorni nella lingua dell'app`

### Task 6: Testi rimasti in italiano

**Files:**
- Modify: `src/pages/PriceSheetManagePage.tsx`, pagina/componente di esportazione del listino (`PriceSheetExportPage` e componenti), `src/pages/ArchivePage.tsx`, `src/pages/SettingsPage.tsx` (ripristino backup ~445, ~1186), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: test delle pagine toccate

**Interfaces:**
- Ogni testo fisso in italiano nelle pagine elencate passa per `frasi`/`t(...)` con traduzioni en/es (grep di stringhe tra apici con lettere accentate o parole italiane nei file; aria-label compresi).
- Ripristino: la parola di conferma è `frasi.bakParolaSostituisci` (it «SOSTITUISCI», en «REPLACE», es «SUSTITUIR»); il controllo confronta con la parola della lingua attiva; l'istruzione mostrata usa la stessa chiave; cambiare lingua azzera quanto scritto.

- [ ] **Step 1: Test che falliscono:** in `en`: Gestione listino, esportazione del listino, Archivio animali senza testi italiani (asserire alcune frasi tipiche oggi italiane, scelte leggendo i file); ripristino: in `en` «REPLACE» abilita il pulsante, «SOSTITUISCI» no; in `it` «SOSTITUISCI» abilita.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS; poi suite intera `npx vitest run --exclude '.claude/**'`.
- [ ] **Step 5: Commit** `feat(i18n): Gestione listino, esportazione, archivio e ripristino tradotti`

### Task 7: Verifica sull'emulatore e audit

**Files:**
- Create: `QA-tests/.qa-catalog/verify-account-profilo.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (27-30 «risolto»), `PROGRESS.md`

Browser (Playwright, app in modo emu, account con firebase-admin) a 320/360/390 px, in it/en/es dove serve:
- Account: Paese «Francia» → campo «Numéro de TVA», nessun codice fiscale, `FR12345678901` accettato, `123` rifiutato con esempio; Paese «Spagna» → NIF/CIF; Italia invariata; salone esistente senza paese → Italia.
- Indirizzo da suggerimento francese (callable eseguita con `.run()` e Places finto) → paese proposto FR se non scelto a mano.
- Cambio email: dopo verifica (admin `updateUser({ email, emailVerified: true })`) e nuovo accesso → `accounts/<uid>.email` aggiornato.
- Cambio password con password attuale sbagliata → «Password sbagliata»; nome toelettatura vuoto → «Campo obbligatorio».
- Registrazione: link privacy e termini presenti.
- In `en`: incassi/calendario con date inglesi, Gestione listino ed esportazione senza italiano, ripristino con «REPLACE»; `html[lang=en]`.

- [ ] **Step 1:** Ambiente come in PROGRESS.
- [ ] **Step 2:** `node QA-tests/.qa-catalog/verify-account-profilo.cjs` → tutto OK; screenshot in `QA-tests/results/account-profilo/`.
- [ ] **Step 3:** Audit e PROGRESS; commit `docs: Account e profilo 27-30 risolti e verificati`.
