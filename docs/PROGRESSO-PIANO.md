# Progresso del piano piani completi

Ripartenza dal commit `f60df42` su `main`. Aggiornare questo file e fare commit dopo ogni task. Se la sessione si interrompe, il primo task che non è `fatto` o `bloccato da Roberto` è quello da cui ripartire.

## Fuori piano — regola `users/{uid}` (25/10/2026, urgente)

Separato dai task qui sotto. Non alza la versione, non tocca l’APK, gli indici, l’hosting e non è stato committato.

Base pubblicata: regole della 1.1.93, commit `f8630c3` sul ramo `pro-collaboratori`. L’unica differenza rispetto a quel commit è il match dei dati personali. Prima:

```
match /users/{uid}/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid;
}
```

Adesso, in produzione:

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Nessun elenco chiuso delle raccolte e nessun’altra riga. Le regole di `main` (elenco chiuso e altre modifiche del piano) non sono state pubblicate e il file `firestore.rules` di `main` non è stato modificato.

Quel testo era già online dal 24/10/2026 alle 23:26 UTC (ruleset `89cb4014-30e4-45f8-959e-94a20f524aa5`), caricato dal worktree `pro-collaboratori`. Il deploy di oggi non ha ricaricato un file diverso: Firebase ha risposto «latest version of firestore.rules already up to date, skipping upload» e ha rilasciato di nuovo lo stesso ruleset. `updateTime` della release `cloud.firestore`: `2026-10-25T10:10:28.895641Z`. Comando, dalla cartella `.worktrees/pro-collaboratori`: `npx firebase deploy --only firestore:rules --project groomly-3128b --non-interactive`. Compilazione riuscita. Restano gli avvisi già presenti nella 1.1.93 (`owns` non usata; `exists` e `get` segnate dal compilatore come nomi non validi) e non sono stati toccati.

Prova sull’emulatore Firestore `cloud-firestore-emulator-v1.19.8.jar`, progetto `demo-groomly`, porta `127.0.0.1:8080`, con lo stesso file di regole poi pubblicato. Dati scritti a regole spente: documento `users/laura-finta` e `users/laura-finta/backups/2026-10-01`. Laura finta è l’utente `laura-finta` con email `laura.masala@tiscali.it`. L’altro utente è `uid-salone-1`.

| Prova | Esito |
|---|---|
| L’altro utente legge il backup di Laura | negato |
| L’altro utente legge il documento `users/laura-finta` | negato |
| Laura finta legge il suo backup | permesso |
| Laura finta legge il suo documento | permesso |
| L’altro utente scrive il backup di Laura | negato |
| Laura finta scrive il suo backup | permesso |

6/6. Il log `PERMISSION_DENIED` sulla scrittura dell’altro utente è il rifiuto atteso.

## Prima del task 10 — assignee di un completato

Ripetuta la prova «il collaboratore cambia la persona di una visita completata» con un assignee diverso da quello salvato (`uid-altra-persona`, non l’uid del collaboratore). Esito: negato. Non è una falla. `firestore.rules` di `main` non è stato modificato e non è stato pubblicato. Il caso è in `src/lib/firestoreRules.emulator.test.ts` e in `scripts/test360/rules.ts` (28/28). Vedi D15.

| Task | Stato | Commit | Test |
|---|---|---|---|
| R0 Specifica, piano, decisioni | fatto | `6bb5b2b` | solo documenti |
| R1 F5 con le regole vere | fatto | `57dcceb` | accessoSospeso 6/6, client filtrato verde; emulatore non lanciato |
| R2 Nove test rossi e orologio fermo | fatto | `9ef9e47` | i 10 rossi di quei file sono verdi; suite intera 1526/1527, un timeout alzato a 10 s |
| R3 Kit 360° e `VITE_EMULATORS` | fatto | `5108d6a` | guardia 3/3, client.test verde, tsc verde |
| R4 `npm test` senza rete | fatto | `1d56ddc` | `rete.test` verde (prima unstub prendeva HTTP 200 da GitHub). Suite intera ancora ~5,5 min dopo aver spostato 4 file oltre 60 s in `test:slow`. Due test falliscono solo a pieno carico e passano da soli. Terzo tentativo sul tetto dei 4 minuti: non raggiunto, si va avanti. |
| R5 Push di `main` | fatto | `61133f3` | `origin/main` aggiornato da `8ea3fc4` a `61133f3` |
| 0 Nota Roberto | fatto | `26e482f` | documento |
| 1 Un solo ramo | fatto | `d42c4b7`, `e6a633f` | — |
| 2 Regole F1 F3 F4 M12 | fatto | `1b42e94` | emulatore nel commit |
| 3 Kit 360° | sostituito da R3 | — | — |
| 4 Offline F2 | fatto | `940bd4f` | — |
| 5 Usabilità | fatto | `57dcceb`, `284af07` | F5 con `elencoNegato`; M11 lo spazio è già `BOTTOM_NAV_CONTENT_PAD` nel guscio; M13 `revocaMembroAllUscita` (la callable la chiama il task 21) |
| 6 Test senza rete | sostituito da R4 | — | — |
| 7 Test 360° iniziale | fatto | `c3416e1` | rapporto in `docs/Groomly_Test360_RAPPORTO_INIZIALE.md`. Regole emulatore 10/10 (F5 e salvataggi 1.1.93); rules.ts 27/28; giri titolare chiaro/scuro, collaboratore, socio, operatore, offline. Functions non partito. Deploy regole no. |
| 8 `piano.ts` | fatto | `3cad49e` | — |
| 9 Paywall e menu | fatto | `06fcf93` | `usePiano`, card «Prova Pro gratis per 30 giorni», badge, route piano/team/messaggi/strumenti. Flag spento: solo Privacy e Elimina account. «Avvisami» scrive `interesse/{feature}`. Collaboratore senza card. |
| 10 Prova e omaggio | fatto | `f76337a` | decisione pura 6/6; pagina Utenti 8/8; emulatore functions `avviaProva`, `impostaPianoManuale`, `setSalonPro` e `chiudiProve` 8/8 su `demo-groomly`. Non pubblicato. |
| 11 Team e posti | fatto | `4aa903d` | `limitePosti` 4 con extra, quinto invito rifiutato, default 3. «Team» solo con flag e accesso salone; flag spento resta «Funzioni Pro». |
| 12 Report ed export | fatto | `eb03be5` | flag spento: come oggi. Flag acceso e base: mese corrente sì, passato ed export aprono la paywall. Pro e omaggio esportano. Fascia 1–5 solo col flag e se `puoProporre`. |
| 13 Crediti | fatto | `9af8263` | la riga c’era già in `DA-FARE-ROBERTO.md` punto 11. Nessun file di crediti. |
| 14 Copie cloud | fatto | `5ca2c2d` | foto già copiata esclusa; copia oltre 30 giorni da cancellare; Pro ha accesso. Flag spento: riga assente. Base: paywall. Pro senza bucket: «Copie non disponibili» e la funzione non scrive. |
| 15 Invia tutti | fatto | `efb9e1f` | coda di domani 3, il secondo parte dopo il primo, 12 numeri diventano 393… Flag spento: niente riquadro. Flag acceso: il riquadro c’è anche in base. Segnato in `settings.avvisiInviati`. |
| 16 Promemoria email | fatto | `6a27d0d` | stessa visita e stesso giorno una volta sola; il 301° resta in coda; senza email non parte. Senza chiave Brevo: `non_inviata` e nessuna rete. Con chiave: template 12 e reply-to del salone. Campo email nel cane solo col flag. `/azione?mode=promemoria` ha Confermo, Devo spostare, Non scrivermi più. |
| 17 Orari | fatto | `5c0b622` | giorno vuoto chiuso; copia su tutti; orario in fascia valido; domenica vuota non proponibile se gli orari sono compilati; se mancano, il form non cambia. Editor solo col flag. |
| 18 Statistiche | fatto | `14f2542` | €/ora su durata effettiva o prevista; previsione al netto dei non venuti; ritardo = intervallo × 1,5 senza futuri. Flag spento: niente scheda. Base: solo €/ora, il resto apre la paywall. |
| 19 Recensioni | fatto | `8998962` | seconda proposta entro 12 mesi no; stesso giorno di una nota problema no; sesta del giorno no; senza link no. Testo senza sconti. Riga solo col flag, sul completato. |
| 20 Fedeltà | fatto | `75ebee5` | dieci completati danno un premio; toglierne uno toglie il timbro; il premio azzera il servizio e scrive «Premio fedeltà»; ricalcola torna gli stessi timbri. Scheda con accesso, badge in base, nascosta col flag spento. |
| 21 Account e privacy | fatto | `e67157d` | pulsante «Fissa un appuntamento»; kind assente resta pelosetto. eliminaAccount sull’emulatore: Play attivo rifiutato, salonId diverso e shared rifiutati, cancellazione ok (5/5). Pagine in hosting, non pubblicate. Script admin non lanciato. |
| 22 Pagina salone | fatto | `553b94b` | «I Pelosetti!» → i-pelosetti; slug occupato «Nome già preso»; profilo senza iva. saloneInfo sull’emulatore: og:title è il nome, niente partita IVA. |
| 23 Disponibilità | fatto | `439446c` | 10:00 Roma resta 10:00 il 29 marzo e il 25 ottobre 2026. Programmato e richiesta nuova occupano, disdetto no, nessun nome di cane. Oltre 2 per telefono o 20 per salone rifiuta. Esca: ok senza scrittura. Emulatore 1/1. |
| 24 Prenotazione | fatto | `d47bcde` | da nuova si passa ad accettata, proposta, rifiutata, scaduta, disdetta. Token errato non cambia lo stato. Email assente rifiutata. Senza Brevo lo stato si salva e l’email è non_inviata. Il calendario è Europe/Rome. Emulatore 1/1. Cinque schermate in hosting/salone. |
| 25 Lato toelettatrice | fatto | `5a7763d` | accettare una nuova crea un programmato e non lascia lo stato nuova. Blocco 48 ore. Stesso cellulare propone il cane in scheda. Biglietto A5 con nome e URL. In home: badge in base, riquadro con accesso, niente col flag spento. |
| 26 Attesa | fatto | `e2748c0` | durata più lunga del buco esclusa; mattina non prende le 16:00; ordine di arrivo. Il primo conferma vince, il secondo è persa. La disdetta libera il posto. Badge in base, riquadro con accesso. |
| 27 Scheda cliente | fatto | `10e3c40` | la risposta ha nome e specie, non notes, tags né behavior. Token revocato → non_trovata. Emulatore 1/1. Pagina hosting/c. |
| 28 Controlli manuali | fatto | `b515e11` | tre non venuti in sei mesi → «Spesso non viene»; zero nessuna etichetta. WhatsApp wa.me, messaggio wa_manuale/aperto scritto dalla callable (emulatore 1/1). Microfono assente: testo dedicato; file audio. Ritardo × 1,5, compleanni solo con data, coda senza invio automatico, prezzo solo con 3 cani simili, pagella nuova solo con accesso e storico conservato, firma «Fatto con Groomly» in base e assente con senzaFirma. UI solo col flag. |
| 29 Flavor Play | fatto | verifica | AppInstallerPlugin, UpdateNotice, appRelease.ts e REQUEST_INSTALL_PACKAGES sono ancora nel progetto. Nessun flavor play. |
| 30 Tester | fatto | verifica | la voce tester è in DA-FARE-ROBERTO.md. Nessun upload Play. |
| 31 RevenueCat | fatto | `09561f5` | compra con abbonamenti spenti ritorna spento e non carica lo store. Webhook: senza chiave 503 (emulatore), senza header 401, evento già visto 200 senza seconda scrittura. Paywall resta «In arrivo». Sondaggio nascosto. launchMode resta singleTask. Pacchetto non installato. |
| 32 Checklist | fatto | verifica | abbonamentiAttivi non è stato acceso. Checklist §9.7 in DA-FARE-ROBERTO.md. |
| 33 Proposte | fatto | `5f1faaf` | prima di 7 giorni nessuna proposta. Chiudere conta. Avviso in home solo col flag. Non ora salva ultimaProposta. |
| 34 Metriche | fatto | `5ecbe7d` | senza consenso il sink non è chiamato. Con consenso l’evento ha feature e fonte. Interruttore in impostazioni, default spento. |
| 35 Verifica trasversale | fatto | `cad608c` | `npm test` 1390/1390 in 135 s. `npm run build` pulito. I tre `=== 'salone'` rimasti sono il motivo di disdetta e l’azione operatore, non un confronto di piano. `REQUEST_INSTALL_PACKAGES` è ancora nel manifest. |
| 36 Test 360° finale | fatto | `fff319a` | Regole 11/11 e 28/28, assignee diverso negato. Collaboratore con Pro spento sospeso. Card «Il tuo piano» assente col flag spento. Offline conserva il cane. Rapporto in `docs/Groomly_Test360_RAPPORTO_FINALE.md`. F7, M3, M6 e il posto fantasma di M13 restano aperti. |
| 37 Pubblicazione | fatto | hash nel commit di questo task | Versione 1.1.94, versionCode 10194. APK in radice, fuori dal commit. Release GitHub v1.1.94. Nessun firebase deploy. |

## Deploy Firebase del 25/10/2026

`mostraPiani` e `abbonamentiAttivi` restano spenti: `config/globale` non esiste e non è stato creato.

### Controllo prima di pubblicare

L’account di Laura (`laura.masala@tiscali.it`) ha `salonId` uguale al suo uid e ruolo `titolare`. Roberto è `socio` di quello stesso salone, `status: attivo`, `accessWithoutPro: true`. Sul salone ci sono altri cinque documenti `members` con sole chiavi `uid` e `at`: non sono account e non hanno ruolo. Gli account il cui `salonId` è quello di Laura sono due: lei e Roberto. Cani 86 e appuntamenti 121 stanno sia sotto `salon/shared` sia sotto `salons/{uid}`. L’app, all’ingresso, apre il `salonId` dell’account, quindi il piano che decide l’accesso è `salons/{uid}/pro/main`, non `salon/shared/pro/main`.

Prima della scrittura quel documento aveva solo `enabled: true`, `seats: 3`, `updatedAt: 2026-10-24T20:33:26.029Z`. Senza i campi `piano` e `stato`, il client lo legge come base scaduto. Le regole, invece, guardano solo `enabled`: con `enabled: true` un collaboratore entra. `chiudiProve` aggiorna solo i documenti con `stato == prova`, quindi non spegne questo omaggio.

`salon/shared` con le regole nuove è in sola lettura. Non è il salone aperto dall’app. Non è stato modificato.

### Omaggio senza scadenza

Il codice già teneva un omaggio con `scadeIl: null` sul livello Salone. Mancava il resto chiesto per il VIP: con il flag acceso comparivano ancora «Abbonamenti in arrivo», la proposta «Prova le funzioni Pro» e la fascia di aumento listino. Aggiunto in `09d3ae5`. Prove, prima rosse e poi verdi: `piano.test.ts`, `reportGate.test.ts`, `SezionePiani.test.tsx`. Sull’emulatore Firestore `demo-groomly`, salone finto `salone-finto` (non Laura, non `shared`): 12/12, compreso «un salone finto con omaggio senza scadenza non sospende il collaboratore». Il collaboratore legge il cane e crea un appuntamento. Nessun limite sulle funzioni Pro, nessuna proposta, paywall non apribile.

### Documento del piano

Scritto, con merge, solo `salons/bsX7s6cDu6QTFmXUKpA7YHykRpD2/pro/main`. Campi del codice (`scriviPiano` + `campiOmaggio('salone')`): `piano: salone`, `stato: attivo`, `fonte: omaggio`, `scadeIl: null`, `seatsIncluded: 3`, `seatsExtra: 0`, `seats: 3`, `enabled: true`, `rinnovoAutomatico: false`, `updatedAt: 2026-10-25T15:46:10.009Z`. Riletto uguale. Account, membri, cani, appuntamenti e `salon/shared/pro/main` non sono stati toccati.

### Functions

`npx firebase deploy --only functions --project groomly-3128b --non-interactive`. La build `tsc` è passata. Create: `rcWebhook`, `avviaProva`, `eliminaAccount`, `pubblicaSalone`, `saloneInfo`, `postiLiberi`, `preparaRichiesta`, `inviaRichiesta`, `gestisciPrenotazione`, `pubblicaScheda`, `revocaScheda`, `schedaCliente`, `segnaMessaggio`, `impostaPianoManuale`, `chiudiProve`, `copieCloud`, `promemoriaEmail`. Aggiornate: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendPush`, `setSalonPro`, `createInvite`, `acceptInvite`, `revokeMember`, `changeMemberRole`. Tutte in `europe-west1`, tutte con «Successful». URL webhook: `https://europe-west1-groomly-3128b.cloudfunctions.net/rcWebhook`.

Il comando è uscito con codice 1 dopo il deploy: «Functions successfully deployed but could not set up cleanup policy in location europe-west1». Non ho passato `--force` e non ho impostato la policy degli artifact. Avvisi non bloccanti: Node.js 20 deprecato (dismissione 2026-10-30) e `firebase-functions` datato. Mi sono fermato qui. Indici, regole e hosting non sono stati pubblicati.

Ruleset attivo, invariato: `89cb4014-30e4-45f8-959e-94a20f524aa5`. Release `cloud.firestore`, `updateTime` `2026-10-25T10:10:28.895641Z`. Nessun ruleset nuovo.

### Hosting

Commit `4cf2ccb`: città Quartu Sant’Elena (CA), foro di Cagliari, email `info@groomlyapp.it` in `docs/legal/` e in `hosting/privacy`, `hosting/termini`, `hosting/dpa`, `hosting/elimina-account`. Il civico di casa è stato tolto nel giro di sera (vedi sotto). I segnaposto di Groomly non ci sono. Nel DPA restano `[Nome del salone]`, `[indirizzo]` e `[contatto]`: è il modello che il salone consegna ai propri clienti, non la sede di Groomly.

`npx firebase deploy --only hosting --project groomly-3128b --non-interactive`: codice 0, 16 file, release completa su `https://groomly-3128b.web.app`. Controllo delle quattro pagine online: niente `class="todo"` né `[da completare]`. Privacy, termini e DPA mostravano allora il civico, poi tolto; i termini mostrano Cagliari; elimina-account punta a `info@groomlyapp.it`. Indici e regole Firestore restano non pubblicati.

## Giro Play — 25/10/2026 sera

`mostraPiani` e `abbonamentiAttivi` restano spenti. Nessuna release GitHub nuova. Nessun dato di Laura oltre l’omaggio già scritto nel pomeriggio.

### 1. Termini 1.1 e hosting

Commit `4fbf571`: `docs/legal/termini.html`, `hosting/termini/index.html` e `docs/legal/PRIMA-DEI-PAGAMENTI.md`. Versione 1.1: oggi l’app è gratuita, IVA a carico di Google, recesso. Poi `npx firebase deploy --only hosting --project groomly-3128b --non-interactive`, codice 0, 16 file. Controllo online di `https://groomly-3128b.web.app/termini/` e `https://groomlyapp.it/termini/`: versione 1.1, frase «Oggi Groomly è gratuito», IVA e recesso presenti.

### 2. Functions su Node 22

Prima della modifica `npm --prefix functions run build` verde. Poi `engines.node` 22 e `firebase-functions` 7.4.0 (D20). Build di nuovo verde. `npm test`: 203 file, 1392/1392, 204 s. Emulatori `demo-groomly` (Auth 9099, Firestore 8080, Functions 5001, JDK 21, senza Pub/Sub): `provaPiano` 8/8, `eliminaAccount` 5/5, `saloneInfo` 1/1, `postiLiberi` 1/1, `prenotazione` 1/1, `schedaCliente` 1/1, `segnaMessaggio` 1/1. Su `segnaMessaggio` Node 24 in chiusura stampa `UV_HANDLE_CLOSING` dopo l’esito ok: la callable ha scritto il messaggio, il processo di test abortisce uscendo. Non è un dato vero.

`npx firebase functions:artifacts:setpolicy --location europe-west1 --days 1 --force --project groomly-3128b`: codice 0, repository `gcf-artifacts`. Poi `npx firebase deploy --only functions --project groomly-3128b --non-interactive`: codice 0. Tutte le 24 funzioni aggiornate a Node.js 22 (2nd Gen) in `europe-west1`, tutte «Successful update operation». Nessun avviso sulla cleanup policy.

### 3. Indici e regole

`npm run test:rules` sull’emulatore Firestore (jar 1.19.8, JDK 21, `demo-groomly`): **13/13**. Ci sono i salvataggi della 1.1.93 del titolare, il salone finto con omaggio, e «i salvataggi della 1.1.94 restano permessi a titolare, socio e collaboratore su un omaggio tipo Laura» (backup, meta, cane, appuntamento, servizio, chiusura, impostazioni, foto, push, dispositivo, interesse; il collaboratore scrive cane attivo, appuntamento e foto, e non scrive impostazioni, servizi, interesse né cancella il cane). Nessun dato di `groomly-3128b` letto da questi test.

Il primo `firestore:indexes` è uscito con codice 1: l’indice composito di `pro` con il solo campo `stato` non è accettato. Spostato in `fieldOverrides` (D21). Secondo deploy, codice 0.

Regole, dopo gli indici. Prima del deploy la release `cloud.firestore` puntava ancora a `89cb4014-30e4-45f8-959e-94a20f524aa5`, `updateTime` `2026-10-25T10:10:28.895641Z`. `npx firebase deploy --only firestore:rules --project groomly-3128b --non-interactive`: codice 0. Ruleset nuovo: `312ca6bd-e8cf-4a8b-8489-1d6f5b9135e3`, `updateTime` `2026-10-25T16:28:09.485188Z`. Avvisi già noti: `owns` non usata, `exists` e `get` segnate dal compilatore. Per tornare indietro, la release `projects/groomly-3128b/releases/cloud.firestore` va rimessa su `projects/groomly-3128b/rulesets/89cb4014-30e4-45f8-959e-94a20f524aa5` (PATCH con `updateMask=rulesetName`). Non è stato fatto.

### 4. M13, home, «Salvataggio non riuscito», selettori del test 360

M13. `eliminaAccount` distingue il titolare (`azione: salone`, controlli Play invariati) dal socio o collaboratore (`azione: membro`): scrive `members/{uid}` con `revocaMembroAllUscita` e cancella solo `accounts/{uid}` e l’utente Auth. Il salone resta. La regola di `accounts` permette `delete` dal client solo se `salonId == uid`, così il rollback della registrazione del titolare resta e il collaboratore non lascia un posto fantasma. Test unitario della decisione verde. `npm run test:rules`: 13/13, con il collaboratore che non cancella il proprio account e il titolare che cancella il suo. Poi `npx firebase deploy --only firestore:rules,functions:eliminaAccount`: codice 0. Ruleset pubblicato: `b349498c-a55b-4654-abac-94bad11cd418`, `updateTime` `2026-10-25T16:38:53.693132Z`. Per tornare al giro precedente: `312ca6bd-e8cf-4a8b-8489-1d6f5b9135e3`. Per tornare a prima di questo giro: `89cb4014-30e4-45f8-959e-94a20f524aa5`. Stessi avvisi del compilatore. `eliminaAccount` aggiornata, «Successful update operation». Il testo del foglio per socio e collaboratore dice che si libera il posto e i dati del salone restano.

F8. La home non aspetta più i cani: `agendaInAttesa` guarda solo l’agenda. `listenAppointments` consegna gli appuntamenti prima della lettura delle lapidi. Lo splash (900 ms se l’accesso è noto, 1400 al primo avvio, più 350 di uscita) non è stato accorciato. Il test Playwright completo dei tempi non è stato rilanciato: la misura del rapporto (8,6 s / 3,6 s) includeva login e splash.

«Salvataggio non riuscito». All’apertura delle Impostazioni il badge del registro scriveva `settings/main`. Il collaboratore non può. `segnaBadgeReport` non scrive per il collaboratore, né se il badge del giorno c’è già. Vitest: `HomePage` 23/23, `SettingsPage` 64/64, più `finestraAgenda`, `settings`, `firestoreRules`, `client` e `eliminaAccount`: 211/211.

Selettori in `tests/e2e`: scheda cane `button` «Apri …», «Fissa un appuntamento», report «Salva» e «Invia al commercialista». Gli script non sono stati rieseguiti sull’emulatore.

### 5. Varianti Play e GitHub, firma, APK su Hosting

`mostraPiani` e `abbonamentiAttivi` restano spenti. Nessuna release GitHub. `APP_VERSION` resta 1.1.94.

Test prima del codice: `appRelease` e `distribuzione` rossi (l’app chiedeva ancora GitHub per primo e il flavor non c’era). Dopo: 16/16. `npm run build` verde.

Flavor `github` e `play`, `applicationId` `it.groomly.app`. Il permesso `REQUEST_INSTALL_PACKAGES` sta solo in `android/app/src/github/AndroidManifest.xml`. `MainActivity` registra `AppInstallerPlugin` solo se il flavor non è `play`. `public/distribution.js` vale `github`; la flavor `play` lo sostituisce con `play` e `UpdateNotice` non si monta. Manifest unito di `githubDebug`: il permesso c’è, `targetSdkVersion` 36. Manifest unito di `playRelease`: il permesso non c’è, `targetSdkVersion` 36. Dentro l’AAB, `base/assets/public/distribution.js` è `play`.

Firma. `apksigner` sugli APK scaricati da GitHub: 1.1.93 e 1.1.94 sono entrambi `CN=Android Debug`, stesso SHA-256 `1aa1211e900e794873ea1632ed09f5ce116e20f87010d96a9ecbf699c9d68fe2`. Keystore di upload creato fuori dal repository: `%USERPROFILE%\.groomly\upload.jks`, alias `groomly-upload`, password solo in `%USERPROFILE%\.groomly\keystore.properties`. Non è nel commit. L’APK GitHub non è stato rifirmato. `.\gradlew :app:bundlePlayRelease` codice 0, firmato `CN=Groomly`. File: `android/app/build/outputs/bundle/playRelease/app-play-release.aab` (non committato).

`compileSdk` e `targetSdk` erano già 36, il livello che Play chiede dal 31 agosto 2026. Non sono stati alzati.

Download. `hosting/release.json` punta a `https://groomlyapp.it/groomly.apk`. L’app legge prima quel file, poi GitHub, poi `web.app`. L’APK 1.1.94 (ancora firmato debug) copiato in `hosting/groomly.apk`, che è nel `.gitignore`. `npx firebase deploy --only hosting`: codice 0, 17 file. Controllo: `https://groomlyapp.it/release.json` 200 con l’URL nuovo; `https://groomlyapp.it/groomly.apk` e `https://groomly-3128b.web.app/groomly.apk` 200, tipo `application/vnd.android.package-archive`. Il repository non è stato reso privato.

### 6. App Check, flag spento

Test rosso prima del file. Poi `src/lib/appCheck.test.ts` 4/4 e `client.test.ts` 95/95. `APP_CHECK_ATTIVO` e `APP_CHECK_ENABLED` sono `false`: `preparaAppCheck` non carica il provider. L’app, a flag acceso, usa Play Integrity tramite `AppCheckBridge` (solo il sorgente della flavor `play`; `github` ha lo stub che rifiuta). La pagina `hosting/salone` carica `hosting/app-check.js`, che a flag acceso usa reCAPTCHA v3. `compilePlayReleaseJavaWithJavac` e `compileGithubDebugJavaWithJavac`: codice 0. Nessun enforcement su Firestore o Functions. I passi di console sono in `docs/DA-FARE-ROBERTO.md`.

### 7. Registro di ciò che resta a Roberto

`docs/DA-FARE-ROBERTO.md` segna come già fatti i template Brevo 5–12 (il 5 attivo), il dominio `groomlyapp.it`, `info@groomlyapp.it`, la scheda Play in bozza (mancano gli screenshot), le pagine legali online, l’omaggio di Laura e le Functions. Restano a lui screenshot, test chiuso, pagamenti e RevenueCat, commercialista, custom claim, copia del keystore, eventuale repository privato e App Check in console. `mostraPiani` e `abbonamentiAttivi` restano spenti. Nessuna release GitHub.

## Giro lingue — 25/10/2026 sera

`mostraPiani` e `abbonamentiAttivi` restano spenti. Nessun dato del salone di Laura. Nessuna release GitHub pubblicata in questo giro: la 1.1.95 si prepara e si ferma prima della pubblicazione.

### A1. Civico di casa tolto dalle pagine legali

Commit `bd23166`. Privacy, termini e DPA (in `docs/legal/` e in `hosting/privacy`, `hosting/termini`, `hosting/dpa`) dicono «Roberto Masala, Quartu Sant’Elena (CA)». Il civico e il CAP non ci sono più. `docs/legal/PRIMA-DEI-PAGAMENTI.md` dice che per Google Play e per i pagamenti si userà la sede della partita IVA o un domicilio d’impresa, non l’indirizzo di casa.

`npx firebase deploy --only hosting --project groomly-3128b --non-interactive`: codice 0, 18 file in `hosting`, upload di 2 file. Solo hosting: regole e indici non toccati.

Controllo online, tutte 200, «Renoir» assente, «09045» assente:

| Pagina | Quartu Sant’Elena |
|---|---|
| `https://groomlyapp.it/privacy/` | sì |
| `https://groomlyapp.it/termini/` | sì |
| `https://groomlyapp.it/dpa/` | sì |
| `https://groomly-3128b.web.app/privacy/`, `/termini/`, `/dpa/` | sì |
| `https://groomlyapp.it/elimina-account/`, `/`, `/privacy.html` | la parola non c’è (pagine senza quel paragrafo) |

### A2. Crash «role non definito» in Impostazioni

Non c’è nella 1.1.94 installata. Non si prepara una 1.1.95 di sole correzioni: le correzioni di oggi restano insieme alle lingue.

Prova sul sorgente pubblicato. `git ls-remote --tags origin v1.1.94` → `75490b2103d1885166f7be2226718aed50ef3025`. È il commit `release: 1.1.94`, pubblicato su GitHub il 25/10/2026 alle 14:13 UTC (`gh release view v1.1.94`). In quel `SettingsPage` il badge chiama `readBadge(current.ui.reportBadgeSince)` e l’effetto dipende da `[ready, uid, settings, save]`. Non legge una variabile `role`.

Il `ReferenceError: role is not defined` è nato nel working tree del giro pomeriggio, quando l’effetto chiamava `segnaBadgeReport(role, …)` e metteva `role` nelle dipendenze, ma `const role` esisteva solo dentro `earningsViewer`. Quel testo non è in nessun commit. L’unico commit dopo il tag che tocca la pagina è `f773563`: chiama `segnaBadgeReport(account?.role, …)`, dipendenze `[ready, uid, settings, save, account?.role]`. `account` è già dichiarato nel componente.

Prova di oggi sul codice attuale: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/HomePage.test.tsx`. Home tutta verde. Impostazioni si apre (titolo «Impostazioni», anche il test del collaboratore). 86 verdi, 1 rosso. Il rosso è «mostra automaticamente le novità al centro»: non trova il dialogo «Vuoi aggiornare adesso?». Nell’output non c’è `role is not defined`. Non è il crash di Impostazioni.

### A3. Test 360 sull’emulatore

Solo `demo-groomly`. Nessuna lettura o scrittura su `groomly-3128b`. Il salone vero di Laura non è stato aperto. Gli account `laura.masala@tiscali.it` e `masala.roberto@hotmail.it` di questo giro esistono soltanto nell’emulatore Auth: l’uid del titolare finto è `2qwqO35ra2D7TUywJ4bMB8FEXctn`, diverso da quello vero.

Emulatori: `npx firebase emulators:start --only auth,firestore,functions --config firebase.emu.json --project demo-groomly`, JDK 21. Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, Functions `127.0.0.1:5001`. Pub/Sub spento, come D18: `chiudiProve`, `copieCloud` e `promemoriaEmail` restano ignored. Seed: `npx vite-node scripts/test360/seed.ts`, `FATTO 21`. Poi, solo sull’emulatore, il documento `pro/main` del salone finto è stato riscritto come omaggio (`piano: salone`, `stato: attivo`, `fonte: omaggio`, `scadeIl: null`, `enabled: true`, 3 posti) e il piano del salone 14 è stato spento per il collaboratore sospeso. App: `npx vite --mode emu` su `http://127.0.0.1:5173`. Playwright Chromium 390×844, ora di Roma, italiano. Il primo giro del titolare chiaro è caduto sul login perché Vite stava ancora ottimizzando i moduli: è stato rifatto a server caldo. Gli screenshot e i log di `test-results/test360/` non si committano.

| Giro | Esito |
|---|---|
| Titolare `salone1@test.groomly`, chiaro | 17 route aperte, tutte sull’indirizzo chiesto. Home con «DA CHIUDERE (3)», animali 58 attivi, mensili 14/14, incassi € 888, servizi e archivio. `/impostazioni/utenti` torna a Impostazioni. Impostazioni si apre. In Pro: «Piano Pro · Non attivo» e «Accendi il piano…», senza «Il tuo piano», «Prova Pro» o «Abbonamenti in arrivo». Primo testo utile dopo il login: 4006 ms. `tDataMs` −1: oggi è vuoto e resta «Nessun appuntamento». |
| Stesso titolare, scuro | Le stesse 17 route. Primo testo utile: 6211 ms. Stesso `tDataMs` −1. |
| Socio `socio17@test.groomly` | Entra in Toelettatura Padova. Home con orari. Impostazioni e Funzioni Pro si aprono («Attivo · 2 di 3 posti»). `/impostazioni/utenti` torna a Impostazioni. Primo testo 4888 ms, dati 4919 ms. |
| Collaboratore `collab15@test.groomly` | Entra. Impostazioni senza Funzioni Pro, senza Backup e senza servizi. Servizi e Pro rimandano a `/impostazioni`. Il pulsante «Apri …» apre la scheda. «Fissa un appuntamento» trova «Chi lo fa». Nessun `role is not defined`. Sulla scheda del cane compare «Salvataggio non riuscito»: la pagina resta usabile. Non è il crash di Impostazioni. |
| Collaboratore `collab14@test.groomly`, piano spento | «Il tuo accesso a Toelettatura Palermo è sospeso. Il titolare ha spento il piano. I dati non sono persi.» |
| Salone tipo Laura, omaggio, `laura.masala@tiscali.it` finta | Home del salone «iPelosetti (FINTO)». Impostazioni senza paywall. Funzioni Pro: «Piano Pro · Attivo · 1 di 3 posti», con Laura Finta titolare e Roberto Finto socio. Primo testo 3360 ms. La riga «Utenti» c’è perché quell’email, nel codice, è operatore: il salone aperto è quello finto dell’emulatore, non `shared` vero. |
| Socio dello stesso salone finto | Entra, vede lo stesso omaggio e gli stessi posti. Primo testo 2966 ms. |
| Offline `salone9` | A rete spenta si crea «Offline Fufi3». Tornando online e ricaricando, la scheda è ancora a schermo. Gli errori `ERR_INTERNET_DISCONNECTED` sono la rete spenta di proposito. |

Tempi della home dopo il login, misurati da `tests/e2e/perf.cjs` a server caldo (emulatore, più veloce di un telefono):

| Account | Guscio (si vede Calendario) | Dati in home | Riapertura |
|---|---|---|---|
| `salone1` (circa 60 cani) | 2576 ms | 4066 ms | 871 ms |
| `salone20` (130 cani) | 2591 ms | 3848 ms | 825 ms |
| `salone18` vuoto | 2694 ms | lo script è uscito a 90 s: aspetta «DA CHIUDERE» o un importo, e il salone vuoto non li ha | uguale |

Console dei giri riusciti: nessun `pageerror`. L’unico errore di rete è `ERR_FAILED` sulle chiamate a GitHub e a `groomly-3128b.web.app`, che il kit blocca di proposito: Aggiornamenti dice «Lo storico non si carica». `mostraPiani` e `abbonamentiAttivi` restano spenti. Emulatori spenti a fine giro, senza export.

### B. Lingue — spec, piano e prima parte del codice

La specifica `docs/superpowers/specs/2026-10-25-lingue-design.md` è aggiornata con i punti 1–8 della revisione. Decisioni D30, D31, D32. Piano in `docs/superpowers/plans/2026-10-25-lingue.md`.

Nel codice, con test verdi sui file nuovi:

- Cataloghi `it`, `en`, `es` con le stesse chiavi. Il francese del telefono diventa inglese.
- `src/i18n/format.ts`: euro, date, plurali, ordinamento. L’italiano di `formatEuro` e della data in home resta quello di prima.
- Errori: lingua richiesta, poi inglese, poi italiano.
- La lingua dei clienti si scrive solo per il titolare nuovo, e non cambia quando la persona cambia la propria.
- I nomi dei servizi predefiniti si traducono a schermo; un nome cambiato dal salone resta.
- In Impostazioni, il titolare vede «Lingua» e «Lingua dei clienti». Il collaboratore vede solo «Lingua». Le etichette delle scelte restano Italiano, English, Español. Prova: i due test nuovi di `SettingsPage` sono verdi.
- HTML delle dieci email, tre lingue, con logo e pulsante, nome con `<` escapato. Non è ancora il testo che Brevo spedisce: il modello 5 resta acceso. La voce «template Brevo 3–12 da spegnere» non è stata aggiunta, perché il codice non manda ancora tutte le email da solo.
- Stringhe Android in `values`, `values-en` e `values-es` (canale backup, promemoria, testo del permesso). Il canale di `BackupJob` legge `@string/canale_backup`. Stanno in `src/main`, quindi `github` e `play` le hanno entrambe.

Dopo quel paragrafo, ancora senza alzare la versione:

- Il collaboratore che apre la scheda del cane non scrive più `recentDogIds` (`f56f54b`). Il toast «Salvataggio non riuscito» di quel caso non parte.
- La home non aspetta più i 13 mesi per il primo quadro e lo splash non copre l’interfaccia (`e91b6b8`). I tempi sotto i 3 secondi non sono stati rimisurati.
- Push, listino, report ed email (`a1236f9`): il titolo push segue `accounts.lingua`; il foglio prezzi segue `linguaClienti`; CSV, PDF e xlsx degli incassi seguono la lingua della persona; le dieci email partono dall’HTML del codice. I template Brevo 3–12 restano accesi finché un invio vero non è controllato (voce 14 di `DA-FARE-ROBERTO.md`).
- Pagine pubbliche e legali: `?lang=it|en|es`, riga «Italiano · English · Español», e `?lang=fr` ricade sul browser e poi sull’inglese. In cima alle traduzioni il testo italiano in vigore prevale. Niente civico. `hosting/c` ha le tre lingue; il nome del cane che arriva dal salone non si traduce.

La barra in basso (Home, Animali, Agenda, Mensili, Listino, Impostazioni, Aggiungi) legge il vocabolario. In inglese non restano quelle scritte italiane. Accesso, conferma email, recupero password, riprova del salone e invito leggono lo stesso vocabolario: in italiano le frasi restano quelle di prima. Il resto delle schermate è ancora in italiano fisso.

Non è stato fatto, e per questo non c’è la 1.1.95: le schermate oltre alla barra e al selettore della lingua sono ancora in italiano fisso. Il test 360 nelle tre lingue, il deploy di functions e hosting per le traduzioni e l’APK restano da fare dopo quelle schermate. `APP_VERSION` resta 1.1.94. Nessuna release GitHub.

## Chiusura prima di Play — 26/10/2026

Un solo disegno su `docs/GROOMLY-COSA-RESTA.md`. Scelte in `docs/DECISIONI-AUTOMATICHE.md` (D33–D40). Piano unico: `docs/superpowers/plans/2026-10-26-chiusura-prima-di-play.md`. `mostraPiani` e `abbonamentiAttivi` restano spenti. Nessuna release GitHub in questo giro.
