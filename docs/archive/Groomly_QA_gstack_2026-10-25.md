# QA Groomly — 25 ottobre 2026

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Report solo di osservazione. Nessun file di prodotto, test o configurazione è stato modificato.

## Metadati

| Campo | Valore |
| --- | --- |
| Data | 2026-10-25 |
| Branch | `main` @ `41e6ea1`, con modifiche locali non committate su `src/i18n/{it,en,es}.ts`, `src/lib/authAction.ts`, `src/lib/authGate.ts`, `src/lib/authGate.test.ts`, `src/lib/schemas.ts`, `src/pages/LoginPage.tsx` |
| Caller | `/gstack-qa-only`, report-only |
| Mode | Full, browser |
| Target | http://127.0.0.1:5173 |
| Account | `salone1@test.groomly` (Toelettatura Sassari). Password non riportata |
| Viewport | 390×844, `it-IT`, `Europe/Rome` (misurato: `innerWidth` 390, `innerHeight` 844, `lang=it`, fuso `Europe/Rome`) |
| Isolamento | Emulatori `--project demo-groomly`. Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, Functions `127.0.0.1:5001`. App avviata con `npx vite --mode emu` (banner `emu`, `VITE_EMULATORS=1`) |
| Driver | Aside assente su Windows. Browser gstack non pronto (`BROWSER_UNAVAILABLE`: Playwright non installato; il report-only non lancia `./setup`). Probe nel browser di Cursor |
| Probe budget | Il tetto Full da 900 secondi della skill è stato superato dal perimetro chiesto (tutti i flussi nominati). Nessun `deadline.json` |
| Guarded command time | non misurato (probe nel browser, senza il guard `gstack-qa-deadline`) |
| Total session elapsed | unmeasured |
| Template | `templates/qa-report-template.md` non è presente nell'installazione gstack-qa. Struttura ricostruita dalle regole della skill |
| Rete vietata | Nessuna richiesta osservata verso `groomly-3128b` né verso il `firebaseapp.com` del progetto vero. Gli host delle risorse misurate erano solo `127.0.0.1:5173` |

## Charters

### C1 — Login

- Contratto: la pagina di login accetta il salone finto e apre l'app del salone 1.
- Rischio: credenziali rifiutate, schermata bianca, oppure rete verso il progetto vero.
- Entrypoint: http://127.0.0.1:5173 dopo un reload a caldo.
- Isolamento: solo emulatori demo. Stop se compare `groomly-3128b` o il firebaseapp.com del progetto vero.
- Uscita: sessione dentro l'app, oppure blocco di sicurezza.
- Esito: login riuscito. Toelettatura Sassari. Nessun host vietato.

### C2 — Cani: elenco, profilo, crea, modifica, elimina

- Contratto: elenco cani visibile; un cane nuovo si crea, si modifica e si elimina.
- Rischio: salvataggio che non persiste, cancellazione del cane sbagliato, lista non aggiornata.
- Entrypoint: Animali dopo il login.
- Isolamento: dati seed del salone 1 sull'emulatore.
- Uscita: il cane creato non è più in elenco dopo l'eliminazione.
- Esito: QAtest creato, rinominato QAtest2, eliminato. La ricerca `QAtest` non lo ritrova. L'elenco resta a 58 attivi.

### C3 — Appuntamenti

- Contratto: nuovo appuntamento; cane non registrato; sposta; disdici; completato; «Fissa anche il prossimo».
- Rischio: stato che non cambia, cane finto che finisce in anagrafica, prossimo assente.
- Entrypoint: Nuovo appuntamento.
- Isolamento: stesso salone finto.
- Uscita: ogni azione osservata una volta, con prima e dopo.
- Esito: tutti e sei i comportamenti osservati. Dettaglio nei risultati e in F3.

### C4 — Listino e stampa/condivisione

- Contratto: il listino si apre e stampa o condivisione parte, oppure è chiaramente non disponibile sul web.
- Rischio: listino vuoto, dialogo che rompe la pagina.
- Entrypoint: Listino.
- Isolamento: servizi del seed.
- Uscita: listino letto; stampa/condivisione tentata.
- Esito: anteprima aperta. Scarica produce un PDF in memoria. Condividi non ha `navigator.share`.

### C5 — Incassi e report

- Contratto: la schermata mostra cifre del salone e non resta in errore.
- Rischio: schermata vuota, NaN, periodo sbagliato.
- Entrypoint: Incassi e report.
- Isolamento: appuntamenti seed, fuso Europe/Rome.
- Uscita: un periodo visibile.
- Esito: ottobre 2026 a € 3.483 dopo il completamento di Nala. Il primo fotogramma della card, prima del caricamento, mostra € 0 (F1).

### C6 — Backup

- Contratto: la voce backup è raggiungibile e l'azione principale risponde.
- Rischio: export che tocca il cloud vero, o pulsante morto.
- Entrypoint: Impostazioni, Backup.
- Isolamento: stop se l'azione chiama un host fuori dagli emulatori.
- Uscita: esito dell'azione o limite nativo.
- Esito: foglio aperto. Copia veloce crea uno zip e non dà feedback (F4). Google Drive non collegato.

### C7 — Impostazioni

- Contratto: le impostazioni si aprono e un controllo non distruttivo è modificabile.
- Rischio: salvataggio che non torna; link legali verso l'hosting vero aperti per sbaglio.
- Entrypoint: Impostazioni.
- Isolamento: i link Privacy, Termini, DPA e «Come eliminare l'account» non sono stati aperti.
- Uscita: schermata letta, lingua e tema cambiati.
- Esito: lingua portata su Italiano, tema provato su Scuro e poi Chiaro.

### C8 — Piani Pro e Salone

- Contratto: le schermate dei piani si aprono e descrivono lo stato del salone 1.
- Rischio: le callable sono giù perché le functions non si sono caricate; nessun acquisto esterno.
- Entrypoint: Funzioni Pro.
- Isolamento: nessun checkout.
- Uscita: stato del piano letto.
- Esito: «Piano Pro / Non attivo». Nessun interruttore per il titolare. Nessuna schermata «Piano Salone». Vedi limiti.

### C9 — Tema chiaro e scuro

- Contratto: il tema passa da chiaro a scuro e resta sulla schermata corrente.
- Rischio: toggle che non cambia i colori.
- Entrypoint: Impostazioni, Tema.
- Isolamento: preferenza locale.
- Uscita: screenshot dei due temi.
- Esito: Scuro e Chiaro entrambi visibili e selezionati.

### C10 — Consolle e rete

- Contratto: dopo i flussi si raccolgono errori di consolle e richieste fallite.
- Rischio: un host vietato passa inosservato.
- Entrypoint: resource timing e hook di pagina.
- Isolamento: stop su `groomly-3128b` e sul firebaseapp.com del progetto vero.
- Uscita: elenco.
- Esito: nessun host vietato. Un overlay di errore solo durante l'hot reload, non riprodotto a pagina piena. Vedi limiti.

### C11 — Capacitor sul web

- Contratto: fotocamera, file, notifiche e condivisione nativa non vanno segnate come bug se il browser non le espone.
- Rischio: falso positivo.
- Entrypoint: i pulsanti incontrati.
- Isolamento: nessuna APK.
- Uscita: voce «non testabile sul web».
- Esito: vedi l'elenco in fondo.

## Risultati che hanno funzionato

- Login di `salone1@test.groomly`: entra in Toelettatura Sassari.
- Animali: 58 attivi, 38 mensili, 20 occasionali, 2 in archivio. Filtri Tutti, Mordaci, Anziani, In agenda, Gatti.
- Creato il cane QAtest (Barboncino, Roberto QA, 3331234567), rinominato QAtest2, eliminato in modo definitivo. La ricerca non lo ritrova.
- Nuovo appuntamento per Bobby, domenica 25 ottobre, 11:00–13:00, Bagno + taglio, € 60. «Fissa anche il prossimo» a 4 settimane crea il 22 novembre alle 11:00, visibile in calendario.
- Quel 22 novembre è stato spostato di +15 minuti (11:15–13:15) e poi disdetto dal cliente. Lo stato letto è «Disdetto dal cliente».
- Nala (Labrador, venerdì 23 ottobre) completata con «Nessuna modifica». Gli incassi di ottobre passano da € 3.438 a € 3.483, cioè +€ 45.
- Appuntamento per cane non registrato: QAospite, Ospite QA, Unghie, oggi alle 16:00. Compare in Oggi.
- Listino prezzi aperto. Anteprima di stampa su `/listino/stampa`. Scarica crea un PDF `application/pdf` da 1079017 byte.
- Report incassi di ottobre: € 3.483, 72 appuntamenti, media € 48, 30 €/h, POS € 1.943, contanti € 1.540, mancati € 483. Il foglio Esporta si apre (settembre di esempio € 4.742, 103 appuntamenti).
- Tema Scuro e tema Chiaro si applicano e restano selezionati.
- Backup: il foglio elenca Salva ora, frequenza, Google Drive, Excel, ZIP, Copia veloce, Ripristina.

## Findings

### F1 — Prima pittura di home e impostazioni con dati sbagliati

- Gravità: alta
- Categoria: funzionale
- Schermata: Home e Impostazioni
- Observed: Subito dopo una navigazione, home e impostazioni mostrano per circa due secondi dati vuoti o sbagliati (incassi € 0, mensili 0/0, archivio 0, avviso partita IVA, cani «Cane assente» o nomi di un altro giro), poi si correggono da soli.
- Expected: la prima pittura utile mostra già i dati del salone, oppure uno stato di caricamento, non cifre e nomi di un altro stato.
- Evidence: apertura di `/impostazioni` con link «Incassi e report NUOVO Ottobre 2026 € 0» e «Archivio animali 0 in archivio»; due secondi dopo lo stesso testo è «Ottobre 2026 € 3.483» e la partita IVA `01234567891` è visibile. Apertura di `/appuntamenti/nuovo` con dietro «0/0 Mensili ott», «Aggiungi partita IVA o codice fiscale» e «DA CHIUDERE (2)» su Kratos e Penny; a caricamento finito i mensili sono 15/15 e i nomi tornano Bobby, Nala, Fido. Stessa sequenza sulla home dopo un cambio di URL: prima «Cane assente» e 0/0, poi i nomi veri e 15/15.
- Confirmation: visto su più navigazioni nella stessa sessione (impostazioni, nuovo appuntamento, home). Non è un singolo fotogramma.
- Hypothesis: stato precedente tenuto in memoria mentre il salone sta ancora arrivando da Firestore. Non verificato nel codice.
- Screenshot: `qa-gstack-2026-10-25/screenshots/02-home.png` (home già assestata, non il fotogramma sbagliato). Il fotogramma sbagliato è nel testo catturato, non in uno screenshot dedicato.
- Passi: 1. Entrare come salone 1. 2. Aprire Impostazioni o Nuovo appuntamento senza aspettare. 3. Leggere incassi, mensili e «Da chiudere» nel primo secondo. 4. Aspettare due secondi e rileggere.

### F2 — La card Incassi va a capo male a 390 px

- Gravità: media
- Categoria: visuale
- Schermata: Impostazioni, card Incassi e report
- Observed: Nella card Incassi, a 390 px di larghezza, «vs settembre» va a capo da solo e resta in rosso sotto la percentuale.
- Expected: percentuale e confronto stanno sulla stessa riga, oppure l'andare a capo non isola la parola «settembre».
- Evidence: screenshot chiaro e scuro della stessa card.
- Confirmation: due screenshot, chiaro e scuro.
- Screenshot: `qa-gstack-2026-10-25/screenshots/04-impostazioni-chiaro.jpeg` e `qa-gstack-2026-10-25/screenshots/04-impostazioni-scuro.png`
- Passi: 1. Impostazioni a 390×844. 2. Guardare la card «Incassi e report».

### F3 — «Salva e completa» resta disabilitato

- Gravità: media
- Categoria: funzionale
- Schermata: foglio Completare, dalla home, su Nala del 23 ottobre
- Observed: Nel foglio Completare, con prezzo 45, durata 1h15 e Contanti già selezionato, «Salva e completa» resta disabilitato; l'appuntamento si chiude solo con «Nessuna modifica».
- Expected: con prezzo, durata e pagamento scelti, «Salva e completa» è utilizzabile.
- Evidence: snapshot con Prezzo `45`, Ore `1`, Minuti `15`, Contanti `pressed`, Salva e completa `disabled`. Il click su «Nessuna modifica» porta «Da chiudere» da 6 a 5 e toglie quella Nala. Ottobre passa da € 3.438 a € 3.483.
- Confirmation: osservato una volta, non ripetuto su un secondo appuntamento.
- Screenshot: non catturato sul foglio. Evidenza nello snapshot accessibile.
- Passi: 1. Home, «Da chiudere», Completato su Nala (Labrador, 23 ott). 2. Lasciare prezzo 45 e 1h15. 3. Premere Contanti. 4. Guardare «Salva e completa». 5. Premere «Nessuna modifica».

### F4 — Copia veloce non consegna il file nel browser

- Gravità: media
- Categoria: funzionale
- Schermata: Impostazioni, foglio Backup, Copia veloce
- Observed: «Copia veloce» crea in memoria uno zip da 347713 byte e non mostra alcun messaggio; nel browser navigator.share non esiste, quindi il file non arriva all'utente.
- Expected: un messaggio di esito, oppure un download, se la condivisione nativa non c'è.
- Evidence: `URL.createObjectURL` chiamato con `application/zip 347713`. `navigator.share` assente. Nessun testo di conferma nel corpo della pagina. Nessun host fuori da `127.0.0.1:5173`.
- Confirmation: osservato una volta.
- Screenshot: non dedicato. Il foglio Backup era aperto (voci Salva ora, Excel, ZIP, Copia veloce, Ripristina).
- Passi: 1. Impostazioni, Backup. 2. Copia veloce. 3. Non compare alcun esito.

### F5 — Inglese e italiano mescolati se la lingua app è English

- Gravità: media
- Categoria: contenuto
- Schermata: Impostazioni e barra in basso
- Observed: Con la lingua dell'app su English, la barra e le etichette Language / Client language sono in inglese e il resto delle impostazioni resta in italiano; passando a Italiano la barra diventa Animali, Agenda, Listino, Impostazioni.
- Expected: una lingua per tutta la schermata.
- Evidence: prima del cambio, radio English selezionato nel primo gruppo e testo «Language» / «Client language» / nav `Home Pets Diary Monthly Price list Settings`, mentre titoli e card restano «Impostazioni», «Attività», «Incassi e report». Dopo il click su Italiano, la nav accessibile è Home, Animali, Agenda, Mensili, Listino, Impostazioni.
- Confirmation: il prima e il dopo sono nella stessa sessione.
- Screenshot: `qa-gstack-2026-10-25/screenshots/02-home.png` è già in italiano, dopo il cambio. Il misto inglese è nel testo catturato prima del click.
- Passi: 1. Impostazioni, lingua app su English. 2. Leggere barra e corpo. 3. Passare a Italiano e rileggere la barra.

### F6 — «Proprietaria» su un proprietario di nome Roberto

- Gravità: bassa
- Categoria: contenuto
- Schermata: scheda cane QAtest2
- Observed: Nella scheda di QAtest2 il telefono di Roberto QA è etichettato «Proprietaria».
- Expected: il ruolo non forza il femminile se il nome non lo indica, oppure il campo sesso del proprietario è esplicito.
- Evidence: testo «3331234567 · Proprietaria · Principale» sotto Roberto QA.
- Confirmation: osservato una volta, sulla scheda appena salvata.
- Passi: 1. Creare un cane con proprietario «Roberto QA». 2. Aprire la scheda in lettura, sezione Contatti.

### F7 — Due appuntamenti restano «Cane assente»

- Gravità: media
- Categoria: funzionale
- Schermata: Home, Da chiudere
- Observed: A dati assestati, due appuntamenti del sabato 10 ottobre restano «Cane assente», con Apri disabilitato e Completato / Disdetto ancora attivi.
- Expected: il nome del cane, oppure una spiegazione che la scheda non c'è più e le azioni di chiusura coerenti con quello stato.
- Evidence: dopo l'attesa di assestamento, il testo stabile contiene «sab 10 ott 09:15 … Cane assente» e «sab 10 ott 11:30 … Cane assente». Nello snapshot, «Apri Cane assente» è `disabled` e «Completato cane» / «Disdetto cane» no. Durante il caricamento quegli slot hanno mostrato per un attimo Kratos e Penny (F1), poi sono tornati «Cane assente».
- Confirmation: presente nel testo assestato, non solo nel fotogramma di caricamento.
- Passi: 1. Home del salone 1, aspettare che i nomi veri siano tornati. 2. Scorrere «Da chiudere» fino al 10 ottobre.

## Punteggi

Copertura parziale. Performance e accessibilità non sono state misurate e non entrano nella media. I punteggi sono provvisori.

| Categoria | Peso | Punti | Perché |
| --- | --- | --- | --- |
| Consolle | 15% | 100 | Nessun errore di prodotto ripetuto a pagina piena. L'overlay `loginSchema is not defined` è contato a parte, sotto i limiti, perché è arrivato durante l'hot reload dei file sporchi |
| Link | 10% | 100 | Le route aperte hanno risposto. I link legali esterni non sono stati seguiti |
| Visuale | 10% | 92 | F2, −8 |
| Funzionale | 20% | 61 | F1 −15, F3 −8, F4 −8, F7 −8 |
| UX | 15% | 100 | Nessun finding tenuto in questa categoria |
| Contenuto | 5% | 89 | F5 −8, F6 −3 |
| Performance | 10% | non misurata | esclusa |
| Accessibilità | 15% | non misurata | esclusa |

Media sulle categorie misurate (peso 0,75): (15 + 10 + 9,2 + 12,2 + 15 + 4,45) / 0,75 = 87,8, arrotondata a **88**.

## Top 3

1. Subito dopo una navigazione, home e impostazioni mostrano per circa due secondi dati vuoti o sbagliati (incassi € 0, mensili 0/0, archivio 0, avviso partita IVA, cani «Cane assente» o nomi di un altro giro), poi si correggono da soli.
2. A dati assestati, due appuntamenti del sabato 10 ottobre restano «Cane assente», con Apri disabilitato e Completato / Disdetto ancora attivi.
3. Nel foglio Completare, con prezzo 45, durata 1h15 e Contanti già selezionato, «Salva e completa» resta disabilitato; l'appuntamento si chiude solo con «Nessuna modifica».

## Test proposti

Non scritti nel progetto. Solo proposte.

1. Home non pubblica zeri prima dei dati del salone.
   Value: protects=la home non mostra incassi 0 e mensili 0/0 quando il salone ha già cifre; fails_when=il primo render dopo la navigazione legge lo stato vuoto come se fosse vero; why_new=non c'è un test di pagina che aspetti il primo testo visibile e poi quello assestato; seam=none; no_claim=il test con store finto non prova la latenza di Firestore
2. «Salva e completa» si abilita con pagamento selezionato.
   Value: protects=il foglio Completare abilita Salva e completa se prezzo, durata e Contanti sono valorizzati; fails_when=il bottone resta disabled dopo la scelta di Contanti; why_new=il flusso osservato usa Nessuna modifica e non copre il bottone principale; seam=none; no_claim=non prova il salvataggio su Firestore vero
3. Copia veloce sul web lascia un esito visibile.
   Value: protects=Copia veloce mostra un esito o avvia un download se navigator.share manca; fails_when=lo zip nasce e la pagina non cambia; why_new=il backup non ha una prova browser sul ramo share assente; seam=none; no_claim=non prova Google Drive né il filesystem Capacitor

## Cosa non è stato possibile testare, e perché

- Fotocamera e galleria del cane. Il pulsante «Foto del cane» c'è. Non è stato usato: nel browser non c'è la fotocamera Capacitor. Non testabile sul web.
- Notifiche push. In impostazioni si legge «Push spente». Non è stato chiesto il permesso di sistema né provata una notifica locale. Non testabile sul web come canale nativo.
- Condividi del listino. `navigator.share` non esiste in questo browser. Il click non ha creato un file e non ha mostrato un errore. Non testabile sul web come condivisione nativa. Scarica, invece, ha creato il PDF.
- Stampa di sistema. Il pulsante Stampa non è stato premuto, per non aprire il dialogo di stampa del sistema operativo.
- Google Drive, «Salva ora», ZIP senza foto, Completo con foto, Ripristina da un file. Sono nel foglio Backup. Non sono stati eseguiti: Drive e il selettore file sono ponti nativi. Non testabile sul web, a parte Copia veloce che è stata provata (F4).
- Piano Salone e accensione del Piano Pro. La pagina Funzioni Pro, per questo titolare, mostra solo «Non attivo» e la frase «Accendi il piano per invitare un socio o un collaboratore». Non c'è un interruttore. Nel codice il toggle è riservato all'operatore (`operator ? <Toggle …>`). Non è stato trattato come bug del titolare. Le Cloud Functions dell'emulatore non si sono caricate (`Failed to load function definition`, timeout 10 secondi): un'azione che le chiama non era verificabile comunque.
- Link Privacy, Termini, DPA, «Come eliminare l'account». Puntano all'hosting del progetto vero. Non aperti, per la regola di fermarsi su `groomly-3128b`.
- Pagamento reale, Play Billing, invito di un socio. Fuori dal salone finto e dalle functions spente.
- Accessibilità sistematica (ordine di fuoco, contrasto misurato, lettore di schermo) e tempi di performance. Non misurati.
- La variante Android / Capacitor. Questa sessione è solo il browser su Vite emu.

## Note di ambiente, non conteggiate come bug di prodotto

- All'avvio, `firebase emulators:start` con il Java di sistema (17) si è fermato. Gli emulatori sono ripartiti con il JDK 21 già presente in `%LOCALAPPDATA%\jdk21\jdk-21.0.12.1+1`, senza toccare i file del repository. Auth e Firestore hanno scritto «All emulators ready». Le functions no.
- Il seed è `npx vite-node scripts/test360/seed.ts` con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` e `GCLOUD_PROJECT=demo-groomly`. Senza quelle variabili lo script si ferma da solo. Esito: `FATTO 21`.
- Durante il login, Vite stava ancora applicando l'hot reload dei file locali non committati. Una volta lo schermo è diventato «Unexpected Application Error! loginSchema is not defined» in `LoginPage.tsx`. Un reload completo ha ridato il form, e il login è andato. Il file sul disco, a fine prova, usa `loginSchemaPer`, non `loginSchema`. Non è stato riprodotto a pagina fredda. Screenshot: `qa-gstack-2026-10-25/screenshots/01-login-crash.jpeg`.
- Gli screenshot del browser includono, a destra della colonna da 390 px, lo spazio vuoto della finestra più larga. Il layout misurato è 390×844.

## Screenshot

- `qa-gstack-2026-10-25/screenshots/01-login-crash.jpeg`
- `qa-gstack-2026-10-25/screenshots/02-home.png`
- `qa-gstack-2026-10-25/screenshots/03-cani.jpeg`
- `qa-gstack-2026-10-25/screenshots/04-impostazioni-chiaro.jpeg`
- `qa-gstack-2026-10-25/screenshots/04-impostazioni-scuro.png`
- `qa-gstack-2026-10-25/screenshots/05-pro.jpeg`
- `qa-gstack-2026-10-25/screenshots/06-listino-stampa.jpeg`
