# Groomly UI rinnovata — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Applicare lo stile del mockup all’app già esistente, senza cambiare route, documenti e testi, salvo le tre scritte nuove della specifica.

**Architecture:** I colori entrano in `tokens.css` con i nomi già usati. Le misure nuove entrano in `sizes.ts`. Le funzioni pure (`nextVisitPill`, `priceChange`, `eventLayout`, `serviceTone`, `permuteOrders`) si testano prima delle pagine. I componenti esistenti si estendono; quelli con un ruolo nuovo stanno in `src/components/ui` e `src/components/domain`. Le pagine li montano al posto degli stili scritti a mano.

**Tech Stack:** React 18, TypeScript, Vite, React Router 6.30, Vitest, Testing Library, happy-dom, lucide-react. Nessuna libreria di drag.

Specifica approvata: `docs/superpowers/specs/2026-10-10-groomly-ui-rinnovata-design.md`. Mockup: `ui-screenshots/Groomly UI rinnovata.html`. Un solo piano: i task sono in ordine e ognuno lascia `npm test` verde per i file che tocca.

Lavorare in `D:\Groomly`. Non aprire un worktree. Non cambiare `git config`. Non fare push. Non usare `--no-verify`. Non alzare la versione e non pubblicare l’APK.

## Global Constraints

- `TYPE` non si tocca. `sizes.ts` non ingrandisce i numeri già presenti (ora calendario 50, avatar, bottoni 26 e 34, foglio raggio 18, maniglia 34×4, ricerca 32, riga 44, card raggio 12).
- Tema `light` | `dark` | `auto` su `document.documentElement.dataset.theme`. Nomi token esistenti. Niente `--g-*`. `--sen` e `--tea` restano.
- Icone illustrate solo da `src/assets/icons/icons.ts`. Icone di interfaccia solo `lucide-react`.
- Testi invariati, tranne «tra N min», «ora», «+1» e «▲»/«▼» più `formatEuro`.
- «Oggi» continua a mostrare solo `programmato` e `completato`, ordinati per `start` poi `id`.
- Il prossimo in Home resta `currentOrNext`.
- `reorderKind` permuta gli `order` già presenti nel `kind` e scrive una volta. L’altro gruppo non cambia.
- Sotto i 60 minuti la card calendario è compatta; da 60 è intera. «+1» è la stringa fissa.
- Tag, strumenti e prodotti passano da `Dialog` a `Sheet`. Attività e Campi scheda restano `Dialog`.
- PowerShell: non usare `&&`. Il commit è una here-string. Non usare `git add -A`: elencare i file.
- `npm run build` esegue `tsc --noEmit`. Non importare simboli inutilizzati.
- I test di `App` tengono `// @vitest-environment happy-dom` come prima riga.

## File map

- Modify `src/theme/tokens.css`: valori del §2 della specifica.
- Modify `src/theme/sizes.ts`: misure del §3.
- Modify `src/theme/theme.test.ts`: i valori dei token, letti dal file.
- Create `src/lib/uiStyle.ts`: `serviceTone`, `nextVisitPill`, `priceChange`, `eventLayout`.
- Create `src/lib/uiStyle.test.ts`.
- Create `src/lib/serviceOrder.ts`: `permuteOrders`.
- Create `src/lib/serviceOrder.test.ts`.
- Modify `src/data/local/services.ts`: `reorderKind`.
- Modify `src/hooks/useServices.ts`: `reorderKind` accanto a `move`.
- Modify `src/components/ui/Button.tsx`, `Input.tsx`, `Toggle.tsx`, `Chip.tsx`, `Card.tsx`, `SectionTitle.tsx`, `Segmented.tsx`.
- Create `src/components/ui/ServiceChip.tsx`, `StatusPill.tsx`, `FilterChip.tsx`, `ChipRow.tsx`, `IconTile.tsx`, `KeyValueGrid.tsx`, `TimeBox.tsx`.
- Create `src/components/domain/TemperamentSticker.tsx`.
- Modify `src/components/layout/Sheet.tsx`: prop `footer`, velo `--scrim`.
- Modify `src/components/ui/ui.test.tsx` e `src/components/layout/chrome.test.tsx`.
- Modify le pagine del §6 della specifica e i test che affermano «Su», «Giù», «Mostra fissati», ellipsis o input alto 44.

---

### Task 1: Token chiaro e scuro

**Files:**
- Modify: `src/theme/tokens.css`
- Modify: `src/theme/theme.test.ts`
- Test: `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces: le custom property del §2. `--shadow` uguale a `--sh-2`. `--surf2` uguale a `--surf`.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/theme/theme.test.ts` aggiungere:

```ts
import { readFileSync } from 'node:fs'

it('i token chiari e scuri sono quelli del mockup', () => {
  const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
  expect(css).toContain('--bg: #ECEFF4;')
  expect(css).toContain('--surf3: #FFFFFF;')
  expect(css).toContain('--pri-solid: #3A5BA0;')
  expect(css).toContain('--pri-ink: #2C4785;')
  expect(css).toContain('--sh-btn: 0 6px 14px -6px rgba(58,91,160,.55), inset 0 1px 0 rgba(255,255,255,.14);')
  expect(css).toContain('--s-bagno: #2775C9;')
  expect(css).toContain('--s-bagno-bg: #E2EFFB;')
  expect(css).toContain('--scrim: rgba(18,26,42,.42);')
  expect(css).toContain('--sh-foot: 0 -8px 20px -14px rgba(20,30,50,.25);')
  const dark = css.slice(css.indexOf('[data-theme="dark"]'))
  expect(dark).toContain('--bg: #0C111A;')
  expect(dark).toContain('--pri: #8AA4E8;')
  expect(dark).toContain('--pri-solid: #4F6FC0;')
  expect(dark).toContain('--surf3: #232C3C;')
  expect(dark).toContain('--s-combo: #B7A2F5;')
  expect(dark).toContain('--sen: #a891f1;')
})
```

- [ ] **Step 2: Eseguire il test e vederlo fallire**

Run: `npx vitest run src/theme/theme.test.ts`
Expected: FAIL perché i valori nuovi non ci sono.

- [ ] **Step 3: Sostituire i valori in `tokens.css`**

`:root` chiaro:

```css
:root {
  --bg: #ECEFF4;
  --card: #FFFFFF;
  --surf: #F5F7FA;
  --surf2: #F5F7FA;
  --surf3: #FFFFFF;
  --line: #E1E6EE;
  --line2: #D3DAE5;
  --tx: #141B2B;
  --tx2: #525D71;
  --tx3: #8A94A6;
  --pri: #3A5BA0;
  --pri-solid: #3A5BA0;
  --on-pri: #FFFFFF;
  --pri-s: #E6ECF8;
  --pri-ink: #2C4785;
  --focus: rgba(58,91,160,.18);
  --ok: #15905B;
  --ok-s: #E2F4EA;
  --warn: #A86C0E;
  --warn-s: #FCF0D8;
  --bad: #C93D33;
  --bad-s: #FBE6E4;
  --sen: #7254c0;
  --sen-s: #eee8fb;
  --tea: #0f8a8a;
  --tea-s: #dff3f2;
  --sh-1: 0 1px 2px rgba(22,34,64,.06), 0 1px 1px rgba(22,34,64,.03);
  --sh-2: 0 1px 2px rgba(22,34,64,.05), 0 6px 16px -6px rgba(22,34,64,.12);
  --sh-3: 0 2px 6px rgba(22,34,64,.06), 0 18px 40px -12px rgba(22,34,64,.28);
  --sh-btn: 0 6px 14px -6px rgba(58,91,160,.55), inset 0 1px 0 rgba(255,255,255,.14);
  --sh-foot: 0 -8px 20px -14px rgba(20,30,50,.25);
  --sh-stk: 0 2px 4px rgba(0,0,0,.18);
  --shadow: var(--sh-2);
  --scrim: rgba(18,26,42,.42);
  --s-bagno: #2775C9; --s-bagno-bg: #E2EFFB;
  --s-taglio: #D4553A; --s-taglio-bg: #FCEAE4;
  --s-combo: #7051CF; --s-combo-bg: #EEE9FC;
  --s-strip: #566479; --s-strip-bg: #ECEFF3;
  --s-nodi: #B97C0C; --s-nodi-bg: #FBF0D8;
  --s-derma: #16936A; --s-derma-bg: #E0F3EB;
  --s-anti: #0B8585; --s-anti-bg: #DCF2F1;
  --s-mens: #0E8C8C; --s-mens-bg: #DDF3F2;
}
```

`[data-theme="dark"]` completo:

```css
[data-theme="dark"] {
  --bg: #0C111A;
  --card: #151C28;
  --surf: #1B2331;
  --surf2: #1B2331;
  --surf3: #232C3C;
  --line: #242E3F;
  --line2: #2F3A4E;
  --tx: #E9EDF4;
  --tx2: #A6B0C2;
  --tx3: #6E798D;
  --pri: #8AA4E8;
  --pri-solid: #4F6FC0;
  --on-pri: #FFFFFF;
  --pri-s: rgba(138,164,232,.15);
  --pri-ink: #B3C6F4;
  --focus: rgba(138,164,232,.25);
  --ok: #4FCB8F;
  --ok-s: rgba(79,203,143,.14);
  --warn: #F0B44C;
  --warn-s: rgba(240,180,76,.14);
  --bad: #F07A70;
  --bad-s: rgba(240,122,112,.14);
  --sen: #a891f1;
  --sen-s: #251e3a;
  --tea: #4dd0cf;
  --tea-s: #12292b;
  --sh-1: 0 0 0 1px rgba(255,255,255,.02), 0 1px 2px rgba(0,0,0,.4);
  --sh-2: inset 0 1px 0 rgba(255,255,255,.04), 0 8px 20px -10px rgba(0,0,0,.7);
  --sh-3: inset 0 1px 0 rgba(255,255,255,.05), 0 24px 48px -12px rgba(0,0,0,.8);
  --sh-btn: 0 6px 16px -6px rgba(79,111,192,.7), inset 0 1px 0 rgba(255,255,255,.12);
  --sh-foot: 0 -8px 20px -14px rgba(20,30,50,.25);
  --sh-stk: 0 2px 4px rgba(0,0,0,.18);
  --shadow: var(--sh-2);
  --scrim: rgba(0,0,0,.55);
  --s-bagno: #7DB6F2; --s-bagno-bg: rgba(125,182,242,.14);
  --s-taglio: #F59A84; --s-taglio-bg: rgba(245,154,132,.14);
  --s-combo: #B7A2F5; --s-combo-bg: rgba(183,162,245,.15);
  --s-strip: #A9B4C6; --s-strip-bg: rgba(169,180,198,.13);
  --s-nodi: #EDC066; --s-nodi-bg: rgba(237,192,102,.14);
  --s-derma: #5FD3A6; --s-derma-bg: rgba(95,211,166,.13);
  --s-anti: #55D0CD; --s-anti-bg: rgba(85,208,205,.13);
  --s-mens: #55D0CD; --s-mens-bg: rgba(85,208,205,.13);
}
```

- [ ] **Step 4: Eseguire il test**

Run: `npx vitest run src/theme/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/theme/tokens.css src/theme/theme.test.ts
git commit -m @"
feat: allinea i token colore al mockup chiaro e scuro.

"@
```

---

### Task 2: Misure nuove

**Files:**
- Modify: `src/theme/sizes.ts`
- Modify: `src/theme/theme.test.ts`
- Test: `src/theme/theme.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces: `SIZES.field`, `SIZES.button.hMd`, `SIZES.button.radiusMd`, `SIZES.serviceChip`, `SIZES.filterChip`, `SIZES.pill`, `SIZES.timeBox`, `SIZES.iconTile`, `SIZES.switch`, `SIZES.kv`, `SIZES.sectionBar`, `SIZES.sheet.footer`. I numeri già presenti restano.

- [ ] **Step 1: Test**

```ts
it('aggiunge le misure del mockup senza ingrandire quelle esistenti', () => {
  expect(SIZES.calendar.hourHeight).toBe(50)
  expect(SIZES.button.h).toBe(26)
  expect(SIZES.button.hLg).toBe(34)
  expect(SIZES.field).toEqual({ h: 32, hLg: 44, label: 11, radius: 9, gap: 4, areaMin: 48 })
  expect(SIZES.button.hMd).toBe(30)
  expect(SIZES.button.radiusMd).toBe(8)
  expect(SIZES.serviceChip).toEqual({ h: 20, radius: 6, padX: 6, gap: 3, rowGap: 5 })
  expect(SIZES.filterChip).toEqual({ h: 26, padX: 10, font: 11.5 })
  expect(SIZES.pill).toEqual({ h: 20, padX: 8, dot: 6 })
  expect(SIZES.timeBox).toEqual({ w: 42, radius: 8, padY: 3, time: 12, duration: 10 })
  expect(SIZES.iconTile).toEqual({ size: 28, radius: 8, sm: 24, smRadius: 7 })
  expect(SIZES.switch).toEqual({ w: 38, h: 22, knob: 16 })
  expect(SIZES.kv).toEqual({ label: 9.5, value: 13, radius: 10, padY: 6, padX: 10 })
  expect(SIZES.sectionBar).toEqual({ w: 3, h: 14, radius: 2, countH: 17 })
  expect(SIZES.sheet.footer).toEqual({ padTop: 8, padX: 12, padBottom: 12, gap: 7 })
  expect(SIZES.chip.radius).toBe(999)
})
```

- [ ] **Step 2: Fallisce**

Run: `npx vitest run src/theme/theme.test.ts`
Expected: FAIL su `SIZES.field`.

- [ ] **Step 3: Aggiungere le chiavi in `sizes.ts`**

Aggiungerle accanto a quelle esistenti, senza cambiare i valori già presenti. `sheet` diventa:

```ts
sheet: { radiusTop: 18, grab: { w: 34, h: 4 }, footer: { padTop: 8, padX: 12, padBottom: 12, gap: 7 } },
```

`button` guadagna `hMd: 30` e `radiusMd: 8` e tiene `h` e `hLg`.

- [ ] **Step 4: Passa**

Run: `npx vitest run src/theme/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/theme/sizes.ts src/theme/theme.test.ts
git commit -m @"
feat: aggiunge in sizes le misure dei pezzi nuovi.

"@
```

---

### Task 3: Funzioni pure di stile

**Files:**
- Create: `src/lib/uiStyle.ts`
- Create: `src/lib/uiStyle.test.ts`
- Test: `src/lib/uiStyle.test.ts`

**Interfaces:**
- Consumes: `formatEuro` da `src/lib/format.ts`.
- Produces:
  - `serviceTone(iconKey?: string): { ink: string; bg: string }`
  - `nextVisitPill(start: Date, now: Date): string`
  - `priceChange(current: number, previous: number | null): string | null`
  - `eventLayout(durationMin: number): 'compact' | 'full'`

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from 'vitest'
import { eventLayout, nextVisitPill, priceChange, serviceTone } from './uiStyle'

describe('uiStyle', () => {
  it('mappa le icone servizio e usa strip se manca', () => {
    expect(serviceTone('bagno')).toEqual({ ink: 'var(--s-bagno)', bg: 'var(--s-bagno-bg)' })
    expect(serviceTone('bagno_taglio').ink).toBe('var(--s-combo)')
    expect(serviceTone(undefined).ink).toBe('var(--s-strip)')
  })

  it('dice tra N minuti, almeno 1, oppure ora', () => {
    const now = new Date(2026, 9, 10, 12, 0, 0)
    expect(nextVisitPill(new Date(2026, 9, 10, 12, 36, 1), now)).toBe('tra 37 min')
    expect(nextVisitPill(new Date(2026, 9, 10, 12, 0, 20), now)).toBe('tra 1 min')
    expect(nextVisitPill(new Date(2026, 9, 10, 11, 30, 0), now)).toBe('ora')
  })

  it('mostra la variazione solo se il totale precedente è diverso', () => {
    expect(priceChange(40, null)).toBeNull()
    expect(priceChange(40, 40)).toBeNull()
    expect(priceChange(45, 40)).toBe('▲ € 5')
    expect(priceChange(38, 40)).toBe('▼ € 2')
  })

  it('compatta sotto i 60 minuti', () => {
    expect(eventLayout(45)).toBe('compact')
    expect(eventLayout(59)).toBe('compact')
    expect(eventLayout(60)).toBe('full')
  })
})
```

- [ ] **Step 2: Fallisce**

Run: `npx vitest run src/lib/uiStyle.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Implementare `src/lib/uiStyle.ts`**

```ts
import { formatEuro } from './format'

const TONE: Record<string, string> = {
  bagno: 'bagno',
  taglio: 'taglio',
  bagno_taglio: 'combo',
  nodi: 'nodi',
  dermatologico: 'derma',
  antiparassitario: 'anti',
}

export function serviceTone(iconKey?: string): { ink: string; bg: string } {
  const key = (iconKey && TONE[iconKey]) || 'strip'
  return { ink: `var(--s-${key})`, bg: `var(--s-${key}-bg)` }
}

export function nextVisitPill(start: Date, now: Date): string {
  const diff = start.getTime() - now.getTime()
  if (diff <= 0) return 'ora'
  return `tra ${Math.max(1, Math.ceil(diff / 60000))} min`
}

export function priceChange(current: number, previous: number | null): string | null {
  if (previous === null || previous === current) return null
  const arrow = current > previous ? '▲' : '▼'
  return `${arrow} ${formatEuro(Math.abs(current - previous))}`
}

export function eventLayout(durationMin: number): 'compact' | 'full' {
  return durationMin < 60 ? 'compact' : 'full'
}
```

- [ ] **Step 4: Passa**

Run: `npx vitest run src/lib/uiStyle.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/uiStyle.ts src/lib/uiStyle.test.ts
git commit -m @"
feat: calcola pill, variazione di prezzo e card del calendario.

"@
```

---

### Task 4: Ordine dei servizi dentro il gruppo

**Files:**
- Create: `src/lib/serviceOrder.ts`
- Create: `src/lib/serviceOrder.test.ts`
- Modify: `src/data/local/services.ts`
- Modify: `src/data/local/services.test.ts` se esiste, altrimenti il test nuovo copre `permuteOrders` e un test in `services.test.ts` copre `reorderKind`
- Modify: `src/hooks/useServices.ts`
- Test: `src/lib/serviceOrder.test.ts`, `src/data/local/services.test.ts`

**Interfaces:**
- Consumes: `moveService` e `writeMap` in `src/data/local/services.ts`.
- Produces:
  - `permuteOrders(ids: string[], orders: number[], from: number, to: number): { id: string; order: number }[]`
  - `reorderKind(uid: string, id: string, toIndex: number): Service[]`
  - `useServices(...).reorderKind(id: string, toIndex: number): boolean`

- [ ] **Step 1: Test di `permuteOrders`**

```ts
import { permuteOrders } from './serviceOrder'

it('sposta un id e riusa gli order già presenti', () => {
  expect(permuteOrders(['a', 'b', 'c'], [0, 2, 5], 0, 2)).toEqual([
    { id: 'b', order: 0 },
    { id: 'c', order: 2 },
    { id: 'a', order: 5 },
  ])
})

it('non cambia nulla se l’indice è lo stesso o fuori', () => {
  const same = [{ id: 'a', order: 0 }, { id: 'b', order: 2 }]
  expect(permuteOrders(['a', 'b'], [0, 2], 1, 1)).toEqual(same)
  expect(permuteOrders(['a', 'b'], [0, 2], 0, 4)).toEqual(same)
})
```

- [ ] **Step 2: Fallisce, poi implementare**

```ts
export function permuteOrders(ids: string[], orders: number[], from: number, to: number): { id: string; order: number }[] {
  const next = ids.map((id, index) => ({ id, order: orders[index] }))
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next.map((item, index) => ({ id: item.id, order: orders[index] }))
}
```

- [ ] **Step 3: `reorderKind`**

In `services.ts`, dopo `moveService`: leggere la mappa, isolare i servizi con lo stesso `kind` ordinati per `order`, chiamare `permuteOrders` sugli id e sugli order di quel gruppo, scrivere quegli `order` nella mappa e `writeMap` una volta. Se l’id manca, `AppError` `service_missing`. Se `toIndex` è fuori dal gruppo, restituire la lista invariata senza scrivere.

Test in `services.test.ts`: tre principali con order 0, 1, 2 e un extra con order 3. `reorderKind(uid, primoId, 2)` lascia l’extra a 3 e i tre order 0, 1, 2 permutati. Un solo `setItem` in più rispetto alla lettura (spiare `localStorage.setItem` e contare le scritture della chiave servizi: 1).

- [ ] **Step 4: Hook**

`reorderKind` nel ritorno di `useServices`, stesso `try/catch` di `move`: in locale `guard`, altrimenti `withLocalKey` e `remember`. Ritorna `boolean`.

- [ ] **Step 5: Passa e commit**

Run: `npx vitest run src/lib/serviceOrder.test.ts src/data/local/services.test.ts`
Expected: PASS

```powershell
git add -- src/lib/serviceOrder.ts src/lib/serviceOrder.test.ts src/data/local/services.ts src/data/local/services.test.ts src/hooks/useServices.ts
git commit -m @"
feat: riordina un servizio dentro il suo gruppo in un solo salvataggio.

"@
```

---

### Task 5: Bottone, campo, interruttore

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Toggle.tsx`
- Modify: `src/components/ui/ui.test.tsx`
- Modify: `src/components/layout/chrome.test.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Test: `src/components/ui/ui.test.tsx`, `src/components/layout/chrome.test.tsx`, `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `SIZES.field`, `SIZES.button`, `SIZES.switch`, `TYPE`.
- Produces:
  - `Button` props `variant?: 'primary' | 'tonal' | 'ok' | 'bad' | 'ghost' | 'secondary'`, `size?: 'sm' | 'md' | 'lg'`. Default `primary` e `lg`.
  - `Input` prop `size?: 'md' | 'lg'` (default `md`, altezza 32; `lg` è 44) e `icon?: ReactNode` resa a sinistra dentro il campo, `aria-hidden`.
  - `export { Toggle as Switch }` da `Toggle.tsx`.

- [ ] **Step 1: Aggiornare i test esistenti che fissano 44 e 13**

In `chrome.test.tsx` il campo «Nome» senza size è alto 32 e l’etichetta è `font-size: 11px`. Il gap resta 4. Aggiungere un caso `<Input label="Email" size="lg" />` alto 44.

In `LoginPage.tsx` i due `Input` passano `size="lg"`. Il test di login che cerca l’altezza, se c’è, si aspetta 44 solo lì.

- [ ] **Step 2: Test delle varianti**

```tsx
it('completa è verde con spunta, disdetto è rosso senza icona', () => {
  render(
    <div>
      <Button variant="ok" size="sm">Completato</Button>
      <Button variant="secondary" size="sm">Non venuto</Button>
      <Button variant="bad" size="sm">Disdetto</Button>
    </div>,
  )
  expect(screen.getByRole('button', { name: 'Completato' }).getAttribute('style')).toContain('height: 26px')
  expect(screen.getByRole('button', { name: 'Disdetto' }).getAttribute('style')).toContain('color: var(--bad)')
  expect(screen.getByRole('button', { name: 'Non venuto' }).getAttribute('style')).toContain('background: var(--card)')
})
```

Il bottone Completato della Home metterà la spunta come figlio nel task 11. Qui il componente non inventa l’icona: la riceve in `children`.

- [ ] **Step 3: Implementare**

`Button`: altezza `sm` → `SIZES.button.h`, `md` → `hMd`, `lg` → `hLg`. Raggio 7, 8, 9 nello stesso ordine. `primary`: fondo `--pri-solid`, testo `--on-pri`, bordo none, `box-shadow: var(--sh-btn)`. `tonal`: fondo `--pri-s`, testo `--pri-ink`, bordo none, shadow none. `ok` / `bad`: fondo `--ok-s` / `--bad-s`, testo `--ok` / `--bad`, shadow none. `ghost`: trasparente, bordo none, testo `--tx2`. `secondary`: fondo `--card`, bordo `1px solid var(--line2)`, `box-shadow: var(--sh-1)`, testo `--tx`.

`Input`: altezza da `size`. Etichetta `fontSize: SIZES.field.label`, `fontWeight: 600`, colore `--tx2`. Bordo `1px solid var(--line2)`. Se il chiamante passa `style` dopo, vince il chiamante solo per le chiavi che passa: oggi lo style è nello spread finale, tenerlo così. Errore: bordo `--bad` e `boxShadow: 0 0 0 3px var(--bad-s)`. Il focus visivo è CSS `:focus-visible` non inline: in `index.css`, sotto i token,

```css
input:focus-visible, textarea:focus-visible {
  outline: none;
  border-color: var(--pri);
  box-shadow: 0 0 0 3px var(--focus);
}
```

`Toggle`: larghezza `SIZES.switch.w`, altezza `h`, pallino `knob`, spento `--line2`, acceso `--ok`. `export { Toggle as Switch }`.

- [ ] **Step 4: Passa**

Run: `npx vitest run src/components/ui/ui.test.tsx src/components/layout/chrome.test.tsx src/pages/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/ui/Button.tsx src/components/ui/Input.tsx src/components/ui/Toggle.tsx src/components/ui/ui.test.tsx src/components/layout/chrome.test.tsx src/pages/LoginPage.tsx src/index.css
git commit -m @"
feat: bottoni semantici, campo a 32 e interruttore del mockup.

"@
```

---

### Task 6: Chip, pill, filtro, riga che va a capo

**Files:**
- Create: `src/components/ui/ServiceChip.tsx`
- Create: `src/components/ui/StatusPill.tsx`
- Create: `src/components/ui/FilterChip.tsx`
- Create: `src/components/ui/ChipRow.tsx`
- Modify: `src/components/ui/ui.test.tsx`
- Test: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `serviceTone`, `ServiceIcon`, `SIZES.serviceChip`, `SIZES.pill`, `SIZES.filterChip`, `TYPE.chip`, `Check` da lucide.
- Produces:
  - `ServiceChip({ iconKey, children })`
  - `StatusPill({ tone, children })` con `tone: 'prim' | 'ok' | 'warn' | 'bad' | 'neutral'`
  - `FilterChip({ pressed, onClick, children })`
  - `ChipRow({ children })`

- [ ] **Step 1: Test**

```tsx
it('separa la chip servizio dalla pill e accende il filtro', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(
    <ChipRow>
      <ServiceChip iconKey="bagno">Bagno</ServiceChip>
      <StatusPill tone="prim">tra 36 min</StatusPill>
      <FilterChip pressed onClick={onClick}>Tutti</FilterChip>
    </ChipRow>,
  )
  const bagno = screen.getByText('Bagno')
  expect(bagno.getAttribute('style')).toContain('height: 20px')
  expect(bagno.getAttribute('style')).toContain('border-radius: 6px')
  expect(bagno.getAttribute('style')).toContain('color: var(--s-bagno)')
  expect(screen.getByText('tra 36 min').getAttribute('style')).toContain('border-radius: 999px')
  const filtro = screen.getByRole('button', { name: 'Tutti' })
  expect(filtro.getAttribute('style')).toContain('box-shadow: 0 0 0 3px var(--focus)')
  expect(filtro.querySelector('svg')).not.toBeNull()
  await user.click(filtro)
  expect(onClick).toHaveBeenCalledOnce()
  expect(screen.getByText('Bagno').parentElement?.getAttribute('style')).toContain('flex-wrap: wrap')
})
```

- [ ] **Step 2: Implementare**

`ServiceChip`: `span` inline-flex, altezza e raggio da `SIZES.serviceChip`, font `TYPE.chip`, peso 600, `whiteSpace: nowrap`, colore e fondo da `serviceTone(iconKey)`, `boxShadow: inset 0 0 0 1px color-mix(in srgb, currentColor 20%, transparent)`. Dentro, `ServiceIcon` a `SIZES.chip.serviceIconInChip` e il testo.

`StatusPill`: altezza `SIZES.pill.h`, padding orizzontale `padX`, raggio 999, font `TYPE.chip`, peso 700. Toni: `prim` → `--pri-ink` / `--pri-s`; `ok`, `warn`, `bad` → il token e il suo `-s`; `neutral` → `--tx2` / `--surf`. Prima del testo un pallino di `SIZES.pill.dot` con `background: currentColor`.

`FilterChip`: `button type="button"` `aria-pressed`. Altezza `SIZES.filterChip.h`, font `filterChip.font`, raggio 999, bordo `1px solid var(--line2)`, fondo `--card`, testo `--tx2`, `box-shadow: var(--sh-1)`. Se `pressed`: fondo `--pri-s`, bordo `--pri`, testo `--pri-ink`, `box-shadow: 0 0 0 3px var(--focus)`, e `<Check size={13} />` prima dei children. Il nome accessibile resta il testo del children (la spunta è `aria-hidden`).

`Chip` guadagna `dashed?: boolean` e `round?: boolean`. `dashed` toglie il fondo e mette `border: 1px dashed var(--line2)`. `round` imposta `borderRadius: SIZES.chip.radius` (999). Senza quelle prop il raggio della chip neutra resta quello attuale solo se il chiamante non passa `round`; le chip servizio usano `ServiceChip`, non questa.

`ChipRow`: `div` con `display: flex`, `flexWrap: wrap`, `gap: SIZES.serviceChip.rowGap`, `minWidth: 0`.

- [ ] **Step 3: Passa e commit**

Run: `npx vitest run src/components/ui/ui.test.tsx`
Expected: PASS

```powershell
git add -- src/components/ui/ServiceChip.tsx src/components/ui/StatusPill.tsx src/components/ui/FilterChip.tsx src/components/ui/ChipRow.tsx src/components/ui/ui.test.tsx
git commit -m @"
feat: chip servizio, pill di stato e filtro con spunta.

"@
```

---

### Task 7: Card, intestazione, segmentato, tile, griglia, sticker, foglio

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/SectionTitle.tsx`
- Modify: `src/components/ui/Segmented.tsx`
- Create: `src/components/ui/IconTile.tsx`
- Create: `src/components/ui/KeyValueGrid.tsx`
- Create: `src/components/ui/TimeBox.tsx`
- Create: `src/components/domain/TemperamentSticker.tsx`
- Modify: `src/components/layout/Sheet.tsx`
- Modify: `src/components/ui/ui.test.tsx`
- Modify: `src/components/layout/chrome.test.tsx`
- Test: quei due file

**Interfaces:**
- Consumes: `SIZES`, token.
- Produces:
  - `Card` con `box-shadow: var(--sh-2)` e `overflow: hidden`
  - `Row` accetta `pressed?: boolean` e non disegna il bordo sulla prima riga se `style.borderTop` è già `none` (comportamento attuale)
  - `SectionHeader` è `SectionTitle` con props `tone?: 'default' | 'ok' | 'warn' | 'bad'` e `count?: number`
  - `Segmented` prop `solid?: boolean`
  - `IconTile({ tone, size, children })` con `tone` uguale alle chiavi di `serviceTone` più `prim | ok | warn | bad`
  - `KeyValueGrid({ items: { label: string; value: string }[] })`
  - `TimeBox({ time, duration, active })`
  - `TemperamentSticker({ kind, size, flags? })`
  - `Sheet` prop `footer?: ReactNode`

- [ ] **Step 1: Test**

`SectionTitle` con `count={3}` mostra il testo `3` in un elemento alto 17. `Segmented` selezionato ha `box-shadow` che contiene `var(--sh-1)`. Con `solid` il selezionato ha `background: var(--pri-solid)`. `TimeBox` attivo ha `background: var(--pri-solid)`. `KeyValueGrid` mostra etichetta e valore. `Sheet` con `footer={<button>Salva</button>}` rende il bottone e il dialog contiene `var(--sh-3)` oppure il footer contiene `var(--sh-foot)`. Il velo, quando non è `closeButton`, ha `background: var(--scrim)`. `TemperamentSticker` ha l’`img` con alt del carattere e `box-shadow` che contiene `var(--sh-stk)`.

- [ ] **Step 2: Implementare**

`Card`: aggiungere `boxShadow: 'var(--sh-2)'` e `overflow: 'hidden'` prima dello spread di `props.style`, così il chiamante può ancora coprire.

`SectionTitle`: a sinistra una barretta `SIZES.sectionBar`. Colore: default `--pri`, altrimenti `--ok`, `--warn`, `--bad`. Se `count` è un numero, dopo il titolo uno span alto `countH`, raggio 999, bordo `1px solid var(--line)`, fondo `--surf3`, font 10, peso 700, testo il numero. `export { SectionTitle as SectionHeader }`.

`Segmented`: il bottone selezionato ha `background: var(--surf3)`, `boxShadow: 'var(--sh-1), 0 0 0 1px var(--line)'`, colore `--tx`, altezza `SIZES.button.h`. Se `solid`, selezionato: fondo `--pri-solid`, testo `--on-pri`, `boxShadow: var(--sh-btn)`.

`IconTile`: quadrato `size === 'sm' ? SIZES.iconTile.sm : SIZES.iconTile.size`, raggio corrispondente, flex none, grid center. Colore e fondo: se `tone` è una chiave servizio, `serviceTone`; `prim` → `--pri` / `--pri-s`; `ok` `warn` `bad` → token e `-s`.

`KeyValueGrid`: griglia a due colonne, `gap: 1`, fondo `--line`, raggio `SIZES.kv.radius`, bordo `1px solid var(--line)`. Ogni cella fondo `--card`, padding `padY` `padX`. `small` a `SIZES.kv.label` maiuscolo, `b` a `SIZES.kv.value`.

`TimeBox`: larghezza `SIZES.timeBox.w`, raggio 8, padding verticale 3, testo centrato. Ora a font `time`, peso 800. Durata a font `duration`, colore `--tx3`. Se `active`: fondo `--pri-solid`, testo `--on-pri`, bordo trasparente, `boxShadow: var(--sh-btn)`, la durata a `rgba(255,255,255,.8)`.

`TemperamentSticker`: span `inline-flex`, `borderRadius: 999`, `boxShadow: '0 0 0 2px var(--card), var(--sh-stk)'`. Dentro `TemperamentIcon`. `flags` opzionale rende `FlagIcon` accanto, stessa misura, non sopra la foto: il posizionamento sull’angolo della foto lo fa la pagina con `position: absolute`.

`Sheet`: il pannello ha `boxShadow: 'var(--sh-3)'` e `padding: 0`. Il corpo scorre. Se `footer` c’è, un `div` dopo il corpo con padding da `SIZES.sheet.footer`, `borderTop: 1px solid var(--line)`, `background: var(--card)`, `boxShadow: var(--sh-foot)`. I veli usano `background: var(--scrim)` al posto del rgba scritto oggi.

- [ ] **Step 3: Passa e commit**

Run: `npx vitest run src/components/ui/ui.test.tsx src/components/layout/chrome.test.tsx src/components/layout/shell.test.tsx`
Expected: PASS

```powershell
git add -- src/components/ui/Card.tsx src/components/ui/SectionTitle.tsx src/components/ui/Segmented.tsx src/components/ui/IconTile.tsx src/components/ui/KeyValueGrid.tsx src/components/ui/TimeBox.tsx src/components/domain/TemperamentSticker.tsx src/components/layout/Sheet.tsx src/components/ui/ui.test.tsx src/components/layout/chrome.test.tsx
git commit -m @"
feat: card, intestazioni, griglia e footer del foglio.

"@
```

---

### Task 8: Home

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/components/domain/AppointmentRow.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `nextVisitPill`, `TimeBox`, `StatusPill`, `ChipRow`, `ServiceChip`, `Button`, `IconTile`, `SectionHeader`, `currentOrNext`.
- Produces: lista di oggi ordinata per orario; pill sul prossimo; tre bottoni di «Da chiudere» come nel §6.

- [ ] **Step 1: Test**

Con un completato alle 09:00 e un programmato alle 12:00, il nome delle 09 compare prima nel documento. Il programmato futuro mostra `tra ` e ` min`. Un programmato già iniziato mostra `ora`. Il bottone Completato contiene un `svg` e il nome accessibile resta «Completato {cane}». Non venuto e Disdetto non contengono `svg`. I tre stanno in un contenitore con `grid-template-columns: 1.25fr 1fr 1fr`. Nessuna riga di oggi ha `text-overflow: ellipsis`.

`todayOrder` diventa sort per `start` poi `id`, tenendo solo `programmato` e `completato`. I completati non vanno in fondo.

- [ ] **Step 2: AppointmentRow**

Togliere il taglio `+N` e l’ellipsis sul sottotitolo. I servizi vanno in `ChipRow` di `ServiceChip`. Il chiamante può passare `extra` (la pill) come prop opzionale `aside?: ReactNode`, resa dentro la `ChipRow` dopo le chip.

- [ ] **Step 3: Home**

La riga del prossimo usa `TimeBox` `active` e `StatusPill tone="prim"` con `nextVisitPill(appointment.start, now)`. Le altre righe usano `TimeBox` non attivo. Il completato ha `opacity: 0.72` e `StatusPill tone="ok"` con il testo già usato «Completato». «Da chiudere»: `Button size="sm" variant="ok"` con `<Check size={13} aria-hidden />` e il testo Completato; Non venuto `variant="secondary"` senza icona; Disdetto `variant="bad"` senza icona. `aria-label` invariati. Le tre caselle usano `IconTile` e restano `Link`.

- [ ] **Step 4: Passa e commit**

`AppointmentRow` è usato anche da Animali. Nello stesso commit aggiornare in `DogsPage.test.tsx` l’attesa di `text-overflow: ellipsis` su «Bagno»: il contenitore ha `flex-wrap: wrap`.

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx`
Expected: PASS

```powershell
git add -- src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/components/domain/AppointmentRow.tsx
git commit -m @"
feat: in home l'ordine è l'orario e il prossimo ha la pill.

"@
```

---

### Task 9: Animali, scheda, modifica

**Files:**
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogFields.tsx`
- Test: `src/pages/DogsPage.test.tsx` (elenco e scheda, incluso «la freccia sul prezzo cambiato»)

**Interfaces:**
- Consumes: `FilterChip`, `StatusPill`, `TemperamentSticker`, `KeyValueGrid`, `priceChange`, `sumPrice` da `src/lib/appointments.ts`, `ChipRow`, `Sheet` footer.
- Produces: elenco senza ellipsis; storico con variazione; Salva nel footer del form.

- [ ] **Step 1: Test**

In `DogsPage.test.tsx` la riga che si aspetta `text-overflow: ellipsis` su «Bagno» diventa: il contenitore delle chip ha `flex-wrap: wrap` e il nome del cane non ha ellipsis. Il filtro attivo ha `aria-pressed="true"`.

Per lo storico il test già in `DogsPage.test.tsx` («la freccia sul prezzo cambiato») usa Bagno a 20 poi a 25. Il testo visibile diventa `▲ € 5`. Il nome accessibile resta «Prezzo più alto del precedente» (e «Prezzo più basso del precedente» quando scende), sullo stesso elemento del testo, non più su un `img` separato. Una sola visita non mostra `▲` né `▼`. I dettagli non stanno più dietro il bottone «Dettagli» chiuso: «8,5 kg» è visibile nella `KeyValueGrid`. Aggiornare quel test di conseguenza.

- [ ] **Step 2: Pagine**

`DogsPage`: filtri diventano `FilterChip`. Il sottotitolo va a capo (`whiteSpace: normal`). Lo sticker è `TemperamentSticker` in `position: absolute` sull’angolo basso destro dell’avatar. Lo stato è `StatusPill`.

`DogPage` testata in una `Card`. Dettagli in `KeyValueGrid`. Storico: visite del cane ordinate per data; per ciascuna, `priceChange(sumPrice(visita.services), somma della precedente o null)`.

`DogFields`: le sezioni Identità, Carattere, Cliente, Note e tag, Contatti sono `Card`. Il carattere scelto ha bordo `2px solid var(--pri)`, `boxShadow: 0 0 0 3px var(--focus)` e una `Check`. Gli altri hanno `opacity: 0.85`. I tag sono `Chip` con bottone x che chiama la rimozione già usata. «+ Tag» è `Chip` con bordo dashed. `Segmented` senza cambiare la prop `solid` (rilievo di default). Il bottone Salva del form cane sta in un footer fisso: `position: sticky; bottom: 0` con lo stesso padding e `box-shadow: var(--sh-foot)` di `SIZES.sheet.footer`, non un secondo `Sheet`.

- [ ] **Step 3: Passa e commit**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/DogPage.test.tsx`
Expected: PASS. Se il file della scheda ha un altro nome, usare quel file.

```powershell
git add -- src/pages/DogsPage.tsx src/pages/DogsPage.test.tsx src/pages/DogPage.tsx src/pages/DogFields.tsx
git commit -m @"
feat: elenco animali a capo e storico con la variazione di prezzo.

"@
```

Aggiungere al commit anche il test della scheda toccato.

---

### Task 10: Calendario

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/appointments.test.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `eventLayout`, `ServiceChip`, `ChipRow`, `sumDuration`.
- Produces: card compatta sotto i 60 minuti, card intera da 60, in giorno e settimana. Mese come nel §6.

- [ ] **Step 1: Test**

Un appuntamento di 45 minuti mostra il nome intero, una sola `ServiceChip` e il testo `+1` se i servizi sono due. Non mostra la seconda chip. Un appuntamento di 60 minuti mostra entrambe le chip dentro un contenitore `flex-wrap: wrap` e non mostra `+1`. `hourHeight` nel componente resta `SIZES.calendar.hourHeight` (50). Il giorno selezionato ha `background: var(--pri-solid)`.

In `appointments.test.tsx` il test «in settimana il blocco ha nome e icona, senza il servizio» va aggiornato: il blocco da 30 minuti mostra il nome e la chip del primo servizio. Il test «il colore del blocco usa la chiave icona» non si aspetta più `var(--sen)`: la striscia del blocco usa il colore del servizio (`var(--s-combo)` per `bagno_taglio`).

- [ ] **Step 2: Implementare**

Nel blocco evento, `const layout = eventLayout(sumDuration(appointment.services))`. `compact`: una riga, nome senza ellipsis, sticker, prima `ServiceChip`, se `services.length > 1` uno span «+1», poi l’orario. `full`: striscia a sinistra 4 px (`--ok` se completato, `--s-mens` se il cane è mensile, altrimenti `--pri`) e `ChipRow` con tutte le chip. La linea dell’ora corrente resta un elemento con bordo `--bad` e l’orario, solo nella vista giorno di oggi. Nel mese, la cella scelta usa `--pri-solid` anche se è oggi; oggi non scelto ha `box-shadow: inset 0 0 0 2px var(--pri)`; il sabato e la domenica hanno fondo `--surf`. «Aggiungi» è `Button variant="tonal" size="sm"`.

- [ ] **Step 3: Passa e commit**

Run: `npx vitest run src/pages/appointments.test.tsx`
Expected: PASS

```powershell
git add -- src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: nel calendario la card corta tiene il nome e un +1.

"@
```

---

### Task 11: Appuntamento, nuovo e note

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/AppointmentPage.test.tsx`
- Modify: `src/pages/completato.test.tsx`
- Test: quei test

**Interfaces:**
- Consumes: `KeyValueGrid`, `IconTile`, `serviceTone`, `Sheet.footer`, `Button`.
- Produces: scontrino, tessere servizio, orari, pill Completato sulle note.

- [ ] **Step 1: Test**

Il foglio dell’appuntamento esistente mostra un bottone «Apri scheda» o la card del cane che naviga a `/animali/{id}`. L’ordine nel documento è: azione di modifica, Non venuto, Disdici, Completato. Completato è `variant` primary (fondo `var(--pri-solid)`).

Nel form nuovo, una tessera servizio selezionata ha `box-shadow: 0 0 0 3px var(--focus)`. Uno slot occupato ha `text-decoration: line-through` ed è disabilitato. Lo slot scelto ha `background: var(--pri-solid)`.

Sulle note di un completato c’è una `StatusPill` «Completato».

- [ ] **Step 2: Implementare**

`AppointmentPage`: cane in `Card` cliccabile. Data, orario, durata e telefono in `KeyValueGrid`. Righe servizio con `IconTile` e prezzo allineato a destra; totale con `formatEuro`. Bottoni a tutta larghezza, con icona lucide, nell’ordine del §6. Completato `variant="primary" size="lg"`.

`AppointmentForm`: avviso critico con fondo `--bad-s`, bordo sinistro `3px solid var(--bad)`. Tessere in due gruppi secondo `kind`. Selezionata: bordo `--pri`, alone, `Check`. Slot: libero secondario, scelto `--pri-solid`, occupato con `repeating-linear-gradient` e `line-through` e `disabled`, intervallo `--pri-s`. Prezzo e orario nel `footer` dello `Sheet` sopra Salva.

Note: `StatusPill tone="ok"` accanto al titolo. Campo durata con suffisso «min». Chip scelte piene con x; suggerimenti dashed con +. Il bottone Aggiungi sta nella riga del campo.

- [ ] **Step 3: Passa e commit**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/pages/completato.test.tsx src/pages/appointments.test.tsx`
Expected: PASS

```powershell
git add -- src/pages/AppointmentPage.tsx src/pages/AppointmentForm.tsx src/pages/AppointmentPage.test.tsx src/pages/completato.test.tsx
git commit -m @"
feat: foglio appuntamento, orari e note del lavoro nel nuovo stile.

"@
```

---

### Task 12: Mensili, servizi, tag

**Files:**
- Modify: `src/pages/MonthlyPage.tsx`
- Modify: `src/pages/monthly.test.tsx`
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/pages/ServicesPage.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Test: quei tre

**Interfaces:**
- Consumes: `reorderKind`, `SectionHeader`, `FilterChip`, `Switch`/`Toggle`, `Sheet`, `ChipRow`.
- Produces: fissati sempre visibili con `tutti`; maniglia al posto di Su/Giù; tag in `Sheet`.

- [ ] **Step 1: Test mensili**

Togliere l’attesa di «Mostra fissati». Con il filtro Tutti, un cane fissato è nel documento senza click. Con Da fissare, quel nome non c’è. «Fissa» è un bottone il cui style contiene `var(--pri-s)`.

- [ ] **Step 2: Test servizi**

`queryByRole('button', { name: 'Sposta su Bagno' })` è null. C’è `button` «Riordina Bagno». Simulare il drop chiamando il controllo: il test può premere un bottone che la pagina espone solo se il puntatore non è simulabile. Implementare la maniglia come `button` con `aria-label={`Riordina ${nome}`}` e, in test, frecce tastiera: `ArrowDown` sposta di un posto nel gruppo chiamando `reorderKind`. Il puntatore fa la stessa chiamata. Dopo ArrowDown su un principale che non è l’ultimo, l’ordine in `localStorage` è permutato e l’extra non cambia `order`.

- [ ] **Step 3: Test tag**

Aprire Tag caratteristiche: il dialogo `heading` sta in uno `Sheet` (il grabber `data-testid="sheet-grabber"` c’è). «Togli Tagliando» non c’è; c’è un bottone `Togli {valore}` sulla chip, stessa callback. Attività aperta non ha il grabber del foglio: resta `Dialog`.

- [ ] **Step 4: Implementare**

`MonthlyPage`: cancellare `bookedOpen`. Il gruppo fissati si rende quando `filter !== 'da_fissare'` e la lista non è vuota. `SectionHeader` con `tone` e `count`. «Fissa» `variant="tonal" size="sm"`. Nomi senza ellipsis. La barra resta un `progressbar`: il tratto dei fissati è `--ok`, il resto del binario è `--warn-s`, così i due colori della legenda (fissati / da fissare) si vedono insieme. L’etichetta «fissati» e il conteggio `booked/total` restano.

`ServicesPage`: due `section`, Principali e Extra. Niente bottoni Su/Giù. Maniglia `GripVertical` di lucide, `aria-label={`Riordina ${service.name}`}`. `onKeyDown`: ArrowUp/ArrowDown chiamano `reorderKind` con l’indice nel gruppo ±1. Pointer: `onPointerDown` registra l’indice, `onPointerUp` calcola l’indice di riga sotto il puntatore dentro il gruppo e chiama `reorderKind`. Durata e prezzo in `Chip`. `Toggle` legato ad `active` via `saveExisting`. Riga non attiva: `opacity: 0.72` e `StatusPill` «Disattivato». Se `reorderKind` ritorna false, non si aggiorna l’ordine a mano: il hook ha già mostrato il toast.

`SettingsPage`: il blocco tag/strumenti/prodotti usa `Sheet` con `footer` vuoto o con Chiudi. Le liste interne sono `ChipRow`. La x chiama `onRemove`.

- [ ] **Step 5: Passa e commit**

Run: `npx vitest run src/pages/monthly.test.tsx src/pages/ServicesPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

```powershell
git add -- src/pages/MonthlyPage.tsx src/pages/monthly.test.tsx src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m @"
feat: fissati aperti, servizi trascinabili e tag nel foglio.

"@
```

---

### Task 13: Listino, impostazioni, accesso

**Files:**
- Modify: `src/pages/ListinoPage.tsx`
- Modify: `src/pages/listino.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Test: `src/pages/listino.test.tsx`, `src/pages/LoginPage.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `IconTile`, `Button`, `Chip`, `StatusPill`.
- Produces: le schermate del §6 ancora senza i pezzi nuovi.

- [ ] **Step 1: Test**

Il listino mostra i bottoni Apri, Sostituisci e Foto dentro la card del file. La versione precedente contiene il testo «Precedente». La frase «I prezzi in scheda cane hanno priorità sul listino.» sta in un elemento con `background: var(--pri-s)`.

Login: gli input Email e Password sono alti 44. Il bottone «Crea accesso» ha `box-shadow: var(--sh-btn)`. La password ha un bottone «Mostra password» che cambia il `type` da `password` a `text`.

Impostazioni: Esci ha `color: var(--bad)`. Orario e Giorni di anticipo sono in una griglia a due colonne.

- [ ] **Step 2: Implementare**

`ListinoPage`: card del file con `IconTile tone="prim"` e tre `Button size="sm"`. La riga della versione precedente ha `opacity: 0.72` e `Chip` «Precedente». Tabella dentro `Card`, `IconTile` per `iconKey`, durata sotto il nome. Il paragrafo della priorità ha fondo `--pri-s`, testo `--pri-ink`, raggio 9, padding 8×10.

`LoginPage`: `size="lg"` è già nel task 5. Email passa `icon={<Mail size={16} aria-hidden />}`. Password passa `icon={<Lock size={16} aria-hidden />}`. Accanto al campo password, un `IconButton` con `aria-label` «Mostra password» o «Nascondi password» che alterna `type` tra `password` e `text`. Il logo è l’immagine già usata, dentro un cerchio 74 px con `box-shadow: 0 0 0 5px var(--card), 0 12px 30px -10px rgba(40,110,160,.6)`. Il submit resta `Button` senza variant, quindi `primary` `lg` con `--sh-btn`.

`SettingsPage`: ogni voce di menu è una riga con `IconTile` e `ChevronRight`. Backup: `StatusPill tone="ok"`, «Esegui ora» `tonal`, Esporta e Ripristina con icona. Promemoria in `gridTemplateColumns: 1fr 1fr`. Esci `variant="bad" size="lg"` con `LogOut`.

- [ ] **Step 3: Passa**

Run: `npx vitest run src/pages/listino.test.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

- [ ] **Step 4: Suite intera**

Run: `npm test`
Expected: PASS. Correggere solo i test che affermano uno stile vecchio (ellipsis, Su/Giù, altezza 44 fuori dal login, «Mostra fissati») e che questo piano ha reso falsi.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/ListinoPage.tsx src/pages/listino.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/components/ui/Input.tsx
git commit -m @"
feat: listino, impostazioni e accesso nel nuovo guscio.

"@
```

Includere nel commit ogni altro test aggiustato nello step 4.

---

### Task 14: Controllo a 390 px

**Files:**
- Nessun file nuovo. Si corregge solo ciò che il controllo mostra rotto.

**Interfaces:**
- Consumes: l’app avviata con `npm run dev`.
- Produces: niente, se le note del mockup e il §6 della specifica sono già veri a schermo.

- [ ] **Step 1: Aprire l’app**

Il dev server è `npm run dev`. Viewport 390×844, prima chiaro poi scuro (il tema nelle impostazioni).

- [ ] **Step 2: Lista**

Per ogni nota del mockup, dalla 01 Accesso alla 15 Tag, controllare la schermata corrispondente. In più, sulla Home: solo Completato ha la spunta; gli appuntamenti di oggi seguono l’orario; il prossimo ha «tra N min» o «ora». Nel calendario: sotto i 60 minuti una riga con nome intero e «+1» se serve; da 60 minuti le chip vanno a capo. I fissati dei mensili sono visibili senza un bottone che li apre.

- [ ] **Step 3: Correggere e ritestare**

Se una schermata non coincide, correggere il componente condiviso, non uno stile solo in quella pagina. Poi `npm test` verde.

- [ ] **Step 4: Commit solo se c’è una correzione**

Elencare nel `git add` solo i file davvero cambiati. Non usare `git add -A`.

```powershell
git commit -m @"
fix: allinea le schermate al controllo a 390 px.

"@
```

Non alzare la versione. Non pubblicare.
