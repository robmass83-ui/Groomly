# Da fare per Roberto

Aggiornato la sera del 25 ottobre 2026. `mostraPiani` e `abbonamentiAttivi` restano spenti. L’aggiornamento di chi ha già l’app resta l’APK. Non è stata creata una release GitHub nuova: l’app installata è ancora la 1.1.94. Le schermate seguono la lingua della persona. La 1.1.95 è preparata e non è pubblicata: `hosting/release.json` resta 1.1.94, non c’è una release GitHub. Il file da copiare, solo dopo la prova sul telefono, è `docs/play/release-1.1.95.json`.

## Già fatto

- **Template Brevo 5–12.** Il 5 (invito) è attivo. I 6–11 (prenotazioni) e il 12 (promemoria) esistono. Parametri e ID in `docs/brevo/BREVO-TEMPLATE-GROOMLY.md`.
- **Dominio.** `groomlyapp.it` è collegato a Firebase Hosting. Risponde come `groomly-3128b.web.app`.
- **Email.** `info@groomlyapp.it` è attiva.
- **Scheda Google Play.** In bozza. Manca solo la sezione screenshot.
- **Pagine legali online.** Privacy, Termini 1.1, DPA ed elimina account sono su `groomlyapp.it`. I Termini dicono che oggi l’app è gratuita, che l’IVA la applica Google e che c’è il recesso.
- **Laura.** Omaggio Salone già scritto sul suo `pro/main`. Non è stato toccato altro del suo salone, né `salon/shared`, né Troddioni.
- **Functions.** Online, Node.js 22, `europe-west1`. La cleanup degli artifact è a 1 giorno. `eliminaAccount` libera il posto del collaboratore.
- **Regole e indici.** Pubblicati. Ruleset attuale: `b349498c-a55b-4654-abac-94bad11cd418`. Per tornare indietro: prima `312ca6bd-e8cf-4a8b-8489-1d6f5b9135e3`, poi `89cb4014-30e4-45f8-959e-94a20f524aa5`.
- **APK pubblico fuori da GitHub.** `https://groomlyapp.it/groomly.apk` è il file della 1.1.95, ancora firmato debug. `release.json` dice 1.1.94, quindi l’avviso «Aggiornamento disponibile» non parte. GitHub Releases resta la riserva. Il file non è nel commit.
- **Variante `play`.** Stesso `applicationId` `it.groomly.app`, senza aggiornamento APK e senza `REQUEST_INSTALL_PACKAGES`. L’AAB compila ed è firmato con la chiave di upload. Non è stato caricato su Play.
- **App Check.** Codice pronto e spento. I passi di console sono più sotto.

## Ti resta

Sono le nove voci della sezione 3 di `docs/GROOMLY-COSA-RESTA.md`. Nessuna è stata fatta al posto tuo.

1. **Copia del keystore, subito.** `%USERPROFILE%\.groomly\upload.jks` e `keystore.properties` in un password manager e su una chiavetta. I dettagli sono nella sezione «Firma di release». Senza quei file, dopo la prima pubblicazione, non carichi gli aggiornamenti su Play.
2. **Screenshot del Salone Demo**, quando puoi. Agenda, scheda cane con foto, lista, listino, in `D:\Groomly\Icon and logo\play-store\screenshot\`. Li carica Claude.
3. **Provare la 1.1.95 su un telefono.** È pronta e non è pubblicata come aggiornamento. Installa l’APK debug (`groomly.apk` nella radice, oppure `https://groomlyapp.it/groomly.apk`). L’avviso in app non parte finché `hosting/release.json` resta 1.1.94. Dopo la prova, copia `docs/play/release-1.1.95.json` su `hosting/release.json` e rifai il deploy di hosting, oppure chiedi la release GitHub. L’APK resta firmato con la chiave debug finché non avvisi Laura.
4. **Repository GitHub privato**, dopo aver visto che l’aggiornamento 1.1.95 arriva dal sito. Non prima. Oggi il repository è ancora pubblico e non va reso privato.
5. **App Check in console**, prima del test chiuso Play. I passi sono nella sezione sotto. I tre flag nel codice restano spenti. Non imporre l’enforcement prima.
6. **Test chiuso Play**, quando decidi di andare su Play. 12–15 tester per 14 giorni con l’AAB `play`. La scheda in inglese e spagnolo è in `docs/play/`. L’APK che scarica Laura resta quello debug.
7. **Spegnere i template Brevo 3–12**, solo quando Cursor lo segnala. Non è stato segnalato. Le email partono dal codice. Il template 5 dell’invito resta acceso.
8. **Pagamenti**, solo quando accendi gli abbonamenti. Partita IVA, profilo pagamenti, prodotti, RevenueCat, prove di acquisto, offerta fondatori. La lista è in `docs/legal/PRIMA-DEI-PAGAMENTI.md`. Prezzi di lancio, se serviranno: Pro 9,99 €/mese o 99,90 €/anno; Salone 19,99 €/mese o 199,90 €/anno con 3 posti; posto extra 3,99 €/mese e 39,90 €/anno. `abbonamentiAttivi` resta false.
9. **Custom claim admin**, facoltativo. `scripts/imposta-admin.ts` non è stato lanciato. A mano, con `IMPOSTA_ADMIN=1`, sugli uid di Laura e Roberto, quando decidi di farlo. Non tocca `shared`.

Crediti e WhatsApp automatico restano rimandati: non sono in questa lista. Il canale automatico resta l’email. Prima di un APK GitHub firmato con la chiave nuova, avvisa Laura: oggi l’APK pubblicato è ancora quello debug.

## App Check (codice pronto, spento)

Il codice c’è e non parte. `APP_CHECK_ATTIVO` in `src/lib/appCheck.ts` è `false`. `APP_CHECK_ENABLED` in `android/app/build.gradle` è `false`. `hosting/app-check.js` ha `GROOMLY_APP_CHECK = false`. Non imporre App Check su Firestore o sulle Functions prima che un’app con il flag acceso sia in mano ai tester: l’app di Laura resterebbe fuori.

Quando vuoi accenderlo, in console, in quest’ordine:

1. **reCAPTCHA v3.** Su [Google reCAPTCHA](https://www.google.com/recaptcha/admin) crea una chiave v3 per `groomlyapp.it` (e `groomly-3128b.web.app` se la pagina di prova resta lì). Tieni la site key e la secret key.
2. **Firebase Console → App Check → app web.** Registra l’app web con reCAPTCHA v3 e incolla la secret key. La site key va in `hosting/app-check.js` (`GROOMLY_RECAPTCHA_SITE_KEY`) e poi `GROOMLY_APP_CHECK = true`. La pagina è `groomlyapp.it/salone`: chiama `preparaAppCheckPagina(app)` prima di ogni funzione pubblica.
3. **Impronta della chiave di upload.** Da PowerShell: `keytool -list -v -keystore %USERPROFILE%\.groomly\upload.jks -alias groomly-upload`. Copia il SHA-256. La password è nel file delle proprietà, non in questo documento.
4. **Firebase Console → App Check → app Android** `it.groomly.app`. Provider Play Integrity. Aggiungi il SHA-256 del punto 3. Dopo la prima upload su Play, aggiungi anche il SHA-256 della **chiave di firma dell’app** che mostra Play Console (è diversa dalla chiave di upload).
5. Nel codice: `APP_CHECK_ATTIVO = true` e `APP_CHECK_ENABLED true`, poi rifai l’AAB `play`. Play Integrity risponde solo se l’app arriva da Play, non da un APK installato a mano.
6. Solo dopo, in App Check, «Enforce» su Functions e Firestore. Fino ad allora le metriche si vedono senza bloccare nessuno.

## Firma di release (25/10/2026 sera)

Gli APK pubblicati 1.1.93 e 1.1.94 sono firmati con la chiave **debug** di Android (`CN=Android Debug`, SHA-256 `1aa1211e900e794873ea1632ed09f5ce116e20f87010d96a9ecbf699c9d68fe2`). La stessa. Non è stata cambiata: Laura ha quell’app e un APK firmato con un’altra chiave non si installa sopra. Bisogna disinstallare. Avvisala prima di qualsiasi APK GitHub firmato con la chiave nuova.

Il keystore di upload per Google Play è **fuori dal repository**:

- file: `%USERPROFILE%\.groomly\upload.jks`
- proprietà (percorso, password, alias): `%USERPROFILE%\.groomly\keystore.properties`
- alias: `groomly-upload`
- certificato: `CN=Groomly, OU=Groomly, O=Groomly, L=Cagliari, ST=CA, C=IT`

Copia il `.jks` e il file delle proprietà in un posto tuo (password manager o disco di backup). Se li perdi, dopo la prima pubblicazione con Play App Signing Google tiene la chiave dell’app, ma senza la chiave di upload non carichi gli aggiornamenti. Non committarli. Non mandarli in chat.

La variante `play` usa questo keystore da sola, se il file delle proprietà c’è. La variante `github` resta sulla chiave debug. Per rifare l’AAB, da `android`, con il JDK 21:

```powershell
$env:JAVA_HOME = "$env:LOCALAPPDATA\jdk21\jdk-21.0.12.1+1"
.\gradlew :app:bundlePlayRelease
```

L’AAB esce in `android/app/build/outputs/bundle/playRelease/app-play-release.aab`. Non usarlo al posto dell’APK che scarica Laura.
