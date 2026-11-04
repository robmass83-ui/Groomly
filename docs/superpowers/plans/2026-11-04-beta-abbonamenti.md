# Abbonamenti «pronti al clic» — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** codice d'acquisto RevenueCat completo ma spento, webhook che scrive `pro/main`, annuncio, controllo pre-accensione, accensione e spegnimento, pannello admin.

**Architecture:** il webhook è l'unica fonte del piano. Il client (`billing.ts`) compra con un adattatore iniettabile sopra l'SDK, caricato solo se acceso. Le functions nuove stanno in `functions/src/abbonamenti/`.

**Tech Stack:** React 19 + Capacitor 8, `@revenuecat/purchases-capacitor` 14.0.0, Firebase Functions v2, vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-beta-abbonamenti-design.md`

## Global Constraints
- `salon/shared` mai toccato; VIP (`eVip`) mai toccati dal webhook.
- Piano e config scritti solo da functions; callable operatore con `operatoreAutorizzato`, errori `failed-precondition` / `invalid-argument`.
- Con `abbonamentiAttivi` falso nessun `import()` dell'SDK.
- Testi in fondo a `src/i18n/{it,en,es}.ts` nel blocco `// Beta B4`, chiavi con prefisso `b4`.
- Pacchetti attesi: le 6 voci di `PACCHETTI` in `src/lib/idAbbonamenti.ts`. L'offerta si chiama `early-adopter`.
- Test functions: `cd functions && npx vitest run <file>`. App: `npx vitest run <file>`.

## Review Focus
- Evento webhook più vecchio dopo uno più nuovo (fuori ordine) → ignorato (Task 2).
- `app_user_id` anonimo con alias del salone → si applica al salone dell'alias (Task 2).
- Salone in beta che compra → piano `play` subito e traccia beta invariata (Task 3).
- Doppio tocco su «Abbonati» durante l'acquisto → un solo acquisto (Task 7).
- Accensione con il controllo rosso chiamata direttamente (senza pannello) → rifiutata dal server (Task 5).

---

### Task 1: Config — campi nuovi
**Files:** Modify `src/lib/configPiani.ts`, `src/lib/configPiani.test.ts`
**Produces:** `ConfigPiani.pagamentiDal: string|null`, `confermaFiscaleIl: string|null`, `accesiIl: string|null` (default `null`, letti con `dataIsoValida`).
- [ ] Test: `leggiConfigPiani({ piani: { pagamentiDal: '2027-01-01T00:00:00.000Z', confermaFiscaleIl: 'x' } })` → `pagamentiDal` valorizzato, `confermaFiscaleIl` `null`. Default: tutti `null`.
- [ ] Implementare, eseguire i test di configPiani e di `functions/src/config/impostaConfigPiani.test.ts` (che non devono rompersi), commit.

### Task 2: `pianoDaEvento` (puro)
**Files:** Create `functions/src/abbonamenti/eventoRc.ts` + `.test.ts`
**Produces:**
```ts
export type EventoRc = { id: string; type: string; app_user_id?: string; aliases?: string[]; product_id?: string; new_product_id?: string|null;
  expiration_at_ms?: number|null; grace_period_expiration_at_ms?: number|null; event_timestamp_ms?: number; environment?: string }
export function eventoRcDi(body: unknown): EventoRc | null
export function salonIdDiEvento(e: EventoRc): string | null
export function pianoDaEvento(e: EventoRc, attuale: ProMain | undefined, adesso: Date):
  { azione: 'scrivi'; campi: CampiPiano; ms: number } | { azione: 'ignora'; motivo: string }
```
- [ ] Test (una `it` per riga della tabella §4 della spec):
  - INITIAL_PURCHASE `groomly_plus:mensile`, exp 30 giorni → `{piano:'pro',stato:'attivo',fonte:'play',scadeIl:ISO(exp),rinnovoAutomatico:true}`;
  - `groomly_salone` → `seatsIncluded:3`;
  - CANCELLATION → `disdetto`, `rinnovoAutomatico:false`;
  - BILLING_ISSUE con grace → `grazia`, `scadeIl` = grace;
  - EXPIRATION su `fonte:'play'` → `campiBase(true)`; EXPIRATION su `beta` → ignora;
  - PRODUCT_CHANGE con `new_product_id` salone → salone;
  - `TEST`, `TRANSFER`, posto extra, prodotto sconosciuto → ignora;
  - VIP → ignora;
  - `event_timestamp_ms` < `attuale.rcEventoMs` → ignora;
  - `salonIdDiEvento`: anonimo + alias → alias; `shared` → null; contiene `/` → null.
- [ ] Implementare con `campiBase` di `../piano/scriviPiano` ed `eVip`. Test verdi, commit.

### Task 3: webhook HTTP che scrive
**Files:** Create `functions/src/abbonamenti/applicaEventoRc.ts` + `.test.ts`; Modify `functions/src/piano/rcWebhookHttp.ts`
**Produces:** `applicaEventoRc(body: unknown, adesso: Date): Promise<{ scritto: boolean; motivo?: string }>`. Gli id duplicati li ha già filtrati `decisioneWebhook`. In transazione: rilegge `salons/{id}/pro/main`; se `scrivi`, `set({...scriviPiano(campi, adesso), rcEventoMs, rcAmbiente, updatedAt}, {merge:true})`. Scrive sempre `rcStato/webhook {ultimoEventoIl, tipo, ambiente}`.
- [ ] Test con firestoreFinto:
  - salone beta (`campiBeta` + `tracciaBeta`) + INITIAL_PURCHASE → `fonte:'play'`, `exBeta:true`, `earlyAdopter:true` restano;
  - sequenza acquisto → rinnovo → billing → cancellation → expiration → finale `piano:'base'`;
  - `TEST` → solo `rcStato/webhook`;
  - `salon/shared` mai scritto.
- [ ] `rcWebhookHttp`: segreti con `defineSecret('REVENUECAT_API_KEY')` e `defineSecret('REVENUECAT_WEBHOOK_AUTH')`, opzione `secrets`, `.value()`. Dopo `decisione.scrivi`, chiama `applicaEventoRc`, poi `rcEventi/{id}`. Esiste `rcWebhook.test.ts`: deve restare verde.
- [ ] Commit.

### Task 4: annuncio
**Files:** Create `functions/src/abbonamenti/annuncio.ts` + `.test.ts`, `functions/src/abbonamenti/emailAnnuncio.ts`
**Produces:**
- `dataPartenzaValida(data: unknown, adesso: Date): boolean`: giorno Roma ≥ oggi + 15;
- `annunciaPagamentiPer(input: { operatorEmail; emailVerified?; admin?; data: unknown; inviaEmail: (a: {email: string; lingua: Lingua; pagamentiDal: string}) => Promise<void>; adesso?: Date }): Promise<{ ok: true; email: number }>`.
- [ ] Test:
  - non operatore → `Accesso negato`;
  - data a +14 giorni → invalid-argument; a +15 → ok;
  - `abbonamentiAttivi: true` → failed-precondition;
  - scrive `piani.annuncioPagamentiIl` e `piani.pagamentiDal`;
  - email solo ai titolari di saloni con `exBeta` o `earlyAdopter` (`accounts/{uid}` con `email`, `lingua`, `role:'titolare'`), mai `shared`;
  - un `inviaEmail` che lancia non ferma gli altri e non conta.
- [ ] `emailAnnuncio.ts`: oggetto e HTML it/en/es con `emailMessaggio`, testo «Dal {data} Plus e Salone saranno a pagamento…» più la riga sull'offerta fondatori. Commit.

### Task 5: controllo, conferma, accendi, spegni
**Files:** Create `functions/src/abbonamenti/accensione.ts` + `.test.ts`, `functions/src/abbonamenti/offeringRc.ts` + `.test.ts`
**Produces:**
- `src/lib/accensione.ts` (condiviso con il client): tipi `VoceControllo`, `Controllo` come §6 della spec, `GIORNI_ANNUNCIO = 15`.
- `verificaOffering(json: unknown, offeringId: string): { trovati: number; mancanti: string[] }`: cerca `items[].lookup_key === offeringId`, pacchetti per `lookup_key`, prodotto `store_identifier` uguale a `PACCHETTI[k]`.
- `leggiOfferingRc(o: { projectId: string; apiKey: string; offeringId: string; fetch?: typeof fetch })`.
- `controlloPer(stato: { globale: unknown; webhook: unknown; offering: VoceOffering }, adesso): Controllo` (puro).
- `controlloAccensionePer`, `confermaPartitaIvaPer`, `accendiAbbonamentiPer(…, parola)`, `spegniAbbonamentiPer`.
- [ ] Test:
  - tutto vuoto → 0 di 5;
  - chiave `test_x` → rossa;
  - annuncio 14 giorni fa → `mancanoGiorni:1`;
  - `pagamentiDal` futuro → rosso;
  - tutto verde → `tuttoVerde`;
  - offering senza 1 pacchetto → `mancanti:['posto_extra_annuale']`;
  - accendi con un rosso → `Controllo non superato`;
  - parola `accendi` minuscola → invalid-argument;
  - accendi ok → `abbonamentiAttivi:true`, `piani.accesiIl`;
  - spegni → `false` e `pro/main` di un salone `play` invariato.
- [ ] Commit.

### Task 6: export delle callable
**Files:** Create `functions/src/abbonamenti/index.ts`; Modify `functions/src/index.ts` (una riga `export * from './abbonamenti'`)
- [ ] `onCall` con `{ region: 'europe-west1' }` come `pianoCall` (copiarne le opzioni), `secrets` per controllo/accendi. Inviare l'email con `postBrevoHtml` e `brevoApiKey`, come il resto. `REVENUECAT_PROJECT_ID` con `defineString(..., { default: '' })`.
- [ ] `cd functions && npm run build` senza errori. Commit.

### Task 7: `billing.ts` client
**Files:** Modify `src/lib/billing.ts` + test; Create `src/lib/negozioRevenueCat.ts` (adattatore reale, non testato a unità)
**Produces:** come §2 della spec:
- `statoAcquisto`;
- `distribuzioneCorrente(): 'play'|'github'|'web'`;
- `sceltaAcquisto(offering, piano, earlyAdopter)` → `{ tipo: 'pacchetto'; pacchetto } | { tipo: 'opzione'; opzione } | null`;
- `avviaAcquisto({ abbonamentiAttivi, chiaveSdk, offeringId, salonId, piano, earlyAdopter, negozio?: () => Promise<NegozioAbbonamenti> })`;
- `ripristinaAcquisti(...)`;
- un promise in corso blocca il secondo tocco.

Si tengono `sondaggioDisdettaVisibile` e `compra` (usata dalla vetrina spenta).
- [ ] Test:
  - spento → nessuna chiamata a `negozio`;
  - github → `solo-play`;
  - chiave vuota → `non-disponibile`;
  - offering null → `non-disponibile`;
  - early adopter con opzione `early-adopter` → `tipo:'opzione'`; senza → pacchetto;
  - `userCancelled` → `annullato`;
  - due chiamate parallele → un `compra`;
  - `configura` una volta, `collega` al cambio salone.
- [ ] `npm i @revenuecat/purchases-capacitor@14.0.0 --save-exact`. Adattatore con `import('@revenuecat/purchases-capacitor')`. Commit.

### Task 8: usePiano + Vetrina + banner + i18n
**Files:** Modify `src/hooks/usePiano.tsx`, `src/components/abbonamento/Vetrina.tsx` + test, i18n; Create `src/components/abbonamento/BannerPagamenti.tsx` + test; Modify `src/pages/HomePage.tsx` (una riga)
- [ ] `usePiano.acquisto` (§3 della spec).
- [ ] Test della Vetrina (con `billing` finto):
  - spento → comportamento di oggi;
  - acceso + `non-disponibile` → testo `b4NonDisponibile`;
  - beta → dialogo `b4BetaFinisce` prima dell'acquisto;
  - ok → `b4Attivo`;
  - `fonte` diventa play → dialogo chiuso;
  - link «Ripristina acquisti» solo da acceso.
- [ ] Banner: titolare + `pagamentiDal` + spento → visibile; ✕ → nascosto (localStorage `groomly.b4.banner.<data>`); collaboratore → niente.
- [ ] Commit.

### Task 9: PannelloAccensione
**Files:** Create `src/data/firebase/abbonamentiClient.ts`, `src/components/admin/PannelloAccensione.tsx` + test
- [ ] Test con il client finto:
  - 2 di 5 → pulsante disattivato;
  - tutto verde → due dialoghi, la parola ACCENDI abilita la conferma, poi chiama `accendiAbbonamenti`;
  - acceso → «Spegni» con dialogo;
  - casella → `confermaPartitaIva(true)`.
- [ ] Commit.

### Task 10: Android, documenti, verifica
- [ ] `npx cap sync android`. Manifest GitHub con `tools:node="remove"` per BILLING. `gradlew :app:processPlayReleaseManifest :app:processGithubReleaseManifest` (in background): il permesso compare solo nel manifest unito `play`.
- [ ] `npm test`, test functions, `npm run build`, `npx tsc` delle functions. Le regole (`rcStato` senza match = negato): verificarlo in `firestore.rules`.
- [ ] Aggiornare `PROGRESS.md`, `docs/legal/PRIMA-DEI-PAGAMENTI.md` (segreti V2, project id, `rc-ignore-offer`, webhook, Test Store), `DA-FARE-ROBERTO.md`, `docs/DECISIONI-AUTOMATICHE.md` (sezione B4). Note di passaggio nella cartella condivisa. Commit.
