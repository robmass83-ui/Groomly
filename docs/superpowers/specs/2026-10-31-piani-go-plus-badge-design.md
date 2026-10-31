# Piani Go / Plus / Salone: chi ha cosa, segno Plus e finestra specifica

Data: 2026-10-31

## Perché

La pagina Plus promette funzioni che in Go ci sono già (statistiche, report dei mesi
passati, copie nel cloud) e non dice cosa distingue davvero il Plus. Nel codice i blocchi
sono incoerenti: scritta "Pro" in un punto, anteprime in un altro, una finestra generica
"Abbonamenti in arrivo", un avviso a tempo in Home, e tutto spento da un interruttore
generale (`config.mostraPiani`). Per questo oggi in Go si esporta il report anche se
l'export è Plus.

Obiettivo: chi usa Go vede le funzioni Plus, sa che sono Plus, e non viene mai
interrotto. Chi tocca una funzione Plus capisce subito cosa fa quella funzione.

## Linea guida (decisa dal titolare)

1. Segno "Plus" piccolo e sempre identico (stesso colore, stessa icona fulmine) sulle
   funzioni che l'utente cercherebbe in modo naturale.
2. La finestra di acquisto si apre solo al tocco. Niente popup all'avvio, niente banner,
   niente promemoria a tempo.
3. Si nasconde del tutto solo ciò che è avanzato o di nicchia.
4. La finestra è specifica: tocchi "Esporta" e parla dell'esportazione del report, non
   mostra un elenco generico.
5. La sezione che raccoglie tutto il Plus per chi vuole curiosare è la scheda Abbonamento
   esistente (`BlocchiPiano.tsx`, pagine Plus/Salone in `Vetrina.tsx`).

## Chi ha cosa

### Go (gratis)

| Funzione | Nota |
|---|---|
| Statistiche del salone | oggi Plus con anteprima → diventa gratis, esce da `FeatureKey` |
| Report incassi di ogni periodo (mese, mesi passati, anno) | oggi i periodi passati sono Plus (`reportGate.ts`) → gratis, `reportPassati` esce da `FeatureKey` |
| Backup manuale sul telefono ("Salva ora", "Completo con foto", ripristino da file) | resta gratis |
| WhatsApp semplice | il tasto WhatsApp apre la chat del cliente **senza testo**, senza finestra |
| Affidabilità, altre funzioni base esistenti | invariate |

### Plus (con segno Plus visibile in Go)

| Chiave | Dove compare il segno | Al tocco in Go |
|---|---|---|
| `export` | tasto "Esporta" in Report incassi | finestra specifica export |
| `backupAuto` (nuova) | interruttore "Backup automatico giornaliero" e righe frequenza/orario in Backup | finestra specifica |
| `drive` (nuova) | "Collega Google Drive", "Invia su Drive", "Ripristina da Drive" | finestra specifica |
| `messaggiCategoria` (nuova) | vedi sezione WhatsApp | finestra specifica |
| `promemoriaAuto`, `pronto`, `richiamo`, `compleanno`, `fedelta`, `prenotazioni`, `listaAttesa`, `recensioni` | dove stanno già oggi (scheda Abbonamento, scheda cane, appuntamento) | finestra specifica |
| altre chiavi Plus esistenti (`pagella`, `aumentoListino`, `collage`, `senzaFirma`, `schedaCliente`) | dove stanno già oggi | finestra specifica |

### Nascoste in Go (di nicchia)

`copieCloud` (copie foto sul cloud Groomly, 30 giorni), `postiExtra`, `prezzoSuggerito`
(già nascosta). Restano funzioni a pagamento ma non compaiono a chi non le ha.

### Salone

`team`, `postiExtra`. Salone comprende tutto il Plus (già così: `RANK`).

## WhatsApp

- **Go:** `PulsanteMessaggi` non apre la finestra. Il tocco apre direttamente
  `wa.me/<numero>` senza testo (stesso comportamento nativo di oggi tramite
  `hrefMessaggioApp`). Nessuna scelta di lingua né di categoria.
- **Plus:** comportamento di oggi (finestra con lingua, categorie promemoria / conferma /
  pronto / richiamo / auguri, testo modificabile).
- **Segno Plus in Go:** accanto al tasto WhatsApp, nei punti dove c'è oggi
  (`DogPage`, `AppointmentPage`), un piccolo tasto secondario "Messaggi pronti" con il
  segno Plus che apre la finestra specifica. Il tasto WhatsApp principale non apre mai la
  finestra di acquisto.

## Il segno Plus

- Un solo componente (sostituisce `ProBadge` e la scritta "Pro"): fulmine (`Zap` di
  lucide) + "Plus", colore viola del marchio Plus, dimensione fissa. Variante identica per
  Salone non serve: le funzioni Salone in Go mostrano lo stesso segno con la parola
  "Salone" solo se sono visibili (oggi: `team` nella scheda Abbonamento).
- Dove la funzione ha un interruttore o un tasto, in Go l'interruttore/tasto resta
  visibile, con il segno a destra; il tocco apre la finestra invece di agire.
  L'interruttore non cambia mai stato in Go.

## La finestra al tocco

- Sostituisce il contenuto di `PaywallSheet`. Riceve la chiave della funzione toccata.
- Per ogni chiave: titolo, una frase che spiega a cosa serve, icona. Testi in it/en/es.
- Pulsanti: "Prova Plus gratis per 30 giorni" (se la prova non è usata) e "Abbonati"
  (porta alla pagina Plus). Finché gli abbonamenti Google Play non sono attivi
  (`abbonamentiAttivi` falso), "Abbonati" lascia il posto ad "Avvisami", come oggi.
- Per le funzioni Salone la finestra parla di Salone e porta alla pagina Salone.

## Cose da togliere

- `AvvisoProposta` in Home (proposta a tempo ogni 7 giorni) e il suo calcolo
  (`propostaVisibile`, `puoProporre` dove non serve più).
- L'anteprima automatica delle Statistiche (`SchedeStatistiche` con `onPaywall`).
- Il tipo di vista `'anteprima'` in `VISTA`: restano solo `'badge'` e `'nascosta'`.
- La fascia "Aggiorna listino" a inizio mese in Report (`mostraFasciaAumento`): è un
  promemoria a tempo. `aumentoListino` resta Plus col segno dove si trova la funzione.

## Interruttore generale `mostraPiani`

- Blocchi, segni e finestre **non dipendono più** da `mostraPiani`: dipendono solo dal
  piano del salone.
- `mostraPiani` decide solo se si vedono la scheda Abbonamento in Impostazioni e i
  pulsanti di prova/acquisto, finché Google Play non è collegato.

## Pagina Utenti (strumento del titolare dell'app)

- Si sceglie solo il piano del salone: Go, Plus, Salone, VIP. Salone comprende Plus.
  VIP vede tutto (invariato).
- **Si toglie l'elenco delle singole funzioni** (`CHIAVI_FUNZIONE`, interruttori per
  funzione). La mappa `pro/main.funzioni` non viene più scritta né letta:
  - client: `funzioneVisibile`, `strumentoVisibile`, `funzioneAccesa` ignorano `funzioni`;
  - server: `serviziConOperatore` (`inviaCoda.ts`, `giraCoda.ts`), `gatePrenotazione`,
    `impostaFunzione` smettono di usarla; la callable `impostaFunzione` si elimina.
- Gli account esistenti sono di prova; l'unico reale (Laura) è VIP e non cambia. Non
  serve migrazione: i campi `funzioni` rimasti vengono ignorati.
- Le scelte dei singoli saloni in Impostazioni (es. `strumenti.messaggi`,
  `strumenti.affidabilita`, servizi email accesi o spenti) restano: sono del salone, non
  del piano.

## Backup automatico in Go

Il backup notturno nativo (`src/backupNotturno.ts`, avviato da `main.tsx`) deve
controllare il piano: in Go non fa nulla e non invia su Drive, anche se `autoDaily` era
acceso. L'interruttore in Impostazioni appare spento con il segno Plus. Non serve avviso a
chi l'aveva acceso (solo account di prova).

## Testi della pagina Plus (`Vetrina.tsx`, it/en/es)

1. Promemoria email automatici ai clienti
2. Messaggi WhatsApp per categoria
3. Avviso «il tuo cane è pronto»
4. Tessera fedeltà
5. Prenotazioni online
6. Lista d'attesa
7. Richiesta di recensioni
8. Esporta il report degli incassi
9. Backup automatico e Google Drive

Escono: Auguri di compleanno, Statistiche del salone, Report dei mesi passati, Copie nel
cloud. La pagina Salone ("Tutto di Groomly Plus" + team + posti) resta.

## Approcci considerati

- **Scelto — un elenco unico in `src/lib/piano.ts`.** Per ogni chiave: livello minimo e
  vista (`badge` / `nascosta`). Un componente segno, una finestra con schede per
  funzione. Tutte le schermate leggono da qui; segno, finestra e pagina Utenti si
  comportano allo stesso modo.
- **Scartato — controlli schermata per schermata.** È ciò che ha prodotto l'incoerenza
  di oggi ("Pro" in un punto, anteprime in un altro, blocchi spenti dall'interruttore).
- **Scartato — nascondere tutto il Plus in Go.** Proposto e poi rifiutato dal titolare:
  chi non vede le funzioni non sa che esistono.

## Non obiettivi

- Collegare gli abbonamenti Google Play.
- Cambiare prezzi, durata della prova, pagina Salone.
- Cambiare le funzioni email lato server oltre a togliere la mappa `funzioni`.

## Anti-obiettivi

- Qualsiasi interruzione non richiesta (popup, banner, avvisi a tempo).
- Un tocco su una funzione Plus in Go che cambia qualcosa (interruttore che si accende,
  invio che parte).
- Segni diversi tra schermate.

## Decisioni prese da chi ha scritto il documento (da verificare dal titolare)

- **Finestra con `mostraPiani` spento.** I blocchi valgono subito per tutti i saloni Go
  (sono solo account di prova). La finestra mostra sempre titolo e spiegazione; il tasto
  "Prova gratis" compare solo con `mostraPiani` acceso e prova non usata; altrimenti c'è
  sempre "Avvisami". Mai una finestra senza tasti.
- **Email Plus lato server.** Togliendo la mappa `funzioni`, `giraCoda`/`inviaCoda`
  controllano il livello del piano (stessa logica di `gatePrenotazione`): un salone Go non
  spedisce email Plus anche se i suoi `serviziEmail` sono accesi. Serve il deploy delle
  functions.
- **Auguri di compleanno (`compleanno`).** Resta Plus con segno dove si trova; esce solo
  dall'elenco della pagina Plus perché rientra in "Messaggi WhatsApp per categoria" e nelle
  email automatiche.
- **Backup notturno senza rete.** Usa il piano salvato sul telefono all'ultima apertura
  dell'app, con la stessa tolleranza di 72 ore di `OFFLINE_MS`; senza piano salvato, salta.

## Lasciato a chi costruisce

- Nomi esatti delle nuove chiavi e dei testi delle schede della finestra (frasi brevi,
  tono dell'app).
- Posizione esatta del segno dentro le righe esistenti di Backup.
- Aggiornare i test esistenti che verificano i vecchi blocchi (`reportGate`,
  `funzioniPiano`, `CopieCloudRiga`, `AvvisoProposta`, `UsersPage`, `PulsanteMessaggi`).
- Pubblicare l'APK a lavoro finito (regola del progetto).
