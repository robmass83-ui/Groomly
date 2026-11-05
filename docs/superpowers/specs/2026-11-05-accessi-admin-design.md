# Accessi admin — design

Data: 5 novembre 2026 · Ramo: `claude/accessi-admin-73f8a8` · Fonte: `D:\Groomly\docs\ADMIN-CONSOLE-PIANO.md` (fasi A, B, C, D, F; §5–§8).

> **Correzione del 5 novembre, durante l'implementazione.** Il piano di partenza e la prima stesura di questo design davano I Pelosetti in `salon/shared`. Non è così dal 24 ottobre (`docs/superpowers/specs/archive/2026-10-24-allineamento-laura-design.md`): il salone vivo è `salons/{uid di Laura}`, con Laura titolare e la hotmail **socio** con `accessWithoutPro`; `salon/shared` è un resto in sola lettura. L'obiettivo non cambia, cambia il punto in cui si agisce. Questo testo è già aggiornato.

## Perché

Oggi i permessi admin dipendono dall'email e la hotmail di Roberto è insieme amministratore e persona del salone di Laura. Si vuole separare i due ruoli prima di costruire la Console: chi amministra la piattaforma non ha un salone, chi lavora in I Pelosetti non ha poteri admin.

| Email | Dopo questo lavoro |
|---|---|
| `masala.roberto@hotmail.it` | Solo admin (claim `admin`), nessun salone, entra in `/admin` |
| `robmass83@gmail.com` | Socio di `salons/{uid di Laura}` al posto della hotmail, stessi poteri **sul salone** |
| `laura.masala@tiscali.it` | Titolare di I Pelosetti, VIP, non eliminabile, non più admin; salone identico |

## Obiettivi

- Permessi admin solo dal claim, in client, regole e functions.
- La hotmail entra solo in `/admin`, mai in un salone.
- robmass83 entra in I Pelosetti.
- Azioni admin registrate in `adminLog`; riconferma password per le azioni distruttive; limite di frequenza sugli avvisi.

## Fuori da questo lavoro

Layout e pagine della Console (Fase E), sito `admin.groomlyapp.it` (Fase G, compresi `browserSessionPersistence` e `noindex` di F.3), metriche (Fase H), risposte di Assistenza. L'esito web «Accesso riservato» arriva con la Fase G.

## Da non fare mai

- Scrivere, migrare o cancellare i dati di I Pelosetti (cani, appuntamenti, incassi, impostazioni), in `salons/{uid di Laura}` come in `salon/shared`. Nel salone di Laura si tocca solo `members`: la riga di robmass83 e quella della hotmail. Anche se appuntamenti risultano assegnati all'uid della hotmail, non si riassegnano: lo script li conta soltanto.
- Allentare le regole per far creare account o membri dal telefono.
- `--force` nei deploy. Deploy, script in produzione e APK partono solo col via esplicito di Roberto.

## Vincoli scoperti nel codice

1. **Il passo B.4 del piano non funziona.** `match /accounts/{uid}` accetta in creazione solo `salonId == uid` e `legacy == false`, il client non scrive `members` e non può cambiare il proprio `salonId`. Per questo `accounts/{uid}` di robmass83 e la sua riga `members` si scrivono lato server, prima del suo accesso.
2. **`eliminaSalone` non serve per il salone di prova** (Troddioni, se esiste ancora): cancella anche l'accesso Auth del titolare.
3. **I dati del telefono non corrono rischi**: `runMigration` carica dati locali solo per Laura su `shared`; un altro salone parte vuoto. robmass83 può entrare anche con l'APK attuale.
4. **Il tour dipende da `isOperator`**: per Laura vale già la data di creazione dell'account, ma si tiene un'esclusione esplicita.
5. **Gli avvisi di sistema si scrivono dal client** (`addDoc`, `deleteDoc`), quindi `adminLog` non li vedrebbe.
6. **`segnaAvvisiLetti` fa `updateDoc` su `accounts/{uid}`**: per l'admin, che non ha il documento, fallisce.
7. Quasi tutti i servizi di fondo sono già condizionati da `entry.kind === 'home'`: un esito `admin` li spegne senza toccarli uno per uno.

## Approcci considerati

**Passaggio di robmass83 e della hotmail**

- *Script unico sul PC (scelto da Roberto).* Richiede il service account, già necessario per il claim; funziona prima di ogni deploy; non lascia online nessuna funzione capace di spostare persone in `shared`.
- *Function admin (`scollegaAdminDaSalone` del piano).* Comoda dall'app, ma disponibile solo dopo il deploy, raddoppia il lavoro e lascia un'azione delicata in produzione. Scartata.

**Rotta `/admin` minima**

- *Admin Manager più Avvisi in una cornice semplice (scelta da Roberto).* La hotmail conserva tutte le funzioni, compresa la scrittura degli avvisi.
- *Solo Admin Manager.* Gli avvisi resterebbero inutilizzabili fino alla Console. Scartata.

## Decisioni

### Fase A — claim e `useRuolo`

Si estende `scripts/imposta-admin.ts`, senza creare il `.mjs` del piano. Si lancia con `node --experimental-strip-types` (`tsx` non è installato) e `GOOGLE_APPLICATION_CREDENTIALS`, service account fuori dal repo. Rispetta `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST`.

| Comando | Effetto |
|---|---|
| `controlla` | Solo lettura. Per Laura, hotmail e robmass83: uid, email verificata, claim, ultimo accesso, `accounts/{uid}`. Per un salone proprio di robmass83: nome, numero di cani, appuntamenti, persone. Del salone di Laura: posti e membri attivi, appuntamenti assegnati all'uid hotmail |
| `claim on\|off <email>` | Imposta o toglie `admin`, conservando gli altri claim |
| `collega` | Elimina l'eventuale salone di prova di robmass83, conserva il suo accesso Auth, scrive `accounts/{uid}` (`salonId` = uid di Laura, `role: socio`, `legacy` falso solo con email confermata) e `salons/{uidLaura}/members/{uid}` (`role: socio`, `status: attivo`, `accessWithoutPro: true`, `collegatoIl`, uid, email, nomi) |
| `stacca` | Elimina `accounts/{uidHotmail}` con i suoi `devices` e `push`, più `salons/{uidLaura}/members/{uidHotmail}` |

Ogni comando che scrive mostra cosa farebbe e scrive solo con `--esegui`.

Blocchi obbligatori, con uscita in errore:

- `collega`: il salone da eliminare deve essere esattamente `salons/{uidRobmass83}`, mai `shared`, mai quello di Laura, mai vuoto; si ferma se il salone ha altre persone, se `accounts/{uidLaura}.salonId` non è l'uid di Laura o se l'account di robmass83 punta a un terzo salone. Se robmass83 non esiste in Auth si ferma e chiede di registrarlo.
- `stacca`: si ferma se la hotmail non ha il claim o se `accounts/{uidRobmass83}.salonId` non è l'uid di Laura. Si ferma anche se robmass83 non ha ancora fatto un accesso dopo `collegatoIl`.

La pulizia delle raccolte globali del salone di prova riusa `pulisciRaccolteSalone`, se importabile dalla build delle functions; `pulisciPersona` non si usa, perché cancellerebbe l'accesso.

`useRuolo()` restituisce `{ admin, caricato }`. Il client legge il claim dal token, con un aggiornamento forzato dopo il login e all'avvio; offline usa il token in memoria, senza errori.

### Fase B — salone condiviso

`ROBERTO_EMAIL` si toglie e `isSharedEmail()` vale solo per Laura. **robmass83 non entra in quella lista**, a differenza del piano: quella lista lega a `shared` chi non ha un account leggibile, cioè a un salone fermo. robmass83 è un socio normale e il client apre il `salonId` del suo account. La logica rimasta su `shared` si toglie col «secondo passaggio» del 24 ottobre, non qui. `greeting.ts` perde la voce hotmail.

### Fase C — permessi

- `operatoreAutorizzato()` vale `input.admin === true`; `isOperator(email)` si elimina.
- `firestore.rules`: `isOperator()` = `signedIn() && request.auth.token.admin == true`.
- Functions: solo `token.admin`. `operatorEmail` resta solo dove serve come dato, per esempio `invitatoDa` in `invitaBeta`.
- `campioneEmail`: dall'email hotmail al claim.
- `eliminaSalone`: restano i blocchi su `shared`, sul chiamante e su `isSharedEmail`.
- Client: `router.tsx`, `TourAvvio`, `AdminManagerPage`, `AvvisiSistemaPage`, `InfoGroomlyPage`, `ProPage`, `SettingsPage` usano il ruolo.
- Tour: esclusione esplicita per Laura (`isLauraEmail`), così non lo vede.
- `ProPage`: l'interruttore del piano Salone resta solo per l'admin. Laura e robmass83 non lo vedono; il valore attuale non cambia.
- `SettingsPage`: si toglie la sezione operatori.

### Fase D — ingresso

- `entryGate` riceve `admin` e lo valuta per primo: `{ kind: 'admin' }`, prima di offline, repair e conferma email.
- `client.ts`, modifica piccola in `watchAuth`: letto il claim, per l'admin si saltano `resolveSalon`, `migrate` ed `ensureShared` e non si lega alcun salone. Un `lastAdmin()` accanto a `lastEmailVerified()` lo espone alla sessione.
- All'avvio, prima che Firebase risponda, l'admin non deve montare pagine del salone: il suggerimento d'accesso ricorda anche `admin`.
- `Guard`: esito `admin` → `/admin`. `LoginSwitch`: esito `admin` → `/admin`, ignorando la destinazione ricordata se non è sotto `/admin`.
- `AdminGuard`: non admin → Home; non autenticato → login.
- Rotte: `/admin` (Admin Manager) e `/admin/avvisi` (Avvisi), con un `AdminFrame` semplice: titolo «Groomly Admin», Esci, collegamento agli Avvisi. Nessun hook del salone.
- `AdminManagerPage` e `AvvisiSistemaPage` ricevono la cornice senza `ShellFrame` quando sono in `/admin`; in sessione admin non si chiama `segnaAvvisiLetti`.
- `PERCORSO_ADMIN` diventa `/admin`. `/impostazioni/admin-manager` e `/impostazioni/utenti` rimandano lì conservando i parametri, per non rompere i link già inviati.
- Va verificato che `usePiano` e `PanoramicaAdmin` funzionino senza salone.

### Fase F — sicurezza

- `adminLog/{id}` = `{ quando, azione, salonId, dettagli }`, scritto da un unico helper nelle functions dopo ogni azione riuscita: piano manuale, `setSalonPro`, elimina salone, azioni beta, config piani, mostra piani, tour, conferma partita IVA, accendi e spegni pagamenti, annuncio, avvisi. Un errore di scrittura del registro si annota nei log ma non annulla l'azione già fatta. Regole: lettura solo admin, scrittura negata.
- Riconferma password, controllata **sul server** con `auth_time`: oltre 15 minuti la function risponde con un codice dedicato. Vale per elimina salone, accendi e spegni pagamenti, avviso a tutti. Il client chiede la password, usa `reauthenticateWithCredential`, aggiorna il token e ripete la chiamata. Le nuove frasi vanno in tutte le lingue.
- Avvisi: nuove callable per pubblicare ed eliminare, con limite di frequenza da `rateLimit.ts` (10 all'ora) e `adminLog`. Nelle regole `avvisiSistema` create e delete diventano `false`.

## Ordine di rilascio (ogni passo col via di Roberto)

1. `controlla`, poi `claim on` sulla hotmail, poi di nuovo `controlla`.
2. Deploy functions (`FUNCTIONS_DISCOVERY_TIMEOUT=60`, senza `--force`), poi regole.
3. Nuova APK pubblicata.
4. Roberto guarda il resoconto di `controlla` su robmass83 e dà il via a `collega --esegui`.
5. Login di robmass83: deve aprire I Pelosetti.
6. Login della hotmail con la nuova APK: deve aprire `/admin`.
7. Laura aggiorna l'APK e controlla il suo salone.
8. `stacca --esegui`.

Fra i passi 2 e 3 la scrittura degli avvisi non è disponibile, e un'APK vecchia di Laura può mostrare la voce admin, che però darà errore. Sono effetti temporanei accettati.

## Test

- `operatoreAutorizzato`: vero solo col claim; falso per Laura, robmass83 e hotmail senza claim.
- Regole su emulatore (`npm run test:rules`): admin legge `salons/*` e `adminLog`; Laura non legge altri saloni ma usa il suo; robmass83 socio con `accessWithoutPro` legge e scrive il salone di Laura anche col piano spento; l'admin non scrive nel salone di Laura; il client non scrive `adminLog` né `avvisiSistema`.
- `entryGate`: claim → `admin`; hotmail mai `repair-salon`; robmass83 senza documento → `repair-salon` (per questo `collega` viene prima del suo accesso).
- Router: rotte salone con admin → `/admin`; `/admin` senza claim → Home; vecchi link conservano i parametri.
- `accountNonEliminabile`: Laura e `shared` sempre protetti.
- Tour: mai per Laura.
- Riconferma: oltre 15 minuti rifiuta, dopo la riautenticazione passa.
- Script: blocchi e modalità di sola prova, su emulatore. Si provano anche con `shared` e col salone di Laura come bersaglio: deve fermarsi.
- `scripts/test360` e `scripts/emu` si aggiornano al claim. `npm test`, `test:rules` e, se praticabile, `test:360` prima e dopo.

## Scelte lasciate a chi implementa

Nomi dei file interni, forma dell'helper di `adminLog`, come passare la cornice alle due pagine, come il suggerimento d'accesso ricorda `admin`, purché le modifiche a `src/data/firebase/client.ts` restino piccole (è in comune con la sessione di conformità).

## Scelte mie, da controllare

Riassunte qui perché Roberto non le ha decise una a una: tour escluso per Laura; robmass83 fuori da `isSharedEmail`; interruttore del piano Salone solo admin; limite di 10 avvisi all'ora; errore del registro che non annulla l'azione; riconferma anche sull'avviso a tutti ma non sulla sua eliminazione; ordine di rilascio con la APK prima di robmass83, diverso dal §5 del piano perché la sua build di prova non è necessaria.
