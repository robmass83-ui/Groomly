# Groomly — Scheda, barra, tema e apertura

Data: 2026-10-11
Stato: da rivedere. Il disegno è stato approvato in chat l’11 ottobre 2026. Si implementa solo dopo la revisione di questo file.

Questa è l’unica specifica di questo lavoro. Si implementa insieme, in un unico passaggio. Dove una specifica precedente dice che lo switch dei prezzi «nasconde» il servizio, o che in lettura il telefono è il bottone con la scritta «Chiama», vale questo testo.

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | Cani, foto, note, prezzi, appuntamenti e listino restano del salone. Un salvataggio su un telefono è lo stesso sugli altri. |
| D2 | Lo switch acceso significa «questo servizio sta nel profilo». Gli id già salvati in `hiddenServiceIds` sono quelli accesi. Non si crea un secondo campo e non si inverte l’array già scritto. |
| D3 | In scheda, una riga per ogni id acceso. Prezzo o durata non scritti si vedono come «—». Lo switch spento toglie la riga e tiene il numero in memoria. |
| D4 | Il tema (`light`, `dark`, `auto`) vive solo sul telefono, chiave `groomly.theme`. Il tema dentro le impostazioni condivise non si applica e non sostituisce la chiave. |
| D5 | Chiama e WhatsApp sono due loghi affiancati, senza andare a capo. Sul telefono, WhatsApp apre `whatsapp://send?phone=` e non il browser interno. |
| D6 | La barra è Home, Animali, Calendario, Listino, Altro, a cinque colonne uguali. Il + è al centro, circa metà sopra la barra. Altro apre `/impostazioni`. La rotella esce da Home. La campanella resta. |
| D7 | Se l’accesso è già sul telefono, Home si disegna subito coi dati locali. Il cloud aggiorna sul posto e non svuota la pagina mentre risponde. |

## 1. Prezzi nel profilo

L’editor resta quello di oggi: sezione «Prezzi personalizzati», chiusa di default, colonne Prezzo € e Durata min, placeholder grigio col prezzo e la durata del listino per la taglia del cane. Da chiusa non scrive nulla. Lo switch verde resta al posto di oggi. Acceso, l’id del servizio è in `hiddenServiceIds`. Spento, non c’è. Il nome accessibile dello switch è «mostra nel profilo», non «nascondi questo servizio per questo cane».

In lettura, sotto l’avviso critico e prima del prossimo appuntamento, la sezione «Prezzi personalizzati» elenca solo gli id in `hiddenServiceIds`, nell’ordine dei servizi del salone. Per ogni id: icona, nome, prezzo, durata. Il prezzo scritto usa il formato già in scheda («€ 38»). La durata scritta è «60 min». Se per quell’id non c’è un prezzo salvato, il prezzo è «—». Se non c’è una durata salvata, la durata è «—». Il placeholder del listino non è un prezzo salvato: finché la casella è vuota, in scheda c’è il trattino.

Lo switch spento non mostra la riga, anche se `servicePrices` ha un numero. Quel numero resta. Riaccendendo lo switch, la riga torna col numero. Se l’elenco acceso è vuoto, la sezione non c’è. Un servizio spento nel listino del salone, ma ancora acceso su quel cane, resta in scheda: spegnere il servizio nel listino non cancella la riga da solo.

Il salvataggio del form continua a scrivere `hiddenServiceIds` e, come oggi, solo lo scostamento davvero digitato in `servicePrices`. Due telefoni che leggono lo stesso cane mostrano le stesse righe. Un telefono ancora sulla versione precedente continua a nascondere gli id accesi finché non si aggiorna: non c’è una migrazione dei dati, perché gli id accesi sono già quelli giusti.

## 2. Tema sul telefono

La chiave `groomly.theme` in `localStorage` vale `light`, `dark` o `auto`. Se la chiave manca, vale `auto` e si segue il tema del telefono. Il primo fotogramma applica questa chiave, prima che arrivino le impostazioni dal cloud.

In Impostazioni, il segmento Tema legge e scrive solo questa chiave e applica subito la scelta. Chiaro resta chiaro su questo telefono. Scuro resta scuro su quello di Laura. Una impostazione arrivata dal cloud, anche se contiene un tema diverso, non cambia la chiave e non cambia lo schermo. Salvare promemoria, etichette o altro non copia il tema dell’altro telefono su questo.

Se la scrittura della chiave fallisce, resta il tema già applicato e il toast è «Salvataggio non riuscito».

## 3. Chiama e WhatsApp

Nella scheda in lettura, il numero del proprietario sta sulla sua riga. Sotto, due pulsanti della stessa misura, in una riga che non va a capo: a sinistra la cornetta, fondo del colore primario, a destra il segno di WhatsApp, fondo `#128C7E`. Le scritte «Chiama» e «WhatsApp» non si vedono. I nomi accessibili restano «Chiama» e «WhatsApp».

Chiama apre `tel:` come oggi. WhatsApp, nell’app sul telefono, consegna al sistema `whatsapp://send?phone=` seguito dalle stesse cifre che oggi produce `whatsAppLink`. Non si usa il browser interno e non si apre prima `https://wa.me/`. Se il sistema non apre WhatsApp, il toast è «WhatsApp non si apre» e si resta sulla scheda. Nel browser di sviluppo, il link resta `https://wa.me/` con le stesse cifre, così la prova da tavolo non dipende dall’app.

I contatti sotto, in «Contatti», tengono l’icona di chiamata che hanno già. Non guadagnano un secondo pulsante WhatsApp.

## 4. Barra

Cinque voci, stesso spazio, da sinistra: Home (`/`), Animali (`/animali`), Calendario (`/calendario`), Listino (`/listino`), Altro (`/impostazioni`). L’etichetta è «Altro», non «Impostazioni». La voce della pagina aperta si colora come oggi.

Il + resta il pulsante «Apri azioni» e apre lo stesso foglio: Appuntamento, Animale. È centrato sulla barra e sale così che circa metà della sua altezza stia sopra il bordo. Icona e scritta di Calendario restano visibili sotto. Non occupa una sesta colonna e non stringe le altre cinque.

In Home, il link con la rotella verso Impostazioni non c’è. La campanella degli avvisi resta in alto a destra e apre `/mensili` come oggi.

## 5. Apertura

`openingGate`, con Firebase acceso, restituisce subito la sessione già conciliata sul telefono. Con Firebase spento resta il comportamento di oggi: si usa la sessione conciliata, senza un’attesa in più. Se l’accesso c’è, il cancello è `in` e Home si disegna. Se non c’è, il cancello è `out` e si vede il login. Se i dati locali sono illeggibili, resta il messaggio già previsto. Il cancello non resta `pending` solo perché Firebase deve ancora rispondere, quando la sessione locale è già nota.

Cani, appuntamenti, servizi e impostazioni (tranne il tema, che viene dalla chiave del telefono) partono dalla copia già sul telefono. L’aggancio al cloud non azzera gli elenchi nell’attesa del primo snapshot. Quando il cloud risponde, gli elenchi si aggiornano sul posto. Una foto mai scaricata su questo telefono può arrivare un attimo dopo: la riga del cane c’è già.

Se più tardi l’accesso non è più valido, si va al login. Se la rete manca, restano i dati del telefono e la pagina non si svuota. Se il salvataggio di un prezzo non riesce, il toast è «Salvataggio non riuscito» e la scheda non cambia.

## 6. Verifica

- Lo switch ha il nome accessibile «mostra nel profilo».
- In scheda compaiono solo i servizi col switch acceso, nell’ordine del listino. Prezzo vuoto e durata vuota sono «—». Un prezzo digitato con lo switch spento non compare, e ricompare se lo si riaccende.
- Un cane che ha già `hiddenServiceIds: ['bagno']` mostra Bagno, anche senza una migrazione.
- Due letture dello stesso cane producono le stesse righe.
- La sezione manca se nessun servizio è acceso.
- Il segmento Tema scrive `groomly.theme`. Un payload di impostazioni col tema opposto non cambia la chiave né `documentElement.dataset.theme`.
- Con una sessione locale già `in`, `openingGate` non restituisce `pending`.
- All’avvio con Firebase, la prima lista cani è quella locale, e l’iscrizione al cloud non la sostituisce con un elenco vuoto prima dello snapshot.
- Sul telefono nativo, il tap su WhatsApp non chiama `Browser.open`. L’indirizzo è `whatsapp://send?phone=` con le cifre di `whatsAppLink`. Se l’apertura fallisce, il toast è «WhatsApp non si apre».
- I due pulsanti non hanno le scritte visibili, hanno i nomi accessibili «Chiama» e «WhatsApp», e stanno in una riga senza `flex-wrap: wrap`.
- La barra ha i cinque link in quest’ordine, Altro punta a `/impostazioni`, Home non ha il link «Impostazioni», la campanella resta, il + ha ancora «Apri azioni».

## 7. Fuori da questo lavoro

Non si riprogetta l’editor dei prezzi, il foglio del +, il campanello, il listino o il calendario. Non si aggiunge un campo Firestore nuovo per i servizi in scheda. Non si sincronizza il tema fra i telefoni.
