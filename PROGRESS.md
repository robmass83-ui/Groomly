# PROGRESS — dove eravamo rimasti (6 novembre 2026)

Per riprendere in una chat nuova: «Leggi PROGRESS.md e riprendi da “Punto della situazione”».

## Punto della situazione (6 novembre)

Questa sezione sostituisce le chat del 5 e 6 novembre. Le etichette «non unito» nelle sezioni più in basso sono storiche: tutti i rami di quelle sezioni sono uniti in `main`.

### Stato
- **Online:** 1.1.194, firmata con la chiave Groomly. Il tag è `v1.1.194`.
- **`main` locale:** 3 commit oltre `origin/main`, oltre all'aggiornamento di questo file. Sono la scheda Plus con le prenotazioni online per prime, in cinque lingue. Non sono pubblicati e non è stato fatto il push.
- **Unico lavoro in corso:** la chat «Test lenti, promemoria, QA, documenti e pulizia», ramo `claude/rifiniture-test-pulizia-91bb22`. Vedi «In corso» qui sotto.

### Fatto nelle chat
- **Piani e conformità** (coordinamento dei quattro blocchi): accessi admin, conformità legale, Console, metriche. Tutti pubblicati.
- **Conformità nel codice:** pubblicata con la 1.1.192. Stato voce per voce in `docs/legal/STATO-CONFORMITA.md`.
- **Accessi admin:** pubblicati con la 1.1.192. Permessi solo dal claim, `adminLog`, riconferma password.
- **Console Admin e sito admin:** pubblicati. `admin.groomlyapp.it` risponde, il certificato è a posto (chat «Accesso al sito web»).
- **Metriche e testi legali:** pubblicati con la 1.1.193. Privacy 3, Termini 2, DPA 2. Analytics e Crashlytics restano spenti fino al sì del titolare.
- **Agenda:** visite accavallate e razza sotto il servizio, pubblicate con la 1.1.193.
- **Navigazione e Magazzino:** pubblicati con la 1.1.193. Impostazioni dall'icona del profilo, voce Altro, Magazzino in `/altro/magazzino`, collezione `salons/{id}/prodotti`. Design in `docs/superpowers/specs/2026-11-05-nav-profilo-altro-design.md` e `2026-11-05-magazzino-design.md`.
- **Lingua del sito:** la pagina del salone segue la lingua del browser, l'avviso di orario scaduto la lingua nuova. Pubblicati con la 1.1.193.
- **Console Oggi:** home con azioni, tasto + e ricerca, pubblicata con la 1.1.194.
- **Avviso legale:** inviato da Roberto a Laura. La riaccettazione parte il 2026-12-01 (`RIACCETTA_DAL`). Le accettazioni non vanno mai scritte al posto degli utenti.
- **Prove sul telefono con la 1.1.194 e controlli su I Pelosetti:** Roberto le ha date per fatte il 6 novembre.

### Decisioni prese
- **Lingua:** vale quella del telefono. Se l'utente la cambia in Impostazioni, vince la sua scelta. La posizione non si usa per le installazioni nuove.
- **Magazzino:** il collaboratore vede, aggiunge e modifica; elimina solo chi ha rango di titolare. È per tutti i piani. L'eliminazione è definitiva, con conferma.

### In corso
La chat di rifinitura, partita il 6 novembre, ha cinque lavori. Non unisce, non fa push e non pubblica. Se la chat si perde, si riparte da qui:
1. `npm run test:slow`: 26 test rossi, 23 in `DogsPage` e `LoginPage`, 3 in `src/pages/appointments.test.tsx`. Per ogni gruppo capire se sbaglia il test o il codice, senza indebolire i test.
2. Promemoria mensile: se la lingua cambia con l'app aperta, il testo in coda si aggiorna solo al prossimo avvio. Seguire il commit `0eefb06f` e tenere conto di `src/app/providers.tsx`.
3. Catalogo QA: riallineare le 18 pagine disallineate, più Altro e Magazzino.
4. `docs/DA-FARE-ROBERTO.md`: parla ancora della 1.1.127 e della chiave debug, va portato allo stato reale.
5. Pulizia dei worktree vecchi, per ultima, con le regole della memoria `worktree-junction-node-modules`: prima `cmd /c rmdir` sulle giunzioni, poi `git worktree remove`, mai cancellazioni ricorsive.

Al 6 novembre i lavori erano ancora al primo punto. Controllare con `git log main..claude/rifiniture-test-pulizia-91bb22` cosa è già fatto.

### Prossimo passo
1. Finita la rifinitura, unire `claude/rifiniture-test-pulizia-91bb22` in `main`.
2. Fare un rilascio unico con la scheda Plus e le rifiniture: suite, push, APK con `assembleGithubRelease`, release GitHub, hosting. Vedi le memorie `rilascio-cartella-pulita` e `release-apk-firma-debug`.

### Da fare a mano (Roberto)
Non risulta che siano stati fatti: spuntarli qui quando sono chiusi.
- [ ] **Account admin:** creare la chiave in `C:\Users\masal\.groomly\admin-sdk.json`, lanciare `scripts/imposta-admin.ts collega`, poi `collega --esegui`. Provare i tre accessi: robmass83 apre I Pelosetti, la hotmail apre `/admin`, Laura il suo salone. Solo dopo, `stacca --esegui`.
- [ ] **Google Analytics:** collegarlo a `groomly-3128b`, conservazione 2 mesi, segnali Google e pubblicità spenti.
- [ ] **Crashlytics:** attivarlo in Firebase Console per `it.groomly.app`.
- [ ] **Storage:** se è attivo, copiare lì le regole di `storage.rules`.
- [ ] **Console Oggi:** Roberto ha detto che nella home non appare nulla. Con «Tutto fatto per oggi» e i numeri è normale; con pagina bianca o numeri che non arrivano è un difetto da guardare.
- [ ] **«Ho cambiato idea»:** provarlo quando capita un link di disiscrizione in un'email ai clienti.
- [ ] **Laura:** deve avere almeno la 1.1.193 prima del 1° dicembre.
- [ ] **Notifiche in inglese:** causa mai dimostrata. La lettura del 5 novembre dava `lingua` italiana per Laura e per il socio. Se ne arriva un'altra, annotare testo esatto, ora e telefono.
- [ ] **Server di prova locali** rimasti accesi: chiuderli.

### Solo all'apertura di Play e dei pagamenti
- Play: Scheda sicurezza dati da `docs/play/scheda-sicurezza-dati.md`, screenshot senza nomi di saloni veri, traduzioni francese e tedesco, test chiuso con 12-15 tester, App Check.
- Pagamenti: Partita IVA, RevenueCat e webhook. Elenco in `docs/legal/PRIMA-DEI-PAGAMENTI.md`.
- Prima di accendere Plus e Salon: far rileggere Termini, Privacy e DPA a un professionista.

### Prima di cancellare le chat
- **Aspettare la fine della rifinitura.** La chat di rifinitura e quella «Modifiche applicazione toelettatura», che deve unire e rilasciare, vanno tenute finché non hanno finito, oppure il seguito passa a una chat nuova con questo file.
- **Giunzioni:** il 6 novembre restavano in `beta-b1-server-12dde6` (`functions/node_modules`) e in `lingua-notifiche-sito-02f033` (`node_modules` e `functions/node_modules`), cioè i worktree delle chat Agenda e Lingua. Cancellare quei worktree prima della pulizia può svuotare `D:\Groomly\node_modules`.
- Le chat di «Masala Brother app» sono di un altro progetto: questo file non le copre.

## Rilascio 1.1.193 (6 novembre)

- Pubblicati insieme: metriche e testi legali, agenda con visite accavallate e razza, profilo in alto, pagina Altro e Magazzino, lingua della pagina del salone, avviso orario scaduto.
- Riaccettazione dal 2026-12-01: avviso a Laura già inviato (`docs/legal/AVVISO-DOCUMENTI.md`).

## Obiettivo generale

1. Audit QA completo dell'app (fatto) → report `docs/AUDIT-QA-2026-11-01.md` (2 critiche, 10 alte, 34 medie, ~65 basse).
2. Sistemare i problemi **uno alla volta**, ognuno con questo flusso deciso da Roberto:
   `/brainstorming` → specifica → piano (`writing-plans`) → esecuzione **con sotto-agenti** (`subagent-driven-development`: implementatore + revisione per task, revisione finale del ramo col modello più capace, un'unica ondata di correzioni) → verifica (`/qa-my-app:verify` nel browser + script che chiamano le funzioni compilate sull'emulatore) → solo dopo segnare «risolto» nell'audit → merge in `main` → deploy functions/regole/hosting → release APK (memoria `release-apk-automatica`; niente APK se cambiano solo server o pagina pubblica).
   - Un brainstorming per gruppo: **un'area dell'audit, fino a circa 6 problemi** (deciso il 3 novembre; prima erano massimo 4); i bassi a gruppi di 8-10.
   - Ordine dell'audit: ~~C1~~, ~~C2~~, ~~A5~~, ~~A6~~, ~~A1~~, ~~A2~~, ~~A3~~, ~~A4~~, ~~A9~~, ~~A7~~, ~~A8~~, ~~A10~~ (**critiche e alte tutte chiuse**), poi le medie per area: ~~Dati e caricamento (1-4)~~, ~~Prenotazioni online e piani (5-11)~~, ~~Team e ruoli (12-17)~~, ~~Agenda e incassi (18-22)~~, ~~Animali/mensili/listino (23-26) e 35~~, ~~Account e profilo (27-30)~~, ~~Home e telefono (31, 32, 34)~~ (**medie tutte chiuse**).
3. **Mai toccare i dati veri di Laura** (salone in produzione): tutti i test girano sugli emulatori `demo-groomly`. In produzione oggi c'è un solo salone vero, quello di Laura (Salone omaggio senza scadenza). Letture in produzione solo col permesso di Roberto e solo in lettura.

**Conteggio (4 novembre, dopo la 1.1.188):** critiche, alte, medie e basse dell'audit tutte chiuse. Le ultime sei righe di basse (Prenotazioni, Team, Animali e mensili, Account, Grafica, Telefono) sono state fatte in sessioni parallele, unite in `main` e pubblicate insieme nella 1.1.188.

## Stato di `main`
- **Metriche e testi legali (blocco 4 di 4, 5/11/2026) — unito, pubblicato con la 1.1.193.**
  - Design `docs/superpowers/specs/2026-11-05-metriche-legale-design.md`, piano `docs/superpowers/plans/2026-11-05-metriche-legale.md`.
  - `/admin/metriche` con numeri notturni in `statsGiornaliere`. Analytics e Crashlytics spenti fino al sì del titolare, solo sui suoi telefoni.
  - Privacy 3, Termini 2, DPA 2 in 5 lingue, vecchi testi in `/privacy/v2/`, `/termini/v1-1/`, `/dpa/v1/`. `VERSIONE_DOCUMENTI` è 2.
  - La riaccettazione parte da `RIACCETTA_DAL`, fissata al 2026-12-01. Sequenza del via in `docs/legal/AVVISO-DOCUMENTI.md`.
  - Da fare a mano: collegare Analytics, attivare Crashlytics, compilare la Scheda da `docs/play/scheda-sicurezza-dati.md`, far rileggere i testi prima di accendere Plus e Salon.
- **Console Admin e sito admin (blocco 3 di 4, 5/11/2026) — unita e pubblicata.**
  - Design `docs/superpowers/specs/2026-11-05-console-admin-design.md`, piano `docs/superpowers/plans/2026-11-05-console-admin.md`.
  - Rotte `/admin/*` con `AdminLayout`, Assistenza con risposte, Comunicazioni con email promozionali e di servizio, Registro, Sistema, scheda salone con numeri aggregati, sito con ingresso proprio (`build:admin`, `deploy:admin`).
  - Avvisi per account in `accounts/{uid}/avvisi`, contatore email comune in `functions/src/postaGiorno.ts`.
  - Da fare a mano: sito Hosting `groomly-admin`, DNS Hostinger, domini autorizzati, App Check. Elenco in `docs/GUIDA-ADMIN-MANAGER.md`.
- Ultima release: **1.1.194** (vedi «Punto della situazione»). Nota del 4 novembre, per la 1.1.189: (GitHub release v1.1.189 + hosting `release.json` aggiornati; functions ridistribuite il 4 novembre). Function `dettaglioIndirizzo` in produzione dal 3 novembre (paese dall'indirizzo). Tutti i rami qui sotto sono uniti in `main` e pushati.
- Rami di lavoro (già uniti, restano su GitHub): `fix/c2-chiusura-tiene-assegnatario`, `fix/a5-collaboratore-soldi-regole`, `fix/a1-lista-attesa-solo-col-piano`, `fix/a2-prova-solo-a-chi-non-ha-mai-avuto-plus`, `fix/a3-impegni-bloccano-promemoria-no`, `fix/a8-a9-elimina-account-titolare`, `fix/a7-invito-non-si-perde`, `fix/piccole-decisioni-dopo-a7`, `fix/a10-esci-pulisce-il-telefono`, `fix/medie-dati-e-caricamento`, `fix/medie-prenotazioni-online`, `fix/medie-piani`, `fix/medie-team-inviti`, `fix/medie-team-ruoli`, `fix/medie-agenda-incassi`, `fix/medie-animali-listino`, `fix/medie-account-profilo`, `fix/medie-home-telefono`, `fix/listino-razza-server`, `fix/basse-validazioni`.
- **Beta Plus/Salon (4/11/2026) — unita in `main`, pubblicata con la 1.1.189.**
  - Ondate A (A1 fondamenta, A2 design, A3 nomi «Salon») e B (B1 server, B2 Admin Manager, B3 app del salone, B4 abbonamenti spenti) unite. Coordinamento in `docs/superpowers/specs/2026-11-04-beta-piani-ondate-coordinamento.md`. Il pannello di accensione di B4 è montato nel tab Piani.
  - Verifiche: app 3249/3250 (solo il noto `driveInvio`), functions 364/364, regole 24/24.
  - Collaudo server `scripts/emu/beta.mjs`: 13/13 sul codice unito.
  - Collaudo dell'app sugli emulatori a 360×640, chiaro e scuro: card e pagina dell'invito, badge BETA e giorni, modulo feedback, Admin Manager (tab Beta, dettaglio, Piani). Dati di test cancellati.
  - Guida all'uso: `docs/GUIDA-ADMIN-MANAGER.md`.
  - Pubblicata il 4/11: push, regole, indici, 65 functions, APK 1.1.189 (firma 96dafbcd… verificata), release GitHub, hosting. Segreti RevenueCat creati, `REVENUECAT_PROJECT_ID` in `functions/.env` (non versionato). Webhook: `https://rcwebhook-nyt2jddsxa-ew.a.run.app` (senza chiave risponde 401), da configurare in RevenueCat.
  - Aperti, minori:
    - notifiche push della beta non fatte, solo avvisi in app ed email;
    - il pannello di accensione resta su «Controllo…» se la verifica fallisce, senza «Riprova»;
    - «Senza nome» in italiano quando manca il nome del salone (`salonDirectory.ts`, da prima).
- `PROGRESS.md` è versionato in `main`. Non versionati: `Icon and logo/…`, `scripts/test360/*`, `firebase-debug.log`, `groomly.apk`, `.claude/worktrees/` (copie `bridge-*` del progetto non create in questa sessione: non cancellarle alla cieca, vedi memoria `worktree-junction-node-modules`; fanno girare due volte alcuni test, per questo la suite si lancia con `--exclude '.claude/**'`).

## Fatto

### C1 + A4 — risolti, verificati, pubblicati (1.1.167)
- Groomly non cancella più visite da solo; eliminare un cane cancella solo le visite future; storico/incassi/«da chiudere» restano come «Cane eliminato».
- Spec/piano `docs/superpowers/{specs,plans}/2026-11-01-c1-visite-mai-cancellate-da-sole*`. Verify: run `QA-tests/results/runs/2026-11-01T15-35-35Z` → 7/7.

### C2 — risolto, verificato, pubblicato (1.1.168)
- Chiudere una visita (Completato / Salva e completa / Non venuto / Disdetto) non perde più `assigneeUid`, `chiusoIl`, `kind`; i backup tengono l'assegnatario anche degli impegni personali. Vale da ora in poi.
- Spec/piano `…/2026-11-01-c2-chiusura-tiene-assegnatario*`. Verify: run `2026-11-01T18-20-24Z` → 6/6 (task T301–T304, `fixture-c2.cjs`, `check-c2.cjs`).
- Nuovo problema messo nell'audit come **media 34**: il ripristino di un backup grande è lentissimo e senza avanzamento (diagnosi in `QA-tests/.qa-catalog/work/diag-restore/findings.md`).

### A5 — risolto, verificato, pubblicato (1.1.169 + regole Firestore in produzione)
- Decisioni di Roberto: il collaboratore modifica e chiude anche le visite degli altri (con importo), cambia i prezzi personalizzati del cane, ma **non vede gli incassi** (chip Home, pagine Incassi/Report/Statistiche, scorciatoia Impostazioni, voce della guida). Titolare e socio come prima. Rischio accettato: gli importi restano leggibili da chi legge Firestore direttamente.
- Regole: `dogIntact()` per il collaboratore (nome non vuoto, specie, contatto).
- Spec/piano `…/2026-11-01-a5-collaboratore-soldi-e-regole*`. Verify: run `2026-11-01T20-38-36Z` → 7/7 (T305–T306, `check-a5-regole.mjs`).

### A6 — non riproducibile (chiuso)
- Lo stato «sospeso» di un membro non esiste nell'app (solo attivo/revocato): l'aveva inventato lo script di seed. Decisione di Roberto: nessun controllo in più nelle regole. `scripts/test360/seed-audit.ts` ora crea un collaboratore **revocato** come fa l'app.

### A1 — risolto, verificato, pubblicato (solo server + pagina pubblica, niente APK)
- La lista d'attesa funziona solo col piano che la comprende; senza piano resta salvata ma ferma e torna se si riprende Plus; chi apre un'offerta vecchia legge «Questa offerta non è più disponibile. Per prenotare contatta il salone.».
- Spec/piano `…/2026-11-01-a1-lista-attesa-solo-col-piano*`. Verifica: `QA-tests/.qa-catalog/verify-a1.cjs`. Deploy: functions iscrivitiAttesa, confermaAttesa, paginaPubblica + hosting.

### A2 — risolto, verificato, pubblicato (1.1.170)
- Prova gratis da sé solo a chi è su Go e non ha mai avuto Plus/Salone; chi era Plus e torna Go deve riabbonarsi; l'operatore (Roberto) può sempre attivare prove/omaggi/regali; spegnendo un omaggio la prova da sé non torna (anche per omaggi creati prima — caso di Laura coperto).
- Spec/piano `…/2026-11-01-a2-prova-gratis-solo-a-chi-non-ha-mai-avuto-plus*`. Verifica: `verify-a2.cjs` + run `2026-11-01T22-15-29Z` (T307, 3/3).
- Deploy: functions avviaProva, impostaPianoManuale, setSalonPro, chiudiProve.

### A3 — risolto, verificato, pubblicato (1.1.171)
- Nel modulo dell'impegno personale si sceglie **Impegno** (toglie l'orario anche dalle prenotazioni online; ora di fine obbligatoria) o **Promemoria** (non blocca). Impegni già esistenti = impegni; senza fine bloccano 1 ora. Nel **Salone** interruttore «Blocca l'orario per le prenotazioni online» (acceso di partenza), perché un collega può prendere il cliente.
- Campi `promemoria: true` / `bloccaOnline: false`; regola unica `intervalloImpegnoPersonale` (server + riquadro richieste in Home).
- Spec/piano `…/2026-11-02-a3-impegni-bloccano-promemoria-no*`. Verifica: `verify-a3.cjs` + run `2026-11-01T23-26-54Z` (T308, 4/4).
- Deploy: functions postiLiberi, preparaRichiesta, inviaRichiesta, gestisciPrenotazione, confermaAttesa.
- Restano (scritti nell'audit sotto A3): l'invio delle offerte della lista d'attesa non guarda gli impegni (fermato alla conferma); un salone che lascia il Salone conserva gli impegni non bloccanti; il modulo visita non avvisa sovrapposizione con un impegno.

### A8 + A9 — risolti, verificati, pubblicati (1.1.172)
- «Elimina account» del titolare usa la stessa pulizia di «Elimina salone» (`functions/src/piano/pulisciSalone.ts`): via pagina pubblica, inviti, schede, suggerimenti, contatori email, consegne push. Decisione di Roberto: soci e collaboratori **tengono il login** e al prossimo accesso ripartono come un salone nuovo, loro, a meno che vengano reinvitati. Il telefono che elimina non riscrive le impostazioni.
- Corretto anche un difetto preesistente: la pulizia delle consegne push non trovava mai nulla (anche in «Elimina salone»). `eliminaAccount` ha ora 300 s di tempo massimo.
- Spec/piano `…/2026-11-02-a8-a9-elimina-account-titolare*`. Verifica: `verify-a8-a9.cjs` + run `2026-11-02T00-18-18Z` (T309).
- Deploy: functions eliminaAccount, eliminaSalone.
- Resta: un membro con l'app aperta nel momento dell'eliminazione vede «Il titolare ha spento il piano» finché non esce e rientra.

### A7 — risolto, verificato, pubblicato (1.1.173)
- Il link d'invito non si perde: il telefono lo ricorda 7 giorni (`groomly.invitoInSospeso`) e dopo «Entra» / «Crea account» + conferma email torna all'invito (`src/app/RimandoInvito.tsx`). Chi si registra da un invito non scrive nome salone/P.IVA (salone vuoto «Salone di <Nome>»).
- Decisioni di Roberto: chi ha un salone con dati può unirsi a un altro; avviso col nome del suo salone e scelta **pausa** (prenotazioni online + lista d'attesa spente, valori ricordati in `salons/<uid>/pro/main.pausa`, solo server) o **aperto**; «Torna al mio salone» in Impostazioni; al ritorno (anche revoca o eliminazione dell'account di chi invitava) la pausa si toglie; se l'operatore elimina il salone che invitava, chi ha un salone con dati torna al suo con la pausa ancora attiva + avviso «Il tuo salone è in pausa · Riprendi» in Home.
- Anche: dopo un cambio di salone il telefono ripulisce le copie locali del salone e ricarica l'app (`src/data/local/cambioSalone.ts`); eliminare l'account da membro cancella anche il suo salone personale e libera i suoi collaboratori.
- Spec/piano `…/2026-11-02-a7-invito-non-si-perde*`. Verifica: `QA-tests/.qa-catalog/verify-a7.cjs` (11/11, server) + `verify-a7-browser.cjs` (4/4, browser con le callable eseguite dalle funzioni compilate; screenshot in `QA-tests/results/a7/`).
- Deploy fatto: functions acceptInvite, revokeMember, tornaAlMioSalone (nuova), riprendiSalone (nuova), eliminaAccount, eliminaSalone; regole invariate.
- Restano, minori: foto scattate offline non ancora caricate si perdono se si cambia salone in quel momento; su un telefono con dati locali mai sincronizzati la pulizia al cambio salone non li tocca.

### Tre piccole decisioni dopo A7 — risolte, verificate, pubblicate (1.1.174)
- Scheda «Il tuo piano» del collaboratore a tutta riga (senza Incassi).
- Lista d'attesa ferma: dal link dell'offerta il cliente può sempre «Esci dalla lista» (nuova frase `esciLista` nella pagina pubblica); il server lascia passare solo `esci`.
- Membro tolto dal salone con l'app aperta (revoca, titolare che elimina l'account, salone eliminato): `StaffLock` rilegge l'account quando il proprio member non è attivo **o** l'accesso al salone è negato (le regole negano le letture appena il server riporta l'account al suo salone) e riparte nel suo salone con `dopoCambioSalone`. `eliminaAccount` ora riporta l'account del membro prima di segnarlo revocato.
- Spec/piano `…/2026-11-02-piccole-decisioni-dopo-a7*`. Verifica: `QA-tests/.qa-catalog/verify-piccole-dopo-a7.cjs` (2/2; screenshot `QA-tests/results/piccole-a7/`). Deploy: confermaAttesa, eliminaAccount, hosting.

### A10 — risolto, verificato, pubblicato (1.1.175)
- «Esci» pulisce il telefono: copie dell'account, foto in attesa, liste eliminazioni (ora per account: `groomly.deleted.<uid>`, `groomly.deleted.pending.<uid>`), promemoria locali Android, cache IndexedDB di Firestore; poi riparte da `/login` (`src/data/local/uscita.ts`, segno `groomly.uscita` gestito in `main.tsx`). Con modifiche non inviate (scritture Firestore entro 1,5 s, coda di caricamento, foto) avviso «Resta» / «Esci comunque» (`src/hooks/useEsci.tsx`). Offline non resta appeso (attese massime 2,5 s). Modalità locale invariata.
- Spec/piano `…/2026-11-02-a10-esci-pulisce-il-telefono*`. Verifica: `QA-tests/.qa-catalog/verify-a10-browser.cjs` (3/3, screenshot `QA-tests/results/a10/`). Solo APK, nessuna function.
- Restano, minori: se lo scollegamento fallisce l'account rientra da solo al riavvio; il messaggio dopo «Elimina account» sparisce con la ricarica; l'avviso può comparire per un caricamento in background ancora in corso.

### Medie «Dati e caricamento» (1-4) — risolte, verificate, pubblicate (1.1.176)
- Avviso «Dati non aggiornati» solo quando è vero (ascolto dell'anno che non partiva dopo una ricarica); Home senza zeri né «Nessun appuntamento» finché i dati non sono confermati dal server; orologio avanti oltre 5 minuti non fa più scartare le modifiche; accesso con database irraggiungibile → «Connessione assente» e nuovi tentativi invece del modulo di riparazione.
- Spec/piano `…/2026-11-02-medie-dati-e-caricamento*`. Verifiche: `QA-tests/.qa-catalog/verify-avviso-stantio.cjs`, `verify-home-attesa.cjs`, `verify-accesso-db-irraggiungibile.cjs`. Solo APK.
- Restano, minori: dopo il tempo d'attesa con un server solo lento l'avviso dice «offline»; un salone senza visite che perde la rete torna su «Carico l'agenda…» finché non torna; un errore di permessi alla lettura dell'account mostra «Connessione assente» e riprova (si può uscire).
- Notato: con `vitest.slow.config.ts` falliscono già 8 test in `DogsPage.test.tsx` e `appointments.test.tsx` anche senza queste modifiche (da guardare a parte).

### Medie «Prenotazioni online» (5, 6, 7, 9) — risolte, verificate, pubblicate (1.1.177)
- Ramo `fix/medie-prenotazioni-online`. La Home mostra sempre le richieste «nuova» (anche dopo la fine del piano) e il salone le accetta, propone un altro orario o rifiuta anche a prenotazioni spente o senza piano (`{ perSalone: true }` in `gestisciPrenotazione` e nella callable `postiLiberi` che riempie il calendario di «Proponi un altro orario», quest'ultima solo se `request.auth` è un titolare/socio/collaboratore di quel salone: `membroDelSalone` in `postiLiberi.ts`); il controllo «prenotazioni accese» resta per il cliente e per chi non è del salone.
- Richiesta «nuova» rimasta senza risposta oltre l'orario → `scaduta` e mail al cliente (tipo `scadenza`, it/en/es) con `emailStato` registrato; tolto il tetto dei 180 minuti (servizi lunghi solo in orari che finiscono entro la chiusura); la pagina pubblica non legge più l'email dell'account.
- Spec/piano `…/2026-11-02-medie-prenotazioni-online*`. Verifica: `QA-tests/.qa-catalog/verify-prenotazioni-online.cjs` (7/7 sulle funzioni compilate con Brevo finto, (g) chiama l'handler vero della callable `postiLiberi` con `.run()`; `--browser`: Home di un Go appena creato con una richiesta in attesa, screenshot in `QA-tests/results/prenotazioni-online/`).
- Deploy fatto: functions postiLiberi, inviaRichiesta, gestisciPrenotazione, scadiProposte, paginaPubblica + hosting; APK 1.1.177.
- Restano, minori: un collaboratore di un Salone scaduto non legge le richieste (regola esistente; si decide col punto 10); un collaboratore revocato con l'account ancora sul salone vedrebbe gli orari liberi a prenotazioni spente (solo orari, come già `gestisciPrenotazione`).

### Medie «Piani» (8, 10, 11) — risolte, verificate, pubblicate (1.1.178)
- Ramo `fix/medie-piani`. 8: al titolare di un piano in grazia la scheda in Impostazioni e la pagina Abbonamento dicono «Pagamento non riuscito» con il link a https://play.google.com/store/account/subscriptions; a un disdetto «Disdetto · attivo fino al <data>»; nella scheda (mezza riga) l'avviso va su due righe: «Pagamento non riuscito» / «Aggiorna su Google Play», «Disdetto» / «Attivo fino al <data breve>» (`avvisoPiano` in `src/lib/abbonamento.ts`; soci e collaboratori non lo vedono).
- 10: `chiudiProveScadute` (controllo orario `chiudiProve`) chiude ogni `pro/main` con `scadeIl` passata, stato attivo/prova/grazia/disdetto e qualunque fonte (`pianoScaduto` in `scriviPiano.ts`) → Go con `enabled` false, e le regole tolgono l'accesso ai collaboratori; i piani senza data (omaggio, manuale) restano come sono.
- 11: `/impostazioni/pro` (`ProOTeam` in `router.tsx`): Salone → pagina Team («Piano Salone»), operatore → interruttore «Piano Salone», tutti gli altri → `/impostazioni/abbonamento`.
- Spec/piano `…/2026-11-02-medie-piani*`. Verifica: `QA-tests/.qa-catalog/verify-piani.cjs` (3/3 sulle funzioni compilate: Salone in grazia scaduto chiuso, il collaboratore legge `dogs` prima e riceve `permission-denied` dopo con le regole vere tramite SDK client, omaggio senza data invariato; `--browser` a 390 e 360 px: per un Salone in grazia e uno disdetto la scheda di Impostazioni mostra titolo e dettaglio interi su due righe (misurato, non solo il testo del DOM), la pagina Abbonamento mostra l'avviso e il link; Go da `/impostazioni/pro` ad Abbonamento; screenshot in `QA-tests/results/piani/`). Unità: `SchedaAbbonamento.test.tsx`, `AbbonamentoPage.test.tsx`, `router.proOTeam.test.tsx`, `chiudiProve.test.ts` (transazione per documento, errori registrati senza fermare il giro). Sull'emulatore la chiusura ha portato a Go anche due prove seminate scadute il 2 novembre (`salons/2TgHkb0Sa8TydRheg3QtixtvQAjQ`, `salons/iGjdHUkhBPuMLRop4VLI30q1Uyba`).
- Deploy fatto: function `chiudiProve`, hosting, APK 1.1.178. Prima del deploy, lettura (solo lettura, permesso di Roberto) dei piani in produzione: solo Laura (Salone omaggio senza scadenza) e `shared` (senza stato) → nessuno viene chiuso. Script: scratchpad `leggi-piani-prod.cjs` (token di firebase-tools, REST runQuery su `pro`).

### Medie «Team e ruoli» gruppo A (12, 13, 14, 15) — risolte, verificate, pubblicate (1.1.179)
- Ramo `fix/medie-team-inviti`. 12: `acceptInvite` rifiuta chi non ha l'email confermata (legacy ammessi; `acceptInviteDecision` con `emailVerified`/`legacy`); `InvitePage` legge l'invito con la callable `leggiInvito` (stati `aperto`/`gia-tuo`/`scaduto`/`altra-email`/`non-valido`, a un'altra email non dice il salone) e mostra Accetta/Rifiuta (`rifiutaInvito` libera il posto), «Conferma la tua email…» con «Ho confermato» (`session.reloadVerification`), «Fai già parte di X», sempre «Vai alla Home»; `callAcceptInvite` forza `getIdToken(true)`; nessun codice grezzo (`src/components/team/messaggioCallable.ts`).
- 13: in Team «Inviti in sospeso» con Annulla (callable `invitiInSospeso`, `annullaInvito`; id = sha256 del token; un invito già usato non si annulla).
- 14: «Revoca» con conferma (`src/components/team/ConfermaRevoca.tsx`); `revokeMember` scrive `salons/<revocato>/avvisi/uscita` e la Home lo mostra una volta («Ok» → callable `segnaAvvisoUscita`). `tornaAlMioSalone` non lo scrive.
- 15: `revokeDecision` senza requisito del piano; Abbonamento del titolare senza Salone: «Persone ancora collegate al tuo salone» con Togli (`src/components/team/PersoneCollegate.tsx`, solo a piano letto); `StaffLock`: testo «Il piano Salone di X non è attivo…» e «Torna al mio salone».
- Logica server in `functions/src/piano/invitiTeam.ts` (+ test). Spec/piano `…/2026-11-02-medie-team-inviti*`. Verifica: `QA-tests/.qa-catalog/verify-team-inviti.cjs` (server 4/4 sulle funzioni compilate; `--browser` 5/5 a 390 e 360 px, screenshot in `QA-tests/results/team-inviti/`).
- Restano, minori: `roleLabel` solo in italiano (anche nel titolo dell'invito in en/es); i dialoghi di conferma si possono chiudere mentre la chiamata è in corso; nessuna guardia sulle risposte fuori ordine dell'elenco inviti; sul telefono del collaboratore bloccato compare «Salvataggio non riuscito» (ascolti di cani/visite negati, preesistente).
- Deploy fatto: functions acceptInvite, revokeMember, leggiInvito, rifiutaInvito, invitiInSospeso, annullaInvito, segnaAvvisoUscita (le ultime cinque nuove), hosting, APK 1.1.179.

### Medie «Team e ruoli» gruppo B (16, 17) — risolte, verificate, pubblicate (1.1.180)
- Ramo `fix/medie-team-ruoli`. 16: il collaboratore vede il Listino in sola lettura (niente aggiungi/rinomina/elimina file, Gestione, Aggiorna prezzi, Gestisci, Modifica; resta Stampa); su una visita chiusa niente «Correggi» ma «Per correggere la chiusura chiedi al titolare» (regole invariate); Elimina account da membro (collaboratore o socio di un salone altrui): testo `delMembro` dal primo passo, niente backup, solo ELIMINA; `openBackup` non apre il foglio al collaboratore; in Account niente «Scarica i miei dati» e riga «Titolare» in sola lettura.
- 17: in Team «Rendi socio» / «Rendi collaboratore» con conferma (`src/components/team/ConfermaRuolo.tsx`, callable esistente `changeMemberRole`), mai sulla propria riga né sul titolare; «Revoca» ora si chiama «Togli» (tradotto). `StaffLock` rilegge l'account quando il ruolo del proprio member cambia: chi viene promosso o declassato lo vede in 2-3 secondi senza ricaricare. «Esci dal salone» = «Torna al mio salone» (A7). Sospensione scartata da Roberto.
- Spec/piano `…/2026-11-03-medie-team-ruoli*`. Verifica: `QA-tests/.qa-catalog/verify-team-ruoli.cjs` (8/8 nel browser a 390 e 360 px, tre giri; screenshot in `QA-tests/results/team-ruoli/`). Solo APK.
- **Nuovo problema trovato dalla revisione finale (nell'audit come media 35):** chiudendo o lavorando una visita il collaboratore fa scritture sulle impostazioni che le regole rifiutano, con toast «Salvataggio non riuscito»: fedeltà (`AppointmentPage.tsx:970`, `HomePage.tsx:546`), coda email «pronto» (`AppointmentPage.tsx:999`), contatore richieste recensione (`AppointmentPage.tsx:1264`), sincronizzazione della coda in Home (`HomePage.tsx:437`); il menu «Elimina» della visita (`AppointmentPage.tsx:673`) gli fa sparire la visita dal telefono anche se il server la rifiuta.
- Restano, minori: in Elimina account il membro legge la stessa frase ai passi 0 e 3; i pulsanti testuali di Team sono alti 26 px; il server permette a un socio di cambiare il proprio ruolo con una chiamata diretta (l'app non lo consente).

### Medie «Agenda e incassi» (18-22) — risolte, verificate, pubblicate (1.1.181)
- Ramo `fix/medie-agenda-incassi`. 18: `pezzoDelGiorno` in `src/lib/calendarView.ts`; vista Giorno: giorno d'inizio fino alle 24, pezzo dalle 00:00 il giorno dopo (stessa visita, non conta nell'intestazione); Settimana (elenco) solo giorno d'inizio.
- 19: `src/lib/filtroPersona.ts` (`iniziali`, `filtraPerPersona`, `leggiFiltroPersona`/`ricordaFiltroPersona`, chiave `groomly.filtroPersona.<salonId>`), `src/hooks/usePersoneSalone.ts`, `src/components/team/FiltroPersona.tsx`; iniziali sulle visite col Salone; filtro per titolare/socio in Calendario e Incassi, una scelta condivisa per salone.
- 20: «Rimetti in programma» in «Altre azioni» (`setAppointmentStatus` toglie anche total/paymentMethod/actualDurationMin/adjustmentNote; `putDoc` riscrive il documento intero). Il premio fedeltà usato in quella chiusura torna disponibile (decisione di Claude dopo la revisione finale).
- 21: `previsione(visite, periodo)` del mese in corso; `SchedeStatistiche` a schede con `euro`, `hideAmounts` → «•••»; chiave nuova `clientiInRitardo` (`inRitardo` resta dei Mensili: una regressione presa prima del merge); riga «Statistiche» nel Report.
- 22: `src/lib/posizioneFumetto.ts`; fumetto unico dentro l'area del grafico, parole intere, senza troncamenti.
- Spec/piano `…/2026-11-03-medie-agenda-incassi*`. Verifica: `QA-tests/.qa-catalog/verify-agenda-incassi.cjs` (7/7 a 320/360/390 px; screenshot `QA-tests/results/agenda-incassi/`); catalogo QA T171 aggiornato ai testi nuovi delle Statistiche. Solo APK.
- Restano, minori: il pezzo del giorno dopo mostra «00:00» senza segno di continuazione; a 320 px l'etichetta del giorno scelto sotto il grafico si spezza («Do/m», preesistente); l'intestazione del giorno conta anche le disdette (preesistente, da decidere); `usePersoneSalone` non azzera la copia dell'accesso cambiando salone.

### Medie «Animali, mensili, listino» (23-26) e 35 — risolte, verificate, pubblicate (1.1.182)
- Ramo `fix/medie-animali-listino`. 23 (strada A scelta da Roberto): `src/lib/listinoRazza.ts` (`normalizzaNome`, `servizioPerNome`, `servizioDellaRiga`, `razzaDelCane`, `prezzoDalListino`); `PriceItem.servizioId?` (anche nello schema Zod `src/lib/schemas.ts`, altrimenti si perdeva al salvataggio: trovato dalla revisione finale); `quotedPrice(dog, service, { sheet, servizi })` con ordine override → razza → taglia; l'agenda usa `getPriceSheet(settings)` (listino predefinito se mai salvato); le righe già salvate di una visita tengono prezzo e durata; Gestione listino: «In agenda: <servizio>» / «Non usato in agenda» con scelta; segnaposto del prezzo personale nella scheda del cane dal listino.
- 24: `monthlyStatus` calcola la scadenza del fissato solo dalle completate prima. 25: tag tolti del tutto (decisione di Roberto; dati vecchi ignorati, il documento del cane li perde al primo salvataggio). 26: nome del servizio sempre intero; la testata condivisa (`Header`) mette il sottotitolo sotto la riga del titolo (controllata a 320 px su Animali, Report, Servizi).
- 35: il collaboratore non scrive impostazioni chiudendo una visita (premio, «pronto», contatore recensioni, coda in Home) e non ha «Elimina» visita né auguri/cestino promemoria in Home.
- Spec/piano `…/2026-11-03-medie-animali-listino*`. Verifica: `QA-tests/.qa-catalog/verify-animali-listino.cjs` (10/10; screenshot `QA-tests/results/animali-listino/`). Suite intera 2680/2681 (solo `driveInvio`). Solo APK.
- **Seguito server:** fatto il 3 novembre (ramo `fix/listino-razza-server`, vedi «Prossimo passo» 2); `gestisciPrenotazione` scrive ancora `tags: []` (innocuo).
- Restano, minori: «dal listino» non compare nella lettura della visita salvata; il contatore delle richieste di recensione non conta quelle del collaboratore; vecchi `tagSuggestions` restano nei dati.

### Medie «Account e profilo» (27-30) — risolte, verificate, pubblicate (1.1.183)
- Ramo `fix/medie-account-profilo`. 30 paese e fisco: `src/lib/paese.ts` (elenco UE + GB, CH, NO, ALTRO; formati e esempi IVA, `paeseDalFuso`, `etichettaIva`); `business.paese` / `paeseScelto` (assente → IT); selettore in Account, tour e registrazione; la callable `dettaglioIndirizzo` restituisce anche il paese (unica function toccata). 27 `allineaEmailAccount` all'accesso (in `resolveSalon`, aggiunto dopo che la verifica sull'emulatore ha trovato che c'era solo al rientro) e al rientro. 28 `src/lib/erroriAuth.ts`, campi obbligatori. 29 link privacy e termini. 30 i18n: `opzioniDate(lingua)` in `src/lib/format.ts` (IT_DATE solo alias), lingua passata in `earnings.ts`, grafico, esportazione, backup e stato Drive; Gestione listino, archivio, ripristino (parola `bakParolaSostituisci`) tradotti; `<html lang>` dal `LinguaProvider`.
- Spec/piano `…/2026-11-03-medie-account-profilo*`. Verifica: `QA-tests/.qa-catalog/verify-account-profilo.cjs` (6/6 a 320/360/390 px; callable dell'indirizzo con `.run()` e Google Places finto; screenshot `QA-tests/results/account-profilo/`). Negli account seminati serve `legacy: false`, altrimenti le regole rifiutano l'aggiornamento di `accounts/<uid>`. Con il piano Salone omaggio «Esporta» del report apre l'avviso «in arrivo»: il foglio in inglese è coperto da `ExportSheet.test.tsx`.
- Unito in `main`; function `dettaglioIndirizzo` in produzione; APK 1.1.183 (release GitHub v1.1.183, hosting aggiornato).
- Restano, minori: gli importi restano nel formato italiano («€ 0», «100€») anche in inglese (`formatEuro`/`maskEuro`); a 320 px il testo della casella privacy va su due righe.

### Medie «Home e telefono» (31, 32, 34) — risolte, verificate, pubblicate (1.1.184)
- Ramo `fix/medie-home-telefono`. 31: `RigheHome.tsx` a schede (`data-scheda="riga-home"`), il contenitore vuoto delle conferme d'attesa è `display: contents` (niente doppio spazio). 32: `src/lib/notificheLocali.ts` `programmaNotifiche` con `isExactNotification: false`; un test vieta altri `LocalNotifications.schedule` in `src/`. 34: `replaceCloudData(uid, bundle, onAvanzamento?)` con copia di lettura (`lettureRipristino`, `eliminazioniRipristino`; `putDoc` la aggiorna), salto dei documenti uguali solo durante il ripristino, gruppi da 10; testo `zampeRipristinoN`.
- Spec/piano `…/2026-11-03-medie-home-telefono*`. Verifica: `QA-tests/.qa-catalog/verify-home-telefono.cjs` (H1 a 320/360/390; R1 37 cani + 499 visite in 203 s contro ~22 min). Suite 2744/2745 (solo `driveInvio`). Solo APK.
- Da guardare sul telefono: al primo accesso nessuna schermata «Sveglie e promemoria».
- Restano, minori: `deleteMissing` cancella ancora tutto insieme; durante il ripristino gli ascoltatori riparsano la lista a ogni scrittura (ora 10 alla volta).

### Basse «Validazioni» — risolte, verificate, pubblicate (1.1.186)
- Ramo `fix/basse-validazioni`. Regole pure in `src/lib/validazioni.ts` (`telefonoValido`, `pesoDaTesto`, `servizioDoppio`, `TITOLARE_MAX`), `completeBirthday(…, now)` rifiuta date future con l'anno. Telefono controllato in scheda cane, contatti, cane nuovo dell'appuntamento, lista d'attesa, Account; titolare max 80; email Account con `emailValida`; servizi doppi rifiutati (`ServiceSheet.onSubmit` può restituire l'errore del nome); «Non venuto» solo con `canComplete`; pagina pubblica con limiti 80/20/15 cifre e messaggi «Nome non valido» / «Telefono non valido» da `prenotazione.ts`.
- Spec/piano `…/2026-11-03-basse-validazioni*`. Verifica `QA-tests/.qa-catalog/verify-validazioni-browser.cjs` 8/8. Suite verde tranne `driveInvio`.
- Effetto voluto: le schede già salvate con telefono non valido («333», «-») chiedono un telefono vero al prossimo salvataggio.
- Lasciati: messaggi del server in italiano anche sulla pagina en/es (come «Email obbligatoria»); nella lista d'attesa l'errore del telefono compare prima di «campi mancanti».

### Basse «Agenda» — risolte, verificate, pubblicate (1.1.187)
- Ramo `fix/basse-agenda`. Controllo unico `src/lib/controlloOrario.ts` (`visiteCheOccupano`, `sovrapposte`, `controlloOrario`) usato dal modulo e da −15/+15; in `orari.ts` `chiusuraSuperata`, `prossimoGiornoAperto`, `primaApertura` (la fascia più presta); `spostamentoInGriglia` in `appointments.ts`.
- −15/+15: spenti ai bordi 08:00/19:00 (una visita vecchia fuori griglia si può solo riavvicinare); sovrapposizione (nel Salone solo della stessa persona) o fuori orario → dialogo «Orario già occupato» / «Fuori dall'orario del salone» con «Sposta comunque». Il controllo ferie resta ma con questi limiti non scatta più (nessuno spostamento cambia giorno).
- Modulo: «Finisce dopo la chiusura delle HH:MM» (avviso, non blocca); «Il salone è chiuso questo giorno»; nuovo appuntamento senza data → prossimo giorno aperto all'ora di apertura (con `?cane=`/`da=mensili` ora vuota). Il modulo nuovo aspetta impostazioni e piano (al massimo 3 s, poi parte comunque; una volta mostrato non sparisce).
- `classify`: perso solo con inizio entro oggi (Report, Incassi, esportazione). Freccia del Report: `state: { da: 'impostazioni' }` dal link di Impostazioni, passato anche a Statistiche (`Header` ha `backState`). Calendario: `topEtichettaChiusura` in `calendarLayout.ts`.
- Spec/piano `…/2026-11-03-basse-agenda*`. Verifica `QA-tests/.qa-catalog/verify-basse-agenda.cjs` 7/7 (320/360/390, S7 anche 1280; S4 anche a freddo). Suite: solo i fallimenti già presenti su `main` (`driveInvio`, 21 in `DogsPage.test.tsx`, 3 in `appointments.test.tsx`).
- Effetto da sapere: nella vista Giorno di Incassi una disdetta futura del cliente non compare finché non arriva il giorno.
- Lasciati, minori: offline senza copia delle impostazioni il foglio del nuovo appuntamento resta vuoto fino a 3 s; nessun test dedicato per il «non sparisce più»; il ramo ferie di −15/+15 senza test (irraggiungibile).

### Basse «Prenotazioni» — risolte, verificate, pubblicate (1.1.188)
- Ramo `fix/basse-prenotazioni`. Antispam: `telefonoConfronto` in `src/lib/prenotazione.ts` (usata da `contaAperte`) toglie +39/0039/39, così lo stesso cellulare conta uguale in `inviaRichiesta` e `iscrivitiAttesa`; tetti invariati 2/2/20.
- Lista d'attesa per settimana: `hosting/s/pagina.js` manda la settimana della riga piena; `iscrivitiAttesa` la salva se valida (`settimanaValida` in `src/lib/listaAttesa.ts`), `offerteDaCreare` filtra con `nellaSettimana` (giorno di Roma); senza settimana qualunque giorno. Chi si riscrive aggiorna o toglie la settimana.
- App: `RiquadroRichiesta` ignora la visita con lo stesso `richiestaId`; `offertaPiano` (in `src/lib/abbonamento.ts`) per paywall e Vetrina (prova solo al titolare, «Avvisami» senza Play, niente `mostraPiani`); giorni di prova dall'ora attuale con 5 min di tolleranza; scheda della prova in Impostazioni a capo e in flusso normale (cresce col testo, intera a 320 px); `FrasePassiMancanti` («Per accendere le prenotazioni manca: …», chiave `prenotaMancano`), nascosta a prenotazioni accese; `pianoInCorso` per l'«Attivo» di Abbonamento.
- Spec/piano `…/2026-11-03-basse-prenotazioni*`. Verifica `QA-tests/.qa-catalog/verify-basse-prenotazioni.cjs` 7/7 (320/360/390): la pagina pubblica è servita in locale con l'HTML di `paginaPubblicaHttp` e le chiamate all'indirizzo fisso di produzione di `pagina.js` sono eseguite nel processo con `.run()` (tutto ciò che non è locale è bloccato); la coda gira con `giraInvioCoda` ristretto ai saloni di prova e Brevo finto. Suite: solo i fallimenti già presenti su `main`; functions 258/258.
- Pubblicato il 4 novembre: functions `inviaRichiesta`, `iscrivitiAttesa`, `giraCoda`/`inviaCoda` (`FUNCTIONS_DISCOVERY_TIMEOUT=60`), hosting (pagina pubblica), APK.
- Lasciati, minori: `PianoPagine.tsx` ha ancora una sua regola per la prova; nella Vetrina «Avvisami» apre il dialogo «In arrivo» come conferma; nel foglio «Backup» a 320 px il selettore «Frequenza» va a capo lettera per lettera.

### Basse «Team» — risolte, verificate, pubblicate (1.1.188)
- Pulsante di Team «Invita una persona» / «Invite someone» / «Invitar a alguien»; foglio d'invito tradotto (chiavi `teamInvitaPersona`, `teamInvitaTitolo`, `teamInvitaEmail`, `teamInvitaInvia`).
- `acceptInvite` crea `salons/<id>/members/<titolare>` se manca (stessa transazione, dai dati di `accounts/<titolare>`, solo se è davvero il titolare di quel salone; un documento già presente, anche revocato, non si tocca). Regola unica `membroTitolareMancante` in `functions/src/piano/titolareMembro.ts`, usata anche da `impostaPianoManuale` (che ora salva l'email normalizzata). Così il titolare compare in Team e in «Chi lo fa» qualunque sia la via del Salone (futuro acquisto Play compreso); nessuna migrazione: Laura ha già il documento.
- Pagina d'invito non valido, «Salvataggio non riuscito» dopo l'accettazione e pulsanti del Listino del collaboratore erano già risolti da medie 12, A7 e 16: solo verificati.
- Spec/piano `…/2026-11-03-basse-team*`. Verifica `QA-tests/.qa-catalog/verify-basse-team.cjs` (server 2/2; `--browser` 5/5 a 320/360/390 px con Vite del worktree su 5183, `APP=` per un'altra porta; screenshot in `QA-tests/results/basse-team/`).
- Pubblicato il 4 novembre: functions `acceptInvite`, `impostaPianoManuale`, `setSalonPro` (usa la stessa `impostaPianoManualePer`); APK per i testi. Niente regole, niente hosting.

### Basse «Telefono» — risolte, verificate, pubblicate (1.1.188)
- Ramo `claude/basse-telefono-d1f833`. Solo APK, niente functions né regole.
- Decisioni di Roberto: per foto del cane (ritratto, riquadro della foto), galleria del cane e foto della visita (Prima / Dopo / Aggiungi) toccando il pulsante si sceglie «Scatta foto» o «Scegli dalla galleria»; logo (Account, gestione listino) e file del listino solo dalla galleria. La galleria non chiede più il permesso della fotocamera.
- `useScegliFoto` in `src/components/ScegliFoto.tsx`: input galleria senza `capture`, input fotocamera con `capture="environment"` (il permesso lo chiede il WebView di Capacitor solo lì), scelta solo nell'APK (nel browser il pulsante apre il selettore come prima). Permesso rifiutato → «Permesso foto negato» all'evento `cancel` dell'input (Chromium 113+), con `Camera.checkPermissions()` ≠ `granted`: dopo il primo rifiuto Android risponde `prompt`, non `denied`. Tolti `guardCaptureClick` e `src/lib/photoCapture.ts`.
- Avvio: `MainActivity.onResume` manda `groomlyResume` con uno script protetto (`window.Capacitor && …triggerEvent`): niente più errore `triggerEvent` al primo avvio, gli altri ritorni arrivano come prima.
- Spec/piano `…/2026-11-03-basse-telefono*`. Verifica `QA-tests/.qa-catalog/verify-basse-telefono.cjs` 5/5 sul telefono virtuale `groomly_qa` (APK di prova, account `telefono-…`; usa l'helper locale `test-results/audit/android/phone.cjs`). Suite: solo i fallimenti già presenti su `main`.
- APK di prova: Gradle va lanciato con il Java 17 di sistema (`C:\Program Files\Microsoft\jdk-17…`), non col jbr (Java 25). Nella copia di lavoro serve la giunzione `node_modules` → `D:\Groomly
ode_modules`, da togliere poi con `rmdir`; `cap sync` lì riscrive `android/capacitor.settings.gradle` con percorsi `../../../../`: non committarlo.
- Lasciati, minori: su WebView più vecchi di Chromium 113 il permesso rifiutato non dà l'avviso; nel riquadro della foto del cane le due voci hanno una riga di dettaglio, nella scelta comune no.

### Basse «Account» — risolte, verificate, pubblicate (1.1.188)
- Ramo `claude/basse-account-4d804c` (sessione parallela; merge, release e deploy li fa la coordinatrice). Solo app: niente functions, regole o hosting.
- Conferma email: `src/data/local/verificaInviata.ts` ricorda l'ora dell'ultimo invio (registrazione, «Invia di nuovo», Account); il conto mostra i secondi rimasti davvero, niente conto se non c'è un invio recente. «Verifica email» già verificata → «La tua email è già verificata».
- Pagina ricordata dopo l'accesso: `src/data/local/dopoAccesso.ts` (sessionStorage `groomly.dopoAccesso`, solo percorsi interni, non `/`, `/login`, `/invito/…`). La scrive `Guard`; l'unico passaggio da /login all'app è `LoginSwitch` → `VersoDestinazione` (le navigate di LoginPage tolte); un invito in sospeso vince; chi è già entrato in questa apertura non la lascia (dopo Esci si torna in Home).
- Titolare = «Nome Cognome» alla registrazione (`titolareDaRegistrazione`, anche locale e da invito); riga «Il tuo nome» in Account per tutti (`aggiornaNomeAccount`, merge su `accounts/<uid>`, si mostra subito). Saloni già esistenti non migrati.
- Tour: frase del benvenuto col numero vero (`tourBenvenutoSottoN`/`Uno`, senza numero finché i passi non sono pronti); riepilogo finale senza la verifica email; ogni passo è una voce della cronologia (`location.state = { tour, prof }`), indietro torna al passo prima, in ripresa indietro dal primo passo esce; all'uscita si tolgono le voci del tour (`navigate(-prof)`).
- Traduzioni: EN «Suggestions», «Diary» nella guida; ES Notifiche «Notificaciones».
- Spec/piano `…/2026-11-03-basse-account*`. Verifica `QA-tests/.qa-catalog/verify-basse-account.cjs` 6/6 a 320/360/390 (Vite proprio su 5193, callable simulate). Suite: solo i fallimenti già presenti su `main`.
- Lasciati, minori: se la scrittura di «Il tuo nome» viene rifiutata resta il nome nuovo a schermo fino alla ricarica (solo un avviso); un link aperto da sloggati dopo un Esci nella stessa apertura non viene ricordato; con 0 passi rimasti il benvenuto dice «Qualche piccola cosa»; la lista del team non mostra «Il tuo nome» aggiornato; la card «Completa il tuo salone» conta ancora la verifica email («x/6»).

### Basse «Animali e mensili» — risolte, verificate, pubblicate (1.1.188)
- Mensili: `monthlyRowsFor(dogs, appointments, now, daysBefore, month)` in `src/lib/cycle.ts` decide righe, contatore e pallino del mese; nel mese dopo un cane con una visita in quel mese è un fissato con la prima visita del mese (ritardo: scadenza dalla visita precedente + 14 giorni). Riga omonimo con `dogMark` in tutti i gruppi.
- Scheda: dialogo di conferma per Deceduto/Non più in cura anche senza futuri (Annulla = `uteAnnulla`); «Rendi principale» (`rendiPrincipale` in `src/lib/contattoPrincipale.ts`, svuota l'email del proprietario, nessun extra vuoto se i campi erano vuoti); sesso «Non indicato» (campo tolto dal documento); `schedaOgni` «ogni N settimane» + `schedaOgniSettimana`; `etaScheda` in `display.ts`; prezzo e durata svuotati tolgono il servizio da `hiddenServiceIds` (anche al secondo salvataggio) e `profilePrices` salta le voci vuote.
- Lista: `src/lib/ordinamentoAnimali.ts` (localStorage `groomly.ordinamentoAnimali`), spunta sulla scelta attiva; `noteTroppe`.
- Spec/piano `…/2026-11-03-basse-animali*`. Verifica `QA-tests/.qa-catalog/verify-basse-animali.cjs` 8/8 a 320/360/390 (Vite di questo ramo su 5183). Test: solo i fallimenti già presenti su `main` (`driveInvio`, i 21 di `DogsPage.test.tsx` — non `DogPage.test.tsx` come scritto prima —, 3 di `appointments.test.tsx`). Quattro test vecchi di `DogsPage.test.tsx` adattati al nuovo comportamento (conferma, riga senza prezzo). Solo APK.
- Deciso con Roberto: «Rendi principale» svuota l'email del vecchio proprietario (va riscritta a mano se serve).
- Lasciati, minori: a 320 px «Rendi principale» e «Togli» sono vicini; tre scansioni per cane a ogni disegno dei Mensili; nessun test en/es di `etaScheda`.
- Incidente: lo stash di git è condiviso fra tutti i worktree; un sotto-agente ne ha preso uno di un'altra sessione. **Mai `git stash` nelle sessioni parallele.**

### Basse «Grafica» — risolte, verificate, pubblicate (1.1.188)
- Backup: `tonoBackup` in `src/lib/statoDrive.ts` («Mai eseguito» giallo, verde solo se recente); «Completo con foto» scrive `backup.lastAt` (in `SettingsPage` `update()` legge `settingsRef`, l'ultima copia, così un backup lungo non riscrive impostazioni cambiate nel frattempo); `usePassiSalone` conta il passo fatto anche con `lastAt`; `hubPassoBackup` = «Fai il primo backup».
- Durata unica `formatCompactDuration` («45 min», «1h05», «2h»); `formatDuration` e `formatSpent` la chiamano.
- Toast senza «·»; `AnimalsReturn` cerchio 48×48 con `ANIMALS_RETURN_SPAZIO` in fondo alla scheda; `PriceViewPage` vuoto con `lisVediVuoto` / `lisVediVuotoCollab` / `lisVaiAlListino`.
- Colori: `src/theme/tokens.test.ts` controlla il contrasto in chiaro e scuro; nuove variabili `--on-fill` (testo su fondi pieni pri/ok/bad: bollini, ora attuale, chip scelto) e `--nome-a-testo` («Toelettatura»); colori dei servizi più scuri in chiaro; saluto del listino su fondo bianco; durata del `TimeBox` attivo in `--on-pri`.
- Tocco: classe `.tocco` (`src/theme/tocco.css`, zona ≥ 40 px con `::after`) sui pulsanti piccoli; dove i vicini erano troppo stretti più spazio (pallini colore, intestazioni del Listino, righe razza); `FiltroPersona` e scelta del ruolo in Team alti 40 px.
- 320 px: barra in basso senza puntini, 9 px sotto i 400 px (anche a 390 in spagnolo «Lista de precios» si tagliava); `SchedaAbbonamento` nel flusso normale con titoli a capo (riga della prova lasciata alla sessione Prenotazioni); telefono del contatto intero; «60 min dopo» nelle Notifiche leggibile.
- Spec/piano `…/2026-11-03-basse-grafica*`. Verifica `QA-tests/.qa-catalog/verify-basse-grafica.cjs` (`--giro` + casi B1 D1 T1 A1 L1 E1 N1 NAV, `--solo=` per ruoli G/P/T o casi; orologio del browser fisso alle 15:00 di Roma, account `grafica-…` creati e cancellati): 8/8 casi, 39 rotte × 3 piani × 320/360/390 × chiaro/scuro, 0 violazioni. Vite del ramo sulla 5180.
- Al merge: conflitto atteso in `SchedaAbbonamento.tsx` (riga della prova); chiavi nuove in `src/i18n/*`. Solo APK.
- Lasciati, minori: prezzi oro/viola e «Attivo» oro in Abbonamento e bianco su oro della pagina Salone (file di altre sessioni); un colore del listino scelto dal salone poco scuro (es. #15905B) resta sotto 4,5 sul bianco; le icone sui fondi `--pri` in tema scuro ora sono scure; le etichette della barra (fondo a gradiente) e i fogli aperti da un'azione non sono misurati dallo script; il test della scrittura di `lastAt` copre solo la modalità locale.

### Beta Plus/Salone — A1 Fondamenta (fase 1) — fatta sul ramo `claude/beta-a1-fondamenta-714da5`, non unita, non pubblicata
- Spec `docs/superpowers/specs/2026-11-04-beta-fondamenta-design.md` (sezione **Contratti** per l'ondata B), piano `docs/superpowers/plans/2026-11-04-beta-fondamenta.md`, decisioni D51–D54.
- Fonte `beta` (`FONTI_PIANO`/`fonteDi` in `src/lib/piano.ts`, usata ovunque); traccia `exBeta`/`betaPiano`/`betaDal`/`betaFinoAl`/`earlyAdopter` mai cancellata; `campiBeta`/`tracciaBeta` in `scriviPiano.ts`; modelli `betaInvito.ts`, `betaFeedback.ts`; ID fissi `idAbbonamenti.ts` (anche in `PRIMA-DEI-PAGAMENTI.md`).
- `config/globale.piani` (`configPiani.ts`) scritto dalla callable operatore `impostaConfigPiani` (client `callImpostaConfigPiani`).
- **Prova self-service spenta**: `avviaProva` la rifiuta e l'app non mostra «Prova gratis» finché `piani.provaSelfService` non è vera. «Regala 30 giorni» invariato.
- Regole: `betaInviti` (titolare legge il suo, storico solo operatori), `betaFeedback` (solo operatori), `betaFeedbackLimiti` chiusi; nessuna scrittura dal client.
- Al merge: deploy functions (`avviaProva`, `impostaPianoManuale`, `chiudiProve`, nuova `impostaConfigPiani`) e **regole**; APK (vetrine senza prova). Nessuna interfaccia nuova.

### Beta piani — A3 Nomi (ramo `claude/beta-a3-nomi-57aa14`, non unito)
- Punto 5.1 del prompt beta: il piano si chiama **«Salon»** in tutte e tre le lingue, come nei loghi (scelta c di Roberto, `docs/DECISIONI-AUTOMATICHE.md` «A3 Nomi»). Solo testi in `src/i18n/{it,en,es}.ts` e il bollino in `MarchioPiano.tsx`; chiavi `salone` e logica di `Vetrina.tsx`/`avviaProva` invariate. La parola comune «salone/salón» resta.
- Test adattati ai testi nuovi. Suite: solo il fallimento noto `driveInvio`. Niente APK, niente merge.

### Beta piani — B1 Server beta e feedback (ramo `claude/beta-b1-server-12dde6`, non unito)
- Spec `docs/superpowers/specs/2026-11-04-beta-server-design.md`, piano `docs/superpowers/plans/2026-11-04-beta-server.md`, decisioni «B1 Server beta» in `DECISIONI-AUTOMATICHE.md`.
- Codice in `functions/src/beta/` (+ `config/impostaMostraPiani.ts`), collegato in `index.ts`: callable `invitaBeta`, `rispondiInvitoBeta`, `revocaBeta`, `estendiBeta`, `segnaEarlyAdopter`, `inviaFeedbackBeta`, `contatoriAdmin`, `impostaMostraPiani`, `segnaAvvisoBeta`; pianificate `scadiInvitiBeta` (ogni ora) e `avvisiFineBeta` (9:00 Roma: promemoria feedback dopo 7 gg, fine a 7 e 1 giorno, «finita»).
- Scelte di Roberto: email al titolare per invito, ritiro/revoca, estensione, fine a 7 e 1 giorno (promemoria feedback e «finita» solo in app); email a info@ per feedback e rifiuti; chi è in prova si può invitare, chi ha un piano manuale/omaggio/Play si salta; un solo avviso `salons/{id}/avvisi/beta` con l'ultimo evento.
- Regole: `avvisi/beta` lo legge solo il titolare (le generiche lo escludono). Firme dei Contratti invariate; aggiunte: `contatoriAdmin.inBeta`/`ultimoAccesso`, `segnaAvvisoBeta`, campi `estensioni`/`testoRevoca`/`promemoria` in `betaInviti` (nota condivisa `b1-server.md` per B2/B3).
- Verifiche: test functions verdi (suite: solo il fallimento noto `driveInvio`), regole 24/24 su emulatore proprio (8095), collaudo `scripts/emu/beta.mjs` 13/13 su emulatori propri (8096/9196), dati di test cancellati.
- Al merge: deploy functions (le 9 callable e le 2 pianificate nuove) e **regole**. Niente APK per B1 da solo.
### Beta piani — B4 Abbonamenti pronti al clic (ramo `claude/beta-b4-abbonamenti-0a7ece`, non unito)
- Fase 4 del prompt beta. Spec `docs/superpowers/specs/2026-11-04-beta-abbonamenti-design.md`, piano `docs/superpowers/plans/2026-11-04-beta-abbonamenti.md`, decisioni in `docs/DECISIONI-AUTOMATICHE.md` «B4».
- **Spento non cambia niente**: con `abbonamentiAttivi` falso la vetrina resta Avvisami e l'SDK non si carica.
- Client: `@revenuecat/purchases-capacitor` 14.0.0; `src/lib/billing.ts` (stato, scelta del pacchetto mensile ed early adopter, acquisto e ripristino con un negozio iniettabile) e `negozioRevenueCat.ts` (adattatore); `useAcquisto` nella vetrina (dialogo «La beta gratuita finisce adesso», attesa del piano Play, «Abbonamento momentaneamente non disponibile», «Ripristina acquisti»); `BannerPagamenti` in Home; `usePiano.acquisto`. APK GitHub senza permesso di fatturazione.
- Server (`functions/src/abbonamenti/`): `eventoRc`/`applicaEventoRc` (il webhook ora scrive `pro/main`: attivo, rinnovo, grazia, disdetta, scadenza; beta → Play senza buchi; VIP e `shared` mai toccati; eventi vecchi ignorati; `rcStato/webhook`), `annunciaPagamenti`, `controlloAccensione`, `confermaPartitaIva`, `accendiAbbonamenti` (rifà il controllo), `spegniAbbonamenti` (i piani Play restano). Segreti RevenueCat dichiarati con `defineSecret`.
- Admin: `src/components/admin/PannelloAccensione.tsx` (senza props, lo monta B2 nella scheda Piani) e `src/data/firebase/abbonamentiClient.ts` (anche `annunciaPagamenti` per la card Annuncio di B2).
- Contratto di A1 esteso in modo compatibile: `config/globale.piani` ha `pagamentiDal`, `confermaFiscaleIl`, `accesiIl`.
- **Al merge:** creare i segreti `REVENUECAT_WEBHOOK_AUTH` e `REVENUECAT_API_KEY` **prima** del deploy delle functions (anche provvisori); deploy functions (`rcWebhook` + 5 callable nuove); APK (vetrina, banner); `npx cap sync android`. Regole invariate (`rcStato` e `rcEventi` restano chiusi al client: nessuna regola li apre).

## Ambiente di test (va rifatto in una sessione nuova)
- Emulatori: `powershell Start-Process` staccato di `npx firebase emulators:start --only auth,firestore --config firebase.emu.json --project demo-groomly` con `JAVA_HOME` = jbr di Android Studio **e il suo `bin` davanti nel `PATH`** (`$env:PATH = "$jbrin;$env:PATH"`): con il solo `JAVA_HOME` firebase-tools prende il Java 17 del sistema e si ferma («no longer supports Java version before 21») (memoria `emulatori-java-credenziale`). Le callable in emulatore danno INTERNAL: per verificare il server si chiamano le funzioni compilate (`cd functions && npx tsc`, poi `functions/lib/functions/src/piano/*.js`) con script come `QA-tests/.qa-catalog/verify-a1.cjs`, `verify-a2.cjs`, `verify-a3.cjs`, `verify-a8-a9.cjs`, `verify-a7.cjs`. Per provare le callable nel browser: `verify-a7-browser.cjs` intercetta le chiamate a :5001 e le esegue con `.run()`.
- App: `npx vite --mode emu --port 5173 --host 127.0.0.1` (staccato).
- Dati: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-groomly npx vite-node scripts/test360/seed-audit.ts`, poi `node test-results/audit/work/coord/fix-enabled.cjs`. Un nuovo seed rifà salone56 (eliminato nella verifica A8+A9) e crea staff52b come revocato.
- **Test delle regole Firestore**: NON usare `npm run test:rules` con l'emulatore QA acceso su 8080 (lo svuota); usare un emulatore usa e getta su 8180: `"/c/Program Files/Android/Android Studio/jbr/bin/java" -jar cloud-firestore-emulator-v1.19.8.jar --host=127.0.0.1 --port=8180 --project_id=demo-groomly --single_project_mode`, poi `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 npx vitest run --config vitest.rules.config.ts`.
- Test delle functions: dalla radice (`npx vitest run functions/src/...`); dentro `functions/` ci sono fallimenti non correlati legati alla cartella.
- Fallimento noto e non correlato in tutta la suite: `src/lib/driveInvio.test.ts`.
- **Attenzione:** l'emulatore Firestore scrive in `firebase-debug.log` ~12 MB/s e si blocca con più browser insieme → **un solo runner alla volta** e svuotare il log (`: > firebase-debug.log`). Account finti: `test-results/audit/accounts.md`, password `Test1234!`.
- qa-my-app: catalogo in `QA-tests/` (task fino a T309 per le verifiche fatte qui; T191–T213 sono del catalogo originale). Gli agenti `qa-page-analyzer`/`qa-test-runner` (`.claude/agents/`) si caricano solo in una sessione nuova: qui abbiamo usato agenti generici + Playwright con i brief `QA-tests/.qa-catalog/runner-brief-*.md`. Ruoli QA locali (in `auth.local.json` e `state/creds.json`, non versionati): titolare (plus36), titolare-go (go12), collaboratore (staff55a), titolare-salone (salone55), socio-salone (staff54a), titolare-grazia (plus41), titolare-omaggio (plus44), titolare-go-puro (go4), ex-collaboratore (staff56b).
- Stato emulatore dopo le verifiche: go1 «in prova», plus45 «in prova da operatore», salone56 eliminato, vari cani/visite «QA …» in salone55. Gli script `verify-account-profilo.cjs` e `verify-home-telefono.cjs` creano e cancellano i propri account (`--keep` per tenerli).
- Account seminati con firebase-admin: mettere `legacy: false` in `accounts/<uid>` come negli account veri, altrimenti le regole rifiutano ogni aggiornamento del documento (trovato con l'allineamento dell'email).

## Release e deploy (promemoria)
- Versione in `android/app/build.gradle` (versionCode/versionName), `package.json`, `src/lib/appVersion.ts`, `hosting/release.json`; `npm run build`, `npx cap sync android`, `gradlew assembleGithubRelease` col Java 17 di sistema; firma da verificare (SHA-256 96dafbcd…08c73); `cp` in `groomly.apk`; commit «Pubblica la x.y.z…», push, `gh release create`, poi `firebase deploy --only hosting` (+ functions con `FUNCTIONS_DISCOVERY_TIMEOUT=60`, + `firestore:rules` se cambiano). Progetto Firebase di default: `groomly-3128b`.

## Come abbiamo lavorato (trucchi utili)
- Sotto-agenti: per ogni piano `bash ~/.claude/skills/subagent-driven-development/scripts/sdd-workspace <piano>` crea `.superpowers/sdd/<piano>/` (registro `progress.md`, brief con `scripts/task-brief`, pacchetti di revisione con `scripts/review-package`); a fine lavoro la cartella si cancella. Le istruzioni del revisore si estraggono da `task-reviewer-prompt.md` con `awk '/^  prompt: \|/{f=1;next} /^```$/{if(f){exit}} f'` (attenzione: non mettere gli apici inversi con la barra davanti, altrimenti il file esce troncato).
- Verifiche nel browser: script Playwright in `QA-tests/.qa-catalog/verify-*.cjs` che creano l'account con firebase-admin, fanno l'accesso e controllano; per le callable si intercetta `:5001` e si esegue la funzione compilata con `.run()` (`verify-a7-browser.cjs`); per simulare la rete: `context.setOffline`, `ctx.route('http://127.0.0.1:8080/**', …)` per bloccare Firestore. Se si va offline, caricare prima i moduli che servono (Vite non li serve più).
- Le revisioni hanno trovato più volte problemi veri che i test non vedevano: conviene sempre una prova reale sull'emulatore prima di unire.
- Test lenti: `npx vitest run --config vitest.slow.config.ts src/pages/LoginPage.test.tsx` (LoginPage non gira con la configurazione normale).
- Dispatch dei sotto-agenti senza riempire il contesto: copiare le istruzioni dei modelli (`implementer-prompt.md`, `task-reviewer-prompt.md`, `re-review-prompt.md`) in file dentro la cartella del piano con l'`awk` qui sopra e passare all'agente solo i percorsi (istruzioni, brief, report, pacchetto diff). Implementatori e revisori per task su `sonnet`, verifica e revisione finale su `opus`, ri-revisioni piccole anche su `haiku`. Il revisore finale ha trovato problemi veri in entrambi i gruppi di oggi («Proponi un altro orario» ancora bloccato; avviso della scheda tagliato a «Pagamento no…»): non saltarlo.
- Verifiche nel browser che contano la grafica: misurare le righe (`scrollWidth <= clientWidth`) a 390 e 360 px, non solo leggere il testo del DOM (`verify-piani.cjs`).
- Callable vera sull'emulatore senza INTERNAL: caricare `functions/lib/functions/src/index.js` compilato (inizializza l'app), togliere `FUNCTIONS_EMULATOR` dall'ambiente e chiamare l'handler con `.run()` (`verify-prenotazioni-online.cjs`, caso g).
- Lettura in produzione (solo lettura, solo col permesso di Roberto): `node QA-tests/.qa-catalog/leggi-piani-prod.cjs` elenca i `pro/main` di tutti i saloni e quali chiuderebbe `chiudiProve`; usa il token di accesso di firebase-tools (`~/.config/configstore/firebase-tools.json`) e la REST di Firestore, nessuna credenziale in più. Sul modello si possono fare altre letture.
- Script di verifica con `--solo=P1,L1` (filtro dei casi) e uno screenshot prima dei passi delicati: molto più veloce da correggere (`verify-account-profilo.cjs`, `verify-home-telefono.cjs`). Un caso che fallisce va guardato nello screenshot prima di toccare il codice: due volte su quattro era il dato del test (P. IVA italiana valida anche in Francia, date NaN), due volte un difetto vero (email non allineata all'accesso).
- Callable con Google Places finto nel browser: in node `process.env.PLACES_API_KEY` finta, `globalThis.fetch` sostituito per `places.googleapis.com`, `ctx.route(':5001/**')` che esegue l'handler compilato con `.run()` e l'uid letto dal token (`verify-account-profilo.cjs`).
- Con il piano Salone omaggio «Esporta» del report apre l'avviso «in arrivo», non il foglio: il foglio si prova con `ExportSheet.test.tsx`.
- Controllo «frasi fisse» (`src/i18n/frasiFisse.test.ts`): segnala come italiano ogni letterale del codice uguale a un valore di `it.ts` diverso da `en.ts`. Se una chiave nuova ha lo stesso testo di un dato (es. `'fisso'`, `'Bagno + tosatura'`) cambiare il testo della chiave o riusare una traduzione esistente (`nomeVoceListino`).
- I test di `functions/` vanno lanciati dalla radice: da dentro `functions/` falliscono anche `inviaRichiesta.test.ts` e `rispondiRichiesta.test.ts` (leggono file con percorsi dalla radice).

## Prossimo passo (storico, al 4 novembre)
Il prossimo passo attuale è in «Punto della situazione», in cima.

**Stato al 4 novembre:** i sei rami delle basse (`fix/basse-prenotazioni` e `claude/basse-{team,telefono,account,animali,grafica}-*`) sono uniti in `main`. Conflitti solo in PROGRESS/audit, in `SchedaAbbonamento.tsx` (ora tutte le righe vanno a capo), `display.ts` (import) e `DogPage.tsx` (galleria con `useScegliFoto` e classe `tocco`). Suite: app solo i 25 fallimenti noti, functions 264/264 (da lanciare dalla radice con `--dir functions`), hosting 34/34. **1.1.188** committata, pushata, release GitHub v1.1.188 (firma 96dafbcd… verificata), hosting e functions pubblicati.
- Facoltativo: deploy delle functions che usano `src/lib/prenotazione.ts` (`inviaRichiesta` e la lista d'attesa pubblica) per avere «Nome non valido» / «Telefono non valido» al posto di «Richiesta non valida»; senza, la pagina ferma comunque il cliente prima.
- Domanda aperta per Roberto: le schede già salvate con telefoni finti («333», «-») ora chiedono un numero vero al salvataggio. Se Laura usa «-» per chi non dà il numero, rendere il telefono facoltativo nella scheda.
- Emulatori (8080, 9099) e app Vite (5173) erano accesi: in una sessione nuova controllare le porte prima di riavviarli.

1. Rifare l'ambiente (sezione «Ambiente di test») se la sessione è nuova: emulatori auth+firestore (jbr nel `PATH`) e app Vite in modo emu.
2. ~~**Seguito server del listino per razza** (dalla media 23).~~ **Fatto e pubblicato il 3 novembre** (ramo `fix/listino-razza-server`, spec `docs/superpowers/specs/2026-11-03-listino-razza-server-design.md`, verifica `QA-tests/.qa-catalog/verify-listino-razza-server.cjs` 5/5): richieste accettate/confermate e lista d'attesa prendono il prezzo del cane, poi del listino per razza, poi della taglia. Deploy delle functions `gestisciPrenotazione`, `confermaAttesa`, `rispondiRichiesta`, `scadiProposte`; niente APK (nell'app solo spostamento di codice, comportamento uguale). Logica condivisa in `src/lib/prezzoListino.ts`. Resta una piccola differenza: nell'app (`quotedPrice`, `src/lib/quote.ts:13-17`) un prezzo personale con sola durata salta il listino e va alla taglia, il server invece passa al listino — da allineare nell'app alla prossima APK.
3. Poi le **basse** (~65, in 8 righe nell'audit, sezione «Basse (in breve)»), a gruppi di 8-10 per area con lo stesso flusso. **Tutte fatte e pubblicate** (ultime sei nella 1.1.188).
4. Minori lasciati aperti (annotati nei paragrafi sopra): importi in formato italiano anche in inglese (`formatEuro`/`maskEuro`); a 320 px la casella privacy della registrazione va su due righe; `deleteMissing` del ripristino cancella tutto insieme; «dal listino» non compare nella lettura della visita salvata; il contatore delle richieste di recensione non conta quelle del collaboratore.
5. **Da provare sul telefono con la 1.1.186** (oltre alla 1.1.184/185): telefono «abc» e peso «1e3» rifiutati nella scheda, «Non venuto» assente sulle visite future. Già prima, con la 1.1.184 (non verificabile nel browser): al primo accesso su Android nessuna schermata «Sveglie e promemoria»; righe promemoria/auguri della Home leggibili; paese e partita IVA in Account; cambio di salone (A7) ed «Esci» (A10).
6. Da guardare a parte: gli 8 test che falliscono con `vitest.slow.config.ts` in `DogsPage.test.tsx` e `appointments.test.tsx` (falliscono anche senza le modifiche recenti); fallimento noto in tutta la suite: `src/lib/driveInvio.test.ts`.
7. In una sessione nuova (agenti qa caricabili): regressione `/qa-my-app:run-all` sulle rotte toccate (invito, login, Home, Impostazioni, Account, Incassi, Gestione listino), pagina pubblica dell'offerta d'attesa. All'avvio il plugin qa-my-app segnala 25 rotte cambiate rispetto al catalogo: prima `/qa-my-app:sync`.

## Beta Plus/Salone — A2 Proposte design (4 novembre)
- Fase 1B fatta. Ci sono le 5 proposte HTML e l'indice: `docs/superpowers/specs/2026-11-04-admin-manager-proposte.html`.
- Roberto ha scelto la **2 «Tab in alto»**, con «Da fare oggi» e il pannello di accensione della 5.
- Spec definitiva per B2/B3: `docs/superpowers/specs/2026-11-04-admin-manager-design.md`.
- Da passare a B1: oggi nessuna function scrive `mostraPiani` e serve una callable operatore.

## Beta Plus/Salone — B2 Admin Manager (4 novembre, ramo `claude/beta-b2-admin-5395f1`, non unito)
- «Utenti Groomly» è diventato **Admin Manager** (`/impostazioni/admin-manager`; `/impostazioni/utenti` reindirizza, anche con i vecchi `zona=`). Voce in Impostazioni con la corona viola, solo operatori.
- Tab: Panoramica (numeri beta, Da fare oggi con +30 gg, saloni per piano e fonte, Avvisami, inviti per stato, Tour), Saloni (cerca, filtri, selezione multipla, barra d'invito, Regala 30 giorni a tutti), Beta (saloni con invito per stato), Feedback (riepilogo, funzioni, righe, esportazione PDF/Excel), Suggerimenti (coda di oggi), Piani (interruttori, offerta early adopter, RevenueCat, annuncio; segnaposto del pannello di accensione di B4).
- Dettaglio salone: piano effettivo e perché, barra dei giorni, Azioni (estendi, revoca, early adopter, invita, revoca invito + le card piano di oggi, Regala 30 giorni, Elimina con ELIMINA) · Storico · Feedback.
- File: `src/pages/AdminManagerPage.tsx`, `src/components/admin/*`, `src/lib/adminManager.ts`, `src/data/firebase/adminClient.ts`, `src/lib/percorsoAdmin.ts`, `EtichettaBeta`. `UsersPage.tsx` tolto; i suoi 23 test sono in `AdminManagerPage.test.tsx`, più `AdminManagerBeta.test.tsx` (10).
- Callable usate (le implementa B1, qui simulate nei test): `invitaBeta`, `revocaBeta`, `estendiBeta`, `segnaEarlyAdopter`, `contatoriAdmin`, `impostaMostraPiani`; `annunciaPagamenti` (B4).
- Allineato a B1: attività da `ultimoAccesso`, «In beta» da `inBeta`, estensioni degli inviti nello storico; la città resta nascosta (nessun dato). **All'unione:** i token `--plus-*`/`--sal-*` di B3 rendono superflua la copia in `STILE_ADMIN`.
- Controllo grafico a 360×640 in chiaro e scuro con dati finti (Playwright): nessuno scroll orizzontale. Suite `src`: solo il fallimento noto `driveInvio`. I test delle functions non girano nel worktree (manca `functions/node_modules`). Niente APK, niente merge.


## Beta Plus/Salone — B3 App del salone (4 novembre)
- Ramo `claude/beta-b3-salone-5fc9bd`, **non unito**, niente APK. Spec `docs/superpowers/specs/2026-11-04-beta-salone-ui-design.md`, piano `docs/superpowers/plans/2026-11-04-beta-salone-ui.md`.
- Scelte di Roberto:
  - nella vetrina dello stesso piano, con un invito aperto, «Apri l'invito» al posto di Avvisami;
  - la domanda di fine beta si apre da sola una volta.
- Fatto:
  - `BetaProvider`, che ascolta `betaInviti/{salonId}` solo per il titolare, con le funzioni pure `faseBeta`/`avvisiBeta`;
  - `betaClient.ts` (`rispondiInvitoBeta`, `inviaFeedbackBeta`, `listenInvitoBeta`);
  - card dell'invito in Home e avvisi beta in cima agli Avvisi, contati nella campanella;
  - pagine `/impostazioni/beta`, `/impostazioni/beta/feedback` e `/impostazioni/beta/fine`;
  - `EtichettaBeta` e `BarraGiorni` con i token `--plus-*`/`--sal-*`;
  - scheda «Il tuo piano» e pagina Abbonamento in beta, riga «Invia feedback beta»;
  - vetrine «In arrivo · Avvisami» con il toast; anche il paywall mostra il toast;
  - testi it/en/es nel blocco `// Beta B3`.
- `PianoValore` ha due campi facoltativi nuovi: `traccia` e `configPiani`. `PianoContext` ora è esportato (serve all'anteprima). Esportati anche `callCallableData`, `database` e `loadFirestore` di `client.ts`, e `FUNZIONI` di `Vetrina.tsx`.
- Anteprima solo in sviluppo: `/dev/beta?scena=nessuna|invito|beta|ultimo|finita|revocata|scaduto&piano=pro|salone&pagina=home|avvisi|invito|impostazioni|abbonamento|feedback|fine|vetrina|vetrina-salone`. Serve un account locale (`npm run dev` senza `.env`). Controllo grafico fatto a 360×640, chiaro e scuro, con Playwright senza finestra.
- Test:
  - i test nuovi passano tutti; il server è simulato, perché B1 non è in questo ramo;
  - nella suite resta solo il fallimento noto di `src/lib/driveInvio.test.ts`.
- Al merge:
  - va unito con B1 (le callable vere) e collaudato sugli emulatori;
  - B2 trova `EtichettaBeta` in `src/components/abbonamento/`.
- Fuori dal mio ramo: la vetrina Salon dice ancora «Il rinnovo è mensile e puoi disdire» (`abbSaloneCome`). In beta, senza pagamenti, va ripensata alla chiusura.
- Con B1:
  - i messaggi `failed-precondition` noti di `rispondiInvitoBeta`/`inviaFeedbackBeta` si traducono in it/en/es (`messaggioErroreBeta`); gli altri passano così come sono;
  - B1 scrive anche `salons/{id}/avvisi/beta` (con `segnaAvvisoBeta`), ma l'app non lo legge: gli avvisi li calcola da sola. Per la chiusura: valutare se mostrare gli avvisi che solo il server conosce (revoca con testo dell'operatore, estensione, invito ritirato) leggendo quel documento.

## Cinque lingue — T1 Basi (4 novembre, ramo `claude/lingue-t1-basi-7822a1`, non unito)
- Spec `docs/superpowers/specs/2026-11-04-lingue-basi-design.md`, piano `docs/superpowers/plans/2026-11-04-lingue-basi.md`. Scelte in `docs/DECISIONI-AUTOMATICHE.md`.
- Fatto:
  - `Lingua` a cinque valori da `LINGUE`, con `NOMI_LINGUA`, `OPZIONI_LINGUA`, `LOCALE_INTL`; unioni scritte a mano sostituite in `src` e `functions/src`;
  - regola scelta, telefono, inglese; passaggio una tantum `passaggioLingua`; `linguaDalLuogo` serve solo a quello;
  - `accounts/{uid}.lingua` allineato a ogni avvio e al cambio lingua, e scritto alla creazione;
  - voce «Lingua dei clienti» (solo titolare), compilata nei saloni nuovi;
  - selettore a cinque lingue in Impostazioni, Login (nuovo), messaggi, stampa del listino; `format.ts` per fr e de.
- Provvisori: `fr.ts` e `de.ts` copiano l'inglese, le tabelle hanno l'inglese con `// LINGUE: da tradurre`. All'unione vincono i file di T2 e T3, che hanno già le chiavi `// Lingue T1`.
- Per l'ondata 2:
  - `src/i18n/debitoFrasi.json`: frasi fisse da tradurre, file per file; tolte dal codice, si tolgono da lì;
  - `src/i18n/debitoLingue.ts`: `DEBITO_CATENE` da svuotare; `SEGNAPOSTO_AMMESSI` da mettere a `false` a fine ondata 2;
  - `hosting/*` non toccato: è di T6;
  - in `src/i18n/emailHtml.test.ts` il tipo `LinguaEmail` esclude fr e de finché T5 non scrive le email.

- Verifiche sul ramo: `npm run build` verde; `npm test` (comprende le functions) solo il fallimento noto `driveInvio`, che c'è anche su `main`. Suite lenta: 25 fallimenti in `DogsPage` e `appointments`, identici sul codice di partenza. `lingue.test` passa anche con i `fr.ts` e `de.ts` veri di T2 e T3. Non provato su emulatore o telefono; regole Firestore non toccate.

## Cinque lingue — T2 Francese (4 novembre)
- Ramo `claude/lingue-t2-francese-442e26`, **non unito**, niente APK. Spec `docs/superpowers/specs/2026-11-04-lingue-francese-design.md`.
- Fatto: `src/i18n/fr.ts` con tutte le 1.965 chiavi, *vous*, spazi insecabili, terminologia del glossario. Sezione «Aggiunte del francese» in `docs/glossario-lingue.md`, dove manca ancora la colonna tedesca.
- Controlli: chiavi e segnaposto `{{...}}` uguali a `it.ts` con uno script mio, `tsc` su `fr.ts` passa. `npm test` non è girato: il file non è collegato e il worktree non ha `node_modules`.
- Non controllato a schermo: il file si vede solo dopo l'unione con T1. Le lunghezze a 320 px le ho guardate sul codice, la prova vera è in T7.
- Per T1: 92 frasi `fr` sono uguali a `en` o `it`. L'elenco per il test è in `uguali-fr.txt`, nelle note condivise. `ELIMINA` e `ACCENDI` devono restare nell'elenco.
- Su richiesta di T1: blocco `// Lingue T1` in fondo a `fr.ts` e nuovo testo di `linguaMessaggiDettaglio`. Le due chiavi nuove esistono in `it.ts` solo sul ramo di T1: finché non si uniscono, `tsc` su `fr.ts` da solo le segnala come chiavi in più.

## Cinque lingue — T3 Tedesco (4 novembre, ramo `claude/lingue-t3-tedesco-8f1243`, non unito)
- Nuovo `src/i18n/de.ts`: tutte le 1.965 chiavi, stessa struttura di `en.ts`, `export const de`. Non è ancora collegato: `Lingua` e `t.ts` li cambia T1. All'unione questo file vince sul provvisorio di T1.
- Controllato con uno script: chiavi uguali a `it.ts`, stessi segnaposto, nessun *du*, `tsc` senza errori sul file. Riletto tutto una seconda volta.
- Lunghezza a 320 px: controllata leggendo il codice e facendo i conti su larghezze e font, **non ancora su un telefono**. Tocca a T7. I punti da guardare: barra in basso, i tre pulsanti di chiusura in Home, età e sesso nella scheda.
- 74 frasi uguali a inglese o italiano, tutte volute: elenco in `docs/superpowers/specs/2026-11-04-lingue-tedesco-design.md`, per il test di T1.
- Termini nuovi nel glossario, scelte in `docs/DECISIONI-AUTOMATICHE.md`.
- Da T1: `linguaClienti` e `linguaClientiDettaglio` in fondo con `// Lingue T1`, nuovo `linguaMessaggiDettaglio`. Le due chiavi nuove arrivano in `it.ts` con T1: su questo ramo da solo `tsc` le segnala come in più, unito a T1 no.
- Da fare per T4: `homeAnnulla` copre sia «Annulla» sia l'annullamento nei toast, conviene dividerla.
- `npm test` non eseguito: il worktree non ha `node_modules` e il file non è ancora importato da nessuno.
## 1.1.190 — filtro Avvisami nell'Admin Manager (5 novembre)
- Tab Saloni: filtri «Avvisami Plus» e «Avvisami Salon», con la scritta nella riga del salone. `contatoriAdmin` ora manda `interesse` per salone. I numeri si caricano anche aprendo il tab Saloni.
- Pubblicata dal ramo `claude/rel-1-1-190`, partito da `origin/main`: il lavoro delle cinque lingue, ancora solo sulla `main` locale, non è in questa versione.

## Cinque lingue — T5 Server (5 novembre, ramo `claude/blissful-swartz-54ecd9`, non unito)
- Contratto per T4 e T6 in `docs/superpowers/specs/2026-11-04-lingue-server-design.md`, copia in `D:\Groomly\.claude\lingue-note\contratti-t5.md`.
- Ogni `HttpsError` passa da `functions/src/erroriServer.ts` e porta `details.codice`; `message` resta italiano per le APK vecchie. Frasi nelle cinque lingue in `src/i18n/errori.ts`, blocco `// Lingue T5`.
- Email in cinque lingue: `emailHtml`, `emailBeta`, `emailAnnuncio`, `emailEliminazione`, `htmlEsito`. Catene `lingua === 'en'` tolte.
- Catena clienti: `richiesta.lingua`, `settings.linguaClienti`, `'it'`. `iscritto.lingua` per la lista d'attesa, `dog.lingua` per la coda, riga per riga. `?lang=` nei link delle email.
- `paginaPubblica.ts` (functions): `?lang=`, browser, inglese, come chiesto da T6.
- Brevo: nessun template è in uso, niente da tradurre (`docs/DA-FARE-ROBERTO.md`).
- Non provato su emulatore né con email vere: le frasi fr e de le ha scritte Claude e vanno lette da T7 con `campioneEmail`, ora 75 email.
- Resta a T4: `src/lib/avvisoPiano.ts` (oggetto dell'email di piano in fr e de), `src/lib/paginaPubblica.ts`, le righe vecchie di `errori.ts`, la lettura di `dog.lingua`. Finché T4 e T6 non sono uniti i client non leggono i codici: il server funziona comunque come prima.

## Cinque lingue — T4 App (5 novembre, ramo `claude/great-hamilton-2bc8bc`, non unito)
- Spec `docs/superpowers/specs/2026-11-04-lingue-app-design.md`, piano `docs/superpowers/plans/2026-11-04-lingue-app.md`. Scelte in `docs/DECISIONI-AUTOMATICHE.md`.
- Fatto:
  - frasi fisse di `src/` nel catalogo: blocco `// Lingue T4` nei cinque file, `frase()` ed `erroreApp()` per il codice fuori dalle schermate;
  - tabelle in cinque lingue: `report`, `listino`, `servizioVisibile`, `errori`, `avvisoPiano`, `paginaPubblica` (con i testi di T6), `messaggiManuali`;
  - errori del server tradotti da `details.codice`, sul contratto di T5;
  - Registro Excel, LEGGIMI, PDF ed Excel degli incassi, notifiche locali, `UpdateNotice`, note di rilascio per lingua;
  - listino iniziale tradotto alla visualizzazione, con le voci che mancavano;
  - `dog.lingua` letto, conservato al salvataggio e proposto in `PulsanteMessaggi`;
  - debito di `src/` a zero: `debitoFrasi.json` ha solo `functions/`, `DEBITO_CATENE` solo i file di T5. I `// LINGUE: da tradurre` rimasti sono in file di T5.
- Per la chiusura:
  - `errori.ts` viene dal ramo di T5: va unito dopo T5, le differenze sono cinque righe;
  - `SEGNAPOSTO_AMMESSI` è ancora `true`: va a `false` quando T5 è unito;
  - `frasiFisse.test.ts`, `debitoFrasi.json` e `debitoLingue.ts` li tocca anche T5: conviene controllarli all'unione;
  - le note della prossima release possono avere le sezioni `[en]`, `[es]`, `[fr]`, `[de]`: senza, chi non è italiano legge la frase generica.
- Verifiche sul ramo: `npm run build` e `tsc` di app e functions verdi. I file di test toccati passano. La suite completa con tutte le correzioni va confermata sul risultato unito: sotto carico `ExportSheet` e `useAttesa` sono andati in timeout, da soli passano. Controllati font e output PDF. Non provato su emulatore o telefono: lunghezze a 320 px e schermate reali sono di T7.

## Cinque lingue — T6 Pagine e negozio (5 novembre, ramo `claude/quizzical-elbakyan-5a60e1`, non unito)
- Spec `docs/superpowers/specs/2026-11-04-lingue-pagine-design.md`, piano `docs/superpowers/plans/2026-11-04-lingue-pagine.md`. Scelte in `docs/DECISIONI-AUTOMATICHE.md`, termini nel glossario.
- Pagine: home, `c`, `salone/*`, `azione`, `s/pagina.js` e `lingua-pagina.js` in cinque lingue, con la regola `?lang=`, browser, inglese. I link già inviati restano validi. La riga delle lingue tiene `attesa`, `giorno` e `ora`.
- Server: `pagina.js` manda `lingua` a `inviaRichiesta`, `iscrivitiAttesa`, `confermaAttesa` e legge `details.codice`. Il `message` italiano non si mostra più.
- Policy: privacy, termini, DPA, eliminazione account in fr e de, con la riga «fa fede il testo italiano» anche in en ed es. Traduzioni di Claude, senza revisione legale. `docs/legal/*.html` e `hosting/privacy.html` sono copie esatte, tenute da un test.
- Link rotti sistemati: `/termini.html`, `/dpa.html`, `/elimina-account.html` davano 404.
- Android `values-fr`, `values-de`. Schede `docs/play/scheda-fr.md` e `scheda-de.md`; le schede it, en, es dicono cinque lingue. Azione su Play Console in `docs/DA-FARE-ROBERTO.md`.
- Verifiche: suite senza functions verde (nel worktree le functions non hanno `node_modules`, e non le ho toccate). `firebaseConfig.test` cita ora `/privacy/`. Nel browser a 320 px: 18 pagine e stati in 5 lingue, 90 aperture senza sbordi, lingua giusta. Percorso di prenotazione fino agli errori del modulo provato in fr e de con `?demo=1`, su server locale.
- Non provato: invio vero al server (`inviaRichiesta` con T5), emulatori, telefono. La pagina del salone è stata provata con la riga a cinque lingue simulata.
- **Aspetta T5:** sulla pagina `/s/` restano in inglese testata, piede, giorni e pagina assente finché T5 non applica `D:/Groomly/.claude/lingue-note/richieste-t6.md`. Senza quella modifica il server ripiega ancora sull'italiano e la riga mostra tre lingue.
- Da decidere più avanti: i termini italiani parlano ancora di piani Base, Pro e Salone, mentre l'app dice Go, Plus e Salon. Il testo in vigore non è stato cambiato: va aggiornato in tutte le lingue insieme, con nuova versione. Le traduzioni seguono l'italiano.

## Cinque lingue — T7 Audit (5 novembre, ramo `claude/eager-tesla-21ceef`, non unito)
- Report `docs/audit-cinque-lingue.md`, spec `docs/superpowers/specs/2026-11-04-lingue-audit-design.md`, piano `docs/superpowers/plans/2026-11-04-lingue-audit.md`.
- Giro su emulatori Firebase e Chromium: sei profili, cinque lingue, 320, 360 e 390 px, con i dialoghi. Prenotazione vera da `/s/` con browser tedesco: 21 flussi su 21. App: 33 su 33. Email, push, PDF, Excel e Registro generati e riletti.
- Corretti: nomi predefiniti di servizi e listino rimasti in italiano, ricevuta e pagina `/s/`, «toelettatura» nel login, «posti» in Team, pulsanti e parole a 320 px, date tedesche nei file, spazi francesi. Nuove chiavi `teamPosti`, `chiusoBreve`. Il test `lingue.test` è verde.
- Script in `QA-tests/.qa-catalog`: `verify-cinque-lingue`, `verify-lingue-*`, `lingue-*`, `brevo-finto`, `report-lingue`, con `firebase.lingue.json` a parte.
- Catalogo QA aggiornato a mano: `/qa-my-app:sync` non si lancia da una sessione. Impronte nuove, 190 task non riscritti.
- Da decidere: logo con «TOELETTATURA» su pagine pubbliche ed email, in `docs/DA-FARE-ROBERTO.md`.
- Non provato: telefono o emulatore Android, push vere, email vere, `giraCoda` e `scadiProposte` sugli emulatori. Elenco completo nel report.

## Cinque lingue — chiusura (5 novembre, 1.1.191)
- Unite le ondate T1–T7: francese e tedesco, lingua di telefono, push, email, pagine e policy. Report in `docs/audit-cinque-lingue.md`.
- Tolta la scritta «TOELETTATURA» dai loghi in uso: sito, email, avvio, VIP.
- Non provati su telefono: trattino automatico nella WebView, email e push vere.

## Accessi admin (5 novembre, pubblicati con la 1.1.192)
- Permessi admin solo dal claim in client, regole e functions; Laura non è più operatrice. Esito `admin` in `entryGate`, rotte `/admin` e `/admin/avvisi`, vecchi link rimandati.
- robmass83 prende il posto della hotmail in `isSharedEmail`. Il vero I Pelosetti è `salons/{uid di Laura}`, non `salon/shared`: lo script `scripts/imposta-admin.ts` lavora lì e scrive solo `accounts` e `members`.
- `adminLog`, riconferma password dopo 15 minuti, avvisi di sistema tramite functions con limite di 10 all'ora.
- Spec `docs/superpowers/specs/2026-11-05-accessi-admin-design.md`, piano `docs/superpowers/plans/2026-11-05-accessi-admin.md`. Passi manuali in `docs/GUIDA-ADMIN-MANAGER.md`.
- In produzione: claim sulla hotmail, functions, regole, APK. Restano `collega` (salone di prova «I coccoli»), le prove d'accesso, `stacca` e `storage.rules` a mano in Console.

## Console Oggi (6 novembre, pubblicata con la 1.1.194)
- Scelta fra 7 proposte di redesign: Oggi più la ricerca di Comando. La Panoramica diventa Oggi, con le cose da fare in card col pulsante pronto.
- Barra in alto col logo Groomly, tasto + per le azioni rapide, ricerca di saloni e pagine (Ctrl+K su PC). Beta passa sotto Altro sul telefono.
- Restano com'erano Saloni, Scheda salone, Assistenza, Comunicazioni e Piani. Non provata con dati veri: controllata su anteprima con dati finti.
