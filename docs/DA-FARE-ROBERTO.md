# Da fare per Roberto

Aggiornato il 26 ottobre 2026. `mostraPiani` e `abbonamentiAttivi` restano spenti. L’app in codice è la **1.1.98**. `hosting/release.json` resta **1.1.96** finché non esiste il tag GitHub `v1.1.98`: solo allora l’avviso «Aggiornamento disponibile» può partire. Il file pronto è `docs/play/release-1.1.98.json`. La 1.1.97 non è mai stata pubblicata.

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

## Fatto da Roberto

1. **Copia del keystore.** `%USERPROFILE%\.groomly\upload.jks` e `keystore.properties` sono al sicuro. I dettagli restano nella sezione «Firma di release».

## Google Play DA FARE

In attesa. Non fanno parte dell’aggiornamento corrente. Si riprendono quando si decide di aprire Play.

- Screenshot del Salone Demo in `D:\Groomly\Icon and logo\play-store\screenshot\`. Li carica Claude.
- Repository GitHub privato, dopo aver visto che l’aggiornamento arriva dal sito. Oggi il repository resta pubblico.
- App Check in console. I tre flag nel codice restano spenti. I passi sono più sotto. Non imporre l’enforcement prima.
- Test chiuso: 12–15 tester per 14 giorni con l’AAB `play`. La scheda in inglese e spagnolo è in `docs/play/`.
- Pagamenti, solo quando si accendono gli abbonamenti. Partita IVA, profilo pagamenti, prodotti, RevenueCat, prove di acquisto, offerta fondatori. Lista in `docs/legal/PRIMA-DEI-PAGAMENTI.md`. `abbonamentiAttivi` resta false.

## Ti resta, fuori da Play

- **Provare l’ultimo aggiornamento sul telefono.** L’APK resta firmato con la chiave debug finché non avvisi Laura.
- **Spegnere i template Brevo 3–12**, solo dopo «Spedisci il campione delle email» (Impostazioni, solo Roberto) e dopo aver visto le 30 email su `info@groomlyapp.it`. Il template 5 dell’invito resta acceso.
- **Custom claim admin**, facoltativo. `scripts/imposta-admin.ts` non è stato lanciato.
- **Scheda nido.** Il confronto è in `docs/archive/confronto-scheda-nido.html`. Il ramo non è unito.

WhatsApp automatico è in app, con la scritta «Da sviluppare». Non invia nulla. I crediti restano fuori. Il canale automatico di oggi è l’email. Prima di un APK firmato con la chiave nuova, avvisa Laura.

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
