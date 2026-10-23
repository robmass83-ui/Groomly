# Groomly — Collegamento a Google Drive

Data: 2026-10-23
Stato: chiusa il 2026-10-23. Si procede con le scelte consigliate, poi il piano e i subagent.

Sulla card **Dati e backup** si può collegare l'account Google e scollegarlo. Il permesso è solo `drive.file`. Questa versione non carica backup, non crea cartelle e non cambia «Esegui ora».

## Decisioni chiuse

1. La riga nuova sta sotto il toggle «Backup automatico giornaliero» e sopra Esporta. Senza collegamento il pulsante è **Collega Google Drive**. Dopo, la riga mostra l'email e il pulsante **Scollega**. Se Google non restituisce l'email, il testo è «Google Drive collegato».
2. Gli unici scope sono `https://www.googleapis.com/auth/userinfo.email` e `https://www.googleapis.com/auth/drive.file`. Nessun altro scope Drive (`drive`, `drive.readonly`, `drive.appdata`, `drive.metadata`).
3. Su Android il collegamento usa `AuthorizationClient` di Play Services (`com.google.android.gms:play-services-auth:21.4.0`), nello stesso stile di `AppInstallerPlugin`: classe `DriveAuthPlugin`, nome plugin `DriveAuth`, registrata in `MainActivity` prima di `super.onCreate`. La 21.3.0 non contiene `clearToken`: per questo la dipendenza è 21.4.0. Il consenso parte solo da **Collega Google Drive**. All'apertura di Impostazioni `leggi` chiede il risultato già concesso e, se serve ancora il consenso, non apre il foglio Google.
4. Il token di accesso non esce da Java. Non va in JavaScript, in `localStorage` e non in Firestore. `scollega` chiama `clearToken`. L'email vive solo nello stato della pagina, riletta da `leggi` a ogni apertura.
5. Sul web, e nei test che non sono il telefono, **Collega Google Drive** non apre Google. Il toast è «Il collegamento a Google Drive funziona sul telefono». `leggi` risolve `{ collegato: false }` senza errore.
6. Senza rete, prima di chiamare il plugin sia per collegare sia per scollegare: toast «Connessione assente». Se l'utente chiude il foglio Google, il plugin rifiuta con `annullato` e non c'è toast. Ogni altro rifiuto di collega o di scollega: «Collegamento Google non riuscito»; se scollega fallisce l'email resta. Collegamento riuscito: «Google Drive collegato». Scollegamento riuscito: «Google Drive scollegato». Durante la chiamata i due pulsanti sono disabilitati. Se `leggi` all'apertura fallisce, resta **Collega Google Drive** e non c'è toast.
7. Il chip, «Esegui ora», il toggle, Esporta, Ripristina, Annulla ripristino, Registro Excel, Backup ZIP e Backup completo non cambiano. Non si toccano `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`, `firestore.rules`. Nessuna dipendenza npm nuova. L'unica dipendenza nuova è quella Gradle del punto 3.
8. In `google-services.json` di questo progetto non c'è ancora un client OAuth Android. Finché in Google Cloud non esiste un client Android per il pacchetto `it.groomly.app` e il certificato con cui è firmato l'APK di debug, il telefono risponde con «Collegamento Google non riuscito». Il codice di questa versione è completo lo stesso: il client OAuth è un passo della console, fuori dal repository. Non si inventa un client secret dentro l'app.
9. La pubblicazione alza di una patch la versione letta in quel momento. Il 2026-10-23 è `1.1.77`: se è ancora quella, la release è `1.1.78` con `versionCode` 10178. Le note sono «In Dati e backup si può collegare Google Drive.» Si pusha `origin/feat/listino-razze`, non `origin/main`. La release usa `--target feat/listino-razze`.

## Fuori

- Cartelle su Drive, upload, incrementale, «Esegui ora» verso Drive.
- Pianificazione, Wi-Fi, WorkManager, lock, conservazione, spazio libero.
- Ripristino da Drive, Unisci, «SOSTITUISCI», barra di avanzamento.
- Cambiare il chip o il toggle.

## Messaggi

| Situazione | Messaggio |
| --- | --- |
| Collegamento riuscito | Google Drive collegato |
| Scollegamento riuscito | Google Drive scollegato |
| Collegamento fallito | Collegamento Google non riuscito |
| Foglio Google chiuso | nessun toast |
| Senza rete | Connessione assente |
| Non è il telefono | Il collegamento a Google Drive funziona sul telefono |

## Prove

- In Impostazioni, senza collegamento, c'è **Collega Google Drive** e non c'è **Scollega**.
- Un `leggi` che risolve `{ collegato: true, email: "roberto@gmail.com" }` mostra l'email e **Scollega**, senza toast.
- Il clic su **Collega Google Drive** chiama il plugin. Al successo il toast è «Google Drive collegato» e compare l'email.
- Il rifiuto `annullato` non mostra toast e lascia **Collega Google Drive**.
- Un altro rifiuto mostra «Collegamento Google non riuscito».
- **Scollega** chiama il plugin, toglie l'email e mostra «Google Drive scollegato».
- `navigator.onLine === false` non chiama il plugin e mostra «Connessione assente».
