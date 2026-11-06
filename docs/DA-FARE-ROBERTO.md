# Da fare per Roberto

Aggiornato il 6 novembre 2026. La versione pubblicata è la **1.1.194**, firmata con la chiave Groomly. L’APK si scarica dalla release GitHub `v1.1.194`: `hosting/release.json` punta lì e il sito non ospita più il file. `mostraPiani` e `abbonamentiAttivi` restano spenti. L’app è in cinque lingue e la Console admin è su `/admin`.

## Scadenze

- **1 dicembre 2026: nuovi documenti.** Da quel giorno chi ha già un account riaccetta Privacy, Termini e accordo dati (`RIACCETTA_DAL` in `src/lib/versioneLegale.ts`). L’avviso è stato mandato a Laura, dalla Console. Lei dovrà toccare «Accetto» con almeno la 1.1.193. Nessuno può accettare al suo posto: l’accettazione è una riga legale nel suo account.

## Decisioni già prese

- **Lingua dell’app.** Vale la lingua del telefono. Se l’utente la cambia in Impostazioni, quella scelta vince.
- **Avviso legale.** Solo al salone di Laura, perché gli altri account sono di prova. Prima di un altro invio legale, controlla in Saloni se ce ne sono di veri.
- **Firma dell’APK.** Dalla 1.1.130 è la chiave Groomly. La chiave debug non si usa più.
- **Scritta «TOELETTATURA».** Tolta per tutti da sito, email, logo di avvio e logo VIP. Resta solo nei file originali di `Icon and logo`.

## Già fatto

- **Dominio.** `groomlyapp.it` è collegato a Firebase Hosting. Risponde come `groomly-3128b.web.app`.
- **Email.** `info@groomlyapp.it` arriva a `service.groomlyapp@gmail.com` tramite ImprovMX. Brevo serve solo per l’invio.
- **Email in cinque lingue.** Partono tutte dal codice. I template Brevo non si usano, quindi non vanno tradotti.
- **Pagine legali online.** Privacy 3, Termini 2 e DPA 2 in cinque lingue, più la pagina per eliminare l’account. Stato voce per voce in `docs/legal/STATO-CONFORMITA.md`.
- **Laura.** Omaggio Salone già scritto sul suo `pro/main`. Il suo salone vero è `salons/{uid di Laura}`: `salon/shared` è un resto in sola lettura.
- **Console admin.** Pubblicata, con home Oggi, tasto + e ricerca. Guida in `docs/GUIDA-ADMIN-MANAGER.md`.
- **Accessi admin.** Passaggio chiuso il 6 novembre: la hotmail entra solo in `/admin`, robmass83 è socio di I Pelosetti.
- **Google Analytics.** Collegato a `groomly-3128b`, con conservazione a 2 mesi, segnali Google spenti e personalizzazione degli annunci spenta.
- **Crashlytics.** Non ha un pulsante da attivare: parte al primo avvio di una build con l’SDK.
- **Storage.** Non è attivo, quindi non c’è nessuna regola da copiare.
- **Altro e Magazzino.** Impostazioni si apre dall’icona del profilo, e la barra in basso ha la voce Altro con il Magazzino.
- **Variante `play`.** Stesso `applicationId` `it.groomly.app`, senza aggiornamento APK e senza `REQUEST_INSTALL_PACKAGES`. L’AAB compila ed è firmato con la chiave di upload. Non è stato caricato su Play.
- **App Check.** Codice pronto e spento. I passi di console sono più sotto.
- **Copia del keystore.** `%USERPROFILE%\.groomly\upload.jks` e `keystore.properties` sono al sicuro.

## Ti resta, fuori da Play

**Sul telefono.**

- Prova l’ultimo aggiornamento. Email e push vere non sono mai state provate in francese e in tedesco.
- Controlla se qualche evento automatico di Analytics parte prima dello spegnimento delle statistiche.

**Facoltativo.**

- Spegnere i template Brevo ancora attivi, solo in italiano. Lasciarli accesi non cambia nulla.
- Scheda nido: il confronto è in `docs/archive/confronto-scheda-nido.html`. Il ramo non è unito.

WhatsApp automatico è in app, con la scritta «Da sviluppare». Non invia nulla. I crediti restano fuori. Il canale automatico di oggi è l’email.

## Prima di accendere Plus e Salon

- Fai rileggere Termini, Privacy e DPA a un professionista. Le traduzioni fr e de le ha scritte Claude, senza revisione legale.
- Fai confermare che gli inviti alla beta possano restare email dirette, senza consenso promozionale.
- Passa a Trader e segui `docs/legal/PRIMA-DEI-PAGAMENTI.md`.

## Google Play DA FARE

In attesa. Si riprendono quando si decide di aprire Play.

- Screenshot del Salone Demo in `D:\Groomly\Icon and logo\play-store\screenshot\`. Li carica Claude. Controlla che non mostrino nomi o loghi di saloni veri.
- Scheda sicurezza dati: compilala da `docs/play/scheda-sicurezza-dati.md`.
- Repository GitHub privato: oggi resta pubblico, perché l’APK si scarica dalle sue release. Prima di renderlo privato serve un altro posto per l’APK.
- App Check in console. I tre flag nel codice restano spenti. I passi sono più sotto. Non imporre l’enforcement prima.
- Test chiuso: 12–15 tester per 14 giorni con l’AAB `play`. La scheda in inglese e spagnolo è in `docs/play/`.
- **Scheda in francese e tedesco.** In Play Console, sotto «Scheda dello Store principale», aggiungi le traduzioni `fr-FR` e `de-DE` e incolla titolo, descrizione breve e descrizione lunga da `docs/play/scheda-fr.md` e `docs/play/scheda-de.md`. Nelle schede it, en, es cambia la riga «Lingua»: ora dice cinque lingue.
- Pagamenti, solo quando si accendono gli abbonamenti. Partita IVA, profilo pagamenti, prodotti, RevenueCat, prove di acquisto, offerta fondatori. Lista in `docs/legal/PRIMA-DEI-PAGAMENTI.md`. `abbonamentiAttivi` resta false.
- **Beta Plus/Salon (pubblicata con la 1.1.189).** Guida all’uso in `docs/GUIDA-ADMIN-MANAGER.md`.
- **Abbonamenti (codice pronto e spento).** I due segreti e l’ID progetto ci sono già. Resta il webhook in RevenueCat: URL `https://rcwebhook-nyt2jddsxa-ew.a.run.app`, Authorization header uguale al segreto `REVENUECAT_WEBHOOK_AUTH`. Per cambiare un segreto:
  `npx firebase functions:secrets:set REVENUECAT_WEBHOOK_AUTH` e `npx firebase functions:secrets:set REVENUECAT_API_KEY`.
  Poi, quando vuoi (gratis): account RevenueCat, chiave segreta V2, ID progetto in `functions/.env` (`REVENUECAT_PROJECT_ID`), chiave `goog_…` nella Console, webhook con «Send test event». Il giorno dei pagamenti: annuncio 15 giorni prima, pannello di accensione tutto verde, ACCENDI. Passi completi in `docs/legal/PRIMA-DEI-PAGAMENTI.md` §3.

## Sicurezza: controlli in console (audit del 6 novembre)

- Google Cloud: budget con avviso sulla fatturazione. Le regole limitano il singolo file, non quanti file crea un account gratuito.
- Google Cloud: quota giornaliera sull'API Places.
- Chiave web Firebase: limitarla per API alle sole API Firebase usate, così non chiama Places. Non limitarla ai soli siti: nell'APK gira con origine https://localhost e il login smetterebbe di funzionare. Se si vuole il limite per sito, aggiungere https://localhost e provare prima su un APK di prova.
- Chiave Android: limitarla al pacchetto it.groomly.app con le impronte di firma GitHub e Play.

## App Check (codice pronto, spento)

Il codice c’è e non parte. `APP_CHECK_ATTIVO` in `src/lib/appCheck.ts` è `false`. `APP_CHECK_ENABLED` in `android/app/build.gradle` è `false`. `hosting/app-check.js` ha `GROOMLY_APP_CHECK = false`. Non imporre App Check su Firestore o sulle Functions prima che un’app con il flag acceso sia in mano ai tester: l’app di Laura resterebbe fuori.

Quando vuoi accenderlo, in console, in quest’ordine:

1. **reCAPTCHA v3.** Su [Google reCAPTCHA](https://www.google.com/recaptcha/admin) crea una chiave v3 per `groomlyapp.it` (e `groomly-3128b.web.app` se la pagina di prova resta lì). Tieni la site key e la secret key.
2. **Firebase Console → App Check → app web.** Registra l’app web con reCAPTCHA v3 e incolla la secret key. La site key va in `hosting/app-check.js` (`GROOMLY_RECAPTCHA_SITE_KEY`) e poi `GROOMLY_APP_CHECK = true`. La pagina è `groomlyapp.it/salone`: chiama `preparaAppCheckPagina(app)` prima di ogni funzione pubblica.
3. **Impronta della chiave di upload.** Da PowerShell: `keytool -list -v -keystore %USERPROFILE%\.groomly\upload.jks -alias groomly-upload`. Copia il SHA-256. La password è nel file delle proprietà, non in questo documento.
4. **Firebase Console → App Check → app Android** `it.groomly.app`. Provider Play Integrity. Aggiungi il SHA-256 del punto 3. Dopo la prima upload su Play, aggiungi anche il SHA-256 della **chiave di firma dell’app** che mostra Play Console (è diversa dalla chiave di upload).
5. Nel codice: `APP_CHECK_ATTIVO = true` e `APP_CHECK_ENABLED true`, poi rifai l’AAB `play`. Play Integrity risponde solo se l’app arriva da Play, non da un APK installato a mano.
6. Solo dopo, in App Check, «Enforce» su Functions e Firestore. Fino ad allora le metriche si vedono senza bloccare nessuno.

## Firma di release

Dalla 1.1.130 (30 ottobre) l’APK del sito è `assembleGithubRelease`, firmato con la chiave Groomly. Android rifiuta un aggiornamento con una firma diversa, quindi la chiave non va cambiata. Chi aveva un APK firmato debug, fino alla 1.1.129, ha dovuto disinstallare una volta.

Il keystore è **fuori dal repository**:

- file: `%USERPROFILE%\.groomly\upload.jks`
- proprietà (percorso, password, alias): `%USERPROFILE%\.groomly\keystore.properties`
- alias: `groomly-upload`
- certificato: `CN=Groomly, OU=Groomly, O=Groomly, L=Cagliari, ST=CA, C=IT`

Se li perdi, dopo la prima pubblicazione con Play App Signing Google tiene la chiave dell’app, ma senza la chiave di upload non carichi gli aggiornamenti. Senza quel file, poi, gli APK del sito non si aggiornano più sopra quelli installati. Non committarli. Non mandarli in chat.

Il collegamento a Drive funziona solo se lo SHA-1 dell’APK ha un client OAuth Android in Google Cloud: se la chiave cambia, va aggiunto anche lì.

Per rifare l’AAB, da `android`, con il JDK 21:

```powershell
$env:JAVA_HOME = "$env:LOCALAPPDATA\jdk21\jdk-21.0.12.1+1"
.\gradlew :app:bundlePlayRelease
```

L’AAB esce in `android/app/build/outputs/bundle/playRelease/app-play-release.aab`. Non usarlo al posto dell’APK che scarica Laura.
