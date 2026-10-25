# Test 360° iniziale — 25 ottobre 2026, sera

Fotografia dopo la fase 0, prima delle funzioni di prodotto ancora aperte (task 9–37). Non è il rapporto finale. Progetto degli script: `demo-groomly`. Nessuna lettura o scrittura su `groomly-3128b`.

## Come è stato eseguito

Firebase CLI 15 rifiuta Java 17. È stato scaricato un JDK 21 portatile in `%LOCALAPPDATA%\jdk21` (non entra nel repository) e gli emulatori sono partiti con quel `JAVA_HOME`:

`npx firebase emulators:start --only auth,firestore --config firebase.emu.json --project demo-groomly`

Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`. L’emulatore Functions non è partito: in `functions/` non c’è `node_modules` e questo giro non chiama callable. Gli emulatori sono stati spenti senza export. `test-results/`, gli screenshot e i `*-debug.log` sono stati cancellati.

Seed: 20 saloni più Laura finta e Roberto finto, 31 utenti Auth. Il primo lancio ha scritto i dati e si è fermato perché mancava la cartella `test-results/` prima di `seed-report.json`. Il rapporto è stato ricostruito dagli utenti dell’emulatore (il backup `users/{laura}/backups/2026-10-01` c’era). `seed.ts` ora crea la cartella di destinazione. Lo script si lancia con `vite-node`: `node --experimental-strip-types` non risolve gli import senza estensione.

`npm install --save-dev firebase-admin playwright` e `npx playwright install chromium`: servivano al seed e ai giri, non c’erano nel `package.json`.

## Regole

`npx vitest run --config vitest.rules.config.ts` con `FIRESTORE_EMULATOR_HOST`: **10/10**. Compreso il caso F5 (piano spento: il collaboratore legge `pro/main` e `members/{proprio}` e non l’elenco, e non legge i cani) e i salvataggi della 1.1.93 fatti dal titolare sul proprio `salons/{id}`:

- `users/{uid}/backups/{giorno}`
- `meta/restored-{uid}`
- `deletedDogs/{id}`
- cane, appuntamento, servizio, chiusura, `settings/main` (data dell’ultimo backup)
- foto `files/{id}` con `kind: 'foto'` e `owner: 'dog:…'`, più `full/data` e `chunks/0`

`vite-node scripts/test360/rules.ts`: **27/28**. L’unica riga diversa dall’atteso è «Collaboratore 13 cambia la persona di una visita completata»: la scrittura è stata permessa. Il cambio di importo sulla stessa visita è negato, come il test dell’emulatore sul campo `total`. La riga sull’assignee non dimostra una falla se il documento aveva già quell’uid: `diff` non segna un campo uguale e `completedFieldsHeld` resta vero. Da ripetere nel rapporto finale con un assignee diverso.

## Pagine (Playwright, Chromium, 390×844)

App su `npx vite --mode emu` (`VITE_EMULATORS=1`). Il primo giro del titolare è scaduto durante la ri-ottimizzazione di Vite dopo il cambio del lockfile. Il secondo giro, a server caldo, è completo.

| Giro | Esito |
|---|---|
| Titolare `salone1@test.groomly`, chiaro | 17 route aperte. Home con «DA CHIUDERE», animali 58 attivi, calendario, mensili, listino, incassi € 888 / report € 3438, servizi, archivio. `/impostazioni/utenti` torna a Impostazioni (non è operatore). |
| Stesso titolare, scuro | Home e route aperte. Primo dato visibile in 8,9 s. |
| Collaboratore `collab13@test.groomly` | Entra e percorre le route. |
| Socio `socio13@test.groomly` | Entra e percorre le route. |
| Operatore `masala.roberto@hotmail.it` | Entra nel salone di Laura finta. Funzioni Pro: piano attivo, 1 di 3 posti, Laura titolare e Roberto socio. Utenti: 33 account, 23 toelettature. |
| Offline (`fMore.cjs offline`) | A rete spenta la scheda «Offline Fufi3» si apre. Tornando online la scheda resta a schermo. |

In ogni giro compare `Failed to load resource: net::ERR_FAILED`: il kit blocca GitHub e `groomly-3128b.web.app`. Per questo Aggiornamenti dice «Lo storico non si carica». Non è una chiamata al progetto vero.

`tDataMs` resta −1 perché la Home contiene ancora il testo «Nessun appuntamento» (oggi vuoto) insieme a «DA CHIUDERE». L’euristica del kit pretende l’assenza di quella frase.

## Falle del 25/10 dopo la fase 0

| # | Stato in questo giro | Prova |
|---|---|---|
| F1 | Chiusa nelle regole di `main` | Un altro utente non legge `users/{uid}` di Laura. Già pubblicata la sera del 24/10, a parte l’elenco chiuso. |
| F2 | Chiusa nel codice del task 4; il giro offline crea la scheda | Non è stata rifatta la ricarica che nel rapporto del mattino perdeva il cane. |
| F3 | Chiusa | Scrittura di `crediti/main` negata. Servizio, meta, deletedDogs, settings permessi. |
| F4 | Chiusa sull’importo | `total` negato. Assignee: vedi sopra, 27/28. |
| F5 | Chiusa nel test delle regole | Piano spento, collaboratore senza elenco e senza cani. Il giro Playwright del collaboratore 14 con Pro spento non è stato rilanciato qui. |
| F6 | Chiusa per il ramo | Il lavoro è su `main`. I worktree si tolgono al task 37, solo se il commit è contenuto. |
| F7 | Aperta, di proposito | Il repository resta pubblico finché l’APK non ha un altro indirizzo. Voce in `docs/DA-FARE-ROBERTO.md`. |
| F8 | Non richiusa del tutto | La Home del titolare mostra dati, ma la frase «Nessun appuntamento» resta quando oggi è vuoto. Il primo paint è circa 4 s. |
| F9 | Chiusa per le regole | I test parlano con l’emulatore, non solo con il testo del file. |
| F10 | Parziale | La rete esterna nei test è bloccata (task R4). La suite intera non è stata rimisurata in questo giro. Registro Excel e Ripristina avevano un tetto di 15 s: ora il test Excel ha 60 s e Ripristina 45 s, con attese più lunghe dentro il test. |
| M1, M2, M4, M7, M8, M9, M10 | Segnate fatte nel registro di fase 0 | Non riaperte una per una in questo giro. |
| M3 | Aperta | Funzioni Pro del titolare senza piano dice ancora «Accendi il piano…» senza un’azione. È il task 9. |
| M5 | Aperta | Orari di apertura: task 17. |
| M6 | Aperta | Agenda settimana non è stata ridisegnata. |
| M11 | Segnata fatta | Lo spazio è `BOTTOM_NAV_CONTENT_PAD`. Non misurato di nuovo sugli screenshot, che sono stati cancellati. |
| M12 | Chiusa | `isOperator` chiede l’email verificata oppure il claim `admin`. Il test dell’emulatore nega l’account altrui se l’email non è verificata. |
| M13 | Aperta come callable | Il collaboratore può ancora cancellare il proprio `accounts/{uid}` (la prova regole lo consente). `revocaMembroAllUscita` c’è; la callable è il task 21. |

## Cosa non è stato provato

Push, Brevo, Drive, fotocamera, aggiornamento APK, emulatore Functions. Il deploy delle regole con l’elenco chiuso resta a Roberto: questo giro conferma solo l’emulatore.
