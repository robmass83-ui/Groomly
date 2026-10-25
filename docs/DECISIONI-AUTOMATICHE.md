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
