# Groomly — appuntamento personale e chiusure del salone

Data: 2026-10-21
Stato: scelte chiuse con l’utente. Dopo questa specifica si scrive il piano.

Il **+** guadagna l’appuntamento personale e la chiusura del salone. «Aggiungi Pelosetto» resta. Le visite ai cani restano quelle di oggi. Il personale è un appuntamento senza cane. La chiusura è un dato del salone, non un appuntamento.

## Decisioni chiuse

1. Nel mese il tondo verde conta le visite ai cani. Il tondo blu conta gli appuntamenti personali.
2. La chiusura è un giorno singolo oppure un periodo, dal giorno al giorno, estremi compresi. Non esiste «ogni lunedì».
3. Su un giorno chiuso l’appuntamento personale si salva senza avviso. Una visita al cane chiede conferma e, se si conferma, si salva.
4. Il personale ha titolo, data e ora di inizio. L’ora di fine è facoltativa e, se c’è, è nello stesso giorno e dopo l’inizio. Senza fine, in giornata è una striscia all’ora, non un’ora inventata.
5. Il giorno chiuso ha un velo rosso molto trasparente e un tratteggio dello stesso rosso, più la scritta «Chiuso». Le visite e i personali restano a colori pieni sopra il velo.
6. La chiusura si imposta solo dal **+**, voce «Chiusura del salone». Non si aggiungono tre puntini nell’intestazione del calendario.
7. Personale e chiusura sono due cose distinte. Il personale sta con gli appuntamenti. La chiusura non è una visita e non entra nella lista come il dentista.

## Fuori da questo lavoro

- Ritmo fisso, per esempio ogni lunedì.
- Nota libera sull’appuntamento personale.
- Riaprire un solo giorno dentro un periodo. Si toglie il periodo e se ne creano due.
- Incassi, report, mensili, scheda cane, ricerca animali, avvisi a un cliente.
- Cambiare il titolo del foglio della visita nuova: resta «Nuovo appuntamento». Cambia solo la voce del **+**.

## 1. Menu +

`ShellFrame` apre il dialogo «Nuovo» con quattro voci, in questo ordine, ciascuna alta almeno 44 px:

1. «Appuntamento pelosetto» apre `/appuntamenti/nuovo`, come oggi fa «Appuntamento».
2. «Appuntamento personale» apre `/appuntamenti/personale/nuovo`.
3. «Chiusura del salone» apre `/chiusure/nuovo`.
4. «Aggiungi Pelosetto» apre `/animali/nuovo`, come oggi.

Se il percorso è `/calendario` e l’indirizzo ha `data` nel formato `AAAA-MM-GG`, le prime tre voci aggiungono `?data=` con quel giorno. Dalla home non si aggiunge `data`: i fogli partono da oggi.

I tre percorsi nuovi sono fogli, come `/appuntamenti/nuovo`. `isSheetPath` li riconosce. Anche `/chiusure/{id}` e `/appuntamenti/personale/{id}` sono fogli.

## 2. Appuntamento personale

Foglio titolo «Appuntamento personale». Campi, con etichetta visibile:

- «Titolo», obbligatorio, da 1 a 60 caratteri dopo il trim.
- «Data», obbligatoria.
- «Ora di inizio», obbligatoria.
- «Ora di fine», facoltativa. Sotto il campo: «Se non la sai, lasciala vuota.»

Errori accanto al campo, non solo in cima:

- titolo vuoto: «Scrivi un titolo.»
- fine non successiva all’inizio, nello stesso giorno: «L’ora di fine è dopo l’inizio.»

«Salva» non chiude il foglio finché c’è un errore. Un giorno chiuso non produce avvisi.

In calendario, senza ora di fine, il blocco è alto una riga e mostra titolo e ora di inizio. Per decidere se sta accanto a un’altra visita occupa 15 minuti, il minimo che il calendario usa già quando una durata è 0. Non si disegna come un’ora. Con l’ora di fine, il blocco copre quell’intervallo, fondo `var(--pri-s)`, barra sinistra 4 px `var(--pri)`, testo `var(--pri-ink)`.

Il record non ha cane, servizi, prezzo, pagamento, foto, né stato completato, disdetto o non venuto. Il campo esistente `end` resta la fine reale di una visita completata e non si riusa. La fine scelta qui si chiama `plannedEnd`.

Aprire il blocco blu, o la riga in Oggi e sotto il mese, riapre lo stesso foglio su `/appuntamenti/personale/{id}`. «Elimina» chiede: «Eliminare {titolo} del {giorno} alle {ora}?» con «Elimina» e «Annulla». `{giorno}` è `formatHomeDate`, `{ora}` è `HH:mm`.

## 3. Chiusura del salone

Foglio titolo «Chiusura del salone».

- «Motivo», obbligatorio, da 1 a 40 caratteri dopo il trim. Esempi validi: «Ferie», «Festivo».
- Scelta «Questo giorno» oppure «Un periodo».
- «Questo giorno» ha una data. Se l’indirizzo porta `data`, quella data è già scritta.
- «Un periodo» ha «Dal» e «Al», estremi compresi. «Al» è il giorno di inizio o un giorno dopo.

Errore accanto al campo:

- motivo vuoto: «Scrivi un motivo.»
- periodo a rovescio: «La fine del periodo è il giorno di inizio o un giorno dopo.»

Un periodo è un solo record, non un record per giorno. Due chiusure non possono coprire lo stesso giorno. Se il nuovo intervallo ne tocca uno già salvato, non si salva. `{dal}` e `{al}` sono `formatHomeDate`. Giorno singolo già chiuso: «Questo giorno è già chiuso ({motivo}). Modifica quella chiusura.» Periodo: «Questi giorni sono già chiusi ({motivo} dal {dal} al {al}). Modifica quella chiusura.» Pulsanti «Apri» e «Indietro». «Apri» va al foglio di quella chiusura. I periodi che si toccano solo di confine, il 24 e poi il 25, sono due chiusure e si salvano.

Se nell’intervallo ci sono già visite ai cani, il foglio non le cancella. Prima di salvare: con una visita «In questi giorni c'è già 1 visita. La chiusura non le toglie.» Con più visite «In questi giorni ci sono già {n} visite. La chiusura non le toglie.» Pulsanti «Salva» e «Indietro». I personali non entrano in quel conteggio. Il conteggio guarda le visite il cui giorno di inizio cade nell’intervallo, qualunque stato abbiano.

La fascia «Salone chiuso · {motivo}» nel giorno, nella settimana e in Oggi è un pulsante «Apri chiusura {motivo}» e riapre il foglio. Si possono cambiare motivo e date, con le stesse regole di sovrapposizione, ignorando il record che si sta modificando.

«Riapri» toglie l’intera chiusura. Giorno singolo: «Riaprire toglie la chiusura di questo giorno.» Periodo: «Riaprire toglie la chiusura da tutti i giorni, dal {dal} al {al}.» Pulsanti «Riapri» e «Annulla». Non esiste «riapri solo questo giorno».

## 4. Calendario

Nessun colore esadecimale nuovo. Il velo usa il rosso già in tema.

In `tokens.css`, per chiaro e scuro:

- `--closed` è `color-mix(in srgb, var(--bad) 8%, transparent)`
- `--closed-line` è `color-mix(in srgb, var(--bad) 16%, transparent)`

Il fondo chiuso è `--closed` più `repeating-linear-gradient(-45deg, transparent 0 4px, var(--closed-line) 4px 5px)`. La scritta «Chiuso» è `var(--bad)`. Sul giorno selezionato, che resta `var(--pri-solid)`, la scritta è `var(--on-pri)`.

`monthCellFace` riceve `salonCount`, `personalCount` e `closed`, oltre a `selected`, `today`, `inMonth`, `weekend`. Non riceve più un solo `count`.

- Solo visite, giorno del mese, non selezionato: resta il verde di oggi, tondo verde con il numero.
- Solo personali: data `var(--tx)`, nessun fondo verde, tondo blu `var(--pri-solid)` con numero bianco.
- Visite e personali insieme, giorno non chiuso: casella chiara, data `var(--tx)`, i due tondi affiancati.
- Giorno chiuso, non selezionato: velo e tratteggio, scritta «Chiuso». I tondi, se i conteggi sono sopra zero, stanno sopra. Il motivo non entra nella casella.
- Giorno selezionato: fondo `var(--pri-solid)` e testo `var(--on-pri)`, come oggi. I tondi tengono l’alone `var(--card)`. Se è chiuso, «Chiuso» è bianco.
- Oggi, non selezionato: l’anello `inset 0 0 0 2px var(--pri)` resta.
- Giorno di un altro mese: data attenuata come oggi. Se è chiuso, il velo e «Chiuso» si vedono lo stesso. I tondi si vedono se il conteggio è sopra zero.
- Sabato e domenica senza visite e senza chiusura: fondo `var(--surf)`, come oggi. La chiusura vince sul fondo del fine settimana.

L’etichetta accessibile della casella è «{data}», poi, se chiuso, «salone chiuso, {motivo}», poi «{n} appuntamenti pelosetto» se n > 0, poi «{n} appuntamenti personali» se n > 0. Con n = 1 la parola è «appuntamento» al singolare. `{data}` è `formatHomeDate`.

**Giorno.** Se il giorno è chiuso, sopra la griglia c’è la fascia «Salone chiuso · {motivo}». Le ore vuote hanno il velo. I blocchi no: restano a colore pieno. La visita al cane resta com’è, durata vera e colore del servizio. Il personale è il blocco blu del paragrafo 2. Se due blocchi si accavallano, si dividono in colonne come oggi. La striscia dei sette giorni: un puntino verde `var(--ok)` se c’è almeno una visita, un puntino blu `var(--pri-solid)` se c’è almeno un personale. Il giorno chiuso ha il velo anche in quella striscia. Sul giorno selezionato della striscia il fondo resta blu pieno e i puntini tengono i loro colori.

**Settimana.** La cella del numero, se il giorno è chiuso e non è quello selezionato, ha velo, tratteggio e «Chiuso». Se è selezionato, il numero resta su `var(--pri-solid)` e «Chiuso» è `var(--on-pri)`. Le carte restano piene. La carta personale è blu, con titolo e ora, senza adesivo del carattere e senza servizi. Scorre e si schiaccia come le altre carte.

Il riepilogo «n cani · minuti stimate» conta solo le visite, come oggi. I personali non aggiungono cani né minuti.

## 5. Liste

Sotto il mese, e in «Oggi» sulla home, visite e personali del giorno stanno in un solo elenco, ordinati per ora di inizio e poi per id. La riga personale ha fondo `var(--pri-s)`, titolo e ora, e non apre una scheda cane. Senza `plannedEnd` si mostra solo l’inizio. Con `plannedEnd` si mostra `HH:mm–HH:mm`.

La tessera Oggi, il numero e i minuti, contano solo le visite che conta oggi. Un personale non alza quel numero.

Giorno chiuso senza niente segnato: prima la fascia di chiusura, poi «Nessun appuntamento». Il pulsante per una nuova visita resta. L’avviso arriva al salvataggio, non all’apertura del foglio.

«Da chiudere» non elenca i personali. Un personale di ieri non diventa una visita da chiudere.

## 6. Avviso sulla visita

Vale per una visita nuova, per uno spostamento e per una serie. Non vale se la visita è già su quel giorno chiuso e si cambiano solo servizi, ora, prezzo o note.

Al salvataggio, se almeno un giorno di inizio cade in una chiusura, un dialogo titolo «Salone chiuso». Un giorno: «Il salone è chiuso questo giorno ({motivo}). Salvare lo stesso la visita?» Più giorni: «Alcuni giorni sono chiusi: {elenco}. Salvare lo stesso?» `{elenco}` unisce, separati da virgole, `formatHomeDate` e il motivo di quel giorno. Pulsanti «Salva lo stesso» e «Indietro». «Indietro» non salva nulla di quel gesto, nemmeno i giorni aperti della serie. «Salva lo stesso» salva tutto il gesto.

Il personale non passa da questo dialogo, nemmeno se lo si sposta su un giorno chiuso.

Due visite che si sovrappongono continuano a usare l’avviso di oggi. Un personale non entra in quel confronto e non lo blocca. Due personali alla stessa ora si vedono affiancati.

Chiudere dei giorni non cancella le visite già presenti. L’avviso del paragrafo 3 è l’unico, ed è informativo.

## 7. Dati

### Visite e personali

Stanno nella raccolta appuntamenti del salone, locale e cloud, la stessa di oggi.

`Appointment.kind` è `'pelosetto' | 'personale'`. Un documento senza `kind`, o con un valore sconosciuto, si legge come `pelosetto`. I documenti già salvati non si riscrivono solo per aggiungere il tipo.

Il personale salvato ha `kind: 'personale'`, `title` e `start`. `plannedEnd` c’è solo se l’ora di fine è stata scritta. Non si scrivono `dogId`, `services`, `status`, `total`, `photos`. In lettura, un personale senza titolo valido si scarta. `filterAppointments` e `tombstoneRejectsAppointment`, per un personale, guardano solo l’id dell’appuntamento, mai un id cane. Cancellare un personale toglie il documento e segna il suo id fra gli appuntamenti cancellati, così non rispunta da una copia vecchia. Non segna un cane.

`classify` di un personale restituisce `'escluso'` prima di ogni altra regola. Incassi, previsti, persi e da chiudere non lo vedono.

### Chiusure

Raccolta a parte, non dentro `settings/main`. In locale la chiave è `groomly.users.{uid}.closures`, e `JSON_KEY` la accetta. In cloud il percorso è `salonDocPath('closures', id)`, accanto agli appuntamenti. Le regole Firestore già permettono un `kind` diverso da `files`: non si modifica `firestore.rules`.

Record:

- `id`
- `reason`, 1–40 caratteri dopo il trim
- `startDay` e `endDay`, `AAAA-MM-GG`, `endDay` maggiore o uguale a `startDay`
- `createdAt`, `updatedAt`

Un record illeggibile si scarta. Due telefoni dello stesso salone vedono le stesse chiusure, con lo stesso ascolto degli appuntamenti, senza foto e senza pietra tombale dei cani.

`BackupBundle` guadagna `closures`, facoltativo. `buildBackup` lo scrive. `readRestoreBundle` lo tiene se è un oggetto; se la chiave manca, il ripristino non tocca le chiusure già sul telefono; se la chiave c’è, anche come oggetto vuoto, `restoreBackup` sostituisce le chiusure locali. Un backup vecchio, senza la chiave, resta valido.

## 8. Verifica

Le prove coprono, come minimo:

- il **+** mostra le quattro voci e «Appuntamento pelosetto» apre ancora il foglio «Nuovo appuntamento»;
- il personale senza fine non occupa un’ora disegnata; con fine, l’intervallo è quello scritto; la fine nello stesso minuto è rifiutata;
- un periodo è un record; due intervalli sovrapposti non si salvano; il 24 e il 25 sì;
- la visita su un giorno chiuso chiede conferma; il personale no; modificare la stessa visita sullo stesso giorno chiuso non richiede di nuovo;
- il mese mostra i due tondi e, se chiuso, il velo e «Chiuso»;
- Oggi elenca il dentista e la tessera Oggi non lo conta;
- `classify` di un personale è `escluso`;
- un backup senza `closures` non cancella le chiusure; uno con `closures` le sostituisce.
