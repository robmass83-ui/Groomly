# Medie «Account e profilo» (audit 27-30) — design

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, Medie 27-30. Dettagli: `test-results/audit/findings/account.md`, `visivo.md`.

## Perché
Groomly è pensata per saloni in tutta Europa (e poi nel mondo): chi la apre in Francia, Spagna o Germania deve trovare i dati fiscali e i formati del suo paese, e chi la usa in inglese o spagnolo non deve trovare pezzi in italiano. Inoltre le mail ai clienti devono avere come «Rispondi a» l'email vera del salone, gli errori devono essere comprensibili, e chi si registra deve poter leggere privacy e termini.

## Cosa cambia

### 27 — L'email dell'account segue quella di accesso
- A ogni accesso (e al ritorno nell'app dopo la conferma del cambio email), se l'email dell'utente Firebase è verificata ed è diversa da `accounts/<uid>.email`, l'app aggiorna `accounts/<uid>.email` (normalizzata). Le regole lo permettono già (il proprietario cambia campi diversi da `salonId`, `role`, `legacy`).
- Così `replyToDelSalone` (`functions/src/postaHtml.ts`) usa l'email nuova come «Rispondi a».
- Anche i soci/collaboratori aggiornano la propria scheda account (vale per qualunque account), ma il «Rispondi a» resta quello del titolare.

### 28 — Errori chiari e campi obbligatori
- Cambio password, cambio email, eliminazione account (conferma password) e accesso: i codici Firebase `auth/*` diventano testi tradotti (it/en/es) — almeno `wrong-password`, `invalid-credential`, `too-many-requests`, `email-already-in-use`, `invalid-email`, `requires-recent-login`, `weak-password`, `network-request-failed`; qualunque altro codice → «Operazione non riuscita. Riprova.». Mai «Firebase: Error (…)» a schermo.
- In Account (`src/pages/AccountPage.tsx`) e nel tour iniziale: nome della toelettatura e ragione sociale non si salvano vuoti (messaggio «Campo obbligatorio» sotto il campo); gli altri campi restano facoltativi come oggi.

### 29 — Privacy e termini in registrazione
- In `src/pages/LoginPage.tsx` la frase della casella diventa «Accetto la <privacy> e i <termini>» con le due parole come link che aprono `/privacy` e `/termini` (pagine già pubblicate in `hosting/`), in una nuova scheda/finestra esterna nell'app Android (stesso meccanismo degli altri link esterni dell'app). Toccare un link non spunta la casella.

### 30 — Paese del salone, formati e lingue (strada A, scelta da Roberto)
- **Paese del salone**: nuovo campo `settings.business.paese` (codice ISO a due lettere, es. `IT`, `FR`, `ES`, `DE`; `ALTRO` per fuori elenco). In Account (scheda Attività) e nel tour: selettore «Paese» con i paesi dell'UE + Regno Unito, Svizzera, Norvegia + «Altro», nomi nella lingua dell'app.
  - Compilazione automatica, solo finché il titolare non l'ha scelto: dall'indirizzo scelto dai suggerimenti (la callable `dettaglioIndirizzo` restituisce anche il paese dall'`addressComponents` di Google Places), altrimenti dal fuso orario del telefono (`Intl.DateTimeFormat().resolvedOptions().timeZone`, tabella fuso → paese per i paesi in elenco), altrimenti `IT` per i saloni esistenti senza paese (oggi sono italiani).
  - Il titolare può sempre cambiarlo.
- **Dati fiscali per paese**: il campo oggi chiamato «Partita IVA» prende nome e formato dal paese (`src/lib/profile.ts`):
  - partita IVA / numero IVA con il formato del paese (IT 11 cifre senza prefisso come oggi, FR «FR» + 2 caratteri + 9 cifre, ES NIF/CIF/NIE, DE «DE» + 9 cifre, e gli altri paesi UE con i formati IVA ufficiali; GB, CH, NO con i loro formati; il prefisso del paese si accetta sia con sia senza);
  - codice fiscale (16 caratteri) solo per `IT`; per gli altri paesi il secondo campo non c'è;
  - `ALTRO`: campo libero senza controllo;
  - errori nella lingua dell'app, con un esempio del formato atteso.
  - Validazione solo di formato (nessun controllo online tipo VIES).
- **Formati**: date (giorni, mesi), numeri e importi in tutta l'app seguono la lingua dell'app (oggi alcune parti usano un formato fisso italiano, es. `IT_DATE` in `src/lib/earnings.ts`). La valuta resta l'euro.
- **Testi rimasti in italiano**: tradotti in en/es — date e giorni degli incassi, Gestione listino, foglio di esportazione del listino, archivio animali, ripristino backup (compresa la parola da scrivere per confermare, che diventa quella della lingua), e ogni altro testo fisso trovato nelle stesse pagine.
- `<html lang>` segue la lingua dell'app.

## Approcci considerati
- 30, come si conosce il paese: **A, campo «Paese» compilato da indirizzo e telefono, modificabile** (scelta di Roberto) contro B, solo dall'indirizzo (resta sconosciuto senza indirizzo suggerito) e C, solo dal telefono (sbaglia con telefoni impostati altrove).
- 27: **aggiornare la scheda dell'account dall'app all'accesso** contro una funzione del server che ascolta i cambi di Firebase Auth (non esiste un evento affidabile per il cambio email senza Identity Platform).
- 28, 29: una sola strada sensata.

## Non obiettivi
- Nessuna lingua nuova (francese, tedesco…): un salone francese usa l'app in inglese con i dati fiscali francesi. Aggiungere lingue è un lavoro a parte.
- Nessuna valuta diversa dall'euro.
- Nessuna verifica online della partita IVA.
- Pagine pubbliche (sito, pagina del salone) invariate salvo quanto già tradotto.

## Decisioni di Claude (da controllare)
- Saloni esistenti senza paese → Italia.
- Elenco paesi: UE + Regno Unito, Svizzera, Norvegia + «Altro».
- Prefisso del paese accettato sia presente sia assente nella partita IVA.
- La parola di conferma del ripristino backup segue la lingua (es. «REPLACE», «SUSTITUIR»).

## Lasciato al costruttore
- Tabella dei formati IVA dei paesi (fonte: formati ufficiali UE) e tabella fuso → paese.
- Testi esatti en/es.
- Test: unità per formati IVA (almeno IT, FR, ES, DE, AT, NL, BE, PT, GB, ALTRO), per paese dal fuso e dall'indirizzo, per la mappa degli errori `auth/*`, per l'aggiornamento dell'email; pagine (Account, Login, tour) con i nuovi campi; ricerca di testi italiani fissi rimasti nelle pagine toccate; verifica nel browser in it/en/es a 320/360/390 px.

## Rilascio
Function `dettaglioIndirizzo` (paese dall'indirizzo); APK; hosting se cambia qualcosa nelle pagine pubbliche (no previsto).
