# Ultimo giro — piano unico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le nove zone di `docs/GROOMLY-ULTIMO-GIRO.md` lasciando la 1.1.97 pronta e la 1.1.96 come unica versione pubblicata.

**Architecture:** Gli strumenti gratuiti sono tre booleani nelle impostazioni, spenti se assenti. Le date visibili passano da `src/i18n/format.ts`. L’avviso di aggiornamento legge `hosting/release.json`, che non supera l’ultimo tag GitHub. Le email di campione e la prenotazione pubblica riusano le funzioni già scritte.

**Tech Stack:** React, Vite, Vitest, Firebase Functions, Capacitor Android, Playwright sull’emulatore `demo-groomly`.

Decisioni: `docs/DECISIONI-AUTOMATICHE.md` D41–D50. Specifica: `docs/superpowers/specs/2026-10-26-ultimo-giro-design.md`. Il committente ha chiesto di non aspettare un’altra conferma.

## Global Constraints

- `hosting/release.json` resta `1.1.96` con url `https://groomlyapp.it/groomly.apk`.
- `mostraPiani` e `abbonamentiAttivi` restano false nel default. App Check resta spento.
- Mai leggere o scrivere `salon/shared`, il salone di Laura o Troddioni. Prove solo su `demo-groomly`.
- APK GitHub firmato con la chiave debug di oggi. La chiave nuova solo per l’AAB `play`. L’APK 1.1.97 non si copia in `hosting/groomly.apk`.
- Nessuna release GitHub. Il file pronto è `docs/play/release-1.1.97.json` con url `https://groomlyapp.it/groomly-1.1.97.apk`.
- Regole Firestore: nessun deploy se il file non cambia.
- Test prima della modifica. Un commit per task. `docs/PROGRESSO-PIANO.md` aggiornato dopo ogni task. `npm test` e `npm run build` verdi prima della versione.
- Fuori giro: WhatsApp automatico, crediti, billing a mano, foto su Storage, accensione dei piani, lingue oltre it/en/es.

---

### Task 1: `release.json` non supera il tag pubblicato

**Files:**
- Create: `src/lib/releasePubblicata.ts`, `src/lib/releasePubblicata.test.ts`
- Modify: nessuno su `hosting/release.json` se è già 1.1.96

**Interfaces:**
- Produces: `versioneSupera(candidata: string, pubblicata: string): boolean`
- Produces: `tagPubblicato(tag: string): string` toglie il prefisso `v`

- [ ] **Step 1: Test rosso**

`versioneSupera('1.1.97', '1.1.96')` è true. `versioneSupera('1.1.96', '1.1.96')` è false. `tagPubblicato('v1.1.96')` è `1.1.96`. Il test legge `hosting/release.json` e l’output di `gh release view --repo robmass83-ui/Groomly --json tagName` e si aspetta che la versione del file non superi il tag. Se `gh` esce con errore, il test fallisce.

- [ ] **Step 2:** Eseguire il test e vederlo rosso perché il modulo non c’è.
- [ ] **Step 3:** Implementare il confronto con le parti numeriche `major.minor.patch`.
- [ ] **Step 4:** Test verde. Registro. Commit `test: release.json non supera la versione pubblicata`.

### Task 2: URL dell’APK con la versione

**Files:**
- Modify: `src/lib/releasePubblicata.ts`, `src/lib/releasePubblicata.test.ts`
- Create a fine giro: `docs/play/release-1.1.97.json` (task 16). Qui solo la funzione.

**Interfaces:**
- Produces: `urlApk(versione: string): string` → `https://groomlyapp.it/groomly-<versione>.apk`
- `urlPubblicatoAccettato(versioneJson: string, url: string, tag: string): boolean` è true se l’url è `groomly.apk` e la versione è uguale al tag, oppure se l’url è quello di `urlApk(versioneJson)` e la versione non supera il tag.

- [ ] **Step 1: Test rosso** sul caso 1.1.96 + `groomly.apk` (accettato) e sul caso 1.1.97 + `groomly.apk` (rifiutato) e sul caso 1.1.97 + url versionato (accettato solo nel file pronto, non in hosting).
- [ ] **Step 2:** Implementare. `hosting/release.json` non si modifica.
- [ ] **Step 3:** Registro. Commit `test: l apk nuovo si scarica solo con il nome della versione`.

### Task 3: Interruttori Strumenti, spenti

**Files:**
- Modify: `src/data/local/settings.ts`, `src/pages/PianoPagine.tsx`, `src/pages/SettingsPage.tsx`, `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/strumenti.test.tsx`

**Interfaces:**
- `SettingsMain.strumenti?: { messaggi?: boolean; affidabilita?: boolean; noteVocali?: boolean }`
- `strumentoAcceso(settings, chiave): boolean` è true solo se il booleano è true.

- [ ] **Step 1: Test rosso.** Con impostazioni vuote, Impostazioni mostra «Strumenti» e tre interruttori `aria-pressed=false`. Home e scheda non hanno «Promemoria WhatsApp». `mostraPiani` nel test è false.
- [ ] **Step 2:** Eseguire e vederlo rosso.
- [ ] **Step 3:** Sezione e pagina. Il salvataggio scrive i tre campi. In italiano le etichette sono «Messaggi WhatsApp», «Affidabilità», «Note vocali». Inglese e spagnolo dal vocabolario.
- [ ] **Step 4:** Test verde. Registro. Commit `feat: gli strumenti gratuiti sono spenti finche non si accendono`.

### Task 4: F1, link wa.me

**Files:**
- Create: `src/lib/messaggiManuali.ts`, `src/lib/messaggiManuali.test.ts`
- Modify: `src/pages/DogPage.tsx`, `src/pages/AppointmentPage.tsx`, i tre cataloghi

**Interfaces:**
- `testoMessaggio(lingua, tipo, valori): string` con tipi `promemoria | conferma | pronto | richiamo | auguri`
- `linkMessaggio(telefono, testo): string | null` usa `normalizzaTelefono` e `urlWhatsApp`. Null se il numero non è un cellulare italiano.

Il foglio mostra il testo in un campo modificabile. Il link usa il testo del campo, firma inclusa. La lingua è `settings.linguaClienti ?? 'it'`. Il foglio c’è solo se `strumenti.messaggi === true`.

- [ ] **Step 1: Test rosso.** `linkMessaggio('333 1234567', 'Ciao Luna')` è `https://wa.me/393331234567?text=Ciao%20Luna`. Il testo inglese contiene `Made with Groomly` e non contiene `Fatto con`.
- [ ] **Step 2:** Test di scheda: con l’interruttore acceso e un cane il cui telefono è `333 1234567`, il link del promemoria ha quel numero e il testo nella lingua dei clienti.
- [ ] **Step 3:** Implementare il minimo. Niente «Invia tutti».
- [ ] **Step 4:** Registro. Commit `feat: i messaggi whatsapp manuali si aprono solo se accesi`.

### Task 5: F2 e F3

**Files:**
- Modify: `src/lib/affidabilita.ts` solo se l’etichetta va tradotta tramite un argomento lingua, senza cambiare il risultato italiano
- Modify: scheda e appuntamento per il chip e il microfono
- Test: accanto a `src/lib/controlli.test.ts` e un test di pagina

`etichettaAffidabilita` resta la regola dei tre «non venuto» in sei mesi. La stringa visibile viene dal vocabolario. Il microfono, se F3 è acceso e `MediaRecorder` c’è, registra e aggiunge `{ id, dataUrl, createdAt }` in `noteVocali` del cane o dell’appuntamento. Spento, niente icona.

- [ ] **Step 1: Test rosso** sull’etichetta inglese e sull’assenza del microfono a interruttore spento.
- [ ] **Step 2:** Implementare.
- [ ] **Step 3:** Registro. Commit `feat: affidabilita e note vocali compaiono solo se accese`.

### Task 6: Date e etichette fiscali

**Files:**
- Modify: `src/lib/earnings.ts` per i titoli visibili
- Modify: `src/i18n/es.ts` `authIva` → `NIF / CIF`
- Modify: lo schema che rende obbligatoria la partita IVA in Impostazioni e in registrazione, così il vuoto è valido
- Test: un periodo ottobre 2026 in inglese non contiene `Ottobre` né `ottobre`. Lo spagnolo non contiene `Partita`.

`IT_DATE` resta per `startOfWeek` e per le chiavi. Non si cambia il lunedì come inizio settimana.

- [ ] **Step 1: Test rosso.**
- [ ] **Step 2:** I titoli passano da `meseAnno` / `dataBreve` / `meseCorto` con la lingua della persona. L’italiano resta «Ottobre 2026» se il test di oggi lo pretende.
- [ ] **Step 3:** Registro. Commit `fix: mesi e partita iva seguono la lingua`.

### Task 7: Controllo a schermo

**Files:**
- Create: `src/lib/italianoSchermo.ts`, `src/lib/italianoSchermo.test.ts`, `tests/e2e/lingueSchermo.cjs`

Il test unitario: «No appointments» passa; «Nessun appuntamento» fallisce; «Groomly» e «WhatsApp» passano; «Nala» passato tra gli ammessi passa.

Lo script Playwright, se l’emulatore e il dev server partono, apre le route e fallisce sulle parole. Le correzioni trovate stanno in questo task, un commit se il diff è una sola zona, altrimenti un commit per zona come D38.

- [ ] **Step 1: Test rosso del giudice.**
- [ ] **Step 2:** Implementare il giudice.
- [ ] **Step 3:** Lanciare lo script. Correggere i testi che trova, date escluse se già chiuse dal task 6.
- [ ] **Step 4:** Registro, con l’esito dello script o il motivo se l’emulatore non parte. Commit `test: lo schermo in inglese e spagnolo non mostra italiano`.

### Task 8: Campione email

**Files:**
- Create: `functions/src/campioneEmail.ts`, `functions/src/campioneEmail.test.ts`
- Modify: `functions/src/index.ts`, `src/pages/SettingsPage.tsx`

**Interfaces:**
- `pianoCampione(): { tipo: TipoEmail; lingua: 'it' | 'en' | 'es' }[]` lunghezza 30
- `inviaCampione(input: { email: string | null; apiKey?: string; invia: (to: string, oggetto: string, html: string) => Promise<void> }): Promise<{ spedite: number; motivo?: 'chiave assente' | 'negato' }>`

Destinatario fisso `info@groomlyapp.it`. Email chiamante diversa da `ROBERTO_EMAIL` → `negato` e zero invii. Chiave assente → zero invii e la funzione `invia` non è chiamata.

- [ ] **Step 1: Test rosso.**
- [ ] **Step 2:** Callable e pulsante. Sull’emulatore, se parte, la callable senza chiave non spedisce.
- [ ] **Step 3:** Registro: lancio dal telefono bloccato da Roberto. Commit `feat: roberto puo spedire il campione delle email solo a info`.

### Task 9: Modulo pubblico e collaboratore spento

**Files:**
- Modify: `hosting/salone/index.html` con il modulo nelle tre lingue
- Test: `src/lib/prenotazione` già copre l’HTML; aggiungere un test che il modulo della pagina contiene i tre `data-lang` e i campi nome, email, telefono, inizio, fine, esca
- Modify: il seed del 360 se il collaboratore spento non c’è
- Modify: il tour, se l’emulatore parte

Il modulo chiama la callable `inviaRichiesta` del progetto emulatore quando la pagina è servita da lì, e il progetto vero quando è online. Non si mandano richieste al salone di Laura: lo script di prova usa solo l’emulatore e un salonId finto.

- [ ] **Step 1: Test rosso** sul HTML della pagina.
- [ ] **Step 2:** Modulo. Le etichette inglesi e spagnole non contengono le parole del task 7.
- [ ] **Step 3:** Seed e giro. Se l’emulatore non parte, registro con il motivo, senza provare sul progetto vero.
- [ ] **Step 4:** Commit `feat: la pagina del salone ha il modulo di prenotazione`.

### Task 10: Misura del primo dato

**Files:**
- Create: `src/lib/primoDato.ts`, `src/lib/primoDato.test.ts`
- Modify: `src/app/App.tsx` o il punto in cui l’agenda consegna il primo risultato, e `SettingsPage.tsx`

**Interfaces:**
- `segnaApertura(adesso: number): number`
- `segnaPrimoDato(apertura: number, adesso: number): number` differenza, mai negativa
- La riga in Info c’è solo se `isOperator`.

- [ ] **Step 1: Test rosso.**
- [ ] **Step 2:** Salvataggio locale `groomly.primoDatoMs`. Togliere un’attesa individuata nel codice che non porta il primo dato, e scrivere prima/dopo nel registro. Se non c’è un’attesa evitabile, scriverlo e non inventarne una.
- [ ] **Step 3:** Commit `feat: l operatore vede quanto ci mette il primo dato`.

### Task 11: Documenti

**Files:**
- I piani elencati in D49
- `docs/Groomly_Abbonamenti_PIANO.md`, `docs/Groomly_Controlli_Avanzati_PIANO.md`
- Spostare `fix/groomly-fix-ux.md` in `docs/archive/` e aggiungere la nota in cima
- `docs/DA-FARE-ROBERTO.md`, `docs/GROOMLY-COSA-RESTA.md` aggiornati a 1.1.96 pubblicata e 1.1.97 pronta (la 1.1.97 si nomina già qui come destinazione; il file release si crea al task 16)

- [ ] **Step 1:** Righe e tabelle. Non spuntare caselle non verificate: la riga rimanda al registro.
- [ ] **Step 2:** Commit `docs: lo stato dei piani e la versione pubblicata 1.1.96`.

### Task 12: Confronto scheda nido

**Files:**
- Create: `docs/archive/confronto-scheda-nido.html`
- Non modificare `DogPage.tsx` per assomigliare al nido

Due colonne per il chiaro e due per lo scuro. Stesso cane finto: nome Luna, razza Barbone, proprietaria Giulia, telefono 333 1234567. Le immagini sono screenshot se i due server partono (main e `D:/Groomly/.worktrees/scheda-nido`); se il worktree non parte, la pagina disegna i due layout con i pezzi letti dai due `DogPage.tsx` e lo scrive. Il ramo non si unisce. La scelta è bloccata da Roberto.

- [ ] **Step 1:** Pagina. Commit `docs: confronto della scheda nido senza unirla`.

### Task 13: Test 360 e versione pronta

**Files:**
- Create: `docs/Groomly_Test360_RAPPORTO_FINALE_2.md`
- Modify: versioni a 1.1.97, `docs/play/release-1.1.97.json`
- Non modificare `hosting/release.json`

- [ ] **Step 1:** `npm test` e `npm run build`. Se rossi, non si alza la versione.
- [ ] **Step 2:** Giro emulatore: ruoli × tre lingue, offline, prenotazione, HTML email. Rapporto con gli esiti. Se l’emulatore non parte, il rapporto lo dice e non si usa il progetto vero.
- [ ] **Step 3:** Alzare la versione. APK `assembleGithubDebug` copiato in `groomly.apk` nella radice (gitignored), non in `hosting/`. AAB `bundlePlayRelease` se il keystore c’è; se manca, bloccato da Roberto.
- [ ] **Step 4:** Deploy `functions,hosting` solo se `hosting/release.json` è ancora 1.1.96 e l’APK in `hosting/` non è stato sostituito dalla 1.1.97. Nessuna `gh release`.
- [ ] **Step 5:** Registro e commit `chore: la 1.1.97 e pronta e la 1.1.96 resta pubblicata`. Fermarsi e scrivere a Roberto come provarla.
