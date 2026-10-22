# Groomly — Cancellazione profili, note aggiuntive, menu del più

Data: 2026-10-22
Stato: in revisione. Nessun codice finché questa versione non è accettata e il piano non viene eseguito.

Tre modifiche nello stesso aggiornamento. Sono indipendenti nel comportamento, ma escono insieme perché l’app che le riceve è una sola.

1. Un profilo cane, anche vecchio, dopo «Elimina definitivamente» non torna in lista, in agenda, nel cloud e nelle copie.
2. Sotto l’avviso rosso della scheda si aggiungono note libere, senza aprire Modifica. In calendario e in agenda, accanto al rosso, compare la parola `altro`.
3. Nel menu del più, le due voci che si assomigliano diventano «Fissa appuntamento pelosetto» e «Appuntamento personale».

## Decisioni chiuse

1. La cancellazione non aspetta la rete per togliere la scheda dallo schermo. Lo schermo la nasconde subito. Il server la conferma dopo. Finché il server non ha il segno, questo telefono non la mostra più.
2. Roberto, dentro il salone condiviso, continua a ignorare la pietra storica `groomly.deleted`. Quella pietra, su un telefono, non deve nascondere cani che nel salone ci sono ancora. Il nascondiglio nuovo è un’altra chiave, `groomly.deleted.pending`, più un insieme che vive solo finché la pagina è aperta.
3. I documenti in `users/{uid}/dogs` non si cancellano. Il test attuale li lascia lì di proposito. A non farli tornare è il rifiuto della copia, non la distruzione dell’archivio personale.
4. La pulizia degli appuntamenti non può bloccare la cancellazione del cane. Prima si toglie il cane. Poi, se si può, si tolgono le visite.
5. L’avviso rosso resta `criticalNote`. Il campo singolo `notes` («Nota» dentro Altri dettagli, titolo «Note» in scheda) resta dov’è. Le note nuove sono un elenco `extraNotes`, diverso da entrambi.
6. In calendario e in agenda non si leggono i testi delle note aggiuntive. Si legge solo `altro`, in minuscolo, accanto al rosso. I testi si leggono nella scheda.
7. Una nota aggiuntiva si può togliere dalla scheda. Non si modifica sul posto: si toglie e se ne scrive un’altra.
8. «Chiusura» e «Nuovo cane» non cambiano né titolo né sottotitolo.
9. Questa specifica, da sola, non alza `APP_VERSION`. La pubblicazione avviene solo a implementazione finita, con i test verdi, da `1.1.71` a `1.1.72`.

## Fuori da questo lavoro

- Archivio «Non più in cura» e «Deceduto». Restano com’è.
- Riscrivere l’avviso rosso, il carattere, i tag, i campi liberi, la galleria.
- Mostrare il testo delle note aggiuntive dentro la card dell’appuntamento, nel foglio della visita o nel promemoria push.
- Cambiare le icone del menu del più.
- Cancellare i documenti storici `users/{uid}/dogs` o `users/{uid}/appointments`.
- Un elenco di note per l’appuntamento, distinto da quelle del cane.

## Approcci scartati

Cancellazione.

- Un altro filtro sulla pietra unica `meta/deleted-dogs`. È già stato rinforzato e il profilo vecchio torna lo stesso. La pietra è un solo documento che a ogni cancellazione riceve di nuovo tutti gli id già segnati, cani e visite. Quando quel documento cresce, o quando la scrittura fallisce, `deleteDoc` non parte e lo snapshot rimette il cane.
- Aspettare il server prima di uscire dalla scheda. Senza rete la scheda resterebbe lì, e una copia successiva la riscriverebbe comunque se il segno non c’è.
- Applicare a Roberto l’intera `groomly.deleted` del telefono. Nasconderebbe cani del salone che quel telefono non ha cancellato. Il test «Roberto non applica il segno locale ai cani condivisi mentre Laura continua ad applicarlo» resta valido.

Note.

- Accodare le frasi nel campo `notes`. Non si toglie una riga sola, e il calendario non può sapere che esiste «altro» senza aprire il testo.
- Una collezione Firestore separata. Il cane è già un documento: l’elenco viaggia con lui e arriva sull’altro telefono con lo stesso snapshot.

Menu.

- Allungare solo i sottotitoli. I titoli in grassetto resterebbero «Pelosetto» e «Personale», che sono quelli che si confondono.
- Togliere i sottotitoli. «Metti un cane in agenda» e «Un impegno fuori dal salone» restano utili sotto il titolo nuovo.

## 1. Perché il profilo vecchio torna

La scheda che si vede usa l’id dentro il documento (`data.id`). Il file su Firestore sta all’id del percorso. Per un cane creato adesso i due id coincidono. Per un profilo vecchio possono no: `dogFromDoc` mostra `data.id`, `removeDog` cancella `salon/shared/dogs/{data.id}`, quel percorso non esiste, la cancellazione di un documento assente riesce, e il documento vero resta al percorso vecchio. Lo snapshot lo rilegge e la scheda riappare con lo stesso nome.

In più, per Roberto lo snapshot non applica la pietra del telefono. La cancellazione cloud è in coda. Lo snapshot che arriva prima del segno rimette il cane in lista. `saveDog` può riscriverlo. `copyUserKind` rifiuta solo l’id del percorso, non l’id nel campo: se i due divergono, la copia da `users/{uid}/dogs` rimette il profilo nel salone.

Infine `confirmRemove` chiama prima `dropDog` e poi `remove`. Se la pulizia delle visite fallisce, il cane non si toglie. Un profilo vecchio ha più visite di uno appena creato.

## 2. Cancellazione che non torna

### 2.1 Segni

Tre segni, con ruoli diversi.

| Segno | Dove | Chi lo applica | Quando si cancella |
| --- | --- | --- | --- |
| Pietra storica `groomly.deleted` | localStorage | Laura e i saloni non condivisi. Roberto no | Non si usa per questa correzione |
| Insieme di sessione | memoria della pagina | Tutti, Roberto compreso | Al ricarico della pagina |
| `groomly.deleted.pending` | localStorage | Tutti, Roberto compreso | Solo quando il cloud contiene già quell’id |

`rememberPendingDogDeletion(id)` aggiunge. `readPendingDogDeletions()` legge. `forgetPendingDogDeletion(id)` toglie un id. `noteSessionDogDeletion(id)` e `sessionHidesDog(id)` seguono il modello già usato per gli appuntamenti. `resetSessionDogDeletions()` svuota l’insieme, solo nei test.

Un cane è nascosto se l’id della scheda, o l’id del percorso se è diverso, sta nella sessione, in `pending`, o nella pietra cloud descritta sotto. Questo filtro si applica dopo ogni fusione in `useDogs`, anche quando `useCloudOnlyData` è vero, e prima di riscrivere la mappa locale. Così lo snapshot non rimette il cane né in memoria né in `localStorage`.

`saveDog` non scrive un cane nascosto da sessione, pending o pietra cloud. Il controllo vale all’inizio e di nuovo subito prima di `putDoc`.

### 2.2 Cloud

Si aggiunge un documento piccolo per ogni cane cancellato: `salon/shared/deletedDogs/{id}` con `{ at: number }`. `at` è `Date.now()`. L’id del documento è l’id da nascondere. Stesso percorso sotto `salons/{salonId}/deletedDogs/{id}` per un salone non condiviso. Le regole attuali di `salon/shared/{kind}/{id}` e `salons/{salonId}/{kind}/{id}` già permettono la scrittura a chi opera nel salone. Non si aggiunge una regola nuova.

`meta/deleted-dogs` resta ed è ancora letto. Le cancellazioni già fatte continuano a valere. Una cancellazione nuova scrive lì solo gli id nuovi, con `arrayUnion` di quegli id, non l’elenco intero riletto dal cloud. Se quella scrittura fallisce perché il documento è pieno, il cane resta cancellato lo stesso grazie a `deletedDogs/{id}`.

`mergedDeletion` unisce gli id di `meta/deleted-dogs` e gli id dei documenti in `deletedDogs`. Se una delle due letture fallisce, lo snapshot dei cani non viene pubblicato. È il comportamento già fissato per la pietra: una lettura fallita non svuota il filtro.

`removeDog(uid, id, sourceDocId?)` fa, in questo ordine, dentro il task in coda:

1. Scrive `deletedDogs/{id}`. Se `sourceDocId` è una stringa non vuota e diversa da `id`, scrive anche `deletedDogs/{sourceDocId}`.
2. Legge la collezione cani del salone. Cancella ogni documento il cui percorso, o il cui campo `id`, è `id` o `sourceDocId`.
3. Segna in `meta/deleted-dogs` solo questi id nuovi. Poi cancella le visite di quel cane come già fa oggi, senza annullare i passi 1 e 2 se una visita fallisce. Gli id delle visite nuove, non quelli già presenti nella pietra, vanno in `arrayUnion`.
4. Non cancella nulla sotto `users/`.

`listenDogs` scarta un cane se la pietra unita contiene `dog.id` o `dog.sourceDocId`. `dogFromDoc(pathId, data)` continua a usare `data.id` come id della scheda quando c’è. Se `pathId` è diverso e non vuoto, mette quel percorso in `sourceDocId`. `dogToDoc` non scrive `sourceDocId`: non è un campo del salone, è solo il puntatore locale al file. La mappa locale lo conserva, così una cancellazione fatta dalla cache sa quale percorso colpire anche prima della query.

`copyUserKind`, per i cani, non copia il documento se la pietra rifiuta il percorso oppure il campo `id`. `copyLocal` fa lo stesso controllo sull’id del cane locale. `saveDog` rifiuta sia `dog.id` sia `dog.sourceDocId`.

All’avvio dell’ascolto, ogni id ancora in `pending` e assente dalla pietra cloud viene passato di nuovo a `removeDog`. Quando la pietra cloud contiene l’id, si chiama `forgetPendingDogDeletion`. Non si svuota `pending` dentro `removeDog` prima di questa conferma.

### 2.3 Scheda

`confirmRemove` chiude il dialogo e chiama un helper puro:

```ts
export function finishDogRemoval(actions: { removeDog: () => boolean; dropVisits: () => boolean }): boolean {
  if (!actions.removeDog()) return false
  actions.dropVisits()
  return true
}
```

`removeDog` è `api.remove`. `dropVisits` è `visits.dropDog`. Il valore di `dropVisits` non conta. Se `dropVisits` lancia, l’helper lo ignora e restituisce comunque vero. Se `removeDog` è falso, toast «Salvataggio non riuscito» e si resta sulla scheda. Se è vero, si va a `/animali`.

`api.remove` segna sessione e pending, toglie il cane dalla memoria e dalla mappa locale, poi avvia `removeDog` sul cloud con `sourceDocId`. Un errore di rete del cloud non rimette il cane in lista.

## 3. Note aggiuntive

### 3.1 Dati

```ts
export interface DogExtraNote {
  id: string
  text: string
  createdAt: Date
}
```

`extraNotes` è opzionale su `DogDraft`, `DogWrite` e `Dog`. In locale `createdAt` è una stringa ISO, come `createdAt` del cane. In Firestore è un numero di millisecondi, come `takenAt` della galleria. In lettura si scartano le righe senza id, senza testo, o con data illeggibile.

`src/lib/dogNotes.ts`:

- `EXTRA_NOTE_MAX` è `240`.
- `EXTRA_NOTE_LIMIT` è `40`.
- `cleanExtraNote(text: string): string | null` fa trim. Vuoto o solo spazi: `null`. Più lungo di 240: `null`. Non taglia in silenzio.
- `hasExtraNotes(notes: readonly { text: string }[] | undefined): boolean` è vero se almeno una riga ha testo dopo il trim.

L’id di una nota nuova è `crypto.randomUUID()`. L’ordine in scheda è `createdAt` crescente, poi `id`. I testi uguali sono ammessi.

`writeFromScreen` copia `dog.extraNotes` sul salvataggio della scheda. Un Modifica del nome, della foto o dell’avviso rosso non le perde. `dogToWrite` le copia. `updateDog`, se `input.extraNotes` è `undefined`, tiene quelle già salvate. Se è un array, anche vuoto, usa quello: l’array vuoto toglie tutte le note aggiuntive. `createDog` con `undefined` nasce senza note aggiuntive.

Registro Excel: la cella note del cane concatena, ognuna a capo, avviso critico, campo `notes`, poi i testi di `extraNotes` nell’ordine. Non si aggiunge una colonna.

### 3.2 Scheda, solo in lettura

Sotto l’avviso rosso, e prima del blocco «Note» del campo vecchio:

- se c’è l’avviso, il riquadro rosso resta quello di oggi;
- sotto, una card per ogni nota aggiuntiva, testo normale, non rosso;
- su ogni card, «Togli», con `aria-label` `Togli nota: ` più il testo;
- sotto le card, il pulsante «Aggiungi nota».

Il pulsante c’è anche se l’avviso rosso manca. Manca solo mentre la scheda è in Modifica: da lì si cambia l’avviso rosso, non questo elenco.

«Aggiungi nota» apre un dialogo con titolo «Aggiungi nota», campo «Nota», `maxLength` 240, «Salva» e «Annulla». Salva con testo vuoto non chiude e non scrive. Quando le note sono già 40, il pulsante è disabilitato e sotto c’è la scritta «Troppe note»: un pulsante disabilitato non può aprire un toast. Salva chiama `saveExisting` con la scheda intera più la nota nuova, senza entrare in Modifica. Togli fa lo stesso con l’elenco senza quella riga. Errore: toast «Salvataggio non riuscito» e l’elenco resta com’era.

### 3.3 La parola `altro`

Il testo è esattamente `altro`, minuscolo, `font-weight` 700, colore `var(--tx2)`. Non fa parte della frase rossa. Sta sulla stessa riga, a destra, senza andare a capo. La frase rossa può accorciarsi con i puntini. Se l’avviso manca e le note aggiuntive ci sono, la riga contiene solo `altro`.

`hasNote` dell’altezza in agenda è vero se c’è l’avviso oppure se `hasExtraNotes` è vero. La riga è una sola, l’altezza non cresce di una seconda riga.

La parola compare:

- nella vista giorno del calendario, accanto al rosso;
- nella vista settimana, accanto al rosso;
- nelle strisce della settimana (`WeekRows`), accanto al rosso;
- nella vista compatta, accanto all’icona di avviso, visibile e non solo nell’`aria-label`;
- nel foglio dell’appuntamento e nel modulo, accanto al riquadro rosso;
- in Home e nella lista del giorno sotto il mese, accanto al nome, perché quelle righe oggi non stampano il rosso e altrimenti `altro` non si vedrebbe.

Tappare la visita apre la visita, come oggi. Non apre le note. Per leggerle si entra nella scheda del cane.

## 4. Menu del più

Il dialogo resta «Cosa aggiungi?». Cambiano solo i due titoli in grassetto e le `aria-label`. I sottotitoli restano.

| Voce | Titolo in grassetto | Sottotitolo | aria-label |
| --- | --- | --- | --- |
| Visita cane | Fissa appuntamento pelosetto | Metti un cane in agenda | Fissa appuntamento pelosetto, metti un cane in agenda |
| Impegno | Appuntamento personale | Un impegno fuori dal salone | Appuntamento personale, un impegno fuori dal salone |
| Chiusura | Chiusura | Quel giorno il salone non lavora | Chiusura, quel giorno il salone non lavora |
| Scheda | Nuovo cane | Apri una scheda | Nuovo cane, apri una scheda |

Le destinazioni restano `/appuntamenti/nuovo`, `/appuntamenti/personale/nuovo`, `/chiusure/nuovo`, `/animali/nuovo`. Dal calendario, la data nel query string resta.

Il titolo lungo va a capo dentro la riga. Non si riduce il carattere e non si tronca.

## 5. Verifica

- Un cane il cui percorso Firestore è diverso dal campo `id` sparisce dal salone, non torna allo snapshot successivo e non viene ricopiato da `users/{uid}/dogs`. Il documento sotto `users/` è ancora lì.
- Roberto cancella, lo snapshot rimanda lo stesso cane, la lista resta vuota e `saveDog` non lo riscrive. La pietra storica `groomly.deleted` da sola, senza pending e senza sessione, per Roberto non nasconde un cane.
- `finishDogRemoval` con `dropVisits` falso restituisce vero se `removeDog` è vero, e chiama prima il cane.
- Una nota di 240 caratteri si salva. Una di 241 no. La quarantunesima no. Modifica del nome tiene le note aggiuntive. Il calendario mostra `altro` e non il testo. La scheda mostra il testo sotto il rosso.
- Il menu del più espone i quattro titoli della tabella, e «Chiusura» e «Nuovo cane» sono identici a oggi.
- `npm test` verde prima della pubblicazione `1.1.72`.
