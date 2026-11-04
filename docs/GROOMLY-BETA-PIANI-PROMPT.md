# Groomly — Programma Beta Plus/Salone e abbonamenti «pronti al clic»

Prompt per Claude Code. Preparato il 3/11/2026 dopo aver letto il codice attuale. Organizzato **per fasi, in ordine di priorità**. Ogni fase raggruppa il lavoro che conviene fare insieme.

Usa /superpowers. Fai il **/brainstorm** sull'insieme, scegli tu le opzioni consigliate e annotale in `docs/DECISIONI-AUTOMATICHE.md`. Scrivi una spec unica in `docs/superpowers/specs/` e un piano diviso nelle stesse fasi in `docs/superpowers/plans/`. Poi **esegui le fasi in ordine, fino in fondo, in autonomia**.

Ogni fase finisce con:
- test verdi;
- app funzionante e rilasciabile;
- aggiornamento di `PROGRESS.md`.

Non iniziare una fase se la precedente non è chiusa.

⛔ **Unica eccezione all'autonomia: la FASE 1B (proposte di design).** Lì ti fermi, mi mostri le proposte e **aspetti la mia scelta** prima di scrivere il codice delle interfacce. Tutto il resto lo decidi tu.

---

## Perché

Non ho ancora la Partita IVA. Groomly uscirà **gratis** su Google Play e per ora **nessuno deve poter pagare**.

Prima voglio capire quanti saloni vogliono davvero Plus e Salone. Per farlo:
- invito saloni scelti da me a provarli gratis per un periodo (**beta**);
- in cambio chiedo **feedback**;
- al lancio a pagamento avranno un **prezzo di favore**.

Quando i numeri ci saranno, faccio solo le cose esterne al codice:
1. Partita IVA;
2. profilo pagamenti;
3. prodotti nella Play Console.

Poi **accendo gli abbonamenti con un clic dalla pagina admin**. Niente codice da scrivere, nessuna release obbligatoria.

**Priorità:** prima posso iniziare la beta (fasi 1–3), poi il resto (fasi 4–5). Dopo la fase 3 devo poter pubblicare l'app e iniziare a invitare saloni, anche se la fase 4 non è ancora fatta.

## Cosa c'è già (verificalo e riusalo, non rifarlo)

**Config globale**
- `config/globale` con `mostraPiani` e `abbonamentiAttivi`.
- La leggono tutti (`listenDocumentoPiano`), il client non la scrive (regola `write: false`).
- Il modello per scriverla da operatore è la callable `impostaTourBenvenuto`.

**Acquisto spento**
- `src/lib/billing.ts` → `compra()` risponde `spento`.
- `Vetrina.tsx` mostra «In arrivo», `PaywallSheet.tsx` mostra **Avvisami**.
- RevenueCat c'è solo lato server (`functions/src/piano/rcWebhook*.ts`). Il pacchetto client `@revenuecat/purchases-capacitor` **non è installato**.

**Avvisami**
- `scriviInteresse` scrive `salons/{id}/interesse/{feature}`, leggibile solo dal titolare.
- **Nessun conteggio in admin.**

**Piano**
- `salons/{id}/pro/main` con `piano`, `stato`, `fonte` (`play` | `prova` | `omaggio` | `manuale`), `scadeIl`, `provaUsata`, `enabled`.
- Logica in `src/lib/piano.ts` e `usePiano`. Scrittura solo da funzioni (`scriviPiano.ts`).

**Prove**
- `avviaProva`: self-service, titolare, una volta sola.
- Azione `prova` di `impostaPianoManuale`: «Regala 30 giorni».

**Scadenze**
- `chiudiProve`, funzione oraria: riporta a Go ogni piano con `scadeIl` passata. Non tocca i piani senza scadenza.

**Admin**
- `UsersPage.tsx`: tour, Toelettature (badge, Attiva Plus/Salone, Regala 30 giorni, Elimina), coda Suggerimenti con esportazione.
- `impostaPianoManuale` scrive `salons/{id}/avvisi/piano` e manda la mail Brevo.

**Avvisi**
- Globali: `avvisiSistema`. Per salone: `salons/{id}/avvisi/piano`.
- Pagine: `NotificationsPage`, `AvvisiSistemaPage`.

**Pagamenti**
- `docs/legal/PRIMA-DEI-PAGAMENTI.md`: prodotti e prezzi, offerta fondatori, annuncio **15 giorni prima** promesso dai termini.

## Vincoli assoluti (valgono in tutte le fasi)

- **`salon/shared` (salone di Laura) non si tocca mai**: né test, né migrazioni, né script. I VIP (`fonte: 'omaggio'`) restano VIP.
- Piano, beta, scadenze, inviti e config si scrivono **solo da Cloud Functions**, e solo per operatori autorizzati (`operatoreAutorizzato` / `isOperator`).
- Con `abbonamentiAttivi = false`: nessun acquisto possibile e SDK di pagamento non inizializzato.
- Quando un piano o una beta finisce, **i dati restano**: le funzioni si bloccano, non si cancella niente.
- Nessun segreto nel client.
- Rispetta le spec esistenti, in particolare `2026-11-02-medie-piani-design.md` e `2026-11-01-a2-prova-gratis…`.

---

# FASE 1 — Fondamenta (priorità massima, blocca tutto il resto)

Tutto lato dati, regole e server: va fatto insieme perché le fasi successive ci si appoggiano.

**1.1 Nuova fonte `beta`**
- Aggiungila al piano, per distinguere i beta tester da prove, omaggi e manuali.
- Gestiscila ovunque si legge `fonte`: `statoPiano`, `provaConcessa`/`FONTI_NON_PROVA`, `decisioneBypass`, `chiudiProve`, badge.
- Se il brainstorm trova di meglio (es. `manuale` più un campo `beta`), scegli e spiega.

**1.2 Traccia permanente**
- Campi tipo `exBeta`, `betaPiano`, `earlyAdopter` che restano anche dopo il ritorno a Go.
- `campiBase`/`chiudiProve` non devono cancellarli.

**1.3 Modello inviti beta**
- Documento per salone: piano, durata, messaggio, data e scadenza dell'invito.
- Stato: `invitato` → `accettato` | `rifiutato` | `scaduto` | `revocato`.

**1.4 Nuovi campi in `config/globale`**
- `provaSelfService` (default **false**);
- `showPrezziInBeta` (default **false**);
- testo dell'offerta early adopter;
- configurazione RevenueCat: chiave pubblica SDK, ID offering;
- data dell'annuncio pagamenti.

Tutti scritti da **una callable operatore**, sul modello di `impostaTourBenvenuto`.

**1.5 ID fissi decisi ora**
- ID dei prodotti Play (Plus mensile e annuale, Salone mensile e annuale, posto extra), coerenti con `PRIMA-DEI-PAGAMENTI.md`.
- Entitlement `plus` e `salone`, ID dell'offering.
- Scrivili in codice e in `PRIMA-DEI-PAGAMENTI.md`.

**1.6 Prova self-service spenta**
- `avviaProva` e le vetrine rispettano `provaSelfService`.
- Il «Regala 30 giorni» dell'admin resta.

**1.7 Regole Firestore**
- Inviti, feedback e config come da vincoli.
- Lettura degli «Avvisami» aggregabile dagli operatori, tramite funzione o regola: scegli tu.

**Fatto quando:** i test delle regole e delle funzioni passano, l'app si comporta come oggi a parte la prova self-service spenta, e `salon/shared` non è toccato.

---

# FASE 1B — Proposte di design: ⛔ STOP, aspetta la mia scelta

Prima di scrivere **qualsiasi** interfaccia delle fasi 2 e 3, preparami le proposte. Si può fare in parallelo alla fase 1, perché non tocca il codice.

## Cosa cambia nell'area amministratore

L'attuale «Utenti Groomly» va **rifatta** e si chiamerà **Admin Manager**, anche in inglese e spagnolo. Il nome cambia ovunque: voce nelle Impostazioni, titolo, percorso, testi.

Deve diventare una vera console da amministratore, ordinata e chiara, che raccolga:
- **Panoramica:** i contatori principali a colpo d'occhio, cioè saloni, attivi, piani, beta, Avvisami, feedback, «pagheresti?»;
- **Toelettature:** lista con filtri, selezione multipla e dettaglio salone con tutti i pulsanti (invita alla beta, estendi, revoca, early adopter, Attiva Plus/Salone, Regala 30 giorni, Elimina);
- **Programma beta:** inviti per stato, con le azioni;
- **Feedback beta:** lista, riepilogo delle risposte, esportazione;
- **Suggerimenti:** la coda attuale;
- **Impostazioni piani e pagamenti:** interruttori (`mostraPiani`, `provaSelfService`, `showPrezziInBeta`, più avanti `abbonamentiAttivi` con il controllo ✅/❌), testo dell'offerta early adopter, configurazione RevenueCat, annuncio 15 giorni;
- il **Tour di benvenuto** già esistente.

Le funzioni che ci sono oggi non devono sparire: si riorganizzano.

## Cosa voglio vedere: 5 proposte di design

**5 proposte diverse tra loro**, non variazioni di colore. Cambiano l'impostazione: per esempio dashboard a schede, menu a sezioni, tab in alto, lista con pannello di dettaglio, stile «centro di controllo».

Ogni proposta copre:
1. la **home dell'Admin Manager** (panoramica e navigazione tra le sezioni);
2. la **lista Toelettature** con filtri e selezione multipla;
3. il **dettaglio di un salone** con **tutti i pulsanti** e la loro disposizione (azioni principali, secondarie, pericolose come Elimina);
4. la **sezione Programma beta**, con il dialogo per invitare: piano, durata, messaggio;
5. la **sezione Feedback beta**, con il riepilogo delle risposte;
6. le **Impostazioni piani e pagamenti**, con gli interruttori e il controllo pre-accensione ✅/❌.

Nelle stesse 5 proposte, mostrami anche **cosa vede la toelettatura**:
- l'avviso e la card dell'invito beta;
- la pagina invito con Partecipo / No grazie;
- il badge **BETA** con i giorni rimanenti, nella scheda «Il tuo piano» e nella pagina Abbonamento;
- il **modulo feedback**;
- la domanda di fine beta;
- le vetrine Plus e Salone in modalità «In arrivo — Avvisami».

## Come presentarle

- Una pagina HTML statica per proposta, con schermate a misura di telefono (360–400 px), affiancate e scorribili, nello stile attuale di Groomly: dimensioni compatte, Plus viola, Salone oro, VIP nero e oro, componenti esistenti. Mostra almeno le schermate principali anche in tema scuro.
- Dati finti realistici: 15–20 saloni, inviti in stati diversi, qualche feedback.
- Salvale in `docs/superpowers/specs/` come le vetrine fatte in passato (es. `…-admin-manager-proposta-1.html` … `-5.html`) e un indice `…-admin-manager-proposte.html` che le apre tutte.
- Per ogni proposta, 3–4 righe: idea, punti di forza, punti deboli, quale consigli tu e perché.

Poi **fermati** e chiedimi quale scegliere. Posso anche dirti di unire parti di proposte diverse. Solo dopo la mia risposta scrivi la spec di design definitiva e passi alla fase 2.

**Fatto quando:** le 5 proposte e l'indice sono in docs, e io ho scelto.

---

# FASE 2 — Beta su invito, dall'inizio alla fine (priorità 1)

Server, admin e app del salone insieme: è un unico flusso e va collaudato tutto intero.

**2.1 Funzioni server**
- invita (uno o più saloni);
- accetta;
- rifiuta, con motivo;
- revoca, con avviso;
- estendi;
- scadenza automatica degli inviti non accettati (es. 14 giorni).

Il piano si accende **solo all'accettazione**:
- `piano` pro o salone, `stato: 'attivo'`, `fonte: 'beta'`, `scadeIl` = fine beta;
- Salone con 3 posti, come il bypass.

Alla scadenza ci pensa `chiudiProve`.

**2.2 Admin Manager, secondo la proposta scelta nella fase 1B**
- Rifai l'area amministratore come **Admin Manager**, che sostituisce «Utenti Groomly». Riusa la logica di `UsersPage.tsx` e non perdere nessuna funzione esistente (tour, Suggerimenti, esportazioni, Elimina con conferma a parola).
- Lista Toelettature con filtri (piano, fonte, stato beta, attivi/inattivi) e **selezione multipla**.
- Pulsanti **Invita alla beta Plus** e **Invita alla beta Salone**, con durata 30/60/90 giorni o personalizzata e messaggio facoltativo.
- Dettaglio salone:
  - piano effettivo e **perché** (VIP / play / prova / beta / manuale / Go);
  - scadenza e storico;
  - estendi, revoca, early adopter;
  - restano «Attiva Plus/Salone», «Regala 30 giorni» ed «Elimina».
- Interruttori `mostraPiani`, `provaSelfService`, `showPrezziInBeta`. Testo dell'offerta early adopter.
- Solo gli operatori vedono l'Admin Manager, come oggi per «Utenti Groomly».

**2.3 App del salone**, secondo la proposta scelta nella fase 1B
- **Senza invito:** Go come oggi; vetrine con «In arrivo — Avvisami»; niente prezzi salvo flag. Il tap conferma «Ti avviseremo appena disponibile».
- **Invito ricevuto:** solo il titolare lo vede. Avviso nella pagina avvisi con badge sulla campanella, card evidenziata in Home o in Impostazioni, email Brevo nello stile Groomly in it/en/es.
- **Pagina invito:**
  - cosa include e per quanto;
  - **gratis, nessun pagamento, nessun rinnovo automatico**;
  - impegno a lasciare feedback;
  - offerta early adopter;
  - funzioni che possono cambiare;
  - **Partecipo** con spunta, **No grazie** con motivo (non mi serve / troppo complicato / non pagherei / altro).
- **Durante la beta:** badge **BETA** e giorni rimanenti nella scheda «Il tuo piano» e nella pagina Abbonamento. Avvisi di fine a 7 giorni e a 1 giorno.
- **Fine:** ritorno a Go, dati intatti.

**Fatto quando:** invito → accettazione → funzioni attive → scadenza → Go con dati e traccia `exBeta` intatti, collaudato sugli emulatori. Collaudati anche rifiuto, revoca, estensione, invito multiplo e invito scaduto.

---

# FASE 3 — Feedback e misure (priorità 2)

Raccolta e lettura dei dati: si fanno insieme perché i contatori leggono quello che i form scrivono.

Interfacce secondo la proposta scelta nella fase 1B.

**3.1 Modulo feedback beta (1–2 minuti)**
- voto da 1 a 5;
- per ogni funzione del piano: utile / poco utile / non usata, con l'elenco della Vetrina;
- cosa non va;
- cosa manca;
- **«Pagheresti?»** sì / forse / no, e **quanto al mese**: meno di 5 €, 5–10 €, 10–20 €, più di 20 €;
- consenso a essere ricontattato.

Salvato con salone, piano, data e versione dell'app, con limiti come i suggerimenti.

**3.2 Punti di raccolta**
- Pulsante sempre visibile «Invia feedback beta».
- Promemoria negli avvisi dopo circa 7 giorni e a 7 giorni dalla fine.
- Domanda finale a fine beta: «Vorresti continuare a pagamento?».

**3.3 Contatori nella Panoramica dell'Admin Manager**
- saloni totali e attivi a 7 e 30 giorni;
- saloni per piano e per fonte;
- inviti per stato;
- **Avvisami** per funzione e per piano;
- feedback ricevuti;
- risposte a «pagheresti?».

**3.4 Lettura dei feedback in admin**
- Filtri per piano e salone, riepilogo delle risposte chiave, esportazione Excel come i Suggerimenti.
- Decidi tu se riusare la coda Suggerimenti con categoria `beta` o fare una raccolta dedicata: scegli la più leggibile per me.

**Fatto quando:** un feedback inviato compare in admin e nei contatori. Gli «Avvisami» vengono contati. L'esportazione funziona.

➡️ **Dopo la fase 3 la beta è utilizzabile: segnalamelo nel riepilogo.**

---

# FASE 4 — Abbonamenti «pronti al clic» (priorità 3)

Tutto il codice d'acquisto, spento. Va fatto insieme perché il controllo pre-accensione verifica tutti i pezzi.

**4.1 Pacchetto e permesso**
- `@revenuecat/purchases-capacitor` e permesso di fatturazione nell'AAB `play`.
- L'SDK si inizializza **solo** con `abbonamentiAttivi = true` e chiave presente in config.

**4.2 Flusso completo**
- acquisto;
- ripristino acquisti;
- collegamento utente RevenueCat ↔ salone;
- grazia, disdetta e scadenza (spec «medie piani»);
- webhook esistente che aggiorna `pro/main`;
- un salone in **beta** che compra passa a Play senza buchi;
- `earlyAdopter` con offerta riservata (aggancio per un'offerta Google Play con idoneità decisa dallo sviluppatore, configurabile poi dalla Play Console).

Se chiave o prodotti mancano: «Abbonamento momentaneamente non disponibile», nessun errore.

**4.3 Annuncio 15 giorni prima**
- Azione admin: avviso a tutti più email a ex beta ed early adopter.
- La data viene salvata in config.

**4.4 Controllo pre-accensione**

L'interruttore `abbonamentiAttivi` mostra una lista di verifiche ✅/❌:
- chiave SDK presente;
- offering con tutti i prodotti attesi;
- webhook attivo, con data dell'ultimo evento;
- annuncio inviato da almeno 15 giorni;
- conferma manuale «ho Partita IVA e profilo pagamenti».

Con qualcosa di rosso è bloccato. Con tutto verde: doppia conferma e **clic**.

**4.5 Spegnimento**
- Rimette tutto come in beta.
- Chi ha già pagato tiene il piano Play fino a scadenza.

**4.6 Collaudo adesso, senza Play**
- Se RevenueCat ha uno store di prova (Test Store) o un modo per simulare gli acquisti, usalo per collaudare tutto il flusso.
- Altrimenti simula gli eventi del webhook nei test.

**Fatto quando:**
- spento: nessuna differenza per i saloni;
- acceso senza chiavi: messaggio gentile;
- controllo pre-accensione che blocca e sblocca correttamente;
- flusso d'acquisto collaudato come in 4.6.

---

# FASE 5 — Rifiniture (priorità 4, si può fare in parallelo a qualunque fase)

**5.1 Nomi**
- Oggi convivono «Salone» (testi, badge, Abbonamento) e «SALON» (scritta della vetrina).
- Segui la spec `2026-10-31-piani-go-plus-badge-design.md`. Nel dubbio usa **Salone** in italiano, perché è già in quasi tutti i testi, e annotalo.
- Le chiavi interne restano `salone`.

**5.2 Traduzioni** en/es di tutti i testi nuovi.

**5.3 Controllo grafico**
- 360×640, tema chiaro e scuro.
- Stile attuale: dimensioni compatte, Plus viola, Salone oro, VIP nero e oro, componenti esistenti.

---

## Test di chiusura (dopo l'ultima fase)

Con emulatori e saloni finti (riusa `scripts/test360`):
- tutti i «Fatto quando» delle fasi;
- regole Firestore: un non operatore non scrive config, piani, inviti o feedback altrui e non legge i contatori; un titolare non accetta inviti non suoi;
- VIP invariati, **`salon/shared` mai modificato**.

Alla fine **elimina tutti i dati di test**.

## Cosa mi consegni

- Riepilogo per fase, in parole semplici, con l'indicazione di **quando la beta è pronta da usare**.
- Come si usa l'Admin Manager, passo per passo.
- In `DA-FARE-ROBERTO.md` e `PRIMA-DEI-PAGAMENTI.md`, le cose esterne al codice in ordine:
  - **subito, gratis**: account RevenueCat, app Android `it.groomly.app`, chiave SDK da inserire nell'admin, account di servizio Google Cloud collegato alla Play Console, webhook con segreto;
  - **il giorno dei pagamenti**: Partita IVA, profilo pagamenti, prodotti con gli ID fissati, license tester, annuncio 15 giorni, controllo pre-accensione, clic.
- Le decisioni prese da solo e cosa resta da decidere a me.
