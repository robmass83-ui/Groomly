# Listino per razza nelle visite create dal server — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le visite create dal server (richiesta accettata, posto della lista d'attesa confermato) prendono il prezzo con l'ordine prezzo personale del cane → riga della razza nel listino → prezzo per taglia.

**Architecture:** la logica del listino per razza esce da `src/lib/listinoRazza.ts` in un modulo puro con tipi minimi (`src/lib/prezzoListino.ts`), compilabile anche dalle functions (che non possono importare `src/types/priceSheet.ts`: tira dentro `src/assets/icons/icons.ts` con gli `.svg`). `listinoRazza.ts` la riesporta, così l'app non cambia. Le due functions leggono impostazioni, servizi e cane nella transazione e riscrivono solo `price` delle righe della visita.

**Tech Stack:** TypeScript, Firebase Functions v2 (firebase-admin, tsc commonjs con `rootDir: ".."`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-listino-razza-server-design.md`

## Global Constraints

- Pagina pubblica, mail al cliente, `voci` e `totaleIndicativo` della richiesta: invariati.
- Durate, orari, `start`/`end` della visita: invariati. Cambia solo `price` di ciascuna riga.
- Righe con `serviceId` `prenotazione` o con servizio non trovato tra quelli del salone: tengono il prezzo che hanno.
- Nella lista d'attesa, per un cane esistente si usano la sua razza, la sua taglia salvata e i suoi `servicePrices`; per un cane nuovo razza `''` e taglia dell'iscrizione.
- Moduli di `src/lib` importati dalle functions: niente import (nemmeno `import type`) da `src/types/priceSheet.ts`, `src/i18n`, `date-fns`, React. `npm --prefix functions run build` deve passare.
- In Firestore le transazioni leggono tutto prima di scrivere.
- Mai dati di produzione: test solo sugli emulatori `demo-groomly`.

## Review Focus

- Cane esistente con `servicePrices` che ha solo `durationMin` (niente `price`): si passa al listino, poi alla taglia — test in Task 1.
- Razza scritta dal cliente con maiuscole/accenti/spazi («  yorkshire ») o come una delle parti di «Yorkshire / Yorkie»: trova la riga — test in Task 1.
- `settings/main` senza `priceSheet`, o con `priceSheet` malformato (razze non array, voci senza prezzo, voce `tipo: 'valutazione'`): prezzo per taglia, nessun errore — test in Task 1.
- Servizio disattivato (`active: false`) a cui la riga del listino è abbinata: la riga del listino non vale, si usa la taglia — test in Task 1.
- Conferma di una proposta (`appuntamento: 'conferma'`) che sostituisce il segnaposto: anche lì il prezzo dal listino — caso nello script di Task 4.

---

### Task 1: modulo puro del prezzo

**Files:**
- Create: `src/lib/normalizza.ts`, `src/lib/prezzoListino.ts`, `src/lib/prezzoListino.test.ts`
- Modify: `src/lib/dogList.ts:22-24` (`normalizeSearch` diventa `export { normalizeSearch } from './normalizza'`), `src/lib/listinoRazza.ts` (riesporta da `prezzoListino`, tiene le firme con `Dog`/`Service`/`PriceSheet`)

**Interfaces:**
- Produces, in `src/lib/prezzoListino.ts` (nessun import fuori da `./normalizza`):
  - tipi `ServizioListino = { id: string; name: string; active: boolean; price: { piccola: number; media: number; grande: number } }`, `VoceListino = { nome: string; tipo?: string; prezzo?: number | null; servizioId?: string }`, `RazzaListino = { nome: string; voci: VoceListino[] }`, `Listino = { razze: RazzaListino[] }`, `CanePrezzo = { breed: string; size: 'piccola' | 'media' | 'grande'; servicePrices: { serviceId: string; price?: number }[] }`, `RigaVisita = { serviceId: string; name: string; durationMin: number; price: number }`
  - `servizioPerNome`, `servizioDellaRiga`, `razzaDelCane`, `prezzoDalListino` spostate qui con questi tipi strutturali (stesso comportamento di oggi, `SINONIMI` compreso)
  - `prezziVisita(righe: RigaVisita[], cane: CanePrezzo, servizi: ServizioListino[], listino: Listino | undefined): RigaVisita[]`
  - `servizioDaDoc(id: string, data: Record<string, unknown>): ServizioListino`, `listinoDaDoc(valore: unknown): Listino | undefined`, `caneDaDoc(data: Record<string, unknown> | undefined, ricaduta: { breed: string; size: CanePrezzo['size'] }): CanePrezzo`

- [ ] **Step 1: test che falliscono** in `src/lib/prezzoListino.test.ts`. Servizi: `bagno` (Bagno, active, price 20/25/30), `taglio` (Taglio / tosatura, active, 40/45/50), `spento` (Spento, active false, 10/10/10). Listino: razza `Yorkshire / Yorkie` con voci `{nome:'Bagno', prezzo:25}`, `{nome:'Tosatura', prezzo:48}`, `{nome:'Spento', prezzo:99, servizioId:'spento'}`, `{nome:'Taglio', tipo:'valutazione'}`.
  - `prezziVisita` cane `{breed:'  yorkie ', size:'piccola', servicePrices:[]}`, righe bagno 20 + taglio 40 → 25 e 48.
  - prezzo personale `{serviceId:'bagno', price:18}` → bagno 18, taglio 48.
  - prezzo personale con solo `durationMin` (oggetto `{serviceId:'bagno'}`) → bagno 25.
  - razza assente dal listino (`Barboncino`), size `media` → 25 e 45.
  - riga `spento` → prezzo per taglia 10, non 99.
  - riga `{serviceId:'prenotazione', price:0}` e riga con `serviceId:'sparito'` price 33 → invariate.
  - `listino` `undefined` → prezzi per taglia; `durationMin`, `name`, `serviceId` sempre invariati.
  - `listinoDaDoc(undefined)`, `listinoDaDoc({razze:'x'})` → `undefined`; voci non oggetto scartate; `prezzo` non numerico → `undefined`.
  - `servizioDaDoc('a', {})` → `active: false`, prezzi 0; `caneDaDoc(undefined, {breed:'Yorkshire', size:'grande'})` → la ricaduta con `servicePrices: []`; `caneDaDoc({breed:'Maltese', size:'piccola', servicePrices:[{serviceId:'bagno', price:12}, 'x']}, …)` → valori del documento, voci invalide scartate.
- [ ] **Step 2:** `npx vitest run src/lib/prezzoListino.test.ts` → FAIL (modulo mancante).
- [ ] **Step 3:** scrivi `normalizza.ts`, `prezzoListino.ts`, sistema `dogList.ts` e `listinoRazza.ts`. Ordine in `prezziVisita`: servizio non trovato tra `servizi` per `serviceId` → riga invariata; `servicePrices` con `price` numerico → quello; poi `prezzoDalListino`; poi `servizio.price[cane.size]`. I parser accettano solo numeri finiti ≥ 0 per i prezzi; taglia non valida → ricaduta.
- [ ] **Step 4:** `npx vitest run src/lib/prezzoListino.test.ts src/lib/listinoRazza.test.ts src/lib/quote` → PASS; `npx tsc -p . --noEmit` (app) → nessun errore.
- [ ] **Step 5:** commit `refactor(listino): logica del listino per razza in un modulo puro usabile dal server`.

### Task 2: richieste accettate dalla pagina pubblica

**Files:**
- Modify: `functions/src/piano/gestisciPrenotazione.ts` (`applicaPiano`, ~righe 265-343)
- Test: `functions/src/piano/gestisciPrenotazione.test.ts` se esiste un test di `applicaPiano` da estendere; altrimenti la copertura è lo script di Task 4.

**Interfaces:**
- Consumes: `prezziVisita`, `servizioDaDoc`, `listinoDaDoc`, `caneDaDoc` da `../../../src/lib/prezzoListino`.

- [ ] **Step 1:** in `applicaPiano`, nella transazione e prima di ogni `tx.set`/`tx.update`, quando `piano.appuntamento` è `crea` o `conferma`, leggi `settings/main` (campo `priceSheet`), la collezione `services` e, se `dogEsistente`, `dogs/<dogEsistente>`. Cane: documento esistente → `caneDaDoc(doc, { breed: richiesta.razza, size: richiesta.taglia })`; altrimenti `caneDaDoc(undefined, { breed: richiesta.razza, size: richiesta.taglia })`.
- [ ] **Step 2:** sostituisci le due `serviziDellaRichiesta(richiesta.voci)` (crea e conferma con segnaposto) con `prezziVisita(serviziDellaRichiesta(richiesta.voci), cane, servizi, listino)`.
- [ ] **Step 3:** `npm --prefix functions run build` → nessun errore; `npx vitest run functions/src/piano` → PASS.
- [ ] **Step 4:** commit `fix(prenotazioni): la visita accettata prende il prezzo dal listino per razza`.

### Task 3: posto della lista d'attesa confermato

**Files:**
- Modify: `functions/src/piano/confermaAttesa.ts` (`prezzoDi` righe 29-32 e la scrittura della visita ~riga 156)

**Interfaces:**
- Consumes: come Task 2.

- [ ] **Step 1:** nella transazione, prima delle scritture, leggi `settings/main` e la collezione `services` (al posto della sola lettura del servizio `servizioId`, se non serve più altrove). Cane: `esistente` → `caneDaDoc(esistente.data(), { breed: '', size: taglia })`; nuovo → `caneDaDoc(undefined, { breed: '', size: taglia })`.
- [ ] **Step 2:** riga della visita `prezziVisita([{ serviceId: servizioId, name: testo(iscritto.trattamento), durationMin: durataMin, price: <prezzo per taglia di oggi> }], cane, servizi, listino)[0]`; togli `prezzoDi` se resta inutilizzato (`noUnusedLocals`).
- [ ] **Step 3:** `npm --prefix functions run build` → nessun errore; `npx vitest run functions/src/piano` → PASS.
- [ ] **Step 4:** commit `fix(attesa): il posto confermato prende il prezzo del cane o del listino`.

### Task 4: verifica sull'emulatore e documenti

**Files:**
- Create: `QA-tests/.qa-catalog/verify-listino-razza-server.cjs` (sullo stampo di `verify-prenotazioni-online.cjs`: functions compilate sull'emulatore con le regole vere)
- Modify: `docs/AUDIT-QA-2026-11-01.md` (media 23: togli «Restano a prezzo per taglia… (server, da fare)», scrivi risolto con ramo, spec e script), `PROGRESS.md` (passo 2 fatto)

- [ ] **Step 1:** script con un salone di prova: listino Yorkshire bagno 25 €, servizio Bagno 20/25/30.
  - richiesta razza «Yorkshire», taglia piccola, accettata con cane nuovo → visita `price` 25;
  - richiesta accettata collegata a un cane esistente con `servicePrices` bagno 18 → 18;
  - richiesta con proposta di orario, poi confermata (`conferma` che sostituisce il segnaposto) → 25;
  - lista d'attesa, iscritto che corrisponde (email + nome) a uno Yorkshire esistente taglia piccola → 25;
  - lista d'attesa, cane nuovo taglia media → 25 (taglia), `totaleIndicativo` e `voci` della richiesta invariati.
- [ ] **Step 2:** esegui lo script → tutti i casi OK.
- [ ] **Step 3:** aggiorna audit e PROGRESS; commit `docs: listino per razza anche nelle visite create dal server`.
