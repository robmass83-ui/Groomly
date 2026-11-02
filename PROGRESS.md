# PROGRESS — dove eravamo rimasti (2 novembre 2026)

Per riprendere in una chat nuova: «Leggi PROGRESS.md e riprendi da “Prossimo passo”».

## Obiettivo generale

1. Audit QA completo dell'app (fatto) → report `docs/AUDIT-QA-2026-11-01.md` (2 critiche, 10 alte, 34 medie, ~65 basse).
2. Sistemare i problemi **uno alla volta**, ognuno con questo flusso deciso da Roberto:
   `/brainstorming` → specifica → piano (`writing-plans`) → esecuzione **con sotto-agenti** (`subagent-driven-development`: implementatore + revisione per task, revisione finale del ramo col modello più capace, un'unica ondata di correzioni) → verifica (`/qa-my-app:verify` nel browser + script che chiamano le funzioni compilate sull'emulatore) → solo dopo segnare «risolto» nell'audit → merge in `main` → deploy functions/regole/hosting → release APK (memoria `release-apk-automatica`; niente APK se cambiano solo server o pagina pubblica).
   - Un brainstorming per gruppo di **massimo 4 problemi**, uno alla volta.
   - Ordine dell'audit: ~~C1~~, ~~C2~~, ~~A5~~, ~~A6~~, ~~A1~~, ~~A2~~, ~~A3~~, ~~A4~~, ~~A9~~, ~~A7~~, ~~A8~~, A10, poi le medie per area.
3. **Mai toccare i dati veri di Laura** (salone in produzione): tutti i test girano sugli emulatori `demo-groomly`.

## Stato di `main`
- Ultima release: **1.1.172** (GitHub release + hosting `release.json` aggiornati). Tutti i rami qui sotto sono uniti in `main` e pushati.
- Rami di lavoro (già uniti, restano su GitHub): `fix/c2-chiusura-tiene-assegnatario`, `fix/a5-collaboratore-soldi-regole`, `fix/a1-lista-attesa-solo-col-piano`, `fix/a2-prova-solo-a-chi-non-ha-mai-avuto-plus`, `fix/a3-impegni-bloccano-promemoria-no`, `fix/a8-a9-elimina-account-titolare`.
- `PROGRESS.md` è versionato in `main`. Non versionati: `Icon and logo/…`, `scripts/test360/*`, `firebase-debug.log`, `groomly.apk`.

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

### A7 — risolto e verificato (ramo `fix/a7-invito-non-si-perde`; deploy e release: vedi «Prossimo passo»)
- Il link d'invito non si perde: il telefono lo ricorda 7 giorni (`groomly.invitoInSospeso`) e dopo «Entra» / «Crea account» + conferma email torna all'invito (`src/app/RimandoInvito.tsx`). Chi si registra da un invito non scrive nome salone/P.IVA (salone vuoto «Salone di <Nome>»).
- Decisioni di Roberto: chi ha un salone con dati può unirsi a un altro; avviso col nome del suo salone e scelta **pausa** (prenotazioni online + lista d'attesa spente, valori ricordati in `salons/<uid>/pro/main.pausa`, solo server) o **aperto**; «Torna al mio salone» in Impostazioni; al ritorno (anche revoca o eliminazione dell'account di chi invitava) la pausa si toglie; se l'operatore elimina il salone che invitava, chi ha un salone con dati torna al suo con la pausa ancora attiva + avviso «Il tuo salone è in pausa · Riprendi» in Home.
- Anche: dopo un cambio di salone il telefono ripulisce le copie locali del salone e ricarica l'app (`src/data/local/cambioSalone.ts`); eliminare l'account da membro cancella anche il suo salone personale e libera i suoi collaboratori.
- Spec/piano `…/2026-11-02-a7-invito-non-si-perde*`. Verifica: `QA-tests/.qa-catalog/verify-a7.cjs` (11/11, server) + `verify-a7-browser.cjs` (4/4, browser con le callable eseguite dalle funzioni compilate; screenshot in `QA-tests/results/a7/`).
- Deploy necessario (prima le functions, poi l'APK): acceptInvite, revokeMember, tornaAlMioSalone (nuova), riprendiSalone (nuova), eliminaAccount, eliminaSalone. Regole invariate.
- Restano, minori: foto scattate offline non ancora caricate si perdono se si cambia salone in quel momento; su un telefono con dati locali mai sincronizzati la pulizia al cambio salone non li tocca.

## Piccole decisioni ancora aperte (da proporre a Roberto)
- Impostazioni del collaboratore: la card «Il tuo piano» resta da sola su mezza riga (prima c'era accanto la scorciatoia Incassi) → allargarla?
- Lista d'attesa ferma (piano senza lista): il cliente non può togliersi dalla lista dal link dell'offerta (succedeva già prima) → permetterlo?
- Membro con app aperta quando il titolare elimina l'account: messaggio «piano spento» finché non esce (A8).

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

## Prossimo passo
1. Rifare l'ambiente (sopra) se serve.
2. **A7**: merge in `main`, deploy functions (elenco sopra), release APK — se non ancora fatti.
3. Proporre a Roberto le piccole decisioni aperte (sopra).
4. Poi **A10** («Dopo Esci i dati dei clienti restano nel browser») e le medie per area, sempre a gruppi di massimo 4.
5. In una sessione nuova (agenti qa caricabili): regressione `/qa-my-app:run-all` sulle rotte toccate da C1, C2, A5, A2, A3.
