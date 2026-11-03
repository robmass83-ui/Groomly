# Basse «Prenotazioni» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Prenotazioni**; dettagli in `test-results/audit/findings/plus.md` e `visivo.md` («Abbonamento: chi ha Plus vede «Attivo» sia su Go sia su Plus»).

## Perché
Sette difetti piccoli tra prenotazioni online e piani: l'antispam si aggira cambiando il prefisso, la lista d'attesa offre posti in date che il cliente non voleva, e diverse schermate dicono cose false o incomprensibili (conflitto inesistente, paywall diverso dalla pagina Plus, 31 giorni su 30, «5 su 5», due piani «Attivo»). Obiettivo: le regole sono le stesse ovunque e i testi dicono il vero.

## Decisioni (prese con Roberto il 3 novembre)
1. **Antispam per telefono** (`src/lib/prenotazione.ts`, `cifreTelefono` usata da `contaAperte` in `inviaRichiesta` e `iscrivitiAttesa`): lo stesso cellulare conta uguale scritto `+39 320…`, `0039 320…`, `39 320…` o `320…`. Si toglie il prefisso italiano prima del confronto (stessa idea di `chiaveRicerca` in `gestisciPrenotazione.ts`). I tetti restano 2 per cellulare, 2 per email, 20 per salone.
2. **Lista d'attesa per settimana** (`hosting/s/pagina.js` ~1010-1160, `functions/src/piano/iscrivitiAttesa.ts`, `functions/src/piano/offerteAttesa.ts`): il pulsante «Lista d'attesa» resta sulle settimane piene, come oggi. L'iscrizione salva la settimana scelta (inizio e fine, date di Roma). Il server offre a quell'iscritto solo posti liberati che iniziano dentro quella settimana. Gli iscritti già in lista senza settimana continuano a ricevere offerte per qualunque giorno. Una settimana non valida o mancante nell'invio non blocca l'iscrizione: vale come «qualunque giorno».
3. **Dopo Accetta** (`src/components/piano/RiquadroRichiesta.tsx`, `oraOccupata`): la visita nata da quella richiesta (`richiestaId === richiesta.id`) non conta come conflitto.
4. **Paywall e pagina Plus, una regola** (`src/hooks/usePiano.tsx` `PaywallPiano`, `src/components/piano/PaywallSheet.tsx`, `src/components/abbonamento/Vetrina.tsx`): la prova di 30 giorni compare in entrambi a chi può averla (`provaConcessa`, e nella Vetrina solo al titolare come oggi), senza dipendere da `mostraPiani`. Finché Play non è collegato (`abbonamentiAttivi` falso) entrambi offrono «Avvisami» al posto di «Abbonati»; con Play collegato entrambi «Abbonati». L'«In arrivo» della Vetrina sparisce.
5. **«Ancora 30 giorni»** (`src/hooks/usePiano.tsx` ~64-77, `src/lib/piano.ts` ~111-126): i giorni restanti si contano dall'ora attuale, non da quella del montaggio; subito dopo una prova di 30 giorni si legge 30.
6. **Testo del profilo** (`src/components/piano/LinkCondivisione.tsx` ~228, chiave `prenotaMancaProfilo`): la frase nomina i passi che mancano (es. «Per accendere le prenotazioni manca: logo, backup»), con il link alla pagina «Completa il salone». Con le prenotazioni già accese la frase del profilo non compare.
7. **«Attivo» in Abbonamento** (`src/pages/AbbonamentoPage.tsx` ~66-82, `src/lib/abbonamento.ts` `pianoAttivo`): «Attivo» solo sul piano in corso; Go per chi ha Plus o Salone dice «Gratis» come per tutti, Plus per chi ha Salone mostra il prezzo.

## Approcci
- **A — scelto.** Ogni regola in un posto solo, già condiviso tra app e server dove serve: normalizzazione del telefono in `src/lib/prenotazione.ts` (la usano entrambe le functions), filtro della settimana dentro `offerteDaCreare` (unico punto che abbina posti e iscritti), una sola condizione per prova/Avvisami usata da paywall e Vetrina.
- **B — scartato.** Correggere ogni schermata per conto suo (filtrare la settimana nella mail, la prova solo nel paywall): più veloce, ma le due strade tornerebbero a divergere, che è il difetto stesso dell'audit.

## Fuori dallo scopo
- Pulsante lista d'attesa sui giorni pieni (resta sulle settimane piene).
- Il server non richiede la completezza del profilo (`prenotazioneAccesa`): resta così.
- I valori veri di `config/*` in produzione non si leggono né si cambiano.
- Il nome troppo lungo nella pagina pubblica (altra riga dell'audit).

## Deploy
Functions `inviaRichiesta`, `iscrivitiAttesa` e quelle che chiamano `offerteDaCreare` (`giraCoda`/`inviaCoda`), con `FUNCTIONS_DISCOVERY_TIMEOUT=60`; hosting (pagina pubblica); APK. Tutto in produzione col permesso di Roberto.

## Lasciato al costruttore (scelte di Claude)
- Forma del campo settimana sull'iscritto e nell'offerta; nomi delle funzioni; testi it/en/es con chiavi nuove (controllo «frasi fisse»).
- Come elencare i passi mancanti (nomi già usati da «Completa il salone»).

## Verifica
Test unitari di `cifreTelefono`/`contaAperte`, `offerteDaCreare` (settimana dentro, fuori, assente), `iscrivitiAttesa`, `oraOccupata`, `PaywallSheet`/`Vetrina`, giorni restanti, `AbbonamentoPage`, `LinkCondivisione`. Script `QA-tests/.qa-catalog/verify-basse-prenotazioni.cjs` sull'emulatore a 320/360/390 px: tre richieste con prefissi diversi (la terza rifiutata), iscrizione in lista per una settimana e offerta solo per un posto di quella settimana, Accetta senza avviso, paywall e pagina Plus con gli stessi pulsanti su Go, prova appena avviata «30 giorni», Abbonamento con Plus, riquadro prenotazioni con logo mancante e con prenotazioni accese.
