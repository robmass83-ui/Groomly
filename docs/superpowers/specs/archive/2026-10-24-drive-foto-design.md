# Groomly — Foto su Google Drive, una volta sola

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-24
Stato: si procede con le scelte già dette, senza un altro giro di domande.

L’invio su Drive resta quello della 1.1.79: stesso ZIP completo, stessa cartella `Groomly Backup – {nome}`, stesse ultime 10 copie. Dopo che lo ZIP è stato caricato, le foto del salone vengono anche messe in una cartella `Foto cani` dentro quella cartella.

## Decisioni

1. Si specchiano solo i file il cui percorso di backup inizia con `cani/` o `animali/` e la cui cartella ha un codice `C` seguito da cifre, come `C0001 - Fido`. Listino e file sciolti restano nello ZIP e non entrano in `Foto cani`. Il percorso sotto la cartella del cane resta quello del backup (`profilo.jpg`, `altre foto/foto-01.jpg`, la cartella della visita).
2. L’indice è su Drive, non in Firestore e non sul telefono. Ogni foto creata dall’app ha `appProperties` `groomlyFileId` (id del file nel salone) e `groomlyRuolo=foto`. Ogni cartella cane ha `groomlyCodice`. Lo scope resta `drive.file` più l’email. Se l’id c’è già, non si ricaricano i byte: se nome o cartella sono diversi, il file si sposta e si rinomina.
3. Una cartella cane già presente con lo stesso codice viene rinominata quando cambiano nome, razza o padrone. Le foto restano dentro, non si ricaricano.
4. Una foto che non è più nel salone viene spostata in `Foto cani/_Eliminate/`, con il nome preceduto dall’id, e non viene cancellata. Se torna nel salone, l’invio successivo la riporta al suo posto. Non c’è lo svuota dei 90 giorni.
5. Lo ZIP completo continua a leggere tutte le foto da Firestore, perché il file del giorno le contiene ancora. L’indice evita il secondo invio su Drive, non la lettura per lo ZIP.
6. Il metodo nuovo del plugin è `foto({ cartella, voci })`. Sul web lancia `Error('telefono')`. Il token non esce da Java. `Invia su Drive` e l’invio all’apertura chiamano `foto` solo dopo `carica` riuscito. Se `foto` fallisce, `driveUltimoInvio` non si scrive e il tentativo successivo riprova. I toast restano quelli dell’invio. Nessun pulsante nuovo.
7. Se l’elenco delle foto già su Drive supera 20 pagine da 100, non si sposta nulla in `_Eliminate` e l’invio fallisce. Non si toccano `firestore.rules`, `google-services.json`, il formato dello ZIP, il chip e il ripristino.

## Fuori

WorkManager, lock fra due telefoni, frequenza, Registro ULTIMO, Unisci, SOSTITUISCI, svuota delle foto eliminate, togliere le foto dallo ZIP.
