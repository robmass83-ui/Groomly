# Groomly — Calendario: giorno, settimana, mese

Data: 2026-10-10
Stato: approvata il 10 ottobre 2026.

Questa specifica copre solo il calendario: come ci si sposta, la vista settimana a righe e il bollino del mese. Il foglio appuntamento non cambia. Elimina resta nel menu `···`.

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | Le frecce in alto seguono la vista. Giorno: ±1 giorno. Settimana: ±7 giorni. Mese: ±1 mese. Il titolo resta il mese della data selezionata. |
| D2 | In vista Giorno, un gesto orizzontale netto sulla griglia vuota cambia giorno: dito a sinistra, giorno dopo; dito a destra, giorno prima. Il gesto verticale scorre le ore. Il gesto che parte su un appuntamento resta lo spostamento già esistente. |
| D3 | In vista Settimana non c’è la griglia delle ore. I sette giorni sono righe, lunedì in alto. Gli appuntamenti del giorno stanno su una sola riga, in ordine di ora. |
| D4 | La carta della settimana mostra, a testo piccolo: nome intero su una riga, sticker del carattere, ora, servizi, nota critica se c’è. Il nome non va a capo e non si tronca. |
| D5 | Le carte che non entrano restano visibili a destra, schiacciate. Lo scorrimento della riga le espande, in sequenza, fino a farle uguali alle altre, e le porta in vista. |
| D6 | In vista Mese, un giorno del mese con appuntamenti ha sfondo verde chiaro, data verde e un tondo verde con il conteggio in bianco. Un giorno di un altro mese, ai bordi della griglia, tiene solo il tondo. Il blu resta per il giorno selezionato e per l’anello di oggi. |
| D7 | Nessun dato nuovo. Si scrivono solo la data nell’indirizzo, già usata, e gli appuntamenti già esistenti. |

## 1. Spostamento

`CalendarPage` resta l’unica pagina. `vista` e `data` restano i parametri dell’indirizzo. `goTo` non cambia.

Le frecce chiamano un solo spostamento:

- `giorno`: `addDays(day, delta)`
- `settimana`: `addDays(day, delta * 7)`, così il giorno della settimana selezionato non cambia
- `mese`: `addMonths(day, delta)`, come oggi

L’etichetta accessibile è «Giorno precedente» / «Giorno successivo», «Settimana precedente» / «Settimana successiva», «Mese precedente» / «Mese successivo». Il titolo è `monthTitle(day)`. Passare dal 31 ottobre al 1 novembre aggiorna il titolo a «Novembre 2026». **Oggi** porta alla data di oggi, come adesso.

### Swipe del giorno

Vale solo con `vista=giorno`, sul contenitore della griglia delle ore, e solo se il puntatore è partito fuori da un appuntamento. Si riconosce al rilascio: lo spostamento orizzontale è almeno 48 px ed è maggiore di quello verticale. Sotto quella soglia non si cambia giorno. Sinistra (`deltaX` negativo) chiama `goTo` del giorno dopo. Destra chiama il giorno prima. Lo scorrimento verticale della griglia non viene intercettato: se il movimento è più verticale che orizzontale, la pagina non chiama `preventDefault` sul gesto.

La striscia dei sette giorni resta in vista Giorno e segue `weekDays(day)`. In vista Settimana quella striscia non si disegna: ogni riga ha già la data. In vista Mese non c’è swipe di pagina. Il tocco sul giorno del mese resta `goTo`.

## 2. Settimana

`WeekRows` è un componente usato solo da `CalendarPage` quando `vista` è `settimana`. Riceve i sette giorni, la data selezionata, appuntamenti, cani e servizi. Non salva. Comunica con tre callback: selezionare il giorno, aprire l’appuntamento, creare un appuntamento in quel giorno senza ora.

Sopra le righe restano titolo, segmenti, **Oggi** e il riepilogo. Il riepilogo usa `scopedAppointments` della settimana, come oggi.

Ogni riga è il giorno a sinistra e le carte a destra. Il giorno è un bottone «Seleziona …». Se la data è quella selezionata, il numero è su fondo `var(--pri-solid)` con testo bianco. Una riga senza appuntamenti non ha carte.

Le carte sono in ordine di `byStart`, da sinistra a destra, su una riga che non va a capo. Ogni carta è un bottone «Apri …» e contiene:

- prima riga: nome del cane, sticker `TemperamentIcon` (bravo, agitato o mordace), ora di inizio. Il nome è `white-space: nowrap`, senza ellissi. La larghezza minima della carta è quella di questa riga
- servizi, chip piccoli, tutti. Se non entrano in larghezza vanno a capo dentro la carta. Il nome no
- nota critica, se c’è, in `var(--bad)`, una sola riga con ellissi se non entra: il titolo già restituito da `splitCritical`. Il nome non ha ellissi

Completato, disdetto, non venuto e cane archiviato usano gli stessi segni di oggi sulla carta (spunta, barrato, grigio). Non si nascondono.

### Quante carte sono intere

Larghezza utile = la riga a destra del giorno. Una scheggia è larga 34 px. Il buco tra le carte è 4 px. Si prende il massimo numero di carte intere tale che, insieme alle altre rese a 34 px, stiano tutte nella larghezza utile. Le prime, in ordine di ora, sono intere. Le altre sono schiacciate: la carta è larga 34 px, `overflow: hidden`, e il contenuto tiene la larghezza di una carta intera con `scaleX(0.3)` e origine a sinistra, così si vede che sono appuntamenti. Non si esce dallo schermo per scoprirle.

Se una carta intera, per il nome, è più larga della riga, resta intera. La riga scorre e le successive partono schiacciate.

Lo scorrimento orizzontale della riga, oltre 48 px, toglie lo schiacciamento a tutte le schegge. Partono a 80 ms una dall’altra. Alla fine la riga è scorrevole e si porta in vista la prima che era schiacciata. Un secondo gesto durante l’animazione salta allo stato già espanso. Con `prefers-reduced-motion: reduce` l’espansione è immediata, senza sequenza. Al ridimensionamento si ricalcola: se entrano tutte, nessuna resta schiacciata.

Un tocco che non ha superato i 48 px apre la carta. Se il gesto ha superato i 48 px, il rilascio non apre l’appuntamento: espande soltanto. Un tocco sullo spazio vuoto della riga apre `/appuntamenti/nuovo?data=` di quel giorno, senza `ora`. Il trascinamento per cambiare orario non esiste in settimana.

## 3. Mese

La griglia `Mese`, la lista del giorno selezionato e «+ Aggiungi» restano. Cambia solo la cella.

Il conteggio è `onLocalDay(appointments, date).length`, tutti gli stati, come il numero piccolo di oggi. Zero appuntamenti: niente tondo. La cella vuota resta com’è, weekend compreso (`var(--surf)` sabato e domenica).

Con almeno un appuntamento:

- sfondo della cella `var(--ok-s)`, data in `var(--ok)`, peso 800
- sotto la data, un tondo `var(--ok)`, testo bianco, 18 px, con il conteggio. Da 10 in su il tondo cresce in larghezza, con 2 px di padding orizzontale, così le due cifre ci stanno
- il weekend non copre questo sfondo

Il giorno selezionato resta fondo `var(--pri-solid)` e data bianca. Se ha appuntamenti, il tondo verde sta sopra la cella blu con un alone di 2 px bianchi. L’anello di oggi (`inset 0 0 0 2px var(--pri)`) resta se il giorno non è selezionato. Se oggi è selezionato, vince la cella blu e l’anello non si somma. Se oggi ha appuntamenti e non è selezionato, si vedono anello blu, sfondo verde e tondo verde.

I giorni del mese precedente e di quello successivo che la griglia già mostra restano testo `var(--tx3)`, senza sfondo verde. Se hanno appuntamenti, il tondo verde c’è lo stesso.

Il nome accessibile del bottone, quando il conteggio è positivo, è la data più «, N appuntamenti» (N = 1: «1 appuntamento»).

## 4. Pezzi

- `CalendarPage` tiene frecce, swipe del giorno, griglia delle ore e mese.
- `WeekRows` tiene righe, schegge e animazione. Sta in `src/components/calendar/WeekRows.tsx`.
- `monthCellFace`, in `src/lib/calendarView.ts`, è pura e provata da sola. Riceve conteggio, selezionato, oggi e dentro il mese. Restituisce sfondo, colore della data, anello e, se il conteggio è positivo, il tondo.

Nessun cambiamento a `AppointmentPage`, a Elimina, a `deleteAppointment`, né al modello.

## 5. Casi limite

- Gesto verticale sulla griglia del giorno: non cambia data.
- Gesto che parte su un appuntamento del giorno: resta lo spostamento con Annulla, non cambia giorno.
- Gesto sotto i 48 px: non cambia giorno e non espande la settimana.
- Settimana vuota: sette righe corte e il riepilogo a zero.
- Nome più lungo della riga: la carta non tronca il nome; la riga scorre.
- Secondo swipe durante l’espansione: stato finale, carte intere.
- `prefers-reduced-motion`: espansione senza attesa.
- Rotazione o cambio larghezza: si ricalcola quante carte sono intere.

## 6. Prove

Si aggiornano le prove della settimana che cercano la griglia «Orari» o l’etichetta `08:00`: in settimana quella griglia non c’è. In vista Giorno la griglia delle ore resta, e le sue prove restano.

Nuove prove:

- frecce: in giorno ±1, in settimana ±7, in mese ±1, con l’etichetta accessibile della vista
- swipe del giorno oltre soglia cambia `data`; sotto soglia e in verticale no
- il gesto partito sul blocco del giorno non cambia `data`
- settimana: sette righe, carte in ordine di ora, nome su una riga, sticker, ora, servizio, nota
- con più carte di quante entrano, le ultime hanno la misura schiacciata; dopo lo scorrimento della riga sono larghe come le prime
- mese: tondo verde con il conteggio, assente se zero; giorno selezionato con appuntamenti tiene il tondo; giorno fuori mese con appuntamenti tiene il tondo e il testo grigio
- Elimina non è un bottone accanto a Modifica e Disdici

## 7. Fuori da questa specifica

Il menu `···` e la conferma di Elimina. Il trascinamento in vista Giorno. La lista sotto il mese. Il foglio di creazione, a parte l’ingresso senza `ora` dalla riga vuota della settimana.
