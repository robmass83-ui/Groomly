# Groomly — raccoglitore del backup (Piano 1)

Data: 2026-10-22
Stato: approvata, con le integrazioni dello stesso giorno (sink dei byte, file citato più volte, fuso Europe/Rome, checksum sui byte del file, cani lapidati, errore offline). Il piano si scrive da questa versione. Nessun codice finché il piano non è eseguito.

Questo piano produce i dati di un backup completo del salone aperto: codici cane stabili, nomi di file sicuri, byte ricomposti, `manifest.json` e `groomly-dati.json`. Non produce Excel, ZIP o cartelle su Drive. Non cambia schermate. Non collega Google Drive.

La diagnosi in `docs/backup-diagnosi.md` è la base. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano. Dove il piano dice ancora di trasformare le foto in `.jpg` o `.png`, vale questa specifica: il mime del documento resta com’è.

## Decisioni chiuse

1. Il salone si legge solo con `salonRootPath` e `salonDocPath` (`src/data/firebase/salonRoot.ts`). Con il salone `shared` il percorso è `salon/shared/…`. Con un altro id è `salons/{id}/…`. Nessuna stringa `salon/shared` o `salons/` scritta nel raccoglitore.
2. I byte di un file stanno in `files/{id}/full/data` quando `chunkCount` è 0, altrimenti in `files/{id}/chunks/0` … `chunks/{n-1}`, in quest’ordine. Si usa il campo `dati`. La miniatura `thumb` non è il file.
3. L’estensione segue il `mime` del documento. `image/webp` resta `.webp`. Nessuna ricodifica.
4. Se la lunghezza ricomposta non è uguale a `byteSize`, o il documento binario manca, il file va in `fotoMancanti` e il raccoglitore continua.
5. `groomly-dati.json` è un superinsieme del JSON che «Esegui ora» scrive oggi. In cima ci sono `dogs`, `appointments`, `services`, `settings`, `closures` con la stessa forma (date ISO, foto `file:{id}`). Accanto: `versioneFormato`, `files`, `deletedDogs`, `codiciCane`, `fotoMancanti`. `readRestoreBundle` deve accettare questo oggetto e leggere almeno le quattro mappe di oggi.
6. L’intera chiave `settings.backup` (`lastAt`, `autoDaily`, `snapshot`) non entra nel JSON. Non esiste una coda persistita: la coda verso Storage è solo in memoria e non è un dato del salone. Un ripristino futuro non scrive `settings.backup`.
7. `meta/deleted-dogs` entra nel backup come `deletedDogs`. Al ripristino futuro, un cane o un appuntamento che si riscrive va tolto da quella lapide, altrimenti `filterDogs` / `filterAppointments` lo nascondono di nuovo. Questo piano non ripristina.
8. `members`, `accounts`, token push e dispositivi restano fuori.
9. Il codice cane non è un campo del documento cane. Contatore e mappa stanno in `meta/codici-cani`. Scrivere il codice sul cane farebbe scattare `listenDogs` (`onSnapshot` sulla collezione `dogs`), riscriverebbe la copia in memoria e sarebbe una modifica visibile anche lasciando `updatedAt` invariato. Per questo la mappa è la scelta, non un ripiego.
10. `uploadBackupFile`, `enqueueBackup`, `runCloudDailyBackup` e `triggerDownload` restano com’è. Questo piano non li chiama e non li modifica. Li sostituisce il piano della card.
11. `raccogliBackup(now, { includiByte, onFile })`. Senza `onFile` i byte si verificano e si scartano. Con `onFile`, ogni file con esito `ok` viene consegnato una volta, i byte non restano nel valore restituito, e la Promise si attende prima del file successivo. Le letture possono esserne tre in corso. In questo piano `onFile` si usa solo nei test: serve allo ZIP e a Drive, che non rileggono Firestore.
12. Un documento `files` citato più volte ha un solo `percorsoBackup`. La priorità è appuntamento, poi galleria, poi profilo, poi logo, poi file di listino, poi `file-sciolti`. Gli altri percorsi stanno in `altriRiferimenti`. Lo ZIP futuro scrive il file una sola volta, nel percorso principale.
13. Il giorno di una cartella appuntamento e l’offset di `creatoIl` usano sempre `Europe/Rome`, mai il fuso del telefono.
14. Se la rete manca, `raccogliBackup` lancia `AppError` con codice `backup_offline` e messaggio «Serve la connessione per creare il backup». Non usa `auth_offline` né `storage_write`.

## Fuori da questo lavoro

- Excel, ZIP, menu Condividi, Google Drive, schermata di avanzamento, chip, toggle.
- Mostrare `C0001` sulla scheda del cane.
- Ripristino, unione, sostituzione, backup di sicurezza prima del ripristino.
- Togliere l’upload su Storage e il link `<a download>`.
- Spostare le foto su Firebase Storage.
- Cambiare regole Firestore: `meta/codici-cani` è già scrivibile, perché le regole del salone permettono `meta` e vietano solo `files` da quel ramo.

## Codice morto, solo segnalato

Queste funzioni restano nel programma e continuano a fare quello che fanno oggi.

- `uploadBackupFile` in `src/data/firebase/client.ts` manda il JSON a `users/{uid}/backups/{giorno}.json` sul bucket `groomly-3128b.firebasestorage.app`. Il bucket non esiste. La coda di `src/data/firebase/taskQueue.ts` vive solo in memoria.
- `runBackup` e `exportZip` in `src/pages/SettingsPage.tsx` scaricano con `triggerDownload` (`<a download>`), non con `writeDocuments` né con `Share.share`.
- `maybeDailyBackup` scrive `backup.snapshot` solo nel ramo senza cloud. Sul cloud `settingsToDoc` toglie `snapshot` prima di salvare.

Il raccoglitore non è agganciato a questi pulsanti.

## 1. Nomi sicuri

`nomeSicuro(testo: string): string` in `src/lib/nomeSicuro.ts`.

Ordine:

1. Ogni `+` diventa la lettera `e`. «Bagno + taglio» diventa «Bagno e taglio».
2. Si tolgono i caratteri di controllo (U+0000–U+001F e U+007F) e `< > : " / \ | ? *`.
3. Gli spazi e le tabulazioni rimaste diventano un solo spazio. Si tagliano gli spazi agli estremi.
4. Si tolgono, a ripetizione, il punto e lo spazio finali.
5. Se il risultato è vuoto, il nome è `senza-nome`.
6. Se il risultato, senza distinzione di maiuscole, è `CON`, `PRN`, `AUX`, `NUL`, `COM1`…`COM9` o `LPT1`…`LPT9`, si aggiunge `_`.
7. Si tiene al massimo 60 unità UTF-16. Se il taglio cade su un surrogato alto, si toglie anche quello. Poi si ripetono i punti 4 e 5.

Le lettere accentate e le emoji restano. I test coprono accenti, emoji, simboli, `+`, stringa vuota, solo punti, nome più lungo di 60, `AUX` e un surrogato spezzato.

## 2. Codici cane

Documento `meta/codici-cani`, percorso da `salonDocPath('meta', 'codici-cani')`.

```ts
type CodiciCaneDoc = {
  next: number
  cartella: 'cani' | 'animali'
  byId: Record<string, string>
}
```

`next` è il prossimo intero da assegnare. Parte da 1. Il codice è `C` più il numero in decimale, con almeno quattro cifre: `C0001`, e oltre 9999 `C10000`. Un codice già presente non si riassegna e non si riformatta.

`assegnaCodici(doc, cani)` è pura, in `src/lib/codiceCane.ts`. `cani` porta `id`, `createdAt` (millisecondi) e `species`.

- Le voci di `byId` restano, anche se il cane non è più nell’elenco. Il numero non si riusa.
- I cani senza voce si ordinano per `createdAt` crescente, poi per `id`. Un `createdAt` assente va in fondo.
- A ciascuno si dà `next`, poi `next` cresce di uno.
- Se `byId` contiene numeri più alti di `next - 1`, `next` diventa il massimo trovato più uno. I codici esistenti non cambiano.
- `cartella` si scrive solo se il documento non esiste ancora: `animali` se almeno un cane ha `species` diversa da `cane`, altrimenti `cani`. Alle raccolte successive la cartella non cambia, così un gatto aggiunto dopo non sposta le cartelle già nominate.
- La funzione non riceve e non restituisce i documenti cane. Non ha un campo `updatedAt`.

La scrittura è una transazione Firestore sullo stesso documento. Dentro la transazione si rilegge e si ricalcola, così due telefoni non danno lo stesso codice. Se dopo il ricalcolo non c’è nulla di nuovo, non si scrive. Se la transazione fallisce, il raccoglitore si ferma e non mette nel JSON codici che non sono sul documento.

Prima di ogni lettura, se `navigator.onLine === false`, si lancia subito `new AppError('Serve la connessione per creare il backup', 'backup_offline')`. Lo stesso codice si usa se Firestore risponde `unavailable` o `deadline-exceeded`, o se l’errore è di rete. Un altro fallimento resta `new AppError('Salvataggio non riuscito', 'storage_write')`. `backup_offline` si aggiunge a `AppErrorCode` in `src/data/errors.ts`.

I cani archiviati (`non_in_cura`, `deceduto`) che hanno ancora il documento ricevono un codice. Un cane il cui id è nella lapide ma il cui documento `dogs/{id}` esiste ancora entra in `dogs` del JSON, così com’è, e riceve il codice come gli altri. La lapide viaggia in `deletedDogs`: al ripristino futuro resta nascosto finché il piano del ripristino non lo toglie dalla lapide. Un id che sta solo nella lapide, senza documento, non entra in `dogs` e non riceve un codice nuovo.

## 3. Percorsi relativi

Si calcolano per i file, e si salvano in `files[id].percorsoBackup`. Non si creano cartelle.

Prefisso: il valore `cartella` del documento codici (`cani` o `animali`).

Cartella del cane, nel formato `{codice} - {nome} - {razza} ({nome padrone})`. `nome`, `razza` e il nome del padrone passano da `nomeSicuro` uno per uno. Il trattino e le parentesi si aggiungono dopo. Il nome intero della cartella può superare 60 caratteri. Il padrone è il contatto con `isPrimary`, altrimenti il primo contatto, altrimenti `contact.name`. Razza assente: si omette ` - {razza}`. Padrone assente: si omettono le parentesi. Il codice non passa da `nomeSicuro`.

- Foto di profilo (`dog.photo` che punta a quel file): `{cartella}/{cartellaCane}/profilo{estensione}`.
- Foto di `dog.gallery`: `{cartella}/{cartellaCane}/altre foto/foto-01{estensione}`, in ordine di `takenAt` e poi di id.
- Foto di un appuntamento: `{cartella}/{cartellaCane}/{AAAA-MM-GG} - {servizio}/`. `AAAA-MM-GG` è il giorno di `start` nel fuso `Europe/Rome`, non nel fuso del telefono. Il servizio è i nomi delle righe `services`, uniti con ` e `, poi passati a `nomeSicuro`. Senza servizi il pezzo è `visita`. Due appuntamenti dello stesso cane con lo stesso giorno e lo stesso nome sicuro prendono ` (2)`, ` (3)`, … in ordine di `start` e poi di id. Dentro, `prima-01`, `dopo-01`, `altro-01` secondo `kind`, in ordine di id, con l’estensione del mime.

Se lo stesso id di file compare in più ruoli, `percorsoBackup` è il primo di questa lista e gli altri percorsi, senza duplicati e in ordine alfabetico, stanno in `altriRiferimenti` (assente se vuoto):

1. appuntamento, e tra più appuntamenti vince `start` minore, poi l’id;
2. galleria, in ordine di `takenAt` e poi di id della foto;
3. profilo;
4. logo del listino;
5. file di `priceList` o `priceListHistory`;
6. `file-sciolti/{id}{estensione}` se non c’è nessun altro ruolo.

Gli altri ruoli usano questi percorsi:

- Logo (`priceSheet.intestazione.logo`): `listino/logo{estensione}`.
- File di `priceList` e `priceListHistory`: `listino/file/{nomeSicuro(fileName)}{estensione}`. Nome vuoto: si usa l’id del file. Due nomi uguali: ` (2)` prima dell’estensione.
- Un documento `files` non citato da cani, appuntamenti o listino: `file-sciolti/{id}{estensione}`.

L’estensione è `.webp`, `.jpg`, `.png`, `.gif` o `.pdf` per quei mime. Per un altro mime con sottotipo di sole lettere e cifre, si usa quel sottotipo. Altrimenti `.bin`.

## 4. Byte

`ricomponiFile` in `src/lib/backupFile.ts` riceve i metadati e i pezzi già letti. Non parla con Firestore.

- `chunkCount === 0`: un solo pezzo, quello di `full/data`.
- `chunkCount > 0`: esattamente quei pezzi, indice 0 fino a `chunkCount - 1`. `full/data` non si legge.
- I pezzi si concatenano con `joinChunks`.
- `byteSize` numerico e lunghezza diversa → esito `dimensione`.
- Pezzo mancante con `chunkCount === 0` → `assente`. Pezzo mancante con chunk → `chunk-assente`.
- Bytes illeggibili → `illeggibile`.
- `byteSize` assente: la lunghezza ricomposta è accettata e diventa la dimensione registrata.

`estensioneDaMime(mime)` sta nello stesso modulo.

La lettura Firestore sta in `src/data/firebase/backupCollect.ts`. Per ogni file chiede il documento principale e poi `full/data` oppure i chunk, tramite `salonDocPath('files', id)` e i segmenti `full/data` o `chunks/{n}`. Fino a tre letture sono in corso insieme. Un file fallito non interrompe gli altri e non chiama `onFile`.

`onFile`, se c’è, riceve `(meta, bytes, percorsoBackup)` solo per l’esito `ok`, una volta per id. Il raccoglitore attende la sua Promise prima di chiamare `onFile` per il file successivo, così chi scrive lo ZIP tiene in mano un solo blocco di byte. Le letture già partite restano al massimo tre. Senza `onFile` i byte si verificano e si abbandonano. In entrambi i casi il valore restituito non contiene byte, e il JSON non contiene `dati` né `thumb`. In questo piano nessuno schermo passa `onFile`: lo passano solo i test.

La stima, prima di leggere i byte, è la somma dei `byteSize` numerici. Un file senza `byteSize` conta 0 finché non è stato ricomposto.

## 5. `groomly-dati.json`

`versioneFormato` è `1`.

Le cinque mappe di oggi si costruiscono con le stesse funzioni dell’export attuale: `dogsToLocalMap`, `appointmentsToLocalMap` (più gli impegni `kind: "personale"`, come `appointmentsBackupMap`), `servicesToLocalMap`, `closuresToLocalMap`, e per le impostazioni `settingsToDoc(settingsFromDoc(...))`. Le date in queste mappe restano stringhe ISO. `photo` resta `file:{id}` o, se sul documento c’è ancora un `data:`, quella stringa. Non si espande `file:` in base64.

Poi, su una copia delle impostazioni destinata solo al JSON, si cancella la chiave `backup`. Il documento `settings/main` del salone non si riscrive. Anche `passwordHash`, se comparisse, si toglie dalla copia. Il resto delle impostazioni resta: attività, listino, `priceSheet`, promemoria, tag, soglie, `ui`, `exportPrefs`. `theme` non è nel documento cloud e non si inventa.

Chiavi aggiunte:

```ts
files: Record<string, {
  id: string
  kind: 'foto' | 'file'
  owner: string
  name: string
  mime: string
  byteSize: number
  chunkCount: number
  w?: number
  h?: number
  createdAt: string
  createdBy: string
  estensione: string
  percorsoBackup: string
  altriRiferimenti?: string[]
  esito: 'ok' | 'mancante'
}>

deletedDogs: { ids: string[]; appointmentIds: string[] }

codiciCane: {
  next: number
  cartella: 'cani' | 'animali'
  byId: Record<string, string>
}

fotoMancanti: Array<{
  id: string
  motivo: 'assente' | 'chunk-assente' | 'dimensione' | 'illeggibile'
  byteSize?: number
  lunghezza?: number
}>
```

`deletedDogs` viene da `readTombstone` sul documento letto con `salonDocPath('meta', 'deleted-dogs')`. Documento assente: due elenchi vuoti. Gli id si ordinano e si deduplicano.

`fotoMancanti` è ordinato per `id`. Un file con esito `mancante` c’è sia in `files` sia in `fotoMancanti`.

`closures` c’è sempre, anche come oggetto vuoto.

L’ordine canonico delle chiavi, per il file e per il checksum, è: `versioneFormato`, `dogs`, `appointments`, `services`, `settings`, `closures`, `files`, `deletedDogs`, `codiciCane`, `fotoMancanti`. Dentro ogni mappa le chiavi sono ordinate per id. `JSON.stringify` di questa forma è la stringa scritta in `groomly-dati.json`. Lo SHA-256, in esadecimale minuscolo, è quello dei byte UTF-8 di quella stringa, gli stessi byte che finirebbero nel file. Non si ricalcola da un oggetto rimescolato.

## 6. `manifest.json`

```ts
{
  formato: 'groomly-backup'
  versioneFormato: 1
  creatoIl: string
  app: { versione: string }
  salone: { id: string; nome: string }
  conteggi: {
    cani: number
    clienti: number
    appuntamenti: number
    foto: number
    fileListino: number
    fotoMancanti: number
  }
  tipo: 'completo' | 'solo-dati'
  fotoIncluse: boolean
  checksum: { 'groomly-dati.json': string }
}
```

`creatoIl` è un ISO 8601 con l’offset di `Europe/Rome` in quell’istante (`+02:00` o `+01:00`), mai l’offset del telefono. I test passano l’istante. `app.versione` è `APP_VERSION`. `salone.id` è `currentSalonId()`. `salone.nome` è `business.salonName` se non è vuoto, altrimenti `business.name`.

`cani` è il numero di chiavi in `dogs`. `appuntamenti` è il numero di chiavi in `appointments`, impegni personali compresi. `foto` è il numero di file con `kind === 'foto'` ed `esito === 'ok'`. `fileListino` è il numero di file con `owner === 'listino'` ed esito `ok`. `fotoMancanti` è la lunghezza dell’elenco.

`clienti` non è una collezione. Per ogni cane si prende il contatto con `isPrimary`, altrimenti il primo di `contacts`, altrimenti `contact`. Stessa sequenza di sole cifre del telefono è lo stesso cliente. Senza cifre, lo stesso nome già trim e in minuscolo è lo stesso cliente. Senza cifre e senza nome, ogni cane conta da solo.

`raccogliBackup(now, { includiByte, onFile })` legge i byte solo se `includiByte` è true (il default di questo piano). In quel caso `fotoIncluse` è true e `tipo` è `completo`, anche se qualche file è in `fotoMancanti`. Con `includiByte: false` non si leggono `dati`, non si chiama `onFile`, non si compilano `fotoMancanti`, ogni file ha `esito: "ok"`, `fotoIncluse` è false e `tipo` è `solo-dati`. I byte non finiscono nel JSON in nessun caso.

## 7. Lapide, al ripristino futuro

Questo piano salva la lapide e non la applica al contrario.

Quando un piano successivo ripristina:

- un id presente in `dogs` del backup si toglie da `meta/deleted-dogs` campo `ids` prima che i listener filtrino;
- un id presente in `appointments` si toglie da `appointmentIds`;
- un cane ripristinato il cui id è rimasto in `ids` sparisce dall’elenco, perché `tombstoneRejectsDog` è vero;
- `settings.backup` del telefono che riceve il ripristino non si sostituisce con quello del file, e il file non lo contiene;
- lo SHA-256 si verifica sui byte del file `groomly-dati.json` così come letti dal disco o da Drive, confrontati con `manifest.checksum['groomly-dati.json']`. Non si rifà `JSON.stringify` sul contenuto interpretato;
- `members`, account e token non si scrivono.

`replaceCloudData` di oggi, se ricevesse questo JSON, accetterebbe le quattro mappe e ignorerebbe le chiavi nuove. Scriverebbe però le impostazioni per intero con `setDoc`. Senza la chiave `backup`, il documento impostazioni del salone perderebbe `lastAt` e `autoDaily`. È un effetto del ripristino attuale, non del raccoglitore. Il piano del ripristino deve preservare il `backup` già sul salone. Questo piano non modifica `replaceCloudData`.

## 8. Moduli

| Modulo | Ruolo |
|---|---|
| `src/lib/nomeSicuro.ts` | Nomi di file e cartelle |
| `src/lib/codiceCane.ts` | Formato `C0001` e `assegnaCodici` |
| `src/lib/backupFile.ts` | Estensione, ricomposizione, stima |
| `src/lib/backupBundle.ts` | JSON canonico, checksum, manifest, percorsi, tolto `settings.backup` |
| `src/data/firebase/backupCollect.ts` | Letture e transazione, solo tramite `salonRootPath` / `salonDocPath` |

Nessuna pagina importa questi moduli in questo piano.

```ts
type BackupSink = (meta: BackupFileMeta, bytes: Uint8Array, percorsoBackup: string) => Promise<void> | void

raccogliBackup(
  now: Date,
  opzioni?: { includiByte?: boolean; onFile?: BackupSink },
): Promise<{ dati: GroomlyDati; manifest: BackupManifest; json: string; checksum: string }>
```

Legge il salone attivo, assegna i codici mancanti, e con `includiByte` diverso da false legge i file. `json` è il testo canonico, e `checksum` è lo SHA-256 dei suoi byte UTF-8. I byte delle foto non sono nel valore restituito. Il default di `includiByte` è true. `BackupFileMeta` è la voce di `files` senza i byte.

Se `currentSalonId()` è nullo, si esce con l’errore già usato da `salonRootPath` (`storage_write`), senza scrivere.

## 9. Test

I test di questo progetto usano il falso Firestore già in `src/data/firebase`, non l’emulatore.

- `nomeSicuro`: i casi del §1.
- `assegnaCodici`: due raccolte di seguito non rinumerano; un cane nuovo prende il successivo; un codice rimasto dopo la scomparsa del cane non si riusa; l’ordine è `createdAt` poi `id`; `cartella` non cambia alla seconda chiamata. Partendo da un documento assente e da 300 cani con `createdAt` crescente, i codici sono univoci da `C0001` a `C0300`.
- Sul falso Firestore: la transazione scrive solo `meta/codici-cani`. I documenti `dogs` restano byte per byte, `updatedAt` compreso. Una seconda raccolta, con i codici già assegnati, non scrive.
- `ricomponiFile`: un `full/data` WebP sotto i 700 KB restituisce quegli byte e `.webp`. Tre chunk in ordine inverso in ingresso, richiesti come 0, 1, 2, producono l’ordine giusto. Lunghezza diversa da `byteSize` → `dimensione` e nessun lancio. Chunk 1 mancante → `chunk-assente`. Gli altri file di una lista proseguono.
- Un file che è insieme `dog.photo` e foto di un appuntamento ha `percorsoBackup` nella cartella dell’appuntamento, `altriRiferimenti` con il percorso `profilo`, e `onFile` chiamato una sola volta con quei byte.
- Un appuntamento alle 23:30 ora di Roma (`2026-10-22T21:30:00.000Z`, ancora ora legale, offset `+02:00`) finisce nella cartella `2026-10-22`, non in `2026-10-23`. `creatoIl` di quell’istante è `2026-10-22T23:30:00+02:00`.
- `navigator.onLine === false`, e una transazione che rifiuta con `unavailable`, lanciano `backup_offline` e non scrivono `meta/codici-cani`.
- Un cane presente in `dogs` e anche in `deletedDogs.ids` è dentro `dogs` del JSON e ha una voce in `codiciCane.byId`.
- Il JSON prodotto ha le cinque chiavi vecchie, `settings.backup` assente, `photo` che resta `file:…`, date ISO, e le chiavi nuove. `readRestoreBundle` di quel JSON restituisce cani, appuntamenti, servizi e impostazioni. Due `JSON.stringify` canonici dello stesso contenuto danno lo stesso SHA-256.
- Il manifest ha i conteggi del JSON. Due telefoni con le stesse cifre e spazi diversi contano uno. Due telefoni senza cifre e con lo stesso nome contano uno. Due cani senza telefono e senza nome contano due.
- La stima è la somma dei `byteSize` ed è disponibile senza leggere `dati`.
- Un test di percorso: con `bindSalon('shared')` le letture del falso Firestore stanno sotto `salon/shared`; con `bindSalon` di un uid stanno sotto `salons/{uid}`. Il raccoglitore ottiene quei percorsi solo da `salonRootPath` e `salonDocPath`.

## Criteri di accettazione

- [ ] Nessuna schermata cambia. `SettingsPage` non importa il raccoglitore.
- [ ] `uploadBackupFile`, `enqueueBackup`, `runCloudDailyBackup` e `triggerDownload` restano invariati.
- [ ] I documenti cane non vengono scritti da questo piano.
- [ ] Un file WebP esce con estensione `.webp` e gli stessi byte di `dati`.
- [ ] Un file con dimensione diversa è in `fotoMancanti` e il JSON degli altri dati c’è comunque.
- [ ] `groomly-dati.json` è accettato da `readRestoreBundle`.
- [ ] `settings.backup` non compare nel JSON.
- [ ] `deletedDogs` riporta la lapide del salone aperto.
- [ ] `members` e `accounts` non compaiono nel JSON.
- [ ] `onFile` riceve ogni file ok una volta, e un file citato due volte non viene letto due volte.
- [ ] Il giorno cartella e `creatoIl` usano `Europe/Rome`.
- [ ] Senza rete il codice errore è `backup_offline`.
- [ ] Un cane con documento e id in lapide è nel JSON e ha un codice.
