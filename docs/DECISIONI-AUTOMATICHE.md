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

## D33. Questo giro, prima di Play

- Domanda: si aspetta un’approvazione sezione per sezione, o si sceglie e si esegue?
- Opzioni: (A) una domanda alla volta e un disegno da approvare; (B) un solo disegno su `docs/GROOMLY-COSA-RESTA.md`, le opzioni consigliate scritte qui, un solo piano, esecuzione in questa sessione su `main`.
- Scelta: B.
- Perché: la sezione 0 di quel documento, e il messaggio che la cita, lo chiedono. Il compagno visivo non si apre: le scelte sono regole e una soglia già descritta dal test 360, non un confronto di layout da far scegliere.

## D34. Già fatto, non si rifà

Verifica sul codice del 25/10/2026, `main` a `41e6ea1`, prima di scrivere il piano.

- Cataloghi, `format.ts`, ripiego errori, lingua dei clienti, servizi predefiniti, selettore, HTML delle dieci email, stringhe Android: commit da `8f05ab9` a `e758f88`.
- Push, listino, report, email dal codice: `a1236f9`. Verifica, reset e invito chiamano `postBrevoHtml` (`functions/src/index.ts`). Prenotazioni e promemoria anche. La voce 14 di `docs/DA-FARE-ROBERTO.md` c’è già: non si spegne Brevo da qui.
- Pagine pubbliche e legali con `?lang=` e la riga delle tre lingue: `a5c1693`, file in `hosting/`.
- Barra, accesso e invito: `426a6d0`, `41e6ea1`.
- Collaboratore e cani recenti: `f56f54b`, test in `src/pages/dogRecenti.test.tsx`. Non si riapre `settings/main`.
- Splash a zero e agenda rapida: `e91b6b8`, `src/app/App.tsx` (`SPLASH_*_MS = 0`), `pavimentoVistaRapida` in `src/lib/finestraAgenda.ts`. I 4,0 s e i 6,2 s sono di prima di quel commit: si rimisurano, non si rifà lo splash.
- `mostraPiani` e `abbonamentiAttivi` restano false. App Check resta spento.

## D35. Agenda settimana (M6)

- Domanda: la settimana con 6–8 cani ha etichette illeggibili. Il rapporto propone «6 cani» e un tocco, oppure l’elenco.
- Opzioni: (A) ogni giorno è solo «N cani · tempo» e il tocco apre il giorno; (B) la riga «N cani · tempo» c’è sempre; con più di 4 cani spariscono le card e il tocco apre il giorno, con 4 o meno le card restano; (C) si lascia la settimana com’è.
- Scelta: B. Soglia 4. Il tempo è la somma dei minuti dei servizi di quegli appuntamenti, con `formatCompactDuration`, separato da ` · `. Non contano disdetti, non venuti e gli appuntamenti personali. Il tocco di un giorno pieno toglie `vista` e imposta la data: la vista giorno non si riscrive.
- Perché: il difetto è l’etichetta schiacciata, non la settimana vuota. A togliere tutte le card si perde un giorno leggibile che oggi si apre. La vista giorno resta la griglia oraria.

## D36. «Funzioni Pro» con i piani accesi (M3)

- Domanda: il task 9 ha già l’azione prova / Avvisami?
- Esito: con `mostraPiani` false la voce «Funzioni Pro» resta (R1, `voceTeam`). Con il flag acceso e il piano base la voce è `nascosta` e `PianoCard` mostra «Prova Pro gratis per 30 giorni», che apre `PaywallSheet` con «Avvisami» e la prova. `usePiano.test.tsx` e `PaywallSheet.test.tsx` lo coprono. Manca il filo dalla pagina Impostazioni.
- Scelta: non si inventa un’altra pagina. Si aggiunge il test di Impostazioni che, con il flag acceso e il titolare base, trova il pulsante della prova e poi «Avvisami». Se il test è rosso, si collega quello che c’è già.

## D37. Home sotto i 3 secondi

- Domanda: si accorcia ancora lo splash, o si misura prima?
- Opzioni: (A) tagliare altro a sentimento; (B) rimisurare chiaro e scuro con `tests/e2e/perf.cjs` sull’emulatore `demo-groomly`, scrivere cosa aspetta (account, agenda, cani, pro) e togliere solo un’attesa che non porta il primo dato.
- Scelta: B. Obiettivo: meno di 3 s dal login al primo dato, chiaro e scuro. Lo scuro più lento del chiaro, se resta dopo lo splash a zero, si spiega con i numeri (secondo disegno del tema, immagini del logo) e si toglie il lavoro doppio, senza cambiare i colori.

## D38. Schermate ancora in italiano

- Domanda: come si chiude il task 10 del piano lingue?
- Opzioni: (A) un solo commit con tutte le frasi; (B) una zona per commit (home e animali, scheda, calendario e appuntamenti, incassi, listino, impostazioni e dialoghi, componenti condivisi), vocabolario `useFrasi()`, test di zona in inglese, e un controllo finale che fallisce se in `src/pages` o `src/components` resta una frase italiana fissa; (C) traduzione automatica a runtime.
- Scelta: B. `/dev/kit` resta in italiano. In italiano le frasi restano quelle di oggi: i test esistenti tengono `navigator.language = it-IT`. Una frase uguale in italiano e in inglese (Groomly, Privacy, Email) può restare. I testi scritti dal salone non si traducono.

## D39. Play, versione, pubblicazione

- Domanda: la 1.1.95 si pubblica?
- Opzioni: (A) release GitHub e `release.json` online; (B) tutto pronto e fermo.
- Scelta: B. `APP_VERSION` e `versionCode` passano a 1.1.95 una volta sola, alla fine, se i test sono verdi. APK `github` firmato con la chiave debug di oggi, copiato in `groomly.apk` e in `hosting/groomly.apk`. AAB `play` con la chiave fuori dal repo, non caricato. `hosting/release.json` resta 1.1.94 nel deploy, così «Aggiornamento disponibile» non parte. Il file pronto per Roberto è `docs/play/release-1.1.95.json`. Nessuna `gh release`. Deploy di functions e hosting sì, se i test sono verdi. Regole solo se il file cambia, e solo dopo la prova sull’emulatore con i salvataggi della 1.1.94.
- La variante `play` non mostra l’avviso né il pulsante dello storico. I link privacy, termini, DPA ed elimina account, in entrambe le varianti, puntano a `https://groomlyapp.it/.../?lang=` della persona. Con lingua italiana la pagina resta il testo italiano.
- Se il codice raccoglie dati oltre a nome, email, ID utente, indirizzo, telefono, foto, file e ID dispositivo, si scrive in `DA-FARE-ROBERTO`. App Check resta spento. `mostraPiani` e `abbonamentiAttivi` restano spenti.

## D40. Rami e documenti

- `scheda-nido`: non si unisce. Si confronta con `DogPage.tsx` e, se il nido non c’è, la voce resta bloccata da Roberto con la differenza scritta nel registro.
- `feat/firma-privacy`: se main ha già hosting, privacy e la firma debug per GitHub con la chiave Play fuori dal repo, si segna superato. Il ramo non si cancella.
- Worktree: `core.longpaths` come chiede la sezione 0, poi `git worktree prune` e si toglie solo la cartella il cui commit è già in `main`. Un ramo con commit assenti da `main` resta.
- I piani vecchi fatti si marcano in cima con il commit. Ciò che non è fatto si elenca nel registro. `prompt-cursor-*.md`, `proposte-*.html` e `docs/bozze/` vanno in `docs/archive/`. `docs/GROOMLY-COSA-RESTA.md` resta il riferimento. La sezione 3 è di Roberto: nel registro ogni voce è «bloccato da Roberto» con il motivo della tabella, senza fare il lavoro al posto suo.

## D29. App Check spento

- Domanda: come si prepara Play Integrity e reCAPTCHA senza chiudere fuori l’app già installata.
- Opzioni: (A) accendere App Check e imporlo sulle Functions; (B) codice pronto, flag `APP_CHECK_ATTIVO` e `APP_CHECK_ENABLED` a false, niente enforcement.
- Scelta: B.
- Perché: l’enforcement rifiuta i token dell’app attuale. L’app userà Play Integrity (solo flavor `play`, via `AppCheckBridge`). La pagina `groomlyapp.it/salone` userà reCAPTCHA v3. Si accende dopo i passi in console.

## D41. Ultimo giro, senza attesa

- Domanda: si aspetta l’approvazione sezione per sezione di `docs/GROOMLY-ULTIMO-GIRO.md`?
- Opzioni: (A) una domanda alla volta; (B) un solo disegno, le opzioni consigliate scritte qui, un solo piano `docs/superpowers/plans/2026-10-26-ultimo-giro.md`, esecuzione in questa sessione su `main`.
- Scelta: B.
- Perché: la sezione 0 di quel documento, e il messaggio che la cita, lo chiedono. Il compagno visivo non si apre: le scelte sono regole, flag e un confronto che Roberto fa dopo, sul file HTML. Non c’è una risposta da aspettare prima del codice.

## D42. Versione pubblicata

- Domanda: `hosting/release.json` a quale versione resta, visto che il documento del 26/10 diceva 1.1.94 e il repository era già a 1.1.96?
- Opzioni: (A) riportare il file a 1.1.94; (B) la versione pubblicata adesso è 1.1.96, come dice il messaggio di questo giro. Il file online e quello nel repository restano 1.1.96. La versione pronta di questo giro è la prima libera dopo, 1.1.97, solo in `docs/play/release-1.1.97.json` e nel codice dell’app, non in `hosting/release.json`.
- Scelta: B.
- Perché: è la correzione esplicita del punto 1. Un deploy di hosting con `release.json` a 1.1.97 farebbe comparire «Aggiornamento disponibile» prima della prova sul telefono. Nessuna `gh release`.

## D43. Quale APK scarica l’avviso

- Domanda: l’APK online è sempre `groomly.apk` della versione pubblicata, oppure l’app scarica solo il file nominato dalla versione in `release.json`?
- Opzioni: (A) un solo `groomly.apk`, sostituito solo quando Roberto pubblica; (B) l’URL nel json nomina la versione, `https://groomlyapp.it/groomly-<versione>.apk`, e l’app scarica quell’URL.
- Scelta: B per ogni versione nuova. Il json già pubblicato della 1.1.96 resta `https://groomlyapp.it/groomly.apk`, perché quel file è già online e cambiare l’URL senza caricare `groomly-1.1.96.apk` romperebbe il download. Il deploy di questo giro non sostituisce `hosting/groomly.apk`. Il file pronto `docs/play/release-1.1.97.json` punta a `https://groomlyapp.it/groomly-1.1.97.apk`.
- Perché: l’app legge già `url` da `release.json`. Un nome che contiene la versione non viene scambiato da un deploy successivo che copia un APK più nuovo sopra `groomly.apk`. Il test fallisce se `hosting/release.json` è più nuovo dell’ultimo tag GitHub (`gh release view`). Se `gh` non risponde, il test fallisce: non si indovina il tag.

## D44. Strumenti gratuiti

- Domanda: F1, F2 e F3 come si vedono con `mostraPiani` spento?
- Opzioni: (A) restano nel riquadro della home dietro il flag; (B) in Impostazioni, sezione «Strumenti», tre interruttori, tutti spenti se il campo manca. I pulsanti compaiono solo con l’interruttore acceso. Le funzioni Pro («Invia tutti», pagella, prenotazioni, lista d’attesa, recensioni, fedeltà, statistiche) restano dietro `mostraPiani`.
- Scelta: B. Campi `strumenti.messaggi`, `strumenti.affidabilita`, `strumenti.noteVocali`. Assente o false è spento.
- Perché: è l’ordine di Roberto. R1 vale per home, scheda e appuntamento: spenti, nessun pulsante nuovo. La sezione in Impostazioni è il comando, ed è visibile anche spenta. Il testo WhatsApp è nella lingua dei clienti (`linguaClienti`, ripiego italiano), il numero passa da `normalizzaTelefono`, la firma è «Fatto con Groomly», «Made with Groomly» o «Hecho con Groomly». Il testo è precompilato e si può modificare prima di aprire `wa.me`.

## D45. Italiano sullo schermo

- Domanda: come si prende l’italiano che lo scanner dei sorgenti non vede?
- Opzioni: (A) un altro scanner sui file; (B) un elenco di parole in `src/lib/italianoSchermo.ts` e un giro Playwright sull’emulatore `demo-groomly` che apre le route dell’app e i fogli principali con la lingua `en` e `es`.
- Scelta: B. Ammessi uguali: Groomly, Privacy, DPA, WhatsApp, POS, e i nomi di cani e servizi del seed. Le date visibili passano da `src/i18n/format.ts`. «Partita IVA» in inglese è «VAT number», in spagnolo «NIF / CIF», e il campo in Impostazioni non blocca il salvataggio se è vuoto. La registrazione di un salone nuovo può lasciarlo vuoto.
- Perché: le frasi già nel vocabolario possono restare fuori dallo schermo se un calcolo (`earnings.ts` con `IT_DATE`) stampa il mese italiano. Lo scanner del sorgente non legge il testo disegnato.

## D46. Campione delle email

- Domanda: chi spedisce le 10 email per 3 lingue, e ci si ferma lì?
- Opzioni: (A) spedirle da questa sessione a indirizzi veri; (B) una callable solo se l’email è quella di Roberto (`ROBERTO_EMAIL`), destinatario fisso `info@groomlyapp.it`, dati finti (salone «Salone Demo», cane «Luna»). Senza chiave Brevo non chiama la rete e risponde `chiave assente`. Il pulsante sta in Impostazioni, solo per l’operatore. Il deploy è quello finale delle functions. Il lancio dal telefono e lo spegnimento dei template Brevo 3–12 restano a Roberto: il 5 resta acceso.
- Scelta: B. Non ci si ferma tra le zone: la voce del lancio è «bloccato da Roberto», il resto del giro continua.
- Perché: nessuna email a un cliente o a un salone vero. Laura non è il destinatario e non è l’unico operatore autorizzato a premere il pulsante: il documento dice Roberto.

## D47. Prenotazione e collaboratore spento

- Domanda: la pagina pubblica non ha il modulo, la callable `inviaRichiesta` sì. Si costruisce il prodotto Pro, o si prova il modulo che c’è?
- Opzioni: (A) accendere le prenotazioni nell’app; (B) un modulo sulla pagina `hosting/salone` che chiama la callable già scritta, nelle tre lingue, con l’esca anti-bot. Il salone accetta, propone o rifiuta con le funzioni già in `gestisciPrenotazione`. L’HTML dell’email si verifica con `emailMessaggio` nella lingua dei clienti. Il seed del 360 crea un collaboratore con il piano spento e il giro deve vedere la frase di accesso sospeso. Socio e collaboratore si aprono anche in inglese e spagnolo. Tutto su `demo-groomly`. `mostraPiani` resta spento: il riquadro Pro in home non si accende.
- Scelta: B.
- Perché: il modulo vero è la callable. Mostrare le prenotazioni nel menu del salone le farebbe uscire dal flag.

## D48. Tempo fino al primo dato

- Domanda: si accorcia ancora lo splash, o si misura sul telefono?
- Opzioni: (A) tagliare a sentimento; (B) salvare in locale i millisecondi dall’apertura dell’app al primo dato dell’agenda, visibili solo all’operatore in Impostazioni → Info. Si toglie solo un’attesa che non porta quel dato. I numeri dell’emulatore vanno nel registro. La lettura sul telefono è di Roberto.
- Scelta: B.
- Perché: l’emulatore non è il telefono. Senza la misura in Impostazioni Roberto non può chiudere la voce.

## D49. Documenti e scheda nido

- I piani già eseguiti elencati al punto 7 ricevono in cima «Eseguito — vedi registro». `Groomly_Abbonamenti_PIANO.md` e `Groomly_Controlli_Avanzati_PIANO.md` ricevono una tabella fatto / dietro flag / rimandato. `fix/groomly-fix-ux.md` va in `docs/archive/` con la nota «assorbito dai piani successivi».
- `scheda-nido` non si unisce. Si prepara `docs/archive/confronto-scheda-nido.html` con la scheda della 1.1.88 e quella di oggi, chiaro e scuro, stesso cane finto. La scelta resta di Roberto.

## D50. Chiusura di questo giro

- `APP_VERSION` passa a 1.1.97 una volta sola, alla fine, se `npm test` e `npm run build` sono verdi. `versionCode` 10197. APK `github` firmato con la chiave debug di oggi. AAB `play` con la chiave fuori dal repo, non caricato. `hosting/release.json` resta 1.1.96. Nessuna `gh release`.
- Deploy di functions e hosting sì, se i test sono verdi e `release.json` non è stato alzato. L’APK nuovo non si copia in `hosting/groomly.apk`. Le regole Firestore non si pubblicano se il file non cambia. Se cambia, solo dopo la prova sull’emulatore con la forma dei salvataggi della versione pubblicata.
- `mostraPiani` e `abbonamentiAttivi` restano false. App Check resta spento. Nessun dato di Laura, di `salon/shared` o di Troddioni.
