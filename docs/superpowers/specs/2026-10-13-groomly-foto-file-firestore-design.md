# Groomly — Foto e file in Firestore, come Amici per la coda

Data: 2026-10-13
Stato: sezioni approvate il 13 ottobre 2026, in attesa della lettura di questo file.

Il progetto `groomly-3128b` è sul piano Spark e non ha Cloud Storage. Foto e file del listino si salvano in Firestore, con lo schema di Amici per la coda (`lib/data/photos/photo_codec.dart`, `lib/data/models/photo.dart`, `lib/data/documents/document_codec.dart`). Dove la specifica `2026-10-13-groomly-salone-unico-design.md` o il codice mandano una foto o un file su Storage, vale questo testo.

## 0. Decisioni

| # | Regola |
|---|---|
| F1 | Nessuna foto e nessun file va su Cloud Storage. Foto e listino non usano più `firebase/storage`; resta solo nel backup giornaliero (F6). La sezione `storage` esce da `firebase.json`, `storage.rules` si cancella. |
| F2 | Ogni foto e ogni file è un documento a sé in `salon/shared/files/{id}`. Cane, appuntamento e impostazioni tengono solo il riferimento `file:{id}`. |
| F3 | Le foto si comprimono da sole fino alla qualità più alta che sta nei limiti di Amici. Una foto che non ci sta neanche al minimo non si salva. |
| F4 | Un file del listino fino a 700 KB sta in un documento. Sopra si spezza in pezzi da 600 KB. Oltre 10 MB si rifiuta. |
| F5 | I byte si scrivono come `Bytes` di Firestore, mai come testo base64 nei documenti del salone. |
| F6 | Il backup giornaliero resta com’è. Non entra in questo lavoro. |

## 1. Archivio

`salon/shared/files/{id}` è il documento principale:

| Campo | Contenuto |
|---|---|
| `kind` | `foto` oppure `file` |
| `owner` | `dog:{dogId}`, `appointment:{appointmentId}` oppure `listino` |
| `mime` | `image/webp`, `image/jpeg`, `image/png` o `application/pdf` |
| `name` | nome del file originale, vuoto per le foto scattate |
| `w`, `h` | lato in pixel della foto intera, solo per le foto |
| `byteSize` | peso dei byte interi |
| `thumb` | `Bytes`, la miniatura. Solo per le foto. |
| `chunkCount` | `0` se i byte stanno in `full/data`, altrimenti il numero di pezzi |
| `createdAt`, `createdBy` | quando e chi |

I byte interi:

- con `chunkCount: 0` stanno in `salon/shared/files/{id}/full/data`, campo `dati` (`Bytes`);
- con `chunkCount > 0` stanno in `salon/shared/files/{id}/chunks/{n}`, `n` da `0` a `chunkCount - 1`, campo `dati` (`Bytes`).

Un riferimento nei documenti esistenti ha la forma `file:{id}`. Vale per `photo` e `gallery[].photo` del cane, per `photos[].photo` dell’appuntamento e per `dataUrl` di `priceList` e `priceListHistory[]` nelle impostazioni. Il nome `dataUrl` resta per non cambiare la forma delle impostazioni.

## 2. Foto

Valgono le foto profilo, la galleria del cane e le foto prima, dopo e altro dell’appuntamento. I numeri sono quelli di Amici.

| | Lato | Qualità | Peso massimo |
|---|---|---|---|
| Foto intera | 1400 px | 80 | 450 KB |
| Miniatura | 200 px | 70 | 12 KB |

La foto intera parte da 1400 px e qualità 80. Se supera 450 KB, la qualità scende di 5 alla volta fino a 45. Se supera ancora, il lato passa a 1100 px. La miniatura parte da 200 px e qualità 70. Se supera 12 KB, la qualità scende di 5 fino a 45, poi il lato scende del 15% alla volta, al massimo 8 tentativi, mai sotto 40 px.

Il formato è WebP. Se il browser del telefono non produce WebP (`canvas.toBlob` restituisce un altro tipo), si usa JPEG con la stessa scala.

Se la foto intera supera ancora 450 KB al lato di 1100 px e qualità 45, oppure il documento principale supera 900 KB, la foto non si salva. Il messaggio è: «La foto è troppo grande per essere salvata. Prova con un’altra immagine.»

Un cane ha al massimo 20 foto, profilo più galleria. Alla ventunesima il messaggio è: «Puoi caricare al massimo 20 foto per cane.» e non si scrive niente. Le foto di un appuntamento non hanno un tetto loro.

La lista degli animali, l’avatar e la griglia della galleria leggono solo `thumb`. La foto intera si legge quando si apre o si ingrandisce.

## 3. File del listino

Un PDF si salva con i suoi byte. Una foto del listino passa da `prepareListinoPhoto` così com’è oggi, fino a 4096 px, perché deve restare leggibile con lo zoom. Il risultato si salva come file, non con la scala delle foto del §2. Non ha `thumb`.

- Fino a 700 KB: un solo documento, `full/data`.
- Sopra 700 KB: pezzi da 600 KB in `chunks/{n}`, scritti in gruppi da 8, e alla lettura si riuniscono in ordine.
- Sopra 10 MB: non si salva. Il messaggio è: «Il file pesa più di 10 MB. Riduci la scansione e riprova.»

Un file con `chunkCount > 0` compare nel listino solo quando sul telefono che lo apre sono leggibili tutti i pezzi. Un pezzo che manca non apre un file tronco.

## 4. Scrittura

Una foto nuova si scrive insieme al documento che la usa, in un solo `writeBatch`: `files/{id}`, `files/{id}/full/data` e il cane o l’appuntamento con `file:{id}`. O passano tutti, o nessuno.

Un file del listino in pezzi scrive prima i pezzi, poi `files/{id}`, poi le impostazioni con `file:{id}`. Se si ferma a metà, le impostazioni non lo nominano e nel listino non compare.

Togliere una foto dalla galleria, dall’appuntamento o un file dal listino cancella anche `files/{id}` con `full/data` e `chunks`. Cancellare un cane cancella i file con `owner` `dog:{dogId}` e quelli dei suoi appuntamenti.

Senza rete, le scritture restano nella coda della cache persistente di Firestore e partono al ritorno della connessione. Una foto appena scelta resta sul telefono come `data:` solo finché la sua scrittura in `files` non è riuscita; poi la copia locale `groomly.users.{uid}.*` tiene solo `file:{id}`. Senza Firebase (modalità solo telefono) le foto restano `data:` come oggi.

Per togliere una foto senza che un telefono con una copia vecchia la rimetta, cane e appuntamento tengono `removedPhotoIds`: gli id delle foto tolte. Il salone non rimette una foto il cui id è in quella lista.

## 5. Foto già presenti

Storage non è mai stato attivo, quindi nessuna foto è salita sul cloud. Le foto finora stanno sul telefono che le ha scelte: in `groomly.pending-photos.{uid}` e, come testo `data:`, nella copia locale dei cani, degli appuntamenti e delle impostazioni.

Al primo avvio della versione nuova, con accesso al salone, il telefono:

1. legge ogni valore `data:image/...` e `data:application/pdf...` da quei posti;
2. comprime le foto con il §2 e salva i PDF e le foto del listino con il §3;
3. scrive i documenti `files` e sostituisce il valore con `file:{id}` nel documento del salone e nella copia locale;
4. svuota `groomly.pending-photos.{uid}`.

Una foto che non si legge resta com’era e si riprova all’avvio dopo. Un valore `https://` già nei documenti continua a vedersi così com’è.

## 6. Regole Firestore

Dentro `match /salon/{document=**}`, che resta per chi ha fatto l’accesso, per `files` valgono anche questi tetti:

- `files/{id}`: `thumb` assente oppure `thumb.size() < 25000`;
- `files/{id}/full/data`: `dati.size() <= 716800` (700 KB: ci stanno le foto da 450 KB e i PDF inline);
- `files/{id}/chunks/{n}`: `dati.size() <= 614400` (600 KB).

Una scrittura sopra questi tetti viene rifiutata dal salone.

## 7. Pubblicazione

`npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b`. Lo `storage` esce dal comando della regola di pubblicazione.

## 8. Controlli

- Una foto di 4000 × 3000 esce con la foto intera sotto 450 KB e la miniatura sotto 12 KB.
- Una foto che al minimo supera ancora i limiti non scrive niente e mostra il messaggio del §2.
- La ventunesima foto di un cane non si scrive.
- Un PDF di 500 KB va in `full/data`. Uno di 2 MB va in 4 pezzi e torna uguale byte per byte. Uno di 11 MB non si scrive.
- Un PDF in pezzi con un pezzo mancante non compare nel listino.
- Foto profilo, galleria, foto del lavoro e file del listino si vedono dopo essere usciti e rientrati, e su un secondo telefono.
- Una foto `data:` presente sul telefono diventa `file:{id}` al primo avvio e `groomly.pending-photos.{uid}` si svuota.
- Nessun documento in `salon/shared/dogs`, `appointments` o `settings` contiene `data:` o un valore oltre 900 KB.
- Togliere una foto o un file cancella anche `files/{id}` e i suoi figli.
- `firebase.json` non ha `storage` e solo il backup giornaliero importa `firebase/storage`.
