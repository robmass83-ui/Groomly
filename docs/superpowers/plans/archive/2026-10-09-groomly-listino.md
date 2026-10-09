# Groomly Listino Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il segnaposto di `/listino` con la tabella dei prezzi e dei tempi dei servizi attivi già salvati.

**Architecture:** `listinoView` è pura: filtra i servizi attivi, li ordina, e prepara durata e prezzi già formattati. `ListinoPage` chiama `ensureServiceSeed` e disegna quelle righe. Non c’è una chiave nuova e la pagina non modifica un catalogo già presente.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6, date-fns 4, Vitest 3, Testing Library. I test di `App` usano happy-dom. Il resto del progetto resta su localStorage.

Lavorare in `D:\Groomly` sul branch `feat/groomly-listino`, partendo da `master`. Non aprire un worktree. Non cambiare `git config`. Non fare push.

Il 3 ottobre 2026 è sabato. `format(new Date(2026, 9, 3), 'd MMM yyyy', IT_DATE)` è `3 ott 2026`. Il 12 settembre 2026 è `12 set 2026`. Il trattino in «30–60m» e «€ 5–8» è il trattino lungo già usato da `summarizeDuration` e `summarizePrice` (U+2013), non il meno della tastiera.

## Global Constraints

- Interfaccia solo in italiano.
- Colonna 390 px; a 360 px di larghezza `/listino` non scorre in orizzontale. La tabella ha `width: '100%'` e `tableLayout: 'fixed'`. Nessuna cella ha `whiteSpace: 'nowrap'` né una `minWidth`.
- Nessuna chiave `localStorage` nuova. Si leggono i servizi già salvati.
- `findCorruptGroomlyKey` non cambia. Un JSON illeggibile resta «Dati locali illeggibili» e il valore non si cancella.
- Copia esatta: «Listino prezzi», «Aggiornato 3 ott 2026», «Prezzi e tempi standard», «Modifica», «Servizio», «Piccola», «Media», «Grande», «Nessun servizio», «30–60m», «60m», «+20m», «€ 20», «€ 28», «€ 38», «€ 5», «€ 5–8». La voce in basso resta «Listino».
- Solo i servizi `active`. Ordine di catalogo (`order` crescente), poi `id` con `localeCompare`.
- La durata è `summarizeDuration`. Un principale ha tre celle `formatEuro`. Un extra ha una cella `summarizePrice`: dal più piccolo al più grande dei tre importi.
- La data è l’`updatedAt` più recente tra i servizi attivi. Un servizio spento non conta. Nessun attivo: niente riga «Aggiornato».
- Un account senza servizi riceve `ensureServiceSeed`, come Impostazioni. Un catalogo già presente non si riscrive da questa pagina.
- **Modifica** è un link a `/impostazioni/servizi`. **Indietro** di «Servizi e durate» resta `/impostazioni`.
- Fuori da questo ciclo: PDF, immagine, **Sostituisci**, **Apri**, **Foto**, anteprima, chip **Attuale**, versioni precedenti, la frase «I prezzi in scheda cane hanno priorità sul listino», prezzi diversi per cane, `actualDurationMin`, Firebase, Storage.
- Il menu **+**, il campanello, Home, Animali, Calendario, Mensili e Completato non cambiano. Non modificare `Header.tsx`: ha già `subtitle`.
- Non alzare Vitest. Non modificare `Input`, il `NavLink` di Home (`end` resta assente) e lo schema della password.
- Indietro non usa `window.confirm`. Questa pagina non ha toast.
- I test di `App` hanno `// @vitest-environment happy-dom` come prima riga.
- Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`.
- I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
- PowerShell: non usare `&&`. Il commit è una here-string. Nei commit dei task non usare `git add -A`: elencare i file. Non aggiungere `docs/superpowers/plans/`.
- Non importare simboli inutilizzati: `npm run build` esegue `tsc --noEmit` e `noUnusedLocals` fa fallire la build.

## File map

- Create `src/lib/listino.ts`: `listinoView`. Non legge `localStorage`.
- Create `src/lib/listino.test.ts`: le righe pure.
- Create `src/pages/ListinoPage.tsx`: titolo, data, tabella, link.
- Create `src/pages/listino.test.tsx`: prove di `App`.
- Modify `src/app/router.tsx`: `/listino` rende `ListinoPage`.
- Modify `src/pages/appointments.test.tsx`: il clic su Listino non si aspetta più «In arrivo».
- Modify `src/pages/monthly.test.tsx`: il test del segnaposto diventa la tabella.
- Delete `src/pages/PlaceholderPage.tsx`: non ha altri usi.
- Non modificare `src/data/local/services.ts`, `src/lib/serviceSummary.ts`, `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`.

---

### Task 1: Le righe pure

**Files:**
- Create: `src/lib/listino.test.ts`
- Create: `src/lib/listino.ts`

**Interfaces:**
- Consumes: `summarizeDuration(service)`, `summarizePrice(service)`, `formatEuro(amount)` da `src/lib/serviceSummary.ts` e `src/lib/format.ts`. `Service` da `src/types/models.ts`.
- Produces:
  - `listinoView(services: Service[]): ListinoView`
  - `ListinoPrice = { kind: 'sizes'; piccola: string; media: string; grande: string } | { kind: 'single'; text: string }`
  - `ListinoRow = { id: string; name: string; duration: string; price: ListinoPrice }`
  - `ListinoView = { updatedAt: Date | null; rows: ListinoRow[] }`

- [ ] **Step 1: Creare il branch e il test che fallisce**

```powershell
git checkout master
git checkout -b feat/groomly-listino
```

Creare `src/lib/listino.test.ts` con questo contenuto. Il trattino in `30–60m` e `€ 5–8` è U+2013.

```ts
import { describe, expect, it } from 'vitest'
import type { Service } from '../types/models'
import { listinoView } from './listino'

function at(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function svc(partial: Pick<Service, 'id' | 'name' | 'kind' | 'order'> & Partial<Service>): Service {
  return {
    durationMin: { piccola: 30, media: 45, grande: 60 },
    price: { piccola: 20, media: 28, grande: 38 },
    active: true,
    createdAt: at(2026, 10, 1),
    updatedAt: at(2026, 10, 1),
    ...partial,
  }
}

describe('listinoView', () => {
  it('mette tre prezzi sul principale e una cella sull’extra', () => {
    const view = listinoView([
      svc({ id: 'bagno', name: 'Bagno', kind: 'principale', order: 0 }),
      svc({
        id: 'nodi', name: 'Gestione nodi', kind: 'extra', order: 1,
        durationMin: { piccola: 20, media: 20, grande: 20 },
        price: { piccola: 5, media: 5, grande: 5 },
      }),
    ])
    expect(view.rows).toEqual([
      {
        id: 'bagno', name: 'Bagno', duration: '30–60m',
        price: { kind: 'sizes', piccola: '€ 20', media: '€ 28', grande: '€ 38' },
      },
      {
        id: 'nodi', name: 'Gestione nodi', duration: '+20m',
        price: { kind: 'single', text: '€ 5' },
      },
    ])
    expect(view.updatedAt).toEqual(at(2026, 10, 1))
  })

  it('riassume una durata unica e un extra dal prezzo più piccolo al più grande', () => {
    const view = listinoView([
      svc({
        id: 'fisso', name: 'Fisso', kind: 'principale', order: 0,
        durationMin: { piccola: 60, media: 60, grande: 60 },
      }),
      svc({
        id: 'vario', name: 'Vario', kind: 'extra', order: 1,
        durationMin: { piccola: 15, media: 15, grande: 15 },
        price: { piccola: 8, media: 5, grande: 8 },
      }),
    ])
    expect(view.rows[0].duration).toBe('60m')
    expect(view.rows[1].price).toEqual({ kind: 'single', text: '€ 5–8' })
  })

  it('ignora un servizio spento e la sua data', () => {
    const view = listinoView([
      svc({ id: 'acceso', name: 'Acceso', kind: 'principale', order: 1, updatedAt: at(2026, 9, 1) }),
      svc({ id: 'spento', name: 'Spento', kind: 'principale', order: 0, active: false, updatedAt: at(2026, 12, 1) }),
    ])
    expect(view.rows.map((row) => row.id)).toEqual(['acceso'])
    expect(view.updatedAt).toEqual(at(2026, 9, 1))
  })

  it('a parità di order mette prima l’id che localeCompare considera minore', () => {
    const view = listinoView([
      svc({ id: 'b', name: 'B', kind: 'principale', order: 0 }),
      svc({ id: 'a', name: 'A', kind: 'principale', order: 0 }),
    ])
    expect(view.rows.map((row) => row.id)).toEqual(['a', 'b'])
  })

  it('senza attivi non ha righe né data', () => {
    const view = listinoView([
      svc({ id: 'spento', name: 'Spento', kind: 'principale', order: 0, active: false }),
    ])
    expect(view.rows).toEqual([])
    expect(view.updatedAt).toBeNull()
  })
})
```

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/listino.test.ts`

Expected: FAIL. Il modulo `./listino` non esiste.

- [ ] **Step 3: Implementare listinoView**

Creare `src/lib/listino.ts`.

```ts
import type { Service } from '../types/models'
import { formatEuro } from './format'
import { summarizeDuration, summarizePrice } from './serviceSummary'

export type ListinoPrice =
  | { kind: 'sizes'; piccola: string; media: string; grande: string }
  | { kind: 'single'; text: string }

export interface ListinoRow {
  id: string
  name: string
  duration: string
  price: ListinoPrice
}

export interface ListinoView {
  updatedAt: Date | null
  rows: ListinoRow[]
}

export function listinoView(services: Service[]): ListinoView {
  const active = services
    .filter((service) => service.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const updatedAt = active.reduce<Date | null>((latest, service) => {
    if (latest == null || service.updatedAt > latest) return service.updatedAt
    return latest
  }, null)
  return {
    updatedAt,
    rows: active.map((service) => ({
      id: service.id,
      name: service.name,
      duration: summarizeDuration(service),
      price: service.kind === 'principale'
        ? {
            kind: 'sizes' as const,
            piccola: formatEuro(service.price.piccola),
            media: formatEuro(service.price.media),
            grande: formatEuro(service.price.grande),
          }
        : { kind: 'single' as const, text: summarizePrice(service) },
    })),
  }
}
```

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/listino.test.ts`

Expected: PASS. 5 test.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/listino.ts src/lib/listino.test.ts
git commit -m @"
feat: calcola le righe del listino dai servizi attivi

"@
```

---

### Task 2: La pagina al posto di In arrivo

**Files:**
- Create: `src/pages/listino.test.tsx`
- Create: `src/pages/ListinoPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/appointments.test.tsx` (il test `il Calendario cambia giorno e tiene la data nell'indirizzo`)
- Modify: `src/pages/monthly.test.tsx` (il test `il Listino resta In arrivo`)
- Delete: `src/pages/PlaceholderPage.tsx`

**Interfaces:**
- Consumes: `listinoView(services: Service[]): ListinoView` dal Task 1. `ensureServiceSeed(uid: string): Service[]` e `updateService(uid, id, patch)` da `src/data/local/services.ts`. `Header` accetta `subtitle?: string`. `ShellFrame` tiene la barra e il menu **+**. `IT_DATE` da `src/lib/format.ts`. `format` da `date-fns`.
- Produces: `ListinoPage` montata su `/listino`. `PlaceholderPage` non esiste più.

- [ ] **Step 1: Scrivere i test della pagina**

Creare `src/pages/listino.test.tsx`. La prima riga è il commento di happy-dom. L’orologio ferma solo `Date`, così `userEvent` non resta bloccato.

```tsx
// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { ensureServiceSeed, updateService } from '../data/local/services'

describe('listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra i prezzi attivi e la data dell’ultimo aggiornamento', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sostituisci' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Servizio' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Piccola' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Grande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Listino' })).toBeInTheDocument()
    const bagno = screen.getByText('Bagno').closest('tr')
    expect(bagno).not.toBeNull()
    expect(within(bagno!).getByText('30–60m')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 20')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 28')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 38')).toBeInTheDocument()
    expect(within(bagno!).getAllByRole('cell')).toHaveLength(4)
    const nodi = screen.getByText('Gestione nodi').closest('tr')
    expect(nodi).not.toBeNull()
    expect(within(nodi!).getByText('+20m')).toBeInTheDocument()
    expect(within(nodi!).getByText('€ 5')).toBeInTheDocument()
    expect(within(nodi!).getAllByRole('cell')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })

  it('Modifica apre Servizi e durate e Indietro torna a Impostazioni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.click(await screen.findByRole('link', { name: 'Modifica' }))
    expect(await screen.findByRole('heading', { name: 'Servizi e durate' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni')
  })

  it('senza servizi attivi dice Nessun servizio e tiene Modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    for (const service of ensureServiceSeed(account.uid)) {
      updateService(account.uid, service.id, { active: false })
    }
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Nessun servizio')).toBeInTheDocument()
    expect(screen.queryByText(/Aggiornato/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })
})
```

`getByText('Bagno')` è esatto: non prende «Bagno + taglio». «€ 5» di Gestione nodi si cerca dentro la sua riga, perché anche Unghie costa € 5.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/listino.test.tsx`

Expected: FAIL. Il titolo trovato è «Listino», oppure «Listino prezzi» non c’è, e la pagina mostra «In arrivo».

- [ ] **Step 3: Implementare la pagina e la rotta**

Creare `src/pages/ListinoPage.tsx`.

```tsx
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SectionTitle } from '../components/ui/SectionTitle'
import { ensureServiceSeed } from '../data/local/services'
import { useSession } from '../hooks/useSession'
import { IT_DATE } from '../lib/format'
import { listinoView } from '../lib/listino'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const cell = { padding: '6px 4px', verticalAlign: 'top' } as const

export function ListinoPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const view = listinoView(uid ? ensureServiceSeed(uid) : [])
  const subtitle = view.updatedAt == null ? undefined : `Aggiornato ${format(view.updatedAt, 'd MMM yyyy', IT_DATE)}`
  return (
    <ShellFrame>
      <Header title="Listino prezzi" subtitle={subtitle} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <SectionTitle>Prezzi e tempi standard</SectionTitle>
          <Link to="/impostazioni/servizi" style={{ flexShrink: 0, fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)' }}>Modifica</Link>
        </div>
        {view.rows.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun servizio</p>
        ) : (
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: TYPE.meta }}>
            <thead>
              <tr>
                <th style={{ ...cell, textAlign: 'left', width: '40%' }}>Servizio</th>
                <th style={{ ...cell, textAlign: 'right' }}>Piccola</th>
                <th style={{ ...cell, textAlign: 'right' }}>Media</th>
                <th style={{ ...cell, textAlign: 'right' }}>Grande</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id}>
                  <td style={cell}>
                    <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{row.name}</div>
                    <div style={{ color: 'var(--tx3)' }}>{row.duration}</div>
                  </td>
                  {row.price.kind === 'sizes' ? (
                    <>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.piccola}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.media}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{row.price.grande}</td>
                    </>
                  ) : (
                    <td colSpan={3} style={{ ...cell, textAlign: 'right' }}>{row.price.text}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ShellFrame>
  )
}
```

`SectionTitle` mette il titolo in maiuscolo solo con il CSS. Il testo nel DOM resta «Prezzi e tempi standard».

In `src/app/router.tsx`, togliere l’import di `PlaceholderPage`. Aggiungere `import { ListinoPage } from '../pages/ListinoPage'`. Sostituire la rotta:

```tsx
{ path: '/listino', element: <Guard><ListinoPage /></Guard> },
```

Cancellare `src/pages/PlaceholderPage.tsx`.

- [ ] **Step 4: Aggiornare i due test del segnaposto**

In `src/pages/appointments.test.tsx`, nel test `il Calendario cambia giorno e tiene la data nell'indirizzo`, sostituire le due righe dopo il clic su Listino:

```tsx
    await user.click(screen.getByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
```

Quel file non ferma l’orologio: non asserire la data «Aggiornato».

In `src/pages/monthly.test.tsx`, rinominare il test e sostituire il corpo. L’orologio di quel file è già il 3 ottobre 2026.

```tsx
  it('il Listino mostra i prezzi e non è più In arrivo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
  })
```

- [ ] **Step 5: Verificare che passano**

Run: `npx vitest run src/pages/listino.test.tsx src/pages/appointments.test.tsx src/pages/monthly.test.tsx`

Expected: PASS. `listino.test.tsx` ha 3 test. I warning del router sono ammessi.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/ListinoPage.tsx src/pages/listino.test.tsx src/app/router.tsx src/pages/appointments.test.tsx src/pages/monthly.test.tsx
git add -u src/pages/PlaceholderPage.tsx
git commit -m @"
feat: mostra prezzi e tempi al posto di In arrivo

"@
```

`git add -u` su quel file registra la cancellazione. Non usare `git add -A`.

---

### Task 3: Verifica dell’insieme

**Files:**
- Nessun file nuovo, salvo un difetto trovato qui.

**Interfaces:**
- Consumes: i task 1 e 2.
- Produces: suite e build verdi. Nessun commit se non c’è un difetto.

- [ ] **Step 1: Suite e build**

```powershell
npm test
```

Expected: tutti i test PASS. I warning del router sono ammessi.

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Giro sul telefono**

Avviare `npm run dev` e usare l’URL che stampa Vite. Viewport 360×780.

- Aprire **Listino**. Il titolo è **Listino prezzi**. C’è **Aggiornato** con la data di oggi, **Prezzi e tempi standard**, **Modifica**, e la riga Bagno con € 20, € 28, € 38. Non c’è **Sostituisci**, né «In arrivo», né la frase sui prezzi del cane.
- `scrollWidth` del documento è 360.
- **Modifica** apre **Servizi e durate**. **Indietro** torna a Impostazioni.
- Dalla scheda di Bagno, spegnerlo e salvare. Tornare al Listino: Bagno non c’è. Gli altri servizi attivi restano.
- La voce in basso resta **Listino**. Il menu **+** apre ancora Nuovo appuntamento e Nuovo cane.

- [ ] **Step 3: Commit solo se c’è un difetto**

Se il giro trova un difetto, correggerlo, rilanciare `npm test` e `npm run build`, poi commit solo dei file della correzione. Se non c’è un difetto, non fare commit.

Non aggiungere il piano.

## Copertura della specifica

- `listinoView`, filtro, ordine, durata, tre prezzi, cella extra, data: Task 1.
- Pagina, seed, vuoto, **Modifica**, **Indietro**, rotta, cancellazione del segnaposto, test vecchi: Task 2.
- Nessuno scroll orizzontale a 360 px e assenza di **Sostituisci**: Task 2 nel markup, Task 3 nel giro.
- JSON illeggibile e `findCorruptGroomlyKey`: non si toccano `storage.ts` né la schermata già esistente.
