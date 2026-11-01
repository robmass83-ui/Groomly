# C1 — Groomly non cancella mai visite da solo

Data: 1 novembre 2026. Origine: audit `docs/AUDIT-QA-2026-11-01.md`, voci **C1** e **A4** (e la voce media «Cane assente – Rimuovi dalla lista» durante il caricamento).

## Perché

Nell'audit, al login sul telefono, l'app ha cancellato dal cloud 198 appuntamenti veri: tutto dall'11 ottobre in avanti. La causa è la pulizia automatica delle «visite orfane» (`src/app/providers.tsx:62-74`): 1,5 s dopo l'avvio cancella dal cloud ogni visita il cui cane non è nella lista cani **vista dal telefono in quel momento**. Quella lista può essere vuota o parziale (`src/hooks/useDogs.ts:103-121` la dichiara pronta anche senza risposta del server, dopo 2,5 s + 6 s). Lo stesso meccanismo, applicato quando si elimina un cane, porta via anche visite chiuse e incassi passati (A4).

Roberto vuole che i dati del salone non possano mai sparire per una decisione presa da un telefono in base a quello che «non vede». Lo storico e gli incassi sono la cosa più preziosa per un toelettatore.

## Obiettivi

1. **Nessuna cancellazione automatica dal cloud** basata sull'assenza di un cane nella lista caricata. Né all'avvio, né al ritorno della rete, né cambiando account.
2. **Eliminare un cane** cancella solo le sue visite **future ancora da fare** (`programmato` con inizio dopo adesso). Restano nel cloud e visibili:
   - le visite chiuse: `completato`, `non_venuto`, `disdetto`;
   - le visite **«da chiudere»** (`programmato` con inizio già passato): devono restare in home e poterle chiudere, perché la visita può essere stata fatta e l'incasso esserci stato anche se il cane è stato eliminato dopo.
3. Le visite rimaste di un cane eliminato si vedono con la scritta **«Cane eliminato»** al posto del nome, contano negli incassi, nei report, nelle statistiche e nello storico.
4. Una visita «da chiudere» di un cane eliminato si chiude dalla home come le altre (Completato, Non venuto, Disdetto).
5. L'etichetta di cane mancante e le azioni che ne dipendono compaiono **solo quando la lista cani è arrivata dal server**. Mentre i cani caricano non si mostra «Cane assente/eliminato» e non si offre di rimuovere nulla.
6. Il messaggio di conferma dell'eliminazione del cane dice cosa succede, per esempio: «Le 3 visite future verranno cancellate. Lo storico e gli incassi restano.» (con il numero vero; se non ci sono visite future, solo la seconda frase).

## Non obiettivi

- Pulizia guidata delle orfane vecchie (strada 3, rimandata).
- Separare per account la lista locale delle cancellazioni (`groomly.deleted`): è la voce A10 dell'audit e si farà dopo. Qui basta che quella lista non possa più far cancellare visite in base al cane.
- Cloud Function di pulizia lato server.
- Cambiare i dati già cancellati in produzione: non si recuperano.

## Anti-obiettivi (sarebbe un fallimento anche se «funziona»)

- Qualsiasi percorso in cui il telefono cancella dal cloud una visita che l'utente non ha chiesto di cancellare, direttamente o tramite il segno di cancellazione.
- Lo storico di un cane eliminato che sparisce dagli incassi su un altro telefono dello stesso salone.
- Una visita «da chiudere» che resta in home senza poterla chiudere.

## Vincoli

- Più telefoni dello stesso salone e versioni vecchie dell'app convivono: il segno di cancellazione in cloud (`salons/<id>/meta/deleted-dogs` e la raccolta `deletedDogs`) resta il modo per propagare le cancellazioni. Le versioni vecchie continueranno a nascondere le visite dei cani eliminati: accettato, il dato resta comunque nel cloud.
- Il salone condiviso di Laura (`salon/shared`, `usesOnlyCloudDeletion`) deve continuare a funzionare come oggi per tutto ciò che non riguarda questa regola.
- Gli impegni personali (`kind: 'personale'`) non hanno cane e non sono toccati da nulla di tutto questo.
- Le regole Firestore non cambiano.

## Approcci considerati

1. **Togliere la cancellazione automatica e cambiare l'eliminazione del cane** — scelto. La pulizia all'avvio non cancella più dal cloud; `removeDog` cancella e segna solo le visite future; l'etichetta di cane mancante dipende dai cani arrivati dal server. Chiude C1 alla radice e risolve A4; è la modifica più piccola. Costo: eventuali orfane vecchie restano visibili finché l'utente non le gestisce.
2. Tenere la pulizia rendendola «sicura» (solo con cani dal server, solo visite future). Scartato: resta un meccanismo che cancella da solo in base a ciò che il telefono vede.
3. Come la 1 più una schermata di pulizia guidata delle orfane. Rimandato: più lavoro per un caso raro.
4. Cloud Function che pulisce lato server. Scartato: serve un deploy, e i telefoni vecchi continuerebbero a cancellare.

## Cosa cambia (deciso)

- **Pulizia all'avvio** (`MonthlyReminderForAccount` in `src/app/providers.tsx`): non chiama più nulla che cancelli dal cloud. Se si vuole tenere un effetto, può solo nascondere localmente, ma la scelta più semplice è toglierla: le visite orfane si mostrano come «Cane eliminato».
- **Eliminazione del cane** (`removeDog` in `src/data/firebase/client.ts`, `visits.dropDog` in `src/hooks/useAppointments.ts`, `confirmRemove` in `src/pages/DogPage.tsx`): si cancellano e si mettono nel segno solo le visite `programmato` con inizio dopo adesso. Il segno del cane (`ids`) resta, per togliere il cane dalle liste.
- **Segno di cancellazione** (`src/lib/tombstone.ts`): per i cani eliminati **da questo aggiornamento in poi** l'id del cane nel segno **non** nasconde più le sue visite; nascondono solo gli id di visita nel segno (`appointmentIds`). Vale per `tombstoneRejectsAppointment`/`filterAppointments` e per gli usi in `client.ts` e `useAppointments.ts`.
- **Cani eliminati prima di questo aggiornamento** (deciso da Roberto): le loro visite restano nascoste come oggi, anche se sono ancora nel cloud (es. cancellazione fallita), così non ricompaiono in home vecchie «da chiudere» di mesi fa. Serve quindi distinguere le eliminazioni nuove da quelle vecchie: le nuove vanno segnate in modo riconoscibile (per esempio un campo nel documento `deletedDogs/<id>` o un elenco separato nel segno); tutto ciò che è già nel segno senza quel marchio vale come eliminazione vecchia e continua a nascondere le visite del cane.
- **Cancellazioni locali in sospeso riapplicate al cloud** (`client.ts` ~1055-1080, compito che legge `readDeletion()` e cerca le visite con `appointmentMatchedByDeletedDog`): non cancella più visite trovate per cane. Può solo completare la cancellazione di id di visita espliciti già decisi dall'utente.
- **Home, «da chiudere»** (`src/pages/HomePage.tsx:639-655`): con il cane mancante e i cani arrivati dal server, mostra «Cane eliminato» e le stesse azioni di chiusura delle altre visite. Mentre i cani non sono arrivati dal server, nessuna etichetta di cane mancante e nessuna azione di rimozione.
- **Etichetta** «Cane assente» (`rigaCaneAssente`) diventa «Cane eliminato» (it/en/es) dove indica una visita il cui cane non c'è più (`AppointmentRow`, `WeekRows`, `CalendarPage`, `AppointmentPage`, `AppointmentForm`, incassi che oggi scrivono «Cane» in `src/lib/earnings.ts:121`).

## Rischio noto accettato

I telefoni con la versione vecchia continuano a fare la pulizia all'avvio e possono ancora cancellare visite finché non vengono aggiornati. Roberto accetta il rischio: gli utenti oggi sono lui e Laura, che aggiornano subito. Nessuna «versione minima» obbligatoria in questo lavoro.

## Scelte del coordinatore (da controllare)

- **Offline / cani non ancora arrivati dal server**: le azioni di chiusura (Completato, Non venuto, Disdetto) di una «da chiudere» si mostrano sempre, anche se il cane non è nella lista; chiudere una visita è sempre legittimo. Solo la scritta «Cane eliminato» e l'eventuale «Rimuovi dalla lista» aspettano i cani dal server; nel frattempo il nome mostrato è neutro (per esempio quello del servizio o «Cane»), mai «assente/eliminato».
- **Quali visite cancella l'eliminazione del cane**: quelle future **al momento della conferma**. Gli id esatti si calcolano alla conferma e si salvano con la cancellazione in sospeso (`groomly.deleted.pending`), così se la cancellazione arriva al cloud più tardi (offline) si cancellano proprio quelle, e il numero nel messaggio resta vero. Una visita futura alla conferma ma già passata quando la cancellazione arriva al cloud viene cancellata lo stesso.

## Lasciato a chi costruisce

- Come esporre a home ed etichette il fatto che i cani sono «arrivati dal server» (oggi `useDogs` ha `stantio`/`settled`; serve un segnale che distingua cache da server).
- Se il pulsante «Rimuovi dalla lista» per le orfane resta come azione secondaria accanto alla chiusura, purché compaia solo con i cani arrivati dal server e cancelli solo quella visita su richiesta esplicita.
- Che la chiusura di una visita senza cane funzioni davvero (prezzi e durate vengono dalla visita, non dal cane): da verificare e coprire con test.
- Test: unit test per tombstone, removeDog/dropDog, pulizia all'avvio assente, home con cane mancante (cani dal server vs cache); verifica finale nel browser con `qa-my-app:verify`.

## Come si verifica che è chiuso

1. Login con la lista cani che arriva tardi o vuota: nessuna visita cancellata dal cloud (conteggio prima/dopo uguale).
2. Eliminare un cane con visite passate chiuse, una «da chiudere» e due future: restano le chiuse e la «da chiudere» (in home, chiudibile), spariscono solo le due future; incassi invariati; un secondo browser dello stesso salone vede lo stesso.
3. Durante il caricamento la home non mostra «Cane assente/eliminato» né «Rimuovi dalla lista».
4. Il messaggio di conferma riporta il numero giusto di visite future.
