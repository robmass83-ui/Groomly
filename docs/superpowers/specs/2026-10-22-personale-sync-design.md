# Groomly — sync degli appuntamenti personali

Data: 2026-10-22
Stato: scelte chiuse. La richiesta è di usare le opzioni consigliate e andare avanti fino al piano e all’esecuzione.

Un appuntamento personale si elimina da solo. Crearne uno nuovo non riporta quelli eliminati. Gli altri giorni restano. Le visite ai cani restano com’è oggi. Il promemoria push di un personale e la notifica «Aggiornamento disponibile» restano, e non si spengono a vicenda.

## Perché succede

I personali stanno in `salon/shared/appointments`, accanto alle visite. L’id vero è l’id del documento Firestore. `documentId` in `src/lib/firebaseMap.ts` usa già l’id del percorso quando c’è: quel pezzo della v1.1.66 resta.

Il buco che resta è un altro. `useAppointments` tratta uno snapshot del server come l’elenco intero. Se in quello snapshot manca un personale, lo toglie dalla memoria e da `localStorage`, anche se nessuno ha chiamato `deleteDoc` su quel documento. Il documento è ancora nel cloud. Creare un personale nuovo fa arrivare uno snapshot più completo, e i documenti mai cancellati tornano tutti.

La v1.1.66 ignora la cache solo dopo il primo snapshot del server, e solo dentro quel hook. Non copre uno snapshot del server incompleto. Un hook appena montato ha `sawServer` a falso, quindi la prima cache può ancora sostituire l’elenco.

C’è un secondo effetto, già successo prima della v1.1.66. Se più documenti avevano lo stesso `data.id`, l’interfaccia li vedeva come un solo appuntamento. Eliminare quell’id li nascondeva tutti. Dopo la correzione dell’id di percorso, gli stessi documenti tornano con id diversi, che non sono nella pietra tombale, e riappaiono tutti.

La cancellazione di un cane non deve entrare in questo meccanismo. `replayLocalDeletion` e `removeDog` scelgono gli appuntamenti anche per `dogId`. Un personale ha `kind: 'personale'` e non è una visita di quel cane.

## Decisioni chiuse

1. I personali restano nella collezione `salon/shared/appointments`. Non si crea una collezione nuova.
2. Un personale già visto resta finché l’id di quel documento non è cancellato. L’assenza da uno snapshot non è una cancellazione.
3. È cancellato solo l’id presente nella pietra tombale che vale per quell’account, oppure l’id segnato in questa sessione di pagina dopo una `deleteAppointment` locale riuscita.
4. Per Laura la pietra è quella che `listenAppointments` ha già unito (telefono più cloud). Per Roberto, dentro `shared` e non Laura, è solo la pietra cloud passata dal listener, più gli id della sessione. La pietra storica del telefono di Roberto non nasconde né un personale né una visita.
5. Le visite restano sostituite dallo snapshot del server, come oggi. Uno snapshot del server che non contiene più una visita la toglie. La cache dopo il primo server continua a essere ignorata per tutto il callback.
6. Si elimina un solo documento, con un solo `deleteDoc` e un solo id in `appointmentIds`. Si crea un solo documento con un UUID nuovo.
7. L’id del documento resta l’id dell’appuntamento. `data.id` non torna a vincere.
8. Eliminare un cane non cancella i documenti `kind === 'personale'`. Un id di cane non nasconde un personale.
9. Il promemoria push resta uno per id, nei 30 minuti prima dell’inizio, con url `/appuntamenti/personale/{id}`. La notifica di aggiornamento resta `kind: 'updates'`, titolo «Aggiornamento disponibile». Un personale non diventa «Da completare».
10. La versione che gli utenti ricevono, a lavoro finito e con i test verdi, è `1.1.67`, `versionCode` `10167`. Non si pubblica a metà.

## Fuori da questo lavoro

- Spostare i personali in un’altra collezione, con migrazione e regole nuove.
- Cambiare titolo, data, ora, foglio, calendario, chiusure, o la finestra dei 30 minuti.
- Cambiare il testo delle notifiche.
- Trattare uno snapshot più corto come sempre sospetto anche per le visite.
- Ignorare ogni snapshot che ha meno personali di prima senza guardare la pietra: non distingue una cancellazione vera da uno snapshot parziale.

## 1. Fusione dei personali

Funzione nuova `mergePersonalAppointments` in `src/lib/personalSync.ts`:

```ts
mergePersonalAppointments(
  previous: readonly Appointment[],
  incoming: readonly Appointment[],
  deletedIds: readonly string[],
): Appointment[]
```

Regole, in quest’ordine:

- Si considerano solo gli elementi con `appointmentKind` uguale a `personale`. Visite e altri oggetti si ignorano.
- Un id vuoto si ignora.
- Un id dentro `deletedIds` non entra nel risultato, né da `previous` né da `incoming`.
- Per lo stesso id si tiene l’elemento con `updatedAt` più recente. Se i due tempi sono uguali, si tiene quello di `incoming`.
- Il risultato è ordinato per `start` e poi per `id`.

`useAppointments` parte l’elenco in due. Le visite usano la logica di oggi, calcolata solo sulle visite. I personali usano solo `mergePersonalAppointments`. Poi i due risultati si uniscono e si ordinano con `sortAppointments`.

`deletedIds` è:

- se il listener passa il terzo argomento, quegli id;
- se non lo passa e l’account non è solo-cloud, `readDeletion().appointmentIds`;
- se non lo passa e l’account è solo-cloud, nessun id di pietra;
- più `sessionDeletedAppointmentIds()`, sempre.

La cache vuota si continua a ignorare. La cache dopo `sawServer` si continua a ignorare per intero. La fusione corre sulla prima cache, prima del server, e su ogni snapshot del server.

Uno snapshot del server vuoto non svuota i personali. Svuota le visite secondo la regola di oggi: per Roberto, una visita assente dal server e non creata in questa sessione sparisce; per Laura, sul server, le visite assenti spariscono. Il test di Roberto che manda `[]` dal server e si aspetta zero visite resta valido.

Il refresh dopo `notifyLocalWrite` non cambia per Laura: `filterAppointments` con `readDeletion()`. Per Roberto usa solo `sessionHidesAppointment`. Così la pietra del telefono, riscritta da `rememberDeletion` al momento dell’eliminazione, non nasconde le altre righe.

`dropMissing` continua a escludere `kind === 'personale'`.

## 2. Listener

`listenAppointments` chiama:

```ts
onData(appointments, fromCache?, deletedAppointmentIds?)
```

Il terzo valore è `stone.appointmentIds` della pietra appena usata per filtrare lo snapshot. Per Roberto quella pietra è già solo cloud, perché `mergedDeletion` passa da `deletionForActiveSalon`. I test che chiamano il callback con due argomenti restano validi: il hook usa il ripiego del punto 1.

`sessionDeletedAppointmentIds(): string[]` esporta gli id di `noteSessionAppointmentDeletion`. `resetSessionAppointmentDeletions` li svuota, come oggi.

`remove` non cambia il suo ordine: `deleteAppointment` locale, poi il segno di sessione, poi lo stato senza quell’id, poi `rememberDeletion` di quell’id, poi `removeAppointment` sul cloud. Il segno di sessione si scrive solo se la delete locale è riuscita.

## 3. Cancellazione di un cane

Due funzioni pure in `src/lib/personalSync.ts`:

```ts
appointmentMatchedByDeletedDog(
  data: { kind?: unknown; dogId?: unknown },
  deletedDogIds: readonly string[],
): boolean

appointmentRemovedWithDog(
  docId: string,
  data: { kind?: unknown; dogId?: unknown },
  deletedDogId: string,
  explicitAppointmentIds: readonly string[],
): boolean
```

Entrambe restituiscono `false` se `data.kind === 'personale'`.

`appointmentMatchedByDeletedDog` è vera solo se `dogId` è una stringa non vuota presente in `deletedDogIds`. Un `dogId` vuoto non è un cane. `replayLocalDeletion` la usa al posto del confronto diretto su `dogId`. Gli id già in `appointmentIds` della pietra locale si cancellano ancora, anche se il documento è personale: quella è la cancellazione esplicita di quell’appuntamento, non la cancellazione del cane.

`appointmentRemovedWithDog` è vera se l’id del documento è in `explicitAppointmentIds` oppure `dogId` è il cane eliminato. `removeDog` la usa per scegliere i documenti da cancellare. Un personale non entra in quel gruppo, nemmeno se il suo id è già nella pietra.

`copyUserKind` resta com’è: per un personale chiama `tombstoneRejectsAppointment` con il flag personale, quindi un id di cane non lo scarta.

## 4. Notifiche push

`selectPushes` non cambia regola. Due personali nella finestra dei 30 minuti producono due `kind: 'reminder'`, uno per id. Toglierne uno dall’elenco lascia l’altro. Nello stesso risultato, se c’è una versione più nuova e le preferenze lo permettono, resta un `kind: 'updates'` con titolo «Aggiornamento disponibile» e `data.type === 'update'`. Un personale ha status vuoto nel modello push e non produce `kind: 'complete'`.

Funzione nuova in `src/lib/pushDue.ts`:

```ts
appointmentsForPush<T extends { id: string }>(
  appointments: readonly T[],
  deletedIds: readonly string[] | null,
): T[]
```

- `deletedIds === null`: si restituisce una copia dell’elenco, senza togliere nulla. È il caso in cui la lettura di `salon/shared/meta/deleted-dogs` fallisce. I promemoria dei documenti ancora presenti partono lo stesso, e l’aggiornamento non dipende da questa funzione.
- Un array, anche vuoto: si tolgono gli id presenti. Un id vuoto non resta.
- Il documento già cancellato non è nel risultato della query. Il filtro copre il momento in cui il documento c’è ancora e l’id è già nella pietra.

In `functions/src/index.ts` il caricamento appuntamenti fa le due query di oggi, mappa con `appointmentFromDoc(doc.id, data)`, poi legge la pietra. Se quella lettura lancia, passa `null`. Se il documento manca o non ha `appointmentIds`, passa `[]`. Non si cambia la query `kind == personale` né la finestra di 30 minuti. `sendPush.ts` riesporta `appointmentsForPush`.

## 5. Errori

- Snapshot senza un personale mai cancellato: il personale resta in memoria e in `localStorage`.
- Snapshot che contiene ancora il documento appena eliminato: quell’id è nella sessione o nella pietra, e non torna. Gli altri personali dello snapshot e quelli già in memoria restano.
- Creare un personale: un UUID nuovo, uno `saveAppointment`. Lo snapshot successivo che non lo contiene ancora lo conserva, perché è in `previous` e non è in `deletedIds`.
- Lettura della pietra push fallita: si inviano i promemoria dei documenti letti e, a parte, l’aggiornamento se la versione è più nuova.
- `deleteDoc` di un personale fallita: l’id resta nella sessione e nella pietra locale, quindi l’interfaccia non lo rimostra. La funzione push, se legge la pietra, non lo notifica.

## 6. Test

- `src/lib/personalSync.test.ts`: assenza non cancella; l’id nella lista cancellata sparisce anche se è in `incoming`; `updatedAt` più nuovo vince; parità tiene `incoming`; le visite non entrano nel risultato; `kind === 'personale'` non è scelto da un cane.
- `src/hooks/useAppointments.personal.test.tsx`: tre personali, se ne elimina uno, uno snapshot del server che contiene solo un personale nuovo tiene i due superstiti e il nuovo, e non riporta l’eliminato. Partendo da due personali e due visite, uno snapshot del server che contiene una sola di quelle visite tiene entrambi i personali e quella visita, e toglie la visita assente.
- `src/hooks/useCloudOnlyData.test.tsx`: per Roberto, uno snapshot del server senza un personale non lo cancella; la pietra del telefono non lo nasconde; il terzo argomento con un id cloud nasconde solo quell’id. Il test che uno snapshot server `[]` toglie una visita resta verde.
- `src/lib/pushDue.test.ts`: due promemoria distinti, un aggiornamento insieme a loro, nessun «Da completare» per un personale, e `appointmentsForPush` con `null` e con un id.

I test già verdi di `useAppointments.personal.test.tsx`, `useCloudOnlyData.test.tsx`, `firebaseMap.test.ts` e `tombstone.test.ts` restano verdi.
