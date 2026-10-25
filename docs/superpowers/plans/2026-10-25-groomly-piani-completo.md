# Groomly piani completi — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le falle del test 360°, unire i rami, e consegnare i piani Base / Pro / Salone con le funzioni di lancio, tenendo spenti acquisti, WhatsApp automatico e crediti, senza mai toccare il salone vero di Laura.

**Architecture:** La verità del piano è `salons/{id}/pro/main`, scritta solo dalle Cloud Functions. `src/lib/piano.ts` decide l’accesso. L’interfaccia usa `ProGate`. La pagina pubblica non legge Firestore. I test parlano solo con gli emulatori del progetto `demo-groomly`.

**Tech Stack:** React 18, Vite, Vitest, happy-dom, Capacitor 8, Firestore rules, Cloud Functions v2 `europe-west1`, Brevo, Playwright, Firebase emulator suite.

**Spec:** `docs/superpowers/specs/2026-10-25-groomly-piani-completo-design.md`. In caso di conflitto vince la spec.

## Global Constraints

- Non leggere né scrivere `groomly-3128b` dagli script di test. Project id degli script: `demo-groomly`. Gli script si fermano se manca `FIRESTORE_EMULATOR_HOST` o `FIREBASE_AUTH_EMULATOR_HOST`, o se il project id non inizia con `demo-`.
- Non toccare il salone vero di Laura, `salon/shared`, Troddioni (`robmass83@gmail.com`) e i loro account. L’omaggio Salone di Laura è un clic dell’operatore, dopo la pubblicazione, mai uno script.
- `APP_VERSION` resta `1.1.93` fino al task finale. Lì diventa `1.1.94`, `versionCode` `10194`, negli stessi quattro file della regola di pubblicazione.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`, `test-results/`, log degli emulatori.
- Non cambiare la git config. Non saltare gli hook. Non fare amend. Non fare force push. Shell PowerShell: un comando alla volta, senza `&&`.
- Nessun `firebase deploy` su `groomly-3128b`. Il task 37 prepara versione, APK e release GitHub; il deploy resta in `docs/DA-FARE-ROBERTO.md`.
- `tsconfig` ha `noUnusedLocals` e `noUnusedParameters`. Prima di ogni commit di codice: `npx tsc --noEmit` e i test del task. `npm test` non deve usare la rete.
- Testi nuovi solo in `src/i18n/it.ts`. Prezzi mai nel codice: solo id prodotto `groomly_pro`, `groomly_salone`, base plan `mensile`, `annuale`, `mensile-3` … `mensile-8`, `annuale-3` … `annuale-8`.
- `kind: 'pelosetto'` resta il valore salvato. Cambia solo l’etichetta visibile.
- WhatsApp automatico, crediti, flavor Play e rimozione dell’APK non si implementano. `canaleAuto` resta `"email"`. `REQUEST_INSTALL_PACKAGES` resta.
- Con `mostraPiani` false le uniche novità visibili sono Privacy e Elimina account.
- Ogni fase di prodotto finisce con i suoi test verdi e `npm run build`. La pubblicazione è un solo task, l’ultimo.
- I passi che richiedono Play Console, Meta, DNS, account, commercialista o un clic sul salone vero vanno in `docs/DA-FARE-ROBERTO.md` e si saltano.

## Stato al commit f60df42

| Task | Stato |
|---|---|
| 0, 1, 2, 4, 8 | Fatti (commit citati nella spec). Non si rifanno. |
| 5 | Quasi: F5 vero, M11 e M13 aperti. |
| 3, 6, 7, 9–37 | Da fare. |
| `npm test` | 9 rossi. Il push di `main` manca (`origin/main` = `8ea3fc4`). |

## Ripartenza — si esegue prima del resto

Ordine: R1, R2, R3, R4, R5 (push), poi il resto di 5 (M11, M13), 7, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 21, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37. I task 13 è solo una riga in `DA-FARE-ROBERTO.md`.

### Task R1: F5 con le regole vere

**Files:**
- Modify: `src/lib/salonRoster.ts` (`elencoNegato?: boolean` su `SalonAccess`)
- Modify: `src/lib/accessoSospeso.ts`, `src/lib/accessoSospeso.test.ts`
- Modify: `src/data/firebase/client.ts` (`watchSalonAccess`)
- Modify: `src/components/AccessoSospeso.tsx` (passa l’uid)
- Modify: `src/lib/firestoreRules.emulator.test.ts`
- Test: `src/data/firebase/client.test.ts`

**Interfaces:**
- Produces: `watchSalonAccess(salonId, onChange, viewerUid?)`. Con `elencoNegato: true` e `enabled: false`, `accessoSospeso` è true per collaboratore e socio, false se il membro proprio ha `accessWithoutPro`. Membri vuoti senza `elencoNegato` non decidono (il test attuale resta).

- [ ] **Step 1: Test che fallisce.** In `accessoSospeso.test.ts`: elenco negato e piano spento → sospeso. In `client.test.ts`: lo snapshot della raccolta `members` chiama l’errore `permission-denied`, lo snapshot di `pro/main` dice `enabled: false`, lo snapshot di `members/{uid}` arriva dopo. Atteso: la callback riceve `enabled: false` e `elencoNegato: true` senza aspettare l’elenco. In `firestoreRules.emulator.test.ts`: con `pro/main.enabled` false, il collaboratore legge `pro/main` e `members/{proprio}`, e `getDocs` su `members` fallisce.

- [ ] **Step 2: Codice minimo.** Errore `permission-denied` sull’elenco → `elencoNegato`. Ascolto di `members/{viewerUid}`. Nessuna regola nuova che apra l’elenco. Nessun campo nuovo sugli account.

- [ ] **Step 3: Test verdi. Commit** `fix: il collaboratore sospeso legge il proprio membro e vede la schermata`

### Task R2: i 9 test rossi, orologio fermo

**Files:**
- Modify: `src/config/firebaseConfig.test.ts` (non cerca più `kind != 'files'`; cerca `salonKindWritable` e l’elenco chiuso)
- Modify: `src/pages/SettingsPage.test.tsx` (`getAllByText('Il Cane Felice')` lunghezza 2; lo stile `overflow-wrap` sul nodo che lo ha)
- Modify: `src/data/firebase/client.ts` solo il percorso di ascolto: se la lettura del segno fallisce, `listenDogs` non chiama `onData`
- Modify: i `describe` di `AppointmentPage.test.tsx` e `appointments.test.tsx` che leggono l’ora vera: `vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime`, `afterEach` → `vi.useRealTimers`. I test che si aspettano le 09:00 come primo orario utile fissano un’ora prima delle 9. Il test M7 resta alle 18:00.

- [ ] **Step 1: Lanciare i file rossi e leggere il messaggio.**
- [ ] **Step 2: Correggere.** Il filtro non tratta `Error('rete')` come «zero cancellazioni».
- [ ] **Step 3: Quei file verdi. Commit** `test: la suite non dipende dall'ora e il segno illeggibile non svuota il filtro`

### Task R3: kit 360° ed emulatori nell’app (vecchio task 3)

**Files:**
- Create: `firebase.emu.json` dal kit
- Create: `.env.emu` dal kit (chiavi demo, si può committare)
- Modify: `src/data/firebase/client.ts` — `connectAuthEmulator`, `connectFirestoreEmulator`, `connectFunctionsEmulator` importati solo se `import.meta.env.VITE_EMULATORS === '1'`
- Modify: `package.json` — `test:e2e`, `test:360`
- Create: `scripts/test360/seed.ts`, `rules.ts`, `setpro.ts`, `tests/e2e/` copiati e adattati. All’avvio si fermano senza `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` o se il project id non inizia con `demo-`.

- [ ] **Step 1: `npx vitest run src/data/firebase/client.test.ts` verde** dopo il collegamento condizionato.
- [ ] **Step 2: Commit** `test: kit 360 sul progetto demo, emulatori solo col flag`

### Task R4: npm test senza rete (vecchio task 6)

**Files:**
- Modify: `src/test/setup.ts`

Il `fetch` di partenza, prima di `vi.stubGlobal`, è una funzione che per host diversi da `localhost` e `127.0.0.1` restituisce 503 senza chiamare la rete. `vi.unstubAllGlobals()` deve ripristinare quella funzione, non il `fetch` del sistema. `blob:` e `data:` restano consentiti.

- [ ] **Step 1: Test** in `src/test/setup.rete.test.ts`: dopo `unstubAllGlobals`, un `fetch` verso `https://api.github.com` non è il fetch di rete (la risposta è 503 e un contatore di socket resta a zero). Si avvolge `globalThis.fetch` originale in un contatore solo nel test, assegnandolo prima del blocco... Il test importa il setup e verifica che l’implementazione ripristinata rifiuti gli host esterni. Implementazione: salvare il fetch reale, sostituirlo col blocco, e fare stub del blocco così l’unstub torna al blocco.
- [ ] **Step 2: `npm test`.** Se un file da solo supera 60 s, spostarlo in `vitest.slow.config.ts` e in `test:slow`, escluso da `npm test`.
- [ ] **Step 3: Commit** `test: la suite non apre la rete`

### Task R5: push di main

- [ ] **Step 1: `git push origin main`.** Non force. Se l’autenticazione manca, segnare il task bloccato da Roberto e continuare.
- [ ] **Step 2: Non alzare `APP_VERSION`.**

## Ordine di esecuzione (dopo la ripartenza)

Il resto del file descrive i task 0–37. 0, 1, 2, 4 e 8 sono fatti. Il task 5 tiene aperti solo M11 e M13. Il task 3 e il task 6 sono sostituiti da R3 e R4. Il task 37 non lancia `firebase deploy`.

---

### Task 0: Nota per Roberto e vincoli di repo

**Files:**
- Create: `docs/DA-FARE-ROBERTO.md`

**Interfaces:**
- Produces: l’elenco vivo dei passi umani. I task successivi aggiungono voci, non le cancellano.

- [ ] **Step 1: Scrivere la nota iniziale**

Creare `docs/DA-FARE-ROBERTO.md` con queste voci, ciascuna con «non fatto dal codice»:

1. Dopo la pubblicazione, da Utenti, sul salone di Laura: «Salone omaggio». Non lanciare script.
2. Rendere privato `robmass83-ui/Groomly` solo dopo che l’APK è scaricabile da un indirizzo pubblico che non sia quel repo. Fino ad allora l’aggiornamento APK resta su GitHub Releases.
3. DNS: puntare `groomlyapp.it` a Firebase Hosting (dominio personalizzato). Il codice funziona anche senza.
4. Play Console: account (personale o organizzazione, sentito il commercialista), profilo pagamenti, prodotti con i prezzi di lancio della spec (A6), grazia 7 giorni, account hold 30, pausa 1–3 mesi, niente prova gratuita Play. Poi RevenueCat, service account, webhook, segreti `REVENUECAT_API_KEY` e `REVENUECAT_WEBHOOK_AUTH`.
5. 12–15 tester Android per 14 giorni, quando si deciderà il flavor `play`. Non ora.
6. Template Brevo delle email di prenotazione (richiesta, conferma, proposta, rifiuto, scadenza, disdetta, promemoria). Il codice invia HTML proprio se il template manca.
7. reCAPTCHA / App Check per la pagina pubblica.
8. Commercialista: DPA, prezzi, partita IVA. Non blocca questo sviluppo.
9. Custom claim `admin: true` sugli uid di Laura e Roberto, con lo script `scripts/imposta-admin.ts`, lanciato a mano quando si è pronti. Non lanciarlo in questo lavoro.
10. Offerta fondatori in Play Console (primi 50, prezzo bloccato), quando esisteranno gli abbonamenti.

- [ ] **Step 2: Commit**

```powershell
git add docs/DA-FARE-ROBERTO.md docs/superpowers/specs/2026-10-25-groomly-piani-completo-design.md docs/superpowers/plans/2026-10-25-groomly-piani-completo.md
git commit -m "docs: specifica e piano unici di piani, sicurezza e funzioni"
```

---

### Task 1: Fase 0.2 — un solo ramo, senza perdere lavoro

**Files:**
- Modify: il checkout `D:\Groomly` (ramo `main`)
- Tenere: commit `f8630c3` (`pro-collaboratori`), `f6b2e16` (`scheda-nido`), modifiche non salvate su DogPage, NextAppointment, NotificationsPage, PhoneShell, schedaEnter

**Interfaces:**
- Produces: `main` contiene `f8630c3` e il comportamento del nido che i test accettano. `APP_VERSION` è ancora `1.1.93`.

- [ ] **Step 1: Mettere al sicuro le modifiche non salvate**

Da `D:\Groomly`:

```powershell
git stash push -u -m "main-non-salvate-prima-del-merge" -- src/components/layout/PhoneShell.tsx src/pages/DogPage.tsx src/pages/DogsPage.test.tsx src/pages/NextAppointment.tsx src/pages/NotificationsPage.test.tsx src/pages/NotificationsPage.tsx src/pages/SettingsPage.test.tsx src/pages/schedaEnter.css src/pages/schedaEnter.test.ts
```

Non mettere nello stash i documenti nuovi di questo piano: sono già nel commit del task 0, oppure vanno committati prima di questo step.

- [ ] **Step 2: Unire pro-collaboratori in main**

```powershell
git merge pro-collaboratori -m "merge: pro-collaboratori 1.1.93 entra in main"
```

Se il merge si ferma, risolvere tenendo il codice di `pro-collaboratori` per l’app e tenendo i documenti nuovi di `main`. Non risolvere buttando `firestore.rules` di `pro-collaboratori`.

- [ ] **Step 3: Riportare la scheda nido**

```powershell
git cherry-pick f6b2e16
```

Se il cherry-pick confligge su `DogPage.tsx`, tenere i vincoli del collaboratore (niente archivia, deceduto, elimina per il collaboratore) e il layout a nido. Poi:

```powershell
npx vitest run src/pages/DogPage.test.tsx src/pages/DogsPage.test.tsx src/pages/NotificationsPage.test.tsx
```

Atteso: pass. Se un test del collaboratore fallisce, il layout non deve reintrodurre quei pulsanti per il collaboratore.

- [ ] **Step 4: Reintegrare lo stash solo dove aggiunge qualcosa**

```powershell
git stash pop
```

Tenere `frameHeight` in `PhoneShell` se i test del guscio passano. Tenere `.scheda-enter.is-settled` e `touch-action: pan-y`. Se `DogPage` o `NotificationsPage` dello stash sono una copia più vecchia del nido, ripristinare la versione già committata (`git checkout --` su quel file) e non perdere i test nuovi che descrivono un comportamento assente: in quel caso il test si aggiorna al comportamento tenuto, con una riga nel messaggio di commit che dice quale versione è rimasta.

```powershell
npx vitest run src/pages/schedaEnter.test.ts src/components/layout/PhoneShell.test.tsx src/pages/NotificationsPage.test.tsx
npx tsc --noEmit
```

- [ ] **Step 5: Commit del merge pulito**

Se restano file da salvare dopo la risoluzione:

```powershell
git add src/components/layout/PhoneShell.tsx src/pages/DogPage.tsx src/pages/DogsPage.test.tsx src/pages/NextAppointment.tsx src/pages/NotificationsPage.tsx src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/schedaEnter.css src/pages/schedaEnter.test.ts
git commit -m "merge: scheda nido e guscio telefono sopra la 1.1.93"
```

Non chiudere ancora i worktree: si fa dopo il test 360° finale, quando `git branch --contains` conferma che i commit ci sono.

---

### Task 2: Fase 0.1 — regole Firestore (F1, F3, F4, M12)

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/firestoreRules.test.ts`
- Create: `scripts/test360/rules-emulator.mjs` (o estendere lo script già referenziato da `test:rules`, se dopo il merge esiste e lancia l’emulatore)

**Interfaces:**
- Consumes: `isOperator`, `ownerRank`, `canUse` già in `firestore.rules`.
- Produces: elenco chiuso di `kind`; collaboratore bloccato sui campi del completato; `isOperator` con email verificata o claim `admin`.

- [ ] **Step 1: Test sull’emulatore che oggi falliscono**

Lo script, con `@firebase/rules-unit-testing` e progetto `demo-groomly`, deve affermare:

- un utente A non legge `users/{uidB}/backups/x` (atteso: permesso negato);
- il titolare non scrive `salons/{suo}/crediti/main` né `salons/{suo}/pro/main` (negato);
- il titolare scrive `salons/{suo}/services/s1` (permesso);
- il collaboratore, su un appuntamento `completato`, non aggiorna `total` a 1 (negato);
- un operatore con email giusta ma `email_verified` false non legge un account altrui (negato);
- un token con `admin: true` legge l’elenco che oggi legge l’operatore.

Lanciare il test. Atteso: fallisce su crediti, su `total`, e sull’email non verificata. La lettura di `users/{altro}` deve già fallire (F1 già nel codice): se passa, il test resta come lucchetto.

- [ ] **Step 2: Regole**

In `isOperator()` aggiungere `&& request.auth.token.email_verified == true`, e accettare anche `request.auth.token.admin == true` come operatore.

Nella `allow update` degli appuntamenti, il ramo collaboratore richiede anche che i campi `total`, `paymentMethod`, `actualDurationMin` e `status` siano uguali a quelli già salvati quando `resource.data.status == 'completato'`.

Sostituire la scrittura generica:

```
allow write: if ownerRank(salonId) && kind != 'files' && kind != 'pro' && kind != 'members';
```

con un elenco:

```
function salonKindWritable(kind) {
  return kind in ['services', 'closures', 'settings', 'meta', 'deletedDogs'];
}
allow write: if ownerRank(salonId) && salonKindWritable(kind);
```

Stessa funzione sul match `{rest=**}`. Aggiungere `allow read: if signedIn(); allow write: if false;` su `config/{docId}`. Negare al client `crediti`, `movimentiCrediti`, `copieCloud`, `messaggi`, `whatsapp`, `richieste`, `pubblici`, `rcEventi` anche se un giorno cadessero nel generico: il generico non li include più.

- [ ] **Step 3: I test dell’emulatore passano. I test che leggono il testo delle regole si aggiornano se citano la riga vecchia.**

- [ ] **Step 4: Commit** `fix: le regole non lasciano scrivere raccolte inventate né gli incassi al collaboratore`

---

### Task 3: Fase 0.4 — kit 360° nel progetto, emulatori compatibili coi mock

**Files:**
- Create: `firebase.emu.json` (da `docs/test360-kit/firebase.emu.json`, project non impostato sullo script: lo passa la riga di comando `demo-groomly`)
- Create: `.env.emu` (da `docs/test360-kit/env.emu.txt`). Aggiungere `.env.emu` al `.gitignore` se contiene solo chiavi demo pubbliche; se contiene segreti, non committarlo. Le chiavi demo degli emulatori si possono committare.
- Modify: `src/data/firebase/client.ts` — collegamento emulatori
- Modify: `package.json` scripts `test:rules`, `test:e2e`, `test:360`
- Create: `scripts/test360/seed.ts`, `rules.ts`, `setpro.ts` copiati dal kit e adattati agli import del repo
- Create: `tests/e2e/` con i playwright del kit

**Interfaces:**
- Produces: `VITE_EMULATORS=1` collega Auth, Firestore e Functions. Senza la variabile, `client.ts` non nomina `connectAuthEmulator` nel percorso eseguito dai test esistenti.

- [ ] **Step 1: Collegamento condizionato**

In `client.ts`, dopo la creazione di auth, db e functions, solo se `import.meta.env.VITE_EMULATORS === '1'`:

```ts
const [{ connectAuthEmulator }, { connectFirestoreEmulator }, { connectFunctionsEmulator }] = await Promise.all([
  import('firebase/auth'),
  import('firebase/firestore'),
  import('firebase/functions'),
])
```

Chiamare i `connect*` sugli host di `.env.emu` (`127.0.0.1`, porte 9099, 8080, 5001). Non importarli in cima al file.

- [ ] **Step 2: `npx vitest run src/data/firebase/client.test.ts` passa** (i mock non vedono `connect*`).

- [ ] **Step 3: `seed.ts` e `rules.ts` all’avvio**

```ts
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Emulatori assenti: mi fermo')
}
if (!String(process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT ?? 'demo-groomly').startsWith('demo-')) {
  throw new Error('Project id non demo: mi fermo')
}
```

- [ ] **Step 4: Commit** `test: kit 360 sul progetto demo, emulatori solo col flag`

---

### Task 4: Fase 0.5 — niente perdite offline (F2)

**Files:**
- Modify: `src/data/firebase/client.ts` (`saveDog`, `saveWithMedia`, salvataggi di appuntamento e chiusura)
- Test: `src/data/firebase/offlineSave.test.ts`

**Interfaces:**
- Produces: una scrittura nuova non aspetta una lettura server. La lettura di controllo usa la cache e, se fallisce, non annulla la scrittura.

- [ ] **Step 1: Test**

Simulare `getDoc` / `getDocs` che rifiutano con `unavailable` quando `source: 'server'`. Chiamare `saveDog` con un cane nuovo. Atteso: `setDoc` (o `putDoc`) viene chiamato. Oggi il test fallisce perché `cloudDeletion` lancia e `saveDog` esce prima.

Secondo caso: appuntamento nuovo con la stessa rete assente. Terzo: chiusura. La scrittura parte.

- [ ] **Step 2: Implementazione**

`cloudDeletion` in `saveDog`, se la lettura server fallisce, usa la lapide locale (`readDeletion()`) e prosegue. `stillWanted`, se la rilettura fallisce, ritorna `true` (il cane è voluto: non si butta). `saveWithMedia`: se `readDoc` fallisce per rete, tratta `current` come `null` e scrive. Non ingoiare gli errori di permesso (`permission-denied`): quelli si propagano.

- [ ] **Step 3: Test verde. Commit** `fix: un salvataggio offline non si perde se il server non risponde`

---

### Task 5: Fase 0.6 — usabilità urgente (F5, F8, M1, M2, M4, M7, M8, M9, M10, M11, M13)

**Files:**
- Modify: le pagine già esistenti (Home, completato, inviti, registrazione, team, archivio, notice versione). Non inventare una libreria nuova.

**Interfaces:**
- Consumes: `canUse` già falso quando il collaboratore ha Pro spento: oggi la home è vuota. Il client, se l’account è `collaboratore` o `socio` e `pro/main.enabled` è false e manca `accessWithoutPro`, mostra la schermata di sospensione invece dei dati vuoti.

Ogni bullet è un test che fallisce, poi il codice, poi il test verde. Un commit per gruppo se i file non si mescolano; altrimenti un commit `fix: usabilità vista nel test 360` con il messaggio che elenca F5, F8 e le M.

- [x] **F5** Test: collaboratore con `enabled: false` vede «Il tuo accesso a {nome} è sospeso» e «Esci», e non vede «Nessun appuntamento».
- [x] **F8** Test: finché cani e appuntamenti non sono arrivati, la home mostra «Carico l’agenda…» e non «€ 0». La query appuntamenti del primo carico chiede la finestra da 13 mesi fa in avanti; lo storico più vecchio parte solo aprendo un mese fuori finestra.
- [x] **M1** Test: prezzo diverso dal previsto senza nota lascia il pulsante fermo e mostra «Scrivi perché il prezzo è diverso».
- [x] **M2** Test: il collaboratore non vede «Aggiungi partita IVA o codice fiscale».
- [x] **M4** Test: email senza `@` non chiama la funzione e mostra «Inserisci un’email valida». L’errore 500 della funzione diventa «Invio non riuscito. Riprova.» senza «[500]». Un’email di operatore (Laura, Roberto) che non è un membro del salone riceve «Questa email non si può invitare», non «Questa email è già nel salone». Quel secondo testo resta solo per un membro già attivo. Form con `noValidate` e controllo proprio, così il browser non mostra il fumetto in inglese.
- [x] **M7** Test: alle 18:00 il primo orario proposto è il prossimo slot futuro, non le 09:00 di oggi.
- [x] **M8** Test: alla registrazione il nome della toelettatura finisce in `salonName` (e, se la ragione sociale è vuota, anche lì, così i documenti non restano senza nome).
- [x] **M9** Test: il socio non vede «Revoca» sulla riga del proprio uid.
- [x] **M10** Test: signed-out, la notice di aggiornamento non è nel documento. Dopo l’accesso, c’è.
- [ ] **M11** Test: la lista archivio e il blocco «Da chiudere» hanno padding inferiore almeno pari a `BOTTOM_NAV_CONTENT_PAD`.
- [ ] **M13** In `eliminaAccount` (task 9, se questo task arriva prima, lasciare la funzione `revocaMembroAllUscita` in `functions/src/salonInvite.ts` e chiamarla dall’unica cancellazione account esistente; se non esiste ancora, il task 9 la chiama). Test della decisione pura: dato un membro attivo, l’uscita produce `status: 'revocato'`.

M3 si chiude con la paywall del task 8, non qui. M5 si chiude con gli orari (task H0) e con il segno degli orari occupati nello stesso task. M6: in vista settimana, un giorno con più di 4 cani mostra «N cani» e il tocco apre il giorno. M12 è il task 2.

- [ ] **Commit** dei gruppi verdi.

---

### Task 6: Fase 0.7 — test senza rete e sotto i 4 minuti (F10)

**Files:**
- Modify: `vitest.config.ts` (o il file di config dei test già presente)
- Modify: i test che chiamano `groomly-3128b.web.app` o `api.github.com`

- [ ] **Step 1: Individuare le chiamate**

```powershell
rg -n "web.app|api.github.com|fetch\\(" src --glob "*.test.ts" --glob "*.test.tsx"
```

- [ ] **Step 2: Nel setup di Vitest, `fetch` rifiuta gli host diversi da `localhost` e `127.0.0.1`.** I test che volevano la rete ricevono il mock della risposta che già si aspettavano (release.json locale, nessuna release). Nessun test nuovo deve aprire una socket.

- [ ] **Step 3: `npm test` verde.** Segnare la durata. Se supera 4 minuti, spostare i file che da soli superano 60 secondi in `vitest.slow.config.ts` ed escluderli da `npm test`, lanciandoli con `npm run test:slow`. `npm test` resta il cancello di ogni fase.

- [ ] **Commit** `test: la suite non apre la rete`

---

### Task 7: Test 360° iniziale

**Files:**
- Create: `docs/Groomly_Test360_RAPPORTO_INIZIALE.md`

- [ ] **Step 1: Spegnere emulatori eventuali. Avviare** `firebase emulators:start --config firebase.emu.json --project demo-groomly` senza export. Seed. Regole. Playwright del giro pagine (titolare, collaboratore, socio, operatore, chiaro e scuro) e del offline. Poi spegnere gli emulatori e cancellare `test-results/` e i log.

- [ ] **Step 2: Rapporto breve** con cosa è verde e quali falle del 25/10 risultano già chiuse dopo la fase 0. Non è il rapporto finale.

- [ ] **Commit** solo del markdown.

---

### Task 8: Piano 1 — `piano.ts`, config, pro/main esteso

**Files:**
- Create: `src/lib/piano.ts`
- Create: `src/lib/piano.test.ts`
- Create: `src/i18n/it.ts`
- Modify: `functions/src/index.ts` solo se serve riesportare; la scrittura del documento sta nel task 10

**Interfaces:**
- Produces: le firme della spec (`statoPiano`, `haAccesso`, `livelloMinimo`, `mostraBadge`, `puoProporre`, `postiTotali`). Chiavi feature della spec.

- [ ] **Step 1: `piano.test.ts` con almeno 40 casi**: assente, attivo, prova, grazia, disdetto futuro, disdetto passato, sospeso, scaduto, omaggio senza data, offline sotto 72 ore, offline oltre 72 ore, salone che include una feature pro, pro che non include `team`, `mostraBadge` falso se il flag è spento, `puoProporre` falso prima di 7 giorni e falso se l’ultima proposta è di 3 giorni fa.

- [ ] **Step 2: Implementazione minima fino al verde.**

- [ ] **Step 3: Commit** `feat: il modulo piano decide l’accesso senza leggere Firebase`

---

### Task 9: Piano 2 — badge, paywall «In arrivo», card, menu dietro il flag

**Files:**
- Create: `src/hooks/usePiano.tsx`
- Create: `src/components/piano/ProBadge.tsx`
- Create: `src/components/piano/ProGate.tsx`
- Create: `src/components/piano/PaywallSheet.tsx`
- Create: `src/components/piano/PianoCard.tsx`
- Create: `src/pages/PianoPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: il router (file già usato dalle route impostazioni)
- Test: `src/components/piano/PaywallSheet.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `haAccesso`, `mostraBadge`, `usePiano().apriPaywall(feature)`.
- Produces: route `/impostazioni/piano`, `/impostazioni/messaggi`, `/impostazioni/strumenti`, `/impostazioni/team` (il contenuto team è il task 11; qui la route esiste), `/impostazioni/account/elimina` (pagina placeholder che il task 20 riempie, già linkata).

- [ ] **Step 1: Test.** Con `mostraPiani` false, Impostazioni non ha «Il tuo piano» né «Team» né «Messaggi ai clienti», e ha «Privacy e termini» e «Elimina account». Con il flag true e piano base, la card dice «Prova Pro gratis per 30 giorni». «Avvisami» scrive l’interesse. Il collaboratore non vede la card.

- [ ] **Step 2: Componenti.** Paywall senza prezzi: «Abbonamenti in arrivo». Stile con `var(--pri)`, `var(--card)`, `var(--tx2)`.

- [ ] **Step 3: Commit** `feat: paywall in arrivo e menu piani solo col flag`

---

### Task 10: Piano 3 — prova, omaggio, chiusura prove

**Files:**
- Create: `functions/src/piano/scriviPiano.ts`
- Create: `functions/src/piano/impostaPianoManuale.ts`
- Create: `functions/src/piano/avviaProva.ts`
- Create: `functions/src/piano/chiudiProve.ts`
- Create: `functions/src/piano/piano.test.ts`
- Modify: `functions/src/index.ts` (export e `setSalonPro` che delega)
- Modify: la pagina Utenti

**Interfaces:**
- Produces: `scriviPiano(db, salonId, campi)` calcola `enabled` e `seats`. `impostaPianoManuale` solo operatore, rifiuta `shared`. `avviaProva` solo titolare, una volta. `chiudiProve` oraria.

- [ ] **Step 1: Test della decisione** (senza Firebase, funzioni pure estratte): omaggio salone → `enabled true`, seats 3; prova → `enabled false`, `provaUsata true`; seconda prova → errore `Prova già usata`; `setSalonPro(false)` → base.

- [ ] **Step 2: Callable e schedule.** Messaggi: `Accesso negato`, `Prova già usata`.

- [ ] **Step 3: Pagina Utenti** con i quattro pulsanti, assenti su `shared`. I test della pagina non chiamano il progetto vero.

- [ ] **Step 4: Commit** `feat: prova e omaggio si scrivono solo dal server`

Non eseguire la callable sul progetto vero.

---

### Task 11: Piano 4 — Team e posti derivati

**Files:**
- Modify: `src/lib/salonAccess.ts` (`PRO_SEAT_LIMIT` diventa `postiTotali` letto dal documento; il default se manca è 3, così i test vecchi restano verdi)
- Modify: route e titoli: «Funzioni Pro» → «Team», `/impostazioni/pro` reindirizza a `/impostazioni/team`
- Modify: `functions` che contano i posti, se usano la costante, accettano `seats` del documento

- [ ] **Step 1: Test** `postiTotali({ seatsIncluded: 3, seatsExtra: 1 })` è 4. Invito con 4 membri attivi e seats 4 è rifiutato al quinto. «Team» visibile solo con `mostraPiani` e accesso salone; con il flag spento la voce «Funzioni Pro» di oggi resta com’è (R1).

- [ ] **Step 2: Codice. Commit** `feat: i collaboratori seguono il livello Salone`

---

### Task 12: Piano 5 — report passati ed export

**Files:**
- Modify: `src/pages/EarningsReportPage.tsx`, `src/components/earnings/ExportSheet.tsx`
- Test accanto alle pagine

- [ ] **Step 1: Test.** Flag spento: export e mesi passati si comportano come oggi. Flag acceso, base, salone nuovo: il mese corrente si vede; un mese passato e «Esporta» aprono la paywall e non generano il file. Salone con `haAccesso` export: il file parte. Fascia 1–5 del mese solo con il flag acceso e se `puoProporre`.

- [ ] **Step 2: Commit** `feat: export e mesi passati restano aperti finché i piani sono spenti`

«Salone nuovo» nel test è un salone senza `fonte: 'omaggio'`. L’omaggio ha accesso, quindi Laura (copia finta) esporta.

---

### Task 13: Piano 6 — non si fa

- [ ] **Step 1: In `DA-FARE-ROBERTO.md` una riga «Crediti e WhatsApp automatico: rimandati».** Nessun file di crediti. Nessun commit di codice.

---

### Task 14: Piano 7 — copie nel cloud

**Files:**
- Create: `src/lib/copieCloud.ts` (scelta foto già presenti, nome copia `yyyy-mm-dd`)
- Create: `functions/src/piano/copieCloud.ts`
- Modify: il foglio Backup

- [ ] **Step 1: Test puro.** Una foto già nell’insieme non viene ricopiata. Una copia più vecchia di 30 giorni è da cancellare. Sotto Pro, `haAccesso('copieCloud')` è vero.

- [ ] **Step 2: UI.** Flag spento: il foglio backup è identico. Flag acceso e base: riga con badge, tocco → paywall. Pro: elenco; se lo storage non è configurato, «Copie non disponibili».

- [ ] **Step 3: La funzione schedulata, se manca il bucket, esce senza scrivere.** Commit `feat: copie nel cloud pronte, spente senza bucket`

---

### Task 15: Piano 7a — M1 Invia tutti

**Files:**
- Create: `src/lib/codaAvvisi.ts`
- Create: `src/lib/whatsapp.ts` (`normalizzaTelefono`, `renderTemplate`, `urlWhatsApp`)
- Modify: `src/pages/HomePage.tsx`
- Test: `src/lib/codaAvvisi.test.ts`, `src/lib/whatsapp.test.ts` (almeno 12 numeri)

- [ ] **Step 1: Test.** Domani ha 3 appuntamenti programmati con telefono: la coda ne ha 3. Segnare il primo «inviato» fa partire il secondo. Un numero `333 123 4567` diventa `393331234567`. Flag `mostraPiani` false: la home non mostra il riquadro (R1). Flag true: il riquadro c’è in Base.

- [ ] **Step 2: UI e persistenza** in `settings` del salone (`avvisiInviati: { [appointmentId+data]: true }`), scrivibile perché `settings` è nell’elenco. Commit `feat: coda manuale per avvisare i clienti di domani`

---

### Task 16: Piano 7b — M2 promemoria email

**Files:**
- Create: `functions/src/piano/promemoriaEmail.ts`
- Create: `src/lib/promemoriaEmail.ts` (quali appuntamenti, idempotenza `appointmentId + data`)
- Modify: route `/azione` già esistente, per `Confermo` / `Devo spostare` / opt-out

- [ ] **Step 1: Test puro.** Lo stesso appuntamento e la stessa data non escono due volte. Il 301° invio del giorno non parte e resta in coda. Senza email sul contatto, non parte.

- [ ] **Step 2: Funzione schedulata.** Senza chiave Brevo non chiama la rete e segna `stato: 'non_inviata'`. Con chiave, riusa `brevoMail`. Tetto in `config/globale.emailOggi` in transazione.

- [ ] **Step 3: Campo `contact.email` nel form del cane, visibile quando il flag è acceso.** Commit `feat: promemoria email la sera prima, con tetto giornaliero`

---

### Task 17: P-H0 — orari di apertura

**Files:**
- Create: `src/lib/orari.ts`
- Modify: Impostazioni attività, il form orario dell’appuntamento (M5, M7 già avviato)

- [ ] **Step 1: Test.** Giorno con lista vuota è chiuso. «Copia su tutti» replica le fasce. Un orario dentro una fascia è valido. Domenica vuota non è proponibile se gli orari sono compilati. Se gli orari mancano, il form di oggi non cambia.

- [ ] **Step 2: UI e segno degli orari già occupati** nel selettore. Commit `feat: orari di apertura, ignorati se non compilati`

---

### Task 18: P-H7 — statistiche

**Files:**
- Create: `src/lib/statistiche.ts`
- Create: `src/pages/StatistichePage.tsx`
- Route `/incassi/statistiche`

- [ ] **Step 1: Test puro.** €/ora = incasso / ore (durata effettiva, altrimenti prevista). Previsione = incassato + programmati × (1 − tasso non venuti). Clienti in ritardo: intervallo medio × 1,5 e nessun futuro.

- [ ] **Step 2: UI.** Flag spento: nessuna scheda nuova. Flag acceso e base: solo la card €/ora, il resto apre la paywall. Commit `feat: statistiche clienti calcolate sul telefono`

---

### Task 19: P-H4 — recensioni Google

**Files:**
- Create: `src/lib/recensioni.ts`
- Modify: foglio Completato, Impostazioni

- [ ] **Step 1: Test.** Seconda proposta entro 12 mesi è falsa. Proposta nello stesso giorno di una nota problema è falsa. La sesta del giorno è falsa. Manca il link: non si propone.

- [ ] **Step 2: UI solo con flag acceso.** Il testo default non contiene sconti. Commit `feat: richiesta recensione Google, una volta l’anno`

---

### Task 20: P-H5 — tessera fedeltà

**Files:**
- Create: `src/lib/fedelta.ts`
- Modify: Completato, scheda cane, impostazioni

- [ ] **Step 1: Test.** Dieci completati validi → premio. Annullare il completato toglie il timbro. Usare il premio mette il servizio a 0 e la nota «Premio fedeltà». `ricalcolaFedelta` dagli appuntamenti torna gli stessi timbri.

- [ ] **Step 2: UI con `haAccesso('fedelta')`; altrimenti badge se il flag è acceso.** Commit `feat: tessera fedeltà per cane`

---

### Task 21: Piano 9 (prima del pubblico, perché l’eliminazione è indipendente) — account, privacy, claim, etichette

Si anticipa rispetto alla tabella solo per i pezzi che non dipendono dal sito: etichette, pagine privacy statiche, eliminazione. L’ordine di verifica resta: questo task prima del test finale.

**Files:**
- Create: `functions/src/piano/eliminaAccount.ts`
- Create: `hosting/privacy/index.html`, `hosting/termini/index.html`, `hosting/elimina-account/index.html` se la cartella hosting ha già un pattern; altrimenti le pagine nel hosting esistente con le rewrite
- Create: `scripts/imposta-admin.ts` (non si lancia)
- Modify: stringhe visibili «pelosetto» e i test che cercano quell’etichetta
- Modify: registrazione, checkbox termini, `accounts/{uid}.termini`

- [ ] **Step 1: Test etichette.** Il pulsante visibile è «Fissa un appuntamento». `appointmentKind` di un documento senza kind resta `pelosetto`.

- [ ] **Step 2: `eliminaAccount`** cancella i dati del salone il cui titolare è il chiamante, i membri (prima `revocato`), l’account Auth. Se `pro/main.fonte == 'play'` e lo stato è attivo, rifiuta con «Disdici prima su Google Play». Non accetta un salonId diverso dal proprio. Non ha un ramo per `shared`.

- [ ] **Step 3: Pagine HTML** con informativa breve (responsabile del trattamento = il salone per i dati dei clienti; Groomly per l’account). Link in Impostazioni.

- [ ] **Step 4: Commit** `feat: eliminazione account, privacy e etichette appuntamento`

Aggiungere in `DA-FARE-ROBERTO.md` il richiamo a lanciare `scripts/imposta-admin.ts` a mano.

---

### Task 22: P-H1 — pagina pubblica del salone

**Files:**
- Create: `hosting/salone/` (Vite minimo, stesso CSS variables)
- Create: `functions/src/piano/paginaSalone.ts`, `pubblici.ts`
- Create: `src/lib/slug.ts`

- [ ] **Step 1: Test slug.** «I Pelosetti!» → `i-pelosetti`. Slug già usato → rifiuto `Nome già preso`. Il profilo pubblico non contiene campi `vat` né `tax` se il salone non ha `mostraDatiFiscali: true`.

- [ ] **Step 2: Callable `saloneInfo`.** HTML con `og:title` = nome salone. Senza DNS il test chiama la function sull’emulatore.

- [ ] **Step 3: Commit** `feat: biglietto da visita del salone, senza dati privati`

Nota DNS già presente in `DA-FARE-ROBERTO.md`.

---

### Task 23: P-H2a — disponibilità e anti-spam

**Files:**
- Create: `src/lib/disponibilita.ts`
- Create: `src/lib/disponibilita.test.ts`
- Create: `functions/src/piano/postiLiberi.ts`

- [ ] **Step 1: Test ora legale.** Ultima domenica di marzo 2026 e di ottobre 2026: uno slot alle 10:00 Europe/Rome resta le 10:00 locali. Un appuntamento `programmato` occupa. Un `disdetto` no. Una richiesta `nuova` non scaduta occupa. Il risultato non contiene nomi di cani.

- [ ] **Step 2: Limiti.** Più di 2 richieste aperte per lo stesso cellulare → rifiuto. Più di 20 aperte per salone → rifiuto. Campo esca pieno → rifiuto silenzioso (risposta ok, niente scrittura).

- [ ] **Step 3: Commit** `feat: orari liberi calcolati sul server`

---

### Task 24: P-H2b — percorso cliente ed email

**Files:**
- Create: le 5 schermate in `hosting/salone/`
- Create: `functions/src/piano/inviaRichiesta.ts`, `gestisciPrenotazione.ts`

- [ ] **Step 1: Test della macchina a stati.** `nuova` → `accettata` | `proposta` | `rifiutata` | `scaduta` | `disdetta`. Token errato non cambia lo stato. Email obbligatoria assente → rifiuto.

- [ ] **Step 2: Email.** Senza Brevo, lo stato si salva e `emailStato` è `non_inviata`. Il `.ics` contiene la data in Europe/Rome.

- [ ] **Step 3: Commit** `feat: richiesta di prenotazione online, con email se Brevo c’è`

---

### Task 25: P-H2c — lato toelettatrice

**Files:**
- Modify: `src/pages/HomePage.tsx`, agenda, impostazioni
- Create: `src/lib/richieste.ts`

- [ ] **Step 1: Test.** Accetta crea un appuntamento `programmato` e toglie lo stato `nuova`. Il blocco in agenda dura 48 ore. Il cliente con lo stesso cellulare propone il cane esistente.

- [ ] **Step 2: UI** (riquadro, pulsanti, QR come PDF che riusa il modulo di export del listino se c’è; altrimenti un PDF A5 minimo con nome e URL). Visibile con `haAccesso('prenotazioni')` o, in Base col flag, come badge.

- [ ] **Step 3: Commit** `feat: la toelettatrice conferma le richieste online`

---

### Task 26: P-H3 — lista d’attesa

**Files:**
- Create: `src/lib/attesa.ts`
- Modify: form appuntamento, home, `postoLiberato` chiamato dalla disdetta

- [ ] **Step 1: Test.** Durata maggiore del buco → escluso. Preferenza «mattina» esclude le 16:00. Ordine di arrivo. Il primo che conferma vince; il secondo riceve lo stato `persa`.

- [ ] **Step 2: UI. Commit** `feat: lista d’attesa quando si libera un posto`

---

### Task 27: P-H6 — scheda per il cliente

**Files:**
- Create: `functions/src/piano/schedaCliente.ts`
- Modify: scheda cane, pagina pubblica `/c/{token}`

- [ ] **Step 1: Test.** La risposta non ha chiavi `notes`, `tags`, `behavior`. Token revocato → `non_trovata`.

- [ ] **Step 2: Commit** `feat: scheda del cane condivisibile, senza note interne`

---

### Task 28: Controlli avanzati in manuale (F1, F2, F3, P2, P3, P4, P5, P6, P7, P8)

**Files:**
- Create: `src/lib/affidabilita.ts`, `src/lib/prezzoSuggerito.ts`, `src/lib/pagella.ts`
- Modify: `/impostazioni/messaggi`, `/impostazioni/strumenti`, home, completato, listino
- I testi dei messaggi passano da `renderTemplate`

Ogni funzione: test puro del criterio, poi UI dietro `haAccesso` o badge. F1, F2, F3 sono Base e compaiono solo con `mostraPiani`. P2 anteprima nomi in home. P6 solo con almeno 3 cani della stessa taglia e razza. P1 non si fa.

- [ ] **F2** Affidabilità: tre «non venuto» negli ultimi 6 mesi → etichetta «Spesso non viene». Zero → nessuna etichetta.
- [ ] **F1** Dalla scheda, «Scrivi su WhatsApp» apre `wa.me` con il testo del template e segna un messaggio `wa_manuale` / `aperto` via callable (il client non scrive `messaggi`).
- [ ] **F3** Nota vocale: registra sul telefono (`MediaRecorder` se c’è, altrimenti il pulsante dice «Il microfono non è disponibile»). Il file sta nei file del salone con `kind: 'audio'`.
- [ ] **P2** Lista di chi ha superato l’intervallo × 1,5. WhatsApp manuale.
- [ ] **P3** Dopo Completato, testo e foto, condivisione. Non parte da solo.
- [ ] **P4** Compleanni del mese, WhatsApp manuale, solo con data di nascita.
- [ ] **P5** Pagella a chip, resta nello storico anche dopo un downgrade (il documento c’è; il pulsante «nuova» no, se manca l’accesso).
- [ ] **P7** Wizard: scegli servizi, percentuale, anteprima, conferma. Non invia WhatsApp automatico: prepara la coda manuale.
- [ ] **P8** Collage due foto e logo. In Base, anteprima e scritta «Fatto con Groomly». Con `senzaFirma`, senza scritta.
- [ ] **Commit** `feat: messaggi manuali e strumenti, senza WhatsApp automatico`

---

### Task 29: Piano 8 — non si fa

- [ ] **Step 1: Verificare con una ricerca che `AppInstallerPlugin`, `UpdateNotice`, `appRelease.ts` e `REQUEST_INSTALL_PACKAGES` sono ancora presenti.** Se un task li ha toccati, ripristinarli. Riga in `DA-FARE-ROBERTO.md`: flavor `play` solo al passaggio allo store.

---

### Task 30: Piano 10 — non si fa

- [ ] **Step 1: La voce tester è già in `DA-FARE-ROBERTO.md`.** Nessun upload Play.

---

### Task 31: Piano 11 e 12 — RevenueCat spento

**Files:**
- Create: `src/lib/billing.ts`
- Create: `functions/src/piano/rcWebhook.ts`
- Modify: `AndroidManifest.xml` `launchMode` da `singleTask` a `singleTop` solo se i test di routing esistenti passano; se un test di intent fallisce, tornare a `singleTask` e scrivere in `DA-FARE-ROBERTO.md` che il cambio va rifatto insieme al plugin, il giorno del Play Store.

**Interfaces:**
- `billing.compra` con `abbonamentiAttivi` false ritorna `{ stato: 'spento' }` e non carica script dello store.
- `rcWebhook` senza header atteso risponde 401. Con header giusto e evento già in `rcEventi`, risponde 200 senza seconda scrittura. Senza `REVENUECAT_API_KEY` risponde 503.

- [ ] **Step 1: Test del webhook** con un fake di Firestore in memoria (lo stile dei test funzioni già nel repo).

- [ ] **Step 2: Non aggiungere la dipendenza npm se l’installazione richiede rete non necessaria.** L’interfaccia `Billing` è locale. Il nome del pacchetto `@revenuecat/purchases-capacitor` sta nel commento di `billing.ts` e in `DA-FARE-ROBERTO.md`.

- [ ] **Step 3: Paywall resta «In arrivo».** Il sondaggio disdetta non si mostra finché `abbonamentiAttivi` è false.

- [ ] **Commit** `feat: webhook RevenueCat pronto e acquisti spenti`

---

### Task 32: Piano 13 — checklist, flag fermi

- [ ] **Step 1: Non impostare `abbonamentiAttivi`.** In `DA-FARE-ROBERTO.md` incollare la checklist §9.7 del piano sorgente come cose da fare sul license tester, il giorno in cui i prodotti esistono.

---

### Task 33: Piano 14 — proposte e firma

**Files:**
- Create: `src/lib/proposte.ts`
- Modify: home, notice

- [ ] **Step 1: Test.** Prima di 7 giorni nessuna proposta. Due proposte a 3 giorni di distanza: la seconda è falsa. Chiudere conta come proposta.

- [ ] **Step 2: Notice in home solo con `mostraPiani`.** «Non ora» scrive `settings.ui.ultimaProposta`.

- [ ] **Step 3: Commit** `feat: al massimo una proposta Pro ogni sette giorni`

---

### Task 34: Piano 15 — metriche con consenso

**Files:**
- Create: `src/lib/metriche.ts`

- [ ] **Step 1: Test.** Senza consenso, `registra` non chiama il sink. Con consenso, l’evento `paywall_aperta` ha `feature` e `fonte`.

- [ ] **Step 2: Il sink default è una funzione vuota** (niente Firebase Analytics finché il consenso e la dipendenza non ci sono). Il consenso è uno switch in Privacy, default spento.

- [ ] **Commit** `feat: metriche solo dopo il consenso`

---

### Task 35: Verifica trasversale prima del 360° finale

- [ ] **Step 1: `npm test` verde e sotto i 4 minuti (o con i lenti spostati).**
- [ ] **Step 2: `npm run build` pulito.**
- [ ] **Step 3: Ricerca**

```powershell
rg -n "piano === |piano == |=== 'pro'|=== 'salone'" src --glob "!**/*.test.*" --glob "!**/piano.ts" --glob "!**/usePiano.tsx"
```

Atteso: nessun confronto di piano fuori dal modulo. I `kind === 'pelosetto'` non contano.

- [ ] **Step 4: `rg REQUEST_INSTALL_PACKAGES android` trova ancora il permesso.**

---

### Task 36: Test 360° finale e rapporto

**Files:**
- Create: `docs/Groomly_Test360_RAPPORTO_FINALE.md`

- [ ] **Step 1: Emulatori spenti, poi riaccesi senza export, progetto `demo-groomly`.** Seed (20 saloni, più stati piano se il seed è stato esteso). Cancellare i dati significa spegnere: farlo prima del seed così non restano run precedenti.

- [ ] **Step 2: Regole, giro pagine, azioni, offline, un ruolo collaboratore con Pro spento (deve vedere la sospensione), un salone base con flag spento (Impostazioni senza card piano).**

- [ ] **Step 3: Spegnere gli emulatori. Cancellare `test-results/`, `firestore-debug.log`, `ui-debug.log`, download di prova.** `git status` non deve elencare dati di cani o appuntamenti.

- [ ] **Step 4: Rapporto** con la struttura del 25/10. Tabella F1–F10 e M1–M13: ciascuna 🔴 e 🟠 ha esito «chiusa» e il test che la copre. Se F7 non è chiusa perché il repo deve restare pubblico finché l’APK non ha un altro indirizzo, il rapporto lo dice e la voce in `DA-FARE-ROBERTO.md` è il passo rimasto: non si chiude F7 a parole.

- [ ] **Commit** `docs: rapporto finale del test 360`

---

### Task 37: Pubblicazione unica

- [ ] **Step 1: Alzare `1.1.93` → `1.1.94`** in `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle` (`versionName`, `versionCode` 10194), `hosting/release.json` (url della release `v1.1.94`).

- [ ] **Step 2: `npm test`, `npm run build`, `npx cap sync android`, in `android` `.\gradlew assembleDebug`.** Copiare l’apk in `groomly.apk` nella radice, fuori da `hosting/` e fuori dal commit.

- [ ] **Step 3: Commit e push** `release: 1.1.94, piani spenti, falle del test 360 chiuse`.

- [ ] **Step 4: `gh release create v1.1.94 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.94" --notes "…"`** con le note vere (sicurezza regole, niente perdite offline, piani predisposti e spenti).

- [ ] **Step 5: Non lanciare `firebase deploy`.** La voce è già in `docs/DA-FARE-ROBERTO.md` (punto 14). Non forzare il push. Non saltare gli hook.

- [ ] **Step 6: Worktree.** Per ogni worktree il cui HEAD è contenuto in `main`, `git worktree remove`. Non rimuovere un worktree non contenuto. Elencare nel rapporto quelli rimasti e perché.

---

## Self-review

- Copertura: fase 0 (0.1–0.7), test iniziale, piani 1–5, 7, 7a, 7b, H0, H7, H4, H5, H1, H2a–c, H3, H6, piano 9, controlli manuali, 11–12 spenti, 14, 15, test finale, pubblicazione. Piani 6, 8, 10 e l’accensione di 13 sono esplicitamente saltati.
- Nessun prezzo nel codice. Nessuno script sul salone vero. `APP_VERSION` solo nel task 37.
- Nomi stabili: `statoPiano`, `haAccesso`, `mostraBadge`, `puoProporre`, `postiTotali`, `scriviPiano`, `avviaProva`, `impostaPianoManuale`, `chiudiProve`.
