# Groomly — Backup completo (Piano 3, secondo pezzo)

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-22
Stato: approvata il 2026-10-22. Il piano si scrive da questa versione. Nessun codice finché il piano non è eseguito.

Questo piano aggiunge il pulsante **Backup completo** nella card **Dati e backup**. L'archivio contiene il testo di istruzioni, il Registro con i collegamenti alle cartelle, i due JSON del raccoglitore e i file letti con successo. Un file che non si legge non entra nell'archivio: viene elencato in `dati/foto-mancanti.txt` e il backup finisce lo stesso.

La specifica del raccoglitore (`docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`) prevale per codici, fuso, lapidi, checksum, percorsi e lettura del salone. La specifica del Registro (`docs/superpowers/specs/2026-10-22-registro-excel-design.md`) prevale per i fogli dell'Excel. La specifica dello ZIP solo dati (`docs/superpowers/specs/2026-10-22-backup-zip-design.md`) resta valida per il pulsante **Backup ZIP**: quel file e `backupZip` non si modificano. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano. Il mime del documento resta com'è: un WebP resta WebP.

## Decisioni chiuse

1. `backupCompleto(raccolto, registro, file, now)` sta in `src/lib/backupCompleto.ts`. È sorella di `backupZip`, non un argomento in più di quella funzione. `src/lib/backupZip.ts` non si modifica.
2. `raccolto` ha `json`, `manifest` e `dati`. `registro` è il `Blob` di `registroXlsx`. `file` è l'elenco `{ percorso: string; bytes: Uint8Array }` dei soli file consegnati da `onFile`. `now` serve al nome del file.
3. Il pulsante chiama `raccogliBackup(now, { includiByte: true, onFile })`. `onFile` riceve `(meta, bytes, percorsoBackup)`. Si accumula il terzo argomento e i byte, una volta per consegna. Gli `altriRiferimenti` non si scrivono. I file con esito mancante non passano da `onFile` e non entrano nell'elenco.
4. `dati/groomly-dati.json` è la stringa `json` del raccoglitore, in UTF-8, senza un a capo aggiunto. È il testo su cui è stato calcolato lo SHA-256. Non si rifà `JSON.stringify` e non si toglie di nuovo `passwordHash`: il raccoglitore l'ha già tolto dalla copia. Togliere un campo qui cambierebbe il checksum.
5. `dati/manifest.json` è `JSON.stringify(manifest, null, 2)`. Con `includiByte: true` il manifest è già `tipo` `completo` e `fotoIncluse` `true`, anche se qualche file non si è letto. La funzione non ricalcola il checksum e non confronta `checksum`, `conteggi.fotoMancanti` e `dati.fotoMancanti`. Il pulsante passa il risultato del raccoglitore, in cui i valori coincidono. Il test usa un raccolto coerente.
6. Il Registro dentro lo ZIP si chiama `Registro Groomly.xlsx`. Lo genera il pulsante, con `risolviLink`. La funzione riceve il Blob già pronto.
7. `cartellaFoto(percorso, percorsiScritti)` sta nello stesso file. `percorso` è il percorso di un file. La cartella è la parte prima dell'ultima `/`. Il risultato è quella cartella più `/`, se almeno un percorso scritto sta direttamente lì: dopo il prefisso `cartella/` non c'è un'altra `/`. I file nelle sottocartelle non contano. Senza `/`, o senza un file diretto, il risultato è `''`.
8. `registroXlsx` tratta `''` come cella vuota. La colonna «Cartella foto» resta, perché `risolviLink` è stato passato. Il pulsante Registro Excel non passa `risolviLink` e la colonna non compare. `giornoExcel` non si tocca.
9. `dati/foto-mancanti.txt` c'è solo se `dati.fotoMancanti` ha almeno una riga, nell'ordine del raccoglitore. La funzione non riordina. Una riga è `id`, `motivo`, poi `byteSize` se c'è, poi `lunghezza` se c'è, separati da uno spazio. UTF-8, righe unite da `\n`, a capo finale.
10. `LEGGIMI.txt` è nella radice, UTF-8, righe unite da `\n`, a capo finale. Il nome del salone nel testo è `manifest.salone.nome` senza spazi estremi, oppure `Groomly`. I cinque conteggi sono quelli del manifest. `Foto non lette: N` usa `dati.fotoMancanti.length` e compare solo se N è maggiore di zero, insieme alla riga sull'elenco.
11. I file dell'elenco e `Registro Groomly.xlsx` si scrivono con `compression: 'STORE'`. `LEGGIMI.txt`, `dati/manifest.json`, `dati/groomly-dati.json` e `dati/foto-mancanti.txt` restano il default DEFLATE. Dopo `loadAsync`, `options.compression` è nullo: il test legge il metodo dal dato compresso della voce, `magic` `\x00\x00` per STORE e `\x08\x00` per DEFLATE.
12. Il nome del file scaricato è `Groomly Backup completo – {salone} – {giorno}.zip`. Il giorno è `romeDay(now)`. Il salone è `nomeSicuro` del nome del punto 10. Il trattino lungo è U+2013. La parola «completo» lo distingue dallo ZIP senza foto, che nello stesso giorno ha lo stesso resto del nome. Quel nome è anche il nome passato a `shareFiles` e a `downloadAnchor`. Se il filesystem del telefono rifiuta il trattino lungo, ci si ferma e si dice: non si cambia il nome in silenzio.
13. «Esegui ora», il toggle, Esporta, Ripristina, Registro Excel, Backup ZIP, il chip e `uploadBackupFile` restano come sono. `exportRegistro` e `exportBackupZip` non si modificano. Il chip non si aggiorna.
14. Sul telefono il file si apre con `shareFiles`, titolo «Backup Groomly». Nel browser si usa `downloadAnchor`. Annullare la condivisione non mostra un avviso.
15. Senza rete il messaggio è «Serve la connessione per creare il backup». Ogni altro errore del pulsante è «Esportazione non riuscita».
16. Il pulsante ha un proprio stato `completoBusy`. Mentre gira, solo lui è disabilitato e `aria-busy`. Backup ZIP, Registro Excel, Esporta ed Esegui ora restano premibili.
17. I file del login sistemati nella 1.1.71 non si toccano: `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts` e `src/data/firebase/firebaseEnv.test.ts`. La base di implementazione è il commit che contiene quella correzione (`812ccae` o un discendente). Non si pubblica dalla cartella `D:\Groomly-worktrees\backup-zip`, che è ferma alla 1.1.70.
18. Alla fine dell'implementazione si pubblica la patch successiva alla 1.1.71, quindi 1.1.72 con `versionCode` 10172. Prima della release, nel bundle `index-*.js` dell'APK deve esserci la chiave Firebase. Se manca, ci si ferma e non si pubblica. Questa specifica, da sola, non alza `APP_VERSION`.

## Fuori da questo lavoro

- Scrittura su file temporaneo, `fflate`, `zip.js` e servizio in primo piano.
- Barra di avanzamento, Annulla, foglio di scelta, avviso Wi-Fi, spazio libero, password sullo ZIP.
- Google Drive e ripristino da ZIP.
- Sostituire Esporta, «Esegui ora», il toggle, il chip, Registro Excel o Backup ZIP.
- Mostrare `C0001` sulla scheda del cane.
- Convertire le foto, creare cartelle vuote, scrivere `nessuna-foto.txt`, copiare un file negli `altriRiferimenti`.
- Toccare il login, la password o il recupero password.

## 1. Flusso

Il pulsante sta in `SettingsPage`, card **Dati e backup**, su una riga nuova sotto Backup ZIP e prima di Personalizza, a tutta larghezza. La scritta è **Backup completo**.

1. `raccogliBackup` assegna i codici come già fa e consegna i byte a `onFile`. Il valore restituito ha `dati`, `manifest`, `json` e `checksum`, senza byte.
2. Si accumulano `{ percorso, bytes }` nell'ordine delle consegne.
3. `registroXlsx(dati, { now, risolviLink })`. `risolviLink` è `(percorso) => cartellaFoto(percorso, percorsiScritti)`.
4. `backupCompleto` mette nell'archivio il `LEGGIMI`, il Registro, i due JSON, l'elenco dei mancanti se c'è, e i file accumulati.
5. Su piattaforma nativa, `shareFiles([{ blob, name }], 'Backup Groomly')`. Altrimenti `downloadAnchor(blob, name)`.

`backup_offline` mostra il messaggio dell'`AppError`. `isShareCancel` resta in silenzio. Il resto va in toast «Esportazione non riuscita».

Il Blob ha tipo `application/zip`.

## 2. Contenuto

Percorsi possibili. I file dell'elenco usano il loro `percorso`. Gli altri ci sono sempre, tranne l'elenco dei mancanti.

| Percorso | Contenuto |
|---|---|
| `LEGGIMI.txt` | testo qui sotto |
| `Registro Groomly.xlsx` | byte del Blob del Registro |
| `dati/manifest.json` | manifest con rientro di due spazi |
| `dati/groomly-dati.json` | stringa `json` del raccoglitore |
| `dati/foto-mancanti.txt` | solo se `dati.fotoMancanti.length > 0` |
| ogni `file[i].percorso` | `file[i].bytes` |

Una cartella c'è perché un file scritto la contiene. JSZip può aggiungere il segnaposto di una cartella padre: i test contano solo le voci con `dir` falso. Non si chiama `zip.folder` per un cane senza file.

`LEGGIMI.txt`, con i valori del manifest. L'esempio usa un salone di nome Pelosetti e i conteggi di quell'esempio. I test confrontano il testo costruito dai valori veri del raccolto, non questi numeri.

```text
Backup Groomly
Salone: Pelosetti
Creato: 2026-10-22T14:30:00+02:00

Questo file contiene i dati del salone, il Registro Excel e le cartelle dei file.
Estrai lo ZIP prima di aprire l'Excel, altrimenti i link alle cartelle non funzionano.

Cani: 82
Clienti: 70
Appuntamenti: 112
Foto: 20
File del listino: 1
```

Se `dati.fotoMancanti.length` è maggiore di zero, dopo l'ultima riga di conteggio si aggiungono una riga vuota, `Foto non lette: N` e `L'elenco è in dati/foto-mancanti.txt.` Il file termina comunque con un a capo. Se l'elenco è vuoto, quelle tre righe non ci sono.

Esempi di `dati/foto-mancanti.txt`. La prima riga non ha numeri. La seconda ha `byteSize` 12 e `lunghezza` 9.

```text
m1 assente
m2 dimensione 12 9
```

Il nome del file, per Pelosetti e per un `now` il cui giorno di Roma è il 22 ottobre 2026, è `Groomly Backup completo – Pelosetti – 2026-10-22.zip`. Se il nome del salone è vuoto: `Groomly Backup completo – Groomly – 2026-10-22.zip`. Se il nome contiene caratteri che `nomeSicuro` toglie o sostituisce, il file usa il risultato di `nomeSicuro` e il `LEGGIMI` tiene il nome del manifest. `A/B` nel manifest diventa `AB` nel nome del file e resta `A/B` nel testo.

Il collegamento dell'Excel è il valore di `cartellaFoto`. Da `cani/C0001 - Fido/profilo.webp`, con quel file nell'elenco, si ottiene `cani/C0001 - Fido/`. Niente `file://`. Se lo stesso file è anche la foto di una visita, il raccoglitore mette i byte nel `percorsoBackup` principale, che in quel caso è la cartella della visita: il Registro legge quel percorso e il link apre la cartella dov'è il file.

`cartellaFoto('cani/C0001 - Fido/profilo.webp', ['cani/C0001 - Fido/2026-10-15 - Bagno/prima-01.webp'])` è `''`: il file sta in una sottocartella. `cartellaFoto('profilo.webp', ['profilo.webp'])` è `''`: non c'è una cartella.

## 3. Prove

I test aprono il Blob con JSZip. Excel si legge con exceljs, `excel.default ?? excel`, come nello ZIP solo dati.

`backupCompleto`, con un raccolto fisso costruito da `canonicalJson`, `sha256Hex` e `buildManifest(..., { includiByte: true })`, un Excel generato dagli stessi `dati` con `risolviLink`, e due file `cani/C0001 - Fido/profilo.webp` e `listino/logo.webp`:

- Il salone del raccolto ha un cane il cui `photo` è `file:f1`. `files.f1.percorsoBackup` e il primo elemento dell'elenco sono la stessa stringa `cani/C0001 - Fido/profilo.webp`, così il foglio Cani ha una riga e il link trova il file. `dati.fotoMancanti` è `[{ id: 'm1', motivo: 'assente' }, { id: 'm2', motivo: 'dimensione', byteSize: 12, lunghezza: 9 }]`. Quei due id non sono nell'elenco dei file.
- Le voci non directory sono i quattro file fissi, `dati/foto-mancanti.txt` e i due percorsi. Nessun altro percorso. Il testo dei mancanti è l'esempio del §2, con l'a capo finale.
- Il testo di `dati/groomly-dati.json` è identico a `json`. Lo SHA-256 di quel testo è il checksum del manifest.
- Il manifest letto dal file ha `tipo` `completo` e `fotoIncluse` `true`.
- `LEGGIMI.txt` è il testo del §2 costruito da questo manifest e da `dati.fotoMancanti`, compresa `Foto non lette: 2`.
- Il metodo della voce `cani/C0001 - Fido/profilo.webp` e di `Registro Groomly.xlsx` è STORE. Il metodo di `LEGGIMI.txt` è DEFLATE.
- Nel foglio Cani, la cella «Cartella foto» dice «Apri cartella» e il collegamento è `cani/C0001 - Fido/`.
- Il Blob ha tipo `application/zip`. Il nome è `Groomly Backup completo – Pelosetti – 2026-10-22.zip`.
- Salone vuoto: `Groomly Backup completo – Groomly – 2026-10-22.zip`. Salone `A/B`: il nome del file contiene `AB` e il `LEGGIMI` contiene `Salone: A/B`.
- Con `fotoMancanti` vuoto, `dati/foto-mancanti.txt` non c'è e il `LEGGIMI` non contiene `Foto non lette`.

`cartellaFoto` copre i tre casi del §2: file diretto, file solo in una sottocartella, percorso senza cartella.

`registroXlsx`, con la fixture già usata dal test «con risolviLink aggiunge Apri cartella»: se `risolviLink` restituisce `''`, l'intestazione «Cartella foto» c'è e la cella della riga non dice «Apri cartella». Il test esistente che restituisce `https://esempio/cartella` resta.

Sulla scheda, il pulsante **Backup completo** c'è, sotto Backup ZIP. È disabilitato mentre lavora. Durante l'attesa, Backup ZIP, Registro Excel, Esegui ora ed Esporta restano abilitati. `raccogliBackup` è chiamato con `includiByte: true` e un `onFile` funzione. Il file consegnato si chiama `Groomly Backup completo – Pelosetti – {romeDay(new Date())}.zip`. Il raccolto rilasciato dal finto raccoglitore ha `dati`, `json`, `checksum` e un manifest costruito con `includiByte: true`. Senza rete il toast è «Serve la connessione per creare il backup». I due test già presenti di Backup ZIP non si modificano. L'attesa del download può arrivare a dieci secondi.

## Criteri di accettazione

- [ ] Il pulsante è sulla card, sotto Backup ZIP, e non cambia gli altri controlli.
- [ ] Lo ZIP contiene i dati, il Registro, i file consegnati e, solo se serve, l'elenco dei mancanti.
- [ ] I byte di `groomly-dati.json` sono la stringa del raccoglitore e il checksum del manifest li descrive.
- [ ] Il Registro dentro questo ZIP ha «Apri cartella» solo verso una cartella che contiene un file scritto.
- [ ] `LEGGIMI.txt` dice di estrarre lo ZIP prima di aprire l'Excel.
- [ ] Il chip, Esporta, Ripristina, «Esegui ora», il toggle, Registro Excel e Backup ZIP restano come prima.
- [ ] I file del login della 1.1.71 restano come sono.
- [ ] I test del §3 passano.
- [ ] Dopo l'implementazione, e solo allora, si pubblica la 1.1.72, e solo se l'APK contiene la chiave Firebase.
