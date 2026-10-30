# Indirizzo con suggerimenti di Google Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il campo indirizzo della toelettatura propone gli indirizzi di Google mentre si scrive, salva quello scelto con il suo identificativo, e la pagina pubblica apre esattamente quel luogo su Google Maps; l'indirizzo esce dalla registrazione.

**Architecture:** Due callable (`suggerisciIndirizzi`, `dettaglioIndirizzo`) fanno da ponte verso Places API (New) con la chiave in un secret e un limite giornaliero per utente. Un componente `IndirizzoInput` (combobox accessibile, stile Groomly) le usa con token di sessione e ripiego a testo libero. `business.placeId` si salva accanto a `business.address` e arriva alla pagina pubblica.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library (happy-dom), Firebase Functions v2 (`onCall`, `defineSecret`), Firestore Admin, Places API (New) via `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-30-indirizzo-google-design.md`

## Global Constraints

- Chiave solo nel secret `PLACES_API_KEY`; mai nell'app, nei log o nelle risposte.
- Callable in `europe-west1`, `invoker: 'public'`, ma rifiutano chi non è entrato (`requireUid`).
- Limite: 200 richieste al giorno per utente (somma di suggerimenti e dettagli); oltre → `HttpsError('resource-exhausted')`.
- Autocomplete: `POST https://places.googleapis.com/v1/places:autocomplete`, header `X-Goog-Api-Key`, corpo `{ input, sessionToken, languageCode, regionCode: 'it', includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'] }`; al massimo 5 risultati (`placePrediction.placeId`, `structuredFormat.mainText.text`, `structuredFormat.secondaryText.text`).
- Details: `GET https://places.googleapis.com/v1/places/{placeId}?sessionToken=…&languageCode=…`, header `X-Goog-Api-Key` e `X-Goog-FieldMask: formattedAddress`.
- Chiave assente → `suggerisciIndirizzi` restituisce `{ suggerimenti: [] }` senza chiamare Google (l'app ricade sul testo libero).
- Lista dopo 3 caratteri e 300 ms di pausa; nuovo token di sessione (`crypto.randomUUID()`) all'inizio di ogni ricerca, riusato fino alla scelta.
- Stile: `Input` esistente; lista in card `--card`/`--line`/`--sh-2`, raggio 12, apertura 200 ms (sfuma + 6px, `cubic-bezier(.22,1,.36,1)`), righe ≥ 44px, attiva `--pri-s`, icona lucide `MapPin`; spunta `--ok` "indirizzo verificato"; dicitura "con tecnologia Google" in fondo alla lista; `prefers-reduced-motion` senza movimento.
- Testi in `src/i18n/it.ts`, `en.ts`, `es.ts` (prefisso `ind`): `indVerificato` "Indirizzo verificato", `indNonTrovi` "Non trovi il tuo indirizzo? Usa quello che hai scritto", `indGoogle` "con tecnologia Google", `indCerca` "Cerca l'indirizzo".

## Review Focus

- Risposte di Google che arrivano fuori ordine (scrivo "via Ren", poi "via Renoir 8"): la lista mostra solo la risposta all'ultimo testo. → test in Task 2.
- Utente che sceglie un suggerimento e poi modifica a mano il testo: `placeId` deve sparire, altrimenti la pagina pubblica apre un luogo diverso da quello scritto. → test in Task 2 e Task 3.
- Google irraggiungibile, limite superato o chiave assente: il campo resta usabile come testo libero e mostra `indNonTrovi`, nessun errore bloccante. → test in Task 2.
- Indirizzo vecchio senza `placeId` (tutti i saloni esistenti): pagina pubblica identica a oggi. → test in Task 3.
- Telefono con profilo di registrazione salvato prima di questa versione (contiene `address`): la riparazione del salone continua a funzionare. → test in Task 4.

---

### Task 1: Callable verso Google con limite giornaliero

**Files:**
- Create: `functions/src/indirizzi/places.ts`
- Create: `functions/src/indirizzi/places.test.ts`
- Modify: `functions/src/index.ts` (secret `placesApiKey = defineSecret('PLACES_API_KEY')`; export delle due callable accanto alle altre)
- Modify: `firestore.rules` (collezione `placesRateLimits/{uid}`: `allow read, write: if false;`, accanto a `emailRateLimits`)

**Interfaces:**
- Produces:
  - `type Suggerimento = { placeId: string; principale: string; secondario: string }`
  - `suggerimentiDa(input: { testo: string; sessione: string; lingua: string; chiave: string; fetch: typeof fetch }): Promise<Suggerimento[]>` — testo < 3 caratteri o `chiave === ''` → `[]` senza chiamare; risposta non ok → `[]`; massimo 5.
  - `dettaglioDa(input: { placeId: string; sessione: string; lingua: string; chiave: string; fetch: typeof fetch }): Promise<{ indirizzo: string; placeId: string } | null>` — `null` se risposta non ok o `formattedAddress` vuoto.
  - `decisioneLimite(attuale: unknown, oggi: string): { ok: boolean; prossimo: { giorno: string; conteggio: number } }` — giorno diverso → riparte da 1; `conteggio >= 200` → `ok: false`.
  - callable `suggerisciIndirizzi` (dati `{ testo, sessione, lingua }`) → `{ suggerimenti: Suggerimento[] }`; callable `dettaglioIndirizzo` (dati `{ placeId, sessione }`, lingua opzionale) → `{ indirizzo, placeId } | { indirizzo: '', placeId: '' }`. Entrambe: `requireUid`, poi transazione su `placesRateLimits/{uid}` con `decisioneLimite` (giorno = data di Roma `YYYY-MM-DD`), poi la funzione pura con `fetch` globale e `placesApiKey.value()` (stringa vuota se il secret manca: avvolgere in try/catch).

- [ ] **Step 1: Write the failing tests** (`places.test.ts`, `fetch` finto che registra la chiamata):
  - `suggerimentiDa` con `testo: 'via Renoir 8'` chiama `places:autocomplete` con header `X-Goog-Api-Key: 'k'` e corpo contenente `sessionToken`, `languageCode: 'it'`, `regionCode: 'it'`; con 7 predizioni restituisce 5 `{ placeId, principale, secondario }`.
  - `suggerimentiDa` con `testo: 'vi'` o `chiave: ''` → `[]` e `fetch` mai chiamato; risposta 500 → `[]`.
  - `dettaglioDa` chiama `places/abc?sessionToken=s` con `X-Goog-FieldMask: formattedAddress`; risposta `{ formattedAddress: 'Via Renoir, 8, 09045 Quartu Sant\'Elena CA, Italia' }` → `{ indirizzo: …, placeId: 'abc' }`; risposta 404 → `null`.
  - `decisioneLimite(undefined, '2026-10-30')` → `{ ok: true, prossimo: { giorno: '2026-10-30', conteggio: 1 } }`; `({ giorno: '2026-10-30', conteggio: 200 }, '2026-10-30')` → `ok: false`; `({ giorno: '2026-10-29', conteggio: 200 }, '2026-10-30')` → `ok: true, conteggio: 1`.
- [ ] **Step 2:** `npx vitest run functions/src/indirizzi/places.test.ts` → FAIL.
- [ ] **Step 3:** Implementa `places.ts`, le callable in `index.ts`, la regola Firestore.
- [ ] **Step 4:** test → PASS; `npm --prefix functions run build` → nessun errore; `npm run test:rules` → verde.
- [ ] **Step 5:** commit `feat: suggerimenti di indirizzi da Google lato server`.

### Task 2: Componente `IndirizzoInput`

**Files:**
- Create: `src/components/ui/IndirizzoInput.tsx`
- Create: `src/components/ui/indirizzoInput.css` (apertura lista, riga attiva, spunta; blocco `prefers-reduced-motion`)
- Modify: `src/data/firebase/client.ts` (wrapper delle callable, accanto a `callImpostaFunzione` ~474)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/components/ui/IndirizzoInput.test.tsx`

**Interfaces:**
- Consumes: callable di Task 1.
- Produces:
  - client: `callSuggerisciIndirizzi(testo: string, sessione: string, lingua: string): Promise<{ placeId: string; principale: string; secondario: string }[]>`; `callDettaglioIndirizzo(placeId: string, sessione: string, lingua: string): Promise<{ indirizzo: string; placeId: string } | null>`. Errori (rete, `resource-exhausted`) → rispettivamente `[]` e `null`, mai eccezioni.
  - `IndirizzoInput({ label, valore, placeId, onChange }: { label: string; valore: string; placeId?: string; onChange: (next: { indirizzo: string; placeId?: string }) => void })`:
    - digitazione → `onChange({ indirizzo: testo })` (senza `placeId`); dopo 3 caratteri e 300 ms chiede i suggerimenti; scarta le risposte che non corrispondono all'ultimo testo chiesto.
    - scelta (tocco, o Invio sulla riga attiva) → `callDettaglioIndirizzo`; se ok `onChange({ indirizzo, placeId })`, chiude la lista, nuovo token di sessione alla prossima ricerca; se `null` tiene il testo del suggerimento (`principale, secondario`) senza `placeId`.
    - `placeId` presente → spunta `--ok` con `indVerificato` accanto al campo.
    - nessun suggerimento dopo una ricerca completata → riga `indNonTrovi` che chiude la lista.
    - combobox: input `role="combobox"` con `aria-expanded`, `aria-controls`, `aria-activedescendant`; lista `role="listbox"`, righe `role="option"`; frecce su/giù, Invio, Esc.
    - in fondo alla lista `indGoogle`.

- [ ] **Step 1: Write the failing tests** (mock di `../../data/firebase/client`, `vi.useFakeTimers`):
  - scrivo "via" → nessuna chiamata; scrivo "via Renoir 8" e passano 300 ms → `callSuggerisciIndirizzi('via Renoir 8', <uuid>, 'it')` una sola volta; compaiono 2 `option` con "Via Renoir 8" e "Quartu Sant'Elena CA, Italia".
  - risposta lenta per "via Ren" che arriva dopo quella di "via Renoir 8" → restano le opzioni di "via Renoir 8".
  - clic sulla prima opzione → `onChange` con `{ indirizzo: 'Via Renoir, 8, 09045 Quartu Sant\'Elena CA, Italia', placeId: 'abc' }`, lista chiusa; con `placeId` passato come prop si vede `indVerificato`.
  - con `placeId` presente, scrivo un carattere → `onChange` senza `placeId`.
  - `callSuggerisciIndirizzi` restituisce `[]` → si vede `indNonTrovi`; nessun errore.
  - tastiera: freccia giù + Invio sceglie la prima opzione; Esc chiude.
  - lo stesso token di sessione è usato per i suggerimenti e per il dettaglio della stessa ricerca; dopo la scelta una nuova ricerca usa un token diverso.
- [ ] **Step 2:** `npx vitest run src/components/ui/IndirizzoInput.test.tsx` → FAIL.
- [ ] **Step 3:** Implementa wrapper client, componente, CSS, testi it/en/es.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: campo indirizzo con suggerimenti di Google`.

### Task 3: `placeId` sul salone, scheda Toelettatura e pagina pubblica

**Files:**
- Modify: `src/data/local/settings.ts:128` (`business.placeId?: string`) e `mergeSettings` (~205-211: tenuto solo se stringa non vuota)
- Modify: `src/pages/AccountPage.tsx:452` (sostituisce l'`Input` indirizzo con `IndirizzoInput`; la bozza `bozzaBusiness` tiene anche `placeId`; il salvataggio ~112 scrive `placeId` o lo toglie)
- Modify: `src/lib/paginaPubblica.ts:51-60, 132-134` (input `placeId?: string`; `mapsHref(indirizzo, placeId)`)
- Modify: `functions/src/piano/paginaPubblica.ts:37-60` (passa `testo(business.placeId)`)
- Test: `src/data/local/settings.test.ts`, `src/lib/paginaPubblica.test.ts`, `src/pages/AccountPage.test.tsx` (aggiungi; crea se assente)

**Interfaces:**
- Consumes: `IndirizzoInput` (Task 2).
- Produces: `SettingsMain['business']['placeId']?: string`; `mapsHref(indirizzo: string, placeId?: string): string` — con `placeId`: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}&query_place_id=${encodeURIComponent(placeId)}`; senza: invariato.

- [ ] **Step 1: Write the failing tests:**
  - settings: `business.placeId: 'abc'` sopravvive a `getSettings`; `placeId: ''` o `7` sparisce.
  - paginaPubblica: con `placeId: 'abc'` l'HTML contiene `query_place_id=abc`; senza `placeId` contiene `https://maps.google.com/?q=` come oggi.
  - AccountPage: nella scheda Toelettatura scelgo un suggerimento (mock client) e salvo → `settings.business.address` e `placeId` salvati; riapro, scrivo a mano e salvo → `placeId` assente.
- [ ] **Step 2:** `npx vitest run src/data/local/settings.test.ts src/lib/paginaPubblica.test.ts src/pages/AccountPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementa.
- [ ] **Step 4:** → PASS; `npm --prefix functions run build` → nessun errore.
- [ ] **Step 5:** commit `feat: indirizzo verificato nella scheda toelettatura e sulla pagina pubblica`.

### Task 4: Indirizzo fuori dalla registrazione

**Files:**
- Modify: `src/pages/LoginPage.tsx:89, 133` (tolto il campo e il valore di default)
- Modify: `src/lib/schemas.ts:130` (`address` facoltativo, default `''`)
- Modify: `src/hooks/useSession.tsx:15-24` (`RegistrationValues.address` facoltativo; si passa `address: ''`)
- Test: `src/pages/LoginPage.test.tsx` (aggiorna/aggiungi)

**Interfaces:**
- Consumes: niente di nuovo. `pendingSalon` e `OwnerProfile` restano con `address: string` (compatibilità con profili già salvati).

- [ ] **Step 1: Write the failing tests:** il modulo di registrazione non ha più un campo con etichetta `frasi.authIndirizzo`; una registrazione completa crea il salone con `business.address === ''`; un profilo in attesa salvato con `address: 'Via Roma 1'` viene ancora letto da `readPendingSalon` e usato da `repair` senza errori.
- [ ] **Step 2:** `npx vitest run src/pages/LoginPage.test.tsx` → FAIL (il primo test). Il test del profilo in attesa va in `src/pages/LoginPage.test.tsx` (non esiste un file di test per `pendingSalon`).
- [ ] **Step 3:** Implementa.
- [ ] **Step 4:** → PASS; `npm test` → tutto verde; `npm run build` → nessun errore.
- [ ] **Step 5:** commit `feat: l'indirizzo non si chiede più alla registrazione`.

### Task 5: Configurazione e rilascio

- [ ] **Step 1:** Guida Roberto (è un'azione sul suo account): attivare **Places API (New)** nella console Google Cloud del progetto, creare una chiave limitata a quella API, consigliare un avviso di budget; poi `firebase functions:secrets:set PLACES_API_KEY` con la chiave che fornisce.
- [ ] **Step 2:** Con il suo via libera: `firebase deploy --only functions:suggerisciIndirizzi,functions:dettaglioIndirizzo,functions:paginaPubblica,firestore:rules`.
- [ ] **Step 3:** Prova a mano (skill `run`): scheda Toelettatura → "via Renoir 8" → lista con più città → scelta → spunta → pagina pubblica apre il luogo su Google Maps; senza rete compare `indNonTrovi`.
- [ ] **Step 4:** Il tour (`2026-10-30-tour-prepariamo-salone.md`) usa `IndirizzoInput` nel passo Sede; l'APK si pubblica una volta sola, alla fine del tour.
