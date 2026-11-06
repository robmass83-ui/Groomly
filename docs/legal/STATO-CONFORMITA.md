# Stato della conformità legale

Controllo del 5/11/2026, aggiornato a fine blocco 4 sul ramo `claude/metriche-legale-348c15`, non ancora pubblicato. I testi vanno riletti da un professionista prima di accendere Plus e Salon. Non è una consulenza legale.
Fonte delle voci: `Groomly_Compliance_Legale_PIANO.md`.

Legenda: ✅ presente · ⚠️ parziale · ❌ mancante · ➖ non applicabile.
La colonna **Dove si fa** dice cosa resta e chi lo fa.

| # | Voce | Stato | File / dove | Note | Dove si fa |
|---|------|-------|-------------|------|------------|
| 1 | Eliminazione account (app + web) | ✅ | `src/pages/EliminaAccountPage.tsx`, `functions/src/piano/eliminaAccount.ts`, `pulisciSalone.ts`, `emailEliminazione.ts`, `hosting/elimina-account/` | Conferma con password. Toglie Auth, salone, Storage e raccolte. Email di conferma in 5 lingue, ma è grafica semplice, non lo stile `postaHtml`. Dal web la richiesta è manuale, via info@. Il salone `shared` e il VIP sono esclusi. | Nulla di obbligatorio |
| 2 | Esportazione dati | ✅ | `src/lib/backupCompleto.ts`, `backupZip.ts`, `registroXlsx.ts`, `src/data/firebase/backupCollect.ts`, `src/pages/AccountPage.tsx:486` | Il backup completo comprende ora richieste, lista d'attesa, email in coda e account, in Excel e nello ZIP. Il collaboratore scarica il proprio account. | Fatto nel blocco 2 |
| 3 | Privacy Policy + Scheda sicurezza dati | ✅ | `hosting/privacy/`, `docs/play/scheda-sicurezza-dati.md`, `src/pages/LegalePage.tsx` | Privacy versione 3 in 5 lingue: Console, Assistenza, statistiche, conservazione. La tabella della Scheda è pronta. | A mano: compilare la Scheda |
| 4 | Accettazione alla registrazione | ✅ | `src/pages/LoginPage.tsx:182`, `src/lib/schemas`, `src/data/firebase/client.ts:2452` | Casella obbligatoria, versione e data del server in `accounts/{uid}`, storico in `accounts/{uid}/registro`. Schermata di riaccettazione pronta: compare quando il blocco 4 alza `VERSIONE_DOCUMENTI`. | Fatto nel blocco 2 |
| 5 | Termini con limite di responsabilità | ✅ | `hosting/termini/` (versione 2) | Go, Plus e Salon, «così com'è», appuntamenti persi, promemoria non consegnati, dati inseriti male, 0 € per Go. La sospensione resta un diritto scritto: il codice sospende solo collaboratori e soci quando manca il piano, non c'è un comando nella Console. | Professionista |
| 6 | DPA per i saloni | ✅ | `hosting/dpa/` (versione 2), `src/pages/LoginPage.tsx`, `src/components/legale/RiaccettaDocumenti.tsx` | Fa parte dei Termini e la casella lo cita. Lo accetta solo il titolare: soci e collaboratori accettano Privacy e Termini. | Professionista |
| 7 | Elenco sub-responsabili | ✅ | `hosting/privacy/` (sezione 4), `hosting/dpa/` (sezione 5) | Nella Privacy tutti i fornitori con scopo e luogo, compresi Analytics, Crashlytics, Google Places, Hostinger, ImprovMX e GitHub. Nel DPA solo chi tocca dati dei clienti del salone. | Professionista: confermare i luoghi |
| 8 | Nessun training AI | ✅ | `package.json`, `functions/package.json`, `hosting/privacy/` | Nessun servizio AI nel codice, e la Privacy ora lo dice. | Nulla |
| 9 | Regole sicurezza / chiavi | ⚠️ | `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`, `functions/src/index.ts:92` | Firestore: ogni salone è separato e `shared` è in sola lettura. Chiavi solo in `defineSecret`; l'`AIza` in `hosting/azione/` è la chiave web pubblica di Firebase. Test delle regole Firestore verdi (24/24). **Storage:** per scelta del 13/10/2026 foto e listino stanno in Firestore e Storage non si pubblica; la build non ha un bucket configurato, quindi i tentativi di copia in `users/{uid}/` non arrivano a destinazione. `storage.rules` è ora nel repository con 4 test verdi, pronto se Storage si attiverà, ma `firebase.json` continua a non pubblicarlo. | Nulla: Storage non è attivo, controllato il 6/11/2026 |
| 10 | Disiscriviti nelle email | ✅ | `functions/src/piano/silenzioEmail.ts`, `inviaCoda.ts`, `src/i18n/emailHtml.ts:100`, `hosting/azione/`, `src/pages/DogPage.tsx:1537` | La disiscrizione vale per indirizzo in tutto il salone, con interruttore nella scheda e link anche nel posto libero. Dopo la disiscrizione dal link il salone non può riaccendere: torna solo il cliente, con «Ho cambiato idea» sulla stessa pagina. Consenso promozionale chiesto nel tour, spento di default, con «Disiscriviti». Resta una lacuna: i clienti del salone `shared`, vedi sotto. | Fatto nel blocco 2 |
| 11 | Tracker solo dopo consenso / banner cookie | ✅ | `android/app/src/main/AndroidManifest.xml`, `src/lib/metriche.ts`, `src/lib/metricheNative.ts`, `src/components/legale/DomandaStatistiche.tsx` | Analytics e Crashlytics spenti nel manifest, accesi solo col sì del titolare e solo sui suoi telefoni. Esclusi admin, VIP, I Pelosetti e account di test. `AD_ID` tolto. Sito senza tracker, quindi niente banner. reCAPTCHA è spento: se si accende va rivisto. | Nulla: Analytics collegato il 6/11/2026, Crashlytics parte al primo avvio di una build con l'SDK |
| 12 | Rinnovo automatico dichiarato | ✅ | `src/components/abbonamento/Vetrina.tsx:197`, `src/pages/PianoPagine.tsx`, `src/i18n/it.ts:1479` | Riepilogo vicino al pulsante di acquisto, con prezzo, rinnovo e disdetta. La prova dichiara data di fine, niente carta e ritorno a Go. Invisibile a piani spenti. | Fatto nel blocco 2 |
| 13 | Disdetta online | ✅ | `src/lib/abbonamento.ts:65`, `src/pages/AbbonamentoPage.tsx:68`, `src/pages/EliminaAccountPage.tsx:21` | Pulsante «Gestisci o disdici su Google Play» per il titolare con abbonamento Play, con link diretto e riga sul ritorno a Go. | Fatto nel blocco 2 |
| 14 | Niente SLA/certificazioni false | ✅ | Ricerca in `src/i18n`, `hosting`, `docs/play` | Nessuna percentuale di uptime o certificazione. Tolto «al sicuro» da `vetrinaFoto` e `pwCopieCloudTesto`. | Fatto nel blocco 2 |
| 15 | Trader / Partita IVA | ➖ | `docs/legal/PRIMA-DEI-PAGAMENTI.md` §1-2 | Oggi non serve. Il promemoria è già scritto. | A mano, prima dei pagamenti |
| 16 | Licenze immagini e font | ✅ | `src/assets/`, `Icon and logo/`, `src/main.tsx` | Scritto `docs/licenze_asset.md`. Loghi e icone sono opera propria del progetto, su dichiarazione dell'utente. | Fatto nel blocco 2 |
| 17 | Licenze pacchetti | ⚠️ | `src/pages/LicenzePage.tsx`, `package-lock.json`, `functions/package-lock.json` | Schermata con tutti i pacchetti di app e functions, generata da `npm run licenze`. Nessuna GPL obbligatoria. `limiter` è MIT. `buffers@0.1.1` non dichiara una licenza. | A mano: controllare `buffers` |
| 18 | Loghi saloni con permesso | ⚠️ | `hosting/termini/`, `hosting/index.html`, `docs/play/scheda-*.md` | Clausola sul logo aggiunta ai Termini. Nessun «usato da» nel sito o nelle schede. Screenshot Play non presenti nel repository. | A mano: guardare gli screenshot |

## Lacuna rimasta della voce 10

Nel salone `shared` non si scrive mai, quindi la disiscrizione lì non può funzionare. Per non mostrare un link rotto, le sue email non hanno il link né `List-Unsubscribe`. Se quel salone manda email ai clienti, serve una decisione su come far uscire chi lo chiede.

## Limiti rimasti

- **APK vecchie.** Chi non aggiorna non vede la riaccettazione. Riceve però l'avviso via email, e al primo aggiornamento gli viene chiesta.
- **Regole di `salon/shared`.** Il claim admin può ancora leggere quel resto in sola lettura. La Console non lo mostra, ma la Privacy dice cosa mostra la Console, non cosa potrebbero leggere le regole. Da chiudere appena `salon/shared` non serve più.
- **Domanda sulle statistiche.** Compare dopo la riaccettazione e nel tour. Con il tour spento o saltato un salone nuovo non la vede: resta l'interruttore in Account e la raccolta spenta.
- **Eventi automatici di Analytics.** Chi spegne su un telefono ferma gli altri alla riapertura: da verificare sul telefono se qualche evento automatico parte prima dello spegnimento.
- **Inviti alla beta.** Far confermare al professionista che possano restare email dirette, senza consenso promozionale.

## Alzare la versione

Fatto in `src/lib/versioneLegale.ts`. La data è provvisoria: la sequenza del via è in `docs/legal/AVVISO-DOCUMENTI.md`.

## Da fare a mano

Fatti il 6/11/2026: Google Analytics collegato a `groomly-3128b`, con conservazione a 2 mesi, segnali Google e personalizzazione degli annunci spenti. Crashlytics non ha un pulsante: parte al primo avvio di una build con l'SDK. Storage non è attivo, quindi non c'è nessuna regola da copiare.

- Play Console: compilare la Scheda da `docs/play/scheda-sicurezza-dati.md`.
- Play Console: controllare che gli screenshot non mostrino nomi o loghi di saloni veri.
- Prima dei pagamenti: passare a Trader e seguire `docs/legal/PRIMA-DEI-PAGAMENTI.md`.
- Far rileggere Termini, Privacy e DPA a un professionista prima di accendere Plus e Salon.
