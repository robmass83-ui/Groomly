# Groomly — Copia di sicurezza prima del ripristino

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-23
Stato: chiusa il 2026-10-23. Si procede con le scelte consigliate, poi il piano e i subagent.

Prima di scrivere un ripristino, l'app tiene **una** copia dello stato attuale. Dopo, sulla card **Dati e backup**, compare **Annulla ripristino**. Un tocco rimette quella copia. Un secondo ripristino confermato sostituisce la copia: si annulla solo l'ultimo.

Il foglio di conferma non cambia. Il chip, Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo non cambiano. Unisci, la parola «SOSTITUISCI», la barra e Google Drive restano fuori.

## Decisioni chiuse

1. La copia si prende al primo tentativo di conferma di un foglio aperto, **prima** di `replaceCloudData`, `scriviCodiciCane`, `scriviFileRipristino` o `restoreBackup`. Se la copia fallisce, quelle scritture non partono e il toast è «Copia di sicurezza non riuscita». Il foglio resta aperto.
2. Un nuovo tentativo sullo stesso foglio non riprende la copia. Scegliere un altro file e confermare sostituisce la copia con lo stato di quel momento.
3. In cloud la copia sta nel salone attivo, mai con il percorso scritto a mano. Il documento è `meta/ripristino-sicurezza`. I byte dei file che il ripristino sta per sostituire stanno nella collezione `sicurezza`, con gli stessi id e la stessa forma di `files` (sotto i 700 KiB in `full/data`, sopra in `chunks/{n}`). Si scrivono prima quei byte, poi il documento. Gli id della copia precedente che la nuova non usa si cancellano dopo il documento. `files` non si usa per la copia. Il raccoglitore legge solo `files`, quindi la copia non entra nel backup. Le regole Firestore non si modificano: la collezione `sicurezza` è già ammessa dal permesso generico, perché non è `files`.
4. Il documento tiene `bundle` (cani, appuntamenti, servizi, impostazioni, chiusure, come li restituisce `loadCloudBackup`), `codici` (`CodiciCaneDoc` o `null` se il documento dei codici manca) e `assenti` (id dei file del ripristino che nel salone non c'erano). I byte non stanno in quel documento. Il documento conservato tiene anche `presenti`, gli id dei file copiati, e quegli id non sono byte. Se il JSON del documento supera 900000 caratteri, la copia fallisce e il ripristino non parte.
5. Di ogni id presente in `pending.file` si legge il file attuale. Se il documento non c'è, l'id va in `assenti` e non si copia. Se il documento c'è ma i byte non si leggono, o superano 10 MiB, la copia fallisce e il ripristino non parte. La somma dei byte copiati oltre `80 * 1024 * 1024` fallisce allo stesso modo. Un id assente non si cancella durante il ripristino.
6. In locale la copia è `buildBackup(uid)` sotto la chiave `groomly.users.${uid}.ripristinoSicurezza`. Non ci sono byte di file: il ripristino locale non li scrive. Se `localStorage` rifiuta la scrittura, la copia fallisce e `restoreBackup` non parte.
7. **Annulla ripristino** compare sulla card quando la copia c'è, anche dopo aver riaperto Impostazioni. In cloud, senza rete, il toast è «Connessione assente» e la copia resta. L'annulla cloud riscrive il bundle, poi i codici se non sono `null`, poi i file copiati, poi elimina da `files` gli id in `assenti`. Infine cancella `meta/ripristino-sicurezza` e i documenti in `sicurezza`. Il toast è «Ripristino annullato». Se un passo fallisce, la copia resta e il toast è «Ripristino incompleto, riprova».
8. L'annulla locale chiama `restoreBackup` con la copia, ricarica e cancella la chiave. Nessun toast di successo oltre a quello già assente del ripristino locale: qui il toast c'è ed è «Ripristino annullato». Se `restoreBackup` fallisce, la chiave resta e il toast è «Salvataggio non riuscito».
9. Il ripristino non aggiorna il chip. La copia non cambia `backup.lastAt`. Non si toccano `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`. Nessuna dipendenza nuova.
10. La pubblicazione alza di una patch la versione letta in quel momento. Il 2026-10-23 è `1.1.76`: se è ancora quella, la release è `1.1.77` con `versionCode` 10177. Le note sono «In Dati e backup, si può annullare l'ultimo ripristino.» Si pusha `origin/feat/listino-razze`, non `origin/main`. La release usa `--target feat/listino-razze`.

## Fuori

- Unisci, «SOSTITUISCI», barra, streaming, Google Drive.
- Più di una copia, o un annulla che torna indietro di due ripristini.
- Cancellare dal salone, durante il ripristino, i file che l'archivio non contiene.
- Rigenerare le miniature.

## Messaggi

| Situazione | Messaggio |
| --- | --- |
| Copia non salvata | Copia di sicurezza non riuscita |
| Ripristino riuscito | Ripristinato |
| Annulla cloud o locale riuscito | Ripristino annullato |
| Annulla cloud fallito | Ripristino incompleto, riprova |
| Annulla cloud senza rete | Connessione assente |
| Annulla locale fallito | Salvataggio non riuscito |

## Prove

- La prima conferma cloud salva la copia e poi scrive i dati. Un secondo clic sullo stesso foglio non riscrive la copia.
- Un file già presente torna con gli stessi byte dopo l'annulla. Un id che non c'era viene tolto da `files` dall'annulla.
- La collezione `sicurezza` non è `files`. Il percorso usa `salonRootPath`.
- In locale l'annulla rimette i cani di prima e toglie il pulsante.
- Checksum rotto e JSON interno non creano la copia.
