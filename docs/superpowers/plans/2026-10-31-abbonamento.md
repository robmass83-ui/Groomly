# Abbonamento (Go, Plus, Salone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire «Controlli avanzati» con una sezione Abbonamento (Go, Plus, Salone) con vetrine in stile Glovo Prime, interruttori visibili solo per i piani attivi e logo dentro l'app che cambia per piano.

**Architecture:** Logica pura in `src/lib/abbonamento.ts` (prezzi, piano attivo, logo per livello). `StrumentiPage` viene divisa in tre blocchi riusabili (`BloccoGo`, `BloccoPlus`, `BloccoSalone`). Nuove pagine `AbbonamentoPage` (scelta) e `PianoAbbonamentoPage` (Go: blocco; Plus/Salone: vetrina oppure blocco). `BrandBar` sceglie il logo da `usePiano().livelloNome`.

**Tech Stack:** React 19 + TypeScript, react-router, Vitest + Testing Library (happy-dom), lucide-react, i18n it/en/es.

**Spec:** `docs/superpowers/specs/2026-10-31-abbonamento-design.md`

## Global Constraints

- Livelli nel codice invariati: `'base' | 'pro' | 'salone'` più `'vip'` da `livelloElenco`. Nessun campo Firestore nuovo.
- Nomi visibili: «Groomly Go», «Groomly Plus», «Groomly Salone», «Groomly VIP». Nei testi visibili «Pro» diventa «Plus» (it/en/es).
- Prezzi segnaposto: Plus **9,99 €/mese**, Salone **19,99 €/mese**, definiti solo in `src/lib/abbonamento.ts`.
- Colori: Plus `#7B3FE4`, Salone `#C99200`, Go `var(--pri-solid)`.
- «Abbonati» passa da `compra(piano.abbonamentiAttivi)` di `src/lib/billing.ts`; con `{ stato: 'spento' }` mostra il `Dialog` «In arrivo».
- L'icona del launcher Android non si tocca. Login e splash restano con il logo Go.
- Ogni nuova frase va in `src/i18n/it.ts`, `en.ts` e `es.ts` (en/es sono `satisfies Record<keyof typeof italiano, string>`).
- Tema chiaro e scuro con i token CSS esistenti; layout corretto a 360 px di larghezza.
- Alla fine si pubblica secondo `.cursor/rules/publish-update.mdc`.

## Review Focus

1. **Utente Go su `/impostazioni/abbonamento/plus`**: vede solo la vetrina, nessun `Toggle` del blocco Plus → test nel Task 4.
2. **Abbonato Plus su `/impostazioni/abbonamento/salone`**: vede la vetrina Salone, non la voce Collaboratori → test nel Task 4.
3. **Vecchio link `/impostazioni/strumenti`** (vociMenu, tour, segnalibri): porta a `/impostazioni/abbonamento` → test nel Task 5.
4. **VIP**: tutti e tre i piani risultano «Attivo» e il logo è quello VIP → test nei Task 1 e 2.
5. **Collaboratore abbonato**: vede gli interruttori disabilitati e, al posto di «Abbonati», «Lo attiva il titolare» → test nel Task 4.

---

### Task 1: Logica dei piani

**Files:**
- Create: `src/lib/abbonamento.ts`
- Test: `src/lib/abbonamento.test.ts`

**Interfaces:**
- Produces:
  - `export type PianoVetrina = 'go' | 'plus' | 'salone'`
  - `export const PREZZI: Record<'plus' | 'salone', string>` = `{ plus: '9,99 €', salone: '19,99 €' }`
  - `export const COLORE_PIANO: Record<PianoVetrina, string>` = `{ go: 'var(--pri-solid)', plus: '#7B3FE4', salone: '#C99200' }`
  - `export function pianoAttivo(livello: LivelloElenco | undefined, piano: PianoVetrina): boolean`
  - `export function ePianoVetrina(value: string | undefined): value is PianoVetrina`

- [ ] **Step 1: Scrivi i test che falliscono**

```ts
describe('pianoAttivo', () => {
  it('Go è sempre attivo', () => {
    expect(pianoAttivo(undefined, 'go')).toBe(true)
    expect(pianoAttivo('base', 'go')).toBe(true)
  })
  it('base non ha Plus né Salone', () => {
    expect(pianoAttivo('base', 'plus')).toBe(false)
    expect(pianoAttivo('base', 'salone')).toBe(false)
  })
  it('pro ha Plus ma non Salone', () => {
    expect(pianoAttivo('pro', 'plus')).toBe(true)
    expect(pianoAttivo('pro', 'salone')).toBe(false)
  })
  it('salone e vip hanno tutto', () => {
    for (const l of ['salone', 'vip'] as const) for (const p of ['go', 'plus', 'salone'] as const) expect(pianoAttivo(l, p)).toBe(true)
  })
})
it('prezzi segnaposto', () => expect(PREZZI).toEqual({ plus: '9,99 €', salone: '19,99 €' }))
it('ePianoVetrina', () => {
  expect(ePianoVetrina('plus')).toBe(true)
  expect(ePianoVetrina('pro')).toBe(false)
  expect(ePianoVetrina(undefined)).toBe(false)
})
```

- [ ] **Step 2: Esegui e verifica che falliscano**

Run: `npx vitest run src/lib/abbonamento.test.ts` → FAIL (modulo mancante)

- [ ] **Step 3: Implementa `src/lib/abbonamento.ts`**

Ordine dei livelli: base 0, pro 1, salone 2, vip 2. Ordine dei piani: go 0, plus 1, salone 2. Un piano è attivo se il livello è maggiore o uguale; `undefined` vale come base.

- [ ] **Step 4: Esegui e verifica che passino**

Run: `npx vitest run src/lib/abbonamento.test.ts` → PASS

- [ ] **Step 5: Commit** — `git commit -m "Abbonamento: logica dei piani, prezzi e colori"`

---

### Task 2: Logo dentro l'app per piano

**Files:**
- Copy: da `Icon and logo/loghi plus/groomly-plus-scritta.svg` e `groomly-plus-scritta-scura.svg`, `Icon and logo/Groomly Salon/groomly-salon-scritta.svg` e `groomly-salon-scritta-scura.svg`, `Icon and logo/Groomly VIP/groomly-vip-logo-orizzontale.svg` e `groomly-vip-logo-scuro.svg` → `src/assets/brand/` (stessi nomi)
- Modify: `src/components/layout/BrandBar.tsx`, `src/components/layout/Header.tsx`, `src/theme/sizes.ts:24`
- Test: `src/components/layout/brandBar.test.tsx`

**Interfaces:**
- Consumes: `usePiano().livelloNome`
- Produces:
  - `BrandBar({ size?: 'regular' | 'medium' | 'large'; as? })`
  - `SIZES.brandBar = { regular: 30, medium: 36, large: 44, padTop: 10, gap: 8 }`
  - `Header` riceve la nuova prop `brandSize?: 'regular' | 'medium'`, passata a `BrandBar`
  - `export function logoTestata(livello: LivelloElenco | undefined, scuro: boolean): string` in `BrandBar.tsx`

- [ ] **Step 1: Aggiorna i test**

Dentro un `PianoContext` reale (oppure con `vi.mock('../../hooks/usePiano')` come in `strumenti.test.tsx`):
- senza livello → `src` = `groomly-logo-testata.svg` (i test esistenti restano validi);
- `livelloNome: 'pro'` → `groomly-plus-scritta.svg`; in scuro `groomly-plus-scritta-scura.svg`;
- `'salone'` → `groomly-salon-scritta.svg`;
- `'vip'` → `groomly-vip-logo-orizzontale.svg`; in scuro `groomly-vip-logo-scuro.svg`;
- `<BrandBar size="medium" />` → `height="36"`;
- `SIZES.brandBar` è uguale a `{ regular: 30, medium: 36, large: 44, padTop: 10, gap: 8 }`.

L'`alt` resta «Groomly».

- [ ] **Step 2:** `npx vitest run src/components/layout/brandBar.test.tsx` → FAIL

- [ ] **Step 3:** Copia gli SVG, implementa `logoTestata`, collega `BrandBar` a `usePiano()` e aggiungi `brandSize` a `Header`. Verifica a occhio che gli SVG «scritta» abbiano proporzioni simili alla testata attuale. Se uno ha troppo margine interno, ritaglia il `viewBox` della copia in `src/assets/brand`.

- [ ] **Step 4:** `npx vitest run src/components/layout` → PASS

- [ ] **Step 5: Commit** — `git commit -m "Logo in testata secondo il piano: Plus, Salone, VIP"`

---

### Task 3: Dividere Controlli avanzati in tre blocchi

**Files:**
- Create: `src/components/abbonamento/BlocchiPiano.tsx`
- Modify: `src/pages/PianoPagine.tsx` (la `StrumentiPage` attuale, righe 157–442: le costanti `BASE`/`PRO` e il corpo della pagina si spostano)
- Test: `src/pages/strumenti.test.tsx` → rinomina in `src/components/abbonamento/BlocchiPiano.test.tsx`

**Interfaces:**
- Produces:
  - `export function BloccoGo(): JSX.Element`: titolo «Servizio base» e righe `BASE` con `Toggle`, come oggi.
  - `export function BloccoPlus(): JSX.Element`: righe `PRO` (prenotazioni, pronto, servizi email, richiamo «in sviluppo», righe incluse) più `<LinkCondivisione />` e `Dialog` Pronto.
  - `export function BloccoSalone(): JSX.Element`: la riga Collaboratori che porta a `/impostazioni/pro`.
  - Ogni blocco legge da solo `usePiano`, `useSession`, `useSettings`, `usePrenotazioniOnline`. Nessuna prop.

- [ ] **Step 1:** Sposta i test di `strumenti.test.tsx` perché rendano i singoli blocchi invece di `StrumentiPage`, con le stesse asserzioni. Run → FAIL (import mancanti).
- [ ] **Step 2:** Sposta il codice in `BlocchiPiano.tsx` senza cambiare il comportamento. `StrumentiPage` e le sue costanti spariscono da `PianoPagine.tsx`. Togli anche l'import in `router.tsx`, sostituendo per ora la rotta con `<Navigate to="/impostazioni" replace />`; il Task 5 la ridirige.
- [ ] **Step 3:** `npx vitest run src/components/abbonamento src/pages` → PASS, poi `npx tsc --noEmit` senza errori.
- [ ] **Step 4: Commit** — `git commit -m "Controlli avanzati divisi nei blocchi Go, Plus e Salone"`

---

### Task 4: Pagine Abbonamento e vetrina

**Files:**
- Create: `src/pages/AbbonamentoPage.tsx`, `src/pages/PianoAbbonamentoPage.tsx`, `src/components/abbonamento/Vetrina.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/AbbonamentoPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`pianoAttivo`, `PREZZI`, `COLORE_PIANO`, `ePianoVetrina`), Task 3 (blocchi), `compra` da `billing.ts`.
- Produces:
  - `AbbonamentoPage()`: `Header` con titolo `abbTitolo` e `backTo="/impostazioni"`. Tre schede `Link` a `/impostazioni/abbonamento/{go|plus|salone}`, ognuna con striscia colorata `COLORE_PIANO`, nome, frase breve, e «Gratis», «Attivo» oppure il prezzo al mese.
  - `PianoAbbonamentoPage()`: legge `:piano` da `useParams`; se non è valido, `<Navigate to="/impostazioni/abbonamento" replace />`.
    - `go` → testata più `<BloccoGo />`.
    - `plus` o `salone` attivo → testata con «Attivo» più `<BloccoPlus />`, e per `salone` anche `<BloccoSalone />`.
    - non attivo → `<Vetrina piano=… />`.
  - `Vetrina({ piano: 'plus' | 'salone' })`:
    - testata a tutta larghezza con il colore del piano, bordo inferiore curvo, pulsante indietro rotondo bianco, logo del piano (le «scritta» del Task 2, in versione chiara su colore) e titolo;
    - riquadro con l'elenco delle funzioni con spunte; Salone apre con «Tutto di Groomly Plus»;
    - sezione «Come funziona»;
    - barra fissa in basso con il prezzo al mese e il pulsante «Abbonati».
    - Al tocco: se `compra(piano.abbonamentiAttivi).stato === 'spento'` si apre il `Dialog` con `abbInArrivoTitolo` / `abbInArrivoTesto`. Il collaboratore vede al posto del pulsante il testo `pianoLoAccendeTitolare`.
- Elenco funzioni Plus (chiavi i18n nuove, una per riga): `abbFPromemoria`, `abbFPronto`, `abbFAuguri`, `abbFFedelta`, `abbFPrenotazioni`, `abbFAttesa`, `abbFRecensioni`, `abbFStatistiche`, `abbFReport`, `abbFCopie`.
- Elenco funzioni Salone: `abbFTuttoPlus`, `abbFTeam`, `abbFPosti`.
- Altre chiavi nuove:

| chiave | it | en |
|---|---|---|
| abbTitolo | Abbonamento | Subscription |
| abbGo / abbPlus / abbSalone | Groomly Go / Groomly Plus / Groomly Salone | (uguali) |
| abbGratis | Gratis | Free |
| abbAttivo | Attivo | Active |
| abbAlMese | {{prezzo}} al mese | {{prezzo}} per month |
| abbAbbonati | Abbonati | Subscribe |
| abbComeFunziona | Come funziona | How it works |
| abbInArrivoTitolo | In arrivo | Coming soon |
| abbInArrivoTesto | Presto potrai abbonarti direttamente dall’app. | Soon you’ll be able to subscribe right from the app. |

  Lo spagnolo si traduce allo stesso modo. Le frasi brevi delle schede, i testi delle funzioni e «Come funziona» li scrive l'implementatore, nello stile delle frasi `info*` esistenti.

- [ ] **Step 1: Scrivi i test che falliscono** (con `MemoryRouter` e `usePiano` forzato come in `strumenti.test.tsx`)

```ts
it('la scelta mostra Go gratis e i prezzi di Plus e Salone per un utente base')
  // getByText('Groomly Go'), getByText('Gratis'), getByText('9,99 € al mese'), getByText('19,99 € al mese')
it('base su /plus vede la vetrina senza interruttori')
  // getByRole('button', { name: 'Abbonati' }); queryAllByRole('switch') ha lunghezza 0
it('Abbonati apre «In arrivo»')
  // click → getByRole('dialog', { name: 'In arrivo' })
it('pro su /plus vede Attivo e gli interruttori Plus')
  // getByText('Attivo'); getByRole('switch', { name: 'Prenotazioni online' })
it('pro su /salone vede la vetrina e non Collaboratori')
it('vip vede tutti e tre attivi nella scelta')  // tre volte getAllByText('Attivo')
it('go mostra subito gli interruttori base')    // getByRole('switch', { name: <frasi.strumMessaggi> })
it('collaboratore sulla vetrina vede «Lo accende il titolare.» e nessun Abbonati')
it('piano sconosciuto rimanda alla scelta')     // /impostazioni/abbonamento/xyz → titolo Abbonamento
```

  Se `Toggle` non espone `role="switch"`, usa la query che usano già i test di `strumenti`.

- [ ] **Step 2:** `npx vitest run src/pages/AbbonamentoPage.test.tsx` → FAIL
- [ ] **Step 3:** Implementa le pagine e `Vetrina`, aggiungi le frasi e registra le rotte provvisorie in `router.tsx` (`/impostazioni/abbonamento` e `/impostazioni/abbonamento/:piano`, dentro `<Guard>`), così i test girano attraverso `App`.
- [ ] **Step 4:** `npx vitest run src/pages/AbbonamentoPage.test.tsx` → PASS, poi `npx tsc --noEmit`.
- [ ] **Step 5:** Controllo a occhio con `npm run dev` a 360 px, in chiaro e in scuro: la vetrina deve sembrare una pagina di prodotto (testata piena, curva, barra in basso), non una lista di impostazioni.
- [ ] **Step 6: Commit** — `git commit -m "Pagina Abbonamento e vetrine Plus e Salone"`

---

### Task 5: Impostazioni, rotte e link vecchi

**Files:**
- Modify: `src/pages/SettingsPage.tsx`, `src/app/router.tsx:160`, `src/lib/vociMenu.ts:21`
- Test: `src/pages/SettingsPage.test.tsx`, `src/lib/vociMenu` (se ha un test), `src/pages/shellPages.test.tsx` se cita Controlli avanzati

**Interfaces:**
- Consumes: Task 2 (`brandSize`), Task 4 (rotte).

- [ ] **Step 1: Aggiorna e aggiungi i test**
  - nelle Impostazioni c'è il link «Abbonamento» con `href="/impostazioni/abbonamento"`, quarta scorciatoia della griglia;
  - non c'è più il link «Controlli avanzati» (`queryByRole('link', { name: frasi.strumenti })` è null);
  - non c'è più la pillola «Piano · …» (`queryByText(/Piano ·/)` è null);
  - il logo in testata delle Impostazioni ha `height="36"`;
  - `/impostazioni/strumenti` → si vede il titolo «Abbonamento»;
  - `hrefVoce(VOCE_STRUMENTI)` restituisce `'/impostazioni/abbonamento'`.
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** In `SettingsPage`:
  - aggiungi la scorciatoia `Link` con l'icona `Crown` (lucide) e `frasi.abbTitolo` dopo «Avvisi», per tutti, collaboratori compresi;
  - togli la riga «Controlli avanzati» (righe 858–864) e la pillola con `nomePiano`/`hrefPiano` (righe 694–700 e 763–767), insieme alle variabili e agli import rimasti inutilizzati;
  - passa `brandSize="medium"` a `Header`.

  In `router.tsx` la rotta `strumenti` diventa `<Navigate to="/impostazioni/abbonamento" replace />`. Aggiorna `vociMenu.ts`.
- [ ] **Step 4:** `npm test` → tutto PASS. Correggi i test che cercavano «Controlli avanzati» o la pillola del piano.
- [ ] **Step 5: Commit** — `git commit -m "Impostazioni: scorciatoia Abbonamento, via Controlli avanzati e pillola del piano"`

---

### Task 6: «Pro» diventa «Plus» nei testi

**Files:**
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`, più i test che controllano quei testi

- [ ] **Step 1:** In it/en/es sostituisci «Pro» come nome del piano con «Plus» in queste chiavi: `provaGratis`, `provaAttiva`, `proOmaggio`, `propostaPro`, `servizioProPer`, `impPiano`, `impFunzioni`, `srvSpiega`, `utePro`, `funzioniPro`, `funzioniProIntro`, `servizioPro`, `profiloBaseTesto`, `servizioSaloneIntro`, `servizioProIntro`, `proBloccata`, `strumentiDettaglio`, `hubLivelloPro`, `pianoBaseTesto`, `pianoInvito`, `pianoAttivoTesto`, `uteServizio`. Poi cerca di nuovo `\bPro\b` nelle tre lingue e correggi quelle rimaste.
- [ ] **Step 2:** `npm test` → aggiorna i test che falliscono solo per il testo («Pro» → «Plus»), nient'altro.
- [ ] **Step 3: Commit** — `git commit -m "Il piano Pro si chiama Groomly Plus nei testi"`

---

### Task 7: Verifica finale e pubblicazione

- [ ] **Step 1:** `npm test` e `npm run build` → senza errori.
- [ ] **Step 2:** Prova manuale con il profilo VIP: dalla pagina Utenti metti un salone di prova su Pro, poi su Salone, poi su Base, e controlla per ciascuno la scelta, la vetrina o gli interruttori, e il logo.
- [ ] **Step 3:** Pubblica seguendo `.cursor/rules/publish-update.mdc`: alza la versione a 1.1.158, costruisci l'APK firmato con `assembleGithubRelease`, crea la release GitHub con `groomly.apk` e aggiorna `hosting/release.json`.
