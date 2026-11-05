# Audit delle cinque lingue (T7)

Verifica finale del progetto `docs/superpowers/specs/archive/2026-11-04-cinque-lingue-design.md`, fatta il 5 novembre 2026 sul branch `claude/eager-tesla-21ceef`.

## Esito

Tutte le 340 righe della tabella in fondo sono a posto, dopo le correzioni. Resta **una domanda per Roberto**: il logo con la scritta «TOELETTATURA». Resta anche ciò che non si è potuto provare, elencato qui sotto.

| Controllo | Risultato |
|---|---|
| Schermate, sei profili, cinque lingue, 320, 360 e 390 px | 3.325 misure di rotte e pagine senza accesso, nessun errore |
| Dialoghi, fogli e pop-up riaperti in ogni lingua e larghezza | 3.338 misure |
| Pagine di `hosting` | 225 aperture: lingua giusta, nessuno sbordo, riga «fa fede l'italiano» presente in en, es, fr, de |
| Email | 120 generate e aperte a 320 e 390 px: nessuno sbordo, nessun carattere rotto |
| Pagine di esito e posto libero | 45 testi generati e letti |
| Push | 20 testi, 4 per lingua |
| PDF ed Excel incassi, Registro | 15 file in cinque lingue, riletti: ß, é, œ presenti |
| Flussi del cliente, invio vero, callable vere | 21 su 21 |
| Flussi dell'app | 33 su 33 |

I profili sono: titolare Salon, titolare Plus, titolare Go, collaboratore, salone vuoto, salone con invito alla beta.

## Cosa si è corretto

**Testi rimasti in un'altra lingua**
- Nomi predefiniti dei servizi in italiano in Home, agenda, scheda, appuntamento, Servizi, Incassi, giro di benvenuto, Registro Excel.
- Pagina di prenotazione e ricevuta al cliente: il browser tedesco leggeva «Bagno». Il server ora manda il nome tradotto per la lettura e salva sempre quello originale.
- Listino: razze, voci e saluto iniziali in Prezzi, Gestione e pagina Listino.
- Scritta «toelettatura» fissa sotto il logo del login.
- «1 di 3 posti» scritto a mano in Team. Il test `frasiFisse` non vede il testo dentro i tag: ora c'è un test che lo guarda.
- Messaggi WhatsApp: il servizio segue la lingua del messaggio, non quella dell'app.

**Testi tagliati o spezzati a 320 px**
- Home: «Nicht erschienen» usciva dal pulsante. I tre pulsanti ora prendono la larghezza che serve.
- Impostazioni: «Backup und Wiederherstellung» finiva sotto l'etichetta di stato.
- Backup: Tag, Woche, Monat si spezzavano lettera per lettera, anche in italiano.
- Stampa del listino: «Herunterladen» a pezzi. I pulsanti vanno a capo interi.
- Agenda del mese: «Geschlossen» invadeva le caselle vicine. Nuova parola breve `chiusoBreve`.
- Listino in francese: schede fuori dallo schermo, con scorrimento orizzontale.
- Testo scritto dal salone e titoli di pagina: ora vanno a capo con il trattino.

**Lingua**
- Date tedesche nei PDF ed Excel con i punti, `05.10.2026`.
- Francese: spazi insecabili mancanti in 13 frasi; ruolo minuscolo nell'invito.
- Tedesco: push di chiusura riscritta, `Noch offen: Luna. Der Termin ist bereits vorbei.`
- Il test `lingue.test` falliva per la scritta del segnaposto in un commento di `debitoLingue.ts`.

## Flussi provati

Il dettaglio sta negli script `verify-lingue-flussi.cjs` e `verify-lingue-app.cjs`.

- **Prenotazione da browser tedesco su salone italiano.** Pagina vera su emulatore hosting, modulo compilato, invio vero a `inviaRichiesta`. `richiesta.lingua` è `de`. Ricevuta, conferma, proposta e rifiuto in tedesco, link con `lang=de`, pagine dei link in tedesco, `dog.lingua` copiata.
- **Catena.** Titolare in inglese, clienti in italiano, richiesta senza lingua: email in italiano.
- **Pagina pubblica.** `pt-BR` va in inglese, `?lang=fr` vince sul browser tedesco.
- **Errori.** Il limite vero di richieste si legge in tedesco sulla pagina. Il server manda `details.codice` e tiene il messaggio italiano per le APK vecchie.
- **Lista d'attesa.** L'iscritto salva `lingua: de`.
- **Telefono.** `pt-BR`, `pt-PT`, `ja-JP` vanno in inglese; `de`, `fr`, `es`, `it` nella loro lingua, qualunque sia il fuso.
- **Chi ha già l'app.** Resta nella lingua di prima e la scelta si salva. Telefono inglese in Italia: italiano. Telefono tedesco a Berlino: inglese.
- **Cambio in tempo reale.** Cinque passaggi senza ricaricare, con `accounts.lingua` aggiornato ogni volta.
- **Telefono che decide.** Senza scelta, `accounts.lingua` diventa quella del telefono.

## Francese e tedesco in contesto

Ho letto tutte le email e le pagine di esito in francese e tedesco, le foto dei dialoghi tedeschi a 320 px e parte delle policy (termini ed eliminazione account). Un controllo automatico sui due cataloghi non trova *tu*, *du*, apostrofi dritti o virgolette sbagliate. Le policy hanno la riga «fa fede il testo italiano» in en, es, fr, de e i menu citati coincidono con l'app. Sono traduzioni di Claude: non le ha riviste né un madrelingua né un legale.

## Da decidere

**Logo con «TOELETTATURA».** Il file `groomly-logo-orizzontale.svg` ha la parola disegnata dentro. Si vede in italiano sulle pagine pubbliche, sulla pagina di prenotazione e in testa a ogni email, anche per un cliente tedesco. L'app non lo usa nella testata. È un disegno del marchio, quindi non l'ho toccato. La domanda è in `docs/DA-FARE-ROBERTO.md`.

## Non verificato

- **Telefono e WebView.** Tutto è girato in Chromium e su emulatori Firebase, non su un telefono o un emulatore Android. Da guardare sull'APK: il trattino automatico nella WebView, le notifiche locali, i canali in `values-fr` e `values-de`.
- **Push vere.** Testi generati e lingua dell'account coperti dai test, ma nessuna consegna a un dispositivo.
- **Email vere.** Nessuna è partita: Brevo era finto e `campioneEmail` in produzione non è stato chiamato. L'aspetto in Gmail e Outlook non è provato.
- **Coda automatica.** `giraCoda` e `scadiProposte` non sono girate sugli emulatori. I testi di promemoria, pronto, auguri, recensione e attesa sono stati letti, e la lingua per riga è coperta dai test.
- **Conferma della lista d'attesa** fino all'appuntamento: provata solo l'iscrizione.
- **Dialoghi.** Il giro tocca fino a 40 pulsanti per rotta, un livello. Non apre i dialoghi dentro i dialoghi, e un dialogo aperto solo in stati particolari può mancare. Gli stati della beta provati sono invito attivo e pagine senza invito.
- **Errori.** Dal vivo solo alcuni codici. Gli altri sono coperti dal test che chiede tutte le lingue.
- **PDF del listino.** Il foglio è stato visto a schermo, il file no. La sua lingua è quella scelta in Stampa, di proposito. I file generati sono PDF ed Excel degli incassi e il Registro.
- **Solo operatori.** Admin Manager, `DevKitPage` e `DevBetaPage` sono esclusi, come dice il progetto.
- **Catalogo QA.** `/qa-my-app:sync` non si può lanciare da una sessione. Ho aggiornato a mano impronte e sorgente di `/impostazioni/utenti`, senza riscrivere i 190 task. I task restano in italiano e vanno eseguiti con l'app in italiano.
- **Build.** Il worktree non ha `.env.local`: `npm run build` è verde con una chiave di prova.

Le misure del giro finale sono precedenti a tre ritocchi: pulsanti di Home, Backup, riga di Abbonamento in spagnolo. Li ho ricontrollati da soli dopo la modifica.

## Come rifare il giro

Emulatori con `firebase.lingue.json` e `NODE_OPTIONS=--require QA-tests/.qa-catalog/brevo-finto.cjs`, app con `npx vite --config QA-tests/.qa-catalog/vite-lingue.config.ts --mode emu --port 5190`, poi gli script `verify-*lingue*` di `QA-tests/.qa-catalog`. Su Git Bash, `--rotte` vuole `MSYS_NO_PATHCONV=1`.

## Schermata per schermata

Ruoli: T titolare Salon, P Plus, G Go, C collaboratore, V salone vuoto, B invito alla beta. `/listino/stampa` mostra il foglio nella lingua del listino, di proposito. «Va a capo con il trattino» vuol dire che una parola lunga si divide con il trattino al punto giusto, di solito solo a 320 px.

| Schermata | Lingua | Ruoli | Larghezze | Misure | Dialoghi | Esito |
|---|---|---|---|---:|---:|---|
| `/` | it | B,C,G,P,T,V | 320,360,390 | 18 | 9 | ok |
| `/` | en | B,C,G,P,T,V | 320,360,390 | 18 | 9 | ok |
| `/` | es | B,C,G,P,T,V | 320,360,390 | 18 | 8 | ok |
| `/` | fr | B,C,G,P,T,V | 320,360,390 | 18 | 9 | ok |
| `/` | de | B,C,G,P,T,V | 320,360,390 | 18 | 8 | ok |
| `/animali` | it | C,G,P,T,V | 320,360,390 | 15 | 58 | ok |
| `/animali` | en | C,G,P,T,V | 320,360,390 | 15 | 63 | ok |
| `/animali` | es | C,G,P,T,V | 320,360,390 | 15 | 63 | ok |
| `/animali` | fr | C,G,P,T,V | 320,360,390 | 15 | 63 | ok |
| `/animali` | de | C,G,P,T,V | 320,360,390 | 15 | 63 | ok |
| `/animali/:id` | it | C,G,P,T | 320,360,390 | 12 | 15 | ok |
| `/animali/:id` | en | C,G,P,T | 320,360,390 | 12 | 15 | ok |
| `/animali/:id` | es | C,G,P,T | 320,360,390 | 12 | 15 | ok |
| `/animali/:id` | fr | C,G,P,T | 320,360,390 | 12 | 15 | ok |
| `/animali/:id` | de | C,G,P,T | 320,360,390 | 12 | 15 | ok |
| `/animali/attesa` | it | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/animali/attesa` | en | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/animali/attesa` | es | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/animali/attesa` | fr | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/animali/attesa` | de | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/animali/nuovo` | it | C,G,P,T,V | 320,360,390 | 15 | 29 | ok, va a capo con il trattino |
| `/animali/nuovo` | en | C,G,P,T,V | 320,360,390 | 15 | 27 | ok, va a capo con il trattino |
| `/animali/nuovo` | es | C,G,P,T,V | 320,360,390 | 15 | 28 | ok, va a capo con il trattino |
| `/animali/nuovo` | fr | C,G,P,T,V | 320,360,390 | 15 | 27 | ok, va a capo con il trattino |
| `/animali/nuovo` | de | C,G,P,T,V | 320,360,390 | 15 | 28 | ok, va a capo con il trattino |
| `/appuntamenti/:id` | it | C,G,P,T | 320,360,390 | 12 | 8 | ok |
| `/appuntamenti/:id` | en | C,G,P,T | 320,360,390 | 12 | 8 | ok |
| `/appuntamenti/:id` | es | C,G,P,T | 320,360,390 | 12 | 8 | ok |
| `/appuntamenti/:id` | fr | C,G,P,T | 320,360,390 | 12 | 8 | ok |
| `/appuntamenti/:id` | de | C,G,P,T | 320,360,390 | 12 | 8 | ok |
| `/appuntamenti/:id (completata)` | it | C,G,P,T | 320,360,390 | 12 | 12 | ok |
| `/appuntamenti/:id (completata)` | en | C,G,P,T | 320,360,390 | 12 | 12 | ok |
| `/appuntamenti/:id (completata)` | es | C,G,P,T | 320,360,390 | 12 | 12 | ok |
| `/appuntamenti/:id (completata)` | fr | C,G,P,T | 320,360,390 | 12 | 12 | ok |
| `/appuntamenti/:id (completata)` | de | C,G,P,T | 320,360,390 | 12 | 12 | ok |
| `/appuntamenti/nuovo` | it | C,G,P,T,V | 320,360,390 | 15 | 15 | ok, va a capo con il trattino |
| `/appuntamenti/nuovo` | en | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/appuntamenti/nuovo` | es | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/appuntamenti/nuovo` | fr | C,G,P,T,V | 320,360,390 | 15 | 15 | ok, va a capo con il trattino |
| `/appuntamenti/nuovo` | de | C,G,P,T,V | 320,360,390 | 15 | 15 | ok, va a capo con il trattino |
| `/appuntamenti/personale/:id` | it | C,G,P,T | 320,360,390 | 12 | 13 | ok |
| `/appuntamenti/personale/:id` | en | C,G,P,T | 320,360,390 | 12 | 13 | ok |
| `/appuntamenti/personale/:id` | es | C,G,P,T | 320,360,390 | 12 | 13 | ok |
| `/appuntamenti/personale/:id` | fr | C,G,P,T | 320,360,390 | 12 | 13 | ok |
| `/appuntamenti/personale/:id` | de | C,G,P,T | 320,360,390 | 12 | 13 | ok |
| `/appuntamenti/personale/nuovo` | it | C,G,P,T,V | 320,360,390 | 15 | 8 | ok |
| `/appuntamenti/personale/nuovo` | en | C,G,P,T,V | 320,360,390 | 15 | 8 | ok |
| `/appuntamenti/personale/nuovo` | es | C,G,P,T,V | 320,360,390 | 15 | 8 | ok |
| `/appuntamenti/personale/nuovo` | fr | C,G,P,T,V | 320,360,390 | 15 | 8 | ok |
| `/appuntamenti/personale/nuovo` | de | C,G,P,T,V | 320,360,390 | 15 | 8 | ok |
| `/benvenuto` | it | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/benvenuto` | en | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/benvenuto` | es | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/benvenuto` | fr | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/benvenuto` | de | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/benvenuto (passi)` | it | nuovo | 320,390 | 14 | 0 | ok |
| `/benvenuto (passi)` | en | nuovo | 320,390 | 14 | 0 | ok |
| `/benvenuto (passi)` | es | nuovo | 320,390 | 14 | 0 | ok |
| `/benvenuto (passi)` | fr | nuovo | 320,390 | 14 | 0 | ok |
| `/benvenuto (passi)` | de | nuovo | 320,390 | 14 | 0 | ok |
| `/calendario` | it | C,G,P,T,V | 320,360,390 | 15 | 96 | ok |
| `/calendario` | en | C,G,P,T,V | 320,360,390 | 15 | 96 | ok |
| `/calendario` | es | C,G,P,T,V | 320,360,390 | 15 | 96 | ok |
| `/calendario` | fr | C,G,P,T,V | 320,360,390 | 15 | 96 | ok |
| `/calendario` | de | C,G,P,T,V | 320,360,390 | 15 | 96 | ok |
| `/chiusure/:id` | it | C,G,P,T | 320,360,390 | 12 | 4 | ok |
| `/chiusure/:id` | en | C,G,P,T | 320,360,390 | 12 | 4 | ok |
| `/chiusure/:id` | es | C,G,P,T | 320,360,390 | 12 | 4 | ok |
| `/chiusure/:id` | fr | C,G,P,T | 320,360,390 | 12 | 4 | ok |
| `/chiusure/:id` | de | C,G,P,T | 320,360,390 | 12 | 4 | ok |
| `/chiusure/nuovo` | it | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/chiusure/nuovo` | en | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/chiusure/nuovo` | es | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/chiusure/nuovo` | fr | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/chiusure/nuovo` | de | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/impostazioni` | it | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/impostazioni` | en | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/impostazioni` | es | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/impostazioni` | fr | C,G,P,T,V | 320,360,390 | 15 | 3 | ok |
| `/impostazioni` | de | C,G,P,T,V | 320,360,390 | 15 | 3 | ok, va a capo con il trattino |
| `/impostazioni/abbonamento` | it | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/abbonamento` | en | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/abbonamento` | es | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok, ricontrollata dopo la correzione |
| `/impostazioni/abbonamento` | fr | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/abbonamento` | de | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/abbonamento/pro` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/abbonamento/pro` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/abbonamento/pro` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok, ricontrollata dopo la correzione |
| `/impostazioni/abbonamento/pro` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/abbonamento/pro` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/abbonamento/salone` | it | C,G,P,T,V | 320,360,390 | 15 | 34 | ok |
| `/impostazioni/abbonamento/salone` | en | C,G,P,T,V | 320,360,390 | 15 | 31 | ok |
| `/impostazioni/abbonamento/salone` | es | C,G,P,T,V | 320,360,390 | 15 | 35 | ok |
| `/impostazioni/abbonamento/salone` | fr | C,G,P,T,V | 320,360,390 | 15 | 31 | ok |
| `/impostazioni/abbonamento/salone` | de | C,G,P,T,V | 320,360,390 | 15 | 35 | ok |
| `/impostazioni/account` | it | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account` | en | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account` | es | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account` | fr | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account` | de | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account/elimina` | it | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account/elimina` | en | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account/elimina` | es | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account/elimina` | fr | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/account/elimina` | de | C,G,P,T,V | 320,360,390 | 15 | 15 | ok |
| `/impostazioni/aggiornamenti` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/aggiornamenti` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/aggiornamenti` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/aggiornamenti` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/aggiornamenti` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/archivio` | it | C,G,P,T,V | 320,360,390 | 15 | 4 | ok |
| `/impostazioni/archivio` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/archivio` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/archivio` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/archivio` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/avvisi` | it | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/avvisi` | en | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/avvisi` | es | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/avvisi` | fr | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/avvisi` | de | B,C,G,P,T,V | 320,360,390 | 18 | 0 | ok |
| `/impostazioni/beta` | it | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta` | en | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta` | es | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta` | fr | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta` | de | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/feedback` | it | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/feedback` | en | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/feedback` | es | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/feedback` | fr | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/feedback` | de | B | 320,360,390 | 3 | 0 | ok, va a capo con il trattino |
| `/impostazioni/beta/fine` | it | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/fine` | en | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/fine` | es | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/fine` | fr | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/beta/fine` | de | B | 320,360,390 | 3 | 0 | ok |
| `/impostazioni/info` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/info` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/info` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/info` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/info` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/legale` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/legale` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/legale` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/legale` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/legale` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/licenze` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/licenze` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/licenze` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/licenze` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/licenze` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/notifiche` | it | C,G,P,T,V | 320,360,390 | 15 | 53 | ok |
| `/impostazioni/notifiche` | en | C,G,P,T,V | 320,360,390 | 15 | 50 | ok |
| `/impostazioni/notifiche` | es | C,G,P,T,V | 320,360,390 | 15 | 53 | ok |
| `/impostazioni/notifiche` | fr | C,G,P,T,V | 320,360,390 | 15 | 53 | ok |
| `/impostazioni/notifiche` | de | C,G,P,T,V | 320,360,390 | 15 | 52 | ok |
| `/impostazioni/piano` | it | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/piano` | en | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/piano` | es | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/piano` | fr | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/piano` | de | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/privacy` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/privacy` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/privacy` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/privacy` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/privacy` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/pro` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/pro` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/pro` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok, ricontrollata dopo la correzione |
| `/impostazioni/pro` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/pro` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/impostazioni/servizi` | it | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/servizi` | en | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/servizi` | es | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/servizi` | fr | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/servizi` | de | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/suggerimenti` | it | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/suggerimenti` | en | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/suggerimenti` | es | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/suggerimenti` | fr | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/suggerimenti` | de | C,G,P,T,V | 320,360,390 | 15 | 9 | ok |
| `/impostazioni/team` | it | C,G,P,T,V | 320,360,390 | 15 | 6 | ok, va a capo con il trattino |
| `/impostazioni/team` | en | C,G,P,T,V | 320,360,390 | 15 | 6 | ok, va a capo con il trattino |
| `/impostazioni/team` | es | C,G,P,T,V | 320,360,390 | 15 | 6 | ok |
| `/impostazioni/team` | fr | C,G,P,T,V | 320,360,390 | 15 | 6 | ok, va a capo con il trattino |
| `/impostazioni/team` | de | C,G,P,T,V | 320,360,390 | 15 | 6 | ok, va a capo con il trattino |
| `/incassi` | it | C,G,P,T,V | 320,360,390 | 15 | 98 | ok, va a capo con il trattino |
| `/incassi` | en | C,G,P,T,V | 320,360,390 | 15 | 98 | ok, va a capo con il trattino |
| `/incassi` | es | C,G,P,T,V | 320,360,390 | 15 | 98 | ok |
| `/incassi` | fr | C,G,P,T,V | 320,360,390 | 15 | 98 | ok |
| `/incassi` | de | C,G,P,T,V | 320,360,390 | 15 | 98 | ok |
| `/incassi/report` | it | C,G,P,T,V | 320,360,390 | 15 | 21 | ok |
| `/incassi/report` | en | C,G,P,T,V | 320,360,390 | 15 | 21 | ok |
| `/incassi/report` | es | C,G,P,T,V | 320,360,390 | 15 | 21 | ok |
| `/incassi/report` | fr | C,G,P,T,V | 320,360,390 | 15 | 21 | ok, va a capo con il trattino |
| `/incassi/report` | de | C,G,P,T,V | 320,360,390 | 15 | 21 | ok, va a capo con il trattino |
| `/incassi/statistiche` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/incassi/statistiche` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/incassi/statistiche` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/incassi/statistiche` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/incassi/statistiche` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/invito/:token` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/invito/:token` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/invito/:token` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/invito/:token` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/invito/:token` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/listino` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok, va a capo con il trattino |
| `/listino` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok, va a capo con il trattino |
| `/listino` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino/gestione` | it | C,G,P,T,V | 320,360,390 | 15 | 12 | ok, va a capo con il trattino |
| `/listino/gestione` | en | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/gestione` | es | C,G,P,T,V | 320,360,390 | 15 | 12 | ok, va a capo con il trattino |
| `/listino/gestione` | fr | C,G,P,T,V | 320,360,390 | 15 | 12 | ok, va a capo con il trattino |
| `/listino/gestione` | de | C,G,P,T,V | 320,360,390 | 15 | 12 | ok, va a capo con il trattino |
| `/listino/prezzi` | it | C,G,P,T,V | 320,360,390 | 15 | 60 | ok |
| `/listino/prezzi` | en | C,G,P,T,V | 320,360,390 | 15 | 60 | ok |
| `/listino/prezzi` | es | C,G,P,T,V | 320,360,390 | 15 | 60 | ok |
| `/listino/prezzi` | fr | C,G,P,T,V | 320,360,390 | 15 | 60 | ok, va a capo con il trattino |
| `/listino/prezzi` | de | C,G,P,T,V | 320,360,390 | 15 | 60 | ok |
| `/listino/stampa` | it | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/stampa` | en | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/stampa` | es | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/stampa` | fr | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/stampa` | de | C,G,P,T,V | 320,360,390 | 15 | 12 | ok |
| `/listino/vedi` | it | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino/vedi` | en | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino/vedi` | es | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino/vedi` | fr | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/listino/vedi` | de | C,G,P,T,V | 320,360,390 | 15 | 0 | ok |
| `/login` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login crea account` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login crea account` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login crea account` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login crea account` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login crea account` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password dimenticata` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password dimenticata` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password dimenticata` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password dimenticata` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password dimenticata` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password errata` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password errata` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password errata` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password errata` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login password errata` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login vuoto` | it | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login vuoto` | en | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login vuoto` | es | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login vuoto` | fr | anonimo | 320,360,390 | 3 | 0 | ok |
| `/login vuoto` | de | anonimo | 320,360,390 | 3 | 0 | ok |
| `/mensili` | it | C,G,P,T,V | 320,360,390 | 15 | 24 | ok |
| `/mensili` | en | C,G,P,T,V | 320,360,390 | 15 | 24 | ok |
| `/mensili` | es | C,G,P,T,V | 320,360,390 | 15 | 24 | ok |
| `/mensili` | fr | C,G,P,T,V | 320,360,390 | 15 | 24 | ok |
| `/mensili` | de | C,G,P,T,V | 320,360,390 | 15 | 24 | ok |
| `hosting /` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /c/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /c/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /c/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /c/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /c/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /privacy.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /termini/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /termini/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /termini/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /termini/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /termini/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /dpa/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /dpa/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /dpa/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /dpa/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /dpa/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /elimina-account/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /elimina-account/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /elimina-account/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /elimina-account/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /elimina-account/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /azione/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /azione/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /azione/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /azione/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /azione/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/servizio.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/servizio.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/servizio.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/servizio.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/servizio.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/quando.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/quando.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/quando.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/quando.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/quando.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/dati.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/dati.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/dati.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/dati.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/dati.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/inviata.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/inviata.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/inviata.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/inviata.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/inviata.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/stato.html` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/stato.html` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/stato.html` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/stato.html` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /salone/stato.html` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /s/pagina-che-non-esiste` | it | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /s/pagina-che-non-esiste` | en | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /s/pagina-che-non-esiste` | es | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /s/pagina-che-non-esiste` | fr | pubblica | 320,360,390 | 3 | 0 | ok |
| `hosting /s/pagina-che-non-esiste` | de | pubblica | 320,360,390 | 3 | 0 | ok |
| `/s/:slug` modulo e invio | de | cliente | 320 | 1 | 0 | ok, invio vero |
| `/s/:slug` | it | cliente | 320 | 1 | 0 | ok, lingua dal browser |
| `/s/:slug` | en | cliente | 320 | 1 | 0 | ok, lingua dal browser |
| `/s/:slug` | es | cliente | 320 | 1 | 0 | ok, lingua dal browser |
| `/s/:slug` | fr | cliente | 320 | 1 | 0 | ok, lingua dal browser |
