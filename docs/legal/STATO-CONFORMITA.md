# Stato della conformità legale

Controllo del 5/11/2026 sul codice della versione 1.1.191, aggiornato a fine blocco 2. Il codice è sul ramo `claude/conformita-codice-c2563e`, non ancora pubblicato. Non è una consulenza legale.
Fonte delle voci: `Groomly_Compliance_Legale_PIANO.md`.

Legenda: ✅ presente · ⚠️ parziale · ❌ mancante · ➖ non applicabile.
La colonna **Dove si fa** dice chi chiude la voce: *codice* è il blocco 2, *blocco 4* sono i testi finali, *a mano* è l'utente.

| # | Voce | Stato | File / dove | Note | Dove si fa |
|---|------|-------|-------------|------|------------|
| 1 | Eliminazione account (app + web) | ✅ | `src/pages/EliminaAccountPage.tsx`, `functions/src/piano/eliminaAccount.ts`, `pulisciSalone.ts`, `emailEliminazione.ts`, `hosting/elimina-account/` | Conferma con password. Toglie Auth, salone, Storage e raccolte. Email di conferma in 5 lingue, ma è grafica semplice, non lo stile `postaHtml`. Dal web la richiesta è manuale, via info@. Il salone `shared` e il VIP sono esclusi. | Nulla di obbligatorio |
| 2 | Esportazione dati | ✅ | `src/lib/backupCompleto.ts`, `backupZip.ts`, `registroXlsx.ts`, `src/data/firebase/backupCollect.ts`, `src/pages/AccountPage.tsx:486` | Il backup completo comprende ora richieste, lista d'attesa, email in coda e account, in Excel e nello ZIP. Il collaboratore scarica il proprio account. | Fatto nel blocco 2 |
| 3 | Privacy Policy + Scheda sicurezza dati | ⚠️ | `hosting/privacy/`, `src/pages/LegalePage.tsx`, `src/pages/LoginPage.tsx:185` | Pagina e link ci sono (versione 2, 25/10/2026). Sub-responsabili incompleti. Nel repository non c'è la tabella da copiare nella Scheda sicurezza dei dati. | Blocco 4 |
| 4 | Accettazione alla registrazione | ✅ | `src/pages/LoginPage.tsx:182`, `src/lib/schemas`, `src/data/firebase/client.ts:2452` | Casella obbligatoria, versione e data del server in `accounts/{uid}`, storico in `accounts/{uid}/registro`. Schermata di riaccettazione pronta: compare quando il blocco 4 alza `VERSIONE_DOCUMENTI`. | Fatto nel blocco 2 |
| 5 | Termini con limite di responsabilità | ⚠️ | `hosting/termini/` (versione 1.1) | Ci sono limite a 12 mesi, legge italiana, foro di Cagliari. Mancano «così com'è», promemoria non consegnati e dati inseriti male, 0 € per Go, sospensione account da verificare. Nomi dei piani vecchi. | Blocco 4 |
| 6 | DPA per i saloni | ⚠️ | `hosting/dpa/`, `src/pages/LegalePage.tsx:19` | Pagina completa (notifica entro 48 ore, sub-responsabili). La casella cita solo privacy e termini e i Termini linkano solo il modello di informativa: il DPA non risulta accettato insieme ai Termini. | Blocco 4 |
| 7 | Elenco sub-responsabili | ⚠️ | `hosting/privacy/` (sezione fornitori), `hosting/dpa/` | Presenti Firebase, Brevo, Drive, Google Play, RevenueCat. Assenti quelli elencati sotto. | Blocco 4 |
| 8 | Nessun training AI | ✅ | `package.json`, `functions/package.json`, ricerca in `src` e `functions/src` | Nessun servizio AI nelle dipendenze o nelle chiamate. La Privacy non lo dice: una frase sarebbe utile. | Blocco 4 (facoltativo) |
| 9 | Regole sicurezza / chiavi | ⚠️ | `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`, `functions/src/index.ts:92` | Firestore: ogni salone è separato e `shared` è in sola lettura. Chiavi solo in `defineSecret`; l'`AIza` in `hosting/azione/` è la chiave web pubblica di Firebase. Test delle regole Firestore verdi (24/24). **Storage:** per scelta del 13/10/2026 foto e listino stanno in Firestore e Storage non si pubblica; la build non ha un bucket configurato, quindi i tentativi di copia in `users/{uid}/` non arrivano a destinazione. `storage.rules` è ora nel repository con 4 test verdi, pronto se Storage si attiverà, ma `firebase.json` continua a non pubblicarlo. | A mano (controllo in Console) |
| 10 | Disiscriviti nelle email | ✅ | `functions/src/piano/silenzioEmail.ts`, `inviaCoda.ts`, `src/i18n/emailHtml.ts:100`, `hosting/azione/`, `src/pages/DogPage.tsx:1537` | La disiscrizione vale per indirizzo in tutto il salone, con interruttore nella scheda e link anche nel posto libero. Consenso promozionale chiesto nel tour, spento di default, con «Disiscriviti». Resta una lacuna: i clienti del salone `shared`, vedi sotto. | Fatto nel blocco 2 |
| 11 | Tracker solo dopo consenso / banner cookie | ⚠️ | `hosting/*`, `android/app/build.gradle`, `src/lib/metriche.ts` | Sito: nessun tracker e nessun cookie non tecnico, quindi niente banner. reCAPTCHA è spento (`hosting/app-check.js`): se si accende va rivisto. App: niente Analytics né Crashlytics nelle dipendenze oggi. | Blocco 4 |
| 12 | Rinnovo automatico dichiarato | ✅ | `src/components/abbonamento/Vetrina.tsx:197`, `src/pages/PianoPagine.tsx`, `src/i18n/it.ts:1479` | Riepilogo vicino al pulsante di acquisto, con prezzo, rinnovo e disdetta. La prova dichiara data di fine, niente carta e ritorno a Go. Invisibile a piani spenti. | Fatto nel blocco 2 |
| 13 | Disdetta online | ✅ | `src/lib/abbonamento.ts:65`, `src/pages/AbbonamentoPage.tsx:68`, `src/pages/EliminaAccountPage.tsx:21` | Pulsante «Gestisci o disdici su Google Play» per il titolare con abbonamento Play, con link diretto e riga sul ritorno a Go. | Fatto nel blocco 2 |
| 14 | Niente SLA/certificazioni false | ✅ | Ricerca in `src/i18n`, `hosting`, `docs/play` | Nessuna percentuale di uptime o certificazione. Tolto «al sicuro» da `vetrinaFoto` e `pwCopieCloudTesto`. | Fatto nel blocco 2 |
| 15 | Trader / Partita IVA | ➖ | `docs/legal/PRIMA-DEI-PAGAMENTI.md` §1-2 | Oggi non serve. Il promemoria è già scritto. | A mano, prima dei pagamenti |
| 16 | Licenze immagini e font | ✅ | `src/assets/`, `Icon and logo/`, `src/main.tsx` | Scritto `docs/licenze_asset.md`. Loghi e icone sono opera propria del progetto, su dichiarazione dell'utente. | Fatto nel blocco 2 |
| 17 | Licenze pacchetti | ⚠️ | `src/pages/LicenzePage.tsx`, `package-lock.json`, `functions/package-lock.json` | Schermata con tutti i pacchetti di app e functions, generata da `npm run licenze`. Nessuna GPL obbligatoria. `limiter` è MIT. `buffers@0.1.1` non dichiara una licenza. | A mano: controllare `buffers` |
| 18 | Loghi saloni con permesso | ⚠️ | `hosting/index.html`, `docs/play/scheda-*.md`, `Icon and logo/play-store/` | Nessun «usato da» né logo di saloni nel sito, nelle schede Play o nella grafica Play. Manca la clausola sul logo nei Termini. Screenshot Play non presenti nel repository: da guardare a mano. | Blocco 4 + a mano |

## Lacuna rimasta della voce 10

Nel salone `shared` non si scrive mai, quindi la disiscrizione lì non può funzionare. Per non mostrare un link rotto, le sue email non hanno il link né `List-Unsubscribe`. Se quel salone manda email ai clienti, serve una decisione su come far uscire chi lo chiede.

## Da cambiare nel blocco 4 (testi, non toccati qui)

**Termini**
- Base/Pro/Salone diventano Go/Plus/Salon, in tutte e 5 le lingue.
- Aggiungere «così com'è», appuntamenti persi, promemoria non consegnati, dati inseriti male, perdita dati senza dolo, 0 € per Go.
- Aggiungere la licenza sul logo: serve solo a generare listini e collage del salone.
- Dire che il DPA fa parte dell'accettazione, e citarlo nella casella di registrazione.
- Il punto 8 promette avviso 15 giorni prima: alzare la versione nel rispetto di quel termine.

**Privacy e DPA**
- Aggiungere tra i fornitori Google Places (ricerca indirizzi, `functions/src/indirizzi/places.ts`), Hostinger, ImprovMX, GitHub (aggiornamenti e APK).
- Dire che nessun dato va a servizi AI.
- Spiegare le preferenze email e la disiscrizione nate da questo blocco.
- Far confermare al professionista che gli inviti alla beta possano restare email dirette, senza consenso promozionale.
- Preparare la tabella per la Scheda sicurezza dei dati in `docs/play/`.

**Decisioni aperte**
- Nome del titolare: «Groomly Italia» nel piano, «Roberto Masala» nelle pagine.
- Statistiche accese di default o spente fino al consenso.

**Alzare la versione**
- Dopo aver cambiato i testi, alzare `VERSIONE_DOCUMENTI` e `DOCUMENTI_IN_VIGORE` in `src/lib/versioneLegale.ts`, poi pubblicare functions e nuovo APK.
- Le pagine in `docs/legal/*.html` e `hosting/privacy.html` sono copie esatte: si aggiornano insieme.

## Da fare a mano

- Firebase Console › Storage: controllare se Storage è attivo. Se lo è, copiare lì le regole di `storage.rules`.
- Play Console: controllare che gli screenshot non mostrino nomi o loghi di saloni veri.
- Prima dei pagamenti: passare a Trader e seguire `docs/legal/PRIMA-DEI-PAGAMENTI.md`.
- Far rileggere Termini, Privacy e DPA a un professionista prima di accendere Plus e Salon.
