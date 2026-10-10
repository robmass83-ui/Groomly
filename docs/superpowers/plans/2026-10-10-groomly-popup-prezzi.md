# Popup al centro e prezzi compatti — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** I form da compilare si aprono in un riquadro al centro, e lo switch «nascondi» dei prezzi personalizzati sta sulla stessa riga del servizio.

**Architecture:** Un componente nuovo, `Dialog`, disegna overlay, velo, titolo, ✕ e corpo scrollabile. `Sheet` non si modifica. Contatto, Tag, Campo, Attività, Campi scheda, Tag caratteristiche e il form servizio sostituiscono il tag `Sheet` con `Dialog` e lasciano figli, titoli e salvataggio com’è. `PriceEditor` cambia solo la griglia della riga.

**Tech Stack:** React 18, TypeScript, Vitest 3, Testing Library, happy-dom, lucide-react. I test di pagina hanno `// @vitest-environment happy-dom` in cima.

## Global Constraints

- `Sheet` non cambia: resta attaccato in basso, con maniglia, swipe e raggio solo in alto.
- `Dialog` ha solo `open`, `title`, `onClose`, `children`. `open` falso non disegna nulla.
- Passano a `Dialog`: Contatto, Tag, Campo, Attività, Campi scheda, Tag caratteristiche, Nuovo servizio, Modifica servizio.
- Restano `Sheet`: il +, Ordina, la scheda appuntamento, Altre azioni, Elimina, Chi disdice, Archivia, il menu Scheda, la foto, «Prezzo», «Orario già occupato», «Appuntamento già fissato», «Ripristina», l’avviso di aggiornamento, il foglio di prova in DevKit.
- Campi, testi dei bottoni, validazione e dati salvati non cambiano. Chiudere butta la bozza. Niente «chiudere senza salvare». Niente cambio di indirizzo, niente storia, niente ascolto del tasto Indietro.
- Overlay: `z-index` 30, `align-items: center`, `justify-content: center`, padding 16, velo `rgba(12,15,21,.45)`.
- Il riquadro ha `role="dialog"`, `aria-modal="true"`, `aria-label` uguale al titolo, `tabIndex={-1}`, fondo `var(--card)`, padding 12, larghezza `min(100%, 390px)`, altezza massima `min(90dvh, calc(100dvh - 32px))`, `border-radius: 18px`. Niente altezza fissa e niente animazione.
- L’unico bottone «Chiudi» è la ✕, 30×30, raggio 9, fondo `var(--surf)`, icona X da 16. Il velo è un `div` con `data-testid="dialog-backdrop"` e `aria-hidden="true"`.
- Il corpo è una colonna con gap 9, `overflow: auto`, `min-height: 0`. Titolo e ✕ non scorrono. All’apertura il focus va sul riquadro, non sul primo campo, e non torna al bottone che aveva aperto. Esc chiama `onClose`.
- Riga prezzi: griglia `36px 1fr 76px 76px`, gap 6, `min-height` 44. Switch 36×22 con etichetta «nascondi questo servizio per questo cane». La frase non è testo visibile. Nome con `min-width: 0`, senza a capo, con puntini. Etichette nascoste «Prezzo …» e «Durata …» restano. Input alti 34, colonne 76. Lista con gap 8, senza scroll proprio. Lo switch non disattiva i campi.
- In PowerShell non si usa `&&`.
- Nel working tree ci sono modifiche non di questo piano (foto e galleria, versione APK). Ogni commit aggiunge solo i file elencati nel passo.

---

## File structure

- `src/components/layout/Dialog.tsx` — il riquadro al centro. Non sa quali form contiene.
- `src/components/layout/dialog.test.tsx` — comportamento del riquadro, senza pagine.
- `src/components/layout/Sheet.tsx` — invariato. I menu continuano a usarlo.
- `src/pages/DogPage.tsx` — Contatto, Tag e Campo usano `Dialog`. `PriceEditor` è la riga unica. Gli altri `Sheet` del file restano.
- `src/pages/DogsPage.test.tsx` — il contatto non ha la maniglia; la riga Bagno tiene switch e prezzo.
- `src/pages/SettingsPage.tsx` — Attività, Campi scheda e Tag caratteristiche usano `Dialog`. Ripristina resta `Sheet`.
- `src/pages/SettingsPage.test.tsx` — quei tre non hanno la maniglia; «Chiudi» è uno solo.
- `src/pages/ServicesPage.tsx` — Nuovo servizio e Modifica servizio usano `Dialog`.
- `src/pages/ServicesPage.test.tsx` — il dialogo dopo il salvataggio fallito non ha la maniglia.

`Dialog` non importa `Sheet`. La riga prezzi non importa `Dialog`.

### Task 1: Dialog

**Files:**
- Create: `src/components/layout/Dialog.tsx`
- Create: `src/components/layout/dialog.test.tsx`
- Test: `src/components/layout/chrome.test.tsx` (si esegue, non si modifica)

**Interfaces:**
- Consumes: `SIZES.headerIconBtn` (30), `SIZES.headerIconRadius` (9) da `src/theme/sizes.ts`. L’icona `X` di `lucide-react`.
- Produces: `export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

Creare `src/components/layout/dialog.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

function Harness({ initial = true }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Apri</button>
      <Dialog open={open} title="Contatto" onClose={() => setOpen(false)}>
        <input aria-label="Nome contatto" />
        <p>Dentro</p>
      </Dialog>
    </>
  )
}

describe('popup', () => {
  it('da chiuso non c’è', () => {
    render(<Dialog open={false} title="Contatto" onClose={() => undefined}><p>Dentro</p></Dialog>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('è centrato, senza maniglia, con un solo Chiudi', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Contatto' })
    expect(screen.queryByTestId('sheet-grabber')).toBeNull()
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(dialog.parentElement?.getAttribute('style')).toContain('justify-content: center')
    expect(dialog.parentElement?.getAttribute('style')).toContain('z-index: 30')
    expect(dialog.parentElement?.getAttribute('style')).toContain('padding: 16px')
    const style = dialog.getAttribute('style') ?? ''
    expect(style).toMatch(/border-radius:\s*18px(;|$)/)
    expect(style).toContain('max-height: min(90dvh, calc(100dvh - 32px))')
    expect(style).not.toMatch(/(^|[^-])height: \d/)
    expect(dialog).toHaveAttribute('tabindex', '-1')
    expect(dialog).toHaveFocus()
    expect(screen.getByLabelText('Nome contatto')).not.toHaveFocus()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
    const body = screen.getByText('Dentro').parentElement
    expect(body?.getAttribute('style')).toContain('overflow: auto')
    expect(body?.getAttribute('style')).toContain('gap: 9px')
    expect(body?.getAttribute('style')).toContain('min-height: 0')
    const backdrop = screen.getByTestId('dialog-backdrop')
    expect(backdrop.tagName).toBe('DIV')
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  })

  it('✕, velo ed Esc chiudono; un click nel riquadro no', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('heading', { name: 'Contatto' }))
    expect(screen.getByRole('dialog', { name: 'Contatto' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByTestId('dialog-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Esc da chiuso non chiama onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Dialog open={false} title="Contatto" onClose={onClose}><p>Dentro</p></Dialog>)
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('non ruba il focus al campo mentre resta aperto', () => {
    const { rerender } = render(
      <Dialog open title="Contatto" onClose={() => undefined}><input aria-label="Nome contatto" /></Dialog>,
    )
    const field = screen.getByLabelText('Nome contatto')
    field.focus()
    rerender(<Dialog open title="Contatto" onClose={() => undefined}><input aria-label="Nome contatto" /></Dialog>)
    expect(field).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/dialog.test.tsx`

Expected: FAIL, cannot find module `./Dialog`.

- [ ] **Step 3: Write minimal implementation**

Creare `src/components/layout/Dialog.tsx`:

```tsx
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div data-testid="dialog-backdrop" aria-hidden="true" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,15,21,.45)' }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          position: 'relative',
          width: 'min(100%, 390px)',
          maxHeight: 'min(90dvh, calc(100dvh - 32px))',
          background: 'var(--card)',
          borderRadius: 18,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflow: 'auto', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
```

Il focus sta nell’effetto con dipendenza solo `open`, e `onClose` sta in un ref: un nuovo `onClose` del genitore non riporta il focus sul riquadro. Non salvare `document.activeElement` e non rimetterlo a fuoco. Non ascoltare `popstate`. Non animare.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/dialog.test.tsx src/components/layout/chrome.test.tsx`

Expected: PASS. Il test del foglio resta su `max-height: 90vh` e senza altezza fissa.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/Dialog.tsx src/components/layout/dialog.test.tsx
git commit -m "feat: aggiunge il popup centrato per i form"
```

### Task 2: Contatto, Tag e Campo

**Files:**
- Modify: `src/pages/DogPage.tsx` (import, `ContactSheet`, `TagSheet`, `FieldSheet`)
- Modify: `src/pages/DogsPage.test.tsx` (test «un contatto aggiunto in modifica compare dopo Salva e entra nella searchKey»)
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `Dialog` dal Task 1, con `open`, `title`, `onClose`, `children`.
- Produces: niente. `ContactSheet`, `TagSheet` e `FieldSheet` restano funzioni locali. I loro state, `commit` e i `useEffect` che svuotano la bozza non si spostano.

- [ ] **Step 1: Write the failing test**

In `src/pages/DogsPage.test.tsx`, nel test `un contatto aggiunto in modifica compare dopo Salva e entra nella searchKey`, subito dopo il click su `+ Contatto` e prima di scrivere «Giulia», inserire:

```tsx
    const contatto = screen.getByRole('dialog', { name: 'Contatto' })
    expect(within(contatto).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(contatto.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(contatto.getAttribute('style') ?? '').toMatch(/border-radius:\s*18px(;|$)/)
```

`within` è già importato in quel file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "un contatto aggiunto in modifica"`

Expected: FAIL, perché il foglio ha `sheet-grabber` e `align-items: flex-end`.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/DogPage.tsx`, accanto all’import di `Sheet`, aggiungere:

```tsx
import { Dialog } from '../components/layout/Dialog'
```

Lasciare l’import di `Sheet`: menu, archivio, foto e «Prezzo» lo usano ancora.

Sostituire solo il tag esterno. `ContactSheet` diventa:

```tsx
  return (
    <Dialog open={open} title="Contatto" onClose={onClose}>
      <Input label="Nome contatto" autoCapitalize="words" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="Telefono contatto" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <div role="group" aria-label="Ruolo" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {roleChoices(dogs).map((choice) => (
          <button key={choice} type="button" aria-pressed={role === choice} onClick={() => setRole(role === choice ? '' : choice)} style={{ ...sheetAction, width: 'auto', color: role === choice ? 'var(--pri)' : 'inherit' }}>{choice}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi contatto</button>
    </Dialog>
  )
```

`TagSheet` diventa:

```tsx
  return (
    <Dialog open={open} title="Tag" onClose={onClose}>
      <Input label="Tag" autoCapitalize="words" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {tagChoices(dogs, suggestions).map((tag) => (
          <button key={tag} type="button" onClick={() => commit(tag)} style={{ ...sheetAction, width: 'auto' }}>{tag}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={() => commit(draft)}>Aggiungi tag</button>
    </Dialog>
  )
```

`FieldSheet` diventa:

```tsx
  return (
    <Dialog open={open} title="Campo" onClose={onClose}>
      <Input label="Etichetta campo" autoCapitalize="sentences" autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input label="Valore campo" autoCapitalize="sentences" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi campo</button>
    </Dialog>
  )
```

`commit` e il `useEffect` che svuota etichetta e valore restano sopra questo return.

Non toccare gli altri `Sheet` di `DogPage.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "un contatto aggiunto in modifica"`

Expected: PASS. «Aggiungi contatto» e la `searchKey` restano quelli del test.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: apre contatto, tag e campo nel popup"
```

Se `DogPage.tsx` ha altre modifiche non di questo task, non metterle in questo commit. Spezzare con `git add -p` non è disponibile: in quel caso copiare da parte le modifiche estranee, committare solo il cambio dei tre tag, poi rimetterle.

### Task 3: Impostazioni

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (tre fogli form; Ripristina no)
- Modify: `src/pages/SettingsPage.test.tsx` (test «rinomina i campi, aggiunge i tag e apre l’archivio col conteggio»)
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `Dialog` dal Task 1.
- Produces: niente. `saveBusiness`, `saveLabels` e `addSuggestion` restano.

- [ ] **Step 1: Write the failing test**

In quel test, subito dopo `render` e dopo aver trovato «1 in archivio», prima del click su Archivio, inserire:

```tsx
    await user.click(screen.getByRole('button', { name: 'Modifica attività' }))
    const business = screen.getByRole('dialog', { name: 'Attività' })
    expect(within(business).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
```

Dopo `await user.click(screen.getByRole('button', { name: /Campi scheda/ }))` inserire:

```tsx
    expect(within(screen.getByRole('dialog', { name: 'Campi scheda' })).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
```

Dopo `await user.click(screen.getByRole('button', { name: /Tag caratteristiche/ }))` inserire:

```tsx
    expect(within(screen.getByRole('dialog', { name: 'Tag caratteristiche' })).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
```

Il click su «Chiudi» che il test ha già, più in basso, resta dov’è.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx -t "rinomina i campi"`

Expected: FAIL su `sheet-grabber` dentro il dialogo Attività.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx` aggiungere:

```tsx
import { Dialog } from '../components/layout/Dialog'
```

Tenere l’import di `Sheet`.

I tre blocchi diventano `Dialog` con gli stessi figli. Ripristina resta `Sheet`.

```tsx
      <Dialog open={businessOpen} title="Attività" onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label="Partita IVA" value={businessDraft.vatNumber} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Telefono" value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label="Indirizzo" value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <Button onClick={saveBusiness}>Salva</Button>
      </Dialog>
      <Dialog open={labelsOpen} title="Campi scheda" onClose={() => setLabelsOpen(false)}>
        {FIELD_EDITOR.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={labelDraft[field.key]}
            onChange={(event) => setLabelDraft({ ...labelDraft, [field.key]: event.target.value })}
          />
        ))}
        <Button onClick={saveLabels}>Salva</Button>
      </Dialog>
      <Dialog open={tagsOpen} title="Tag caratteristiche" onClose={() => setTagsOpen(false)}>
        <SuggestionList label="Tag" addLabel="Aggiungi tag" values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
        <SuggestionList label="Strumenti" addLabel="Aggiungi strumento" values={settings.toolSuggestions} onAdd={(value) => addSuggestion('toolSuggestions', value)} onRemove={(value) => removeSuggestion('toolSuggestions', value)} />
        <SuggestionList label="Prodotti" addLabel="Aggiungi prodotto" values={settings.productSuggestions} onAdd={(value) => addSuggestion('productSuggestions', value)} onRemove={(value) => removeSuggestion('productSuggestions', value)} />
      </Dialog>
```

Il `Sheet` di titolo «Ripristina» non si tocca.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx -t "rinomina i campi"`

Expected: PASS. Il rinomino dei campi, i tre suggerimenti e il click «Chiudi» che chiude i tag restano verdi.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: apre i form delle impostazioni nel popup"
```

### Task 4: Servizio

**Files:**
- Modify: `src/pages/ServicesPage.tsx`
- Modify: `src/pages/ServicesPage.test.tsx` (test «se la scrittura fallisce lascia il nome precedente»)
- Test: `src/pages/ServicesPage.test.tsx`

**Interfaces:**
- Consumes: `Dialog` dal Task 1.
- Produces: niente. `ServiceSheet` e `submit` restano. Il titolo resta «Nuovo servizio» o «Modifica servizio».

- [ ] **Step 1: Write the failing test**

Nel test `se la scrittura fallisce lascia il nome precedente`, sostituire la riga

```tsx
    expect(screen.getByRole('dialog')).toBeInTheDocument()
```

con:

```tsx
    const dialog = screen.getByRole('dialog', { name: 'Modifica servizio' })
    expect(within(dialog).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
```

`within` è già importato.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ServicesPage.test.tsx -t "se la scrittura fallisce"`

Expected: FAIL, il foglio contiene `sheet-grabber`.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/ServicesPage.tsx` sostituire l’import di `Sheet` con:

```tsx
import { Dialog } from '../components/layout/Dialog'
```

E il foglio in fondo al return con:

```tsx
      <Dialog
        open={editing !== null}
        title={editing === 'new' ? 'Nuovo servizio' : 'Modifica servizio'}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <ServiceSheet
            mode={editing === 'new' ? 'create' : 'edit'}
            initial={editing === 'new' ? undefined : editing}
            onSubmit={submit}
          />
        ) : null}
      </Dialog>
```

Non cambiare `ServiceSheet.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ServicesPage.test.tsx`

Expected: PASS, entrambi i test del file. Il dialogo resta aperto quando `setItem` lancia.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx
git commit -m "feat: apre il servizio nel popup"
```

### Task 5: Prezzi su una riga

**Files:**
- Modify: `src/pages/DogPage.tsx` (`PriceEditor` soltanto)
- Modify: `src/pages/DogsPage.test.tsx` (test «i prezzi personalizzati chiusi non scrivono nulla, aperti salvano solo lo scostamento e lo switch nasconde il servizio»)
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: niente da `Dialog`. `Toggle`, `HiddenLabel`, `smallInput`, `shownQuote`, `listPrice`, `ServiceIcon`, `SIZES.row.minH`, `TYPE` restano quelli già nel file.
- Produces: la stessa firma di `PriceEditor`. `onToggleHidden` e `onEdit` non cambiano significato.

- [ ] **Step 1: Write the failing test**

In quel test, dopo `expect(screen.getByText('Durata min')).toBeInTheDocument()` e dopo aver preso `price`, inserire prima di `await user.type(price, '25')`:

```tsx
    const bagno = screen.getByRole('group', { name: 'Bagno' })
    expect(bagno).toContainElement(price)
    expect(bagno.getAttribute('style')).toContain('grid-template-columns: 36px 1fr 76px 76px')
    expect(screen.queryByText('nascondi questo servizio per questo cane')).toBeNull()
    expect(within(bagno).getByText('Bagno').getAttribute('style')).toContain('min-width: 0')
    expect(within(bagno).getByText('Bagno').getAttribute('style')).toContain('text-overflow: ellipsis')
```

Dopo il click sullo switch e prima di Salva, inserire:

```tsx
    expect(price).not.toBeDisabled()
```

Il click sullo switch resta:

```tsx
    await user.click(within(bagno).getByRole('switch', { name: 'nascondi questo servizio per questo cane' }))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "i prezzi personalizzati chiusi"`

Expected: FAIL. Oggi il gruppo è una colonna e la frase è un nodo di testo.

- [ ] **Step 3: Write minimal implementation**

Sostituire il `return` di `PriceEditor` in `src/pages/DogPage.tsx` con:

```tsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, color: 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 600 }}>
        <span />
        <span />
        <span>Prezzo €</span>
        <span>Durata min</span>
      </div>
      {active.map((service) => {
        const shown = shownQuote(service, dog, edits)
        const list = listPrice(service, size)
        const priceId = `prezzo-${service.id}`
        const durationId = `durata-${service.id}`
        return (
          <div key={service.id} role="group" aria-label={service.name} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, alignItems: 'center', minHeight: SIZES.row.minH }}>
            <Toggle checked={hidden.includes(service.id)} onChange={() => onToggleHidden(service.id)} label="nascondi questo servizio per questo cane" />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              <span style={{ fontWeight: 600, fontSize: TYPE.base, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</span>
            </span>
            <span>
              <HiddenLabel htmlFor={priceId}>{`Prezzo ${service.name}`}</HiddenLabel>
              <input id={priceId} inputMode="decimal" autoComplete="off" placeholder={list.price} value={shown.price} onChange={(event) => onEdit(service.id, { price: event.target.value, duration: shown.duration })} style={smallInput} />
            </span>
            <span>
              <HiddenLabel htmlFor={durationId}>{`Durata ${service.name}`}</HiddenLabel>
              <input id={durationId} inputMode="numeric" autoComplete="off" placeholder={list.duration} value={shown.duration} onChange={(event) => onEdit(service.id, { price: shown.price, duration: event.target.value })} style={smallInput} />
            </span>
          </div>
        )
      })}
    </div>
  )
```

Non mettere `disabled` sugli input. Non dare `overflow` al contenitore della lista. Non cambiare `onEdit` né `onToggleHidden`.

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx vitest run src/pages/DogsPage.test.tsx -t "i prezzi personalizzati chiusi"
npx vitest run src/pages/DogsPage.test.tsx -t "un contatto aggiunto in modifica"
npx vitest run src/components/layout/dialog.test.tsx src/components/layout/chrome.test.tsx src/pages/ServicesPage.test.tsx
npx vitest run src/pages/SettingsPage.test.tsx -t "rinomina i campi"
npx vitest run src/pages/AppointmentPage.test.tsx -t "swipe"
```

Expected: PASS. L’ultimo comando controlla che i fogli dell’appuntamento, maniglia compresa, non siano stati toccati. Se `-t "swipe"` non trova test, eseguire `npx vitest run src/pages/AppointmentPage.test.tsx` e aspettarsi PASS lo stesso.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: mette lo switch dei prezzi sulla riga del servizio"
```

Se il Task 2 non ha potuto committare `DogPage.tsx` pulito, questo commit contiene sia i tre `Dialog` sia `PriceEditor`. Il messaggio allora è uno solo e descrive entrambe le cose: `feat: apre i form della scheda nel popup e compatta i prezzi`. Non committare le modifiche di foto e galleria.
