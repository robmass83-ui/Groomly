# Da fare per Roberto

Passi che il codice non può chiudere da solo. Non sono stati eseguiti contro il Firebase vero, Play Console, Meta, il DNS o il salone di Laura.

1. **Salone di Laura.** Dopo la pubblicazione, da telefono, pagina Utenti: azione «Salone omaggio» sul suo salone. Non lanciare script. Non toccare `salon/shared` né Troddioni.
2. **Repository privato.** Rendere privato `robmass83-ui/Groomly` solo quando l’APK è scaricabile da un indirizzo pubblico diverso da quel repo. Fino ad allora l’aggiornamento APK resta su GitHub Releases, come deciso.
3. **DNS.** Puntare `groomlyapp.it` a Firebase Hosting come dominio personalizzato. La pagina del salone funziona anche senza, sull’hosting di test.
4. **Play Console e RevenueCat.** Account (personale o organizzazione: sentire il commercialista), profilo pagamenti, prodotti con i prezzi di lancio (Pro 9,99 €/mese o 99,90 €/anno; Salone 19,99 €/mese o 199,90 €/anno con 3 posti; posto extra 3,99 €/mese e 39,90 €/anno). Grazia 7 giorni, account hold 30, pausa 1–3 mesi, nessuna prova gratuita su Play. Poi progetto RevenueCat, service account, webhook, segreti `REVENUECAT_API_KEY` e `REVENUECAT_WEBHOOK_AUTH`. Pacchetto da aggiungere quel giorno: `@revenuecat/purchases-capacitor`. Non è installato.
5. **Test chiuso.** 12–15 tester Android per 14 giorni, solo quando si farà il flavor `play`. Non ora: l’aggiornamento APK resta.
6. **Template Brevo** delle email di prenotazione e del promemoria (richiesta, conferma, proposta, rifiuto, scadenza, disdetta, promemoria). Se il template manca, il codice invia l’HTML che ha già.
7. **reCAPTCHA / App Check** per la pagina pubblica.
8. **Commercialista.** DPA, prezzi, partita IVA. Non blocca lo sviluppo. L’account Play organizzazione dipende da questo.
9. **Custom claim.** Lo script `scripts/imposta-admin.ts` c’è e non è stato lanciato. Si esegue a mano, con `IMPOSTA_ADMIN=1`, sugli uid di Laura e Roberto quando si è deciso di farlo. Non tocca `shared`.
10. **Offerta fondatori** in Play Console (primi 50 saloni, prezzo bloccato), quando gli abbonamenti saranno accesi.
11. **Crediti e WhatsApp automatico.** Rimandati. Il canale automatico resta l’email.
12. **Flavor `play`.** Togliere l’aggiornamento APK e `REQUEST_INSTALL_PACKAGES` solo al passaggio allo store. `AppInstallerPlugin`, `UpdateNotice` e `appRelease.ts` restano. `launchMode` resta `singleTask`: il passaggio a `singleTop` si rifà insieme a `@revenuecat/purchases-capacitor`, il giorno del Play Store.
13. **Checklist §9.7, license tester**, il giorno in cui i prodotti esistono e non prima. `abbonamentiAttivi` resta false. Da provare: acquisto Pro, upgrade a Salone, posto extra, disdetta, carta rifiutata, rimborso, reinstallazione, webhook ripetuto, offline, collaboratore senza pulsante Abbonati. Il sondaggio di disdetta resta nascosto finché gli abbonamenti sono spenti.
14. **Deploy Firebase.** Non eseguito da questo giro, per scelta: niente `firebase deploy` su `groomly-3128b`. Quando si è pronti, a mano: `npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b`. Fino ad allora le regole nuove (F1, F3, F4, lettura del proprio membro) non sono in produzione.

## App Check (codice pronto, spento)

Il codice c’è e non parte. `APP_CHECK_ATTIVO` in `src/lib/appCheck.ts` è `false`. `APP_CHECK_ENABLED` in `android/app/build.gradle` è `false`. `hosting/app-check.js` ha `GROOMLY_APP_CHECK = false`. Non imporre App Check su Firestore o sulle Functions prima che un’app con il flag acceso sia in mano ai tester: l’app di Laura resterebbe fuori.

Quando vuoi accenderlo, in console, in quest’ordine:

1. **reCAPTCHA v3.** Su [Google reCAPTCHA](https://www.google.com/recaptcha/admin) crea una chiave v3 per `groomlyapp.it` (e `groomly-3128b.web.app` se la pagina di prova resta lì). Tieni la site key e la secret key.
2. **Firebase Console → App Check → app web.** Registra l’app web con reCAPTCHA v3 e incolla la secret key. La site key va in `hosting/app-check.js` (`GROOMLY_RECAPTCHA_SITE_KEY`) e poi `GROOMLY_APP_CHECK = true`. La pagina è `groomlyapp.it/salone`: chiama `preparaAppCheckPagina(app)` prima di ogni funzione pubblica.
3. **Impronta della chiave di upload.** Da PowerShell, senza stampare la password in chiaro se puoi evitarlo: `keytool -list -v -keystore %USERPROFILE%\.groomly\upload.jks -alias groomly-upload`. Copia il SHA-256.
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

## Aggiornamento del 25/10/2026 (Claude)
- **Template Brevo creati** (bozze non attive): 5 invito, 6–11 prenotazioni online, 12 promemoria. Parametri e ID in `docs/brevo/BREVO-TEMPLATE-GROOMLY.md`. Il codice deve usare questi ID.
- **Da fare subito (Roberto):** attivare il template **5** su Brevo, perché `createInvite` (1.1.93) lo usa già e senza template gli inviti falliscono. Gli altri si attivano quando le funzioni vanno in produzione.
- **Privacy, Termini, DPA, Elimina account** pronti in `docs/legal/` (stesso stile del sito). Prima di pubblicarli in `hosting/`: completare i campi `[da completare]` (indirizzo, foro) e farli rivedere da un professionista. Le pagine servono anche a Google Play (URL privacy, eliminazione account).
