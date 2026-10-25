# Decisioni automatiche — 25 ottobre 2026

Modalità autonoma: nessuna domanda è stata lasciata in attesa. Per ogni scelta vale la raccomandazione già scritta, oppure l’opzione che non tocca i dati veri di Laura.

## D1. Approvazione del piano

- Domanda: aspettare l’approvazione della specifica e del piano prima di scrivere codice?
- Opzioni: (A) aspettare; (B) scrivere i file e passare subito all’esecuzione.
- Scelta: B.
- Perché: il committente ha chiesto di non aspettare e di eseguire appena il piano è scritto. Le porte del brainstorm che chiedono conferma sono saltate solo per questo ordine esplicito.

## D2. Come si esegue

- Domanda: un subagent per task, oppure esecuzione in questa sessione su `main`?
- Opzioni: (A) subagent, un task alla volta, ramo di lavoro; (B) esecuzione in linea su `main`.
- Scelta: B.
- Perché: il registro `docs/PROGRESSO-PIANO.md` e il commit dopo ogni task stanno su un solo albero. Il push di `main` è stato chiesto. Un worktree parallelo non è stato aperto.

## D3. F5, schermata «accesso sospeso»

- Domanda: come fa il collaboratore a sapere che il piano è spento, se l’elenco `members` gli è negato?
- Opzioni: (A) campo `accessoSospeso` sull’account, scritto dal server; (B) regola che lascia leggere a ogni membro tutta la raccolta `members` e `pro/main`; (C) leggere solo `pro/main` (già consentito da `accountSalonIs`) e il documento `members/{proprio uid}` (già consentito), e se l’elenco intero risponde `permission-denied` mostrare la sospensione (`elencoNegato`).
- Scelta: C.
- Perché: A scriverebbe sugli account veri al prossimo deploy delle funzioni. B farebbe leggere al collaboratore sospeso le email dei colleghi. C non aggiunge permessi e non scrive nulla. `accessWithoutPro` continua a passare, perché quel membro può già leggere l’elenco.

## D4. I 9 test rossi

- Domanda: si cambia l’app o si allineano i test?
- Opzioni: (A) tornare al comportamento di prima di M7 e M8; (B) correggere i test dove il comportamento nuovo è quello deciso, e correggere il codice solo dove il test descrive un dato che non si deve perdere.
- Scelta: B.
- Perché: M7 (dopo le 9 si propone il prossimo orario) e M8 (il nome va in `salonName` e, se manca, anche nella ragione sociale) sono già decisi. Il nome due volte in Impostazioni è quel comportamento, non un campo da nascondere. Il segno di cancellazione illeggibile non deve invece mostrare un cane che potrebbe essere cancellato: lì si corregge `listenDogs`.

## D5. Orologio dei test

- Domanda: fermare l’ora in un setup globale, o in ogni describe che legge «adesso»?
- Opzioni: (A) `vi.setSystemTime` globale all’avvio di Vitest; (B) solo nei describe di `AppointmentPage.test.tsx` e `appointments.test.tsx` che non hanno già un’ora fissa, con `useRealTimers` in `afterEach`.
- Scelta: B.
- Perché: un orologio globale sposta anche i test che usano la data di oggi di proposito (nome del backup, mensili). I cinque rossi dipendono dall’ora del giorno in quei due file.

## D6. Emulatori nell’app

- Domanda: applicare `docs/test360-kit/client-emulatori.patch` così com’è?
- Opzioni: (A) la patch; (B) import dinamico di `connectAuthEmulator`, `connectFirestoreEmulator` e `connectFunctionsEmulator` solo quando `VITE_EMULATORS === '1'`.
- Scelta: B.
- Perché: la patch importa `connect*` nel ramo eseguito dai mock e rompe `client.test.ts`. Senza la variabile, quel ramo non esiste.

## D7. Rete in `npm test`

- Domanda: come si impedisce a `vi.unstubAllGlobals()` di rimettere il `fetch` di sistema?
- Opzioni: (A) vietare `unstubAllGlobals` nei test; (B) sostituire `globalThis.fetch` con un blocco degli host esterni prima dello stub, così l’unstub torna al blocco e non a Internet. `localhost`, `127.0.0.1`, `blob:` e `data:` restano.
- Scelta: B.
- Perché: A costringe a riscrivere decine di test che ripristinano i mock. B chiude il buco senza toccare i mock locali.

## D8. Firebase vero

- Domanda: alla fine si fa `firebase deploy` su `groomly-3128b`, come dice la regola di pubblicazione?
- Opzioni: (A) deploy di regole, indici e hosting; (B) nessun deploy; la voce resta in `docs/DA-FARE-ROBERTO.md`.
- Scelta: B.
- Perché: l’ordine di questo giro vieta il deploy sul progetto vero. È irreversibile sulle regole che proteggono Laura. Le regole nuove restano nel repository finché Roberto non le pubblica.

## D9. Versione e push

- Domanda: si alza `APP_VERSION` a ogni fase, o una volta sola?
- Opzioni: (A) a ogni fase, con APK; (B) il push di `main` della fase 0 non alza la versione; `1.1.93` → `1.1.94` solo nel task 37, se i test sono verdi.
- Scelta: B.
- Perché: è l’ordine esplicito. Un APK a metà lavoro farebbe comparire «Aggiornamento disponibile» prima che il giro sia chiuso.

## D10. Repository privato (F7)

- Domanda: rendere privato `robmass83-ui/Groomly` adesso?
- Opzioni: (A) privato subito; (B) lasciarlo pubblico finché l’APK non ha un altro indirizzo.
- Scelta: B.
- Perché: oggi l’aggiornamento dell’app installata legge le release di quel repository. Renderlo privato spegnerebbe gli aggiornamenti. Già in `DA-FARE-ROBERTO.md`.

## D11. Decisioni A1–A7 del piano sorgente

- Domanda: riaprire A1–A7?
- Opzioni: le raccomandazioni della §17, oppure un’alternativa.
- Scelta: restano quelle già scritte nella specifica (A1 scritta piccola, A2 offerta Play non nel codice, A3 prova 30 giorni, A4 commercialista, A5 export Pro con mese corrente visibile, A6 prezzi solo in `DA-FARE-ROBERTO.md`, A7 RevenueCat scritto e spento).
- Perché: sono le raccomandazioni del piano, e nessuna scrive prezzi nel codice né tocca il salone vero.

## D12. Crediti, WhatsApp automatico, flavor Play, accensione abbonamenti

- Domanda: implementarli in questo giro?
- Opzioni: (A) sì; (B) solo predisposti, spenti, oppure nemmeno i file, come dice il piano per i crediti.
- Scelta: B. Crediti: nessun file. WhatsApp automatico: `canaleAuto` resta `email`. Flavor `play`: non si toglie `REQUEST_INSTALL_PACKAGES`. `mostraPiani` e `abbonamentiAttivi` restano false. Il codice RevenueCat è un wrapper locale, senza il pacchetto npm e senza acquisti.
- Perché: sono passi di Roberto (Play, Meta, commercialista) o decisioni già chiuse come «non ora».

## D13. Compagno visivo

- Domanda: aprire il browser delle scelte grafiche?
- Opzioni: (A) sì; (B) no.
- Scelta: B.
- Perché: le scelte di questo giro sono regole, test e flag. Non c’è un layout da confrontare, e non c’è una risposta da aspettare.

## D14. Test 360° e dati

- Domanda: su quale progetto Firebase girano seed, regole e Playwright?
- Opzioni: (A) `groomly-3128b`; (B) solo emulatori `demo-groomly`, spenti senza export, dati cancellati all’inizio e alla fine.
- Scelta: B.
- Perché: il salone di Laura, `salon/shared`, Troddioni e i tre account veri non si toccano. Se l’emulatore non parte, il task si annota e non si «prova» sul progetto vero.

## D15. Assignee di una visita completata

- Domanda: la scrittura del collaboratore che cambia `assigneeUid` di un completato, con un valore diverso da quello già salvato, è una falla?
- Opzioni: (A) correggere `firestore.rules` su `main`; (B) lasciare la regola, perché la scrittura è già negata.
- Scelta: B. Nessuna pubblicazione.
- Perché: il documento di prova ha `assigneeUid` del titolare e il collaboratore scrive `uid-altra-persona`. L’emulatore risponde `permission-denied` (regole 28/28 in `scripts/test360/rules.ts`, più il caso in `firestoreRules.emulator.test.ts`). Il permesso visto nel test iniziale era un aggiornamento senza differenza: l’assignee scritto era già quello del documento. Il motore logga anche `evaluation error` sulla riga `update`, ma il documento non cambia: è un rifiuto, non un permesso.

## D16. Pulsanti dell’operatore con i piani spenti

- Domanda: i quattro pulsanti della pagina Utenti si vedono anche con `mostraPiani` false?
- Opzioni: (A) solo con il flag acceso; (B) sempre, solo per l’operatore, assenti su `shared`.
- Scelta: B.
- Perché: l’omaggio è un clic dell’operatore e deve essere possibile prima di accendere i piani al pubblico. La pagina Utenti non è nel menu di un titolare o di un collaboratore. Il resto dell’app, con il flag spento, non guadagna altre voci.

## D17. Link privacy e etichetta appuntamento

- Domanda: dove puntano i link di Privacy, Termini, DPA ed eliminazione account, e il pulsante visibile resta «pelosetto»?
- Opzioni: (A) pubblicare l’hosting; (B) copiare le pagine in `hosting/` e linkare `https://groomly-3128b.web.app/...` senza deploy; il pulsante diventa «Fissa un appuntamento» e `kind` salvato resta `pelosetto`.
- Scelta: B.
- Perché: il deploy su `groomly-3128b` resta a Roberto. Le pagine sono pronte per quando pubblica l’hosting. I documenti già salvati non si migrano.

## D18. Emulatore Pub/Sub

- Domanda: tenere acceso anche Pub/Sub, dopo che l’emulatore è uscito da solo con codice 1?
- Opzioni: (A) rilanciarlo e bloccare i task; (B) tenere Auth, Firestore e Functions, e provare le callable lì.
- Scelta: B.
- Perché: le callable nuove si provano su Functions. Gli schedule restano caricati solo quando Pub/Sub sta in piedi; al prossimo avvio con Pub/Sub si ricontrollano. Nessun dato vero è stato toccato.

## D19. launchMode Android

- Domanda: passare `launchMode` da `singleTask` a `singleTop` adesso?
- Opzioni: (A) cambiarlo e lanciare i test di intent; (B) lasciarlo `singleTask` e annotarlo per il giorno del plugin Play.
- Scelta: B.
- Perché: il cambio è legato al permesso di billing e al pacchetto RevenueCat, che non si installa in questo giro. I test di routing non sono stati rilanciati apposta per un manifest che deve restare com’è.

## D20. Runtime delle Functions e versione di firebase-functions

- Domanda: Node 22 con quale SDK, visto che in locale gira Node 24?
- Opzioni: (A) restare su `firebase-functions` 6.6.0 e cambiare solo `engines.node`; (B) `firebase-functions` 7.4.0, ultima stabile, con `engines.node` 22.
- Scelta: B.
- Perché: 7.4.0 accetta `firebase-admin` 13 già presente, le import `v2/https`, `v2/scheduler` e `params` compilano, e `tsc` è verde. Node 24 non è il runtime chiesto: Cloud Functions pubblica `nodejs22`. L’emulatore avvisa che l’host è Node 24 e usa quello in locale; il deploy scrive Node.js 22.

## D21. Indice `pro.stato`

- Domanda: Firestore rifiuta l’indice composito di `pro` con il solo campo `stato` («this index is not necessary, configure using single field index controls»). Si pubblica lo stesso file, o si sposta in `fieldOverrides`?
- Opzioni: (A) togliere l’indice; (B) lasciarlo composito e non pubblicare; (C) override di campo singolo, con gli indici automatici di collection più `COLLECTION_GROUP` ASCENDING, così `chiudiProve` può fare `collectionGroup('pro').where('stato','==','prova')`.
- Scelta: C.
- Perché: A farebbe fallire la query di gruppo in produzione. B lascia il deploy degli indici a codice 1. L’override tiene gli indici che Firestore crea da solo e aggiunge il gruppo.

## D22. Il collaboratore che cancella l’account (M13)

- Domanda: come si libera il posto senza lasciare al client la cancellazione dell’account?
- Opzioni: (A) la regola cancella l’account e una funzione a parte revoca il membro; (B) il client non può cancellare l’account se non è il titolare (`salonId == uid`, così il rollback della registrazione resta), e `eliminaAccount` per socio e collaboratore scrive `revocaMembroAllUscita` e cancella solo account e utente Auth.
- Scelta: B.
- Perché: una delete delle regole non può aggiornare `members`. Senza la revoca il posto resta occupato. Il titolare continua a poter cancellare il proprio account nel rollback.

## D23. Primo dato della home (F8)

- Domanda: la home aspetta agenda e cani, e gli appuntamenti aspettano le lapidi.
- Opzioni: (A) accorciare lo splash; (B) non aspettare i cani e consegnare gli appuntamenti prima delle lapidi, lasciando lo splash com’è.
- Scelta: B.
- Perché: lo splash è voluto (900/1400 ms più 350). I cani e le lapidi non servono alla prima lista di oggi. La misura sotto i 3 secondi del test 360 non è stata ripetuta: quel tempo includeva anche il login.

## D24. «Salvataggio non riuscito» del collaboratore

- Domanda: il toast in Impostazioni del collaboratore da dove arriva?
- Opzioni: (A) aprire `settings/main` in scrittura al collaboratore; (B) non scrivere il badge del registro se il ruolo è collaboratore.
- Scelta: B.
- Perché: le regole chiudono le impostazioni al collaboratore di proposito. Il badge è un timbro locale di «già visto» e non deve produrre un errore.

## D25. Dove si scarica l’APK

- Domanda: l’APK deve stare su Firebase Hosting (`groomlyapp.it`) con GitHub come riserva, senza mettere il file nel commit. Il progetto ha le Functions, quindi non è più il piano Spark.
- Opzioni: (A) lasciare l’URL di GitHub in `release.json`; (B) `release.json` punta a `https://groomlyapp.it/groomly.apk`, il file è in `hosting/groomly.apk` (già in `.gitignore`) solo al momento del deploy, e l’app legge prima `groomlyapp.it/release.json`, poi GitHub, poi `web.app`.
- Scelta: B.
- Perché: il deploy di Hosting ha accettato l’APK (codice 0, 17 file). Il repository può diventare privato più avanti senza spegnere il download. L’app già installata, se GitHub non risponde, legge ancora `release.json`.

## D26. Varianti Android

- Domanda: come si prepara Play senza togliere l’aggiornamento APK a chi ha già l’app.
- Opzioni: (A) un solo manifest e un flag a runtime; (B) due flavor, `github` e `play`, stesso `applicationId` `it.groomly.app`. `github` tiene `REQUEST_INSTALL_PACKAGES` e `AppInstallerPlugin`. `play` no. `distribution.js` della flavor dice `play` e `UpdateNotice` non si monta.
- Scelta: B.
- Perché: il permesso non deve proprio esserci nel pacchetto Play. Il flag nello script di flavor non richiede due build del sito.

## D27. Firma

- Domanda: gli APK 1.1.93 e 1.1.94 con quale chiave sono firmati?
- Esito: entrambi `CN=Android Debug, O=Android, C=US`, SHA-256 `1aa1211e900e794873ea1632ed09f5ce116e20f87010d96a9ecbf699c9d68fe2`.
- Scelta: keystore di upload fuori dal repository (`%USERPROFILE%\.groomly\upload.jks`), usato solo da `playRelease`. L’APK GitHub resta sulla chiave debug.
- Perché: cambiare la firma dell’APK che ha Laura obbliga a disinstallare. Il pacchetto Play è un canale nuovo e va firmato con una chiave di upload, non con la debug.

## D28. targetSdk

- Domanda: quale API chiede Google Play il 25/10/2026?
- Esito: dal 31 agosto 2026 le app nuove e gli aggiornamenti devono puntare ad Android 16, API 36. `compileSdk` e `targetSdk` sono già 36. Non si alzano oltre.

## D30. Formattazione e chiavi di macchina

- Domanda: il punto 7 della revisione dice di far passare da `src/i18n/format.ts` ogni `toLocaleDateString`, `Intl.*` e `localeCompare`. Alcuni di questi non sono una lingua dello schermo.
- Opzioni: (A) spostarli tutti, comprese la chiave giorno `en-CA` e lo spareggio per `id`; (B) il modulo fa date visibili, euro, ordinamento dei nomi e plurali (`Intl.PluralRules`). La chiave `en-CA`, il fuso `Europe/Rome` e lo spareggio per `id` restano.
- Scelta: B.
- Perché: cambiare la chiave del giorno sposterebbe gli appuntamenti. Lo spareggio per `id` non è una parola da tradurre.

## D31. Modello Brevo 5

- Domanda: la specifica dice che il codice compone l’HTML, e il giro di sera dice di lasciare acceso il modello 5 finché il codice non spedisce da solo.
- Opzioni: (A) spegnere il modello 5 appena l’HTML esiste nel repository; (B) il codice nuovo spedisce l’HTML quando è quello in esecuzione, e finché la funzione pubblicata usa ancora il modello 5 quel modello resta. Lo spegnimento dei modelli 3–12 si annota in `docs/DA-FARE-ROBERTO.md` e non lo fa questo giro.
- Scelta: B.
- Perché: è l’ordine esplicito. Spegnere il modello prima del deploy lascerebbe gli inviti senza testo.

## D32. Varianti e sede legale tradotta

- Domanda: le lingue stanno solo nella variante GitHub? Il testo che fa fede è una «versione 2»?
- Opzioni: (A) solo `github`, e si scrive «versione 2»; (B) vocabolario nel bundle web e stringhe Android in `src/main`, così `github` e `play` le hanno entrambe. Fa fede il testo italiano attuale: termini 1.1, privacy e DPA senza civico, città Quartu Sant’Elena (CA).
- Scelta: B.
- Perché: è l’ordine della sera. Una «versione 2» non esiste.

## D29. App Check spento

- Domanda: come si prepara Play Integrity e reCAPTCHA senza chiudere fuori l’app già installata.
- Opzioni: (A) accendere App Check e imporlo sulle Functions; (B) codice pronto, flag `APP_CHECK_ATTIVO` e `APP_CHECK_ENABLED` a false, niente enforcement.
- Scelta: B.
- Perché: l’enforcement rifiuta i token dell’app attuale. L’app userà Play Integrity (solo flavor `play`, via `AppCheckBridge`). La pagina `groomlyapp.it/salone` userà reCAPTCHA v3. Si accende dopo i passi in console.
