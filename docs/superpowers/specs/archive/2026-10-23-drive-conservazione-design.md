# Groomly — Conservazione dei backup su Google Drive

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-23
Stato: si procede con la scelta consigliata. Il resto di B4 (foto incrementali, rinomina, foto eliminate, lock, WorkManager, chip) e B5 restano dopo.

Ogni invio riuscito lascia uno ZIP nella cartella «Groomly Backup – {nome}». Senza un tetto, il giornaliero riempie il Drive. Questa versione tiene le ultime 10 copie e non tocca nient’altro.

## Scelta

Si conservano gli ZIP già prodotti da Backup completo, nello stesso formato e nella stessa cartella. Non si passa ancora alle cartelle di foto incrementali: quel lavoro è un piano a parte e il ripristino da ZIP già sa leggere questo file.

## Decisioni

1. Dopo che l’upload del file nuovo è riuscito, Java elenca i file di quella cartella creati dall’app il cui nome inizia con `Groomly Backup completo –` e finisce con `.zip`. Gli altri file della cartella restano.
2. Si tengono 10 nomi distinti. Di due file con lo stesso nome si tiene quello con `createdTime` più recente; a parità di istante si tiene l’id maggiore in ordine alfabetico. Fra i nomi rimasti si ordina per la data nel nome (`aaaa-mm-gg` dopo l’ultimo ` – `, prima di `.zip`), dalla più recente. Un nome senza quella data va in fondo ed è il primo a uscire. Si eliminano i file oltre i 10 e i duplicati.
3. Il file appena caricato non si elimina in quella stessa chiamata, anche se il conto sforasse di uno. L’id torna dal corpo della risposta di upload. Se l’elenco non lo contiene ancora, si aggiunge in memoria con l’istante corrente prima di decidere.
4. L’elenco si legge a pagine da 100, al massimo 20 pagine. Se ne resta ancora una, l’invio fallisce con `invio` e non si cancella nulla: una lista tagliata potrebbe buttare la copia sbagliata. Una cancellazione che risponde 404 si ignora. Ogni altro errore di elenco o di cancellazione rifiuta `invio`. L’upload è già avvenuto: la chiave `driveUltimoInvio` non si scrive, quindi il prossimo avvio riprova e la pulizia riparte.
5. Il token non si logga e non esce da Java. Lo scope resta `drive.file`. Nessun file fuori da quella cartella, e nessun file che non sia uno ZIP di Backup completo.
6. La card non cambia: chip, «Esegui ora», toggle, Esporta, Ripristina, Annulla ripristino, Registro Excel, Backup ZIP, Backup completo, Collega, Scollega, Invia su Drive. Non si toccano `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`, `driveInvio.ts`, `firestore.rules`, `google-services.json`. Nessuna dipendenza nuova.

## Fuori

Foto incrementali, Registro ULTIMO, rinomina delle cartelle, foto eliminate, ripristino da Drive, lock fra due telefoni, WorkManager, solo in carica, spazio libero, scelta di quante copie tenere, chip e toggle.

## Prove

- Dieci ZIP di giorni diversi: nessuno da eliminare.
- Undici ZIP di giorni diversi: si elimina solo il giorno più vecchio.
- Due file con lo stesso nome: si elimina il `createdTime` più vecchio.
- Un file che non è uno ZIP di Backup completo non compare mai fra gli id da eliminare.
- Un nome senza data `aaaa-mm-gg` esce prima di un nome datato, quando si supera il tetto.
