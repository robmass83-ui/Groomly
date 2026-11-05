# Groomly — Account Admin dedicato e Console Admin (app + web)

> Piano per Claude Code / Cursor (/superpowers → /brainstorm → piano → esecuzione completa fino in fondo, scegliendo da solo le opzioni consigliate).
> Data: 5 novembre 2026 · Versione di partenza: 1.1.191 · Sostituisce la versione precedente di questo file.

## 1. Decisione di Roberto

| Email | Diventa | Cosa vede al login |
|---|---|---|
| `masala.roberto@hotmail.it` | **Solo amministratore della piattaforma.** Esce dal salone di Laura. Nessun salone. | Entra **direttamente nella Console Admin**. Mai la Home di un salone. |
| `robmass83@gmail.com` | Membro del salone **I Pelosetti** (`shared`) al posto della hotmail. | La Home di I Pelosetti, come oggi faceva la hotmail. |
| `laura.masala@tiscali.it` | Titolare di I Pelosetti, **VIP** per sempre. **Non più operatore/admin.** | Il suo salone, identico a oggi. |

La Console Admin deve essere usabile **dall'app** (APK/Play) e **dal PC via web** (`admin.groomlyapp.it`), con lo stesso login hotmail.

**Regola d'oro:** i dati del salone `shared` (I Pelosetti) non vanno mai modificati né migrati. Si cambia solo *chi* ci entra.

---

## 2. Com'è oggi (verificato nel codice)

| Punto | Dove | Situazione |
|---|---|---|
| Email del salone condiviso | `src/lib/salonPath.ts` → `LAURA_EMAIL`, `ROBERTO_EMAIL`, `isSharedEmail()` | `ROBERTO_EMAIL = 'masala.roberto@hotmail.it'` entra in `shared` come membro "legacy" titolare, solo-cloud (`usesOnlyCloudData`). |
| Chi è operatore | `salonPath.ts` → `isOperator()` = `isSharedEmail()`; `operatoreAutorizzato()` = claim `admin` **oppure** email Laura/Roberto verificata | **Anche Laura è operatore.** |
| Regole | `firestore.rules` → `isOperator()` | Stessa logica a email (righe 7–17). Gli operatori leggono `salons/*`, possono creare/eliminare (righe ~95–359). |
| Functions | `beta/comune.ts`, `piano/eliminaSalone.ts`, `piano/impostaPianoManuale.ts`, `config/impostaConfigPiani.ts`, `config/impostaTour.ts`, `abbonamenti/annuncio.ts`, `abbonamenti/index.ts`, `index.ts` (~590) | Usano `operatoreAutorizzato()`. |
| Ingresso al salone | `src/lib/authGate.ts` | Senza documento `accounts/{uid}`: email shared → Home, altrimenti `repair-salon`. Non esiste un esito "admin". |
| Creazione account shared | `src/data/firebase/client.ts` (~2231, 2289, 2409) → `sharedMemberAccount()` | Le email shared ricevono un `accounts/{uid}` con `salonId: 'shared'`, `legacy: true`. |
| Persone del salone | `src/hooks/usePersoneSalone.ts`, `src/pages/AppointmentPage.tsx` | Usano `isSharedEmail`. |
| Inviti | `src/lib/salonAccess.ts` (riga 122) | Le email shared **non si possono invitare**; gli inviti per `shared` hanno percorsi speciali (riga 97). |
| Admin Manager | `src/pages/AdminManagerPage.tsx`, `src/components/admin/*`, `src/lib/adminManager.ts`, rotta `/impostazioni/admin-manager`, voce in `SettingsPage.tsx` (~769) | Dentro le Impostazioni del salone. Tab: Panoramica · Saloni · Beta · Feedback · Suggerimenti · Piani. |
| Protezioni | `src/lib/accountProtetto.ts` | Laura e `shared` non eliminabili. ✅ Da mantenere. |
| Metriche | `functions/src/beta/contatoriAdmin.ts` | Solo `ultimoAccesso` per salone. **Niente Analytics/Crashlytics.** |
| Web | `hosting/` + `firebase.json` | Solo pagine statiche. L'app React non è sul web. |

---

## 3. Architettura finale

1. **Ruolo admin = custom claim Firebase** `admin: true` sull'UID della hotmail. Nessuna email decide più i permessi admin (né nel client, né nelle regole, né nelle functions).
2. **L'account admin non ha salone.** Nessun `accounts/{uid}` con `salonId`; il gate d'ingresso riconosce il claim e manda sempre a `/admin`.
3. **`robmass83@gmail.com` prende il posto della hotmail in `shared`**, con gli stessi poteri di oggi (vedi Fase B, opzione consigliata).
4. **Console Admin = applicazione a sé dentro lo stesso codice**: rotte `/admin/*`, layout proprio, nessun componente del salone. Stesso bundle per Android e per il web (`admin.groomlyapp.it`).

---

## 4. Lavori

### Fase A — Claim admin
1. Script `scripts/imposta-admin.mjs` (firebase-admin; service account **fuori dal repo**, percorso da variabile `GOOGLE_APPLICATION_CREDENTIALS`):
   - `node scripts/imposta-admin.mjs masala.roberto@hotmail.it on|off`
   - imposta/rimuove `{ admin: true }` preservando gli altri claim; stampa il risultato; supporta gli emulatori.
2. Hook client `useRuolo()` → `{ admin, caricato }` da `getIdTokenResult(true)` subito dopo il login.
3. **Eseguire lo script in produzione per primo**, prima di qualsiasi deploy.

### Fase B — Spostare l'accesso a I Pelosetti dalla hotmail a robmass83
**Opzione consigliata (A): sostituzione diretta nella lista del salone condiviso.** Stesso comportamento di oggi, zero rischi sugli inviti `shared`.
1. `salonPath.ts`: `ROBERTO_EMAIL` → rinominare in `ROBERTO_SALONE_EMAIL = 'robmass83@gmail.com'`. `isSharedEmail()` = Laura **o** robmass83. La hotmail non compare più qui.
2. Aggiornare tutti gli usi (`client.ts`, `authGate.ts`, `usePersoneSalone.ts`, `AppointmentPage.tsx`, `salonAccess.ts`, test) senza cambiare la logica.
3. `firestore.rules`: nessuna email nelle regole per l'admin (Fase C). Se le regole contengono altrove l'email della hotmail per `shared`, sostituirla con robmass83.
4. Primo login di robmass83: il flusso esistente crea `accounts/{uid}` con `sharedMemberAccount()` (legacy, titolare, solo-cloud). **Nessuna scrittura sui dati del salone.**
5. **Pulizia hotmail** (function una tantum `scollegaAdminDaSalone`, chiamabile solo da admin, idempotente): elimina **solo** `accounts/{uidHotmail}` e l'eventuale riga della hotmail in elenchi persone/membri di `shared`. Non tocca cani, appuntamenti, incassi.

*Opzione B (scartata per ora):* invitare robmass83 come socio con il flusso inviti. Richiede di verificare/estendere i percorsi speciali di `shared` in `salonAccess.ts` e la condizione `proEnabled('shared')` nelle regole per socio/collaboratore. Da valutare solo se in futuro si vuole che Laura possa gestire/revocare lei l'accesso.

### Fase C — Permessi solo da claim
1. `salonPath.ts`: `operatoreAutorizzato()` → `input.admin === true`. **Eliminare** `isOperator(email)`; tutti gli usi → `useRuolo().admin` (client) o `token.admin` (functions).
2. `firestore.rules`:
   ```
   function isOperator() {
     return signedIn() && request.auth.token.admin == true;
   }
   ```
3. Functions elencate al §2: solo `token.admin`; togliere `operatorEmail` dove non serve.
4. `router.tsx` (~89, `ProPage` per operatore) → `useRuolo().admin`.
5. Laura: perde ogni accesso admin; il suo salone continua a funzionare (verificato dai test §6).

### Fase D — Ingresso diretto in Console per la hotmail
1. `authGate.ts`: nuovo esito `{ kind: 'admin' }`, valutato **per primo**: se il token ha `admin: true` → `/admin`. Mai `repair-salon`, mai onboarding/creazione salone, mai Home salone.
2. Se un utente admin apre una rotta del salone (`/`, `/animali`, …) → redirect a `/admin`.
3. Se un utente non admin apre `/admin/*` → redirect alla sua Home (app) o pagina "Accesso riservato" + logout (web).
4. In sessione admin **non** si avviano: sincronizzazione dati salone, notifiche locali appuntamenti, backup automatico, tour iniziale, controllo piano/abbonamento, schede beta. Push solo per eventi admin (nuovo feedback, nuovo suggerimento, nuovo salone) — opzionale.
5. Login: schermata invariata. Logout dalla Console → torna al login.

### Fase E — Console Admin (struttura e funzioni)
Layout `AdminLayout`: barra superiore antracite «Groomly Admin», menu laterale su PC (≥ 900 px) e menu a schede/drawer su telefono; chiaro/scuro; stile compatto dell'app. Riutilizzare **spostando** i componenti di `src/components/admin/*` e la logica di `src/lib/adminManager.ts` (non riscriverli).

| Rotta | Contenuto |
|---|---|
| `/admin` | **Panoramica**: KPI del giorno, «Da fare oggi» (inviti in scadenza, beta che finiscono, feedback/suggerimenti da leggere, nuovi saloni), +30 gg al volo. |
| `/admin/saloni` | Elenco saloni con ricerca e filtri esistenti (Avvisami, piano, beta, attivi/inattivi), selezione multipla, inviti beta. |
| `/admin/saloni/:salonId` | Scheda salone: piano effettivo e perché, azioni (Attiva Plus/Salon, Regala 30 gg, Estendi, Revoca, Torna a Go, Early adopter, Elimina con ELIMINA), storico, feedback, ultimo accesso, conteggi (cani, appuntamenti, collaboratori), versione app e lingua. **Solo dati aggregati: niente nomi/telefoni dei clienti finali.** |
| `/admin/beta` | Inviti per stato. |
| `/admin/assistenza` | **Nuovo — rispondere.** Un'unica casella con suggerimenti, feedback beta e segnalazioni: stato (nuovo/in corso/risolto), **risposta al salone** che arriva come avviso nell'app (Avvisi di sistema) e, se scelto, anche via email Brevo da `service@groomlyapp.it`; risposte rapide salvate; filtri; esportazione PDF/Excel. |
| `/admin/comunicazioni` | **Nuovo.** Avviso a tutti / a un filtro di saloni (in-app + email facoltativa), con anteprima e lingua. Include l'«Annuncio pagamenti» esistente. |
| `/admin/piani` | Interruttori beta, offerta early adopter, RevenueCat, pannello di accensione (invariati). |
| `/admin/metriche` | **Nuovo** — vedi Fase G. |
| `/admin/registro` | **Nuovo** — storico di tutte le azioni admin (Fase F). |
| `/admin/sistema` | Versione pubblicata (`hosting/release.json`), aggiornamento APK, tour, link rapidi: Firebase, Crashlytics, Analytics, Play Console, Brevo, RevenueCat. |

Redirect di compatibilità: `/impostazioni/admin-manager`, `/impostazioni/utenti` (e i parametri `tab`/`zona` di `percorsoAdmin.ts`) → rotta `/admin/...` corrispondente; i link già inviati per email devono continuare a funzionare. Rimuovere la sezione "hub operatori" da `SettingsPage.tsx`.

### Fase F — Sicurezza
1. Registro `adminLog/{id}` scritto **solo dalle functions**: `{ quando, azione, salonId, dettagli }` per ogni azione della console. Regole: lettura solo admin, scrittura client negata.
2. Azioni distruttive (Elimina salone, ACCENDI/Spegni pagamenti, avviso a tutti): oltre alla conferma attuale, **riconferma password** se l'ultimo login ha più di 15 minuti.
3. Web: persistenza di sessione `browserSessionPersistence`; `noindex`.
4. Le risposte in Assistenza e le Comunicazioni passano da functions con limite di frequenza (`rateLimit.ts` esistente).

### Fase G — Web `admin.groomlyapp.it`
1. `firebase.json` multi-sito: target `pubblico` → `hosting/` (invariato); target `admin` → `dist-admin/` con rewrite `** → /index.html`.
2. Creare il sito Hosting `groomly-admin`; `firebase target:apply hosting admin groomly-admin`.
3. Script npm `build:admin` (`VITE_ENTRY=admin vite build --outDir dist-admin`) e `deploy:admin`.
4. Con `VITE_ENTRY=admin` il bundle monta solo login + `/admin/*`; nessun plugin Capacitor (proteggere con `Capacitor.isNativePlatform()`).
5. Dominio personalizzato `admin.groomlyapp.it` (DNS su Hostinger), dominio autorizzato in Firebase Auth, sito registrato in App Check.
6. Layout desktop: tabelle larghe, menu laterale fisso; stesso codice responsive per il telefono.

### Fase H — Metriche e successo dell'app
**Strumenti gratuiti:** Firebase Analytics (`@capacitor-firebase/analytics`), Crashlytics (`@capacitor-firebase/crashlytics`), Play Console.

**Eventi** (solo a livello salone, mai dati dei clienti finali): `sign_up`, `salone_attivato` (primo cane + primo appuntamento), `cane_creato`, `appuntamento_creato/completato/disdetto`, `listino_condiviso`, `report_esportato`, `vetrina_piano_vista`, `avvisami_toccato` (param `piano`), `beta_accettata/rifiutata`, `backup_eseguito` (auto/manuale). User property: `piano`, `lingua`, `ruolo`.
**Esclusi dalla raccolta:** account admin, saloni VIP (I Pelosetti), saloni di test 360°.

**KPI in `/admin/metriche`** (calcolati sul server):
1. Function pianificata notturna `statisticheGiornaliere` (europe-west1) → `stats/giornaliere/{AAAA-MM-GG}` usando aggregazioni `count()`:
   saloni totali e nuovi; attivi 1/7/30 giorni (da `ultimoAccesso`); saloni attivati; appuntamenti del giorno (totale e media per salone attivo); retention 7/30 giorni per coorte settimanale; «Avvisami» Plus/Salon; crash degli ultimi 7 giorni (link a Crashlytics).
2. Card KPI + grafico a barre 30/90 giorni (stile grafico Incassi) + tabella coorti; esportazione Excel.

**Privacy:** aggiornare pagine legali (web e app, 5 lingue) con Analytics e Crashlytics; interruttore «Condividi statistiche d'uso anonime» nelle Impostazioni del salone (default acceso).

---

## 5. Ordine di rilascio (per non chiudersi fuori)
1. Script claim `admin` sulla hotmail (produzione) e verifica.
2. Roberto installa la nuova build di prova e accede con **robmass83** a I Pelosetti (dopo il deploy della Fase B).
3. Deploy functions → deploy regole → `deploy:admin` (web) → nuova APK.
4. Login con la hotmail: deve aprire la Console. Poi eseguire `scollegaAdminDaSalone`.
5. Solo dopo che tutto funziona: rimuovere ogni residuo dell'email hotmail dal codice del salone.

## 6. Test (prima e dopo)
**Unit / regole (emulatore)**
- `operatoreAutorizzato`: vero solo con claim; falso per Laura, robmass83 e hotmail senza claim.
- Regole: admin legge `salons/*`, `adminLog`, `stats`; **Laura non legge** `salons/{altro}` ma legge/scrive `salon/shared` come oggi; **robmass83 legge/scrive `salon/shared`**; **hotmail (admin) non ha accesso di scrittura a `salon/shared`** come membro; client non scrive `adminLog`.
- `authGate`: claim admin → `admin`; robmass83 senza account doc → `home` (shared); hotmail mai `repair-salon`.
- `percorsoAdmin`: vecchi link → nuove rotte.
- `accountNonEliminabile`: Laura e `shared` sempre protetti.

**Interfaccia**
- hotmail (app e web): login → Console; rotte salone → rimandato a `/admin`; nessuna sync/notifica/backup salone.
- robmass83: login → Home I Pelosetti, tutte le funzioni come prima la hotmail.
- Laura: nessuna voce admin; salone identico (cani, appuntamenti, incassi, listino, backup).
- Salone normale: `/admin` a mano → Home.
- Assistenza: risposta a un suggerimento → avviso nell'app del salone (+ email se scelta).

**Test 360°:** `npm run test:360` prima e dopo; le metriche escludono i saloni finti; poi cancellare tutti i dati di test. Il seed non tocca mai `shared`.

## 7. Criteri di accettazione
- [ ] La hotmail entra solo nella Console Admin (app e `admin.groomlyapp.it`), mai in un salone.
- [ ] robmass83 entra in I Pelosetti con gli stessi poteri che aveva la hotmail.
- [ ] Laura VIP, non eliminabile, non più admin; salone invariato.
- [ ] Permessi admin solo da claim (grep `hotmail` → assente da regole, functions e logica permessi).
- [ ] Console con Panoramica, Saloni, Beta, Assistenza (con risposte), Comunicazioni, Piani, Metriche, Registro, Sistema.
- [ ] Vecchi link admin funzionanti; voce admin rimossa dalle Impostazioni del salone.
- [ ] `adminLog` per ogni azione; riconferma password per le azioni distruttive.
- [ ] Analytics + Crashlytics attivi con esclusioni; privacy aggiornata in 5 lingue.
- [ ] `docs/GUIDA-ADMIN-MANAGER.md` riscritta per la nuova Console; `PROGRESS.md` aggiornato; versione incrementata; tutti i test verdi.

## 8. Cose da fare a mano (Roberto)
1. Scaricare il service account Firebase in una cartella fuori dal repo e lanciare lo script del claim.
2. Creare il sito Hosting `groomly-admin`, collegare `admin.groomlyapp.it` (DNS Hostinger), aggiungerlo ai domini autorizzati di Auth e ad App Check.
3. Collegare Google Analytics al progetto `groomly-3128b` e attivare Crashlytics.
4. Fare il primo login con robmass83 su I Pelosetti **prima** di scollegare la hotmail.
