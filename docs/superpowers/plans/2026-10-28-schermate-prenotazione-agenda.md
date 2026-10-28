# Schermate prenotazione, agenda, backup e legali — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far scegliere al cliente il servizio con il prezzo indicativo, rendere reversibile il bypass Pro/Salone, e rendere compatte e distinguibili le schermate di proposta, agenda, home, servizi, backup e legali.

**Architecture:** Le regole nuove stanno in funzioni pure già testate (`catalogoPrenotazione`, `pianoBypass`, `avvisoPiano`). La pagina pubblica e le Cloud Functions le applicano. L’interfaccia riusa card, dialoghi e token esistenti, con righe alte quanto il testo.

**Tech Stack:** React, Vitest, Testing Library, Firestore, Cloud Functions, HTML della pagina pubblica in `hosting/s/pagina.js` e `functions/src/piano/rispondiRichiesta.ts`.

## Global Constraints

- Chip, righe e pulsanti di queste schermate stanno larghi quanto il testo, su una riga. Non si aggiunge `minHeight: 44` alle chip nuove, ai biglietti della settimana e alla riga Completato / Non venuto / Disdetto.
- Due schede vicine hanno un bordo e non condividono un unico rettangolo bianco.
- Testi utente in `src/i18n/it.ts`, `en.ts`, `es.ts`. Niente stringhe italiane fisse nei tsx, salvo l’HTML pubblico e le mail che hanno già la copia nelle tre lingue nello stesso file.
- Icone Lucide, stroke 2. Colori solo dai token dell’app. Sulla pagina pubblica e sulla conferma restano i colori già delle mail: sfondo `#eef3f7`, fascia `#8ADBD9`–`#4A9FCB`, testo `#2C4560`.
- Non si disdice Google Play. Non si promette il backup alle 23:00.
- «Da chiudere» in Home e negli incassi non si rinomina.
- La durata pubblica non è più 60 minuti fissi: è la somma dei servizi scelti.
- Un prezzo 0 non è pubblicabile. La durata minima pubblicabile è 1 minuto per ogni taglia.
- Commit solo dei file del task. Non `git add -A`. Il working tree di `d:\Groomly` ha modifiche estranee: lavorare nel worktree `.worktrees/schermate`.

## File

- Create: `src/lib/catalogoPrenotazione.ts` — chi è pubblicabile, la scelta, la somma.
- Create: `src/lib/pianoBypass.ts` — accendere Pro o Salone, spegnere, quando il testo è obbligatorio.
- Create: `src/lib/avvisoPiano.ts` — testo dell’avviso, letto, email.
- Modify: `src/lib/prenotazionePubblica.ts`, `src/data/local/settings.ts`, `src/components/piano/LinkCondivisione.tsx`, `hosting/s/pagina.js`, `src/lib/paginaPubblica.ts`, `functions/src/piano/paginaPubblica.ts`, `functions/src/piano/inviaRichiesta.ts`, `functions/src/piano/impostaPianoManuale.ts`, `functions/src/piano/scriviPiano.ts`, `src/pages/UsersPage.tsx`, `src/components/piano/RiquadroRichiesta.tsx`, `src/i18n/emailHtml.ts`, `functions/src/piano/rispondiRichiesta.ts`, `src/pages/CalendarPage.tsx`, `src/components/calendar/WeekRows.tsx`, `src/pages/NotificationsPage.tsx`, `src/pages/HomePage.tsx`, `src/pages/ServicesPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/LegalePage.tsx`, `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`.

Firme usate dai task dopo il 1:

```ts
export type TagliaPrenotazione = 'piccola' | 'media' | 'grande'
export type VoceCatalogo = {
  id: string
  nome: string
  kind: 'principale' | 'extra'
  minuti: Record<TagliaPrenotazione, number>
  prezzo: Record<TagliaPrenotazione, number>
}
export type SceltaCatalogo = {
  voci: VoceCatalogo[]
  durataMin: number
  totaleIndicativo: number
}
export function pubblicabile(voce: VoceCatalogo): boolean
export function scegliCatalogo(catalogo: readonly VoceCatalogo[], ids: readonly string[], taglia: TagliaPrenotazione): SceltaCatalogo | null
```

---

### Task 1: Catalogo pubblicabile

**Files:**
- Create: `src/lib/catalogoPrenotazione.ts`
- Test: `src/lib/catalogoPrenotazione.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `pubblicabile`, `scegliCatalogo`, tipi `VoceCatalogo`, `TagliaPrenotazione`, `SceltaCatalogo`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { pubblicabile, scegliCatalogo, type VoceCatalogo } from './catalogoPrenotazione'

const bagno: VoceCatalogo = {
  id: 'bagno', nome: 'Bagno', kind: 'principale',
  minuti: { piccola: 30, media: 45, grande: 60 },
  prezzo: { piccola: 20, media: 28, grande: 38 },
}
const nodi: VoceCatalogo = {
  id: 'nodi', nome: 'Nodi', kind: 'extra',
  minuti: { piccola: 20, media: 20, grande: 20 },
  prezzo: { piccola: 5, media: 5, grande: 5 },
}
const gratis: VoceCatalogo = {
  id: 'gratis', nome: 'Omaggio', kind: 'principale',
  minuti: { piccola: 10, media: 10, grande: 10 },
  prezzo: { piccola: 0, media: 0, grande: 0 },
}

describe('catalogo prenotazione', () => {
  it('un prezzo zero o una durata zero non è pubblicabile', () => {
    expect(pubblicabile(bagno)).toBe(true)
    expect(pubblicabile(gratis)).toBe(false)
    expect(pubblicabile({ ...bagno, minuti: { ...bagno.minuti, media: 0 } })).toBe(false)
  })

  it('accetta un principale e gli extra, e somma la taglia scelta', () => {
    const scelta = scegliCatalogo([bagno, nodi, gratis], ['bagno', 'nodi'], 'media')
    expect(scelta).toEqual({ voci: [bagno, nodi], durataMin: 65, totaleIndicativo: 33 })
  })

  it('rifiuta zero principali, due principali, un id assente e un non pubblicabile', () => {
    expect(scegliCatalogo([bagno, nodi], ['nodi'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno, { ...bagno, id: 'taglio' }], ['bagno', 'taglio'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno], ['manca'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno, gratis], ['gratis'], 'piccola')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/catalogoPrenotazione.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

```ts
export type TagliaPrenotazione = 'piccola' | 'media' | 'grande'

export type VoceCatalogo = {
  id: string
  nome: string
  kind: 'principale' | 'extra'
  minuti: Record<TagliaPrenotazione, number>
  prezzo: Record<TagliaPrenotazione, number>
}

export type SceltaCatalogo = {
  voci: VoceCatalogo[]
  durataMin: number
  totaleIndicativo: number
}

const TAGLIE: TagliaPrenotazione[] = ['piccola', 'media', 'grande']

export function pubblicabile(voce: VoceCatalogo): boolean {
  return TAGLIE.every((taglia) => voce.minuti[taglia] >= 1 && voce.prezzo[taglia] > 0)
}

export function scegliCatalogo(
  catalogo: readonly VoceCatalogo[],
  ids: readonly string[],
  taglia: TagliaPrenotazione,
): SceltaCatalogo | null {
  if (ids.length === 0 || ids.length > 8) return null
  const voci = ids.map((id) => catalogo.find((voce) => voce.id === id))
  if (voci.some((voce) => !voce || !pubblicabile(voce))) return null
  const scelte = voci as VoceCatalogo[]
  if (scelte.filter((voce) => voce.kind === 'principale').length !== 1) return null
  return {
    voci: scelte,
    durataMin: scelte.reduce((sum, voce) => sum + voce.minuti[taglia], 0),
    totaleIndicativo: scelte.reduce((sum, voce) => sum + voce.prezzo[taglia], 0),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/catalogoPrenotazione.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogoPrenotazione.ts src/lib/catalogoPrenotazione.test.ts
git commit -m "Il catalogo online accetta un solo principale con prezzo e durata."
```

---

### Task 2: Accendere le prenotazioni solo col listino confermato

**Files:**
- Modify: `src/lib/prenotazionePubblica.ts`
- Test: `src/lib/prenotazionePubblica.test.ts`
- Modify: `src/data/local/settings.ts` — campo `listinoConfermato?: boolean`, default false, preservato in lettura e scrittura
- Modify: `src/components/piano/LinkCondivisione.tsx` — passa `listinoConfermato` e `haPrincipale` a `puoAccenderePrenotazioni`. Se `manca === 'servizi'`, testo `prenotaMancaServizi` e link a `/impostazioni/servizi`.
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` — `prenotaMancaServizi`: «Prima imposta prezzi e servizi.» / «Set prices and services first.» / «Primero indica precios y servicios.»

**Interfaces:**
- Consumes: `pubblicabile` da Task 1
- Produces: `puoAccenderePrenotazioni` con `manca: 'piano' | 'profilo' | 'fiscale' | 'servizi'`

- [ ] **Step 1: Write the failing test**

In `src/lib/prenotazionePubblica.test.ts` aggiungi:

```ts
it('senza listino confermato o senza principale pubblicabile manca servizi', () => {
  const base = { accesso: true, completo: true, vat: '123', tax: '', listinoConfermato: false, haPrincipale: true }
  expect(puoAccenderePrenotazioni(base)).toEqual({ ok: false, manca: 'servizi' })
  expect(puoAccenderePrenotazioni({ ...base, listinoConfermato: true, haPrincipale: false })).toEqual({ ok: false, manca: 'servizi' })
  expect(puoAccenderePrenotazioni({ ...base, listinoConfermato: true })).toEqual({ ok: true })
})
```

Aggiorna la firma nel test esistente: i casi vecchi passano `listinoConfermato: true, haPrincipale: true`, altrimenti falliscono sul nuovo requisito.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/prenotazionePubblica.test.ts`
Expected: FAIL, `manca` non è `servizi`

- [ ] **Step 3: Write minimal implementation**

Estendi l’input e, dopo il controllo fiscale:

```ts
export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale' | 'servizi'

export function puoAccenderePrenotazioni(input: {
  accesso: boolean
  completo: boolean
  vat: string
  tax: string
  listinoConfermato: boolean
  haPrincipale: boolean
}): { ok: true } | { ok: false; manca: MancaPrenotazione } {
  if (!input.accesso) return { ok: false, manca: 'piano' }
  if (!input.completo) return { ok: false, manca: 'profilo' }
  if (input.vat.trim() === '' && input.tax.trim() === '') return { ok: false, manca: 'fiscale' }
  if (!input.listinoConfermato || !input.haPrincipale) return { ok: false, manca: 'servizi' }
  return { ok: true }
}
```

In `settings.ts`, `listinoConfermato: existing.listinoConfermato === true`. In `LinkCondivisione`, `haPrincipale` è true se un servizio `kind === 'principale'`, `active !== false`, e `pubblicabile` sui suoi minuti e prezzi. Salvare un servizio (`ServicesPage` `submit` e il toggle che chiama `saveExisting`) imposta `listinoConfermato: true` sulle settings. Se dopo il salvataggio non resta nessun principale pubblicabile e `prenotazioniOnline` era true, `save` lo mette a false.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/prenotazionePubblica.test.ts src/pages/listino.test.tsx src/data/local/settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/prenotazionePubblica.ts src/lib/prenotazionePubblica.test.ts src/data/local/settings.ts src/components/piano/LinkCondivisione.tsx src/pages/ServicesPage.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Le prenotazioni online si accendono solo dopo aver salvato un servizio con prezzo."
```

---

### Task 3: La richiesta conserva servizi, minuti e prezzo

**Files:**
- Modify: `functions/src/piano/inviaRichiesta.ts`
- Modify: `functions/src/piano/paginaPubblica.ts` — legge i servizi e passa al HTML solo i pubblicabili
- Modify: `src/lib/paginaPubblica.ts` — accetta `catalogo: VoceCatalogo[]` e lo stampa in un `<script type="application/json" id="catalogo">`
- Modify: `hosting/s/pagina.js` — dopo la taglia, scelta servizi; disclaimer; `postiLiberi` con `durataMin` della somma; body `servizi`, `voci`, `totaleIndicativo`, `durataMin`
- Test: `src/lib/paginaPubblica.test.ts` e `functions` se c’è già un test di `inviaRichiesta`; altrimenti un test puro già coperto da Task 1 e un assert sul HTML

**Interfaces:**
- Consumes: `scegliCatalogo`
- Produces: la richiesta Firestore con `voci`, `totaleIndicativo`, `durataMin` oltre a `servizi` (gli id)

- [ ] **Step 1: Write the failing test**

In `src/lib/paginaPubblica.test.ts` assert che l’HTML contiene `id="catalogo"` e il nome del servizio passato, e la frase italiana «I prezzi sono indicativi.»

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/paginaPubblica.test.ts`
Expected: FAIL, manca `id="catalogo"`

- [ ] **Step 3: Write minimal implementation**

`inviaRichiestaPer` legge i servizi del salone, costruisce `VoceCatalogo` solo dagli attivi, chiama `scegliCatalogo`. Se null, `invalid-argument` «Servizio non valido». Se giorno e ora ci sono, `postiLiberiPer(salonId, giorno, scelta.durataMin)` e l’ora deve essere nella lista. Sul documento salva `servizi: ids`, `voci: scelta.voci.map(v => ({ id, nome, kind, minuti: v.minuti[taglia], prezzo: v.prezzo[taglia] }))`, `totaleIndicativo`, `durataMin`. L’intervallo `end` è `start + durataMin`, non più un’ora fissa.

`pagina.js`: lo stato ha `principale: ''` e `extra: []`. Il blocco servizi sta dopo la taglia e prima del calendario. Un radio per i principali, una checkbox per gli extra. Riga `nome · minuti min · prezzo €`. Sotto la frase del disclaimer nella lingua della pagina (i tre testi della spec, sezione 1). Il totale è la somma. `carica` e ogni cambio di servizio o taglia rifanno `postiLiberi` con `durataMin`. Se la somma è 0 non chiede i posti. Il submit manda gli id scelti e non più `['appuntamento']`.

Il riquadro richiesta (`RiquadroRichiesta.tsx`) mostra, se `richiesta.voci` c’è, una riga `nome · minuti min · prezzo €` e «Totale indicativo X €». Estendi il tipo `RichiestaNuova` in `client.ts` con `voci?`, `totaleIndicativo?`, `durataMin?`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/paginaPubblica.test.ts src/lib/catalogoPrenotazione.test.ts src/components/piano/RiquadroRichiesta.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paginaPubblica.ts src/lib/paginaPubblica.test.ts functions/src/piano/inviaRichiesta.ts functions/src/piano/paginaPubblica.ts hosting/s/pagina.js src/components/piano/RiquadroRichiesta.tsx src/data/firebase/client.ts
git commit -m "La prenotazione online chiede il servizio e conserva prezzo e durata."
```

---

### Task 4: Bypass Pro o Salone, reversibile

**Files:**
- Create: `src/lib/pianoBypass.ts`
- Test: `src/lib/pianoBypass.test.ts`
- Modify: `functions/src/piano/scriviPiano.ts` — `campiAzione('pro'|'salone')` resta omaggio solo se l’azione è esplicitamente `omaggio`. Aggiungi azioni `bypass-pro` e `bypass-salone` con fonte `manuale`.
- Modify: `functions/src/piano/impostaPianoManuale.ts` — accetta le nuove azioni. `decisioneVip` blocca ancora lo spegnimento di un omaggio solo se l’azione non è `spegni-omaggio`.
- Modify: `src/lib/funzioniPiano.ts` — `decisioneVip` invariata per `base` su un VIP. Nuova `decisioneBypass` vive in `pianoBypass.ts` e il server la chiama.

**Interfaces:**
- Consumes: `ProMain` da `src/lib/piano.ts`
- Produces:

```ts
export type AzioneBypass = 'scegli-pro' | 'scegli-salone' | 'spegni' | 'spegni-omaggio'
export function decisioneBypass(doc: ProMain | undefined, azione: AzioneBypass, testo: string):
  | { ok: true; campi: CampiPiano; avviso: string | null }
  | { ok: false; manca: 'testo' | 'vip' | 'scelta' }
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { decisioneBypass } from './pianoBypass'

const play = { piano: 'salone' as const, stato: 'attivo' as const, fonte: 'play' as const, scadeIl: '2026-12-01T00:00:00.000Z' }
const manuale = { piano: 'pro' as const, stato: 'attivo' as const, fonte: 'manuale' as const, scadeIl: null }
const omaggio = { piano: 'salone' as const, stato: 'attivo' as const, fonte: 'omaggio' as const, scadeIl: null }

describe('bypass del piano', () => {
  it('sceglie Pro o Salone come manuale, senza testo', () => {
    expect(decisioneBypass(undefined, 'scegli-pro', '')).toMatchObject({ ok: true, avviso: null, campi: { piano: 'pro', fonte: 'manuale', stato: 'attivo', scadeIl: null } })
    expect(decisioneBypass(manuale, 'scegli-salone', '   ')).toMatchObject({ ok: true, campi: { piano: 'salone', fonte: 'manuale' } })
  })

  it('spegne un manuale e una prova senza testo, e un Play attivo solo con il testo', () => {
    expect(decisioneBypass(manuale, 'spegni', '')).toMatchObject({ ok: true, avviso: null, campi: { piano: 'base' } })
    expect(decisioneBypass({ ...manuale, fonte: 'prova', stato: 'prova' }, 'spegni', '')).toMatchObject({ ok: true, avviso: null })
    expect(decisioneBypass(play, 'spegni', '  ')).toEqual({ ok: false, manca: 'testo' })
    const spento = decisioneBypass(play, 'spegni', '  Abbiamo chiuso il piano.  ')
    expect(spento).toMatchObject({ ok: true, avviso: 'Abbiamo chiuso il piano.', campi: { piano: 'base', fonte: null } })
  })

  it('un omaggio non si spegne con spegni, sì con spegni-omaggio', () => {
    expect(decisioneBypass(omaggio, 'spegni', 'motivo')).toEqual({ ok: false, manca: 'vip' })
    expect(decisioneBypass(omaggio, 'spegni-omaggio', '')).toMatchObject({ ok: true, avviso: null })
  })

  it('un testo oltre 400 caratteri non parte', () => {
    expect(decisioneBypass(play, 'spegni', 'a'.repeat(401))).toEqual({ ok: false, manca: 'testo' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pianoBypass.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`decisioneBypass` implementa la tabella del test. `CampiPiano` si importa da `functions/src/piano/scriviPiano.ts` solo se quel modulo non tira dentro firebase-admin a livello di import. Se lo tira, duplica il tipo minimo in `pianoBypass.ts` (`piano`, `stato`, `fonte`, `scadeIl`) e in `scriviPiano.ts` aggiungi `campiBypass(decisione)` che mappa quei campi con `seatsIncluded: piano === 'salone' ? 3 : 0`. Il server `impostaPianoManualePer` accetta `bypass-pro`, `bypass-salone`, `spegni`, `spegni-omaggio` oltre alle azioni già presenti. Per queste quattro chiama `decisioneBypass` e non `campiAzione`. `pro` e `salone` delle vecchie azioni restano `campiOmaggio` così «Salone omaggio» continua a creare il VIP. Se `manca === 'testo'` o `'vip'`, `failed-precondition`.

Play «dà ancora accesso» se `fonte === 'play'` e (`stato` è `attivo` o `grazia`, oppure `stato === 'disdetto'` e `scadeIl` è nel futuro rispetto a `adesso` passato alla funzione; aggiungi `adesso: Date` come terzo argomento dopo `testo`, default `new Date()` nei test con data fissa `2026-10-28`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pianoBypass.test.ts src/lib/funzioniPiano.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pianoBypass.ts src/lib/pianoBypass.test.ts functions/src/piano/scriviPiano.ts functions/src/piano/impostaPianoManuale.ts
git commit -m "Il bypass accende Pro o Salone ed è reversibile, senza diventare VIP."
```

---

### Task 5: Avviso obbligatorio a chi ha pagato

**Files:**
- Create: `src/lib/avvisoPiano.ts`
- Test: `src/lib/avvisoPiano.test.ts`
- Modify: `functions/src/piano/impostaPianoManuale.ts` — se `avviso` non è null, scrive `salons/{id}/avvisi/piano` `{ testo, at, letto: false }` e tenta l’email. Il piano si spegne anche se l’email fallisce. Ritorna `{ ok: true, emailStato: 'inviata' | 'non_inviata' | null }`.
- Modify: `src/pages/HomePage.tsx` — il titolare vede la card finché `letto` non è true. Pulsante «Ho letto» chiama una callable o un update del doc. Se non esiste già una callable, aggiungi `segnaAvvisoPiano` in `functions/src/index.ts` che mette `letto: true` solo al titolare di quel salone.

**Interfaces:**
- Consumes: `decisioneBypass(...).avviso`
- Produces: `oggettoAvviso(lingua: 'it' | 'en' | 'es'): string` e `corpoAvviso(testo: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { oggettoAvviso } from './avvisoPiano'

describe('avviso piano', () => {
  it('l’oggetto segue la lingua', () => {
    expect(oggettoAvviso('it')).toBe('Il piano Groomly è stato aggiornato')
    expect(oggettoAvviso('en')).toBe('Your Groomly plan was updated')
    expect(oggettoAvviso('es')).toBe('Tu plan de Groomly se ha actualizado')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/avvisoPiano.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`oggettoAvviso` come nel test. `corpoAvviso` ritorna il testo già trimmato, senza aggiunte. In Home la card sta sopra «Da chiudere», testo dell’avviso, pulsante «Ho letto». Frasi i18n `avvisoPianoLetto`. Solo `role === 'titolare'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/avvisoPiano.test.ts src/pages/HomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/avvisoPiano.ts src/lib/avvisoPiano.test.ts functions/src/piano/impostaPianoManuale.ts functions/src/index.ts src/pages/HomePage.tsx src/data/firebase/client.ts src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Spegnere un piano pagato scrive un avviso in email e in Home."
```

---

### Task 6: In Utenti si sceglie Pro o Salone

**Files:**
- Modify: `src/pages/UsersPage.tsx`
- Test: `src/pages/UsersPage.test.tsx`

**Interfaces:**
- Consumes: `decisioneBypass` solo come specifica; la UI chiama `callImpostaPiano` con `bypass-pro`, `bypass-salone`, `spegni`, `spegni-omaggio` e `testo?`
- Produces: niente

- [ ] **Step 1: Write the failing test**

Nel test di UsersPage, con un salone base: il toggle spento, al click compaiono i pulsanti «Pro» e «Salone» e non parte nessuna chiamata finché non si conferma Pro. Poi `callImpostaPiano` riceve `bypass-pro`. Con un salone `fonte: 'play'` acceso, spegnere senza scrivere lascia il pulsante acceso e mostra il campo; con il testo «Chiuso» la chiamata è `spegni` e il testo. I pulsanti «Pro omaggio» e «Torna a Base» non ci sono. «Prova 30 giorni» e «Salone omaggio» restano.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/UsersPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Il toggle acceso se `piano` è `pro` o `salone`. Accanto, la scritta Pro o Salone. Da spento, il click apre due righe nel dialogo già usato, non cambia il piano. Annulla chiude. Conferma Pro chiama `bypass-pro`, Salone `bypass-salone`. Da acceso, spegnere: se `fonte === 'omaggio'` chiede conferma con `frasi` «Questo salone è un omaggio. Spegnere?» e poi `spegni-omaggio`. Se `fonte === 'play'` e dà ancora accesso (stessa regola di Task 4, riusa `decisioneBypass` importandola), mostra il campo e la riga «Groomly spegne il piano nell’app. L’addebito su Play, se c’è, continua finché il titolare non lo disdice nello store.» Il pulsante di conferma è disabilitato se il trim è vuoto o più lungo di 400. Altrimenti `spegni` senza testo. Togli dalla lista `azioni` le voci `pro` e `base`. Lascia `prova` e `salone`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/UsersPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/UsersPage.tsx src/pages/UsersPage.test.tsx src/data/firebase/client.ts src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "In Utenti il bypass chiede se accendere Pro o Salone."
```

---

### Task 7: Proposta in due passi

**Files:**
- Modify: `src/components/piano/RiquadroRichiesta.tsx`
- Test: `src/components/piano/RiquadroRichiesta.test.tsx`

**Interfaces:**
- Consumes: `callPostiLiberi`, `callGestisciPrenotazione`
- Produces: niente

- [ ] **Step 1: Write the failing test**

Nel test esistente che clicca Proponi: al primo passo non ci sono chip dei giorni. Dopo Proponi, il dialogo non ha il pulsante Accetta né Rifiuta; ha «Giorno», «Orario», «Annulla» e «Invia proposta». Annulla riporta Accetta. Invia è disabilitato finché non si scelgono giorno e ora. I giorni stanno in un `role="group"` con aria-label Giorno, le ore in un altro con aria-label Orario, e i due gruppi non sono lo stesso nodo.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/RiquadroRichiesta.test.tsx`
Expected: FAIL, Accetta è ancora visibile mentre si propone

- [ ] **Step 3: Write minimal implementation**

Quando `proponendo`, il dialogo non renderizza i tre pulsanti del primo passo. Titolo del contenuto «Proponi un altro orario» (frase i18n `richiestaProponiTitolo`) e una riga col cane scelto. Gruppo giorni: `overflowX: 'auto'`, `flexWrap: 'nowrap'`, chip con `minHeight` non fissato a 44, `padding: '4px 8px'`, `fontSize: 13`. Gruppo ore sotto, con `borderTop: '1px solid var(--line)'`, `paddingTop: 8`, solo se `giorno !== ''`. In fondo `display: 'flex'`, Annulla (`homeIndietro` o frase `richiestaAnnullaProposta`) e Invia proposta (`richiestaInviaProposta`). Annulla chiama `tornaAlOrario`. Invia chiama `invia('proponi', { giorno, ora })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/RiquadroRichiesta.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/RiquadroRichiesta.tsx src/components/piano/RiquadroRichiesta.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Proporre un orario separa i giorni dalle ore e non mostra Accetta."
```

---

### Task 8: Testi delle mail di proposta e rifiuto

**Files:**
- Modify: `src/i18n/emailHtml.ts`
- Test: `src/i18n/emailHtml.test.ts`
- Modify: `functions/src/piano/gestisciPrenotazione.ts` — il rifiuto passa `url` della pagina pubblica se lo slug c’è

**Interfaces:**
- Consumes: `linkPrenotazione`
- Produces: corpo mail come nella spec, sezione 4

- [ ] **Step 1: Write the failing test**

Aggiorna il test della proposta italiana: l’HTML contiene «Ci scusiamo, ma nella data e nell’orario scelti» e «Le proponiamo in alternativa». Il rifiuto contiene «Si prega di selezionare un’altra data e un orario disponibile.» e, se `url` è `https://groomlyapp.it/s/i-pelosetti`, un solo `<a` con quel href e il testo «Scegli un altro orario». Senza url, il rifiuto non ha `<a`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/emailHtml.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Sostituisci il ramo `tipo === 'proposta'` in `emailMessaggio` con la frase della spec, inserendo `invece`, `quando`, `entro` solo se non vuoti. Stessa struttura in inglese e spagnolo, stesso significato. Per `tipo === 'rifiuto'`, corpo della spec e, se `dati.url` è una pagina `/s/`, un pulsante. Oggetti invariati. In `gestisciPrenotazione`, quando la mail è `rifiuto`, risolvi lo slug del salone dal doc `pubblici` o dal nome già usato da `linkPrenotazione(slugDaNome)` se il salone ha uno slug pubblicato; se non c’è, ometti `url`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/emailHtml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts functions/src/piano/gestisciPrenotazione.ts
git commit -m "Le mail di proposta e rifiuto spiegano che quell'orario non si può fare."
```

---

### Task 9: Pagina di conferma con il logo

**Files:**
- Modify: `functions/src/piano/rispondiRichiesta.ts`
- Test: cerca `pagina(` o `Appuntamento confermato` nei test functions; se non c’è, esporta `htmlEsito` puro da un file `functions/src/piano/htmlEsito.ts` (senza firebase) e testalo in `functions` oppure metti `htmlEsito` in `src/lib/htmlEsito.ts` e testalo con vitest.

**Interfaces:**
- Consumes: niente del catalogo
- Produces: `htmlEsito(input: { lingua: 'it' | 'en' | 'es'; tipo: 'conferma' | 'liberato' | 'non_valido'; salone: string; cane: string; quando: string }): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { htmlEsito } from './htmlEsito'

describe('pagina esito', () => {
  it('la conferma ha il logo, la fascia e il riepilogo, il posto liberato no la spunta', () => {
    const html = htmlEsito({ lingua: 'it', tipo: 'conferma', salone: 'Canespa', cane: 'Rex', quando: 'giovedì 29 ottobre, 10:00–11:00' })
    expect(html).toContain('groomly-logo-orizzontale.svg')
    expect(html).toContain('#8ADBD9')
    expect(html).toContain('Appuntamento confermato')
    expect(html).toContain('Canespa')
    expect(html).toContain('Rex')
    expect(html).toContain('giovedì 29 ottobre, 10:00–11:00')
    expect(html).toContain('Il salone ha l’appuntamento. Puoi chiudere questa pagina.')
    const libero = htmlEsito({ lingua: 'it', tipo: 'liberato', salone: '', cane: '', quando: '' })
    expect(libero).toContain('groomly-logo-orizzontale.svg')
    expect(libero).not.toContain('Appuntamento confermato')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/htmlEsito.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`htmlEsito` costruisce il documento della spec, sezione 5. La spunta è un cerchio con un segno, in SVG inline, solo per `conferma`. `rispondiRichiesta` usa `htmlEsito` al posto di `pagina`. La lingua viene da `linguaClientiSalon`. Inglese: titolo «Appointment confirmed», frase «The salon has the appointment. You can close this page.» Spagnolo: «Cita confirmada», «El salón tiene la cita. Puedes cerrar esta página.» Liberato e non valido: titoli già presenti («Posto liberato», «Link non valido») e le frasi già scritte, senza spunta.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/htmlEsito.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/htmlEsito.ts src/lib/htmlEsito.test.ts functions/src/piano/rispondiRichiesta.ts
git commit -m "La pagina di conferma mostra il logo e il riepilogo dell'appuntamento."
```

---

### Task 10: Giorno, schede staccate e chip corte

**Files:**
- Modify: `src/pages/CalendarPage.tsx` funzione `AppointmentBlock`
- Test: `src/pages/appointments.test.tsx` o il test del calendario se copre il giorno

**Interfaces:**
- Consumes: niente
- Produces: niente

- [ ] **Step 1: Write the failing test**

Nel render del giorno, due appuntamenti contigui: ogni bottone `Apri {nome}` ha nel style `border` che contiene `var(--line)` e `marginBottom` o un inset, non solo lo sfondo `var(--card)`. Una chip servizio nel giorno ha `fontSize` 12 o 13, non un’altezza 44.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx`
Expected: FAIL se l’assert è nuovo; se il test del giorno non monta due appuntamenti, aggiungi il caso e fallisce sull’assenza del bordo

- [ ] **Step 3: Write minimal implementation**

Nello style di `AppointmentBlock` quando `mode === 'giorno'`: `border: '1px solid var(--line)'`, `boxSizing: 'border-box'`, e riduci `height` di 3 pixel rispetto al valore calcolato (`height: height - 3`) così la scheda sotto non si incolla. Il contenuto resta `alignItems: 'flex-start'`, non si stira. `CalendarServiceChip` nel giorno: `fontSize: 12`, `padding: '1px 6px'`, `whiteSpace: 'nowrap'`. Se lo slot è basso (altezza sotto 52), non renderizzare le chip, solo nome e ora. Se le chip superano una riga disponibile, mostra quelle che entrano e un `+N` con N i servizi nascosti.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m "Nel giorno le schede vicine si separano e le chip restano corte."
```

---

### Task 11: Settimana a biglietti

**Files:**
- Modify: `src/components/calendar/WeekRows.tsx`
- Test: `src/components/calendar/WeekRows.test.tsx`

**Interfaces:**
- Consumes: niente
- Produces: niente

- [ ] **Step 1: Write the failing test**

Due appuntamenti nello stesso giorno: nessuno ha `data-squashed="true"`, nessuno ha `flexGrow` `1`, il contenitore dei biglietti ha `flexWrap: 'wrap'`. Il biglietto mostra il nome e l’ora. Con due servizi, il testo contiene `+1`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/calendar/WeekRows.test.tsx`
Expected: FAIL, i biglietti sono ancora schiacciati

- [ ] **Step 3: Write minimal implementation**

Togli la logica `squashed`, `scaleX` e la larghezza fissa 34. Ogni appuntamento è un bottone con `flex: '0 0 auto'`, `width: 'auto'`, `border: '1px solid var(--line)'`, `borderRadius: 8`, `padding: '4px 8px'`. Il contenitore è `display: 'flex'`, `flexWrap: 'wrap'`, `gap: 8`. A sinistra il giorno compatto (`gio 29` via `giornoRomaCorto` o l’etichetta già usata). Dentro il biglietto: nome, ora, icona del primo servizio, e `+1` se `services.length > 1`. Provvisorio: `background: var(--warn-s)`. Personale: `background: var(--personal-s)`. Il bottone vuoto finale non ha `flex: '1 1 auto'`; è un’area con `flex: '1 0 24px'` e `minHeight: 28` solo per creare, senza stirare i biglietti. Niente scroll orizzontale sul contenitore (`overflowX: 'hidden'`).

Aggiorna i test vecchi che si aspettano `data-squashed` e `scaleX`: quella compressione non esiste più.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/calendar/WeekRows.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/WeekRows.tsx src/components/calendar/WeekRows.test.tsx
git commit -m "La settimana mostra biglietti a misura del testo, che vanno a capo."
```

---

### Task 12: Notifiche e pulsanti in Home

**Files:**
- Modify: `src/i18n/it.ts` `notChiudere`, `en.ts`, `es.ts`
- Modify: `src/pages/HomePage.tsx` `closeActions` / `closeAction`
- Test: `src/pages/NotificationsPage.test.tsx`, `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: niente
- Produces: niente

- [ ] **Step 1: Write the failing test**

Notifications: `getByRole('switch', { name: 'Appuntamenti da chiudere' })`. Home: i tre pulsanti Completato, Non venuto, Disdetto sono nello stesso padre con `flexWrap` diverso da `wrap`. Lo style del bottone non ha `minHeight: 44`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/HomePage.test.tsx`
Expected: FAIL, il nome è ancora «Da chiudere»

- [ ] **Step 3: Write minimal implementation**

`notChiudere`: «Appuntamenti da chiudere», «Appointments to close», «Citas por cerrar». `notChiudereCorpo` invariato. In Home, `closeActions`: `display: 'flex'`, `flexWrap: 'nowrap'`, `gap: 6`. `closeAction`: togli `minHeight: 44` e `flexWrap: 'wrap'`. Metti `whiteSpace: 'nowrap'`, `padding: '4px 6px'`, `fontSize: 12`, `flex: '1 1 0'`. Il pulsante «Rimuovi dalla lista» usa lo stesso style, non `width: '100%'`.

Aggiorna gli assert dei test che cercano ancora «Da chiudere» come nome del toggle notifiche. Non cambiare `homeDaChiudere`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/HomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts src/pages/HomePage.tsx src/pages/NotificationsPage.test.tsx src/pages/HomePage.test.tsx
git commit -m "Le notifiche dicono appuntamenti da chiudere e i pulsanti in Home stanno su una riga."
```

---

### Task 13: Servizi su una riga

**Files:**
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/lib/serviceSummary.ts` — `summarizeDuration` usa `min` invece di `m` (`30–75 min`, extra `+20 min`)
- Test: `src/pages/ServicesPage.test.tsx`, `src/lib/serviceSummary.test.ts` se esiste, altrimenti il test di pagina

**Interfaces:**
- Consumes: `summarizeDuration`, `summarizePrice`
- Produces: niente

- [ ] **Step 1: Write the failing test**

La riga di Bagno contiene il nome e, nello stesso bottone che apre la modifica, il testo dei minuti e del prezzo. Il toggle ha un’etichetta accessibile e non è dentro quel bottone. Non ci sono due `Chip` di durata e prezzo sotto il nome.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ServicesPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`renderGroup`: una riga `display: 'flex'`, `alignItems: 'center'`, `gap: 8`, `minHeight: 0`. Maniglia, icona, poi un bottone `flex: 1`, `minWidth: 0`, `display: 'flex'`, `gap: 8`, che chiama `setEditing(service)`. Dentro: nome con `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'`; a destra `flex: 'none'` il testo `${summarizeDuration} · ${summarizePrice}` in `color: var(--tx3)`, `fontSize: 13`, `whiteSpace: 'nowrap'`; un `ChevronRight` 16. Poi il `Toggle` fuori dal bottone. Niente seconda riga di Chip. Se `!service.active`, il nome ha `color: var(--tx3)` e al posto del riepilogo la parola `frasi.srvDisattivato` («Spento»). `summarizeDuration`: sostituisci `m` con ` min`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ServicesPage.test.tsx src/lib/serviceSummary.test.ts`
Expected: PASS. Se `serviceSummary.test.ts` non c’è, solo il test di pagina.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx src/lib/serviceSummary.ts
git commit -m "Ogni servizio sta su una riga, con tempo e prezzo accanto al nome."
```

---

### Task 14: Backup senza Salva ora, con la i sulla frequenza

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Test: `src/pages/SettingsPage.test.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`

**Interfaces:**
- Consumes: niente
- Produces: niente

- [ ] **Step 1: Write the failing test**

Nel dialogo backup non c’è «Salva ora». C’è un pulsante «Informazioni sulla frequenza». Aprendolo, il dialogo contiene «una copia al giorno», «ogni 7 giorni», «ogni 30 giorni» e «quando l’app è aperta». Non contiene «23:00».

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`
Expected: FAIL, «Salva ora» è ancora presente

- [ ] **Step 3: Write minimal implementation**

Togli il `BackupAction` di `bakSalvaOra`. Non cancellare `runBackup` se un altro pulsante lo usa; se non lo usa più nessuno, lascialo nel file solo se un test lo chiama ancora, altrimenti eliminalo insieme al pulsante. Accanto all’etichetta Frequenza, un bottone con `Info` e `aria-label` da `bakFrequenzaInfo`. Apre un `Dialog` con quattro righe i18n:

- it: «Giornaliero: una copia al giorno.» «Settimanale: una copia ogni 7 giorni.» «Mensile: una copia ogni 30 giorni.» «Parte quando l’app è aperta, se Wi-Fi e carica sono come li hai impostati.»
- en: «Daily: one copy a day.» «Weekly: one copy every 7 days.» «Monthly: one copy every 30 days.» «It runs when the app is open, if Wi-Fi and charging are as you set them.»
- es: «Diario: una copia al día.» «Semanal: una copia cada 7 días.» «Mensual: una copia cada 30 días.» «Sale cuando la app está abierta, si el Wi-Fi y la carga están como los pusiste.»

Chiusura con `notCapito` («Ho capito»).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Il backup non offre più Salva ora e spiega la frequenza."
```

---

### Task 15: Informativa sulla prenotazione e legali fuori dall’app

**Files:**
- Modify: `hosting/s/pagina.js`
- Modify: `src/pages/LegalePage.tsx`
- Modify: `src/lib/openDocument.ts` se serve un helper `apriEsterno(url)`
- Test: `src/lib/paginaPubblica.test.ts` non copre il js; aggiungi un test in `src/pages` per Legale, e un commento verificabile: in `pagina.js` il link informativa non ha `href` verso `/privacy/` come navigazione. Test Legale: i link esterni chiamano `Browser.open` e non sono `<a href="https://groomlyapp.it/privacy/...">` senza target. Cerca il test di Legale; se non c’è, `src/pages/shellPages.test.tsx`.

**Interfaces:**
- Consumes: `linkLegale` da `src/lib/distribuzione.ts`
- Produces: `apriEsterno(url: string): Promise<void>` in `src/lib/openDocument.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { apriEsterno } from './openDocument'

describe('apri esterno', () => {
  it('sul web apre una finestra nuova e non assegna location', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await apriEsterno('https://groomlyapp.it/privacy/?lang=it')
    expect(open).toHaveBeenCalledWith('https://groomlyapp.it/privacy/?lang=it', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })
})
```

E in `hosting/s/pagina.js` il test può essere una lettura: aggiungi in `src/lib/paginaPubblica.test.ts` niente. Aggiungi `src/lib/informativaPrenotazione.test.ts` che legge `hosting/s/pagina.js` come testo e si aspetta `id === 'informativa'` o la stringa `torna-prenotazione`, e `not.toContain("privacy.href = '/privacy/")`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/openDocument.test.ts src/lib/informativaPrenotazione.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`apriEsterno`: se `Capacitor.isNativePlatform()`, `Browser.open({ url })`. Altrimenti `window.open(url, '_blank', 'noopener,noreferrer')`. `LegalePage` per i link esterni usa un `<button>` che chiama `apriEsterno(voce.href)`, non un `<a>`.

In `pagina.js`, il link informativa è un `<button type="button" id="informativa">`. Al click aggiunge `history.pushState({ informativa: true }, '')` e mostra un pannello `#foglio-privacy` sopra il form, con un bottone `#torna-prenotazione`. Il pannello contiene un iframe `src="/privacy/?lang=" + lang` oppure il testo già noto se l’iframe è vuoto. `popstate` nasconde il pannello e non ricostruisce lo stato del form (lo stato è già in memoria). Non assegnare `location` a `/privacy/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/openDocument.test.ts src/lib/informativaPrenotazione.test.ts src/pages/shellPages.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hosting/s/pagina.js src/pages/LegalePage.tsx src/lib/openDocument.ts src/lib/openDocument.test.ts src/lib/informativaPrenotazione.test.ts
git commit -m "L'informativa non abbandona la prenotazione e i legali si aprono fuori dall'app."
```

---

## Self-review

Copertura della spec `docs/superpowers/specs/2026-10-28-schermate-prenotazione-agenda-design.md`:

1. Catalogo, disclaimer, durata somma, snapshot, gate `listinoConfermato` — Task 1, 2, 3.
2. Bypass Pro/Salone, spegnimento, testo Play, conferma omaggio — Task 4, 5, 6.
3. Due passi della proposta — Task 7.
4. Mail — Task 8.
5. Pagina conferma — Task 9.
6. Agenda giorno e settimana — Task 10, 11.
7. Notifiche e Home — Task 12.
8. Servizi su una riga — Task 13.
9. Backup — Task 14.
10. Informativa e legali — Task 15.

Fuori scope rispettato: niente disdetta Play, niente 23:00, «Da chiudere» di Home invariato, listino cartaceo invariato.
