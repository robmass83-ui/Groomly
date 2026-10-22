# Groomly — Ripristino dello ZIP solo dati (Piano 4, primo pezzo)

Data: 2026-10-22
Stato: approvata il 2026-10-22. Il piano si scrive da questa versione. Nessun codice finché il piano non è eseguito.

Questo piano fa leggere a **Ripristina** lo ZIP creato da **Backup ZIP**. Il file valido apre lo stesso foglio di oggi e la conferma sostituisce i dati con la scrittura già presente. Il contatore dei codici cane viene sostituito solo dopo che quella scrittura è riuscita, e solo se il salone è cloud.

La specifica del raccoglitore (`docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`) prevale per il formato di `groomly-dati.json`, il checksum e `meta/codici-cani`. Le specifiche dello ZIP solo dati e del backup completo restano valide per i loro pulsanti: `backupZip` e `backupCompleto` non si modificano. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano.

## Decisioni chiuse

1. `leggiRipristino(bytes)` sta in `src/lib/leggiRipristino.ts`. Legge i byte del file scelto. Non scrive nulla. `readRestoreBundle`, `restoreBackup` e `replaceCloudData` non si modificano.
2. Il risultato è uno di tre: `vecchio` con il `BackupBundle` di oggi; `solo-dati` con quel bundle più `codici`; `rifiutato` con uno dei tre messaggi di questa specifica. Il bundle di `solo-dati` ha solo `dogs`, `appointments`, `services`, `settings` e `closures`.
3. Un file è uno ZIP se i primi due byte sono `PK`. Altrimenti è JSON, decodificato in UTF-8.
4. Dello ZIP si leggono solo `dati/manifest.json` e `dati/groomly-dati.json`. `LEGGIMI.txt`, il Registro e ogni altra voce si ignorano. Il testo di `groomly-dati.json` non si riformatta e non si accorcia: lo SHA-256 si calcola su quel testo con `sha256Hex` e si confronta con `manifest.checksum['groomly-dati.json']`.
5. Il manifest deve avere `formato` uguale a `groomly-backup` e `versioneFormato` uguale a `1`. `manifest.checksum['groomly-dati.json']` deve essere una stringa. Il JSON dei dati deve avere `versioneFormato` uguale a `1`. Cani, appuntamenti, servizi, impostazioni e chiusure devono essere oggetti, non array. I codici devono avere `next` intero maggiore o uguale a 1, `cartella` uguale a `cani` o `animali`, e `byId` oggetto non array i cui valori sono stringhe non vuote. Non serve che ogni cane sia in `byId`.
6. L'ordine dei rifiuti, dopo aver aperto lo ZIP, è questo. Manca una delle due voci, il manifest non è di Groomly, una versione non è 1, il checksum manca o non torna, il JSON non ha la forma del punto 5, oppure `tipo` non è né `solo-dati` né `completo`: messaggio «File non valido». Se tutto questo torna e `tipo` è `completo`: «Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.» Se tutto torna e `tipo` è `solo-dati`: risultato `solo-dati`. Un rifiuto non contiene un bundle.
7. Un JSON che non si analizza, o che non ha la forma del backup vecchio, dà «File non valido». Un JSON oggetto che contiene la chiave `versioneFormato` dà «Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.», anche se il resto somiglia al backup vecchio. Un JSON senza quella chiave passa da `readRestoreBundle`, come oggi.
8. `impostazioniRipristino(dalFile, dalTelefono)` sta nello stesso file. Il risultato è le impostazioni del file. Poi mette `backup` preso dal telefono; se il telefono non ha quel blocco, il risultato non ha `backup`. Se il telefono ha `passwordHash`, il risultato prende quello; altrimenti non ha `passwordHash`. I due campi eventualmente presenti nel file non restano. Si usa al momento della conferma, sulle impostazioni allora visibili nella pagina. In cloud la scrittura di oggi toglie comunque `snapshot` e `passwordHash` prima di salvarli: restano toggle e data. In locale restano anche la copia interna e `passwordHash`.
9. Il foglio resta quello di oggi: conteggi da `backupCounts`, la frase «Sostituisce i dati di questo salone», **Ripristina** e **Annulla**. Annulla non scrive. I conteggi vengono dai dati, non dal manifest.
10. La conferma cloud chiama `replaceCloudData` con il bundle già sistemato dal punto 8. Se risolve e il risultato era `solo-dati`, si sostituisce `meta/codici-cani` con `{ next, cartella, byId }` del file. La scrittura sta in `src/data/firebase/backupCollect.ts`, accanto a quella che il raccoglitore fa già, usa il percorso del salone attivo e non scrive mai `salon/shared` a mano. È una sostituzione del documento, senza unire i codici già presenti. Poi il toast è «Ripristinato» e il foglio si chiude.
11. Se `replaceCloudData` fallisce, i codici non si scrivono. Se i dati sono stati scritti e i codici falliscono, il foglio resta aperto e il toast è «Ripristino incompleto, riprova». Una nuova conferma riscrive i dati e poi i codici. Senza rete resta il messaggio di oggi, «Connessione assente», e non si scrive nulla.
12. La conferma locale chiama `restoreBackup` e ricarica, come oggi. Non esiste un documento dei codici: non si tenta la scrittura e non è un errore. Il toast di successo locale resta assente, come oggi.
13. I documenti `files` non si scrivono e non si cancellano. `fotoMancanti` e `deletedDogs` non si applicano. I cani, gli appuntamenti, i servizi e le chiusure assenti dal bundle li toglie la scrittura già presente. Il tema segue quella scrittura: in cloud resta quello del telefono, in locale arriva dal file.
14. Il selettore accetta anche lo ZIP: `accept` diventa `application/json,.json,application/zip,.zip`. La decisione resta quella del punto 3, non l'estensione. Il valore dell'input si svuota come oggi. La lettura non aggiunge un flag di attesa. Durante la conferma vale il flag `restoring` già presente.
15. Esporta, «Esegui ora», il toggle, il chip, Registro Excel, Backup ZIP e Backup completo non cambiano comportamento. Il ripristino non aggiorna `backup.lastAt`. I file del login della 1.1.71 non si toccano: `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts` e `src/data/firebase/firebaseEnv.test.ts`.
16. Alla fine dell'implementazione si pubblica la patch successiva alla 1.1.72, quindi 1.1.73 con `versionCode` 10173. Prima della release, nel bundle `index-*.js` dell'APK deve esserci la chiave Firebase. Se manca, ci si ferma e non si pubblica. Questa specifica, da sola, non alza `APP_VERSION`. La base è il commit della 1.1.72 (`3c6a3cf` o un discendente). Non si pubblica dalla cartella `D:\Groomly-worktrees\backup-zip`.

## Fuori da questo lavoro

- Ripristino delle foto e degli altri file binari, anche se lo ZIP è completo.
- Unisci, la parola «SOSTITUISCI», il backup di sicurezza prima del ripristino, «Annulla ripristino».
- Barra di avanzamento, ripresa a batch da 400, Google Drive.
- Cambiare Esporta, «Esegui ora», il toggle, il chip, Registro Excel, Backup ZIP o Backup completo.
- Riscrivere la password dell'account, o leggere `passwordHash` dal file.
- Mostrare `C0001` sulla scheda del cane.
- Assegnare codici ai cani che nel file non ne hanno: si scrive l'oggetto del file così com'è.

## 1. Flusso

Il pulsante resta **Ripristina**. Al file scelto:

1. `leggiRipristino` sui byte.
2. `rifiutato`: toast con il messaggio, foglio chiuso, nessuna scrittura.
3. `vecchio` o `solo-dati`: si apre il foglio. Per `solo-dati` la pagina tiene anche i codici, senza mostrarli.
4. Annulla chiude il foglio e dimentica bundle e codici.
5. Conferma: `impostazioniRipristino`, poi la scrittura del punto 10 o del punto 12.

## 2. Messaggi

| Situazione | Messaggio |
|---|---|
| ZIP illeggibile, voce mancante, formato o versione diversi, checksum diverso, dati o codici malformati, `tipo` sconosciuto | File non valido |
| ZIP valido con `tipo` `completo` | Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP. |
| JSON con `versioneFormato` | Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP. |
| JSON illeggibile o non riconosciuto come backup vecchio | File non valido |

Il toast usa `plain`, come gli altri di questa scheda.

## 3. Prove

`leggiRipristino`, con archivi costruiti da JSZip e con il testo canonico del raccoglitore:

- Uno ZIP `solo-dati` con checksum giusto restituisce cani, appuntamenti, servizi, impostazioni, chiusure e codici. Il bundle ha solo quei cinque campi: niente `files`, `codiciCane`, `fotoMancanti` o `deletedDogs`.
- Una voce in più nell'archivio, per esempio `LEGGIMI.txt`, non cambia il risultato.
- Checksum diverso o assente, manifest assente, `groomly-dati.json` assente, `versioneFormato` 2 nel manifest o nei dati, `formato` diverso, `tipo` diverso da `solo-dati` e da `completo`, `next` non intero, `cartella` diversa, `byId` array, o un valore di `byId` che non è una stringa non vuota: «File non valido» e nessun bundle.
- Uno ZIP `completo` con checksum giusto e dati validi dà il messaggio delle foto e nessun bundle. Lo stesso ZIP con checksum diverso, o con dati che non hanno la forma del punto 5, dà «File non valido».
- Un JSON con `versioneFormato` dà il messaggio del JSON interno, anche se contiene cani e impostazioni.
- Un JSON di Esporta, senza `versioneFormato`, dà `vecchio` e lo stesso bundle che oggi accetta `readRestoreBundle`.
- Lo SHA-256 si calcola sul testo letto dall'archivio. Uno spazio aggiunto fa fallire il confronto, anche se il JSON riformattato sarebbe equivalente.

`impostazioniRipristino`:

- Il risultato è le impostazioni del file. Nome del salone, listino, tag e notifiche restano quelli del file.
- `backup` arriva dal telefono, compresi toggle, data e copia interna. Se il file aveva un proprio `backup`, non resta.
- `passwordHash` arriva dal telefono. Se il telefono non ce l'ha, il risultato non ce l'ha, anche se il file ce l'aveva.
- Se il telefono non ha `backup`, il risultato non ce l'ha.

Sulla scheda gira il vero `leggiRipristino`. La scrittura cloud e la scrittura dei codici sono finte, come già lo sono le scritture cloud nei test della pagina:

- Lo ZIP `solo-dati` apre il foglio. Annulla non chiama né la sostituzione dei dati né i codici.
- La conferma chiama prima la sostituzione dei dati, con `backup` del telefono, e poi la scrittura di `meta/codici-cani` con i codici del file. Il toast di successo è «Ripristinato».
- Se la sostituzione dei dati fallisce, i codici non si scrivono.
- Se i dati riescono e i codici falliscono, il toast è «Ripristino incompleto, riprova» e il foglio resta aperto.
- ZIP completo, checksum sbagliato e JSON interno mostrano il messaggio della tabella e non scrivono.
- Il `.json` vecchio apre ancora il foglio e la conferma non scrive i codici.
- In locale, lo ZIP `solo-dati` passa da `restoreBackup` e non scrive i codici.

## Criteri di accettazione

- [ ] Ripristina accetta lo ZIP `solo-dati` e il `.json` di Esporta.
- [ ] Il checksum si verifica sul testo originale di `groomly-dati.json`.
- [ ] Lo ZIP completo, il JSON interno e un file illeggibile non aprono il foglio e non scrivono.
- [ ] La conferma sostituisce i dati con la scrittura di oggi. Toggle e data del chip restano quelli del telefono. La password dell'account resta. In locale restano anche la copia interna e `passwordHash` delle impostazioni.
- [ ] Dopo un successo cloud, `meta/codici-cani` è l'oggetto del file. In locale i dati si ripristinano e i codici non si scrivono.
- [ ] I documenti `files` restano com'erano. Le foto di uno ZIP completo non vengono ripristinate.
- [ ] Esporta, «Esegui ora», il toggle, il chip, Registro Excel, Backup ZIP e Backup completo restano come prima.
- [ ] I file del login della 1.1.71 non cambiano.
- [ ] I test del §3 passano.
- [ ] Dopo l'implementazione, e solo allora, si alza la patch a 1.1.73 e si pubblica, con la chiave Firebase presente nell'APK.
