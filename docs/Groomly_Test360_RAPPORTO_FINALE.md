# Test 360° finale — 25 ottobre 2026, pomeriggio

Chiusura dei task 10–36 del piano `docs/superpowers/plans/2026-10-25-groomly-piani-completo.md`. Progetto degli script: `demo-groomly`. Nessuna lettura o scrittura su `groomly-3128b`. Nessun `firebase deploy`. `mostraPiani` e `abbonamentiAttivi` restano spenti. La versione installata in questo giro è ancora `1.1.93`: l’alzata a `1.1.94` è il task 37, dopo questo rapporto.

## Come è stato eseguito

Emulatori spenti (niente export), poi riaccesi da zero con JDK 21 portatile (`%LOCALAPPDATA%\jdk21`, fuori dal repository):

`npx firebase emulators:start --only auth,firestore,functions --config firebase.emu.json --project demo-groomly`

Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, Functions `127.0.0.1:5001`. Il Pub/Sub non è stato riacceso: al giro precedente il processo usciva con codice 1 e spegneva tutta la suite (decisione D18). Per questo `chiudiProve`, `copieCloud`, `promemoriaEmail` e `sendPush` restano «ignored» finché l’emulatore Pub/Sub non resta in piedi. Le callable HTTP sono partite, compreso `rcWebhook`.

Seed: `npx vite-node scripts/test360/seed.ts` — 20 saloni più Laura finta, `FATTO 21`. Password degli account finti: `Test1234!`, solo sull’emulatore. Dopo il test delle regole (che svuota Firestore) il seed è stato rifatto. Poi gli emulatori sono stati spenti e sono stati cancellati `test-results/`, `firestore-debug.log`, `firebase-debug.log` e `pubsub-debug.log`. Non restano nel working tree dati di cani o appuntamenti.

## Regole

`npx vitest run --config vitest.rules.config.ts` con `FIRESTORE_EMULATOR_HOST`: **11/11**. Compreso «il collaboratore non cambia la persona di un completato se è un altro» e i salvataggi della 1.1.93.

`vite-node scripts/test360/rules.ts`: **28/28**. La riga che nel rapporto iniziale era 27/28 è chiusa: il collaboratore 13 scrive `assigneeUid: uid-altra-persona` su una visita già completata e la regola nega. Anche il cambio di importo è negato. Il collaboratore 14 con Pro spento non legge i cani. Queste regole sono su `main` e non sono state pubblicate.

## Pagine (Playwright, Chromium, 390×844)

App su `npx vite --mode emu` (`VITE_EMULATORS=1`). Il kit continua a bloccare GitHub e `groomly-3128b.web.app`, quindi Aggiornamenti dice «Lo storico non si carica». Non è una chiamata al progetto vero.

| Giro | Esito |
|---|---|
| Titolare `salone1@test.groomly`, chiaro | 17 route aperte. Home con «DA CHIUDERE (3)», animali 58 attivi, calendario, mensili 14/14, listino, incassi € 888 / report € 3438, servizi, archivio. `/impostazioni/utenti` torna a Impostazioni. Primo dato visibile in 8,6 s. `tDataMs` −1: oggi è vuoto e la frase «Nessun appuntamento» resta. |
| Stesso titolare, scuro | Le stesse 17 route. Primo dato visibile in 3,6 s. |
| Collaboratore `collab15@test.groomly` | Entra. Impostazioni senza Funzioni Pro, senza servizi e senza la card «Il tuo piano». Servizi e Pro rimandano a `/impostazioni`. Il listino animali si apre (51 attivi). Il selettore del kit sulla scheda (`a[href^="/animali/"]`) e il testo «Fissa appuntamento» non trovano più il controllo: il pulsante visibile è «Fissa un appuntamento». Non è un diniego dei dati. |
| Collaboratore `collab14@test.groomly` con Pro spento | Schermata «Il tuo accesso a Toelettatura Palermo è sospeso. Il titolare ha spento il piano. I dati non sono persi.» |
| Salone base, flag spento (`salone1`) | In Impostazioni non c’è «Il tuo piano», né «Prova Pro gratis», né «Abbonamenti in arrivo». Resta la riga già esistente «Funzioni Pro», che apre «Accendi il piano…» senza un’azione (M3). |
| Offline (`fMore.cjs offline`, `salone9`) | A rete spenta la scheda «Offline Fufi3» si apre. Tornando online la scheda resta a schermo. |

Sulla Impostazioni del collaboratore 15 è comparso una volta «Salvataggio non riuscito». La pagina è rimasta usabile e i dati del salone si leggevano. Non è stato isolato in un secondo giro.

## Suite e build

`npm test`: 203 file, **1390/1390**, 135 secondi (sotto i 4 minuti). `npm run build` pulito (`tsc --noEmit` e Vite). I tre `=== 'salone'` fuori da `piano.ts` sono il motivo di disdetta e l’azione dell’operatore, non un confronto di piano. `REQUEST_INSTALL_PACKAGES` è ancora in `AndroidManifest.xml`.

## Falle del 25/10

| # | Esito | Prova di questo giro |
|---|---|---|
| F1 | Chiusa nel codice di `main`. Non pubblicata. | Un altro utente non legge `users/{uid}` di Laura. Test emulatore «un altro utente non legge il backup di Laura» e riga omonima di `rules.ts`. |
| F2 | Chiusa su questo percorso | Cane creato offline, scheda ancora presente dopo il ritorno online. |
| F3 | Chiusa nel codice di `main`. Non pubblicata. | Scrittura di `crediti` negata. `settings/main` del titolare permessa. |
| F4 | Chiusa | Importo di un completato negato. Persona diversa (`uid-altra-persona`) negata: 28/28 e il test emulatore dedicato. |
| F5 | Chiusa | Piano spento: il collaboratore non legge i cani e, in app, vede la sospensione. |
| F6 | Chiusa per il ramo | Il lavoro è su `main`. `git worktree remove` ha tolto dall’elenco i worktree già contenuti in `main`. La cartella è sparita solo per `backup-raccoglitore`. Le altre (backup completo e zip, i rami Drive, registro Excel, ripristino foto/sicurezza/zip, listino-razze) restano sul disco: Windows rifiuta la cancellazione per «Filename too long». `pro-collaboratori` resta registrato perché ha file modificati o non tracciati: non è stato forzato. Restano anche `scheda-nido` (`f6b2e16`) e `firma-privacy` (`1511599`), il cui HEAD non è in `main`. |
| F7 | Aperta, di proposito | Il repository resta pubblico finché l’APK non ha un altro indirizzo. Passo rimasto: punto 2 di `docs/DA-FARE-ROBERTO.md`. Non si chiude a parole. |
| F8 | Non chiusa del tutto | La Home mostra i dati, ma «Nessun appuntamento» resta quando oggi è vuoto. Primo paint 8,6 s (chiaro) e 3,6 s (scuro). |
| F9 | Chiusa | 11 test sull’emulatore più 28 prove dello script, non la sola lettura del file. |
| F10 | Chiusa per la durata | Suite intera 1390 test in 135 s. Il giro browser non chiama GitHub né l’hosting vero. |
| M1, M2, M4, M7, M8, M9, M10 | Segnate fatte in fase 0 | Non riaperte una per una in questo giro. |
| M3 | Aperta | `/impostazioni/pro` del titolare base dice ancora «Accendi il piano per invitare un socio o un collaboratore» senza un’azione. Si chiude solo quando `mostraPiani` sarà vero. Il flag non è stato acceso. |
| M5 | Chiusa nel codice, nascosta | L’editor degli orari e il rifiuto fuori fascia ci sono (task 17) e compaiono solo col flag. Con il flag spento il form non cambia. La griglia del giorno non è stata ridisegnata in questo giro. |
| M6 | Aperta | L’agenda settimana è ancora la griglia oraria. Nessun task di questo piano la sostituisce con il conteggio «N cani». |
| M11 | Segnata fatta in fase 0 | Spazio `BOTTOM_NAV_CONTENT_PAD`. Gli screenshot di questo giro sono stati cancellati, quindi non è stata rimisurata. |
| M12 | Chiusa in fase 0 | `isOperator` chiede l’email verificata oppure il claim `admin`. Non è stata rifatta una prova nuova sull’account non verificato in questo pomeriggio. |
| M13 | Non chiusa del tutto | `rules.ts` si aspetta, e ottiene, che il collaboratore possa cancellare il proprio `accounts/{uid}`. `eliminaAccount` revoca i membri solo se `salonId === uid`, quindi un collaboratore non può usarla per liberare il posto. Il buco del posto fantasma, se la cancellazione passa dalle regole, resta. |

## Cosa non è stato provato

Push verso i telefoni, Brevo con una chiave vera, Drive, fotocamera, installazione dell’APK sul telefono, emulatore Pub/Sub, flavor Play, RevenueCat con una chiave. Il webhook senza chiave risponde 503 e non scrive (prova già fatta sull’emulatore nel task 31). Il deploy delle regole con l’elenco chiuso resta a Roberto (punto 14 di `docs/DA-FARE-ROBERTO.md`).
