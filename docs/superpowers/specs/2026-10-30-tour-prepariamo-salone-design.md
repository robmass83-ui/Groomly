# Tour "Prepariamo il salone" — design

Data: 2026-10-30

## Perché

Chi registra una toelettatura nuova entra in un'app che non ha ancora orari, prezzi, dati fiscali, backup: senza queste cose metà delle funzioni principali (calendario, prenotazioni online, ricevute, backup) non funziona o funziona a metà. Oggi l'unico invito a sistemarle è la card "Completa il profilo" in Impostazioni (anello 0/6), che una persona nuova può non notare.

Il tour è un primo ingresso guidato, breve, animato e coinvolgente, che fa **compilare sul momento** le 6 cose principali. Il tono è collaborativo ("Prepariamo il salone insieme"), non un modulo freddo. Non deve essere lungo: un paio di minuti.

## Obiettivi

- Al primo ingresso il titolare di una toelettatura nuova vede il tour e, passo dopo passo, compila i 6 punti della card "Completa il profilo".
- Ogni passo si può saltare. Alla fine resta la card in Impostazioni con il numero esatto di passi fatti (es. 4/6).
- Roberto e Laura (operatori) possono accendere o spegnere il tour da Utenti.

## Non obiettivi

- Non sostituisce le pagine complete (listino con taglie e razze, orari con pause ed eccezioni, scheda toelettatura): il tour fa la versione rapida, il resto si rifinisce dopo.
- Non cambia gli avvisi che esistono già (partita IVA, indirizzo ecc.): restano come sono.
- Non cambia la card "Completa il profilo" né la definizione dei 6 passi.
- Gli account esistenti non vedono il tour.

## Anti-obiettivi (sarebbe un fallimento anche se funziona)

- Un tour lungo o pesante: un passo che diventa una pagina intera di impostazioni.
- Un tour insistente: chi dice "Lo facciamo dopo" non lo rivede.
- Il tour e l'anello che contano cose diverse.
- Prezzi preimpostati presi per buoni: l'utente deve capire che il listino completo già pronto ha prezzi indicativi da adattare.

## I 6 passi

Sono esattamente quelli di `src/lib/completaSalone.ts` (`passiCompletamento`), nello stesso ordine, e "fatto" si calcola con la stessa logica usata in `SettingsPage.tsx` (~riga 827). Il tour deve riusare quel calcolo, non duplicarlo.

| # | Passo | Cosa si compila nel tour | Fatto quando |
|---|-------|--------------------------|--------------|
| 1 | Logo | Scegli una foto/immagine | `priceSheet.intestazione.logo` presente |
| 2 | Indirizzo e orari | Indirizzo + **orario giorno per giorno**: per ognuno dei 7 giorni, aperto/chiuso e la sua fascia (da–a) | indirizzo non vuoto **e** `orariCompilati` |
| 3 | Prezzi | I 4 servizi principali già preimpostati (Bagno, Taglio / tosatura, Bagno + taglio, Stripping) con il prezzo per taglia piccola / media / grande modificabile | almeno un servizio attivo (per un salone nuovo è vero da subito, vedi sotto) |
| 4 | Backup | Pulsante per collegare Google Drive (stesso flusso del backup in Impostazioni) | `backupImpostato` o Drive collegato |
| 5 | Verifica email | Niente: vedi sotto | email verificata |
| 6 | Dati fiscali | Partita IVA oppure codice fiscale (basta uno) | `!fiscalNoticeVisible(...)` |

Regole:
- **Passo già fatto → il tour lo salta**, con un'unica eccezione: Prezzi.
- **Prezzi compare sempre.** Un salone nuovo riceve in automatico 8 servizi attivi da `SERVICE_SEED` (`src/data/seed/services.ts`, seminati da `listenServices` in `client.ts`), quindi per la card il passo è già "fatto" dal primo istante. Ma quei prezzi sono una precompilazione standard che ogni toelettatura deve adattare: il passo si mostra comunque. Mostra i 4 servizi principali del seme con prezzo per taglia modificabile; durate ed extra restano quelli del seme e si cambiano dopo. Salva sugli stessi servizi (stessi id), senza crearne di nuovi. Avviso sempre visibile: *"Questi prezzi li abbiamo messi noi come esempio: sono indicativi, cambiali con i tuoi. Gli extra e il listino completo con le razze li sistemi dopo."* (Il listino completo è quello preimpostato da `seedPriceSheet`.) Se un servizio principale non esiste più o è disattivato, non si mostra.
- **Verifica email non compare mai nel tour.** Un account nuovo non entra nell'app finché l'email non è verificata (`entryGate` in `src/lib/authGate.ts` → `confirm-email`): la verifica avviene **prima** del tour, e il tour parte subito dopo. Quindi per chi vede il tour il passo 5 è sempre già fatto; nel riepilogo finale compare con ✓.
- **Backup è sempre a parte:** essersi registrati con Google **non** conta come backup; il passo è fatto solo se Google Drive è collegato per il backup.
- **Backup sul web:** Google Drive si collega solo dall'app sul telefono (`src/lib/driveAuth.ts` lancia `'telefono'` sul web) e resta così: l'app si usa da telefono e va su Google Play. Sul web il passo spiega che il backup si collega dall'app sul telefono e offre solo "Avanti".
- **Orari giorno per giorno, mai un orario unico per la settimana.** Ogni giorno ha il suo orario: es. lun–ven 9–19 ma sabato mezza giornata 9–13, oppure lunedì 10–12 e martedì un altro orario. Nel tour ogni giorno ha una fascia (da–a) modificabile in modo indipendente e può essere segnato chiuso. Per velocità c'è una scorciatoia facoltativa "Copia su tutti i giorni aperti" (esiste già `copiaSuTutti` in `src/lib/orari.ts`), ma i giorni restano poi modificabili uno per uno. Il passo dice che pause pranzo (seconda fascia) e giorni speciali si sistemano dopo nella pagina completa. Si salva nel formato esistente `OrariSettimana`.
- Ogni salvataggio usa le funzioni di salvataggio esistenti (`saveSettings`, `saveServices`, flusso logo, flusso Drive), così i dati scritti sono identici a quelli scritti dalle pagine normali.
- Il contatore "N di M" in alto conta solo i passi che il tour mostra davvero.

## Aspetto e tono (approvato sui mockup)

Unione dei due mockup: grafica "una schermata per passo" con tono "Prepariamo il salone".

- **Benvenuto:** illustrazione animata (zampa che fluttua, scintille), titolo "Ciao {nome salone}! Prepariamo il salone insieme ✨", sottotitolo "6 piccole cose e Groomly lavora al massimo per te. Ci vogliono un paio di minuti, e quello che vuoi lo salti." Pulsanti "Iniziamo" e "Lo facciamo dopo".
- **Ogni passo:** schermata intera. In alto sempre "PREPARIAMO IL SALONE · N di M" con barra di avanzamento animata; illustrazione a tema che entra con un piccolo rimbalzo; domanda/titolo in tono collaborativo ("Quando ti trovano aperto?", "Ora i tuoi prezzi"); i campi; pulsante "Fatto, avanti" e link "Salta".
- **Festa tra un passo e l'altro:** dopo un salvataggio riuscito, ~1 secondo di spunta verde con coriandoli/scintille ("Prezzi fatti! Un altro pezzo del salone è pronto."), poi avanza da solo. Non compare dopo "Salta".
- **Fine:** anello animato (es. 4/6), "Il salone è quasi pronto!" (o "Il salone è pronto!" a 6/6), elenco dei 6 passi con ✓ / ○, rimando a "Completa il profilo" in Impostazioni, pulsante "Entra in Groomly".
- Colori, font e componenti dell'app (`src/theme/tokens.css`, tema chiaro e scuro).
- Animazioni solo CSS (non ci sono librerie di animazione nel progetto) e rispetto di `prefers-reduced-motion`.
- Testi in italiano, inglese e spagnolo come il resto dell'app (`src/i18n/it.ts`, `en.ts`, `es.ts`).

Mockup di riferimento: `.superpowers/brainstorm/2008-1793348914/content/tour-unito.html` (non versionato).

## Chi lo vede

Il tour parte se **tutte** queste condizioni sono vere:
1. L'interruttore globale è acceso.
2. L'account (Firebase Auth, `metadata.creationTime`) è stato creato **dopo** il momento in cui l'interruttore è stato acceso l'ultima volta.
3. È il titolare del salone, non un collaboratore.
4. Il tour per quel salone non è già stato visto o saltato.

Il tour parte da solo **al primo accesso dopo la verifica dell'email**.

"Visto" significa: arrivato alla fine **oppure** toccato "Lo facciamo dopo" sul benvenuto. In entrambi i casi non ricompare più, su nessun dispositivo: il segno si salva sul salone (cloud), non sul telefono.

**Tour lasciato a metà.** Se l'app viene chiusa del tutto durante il tour (né finito né rimandato), alla riapertura il tour **non** riparte da solo: compare un avviso in alto, non bloccante, tipo *"Non hai finito di preparare il salone. Vuoi continuare?"* con "Continua" e una X. "Continua" riapre il tour dal primo passo né fatto né saltato (i passi saltati sono ricordati sul salone e non ricompaiono). La X chiude l'avviso per quella apertura dell'app; riappare alla prossima apertura da zero finché il tour non è finito. Lo scopo è far sapere che il tour è utile senza obbligare.

Se l'interruttore è spento, nessuno vede il tour; la card in Impostazioni c'è comunque per tutti.

## L'interruttore (Utenti)

- Nuova sezione "Impostazioni utenti" nella pagina Utenti (`src/pages/UsersPage.tsx`), visibile solo agli operatori come il resto della pagina.
- Un interruttore "Tour di benvenuto per i nuovi iscritti" con una riga che spiega: acceso = lo vede chi si registra da adesso; spento = non lo vede nessuno.
- Stato salvato in `config/globale` (già letto dall'app in `client.ts` ~riga 2682, già usato per `mostraPiani` e `abbonamentiAttivi`). Le regole Firestore vietano la scrittura dal client (`firestore.rules` riga 278), quindi l'interruttore scrive tramite una **nuova callable** sul modello di `impostaFunzione` (controllo operatore con `tokenOperatore`).
- Campi: un booleano acceso/spento e il momento dell'ultima accensione. Accendere aggiorna sempre il momento a "adesso": spegnere e riaccendere esclude chi si è registrato mentre era spento.
- È pensato come strumento temporaneo per le prove, ma va fatto pulito.

## Approcci considerati

1. **Data di accensione (scelto).** Il server salva quando l'interruttore viene acceso; il tour parte per gli account creati dopo quel momento e non ancora "visti". Non tocca le strade di registrazione (email, Google), quindi meno codice da cambiare e niente da ricordare se ne arriva una nuova. Spegni/riaccendi = vale la nuova data.
2. **Segno alla registrazione.** Alla creazione dell'account, se acceso, si segna "tour da fare". Più esplicito, ma va inserito in ogni strada di registrazione. Scartato per questo.

## Decisioni mie (da verificare nel documento)

- Indirizzo e orari stanno in **una** schermata, perché sono un unico passo della card (confermato).
- Orari: nel tour una sola fascia per giorno; la seconda fascia (pausa pranzo) resta alla pagina completa, per tenere il passo breve. Il punto di partenza dei giorni (tutti chiusi o un esempio da correggere) lo decide il builder, purché ogni giorno sia indipendente.
- La festa tra i passi l'ho proposta io; approvata sui mockup.
- Prezzi: si modificano solo i prezzi per taglia dei 4 principali, non durate né extra, per tenere il passo breve.
- Avviso di tour a metà: la X lo nasconde solo per quella apertura dell'app (riappare alla successiva finché il tour non è finito); i passi saltati sono ricordati.
- Il nome mostrato nel benvenuto è il nome della toelettatura se c'è, altrimenti un saluto senza nome.

## Lasciato al builder

- Dove montare il tour (pagina dedicata a schermo intero a cui si viene portati dopo l'accesso, o livello sopra la Home), purché a schermo intero e senza barra di navigazione.
- Nome e forma esatti dei campi in `config/globale` e del segno "visto" sul salone (es. in `settings/main`), regole Firestore relative incluse.
- Illustrazioni: emoji, icone lucide già nel progetto o SVG semplici, purché animate e coerenti con i mockup.
- Come riusare i componenti esistenti (form logo, scheda backup, chip giorni) invece di riscriverli.
- Test: unità per la regola "chi lo vede" e per il calcolo dei passi saltati; test di pagina per il percorso salta/compila/fine e per l'interruttore in Utenti.
