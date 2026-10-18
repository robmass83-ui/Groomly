# Ritorno dalla scheda alla lista animali — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sulla scheda animale, al posto della fascia «Indietro» a sinistra, un pulsante «Animali» fisso in basso a destra riporta alla lista.

**Architecture:** Un link `AnimalsReturn` con gli stili in un CSS dedicato. `DogPage` lo monta, tramite `SchedaFrame`, sulle tre schermate che oggi passano `backTo="/animali"` a `PhoneShell`. `PhoneShell` perde `backTo` e `BackBar` si cancella. L'ingresso della scheda è un'animazione CSS di 180 ms sul contenitore, spenta se l'utente riduce i movimenti.

**Tech Stack:** React 18, React Router 6, Vitest, Testing Library, happy-dom nelle prove della scheda, jsdom nel resto. Icone `lucide-react`. Token in `src/theme/tokens.css`.

## Global Constraints

- Il pulsante sta solo sulla scheda di un animale già presente, su «Nuovo cane» e su «Cane assente».
- Scritta visibile **Animali**, freccia `ArrowLeft` con `aria-hidden`, nome accessibile «Torna agli animali».
- Link verso `/animali` con `replace`.
- Altezza minima 48 px, larghezza almeno 48 px, padding orizzontale 16 px, distanza fra freccia e scritta 8 px.
- Testo 15 px, peso 700, colore `var(--tx)`.
- Fondo `var(--card)`, bordo 1 px `var(--line)`, raggio 16 px, ombra `var(--sh-2)`.
- Premuto: fondo `var(--surf)` in 120 ms, senza spostare il riquadro.
- Focus da tastiera: anello 2 px `var(--pri)`, staccato di 2 px.
- Fisso, z-index 20. In basso `calc(12px + env(safe-area-inset-bottom, 0px))`. A destra `max(12px, calc((100% - 640px) / 2 + 12px))`.
- Padding inferiore del contenuto `calc(72px + env(safe-area-inset-bottom, 0px))`.
- Ingresso: `translateX(16px)` fino a 0, 180 ms, ease-out, solo al montaggio. `prefers-reduced-motion: reduce` azzera l'animazione. L'uscita non è animata.
- Uscire senza salvare abbandona le modifiche. Nessuna conferma nuova.
- Non toccare `groomly.dogs-list-scroll`, chip, ricerca e ordinamento della lista.
- I link «Indietro» dell'intestazione (Impostazioni, listino, mensili e le altre pagine) restano.
- Nessun hex nuovo: solo i token già nel tema.

---

### Task 1: AnimalsReturn

**Files:**
- Create: `src/components/layout/animalsReturn.css`
- Create: `src/components/layout/AnimalsReturn.tsx`
- Test: `src/components/layout/animalsReturn.test.tsx`

**Interfaces:**
- Consumes: niente dalle task successive.
- Produces: `export function AnimalsReturn(): JSX.Element`. Nessuna prop. Link `replace` verso `/animali`, nome accessibile «Torna agli animali», classe `animals-return`.

- [ ] **Step 1: Write the failing test**

Creare `src/components/layout/animalsReturn.test.tsx`:

```tsx
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AnimalsReturn } from './AnimalsReturn'

describe('AnimalsReturn', () => {
  it('sostituisce la scheda con la lista ed è il pulsante in basso a destra', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Home</p> },
        { path: '/animali/:id', element: <AnimalsReturn /> },
        { path: '/animali', element: <p>Lista</p> },
      ],
      { initialEntries: ['/', '/animali/luna'], initialIndex: 1 },
    )
    render(<RouterProvider router={router} />)
    const link = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(link).toHaveAttribute('href', '/animali')
    expect(link).toHaveClass('animals-return')
    expect(link).toHaveTextContent('Animali')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await user.click(link)
    expect(await screen.findByText('Lista')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/animali')
    expect(router.state.historyAction).toBe('REPLACE')
    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/')

    const css = readFileSync(createRequire(import.meta.url).resolve('./animalsReturn.css'), 'utf8')
    expect(css).toContain('min-height: 48px')
    expect(css).toContain('min-width: 48px')
    expect(css).toContain('padding: 0 16px')
    expect(css).toContain('gap: 8px')
    expect(css).toContain('font-size: 15px')
    expect(css).toContain('font-weight: 700')
    expect(css).toContain('color: var(--tx)')
    expect(css).toContain('background: var(--card)')
    expect(css).toContain('border: 1px solid var(--line)')
    expect(css).toContain('border-radius: 16px')
    expect(css).toContain('box-shadow: var(--sh-2)')
    expect(css).toContain('z-index: 20')
    expect(css).toContain('bottom: calc(12px + env(safe-area-inset-bottom, 0px))')
    expect(css).toContain('right: max(12px, calc((100% - 640px) / 2 + 12px))')
    expect(css).toContain('.animals-return:active')
    expect(css).toContain('background: var(--surf)')
    expect(css).toContain('transition: background 120ms')
    expect(css).toContain('.animals-return:focus-visible')
    expect(css).toContain('outline: 2px solid var(--pri)')
    expect(css).toContain('outline-offset: 2px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/animalsReturn.test.tsx`

Expected: FAIL perché `./AnimalsReturn` non esiste.

- [ ] **Step 3: Write minimal implementation**

Creare `src/components/layout/animalsReturn.css`:

```css
.animals-return {
  position: fixed;
  z-index: 20;
  right: max(12px, calc((100% - 640px) / 2 + 12px));
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 48px;
  min-height: 48px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--tx);
  box-shadow: var(--sh-2);
  font-weight: 700;
  font-size: 15px;
  line-height: 1;
  font-family: inherit;
  text-decoration: none;
  transition: background 120ms;
  -webkit-tap-highlight-color: transparent;
}

.animals-return:active {
  background: var(--surf);
}

.animals-return:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
```

Creare `src/components/layout/AnimalsReturn.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import './animalsReturn.css'

export function AnimalsReturn() {
  return (
    <Link to="/animali" replace aria-label="Torna agli animali" className="animals-return">
      <ArrowLeft size={22} strokeWidth={2} aria-hidden />
      Animali
    </Link>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/animalsReturn.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/AnimalsReturn.tsx src/components/layout/animalsReturn.css src/components/layout/animalsReturn.test.tsx
git commit -m "feat: il ritorno alla lista sta in basso a destra"
```

---

### Task 2: La scheda usa il pulsante e la fascia esce

**Files:**
- Modify: `src/pages/DogPage.tsx` (import, `SchedaFrame`, i due `PhoneShell`)
- Modify: `src/components/layout/PhoneShell.tsx`
- Delete: `src/components/layout/BackBar.tsx`
- Test: `src/pages/shellPages.test.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `AnimalsReturn` da Task 1, senza prop.
- Produces: `function SchedaFrame({ children }: { children: ReactNode })` dentro `DogPage.tsx`, subito sopra `export function DogPage`. Disegna `PhoneShell`, un `div` con `data-testid="scheda"` e, dopo, `AnimalsReturn`. `PhoneShell` non accetta più `backTo`.

- [ ] **Step 1: Write the failing test**

In `src/pages/shellPages.test.tsx`, nel test «il campanello segna i mensili in arrivo e la riga di oggi apre la scheda», sostituire il blocco del ritorno:

```tsx
    const back = screen.getByRole('link', { name: 'Indietro' })
    expect(back.closest('header')).toBeNull()
    expect(screen.getByTestId('back-bar')).toContainElement(back)
    await user.click(back)
```

con:

```tsx
    const back = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(back.closest('header')).toBeNull()
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    expect(screen.getByTestId('scheda')).toBeInTheDocument()
    await user.click(back)
```

Nello stesso file, nel test «nuovo cane apre la scheda vuota», sostituire:

```tsx
    const back = screen.getByRole('link', { name: 'Indietro' })
    expect(back.closest('header')).toBeNull()
    expect(screen.getByTestId('back-bar')).toContainElement(back)
    await user.click(back)
```

con:

```tsx
    const back = screen.getByRole('link', { name: 'Torna agli animali' })
    expect(back.closest('header')).toBeNull()
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    expect(screen.getByTestId('scheda')).toBeInTheDocument()
    await user.click(back)
```

In `src/pages/DogsPage.test.tsx` sostituire tutte e 9 le occorrenze di:

```tsx
screen.getByRole('link', { name: 'Indietro' })
```

con:

```tsx
screen.getByRole('link', { name: 'Torna agli animali' })
```

Sono le righe dei test che escono dalla scheda (scorrimento della lista, Deceduto, Ripristina, modifica abbandonata, foto non salvata, prezzi, campi). In questo file non ci sono altri link «Indietro».

Rinominare i due titoli:

- `Indietro abbandona la modifica e un salvataggio fallito tiene il nome vecchio` diventa `Tornare agli animali abbandona la modifica e un salvataggio fallito tiene il nome vecchio`
- `Indietro abbandona una foto non salvata` diventa `Tornare agli animali abbandona una foto non salvata`

Nel test «un id sconosciuto non è una scheda vuota», dopo `expect(await screen.findByText('Cane assente')).toBeInTheDocument()` aggiungere:

```tsx
    expect(screen.getByRole('link', { name: 'Torna agli animali' })).toHaveAttribute('href', '/animali')
    expect(screen.queryByTestId('back-bar')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull()
    expect(screen.getByTestId('scheda')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx`

Expected: FAIL. I link «Torna agli animali» e `scheda` non ci sono; la fascia `back-bar` c'è ancora.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/DogPage.tsx`, aggiungere l'import accanto a quello di `PhoneShell`:

```tsx
import { AnimalsReturn } from '../components/layout/AnimalsReturn'
```

Subito sopra `export function DogPage` (riga 913) aggiungere:

```tsx
function SchedaFrame({ children }: { children: ReactNode }) {
  return (
    <PhoneShell>
      <div data-testid="scheda">{children}</div>
      <AnimalsReturn />
    </PhoneShell>
  )
}
```

`ReactNode` è già importato in questo file.

Sostituire il ritorno «Cane assente»:

```tsx
      <PhoneShell backTo="/animali">
        <Header title="Scheda" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
```

con:

```tsx
      <SchedaFrame>
        <Header title="Scheda" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </SchedaFrame>
```

Sostituire l'apertura del ritorno principale, `<PhoneShell backTo="/animali">`, con `<SchedaFrame>`, e la sua chiusura `</PhoneShell>` (quella in fondo al componente, dopo `CenteredPhoto`) con `</SchedaFrame>`.

Riscrivere `src/components/layout/PhoneShell.tsx` per intero. Non importa più `BackBar` e non accetta `backTo`. Il padding inferiore resta solo quando c'è la barra delle sezioni.

```tsx
import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BOTTOM_NAV_CONTENT_PAD, BottomNav } from './BottomNav'

export function PhoneShell({ fill = false, showNav = false, onFab, menuOpen = false, bell = false, children }: { fill?: boolean; showNav?: boolean; onFab?: () => void; menuOpen?: boolean; bell?: boolean; children: ReactNode }) {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual'
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 640, minHeight: fill ? 0 : '100dvh', height: fill ? '100dvh' : undefined, maxHeight: fill ? '100dvh' : undefined, overflow: fill ? 'hidden' : undefined, margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top)' }}>
      <div style={{ flex: 1, minHeight: fill ? 0 : undefined, overflow: fill ? 'hidden' : undefined, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? BOTTOM_NAV_CONTENT_PAD : 0 }}>{children}</div>
      {showNav ? <BottomNav onFab={onFab} menuOpen={menuOpen} bell={bell} /> : null}
    </div>
  )
}
```

Cancellare `src/components/layout/BackBar.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx src/components/layout/shell.test.tsx src/components/layout/animalsReturn.test.tsx`

Expected: PASS. I link «Indietro» di Impostazioni, listino e mensili non sono in questi file di scheda; non vanno modificati.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/components/layout/PhoneShell.tsx src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx
git add -u src/components/layout/BackBar.tsx
git commit -m "feat: la scheda torna alla lista senza la fascia Indietro"
```

---

### Task 3: Ingresso e spazio sotto il contenuto

**Files:**
- Create: `src/pages/schedaEnter.css`
- Modify: `src/pages/DogPage.tsx` (`SchedaFrame`)
- Test: `src/pages/schedaEnter.test.ts`
- Test: `src/pages/shellPages.test.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `SchedaFrame` da Task 2. Il `div` ha già `data-testid="scheda"`.
- Produces: lo stesso `div` con `className="scheda-enter"` e `style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}`. `DogPage.tsx` importa `./schedaEnter.css`.

- [ ] **Step 1: Write the failing test**

Creare `src/pages/schedaEnter.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

describe('ingresso scheda', () => {
  it('scivola di 16 px in 180 ms e sta ferma se i movimenti sono ridotti', () => {
    const css = readFileSync(createRequire(import.meta.url).resolve('./schedaEnter.css'), 'utf8')
    expect(css).toContain('@keyframes scheda-enter')
    expect(css).toContain('translateX(16px)')
    expect(css).toContain('translateX(0)')
    expect(css).toContain('animation: scheda-enter 180ms ease-out')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation: none')
  })
})
```

In `src/pages/shellPages.test.tsx`, nel test del campanello, dopo `expect(screen.getByTestId('scheda')).toBeInTheDocument()` aggiungere:

```tsx
    const scheda = screen.getByTestId('scheda')
    expect(scheda).toHaveClass('scheda-enter')
    expect(scheda.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
```

e togliere la riga `expect(screen.getByTestId('scheda')).toBeInTheDocument()` appena sostituita da queste tre, così `scheda` non viene letto due volte.

Nel test «nuovo cane apre la scheda vuota», la stessa sostituzione.

In `src/pages/DogsPage.test.tsx`, nel test «un id sconosciuto non è una scheda vuota», dopo `expect(screen.getByTestId('scheda')).toBeInTheDocument()` aggiungere:

```tsx
    const scheda = screen.getByTestId('scheda')
    expect(scheda).toHaveClass('scheda-enter')
    expect(scheda.getAttribute('style')).toContain('calc(72px + env(safe-area-inset-bottom, 0px))')
```

e togliere il `getByTestId('scheda')` precedente, sostituito da `scheda`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/schedaEnter.test.ts src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx`

Expected: FAIL. Manca `schedaEnter.css` e il `div` della scheda non ha classe né padding.

- [ ] **Step 3: Write minimal implementation**

Creare `src/pages/schedaEnter.css`:

```css
@keyframes scheda-enter {
  from { transform: translateX(16px); }
  to { transform: translateX(0); }
}

.scheda-enter {
  animation: scheda-enter 180ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .scheda-enter {
    animation: none;
  }
}
```

In `src/pages/DogPage.tsx`, accanto agli import di layout, aggiungere:

```tsx
import './schedaEnter.css'
```

Sostituire il `div` dentro `SchedaFrame` con:

```tsx
      <div className="scheda-enter" data-testid="scheda" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>{children}</div>
```

`SchedaFrame` resta l'unico involucro delle tre schermate, quindi l'animazione parte al montaggio della pagina e non quando si entra in modifica o si apre un foglio: quei cambiamenti non smontano `SchedaFrame`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/schedaEnter.test.ts src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx src/components/layout/animalsReturn.test.tsx`

Expected: PASS

Poi l'intera suite, per vedere che i link «Indietro» delle altre pagine reggono:

Run: `npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/schedaEnter.css src/pages/schedaEnter.test.ts src/pages/DogPage.tsx src/pages/shellPages.test.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: la scheda entra scivolando e lascia spazio al ritorno"
```
