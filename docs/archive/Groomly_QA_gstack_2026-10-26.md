# QA Groomly — 26 ottobre 2026

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

## F1–F7

| ID | Esito | In una riga |
| --- | --- | --- |
| F1 | non risolto | Al ricaricamento completo la prima pittura mostra ancora dati di un altro stato (€ 0, archivio 0, Kratos e Penny, avviso partita IVA). Nella navigazione interna compare «Carico l'agenda…» e poi i dati veri. |
| F2 | risolto | A 390 px, «▼ 17% vs settembre» sta su una riga sola. |
| F3 | risolto | Con prezzo 45, 1h15 e Contanti premuto, «Salva e completa» si abilita e chiude la visita. |
| F4 | risolto | Senza `navigator.share`, Copia veloce mostra «Copia scaricata: groomly-export.zip» e crea uno zip. |
| F5 | risolto | Inglese e spagnolo cambiano barra e corpo. Restano alcune stringhe italiane, elencate sotto. |
| F6 | risolto | Roberto QA è «Proprietario», non «Proprietaria». |
| F7 | risolto | A dati assestati i due slot del 10 ottobre non ci sono. La cache vecchia, prima di essere tolta, spiegava «La scheda non è più nel salone» e offriva «Rimuovi dalla lista». |

## Metadati

- Data: 2026-10-26
- Branch: `main`. Commit di questa sessione, solo `.gitignore`: `fa3a344`. Non è stato fatto push. Il resto del lavoro locale non committato non è stato toccato.
- Chiamata: /qa-only. Nessuna modifica al codice dell'app.
- Modalità: Full, con riverifica di F1–F7 del report del 25 ottobre.
- Superficie: browser, `http://127.0.0.1:5173`, Vite già in ascolto con `--mode emu --host 127.0.0.1 --port 5173`. Non è stato avviato un secondo server. La pagina è stata ricaricata a server caldo.
- Viewport misurato: 390×844. Fuso misurato: `Europe/Rome`. `navigator.language` è rimasto `en-US`: l'override di locale del browser non ha cambiato quella proprietà. L'app, a lingua Italiana, mostrava comunque l'italiano.
- Isolamento: Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`, Functions `127.0.0.1:5001`, progetto `demo-groomly`. Il modulo servito da Vite ha `MODE=emu`, `VITE_EMULATORS=1` e `VITE_FIREBASE_PROJECT_ID=demo-groomly`.
- Identità: `salone1@test.groomly`. La password non è in questo report.
- Driver: browser di Cursor. Aside non c'è su Windows. `browse.exe` di gstack risponde, ma i suoi comandi non impostano lingua, fuso né rete spenta.
- JDK usato per gli emulatori: 21.0.12.1 in `%LOCALAPPDATA%\jdk21`. Il Java di sistema è il 17 e non è stato usato.
- Seed: `FATTO 21`.
- Functions: caricate, incluse `avviaProva` e `setSalonPro`. L'emulatore ha scritto «All emulators ready» sul progetto demo.
- Probe budget: il tetto Full della procedura è 900 secondi. La richiesta chiedeva l'intera lista, quindi i controlli sono andati avanti fino a coprire i contratti o a segnarli come non raggiungibili.
- Total session elapsed: unmeasured.
- Rete: nelle risorse di pagina raccolte non compare `groomly-3128b`, né `googleapis.com`, né `groomlyapp.it`, né `github.com`. Un database IndexedDB locale si chiama `firestore/[DEFAULT]/groomly-3128b/main`. Non è stato letto né cancellato. È una cache del browser, non una richiesta di rete.

## Charters

### C1 — Login e ricarica a caldo

- Contratto: il form di accesso accetta il salone 1 e apre la home del salone finto. La ricarica a server caldo non manda l'app sul progetto vero.
- Rischio: Vite in `--mode emu` che però parla con `groomly-3128b`.
- Entrypoint: `http://127.0.0.1:5173`
- Isolamento: solo `127.0.0.1` e, se l'avviso aggiornamento parte, l'hosting pubblico già previsto. Un host `groomly-3128b` chiude la prova.
- Uscita: home visibile, elenco host raccolto.

### C2 — F1, prima pittura

- Contratto: subito dopo una navigazione, home e impostazioni non mostrano incassi € 0, mensili 0/0, archivio 0 o «Cane assente» al posto dei dati veri.
- Rischio: il fotogramma sbagliato dura meno di un secondo e sfugge.
- Entrypoint: Home, poi Impostazioni, poi di nuovo Home.
- Isolamento: sola lettura.
- Uscita: testo del primo istante e testo assestato, a circa due secondi.

### C3 — F2, card Incassi a 390 px

- Contratto: nella card Incassi e report, percentuale e confronto con il mese precedente non spezzano «settembre» da solo su una riga rossa.
- Rischio: il difetto c'è solo a 390 px.
- Entrypoint: Impostazioni.
- Isolamento: sola lettura.
- Uscita: screenshot della card.

### C4 — F3, Salva e completa

- Contratto: nel foglio Completare, con prezzo, durata e Contanti già scelti, «Salva e completa» è utilizzabile.
- Rischio: chiudere l'appuntamento cambia gli incassi del salone finto.
- Entrypoint: Home, Da chiudere, Nala del 23 ottobre se presente.
- Isolamento: emulatore demo. Se il bottone è abilitato, un solo salvataggio per confermare che agisce.
- Uscita: stato del bottone prima del click e, se premuto, l'effetto su Da chiudere.

### C5 — F4, Copia veloce

- Contratto: Copia veloce, se il browser non ha `navigator.share`, mostra un esito oppure scarica lo zip.
- Rischio: il file nasce in memoria e non arriva a chi usa l'app.
- Entrypoint: Impostazioni, Backup, Copia veloce.
- Isolamento: niente Drive, niente ripristino, niente link legali.
- Uscita: testo della pagina e traccia di `createObjectURL` / download.

### C6 — F5, lingua English

- Contratto: con la lingua dell'app su English, barra e corpo delle impostazioni sono in inglese.
- Rischio: restano titoli italiani.
- Entrypoint: Impostazioni, lingua.
- Isolamento: la lingua si può riportare su Italiano prima delle altre prove.
- Uscita: testo di barra e corpo.

### C7 — F6, Proprietaria

- Contratto: un proprietario di nome Roberto non è etichettato «Proprietaria» solo per il ruolo.
- Rischio: creare un cane di prova sporca l'elenco. Il cane resta sull'emulatore, che si spegne a fine prova.
- Entrypoint: scheda cane. Se QAtest2 non c'è più dopo il seed, si crea un cane con proprietario «Roberto QA».
- Isolamento: emulatore demo.
- Uscita: riga del contatto in lettura.

### C8 — F7, Cane assente

- Contratto: a dati assestati, gli appuntamenti del 10 ottobre mostrano il cane, oppure spiegano che la scheda non c'è e le azioni sono coerenti.
- Rischio: confonderlo con il fotogramma di caricamento di F1.
- Entrypoint: Home, Da chiudere, dopo l'attesa.
- Isolamento: sola lettura, nessun Completato su quegli slot.
- Uscita: testo stabile.

### C9 — Offline a metà sessione

- Contratto: con la rete del browser spenta, home, agenda e cani restano visibili e mostrano «Dati non aggiornati · offline». Riaccendendo, l'avviso sparisce.
- Rischio: spegnere la rete del computer invece di quella del browser, o colpire l'emulatore.
- Entrypoint: sessione già entrata, poi le tre schermate.
- Isolamento: solo l'emulazione di rete del browser. Gli emulatori restano accesi.
- Uscita: testo offline e testo dopo il ritorno online.

### C10 — Prova Pro, piano, funzioni

- Contratto: il titolare può avviare la prova gratuita, il piano risulta attivo e una funzione Pro si apre.
- Rischio: la callable `avviaProva` fallisce o il paywall non parte.
- Entrypoint: Impostazioni, «Prova Pro gratis per 30 giorni», poi una funzione Pro (prenotazioni o statistiche).
- Isolamento: nessun pagamento, nessun link esterno di acquisto.
- Uscita: stato del piano prima e dopo.

### C11 — Piano Salone e collaboratori

- Contratto: si può attivare il piano Salone e invitare un collaboratore.
- Rischio: l'interruttore è solo per l'operatore e questo account non lo è. In quel caso il contratto è «non raggiungibile», non un successo inventato.
- Entrypoint: Funzioni Pro e, se visibile, la pagina utenti.
- Isolamento: niente email vera. Se l'invito parte, l'indirizzo è `collaboratore-qa@test.groomly`.
- Uscita: schermata vista e messaggio della callable, se c'è.

### C12 — Pagina pubblica e prenotazione

- Contratto: il titolare pubblica la pagina e una prenotazione online si può inviare senza uscire dagli emulatori.
- Rischio: la pagina non ha un indirizzo nel server Vite, oppure la richiesta esce verso l'hosting vero.
- Entrypoint: Impostazioni, attività, «Pubblica la pagina», poi l'indirizzo che l'app mostra.
- Isolamento: stop se l'indirizzo non è locale.
- Uscita: esito della pubblicazione e, se la pagina si apre in locale, un invio di prova.

### C13 — English e Español

- Contratto: un giro breve (home, agenda, cani, impostazioni) è nella lingua scelta.
- Rischio: stringhe mescolate, come F5.
- Entrypoint: Impostazioni, lingua, poi le tre schermate.
- Isolamento: alla fine la lingua torna su Italiano.
- Uscita: testo di ogni schermata.

## Risultati che hanno funzionato

- Login di `salone1@test.groomly`: entra in Toelettatura Sassari, partita IVA `01234567891`, telefono `079 588531`, indirizzo Via Roma 1, Sassari.
- Home assestata: domenica 25 ottobre (ora di Roma), nessun appuntamento oggi, Da chiudere con Nala (sab 24 ott 09:05, Labrador, Greco) e Fido (10:20), mensili 18/18, incassi di oggi € 0.
- Animali: 58 attivi, 38 mensili, 20 occasionali, 2 in archivio. Dopo la creazione di QAtest26: 59 attivi e 21 occasionali.
- Agenda del 25 ottobre: griglia oraria vuota, «0 cani · 0m stimate».
- Impostazioni assestate, prima della prova offline: ottobre 2026 € 3.339, poi € 3.384 dopo la chiusura di Nala.
- La lingua dell'app è stata rimessa su Italiano a fine giro.

## Findings

### F1 — Prima pittura al ricaricamento completo

- Gravità: alta
- Categoria: funzionale
- Schermata: Home e Impostazioni, al caricamento del documento
- Observed: Al ricaricamento completo la prima pittura mostra ancora dati di un altro stato (€ 0, archivio 0, Kratos e Penny, avviso partita IVA). Nella navigazione interna compare «Carico l'agenda…» e poi i dati veri.
- Expected: la prima pittura utile mostra già i dati del salone, oppure uno stato di caricamento, non cifre e nomi di un altro stato.
- Evidence: lo snapshot del ricaricamento di `/` elenca «Apri Kratos», «Apri Penny», «0/0 Mensili ott», «Incassi di oggi: 0 euro» e «Aggiungi partita IVA o codice fiscale». Il campione partito subito dopo, a 0 ms, legge già Nala e 18/18, senza l'avviso offline. Lo snapshot di un caricamento completo di `/impostazioni` ha il link «Incassi e report NUOVO Ottobre 2026 € 0» e «Archivio animali 0 in archivio». A 2,5 secondi l'archivio è «2 in archivio»; dopo la pulizia della sola cache demo e un nuovo caricamento, il testo a 0 ms del campione è «€ 3.384». Nella navigazione interna verso Home lo snapshot dice «Carico l'agenda…» e «… Mensili ott», e due secondi dopo il testo ha Nala, Fido e 18/18.
- Confirmation: il fotogramma sbagliato del ricaricamento è stato visto su Home e, due volte, su Impostazioni. Il loader della navigazione interna è stato visto su Home in italiano, inglese («Loading the diary…») e spagnolo («Cargando la agenda…»).
- Hypothesis: la prima pittura legge ancora la copia locale, e il loader copre solo il cambio di route. Non verificato nel codice durante la scoperta.
- Screenshot: `qa-gstack-2026-10-26/screenshots/01-home-assestata.png` è la home già assestata, non il fotogramma sbagliato.

### F2 — Card Incassi a 390 px

- Gravità: risolta, non entra nel punteggio
- Observed: A 390 px, «▼ 17% vs settembre» sta su una riga sola.
- Expected: percentuale e confronto stanno sulla stessa riga, oppure l'andare a capo non isola la parola «settembre».
- Evidence: screenshot `qa-gstack-2026-10-26/screenshots/02-impostazioni-incassi.png`. Il testo era «Ottobre 2026 € 3.339 · ▼ 17% vs settembre». A fine giro, dopo la chiusura di Nala, il nome accessibile del link è «Incassi e report NUOVO Ottobre 2026 € 3.384 · ▼ 16% vs settembre».
- Confirmation: visto nello screenshot e di nuovo nel nome accessibile a fine sessione.

### F3 — Salva e completa

- Gravità: risolta, non entra nel punteggio
- Observed: Con prezzo 45, 1h15 e Contanti premuto, «Salva e completa» si abilita e chiude la visita.
- Expected: con prezzo, durata e pagamento scelti, «Salva e completa» è utilizzabile.
- Evidence: Nala del 24 ottobre (nel seed di oggi non c'è quella del 23). All'apertura del foglio Prezzo vale 45, Ore 1, Minuti 15, e sia «Salva e completa» sia «Nessuna modifica» sono `disabled`. Dopo il click su Contanti, Contanti è `pressed` e «Salva e completa» non ha più lo stato disabled. Il click porta «Da chiudere» da 2 a 1 e toglie Nala. L'ottobre delle impostazioni passa da € 3.339 a € 3.384.
- Confirmation: un solo foglio, Nala. Il salvataggio è stato eseguito una volta.

### F4 — Copia veloce

- Gravità: risolta, non entra nel punteggio
- Observed: Senza `navigator.share`, Copia veloce mostra «Copia scaricata: groomly-export.zip» e crea uno zip.
- Expected: un messaggio di esito, oppure un download, se la condivisione nativa non c'è.
- Evidence: `typeof navigator.share` è `undefined`. `URL.createObjectURL` riceve un blob `application/zip` (due volte, perché il click è stato ripetuto per non perdere il messaggio). Un osservatore sul testo ha registrato «Copia scaricata: groomly-export.zip». Lo snapshot accessibile, preso un attimo dopo, non contiene il messaggio: dura poco.
- Confirmation: il messaggio è stato catturato al secondo click. Il primo click aveva già creato lo zip, ma il messaggio era già sparito quando il testo è stato letto. Non è stato verificato che il file sia finito nella cartella Download del sistema: il browser di prova non consegna i download.

### F5 — Lingue

- Gravità: risolta sul contratto del 25 ottobre. Restano stringhe singole, gravità bassa, categoria contenuto.
- Observed: Inglese e spagnolo cambiano barra e corpo. Restano alcune stringhe italiane, elencate sotto.
- Expected: una lingua per tutta la schermata.
- Evidence: con English, impostazioni e barra sono Settings, Business, Pro plan, Earnings and reports, Pet archive, Home, Pets, Diary, Monthly, Price list. La home assestata è «Sunday 25 October», «TO CLOSE (1)», «Completed», «No-show», «Cancelled». I cani sono Dogs, Active 58, Biters, Seniors, Cats. Restano «Partita IVA», «Ottobre 2026» sulla riga incassi, «Torna agli animali» nel nuovo cane, e sulla scheda «Nessun appuntamento» più la parola «Proprietario». Con Español: Ajustes, Ingresos e informes, Inicio, Mascotas, Agenda, «Cargando la agenda…», «Día / Semana / Mes», «0 perros · 0m estimados», Activos 59. Anche lì la riga incassi dice «Ottobre 2026». «Privacy» e «DPA» restano così in tutte e tre le lingue.
- Confirmation: il prima e il dopo della lingua app sono nella stessa sessione. Il giro spagnolo ha coperto impostazioni, home, agenda e cani. A fine prova la lingua app è di nuovo Italiano.

### F6 — Proprietario

- Gravità: risolta, non entra nel punteggio
- Observed: Roberto QA è «Proprietario», non «Proprietaria».
- Expected: il ruolo non forza il femminile se il nome non lo indica.
- Evidence: QAtest2 non c'era dopo il seed. È stato creato QAtest26, Barboncino, proprietario «Roberto QA», telefono 3331234567. Il testo della scheda contiene «3331234567 · Proprietario · Primary».
- Confirmation: una scheda, appena salvata. La parola è al maschile. In quella schermata, a lingua English, «Proprietario» è comunque italiano: è contato tra i residui di F5, non come il bug del femminile.

### F7 — Cane assente del 10 ottobre

- Gravità: risolta sui dati assestati, non entra nel punteggio
- Observed: A dati assestati i due slot del 10 ottobre non ci sono. La cache vecchia, prima di essere tolta, spiegava «La scheda non è più nel salone» e offriva «Rimuovi dalla lista».
- Expected: il nome del cane, oppure una spiegazione che la scheda non c'è più e le azioni di chiusura coerenti con quello stato.
- Evidence: a home assestata, «Da chiudere (2)» contiene solo Nala del 24 ottobre e Fido del 24 ottobre. Non c'è «sab 10 ott». Prima di cancellare la cache IndexedDB del solo progetto `demo-groomly`, la home ferma mostrava «sab 10 ott 09:15» e «sab 10 ott 11:30», «Cane assente», «La scheda non è più nel salone», «Apri Cane assente» disabled e «Rimuovi dalla lista». Non c'erano Completato né Disdetto su quegli slot.
- Confirmation: l'assenza nei dati assestati è stata riletta dopo il login e dopo i ricaricamenti che hanno raggiunto Nala e Fido. La frase nuova è stata vista una volta, sulla cache precedente, non ripetuta sui dati del server.

### N1 — L'avviso offline non segue la rete

- Gravità: media
- Categoria: funzionale
- Schermata: Home, Agenda, Animali
- Observed: Con la rete del browser spenta, home, agenda e cani restano visibili. L'avviso «Dati non aggiornati · offline» compare sulla home e non su agenda e cani. Riaccendendo la rete, l'avviso sulla home non sparisce.
- Expected: le tre schermate restano visibili e mostrano l'avviso. Riaccendendo, l'avviso sparisce.
- Evidence: `navigator.onLine` è stato portato a false con l'emulazione di rete del browser. Gli emulatori sono rimasti in ascolto: una fetch a `http://127.0.0.1:8080/` fatta dopo il ritorno online ha risposto 200. Offline, la home mostra l'avviso, Fido e 18/18. L'agenda mostra la griglia del 25 ottobre senza la frase. I cani mostrano «58 attivi · 2 in archivio» e Bobby, senza la frase. Dopo `offline: false`, `navigator.onLine` è true e l'avviso è ancora nel testo per 8 secondi di campione, e ancora dopo un giro Animali → Home. A fine sessione, con la lingua di nuovo su Italiano e l'ottobre già a «€ 3.384 · ▼ 16% vs settembre», lo snapshot di Impostazioni contiene ancora «Dati non aggiornati · offline».
- Confirmation: l'avviso sulla sola home, e la sua permanenza dopo il ritorno online, sono stati visti nella stessa sessione. Non è stato un singolo fotogramma: il campione da 8 secondi non ha un intervallo senza avviso.
- Hypothesis: l'avviso resta acceso anche quando i numeri in pagina sono già quelli del server. La causa non è stata verificata nel codice.

## Piani Pro e Salone

Non raggiungibili da `salone1@test.groomly`. Non è contato come bug del titolare, come nel report del 25 ottobre.

- In impostazioni non c'è «Prova Pro gratis per 30 giorni» né «Il tuo piano».
- Funzioni Pro, a testo fermo: «Piano Pro / Non attivo» e «Accendi il piano per invitare un socio o un collaboratore in questa toelettatura». Nessun interruttore.
- `/impostazioni/piano` mostra solo il titolo «Il tuo piano».
- `/impostazioni/utenti` rimanda a Impostazioni.
- Il foglio Attività ha ragione sociale, partita IVA, nome, codice fiscale, telefono, indirizzo e Salva. Non ha «Pubblica la pagina».
- Nessun invito è stato inviato. Nessuna pagina pubblica è stata aperta. Nessuna prenotazione online è stata mandata.
- Le functions `avviaProva`, `setSalonPro`, `pubblicaSalone` e `inviaRichiesta` risultano caricate sull'emulatore. Da questa sessione non sono state chiamate, perché l'interfaccia del titolare non le offre.

## Punteggi

Copertura parziale. Performance e accessibilità non sono state misurate e non entrano nella media. I punteggi sono provvisori. F2, F3, F4, F6 e F7 non tolgono punti: il comportamento del 25 ottobre non si ripresenta. F5 è risolto sul contratto originale; il residuo di stringhe entra nel contenuto.

| Categoria | Peso | Punti | Perché |
| --- | --- | --- | --- |
| Consolle | 15% | 100 | Sulle ricariche in cui gli errori erano agganciati, l'elenco è rimasto vuoto. Non è una raccolta su ogni pagina. |
| Link | 10% | 100 | Le route aperte hanno risposto. Privacy, Termini, DPA e «Come eliminare l'account» non sono stati aperti. |
| Visuale | 10% | 100 | La card Incassi a 390 px non spezza più «settembre». |
| Funzionale | 20% | 77 | F1 −15, N1 −8 |
| UX | 15% | 100 | Nessun finding tenuto in questa categoria |
| Contenuto | 5% | 97 | Residui di F5, −3 |
| Performance | 10% | non misurata | esclusa |
| Accessibilità | 15% | non misurata | esclusa |

Media sulle categorie misurate (peso 0,75): (15 + 10 + 10 + 15,4 + 15 + 4,85) / 0,75 = 93,7, arrotondata a **94**.

## Top 3

1. Al ricaricamento completo la prima pittura mostra ancora dati di un altro stato (€ 0, archivio 0, Kratos e Penny, avviso partita IVA). Nella navigazione interna compare «Carico l'agenda…» e poi i dati veri.
2. Con la rete del browser spenta, home, agenda e cani restano visibili. L'avviso «Dati non aggiornati · offline» compare sulla home e non su agenda e cani. Riaccendendo la rete, l'avviso sulla home non sparisce.
3. Inglese e spagnolo cambiano barra e corpo. Restano alcune stringhe italiane: «Partita IVA», «Ottobre» nella riga incassi in inglese, «Torna agli animali», «Nessun appuntamento» e «Proprietario» sulla scheda.

## Test proposti

Non scritti nel progetto. Solo proposte.

1. Il ricaricamento completo non pubblica Kratos né € 0 prima dei dati del salone.
   Value: protects=la prima pittura dopo un load di / e /impostazioni non mostra Kratos, 0/0, archivio 0 o € 0 se il salone ha già cifre; fails_when=lo snapshot iniziale del documento contiene quei valori; why_new=la navigazione interna ora mostra un loader, il load del documento no; seam=none; no_claim=un test con store finto non prova il primo frame del browser
2. L'avviso offline segue la rete del browser sulle tre schermate.
   Value: protects=home, agenda e cani mostrano l'avviso a rete spenta e lo tolgono quando navigator.onLine torna true; fails_when=l'avviso manca su agenda o cani, oppure resta sulla home dopo il ritorno online; why_new=il test di pagina esistente copre la frase, non queste tre route né la sparizione; seam=none; no_claim=l'emulazione di rete del browser non è la rete del telefono

## Cosa non è stato possibile testare, e perché

- Prova gratuita, attivazione del piano, funzioni Pro oltre la pagina «Non attivo», piano Salone, invito di un collaboratore, pagina pubblica e prenotazione online. Il titolare di questo salone non ha i controlli. Dettaglio nella sezione piani.
- Fotocamera, galleria, notifiche push, Google Drive, selettore di ripristino, stampa di sistema. Ponti nativi, non usati.
- Il file di Copia veloce nella cartella Download del sistema.
- Link legali. Puntano a `groomlyapp.it`. Non aperti.
- Accessibilità sistematica e tempi di performance.
- La variante Android.

## Note di ambiente

- Gli emulatori sono partiti con il JDK 21. Auth, Firestore e Functions erano pronti prima del seed. Il log delle functions elenca `avviaProva` e `setSalonPro`.
- Il seed è `npx vite-node scripts/test360/seed.ts` con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` e `GCLOUD_PROJECT=demo-groomly`. Esito: `FATTO 21`.
- Vite era già acceso con `--mode emu`. È stato lasciato acceso a fine prova. Gli emulatori avviati in questa sessione sono stati spenti.
- Due volte è stata cancellata solo la cache IndexedDB `firestore/[DEFAULT]/demo-groomly/main`, perché la home restava sui dati vecchi senza arrivare al server. La cache con il nome del progetto vero non è stata toccata.
- Azioni sull'emulatore che restano finché il processo non si spegne: Nala del 24 ottobre chiusa a € 45, e il cane QAtest26.
- Lo screenshot della home include, a destra della colonna da 390 px, lo spazio vuoto della finestra più larga.

## Screenshot

- `qa-gstack-2026-10-26/screenshots/01-home-assestata.png`
- `qa-gstack-2026-10-26/screenshots/02-impostazioni-incassi.png`
