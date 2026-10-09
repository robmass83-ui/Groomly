# Groomly — Completato (ciclo 5)

Data: 2026-10-09
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` e il mockup `groomly-design.html`.
Questo documento copre il bottone **Completato · fissa il prossimo** del §8.7, e il fatto che un appuntamento completato non è più «il prossimo». I cicli 1–4 sono già su `master` e non si ridisegnano. La toelettatrice usa solo il telefono. L’app resta in React, con i dati sul dispositivo.

## 1. Scopo

Sul dettaglio di un appuntamento «programmato», **Completato · fissa il prossimo** segna quell’appuntamento come «completato» e tiene la durata e il prezzo già salvati. Al posto del bottone compaiono **+2 sett**, **+4 sett** e **+6 sett**, che fissano subito il successivo a partire da quell’appuntamento. Un appuntamento «completato» non è più il prossimo, anche se il suo inizio è ancora davanti.

## 2. Fuori da questo ciclo

Durata reale da digitare, `actualDurationMin`, `recurrenceWeeks`, scadenza mensile, mese corrente e mese successivo, filtri Tutti / Da fissare / Fissati, conteggio «3 da fissare · 5 fissati», un bottone per rimettere l’appuntamento «programmato», notifiche locali, Capacitor, campanello, listino PDF, backup, Firebase, Storage, vista settimana, vista mese, griglia, trascinamento, anticipa e posticipa, foto prima/dopo.

Il Listino resta «In arrivo». «Nuovo cane» non cambia. Il menu + non cambia. I chip sulla scheda del cane restano gli stessi tre pulsanti, nello stesso punto, e continuano a salvare subito con **Annulla**. Archiviare un cane non tocca gli appuntamenti.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Dove sta lo stato | Campo `status` su `Appointment`: `'programmato'` o `'completato'` |
| Record già salvati | Senza `status` si leggono come `'programmato'`. Non si riscrivono finché non c’è un altro salvataggio |
| Nuovo appuntamento | Sempre `'programmato'`, anche quello creato da un chip |
| Durata e prezzo | Restano le righe già salvate. Completato non le ricalcola |
| Prossimo | `start >= now` e `status !== 'completato'`. Stesso criterio per la scheda e per Clienti mensili |
| Giorno e calendario | Un completato resta nel giorno del suo `start` |
| Chip sul dettaglio | Partono da quell’appuntamento, copiano le sue righe, salvano subito |
| Chip sulla scheda | Prima il prossimo aperto; se non c’è, l’appuntamento con `start` più grande, anche se è completato |
| Modifica | Resta. Non riporta lo stato a `'programmato'` |
| Cancella | Resta. Toglie l’appuntamento |
| Annulla sul toast | Toglie solo l’appuntamento appena creato. Non riapre il completato |
| Persistenza | Nessuna chiave `localStorage` nuova. Lo stato sta nella mappa appuntamenti già usata |

## 4. Architettura

`Appointment` guadagna `status`. `AppointmentWrite` no: creare e modificare non scelgono lo stato. `createAppointment` scrive `status: 'programmato'`. `updateAppointment` ricopia lo `status` precedente. Una funzione `completeAppointment(uid, id)` mette `'completato'`, aggiorna `updatedAt`, e non cambia `start`, `services`, `dogId`, `createdAt`. Se l’id non c’è, fallisce come le altre scritture assenti.

In lettura, `status` mancante o diverso dai due valori diventa `'programmato'`.

`nextAppointment` salta i `'completato'`. `chipSource` usa `nextAppointment`. Se quello è `null`, prende l’appuntamento di quel cane con `start` più grande; a parità di `start`, l’`id` minore, come già fa il passato. Il risultato può essere un completato, anche con `start` ancora davanti.

Il dettaglio non usa `chipSource`. **+N sett** fa `shiftWeeks` sull’inizio di quell’appuntamento e `saveNew` con le sue righe copiate. Il nuovo ha `status: 'programmato'`. Non passa dal modulo e non controlla la sovrapposizione: è lo stesso gesto della scheda.

`useAppointments` espone `complete(id)`, con lo stesso booleano di `saveNew`: `true` se ha scritto, `false` se no. Il toast nasce da quel booleano.

Clienti mensili non ha una schermata nuova. `monthlyLists` continua a chiamare `nextAppointment`, quindi un cane il cui unico futuro è completato torna in **Da fissare**. Home «Oggi» e il calendario del giorno continuano a usare il giorno locale, senza filtrare lo stato.

Esci toglie solo `groomly.session`. `findCorruptGroomlyKey` non cambia.

## 5. Schermate

Sul dettaglio, se lo stato letto è `'programmato'`, sotto **Modifica** e **Cancella** c’è il bottone primario **Completato · fissa il prossimo**.

Se la scrittura riesce, quel bottone non c’è più. Al suo posto c’è la riga **Completato** e i tre pulsanti **+2 sett**, **+4 sett**, **+6 sett**, con lo stesso aspetto dei chip della scheda, che vanno a capo se non ci stanno. **Modifica** e **Cancella** restano.

Il toast di un chip riuscito è `Fissato per ${formatBookedWhen(start)}`, tono `plain`, con **Annulla**. **Annulla** cancella solo il nuovo id. Se la cancellazione fallisce: «Salvataggio non riuscito».

La scheda del cane non guadagna la parola **Completato** e non guadagna un bottone nuovo. Il suo «Prossimo appuntamento» segue `nextAppointment`, quindi un solo completato futuro diventa «Nessun appuntamento» finché non se ne fissa un altro.

## 6. Errori

`complete` false: toast «Salvataggio non riuscito», tono `plain`. Lo stato resta `'programmato'` e i chip non compaiono.

Chip false: toast «Salvataggio non riuscito». Lo stato resta `'completato'` e i chip restano.

Non si usa `window.confirm`. Non si chiede la durata. Un inizio spostato di N settimane che cade ancora nel passato si salva lo stesso: i chip della scheda fanno già così.

## 7. Test

L’orologio, dove serve una data, è sabato 3 ottobre 2026, ore 12:00 locali. I test di `App` hanno `// @vitest-environment happy-dom` come prima riga. Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`. Non si alza Vitest.

- Un JSON senza `status` si legge `'programmato'` e può essere `nextAppointment`. Un creato nuovo persiste `status: 'programmato'`. Il test che oggi si aspetta `status` assente si aggiorna.
- Un `'completato'` con inizio ancora davanti non è `nextAppointment`. Se c’è anche un aperto futuro, il prossimo è l’aperto.
- Senza aperti, `chipSource` è l’appuntamento con `start` più grande, anche completato.
- Sul dettaglio, **Completato · fissa il prossimo** persiste `'completato'` e mostra i tre chip. **+4 sett** crea un `'programmato'` quattro settimane dopo, con le stesse righe. **Annulla** toglie solo quello. Il completato resta.
- Scrittura dello stato fallita: si resta su **Completato · fissa il prossimo** e non compaiono i chip.
- Il chip **+2 sett** della scheda salva subito e non marca completato l’appuntamento di partenza.
- In Clienti mensili, un mensile il cui unico futuro è completato è sotto **Da fissare**.
- In Home, quel completato resta sotto «Oggi» se il suo giorno è oggi.
- **Modifica** di un completato lo lascia `'completato'`.

I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
