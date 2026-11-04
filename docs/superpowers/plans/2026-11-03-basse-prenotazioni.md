# Basse «Prenotazioni» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le sette basse «Prenotazioni» dell'audit: antispam per telefono, lista d'attesa per settimana, avviso dopo Accetta, paywall e Vetrina con una regola, «30 giorni», testo dei passi mancanti, «Attivo» solo sul piano in corso.

**Architecture:** Ogni regola sta in un solo posto: confronto dei telefoni in `src/lib/prenotazione.ts` (lo usano `inviaRichiesta` e `iscrivitiAttesa`), settimana dell'iscritto in `src/lib/listaAttesa.ts` e filtro in `offerteDaCreare`, offerta prova/acquisto in `src/lib/abbonamento.ts` usata da paywall e Vetrina. Il resto sono correzioni locali ai componenti.

**Tech Stack:** React + TypeScript, Vitest + Testing Library, Firebase Functions (TypeScript, test dalla radice), pagina pubblica statica `hosting/s/pagina.js` (test jsdom in `hosting/s/paginaAttesa.test.ts`).

**Spec:** `docs/superpowers/specs/2026-11-03-basse-prenotazioni-design.md`

## Global Constraints

- Ramo `fix/basse-prenotazioni`. Niente merge in `main`, niente cambio di versione, niente deploy né release dentro i task.
- Mai il progetto `groomly-3128b` né i dati di Laura; prove solo su `demo-groomly`. Emulatori 8080/9099 e Vite 5173 condivisi con altre sessioni: non riavviarli, non svuotarli; account di prova con prefisso `pren-`.
- Test dell'app: `npx vitest run --dir src <file>`; test delle functions e di `hosting/s`: dalla radice, `npx vitest run <file>`.
- Fallimenti già presenti su main da ignorare: `src/lib/driveInvio.test.ts`, 21 test di `src/pages/DogsPage.test.tsx`, 3 di `src/pages/appointments.test.tsx`.
- Testi nuovi solo in `src/i18n/{it,en,es}.ts` con chiavi nuove; il test «frasi fisse» (`frasiFisse.test.ts`) deve restare verde.
- Tetti antispam invariati: 2 per cellulare, 2 per email, 20 per salone.
- Settimana = `{ inizio: 'YYYY-MM-DD', fine: 'YYYY-MM-DD' }` in date di Roma, lunedì–domenica come `settimanaDi`.
- Iscritti senza settimana (vecchi, manuali, pulsante generale) ricevono offerte per qualunque giorno. Una settimana mancante o non valida nell'invio non blocca l'iscrizione.
- Nessuna lettura o modifica di `config/*` in produzione.

## Review Focus

1. Numero con spazi, trattini o parentesi (`+39 (320) 555-0000`) conta come `3205550000`; un cellulare che inizia per 39 (`393 1234567`, 10 cifre) non perde le prime cifre.
2. Posto ai bordi della settimana in ora di Roma: domenica 23:30 di Roma è dentro; lunedì 00:30 di Roma (ancora domenica in UTC) è nella settimana dopo.
3. Una settimana con `fine` prima di `inizio`, date malformate o un oggetto con campi in più arrivati dalla pagina: l'iscrizione riesce e l'iscritto vale «qualunque giorno».
4. Prova appena avviata con l'orologio del telefono qualche minuto indietro rispetto al server: si legge comunque «30 giorni».
5. Collaboratore che apre il paywall o la Vetrina: non vede la prova (la avvia solo il titolare), come oggi nella Vetrina.

Ognuna ha il suo test nel task che possiede il codice.

---

### Task 1: Antispam per telefono con o senza prefisso

**Files:**
- Modify: `src/lib/prenotazione.ts` (`cifreTelefono` resta com'è; nuova funzione; `contaAperte` la usa)
- Test: `src/lib/prenotazione.test.ts`
- Test: `functions/src/piano/inviaRichiesta.test.ts` (un caso end-to-end sul tetto)

**Interfaces:**
- Produces: `telefonoConfronto(phone: string): string` — le cifre senza prefisso italiano.

- [ ] **Step 1: test di `telefonoConfronto`**: `'+39 320 5550000'`, `'0039 320 5550000'`, `'39 320 5550000'`, `'320 5550000'` e `'+39 (320) 555-0000'` danno tutti `'3205550000'`; `'393 1234567'` dà `'3931234567'`; `'06 1234567'` dà `'061234567'`; `''` dà `''`.
- [ ] **Step 2: test di `contaAperte`**: righe con phone `'+39 320 5550000'` e `'0039 320 5550000'`, chiamata con `'320 5550000'` → `aperteTelefono === 2`.
- [ ] **Step 3: test in `inviaRichiesta.test.ts`**: due richieste aperte con `+39 320 5550000` e `0039 320 5550000`, la terza con `320 5550000` è rifiutata come la terza con lo stesso formato (stesso esito/codice che il file già verifica per il tetto).
- [ ] **Step 4: verifica che falliscano** (`npx vitest run --dir src src/lib/prenotazione.test.ts`; `npx vitest run functions/src/piano/inviaRichiesta.test.ts`).
- [ ] **Step 5: implementa** `telefonoConfronto`: cifre di `cifreTelefono`; se iniziano con `0039` togli 4 cifre; altrimenti se iniziano con `39` e sono almeno 11, togli 2. `contaAperte` confronta con `telefonoConfronto` su entrambi i lati; la soglia `>= 6` cifre resta, applicata al risultato.
- [ ] **Step 6: test verdi**, anche `functions/src/piano/iscrivitiAttesa.test.ts` (usa `contaAperte`).
- [ ] **Step 7: commit** `fix(prenotazioni): stesso cellulare con o senza +39 per l'antispam`.

### Task 2: Lista d'attesa per settimana

**Files:**
- Modify: `src/lib/listaAttesa.ts` (tipo e due funzioni)
- Modify: `functions/src/piano/iscrivitiAttesa.ts`, `functions/src/index.ts` (~825-840, lettura del campo dalla callable), `functions/src/piano/giraCoda.ts` (`iscrittoDi` ~139), `functions/src/piano/offerteAttesa.ts` (`offerteDaCreare`)
- Modify: `hosting/s/pagina.js` (`bottoneLista` ~1023, invio ~1142)
- Test: `src/lib/listaAttesa.test.ts`, `functions/src/piano/iscrivitiAttesa.test.ts`, `functions/src/piano/offerteAttesa.test.ts`, `functions/src/piano/giraCoda.test.ts` (se legge iscritti), `hosting/s/paginaAttesa.test.ts`

**Interfaces:**
- Produces in `src/lib/listaAttesa.ts`:
  - `IscrittoAttesa` con il campo facoltativo `settimana?: { inizio: string, fine: string }`
  - `settimanaValida(valore: unknown): { inizio: string, fine: string } | null` — accetta solo un oggetto con `inizio`/`fine` stringhe `YYYY-MM-DD` di date reali, `inizio <= fine`, distanza ≤ 6 giorni; restituisce un oggetto nuovo con solo i due campi.
  - `nellaSettimana(inizio: Date, settimana: { inizio: string, fine: string } | undefined): boolean` — `true` senza settimana; altrimenti confronta la data di Roma di `inizio` (Intl `en-CA`, `timeZone: 'Europe/Rome'`) con l'intervallo, estremi compresi.
- `iscrivitiAttesaPer` riceve `settimana?: unknown`; salva `settimana` sul documento solo se `settimanaValida` non è `null`.

- [ ] **Step 1: test in `listaAttesa.test.ts`**: `settimanaValida({ inizio: '2026-11-16', fine: '2026-11-22' })` restituisce lo stesso intervallo; `null` per `undefined`, `'2026-11-16'`, `{ inizio: '2026-11-22', fine: '2026-11-16' }`, `{ inizio: '2026-02-30', fine: '2026-03-01' }`, `{ inizio: '2026-11-01', fine: '2026-11-30' }`; con un campo `x: 1` in più il risultato non ha `x`. `nellaSettimana(new Date('2026-11-22T22:30:00Z'), { inizio: '2026-11-16', fine: '2026-11-22' })` è `true` (domenica 23:30 a Roma) e `nellaSettimana(new Date('2026-11-22T23:30:00Z'), …)` è `false` (lunedì 00:30 a Roma); `nellaSettimana(qualunque, undefined)` è `true`.
- [ ] **Step 2: test in `offerteAttesa.test.ts`**: un buco il 18/11 e un buco il 25/11 con un iscritto con settimana 16–22/11 → una sola offerta, quella del 18; un iscritto senza settimana riceve entrambe.
- [ ] **Step 3: test in `iscrivitiAttesa.test.ts`**: con `settimana: { inizio: '2026-11-16', fine: '2026-11-22' }` il documento salvato ha quel campo; con `settimana: 'x'` o senza l'iscrizione riesce (`ok: true`) e il documento non ha `settimana`.
- [ ] **Step 4: test in `giraCoda`** (dove `iscrittoDi` è coperto): un documento con `settimana` valida la porta nell'iscritto; una non valida è ignorata.
- [ ] **Step 5: test in `paginaAttesa.test.ts`**: iscrizione dal pulsante di una settimana piena → il corpo del `fetch` finto a `iscrivitiAttesa` ha `data.settimana` uguale a quella riga; dal pulsante generale (`bottoneLista(null)`) il corpo non ha `settimana`.
- [ ] **Step 6: verifica che falliscano.**
- [ ] **Step 7: implementa**: funzioni e tipo in `listaAttesa.ts`; `iscrivitiAttesaPer` e la callable in `index.ts` passano `settimana`; `iscrittoDi` legge con `settimanaValida`; `offerteDaCreare` salta la coppia quando `!nellaSettimana(buco.inizio, iscritto.settimana)`; in `pagina.js` `bottoneLista` salva la settimana in `stato.lista.settimana` (`null` dal pulsante generale) e l'invio la aggiunge a `data` solo se non è `null`. Il commento in `pagina.js` (~974) che rimanda a `listaAttesa.ts` resta vero.
- [ ] **Step 8: test verdi** (i cinque file sopra, più `functions/src/piano/confermaAttesa.test.ts`).
- [ ] **Step 9: commit** `fix(lista-attesa): l'iscrizione salva la settimana e riceve solo posti di quella settimana`.

### Task 3: Nessun conflitto con la visita nata dalla richiesta

**Files:**
- Modify: `src/components/piano/RiquadroRichiesta.tsx` (`VisitaRichiesta` ~17, `oraOccupata` ~25-44)
- Test: `src/components/piano/RiquadroRichiesta.test.tsx`

**Interfaces:**
- `VisitaRichiesta` include anche `richiestaId` (facoltativo, da `Appointment`).

- [ ] **Step 1: test**: richiesta `r1` alle 10:00 e tra le visite una programmata alle 10:00 con `richiestaId: 'r1'` → l'avviso «A quest'ora c'è già una visita» non c'è; la stessa visita con `richiestaId: 'r2'` → l'avviso c'è.
- [ ] **Step 2: verifica che fallisca.**
- [ ] **Step 3: implementa**: nel ramo `visita` di `oraOccupata` salta `voce.richiestaId === richiesta.id`; aggiungi `richiestaId` al `Pick`.
- [ ] **Step 4: test verdi** (`RiquadroRichiesta.test.tsx`, `src/pages/HomePage.test.tsx`).
- [ ] **Step 5: commit** `fix(richieste): dopo Accetta la visita creata non è un conflitto`.

### Task 4: Paywall e Vetrina con la stessa offerta

**Files:**
- Modify: `src/lib/abbonamento.ts` (nuova funzione)
- Modify: `src/hooks/usePiano.tsx` (`PaywallPiano` ~201-220), `src/components/piano/PaywallSheet.tsx`, `src/components/abbonamento/Vetrina.tsx` (~87-160)
- Test: `src/lib/abbonamento.test.ts`, `src/components/piano/PaywallSheet.test.tsx`, `src/components/abbonamento/Vetrina.test.tsx`, `src/hooks/usePiano.test.tsx`

**Interfaces:**
- Produces: `offertaPiano(input: { provaConcessa: boolean, abbonamentiAttivi: boolean, ruolo: string | undefined }): { prova: boolean, acquisto: 'abbonati' | 'avvisami' }` — `prova` = `provaConcessa` e ruolo `undefined` o `'titolare'`; `acquisto` = `'abbonati'` se `abbonamentiAttivi`, altrimenti `'avvisami'`. `mostraPiani` non entra.

- [ ] **Step 1: test di `offertaPiano`**: le quattro combinazioni di `provaConcessa`/`abbonamentiAttivi` con ruolo `'titolare'`; con ruolo `'collaboratore'` e `'socio'` `prova` è `false`.
- [ ] **Step 2: test del paywall** (`usePiano.test.tsx` o `PaywallSheet.test.tsx`, dove oggi si prova `mostraProva`): con `mostraPiani` falso, `provaConcessa` vero e titolare il paywall mostra «Prova gratis» e «Avvisami»; con `abbonamentiAttivi` vero mostra «Abbonati» e non «Avvisami»; con un collaboratore nessuna prova.
- [ ] **Step 3: test della Vetrina Plus**: con `abbonamentiAttivi` falso c'è «Avvisami» e non «Abbonati»; il tocco scrive l'interesse (mock di `scriviInteresse` chiamato con `'piano-plus'`) e apre il dialogo «In arrivo» già esistente; con `abbonamentiAttivi` vero c'è «Abbonati». Sulla Vetrina Salone il tocco usa `'piano-salone'`.
- [ ] **Step 4: verifica che falliscano.**
- [ ] **Step 5: implementa**: `PaywallPiano` passa `mostraProva` e `abbonamentiAttivi` da `offertaPiano` (ruolo dalla sessione come nella Vetrina); la Vetrina calcola `provaDisponibile` con `offertaPiano(...).prova && piano === 'plus'` e, con `acquisto === 'avvisami'`, mostra il pulsante `frasi.avvisami` che chiama `scriviInteresse(\`piano-${piano}\`)` (errori ignorati, come il paywall) e poi apre il dialogo «In arrivo». Le regole Firestore di `interesse/{feature}` accettano già un id qualsiasi: non cambiano.
- [ ] **Step 6: test verdi** (i quattro file, più `src/pages/AbbonamentoPage.test.tsx`).
- [ ] **Step 7: commit** `fix(piani): paywall e pagina del piano offrono la stessa prova e lo stesso pulsante`.

### Task 5: «Ancora 30 giorni» subito dopo la prova

**Files:**
- Modify: `src/lib/piano.ts` (`livelloEffettivo` ~122-128), `src/hooks/usePiano.tsx` (~64-80)
- Test: `src/lib/piano.test.ts`, `src/hooks/usePiano.test.tsx`

- [ ] **Step 1: test in `piano.test.ts`**: prova con `scadeIl` = adesso + 30 giorni + 3 minuti → `giorniProva === 30`; adesso + 29 giorni + 1 ora → `30`; adesso + 29 giorni − 1 ora → `29`; scaduta da poco (offline) → `0`.
- [ ] **Step 2: test in `usePiano.test.tsx`**: provider montato, poi (timer finti) passano 10 minuti e arriva il documento `pro/main` con prova che scade a «ora del documento» + 30 giorni → si legge 30 giorni.
- [ ] **Step 3: verifica che falliscano.**
- [ ] **Step 4: implementa**: in `livelloEffettivo` togli una tolleranza di 5 minuti dalla differenza prima del `Math.ceil` (costante con nome, es. `TOLLERANZA_GIORNI_MS = 5 * 60 * 1000`); in `PianoProvider` aggiorna `adesso` a ogni arrivo di `pro/main`.
- [ ] **Step 5: test verdi** (i due file, più `src/components/abbonamento/SchedaAbbonamento.test.tsx`).
- [ ] **Step 6: commit** `fix(piani): la prova appena avviata dice 30 giorni`.

### Task 6: Testo dei passi mancanti per le prenotazioni

**Files:**
- Modify: `src/components/piano/LinkCondivisione.tsx` (`usePrenotazioniOnline` ~23-60, frase ~228-233), `src/components/abbonamento/BlocchiPiano.tsx` (~178-183)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` (via `prenotaMancaProfilo`, nuova chiave)
- Test: `src/components/piano/LinkCondivisione.test.tsx` (nuovo, stesso stile di `BlocchiPiano.test.tsx`), `src/components/abbonamento/BlocchiPiano.test.tsx`

**Interfaces:**
- `usePrenotazioniOnline()` restituisce anche `mancanti: PassoSalone[]` (i passi non fatti, senza `fiscale`, nell'ordine di `passiCompletamento`).
- Nuova chiave `prenotaMancano`: it «Per accendere le prenotazioni manca: {{passi}}.», en «To turn on bookings, still missing: {{passi}}.», es «Para activar las reservas falta: {{passi}}.» I passi con le etichette `hubPasso*` già esistenti, separati da «, ».

- [ ] **Step 1: test**: profilo senza logo né backup, prenotazioni spente → si legge «Per accendere le prenotazioni manca: Logo, Backup impostato.» ed è un link a `/impostazioni`; stesso profilo con `prenotazioniOnline: true` → nel riquadro del link la frase non c'è; in `BlocchiPiano`, toccando l'interruttore per accenderle, compare la stessa frase.
- [ ] **Step 2: verifica che falliscano.**
- [ ] **Step 3: implementa**: un solo pezzo di JSX o funzione per la frase, usato da entrambi i componenti; nel riquadro di `LinkCondivisione` la frase del profilo non compare quando `settings.prenotazioniOnline` è vero; togli `prenotaMancaProfilo` dai tre file i18n.
- [ ] **Step 4: test verdi** (i due file, `src/i18n/*.test.ts`, `frasiFisse.test.ts`).
- [ ] **Step 5: commit** `fix(prenotazioni): la frase dice quali passi mancano e sparisce a prenotazioni accese`.

### Task 7: «Attivo» solo sul piano in corso

**Files:**
- Modify: `src/lib/abbonamento.ts` (nuova funzione), `src/pages/AbbonamentoPage.tsx` (~66-82)
- Test: `src/lib/abbonamento.test.ts`, `src/pages/AbbonamentoPage.test.tsx`

**Interfaces:**
- Produces: `pianoInCorso(livello: LivelloElenco | undefined): PianoVetrina` — `base`/`undefined` → `'go'`, `pro` → `'plus'`, `salone` e `vip` → `'salone'`. `pianoAttivo` resta per la pagina di dettaglio (~111), dove un Salone vede Plus come compreso.

- [ ] **Step 1: test**: `pianoInCorso` per i quattro livelli e `undefined`; in `AbbonamentoPage` con Plus attivo la scheda Go dice «Gratis», Plus «Attivo», Salone il prezzo; con Salone Go «Gratis», Plus il prezzo, Salone «Attivo»; con Go Go «Attivo».
- [ ] **Step 2: verifica che falliscano.**
- [ ] **Step 3: implementa**: nella lista delle schede `attivo = pianoInCorso(livelloNome) === piano`.
- [ ] **Step 4: test verdi.**
- [ ] **Step 5: commit** `fix(abbonamento): «Attivo» solo sul piano in corso`.

### Task 8: Verifica sull'emulatore e documenti

**Files:**
- Create: `QA-tests/.qa-catalog/verify-basse-prenotazioni.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (riga **Prenotazioni** delle basse → **risolte**, con dettagli), `PROGRESS.md` (nuova sezione)

- [ ] **Step 1: script** a 320/360/390 px su `demo-groomly`, con le functions compilate sull'emulatore, account `pren-`: (P1) tre richieste dalla pagina pubblica con `+39 …`, `0039 …`, `…` → la terza rifiutata; (P2) iscrizione in lista da una settimana piena → documento con `settimana`; un posto liberato in quella settimana e uno fuori → una sola offerta; (P3) Accetta di una richiesta → nessun avviso giallo; (P4) Go con prova disponibile: paywall da Backup automatico e pagina Plus mostrano «Prova gratis» e «Avvisami»; (P5) dopo «Prova gratis» Impostazioni dice 30 giorni; (P6) Abbonamento con Plus: un solo «Attivo»; (P7) riquadro prenotazioni con logo mancante: la frase nomina «Logo»; con prenotazioni accese non c'è.
- [ ] **Step 2: esegui** e salva l'esito; tutti i casi passano.
- [ ] **Step 3: suite** `npx vitest run --dir src` e test di `functions/` dalla radice; fallimenti solo quelli già su main.
- [ ] **Step 4: audit e PROGRESS** aggiornati; commit `docs: basse «Prenotazioni» risolte`.
