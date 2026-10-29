# Groomly — ZIP solo dati (Piano 3)

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-22
Stato: approvata il 2026-10-22. Il piano si scrive da questa versione. Nessun codice finché il piano non è eseguito.

Questo piano aggiunge il file ZIP dei dati e il pulsante **Backup ZIP** nella card **Dati e backup**. Lo ZIP contiene il testo di istruzioni, il Registro Excel e i due JSON del raccoglitore. Non contiene foto né cartelle.

La specifica del raccoglitore (`docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`) prevale per codici, fuso, lapidi, checksum e lettura del salone. La specifica del Registro (`docs/superpowers/specs/2026-10-22-registro-excel-design.md`) prevale per i fogli dell'Excel. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano. Qui non si trasformano le foto.

## Decisioni chiuse

1. `backupZip(raccolto, registro, now)` costruisce lo ZIP in memoria con JSZip, già nel progetto. Non si aggiungono librerie. `fflate`, `zip.js` e i file temporanei di Capacitor restano per il pezzo con le foto.
2. `raccolto` è il valore di `raccogliBackup`: servono `json`, `manifest` e `checksum`. `registro` è il `Blob` di `registroXlsx`. `now` è la data usata per il nome del file.
3. Il pulsante chiama `raccogliBackup(now, { includiByte: false })` e poi `registroXlsx(dati, { now })` senza `risolviLink`. Nessun byte di foto viene letto. La colonna «Cartella foto» non c'è.
4. `dati/groomly-dati.json` è la stringa `json` del raccoglitore, in UTF-8, senza un a capo aggiunto. È il testo su cui è stato calcolato lo SHA-256. Non si rifà `JSON.stringify`.
5. `dati/manifest.json` è `JSON.stringify(manifest, null, 2)` di quell'oggetto, in UTF-8. `tipo` è `solo-dati`, `fotoIncluse` è `false`. Il checksum non si ricalcola e la funzione non confronta `checksum` con il manifest: scrive i due file come arrivano. Il pulsante passa il risultato del raccoglitore, in cui i due valori coincidono. Il test usa un raccolto coerente.
6. Il Registro dentro lo ZIP è lo stesso file del pulsante Registro Excel. Il nome interno è `Registro Groomly.xlsx`, nella radice.
7. `LEGGIMI.txt` è nella radice, UTF-8, righe separate da `\n`, e termina con un a capo. Il nome del salone nel testo è `manifest.salone.nome` se non è vuoto, altrimenti `Groomly`. I numeri sono i `conteggi` del manifest, compresi foto e file del listino: contano i file noti, non i byte messi nello ZIP. Il conteggio appuntamenti include gli impegni personali, come il manifest, e può superare le righe del foglio Appuntamenti.
8. Il nome del file scaricato è `Groomly Backup – {salone} – {giorno}.zip`. Il giorno è `romeDay(now)`. Il salone è `nomeSicuro` del nome del punto 7. Il trattino lungo è il carattere `–` (U+2013). Quel nome è anche il nome passato a `shareFiles` e a `downloadAnchor`. Se il filesystem del telefono rifiuta il trattino lungo, ci si ferma e si dice: non si cambia il nome in silenzio.
9. «Esegui ora», il toggle, Esporta, Ripristina, Registro Excel, il chip e `uploadBackupFile` restano come sono. `exportRegistro` non si modifica. Il chip non si aggiorna.
10. Sul telefono il file si apre con `shareFiles`, titolo «Backup Groomly». Nel browser si usa `downloadAnchor`. Annullare la condivisione non mostra un avviso.
11. Senza rete il messaggio è «Serve la connessione per creare il backup». Ogni altro errore del pulsante è «Esportazione non riuscita».
12. Il pulsante ha un proprio stato di attesa. Mentre gira, solo lui è disabilitato. Registro Excel, Esporta ed Esegui ora restano premibili.
13. Alla fine dell'implementazione si pubblica: la scheda cambia. Questa specifica, da sola, non alza `APP_VERSION`.

## Fuori da questo lavoro

- Foto, cartelle `cani/` e `listino/`, colonna «Cartella foto», `risolviLink`.
- Schermata di avanzamento, Annulla, avviso Wi-Fi, spazio libero, servizio in primo piano, password.
- Google Drive e ripristino da ZIP.
- Sostituire Esporta, «Esegui ora», il toggle, il chip o Registro Excel.
- Mostrare `C0001` sulla scheda del cane.
- ZIP in streaming. Questo file sta in memoria: sono i JSON e un Excel, non le immagini.

## 1. Flusso

Il pulsante sta in `SettingsPage`, card **Dati e backup**, su una riga nuova sotto Registro Excel e prima di Personalizza, a tutta larghezza. La scritta è **Backup ZIP**. Durante la preparazione è disabilitato e `aria-busy`.

1. `raccogliBackup` assegna i codici come già fa e restituisce `dati`, `manifest`, `json` e `checksum`, senza byte.
2. `registroXlsx(dati, { now })` scrive l'Excel.
3. `backupZip` mette i quattro file nel Blob e sceglie il nome.
4. Su piattaforma nativa, `shareFiles([{ blob, name }], 'Backup Groomly')`. Altrimenti `downloadAnchor(blob, name)`.

`backup_offline` mostra il messaggio dell'`AppError`. `isShareCancel` resta in silenzio. Il resto va in toast «Esportazione non riuscita».

Il Blob ha tipo `application/zip`.

## 2. Contenuto

Percorsi nello ZIP, e nient'altro:

| Percorso | Contenuto |
|---|---|
| `LEGGIMI.txt` | testo qui sotto |
| `Registro Groomly.xlsx` | byte del Blob del Registro |
| `dati/manifest.json` | manifest con rientro di due spazi |
| `dati/groomly-dati.json` | stringa `json` del raccoglitore |

`LEGGIMI.txt`, con i valori del manifest. L'esempio usa un salone di nome Pelosetti:

```text
Backup Groomly
Salone: Pelosetti
Creato: 2026-10-22T14:30:00+02:00

Questo file contiene i dati del salone e il Registro Excel.
Estrai lo ZIP prima di aprire l'Excel.

Le cartelle delle foto arrivano con il backup completo.

Cani: 82
Clienti: 70
Appuntamenti: 112
Foto: 20
File del listino: 1
```

La riga `Creato` è `manifest.creatoIl`. Le cinque righe di conteggio sono `conteggi.cani`, `conteggi.clienti`, `conteggi.appuntamenti`, `conteggi.foto`, `conteggi.fileListino`. La frase sulle cartelle resta anche quando il conteggio foto è zero.

Il nome del file, per quel salone e per un `now` il cui giorno di Roma è il 22 ottobre 2026, è `Groomly Backup – Pelosetti – 2026-10-22.zip`. Se il nome del salone è vuoto: `Groomly Backup – Groomly – 2026-10-22.zip`. Se il nome contiene caratteri che `nomeSicuro` toglie o sostituisce, il file usa il risultato di `nomeSicuro` e il `LEGGIMI` tiene il nome del manifest.

## 3. Prove

I test aprono il Blob con JSZip, come il test di Esporta. Excel non parte da Vitest.

`backupZip`, con un raccolto fisso e un Excel generato dagli stessi `dati`:

- I percorsi sono i quattro della tabella. Nessun nome inizia con `cani/` o `listino/`.
- Il testo di `dati/groomly-dati.json` è identico a `json`. Lo SHA-256 di quel testo è `checksum` e anche `manifest.checksum['groomly-dati.json']`.
- Il manifest letto dal file ha `tipo` `solo-dati` e `fotoIncluse` `false`.
- Il foglio Cani dell'Excel dentro lo ZIP non ha la colonna «Cartella foto».
- `LEGGIMI.txt` contiene il nome del salone, `creatoIl` e la frase «Le cartelle delle foto arrivano con il backup completo.»
- Il nome del file usa `romeDay`. Salone vuoto: `Groomly Backup – Groomly – 2026-10-22.zip`. Un nome con un carattere vietato, per esempio `A/B`, passa da `nomeSicuro` e nel file non resta la barra.

Sulla scheda, il pulsante **Backup ZIP** c'è, è disabilitato mentre lavora, e il file consegnato ha quel nome. Senza rete il toast è «Serve la connessione per creare il backup». Durante l'attesa, Esegui ora, Esporta e Registro Excel restano abilitati. Il test della scheda importa il raccoglitore finto, come già fa Registro Excel, e lascia girare il vero `registroXlsx` e il vero `backupZip`. L'attesa del download può arrivare a dieci secondi: sotto la suite intera exceljs e JSZip partono a freddo. Se il file non arriva, il test fallisce comunque.

## Criteri di accettazione

- [ ] Il pulsante è sulla card, sotto Registro Excel, e non cambia gli altri controlli.
- [ ] Lo ZIP ha i quattro percorsi e nessun file sotto `cani/` o `listino/`.
- [ ] I byte di `groomly-dati.json` sono la stringa del raccoglitore e il checksum del manifest li descrive.
- [ ] Il Registro dentro lo ZIP non ha la colonna «Cartella foto».
- [ ] `LEGGIMI.txt` dice di estrarre lo ZIP e che le cartelle arrivano con il backup completo.
- [ ] Il chip, Esporta, Ripristina, «Esegui ora», il toggle e Registro Excel restano come prima.
- [ ] I test del §3 passano.
- [ ] Dopo l'implementazione, e solo allora, si alza la patch e si pubblica.
