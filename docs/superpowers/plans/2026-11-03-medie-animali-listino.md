# Medie «Animali, mensili, listino» (23-26) e 35 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prezzo dell'agenda preso dal foglio per razza (righe abbinate ai servizi), mensili «fissato in ritardo» corretti, tag tolti del tutto, nomi dei servizi interi, nessuna scrittura rifiutata del collaboratore alla chiusura.

**Architecture:** Solo app. Logica pura nuova in `src/lib/listinoRazza.ts` (abbinamento righe↔servizi, razza del cane → razza del foglio, prezzo dal foglio) usata da `quotedPrice` (`src/lib/quote.ts`); Gestione listino permette di correggere l'abbinamento. Le altre correzioni sono locali alle pagine.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-medie-animali-listino-design.md`

## Global Constraints
- Testi in it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`); ogni chiave nuova in tutti e tre; nessun testo italiano fisso nei componenti (aria-label compresi). Prima di cambiare o togliere una chiave esistente, controllare con grep che nessun'altra pagina la usi (regressione già vista con `inRitardo`).
- Nessun cambio a `firestore.rules` né a `functions/`.
- Leggibile a 320, 360 e 390 px senza scorrimento orizzontale.
- Le visite già fissate non cambiano prezzo.
- Test dalla radice: `npx vitest run <file> --exclude '.claude/**'` (alcuni test di pagina solo con `--config vitest.slow.config.ts`); typecheck `npx tsc --noEmit`. Fallimenti noti non correlati: `src/lib/driveInvio.test.ts`; con la config lenta 3 in `appointments.test.tsx` («senza cane la riga non si apre», «l'ospite senza profilo…», «Chi lo fa: un personale nuovo…») e quelli in `DogsPage.test.tsx`.
- Commit con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Foglio assente o vecchio:** un salone senza `settings.priceSheet`, o con righe senza `servizioId` salvate prima di questa versione, deve avere l'abbinamento automatico per nome e nessun errore. Test nel Task 1.
2. **Servizio abbinato poi disattivato o cancellato:** l'abbinamento a un servizio inesistente/non attivo si ignora e vale il prezzo per taglia. Test nel Task 1.
3. **Razza del cane vuota o con spazi/maiuscole/accenti:** vuota → nessuna razza; «  shih   tzu » trova il gruppo. Test nel Task 1.
4. **Due appuntamenti futuri nei mensili:** il secondo non sposta la scadenza del primo; un cane senza visite completate prima del fissato resta come oggi (nessun «in ritardo» inventato). Test nel Task 3.
5. **Collaboratore che chiude con un premio fedeltà in attesa:** nessuna scrittura su settings, chiusura salvata, nessun toast d'errore. Test nel Task 5.

---

### Task 1: Prezzo dal foglio per razza

**Files:**
- Create: `src/lib/listinoRazza.ts`
- Modify: `src/types/priceSheet.ts` (`PriceItem`: `servizioId?: string`), `src/lib/quote.ts`, chiamanti di `quotedPrice` (`src/pages/AppointmentForm.tsx` ~112, ~373, ~727; `src/pages/AppointmentPage.tsx` ~446), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/lib/listinoRazza.test.ts`, `src/lib/quote.test.ts`, test del modulo appuntamento che copre il prezzo proposto

**Interfaces:**
- Produces (in `src/lib/listinoRazza.ts`):
  - `normalizzaNome(testo: string): string` — minuscole, senza accenti (NFD + rimozione segni), spazi compattati e tolti ai lati.
  - `servizioPerNome(nomeRiga: string, servizi: Service[]): string | null` — id del servizio attivo con nome normalizzato uguale a quello della riga, oppure secondo la tabella: `bagno` → servizio di nome «Bagno»; `bagno + tosatura` e `bagno + taglio` → «Bagno + taglio»; `taglio`, `tosatura`, `taglio / tosatura` → «Taglio / tosatura»; `stripping` → «Stripping». Confronto sempre su nomi normalizzati dei servizi attivi; nessuna corrispondenza → `null`.
  - `servizioDellaRiga(riga: PriceItem, servizi: Service[]): string | null` — `riga.servizioId` se è un servizio attivo, se `servizioId === ''` (tolto a mano) → `null`, se assente → `servizioPerNome(riga.nome, servizi)`.
  - `razzaDelCane(breed: string, listino: PriceSheet | undefined): Breed | null` — prima razza del foglio (ordine di `listino.razze`) con una parte del nome, divisa su «/», uguale a `normalizzaNome(breed)`; breed vuota → `null`.
  - `prezzoDalListino(dog: Dog, service: Service, listino: PriceSheet | undefined, servizi: Service[]): { prezzo: number; razza: string } | null` — riga della razza del cane abbinata a `service.id` con `prezzo` numerico e `tipo` diverso da `valutazione`; ritorna anche il nome della razza del foglio.
- `quotedPrice(dog: Dog, service: Service, listino?: { sheet?: PriceSheet; servizi: Service[] }): { price: number; durationMin: number; daListino?: string }` — ordine: override del cane (come oggi, senza `daListino`) → `prezzoDalListino` (prezzo dal foglio, durata del servizio per taglia, `daListino` = nome razza) → servizio per taglia. Senza il terzo argomento comportamento di oggi.
- Il modulo appuntamento passa `{ sheet: settings.priceSheet, servizi: activeServices }` e, quando il prezzo di una riga viene dal foglio, mostra accanto `t(lingua, 'appDalListino', { razza })`.
- Chiave nuova (it): `appDalListino: 'dal listino {{razza}}'`.

- [ ] **Step 1: Test che falliscono:**
  - `normalizzaNome('  Shìh   Tzu ')` → `'shih tzu'`.
  - `servizioPerNome('Bagno + tosatura', SERVICE_SEED)` → `'bagno-taglio'`; `'Bagno'` → `'bagno'`; `'Pelo corto'` → `null`; servizio «Bagno» disattivato → `null`.
  - `servizioDellaRiga({ …, servizioId: 'taglio' })` → `'taglio'`; `servizioId: ''` → `null`; `servizioId` di un servizio cancellato → `null`; senza `servizioId` → per nome.
  - `razzaDelCane('shih tzu', seedPriceSheet(...))` → razza `maltese`; `'Yorkshire'` → `york`; `'Yorkshire terrier'` → `null`; `''` → `null`; listino `undefined` → `null`.
  - `quotedPrice(yorkPiccolo, bagno, { sheet: seed, servizi: SERVICE_SEED })` → `{ price: 25, durationMin: 30, daListino: 'Yorkshire' }`; con override del cane a 22 → 22 senza `daListino`; riga «su valutazione» (Chihuahua «Bagno + tosatura») → prezzo del servizio; cane senza razza sul foglio → prezzo per taglia (20); senza terzo argomento → 20.
  - modulo appuntamento: cane Yorkshire piccolo, servizio Bagno → prezzo 25 e testo «dal listino Yorkshire».
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare; i chiamanti passano il listino; le visite già salvate non si ricalcolano (il prezzo si propone solo scegliendo i servizi, come oggi).
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(listino): il prezzo in agenda viene dal listino per razza`

### Task 2: Abbinamento delle righe in Gestione listino

**Files:**
- Modify: `src/pages/PriceSheetManagePage.tsx` (cercare con grep il file della rotta `/listino/gestione`), eventuale componente di modifica riga, `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: test della pagina di gestione

**Interfaces:**
- Consumes: `servizioDellaRiga(riga, servizi)` (Task 1), servizi attivi da `useServices`/equivalente usato in `ListinoPage`.
- Ogni riga di razza mostra sotto il nome il servizio abbinato (`servizioDellaRiga`) o `listinoNessunServizio`; toccando si sceglie fra i servizi attivi `kind === 'principale'` e «Nessun servizio»; la scelta salva `servizioId` (id del servizio, oppure `''` per «Nessun servizio») nella riga del foglio con il salvataggio già usato dalla pagina.
- Chiavi nuove (it): `listinoServizioAbbinato: 'In agenda: {{servizio}}'`, `listinoNessunServizio: 'Non usato in agenda'`, `listinoScegliServizio: 'Servizio in agenda'` (titolo del foglio di scelta), `listinoNessunServizioScelta: 'Nessun servizio'`.

- [ ] **Step 1: Test che falliscono:** riga «Bagno» dello Yorkshire mostra «In agenda: Bagno»; riga «Pelo corto» mostra «Non usato in agenda»; scegliere «Taglio / tosatura» salva `servizioId: 'taglio'` nella riga; scegliere «Nessun servizio» salva `servizioId: ''`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(listino): in Gestione listino si sceglie il servizio dell'agenda per ogni riga`

### Task 3: Mensili, fissato in ritardo

**Files:**
- Modify: `src/lib/cycle.ts` (`monthlyStatus` ~153-180, `openDue` ~71-90)
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Per un cane con appuntamento fissato (`booked`), la scadenza di confronto si calcola dall'ultima visita completata con `start` precedente a `booked.start`; gli appuntamenti successivi a `booked` non contano. Firma di `monthlyStatus` invariata.

- [ ] **Step 1: Test che falliscono:** cane mensile ogni 4 settimane, completata 22/09, programmati 19/11 e 01/12, adesso 03/11 → riga «fissato» con `late: true` e data 19/11 (soglia esistente 14 giorni); stesso caso senza il 01/12 → stesso risultato; fissato puntuale (completata 22/10, programmato 19/11) → non in ritardo; nessuna completata prima del fissato → come oggi.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS (anche `src/pages/monthly.test.tsx`).
- [ ] **Step 5: Commit** `fix(mensili): un fissato tardivo risulta in ritardo anche con un appuntamento dopo`

### Task 4: Tag tolti e nomi dei servizi interi

**Files:**
- Modify: `src/pages/DogPage.tsx` (~1055 e visualizzazione dei tag), `src/lib/dogFormSeed.ts`, `src/data/local/dogs.ts`, `src/data/firebase/localSeed.ts`, `src/lib/firebaseMap.ts`, `src/data/local/settings.ts` (`tagSuggestions`), ogni altra pagina che mostra tag (grep `tags`, `tagSuggestions`, `schedaPiuTag`, `schedaAggiungiTag`), `src/pages/ServicesPage.tsx`, `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: test di DogPage, delle mappe dati (`firebaseMap`/`dogs`), di ServicesPage

**Interfaces:**
- Tag: nessuna interfaccia li mostra o li modifica; la scrittura del cane non include più `tags` (né nel documento Firestore né nella copia locale); la lettura ignora il campo; `tagSuggestions` non si legge né si scrive più; le chiavi i18n usate solo dai tag si tolgono (grep prima). Il tipo `Dog` perde `tags` se nessun altro lo usa (altrimenti `tags` resta opzionale e non usato: scegliere togliendolo se il typecheck lo permette).
- Servizi: la riga mostra il nome intero (a capo su parole intere, al massimo due righe, mai ellissi) e sotto «durata · prezzo»; il pulsante indietro della testata allineato al titolo.

- [ ] **Step 1: Test che falliscono:** scheda di un cane con `tags: ['ipoallergenico']` nei dati → il testo «ipoallergenico» non compare; il modulo del cane non ha controlli per tag; il cane salvato (local e mappa Firestore) non contiene `tags`; la pagina Servizi mostra «Taglio / tosatura» intero senza stile di ellissi (`text-overflow` assente sul nome) e durata/prezzo in un elemento separato sotto il nome.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(animali): tag tolti; nomi dei servizi interi su telefono piccolo`

### Task 5: Collaboratore senza scritture rifiutate alla chiusura

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (premio ~970, mail «pronto» ~999, contatore recensioni ~1264, menu «Altre azioni» ~672), `src/pages/HomePage.tsx` (premio ~546, sincronizzazione coda ~437)
- Test: `src/pages/AppointmentPage.test.tsx` (config lenta), `src/pages/HomePage.test.tsx`

**Interfaces:**
- Ruolo da `useSession()` (`account.role === 'collaboratore'`). Per il collaboratore: `applicaPremioInChiusura` non applica il premio (nessun `saveSettings` per `premiInAttesa`), `proponiPronto` non propone, il contatore richieste recensione non si scrive, l'effetto che sincronizza la coda email in Home non salva; il menu «Altre azioni» non mostra «Elimina» (se il menu resta vuoto, il pulsante che lo apre non si mostra). Titolare e socio invariati.

- [ ] **Step 1: Test che falliscono:** collaboratore chiude una visita con un premio in attesa per quel cane → `saveSettings` non chiamato, chiusura salvata, nessun toast `authSalvataggio`; collaboratore → nessuna proposta di mail «pronto»; collaboratore → «Altre azioni» senza «Elimina»; Home del collaboratore con una coda da sincronizzare → `save` non chiamato; titolare → comportamento di oggi (premio applicato, Elimina presente).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS; poi suite intera.
- [ ] **Step 5: Commit** `fix(collaboratore): niente scritture rifiutate alla chiusura e niente Elimina visita`

### Task 6: Verifica sull'emulatore e audit

**Files:**
- Create: `QA-tests/.qa-catalog/verify-animali-listino.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (23-26 e 35 «risolto»), `PROGRESS.md`

Browser (Playwright, app in modo emu, dati con firebase-admin come `verify-agenda-incassi.cjs`), a 320/360/390 px:
- cane Yorkshire piccolo: nuovo appuntamento con Bagno → 25 € e «dal listino Yorkshire»; Gestione listino: riga Bagno dello Yorkshire abbinata a «Taglio / tosatura» → l'appuntamento propone per Taglio 25 € e per Bagno il prezzo per taglia; «Aggiorna prezzi» +10% → il nuovo prezzo proposto è quello aggiornato; una visita già fissata resta col prezzo di prima.
- Mensili: caso dell'audit (completata 22/09, programmati 19/11 e 01/12) → «Fissato in ritardo · 19 nov».
- Cane con tag nei dati: nessun tag visibile nella scheda né nell'elenco; dopo un salvataggio il documento Firestore non ha il campo `tags` modificato da quel salvataggio (il campo non viene riscritto).
- Servizi e durate a 320 px: nomi interi.
- Collaboratore chiude una visita con premio in attesa: nessun «Salvataggio non riuscito», `settings/main` invariato; nessun «Elimina» nel menu.

- [ ] **Step 1:** Ambiente come in PROGRESS.
- [ ] **Step 2:** `node QA-tests/.qa-catalog/verify-animali-listino.cjs` → tutto OK; screenshot in `QA-tests/results/animali-listino/`.
- [ ] **Step 3:** Audit e PROGRESS; commit `docs: Animali, mensili, listino 23-26 e 35 risolti e verificati`.
