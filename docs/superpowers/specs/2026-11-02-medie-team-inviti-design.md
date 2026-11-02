# Medie «Team e ruoli» gruppo A (audit 12, 13, 14, 15) — design

Data: 2 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione Medie → «Team e ruoli», punti 12-15. Dettagli delle prove: `test-results/audit/findings/team.md`.

## Perché
Con il piano Salone il titolare invita e toglie persone. Oggi un invito si accetta da solo senza che la persona lo voglia (anche con l'email non confermata), gli inviti sbagliati occupano posti senza che si vedano, un tocco per sbaglio su «Revoca» toglie qualcuno senza avvisarlo, e chi torna su Go o Plus non può più staccare chi è rimasto agganciato, che resta bloccato su «Il titolare ha spento il piano». Obiettivo: ogni entrata e uscita dal team è voluta, visibile e spiegata a chi la subisce.

## Cosa cambia

### 12 — L'invito si accetta solo con un tocco e con l'email confermata
- Server (`acceptInvite`, `functions/src/index.ts`): rifiuta se `request.auth.token.email_verified !== true`, con il messaggio «Conferma la tua email per accettare l'invito». Gli account `legacy` (che l'app già fa entrare senza conferma, `authGate.ts`) restano ammessi.
- Pagina `/invito/:token` (`src/pages/InvitePage.tsx`): non accetta più da sola. Da dentro mostra «Entra nel salone <nome> come <Socio|Collaboratore>» con **Accetta** e **Rifiuta**. Nome del salone e ruolo arrivano da una nuova callable di sola lettura `leggiInvito(token)` che risponde solo all'email invitata (per un'altra email: «Questo invito è per un'altra email»).
- Email non confermata: al posto dei pulsanti «Conferma la tua email per accettare l'invito» (l'invito resta ricordato sul telefono come oggi con `invitoInSospeso`, così dopo la conferma si torna qui).
- Chi ha un salone con dati vede, dopo «Accetta», la scelta pausa/aperto di oggi (A7).
- **Rifiuta**: nuova callable `rifiutaInvito(token)` (solo l'email invitata): l'invito diventa `rifiutato`, il posto si libera (`openInviteExpiries`), il telefono dimentica l'invito, si va in Home.
- Invito già usato da questo stesso account: «Fai già parte di <nome>» con «Vai alla Home» (niente errore rosso). Ogni pagina d'errore dell'invito ha «Vai alla Home».
- I codici grezzi («[400]» e simili) non compaiono mai nei messaggi.

### 13 — Inviti in sospeso visibili e annullabili
- Pagina Team (`ProPage.tsx`), per titolare e socio: sezione «Inviti in sospeso» con email, ruolo, scadenza e **Annulla** (con conferma). Annullare libera subito il posto.
- Gli inviti non si leggono dal client (regole: `invites` chiusi): due callable nuove, `invitiInSospeso()` (elenco degli inviti `aperto` non scaduti del salone di chi chiama, solo titolare/socio) e `annullaInvito(id)`. L'`id` restituito **non è il token** (il token è il segreto del link): è un hash del token; `annullaInvito` lo ritrova tra gli inviti del salone, lo cancella e toglie la scadenza da `openInviteExpiries` in una transazione.
- Dopo un nuovo invito o un annullamento l'elenco si rilegge.

### 14 — «Revoca» con conferma e avviso a chi viene tolto
- In Team, «Revoca» apre una conferma: «Togliere <nome> dal salone? Non vedrà più cani e appuntamenti del salone.» con «Annulla» / «Togli».
- `revokeMember` scrive nel salone personale della persona tolta `salons/<uid>/avvisi/uscita` = `{ salone: <nome del salone>, quando: <ISO>, letto: false }` (stesso schema di `avvisi/piano`: lo legge il titolare del salone, lo scrive solo il server).
- L'app, nel salone personale in cui la persona riparte, mostra in Home una volta l'avviso «Non fai più parte di <salone>. Ora sei nel tuo salone.» con «Ok»; «Ok» chiama la nuova callable `segnaAvvisoUscita` (come `segnaAvvisoPiano`), che mette `letto: true`.

### 15 — Titolare su Go o Plus con persone ancora agganciate
- `revokeDecision` (`src/lib/salonAccess.ts`) non richiede più il piano Salone acceso: titolare e socio possono sempre togliere un membro. Restano vietati la revoca del titolare e la revoca da chi non è titolare/socio di quel salone.
- Pagina Abbonamento (`src/pages/AbbonamentoPage.tsx`), solo per il titolare senza Salone e solo se esistono membri `attivo` diversi da lui: riquadro «Persone ancora collegate al tuo salone» con nome, ruolo e **Togli** (stessa conferma del punto 14). Il titolare legge `members` del proprio salone anche senza Salone (regole: `canUse` vale per il titolare).
- Il collaboratore o socio bloccato (`StaffLock`, `src/components/AccessoSospeso.tsx`) vede, oltre a «Esci», **«Torna al mio salone»** (con conferma), che usa la callable esistente `tornaAlMioSalone` e poi `dopoCambioSalone`. Il testo «Il titolare ha spento il piano» diventa «Il piano Salone di <nome> non è attivo. I dati del salone non sono persi.» (non dice più che il titolare ha spento qualcosa).

## Approcci considerati
- 13, elenco degli inviti: **callable di lettura e annullamento** (scelta: le email degli invitati restano sul server, nessun cambio alle regole) contro un riepilogo con le email dentro `pro/main` (più semplice da ascoltare in tempo reale, ma `pro/main` lo leggono anche i collaboratori, che vedrebbero le email invitate).
- 14, avviso a chi viene tolto: **documento `avvisi/uscita` scritto dal server** (scelta: arriva anche se il telefono era spento o offline al momento della revoca) contro un segno lasciato sul telefono da `StaffLock` prima della ricarica (funziona solo se l'app era aperta).
- 12, nome del salone sulla pagina d'invito: **callable `leggiInvito`** (scelta) contro mettere nome e ruolo nel link (sarebbero modificabili da chiunque).
- 15, chi decide: **sia il titolare (Togli) sia il membro (Torna al mio salone)** (scelta di Claude, Roberto ha detto «procedi»): anticipa per il caso bloccato l'«Esci dal salone» del punto 17, usando una callable che esiste già.

## Non obiettivi
- Nessun «Invia di nuovo» per gli inviti, nessun «copia link» al posto della mail.
- Cambio di ruolo, sospensione/riattivazione, «Esci dal salone» per chi è attivo: punto 17, gruppo B.
- Avviso «Non fai più parte» per chi viene staccato da «Elimina account» o «Elimina salone» del titolare: resta com'è (A7/A8).
- Nessun cambio alle regole Firestore.

## Decisioni di Claude (da controllare)
- Gli account `legacy` accettano senza email confermata.
- «Rifiuta» libera il posto (non lascia l'invito aperto fino alla scadenza).
- L'`id` dell'invito in sospeso è uno SHA-256 del token.
- Il riquadro del punto 15 sta nella pagina Abbonamento, non in Impostazioni.
- L'avviso del punto 14 si mostra in Home come le altre schede d'avviso (per esempio «Il tuo salone è in pausa»).

## Lasciato al costruttore
- Testi esatti in en/es; forma della data di scadenza.
- Test: unità per le decisioni (email non confermata, legacy, rifiuto, annullamento da titolare/socio/collaboratore, revoca senza Salone, revoca del titolare ancora vietata), per le pagine (Invito con Accetta/Rifiuta e casi d'errore, Team con inviti in sospeso e conferma di revoca, Abbonamento con persone collegate, StaffLock con «Torna al mio salone», avviso in Home); verifica sull'emulatore con le funzioni compilate e nel browser (a 390 e 360 px).

## Rilascio
Functions `acceptInvite`, `revokeMember`, `leggiInvito`, `rifiutaInvito`, `invitiInSospeso`, `annullaInvito`, `segnaAvvisoUscita` (nuove le ultime cinque); APK per le pagine Invito, Team, Abbonamento, blocco del collaboratore e Home.
