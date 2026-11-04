# Beta Plus/Salon — app del salone (sessione B3)

Data: 4 novembre 2026. Sessione B3, branch `claude/beta-b3-salone-5fc9bd`.
Fonti: `docs/GROOMLY-BETA-PIANI-PROMPT.md` (2.3, 3.1, 3.2), `2026-11-04-admin-manager-design.md` (sezioni 8, 9, 11, 12), contratti di `2026-11-04-beta-fondamenta-design.md`, confini in `2026-11-04-beta-piani-ondate-coordinamento.md`.
Questa spec non ridisegna niente: dice **come** si costruisce quello che le sezioni 8 e 9 hanno già deciso.

## Intento
La toelettatura invitata deve capire in pochi secondi che può provare Plus o Salon **gratis**, senza pagamenti né rinnovi, e in cambio lasciare un parere.
Chi non è invitato vede l'app di oggi. Le vetrine dicono «In arrivo · Avvisami», senza prezzi.
Il feedback serve a Roberto per decidere i prezzi, quindi deve essere facile da mandare e sempre a portata di mano.

### Obiettivi
- Senza invito: app come oggi, con le vetrine «In arrivo · Avvisami» e la conferma «Ti avviseremo appena disponibile».
- Con un invito: schermate giuste per invito aperto, accettato (beta in corso), fine, rifiuto, revoca e invito scaduto.
- Solo il titolare vede l'invito. Socio e collaboratore vedono il piano attivo e il BETA.

### Non obiettivi
- Funzioni server: sono di B1. Qui c'è solo il wrapper client, con le firme dei contratti.
- Email e push di promemoria: sono di B1.
- Ramo «acquisto acceso» delle vetrine (B4) e Admin Manager (B2).

### Anti-obiettivi
- Mostrare un prezzo con `showPrezziInBeta` spento e abbonamenti spenti.
- Far vedere l'invito, o farlo accettare, a un socio o a un collaboratore.
- Togliere qualcosa a chi non è in beta: con l'invito assente nessuna schermata di oggi cambia, a parte le vetrine.

## Scelte di Roberto (4/11)
- **a)** Nella vetrina dello stesso piano, un titolare con un invito aperto vede **«Apri l'invito»** al posto di «Avvisami».
- **a)** La domanda di fine beta **si apre da sola una volta**: il giorno prima della fine o, se quel giorno l'app non è stata aperta, al primo avvio dopo la fine. Poi resta raggiungibile dall'avviso.

## Approcci considerati
1. **Uno stato beta unico in un contesto nuovo** (`BetaProvider` in `src/components/beta/`), che legge l'invito e calcola la fase dal piano. Le schermate leggono solo `useBeta()`. *Scelto*: è un solo punto da testare, non tocca la logica di `usePiano` (che usano anche B4 e A1) e si simula facilmente nei test.
2. Mettere tutto in `PianoProvider`. È più corto, ma `usePiano.tsx` lo toccano anche altre sessioni: i conflitti all'unione sono probabili.
3. Ogni schermata legge per conto suo. Ci sarebbero più ascolti Firestore e regole ripetute, e il «solo titolare» rischia di sfuggire da qualche parte.

## Come funziona

### Dati
- `PianoProvider` espone due campi in più, letti dal documento che già ascolta: `traccia: TracciaBeta` (con `tracciaBetaDi`) e `configPiani: ConfigPiani` (con `leggiConfigPiani`). Sono due righe e non cambiano altro.
- `BetaProvider` (sotto `PianoProvider` in `providers.tsx`):
  - ascolta `betaInviti/{salonId}` **solo se** l'account è titolare del suo salone, cioè ruolo `titolare` o assente e `salonId === uid`. Agli altri passa `invito: null` e non apre nessun ascolto;
  - se la lettura viene rifiutata, `invito` vale `null` e l'app resta quella di oggi.
- `src/data/firebase/betaClient.ts` (file nuovo):
  - `listenInvitoBeta(salonId, onData)`, che passa il documento a `invitoBetaDi`;
  - `rispondiInvitoBeta(input: { accetta: boolean; motivo?: MotivoRifiutoBeta; altro?: string }): Promise<{ ok: true; scadeIl: string | null }>`;
  - `inviaFeedbackBeta(input: Omit<FeedbackBeta, 'salonId' | 'uid' | 'piano' | 'creatoIl'>): Promise<{ ok: true }>`.
  - Le chiamate vanno in `europe-west1`, con gli emulatori come in `client.ts`. Un `failed-precondition` del server arriva con il suo messaggio, che l'app mostra così com'è.

### Fase della beta (`faseBeta`, funzione pura in `src/lib/faseBeta.ts`)
Ingressi: invito, `StatoPiano`, traccia e adesso. Uscita:

| Fase | Quando | Cosa si vede |
|---|---|---|
| `nessuna` | niente invito valido, mai in beta | l'app di oggi |
| `invitato` | invito `invitato` e `scadeInvitoIl` nel futuro | avviso, card in Home, pagina invito, «Apri l'invito» nella vetrina dello stesso piano |
| `in-corso` | piano vivo con `fonte: 'beta'` | BETA, barra dei giorni, riga feedback, testata Abbonamento in beta |
| `finita` | `exBeta` e piano non più in beta | riga feedback per 30 giorni da `betaFinoAl`, oppure da adesso se è stata revocata (vedi sotto) |

Valori derivati:
- `piano` (`'pro' | 'salone'`);
- `giorniRimasti`, con la stessa tolleranza di 5 minuti di `statoPiano`;
- `giorniTotali`, da `betaDal` a `betaFinoAl`, per la barra;
- `inizio` e `fine`;
- `revocata`: invito `revocato` letto dal titolare;
- `domandaFine`, vera se:
  - la beta è in corso con al massimo 1 giorno rimasto, oppure è finita da meno di 30 giorni;
  - **e** non è stata revocata.

L'invito `invitato` con scadenza passata (prima che il server lo segni) conta come chiuso. La pagina invito mostra «Questo invito non è più valido» per gli stati `scaduto` e `revocato`, e per un invito assente quando non si è in beta. Per un invito `accettato` (beta in corso) la pagina rimanda all'Abbonamento.

### Avvisi
Gli avvisi di oggi (`avvisiSistema`) sono uguali per tutti i saloni, quindi non possono portare un invito personale. Gli **avvisi beta li calcola l'app** da `useBeta()` (funzione pura `avvisiBeta`) e li mette in cima alla pagina Avvisi, prima di quelli di sistema:
- **Invito**: card con anello 2 px del colore del piano, come in 9.1, con il link «Apri l'invito ›»;
- **Promemoria feedback**: dopo 7 giorni di beta compare «Com'è andata finora? 2 minuti per un parere», che porta al modulo. Sparisce dopo un feedback inviato da questo telefono;
- **Fine vicina**: a 7 giorni dalla fine compare «La tua beta finisce il {data}». A 1 giorno lo stesso testo porta alla domanda di fine;
- **Beta finita**: per 30 giorni, «La tua beta {piano} è finita», che porta alla domanda di fine. Non compare dopo una revoca.

Ogni avviso beta ha un id stabile (tipo + data di riferimento). «Aperto» si salva in locale (`groomly.beta.<salonId>.letti`):
- il pallino rosso resta finché la pagina Avvisi non l'ha mostrato. Per l'invito resta finché l'invito non è stato aperto;
- la campanella delle Impostazioni conta anche gli avvisi beta non aperti.

Email e push restano a B1 (`avvisiFineBeta`). L'avviso nell'app c'è anche senza di loro.

### Schermate (aspetto: spec di design, sezioni 8 e 9)
- **`EtichettaBeta({ piano, piena? })`** e **`BarraGiorni({ rimasti, totali, chiara? })`** in `src/components/abbonamento/`. I token nuovi `--plus-s`, `--plus-ink`, `--sal-s` e `--sal-ink` vanno in `tokens.css`, chiaro e scuro, con il test del contrasto 4.5:1.
- **`CardInvitoBeta`** in Home, tra la ricerca e «Oggi». «Più tardi» la nasconde per 3 giorni (`groomly.beta.<salonId>.piuTardi`).
- **`/impostazioni/beta`, `PaginaInvitoBeta`**:
  - a tutta pagina, con la sfumatura e il piede fisso come la Vetrina;
  - la casella abilita «Partecipo». Dopo «Partecipo» arriva il toast di benvenuto con la data `scadeIl` del server, poi si va alla Home;
  - «No grazie» apre il `Dialog` con il motivo obbligatorio; con «Altro» c'è un testo di al massimo 300 caratteri. Dopo il rifiuto, toast «Va bene, nessun problema» e Home;
  - socio e collaboratore vengono mandati alla Home.
- **`SchedaAbbonamento` in beta** (`in-corso`):
  - riga 1 «Il tuo piano», riga 2 «Beta gratuita · fino al {data}»;
  - a destra l'`EtichettaBeta` piena;
  - sotto, la `BarraGiorni` con «N gg».
- **Riga «Invia feedback beta»** in Impostazioni, sotto la griglia delle scorciatoie. Si vede in `in-corso`, oppure in `finita` da meno di 30 giorni, al titolare e al socio. Il contratto lascia mandare il feedback anche al socio; il collaboratore non la vede.
- **Pagina Abbonamento in beta**:
  - testata `TestataPiano` con la pillola «🧪 BETA · N giorni», il testo «Beta gratuita dal … al …» e la barra;
  - card con «Invia feedback beta» e «Offerta fondatori». La seconda c'è solo con `earlyAdopter` e il testo in config (se manca la lingua, si usa l'italiano);
  - nell'elenco dei piani, quello in beta mostra «Il tuo piano ora · in beta».
- **`/impostazioni/beta/feedback`, `ModuloFeedbackBeta`**:
  - 4 passi, come 9.4;
  - le funzioni sono quelle della Vetrina, abbinate alle `FeatureKey`. Plus ha prenotazioni, listaAttesa, promemoriaAuto, messaggiCategoria, pronto, fedelta, recensioni, export e backupAuto. Salon ha le stesse più team e postiExtra;
  - all'invio si passano `fineBeta` (vero se si arriva dalla domanda finale) e `versioneApp = APP_VERSION`;
  - se l'invio va a buon fine: toast, nota in locale per il promemoria e ritorno alla pagina di prima;
  - se il server dà errore (per esempio il limite di 5 al giorno), si vede il suo messaggio e il modulo resta aperto.
- **`/impostazioni/beta/fine`, `FineBeta`**:
  - la card di 9.5 e sotto la `SchedaAbbonamento`;
  - le risposte aprono il modulo con «Pagheresti» già scelto e `fineBeta: true`.
- **Apertura automatica** (`AperturaFineBeta`, montata come `TourAvvio`):
  - quando `domandaFine` è vera, il titolare è in Home e il flag locale `groomly.beta.<salonId>.fineVista.<betaFinoAl>` manca, apre `/impostazioni/beta/fine` e salva il flag;
  - succede una volta sola per ogni data di fine (un'estensione la riapre).
- **Vetrine** (`Vetrina.tsx`), solo nel ramo `acquisto === 'avvisami'`:
  - pillola «🕒 In arrivo» sotto il claim;
  - la frase sopra il piede;
  - il prezzo diventa «Prezzo annunciato all'apertura», salvo `showPrezziInBeta`;
  - pulsante «🔔 Avvisami», che dopo il tocco diventa «✓ Ti avviseremo» e mostra il toast «Ti avviseremo appena disponibile» al posto del `Dialog` «In arrivo»;
  - sotto c'è «Nessun pagamento ora»;
  - con l'invito aperto per lo stesso piano, «Apri l'invito» al posto di «Avvisami».
  - `offertaPiano` e `scriviInteresse` non cambiano. Nella pagina Abbonamento, i prezzi dell'elenco seguono la stessa regola.
- **Paywall**: «Avvisami» mostra lo stesso toast. Lo aggiunge `PaywallPiano`, con una sola riga.

### Testi
Le chiavi della sezione 11 (`beta*`, `vet*`), più quelle degli avvisi beta, vanno in un blocco `// Beta B3` in fondo a `it.ts`, `en.ts` ed `es.ts`. Il nome del piano nei testi è `segnoPlus`/`segnoSalone` («Plus»/«Salon»).

### Rotte
Le rotte nuove sono `/impostazioni/beta`, `/impostazioni/beta/feedback` e `/impostazioni/beta/fine`, tutte dentro `Guard`.

## Collaudo
- Test unitari:
  - `faseBeta`, per tutte le fasi e i bordi (invito appena scaduto, ultimo giorno, revoca, 30 giorni dopo);
  - `avvisiBeta`;
  - mappatura delle funzioni.
- Test dei componenti con `betaClient` simulato, perché il server non è in questo ramo:
  - nessun invito;
  - invito aperto: card, avviso, Partecipo, No grazie con motivo;
  - beta in corso: scheda, Abbonamento, riga feedback, modulo e invio;
  - fine beta: apertura una volta sola, risposta e modulo;
  - rifiuto, revoca e invito scaduto;
  - socio e collaboratore senza invito;
  - vetrina senza prezzo e con toast.
- Prova grafica nel browser a 360×640, tema chiaro e scuro, confrontata con `-proposta-2.html`.

## Lasciato al costruttore
Nomi interni, ordine dei file, forma dei test e misure fini dentro i limiti di `SIZES`.

## Scelte prese da B3 senza Roberto (anche in `DECISIONI-AUTOMATICHE.md`)
- Gli avvisi beta li calcola l'app, non sono documenti: quelli di sistema sono uguali per tutti i saloni.
- La domanda di fine non compare dopo una revoca. Si apre da sola solo al titolare.
- Il modulo aperto dalla domanda di fine parte dal passo 1, con il passo 4 già scelto. La spec A2 diceva «al passo 4», ma voto e funzioni sono obbligatori: partire dal primo passo evita un «Invia» che non funziona.
- La riga feedback la vedono titolare e socio. Per un ex beta resta 30 giorni da `betaFinoAl`, o da adesso se la beta è stata revocata.
- Il promemoria feedback sparisce dopo un invio da questo telefono.
