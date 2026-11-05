# Blocco 4: metriche e testi legali

Data: 5/11/2026. Ramo: `claude/metriche-legale-348c15`. Fonti: Fase H di `docs/ADMIN-CONSOLE-PIANO.md`, voci 3, 5, 6, 7 e 11 di `Groomly_Compliance_Legale_PIANO.md` (fuori dal repository, in Download: quanto serve è riportato qui), `docs/legal/STATO-CONFORMITA.md`, nota del blocco 3.

Non è una consulenza legale. I testi vanno riletti da un professionista prima di accendere Plus e Salon.

## Perché

È l'ultimo blocco dei due piani. Roberto vuole capire come va l'app (quanti saloni arrivano, restano, si bloccano) e avere documenti legali veri e aggiornati. Metriche e testi escono insieme perché ogni cambiamento dei documenti obbliga tutti a riaccettare: così si riaccetta una volta sola.

## Obiettivi

- Pagina `/admin/metriche` con numeri calcolati di notte dal server, che esistono anche se nessuno dà il consenso.
- Analytics e Crashlytics nell'app, spenti finché il titolare non dice sì.
- Privacy, Termini e DPA riscritti in una sola nuova versione, in 5 lingue.
- Riaccettazione automatica alla data scelta, nel rispetto dei 15 giorni promessi dai Termini.
- Tabella per la Scheda sicurezza dei dati di Play Console.

## Fuori dal blocco

- Deploy, APK, merge: solo col via esplicito di Roberto.
- Accendere Plus o Salon, pagamenti, passaggio a Trader.
- Banner cookie sul sito: il sito non ha tracker, quindi non serve.
- Pagina separata `/sub-responsabili`: basta la sezione nella Privacy, come ammette il piano.

## Da non fare mai

- Toccare i dati di `salon/shared` o `salons/{uid di Laura}`. La statistica notturna non legge nulla di quei saloni, nemmeno i conteggi.
- Mandare a Google dati dei clienti finali, nomi di salone, email, uid o testo libero.
- Raccogliere qualcosa prima del sì, nemmeno al primo avvio.
- Far partire la riaccettazione prima dei 15 giorni dall'avviso.
- Scrivere nei testi cose che il codice non fa.

## Vincoli

- Contatto pubblico `info@groomlyapp.it`. Nessun indirizzo di casa, solo «Quartu Sant'Elena (CA)».
- Plus e Salon restano spenti. Interfaccia compatta, chiaro e scuro, 5 lingue.
- Modifiche piccole ai file della Console: il blocco 3 si sta pubblicando in parallelo.
- Le copie in `docs/legal/*.html` e `hosting/privacy.html` restano uguali alle pagine, come chiede il test esistente.

## Decisioni di Roberto

| Tema | Decisione |
|------|-----------|
| Statistiche | Analytics e Crashlytics spenti fino al consenso, con una domanda chiara una sola volta |
| Titolare | «Roberto Masala, Quartu Sant'Elena (CA)», più una riga: su Google Play lo sviluppatore compare come Groomly Italia |
| 15 giorni | Una sola APK, con la data di partenza scritta nel codice. La data si fissa al via della pubblicazione |
| Testi nei 15 giorni | Due date: per chi si registra da oggi i testi nuovi valgono subito, per chi ha già un account dalla data di partenza. I testi vecchi restano online a un loro indirizzo |
| Chi acconsente | Solo il titolare, e la raccolta avviene solo sul telefono del titolare. Soci e collaboratori non vedono nulla e da loro non si raccoglie nulla |
| Strumenti | Plugin `@capacitor-firebase/analytics` e `crashlytics` 8.6.0 |

## Strade considerate

| Strada | Pro | Contro | Esito |
|--------|-----|--------|-------|
| Plugin Firebase, raccolta spenta nel manifest | Cruscotti pronti e gratis, poco codice | Un fornitore in più da dichiarare, passi a mano in Console | **Scelta** |
| Solo Crashlytics | Meno fornitori e meno testo legale | Niente eventi d'uso | Scartata |
| Eventi propri su Firestore più Crashlytics | Dati nel proprio progetto | Codice da mantenere, scritture a pagamento | Scartata |

## Parte 1: consenso

**Dove sta.** Nuovo campo `accounts/{uid}.consensoMetriche = { attivo, at, fonte, versione }`, scritto dal server con la stessa forma di `emailPromo` (`src/lib/versioneLegale.ts`, `callImpostaEmailPromo`), con una riga in `accounts/{uid}/registro`. `fonte` è `tour`, `riaccettazione` o `account`.

*Scelta del costruttore:* il vecchio `settings.consensoMetriche` non serve più. Era del salone, non dice chi ha acconsentito e quando, e non è mai stato usato per raccogliere nulla. L'interruttore smette di leggerlo; il campo resta nei dati vecchi, ignorato, senza migrazione.

**Chi può raccogliere.** Una funzione pura `puoRaccogliere` in `src/lib/metriche.ts` è vera solo se tutte queste condizioni valgono:

- app nativa;
- `role === 'titolare'`;
- non admin (claim);
- non protetto da `accountNonEliminabile` (Laura, `shared`, VIP);
- piano diverso da VIP;
- email che non finisce in `@test.groomly`;
- `consensoMetriche.attivo === true`.

**Quando si chiede.** Una sola volta, a chi può raccogliere tranne il consenso, se `consensoMetriche` manca:

- titolari già presenti: subito dopo «Accetto» nella riaccettazione, dalla data di partenza;
- nuovi saloni: nel tour, dopo la schermata promo (`src/pages/TourPage.tsx`).

Chi non la vede in quei due momenti (tour spento o saltato, rete assente) non viene più interrotto: resta l'interruttore in Account, e la raccolta resta spenta. Due pulsanti con lo stesso peso, Sì e No. Anche il No si salva, così la domanda non torna. Chi è escluso non la vede mai.

**Cambiare idea.** L'interruttore in `src/pages/AccountPage.tsx` resta, visibile solo a chi può rispondere e ha già accettato la versione 2. Spegnerlo ferma subito eventi ed errori JavaScript su quel telefono; gli altri telefoni leggono la scelta quando si riapre l'app. Secondo il README del plugin, la raccolta dei crash nativi cambia solo dal prossimo avvio dell'app: vale anche per il sì. I testi lo dicono così, senza promettere «subito». *Scelta del costruttore.*

**Testo della domanda.** Dice in parole semplici cosa parte (uso dell'app, crash), che non ci sono dati dei clienti, che è facoltativo e che si può cambiare in Account. Sostituisce `metricheDettaglio`, che oggi dice «dati anonimi»: sono pseudonimi, non anonimi.

## Parte 2: raccolta nell'app

**Spento di base.** Nel manifest Android:

- `firebase_analytics_collection_enabled` = false
- `firebase_crashlytics_collection_enabled` = false
- `google_analytics_adid_collection_enabled` = false
- `google_analytics_ssaid_collection_enabled` = false
- `google_analytics_default_allow_ad_personalization_signals` = false
- permesso `com.google.android.gms.permission.AD_ID` tolto con `tools:node="remove"`

La Privacy dice «nessun identificatore pubblicitario» e deve restare vero. Vale per tutte le varianti, sito e Play. Il plugin Gradle di Crashlytics si applica alle stesse condizioni di `google-services`.

**Accensione.** Quando `puoRaccogliere` cambia, l'app chiama `setCollectionEnabled` di entrambi i plugin. Si spegne anche all'uscita dall'account. Al No, allo spegnimento e all'uscita si chiama `deleteUnsentReports`, così i crash tenuti sul telefono non partono. Da verificare sul telefono. Niente `setUserId` su Analytics e Crashlytics: i dati non sono collegati all'account.

**Plugin.** Si caricano con `import()` dinamico, solo su nativo. Vanno in `PLUGIN_NATIVI` di `vite.config.ts` e tra i `VIETATI` di `scripts/controlla-bundle-admin.mjs`. Il plugin Analytics dichiara `firebase` 12 come dipendenza facoltativa, il progetto ha la 13: primo passo del piano è verificare l'installazione, con `overrides` se serve.

**Eventi.** Tutti passano da `registra()` in `src/lib/metriche.ts`, con tipi chiusi e parametri scelti da elenchi fissi. Nessuna stringa libera.

| Evento | Parametri |
|--------|-----------|
| `salone_attivato` | nessuno |
| `cane_creato` | nessuno |
| `appuntamento_creato`, `appuntamento_completato`, `appuntamento_disdetto` | nessuno |
| `listino_condiviso`, `report_esportato` | nessuno |
| `vetrina_piano_vista`, `avvisami_toccato` | `piano` |
| `paywall_aperta` | `feature`, `fonte` (esiste già) |
| `beta_accettata`, `beta_rifiutata` | nessuno |
| `backup_eseguito` | `tipo`: auto o manuale |

User property: `piano` e `lingua`. *Scelte del costruttore:* `ruolo` è tolto, sarebbe sempre titolare. `sign_up` è tolto: la registrazione avviene prima del consenso, quindi non partirebbe mai, e il server conta già i saloni nuovi.

**Crash.** Crashlytics da solo vede i crash nativi, ma l'app è una WebView e gli errori veri sono in JavaScript. Il gestore globale degli errori manda anche quelli con `recordException`, **senza il messaggio dell'errore**: solo nome e righe dello stack. Il messaggio può contenere il nome di un cliente. Stessa regola per le chiavi personalizzate: nessuna.

## Parte 3: statistica notturna

**Function** `statisticheGiornaliere`, pianificata (europe-west1, fuso Europe/Rome, di notte). Scrive il giorno appena finito in `statsGiornaliere/{AAAA-MM-GG}`.

*Scelta del costruttore:* il piano dice `stats/giornaliere/{data}`, ma in Firestore quel percorso è una raccolta, non un documento. Rieseguirla sovrascrive lo stesso giorno, senza danni.

**Esclusi.** `shared`, il salone di Laura e `@test.groomly` si riconoscono da `accounts` e non si legge nulla di loro. Gli admin si riconoscono dal claim in Auth, prima di aprire il salone. Lo stato VIP sta solo in `salons/{id}/pro/main`: per gli altri saloni si legge quel documento, e se è VIP non si legge altro. *Scelta del costruttore.* Il documento salva quanti sono gli esclusi, non quali.

**Numeri salvati** (solo totali, nessun id o nome):

- saloni totali e nuovi del giorno (la data di registrazione viene da Auth: su `accounts` non è scritta);
- attivi a 1, 7 e 30 giorni, dagli accessi usati in `functions/src/beta/contatoriAdmin.ts`;
- saloni attivati: almeno un cane e almeno un appuntamento;
- appuntamenti del giorno, totale e media per salone attivo, con `count()` salone per salone;
- retention a 7 e 30 giorni per coorte settimanale di registrazione, ultime 12 settimane;
- «Avvisami» Plus e Salon;
- saloni esclusi.

La retention si stima dall'ultimo accesso: un salone conta come rimasto se è tornato dopo 7 o 30 giorni dalla registrazione. La pagina lo dice.

**Pulizia.** La stessa function cancella le righe di `adminLog` più vecchie di 24 mesi, così la Privacy può dare un tempo vero. *Scelta del costruttore.*

**Regole.** `statsGiornaliere`: lettura solo admin, scrittura mai dal client, con test delle regole.

## Parte 4: pagina Metriche

Rotta in `src/app/adminRoutes.tsx`, `PERCORSO_METRICHE` in `src/lib/percorsoAdmin.ts`, voce in `altre` di `useVociAdmin` (`src/components/admin/AdminLayout.tsx`). Aggiornare il test del rimando in `src/app/router.admin.test.tsx`. Link Analytics e Crashlytics in `LINK` di `src/pages/admin/SistemaPage.tsx`.

Contenuto:

- card con gli ultimi numeri e il confronto col periodo prima;
- grafico a barre 30/90 giorni, nello stile di `src/components/earnings/EarningsChart.tsx`;
- tabella delle coorti;
- link a Crashlytics e Analytics al posto del conteggio crash, perché il server non può leggerlo;
- esportazione Excel, con la libreria già usata da `src/lib/registroXlsx.ts`;
- stato vuoto: finché la prima notte non è passata, la pagina lo dice.

Funziona a 1280 e 375 px, chiaro e scuro, 5 lingue.

## Parte 5: testi legali

Una sola nuova versione: **Privacy 3, Termini 2, DPA 2**. In ogni lingua, in cima: versione e la riga «per chi si registra da oggi vale subito, per chi ha già un account vale dal…», con il link alla versione precedente.

**Archivio.** I testi attuali, in 5 lingue, restano online a indirizzi propri: `/privacy/v2/`, `/termini/v1-1/`, `/dpa/v1/`. Sono copie delle pagine di oggi, con una riga che dice che sono superate e per chi valgono ancora. Non si indicizzano.

 In tutte le pagine la riga del titolare con Groomly Italia.

**Privacy**
- Dati nuovi: messaggi ad Assistenza e suggerimenti, risposte anche via email, avvisi e comunicazioni (`assistenza`, `comunicazioni`, `accounts/{uid}/avvisi`), registro dei consensi.
- Statistiche d'uso e crash: facoltativi, solo col consenso del titolare, solo sul suo telefono, base giuridica consenso. Conteggi notturni aggregati: legittimo interesse.
- Fornitori: si aggiungono Google Analytics, Crashlytics, Google Places, Hostinger, ImprovMX, GitHub. Per ognuno scopo e luogo.
- Accesso admin: chi gestisce Groomly entra in una Console riservata. Vede email, nome del salone, piano, ultimo accesso, conteggi e messaggi di assistenza. Non apre schede o clienti del salone. Le azioni restano in un registro. Da riscontrare sul codice prima di scriverlo.
- Conservazione: Assistenza e avvisi fino alla cancellazione dell'account o del salone; registro della Console 24 mesi; Analytics 2 mesi e Crashlytics 90 giorni, una volta impostati a mano; statistiche aggregate senza limite, perché non hanno dati personali.
- Nessun dato va a servizi di intelligenza artificiale.
- Preferenze email: consenso promozionale, disiscrizione, email di servizio.
- Se cambia in modo importante: avviso nell'app con 15 giorni di anticipo.

**Termini**
- Base/Pro/Salone diventano Go/Plus/Salon.
- Servizio «così com'è», appuntamenti persi, promemoria non consegnati, dati inseriti male, perdita di dati non dovuta a dolo, 0 € per Go. Restano salvi dolo e colpa grave e i diritti del consumatore.
- Sospensione dell'account: controllare che cosa fa davvero il codice (`src/components/AccessoSospeso.tsx`) e scrivere quello.
- Licenza sul logo: solo per generare listini e collage del salone.
- Il DPA fa parte dell'accettazione. Il modello di informativa resta linkato.
- Punto 6: togliere «i dati al sicuro», è una promessa.

**DPA**
- Sub-responsabili aggiornati, solo quelli che toccano dati dei clienti del salone. Per gli altri rimanda alla Privacy.
- Accesso admin e assistenza: nessun accesso ai dati dei clienti, salvo richiesta del salone se il codice lo prevede.
- Modello di informativa per i clienti aggiornato se cambia l'elenco.

**App**
- Casella di registrazione in `src/pages/LoginPage.tsx`: aggiungere il link al DPA, in 5 lingue.
- `riaccTesto`: dire che è cambiato e che cosa si accetta.
- Il DPA è fra il salone e Groomly: lo accetta solo il titolare. Soci e collaboratori accettano Privacy e Termini, vedono solo quei due pulsanti, e il registro salva solo quei due documenti. *Scelta del costruttore.*

## Parte 6: riaccettazione

In `src/lib/versioneLegale.ts`, alla fine e una sola volta: `VERSIONE_DOCUMENTI = 2`, `DOCUMENTI_IN_VIGORE = { termini: '2', privacy: '3', dpa: '2' }`, e nuova costante `RIACCETTA_DAL`.

`deveRiaccettare` è vera solo da quella data. Prima, chi c'è già entra normalmente. Chi si registra prima accetta subito i testi nuovi e salva la versione 2, quindi nel tour può già rispondere sulle statistiche. Per chi ha già un account, la domanda e l'interruttore arrivano solo dopo aver accettato la versione 2.

**Account senza riga sul server.** Oggi `RiaccettaDocumenti` fa una chiamata silenziosa per chi ha `mancaSuServer`, e quella chiamata manda `VERSIONE_DOCUMENTI`. Con la versione 2 questi account risulterebbero aver accettato testi mai visti. La chiamata silenziosa deve mandare la versione già salvata, e `registraAccettazione` deve accettare quella, senza alzarla. *Scelta del costruttore.*

La data sul ramo è provvisoria. Al via si cambia in un colpo solo con uno script in `scripts/`, che aggiorna la costante e la data nelle pagine in 5 lingue e nelle copie. Un test controlla che coincidano.

**Sequenza al via**
1. Fissare la data: almeno 15 giorni dopo il giorno dell'avviso.
2. Pubblicare pagine e functions, poi APK.
3. Mandare l'avviso da Comunicazioni, con email di servizio, in 5 lingue. Il testo pronto va in `docs/legal/`.
4. Alla data, riaccettazione e domanda partono da sole.

La Console deve essere già pubblicata. L'avviso copre anche il DPA, che chiede di avvisare prima di nuovi sub-responsabili.

**Limite noto.** Chi resta con una APK vecchia non vede la riaccettazione. L'avviso globale gli arriva comunque. Da riportare nello stato della conformità.

Laura vedrà la riaccettazione come tutti: la sua risposta scrive solo sul suo account, non nel salone.

## Parte 7: documenti

- `docs/play/scheda-sicurezza-dati.md`: tabella da copiare in Play Console, coerente con la Privacy. Dati raccolti, condivisi, facoltativi, finalità. Comprende identificatori del dispositivo, interazioni, crash e diagnostica come facoltativi.
- `docs/legal/STATO-CONFORMITA.md`: tabella finale.
- `PROGRESS.md` e `docs/GUIDA-ADMIN-MANAGER.md` per la pagina Metriche.

## Test

- Unità: `puoRaccogliere` su ogni esclusione, `registra`, `deveRiaccettare` prima e dopo la data.
- Function: esclusi mai letti, conteggi, coorti, riesecuzione, pulizia di `adminLog`, su emulatore.
- Regole Firestore per `statsGiornaliere` e per il campo `consensoMetriche`.
- Interfaccia: domanda dopo la riaccettazione, nel tour, interruttore, pagina Metriche.
- Testi: test che in 5 lingue non restino Base/Pro/Salone, che versione e data coincidano, che le copie siano uguali, che non compaiano email personali.
- Bundle admin pulito con `scripts/controlla-bundle-admin.mjs`.
- `npm test`, `npm run test:rules`, `npm --prefix functions test`, `test:360` se praticabile. Dati di prova cancellati alla fine.

## Da fare a mano

- Collegare Google Analytics a `groomly-3128b`, conservazione 2 mesi, segnali Google e pubblicità spenti.
- Attivare Crashlytics.
- Compilare la Scheda in Play Console.
- Far rileggere i testi a un professionista prima di accendere Plus e Salon.

## Lasciato al costruttore

Nomi delle funzioni e dei file nuovi, forma della chiamata della pagina Metriche (callable o lettura diretta), orario esatto della function, grafica delle card nel rispetto dello stile esistente.
