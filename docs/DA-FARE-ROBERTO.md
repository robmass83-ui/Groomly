# Da fare per Roberto

Passi che il codice non può chiudere da solo. Non sono stati eseguiti contro il Firebase vero, Play Console, Meta, il DNS o il salone di Laura.

1. **Salone di Laura.** Dopo la pubblicazione, da telefono, pagina Utenti: azione «Salone omaggio» sul suo salone. Non lanciare script. Non toccare `salon/shared` né Troddioni.
2. **Repository privato.** Rendere privato `robmass83-ui/Groomly` solo quando l’APK è scaricabile da un indirizzo pubblico diverso da quel repo. Fino ad allora l’aggiornamento APK resta su GitHub Releases, come deciso.
3. **DNS.** Puntare `groomlyapp.it` a Firebase Hosting come dominio personalizzato. La pagina del salone funziona anche senza, sull’hosting di test.
4. **Play Console e RevenueCat.** Account (personale o organizzazione: sentire il commercialista), profilo pagamenti, prodotti con i prezzi di lancio (Pro 9,99 €/mese o 99,90 €/anno; Salone 19,99 €/mese o 199,90 €/anno con 3 posti; posto extra 3,99 €/mese e 39,90 €/anno). Grazia 7 giorni, account hold 30, pausa 1–3 mesi, nessuna prova gratuita su Play. Poi progetto RevenueCat, service account, webhook, segreti `REVENUECAT_API_KEY` e `REVENUECAT_WEBHOOK_AUTH`. Pacchetto da aggiungere quel giorno: `@revenuecat/purchases-capacitor`.
5. **Test chiuso.** 12–15 tester Android per 14 giorni, solo quando si farà il flavor `play`. Non ora: l’aggiornamento APK resta.
6. **Template Brevo** delle email di prenotazione e del promemoria (richiesta, conferma, proposta, rifiuto, scadenza, disdetta, promemoria). Se il template manca, il codice invia l’HTML che ha già.
7. **reCAPTCHA / App Check** per la pagina pubblica.
8. **Commercialista.** DPA, prezzi, partita IVA. Non blocca lo sviluppo. L’account Play organizzazione dipende da questo.
9. **Custom claim.** Lanciare a mano `scripts/imposta-admin.ts` sugli uid di Laura e Roberto quando lo script c’è e si è deciso di farlo. Non è stato lanciato.
10. **Offerta fondatori** in Play Console (primi 50 saloni, prezzo bloccato), quando gli abbonamenti saranno accesi.
11. **Crediti e WhatsApp automatico.** Rimandati. Il canale automatico resta l’email.
12. **Flavor `play`.** Togliere l’aggiornamento APK e `REQUEST_INSTALL_PACKAGES` solo al passaggio allo store.
13. **Checklist acquisti** (license tester), il giorno in cui i prodotti esistono: acquisto Pro, upgrade a Salone, posto extra, disdetta, carta rifiutata, rimborso, reinstallazione, webhook ripetuto, offline, collaboratore senza pulsante Abbonati.
14. **Deploy Firebase.** Non eseguito da questo giro, per scelta: niente `firebase deploy` su `groomly-3128b`. Quando si è pronti, a mano: `npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b`. Fino ad allora le regole nuove (F1, F3, F4, lettura del proprio membro) non sono in produzione.

## Aggiornamento del 25/10/2026 (Claude)
- **Template Brevo creati** (bozze non attive): 5 invito, 6–11 prenotazioni online, 12 promemoria. Parametri e ID in `docs/brevo/BREVO-TEMPLATE-GROOMLY.md`. Il codice deve usare questi ID.
- **Da fare subito (Roberto):** attivare il template **5** su Brevo, perché `createInvite` (1.1.93) lo usa già e senza template gli inviti falliscono. Gli altri si attivano quando le funzioni vanno in produzione.
- **Privacy, Termini, DPA, Elimina account** pronti in `docs/legal/` (stesso stile del sito). Prima di pubblicarli in `hosting/`: completare i campi `[da completare]` (indirizzo, foro) e farli rivedere da un professionista. Le pagine servono anche a Google Play (URL privacy, eliminazione account).
