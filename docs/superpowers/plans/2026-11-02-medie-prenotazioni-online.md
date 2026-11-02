# Medie «Prenotazioni online» (audit 5, 6, 7, 9) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il salone risponde alle richieste già arrivate anche a prenotazioni spente o senza piano, il cliente riceve una mail quando la sua richiesta scade senza risposta, la pagina pubblica non offre orari oltre la chiusura e non mostra l'email di login.

**Architecture:** Un solo calcolo degli orari liberi (`mappaLiberi` in `functions/src/piano/postiLiberi.ts`) con un'opzione che salta il controllo «prenotazioni accese» quando chiama il salone; tetto dei 180 minuti tolto. La mail di scadenza riusa il tipo `scadenza` già presente in `src/i18n/emailHtml.ts` (oggi usato solo dall'anteprima), con testo riscritto e telefono; parte da `chiudiNuovePassate`. La Home ascolta le richieste nuove senza guardare il piano.

**Tech Stack:** TypeScript, Firebase Functions v2 + firebase-admin, React (Vite), vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-medie-prenotazioni-online-design.md`

## Global Constraints

- Mai toccare i dati di produzione: prove solo sugli emulatori `demo-groomly`.
- Test delle functions dalla radice: `npx vitest run functions/src/...` (non da dentro `functions/`). Suite con `--exclude '.claude/**'`.
- Testo italiano della mail fissato dalla spec: «Il salone non è riuscito a confermare la tua richiesta per <giorno, ora>. Contattalo direttamente», con telefono del salone se c'è. Tre lingue it/en/es nella lingua clienti del salone.
- La mail di scadenza parte solo dopo che la transazione ha segnato «scaduta», una volta per richiesta; esito in `emailStato` (`'inviata' | 'non_inviata'`).
- Durata: minimo 15 minuti, 60 se non valida, **nessun massimo**.
- La pagina pubblica non mostra mai l'email dell'account.
- Commenti brevi in italiano, nello stile del file che si tocca.

## Review Focus

1. Richiesta «nuova» senza email (o email non valida) che scade → resta «scaduta», `emailStato: 'non_inviata'`, nessun errore che fermi gli altri saloni. Test nel Task 2.
2. Controllo automatico che gira due volte sulla stessa richiesta → una sola mail (la seconda volta non è più «nuova»). Test nel Task 2.
3. Salone senza telefono → la mail non lascia «al » o spazi vuoti; pagina con prenotazioni spente e senza telefono → niente riquadro di contatto vuoto né email. Test nei Task 2 e 3.
4. Servizio più lungo dell'intera fascia (es. 300 minuti in una fascia 09:00–13:00) → nessun orario offerto, e `inviaRichiesta` rifiuta con «Orario non disponibile». Test nel Task 1.
5. Il cliente dalla pagina pubblica, a prenotazioni spente, continua a ricevere «Prenotazioni spente» (il salto vale solo per `gestisciPrenotazione`). Test nel Task 1.

---

### Task 1: Orari liberi per il salone e niente tetto dei 180 minuti (audit 6, 7)

**Files:**
- Modify: `functions/src/piano/postiLiberi.ts` (`durataUtile`, `mappaLiberi`, `postiLiberiPer`)
- Modify: `functions/src/piano/gestisciPrenotazione.ts:411` (chiamata a `postiLiberiPer`)
- Test: `functions/src/piano/postiLiberiSalone.test.ts` (nuovo, con `firestoreFinto.testutil`)

**Interfaces:**
- Produces: `postiLiberiPer(salonId: string, giorno: string, durataMin: number, esclusa?: string, opzioni?: { perSalone?: boolean }): Promise<{ orari: string[] }>` — con `perSalone: true` non chiama `salonPrenota`. `calendarioLiberiPer` invariata (sempre col controllo).

- [ ] **Step 1: Scrivi i test che falliscono** in `postiLiberiSalone.test.ts`, con `vi.mock('firebase-admin/firestore', …firestoreFinto(archivio))` come descritto in testa a `firestoreFinto.testutil.ts`. Dati: `salons/s1/settings/main` con `prenotazioniOnline: false` e `orari` compilati con una sola fascia 09:00–13:00 nel giorno di prova (formato `OrariSettimana` di `src/lib/disponibilita.ts`), `salons/s1/pro/main` con piano Plus attivo; giorno di prova futuro (usa `vi.setSystemTime`).
  - `il cliente a prenotazioni spente riceve ancora «Prenotazioni spente»`: `await expect(postiLiberiPer('s1', giorno, 60)).rejects.toThrow('Prenotazioni spente')`.
  - `il salone a prenotazioni spente vede gli orari liberi`: `expect((await postiLiberiPer('s1', giorno, 60, '', { perSalone: true })).orari).toEqual(['09:00', '10:00', '11:00', '12:00'])`.
  - `il salone senza piano vede gli orari liberi`: togli `pro/main`, stesso risultato con `perSalone: true`.
  - `un servizio di 240 minuti parte solo alle 09:00`: con `prenotazioniOnline: true`, `expect((await postiLiberiPer('s1', giorno, 240)).orari).toEqual(['09:00'])`.
  - `un servizio di 300 minuti in una fascia di 4 ore non ha orari`: `toEqual([])`.

- [ ] **Step 2: Lancia i test e verifica che falliscono**
  Run: `npx vitest run functions/src/piano/postiLiberiSalone.test.ts`
  Expected: FAIL (il salone riceve «Prenotazioni spente»; 240 minuti restituisce più orari).

- [ ] **Step 3: Implementa.** `durataUtile` senza `Math.min(180, …)`. `mappaLiberi` riceve `perSalone` e salta `salonPrenota` quando è vero. In `gestisciPrenotazionePer` passa `{ perSalone: true }`. Commento di una riga: il controllo «prenotazioni accese» vale solo per il cliente.

- [ ] **Step 4: Lancia i test**
  Run: `npx vitest run functions/src/piano/postiLiberiSalone.test.ts functions/src/piano/postiLiberi.test.ts functions/src/piano/gestisciPrenotazione.test.ts functions/src/piano/inviaRichiesta.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit** — `fix: il salone gestisce le richieste arrivate anche a prenotazioni spente; niente tetto di 180 minuti`

---

### Task 2: Mail al cliente quando la richiesta scade senza risposta (audit 5, parte server)

**Files:**
- Modify: `src/i18n/emailHtml.ts` (`DatiEmail` + `telefono?: string`; corpo e oggetto del tipo `scadenza` nelle tre lingue)
- Modify: `functions/src/piano/gestisciPrenotazione.ts` (`inviaMailRichiesta`: per `scadenza` aggiunge `quando` e `telefono`)
- Modify: `functions/src/piano/scadiProposte.ts` (`chiudiNuovePassate(salone, adesso, apiKey)`)
- Test: `src/i18n/emailHtml.test.ts`, `functions/src/piano/scadiNuove.test.ts` (nuovo, `firestoreFinto` + `vi.mock('../brevoMail')`)

**Interfaces:**
- Consumes: `leggiRichiesta(data)` e `inviaMailRichiesta({ apiKey, salonId, tipo: 'scadenza', richiesta })` da `gestisciPrenotazione.ts`.
- Produces: `DatiEmail.telefono?: string`; `chiudiNuovePassate(salone: DocumentReference, adesso: Date, apiKey: string): Promise<number>` (resta privata, chiamata da `scadiProposteScadute`).

- [ ] **Step 1: Scrivi i test che falliscono**
  - In `emailHtml.test.ts`, `la mail di scadenza dice di contattare il salone`: `emailMessaggio('it', 'scadenza', { cliente: 'Ada', cane: 'Fido', salone: 'Bau', quando: 'martedì 3 novembre, 10:00', telefono: '333 1234567' })` → l'html contiene `non è riuscito a confermare`, `martedì 3 novembre, 10:00`, `Contatta`, `333 1234567` e **non** contiene `inviarne una nuova`. Stessa prova per `en` (contiene `wasn't able to confirm`) ed `es` (contiene `no ha podido confirmar`). Senza `telefono`: l'html non contiene `al .`, `at .`, `al  ` né doppi spazi nel paragrafo.
  - In `scadiNuove.test.ts` (salone `s1`, `settings/main` con `business.phone: '333 1234567'`, `linguaClienti: 'it'`, `accounts/s1.email` valida; adesso fissato):
    - `una nuova passata diventa scaduta e il cliente riceve una mail`: richiesta `r1` `status: 'nuova'`, `start` di ieri, email `a@b.it` → dopo `scadiProposteScadute('chiave', adesso)`: `r1.status === 'scaduta'`, `r1.emailStato === 'inviata'`, `postBrevoHtml` chiamata una volta con destinatario `a@b.it`.
    - `la seconda passata non manda un'altra mail`: chiama due volte → `postBrevoHtml` chiamata una volta.
    - `senza email la richiesta scade lo stesso`: `email: ''` → `status: 'scaduta'`, `emailStato: 'non_inviata'`, nessuna chiamata.
    - `una nuova di domani resta nuova e nessuna mail`.

- [ ] **Step 2: Lancia i test e verifica che falliscono**
  Run: `npx vitest run src/i18n/emailHtml.test.ts functions/src/piano/scadiNuove.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementa.**
  - Testo `scadenza` (corpo): it «<ciao> ci dispiace: <salone> non è riuscito a confermare la tua richiesta[ per <cane>][ per <quando>]. Contattalo direttamente[ al <telefono>] per fissare un appuntamento.»; en ed es con lo stesso senso (usa `chi()` come gli altri tipi). Oggetto invariato («La tua richiesta è scaduta» / …). Se `rispondi` è vero può aggiungere «o rispondi a questa email» come fanno gli altri tipi con la nota di risposta: aggiungi `scadenza` a `NOTA_RISPOSTA_TIPI`.
  - `inviaMailRichiesta`, solo per `tipo === 'scadenza'`: `quando` = giorno e ora d'inizio della richiesta (come `quandoConferma` ma solo l'inizio: `${giornoMail(lingua, da)}, ${oraRoma(da)}`), `telefono` = `settings/main.business.phone` ripulito (`trim`), omesso se vuoto.
  - `chiudiNuovePassate`: dopo una transazione che ha segnato «scaduta», `leggiRichiesta(dati)`; se c'è, `inviaMailRichiesta(... tipo 'scadenza')`, poi `set({ emailStato }, { merge: true })`. Un errore di mail si registra col `logger` e non ferma il ciclo. `scadiProposteScadute` passa `apiKey`.

- [ ] **Step 4: Lancia i test**
  Run: `npx vitest run src/i18n/emailHtml.test.ts functions/src/piano/scadiNuove.test.ts functions/src/piano/scadiProposte.test.ts functions/src/piano/gestisciPrenotazione.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit** — `feat: mail al cliente quando la richiesta scade senza risposta`

---

### Task 3: Pagina pubblica senza email di login (audit 9)

**Files:**
- Modify: `functions/src/piano/paginaPubblica.ts:52-53` (niente lettura di `accounts/<salonId>.email`)
- Modify: `src/lib/paginaPubblica.ts` (togli il campo `email` dall'input di `htmlPaginaPubblica` e la sua resa; aggiorna i test che lo passano)
- Test: `src/lib/paginaPubblica.test.ts` (o il file di test esistente di `htmlPaginaPubblica`)

**Interfaces:**
- Produces: `htmlPaginaPubblica(input)` senza `email`.

- [ ] **Step 1: Scrivi i test che falliscono**
  - `a prenotazioni spente la pagina mostra il telefono e nessuna email`: `prenotabile: false`, `telefono: '333 1234567'` → l'html contiene `tel:3331234567` e non contiene `mailto:`.
  - `a prenotazioni spente senza telefono non resta un riquadro di contatto vuoto`: `prenotabile: false`, `telefono: ''` → l'html non contiene `mailto:` né `class="contatta"` vuoto (nessun `<div class="contatta"></div>`).
- [ ] **Step 2: Lancia e verifica che falliscono** — Run: `npx vitest run src/lib/paginaPubblica.test.ts` — Expected: FAIL (il campo `email` esiste ancora / compile error nei test aggiornati).
- [ ] **Step 3: Implementa** togliendo il campo e la lettura dell'account. Se senza telefono il riquadro «contatta» resta vuoto, non renderizzarlo.
- [ ] **Step 4: Lancia** — Run: `npx vitest run src/lib/paginaPubblica.test.ts && cd functions && npx tsc --noEmit` — Expected: PASS, nessun errore di tipo.
- [ ] **Step 5: Commit** — `fix: la pagina pubblica non mostra più l'email di login del titolare`

---

### Task 4: La Home mostra le richieste in attesa anche senza piano (audit 5, parte app)

**Files:**
- Modify: `src/pages/HomePage.tsx:246,275,297` (togli `vedeRichieste` dall'effetto che ascolta `listenRichiesteNuove`; se resta inutilizzato, togli la costante)
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `listenRichiesteNuove` di `src/data/firebase/client.ts` (invariato).

- [ ] **Step 1: Scrivi il test che fallisce** `un Go vede ancora la richiesta arrivata prima della scadenza`: con `firebaseEnabled` vero, `usePiano` in stato Go (livello `base`) e `vi.mock('../data/firebase/client', …)` il cui `listenRichiesteNuove` chiama subito `onData` con una richiesta futura (cane «Fido») → la riga della richiesta con «Fido» compare in Home. Segui i mock già presenti in testa al file.
- [ ] **Step 2: Lancia e verifica che fallisce** — Run: `npx vitest run src/pages/HomePage.test.tsx -t "Go vede ancora"` — Expected: FAIL.
- [ ] **Step 3: Implementa** togliendo la condizione sul piano dall'effetto.
- [ ] **Step 4: Lancia** — Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/HomePage.email.test.tsx && npx tsc --noEmit -p .` — Expected: PASS.
- [ ] **Step 5: Commit** — `fix: la Home mostra le richieste in attesa anche dopo la fine del piano`

---

### Task 5: Verifica sull'emulatore, audit, PROGRESS

**Files:**
- Create: `QA-tests/.qa-catalog/verify-prenotazioni-online.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (punti 5, 6, 7, 9 «— **risolto** (2 novembre 2026, ramo `fix/medie-prenotazioni-online`, spec …)»), `PROGRESS.md`

- [ ] **Step 1:** Compila le functions (`cd functions && npx tsc`) e scrivi lo script sul modello di `verify-a3.cjs` (funzioni compilate in `functions/lib/functions/src/piano/*.js`, emulatori auth+firestore attivi, salone di prova creato dallo script, Brevo finto): (a) `gestisciPrenotazionePer` accetta una richiesta con `prenotazioniOnline: false` → `ok: true`, visita creata; (b) uguale con il piano tolto; (c) `postiLiberiPer` dal cliente a prenotazioni spente → «Prenotazioni spente»; (d) servizio 240 minuti → solo orari che finiscono entro la chiusura; (e) `scadiProposteScadute` su una nuova di ieri → `scaduta`, `emailStato` registrato; (f) `paginaPubblicaHttp` a prenotazioni spente → nessun `mailto:` né email dell'account.
- [ ] **Step 2:** Run: `node QA-tests/.qa-catalog/verify-prenotazioni-online.cjs` — Expected: 6/6 OK.
- [ ] **Step 3:** Prova nel browser (Playwright, app `--mode emu`): titolare Go (`go12`) con una richiesta «nuova» futura scritta con firebase-admin → la richiesta compare in Home; screenshot in `QA-tests/results/prenotazioni-online/`.
- [ ] **Step 4:** Suite: `npx vitest run --exclude '.claude/**'` — unico fallimento ammesso quello noto `src/lib/driveInvio.test.ts`.
- [ ] **Step 5:** Aggiorna audit e PROGRESS, commit `docs: medie «Prenotazioni online» 5, 6, 7, 9 verificate e segnate risolte`.
