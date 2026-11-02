# PROGRESS — dove eravamo rimasti (2 novembre 2026, sera)

Per riprendere in una chat nuova: «Leggi PROGRESS.md e riprendi da “Prossimo passo”».

## Obiettivo generale

1. Audit QA completo dell'app (fatto) → report `docs/AUDIT-QA-2026-11-01.md` (2 critiche, 10 alte, 34 medie, ~65 basse).
2. Sistemare i problemi **uno alla volta**, ognuno con questo flusso deciso da Roberto:
   `/brainstorming` → specifica → piano (`writing-plans`) → esecuzione **con sotto-agenti** (`subagent-driven-development`: implementatore + revisione per task, revisione finale del ramo col modello più capace, un'unica ondata di correzioni) → verifica (`/qa-my-app:verify` nel browser + script che chiamano le funzioni compilate sull'emulatore) → solo dopo segnare «risolto» nell'audit → merge in `main` → deploy functions/regole/hosting → release APK (memoria `release-apk-automatica`; niente APK se cambiano solo server o pagina pubblica).
   - Un brainstorming per gruppo di **massimo 4 problemi**, uno alla volta.
   - Ordine dell'audit: ~~C1~~, ~~C2~~, ~~A5~~, ~~A6~~, ~~A1~~, ~~A2~~, ~~A3~~, ~~A4~~, ~~A9~~, ~~A7~~, ~~A8~~, ~~A10~~ (**critiche e alte tutte chiuse**), poi le medie per area: ~~Dati e caricamento (1-4)~~, **Prenotazioni online e piani (5-11)**, Team e ruoli, Agenda e incassi, Animali/mensili/listino, Account e profilo, Home e telefono.
3. **Mai toccare i dati veri di Laura** (salone in produzione): tutti i test girano sugli emulatori `demo-groomly`.

## Stato di `main`
- Ultima release: **1.1.176** (GitHub release + hosting `release.json` aggiornati). Tutti i rami qui sotto sono uniti in `main` e pushati.
- Rami di lavoro (già uniti, restano su GitHub): `fix/c2-chiusura-tiene-assegnatario`, `fix/a5-collaboratore-soldi-regole`, `fix/a1-lista-attesa-solo-col-piano`, `fix/a2-prova-solo-a-chi-non-ha-mai-avuto-plus`, `fix/a3-impegni-bloccano-promemoria-no`, `fix/a8-a9-elimina-account-titolare`, `fix/a7-invito-non-si-perde`, `fix/piccole-decisioni-dopo-a7`, `fix/a10-esci-pulisce-il-telefono`, `fix/medie-dati-e-caricamento`.
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

## Ambiente di test (va rifatto in una sessione nuova)
- Emulatori: `powershell Start-Process` staccato di `npx firebase emulators:start --only auth,firestore --config firebase.emu.json --project demo-groomly` con `JAVA_HOME` = jbr di Android Studio (memoria `emulatori-java-credenziale`). Le callable in emulatore danno INTERNAL: per verificare il server si chiamano le funzioni compilate (`cd functions && npx tsc`, poi `functions/lib/functions/src/piano/*.js`) con script come `QA-tests/.qa-catalog/verify-a1.cjs`, `verify-a2.cjs`, `verify-a3.cjs`, `verify-a8-a9.cjs`, `verify-a7.cjs`. Per provare le callable nel browser: `verify-a7-browser.cjs` intercetta le chiamate a :5001 e le esegue con `.run()`.
- App: `npx vite --mode emu --port 5173 --host 127.0.0.1` (staccato).
- Dati: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-groomly npx vite-node scripts/test360/seed-audit.ts`, poi `node test-results/audit/work/coord/fix-enabled.cjs`. Un nuovo seed rifà salone56 (eliminato nella verifica A8+A9) e crea staff52b come revocato.
- **Test delle regole Firestore**: NON usare `npm run test:rules` con l'emulatore QA acceso su 8080 (lo svuota); usare un emulatore usa e getta su 8180: `"/c/Program Files/Android/Android Studio/jbr/bin/java" -jar cloud-firestore-emulator-v1.19.8.jar --host=127.0.0.1 --port=8180 --project_id=demo-groomly --single_project_mode`, poi `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 npx vitest run --config vitest.rules.config.ts`.
- Test delle functions: dalla radice (`npx vitest run functions/src/...`); dentro `functions/` ci sono fallimenti non correlati legati alla cartella.
- Fallimento noto e non correlato in tutta la suite: `src/lib/driveInvio.test.ts`.
- **Attenzione:** l'emulatore Firestore scrive in `firebase-debug.log` ~12 MB/s e si blocca con più browser insieme → **un solo runner alla volta** e svuotare il log (`: > firebase-debug.log`). Account finti: `test-results/audit/accounts.md`, password `Test1234!`.
- qa-my-app: catalogo in `QA-tests/` (task fino a T309 per le verifiche fatte qui; T191–T213 sono del catalogo originale). Gli agenti `qa-page-analyzer`/`qa-test-runner` (`.claude/agents/`) si caricano solo in una sessione nuova: qui abbiamo usato agenti generici + Playwright con i brief `QA-tests/.qa-catalog/runner-brief-*.md`. Ruoli QA locali (in `auth.local.json` e `state/creds.json`, non versionati): titolare (plus36), titolare-go (go12), collaboratore (staff55a), titolare-salone (salone55), socio-salone (staff54a), titolare-grazia (plus41), titolare-omaggio (plus44), titolare-go-puro (go4), ex-collaboratore (staff56b).
- Stato emulatore dopo le verifiche: go1 «in prova», plus45 «in prova da operatore», salone56 eliminato, vari cani/visite «QA …» in salone55.

## Release e deploy (promemoria)
- Versione in `android/app/build.gradle` (versionCode/versionName), `package.json`, `src/lib/appVersion.ts`, `hosting/release.json`; `npm run build`, `npx cap sync android`, `gradlew assembleGithubRelease` col Java 17 di sistema; firma da verificare (SHA-256 96dafbcd…08c73); `cp` in `groomly.apk`; commit «Pubblica la x.y.z…», push, `gh release create`, poi `firebase deploy --only hosting` (+ functions con `FUNCTIONS_DISCOVERY_TIMEOUT=60`, + `firestore:rules` se cambiano). Progetto Firebase di default: `groomly-3128b`.

## Come abbiamo lavorato (trucchi utili)
- Sotto-agenti: per ogni piano `bash ~/.claude/skills/subagent-driven-development/scripts/sdd-workspace <piano>` crea `.superpowers/sdd/<piano>/` (registro `progress.md`, brief con `scripts/task-brief`, pacchetti di revisione con `scripts/review-package`); a fine lavoro la cartella si cancella. Le istruzioni del revisore si estraggono da `task-reviewer-prompt.md` con `awk '/^  prompt: \|/{f=1;next} /^```$/{if(f){exit}} f'` (attenzione: non mettere gli apici inversi con la barra davanti, altrimenti il file esce troncato).
- Verifiche nel browser: script Playwright in `QA-tests/.qa-catalog/verify-*.cjs` che creano l'account con firebase-admin, fanno l'accesso e controllano; per le callable si intercetta `:5001` e si esegue la funzione compilata con `.run()` (`verify-a7-browser.cjs`); per simulare la rete: `context.setOffline`, `ctx.route('http://127.0.0.1:8080/**', …)` per bloccare Firestore. Se si va offline, caricare prima i moduli che servono (Vite non li serve più).
- Le revisioni hanno trovato più volte problemi veri che i test non vedevano: conviene sempre una prova reale sull'emulatore prima di unire.
- Test lenti: `npx vitest run --config vitest.slow.config.ts src/pages/LoginPage.test.tsx` (LoginPage non gira con la configurazione normale).

## Prossimo passo
1. Rifare l'ambiente (sezione «Ambiente di test») se la sessione è nuova: emulatori auth+firestore e app Vite in modo emu.
2. **Medie «Prenotazioni online e piani»** (audit, sezione Medie, punti 5-11): sono 7, quindi **due gruppi** (massimo 4 per volta). Proposta di divisione da confermare con Roberto:
   - gruppo A — prenotazioni: 5 (piano scaduto → richieste in attesa spariscono e restano «nuova»), 6 (prenotazioni spente → le richieste già arrivate non si possono accettare né spostare), 7 (orari oltre la chiusura per servizi > 180 min), 9 (pagina pubblica creata anche per Go con l'email di login del titolare);
   - gruppo B — piani: 8 (nessun avviso per Plus in grazia o disdetto), 10 (alla scadenza del Salone nessuno ricalcola `enabled`: i collaboratori continuano a entrare), 11 (testi sbagliati in `/impostazioni/pro` e Team).
   Flusso come sempre: brainstorming (leggere prima il codice, una proposta per punto) → specifica breve → piano → sotto-agenti → verifica sull'emulatore → audit → merge → deploy (qui serviranno functions e forse regole) → APK se cambia l'app.
3. Poi le altre medie per area: Team e ruoli, Agenda e incassi, Animali/mensili/listino, Account e profilo, Home e telefono.
4. Da guardare a parte: gli 8 test che falliscono con `vitest.slow.config.ts` in `DogsPage.test.tsx` e `appointments.test.tsx` (falliscono anche senza le modifiche recenti).
5. In una sessione nuova (agenti qa caricabili): regressione `/qa-my-app:run-all` sulle rotte toccate da C1, C2, A5, A2, A3, A7 (invito, login, Home, Impostazioni), pagina pubblica dell'offerta d'attesa, A10 (Esci da Impostazioni, accesso), Home (attesa al caricamento).
6. Prova reale sul telefono consigliata: cambio di salone (A7 / membro tolto con l'app aperta) e «Esci» (A10) provati nel browser, non ancora nell'APK.
