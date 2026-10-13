# Groomly — Salone unico

Data: 2026-10-13
Stato: sezioni approvate il 13 ottobre 2026, in attesa della lettura di questo file.

Questa è l’unica specifica di questo lavoro. Si implementa insieme, in un unico passaggio. Dove una specifica precedente fa ricopiare, a ogni apertura, le cartelle `users/{uid}` dentro `salon/shared`, o apre il PDF del listino in un riquadro dentro l’app, o sposta un appuntamento trascinandolo nel calendario, vale questo testo.

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | Cani, appuntamenti, foto, servizi, listino, promemoria, etichette e suggerimenti sono del salone. Chi entra li legge e li scrive tutti. |
| D2 | Il tema (`light`, `dark`, `auto`) resta solo sul telefono, chiave `groomly.theme`. Non si scrive nel documento condiviso e un tema arrivato dal salone non cambia lo schermo. |
| D3 | All’apertura si vede subito l’ultima copia locale. Il salone aggiorna sul posto e non lascia la pagina vuota mentre risponde. |
| D4 | Eliminare un cane toglie, per tutti e per sempre, la scheda e tutti i suoi appuntamenti, passati e futuri. Una copia vecchia non li ricrea. |
| D5 | Una foto del listino (JPEG o PNG) si apre nell’app e si ingrandisce con due dita. Un PDF si apre nel lettore del telefono. |
| D6 | Nel calendario il dito che scorre sposta la pagina. Il tocco sul riquadro apre la scheda. Data e ora si cambiano da Modifica. |
| D7 | In lettura, le note stanno sopra i prezzi. Lo storico è chiuso in fondo e, al tocco, è una linea del tempo. |

## 1. Archivio

L’unica fonte, dopo il primo aggancio di un telefono, è `salon/shared`: `dogs`, `appointments`, `services`, `settings/main`.

Le cartelle `users/{uid}` non si scrivono più. Si leggono una volta sola, e solo se manca il documento `salon/shared/meta/restored-{uid}` con `done: true`. In quella copia entrano nel salone solo gli id che nel salone non ci sono già e che non sono nel segno delle cancellazioni. Un documento già presente nel salone resta quello del salone. Finita la copia, si scrive il marker e quelle cartelle non si leggono più. `syncMemberMedia` non gira a ogni apertura.

Il segno delle cancellazioni è `salon/shared/meta/deleted-dogs`. Resta il campo `ids`, gli id dei cani. Si aggiunge `appointmentIds`, gli id degli appuntamenti tolti. Un documento vecchio senza `appointmentIds` vale come elenco vuoto. Sul telefono la stessa forma, `{ ids, appointmentIds }`, sta in `groomly.deleted`. I due elenchi si uniscono: un id presente in uno dei due posti è cancellato.

Una scrittura di cane o appuntamento il cui id è nel segno viene scartata. Un appuntamento il cui `dogId` è in `ids` viene scartato allo stesso modo. Eliminare un singolo appuntamento dal suo foglio aggiunge il suo id a `appointmentIds`.

Due scritture dello stesso documento: resta l’ultima arrivata al salone.

I backup restano nel percorso attuale, sotto `users/{uid}/backups`.

## 2. Apertura

Cani, appuntamenti, servizi e impostazioni si disegnano dalla copia locale (`groomly.users.{uid}.*`) nel primo fotogramma, già filtrati con `groomly.deleted`. L’ascolto di `salon/shared` parte senza aspettare la copia del §1. Quando arriva uno snapshot, la pagina si sostituisce con i documenti del salone filtrati dallo stesso segno, e quella lista diventa la copia locale.

Se la rete non risponde, resta la copia locale. La pagina non passa da uno stato vuoto. Uno snapshot vuoto arrivato dalla cache, prima della risposta del server, non semina i servizi di default e non sostituisce la copia locale.

## 3. Cancellazione di un cane

Confermare «Elimina definitivamente» fa, su quel telefono e prima della risposta del salone:

- toglie il cane dalla lista;
- toglie ogni appuntamento con quel `dogId`, in qualunque stato;
- aggiunge l’id del cane a `ids` e gli id di quegli appuntamenti a `appointmentIds`, in `groomly.deleted`.

Poi scrive il segno su `deleted-dogs` e cancella quei documenti in `salon/shared`. Non cancella più nulla sotto `users/{uid}`: quelle cartelle non sono più una fonte.

Se la scrittura non riesce, il segno locale resta e l’app riprova. Le cancellazioni in coda partono prima degli altri salvataggi. Uno snapshot che contiene ancora quel cane o un suo appuntamento non li rimette in lista. L’altro telefono li toglie quando riceve il segno o la scomparsa dei documenti, e aggiorna la propria copia locale.

## 4. File

Le foto nuove vanno nello spazio comune, con il tipo del file:

- profilo: `salon/dogs/{dogId}/profile.jpg`
- galleria: `salon/dogs/{dogId}/gallery/{photoId}.jpg`
- foto di una visita: `salon/appointments/{appointmentId}/{kind}-{photoId}.jpg`
- listino: `salon/pricelist/{fileId}`, dove `fileId` è l’id del `PriceFile`

Un indirizzo `https` già salvato, anche se punta a `users/{uid}/…`, continua ad aprirsi. Nel documento condiviso si scrive solo un URL `https` di scaricamento. Un `data:` non viene messo nel salone. Se il caricamento non finisce, gli altri telefoni tengono il file precedente.

Le regole Storage accettano lettura e scrittura di `salon/**` da qualunque utente autenticato. La lettura di `users/{uid}/**` resta com’è, così i file vecchi si aprono.

**Listino.** In «Apri», se `mime` inizia con `image/`, la foto è nell’app, a tutta larghezza, e due dita la ingrandiscono e la rimpiccioliscono. Se `mime` è `application/pdf`, i byte vanno al lettore del telefono e non restano in un riquadro dell’app. Qualunque altro mime, o un’immagine che non si decodifica, mostra «File non apribile». Se il telefono non ha un’app per il PDF, il testo è «Nessuna app per aprire il PDF».

## 5. Calendario

In giorno, settimana e mese, scorrere sopra un riquadro non cambia `start`. Il riquadro non cattura il dito: la pagina scorre. Il tocco senza trascinamento apre `/appuntamenti/{id}`. Modifica, dentro quella scheda, resta il punto in cui si cambiano data, ora, cane e servizi. Il riordino dei servizi in Listino non c’entra e resta.

## 6. Scheda in lettura

Dall’alto: intestazione (foto, nome, dati brevi, proprietario, telefono, Chiama, WhatsApp, segnali, «Fissa appuntamento»), griglia dei fatti, nota critica se c’è, note se il testo non è vuoto, prezzi personalizzati, riga di stato, prossimo appuntamento, tag, campi, contatti, galleria, «Ripristina» se il cane non è attivo. Lo storico è l’ultimo blocco.

Il modulo di modifica non cambia ordine.

**Storico.** È chiuso a ogni apertura della scheda. La riga mostra «Storico» e, sotto, il numero dei completati: «1 visita», «8 visite», oppure «Nessun trattamento». Senza visite la riga non si apre. Con almeno una visita, il tocco la apre e un secondo tocco la chiude.

Aperto, i completati scendono dal più recente. A parità di `start`, l’id maggiore secondo `localeCompare` sta sopra. La data è il punto della linea. A destra: i nomi dei servizi, poi una riga che unisce con « · » solo i pezzi presenti, in quest’ordine: prezzo formattato come in scheda, strumenti, durata reale, prodotti, stile. Le foto `prima` e `dopo` stanno sotto quella visita. La matita apre lo stesso foglio «Prezzo» di oggi.

## 7. Errori

Il toast di una scrittura non riuscita resta «Salvataggio non riuscito». Vale per cane, appuntamento, servizio, listino e per il segno di cancellazione che non si riesce a consegnare: in quel caso il segno locale e la coda restano.

Un file del listino non caricato non sostituisce `priceList` già in comune. Due modifiche contemporanee dello stesso documento: vince l’ultima scrittura accettata dal salone.

Senza rete si usa la copia locale. Al ritorno della rete partono prima le cancellazioni, poi gli altri salvataggi.

## 8. Prove

Ogni punto ha un test automatico:

- eliminare un cane toglie dal salone la scheda e tutti i suoi appuntamenti e scrive `ids` e `appointmentIds`;
- una copia da `users/{uid}` non ricrea un cane o un appuntamento già nel segno, e non sostituisce un documento già nel salone;
- uno snapshot che contiene ancora quegli id viene filtrato prima dello schermo;
- la copia locale è visibile senza aspettare la rete;
- salvare le impostazioni non scrive `theme` nel salone, e un `theme` arrivato dal salone non cambia `groomly.theme` né lo schermo;
- JPEG e PNG del listino si aprono nell’app; il PDF va al lettore; un mime sconosciuto o un’immagine illeggibile mostra «File non apribile»; un caricamento fallito lascia il file precedente;
- scorrere su un appuntamento non cambia `start`; il tocco apre la scheda;
- in lettura le note stanno sopra i prezzi, lo storico è chiuso in fondo e, aperto, mostra data, servizi, prezzo, strumenti e durata.

## 9. Fuori da questo lavoro

Non si cambia il ritmo del mensile, la barra, Chiama e WhatsApp, lo switch dei prezzi, né chi può entrare. Non ci sono ruoli: ogni account attivo usa le stesse funzioni.
