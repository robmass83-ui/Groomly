# Diagnosi del backup attuale

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

22 ottobre 2026. Solo lettura del codice e di Firestore/Storage del progetto `groomly-3128b`. Nessuna modifica al codice, alle regole o ai dati.

La card **Dati e backup** non è un pulsante morto. Esegue del codice, scrive una data e può scaricare un JSON. Quel JSON non è un backup portatile delle foto, e la data sul chip non dimostra che un file sia uscito dal telefono. Il nuovo sistema non deve ripetere queste tre scelte: segnare «riuscito» prima di un file verificato, copiare solo i riferimenti `file:…`, mandare la copia su Firebase Storage.

## Cosa fa oggi ogni elemento

La card è in `src/pages/SettingsPage.tsx`, tra Aspetto e Personalizza. I testi sono «Esegui ora», «Backup automatico giornaliero», «Esporta», «Ripristina». Il chip è sempre verde (`tone="ok"`), anche con «Mai eseguito».

### Chip

Legge `settings.backup.lastAt` e lo formatta con `backupStatusLabel`:

- assente o illeggibile → «Mai eseguito»;
- stesso giorno → «Oggi HH:mm · completato»;
- un altro giorno → «d MMM yyyy», per esempio «19 ott 2026».

Non controlla che esista un file. Sul salone condiviso, oggi, `backup.lastAt` è `2026-10-19T18:50:25.964Z` e `backup.autoDaily` è `true`. Non c’è `backup.snapshot`. In ora italiana quella data è il 19 ottobre 2026, ed è esattamente la scritta del chip. È un campo salvato, non la prova di un file esterno.

### Esegui ora

`runBackup`:

1. Se il cloud è pronto, legge cani, appuntamenti, servizi, impostazioni e chiusure da Firestore e li converte nel formato locale. Altrimenti legge le chiavi `localStorage`.
2. Scarica `groomly-backup-aaaa-mm-gg.json` con un link `<a download>` (`triggerDownload`). Non usa `@capacitor/filesystem` né `@capacitor/share`.
3. Subito dopo, anche se il download non ha scritto nulla, salva `backup.lastAt` nelle impostazioni.
4. Se Firebase è acceso e il JSON non è vuoto, mette in coda l’upload su Storage nel percorso `users/{uid}/backups/{giorno}.json`.

Incassi e listino, sul telefono, fanno un’altra cosa: `writeDocuments` in `Documenti/Groomly` oppure `Share.share`. Il backup non chiama quelle funzioni. Sul APK il link `<a download>` non è il meccanismo che consegna un file all’utente, e nessuno controlla che il file esista.

La coda di upload sta solo in memoria (`src/data/firebase/taskQueue.ts`). Un refresh la perde. Se l’upload fallisce, la UI dice «Salvataggio non riuscito» e riprova al prossimo online, ma `lastAt` del passo 3 è già scritto.

### Backup automatico giornaliero

Il toggle salva solo `backup.autoDaily`. Non collega Drive e non parte un job di notte.

All’apertura dell’app, `DailyBackup` in `src/app/providers.tsx`:

- con il cloud pronto chiama `runCloudDailyBackup`: se `autoDaily` è true e `lastAt` manca o ha più di 24 ore, ricarica i dati, accoda lo stesso upload su Storage e, solo se l’upload riesce, aggiorna `backup.lastAt`;
- senza cloud, `maybeDailyBackup` scrive una copia dentro `settings.backup.snapshot` sullo stesso telefono e poi, se Firebase è acceso, accoda lo stesso upload.

Non c’è WorkManager. App chiusa, nessun backup. Sul cloud `settingsToDoc` cancella `snapshot` prima di scrivere Firestore: la copia «dentro le impostazioni» non esiste per il salone in uso. Oggi `autoDaily` è true e `lastAt` è fermo al 19 ottobre: il giornaliero parte a ogni apertura, l’upload non riesce, e solo «Esegui ora» può aver scritto quella data, perché il giornaliero la aggiorna soltanto dopo un upload riuscito.

### Esporta

`exportZip` costruisce `groomly-export.zip` con JSZip, sempre tramite `<a download>`, e non aggiorna `lastAt`.

Lo ZIP contiene:

- `backup.json`, lo stesso oggetto del JSON di «Esegui ora»;
- `foto/{id}.jpg` solo per le stringhe che iniziano con `data:`.

Le foto del cloud sono `file:{id}`. `collectPhotoFiles` le ignora. Lo ZIP del salone vero è il JSON dei riferimenti, senza i byte delle 20 foto.

### Ripristina

Accetta solo `.json` (`accept="application/json,.json"`). Uno ZIP, anche estratto a metà, non entra se non si sceglie il `backup.json` interno, e la UI non lo propone.

`readRestoreBundle` accetta l’oggetto se `dogs`, `appointments`, `services` e `settings` sono oggetti. `closures` è facoltativo. Qualsiasi altro campo è ignorato.

Poi `replaceCloudData` riscrive quei documenti nel salone aperto e cancella i documenti assenti dal file (cani, appuntamenti, servizi; le chiusure solo se la chiave c’è). Non legge né scrive `files`. Le foto `data:` vengono ricaricate come file nuovi. Le foto `file:{id}` restano puntatori: funzionano solo se quei documenti sono ancora nello stesso salone. Un telefono nuovo con lo stesso account le rivede perché i file sono già in Firestore, non perché il JSON le contenga. Un account nuovo, o un salone i cui file siano stati cancellati, resta senza immagini.

Non crea un backup di sicurezza prima di sostituire.

## Perché si rompe

Tre cause, tutte nel codice attuale.

1. **Il successo è la data, non il file.** «Esegui ora» scrive `lastAt` prima del download e prima dell’upload. Il chip diventa verde con una data anche se l’utente non ha un file. Il giornaliero cloud aggiorna `lastAt` solo dopo l’upload, ma l’upload non può riuscire (punto 2), quindi la data resta ferma sul tocco manuale.

2. **L’unica copia fuori dal telefono punta a un bucket che non esiste.** Il codice chiama Firebase Storage su `groomly-3128b.firebasestorage.app`, percorso `users/{uid}/backups/{giorno}.json`. `firebase.json` non pubblica Storage. I bucket `groomly-3128b.firebasestorage.app` e `groomly-3128b.appspot.com` rispondono 404. L’unico bucket del progetto è quello dei sorgenti delle Cloud Functions. Non c’è nessun `users/…/backups/*.json`. L’app, in più, non ha una schermata che rilegge quegli oggetti: anche se il bucket esistesse, Ripristina non li userebbe.

3. **Il JSON non contiene i byte.** Foto, logo e file del listino stanno in Firestore, in `files`. L’export salva la stringa `file:{id}`. Perdere il telefono non perde il salone, perché il salone è già in Firestore. Perdere o corrompere Firestore, o ripristinare su un altro salone, non si recupera da questo JSON.

Errore da non ripetere: un backup che aggiorna un’etichetta, tiene i dati nello stesso posto che dovrebbe proteggere, e non verifica un file apribile fuori dall’app.

## Formato dei vecchi `.json`

Sì, il lettore del formato vecchio serve in B3. I file possono esistere sui telefoni anche se Storage è vuoto: «Esegui ora» tenta il download a ogni tocco. Il nome è `groomly-backup-aaaa-mm-gg.json`. Lo ZIP, se qualcuno l’ha tenuto, ha lo stesso oggetto in `backup.json`.

È un oggetto con mappe id → documento, non l’elenco Firestore grezzo. Le date dentro cani, appuntamenti, servizi e chiusure sono stringhe ISO 8601. I millisecondi stanno solo nei documenti Firestore, non in questo JSON.

Chiavi obbligatorie: `dogs`, `appointments`, `services`, `settings`, tutte oggetti (anche vuoti). Chiave facoltativa: `closures`. `readRestoreBundle` rifiuta il file se manca una delle quattro.

`dogs[id]`: `id`, `name`, `species` (`cane` | `gatto` | `altro`), `breed`, `ageCategory`, `size`, `temperament`, `clientType`, `contact` `{ name, phone }`, `contacts[]` `{ id, name, role, phone, isPrimary }`, `tags[]`, `servicePrices[]` `{ serviceId, price?, durationMin? }`, `hiddenServiceIds[]`, `customFields[]` `{ id, label, value }`, `gallery[]` `{ id, photo, takenAt }`, `status` (`attivo` | `non_in_cura` | `deceduto`), `searchKey`, `createdAt`, `updatedAt`. Facoltativi: `sex` (`M` | `F`), `photo`, `criticalNote`, `notes`, `birthYear`, `isSenior`, `weightKg`, `recurrenceWeeks`, `archivedAt`, `removedPhotoIds`. `photo` e `gallery[].photo` sono `file:{id}` oppure `data:image/…`.

`appointments[id]`, visita: `id`, `dogId`, `start`, `services[]` `{ serviceId, name, durationMin, price }`, `status` (`programmato` | `completato` | `disdetto` | `non_venuto`), `createdAt`, `updatedAt`. Facoltativi: `cancelReason` (`cliente` | `salone` | `deceduto`, solo se disdetto), `total`, `actualDurationMin`, `adjustmentNote`, `paymentMethod` (`pos` | `contanti` | `na`), `tools[]`, `products[]`, `cutStyle`, `photos[]` `{ id, photo, kind }` con `kind` `prima` | `dopo` | `altro`, `removedPhotoIds`, `end`, `seriesId`, `cycleAnchor` (`visita` | `ritmo`), `coveredDue`. Il JSON di export non scrive `kind` per le visite.

`appointments[id]`, impegno personale: `id`, `kind: "personale"`, `title`, `start`, `createdAt`, `updatedAt`, e `plannedEnd` se c’è.

`services[id]`: `id`, `name`, `iconKey`, `kind` (`principale` | `extra`), `durationMin` e `price` `{ piccola, media, grande }`, `order`, `active`, `createdAt`, `updatedAt`.

`closures[id]`: `id`, `reason`, `startDay` e `endDay` (`aaaa-mm-gg`), `createdAt`, `updatedAt`.

`settings`: l’oggetto impostazioni. Dall’export cloud mancano `theme` e `backup.snapshot`, e i `dataUrl` che erano ancora `data:` (listino e logo) sono tolti; restano i `file:`. Un export da `localStorage`, se il cloud non era pronto, può ancora avere `theme`, `backup.snapshot` e foto `data:`. Campi utili: `updatedAt`, `recentDogIds`, `fieldLabels`, `tagSuggestions`, `toolSuggestions`, `productSuggestions`, `business` `{ salonName, name, vatNumber, phone, address, taxCode }`, `priceList` e `priceListHistory[]` `{ id, fileName, mime, byteSize, uploadedAt, dataUrl, pageCount? }`, `priceSheet` (listino per razza, logo in `intestazione.logo`), `monthlyReminder` `{ enabled, time, daysBefore }`, `backup` `{ autoDaily, lastAt? }`, `ageThresholds`, `ui`, `exportPrefs`.

Il ripristino di questi file deve continuare ad accettarli. Non sono il formato nuovo (`manifest.json` + `groomly-dati.json` + file binari).

## Collezioni da salvare

La radice non è sempre `salons/{id}`. `salonCollection`:

- salone `shared` → `salon/shared/…` (i due account operatore, `legacy: true`);
- ogni altro salone → `salons/{salonId}/…`, con `salonId` uguale all’uid del titolare.

Il raccoglitore deve leggere la radice del salone aperto, non solo `salons/{id}`.

Stato letto il 22 ottobre 2026, solo conteggi:

| Radice | Cani | Appuntamenti | Servizi | Chiusure | File | Impostazioni |
|---|---:|---:|---:|---:|---:|---:|
| `salon/shared` | 82 | 112 | 10 | 0 (collezione assente) | 20 | 1 |
| `salons/…sci1` | 0 | 0 | 8 | 0 | 0 | 1 |
| `salons/…ofn2` | 0 | 0 | 0 | 0 | 0 | 1 |

Quattro account. Due sono il salone condiviso. Gli altri due hanno il salone vuoto di animali e di foto (servizi seme e/o impostazioni). La collezione `users` non ha documenti. `salons` non ha documenti padre: i dati stanno nelle sottocollezioni.

### `dogs/{id}`

Come il cane del JSON, ma le date (`createdAt`, `updatedAt`, `archivedAt`, `gallery[].takenAt`) sono numeri in millisecondi. `photo` e `gallery[].photo` sono `file:{id}` (o assenti). Non c’è un campo `codiceCane`.

### Contatti

Non c’è una collezione clienti. Stanno sul cane: `contact` `{ name, phone }` e `contacts[]` `{ id, name, role, phone, isPrimary }`.

### `appointments/{id}`

Come il JSON, date in millisecondi. La visita può avere `kind: "pelosetto"`. L’impegno ha `kind: "personale"`. Gli incassi non sono una collezione: si calcolano dagli appuntamenti completati.

### `services/{id}`

Come il JSON, `createdAt` e `updatedAt` in millisecondi.

### `closures/{id}`

`reason`, `startDay`, `endDay`, `createdAt`, `updatedAt` (millisecondi). Sul salone condiviso la collezione non c’è ancora. Va inclusa quando esiste.

### `settings/main`

Come `settings` del JSON cloud. `theme` non è nel documento. `backup` è `{ autoDaily, lastAt? }` senza `snapshot`.

### `files/{id}` — struttura reale dei byte

Documento principale:

- `kind`: `foto` | `file`
- `owner`: `dog:{id}` | `appointment:{id}` | `listino`
- `name`: stringa (vuota per le foto)
- `createdAt`: millisecondi (`Date.now()`)
- `createdBy`: uid di chi ha caricato
- `mime`: per le foto `image/webp` o `image/jpeg`; per gli altri file il mime originale
- `byteSize`: lunghezza dei byte pieni
- `chunkCount`: `0` se il file sta in un solo documento
- solo foto: `w`, `h`, `thumb` (Bytes, sotto i 25 KB)

Binario:

- se i byte pieni sono fino a 700 KB (`INLINE_MAX_BYTES`), `chunkCount` è 0 e i byte stanno in `files/{id}/full/data` nel campo `dati` (Bytes). Non è base64 nel JSON;
- se superano 700 KB, fino a 10 MB, i pezzi da 600 KB stanno in `files/{id}/chunks/0`, `chunks/1`, … nel campo `dati`. `chunkCount` è il numero di pezzi. Non c’è `full/data`.

Le foto compresse restano sotto i 450 KB, quindi oggi finiscono quasi sempre in `full/data`, non nei chunk. In produzione, sui 20 file: 19 `foto` e 1 `file`; 12 `image/webp` e 8 `image/jpeg`; 18 di cani e 2 di listino; tutti con `chunkCount` 0; tutti e 20 hanno `full/data`; 19 hanno `thumb` (tutte le foto); somma `byteSize` 1.448.546 byte, uguale alla somma dei `dati`. Nessun documento `chunks`.

Il raccoglitore deve leggere `full/data` quando `chunkCount` è 0 e `chunks/{n}` quando è maggiore di 0, poi concatenare i `dati` in un file binario il cui tipo è `mime`. Non sono JPEG per forza: dodici foto sono WebP. Metterle in uno ZIP come `.jpg` le romperebbe.

## `salon/shared/files` non è un residuo

Non va ignorato. È l’archivio foto del salone che oggi ha i dati: 82 cani, 112 appuntamenti, 20 file, circa 1,4 MB.

Non ci sono file «non ancora migrati» verso `salons/{id}`:

- i due saloni `salons/{uid}` non hanno cani né file;
- `users` è vuota;
- la migrazione copia `users/{uid}` nel salone aperto solo se il documento non c’è già, e non sposta `files`;
- in `salon/shared/meta` ci sono `deleted-dogs` e sei marker `restored-{uid}` (`done`, `at`): la copia dai vecchi `users/{uid}` è già stata segnata. Quei `users` non ci sono più.

`salon/shared/members` ha 7 documenti `{ uid, at }`: presenza di account, non clienti. `meta/deleted-dogs` ha `ids` e `appointmentIds`: lapidi. Se un ripristino riscrive un cane lapidato e lascia la lapide, l’app lo nasconde di nuovo. Non sono dati da mettere nel Registro, ma il ripristino dovrà tenerne conto. Fuori dal salone, e da non copiare nel backup: `accounts`, `accounts/{uid}/push`, `accounts/{uid}/devices` (token), `pushDeliveries`, `emailRateLimits`.

## Conseguenza per i piani successivi

- B0 legge la radice vera (`salon/shared` oppure `salons/{id}`), ricompone `full/data` o `chunks`, e stima la dimensione con `byteSize` (qui 1,4 MB, non gigabyte).
- B3, quando si farà, accetta ancora questo JSON vecchio. I byte delle foto `file:` non ci sono dentro: o si recuperano dallo stesso salone, o quel backup non le ha.
- Il chip nuovo non può usare il `lastAt` di oggi come «backup verificato». Quella data è il 19 ottobre 2026 e non ha un file corrispondente né sul telefono né su Storage.
