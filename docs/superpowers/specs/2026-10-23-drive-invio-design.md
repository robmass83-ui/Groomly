# Groomly — Invio del backup su Google Drive

Data: 2026-10-23
Stato: chiusa il 2026-10-23. Si procede con le scelte consigliate, poi il piano e i subagent.

Il collegamento della 1.1.78 resta com’è. Questa versione, quando l’account è collegato, crea la cartella dell’app nel Drive dell’utente e ci carica il file di **Backup completo**. Se il toggle «Backup automatico giornaliero» è acceso, lo stesso invio parte da solo all’apertura dell’app quando è passato un giorno, c’è rete Wi-Fi e Drive è collegato.

## Console, già verificata

Il client OAuth Android `910480609832-sqgtu8et3bei6rrqfmkl3r9e09nqidm1` è dello stesso progetto di `google-services.json` (`project_number` `910480609832`, pacchetto `it.groomly.app`). `AuthorizationClient` lo trova da pacchetto e SHA-1. Il codice non riceve quel client id.

Non si aggiunge un client Web e non si chiama `setServerClientId`: servirebbero solo per un codice di autorizzazione da scambiare su un server. Groomly parla con Drive dal telefono. `google-services.json` resta con `oauth_client` vuoto: quell’elenco alimenta il vecchio Sign-In (`default_web_client_id`), non `AuthorizationClient`. Non si mette un client secret nell’app.

In Testing il consenso vale per gli utenti di prova. Oggi è `robmass83@gmail.com`. L’APK pubblicato è firmato col keystore di debug, lo stesso SHA-1 registrato.

## Decisioni chiuse

1. La cartella si chiama `Groomly Backup – {nome}`. `{nome}` è `nomeSicuro` del nome salone nel manifest del backup; se il nome è vuoto si usa `Groomly`, come già fa il nome dello ZIP. È una cartella visibile in Il mio Drive, non la cartella nascosta `appDataFolder`. Lo scope resta `drive.file` più l’email. Nessun altro scope.
2. Il file caricato è lo stesso ZIP di **Backup completo**, con lo stesso nome `Groomly Backup completo – {nome} – {giorno di Roma}.zip`. Si riusa `raccogliBackup`, `registroXlsx` e `backupCompleto`. Non si cambia il formato di quei file.
3. L’id della cartella sta in SharedPreferences `groomly`, chiavi `driveCartellaId` e `driveCartellaNome`. Se il nome coincide e il file su Drive esiste e non è nel cestino, si riusa. Altrimenti si cerca una cartella con quel nome creata dall’app e, se manca, si crea. Un nome salone diverso crea un’altra cartella. Non si rinomina la vecchia.
4. Il token non esce da Java. JavaScript scrive lo ZIP nella cache con `Filesystem.writeFile` (come la condivisione) e passa al plugin l’uri. Java legge il file a blocchi e fa un upload resumable. Il token non si logga, non torna a JavaScript, non va in `localStorage` né in Firestore.
5. Metodi nuovi del plugin `DriveAuth`: `carica({ cartella, nome, percorso })` risolve `void`; `wifi()` risolve `{ wifi: boolean }`. `carica` rifiuta `ricollega` se il flag `driveScollegato` è vero, oppure se `authorize` non ha un token o chiede ancora il foglio. **Invia su Drive** non apre il foglio Google. `wifi` è vero solo se la rete attiva ha il trasporto Wi-Fi. Sul web `carica` lancia `Error('telefono')` e `wifi` risolve `{ wifi: false }`.
6. Con l’account collegato, sotto la riga dell’email, compare il pulsante **Invia su Drive**. Senza collegamento il pulsante non c’è. Sul web il toast è «Il collegamento a Google Drive funziona sul telefono». Senza rete, prima della chiamata: «Connessione assente». Successo: «Backup inviato su Google Drive». Rifiuto `ricollega`: «Ricollega Google Drive». Se il raccoglitore lancia `backup_offline`, il toast è il suo messaggio «Serve la connessione per creare il backup». Ogni altro errore: «Invio su Drive non riuscito». Il file in cache si cancella comunque alla fine.
7. L’invio automatico è un componente accanto al backup giornaliero già presente, dentro il toast, e non modifica quel backup. Parte una volta per avvio, solo con l’account in home, se il toggle `autoDaily` è acceso, `leggi` dice collegato, `wifi` è vero, c’è rete, e l’ultimo invio riuscito è assente o più vecchio di 24 ore. L’istante sta in `localStorage` alla chiave `groomly.users.${uid}.driveUltimoInvio`. Non aggiorna il chip né `backup.lastAt`. Il successo e gli errori usano gli stessi toast del pulsante. Se il Wi-Fi manca, non parte e non c’è toast.
8. Il chip, «Esegui ora», il testo del toggle, Esporta, Ripristina, Annulla ripristino, Registro Excel, Backup ZIP e Backup completo non cambiano. Non si toccano `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`, `firestore.rules`, `google-services.json`. Nessuna dipendenza npm o Gradle nuova.

## Fuori

- WorkManager, «solo in carica», lock fra due telefoni, conservazione delle ultime 10 copie, spazio libero su Drive.
- Foto incrementali, Registro ULTIMO, rinomina cartelle, ripristino da Drive.
- Cambiare il chip, il toggle o «Esegui ora».

WorkManager non può costruire lo ZIP: il raccoglitore, Excel e lo ZIP sono JavaScript. Finché l’app è chiusa quel file non esiste. Il controllo all’apertura è la programmazione di questa versione.

## Messaggi

| Situazione | Messaggio |
| --- | --- |
| Invio riuscito | Backup inviato su Google Drive |
| Invio fallito | Invio su Drive non riuscito |
| Serve di nuovo il consenso | Ricollega Google Drive |
| Senza rete, prima di iniziare | Connessione assente |
| Il raccoglitore è offline | Serve la connessione per creare il backup |
| Non è il telefono | Il collegamento a Google Drive funziona sul telefono |
| Manca il Wi-Fi, solo per l’automatico | nessun toast |

## Prove

- Collegato: c’è **Invia su Drive**. Scollegato: non c’è.
- Il clic con rete chiama `carica` con la cartella `Groomly Backup – Pelosetti`, il nome dello ZIP del giorno di Roma e un percorso. Al successo il toast è «Backup inviato su Google Drive» e la chiave `driveUltimoInvio` è valorizzata.
- `carica` che rifiuta `ricollega` mostra «Ricollega Google Drive» e non scrive la chiave.
- Un altro rifiuto mostra «Invio su Drive non riuscito».
- `navigator.onLine === false` non chiama `carica`.
- Sul web il clic mostra il toast del telefono.
- Con `autoDaily` acceso, account collegato, `wifi` vero e nessun invio precedente, all’avvio parte lo stesso `carica`. Con `autoDaily` spento, o `wifi` falso, o un invio più recente di 24 ore, non parte.
