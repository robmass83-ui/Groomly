# Metriche e testi legali Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere il blocco 4: pagina `/admin/metriche`, Analytics e Crashlytics solo col consenso del titolare, Privacy, Termini e DPA in una nuova versione, riaccettazione automatica a una data.

**Architecture:** I numeri della Console li calcola di notte il server e non dipendono dal consenso. Gli strumenti Google stanno dietro un solo modulo, spento nel manifest e acceso solo se `puoRaccogliere` è vera. I testi cambiano prima, il numero di versione si alza una volta sola nell'ultima attività di codice.

**Tech Stack:** React, TypeScript, Capacitor 8, Firebase (Firestore, Functions v2), `@capacitor-firebase/analytics` e `crashlytics` 8.6.0, exceljs, vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-metriche-legale-design.md`

## Global Constraints

- Mai scrivere o leggere dati di `salon/shared` e `salons/{uid di Laura}` nella statistica. Mai dati dei clienti finali, nomi, email, uid o testo libero a Google.
- Contatto pubblico `info@groomlyapp.it`. Mai `robmass83@gmail.com`, mai `firebaseapp.com`. Solo «Quartu Sant'Elena (CA)», nessun indirizzo di casa.
- Plus e Salon restano spenti. Niente deploy, APK o merge.
- Testi in it, en, es, fr, de. Interfaccia compatta, chiaro e scuro.
- Modifiche piccole a `AdminLayout.tsx`, `adminRoutes.tsx`, `SistemaPage.tsx`.
- `VERSIONE_DOCUMENTI` si alza solo nel Task 11.
- `docs/legal/{privacy,termini,dpa}.html` e `hosting/privacy.html` sono copie esatte di `hosting/*/index.html`.
- Test: `npx vitest run <file>`, `npm --prefix functions test`, `npm run test:rules`. I worktree non hanno `.env.local`.
- Commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Account con versione 1 senza riga sul server, dopo l'aumento: deve restare a 1, senza accettazione finta. Test nel Task 11.
2. Titolare che accede da un secondo telefono: il consenso è dell'account, la raccolta si accende anche lì. Test nel Task 3.
3. Cambio account sullo stesso telefono, da titolare con consenso a collaboratore: la raccolta si spegne prima che parta un evento. Test nel Task 3.
4. Errore JavaScript con il nome di un cliente nel messaggio: a Crashlytics non arriva il messaggio. Test nel Task 3.
5. Giorno del cambio d'ora e salone con `createdAt` mancante: la statistica non si ferma e conta il giorno giusto. Test nel Task 6.

---

### Task 1: Plugin e Android spenti di base

**Files:**
- Modify: `package.json`, `package-lock.json`, `vite.config.ts:8-18`, `scripts/controlla-bundle-admin.mjs:6-21`
- Modify: `android/app/src/main/AndroidManifest.xml`, `android/build.gradle`, `android/app/build.gradle:88-93`
- Test: `src/config/metricheAndroid.test.ts`

**Interfaces:**
- Produces: plugin disponibili, raccolta spenta all'avvio.

- [ ] **Step 1: Installare** `@capacitor-firebase/analytics@8.6.0` e `@capacitor-firebase/crashlytics@8.6.0`. Se `npm install` dà ERESOLVE su `firebase`, aggiungere `overrides` in `package.json` per il solo plugin Analytics, senza `--force`.

- [ ] **Step 2: Scrivere il test che fallisce**

```ts
it('il manifest parte con tutto spento e senza AD_ID', () => {
  const m = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  for (const nome of ['firebase_analytics_collection_enabled', 'firebase_crashlytics_collection_enabled',
    'google_analytics_adid_collection_enabled', 'google_analytics_ssaid_collection_enabled',
    'google_analytics_default_allow_ad_personalization_signals']) {
    expect(m).toMatch(new RegExp(`android:name="${nome}"\\s+android:value="false"`))
  }
  expect(m).toMatch(/com\.google\.android\.gms\.permission\.AD_ID"\s+tools:node="remove"/)
})
it('il sito admin non carica i plugin', () => {
  expect(readFileSync('vite.config.ts', 'utf8')).toContain("'@capacitor-firebase/analytics'")
  expect(readFileSync('scripts/controlla-bundle-admin.mjs', 'utf8')).toContain('capacitor-firebase')
})
```

- [ ] **Step 3: Verificare che fallisca**: `npx vitest run src/config/metricheAndroid.test.ts`, FAIL.

- [ ] **Step 4: Implementare.** Metadati in `<application>`, `xmlns:tools` sul manifest, permesso con `tools:node="remove"`. Classpath `com.google.firebase:firebase-crashlytics-gradle` in `android/build.gradle`, `apply plugin: 'com.google.firebase.crashlytics'` nello stesso `if` di `google-services`. Entrambi i plugin in `PLUGIN_NATIVI`; `capacitor-firebase` in `VIETATI`. Lanciare `npx cap sync android`.

- [ ] **Step 5: Verificare**: test PASS; da `android/`, `./gradlew assembleGithubDebug` riesce. Se Gradle non è praticabile nel worktree, dirlo nel rapporto.

- [ ] **Step 6: Commit** `feat(metriche): plugin Firebase, raccolta spenta di base`

### Task 2: Consenso sull'account

**Files:**
- Create: `functions/src/legale/consensoMetriche.ts`, `functions/src/legale/consensoMetriche.test.ts`
- Modify: `src/lib/versioneLegale.ts`, `src/data/firebase/client.ts:536`, `functions/src/index.ts:899`, `firestore.rules:85-97`, `src/lib/firestoreRules.emulator.test.ts`, il tipo `LocalAccount` e la lettura dell'account (come `emailPromo`)

**Interfaces:**
- Produces in `src/lib/versioneLegale.ts`: `type ConsensoMetriche = { attivo: boolean; at: string; fonte: 'tour' | 'riaccettazione' | 'account'; versione: number }`, `leggiConsensoMetriche(value: unknown): ConsensoMetriche | undefined`.
- Produces: `LocalAccount.consensoMetriche?: ConsensoMetriche`.
- Produces in client: `callImpostaConsensoMetriche(attivo: boolean, fonte: ConsensoMetriche['fonte']): Promise<ConsensoMetriche>`.
- Produces in functions: callable `impostaConsensoMetriche`, `impostaConsensoMetrichePer(input: { uid: string; attivo: boolean; fonte: string }, archivio, adesso: Date)`.

- [ ] **Step 1: Test che falliscono**

```ts
it('salva scelta, data del server e versione, con riga di registro', async () => {
  const r = await impostaConsensoMetrichePer({ uid: 'u', attivo: true, fonte: 'tour' }, archivio, ADESSO)
  expect(r.consenso).toEqual({ attivo: true, at: ADESSO.toISOString(), fonte: 'tour', versione: VERSIONE_DOCUMENTI })
  expect(archivio.righe[0]).toMatchObject({ tipo: 'consenso-metriche', attivo: true, fonte: 'tour' })
})
it('rifiuta una fonte sconosciuta', async () => {
  await expect(impostaConsensoMetrichePer({ uid: 'u', attivo: true, fonte: 'x' }, archivio, ADESSO)).rejects.toThrow()
})
it('leggiConsensoMetriche scarta i dati incompleti', () => {
  expect(leggiConsensoMetriche({ attivo: 'si' })).toBeUndefined()
})
```

Test delle regole: il proprietario non può cambiare `consensoMetriche` dal client, ma può cambiare altri campi.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare** sul modello di `functions/src/promo/consensoPromo.ts`. L'id riga è generato per ogni cambio, perché lo storico deve restare. Nelle regole, in `update`: `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['consensoMetriche'])`.

- [ ] **Step 4: Verificare**: `npm --prefix functions test`, `npm run test:rules`, PASS.

- [ ] **Step 5: Commit** `feat(metriche): consenso del titolare sull'account`

### Task 3: Modulo di raccolta

**Files:**
- Modify: `src/lib/metriche.ts`, `src/lib/metriche.test.ts`, `src/main.tsx`, il punto in cui si monta `RiaccettaDocumenti`
- Create: `src/lib/metricheNative.ts`, `src/lib/metricheNative.test.ts`, `src/components/legale/RaccoltaMetriche.tsx`, `src/components/legale/RaccoltaMetriche.test.tsx`

**Interfaces:**
- Consumes: `ConsensoMetriche`.
- Produces in `src/lib/metriche.ts`:
  - `type ProfiloMetriche = { nativo: boolean; role?: string; admin: boolean; protetto: boolean; vip: boolean; email?: string | null }`
  - `puoRispondere(p: ProfiloMetriche): boolean`: tutte le condizioni del consenso tranne il consenso
  - `puoRaccogliere(p: ProfiloMetriche, consenso?: ConsensoMetriche): boolean`
  - `devoChiedere(p: ProfiloMetriche, consenso: ConsensoMetriche | undefined, termini: TerminiAccount | undefined): boolean`: vera se può rispondere, il consenso manca e `deveRiaccettare(termini)` è falsa e `termini.versione >= VERSIONE_DOCUMENTI`
  - `EventoMetrica`: unione chiusa degli eventi dello spec, parametri compresi
- Produces in `src/lib/metricheNative.ts`: `impostaRaccolta(attiva: boolean, proprieta?: { piano: string; lingua: string }): Promise<void>`, `traccia(evento: EventoMetrica): void`, `segnalaErrore(errore: unknown): void`.

- [ ] **Step 1: Test che falliscono**

```ts
const OK = { nativo: true, role: 'titolare', admin: false, protetto: false, vip: false, email: 'a@b.it' }
const SI = { attivo: true, at: 'x', fonte: 'account', versione: 2 } as const
it.each([{ nativo: false }, { role: 'socio' }, { role: 'collaboratore' }, { admin: true }, { protetto: true },
  { vip: true }, { email: 'salone1@test.groomly' }])('non raccoglie con %o', (v) => {
  expect(puoRaccogliere({ ...OK, ...v }, SI)).toBe(false)
})
it('senza consenso o col no non raccoglie', () => {
  expect(puoRaccogliere(OK, undefined)).toBe(false)
  expect(puoRaccogliere(OK, { ...SI, attivo: false })).toBe(false)
})
it('traccia non manda nulla a raccolta spenta', async () => { /* plugin finto: logEvent mai chiamato */ })
it('segnalaErrore manda nome e stack, mai il messaggio', async () => {
  await impostaRaccolta(true)
  const e = new Error('Cliente Mario Rossi'); segnalaErrore(e)
  expect(JSON.stringify(recordException.mock.calls)).not.toContain('Mario Rossi')
})
it('spegnere chiama deleteUnsentReports', async () => { /* impostaRaccolta(false) */ })
```

In `RaccoltaMetriche.test.tsx`: lo stesso account con consenso su un secondo telefono accende; passare da titolare a collaboratore e uscire spegne.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** In `metricheNative.ts` i plugin solo con `import()` e solo se `Capacitor.isNativePlatform()`. Lo stato parte da spento. `traccia` e `segnalaErrore` non fanno nulla se spento. Mai `setUserId`, mai `setCustomKey`. `RaccoltaMetriche` non disegna nulla: legge sessione e piano e chiama `impostaRaccolta`. In `main.tsx`, ascoltatori `error` e `unhandledrejection` chiamano `segnalaErrore`. Il messaggio inviato è fisso, per esempio il solo `name`.

- [ ] **Step 4: Verificare**: test PASS.

- [ ] **Step 5: Commit** `feat(metriche): raccolta solo col consenso e senza dati dei clienti`

### Task 4: Eventi

**Files:**
- Modify: i punti che creano cani e appuntamenti, cambiano stato, condividono listino, esportano report, mostrano la vetrina, toccano Avvisami, rispondono alla beta, fanno backup, e il punto del primo cane più primo appuntamento per `salone_attivato`.
- Test: `src/lib/metricheEventi.test.tsx`

**Interfaces:**
- Consumes: `traccia(evento)`.

- [ ] **Step 1: Test che falliscono**: per ogni evento un test sul punto di chiamata, con `traccia` finta. Per `salone_attivato`: una sola volta, solo quando esistono almeno un cane e un appuntamento.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** Una riga per punto, dopo che l'azione è riuscita, mai nel ramo di errore. `salone_attivato` usa un segno locale per non ripetersi.

- [ ] **Step 4: Verificare**: test PASS, `npx tsc --noEmit` pulito.

- [ ] **Step 5: Commit** `feat(metriche): eventi d'uso`

### Task 5: Domanda e interruttore

**Files:**
- Create: `src/components/legale/DomandaStatistiche.tsx`, `.test.tsx`
- Modify: `src/components/legale/RiaccettaDocumenti.tsx`, `src/pages/TourPage.tsx:165-178`, `src/pages/AccountPage.tsx:475-481`, `src/i18n/{it,en,es,fr,de}.ts`

**Interfaces:**
- Consumes: `devoChiedere`, `puoRispondere`, `callImpostaConsensoMetriche`.
- Produces: `DomandaStatistiche({ fonte: 'tour' | 'riaccettazione', onFatto: () => void })`.

- [ ] **Step 1: Test che falliscono**
  - Dopo Accetto, un titolare che può rispondere vede la domanda. Sì e No hanno lo stesso `variant`.
  - Socio, VIP, admin non la vedono.
  - No salva `attivo: false` e la domanda non torna.
  - Senza rete la domanda non blocca: si entra e torna al prossimo avvio.
  - Nel tour compare dopo la schermata promo.
  - In Account l'interruttore si vede solo se `puoRispondere` e `termini.versione >= VERSIONE_DOCUMENTI`, e chiama la callable con `fonte: 'account'`.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** L'interruttore non legge più `settings.consensoMetriche`. Testi in 5 lingue: `statTitolo`, `statTesto`, `statSi`, `statNo`, e `metricheDettaglio` riscritta. Il testo dice: uso dell'app e crash, nessun dato dei clienti, facoltativo, si cambia in Account, per i crash vale dal prossimo avvio. Niente parola «anonimi».

- [ ] **Step 4: Verificare**: test PASS, compreso il test delle chiavi nelle 5 lingue.

- [ ] **Step 5: Commit** `feat(metriche): domanda una tantum e interruttore in Account`

### Task 6: Statistica notturna

**Files:**
- Create: `src/lib/statistiche.ts`, `functions/src/metriche/statisticheGiornaliere.ts`, `functions/src/metriche/statisticheGiornaliere.test.ts`
- Modify: `functions/src/index.ts`, `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`

**Interfaces:**
- Produces in `src/lib/statistiche.ts`:

```ts
export type Coorte = { settimana: string; saloni: number; rimasti7: number; rimasti30: number }
export type StatisticheGiorno = {
  giorno: string; saloni: number; nuovi: number
  attivi1: number; attivi7: number; attivi30: number
  attivati: number; appuntamenti: number; mediaAppuntamenti: number
  coorti: Coorte[]; avvisami: { plus: number; salon: number }; esclusi: number; calcolatoIl: string
}
export function leggiStatistiche(value: unknown): StatisticheGiorno | undefined
```

- Produces in functions: `calcolaStatistiche(input: { db: Firestore; adesso: Date; ultimiAccessi: UltimiAccessi }): Promise<StatisticheGiorno>`, `pulisciRegistroAdmin(db: Firestore, adesso: Date): Promise<number>`, funzione pianificata `statisticheGiornaliere` (03:30, `Europe/Rome`, europe-west1).

- [ ] **Step 1: Test che falliscono**, con la stessa impalcatura di `functions/src/beta/contatoriAdmin.test.ts`, registrando i percorsi letti:
  - Nessun percorso letto sotto `salon/shared`, sotto il salone di Laura, di un admin o di `@test.groomly`.
  - Per un VIP si legge solo `pro/main`.
  - `esclusi` conta quei saloni.
  - Nel documento non compaiono id, email o nomi.
  - Attivato solo con cane e appuntamento.
  - Il giorno è quello appena finito a Roma, anche il 25/10/2026, che dura 25 ore.
  - Un salone con `createdAt` mancante non ferma il calcolo e non entra nelle coorti.
  - Coorti: ultime 12 settimane, `rimasti7` conta chi ha un accesso almeno 7 giorni dopo la registrazione.
  - Rieseguire sovrascrive lo stesso documento.
  - `pulisciRegistroAdmin` cancella oltre 24 mesi e tiene il resto.

Test regole: `statsGiornaliere` leggibile da operatore, non da un titolare, mai scrivibile.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** Si parte da `accounts`. `mediaAppuntamenti` = `appuntamenti / attivi1`, 0 se non ci sono attivi. Appuntamenti con `count()` su `start`, come in `functions/src/beta/schedaSaloneAdmin.ts:37`. «Avvisami» come in `contatoriAdmin.ts`. `ultimiAccessiAuth` esce da `index.ts:1142` per essere condivisa. Regola: `match /statsGiornaliere/{id} { allow read: if isOperator(); allow write: if false; }`.

- [ ] **Step 4: Verificare**: `npm --prefix functions test`, `npm run test:rules`, PASS.

- [ ] **Step 5: Commit** `feat(metriche): statistica notturna per la Console`

### Task 7: Pagina Metriche

**Files:**
- Create: `src/pages/admin/MetrichePage.tsx`, `.test.tsx`, `src/components/admin/GraficoMetriche.tsx`, `src/lib/metricheXlsx.ts`
- Modify: `src/lib/percorsoAdmin.ts`, `src/components/admin/AdminLayout.tsx:63-68`, `src/app/adminRoutes.tsx`, `src/app/router.admin.test.tsx`, `src/pages/admin/SistemaPage.tsx:16-21`, `src/data/firebase/adminClient.ts`, `src/i18n/*.ts`

**Interfaces:**
- Consumes: `StatisticheGiorno`, `leggiStatistiche`.
- Produces: `PERCORSO_METRICHE = '/admin/metriche'`, `elencoStatistiche(giorni: 30 | 90): Promise<StatisticheGiorno[]>`, `metricheXlsx(righe: StatisticheGiorno[]): Promise<Blob>`.

- [ ] **Step 1: Test che falliscono**
  - `/admin/metriche` apre la pagina, non rimanda più a `/admin`.
  - Senza dati si vede lo stato vuoto.
  - Le card mostrano l'ultimo giorno e il confronto col periodo prima.
  - Passare da 30 a 90 giorni rilegge.
  - Tabella coorti e nota che la retention è una stima.
  - Link a Crashlytics e Analytics presenti, nessun conteggio crash.
  - L'export crea un foglio con una riga per giorno.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare** nello stile delle pagine in `src/pages/admin/`. Grafico a barre con le stesse misure di `EarningsChart.tsx`, senza riusarne i tipi degli importi. `elencoStatistiche` legge direttamente `statsGiornaliere` in ordine di id, come `elencoAssistenza`. `exceljs` con `import()` dinamico. Link in `LINK`: `https://console.firebase.google.com/project/groomly-3128b/crashlytics` e `https://console.firebase.google.com/project/groomly-3128b/analytics`.

- [ ] **Step 4: Verificare**: test PASS, `npm run build:admin` col controllo del bundle pulito. Controllo nel browser a 1280 e 375 px, chiaro e scuro, su emulatori.

- [ ] **Step 5: Commit** `feat(admin): pagina Metriche`

### Task 8: Archivio dei testi attuali

**Files:**
- Create: `hosting/privacy/v2/index.html`, `hosting/termini/v1-1/index.html`, `hosting/dpa/v1/index.html`, `hosting/testiLegali.test.ts`
- Modify: `firebase.json` se servono header per `noindex`

**Interfaces:**
- Produces: indirizzi `/privacy/v2/`, `/termini/v1-1/`, `/dpa/v1/`.

- [ ] **Step 1: Test che falliscono**: le tre pagine esistono, hanno `noindex`, una riga di versione superata in 5 lingue, nessun `robmass83`, nessun `firebaseapp.com`.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** Copiare le pagine **prima** di toccare i testi, con la riga «versione superata, vale per chi ha già un account fino al…» e il link alla versione nuova. Controllare i percorsi relativi di `lingua-pagina.js` e del logo.

- [ ] **Step 4: Verificare**: test PASS, compreso `hosting/lingue.test.ts`.

- [ ] **Step 5: Commit** `feat(legale): archivio delle versioni in uso`

### Task 9: Privacy 3

**Files:**
- Modify: `hosting/privacy/index.html`, `hosting/privacy.html`, `docs/legal/privacy.html`, `src/config/firebaseConfig.test.ts` se cambia una stringa controllata
- Test: `hosting/testiLegali.test.ts`

- [ ] **Step 1: Test che falliscono**: per ognuna delle 5 lingue la pagina contiene `Groomly Italia`, `Google Places`, `Hostinger`, `ImprovMX`, `GitHub`, `Analytics`, `Crashlytics`, `Versione 3` o equivalente, il link `/privacy/v2/`, e la data di `RIACCETTA_DAL`.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Riscontrare sul codice** cosa vede la Console (`schedaSaloneAdmin.ts`, `SchedaSalone.tsx`, Assistenza), cosa manda `places.ts`, e dove sono i server di ogni fornitore.

- [ ] **Step 4: Scrivere i testi** della sezione «Privacy» dello spec, prima in italiano, poi nelle altre 4 lingue. Stile semplice della pagina attuale. Crash: dal prossimo avvio, non «subito». Copiare in `hosting/privacy.html` e `docs/legal/privacy.html`.

- [ ] **Step 5: Verificare**: `npx vitest run hosting src/config`, PASS.

- [ ] **Step 6: Commit** `docs(legale): privacy versione 3 in 5 lingue`

### Task 10: Termini 2, DPA 2 e casella di registrazione

**Files:**
- Modify: `hosting/termini/index.html`, `hosting/dpa/index.html`, `docs/legal/termini.html`, `docs/legal/dpa.html`, `src/pages/LoginPage.tsx:181-193`, `src/pages/LoginPage.test.tsx`, `src/i18n/*.ts`
- Test: `hosting/testiLegali.test.ts`

- [ ] **Step 1: Test che falliscono**
  - Termini: nessun `Base`, `Pro`, `Salone` come nome di piano in 5 lingue, compaiono `Go`, `Plus`, `Salon`, `0 €`, il DPA e il logo. Niente «al sicuro» e traduzioni.
  - DPA: compaiono i sub-responsabili che toccano dati dei clienti, il rimando alla Privacy, il link `/dpa/v1/`.
  - Registrazione: la casella ha il link al DPA.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Riscontrare sul codice** la sospensione (`accessoSospeso`, `AccessoSospeso.tsx`) e l'accesso dell'assistenza.

- [ ] **Step 4: Scrivere i testi** delle sezioni «Termini» e «DPA» dello spec, in 5 lingue, e le chiavi `accettaTermini*` col DPA. Salvi dolo, colpa grave e diritti del consumatore.

- [ ] **Step 5: Verificare**: test PASS, copie uguali.

- [ ] **Step 6: Commit** `docs(legale): termini 2 e DPA 2 in 5 lingue`

### Task 11: Versione, data e riaccettazione

**Files:**
- Create: `scripts/data-legale.mjs`
- Modify: `src/lib/versioneLegale.ts`, `src/lib/versioneLegale.test.ts`, `functions/src/legale/registraAccettazione.ts`, `.test.ts`, `src/components/legale/RiaccettaDocumenti.tsx`, `.test.tsx`, `src/data/firebase/client.ts:551`, `src/i18n/*.ts`, `hosting/testiLegali.test.ts`, `package.json`

**Interfaces:**
- Produces: `RIACCETTA_DAL = '2026-12-01'` (provvisoria), `deveRiaccettare(termini, richiesta?, adesso?: Date): boolean`, `documentiPerRuolo(role?: string): { termini: string; privacy: string; dpa?: string }`, `callRegistraAccettazione(versione?: number)`, `npm run legale:data -- AAAA-MM-GG`.

- [ ] **Step 1: Test che falliscono**

```ts
it('prima della data chi ha la 1 entra, dalla data riaccetta', () => {
  const t = { accettati: true, at: 'x', versione: 1 } as const
  expect(deveRiaccettare(t, 2, new Date('2026-11-30T22:59:00Z'))).toBe(false)
  expect(deveRiaccettare(t, 2, new Date('2026-11-30T23:00:00Z'))).toBe(true) // mezzanotte a Roma
})
it('chi è senza riga sul server resta alla sua versione', async () => {
  const r = await registraAccettazionePer({ uid: 'u', versione: 1, appVersione: 'x', versioneSalvata: 1, role: 'titolare' }, archivio, ADESSO)
  expect(r.termini.versione).toBe(1)
})
it('rifiuta una versione né corrente né già salvata', async () => {
  await expect(registraAccettazionePer({ uid: 'u', versione: 7, appVersione: 'x', versioneSalvata: 1, role: 'titolare' }, archivio, ADESSO)).rejects.toThrow()
})
it('il collaboratore non accetta il DPA', async () => {
  const r = await registraAccettazionePer({ uid: 'u', versione: 2, appVersione: 'x', versioneSalvata: 1, role: 'collaboratore' }, archivio, ADESSO)
  expect(r.termini.documenti).not.toHaveProperty('dpa')
})
```

In `RiaccettaDocumenti.test.tsx`: la chiamata silenziosa manda `account.termini.versione`; il collaboratore vede due pulsanti, il titolare tre. In `testiLegali.test.ts`: `RIACCETTA_DAL` coincide con la data scritta nelle 3 pagine e nelle 5 lingue.

- [ ] **Step 2: Verificare che falliscano.**

- [ ] **Step 3: Implementare.** `registraAccettazione` legge versione e ruolo da `accounts/{uid}`, non dal client. Alzare `VERSIONE_DOCUMENTI = 2` e `DOCUMENTI_IN_VIGORE = { termini: '2', privacy: '3', dpa: '2' }`. La data scatta a mezzanotte di Roma. Aggiornare `TerminiAccount.documenti` con `dpa?`. `scripts/data-legale.mjs` riscrive costante e date nelle pagine e nelle copie, rifiuta una data a meno di 15 giorni da oggi. `riaccTesto` per titolare e per gli altri.

- [ ] **Step 4: Verificare**: `npx vitest run src/lib src/components/legale hosting`, `npm --prefix functions test`, PASS. Provare lo script con una data e tornare indietro con `git checkout`.

- [ ] **Step 5: Commit** `feat(legale): versione 2 dei documenti con partenza a data fissa`

### Task 12: Documenti e verifica finale

**Files:**
- Create: `docs/play/scheda-sicurezza-dati.md`, `docs/legal/AVVISO-DOCUMENTI.md`
- Modify: `docs/legal/STATO-CONFORMITA.md`, `PROGRESS.md`, `docs/GUIDA-ADMIN-MANAGER.md`

- [ ] **Step 1: Scrivere la Scheda**: una tabella con tipo di dato Play, raccolto, condiviso, facoltativo, finalità, coerente con la Privacy 3. Fra i facoltativi: identificatori del dispositivo, interazioni con l'app, crash, diagnostica.

- [ ] **Step 2: Scrivere l'avviso** in 5 lingue, nei limiti di `TITOLO_MAX` e `TESTO_MAX`, con la sequenza del via dello spec.

- [ ] **Step 3: Aggiornare** tabella di stato (voci 3, 5, 6, 7, 8, 11, 18), limite della APK vecchia, `PROGRESS.md`, guida.

- [ ] **Step 4: Verificare tutto**: `npm test`, `npm run test:rules`, `npm --prefix functions test`, `npx tsc --noEmit`, `npm run build:admin`, `npm run test:360` se praticabile. Cancellare i dati di prova.

- [ ] **Step 5: Commit** `docs: stato della conformità, Scheda Play e avviso`
