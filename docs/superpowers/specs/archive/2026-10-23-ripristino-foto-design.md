# Groomly — Ripristino delle foto dallo ZIP completo (Piano 4, secondo pezzo)

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-23
Stato: chiusa il 2026-10-23. L'incarico è di procedere con le scelte consigliate, scrivere il piano ed eseguirlo. Nessun codice di prodotto prima del piano.

**Ripristina** accetta anche lo ZIP creato da **Backup completo**. I dati e i codici cane si scrivono come nello ZIP solo dati. In più, in cloud, i byte dei file con esito `ok` tornano in `files/{id}` con lo stesso id. Le foto restano nel mime del file, WebP compreso. Unisci, il backup di sicurezza, l'annulla ripristino, la barra di avanzamento e Drive restano fuori.

Questa specifica sostituisce, solo per `tipo === 'completo'`, i punti 6 e 13 della specifica `docs/superpowers/specs/2026-10-22-ripristino-zip-dati-design.md`. Lo ZIP solo dati, il JSON di Esporta e il JSON interno restano come lì. Il formato di `groomly-dati.json` resta quello del raccoglitore. `backupZip` e `backupCompleto` non si modificano. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano.

## Approcci

1. **Scelto.** `leggiRipristino` riconosce lo ZIP completo, controlla i percorsi e i byte, e restituisce i file accanto al bundle. Una funzione nuova li riscrive con l'id già usato dai cani. `replaceCloudData` e `scriviCodiciCane` restano com'è.
2. Scartato. `createFileStore.write` crea un id nuovo e ricomprime la foto. I cani del backup puntano ancora a `file:` vecchio, quindi la foto non ricompare.
3. Scartato. Scrivere solo gli id assenti sul telefono. Un ripristino terrebbe i byte più nuovi sotto l'id vecchio, non quelli dell'archivio.

## Decisioni chiuse

1. `leggiRipristino` resta in `src/lib/leggiRipristino.ts`. Non scrive. Il risultato guadagna `completo`: bundle, `codici` e `file`. `vecchio`, `solo-dati` e `rifiutato` restano. Il bundle ha solo cani, appuntamenti, servizi, impostazioni e chiusure. I file non entrano nel bundle.
2. Il messaggio «Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.» non si usa più. Uno ZIP completo valido apre lo stesso foglio. Uno ZIP completo malformato resta «File non valido», e questo rifiuto arriva prima di accettare il tipo, come oggi per il checksum e la forma.
3. Di uno ZIP solo dati si leggono ancora solo `dati/manifest.json` e `dati/groomly-dati.json`. Di uno ZIP completo, dopo quei due e dopo il controllo del punto 5 della specifica precedente, si leggono anche le voci il cui `files[id].esito` è `ok`. `LEGGIMI.txt`, il Registro, `dati/foto-mancanti.txt` e `altriRiferimenti` non si leggono.
4. Per il completo, `files` deve essere un oggetto, non un array e non assente. Ogni valore deve essere un oggetto. La chiave è l'id. Se il record ha `id`, deve essere uguale alla chiave. `esito` è `ok` oppure `mancante`: ogni altro valore, o l'assenza, è «File non valido». Un `mancante` non si cerca nello ZIP e non si scrive. Un `ok` si scrive.
5. Un file `ok` è valido solo se: `kind` è `foto` o `file`; `mime`, `owner`, `name` e `createdBy` sono stringhe (`owner`, `name` e `createdBy` possono essere vuote; `mime` no); `byteSize` è un intero da 0 a `FILE_MAX_BYTES` (10 × 1024 × 1024); se `kind` è `foto`, `mime` comincia con `image/`; `w` e `h` si copiano solo se sono numeri finiti; `null`, assenti, `NaN` e qualsiasi altro valore si ignorano e non fanno rifiutare l'archivio; `createdAt` è una stringa e `Date.parse` non dà `NaN`. L'id è lungo da 1 a 128 e contiene solo lettere ASCII, cifre, `_` e `-`. `percorsoBackup` non è vuoto, non ha `\` né NUL, non comincia o finisce per `/`, non contiene `//`, e nessun segmento è `.` o `..`. Due `ok` con lo stesso percorso sono «File non valido».
6. Prima di leggere i byte si contano gli `ok` e si sommano i loro `byteSize`. Più di 200 file `ok`, o una somma maggiore di `80 * 1024 * 1024`, è «File non valido» e le voci non si leggono. Poi ogni voce deve esistere nello ZIP e i byte letti devono avere lunghezza uguale a `byteSize`. Altrimenti «File non valido». I byte restituiti sono una copia `new Uint8Array(letti)`. Non si ricomprime e non si cambia il mime.
7. `FileRipristino` è `{ id, kind, owner, name, mime, byteSize, createdAt, createdBy, bytes, w?, h? }`. `createdAt` nel risultato è il numero di `Date.parse`. `w` e `h` si copiano solo se sono numeri finiti. Il risultato `completo` con zero file `ok` ha `file: []` ed è valido.
8. La conferma cloud, dopo `replaceCloudData` riuscito e dopo `scriviCodiciCane` se ci sono i codici, chiama `scriviFileRipristino` se `file.length > 0`. L'ordine è dati, codici, file. Un fallimento di uno dei tre lascia il foglio aperto, toast «Ripristino incompleto, riprova», e una nuova conferma rifà tutti e tre. Senza rete, prima di ogni scrittura, resta «Connessione assente».
9. `scriviFileRipristino(files)` sta in `src/data/firebase/ripristinoFile.ts`. La prova usa `applicaFileRipristino(files, fs, db)`, con lo stesso `FirestoreApi` di `files.ts`. Il percorso esce da `salonRootPath()`: `salon/shared` o `salons/{id}`, mai scritto a mano. Non si importa `client.ts`.
10. Per ogni file la scrittura sostituisce il documento `files/{id}`. Non unisce. I campi sono `kind`, `owner`, `name`, `mime`, `byteSize` (lunghezza dei byte), `chunkCount` (lunghezza di `splitChunks`), `createdAt`, `createdBy`, e `w`/`h` se presenti. Non si scrive `thumb`, `esito`, `percorsoBackup`, `estensione`, `altriRiferimenti`. I byte sotto i 700 KiB stanno in `full/data` con `chunkCount` 0. Sopra, in `chunks/{n}` da 600 KiB, a gruppi di `CHUNK_WRITE_GROUP`, e il documento principale si scrive dopo i pezzi. Prima si cancellano `full/data` e i chunk vecchi che la nuova forma non riscrive. I chunk vecchi si cancellano solo fino all'indice 63. Gli id assenti dall'elenco non si leggono e non si cancellano.
11. La conferma locale chiama `restoreBackup` e ricarica, come oggi. Non chiama `scriviFileRipristino` e non chiama `scriviCodiciCane`. Nessun toast di successo.
12. Il foglio, i conteggi, «Sostituisce i dati di questo salone.», **Ripristina** e **Annulla** restano. Annulla non scrive. Il selettore resta `application/json,.json,application/zip,.zip`. Il ripristino non aggiorna il chip né `backup.lastAt`. `impostazioniRipristino` non cambia. Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo non cambiano.
13. Non si toccano `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts`, `src/data/firebase/firebaseEnv.test.ts`, `src/lib/backupZip.ts`, `src/lib/backupCompleto.ts`, `src/lib/registroXlsx.ts`. Nessuna dipendenza nuova. Lo streaming, la barra e la scelta del Wi-Fi restano fuori.
14. La pubblicazione alza di una patch la versione letta in quel momento dai quattro file. Il 2026-10-23 `APP_VERSION` è `1.1.75`: se è ancora quella, la release è `1.1.76` con `versionCode` 10176. `versionCode` è `major * 10000 + minor * 100 + patch`. Le note sono una riga: «In Dati e backup, Ripristina rimette anche le foto e i file dello ZIP completo.» Nel bundle `index-*.js` dell'APK devono esserci la chiave Firebase e la versione pubblicata. Il codice vive su `origin/feat/listino-razze` (il `main` locale è allo stesso commit `2784e29`; `origin/main` è fermo). Dopo il fast-forward si pusha `origin/feat/listino-razze`, non `origin/main`. La release usa `--target feat/listino-razze`. Non si pubblica da `D:\Groomly-worktrees\backup-zip`. I worktree già presenti non si rimuovono. Questa specifica, da sola, non alza `APP_VERSION`.

## Fuori da questo lavoro

- Unisci, la parola «SOSTITUISCI», il backup di sicurezza, «Annulla ripristino».
- Barra di avanzamento, streaming dello ZIP, ripresa a batch, Google Drive.
- Ricreare la miniatura, convertire WebP in JPEG, o scrivere i file in locale.
- Cancellare dal salone i file che l'archivio non contiene.
- Applicare `fotoMancanti` o `deletedDogs` oltre a quello che fa già `replaceCloudData`.
- Cambiare Esporta, «Esegui ora», il toggle, il chip, Registro Excel, Backup ZIP o Backup completo.

## 1. Flusso

1. L'operatore sceglie lo ZIP completo con **Ripristina**.
2. La lettura verifica manifest, checksum e forma. Poi i file `ok`.
3. Se un controllo fallisce, toast «File non valido» e il foglio non si apre. I dati del telefono restano.
4. Se torna, il foglio mostra i conteggi dei dati, come oggi.
5. **Annulla** chiude il foglio.
6. **Ripristina** in cloud scrive dati, codici e file. Poi toast «Ripristinato» e il foglio si chiude.
7. **Ripristina** in locale scrive solo i dati e ricarica.

Un file `mancante` nell'archivio non si scrive. Se quell'id è già nel salone, resta com'è. Un telefono nuovo non mostra quella foto. Un file `ok` sostituisce i byte di quell'id anche se c'erano già.

## 2. Messaggi

| Situazione | Messaggio |
| --- | --- |
| ZIP completo valido | il foglio si apre, nessun toast |
| Forma, checksum, percorso, lunghezza o limiti | File non valido |
| ZIP solo dati valido | il foglio si apre, come oggi |
| JSON interno | Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP. |
| Conferma cloud riuscita | Ripristinato |
| Conferma cloud fallita | Ripristino incompleto, riprova |
| Senza rete, prima delle scritture | Connessione assente |
| Conferma locale | nessun toast di successo; se `restoreBackup` lancia, «Salvataggio non riuscito» |

## 3. Prove

- Uno ZIP completo con un WebP `ok` in `cani/C0001 - Fido/profilo.webp` restituisce `completo`, il bundle senza chiave `files`, i codici, e un `FileRipristino` con quegli stessi byte e `mime: 'image/webp'`.
- Un `mancante` senza voce nello ZIP è accettato e non compare in `file`.
- Percorso `../segreto.webp`, lunghezza diversa da `byteSize`, `esito` assente, più di 200 `ok`, somma oltre 80 MiB, id `a/b`: «File non valido».
- Lo ZIP solo dati con `files` nel JSON resta `solo-dati` e non legge altre voci.
- `applicaFileRipristino` su `salon/shared` scrive `files/f1` e `files/f1/full/data` con i byte dati, `chunkCount` 0, mime WebP, senza `thumb`. Un salone `uid-9` scrive sotto `salons/uid-9` e non crea `salon/shared`.
- Un file più grande di 700 KiB va in `chunks/0` e seguenti, e il documento principale arriva dopo. Un id già presente con chunk vecchi viene sostituito: i chunk in eccesso, fino all'indice 63, spariscono. Un id non nell'elenco resta.
- La pagina, in cloud, con lo ZIP completo chiama nell'ordine `replaceCloudData`, `scriviCodiciCane`, `scriviFileRipristino`. Se i file falliscono, il foglio resta e i dati risultano già chiamati. In locale `scriviFileRipristino` non è chiamato. Checksum rotto e JSON interno non scrivono.

## Accettazione

- **Ripristina** su uno ZIP completo di questo salone riapre i cani e le foto con gli id di prima.
- Uno ZIP solo dati continua a ripristinare i dati senza toccare `files`.
- Un archivio con una foto `ok` mancante o di lunghezza diversa non apre il foglio.
- Il chip, Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo si comportano come prima di questa fetta.
