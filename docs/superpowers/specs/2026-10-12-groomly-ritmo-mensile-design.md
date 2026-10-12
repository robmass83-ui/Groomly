# Groomly — Ritmo del mensile

Data: 2026-10-12
Stato: sezioni approvate il 12 ottobre 2026, in attesa della lettura di questo file.

Questa è l’unica specifica di questo lavoro. Si implementa insieme, in un unico passaggio. Dove una specifica precedente tiene i pulsanti «+2 sett», «+4 sett», «+6 sett», «Fissa il prossimo» e «Data…» nel profilo, o conta come non fissato il giro dopo un appuntamento già in agenda, vale questo testo.

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | Nel profilo del cane non si fissa più dalla riga di pulsanti. Si fissa da «Fissa appuntamento». |
| D2 | Un programmato da oggi in poi copre il giro, anche se il giorno è prima o dopo la scadenza. In Clienti mensili è Fissato. Il giro dopo non compare finché quella visita non è completata. |
| D3 | Se il giorno salvato non è la scadenza, prima di scrivere si chiede se le settimane partono da questa visita o dal ritmo già in corso. La risposta resta sull’appuntamento e si applica al completamento. |
| D4 | Il ritmo è un numero di settimane esatte, quello in scheda. Quattro settimane sono 28 giorni. |
| D5 | Un appuntamento vecchio, senza scelta, al completamento conta la propria data più le settimane. Non c’è una migrazione. |

## 1. Profilo del cane

Sparisce la riga sopra lo storico: «+2 sett», «+4 sett», «+6 sett», «Fissa il prossimo» e «Data…». Sparisce anche il foglio «Appuntamento già fissato», che serviva solo a quei pulsanti.

Resta il pulsante **Fissa appuntamento**. Apre il foglio nuovo appuntamento con quel cane già scelto. Resta la riga del prossimo appuntamento, se ce n’è uno da oggi in poi: data, servizi e durata. Il tocco apre quella visita. Se non c’è, resta «Nessun appuntamento». Lo storico non cambia.

**Fissa il prossimo** sulla visita già completata resta. Anticipa e posticipa di 15 minuti, nel foglio dell’appuntamento, restano: spostano l’ora nello stesso giorno e non riaprono la domanda sul ritmo.

## 2. Scadenza aperta

La scadenza aperta è il giorno con cui si confronta una data nuova. Si calcola solo per un cane mensile attivo che ha almeno un appuntamento `completato`.

L’ultimo completato è quello con `start` più recente. A parità di `start`, vince l’id minore. Le settimane sono quelle che il cane avrà dopo il salvataggio: se il foglio sta anche aggiornando la frequenza, si usa quel numero; altrimenti `recurrenceWeeks` della scheda, e 4 se il campo manca.

Il primo slot è l’inizio dell’ultimo completato più quel numero di settimane. Non si saltano i giri in avanti solo perché la data è nel passato.

Ogni `programmato` da oggi in poi, nello stesso cane, copre uno slot e ne apre un altro. Si prendono in ordine di inizio; a parità di inizio, l’id minore. L’appuntamento che si sta modificando non entra nel conto. Per ciascuno:

- con scelta `ritmo` e scadenza coperta scritta, lo slot successivo è la scadenza coperta più le settimane; se quel giorno è prima della visita o lo stesso giorno, si aggiunge un altro giro, finché il giorno è dopo la visita;
- senza scelta, o con scelta `visita`, lo slot successivo è l’inizio di quella visita più le settimane.

La scadenza aperta è lo slot che nessun programmato futuro ha ancora coperto. Il confronto fra giorni è il giorno locale: l’ora non conta. L’istante della scadenza tiene l’ora dello slot da cui è stato calcolato, così i giri successivi restano alla stessa ora.

Esempio, 4 settimane. Ultimo completato il 1° gennaio alle 09:30. La scadenza aperta è il 29 gennaio alle 09:30. Un programmato il 20 gennaio con scelta `ritmo` e scadenza coperta il 29 gennaio sposta la scadenza aperta al 26 febbraio. Lo stesso programmato con scelta `visita` la sposta al 17 febbraio.

## 3. La domanda

La domanda compare al salvataggio, prima della scrittura, se tutte queste condizioni sono vere:

- dopo il salvataggio il cane è mensile e attivo;
- ha almeno un completato;
- il giorno locale della data salvata è diverso dal giorno della scadenza aperta;
- le due risposte qui sotto cadono in due giorni locali diversi.

Se il giorno è quello della scadenza, si salva senza domanda e senza scelta. Se le due risposte cadono nello stesso giorno, si salva allo stesso modo, senza domanda e senza scelta: al completamento la data della visita più le settimane coincide già col ritmo. Un occasionale resta senza domanda, anche se questo salvataggio lo lascia occasionale. Un mensile senza completati resta senza domanda: non ha un ritmo. Un cane creato nello stesso foglio non ha completati, quindi non vede la domanda. Un occasionale che in questo salvataggio diventa mensile, e ha già un completato, vede la domanda se il giorno non è la scadenza.

Il foglio è uno `Sheet`.

- Titolo: «Ritmo del mensile».
- Testo: «Il 20 gen non è la scadenza del 29 gen. Da dove ripartono le 4 settimane?» Le date usano il formato già in app, `d MMM`. Il numero è quello del §2. Con 1 settimana il testo è «Da dove riparte la settimana?».
- **Da questa visita · 17 feb.** Scrive `cycleAnchor: 'visita'`.
- **Dal ritmo in corso · 26 feb.** Scrive `cycleAnchor: 'ritmo'`.
- **Annulla** chiude il foglio e non scrive l’appuntamento, né un cane nuovo, né un cambio di tipo o di frequenza.

Le date sui bottoni sono quelle che il completamento userà, già con l’eventuale giro in più. «Da questa visita» è l’inizio della visita più le settimane. «Dal ritmo in corso» è la scadenza aperta più le settimane, spostata in avanti di un giro finché il giorno non è dopo la visita. Nel caso del 15 marzo che copre il 29 gennaio, il bottone del ritmo dice 26 mar, non 26 feb.

Insieme alla scelta si scrive `coveredDue`, l’istante della scadenza aperta. Se il giorno coincide con la scadenza, i due campi non si scrivono; in modifica si tolgono.

Cambiare il giorno e salvare ricalcola la scadenza aperta e, se serve, ripresenta la domanda. Anticipa e posticipa di 15 minuti restano nello stesso giorno: non chiedono e non cancellano una scelta già scritta.

Se il foglio crea anche il secondo appuntamento, tra N settimane, la domanda riguarda solo il primo giorno. Il secondo si scrive sulla sua data, senza seconda domanda e senza copiare la scelta del primo.

Se il salvataggio fallisce, non resta nulla di quel tentativo e il toast è «Salvataggio non riuscito». La risposta data resta valida se si riprova senza cambiare giorno.

## 4. Cosa resta scritto

Sull’appuntamento, due campi opzionali:

- `cycleAnchor`: `'visita'` oppure `'ritmo'`;
- `coveredDue`: data della scadenza coperta.

Sul telefono `coveredDue` è una stringa ISO, come `start`. Nel documento Firebase è un istante in millisecondi, come `start`. I due campi passano da archivio locale, mappa Firebase e seme locale. Un valore illeggibile si ignora: l’appuntamento si comporta come uno vecchio, senza scelta.

`disdetto`, `non_venuto` e la cancellazione non completano. Quegli appuntamenti non sono l’ultimo trattamento e non fissano. La scelta scritta sopra non si applica.

## 5. Dopo il completamento

La scadenza del giro dopo si calcola quando la visita passa a `completato`, usando le settimane in scheda in quel momento.

- Scelta `visita`, giorno uguale alla scadenza, oppure completato vecchio senza scelta: la successiva è l’inizio della visita più le settimane. Il 20 gennaio diventa il 17 febbraio.
- Scelta `ritmo`, con scadenza coperta: si parte dalla scadenza coperta più le settimane. Il 20 gennaio che copre il 29 gennaio porta al 26 febbraio. Il 10 febbraio che copre il 29 gennaio porta allo stesso 26 febbraio. Se quel giorno è prima della visita o lo stesso giorno, si aggiunge un giro. Il 15 marzo che copre il 29 gennaio salta il 26 febbraio e va al 26 marzo.

Conta l’ultimo completato. Un completato successivo, senza scelta, sposta di nuovo la scadenza sulla propria data più le settimane.

**Fissa il prossimo**, sulla visita completata, scrive subito l’appuntamento nel giorno di quella scadenza, alla stessa ora della visita completata, con gli stessi servizi. Se la visita completata ha `seriesId`, il nuovo lo tiene. Il giorno è la scadenza, quindi la domanda non ricompare e i due campi restano vuoti. Il toast e Annulla restano quelli di oggi. Se esiste già un programmato futuro, resta la conferma già presente prima di scrivere.

Disdici e Non venuto non spostano la scadenza.

## 6. Clienti mensili e Home

Un mensile attivo con almeno un completato e un `programmato` il cui giorno locale è oggi o dopo sta solo sotto **Fissato**, con la data di quella visita. La visita mostrata è la prima in ordine di inizio. Non compare in In ritardo, in In scadenza e non ha una riga Non fissato. La sezione **Non fissato** non si disegna più.

Il fissato si vede nel mese della visita.

- Visita il 20 gennaio, scadenza il 29 gennaio: a gennaio è Fissato, «20 gen». A febbraio non c’è, finché quella visita non è completata.
- Visita il 10 febbraio: è Fissato a febbraio, «10 feb». Nel mese precedente non è da fissare.
- Se il mese della visita è dopo il mese successivo a oggi, e quindi il segmento non lo raggiunge, la riga sta nei Fissati del mese corrente, con la sua data. Non sta anche nel mese successivo.

Un `programmato` di un giorno già passato non fissa e non è l’ultimo trattamento. Vale il comportamento di oggi.

Senza un programmato futuro, la regola di oggi resta. Scadenza già passata: In ritardo, nel mese corrente. Scadenza entro i giorni di anticipo: In scadenza questa settimana, nel mese corrente, anche se il giorno cade nel mese dopo. Scadenza più lontana: non è in lista. Dopo il completamento, la scadenza usata da questi gruppi è quella del §5.

Un mensile senza completati resta in **Nuovi**, nel mese corrente, anche con una visita già in agenda. Non è Fissato e non entra nel promemoria.

Se l’inizio della visita è dopo la scadenza coperta più 14 giorni, la riga resta nei Fissati e il bollino dice «Fissato in ritardo» più la data della visita, in arancione. Una visita il 20 febbraio che copre il 29 gennaio è «Fissato in ritardo · 20 feb». Senza `coveredDue` si usa la scadenza aperta ricalcolata come nel §2, escludendo quella visita. Il bollino non la sposta fra i da fissare e non accende il banner. Una visita il 10 febbraio che copre il 29 gennaio non è in ritardo: il 29 gennaio più 14 giorni è il 12 febbraio.

Il banner in Home, il pallino e la notifica contano solo In ritardo e In scadenza del mese corrente. Un anticipo o un posticipo già fissato non li accende. Il riquadro dei mensili in Home usa gli stessi fissati e gli stessi da fissare di Clienti mensili nel mese corrente. I Nuovi non entrano nel conto.

In Animali, se c’è un programmato da oggi in poi, la terza riga mostra quella data, come oggi.

## 7. Verifica

- Nel profilo non ci sono «+2 sett», «+4 sett», «+6 sett», «Fissa il prossimo» e «Data…». Non c’è il foglio «Appuntamento già fissato». **Fissa appuntamento** apre il foglio con quel cane. La riga del prossimo appuntamento resta e apre la visita.
- Mensile con completato il 1° gennaio e data 20 gennaio: il foglio «Ritmo del mensile» compare prima della scrittura. Annulla non scrive. «Da questa visita» salva `cycleAnchor: 'visita'` e `coveredDue` il 29 gennaio. «Dal ritmo in corso» salva `'ritmo'` con la stessa scadenza coperta.
- Il 29 gennaio, a qualsiasi ora, salva senza domanda e senza i due campi. Se le due risposte cadono nello stesso giorno, si salva senza domanda e senza i due campi. Un occasionale e un mensile senza completati salvano senza domanda.
- Anticipa o posticipa di 15 minuti non chiede e non cancella la scelta. Cambiare giorno e salvare può richiedere. Il secondo futuro si confronta con la scadenza aperta dal primo.
- Il salvataggio di due appuntamenti insieme chiede solo per il primo. Il secondo non ha `cycleAnchor`.
- Completato il 20 gennaio con `visita`: scadenza successiva il 17 febbraio. Con `ritmo` e scadenza coperta il 29 gennaio: il 26 febbraio. Completato il 15 marzo con quella scelta: il 26 marzo. Un completato senza campi: la propria data più le settimane.
- **Fissa il prossimo** scrive quel giorno, alla stessa ora, senza il foglio del ritmo. Disdici e Non venuto non spostano la scadenza.
- Con il programmato il 20 gennaio, Clienti mensili di gennaio mostra Fissato e non mostra Non fissato. Febbraio non lo elenca. Con il programmato il 10 febbraio, febbraio lo mostra Fissato e gennaio non lo mette da fissare. Una visita oltre il mese successivo compare nei Fissati del mese corrente.
- Senza futuro, In ritardo e In scadenza restano. Il banner non include un cane che ha già un programmato futuro. I Nuovi restano Nuovi. «Fissato in ritardo» resta arancione e dentro Fissati.
- I due campi sopravvivono a lettura e scrittura locale e al documento Firebase. Un appuntamento senza i campi, già salvato, continua a scadere dalla propria data.

## 8. Fuori da questo lavoro

Non si cambia il calendario, il listino, né il significato di Anticipa −15 e Posticipa +15. Non si toglie **Fissa il prossimo** dalla visita completata. Non si chiede il ritmo a un occasionale che resta occasionale, né a un mensile senza completati. Non si migrano gli appuntamenti vecchi.
