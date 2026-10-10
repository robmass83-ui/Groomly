# Groomly — Scarica e installa l’APK nell’app

Data: 2026-10-10
Stato: approvato in dialogo, in attesa di revisione del file

Scarica non apre più il browser. L’app scarica l’APK e apre subito l’installazione di Android. Resta il tocco **Installa** del sistema, una volta per aggiornamento. La prima volta Android chiede di consentire a Groomly di installare app; quel consenso non si ripete.

## 1. Foglio

Il foglio «Aggiornamento disponibile» resta. Il testo resta: «È pronta la versione {versione}. Scaricala e installala al posto di questa.» **Più tardi** chiude il foglio e, se un download è in corso, lo interrompe.

**Scarica**, su Android:

1. Il bottone si disabilita. Se la risposta ha la lunghezza, la scritta è «Download 12%»: la percentuale è la parte intera di `received / total × 100`, da 0 a 100. Se la lunghezza manca, è «Download…».
2. A file completo si apre l’installazione di sistema. Il foglio resta com’è: l’utente può tornare indietro dal foglio di Android.
3. Se il download fallisce, il bottone torna «Scarica» e sotto compare «Download non riuscito». Un nuovo tocco riprova.
4. Se manca il permesso di installare, si apre la schermata di sistema di questa app. Al ritorno, se il permesso c’è e il file è già completo, parte l’installazione senza un secondo download. Se il permesso manca ancora, il testo è «Per installare, consenti le app di Groomly» e Scarica riapre quella schermata.

Fuori da Android (browser di sviluppo) Scarica continua ad aprire l’indirizzo con `Browser.open`.

## 2. Android

Permesso nel manifest: `android.permission.REQUEST_INSTALL_PACKAGES`.

Plugin Capacitor locale `AppInstaller`, classe `it.groomly.app.AppInstallerPlugin`, registrato in `MainActivity`. Nessuna libreria esterna.

`downloadAndInstall({ url })` accetta solo `https`. Scarica con la rete di Android nel file di cache `groomly-update.apk`, sovrascrivendo quello precedente. Il progresso esce come evento `progress` con `received` e `total` (`total` è 0 se ignoto). Il download non passa dalla memoria di JavaScript. `cancel()` interrompe il download in corso e non apre l’installazione. **Più tardi** lo chiama.

A file pronto, se `canRequestPackageInstalls()` è vero, un intent `ACTION_VIEW` con l’URI del `FileProvider` già presente (`cache-path` c’è), tipo `application/vnd.android.package-archive` e permesso di lettura sull’URI. Se il permesso manca, `ACTION_MANAGE_UNKNOWN_APP_SOURCES` per il pacchetto `it.groomly.app`. La promise si risolve quando l’intent parte, non quando l’utente ha premuto Installa.

Errori verso il foglio: rete o file illeggibile → download non riuscito. L’intent che non parte → la stessa scritta.

## 3. Test

- Su Android, Scarica chiama `downloadAndInstall` con l’URL della release e non chiama `Browser.open`.
- Un evento di progresso cambia la scritta del bottone in «Download 40%».
- Un fallimento mostra «Download non riuscito» e rimette «Scarica».
- Fuori da Android, Scarica apre ancora il browser.
- La release già installata non mostra il foglio. **Più tardi** lo chiude.
