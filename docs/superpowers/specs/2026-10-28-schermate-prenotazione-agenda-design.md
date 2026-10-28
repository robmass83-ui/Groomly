# Schermate: prenotazione, agenda, backup e legali

Data: 28 ottobre 2026.

Dieci correzioni già decise, da eseguire insieme. La regola comune è questa: chip, righe e pulsanti stanno larghi quanto il testo, su una riga, con un piccolo spazio tra un pezzo e l’altro. Due schede vicine si distinguono. Non si aggiungono blocchi alti per riempire lo schermo.

Si usano i colori, i testi e i componenti già di Groomly (`src/theme`, card, pulsanti, dialoghi). Le lingue restano italiano, inglese e spagnolo.

Questa specifica sostituisce, solo sui punti scritti qui, il vincolo «la durata pubblica resta 60 minuti» di `2026-10-27-richieste-prenotazione-design.md`. Il resto di quel flusso (home, accetta, proponi, rifiuta, profilo) resta valido.

## Fuori da questo lavoro

- Non si disdice l’abbonamento su Google Play. Groomly spegne il piano nell’app.
- Non si cambia il listino cartaceo, gli orari del salone e le specie accettate.
- «Da chiudere» in Home e negli incassi resta così. Cambia solo la riga in Notifiche.
- Il backup non parte alle 23:00. Parte quando l’app è aperta, come oggi.
- Le altre mail (conferma, promemoria, auguri) non si riscrivono.
- WhatsApp resta «Da sviluppare».

## 1. Prenotazione online

### Ordine della pagina pubblica

Su `groomlyapp.it/s/{slug}` il cliente procede così: animale, taglia, servizio, giorno, ora, dati. Il servizio viene prima del calendario perché la durata cambia gli orari liberi.

Dopo la taglia si vedono solo i servizi accesi e pubblicabili. Un principale è obbligatorio, una sola voce. Gli extra sono facoltativi e si aggiungono. Ogni voce è una riga: nome, minuti e prezzo della taglia scelta, per esempio `Bagno · 45 min · 28 €`. Sotto, il totale indicativo si aggiorna con gli extra.

Subito sotto i prezzi, nella lingua della pagina:

- Italiano: «I prezzi sono indicativi. Possono variare dopo aver visto l’animale, se ci sono nodi o problemi che richiedono più tempo.»
- Inglese: «Prices are a guide. They can change after we see the animal, if there are mats or problems that need more time.»
- Spagnolo: «Los precios son orientativos. Pueden cambiar después de ver al animal, si hay nudos o problemas que pidan más tiempo.»

Cambiare taglia o servizio azzera giorno e ora e ricarica i posti. La durata è la somma dei minuti dei servizi scelti, per quella taglia. `postiLiberi` e il controllo in `inviaRichiesta` usano quella somma, non 60 minuti fissi.

### Catalogo

`paginaPubblica` legge `salons/{id}/services` con il server e inserisce nella pagina solo i campi pubblici dei servizi pubblicabili: id, nome, tipo, icona, minuti e prezzo per piccola, media e grande. La collezione non si apre a chi non è del salone.

Un servizio è pubblicabile se è acceso, la durata di ogni taglia è almeno 1 minuto e il prezzo di ogni taglia è maggiore di zero. Un extra senza questi valori non compare e non blocca l’accensione. Un principale senza questi valori non conta.

### Cosa si salva sulla richiesta

Oltre agli id, una fotografia che non segue i prezzi futuri:

- `voci`: per ogni servizio scelto, id, nome, tipo, minuti, prezzo della taglia
- `totaleIndicativo`: somma dei prezzi
- `durataMin`: somma dei minuti

Il riquadro della richiesta in app mostra quelle voci e il totale. Il server rifiuta zero principali, due principali, un id spento o non pubblicabile, e un orario che non contiene più quella durata («Orario non disponibile»). Se il catalogo non è valido, la pagina pubblica dice che il salone non accetta prenotazioni, anche se l’interruttore era rimasto acceso.

### Accendere le prenotazioni

Restano i requisiti di piano, profilo e dato fiscale. Si aggiunge: almeno un principale pubblicabile, e `settings.listinoConfermato === true`.

I servizi di partenza hanno già dei prezzi, quindi non bastano. Il flag diventa vero solo quando il salone salva un servizio (nuovo o modifica). Finché è falso, l’interruttore resta spento e la card manda a Servizi e durata. Se si spegne o si svuota l’ultimo principale pubblicabile, `prenotazioniOnline` torna falso.

## 2. Pulsante salone in Utenti

Il pulsante significa «piano acceso». Spento è Base. Acceso mostra la scritta **Pro** oppure **Salone**, non un interruttore senza nome.

### Accendere

Toccando il pulsante spento non cambia nulla. Si apre una scelta:

- **Pro.** Le funzioni Pro, senza team.
- **Salone.** Tutto il Pro, più il team e i posti per soci e collaboratori.

Ogni voce ha il nome e una sola riga. Annulla lascia Base. La conferma scrive un bypass con fonte `manuale`, stato attivo, senza scadenza. Non è VIP (`eVip` resta solo fonte `omaggio`). Pro scrive piano `pro`. Salone scrive piano `salone`. Nessun testo obbligatorio.

Se il bypass è già acceso, la stessa scelta permette di passare da Pro a Salone o il contrario. Su fonte `manuale` il passaggio non chiede testo. Su fonte `play` con piano ancora attivo, scendere di livello o spegnere chiede il testo del paragrafo sotto. Salire da Pro pagato a Salone non lo chiede.

«Prova 30 giorni» e «Salone omaggio» restano comandi a parte. «Pro omaggio» e «Torna a Base» escono da questa scheda.

### Spegnere

Il pulsante acceso mostra **Pro** se il piano è pro (anche una prova) e **Salone** se il piano è salone.

- Bypass `manuale`, e anche una prova: torna a Base subito, senza testo.
- Pagato: fonte `play` e il piano dà ancora accesso (attivo, grazia, o disdetto con scadenza futura). Il campo è obbligatorio, da 1 a 400 caratteri dopo il trim. Vuoto o soli spazi non parte. Sopra il campo: «Groomly spegne il piano nell’app. L’addebito su Play, se c’è, continua finché il titolare non lo disdice nello store.» Quel promemoria non sostituisce il testo. Oggetto e card seguono la lingua del titolare. In italiano l’oggetto è «Il piano Groomly è stato aggiornato».
- Omaggio già salvato (VIP di oggi, indistinguibile da un vecchio bypass): conferma «Questo salone è un omaggio. Spegnere?», senza testo. Così si sbloccano quelli rimasti accesi.

Il testo del pagato va in due posti. Email al titolare, con l’oggetto nella sua lingua e il corpo uguale al testo scritto. In Home, solo per il titolare, una card con lo stesso testo e «Ho letto». Resta finché non la preme. Si salva su `salons/{id}/avvisi/piano` con testo, data e `letto`. Se l’email non parte, il piano è comunque spento, la card resta, e in Utenti si vede che la mail non è uscita. Se il server rifiuta, il pulsante resta com’era e sotto compare il motivo.

## 3. Proporre un altro orario

Lo stesso riquadro, due passi.

Primo passo: richiesta, cane, scelta nuovo o già in scheda. In fondo Accetta, Proponi un altro orario, Rifiuta. Proponi si apre solo dopo la scelta del cane. Il rifiuto no.

Secondo passo: niente Accetta e niente Rifiuta. Titolo «Proponi un altro orario» e una riga con il cane scelto.

Due blocchi, mai nella stessa fascia:

- **Giorno.** I giorni liberi scorrono in orizzontale. Chip alta quanto il testo, per esempio `gio 29`.
- **Orario.** Solo dopo il giorno, sotto una linea e con il suo titolo. Chip compatte delle ore di quel giorno. Cambiare giorno azzera l’ora.

Caricamento: «Cerco gli orari liberi». Nessun posto: «Nessun orario libero» e Invia spento.

In fondo, sulla stessa riga, Annulla e Invia proposta. Annulla torna al primo passo senza inviare e senza chiudere la richiesta; la scelta del cane resta. Invia proposta resta spento finché mancano giorno o ora. Se la mail non parte, il riquadro resta aperto con l’errore, come oggi.

## 4. Mail di proposta e di rifiuto

Logo e struttura della mail restano. Cambia il corpo, nelle tre lingue. La data chiesta e, nella proposta, l’alternativa si scrivono per esteso. Se un orario manca, si omette quel pezzo, senza un buco.

Proposta, oggetto invariato «Proposta di orario». Corpo italiano:

«Ci scusiamo, ma nella data e nell’orario scelti, {invece}, non è possibile effettuare il trattamento. Le proponiamo in alternativa {quando}. Rispondi entro {entro}.»

Pulsanti Conferma e Rifiuta, come oggi.

Rifiuto, oggetto invariato «Richiesta non accettata». Corpo italiano:

«Ci scusiamo, ma nella data e nell’orario scelti, {invece}, non è possibile effettuare il trattamento. Si prega di selezionare un’altra data e un orario disponibile.»

Un solo pulsante, «Scegli un altro orario», verso `https://groomlyapp.it/s/{slug}`. Niente Conferma. Se lo slug pubblico non c’è, resta il testo e il pulsante non compare.

Inglese e spagnolo hanno lo stesso significato: scuse, trattamento non possibile in quel giorno e orario, alternativa e scadenza nella proposta, invito a sceglierne un altro nel rifiuto.

## 5. Pagina «Appuntamento confermato»

La pagina di `rispondiRichiesta` usa la cornice delle mail: sfondo `#eef3f7`, logo `groomly-logo-orizzontale.svg`, scheda bianca, fascia `#8ADBD9`–`#4A9FCB`.

Conferma: spunta, titolo «Appuntamento confermato», poi nome del salone, nome del cane, giorno e ora su una riga. Sotto: «Il salone ha l’appuntamento. Puoi chiudere questa pagina.» In fondo, piccolo, `Groomly · groomlyapp.it`.

La lingua è quella già usata per le mail di quel salone. Se non c’è, italiano. Inglese e spagnolo dicono la stessa cosa.

«Posto liberato» e «Link non valido» usano la stessa cornice, senza la spunta. Titolo e una frase.

## 6. Agenda

### Giorno

La colonna delle ore resta: un appuntamento lungo occupa più spazio di uno corto. Il contenuto sta in cima e non si stira.

Nome e ora su una riga. Le chip dei servizi sotto, solo se l’altezza dello slot le contiene. Chip alta circa il testo, icona e nome sulla stessa riga, senza andare a capo. Se non entrano tutti: quelli che entrano e poi `+2`. In uno slot corto restano nome e ora.

Ogni scheda ha un bordo e 3 pixel di distacco da quella sotto, più la riga colorata a sinistra. Due appuntamenti contigui non formano un unico rettangolo bianco.

### Settimana

Ogni giorno è una fascia. A sinistra il giorno compatto, per esempio `gio 29`. A destra biglietti larghi quanto il contenuto: nome, ora, icona del primo servizio. Se i servizi sono più di uno, `+1`. Spazio tra i biglietti e un bordo. Se non stanno su una riga, vanno a capo e la fascia cresce. Non c’è scorrimento orizzontale e non si schiaccia il testo. Un giorno vuoto resta basso: lo spazio vuoto crea un appuntamento, il biglietto lo apre. Il provvisorio resta ambra, l’impegno personale tiene il suo colore.

## 7. Da chiudere

In Notifiche la riga, il titolo della spiegazione e «Informazioni su…» dicono «Appuntamenti da chiudere». Il corpo della spiegazione non cambia. Inglese: «Appointments to close». Spagnolo: «Citas por cerrar».

In Home, sotto ogni appuntamento da chiudere, una sola riga: Completato, Non venuto, Disdetto. Il testo non va a capo e la riga non cresce in altezza. I colori restano quelli di oggi. Se il cane non è in scheda, «Rimuovi dalla lista» è un comando corto sulla stessa riga, non un pulsante a tutta larghezza.

## 8. Servizi e durata

Una riga per servizio: maniglia, icona, nome, e subito accanto in colore tenue tempo e prezzo, per esempio `30–75 min · 20–38 €`. A destra l’interruttore.

Il nome può accorciarsi. Tempo e prezzo restano interi e sulla stessa riga. Toccare nome, tempo, prezzo o il chevron apre la modifica. L’interruttore non la apre. La maniglia riordina soltanto. Un servizio spento ha il nome attenuato e la parola «Spento» sulla stessa riga, senza una pillola alta. Principali ed extra restano due gruppi. «Aggiungi» resta in fondo, compatto.

I minuti in riga si scrivono `min`, non `m`, così si leggono senza aprire la scheda. Il prezzo tiene il formato euro già usato.

## 9. Backup e ripristino

La riga «Salva ora» (JSON sul telefono e copia sul cloud) si toglie. Resta «Invia su Drive» quando Drive è collegato. Restano automatico, frequenza, Wi-Fi, in carica, registro Excel, ZIP, completo con foto, copia veloce e il ripristino.

Accanto a Frequenza, una «i» come in Notifiche. Si chiude con «Ho capito». Testo:

- Giornaliero: una copia al giorno.
- Settimanale: una copia ogni 7 giorni.
- Mensile: una copia ogni 30 giorni.
- «Parte quando l’app è aperta, se Wi-Fi e carica sono come li hai impostati.»

Inglese e spagnolo dicono la stessa cosa. Non si cita un’ora fissa.

## 10. Informativa e pagine legali

Sulla pagina pubblica, «Informativa» non naviga via. Apre uno strato sopra il modulo, con il testo della privacy e «Torna alla prenotazione». Chiudere lo strato, o il tasto indietro, lascia animale, taglia, servizi, giorno, ora e i campi già scritti. L’apertura aggiunge uno stato nella cronologia, così il primo indietro chiude solo lo strato.

In app, da Legale, privacy, termini, trattamento dati ed elimina account si aprono nel browser del telefono (`Browser.open`), non nel WebView. Su browser desktop, una finestra nuova, mai la stessa. La schermata Legale resta montata. Licenze resta una route interna. Queste aperture non avviano l’APK e non fanno comparire «Scarica».

## Verifica

Ogni punto ha un test automatico sul comportamento, più il controllo a vista delle schermate toccate.

- Senza principale pubblicabile, o senza `listinoConfermato`, l’interruttore non si accende. Salvare un servizio con prezzo e durata lo permette. Spegnere l’ultimo principale riporta `prenotazioniOnline` a falso.
- La pagina pubblica rifiuta due principali, un id non pubblicabile e un’ora troppo corta per la durata somma. La richiesta conserva prezzo e minuti del momento.
- Il pulsante Utenti spento non scrive nulla finché non si conferma Pro o Salone. Il documento ha fonte `manuale`. Un `manuale` si spegne senza testo. Un `play` attivo senza testo non si spegne. Con un testo, si spegne, nasce l’avviso e la card sparisce solo con «Ho letto». Un omaggio chiede conferma e poi si spegne.
- Nel secondo passo della proposta non ci sono Accetta né Rifiuta. Annulla torna al primo passo. Invia parte solo con giorno e ora.
- La mail di proposta contiene le scuse e l’alternativa. La mail di rifiuto contiene le scuse e, se c’è lo slug, un solo pulsante verso la pagina del salone.
- La pagina di conferma contiene il logo e il riepilogo. «Posto liberato» non ha la spunta.
- Due appuntamenti contigui nel giorno hanno ciascuno un bordo. In settimana un biglietto non ha larghezza flessibile che riempie la riga: la larghezza segue il contenuto e i biglietti vanno a capo.
- La riga Notifiche legge «Appuntamenti da chiudere». I tre comandi in Home stanno su una riga.
- La riga servizio mostra tempo e prezzo accanto al nome. Il toggle non apre la modifica.
- «Salva ora» non è nel dialogo backup. La «i» dice 1 giorno, 7 giorni, 30 giorni, e che parte a app aperta.
- Il link informativa della prenotazione non assegna `location` a `/privacy/`. I link legali dell’app non navigano il WebView.
