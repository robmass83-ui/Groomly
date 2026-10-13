# Listino file UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Listino prezzi, «Aggiungi file» sta in alto a destra nella card e ogni riga file mostra un occhio decorativo vicino al nome per far capire che il click apre il file.

**Architecture:** Solo layout in `ListinoPage`: la riga del bottone viene prima dell’elenco (allineata a destra); nel `Link` del nome si aggiunge Lucide `Eye` con `aria-hidden`. Nessun cambio a dati, route o salvataggio.

**Tech Stack:** React + TypeScript, Lucide React, Vitest + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-13-listino-file-ui-design.md`

## Global Constraints

- U1–U4 della spec: bottone in alto a destra; occhio solo indizio; aprire = click sul link nome; matita e cestino invariati.
- L’occhio non è un `IconButton` e non ha `aria-label` proprio (`aria-hidden` sull’SVG).
- I test che usano `getByRole('link', { name: '….pdf' })` devono continuare a passare (nome accessibile = solo `fileName`).
- Lingua UI: italiano. Stile come il codice intorno.
- Comandi: `npx vitest run src/pages/listino.test.tsx`, poi `npm test` se richiesto dalla pubblicazione. Shell: PowerShell, cartella `d:\Groomly`.
- Non committare `.cursor/rules/rapporto-consumi.mdc`, `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`. `git add` con percorsi espliciti.
- A fine aggiornamento consegnato: regola workspace `publish-update` (versione, APK, release, Firebase).

---

## File Structure

| File | Responsabilità |
|---|---|
| Modify `src/pages/ListinoPage.tsx` | Layout bottone + icona `Eye` nel link |
| Modify `src/pages/listino.test.tsx` | Assert posizione bottone e occhio nel link |

---

### Task 1: Test e UI card file (bottone in alto + occhio)

**Files:**
- Modify: `src/pages/listino.test.tsx`
- Modify: `src/pages/ListinoPage.tsx`
- Test: `src/pages/listino.test.tsx`

**Interfaces:**
- Consumes: `listPriceFiles`, route `/listino/vedi?id=…`, `Button`, `Link`, Lucide
- Produces: stesso comportamento upload/rinomina/elimina/apri; solo layout e affordance

- [ ] **Step 1: Write the failing test**

In `src/pages/listino.test.tsx`, dopo il test che mostra prezzi attivi (o vicino agli altri assert sulla card file), aggiungi:

```tsx
  it('Aggiungi file è in alto a destra e la riga file ha un occhio nel link', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale'))
    render(<App memory isDev={false} initialPath="/listino" />)
    const add = await screen.findByRole('button', { name: 'Aggiungi file' })
    const link = await screen.findByRole('link', { name: 'attuale.pdf' })
    expect(add.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(add.parentElement?.getAttribute('style') ?? '').toMatch(/justify-content:\s*(flex-end|end)/)
    expect(link.querySelector('svg')).not.toBeNull()
  })
```

Se con file seedati non c’è più «Nessun file», va bene: il confronto DOM è bottone prima del link. Con zero file il bottone resta comunque sopra «Nessun file» (copertura implicita se estendi, altrimenti basta questo caso).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/listino.test.tsx -t "Aggiungi file è in alto"`

Expected: FAIL (bottone ancora sotto le righe e/o nessun `svg` nel link del nome).

- [ ] **Step 3: Write minimal implementation**

In `src/pages/ListinoPage.tsx`:

1. Import: `import { Eye, FileText, Pencil, Trash2 } from 'lucide-react'`

2. Dentro `<Card>`, **prima** dell’elenco / «Nessun file»:

```tsx
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '9px' }}>
            <Button size="sm" onClick={() => addRef.current?.click()}>Aggiungi file</Button>
          </div>
```

3. Rimuovi il blocco bottone che oggi sta **dopo** le righe (il `div` con solo «Aggiungi file» in basso).

4. Nel `Link` del nome, dopo `{file.fileName}`:

```tsx
                    <Link
                      to={`/listino/vedi?id=${encodeURIComponent(file.id)}`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        overflowWrap: 'anywhere',
                        fontWeight: 700,
                        fontSize: TYPE.rowTitle,
                        color: 'var(--tx)',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{file.fileName}</span>
                      <Eye size={14} strokeWidth={2} aria-hidden style={{ flex: 'none', color: 'var(--tx3)' }} />
                    </Link>
```

Matita e cestino restano fuori dal link, come oggi. In modalità rinomina non mostrare l’occhio (già escluso perché c’è l’`input`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/listino.test.tsx`

Expected: PASS (incluso il nuovo test e i link per nome file).

- [ ] **Step 5: Commit (quando autorizzato / a pubblicazione)**

```powershell
git add src/pages/ListinoPage.tsx src/pages/listino.test.tsx docs/superpowers/specs/2026-10-13-listino-file-ui-design.md docs/superpowers/plans/2026-10-13-listino-file-ui.md
git commit -m "$(cat <<'EOF'
fix(listino): Aggiungi file in alto a destra e occhio sul nome

EOF
)"
```

Poi, a lavoro consegnato: bump versione + `publish-update` (test completi, build, APK, release GitHub, Firebase).

---

## Spec coverage (self-review)

| Spec | Task |
|---|---|
| U1 bottone alto destra | Task 1 |
| U2 occhio indizio | Task 1 |
| U3 click nome apre | invariato, Task 1 |
| U4 matita/cestino | invariato |
| Fuori scope riga intera / bottone occhio | rispettato |
| Verifica test | Task 1 Step 1–4 |
