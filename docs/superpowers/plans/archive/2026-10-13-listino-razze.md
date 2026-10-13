# Listino per razza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Listino prezzi compare il listino per razza del cartaceo (modifica, prezzi, stampa e condivisione PDF/JPEG in A4/A3), senza toccare la card file né la tabella «Prezzi e tempi standard».

**Architecture:** `settings.priceSheet` è un JSON nuovo, separato dal catalogo `services`. `getPriceSheet` restituisce il seed se il campo manca o non passa lo schema. La logica di prezzi, icone, bozza e paginazione sta in `src/lib/priceSheet.ts`. Il foglio di stampa è un componente a misura CSS (A4 794×1123, A3 lo stesso foglio × 1,414) il cui CSS è quello di `.fly` nel prototipo. L’export monta il foglio fuori schermo e lo fotografa con `html-to-image` + `jspdf`.

**Tech Stack:** React + TypeScript, Vitest + happy-dom + Testing Library, Zod, Lucide, `@fontsource/oswald` `@fontsource/quicksand` `@fontsource/dancing-script`, `html-to-image`, `jspdf`, `@capacitor/share` (Filesystem e file-viewer già presenti).

**Spec:** `docs/listino-razze/listino-razze-spec.md`  
**Prototipo visivo (non riscrivere il layout):** `docs/listino-razze/listino-razze-prototipo.html`  
**Cartaceo di confronto:** `docs/listino-razze/listino-originale.jpeg`

## Global Constraints

- D1: card file («Aggiungi file», occhio, matita, cestino) e tabella «Prezzi e tempi standard» restano. I test in `src/pages/listino.test.tsx` restano verdi.
- D7: nessun collegamento tra `priceSheet` e i servizi degli appuntamenti o la scheda cane. Non allargare `ServiceIconKey` né `SERVICE_ICON_KEYS`.
- Lingua UI: italiano. Stile del codice come i file intorno. Niente commenti superflui.
- Nessuna foto su Cloud Storage. Il logo `data:` va in `salon/shared/files` con `owner: 'listino'`, `kind: 'foto'`, e il campo diventa `file:{id}`.
- Messaggio logo troppo grande, alla lettera: «La foto è troppo grande per essere salvata. Prova con un'altra immagine.»
- Il foglio di stampa è sempre a colori chiari, anche col tema scuro.
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto, `npm run build`. Shell: PowerShell, cartella `d:\Groomly`.
- Non committare `.cursor/rules/rapporto-consumi.mdc`, `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`. `git add` con percorsi espliciti.
- A fine aggiornamento consegnato (ultimo task, quando test e build sono verdi): regola workspace `publish-update`. I commit dei task intermedi non pubblicano.

## Chiusure (la spec si poteva leggere in due modi)

- «28 razze» = 28 righe `Breed`, non i nomi separati dalla barra. «Maltese / Shih Tzu / Barboncino / Maltipoo» è una riga. Conteggi: piccola 7, media 11, grande 10.
- Il nome salvato non contiene «Tipo ». Il prefisso lo aggiungono solo app e foglio.
- Riordino razze: frecce ↑↓, come le sezioni. La spec lo consente al posto del trascinamento.
- Chiave bozza: `` `${ownerId}:${itemId}` ``. `ownerId` è l’id razza, `'bagnoTosatura'` per le tre voci indicative, o l’id della voce extra (le sotto-voci usano l’id del genitore).
- `applyBulk` legge la bozza già in corso (parametro `draft`) così +10% due volte parte dal prezzo già modificato. Non muta il foglio. Se il risultato è uguale al prezzo salvato, la chiave esce dalla bozza.
- Scope `'extra'`: voci di `bagnoTosatura` + voci extra e le loro `sotto`. Salta `valutazione`. % arrotonda all’euro intero. −1 non scende sotto 0.
- `formatPriceApp` / importo: intero senza decimali (`25 €`), altrimenti due decimali con virgola (`27,50 €`).
- Logo: il salvataggio vero è `saveSettings` → `withUploadedPrices` in `src/data/firebase/client.ts` (`storeFile('listino', 'foto', …)`). `settingsMediaPatch` scrive `priceSheet.intestazione.logo` quando tra gli URL caricati c’è `id: 'priceSheet-logo'`. Oggi `settingsMediaPatch` non è chiamato da `client.ts`: il task 6 lo estende e il percorso di upload in `client.ts` fa lo `storeFile` prima di `settingsToDoc`. `settingsHaveBinary` diventa vero se il logo è `data:`, così un `data:` non entra nel documento.
- `settingsToDoc` copia `priceSheet`. Se il logo è ancora `data:`, quel campo si omette (stessa protezione dei `dataUrl` del listino file).
- `blankSettings` non crea `priceSheet`. `getPriceSheet` fa `priceSheetSchema.safeParse`; se fallisce o manca, restituisce `seedPriceSheet(business)` e non scrive.
- Tasto indietro di sistema su `/listino/prezzi`, `/listino/gestione`, `/listino/stampa`: scelta `'listino'` e `navigate('/listino')`, anche senza storia. Un dialogo aperto si chiude prima, come oggi.
- happy-dom non misura l’overflow reale. Il test di «1 pagina» è `fitColumnScale` + `paginate`. Il confronto visivo col JPEG è nel task 9, sul telefono.
- Id del seed stabili (sotto), così i test non dipendono da `randomUUID`.

## File Structure

| File | Responsabilità |
|---|---|
| Create `src/assets/icons/svg/service-bagno-sistemazione.svg` e le altre 5 | Sticker nuovi |
| Modify `src/assets/icons/icons.ts` | `PRICE_ICONS`, `PriceIconKey` |
| Create `src/components/domain/PriceIcon.tsx` | `<img>` del listino |
| Modify `src/lib/uiStyle.ts` | `priceTone` |
| Modify `src/theme/tokens.css` | `--s-pelo` chiaro e scuro |
| Modify `src/components/ui/IconTile.tsx` | tono anche per `PriceIconKey` |
| Create `src/types/priceSheet.ts` | modello |
| Create `src/data/seed/priceSheet.ts` | seed del cartaceo |
| Modify `src/lib/schemas.ts` | `priceSheetSchema` |
| Modify `src/data/local/settings.ts` | campo opzionale + merge |
| Modify `src/lib/firebaseMap.ts` | round-trip, ometti logo `data:` |
| Create `src/lib/priceSheet.ts` | logica pura |
| Modify `src/pages/ListinoPage.tsx` | sezione tra card file e tabella |
| Modify `src/app/router.tsx` | tre rotte sotto `Guard` |
| Create `src/pages/PriceSheetPricesPage.tsx` | aggiorna prezzi |
| Create `src/pages/PriceSheetManagePage.tsx` | gestione + scheda razza |
| Create `src/pages/PriceSheetExportPage.tsx` | stampa e condividi |
| Create `src/components/priceSheet/PriceSheetPaper.tsx` + `priceSheetPaper.css` | foglio |
| Create `src/lib/priceSheetExport.ts` | PDF / JPEG |
| Modify `src/lib/dogPhoto.ts` | `prepareLogo` |
| Modify `src/lib/uploadPatch.ts` | patch del logo |
| Modify `src/data/firebase/client.ts` | upload logo |
| Modify `src/lib/systemBack.ts` + `SystemBack.tsx` | indietro → `/listino` |
| Test accanto a ogni modulo | come sotto |

---

### Task 1: Icone sticker e tono pelo

**Files:**
- Create: `src/assets/icons/svg/service-bagno-sistemazione.svg`
- Create: `src/assets/icons/svg/service-pelo-corto.svg`
- Create: `src/assets/icons/svg/service-pelo-lungo.svg`
- Create: `src/assets/icons/svg/service-unghie.svg`
- Create: `src/assets/icons/svg/service-orecchie.svg`
- Create: `src/assets/icons/svg/service-occhi.svg`
- Modify: `src/assets/icons/icons.ts`
- Create: `src/components/domain/PriceIcon.tsx`
- Modify: `src/lib/uiStyle.ts`
- Modify: `src/lib/uiStyle.test.ts`
- Modify: `src/theme/tokens.css`
- Modify: `src/components/ui/IconTile.tsx`
- Test: `src/assets/icons/icons.test.ts` (nuovo), `src/lib/uiStyle.test.ts`, `src/components/layout/shell.test.tsx` (deve restare verde: `SERVICE_ICONS` non cambia)

**Interfaces:**
- Consumes: import SVG esistenti `bagno`, `taglio`, `bagnoTaglio`, `nodi`, `dermatologico`, `antiparassitario`, `shampoo`, `tosatrice`
- Produces:
  - `PRICE_ICONS` con chiavi: quelle di `SERVICE_ICONS` più `bagno_sistemazione`, `pelo_corto`, `pelo_lungo`, `unghie`, `orecchie`, `occhi`, `shampoo`, `tosatrice`
  - `export type PriceIconKey = keyof typeof PRICE_ICONS`
  - `priceTone(key: PriceIconKey): { ink: string; bg: string }`
  - `PriceIcon({ iconKey, size }: { iconKey: PriceIconKey; size: number })`

- [ ] **Step 1: Write the failing test**

`src/assets/icons/icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PRICE_ICONS, SERVICE_ICONS } from './icons'
import { SERVICE_ICON_KEYS } from '../../types/models'

const EXTRA = ['bagno_sistemazione', 'pelo_corto', 'pelo_lungo', 'unghie', 'orecchie', 'occhi', 'shampoo', 'tosatrice'] as const

describe('PRICE_ICONS', () => {
  it('tiene le icone servizio e ne aggiunge otto, ognuna con src e label', () => {
    expect(Object.keys(SERVICE_ICONS).sort()).toEqual([...SERVICE_ICON_KEYS].sort())
    for (const key of EXTRA) {
      expect(PRICE_ICONS[key].src).toEqual(expect.any(String))
      expect(PRICE_ICONS[key].label.length).toBeGreaterThan(0)
    }
    expect(PRICE_ICONS.bagno.src).toBe(SERVICE_ICONS.bagno.src)
    expect(PRICE_ICONS.shampoo.label).toBe('Shampoo')
  })
})
```

In `src/lib/uiStyle.test.ts` aggiungi:

```ts
it('dà al pelo un tono proprio e riusa i toni servizio', () => {
  expect(priceTone('pelo_corto')).toEqual({ ink: 'var(--s-pelo)', bg: 'var(--s-pelo-bg)' })
  expect(priceTone('pelo_lungo').ink).toBe('var(--s-pelo)')
  expect(priceTone('bagno_sistemazione').ink).toBe('var(--s-combo)')
  expect(priceTone('unghie').ink).toBe('var(--s-taglio)')
  expect(priceTone('orecchie').bg).toBe('var(--s-bagno-bg)')
  expect(priceTone('occhi').ink).toBe('var(--s-bagno)')
  expect(priceTone('shampoo').ink).toBe('var(--s-combo)')
  expect(priceTone('tosatrice').ink).toBe('var(--s-strip)')
  expect(priceTone('dermatologico').ink).toBe('var(--s-derma)')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/assets/icons/icons.test.ts src/lib/uiStyle.test.ts`

Expected: FAIL (`PRICE_ICONS` / `priceTone` non definiti).

- [ ] **Step 3: Write minimal implementation**

Ogni SVG nuovo: copia il markup dall’oggetto `ICONS` del prototipo (chiavi `bagno_sistemazione`, `pelo_corto`, `pelo_lungo`, `unghie`, `orecchie`, `occhi`) e avvolgilo come gli SVG già in cartella:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="48" height="48">…path del prototipo…</svg>
```

In `icons.ts` importa i sei file e:

```ts
export const PRICE_ICONS = {
  ...SERVICE_ICONS,
  bagno_sistemazione: { src: bagnoSistemazione, label: 'Bagno + sistemazione' },
  pelo_corto: { src: peloCorto, label: 'Pelo corto' },
  pelo_lungo: { src: peloLungo, label: 'Pelo lungo' },
  unghie: { src: unghie, label: 'Taglio unghie' },
  orecchie: { src: orecchie, label: 'Pulizia orecchie' },
  occhi: { src: occhi, label: 'Pulizia occhi' },
  shampoo: { src: shampoo, label: 'Shampoo' },
  tosatrice: { src: tosatrice, label: 'Tosatrice' },
} as const

export type PriceIconKey = keyof typeof PRICE_ICONS
```

`PriceIcon`:

```tsx
import { PRICE_ICONS, type PriceIconKey } from '../../assets/icons/icons'

export function PriceIcon({ iconKey, size }: { iconKey: PriceIconKey; size: number }) {
  const icon = PRICE_ICONS[iconKey]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
```

`priceTone` in `uiStyle.ts` (non modificare `serviceTone`):

```ts
const PRICE_TONE: Record<PriceIconKey, string> = {
  bagno: 'bagno',
  taglio: 'taglio',
  bagno_taglio: 'combo',
  bagno_sistemazione: 'combo',
  pelo_corto: 'pelo',
  pelo_lungo: 'pelo',
  nodi: 'nodi',
  dermatologico: 'derma',
  antiparassitario: 'anti',
  shampoo: 'combo',
  unghie: 'taglio',
  orecchie: 'bagno',
  occhi: 'bagno',
  tosatrice: 'strip',
}

export function priceTone(iconKey: PriceIconKey): { ink: string; bg: string } {
  const key = PRICE_TONE[iconKey]
  return { ink: `var(--s-${key})`, bg: `var(--s-${key}-bg)` }
}
```

In `tokens.css`, dopo `--s-anti` nel blocco chiaro:

```css
--s-pelo: #A3622E; --s-pelo-bg: #F8ECE1;
```

Nel blocco `[data-theme="dark"]`, dopo `--s-anti`:

```css
--s-pelo: #E2A877; --s-pelo-bg: rgba(226,168,119,.14);
```

`IconTile`: il tipo `tone` diventa `TileTone | PriceIconKey`. In `tileTone`, se la stringa è una chiave di `PRICE_ICONS` che non è già un tono servizio gestito da `serviceTone` con lo stesso risultato, chiama `priceTone`. Implementazione: se `iconKey in PRICE_ICONS`, usa `priceTone`; i toni `prim | ok | warn | bad` restano prima di quel controllo. `bagno` è sia `ServiceIconKey` sia `PriceIconKey` e i due toni coincidono (`--s-bagno`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/assets/icons/icons.test.ts src/lib/uiStyle.test.ts src/components/layout/shell.test.tsx`

Expected: PASS. `shell.test` ancora verifica che `SERVICE_ICONS` === `SERVICE_ICON_KEYS`.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/icons/svg/service-bagno-sistemazione.svg src/assets/icons/svg/service-pelo-corto.svg src/assets/icons/svg/service-pelo-lungo.svg src/assets/icons/svg/service-unghie.svg src/assets/icons/svg/service-orecchie.svg src/assets/icons/svg/service-occhi.svg src/assets/icons/icons.ts src/assets/icons/icons.test.ts src/components/domain/PriceIcon.tsx src/lib/uiStyle.ts src/lib/uiStyle.test.ts src/theme/tokens.css src/components/ui/IconTile.tsx
git commit -m "feat: icone sticker del listino per razza"
```

---

### Task 2: Modello, seed, schema, campo impostazioni

**Files:**
- Create: `src/types/priceSheet.ts`
- Create: `src/data/seed/priceSheet.ts`
- Create: `src/data/seed/priceSheet.test.ts`
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/schemas.test.ts`
- Modify: `src/data/local/settings.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Create: `src/lib/priceSheet.ts` (solo `getPriceSheet` e `iconForName` se il task 3 non è ancora partito: mettili qui, il task 3 aggiunge il resto nello stesso file)

**Interfaces:**
- Consumes: `DogSize` da `src/types/models.ts`, `PriceIconKey` dal task 1, `SettingsMain['business']`
- Produces:
  - tipi `PriceKind`, `PriceItem`, `Breed`, `ExtraItem`, `SheetSectionId`, `PriceSheet` come nella spec §2
  - `seedPriceSheet(business: { name: string; phone: string; address: string }): PriceSheet`
  - `priceSheetSchema` (zod)
  - `getPriceSheet(settings: SettingsMain): PriceSheet`
  - `SettingsMain.priceSheet?: PriceSheet`
  - `iconForName(nome: string): PriceIconKey`

- [ ] **Step 1: Write the failing test**

`src/data/seed/priceSheet.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { seedPriceSheet } from './priceSheet'

describe('seedPriceSheet', () => {
  const sheet = seedPriceSheet({ name: '', phone: '', address: '' })

  it('ha 28 righe: 7 piccola, 11 media, 10 grande', () => {
    expect(sheet.razze).toHaveLength(28)
    expect(sheet.razze.filter((breed) => breed.taglia === 'piccola')).toHaveLength(7)
    expect(sheet.razze.filter((breed) => breed.taglia === 'media')).toHaveLength(11)
    expect(sheet.razze.filter((breed) => breed.taglia === 'grande')).toHaveLength(10)
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Yorkshire')
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Maltese / Shih Tzu / Barboncino / Maltipoo')
    expect(sheet.razze.map((breed) => breed.nome)).toContain('Fonnese')
  })

  it('Chihuahua ha 4 voci e la tosatura è su valutazione, senza prezzo', () => {
    const row = sheet.razze.find((breed) => breed.nome === 'Chihuahua / Pinscher')
    expect(row?.voci.map((item) => item.nome)).toEqual(['Pelo corto', 'Pelo lungo', 'Bagno + sistemazione', 'Bagno + tosatura'])
    expect(row?.voci[0]).toMatchObject({ prezzo: 18, iconKey: 'pelo_corto', tipo: 'da' })
    expect(row?.voci[3]).toMatchObject({ tipo: 'valutazione', iconKey: 'bagno_taglio' })
    expect(row?.voci[3]?.prezzo).toBeUndefined()
  })

  it('riempie intestazione e testi del cartaceo quando l’attività è vuota', () => {
    expect(sheet.intestazione).toMatchObject({
      titolo: 'TOELETTATURA',
      sottotitolo: 'LISTINO',
      nome: 'I Pelosetti',
      descrizione: 'Servizio di toelettatura',
      indirizzo: 'corso Vitt. Emanuele 4/c',
      telefono: '349 0989700',
      colore: '#B8285E',
    })
    expect(sheet.noteTaglia.grande).toContain('Tosatura a partire da 55')
    expect(sheet.bagnoTosatura.voci.map((item) => item.prezzo)).toEqual([35, 50, 55])
    expect(sheet.extra.voci[1]?.sotto.map((item) => item.prezzo)).toEqual([3, 4, 5])
    expect(sheet.compresi.voci.map((item) => item.testo)).toEqual(['Taglio unghie', 'Pulizia orecchie', 'Pulizia occhi'])
    expect(sheet.saluto).toBe('Grazie per la fiducia!')
    expect(sheet.sezioni.map((section) => section.id)).toEqual([
      'piccola', 'media', 'grande', 'bagnoTosatura', 'extra', 'info', 'avviso', 'compresi', 'saluto',
    ])
    expect(sheet.sezioni.every((section) => section.visibile)).toBe(true)
    expect(sheet.version).toBe(1)
  })

  it('preferisce nome, indirizzo e telefono dell’attività', () => {
    const named = seedPriceSheet({ name: 'Daisy', phone: '333', address: 'via Roma 1' })
    expect(named.intestazione).toMatchObject({ nome: 'Daisy', telefono: '333', indirizzo: 'via Roma 1' })
  })
})
```

In `src/lib/schemas.test.ts`:

```ts
it('un listino per razza rotto non passa, il seed sì', () => {
  expect(priceSheetSchema.safeParse({ version: 1 }).success).toBe(false)
  expect(priceSheetSchema.safeParse(seedPriceSheet({ name: 'A', phone: '1', address: 'b' })).success).toBe(true)
})
```

In `src/lib/firebaseMap.test.ts`:

```ts
it('priceSheet va e torna e un logo data: non entra nel documento', () => {
  const sheet = seedPriceSheet({ name: 'Daisy', phone: '333', address: 'via Roma' })
  const settings = { ...blankSettings('auto', '2026-10-13T00:00:00.000Z'), priceSheet: { ...sheet, intestazione: { ...sheet.intestazione, logo: 'data:image/png;base64,QQ==' } } }
  const doc = settingsToDoc(settings)
  expect((doc.priceSheet as { intestazione: { logo?: string } }).intestazione.logo).toBeUndefined()
  const back = settingsFromDoc({ ...doc, priceSheet: sheet })
  expect(back.priceSheet?.razze).toHaveLength(28)
  expect(back.priceSheet?.intestazione.nome).toBe('Daisy')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/seed/priceSheet.test.ts src/lib/schemas.test.ts src/lib/firebaseMap.test.ts -t "priceSheet|seedPriceSheet|listino per razza"`

Expected: FAIL (moduli assenti).

- [ ] **Step 3: Write minimal implementation**

`src/types/priceSheet.ts`: copia il modello della spec §2 (`PriceKind`, `PriceItem`, `Breed`, `ExtraItem`, `SheetSectionId`, `PriceSheet`). `prezzo` opzionale. `ExtraItem` ha `sotto: Omit<PriceItem, 'iconKey'>[]`.

`iconForName` (stesso ordine del prototipo, prima regola che coincide vince):

```ts
export function iconForName(nome: string): PriceIconKey {
  const n = nome.toLowerCase()
  if (n.includes('sistemaz')) return 'bagno_sistemazione'
  if (n.includes('bagno') && (n.includes('tosat') || n.includes('taglio'))) return 'bagno_taglio'
  if (n.includes('pelo corto')) return 'pelo_corto'
  if (n.includes('pelo lungo')) return 'pelo_lungo'
  if (n.includes('unghie')) return 'unghie'
  if (n.includes('orecch')) return 'orecchie'
  if (n.includes('occhi')) return 'occhi'
  if (n.includes('antiparass')) return 'antiparassitario'
  if (n.includes('dermat')) return 'dermatologico'
  if (n.includes('shampoo')) return 'shampoo'
  if (n.includes('nodi')) return 'nodi'
  if (n.includes('tosat') || n.includes('taglio')) return 'taglio'
  return 'bagno'
}
```

Seed: una funzione `voce(id, nome, prezzo: number | null, tipo: PriceKind = 'da')` che imposta `iconKey: iconForName(nome)`, `tipo: prezzo == null ? 'valutazione' : tipo`, e `prezzo` solo se non è `null`. Razze e testi: spec §4, nomi identici al prototipo (`DATA.razze`). Id stabili: `york`, `maltese`, `jack`, `chihuahua`, `volpino`, `bassotto-corto`, `bassotto-lungo`, `cocker`, `cavalier`, `beagle`, `bulldog-fr`, `bulldog-in`, `border`, `fonnese`, `amstaff`, `sharpei`, `shiba`, `akita`, `labrador`, `golden`, `pastore`, `husky`, `malamute`, `chow`, `samoiedo`, `maremmano`, `rottweiler`, `corso`. Voci: `${breedId}-bagno`, `${breedId}-bt`, `${breedId}-bs`, `${breedId}-corto`, `${breedId}-lungo`. Shampoo: id `extra-shampoo`, sotto `extra-shampoo-mini` (3), `extra-shampoo-pm` (4), `extra-shampoo-gr` (5), tipo `fisso`, senza `prezzo` sul genitore, `iconKey: 'dermatologico'`. Unghie extra: id `extra-unghie`, tipo `da`, prezzo 5, `sotto: []`. `opzioni: { scriviAPartireDa: true, formato: 'A4', tipoFile: 'pdf' }`. `updatedAt: new Date().toISOString()`.

`getPriceSheet`:

```ts
export function getPriceSheet(settings: SettingsMain): PriceSheet {
  const parsed = priceSheetSchema.safeParse(settings.priceSheet)
  if (!parsed.success) return seedPriceSheet(settings.business)
  return parsed.data
}
```

`priceSheetSchema`: zod che accetta il seed (version literal 1, razze non vuote, `tipo` enum, `prezzo` number non negativo opzionale, `iconKey` enum delle chiavi `PRICE_ICONS`). Un oggetto `{ version: 1 }` fallisce.

`SettingsMain`: aggiungi `priceSheet?: PriceSheet`. `blankSettings` non lo mette. `mergeSettings`: `priceSheet: existing.priceSheet ?? base.priceSheet`.

`settingsFromDoc`: stessa riga `priceSheet: existing.priceSheet ?? base.priceSheet`. `settingsToDoc`: dopo la copia JSON, se `priceSheet.intestazione.logo` è stringa che inizia con `data:`, eliminala.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/seed/priceSheet.test.ts src/lib/schemas.test.ts src/lib/firebaseMap.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/types/priceSheet.ts src/data/seed/priceSheet.ts src/data/seed/priceSheet.test.ts src/lib/schemas.ts src/lib/schemas.test.ts src/data/local/settings.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/lib/priceSheet.ts
git commit -m "feat: modello e seed del listino per razza"
```

---

### Task 3: Logica pura

**Files:**
- Modify: `src/lib/priceSheet.ts`
- Create: `src/lib/priceSheet.test.ts`

**Interfaces:**
- Consumes: tipi e `iconForName` del task 2, `seedPriceSheet`
- Produces (firme esatte):

```ts
export function formatPriceApp(item: { tipo: PriceKind; prezzo?: number }): string
export function formatPricePaper(item: { tipo: PriceKind; prezzo?: number }, scriviAPartireDa: boolean): { lead: string; amount: string } | { text: 'su valutazione' }
export function breedsBySize(sheet: PriceSheet, taglia: DogSize): Breed[]
export type BulkOp = 'p5' | 'p10' | 'e+1' | 'e-1' | 'round'
export function applyBulk(sheet: PriceSheet, scope: DogSize | 'extra', op: BulkOp, draft?: Record<string, number>): Record<string, number>
export function commitDraft(sheet: PriceSheet, draft: Record<string, number>, now?: string): PriceSheet
export function upsertBreed(sheet: PriceSheet, breed: Breed): PriceSheet
export function removeBreed(sheet: PriceSheet, id: string): PriceSheet
export function duplicateBreed(sheet: PriceSheet, id: string, newId: () => string): PriceSheet
export function moveBreed(sheet: PriceSheet, id: string, delta: -1 | 1): PriceSheet
export function moveSection(sheet: PriceSheet, index: number, delta: -1 | 1): PriceSheet
export function toggleSection(sheet: PriceSheet, id: SheetSectionId): PriceSheet
export function paginate(heights: number[], available: number): number
export function fitColumnScale(overflows: (k: number) => boolean): { k: number; ok: boolean }
export function fitTitleScale(overflows: (k: number) => boolean): number
```

- [ ] **Step 1: Write the failing test**

`src/lib/priceSheet.test.ts` copre, con il seed:

- `formatPriceApp({ tipo: 'da', prezzo: 25 })` → `'da 25 €'`
- `formatPriceApp({ tipo: 'fisso', prezzo: 25 })` → `'25 €'`
- `formatPriceApp({ tipo: 'da', prezzo: 27.5 })` → `'da 27,50 €'`
- `formatPriceApp({ tipo: 'valutazione' })` → `'su valutazione'`
- `formatPricePaper({ tipo: 'da', prezzo: 25 }, true)` → `{ lead: 'a partire da ', amount: '25' }`
- `formatPricePaper({ tipo: 'da', prezzo: 25 }, false)` → `{ lead: '', amount: '25' }`
- `formatPricePaper({ tipo: 'fisso', prezzo: 4 }, true)` → `{ lead: '', amount: '4' }`
- `formatPricePaper({ tipo: 'valutazione' }, true)` → `{ text: 'su valutazione' }`
- `breedsBySize` piccola: primo nome `Yorkshire`, lunghezza 7, ordine del seed
- `applyBulk(sheet, 'piccola', 'p10')` ha chiave `york:york-bagno` === `28` (25 × 1,10 → 28). La chiave della voce valutazione di Chihuahua è assente. Il foglio passato resta a 25 (confronto sul clone prima della chiamata).
- `applyBulk(sheet, 'piccola', 'p10', { 'york:york-bagno': 28 })['york:york-bagno']` === `31`
- `applyBulk(sheet, 'piccola', 'e-1')` su un prezzo 0 resta 0 (costruisci una voce a 0)
- `applyBulk(sheet, 'extra', 'e+1')['extra-unghie:extra-unghie']` === `6` e `extra-shampoo:extra-shampoo-mini` === `4`
- `commitDraft` scrive 28 sul bagno Yorkshire e cambia `updatedAt` nel `now` passato
- `upsertBreed` di una razza nuova in coda alla sua taglia; stesso id sostituisce
- `removeBreed` toglie Yorkshire
- `duplicateBreed` con `newId` a contatore (`york-copy`, poi `york-copy-1`, …) aggiunge nome `Yorkshire (copia)` subito dopo Yorkshire; l’id della copia e gli id delle voci sono tutti diversi tra loro e diversi dall’originale
- `moveBreed` verso l’alto non scavalca un’altra taglia: Jack Russell (terza piccola) sale di uno e resta piccola
- `moveSection(sheet, 0, -1)` non cambia l’ordine; `moveSection(sheet, 0, 1)` scambia le prime due
- `toggleSection(sheet, 'extra').sezioni` trova extra `visibile: false` e le altre true
- `iconForName('Bagno + sistemazione pelo')` === `'bagno_sistemazione'` (sistemaz prima di bagno+taglio)
- `iconForName('Bagno + tosatura')` === `'bagno_taglio'`
- `iconForName('Qualcosa')` === `'bagno'`
- `paginate([10, 10, 10], 25)` === `2`; `paginate([10, 10], 25)` === `2`; `paginate([40], 10)` === `1`; `paginate([], 10)` === `0`
- `fitColumnScale(() => false)` → `{ k: 1.12, ok: true }`
- `fitColumnScale((k) => k > 0.74)` → `{ k: 0.74, ok: true }` (da 1,12 si scende di 0,02; 0,74 è il primo valore che non overflowa)
- `fitColumnScale(() => true)` → `{ k: 0.62, ok: false }`
- `fitTitleScale(() => false)` === `1`; `fitTitleScale(() => true)` === `0.5`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/priceSheet.test.ts`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`formatAmount`: `Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')`.

`applyBulk`: per ogni voce nello scope, se `tipo === 'valutazione'` o `prezzo` manca, salta. Prezzo di partenza = `draft[key] ?? prezzo`. `p5` = `Math.round(base * 1.05)`, `p10` = `Math.round(base * 1.10)`, `e+1` = `base + 1`, `e-1` = `Math.max(0, base - 1)`, `round` = `Math.round(base)`. Scrivi la chiave solo se `n !== prezzo` salvato. Parti da una copia di `draft` così le chiavi di un altro scope restano.

`commitDraft`: mappa razze, `bagnoTosatura.voci`, extra e `sotto`, sostituendo `prezzo` dove la chiave c’è. `updatedAt: now ?? new Date().toISOString()`.

`duplicateBreed`: nome `` `${nome} (copia)` ``, id razza `newId()`, ogni voce `newId()`, inserita subito dopo l’originale.

`moveBreed`: scambia con il vicino dello stesso `taglia` nell’array `razze`. Se non c’è vicino in quella direzione, ritorna il foglio.

`paginate`: accumula altezze; restituisci l’indice del primo elemento che non entra. Se il primo da solo supera `available`, restituisci `1`. Array vuoto → `0`.

`fitColumnScale`: `k = 1.12`. `while (overflows(k) && k > 0.62) k = Math.round((k - 0.02) * 100) / 100`. Ritorna `{ k, ok: !overflows(k) }`.

`fitTitleScale`: `k = 1`. `while (overflows(k) && k > 0.5) k = Math.round((k - 0.04) * 100) / 100`. Ritorna `k`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/priceSheet.test.ts src/data/seed/priceSheet.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/priceSheet.ts src/lib/priceSheet.test.ts
git commit -m "feat: prezzi, icone e paginazione del listino per razza"
```

---

### Task 4: Sezione in ListinoPage e rotte

**Files:**
- Modify: `src/pages/ListinoPage.tsx`
- Modify: `src/pages/listino.test.tsx`
- Modify: `src/app/router.tsx`
- Create: `src/pages/PriceSheetPricesPage.tsx` (stub solo se la rotta deve montare: meglio il componente vero nel task 5; in questo task la rotta può puntare a una pagina titolo «Aggiorna prezzi» con `Header backTo="/listino"`. Il task 5 la sostituisce.)
- Create: `src/pages/PriceSheetManagePage.tsx` (titolo «Gestione listino», `backTo="/listino"`)
- Create: `src/pages/PriceSheetExportPage.tsx` (titolo «Stampa e condividi», `backTo="/listino"`)
- Modify: `src/lib/systemBack.ts`
- Modify: `src/app/SystemBack.tsx`
- Modify: `src/lib/systemBack.test.tsx`

**Interfaces:**
- Consumes: `getPriceSheet`, `PriceIcon`, `IconTile`, `priceTone`, `formatPriceApp`, `Header`, `SectionTitle`, `Card`
- Produces: rotte `/listino/prezzi`, `/listino/gestione`, `/listino/stampa` dentro `<Guard>`. Su `/listino`, tra la card file e «Prezzi e tempi standard», la sezione descritta sotto.

- [ ] **Step 1: Write the failing test**

In `listino.test.tsx`:

```tsx
it('mostra il listino per razza tra i file e i prezzi standard', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  seedPrice(account.uid, priceFile('attuale'))
  render(<App memory isDev={false} initialPath="/listino" />)
  expect(await screen.findByRole('button', { name: 'Aggiungi file' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
  const breed = screen.getByRole('heading', { name: 'Listino per razza' })
  const standard = screen.getByRole('heading', { name: 'Prezzi e tempi standard' })
  expect(breed.compareDocumentPosition(standard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByText('Tipo Yorkshire')).toBeInTheDocument()
  expect(screen.getByText('TAGLIA PICCOLA')).toBeInTheDocument()
  expect(screen.getByText('TAGLIA MEDIA')).toBeInTheDocument()
  expect(screen.getByText('TAGLIA GRANDE')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Gestione listino' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Stampa e condividi' })).toBeInTheDocument()
})
```

`SectionTitle` oggi potrebbe non essere un `heading`. Se il test non trova l’heading, fai rendere `SectionTitle` com’è e usa `getByText('Listino per razza')` / `getByText('Prezzi e tempi standard')` con lo stesso confronto `compareDocumentPosition`. Non cambiare `SectionTitle` solo per il ruolo.

In `systemBack.test.tsx`:

```tsx
it('dalle pagine del listino per razza torna al listino, anche senza storia', () => {
  expect(systemBackChoice('/listino/prezzi', false, false)).toBe('listino')
  expect(systemBackChoice('/listino/gestione', false, true)).toBe('listino')
  expect(systemBackChoice('/listino/stampa', false, false)).toBe('listino')
  expect(systemBackChoice('/listino', false, true)).toBe('history')
  expect(systemBackChoice('/listino/prezzi', true, false)).toBe('dismiss')
})
```

Allarga `SystemBackChoice` con `'listino'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/listino.test.tsx src/lib/systemBack.test.tsx -t "listino per razza|pagine del listino"`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`ListinoPage`: `const sheet = getPriceSheet(settings)`. Header `action`: tre `IconButton` che sono `Link` (o `navigate`) verso le tre rotte.

- `aria-label="Gestione listino"`, icona `SlidersVertical`
- `aria-label="Aggiorna prezzi"`, icona `Pencil` (già importata: questa è nell’header, la matita della riga file resta)
- `aria-label="Stampa e condividi"`, icona `Share2`, `style` con `background: 'var(--pri-s)'`, `color: 'var(--pri-ink)'`

Tra `</Card>` dei file e il blocco «Prezzi e tempi standard»:

- riga `SectionTitle` «Listino per razza» + `Link` «Gestisci» → `/listino/gestione`
- tab `Piccola` `Media` `Grande` `Extra` `Info` (`button`, `aria-pressed`). Tap: `document.getElementById('listino-'+id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- card intestazione: cerchio 44 px, bordo `sheet.intestazione.colore`, logo con `useFileSrc(logo, 'full')` se c’è, altrimenti zampa. Nome, descrizione, `indirizzo · telefono`
- per ogni taglia visibile, `Card` id `listino-piccola` ecc., testata con «TAGLIA PICCOLA» e conteggio, razze «Tipo {nome}», righe: `IconTile` `size="sm"` `tone={iconKey}` + `PriceIcon` size 14 + nome + puntini + `formatPriceApp`. «su valutazione» in colore `var(--warn)`. Nota taglia in box `background: var(--warn-s)` se il testo non è vuoto
- id `listino-extra`: bagno+tosatura, extra (sotto-voci rientrate), compresi come chip con `PriceIcon` 20
- id `listino-info`: informazioni, avviso (`background: var(--bad-s)`, titolo `var(--bad)`), saluto in corsivo colore accento
- sezioni con `visibile: false` non si rendono

Tre pagine nuove con `Header` `backTo="/listino"` e titolo. `buildRoutes`: le tre path accanto a `/listino/vedi`, tutte in `<Guard>`.

`systemBackChoice`: dopo il controllo overlay e prima di `isDogScreen`, se il path è uno dei tre, ritorna `'listino'`. `SystemBack`: `if (choice === 'listino') navigate('/listino')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/listino.test.tsx src/lib/systemBack.test.tsx`

Expected: PASS, compresi i test già presenti della card file.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/ListinoPage.tsx src/pages/listino.test.tsx src/pages/PriceSheetPricesPage.tsx src/pages/PriceSheetManagePage.tsx src/pages/PriceSheetExportPage.tsx src/app/router.tsx src/lib/systemBack.ts src/app/SystemBack.tsx src/lib/systemBack.test.tsx
git commit -m "feat: sezione listino per razza nella pagina listino"
```

---

### Task 5: Aggiorna prezzi

**Files:**
- Modify: `src/pages/PriceSheetPricesPage.tsx`
- Create: `src/pages/priceSheetPrices.test.tsx`

**Interfaces:**
- Consumes: `getPriceSheet`, `applyBulk`, `commitDraft`, `formatPriceApp` non serve in riga (il campo è numerico), `useSettings().save`
- Produces: salvataggio di `settings.priceSheet` con i prezzi della bozza

- [ ] **Step 1: Write the failing test**

```tsx
it('+10% sulla piccola porta il bagno Yorkshire da 25 a 28, la valutazione resta, Salva azzera il contatore', async () => {
  const user = userEvent.setup()
  const account = await createAccount('maria@salone.it', 'segretissimo')
  render(<App memory isDev={false} initialPath="/listino/prezzi" />)
  expect(await screen.findByRole('heading', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '+10%' }))
  expect(screen.getByRole('textbox', { name: 'Prezzo Bagno Yorkshire' })).toHaveValue('28')
  expect(screen.getByText('su valutazione')).toBeInTheDocument()
  expect(screen.getByText('14 prezzi modificati')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(await screen.findByText('0 prezzi modificati')).toBeInTheDocument()
  const stored = getSettings(account.uid)
  const york = stored.priceSheet?.razze.find((breed) => breed.nome === 'Yorkshire')
  expect(york?.voci.find((item) => item.nome === 'Bagno')?.prezzo).toBe(28)
  const chihuahua = stored.priceSheet?.razze.find((breed) => breed.nome === 'Chihuahua / Pinscher')
  expect(chihuahua?.voci.find((item) => item.nome === 'Bagno + tosatura')?.tipo).toBe('valutazione')
})
```

Il campo Bagno di Yorkshire ha `aria-label="Prezzo Bagno Yorkshire"`. Gli altri campi: `Prezzo {nome voce} {nome razza}`. Le voci extra: `Prezzo {nome voce}`.

Secondo caso nello stesso file: uscire con bozza sporca apre un `Dialog` il cui nome accessibile contiene «Uscire senza salvare?». Annulla resta sulla pagina.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/priceSheetPrices.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Pagina come il prototipo `scrPrezzi`:

- chip Piccola / Media / Grande / Extra (`aria-pressed`)
- bottoni `+5%` `+10%` `+1 €` `−1 €` `Arrotonda` chiamano `setDraft(applyBulk(sheet, scope, op, draft))`
- righe per le razze della taglia, o per extra: blocco «Bagno + tosatura (indicativo)» con ownerId `bagnoTosatura`, poi ogni extra
- input `inputMode="decimal"`, altezza 30. Valore = bozza o prezzo. Se la chiave è in bozza: bordo `1.5px solid var(--pri)`, sfondo `var(--pri-s)`, prezzo vecchio barrato
- `valutazione`: pillola «su valutazione», niente input
- footer: «N prezzi modificati» / «1 prezzo modificato», bottone Salva disabilitato se la bozza è vuota
- Salva: `save({ ...settings, priceSheet: commitDraft(sheet, draft) })`, poi `setDraft({})`, toast «Prezzi salvati»
- `beforeunload` non serve. Intercetta il `Link` Indietro e il tasto Annulla: se `Object.keys(draft).length > 0`, `Dialog` titolo «Uscire senza salvare?». Conferma naviga a `/listino` senza salvare. «Annulla tutto» svuota la bozza e resta.

All’apertura, se `settings.priceSheet` manca, Salva persiste il seed già modificato (`commitDraft(getPriceSheet(settings), draft)`), così il round-trip ha i 28 e il 28 euro.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/priceSheetPrices.test.tsx src/pages/listino.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/PriceSheetPricesPage.tsx src/pages/priceSheetPrices.test.tsx
git commit -m "feat: aggiorna i prezzi del listino per razza"
```

---

### Task 6: Gestione, scheda razza, logo

**Files:**
- Modify: `src/pages/PriceSheetManagePage.tsx`
- Create: `src/pages/priceSheetManage.test.tsx`
- Modify: `src/lib/dogPhoto.ts`
- Modify: `src/lib/dogPhoto.test.ts` (o il test foto già presente: aggiungi un describe `prepareLogo`)
- Modify: `src/lib/uploadPatch.ts`
- Modify: `src/lib/uploadPatch.test.ts`
- Modify: `src/data/firebase/client.ts`
- Modify: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: `upsertBreed`, `removeBreed`, `duplicateBreed`, `moveBreed`, `moveSection`, `toggleSection`, `iconForName`, `prepareLogo`, `storeFile` interno a `client.ts`
- Produces:
  - `prepareLogo(file: Blob): Promise<string>` — lato max 600, PNG se c’è un pixel con alpha &lt; 255, altrimenti JPEG qualità 0,85. Se i byte superano 450 × 1024, lancia. Il chiamante mostra il toast della frase vincolo.
  - `settingsMediaPatch` imposta `priceSheet.intestazione.logo` quando `uploaded` contiene `{ id: 'priceSheet-logo', dataUrl: 'file:…' }` e il documento ha un logo
  - `saveSettings(..., true)` con logo `data:` scrive `file:` e un doc files `owner: 'listino'`, `kind: 'foto'`

- [ ] **Step 1: Write the failing test**

UI (`priceSheetManage.test.tsx`):

- da `/listino/gestione`, «Razza» apre la scheda. Nome «Barboncino toy», taglia Media, Salva. Poi il testo «Barboncino toy» sta nel gruppo della taglia media.
- bottone «Nascondi Servizi extra» (occhio, `aria-label` «Nascondi Servizi extra») e, riaprendo `/listino`, il titolo «SERVIZI EXTRA» non c’è. Il flag `sezioni` di id `extra` è `visibile: false` in `getSettings`.
- nome razza vuoto e Salva → toast «Scrivi il nome della razza» e la razza non si aggiunge.

`prepareLogo`: un PNG 2×2 tutto opaco ritorna `data:image/jpeg` (o PNG se non sai forzare il jpeg senza alpha: se il canvas non ha alpha, JPEG). Un PNG con un pixel alpha 0 ritorna `data:image/png`. Un’immagine che dopo la scala resta sopra 450 KB lancia (mockare `toDataURL` non è necessario se il limite si controlla sui byte del data URL: testa la funzione pura che rifiuta una stringa lunga, se estrai `assertLogoSize(bytes: number): void`).

`uploadPatch.test.ts`, accanto al test del pdf:

```ts
it('scrive il logo del listino per razza quando l’upload ha id priceSheet-logo', () => {
  const patch = settingsMediaPatch({
    priceSheet: { intestazione: { logo: 'data:image/png;base64,QQ==' } },
  }, [{ id: 'priceSheet-logo', dataUrl: 'file:logo1' }])
  expect(patch['priceSheet.intestazione.logo']).toBe('file:logo1')
})
```

`client.test.ts`, stesso schema del test «un file del listino si salva in files»:

```ts
it('il logo del listino per razza si salva in files come foto', async () => {
  const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
  const sheet = seedPriceSheet(settings.business)
  await client.saveSettings('fb-1', {
    ...settings,
    priceSheet: { ...sheet, intestazione: { ...sheet.intestazione, logo: 'data:image/png;base64,QQ==' } },
  }, true)
  const stored = fs.store.get('salon/shared/settings')?.get('main') as { priceSheet: { intestazione: { logo: string } } }
  expect(stored.priceSheet.intestazione.logo).toMatch(/^file:/)
  expect(fs.store.get('salon/shared/files')?.get(stored.priceSheet.intestazione.logo.slice(5))).toMatchObject({ owner: 'listino', kind: 'foto' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/priceSheetManage.test.tsx src/lib/uploadPatch.test.ts src/data/firebase/client.test.ts -t "logo del listino|Barboncino toy|priceSheet-logo"`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Gestione, dal prototipo `scrGestione` + `sheetRazza`, con i componenti dell’app (`Sheet`, `Segmented`, `Dialog`, `Input`):

- Intestazione: anteprima tonda 64 px, «Carica logo» / «Cambia logo», «Rimuovi logo». `input type="file" accept="image/*"` con `guardCaptureClick` come in `ListinoPage`. `prepareLogo`; se lancia, toast della frase vincolo. Il valore salvato in locale è il `data:` (l’upload `file:` lo fa Firebase).
- Campi nome, descrizione, indirizzo, telefono, 5 colori `#B8285E` `#3A5BA0` `#15905B` `#B4561E` `#1D1A1B`.
- Razze per taglia. Tap apre `Sheet` «Modifica razza» / «Nuova razza». Frecce ↑↓ con `moveBreed` (disabilitate in cima/fondo della taglia). `aria-label` «Sposta su {nome}» / «Sposta giù {nome}».
- Scheda: nome senza «Tipo», `Segmented` taglia, righe servizio (icona apre griglia delle chiavi in `PICK` del prototipo, nome, select `da` / `fisso` / `valutazione`, prezzo nascosto se valutazione, ×). Cambiando il nome, `iconKey` torna `iconForName` finché l’utente non sceglie un’icona a mano su quella riga (un flag `iconaScelta` locale alla riga in editing, non persistito: al salvataggio resta l’`iconKey` corrente).
- Chip: Bagno, Bagno + tosatura, Bagno + sistemazione, Pelo corto, Pelo lungo, Tosatura, + Personalizzato.
- Footer: Elimina (`Dialog` di conferma), Duplica, Salva. Nome vuoto → toast «Scrivi il nome della razza».
- Nota taglia: `textarea`.
- Sezioni: ↑ ↓ e occhio. `aria-label` «Nascondi {nome}» / «Mostra {nome}» dove `{nome}` è l’etichetta italiana della sezione (`Servizi extra`, ecc.).
- Testi: informazioni (intro, punti uno per riga, chiusura), avviso titolo e punti, saluto. Salva il foglio a ogni modifica strutturale (razza, sezione, nota, testo, logo, colore, intestazione) con `save({ ...settings, priceSheet })`.

`prepareLogo`: `openBitmap`, `fitInside(..., 600)`, canvas. Leggi `getImageData`: se un alpha &lt; 255, `toDataURL('image/png')`, altrimenti `toDataURL('image/jpeg', 0.85)`. Byte come in `dataUrlBytes` di `dogPhoto.ts`. Sopra `450 * 1024` → `throw new Error('logo')`.

`client.ts`: `settingsHaveBinary` vero anche se `priceSheet.intestazione.logo` inizia con `data:`. In `withUploadedPrices`, se il logo è `data:`, `storeFile('listino', 'foto', logo, 'logo')` e sostituisci il campo. Poi `putSettings(settingsToDoc(...))` come già per i file.

`settingsMediaPatch`: se c’è l’URL `priceSheet-logo` ed è remoto, `patch['priceSheet.intestazione.logo'] = url`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/priceSheetManage.test.tsx src/lib/uploadPatch.test.ts src/data/firebase/client.test.ts src/lib/dogPhoto.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/PriceSheetManagePage.tsx src/pages/priceSheetManage.test.tsx src/lib/dogPhoto.ts src/lib/dogPhoto.test.ts src/lib/uploadPatch.ts src/lib/uploadPatch.test.ts src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "feat: gestione razze e logo del listino"
```

---

### Task 7: Foglio di stampa, font, auto-fit

**Files:**
- Create: `src/components/priceSheet/priceSheetPaper.css`
- Create: `src/components/priceSheet/PriceSheetPaper.tsx`
- Create: `src/components/priceSheet/priceSheetPaper.test.tsx`
- Modify: `package.json` / lockfile tramite npm

**Interfaces:**
- Consumes: `fitColumnScale`, `fitTitleScale`, `paginate`, `formatPricePaper`, `PriceSheet`
- Produces: `PriceSheetPaper({ sheet, logoSrc, format }: { sheet: PriceSheet; logoSrc?: string; format: 'A4' | 'A3' })` che rende una o due `.fly` e imposta `data-pages="1"|"2"` e `data-fit-ok`

- [ ] **Step 1: Write the failing test**

Il test di scala è già nel task 3. Qui:

```tsx
it('con il seed rende il foglio chiaro e il nome della razza con Tipo', () => {
  const sheet = seedPriceSheet({ name: '', phone: '', address: '' })
  const { container } = render(<PriceSheetPaper sheet={sheet} format="A4" />)
  const fly = container.querySelector('.fly')
  expect(fly).not.toBeNull()
  expect(container.textContent).toContain('Tipo Yorkshire')
  expect(container.textContent).toContain('TAGLIA PICCOLA')
  expect(container.textContent).toContain('Grazie per la fiducia!')
  expect(container.textContent).toContain('su valutazione')
})
```

Secondo test: sezione `extra` `visibile: false` → il container non contiene «SERVIZI EXTRA».

Terzo: `format="A3"` mette sulla radice una larghezza doppia rispetto all’A4 in rapporto 1123/794 (leggi lo style `--s` o la width calcolata: A4 width 794, A3 width 1123).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/priceSheet/priceSheetPaper.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```powershell
npm install @fontsource/oswald @fontsource/quicksand @fontsource/dancing-script
```

Importa nel componente i pesi 500, 600, 700 di Oswald e Quicksand e il 700 di Dancing Script. Nessun `<link>` Google Fonts.

`priceSheetPaper.css`: copia il blocco `.fly` … `.f-cont` del prototipo (dalla regola `.fly{` fino a `.f-cont{…}` inclusa). Non copiare gli stili `.proto` / `.phone`.

`PriceSheetPaper` traduce `paperHTML` del prototipo in JSX:

- `--s` = `format === 'A3' ? 1123 / 794 : 1`
- `--acc` = `sheet.intestazione.colore`
- intestazione, 3 colonne solo se la sezione taglia è visibile, riquadri nell’ordine di `sezioni` solo se visibili, saluto se visibile
- righe razza senza icone sticker: zampa + «Tipo {nome}» + voci. Prezzo: `formatPricePaper`. Se il risultato è `{ text: 'su valutazione' }`, quel testo. Altrimenti `{lead}<b>{amount}</b> €`
- `useLayoutEffect`: chiama `fitColumnScale` passando una funzione che legge `scrollHeight > clientHeight + 1` sui `.f-col .b` dopo aver scritto `--k`. Poi `fitTitleScale` sui `.t1`/`.t2` (`scrollWidth > clientWidth + 1`). Se `ok` è false, misura le altezze dei `.f-br`, `paginate(heights, clientHeight)`, e rendi due fogli: pagina 1 intestazione piena + razze fino allo split; pagina 2 intestazione ridotta (solo nome + «LISTINO · segue») + razze restanti + riquadri + saluto. `data-pages` di conseguenza.
- Colori del foglio fissi (il CSS è su `.fly`, non sui token del tema scuro).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/priceSheet/priceSheetPaper.test.tsx src/lib/priceSheet.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/components/priceSheet/priceSheetPaper.css src/components/priceSheet/PriceSheetPaper.tsx src/components/priceSheet/priceSheetPaper.test.tsx
git commit -m "feat: foglio di stampa del listino per razza"
```

---

### Task 8: Export PDF/JPEG, condividi, scarica, stampa

**Files:**
- Modify: `package.json` tramite npm (`html-to-image`, `jspdf`, `@capacitor/share`)
- Create: `src/lib/priceSheetExport.ts`
- Create: `src/lib/priceSheetExport.test.ts`
- Modify: `src/pages/PriceSheetExportPage.tsx`
- Create: `src/pages/priceSheetExport.test.tsx`

**Interfaces:**
- Consumes: `PriceSheetPaper`, `openPdfBlob` da `src/lib/openDocument.ts`, `Filesystem`, `Share`
- Produces:

```ts
export function sheetFileName(nome: string, format: 'A4' | 'A3', tipo: 'pdf' | 'jpeg', page?: number): string
export async function buildSheetFile(input: {
  title: string
  nome: string
  format: 'A4' | 'A3'
  tipoFile: 'pdf' | 'jpeg'
  pages: string[]
}): Promise<{ blob: Blob; name: string; mime: string }[]>
```

`pages` sono data URL JPEG, una per pagina. `buildSheetFile` non chiama `html-to-image` (così il test non renderizza). La funzione che fotografa, `renderSheetJpegs(container: HTMLElement, format: 'A4' | 'A3'): Promise<string[]>`, sta nello stesso file e il test la mocka dalla pagina.

- [ ] **Step 1: Write the failing test**

`priceSheetExport.test.ts`:

- `sheetFileName('I Pelosetti', 'A4', 'pdf')` → `Listino_I_Pelosetti_A4.pdf`
- `sheetFileName('I Pelosetti', 'A3', 'jpeg', 1)` → `Listino_I_Pelosetti_A3_p1.jpg` e page 2 → `_p2.jpg`. Una pagina jpeg senza index → `Listino_I_Pelosetti_A4.jpg`
- `buildSheetFile` con `tipoFile: 'pdf'`, `format: 'A4'`, una pagina: un solo blob `application/pdf`, nome `.pdf`. Mock di `jspdf`: istanza con `addImage`, `setProperties`, `output: () => new Blob(['%PDF'])`. `addImage` chiamato con `'JPEG'`, `0, 0, 210, 297`.
- due pagine jpeg: due file `_p1.jpg` e `_p2.jpg`, mime `image/jpeg`
- A3 pdf: `addImage` con `297, 420`

`priceSheetExport.test.tsx` della pagina:

- `/listino/stampa` mostra «A4», «A3», «PDF», «JPEG (immagine)», Stampa, Scarica, Condividi, switch «Scrivi "a partire da" sui prezzi»
- click Condividi chiama `Share.share` con `title: 'Listino prezzi'` e un file (mock `@capacitor/share` e `@capacitor/filesystem` e `renderSheetJpegs`)
- se `Filesystem.writeFile` per Documents rifiuta, Scarica chiama `Share.share` e il toast è «Scegli dove salvarlo»
- se Documents riesce, toast «Salvato in Documenti/Groomly»
- Stampa chiama `openPdfBlob` (mock di `openDocument`)
- durante la generazione i tre bottoni sono disabilitati

Mock `html-to-image` nel test di `renderSheetJpegs` solo se lo testi: `toJpeg` risolto a `data:image/jpeg;base64,QQ==`, `pixelRatio` tale che la larghezza finale sia 2480 su A4 (asserisci l’argomento `pixelRatio` ≈ `2480 / offsetWidth`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/priceSheetExport.test.ts src/pages/priceSheetExport.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```powershell
npm install html-to-image jspdf @capacitor/share
```

`renderSheetJpegs`: portal `position:fixed; left:-10000px`, monta `PriceSheetPaper`, `await document.fonts.ready`, per ogni `.fly` `htmlToImage.toJpeg(node, { quality: 0.92, backgroundColor: '#fff', pixelRatio: (format === 'A3' ? 3508 : 2480) / node.offsetWidth })`.

`buildSheetFile`: se jpeg e una pagina, un file senza `_pN`. Se jpeg e due, `_p1` `_p2`. Se pdf, `new jsPDF({ unit: 'mm', format: format.toLowerCase(), compress: true })`, `addImage(jpg, 'JPEG', 0, 0, format === 'A4' ? 210 : 297, format === 'A4' ? 297 : 420)` e `addPage` prima della seconda. `setProperties({ title: 'Listino ' + nome })`.

Pagina:

- anteprima larga 236 px (scala `236/794` o `236/1123`)
- «Apri a schermo intero» riusa `pinchScale` / `clampPan` di `PriceViewPage` sul foglio
- `Segmented` formato A4/A3 e tipo PDF/JPEG
- switch scrivi «a partire da»; il valore vive in `sheet.opzioni` e si salva con il foglio
- sotto l’anteprima: se `data-fit-ok="true"`, «Tutto in 1 pagina {formato} · testo al {k}%»; se false, «Il listino non entra in 1 pagina: verrà diviso su 2 pagine»
- Condividi: `Filesystem.writeFile` in `Directory.Cache`, poi `Share.share({ files: [uri], title: 'Listino prezzi' })`
- Scarica: `Directory.Documents` sottocartella `Groomly/`. Toast «Salvato in Documenti/Groomly». Catch → Condividi + toast «Scegli dove salvarlo». Su web (`!Capacitor.isNativePlatform()`): `<a download>`
- Stampa: genera sempre il PDF del formato scelto e `openPdfBlob(blob, name)`. Su web `window.open(blobUrl)`
- toast di attesa «Preparo il PDF A4…» / «Preparo il PDF A3…» / «Preparo l'immagine A4…» / «Preparo l'immagine A3…». Errore: «Esportazione non riuscita»
- bottoni disabilitati mentre la promessa è in corso

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/priceSheetExport.test.ts src/pages/priceSheetExport.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/lib/priceSheetExport.ts src/lib/priceSheetExport.test.ts src/pages/PriceSheetExportPage.tsx src/pages/priceSheetExport.test.tsx
git commit -m "feat: esporta il listino per razza in PDF e JPEG"
```

---

### Task 9: Verifica finale

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json` solo se la verifica è verde e si pubblica (regola `publish-update`, patch +1)

**Interfaces:**
- Consumes: tutto quanto sopra
- Produces: suite verde, build verde, APK solo nel passo di pubblicazione

- [ ] **Step 1: Run the whole suite and the build**

```powershell
npm test
npm run build
npx cap sync android
```

Expected: test e build verdi. `cap sync` copia il web asset e registra `@capacitor/share`.

- [ ] **Step 2: Fix anything that failed**

Se un test vecchio si rompe perché `blankSettings` o `settingsFromDoc` ora hanno una chiave in più, il campo è opzionale e assente: non deve comparire. Aggiusta il codice, non il comportamento della card file.

- [ ] **Step 3: Device check (non automatizzato)**

Sul telefono, con i dati del seed: condividi PDF A4, scarica JPEG A3, stampa. Confronta a occhio con `docs/listino-razze/listino-originale.jpeg` (una pagina A4). Segna nel messaggio di chiusura cosa non hai potuto aprire sul telefono.

- [ ] **Step 4: Publish**

Solo se i passi 1–2 sono verdi e il lavoro è consegnabile. Segui `publish-update`: patch, APK fuori da `hosting/` e fuori dal commit, `gh release create`, `npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b`. Note di release: listino per razza modificabile, con stampa e condivisione PDF/JPEG in A4 e A3.

---

## Self-review (copertura spec)

| Spec | Task |
|---|---|
| §3 icone, tono pelo, `iconForName` | 1, 3 |
| §2 modello, §4 seed, schema, merge, logo `file:` | 2, 6 |
| §5 logica | 3 |
| §1 `/listino` + tre rotte, D1 | 4 |
| §9 aggiorna prezzi, dialogo senza salvare | 5 |
| §8 logo, §9 gestione e scheda | 6 |
| §6 foglio, font, auto-fit, 2 pagine | 7 |
| §7 export | 8 |
| §10 fuori scope (niente scheda cane, niente gatti, niente QR) | non c’è un task |
| §12 accettazione | 4, 5, 6, 8, 9 |
