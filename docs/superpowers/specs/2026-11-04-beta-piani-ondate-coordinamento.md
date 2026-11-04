# Beta Plus/Salone — divisione in sessioni parallele (coordinamento)

Fonte: `docs/GROOMLY-BETA-PIANI-PROMPT.md` (il prompt completo, con vincoli assoluti e «Fatto quando»).
Scelta di Roberto (4/11/2026): **due ondate**. Questo documento sostituisce la regola «fasi in ordine in una sola sessione» del prompt: le fasi restano, ma i pezzi indipendenti vanno in sessioni parallele.

## Regole per ogni sessione

- Ogni sessione lavora in un **worktree suo** e committa solo sul suo branch. Non fa merge su `main`, non pubblica APK, non fa deploy: l'unione e la release le fa la sessione di coordinamento a fine ondata.
- Ogni sessione fa il **brainstorm** della sua parte (skill brainstorming), scrive la sua spec in `docs/superpowers/specs/2026-11-04-beta-<parte>-design.md` e il piano in `docs/superpowers/plans/` (skill writing-plans), poi esegue.
- Le scelte prese senza Roberto vanno annotate in `docs/DECISIONI-AUTOMATICHE.md` (in fondo, sezione della propria parte).
- Valgono tutti i **vincoli assoluti** del prompt: `salon/shared` mai toccato, VIP restano VIP, piano/beta/inviti/config scritti solo da Cloud Functions per operatori, nessun segreto nel client, i dati non si cancellano a fine piano.
- Non cancellare worktree vecchi (le junction di `node_modules` possono svuotare la cartella principale).
- Ogni sessione chiude con test verdi (`npm test`, test delle functions e delle regole se toccati) e `PROGRESS.md` aggiornato.

## Ondata A (subito, in parallelo)

| Sessione | Contenuto | File principali | Note |
|---|---|---|---|
| **A1 Fondamenta** | Fase 1 intera (1.1–1.7) | `src/lib/piano.ts`, `functions/src/piano/*`, `functions/src/config/*`, `firestore.rules`, `docs/legal/PRIMA-DEI-PAGAMENTI.md` | Deve lasciare scritti i **contratti** per l'ondata B (vedi sotto). |
| **A2 Proposte design** | Fase 1B: 5 proposte HTML + indice | solo `docs/superpowers/specs/*.html` | Nessun codice dell'app. Si ferma e aspetta la scelta di Roberto. |
| **A3 Nomi** | Fase 5.1 Salone/SALON | testi e i18n (`src/i18n/*`), scritta della Vetrina | Solo testi e etichette: non toccare la logica di `Vetrina.tsx`/`avviaProva` (la tocca A1). |

### Contratti che A1 deve lasciare per l'ondata B
In `docs/superpowers/specs/2026-11-04-beta-fondamenta-design.md`, sezione «Contratti»:
- tipi TypeScript di piano (fonte `beta` o alternativa scelta), traccia permanente, invito beta, feedback beta, nuovi campi di `config/globale`;
- percorsi Firestore di inviti, feedback, conteggi Avvisami;
- nomi e firme (input/output) delle callable che l'ondata B implementerà, anche se A1 non le implementa;
- ID fissi di prodotti, entitlement e offering.

## Ondata B (dopo: A1 unita in `main` **e** design scelto da Roberto)

| Sessione | Contenuto |
|---|---|
| **B1 Server beta e feedback** | 2.1 (invita, accetta, rifiuta, revoca, estendi, scadenza inviti, avvisi di fine), salvataggio feedback 3.1, contatori 3.3 lato server, email Brevo it/en/es |
| **B2 Admin Manager** | 2.2 + 3.3/3.4 lato interfaccia, secondo la proposta scelta; sostituisce `UsersPage.tsx` senza perdere funzioni |
| **B3 App del salone** | 2.3 + 3.1 modulo + 3.2 punti di raccolta, secondo la proposta scelta |
| **B4 Abbonamenti spenti** | Fase 4: SDK RevenueCat, flusso acquisto, controllo pre-accensione, annuncio, spegnimento. Il pannello admin lo fornisce come componente che B2 monta. |

### Confini tra le sessioni B (per evitare conflitti)
- **Contratti:** sezione «Contratti» di `2026-11-04-beta-fondamenta-design.md` (firme fisse) e `2026-11-04-admin-manager-design.md` (schermate). Se una sessione ha bisogno di cambiare una firma, lo scrive nella sua spec e lo segnala a fine lavoro: non la cambia da sola.
- **B1** possiede `functions/src/beta/*` (o `functions/src/piano/` per i file nuovi della beta), le email, `impostaMostraPiani`, `contatoriAdmin`. Non tocca `src/` tranne i test delle regole.
- **B2** possiede `src/pages/AdminManagerPage.tsx`, `src/components/admin/*` e i wrapper client delle callable operatore in un file nuovo `src/data/firebase/adminClient.ts`. Non crea `PannelloAccensione` (è di B4): nella scheda Piani lascia l'interruttore `abbonamentiAttivi` in sola lettura con un segnaposto, che si collega alla chiusura.
- **B3** possiede `src/components/beta/*`, le pagine `/impostazioni/beta*`, `EtichettaBeta` e `BarraGiorni` in `src/components/abbonamento/`, e i wrapper client del titolare in un file nuovo `src/data/firebase/betaClient.ts`. Tocca le vetrine solo per lo stato «In arrivo · Avvisami».
- **B4** possiede `src/lib/billing.ts`, l'SDK RevenueCat, `src/components/admin/PannelloAccensione.tsx`, le functions di accensione, controllo, annuncio e spegnimento, e il webhook. In `Vetrina`/`PaywallSheet` aggiunge solo il ramo «acquisto acceso», il più piccolo possibile, perché le vetrine le tocca anche B3.
- **B2** usa `EtichettaBeta` di B3: se nel suo ramo manca, la crea identica alla sezione 8 della spec di design, nello stesso percorso; all'unione vale quella di B3.
- **Testi i18n:** ogni sessione aggiunge le sue chiavi in un blocco unico in fondo a `it.ts`/`en.ts`/`es.ts`, con il commento `// Beta B1`, `// Beta B2`… così l'unione è semplice.
- **Router:** ognuna aggiunge solo le sue rotte.

## Chiusura (dopo l'ondata B)
Unione, collaudo completo sugli emulatori (test di chiusura del prompt), traduzioni 5.2, controllo grafico 5.3, pulizia dati di test, consegne (`DA-FARE-ROBERTO.md`, `PRIMA-DEI-PAGAMENTI.md`, guida Admin Manager), release.
