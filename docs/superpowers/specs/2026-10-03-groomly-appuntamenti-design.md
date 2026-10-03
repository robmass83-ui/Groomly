# Groomly — Appuntamenti (ciclo 3)

Data: 2026-10-03
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` e il mockup `groomly-design.html`.
Questo documento copre il giorno di lavoro, un taglio dei punti 5 e 6 del §10 di `GROOMLY.md`. I cicli 1 e 2 sono già su `master` e non si ridisegnano. La toelettatrice usa solo il telefono. L’app resta in React.

## 1. Scopo

Sostituire «In arrivo» in Home e il segnaposto Calendario con gli appuntamenti del giorno. La toelettatrice può fissarne uno, rivederlo, correggerlo, cancellarlo e, dalla scheda del cane, fissare il successivo a 2, 4 o 6 settimane. I dati restano sul dispositivo, nella forma `users/{uid}/appointments`, così più avanti si sostituisce solo il repository.

## 2. Fuori da questo ciclo

Vista settimana, vista mese, griglia oraria, trascinamento, anticipa e posticipa di 15 minuti, «Completato», durata reale, foto prima/dopo, strumenti, prodotti, ripetizione mensile, clienti mensili, banner e riquadri della Home, «Visti di recente», prezzi diversi da quelli del listino, creazione di un cane dal modulo appuntamento, listino PDF, backup, Firebase, Storage, Capacitor, notifiche, campanello.

Il Listino resta «In arrivo». «Nuovo cane» resta il percorso già in uso. Archiviare un cane non propone la cancellazione dei suoi appuntamenti.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Perimetro | Modulo, dettaglio, lista di oggi, lista del giorno scelto, chip +2 / +4 / +6 settimane |
| Pagine | Intere, come la scheda del cane. Nessun foglio per l’appuntamento |
| Obbligatori | Cane attivo, almeno un servizio attivo, giorno, ora di inizio |
| Ora | Quarti d’ora dalle 08:00 alle 19:00 comprese. La fine può superare le 19:00 |
| Durata e prezzo | Somma del listino per la taglia del cane, copiata sul record al Salva |
| Sovrapposizione | Si salva. La frase resta visibile |
| Chip | Copia il futuro più vicino, altrimenti il passato più recente. Senza nessuno, apre il modulo |
| Dettaglio | Si modifica. Si cancella solo dopo conferma. Nessuno stato «completato» |
| Persistenza | Una mappa `localStorage` per account, come i cani |

Un modulo aperto dal menu + parte alle 09:00. Un modulo aperto da un chip, quando non c’è nulla da copiare, ha cane e data già messi e l’ora ancora da scegliere.

## 4. Architettura

Home, Calendario, il modulo, il dettaglio e il blocco sulla scheda del cane chiamano solo `useAppointments`. L’hook chiama solo `src/data/local/appointments.ts`. Il repository usa `readJson` e `writeJson`. La chiave è `groomly.users.{uid}.appointments`.

Nel dominio le date sono `Date`. Nello storage sono stringhe ISO. `findCorruptGroomlyKey` riconosce anche questa chiave. Un JSON illeggibile mostra «Dati locali illeggibili» e non cancella nulla.

La durata, il prezzo, la sovrapposizione, il giorno locale e la scelta del chip sono funzioni pure. Non scrivono. Il chip, quando copia, chiede al repository di creare. Il modulo valida con Zod prima di chiamare l’hook.

L’hook restituisce `true` o `false`, come `useDogs`. Un `false` non aggiorna la lista in memoria. Il toast nasce da quel booleano, non da un effetto sull’errore: un secondo fallimento con la stessa frase deve potersi rivedere. Dopo una creazione riuscita l’hook tiene l’id nuovo, così la pagina può aprire il dettaglio.

### Rotte

| Percorso | Pagina | Barra in basso |
|---|---|---|
| `/` | Home, appuntamenti di oggi | sì |
| `/calendario` | Lista del giorno scelto | sì |
| `/appuntamenti/nuovo` | Modulo | no |
| `/appuntamenti/:id` | Dettaglio, poi modifica | no |

`/appuntamenti/nuovo` è registrata prima di `/appuntamenti/:id`. Il giorno del Calendario sta nella query `data`, in forma `aaaa-mm-gg`. Cane e data precompilati dal chip stanno nella query `cane` e `data` di `/appuntamenti/nuovo`. Un refresh le conserva. Dopo il primo salvataggio l’indirizzo diventa `/appuntamenti/:id`.

Il menu +, aperto dal Calendario, passa la `data` del giorno visibile. Aperto dalla Home, il giorno è oggi. «Nuovo cane» non cambia.

## 5. Schermate

Interfaccia solo in italiano. Colonna massima 390 px. Nessuno scroll orizzontale a 360 px.

### 5.1 Home

Restano intestazione, data, Impostazioni e ricerca. La ricerca apre ancora `/animali` e mette il fuoco nel campo. Al posto di «In arrivo» c’è la sezione «Oggi»: gli appuntamenti il cui inizio cade nel giorno locale di oggi, ordinati per inizio e poi per id.

Ogni riga mostra l’ora `HH:mm`, la durata, la foto del cane, il nome, i servizi e l’icona del carattere. Se i servizi non stanno nella riga, l’ultimo chip visibile è «+N». Se il cane ha un avviso critico, sulla riga c’è un segno rosso; il testo completo sta nel dettaglio. Il tocco apre `/appuntamenti/:id`.

Nessuna riga: «Nessun appuntamento».

La durata si legge «45 min» sotto l’ora, «2h» se i minuti sono un multiplo di 60, altrimenti «1h 15». Il prezzo usa `formatEuro`.

### 5.2 Calendario

Sostituisce il segnaposto. Titolo «Calendario». Controlli: giorno prima, giorno dopo, «Oggi». L’etichetta del giorno usa la data italiana già in uso per la Home. Senza query `data`, il giorno è oggi. Una `data` non valida conta come oggi.

Le righe e lo stato vuoto sono quelli della Home, filtrati sul giorno visibile. Il menu + apre `/appuntamenti/nuovo?data=` di quel giorno.

### 5.3 Modulo

Titolo «Nuovo appuntamento», oppure «Appuntamento» se si modifica un id esistente.

Il cane si cerca tra gli attivi, per nome, razza e proprietario, con la stessa normalizzazione di `searchKey`. Un archiviato non compare. Se non c’è nessun cane attivo, il modulo dice «Nessun cane» e Salva non scrive. Il cane nuovo si crea da «Nuovo cane».

I servizi attivi sono chip, nell’ordine del listino. Se ne sceglie almeno uno. Sotto, il giorno e l’ora. L’ora è solo l’elenco 08:00, 08:15, …, 19:00. Nel modulo aperto dal menu + l’ora iniziale è 09:00. Nel modulo aperto dal chip senza una copia, l’ora non è selezionata.

Una riga riassume durata e prezzo, per esempio «1h 15 · € 45», solo quando il cane e almeno un servizio sono scelti. I numeri vengono dalla taglia di quel cane. Prima, la riga non c’è.

Se l’intervallo ne copre un altro, sotto l’ora c’è «Si sovrappone a Rex, Luna». I nomi sono quelli dei cani in conflitto, nell’ordine di inizio. Un cane mancante conta come «Cane assente». In modifica l’appuntamento aperto non conta se stesso.

Salva scrive, mostra «Salvato» e apre il dettaglio. Nel modulo nuovo, Indietro torna alla schermata precedente e abbandona quello che non è stato salvato. In modifica, Indietro si comporta come nel dettaglio.

### 5.4 Dettaglio

In lettura: foto, nome, carattere, e l’avviso critico in un riquadro rosso sotto la foto, visibile senza cercarlo in fondo. Poi giorno e ora, durata, prezzo, servizi, telefono come link `tel:`. Il telefono vuoto non si mostra.

Modifica rende editabili cane, servizi, giorno e ora. Salva torna in lettura con il toast «Salvato». Indietro, durante la modifica, abbandona e lascia il dettaglio. Se il cane dell’appuntamento è stato archiviato dopo, il dettaglio lo mostra ancora e la modifica può tenerlo. La ricerca, in quel caso, offre solo cani attivi: non si può riselezionare un archiviato una volta cambiato cane.

Cancella mostra «Cancellare questo appuntamento?» con Annulla e Cancella. Non è la finestra del browser. Annulla chiude la domanda. Cancella toglie l’appuntamento e apre `/calendario?data=` del suo giorno. Il cane resta. Non c’è un toast di cancellazione.

Un id sconosciuto mostra il titolo «Appuntamento» e la frase «Appuntamento assente».

Se il cane non è più nella mappa, foto e nome sono sostituiti da «Cane assente». I servizi copiati restano.

### 5.5 Scheda del cane

Sotto l’avviso critico c’è «Prossimo appuntamento». Se esiste un appuntamento futuro di quel cane, si vedono giorno, ora, servizi e durata. Il tocco apre il dettaglio. Se non esiste, la frase è «Nessun appuntamento».

I chip «+2 sett», «+4 sett» e «+6 sett» stanno solo su un cane attivo. Su un cane archiviato non ci sono: un appuntamento futuro già fissato si apre e si può cancellare.

Il chip con qualcosa da copiare salva subito. Il toast è «Fissato per gio 29 ott 09:30», con Annulla. Annulla cancella solo l’appuntamento appena creato. Il toast dura due secondi, come gli altri. Se Annulla non viene premuto, l’appuntamento resta. Gli altri toast non hanno un pulsante.

Il testo della data è costruito dall’app, non dal formato libero di `date-fns`: giorno della settimana abbreviato senza punto (`gio`), numero del giorno, mese abbreviato senza punto (`ott`), ora `HH:mm`. Per il 29 ottobre 2026 alle 09:30 il toast è esattamente «Fissato per gio 29 ott 09:30».

Il chip senza nulla da copiare apre `/appuntamenti/nuovo?cane={id}&data=aaaa-mm-gg`. La data è oggi più 2, 4 o 6 settimane. Non salva.

## 6. Dati

```ts
export interface AppointmentService {
  serviceId: string
  name: string
  durationMin: number
  price: number
}

export interface Appointment {
  id: string
  dogId: string
  start: Date
  services: AppointmentService[]
  createdAt: Date
  updatedAt: Date
}
```

Non c’è un campo stato e non c’è un campo fine. La fine è `start` più la somma di `durationMin`, in minuti.

Salva, dal modulo, ricostruisce ogni riga dal servizio attivo scelto: `name`, `durationMin[taglia]`, `price[taglia]`. Il chip non riapre il listino. Copia le righe già salvate sull’appuntamento sorgente. L’inizio nuovo è l’inizio sorgente più 2, 4 o 6 settimane: stesso giorno della settimana, stessa ora.

Sorgente del chip, tra gli appuntamenti di quel `dogId`: il futuro più vicino con `start` maggiore o uguale a adesso. Se non c’è, il passato con `start` più recente. Se non c’è nemmeno quello, il chip non copia.

Due appuntamenti si sovrappongono quando gli intervalli `[start, end)` si intersecano. Se uno finisce alle 10:00 e l’altro inizia alle 10:00, non si sovrappongono. Il giorno di una lista è il giorno locale di `start`, non la data UTC.

`createAppointment`, `updateAppointment` e `deleteAppointment` riscrivono l’intera mappa. I primi due restituiscono l’appuntamento. `listAppointments` ordina per `start` e poi per `id`. Un id assente lancia `AppError` con codice `appointment_missing` e messaggio «Appuntamento assente», e non scrive. `deleteAppointment` toglie solo quella chiave. Esci toglie solo `groomly.session`.

Cambiare dopo il listino, o la taglia del cane, non riscrive un appuntamento già salvato. Archiviare un cane non tocca la mappa appuntamenti.

L’id è `crypto.randomUUID()`.

## 7. Errori

| Situazione | Comportamento |
|---|---|
| Manca il cane | «Scegli un cane». Nessuna scrittura. Si resta nel modulo |
| Manca un servizio | «Scegli un servizio». Nessuna scrittura. Si resta nel modulo |
| Manca il giorno | «Scegli il giorno». Nessuna scrittura. Si resta nel modulo |
| Manca l’ora, o non è uno dei quarti d’ora ammessi | «Scegli l’ora». Nessuna scrittura. Si resta nel modulo |
| Nessun cane attivo | «Nessun cane». Salva non scrive |
| Al Salva il cane non è attivo, oppure un servizio scelto non è attivo | L’errore del campo corrispondente. Nessuna scrittura. Un cane già archiviato e già legato all’appuntamento in modifica può restare, se non viene sostituito |
| Sovrapposizione | Non è un errore. Si salva. Resta «Si sovrappone a …» |
| `setItem` lancia durante Salva o durante il chip | Toast «Salvataggio non riuscito». Il record precedente non cambia. Il chip non mostra «Fissato per …» |
| `appointment_missing` in modifica | Stesso toast. Non si crea un duplicato |
| Cancellazione non scritta, compresa Annulla del chip | Stesso toast. L’appuntamento resta |
| Id sconosciuto | «Appuntamento assente» |
| Mappa illeggibile | «Dati locali illeggibili». Il valore resta nella chiave |
| Esci | Solo la sessione |

## 8. Test

Repository, su `localStorage` vero:

- l’appuntamento nuovo sta in `groomly.users.{uid}.appointments`, con nome, minuti e prezzo copiati per la taglia;
- la fine calcolata è l’inizio più la somma dei minuti, e le date rilette sono `Date`;
- un listino o una taglia cambiati dopo non riscrivono il record;
- un id assente lancia `appointment_missing` e la mappa resta identica;
- `setItem` che lancia lascia l’appuntamento precedente;
- la cancellazione toglie solo quella voce;
- Esci toglie solo `groomly.session`.

Funzioni pure:

- durata e prezzo sono la somma per la taglia;
- due intervalli che si toccano alle 10:00 non si sovrappongono; due che si incrociano sì;
- il chip sceglie il futuro più vicino, altrimenti il passato più recente, e sposta di 2, 4 o 6 settimane tenendo l’ora;
- il giorno locale raggruppa gli appuntamenti di oggi;
- il 29 ottobre 2026 alle 09:30 produce «gio 29 ott 09:30».

Pagine, tramite `App`, con `// @vitest-environment happy-dom` come prima riga. Lo spy della scrittura è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`:

- il modulo con cane, servizio, giorno e ora crea l’appuntamento e apre il dettaglio; un campo mancante non scrive;
- la Home non mostra «In arrivo» e mostra l’appuntamento di oggi; un altro giorno non compare;
- il Calendario cambia giorno e tiene `data` nell’indirizzo;
- Modifica e Salva aggiornano; Indietro senza Salva non scrive;
- Cancella, dopo la conferma, toglie la riga e apre il Calendario di quel giorno;
- «+2 sett» su un cane che ha già un appuntamento crea il successivo e il toast contiene «Fissato per» e Annulla; Annulla toglie solo quel nuovo appuntamento;
- su un cane senza appuntamenti il chip apre il modulo con `cane` e `data` nella query e non scrive;
- un cane archiviato non è selezionabile e non ha i chip.

Il JSON illeggibile riusa «Dati locali illeggibili» e il valore rotto è ancora nella chiave.

Controllo manuale a 360 px, in chiaro e in scuro: giornata vuota, appuntamento nuovo, riga in Home e nel giorno giusto, sovrapposizione visibile ma salvata, modifica, Indietro che abbandona, cancellazione, chip con toast e Annulla, cane senza appuntamenti, cane archiviato senza chip. Il Listino dice ancora «In arrivo». Nessuno scroll orizzontale.

## 9. Criteri di accettazione

1. Dal menu + si fissa un appuntamento con cane, servizio, giorno e ora, e lo si ritrova nel dettaglio dopo un refresh.
2. La Home elenca solo gli appuntamenti di oggi. Il Calendario elenca il giorno scelto e lo tiene nell’indirizzo.
3. Modifica e Salva aggiornano. Indietro senza Salva non scrive. Cancella, dopo la conferma, toglie solo quell’appuntamento.
4. Durata e prezzo salvati sono la somma del listino per la taglia, e non cambiano se dopo cambia il listino.
5. Una sovrapposizione non impedisce il salvataggio e resta visibile.
6. «+2 sett», «+4 sett» e «+6 sett» copiano futuro o ultimo passato, oppure aprono il modulo se non c’è nulla da copiare. Annulla toglie solo il nuovo.
7. Un cane archiviato non si può scegliere e non offre i chip. Il Listino resta «In arrivo».
8. Un salvataggio fallito non sostituisce l’appuntamento già salvato.
