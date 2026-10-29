# Groomly — Note sull’appuntamento

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-23
Stato: accettata il 2026-10-23. Il piano si esegue e alla fine si pubblica.

Le note libere non stanno più sulla scheda del cane. Si scrivono prenotando una visita di un cane, e si rileggono aprendo quella visita. Nel calendario, accanto all’avviso rosso, la parola `altro` compare solo se quella visita ha almeno una nota.

## Decisioni chiuse

1. L’elenco si chiama `extraNotes` e sta su `Appointment` e su `AppointmentWrite`. Il tipo di una riga resta `DogExtraNote`: `id`, `text`, `createdAt`.
2. Regole di una riga, uguali a oggi: testo vuoto o oltre 240 caratteri non si salva; al massimo 40 righe; in lettura una riga di soli spazi sparisce. `undefined` in un aggiornamento tiene le note già salvate. Un elenco, anche vuoto, le sostituisce.
3. Le note viaggiano nel documento della visita, in locale e su Firestore. In locale la data è ISO. Su Firestore è in millisecondi.
4. L’avviso rosso resta `criticalNote` del cane. Il campo singolo `notes` del cane resta. `extraNotes` già presenti su un cane restano nei dati e non si leggono più: niente pulsante in scheda, niente `altro` da lì, niente copia sulle visite.
5. Un appuntamento personale non ha questo elenco. Una chiusura nemmeno.
6. Le note sono di questa visita. La ripetizione non le copia sulla visita successiva.
7. Non si modifica una riga sul posto. Si toglie e se ne scrive un’altra. «Togli» non chiede conferma.
8. Cambiare orario, servizi, stato, totale o durata non cancella le note. Solo un elenco esplicito le sostituisce. Cancellare la visita cancella le sue note, perché stanno nel suo documento.
9. Nel calendario non si legge il testo. Si legge solo `altro`, minuscolo, se quella visita ha almeno una nota. Il testo si legge nell’appuntamento aperto.
10. Questa specifica, da sola, non alza `APP_VERSION`. La pubblicazione avviene a implementazione finita, con i test verdi, e alza la patch rispetto alla versione allora installata.

## Fuori da questo lavoro

- Spostare le note già salvate sulla scheda del cane dentro le visite.
- Cancellare il campo `extraNotes` dai documenti cane.
- Una sola casella di testo al posto dell’elenco.
- Mostrare il testo delle note nella card del calendario.
- Note per l’appuntamento personale o per la chiusura.
- Copiare le note sulle visite generate dalla ripetizione.

## Approcci scartati

- Una sola casella di testo sulla visita. Si perde «Togli» su una riga sola.
- Tenere la nota anche in scheda e copiarla sulla visita al salvataggio. Due posti da tenere uguali, e la nota deve uscire dal profilo.

## 1. Dati

`cleanExtraNote`, `EXTRA_NOTE_MAX` (240), `EXTRA_NOTE_LIMIT` (40) e `hasExtraNotes` restano in `src/lib/dogNotes.ts` e si usano anche per la visita. `hasExtraNotes` è vero se almeno una riga, dopo `trim`, ha testo.

Lettura e scrittura della visita, in `src/data/local/appointments.ts` e in `src/lib/firebaseMap.ts`, trattano `extraNotes` come già fa il cane: scartano id vuoto, testo vuoto e data illeggibile; gli spazi soli non tornano.

Un salvataggio del cane che omette `extraNotes` continua a tenere l’elenco già memorizzato. Così una modifica della scheda non azzera note vecchie che l’interfaccia non mostra più.

Nel registro, la riga del cane torna a unire solo `criticalNote` e `notes`. La riga della visita, nel campo `note`, mette i testi delle `extraNotes` di quella visita, in ordine di `createdAt` e poi di `id`, uno per riga. Se c’è anche `adjustmentNote`, sta in una riga dopo. Senza né note né `adjustmentNote`, la cella resta vuota.

## 2. Prenotazione

In `AppointmentForm`, solo per una visita di un cane, il blocco compare quando la scheda del cane è visibile, compresa la scheda del cane nuovo creato nello stesso modulo. Sta sotto quella scheda e prima di «Servizi». Prima di scegliere un cane non c’è.

- una card per nota, testo normale, non rosso;
- su ogni card, «Togli», con `aria-label` `Togli nota: ` più il testo;
- sotto, «Aggiungi nota»;
- a 40 note il pulsante è disabilitato e sotto c’è «Troppe note».

«Aggiungi nota» apre un dialogo con titolo «Aggiungi nota», campo «Nota», `maxLength` 240, «Salva» e «Annulla». Salva con testo vuoto non chiude e non scrive. L’ordine in elenco è `createdAt`, poi `id`.

Le note fanno parte dello stato del modulo e escono in `AppointmentWrite` quando si preme «Salva». Cambiare cane non le cancella. Un cane creato nello stesso modulo non le riceve in scheda.

Lo stesso modulo, quando modifica una visita già salvata, mostra le note di quella visita e le rimanda nel salvataggio. L’appuntamento personale non mostra il blocco.

Sulla scheda del cane dentro il modulo resta solo l’avviso rosso del cane, per intero. La parola `altro` non sta lì: le note della visita sono il blocco sotto.

## 3. Appuntamento aperto

In `AppointmentPage`, sotto l’avviso rosso del cane. Se l’avviso manca, il blocco c’è lo stesso. Vale anche per una visita già chiusa, disdetta o segnata come non venuto.

Stessi controlli della prenotazione: card, «Togli», «Aggiungi nota», «Troppe note», stesso dialogo. Salva e Togli aggiornano la visita. Errore: toast «Salvataggio non riuscito» e l’elenco resta com’era.

Il riquadro rosso contiene solo `criticalNote`. Non contiene la parola `altro`, perché i testi sono già sullo schermo.

Dalla scheda del cane (`DogPage`, vista lettura) escono «Aggiungi nota», «Togli», le card e il dialogo. Restano l’avviso rosso e il blocco «Note» del campo vecchio.

## 4. Calendario

`altro` è esattamente quella parola, minuscolo, `font-weight` 700, colore `var(--tx2)`. Sta sulla stessa riga del rosso, a destra, senza andare a capo. La frase rossa può accorciarsi con i puntini. Se l’avviso manca e la visita ha note, la riga contiene solo `altro`.

`hasNote` dell’altezza in agenda è vero se c’è l’avviso del cane oppure se la visita ha note.

La parola compare solo se `hasExtraNotes` della visita è vero:

- vista giorno, accanto al rosso;
- vista settimana, accanto al rosso;
- strisce della settimana (`WeekRows`), accanto al rosso;
- vista compatta, accanto all’icona di avviso, visibile e non solo nell’`aria-label`;
- Home e lista del giorno sotto il mese, accanto al nome, perché quelle righe non stampano il rosso.

In agenda si passa a `NoteAltro` il titolo di `splitCritical`. Non si passa più `extraNotes` del cane. Toccare la visita apre la visita.

## 5. Errori

- Testo vuoto: il dialogo resta aperto e non si scrive.
- Oltre 240 caratteri: la riga è nulla. Il campo ha già `maxLength` 240.
- Quarantunesima nota: pulsante disabilitato, scritta «Troppe note», niente toast.
- Salvataggio fallito sull’appuntamento aperto: toast «Salvataggio non riuscito», elenco invariato.
- Aggiornamento della visita senza il campo: le note restano.
- Elenco vuoto: le note si cancellano e `altro` sparisce dal calendario.

## 6. Prove

- Una nota di 240 caratteri sulla visita si salva in locale e nel documento Firestore. Una di 241 no. Una riga di soli spazi non torna in lettura.
- Omettere `extraNotes` in un aggiornamento tiene le note. `[]` le azzera.
- In prenotazione «Salva» mette le note sulla visita.
- Nell’appuntamento aperto si aggiunge una nota e si toglie.
- Il calendario mostra `altro` solo se quella visita ha una nota. Note vecchie ancora presenti sul cane non accendono `altro`.
- La scheda del cane non ha più il pulsante «Aggiungi nota».
- L’appuntamento personale non ha il blocco.
- Nel registro la cella `note` della visita contiene il testo della nota, e l’`adjustmentNote` se c’è. La cella del cane non contiene più le `extraNotes` del cane.
