# Conformità nel codice — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrare le accettazioni dei documenti, rispettare chi non vuole email, completare l'esportazione e preparare la parte abbonamenti e licenze, senza toccare i testi legali.

**Architecture:** Accettazioni, consensi e blocchi email passano da callable in `functions/src`. La logica pura sta in `src/lib`, condivisa con le functions come già fa `codaEmail.ts`. `firestore.rules` non cambia: la raccolta `emailBloccate` è leggibile dai membri grazie alla regola generica e scrivibile solo dal server, e `accounts/{uid}/registro` non ha regole.

**Tech Stack:** React 18, TypeScript, Vitest, Firebase Functions v2, Firestore, Brevo, Capacitor.

**Spec:** `docs/superpowers/specs/2026-11-05-conformita-codice-design.md`

## Global Constraints

- Salone `shared`: mai scritture, né nel codice nuovo né nei test. Ogni function nuova lo rifiuta.
- Plus e Salon restano spenti. Niente deploy, niente APK.
- `VERSIONE_DOCUMENTI` resta `1`. Nessuna modifica a `hosting/privacy*`, `hosting/termini`, `hosting/dpa`, `docs/legal/*.html`.
- Non modificare `src/lib/salonPath.ts`, `src/lib/authGate.ts`, `firestore.rules`.
- `src/data/firebase/client.ts`: solo le aggiunte indicate qui, annotate per il riepilogo finale.
- Ogni testo nuovo in `src/i18n/{it,en,es,fr,de}.ts`, o nelle tabelle `Record<Lingua, string>` già usate dalle email.
- Messaggi di commit in italiano, con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Un indirizzo scritto con maiuscole o spazi deve bloccare lo stesso cliente: la chiave normalizza sempre (test nel Task 3).
- Un telefono con l'account in cache e senza rete non deve mai restare chiuso fuori (test nel Task 2).
- Doppio tocco su «Accetto»: una sola accettazione logica, nessun errore (test nel Task 1).
- Un cliente che aggiorna la sua email: il nuovo indirizzo non è bloccato e l'interruttore mostra lo stato del cane finché il salone non lo cambia (test nel Task 4).
- Una raccolta extra illeggibile non deve far fallire tutto il backup (test nel Task 7).

---

### Task 1: Versione dei documenti e registrazione dell'accettazione

**Files:**
- Create: `src/lib/versioneLegale.ts`, `src/lib/versioneLegale.test.ts`, `functions/src/legale/registraAccettazione.ts`, `functions/src/legale/registraAccettazione.test.ts`
- Modify: `src/data/local/auth.ts` (`LocalAccount.termini?`), `src/data/firebase/client.ts` (`writeOwnerSalon`, `toAccount`, nuova `callRegistraAccettazione`), `functions/src/index.ts`

**Interfaces:**
- Produces: `VERSIONE_DOCUMENTI: number`, `DOCUMENTI_IN_VIGORE: { termini: string; privacy: string }`, `type TerminiAccount = { accettati: boolean; at: string; versione?: number; documenti?: { termini: string; privacy: string }; suServer?: boolean }`, `deveRiaccettare(termini: TerminiAccount | undefined, richiesta?: number): boolean`, `mancaSuServer(termini: TerminiAccount | undefined): boolean`.
- Produces: `registraAccettazionePer(input: { uid: string; versione: number; appVersione: string }, archivio: ArchivioAccettazione, adesso: Date): Promise<{ ok: true }>`; `callRegistraAccettazione(): Promise<void>`.

- [ ] **Step 1: Preparare l'ambiente.** `node_modules` del worktree è vuota. Creare giunzioni con `cmd /c mklink /J node_modules D:\Groomly\node_modules` e lo stesso per `functions\node_modules`. A fine lavoro si tolgono con `cmd /c rmdir`, mai con una cancellazione ricorsiva. Lanciare `npx vitest run` e annotare il numero di test verdi di partenza.

- [ ] **Step 2: Test falliti.** In `versioneLegale.test.ts`: `deveRiaccettare(undefined)` e `deveRiaccettare({ accettati: true, at: 'x' })` sono `false`; `deveRiaccettare({ accettati: true, at: 'x' }, 2)` è `true`; con `versione: 2` e `richiesta` 2 è `false`; `VERSIONE_DOCUMENTI` è `1`. `mancaSuServer` è vero solo con `versione` presente e `suServer` assente.
In `registraAccettazione.test.ts`, con archivio in memoria: versione diversa da `VERSIONE_DOCUMENTI` dà `invalid-argument`; il caso buono scrive `termini` con `suServer: true` e l'ora di `adesso`, più una riga `{ tipo: 'documenti' }`; due chiamate di fila con la stessa versione non danno errore e lasciano una sola riga, perché l'id della riga è `documenti-<versione>`.

- [ ] **Step 3:** `npx vitest run src/lib/versioneLegale.test.ts functions/src/legale` deve fallire perché i moduli non esistono.

- [ ] **Step 4: Implementare.** Modulo e function seguono la forma di `silenzioEmail.ts`, con `archivioDaDb`. Callable in `functions/src/index.ts` con `pianoCall`, autenticazione obbligatoria. `writeOwnerSalon` aggiunge `versione` e `documenti` a `termini` e chiama `callRegistraAccettazione` senza far fallire la registrazione, solo con `keepExisting === false`: con Riprova non scrive `termini`. Verificare anche `registerEmail` (`client.ts:2688`): se crea un account documento, stesso trattamento, altrimenti nulla. `toAccount` porta `termini` in `LocalAccount`.

- [ ] **Step 5:** I test del passo 3 e `src/data/firebase/client.test.ts` passano.

- [ ] **Step 6: Commit** `feat(legale): versione dei documenti e accettazione sul server`.

### Task 2: Schermata di riaccettazione

**Files:**
- Create: `src/components/legale/RiaccettaDocumenti.tsx`, `src/components/legale/RiaccettaDocumenti.test.tsx`
- Modify: `src/app/router.tsx` (`Guard`), `src/i18n/*.ts`

**Interfaces:**
- Consumes: `deveRiaccettare`, `mancaSuServer`, `callRegistraAccettazione`, `linkLegale`, `apriEsterno`, `accountNonEliminabile`.
- Produces: `RiaccettaDocumenti({ richiesta?: number, children })`. La prop serve solo ai test per simulare la versione 2.

- [ ] **Step 1: Test falliti.** Con versione attuale i figli si vedono e non c'è schermata. Con `richiesta={2}`: la schermata copre i figli, ha link a privacy, termini e DPA, «Accetto», «Esci», «Elimina account». Con account protetto (`accountNonEliminabile` vero) «Elimina account» non c'è. «Accetto» chiama la function, aggiorna l'account con `replaceAccount` e mostra i figli. Se la function fallisce con `functions/unavailable`, o `navigator.onLine` è falso, si vedono i figli. Con un altro errore si resta sulla schermata con un messaggio. Sul percorso `/impostazioni/account/elimina` i figli si vedono. Con `mancaSuServer` vero parte una sola chiamata silenziosa.

- [ ] **Step 2:** `npx vitest run src/components/legale` fallisce.

- [ ] **Step 3: Implementare** il componente con `ShellFrame`, `Button` e i token del tema, e avvolgere `children` in `Guard`, dentro `StaffLock`. Testi nuovi in 5 lingue: `riaccTitolo`, `riaccTesto`, `riaccAccetto`, `riaccEsci`, `riaccElimina`, `riaccErrore`.

- [ ] **Step 4:** `npx vitest run src/components/legale src/i18n src/app` passa.

- [ ] **Step 5: Commit** `feat(legale): nuova richiesta quando la versione dei documenti sale`.

### Task 3: Blocco email per indirizzo, lato server

**Files:**
- Create: `src/lib/emailBloccate.ts`, `src/lib/emailBloccate.test.ts`, `functions/src/piano/emailCliente.ts`, `functions/src/piano/emailCliente.test.ts`
- Modify: `functions/src/piano/silenzioEmail.ts` e test, `functions/src/piano/giraCoda.ts`, `functions/src/piano/inviaCoda.ts` e test, `functions/src/index.ts`, `src/i18n/emailHtml.ts`

**Interfaces:**
- Produces: `normalizzaEmail(email: string): string` (riusare quella esistente se c'è in `functions/src` o `src/lib`), `chiaveEmail(email: string): Promise<string>` con sha256 esadecimale.
- Produces: `ArchivioSilenzio` esteso con `leggiEmailToken(salonId, token): Promise<{ email: string; dogId: string | null } | null>`, `caniConEmail(salonId, email): Promise<string[]>`, `scriviBlocco(salonId, email, fonte): Promise<void>`, `togliBlocco(salonId, email): Promise<void>`.
- Produces: `impostaEmailClientePer(input: { uid: string; salonId: string; ruolo: string; dogId: string; bloccata: boolean }, archivio): Promise<{ ok: true }>`.

- [ ] **Step 1: Test falliti.** `chiaveEmail(' A@B.it ')` è uguale a `chiaveEmail('a@b.it')`. `silenzioEmailPer` con due cani stessa email: entrambi `emailBloccata`, righe di entrambi fermate, blocco scritto con `fonte: 'link'`. Riga senza email: si comporta come oggi. Token di un'offerta di posto libero: blocco dell'email dell'iscritto, senza cane. `shared` rifiutato. `impostaEmailClientePer`: `collaboratore` dà `permission-denied`, `shared` è rifiutato, `bloccata: false` toglie il blocco e spegne il flag su tutti i cani con quell'indirizzo. In `inviaCoda.test.ts`: indirizzo in elenco non spedisce, riga segnata `fermata`; `inviaOfferteAttesa` salta l'iscritto bloccato e il corpo dell'email inviata contiene il link `mode=silenzio`.

- [ ] **Step 2:** `npx vitest run functions/src/piano src/lib/emailBloccate.test.ts` fallisce.

- [ ] **Step 3: Implementare.** Blocco in `salons/{salonId}/emailBloccate/{chiave}` con `{ email, at, fonte }`. `giraCoda` legge la raccolta nel suo `Promise.all` e passa `bloccate: ReadonlySet<string>` agli invii. Per `shared` la lettura è ammessa, nessuna scrittura. L'offerta conserva `tokenSilenzio` generato come in `inviaCoda.ts:171`. `mailPostoLibero` aggiunge il link con la frase `SILENZIO`. Aggiungere il parametro facoltativo `headers` a `postBrevoHtml`, poi `List-Unsubscribe` con l'URL `/azione` nelle email con link. Callable `impostaEmailCliente` in `index.ts`.

- [ ] **Step 4:** I test del passo 2 passano, e `npm --prefix functions run build` compila.

- [ ] **Step 5: Commit** `feat(email): la disiscrizione vale per l'indirizzo in tutto il salone`.

### Task 4: Interruttore nella scheda e pagina del link

**Files:**
- Modify: `src/pages/DogPage.tsx:1282,1537`, `src/pages/DogPage.test.tsx`, `src/data/firebase/client.ts` (nuova `callImpostaEmailCliente`), `hosting/azione/index.html`, `hosting/lingue.test.ts` se elenca le frasi, `src/i18n/*.ts`

**Interfaces:**
- Consumes: callable `impostaEmailCliente` del Task 3.
- Produces: `callImpostaEmailCliente(dogId: string, bloccata: boolean): Promise<void>`.

- [ ] **Step 1: Test falliti.** L'interruttore «Email al cliente» si vede per titolare e socio con `contact.email`. Non si vede senza email, per il collaboratore, nel salone `shared`. Toccarlo chiama la callable con `bloccata` opposto a `dog.emailBloccata === true`. Se fallisce, il valore torna indietro e compare il toast. Un cane con `emailBloccata: true` e un'email appena cambiata mostra ancora spento.

- [ ] **Step 2:** `npx vitest run src/pages/DogPage.test.tsx` fallisce.

- [ ] **Step 3: Implementare.** Il `Toggle` sostituisce il riquadro «Riattiva»; togliere `riattivaMail`. In `hosting/azione/index.html` aggiornare `silenceBody` e `silenceDoneBody` nelle 5 lingue: si esce da tutte le email di quel salone, restano quelle legate a una prenotazione.

- [ ] **Step 4:** `npx vitest run src/pages/DogPage.test.tsx hosting src/i18n` passa.

- [ ] **Step 5: Commit** `feat(email): interruttore delle email nella scheda cliente`.

### Task 5: Consenso promozionale, lato server

**Files:**
- Create: `functions/src/promo/consensoPromo.ts`, `functions/src/promo/inviaPromo.ts`, relativi test
- Modify: `functions/src/index.ts`, `hosting/azione/index.html`, `src/data/firebase/client.ts` (nuova `callImpostaEmailPromo`), `src/data/local/auth.ts` (`LocalAccount.emailPromo?`)

**Interfaces:**
- Produces: `type EmailPromo = { attivo: boolean; at: string; fonte: 'tour' | 'account' | 'link'; token?: string }`, in `src/lib/versioneLegale.ts`.
- Produces: `impostaEmailPromoPer(input: { uid: string; attivo: boolean; fonte: 'tour' | 'account' }, archivio, adesso)`, `disiscriviPromoPer(input: { uid: string; token: string }, archivio, adesso)`.
- Produces: `inviaPromo(input: { uid: string; oggetto: string; html: string; apiKey: string }, archivio, posta?): Promise<'inviata' | 'senza-consenso'>`. Da qui passeranno le Comunicazioni della Console.

- [ ] **Step 1: Test falliti.** `impostaEmailPromoPer` scrive il campo e una riga di registro `{ tipo: 'email-promo', attivo, fonte, at }`. `disiscriviPromoPer` con token sbagliato dà `not-found`; con quello giusto spegne con `fonte: 'link'`; ripetuto non dà errore. `inviaPromo` senza `emailPromo`, o con `attivo: false`, ritorna `'senza-consenso'` e non chiama la posta. Con `attivo: true` crea il token se manca, e l'html contiene `mode=promo&uid=` e la frase di disiscrizione nella lingua dell'account; il messaggio ha `List-Unsubscribe`.

- [ ] **Step 2:** `npx vitest run functions/src/promo` fallisce.

- [ ] **Step 3: Implementare** moduli, callable `impostaEmailPromo` (autenticata) e `disiscriviPromo` (pubblica) e il nuovo `mode === 'promo'` in `hosting/azione`, con testi in 5 lingue. Gli inviti alla beta non passano da qui.

- [ ] **Step 4:** I test passano, e `npm --prefix functions run build` compila.

- [ ] **Step 5: Commit** `feat(email): consenso promozionale e disiscrizione per i saloni`.

### Task 6: Domanda nel tour e interruttore nell'account

**Files:**
- Modify: `src/pages/TourPage.tsx`, `src/pages/TourPage.test.tsx`, `src/components/tour/TourPassi.tsx`, `src/pages/AccountPage.tsx:478`, `src/pages/AccountPage.test.tsx`, `src/i18n/*.ts`

**Interfaces:**
- Consumes: `callImpostaEmailPromo(attivo: boolean, fonte: 'tour' | 'account'): Promise<void>`, `gate.account.emailPromo`.

- [ ] **Step 1: Test falliti.** Dopo l'ultimo passo compare la schermata promo, con «Sì» e «No, grazie» e niente selezionato. Ogni risposta chiama la callable con `fonte: 'tour'` e porta a `fine`. Con `emailPromo` già presente si va dritti a `fine`. Il tasto di uscita non chiama nulla. Se la chiamata fallisce il tour prosegue. `passiCompletamento` non cambia. In `AccountPage`: l'interruttore si vede anche al collaboratore e chiama con `fonte: 'account'`.

- [ ] **Step 2:** `npx vitest run src/pages/TourPage.test.tsx src/pages/AccountPage.test.tsx` fallisce.

- [ ] **Step 3: Implementare** `{ tipo: 'promo' }` in `Schermata`, con `PassoPromo` in `TourPassi.tsx`, e l'interruttore in Privacy e dati, fuori dal blocco nascosto ai collaboratori. Testi: `tourPromoTitolo`, `tourPromoSotto`, `tourPromoSi`, `tourPromoNo`, `accEmailPromo`, `accEmailPromoDettaglio`.

- [ ] **Step 4:** I test passano.

- [ ] **Step 5: Commit** `feat(email): domanda sulle email promozionali nel tour`.

### Task 7: Esportazione completa

**Files:**
- Modify: `src/data/firebase/backupCollect.ts`, `src/lib/backupCompleto.ts`, `src/lib/backupZip.ts`, `src/lib/registroXlsx.ts`, `src/lib/registroModello.ts`, `src/pages/AccountPage.tsx`, `src/data/firebase/client.ts` (nuova `leggiMioAccount`), relativi test, `src/i18n/*.ts`

**Interfaces:**
- Produces: `type AltriDati = { richieste: Record<string, unknown>; attesa: Record<string, unknown>; coda: Record<string, unknown> }`, restituito accanto al bundle, non dentro `GroomlyDati`.

- [ ] **Step 1: Test falliti.** Il backup completo contiene `dati/altri-dati.json` e `dati/account.json`. L'Excel ha i fogli `regRichieste`, `regAttesa`, `regEmail`. Una raccolta che fallisce la lettura resta vuota, compare nel `manifest` come non letta e il backup finisce. `versioneFormato` resta 1. Un backup senza i file nuovi si ripristina come prima, e il ripristino non legge `altri-dati.json`. In `AccountPage` il collaboratore vede «Scarica i miei dati» e il download contiene il suo account, senza token promozionale.

- [ ] **Step 2:** `npx vitest run src/lib/backup src/lib/registro src/data/firebase src/pages/AccountPage.test.tsx` fallisce nei casi nuovi.

- [ ] **Step 3: Implementare.** Solo letture, anche su `shared`. Il token va tolto da `account.json`.

- [ ] **Step 4:** I test passano.

- [ ] **Step 5: Commit** `feat(backup): esportazione con richieste, attesa, coda e account`.

### Task 8: Regole Storage

**Files:**
- Create: `storage.rules`, `src/lib/storageRules.emulator.test.ts`, `scripts/test-storage-emulator.mjs`
- Modify: `firebase.json`, `firebase.emu.json` se serve, `vitest.rules.config.ts`, `package.json` (script `test:storage`)

- [ ] **Step 1: Test falliti.** Con `@firebase/rules-unit-testing`, progetto `demo-groomly`: il proprietario scrive e legge `users/u1/backups/2026-11-05.json`; `u2` non legge né scrive lì; chi non è autenticato no; `altro/file.json` è negato a tutti.

- [ ] **Step 2:** `npm run test:storage` fallisce, con emulatore avviato da `firebase emulators:exec --only storage --project demo-groomly`. Usare il Java 21 di Android Studio, come da nota del progetto.

- [ ] **Step 3: Implementare** `storage.rules` con `match /users/{uid}/{allPaths=**}` e sezione `"storage": { "rules": "storage.rules" }`.

- [ ] **Step 4:** `npm run test:storage` e `npm run test:rules` passano. Per il secondo usare `FIRESTORE_EMULATOR_JAR=D:\Groomly\cloud-firestore-emulator-v1.19.8.jar`. Annotare l'esito nella voce 9 di `docs/legal/STATO-CONFORMITA.md`.

- [ ] **Step 5: Commit** `feat(sicurezza): regole Storage nel progetto, con test`.

### Task 9: Rinnovo dichiarato e disdetta

**Files:**
- Modify: `src/lib/abbonamento.ts` e test, `src/components/abbonamento/Vetrina.tsx` e test, `src/pages/AbbonamentoPage.tsx` e test, `src/i18n/*.ts`

**Interfaces:**
- Consumes: `idAbbonamenti.ts`, `PREZZI`, `apriEsterno`.
- Produces: `linkGestionePlay(prodotto?: string): string`, `mostraGestionePlay(stato: StatoPiano, titolare: boolean): boolean`, `fineProva(adesso: Date): Date` con 30 giorni.

- [ ] **Step 1: Test falliti.** `linkGestionePlay('groomly_plus')` è `https://play.google.com/store/account/subscriptions?sku=groomly_plus&package=it.groomly.app`; senza prodotto ha solo `package`. `mostraGestionePlay` è vero solo con `fonte: 'play'` e stato attivo, grazia o disdetto, e per il titolare. Vetrina con `acquisto: 'abbonati'`: si leggono prezzo, «al mese», rinnovo automatico e disdetta su Google Play. Con prova disponibile: data di fine, nessuna carta, ritorno a Go senza addebiti. Con `acquisto: 'avvisami'`: nessun testo nuovo di rinnovo. `AbbonamentoPage`: «Gestisci / Disdici» e la riga sul ritorno a Go solo con `mostraGestionePlay`; a piani spenti la pagina resta identica.

- [ ] **Step 2:** `npx vitest run src/lib/abbonamento src/components/abbonamento src/pages/AbbonamentoPage.test.tsx` fallisce.

- [ ] **Step 3: Implementare.** Sostituire `LINK_PLAY_ABBONAMENTI` con `linkGestionePlay()`, anche nel link del pagamento in sospeso e in `EliminaAccountPage.tsx:21`, aprendo con `apriEsterno`. Testi: `vetRiepilogoRinnovo`, `vetRiepilogoProva`, `abbGestisci`, `abbDopoDisdetta`.

- [ ] **Step 4:** I test passano.

- [ ] **Step 5: Commit** `feat(abbonamenti): rinnovo dichiarato e gestione su Google Play`.

### Task 10: Frasi, asset e licenze

**Files:**
- Create: `docs/licenze_asset.md`, `scripts/genera-licenze.mjs`, `src/data/licenze.json`, `src/data/licenze.test.ts`, `src/pages/LicenzePage.test.tsx`
- Modify: `src/pages/LicenzePage.tsx`, `src/i18n/*.ts`, `package.json` (script `licenze`)

**Interfaces:**
- Produces: `licenze.json` come `Array<{ nome: string; versione: string; licenza: string }>`, ordinato per nome, senza dipendenze di sviluppo, dai due `package-lock.json`.

- [ ] **Step 1: Test falliti.** `licenze.test.ts`: ogni pacchetto di produzione nei due lockfile è in `licenze.json`, nessuna licenza vuota, nessuna voce con GPL o AGPL come unica licenza; `jszip` risulta `MIT`. `LicenzePage.test.tsx`: mostra `react`, `exceljs`, `jszip` con la licenza.

- [ ] **Step 2:** `npx vitest run src/data/licenze.test.ts src/pages/LicenzePage.test.tsx` fallisce.

- [ ] **Step 3: Implementare.** Script e pagina con una lista compatta, nome e versione a sinistra, licenza a destra. Per `buffers` e `limiter` cercare la licenza nel loro pacchetto; se manca, registrarlo in `docs/licenze_asset.md` e nello script come «da verificare». `docs/licenze_asset.md` elenca loghi e icone come opera propria su dichiarazione dell'utente e i font con OFL. `vetrinaFoto` e `pwCopieCloudTesto` perdono «al sicuro» nelle 5 lingue. Aggiornare in `STATO-CONFORMITA.md` le voci chiuse.

- [ ] **Step 4:** I test passano.

- [ ] **Step 5: Commit** `feat(licenze): elenco completo dei pacchetti e degli asset`.

### Task 11: Verifica finale

- [ ] **Step 1:** `npx vitest run`, `npm run build`, `npm --prefix functions run build`, `npm run test:rules`, `npm run test:storage`: tutti verdi, oltre il numero di partenza del Task 1.

- [ ] **Step 2: Prova su saloni finti.** Con `npm run emu` e il progetto `demo-*`: registrazione con tour e consenso, disiscrizione dal link con due cani, interruttore nella scheda, simulazione della versione 2 con la prop, esportazione. Nessuna chiamata a produzione.

- [ ] **Step 3: Pulizia.** Fermare gli emulatori, eliminare i dati di test, togliere le giunzioni con `cmd /c rmdir node_modules` e `cmd /c rmdir functions\node_modules`.

- [ ] **Step 4: Riepilogo.** Ramo, parti di `client.ts` toccate, ordine di pubblicazione (prima functions, poi APK), avvertenza su `storage.rules` in un `firebase deploy` completo, cose da fare a mano. Commit di `STATO-CONFORMITA.md` aggiornato.
