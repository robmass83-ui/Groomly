# Logo e icona Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing Groomly SVGs on Home and on login, and use the rounded icon as the browser tab icon, without redrawing any file.

**Architecture:** Byte-for-byte copies live in `src/assets/brand/` and are imported by the screens. A second copy of the rounded icon lives in `public/groomly-icon.svg` and `index.html` points the tab at it. Login picks the stacked logo or the white-text logo with `resolveTheme(settings.theme, prefersDark())` on the first paint.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest 3. App tests use happy-dom. SVG imports are a string URL via `src/vite-env.d.ts` (`declare module '*.svg'`).

## Global Constraints

- Nessun tratto, colore o testo del disegno cambia. I file in `Icon and logo` non si modificano.
- Niente manifest, niente PNG, niente progetto Android in questo lavoro.
- Nessuna chiave `localStorage` nuova.
- Impostazioni resta la riga «Groomly v1.0», senza logo. Icone di servizio, carattere e segnali restano quelle del kit.
- I test di `App` tengono `// @vitest-environment happy-dom` come prima riga dove già c'è.
- In PowerShell non si usa `&&`.

---

## File structure

- `src/assets/brand/*.svg` — identical copies of the five source files. Screens import these. Two of them (`groomly-icon-fullbleed.svg`, `groomly-logo-orizzontale.svg`) are stored and not imported by a screen.
- `public/groomly-icon.svg` — the same bytes as `groomly-icon.svg`, served at `/groomly-icon.svg`.
- `src/brand.test.ts` — proves the copies match the originals, then proves `index.html` links the icon.
- `src/pages/HomePage.tsx` — 26×26 decorative icon in the existing header.
- `src/pages/shellPages.test.tsx` — asserts that header image.
- `src/pages/LoginPage.tsx` — centered logo above the existing heading.
- `src/pages/LoginPage.test.tsx` — asserts the light and dark logos.
- `index.html` — one `link rel="icon"`.

No new component and no new storage key.

### Task 1: Copy the five SVGs unchanged

**Files:**
- Create: `src/assets/brand/groomly-icon.svg`
- Create: `src/assets/brand/groomly-icon-fullbleed.svg`
- Create: `src/assets/brand/groomly-logo-verticale.svg`
- Create: `src/assets/brand/groomly-logo-scuro.svg`
- Create: `src/assets/brand/groomly-logo-orizzontale.svg`
- Create: `public/groomly-icon.svg`
- Test: `src/brand.test.ts`

**Interfaces:**
- Consumes: the five files already in `Icon and logo/`. Do not edit them.
- Produces: those paths. Each `import x from '../assets/brand/<file>.svg'` is a `string` (the URL Vite gives the file). Later tasks compare `img` `src` to that string.

- [ ] **Step 1: Write the failing test**

Create `src/brand.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

const names = [
  'groomly-icon.svg',
  'groomly-icon-fullbleed.svg',
  'groomly-logo-verticale.svg',
  'groomly-logo-scuro.svg',
  'groomly-logo-orizzontale.svg',
]

describe('marchio', () => {
  it('copia i cinque file senza cambiarli', () => {
    for (const name of names) {
      const original = readFileSync(path.join(root, 'Icon and logo', name))
      const copy = readFileSync(path.join(root, 'src', 'assets', 'brand', name))
      expect(Buffer.compare(original, copy)).toBe(0)
    }
    const icon = readFileSync(path.join(root, 'Icon and logo', 'groomly-icon.svg'))
    const published = readFileSync(path.join(root, 'public', 'groomly-icon.svg'))
    expect(Buffer.compare(icon, published)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/brand.test.ts`

Expected: FAIL. The message contains `ENOENT` because `src/assets/brand` and `public/groomly-icon.svg` are not there yet.

- [ ] **Step 3: Copy the bytes**

Run in PowerShell from the repo root. Do not open or re-save the SVGs.

```powershell
New-Item -ItemType Directory -Force -Path src/assets/brand | Out-Null
$names = @(
  'groomly-icon.svg',
  'groomly-icon-fullbleed.svg',
  'groomly-logo-verticale.svg',
  'groomly-logo-scuro.svg',
  'groomly-logo-orizzontale.svg'
)
foreach ($name in $names) {
  Copy-Item -LiteralPath (Join-Path 'Icon and logo' $name) -Destination (Join-Path 'src/assets/brand' $name)
}
Copy-Item -LiteralPath 'Icon and logo\groomly-icon.svg' -Destination 'public\groomly-icon.svg'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/brand.test.ts`

Expected: PASS (`copia i cinque file senza cambiarli`).

- [ ] **Step 5: Commit**

```powershell
git add -- src/brand.test.ts src/assets/brand public/groomly-icon.svg
git commit -m "test: copia i marchi SVG senza modificarli"
```

Do not stage `Icon and logo/`, `.superpowers/`, or other docs.

### Task 2: Browser tab icon

**Files:**
- Modify: `index.html`
- Modify: `src/brand.test.ts`
- Test: `src/brand.test.ts`

**Interfaces:**
- Consumes: `public/groomly-icon.svg` from Task 1, served as `/groomly-icon.svg`.
- Produces: `<link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />` in `index.html`.

- [ ] **Step 1: Write the failing test**

Add this `it` inside the existing `describe('marchio')` in `src/brand.test.ts`:

```ts
it('punta la scheda del browser all’icona rotonda', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8')
  expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/brand.test.ts`

Expected: FAIL on `punta la scheda del browser all’icona rotonda` because `index.html` has no such link. The copy test from Task 1 still passes.

- [ ] **Step 3: Add the link**

In `index.html`, inside `<head>`, after the viewport meta tag:

```html
<link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />
```

The head becomes:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />
  <title>Groomly</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/brand.test.ts`

Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```powershell
git add -- index.html src/brand.test.ts
git commit -m "feat: usa l'icona rotonda nella scheda del browser"
```

### Task 3: Home header mark

**Files:**
- Modify: `src/pages/HomePage.tsx` (import line and the header span around lines 2 and 101–114)
- Modify: `src/pages/shellPages.test.tsx`
- Test: `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: `import brandIcon from '../assets/brand/groomly-icon.svg'` (`string`).
- Produces: a decorative `img` in the Home `<header>`, `alt=""`, `width={26}`, `height={26}`, `src={brandIcon}`. The `<h1>Groomly</h1>` stays. `PawPrint` is removed from the lucide import.

- [ ] **Step 1: Write the failing test**

`src/pages/shellPages.test.tsx` already starts with `// @vitest-environment happy-dom`. Leave that as line 1. Add the import next to the other imports:

```ts
import brandIcon from '../assets/brand/groomly-icon.svg'
```

Add this `it` inside `describe('guscio')`:

```ts
it('mostra l’icona rotonda accanto al titolo', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<App memory isDev={false} />)
  await enter(user)
  const header = screen.getByRole('heading', { name: 'Groomly' }).closest('header')
  const img = header?.querySelector('img')
  expect(img).toHaveAttribute('src', brandIcon)
  expect(img).toHaveAttribute('alt', '')
  expect(img).toHaveAttribute('width', '26')
  expect(img).toHaveAttribute('height', '26')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/shellPages.test.tsx`

Expected: FAIL on `mostra l’icona rotonda accanto al titolo`. `img` is `null` because the header still draws a `PawPrint`, not an `img`. The other tests in the file still pass.

- [ ] **Step 3: Replace the paw box**

In `src/pages/HomePage.tsx`, change the lucide import to:

```ts
import { Bell, Settings } from 'lucide-react'
```

Add:

```ts
import brandIcon from '../assets/brand/groomly-icon.svg'
```

Replace the `<span aria-hidden …><PawPrint … /></span>` block in the header with:

```tsx
<img alt="" src={brandIcon} width={26} height={26} style={{ flex: 'none', display: 'block' }} />
```

Leave the title, the date, the bell link, and the settings link as they are. Do not wrap the image in a gradient box.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/pages/shellPages.test.tsx`

Expected: PASS, including `mostra l’icona rotonda accanto al titolo` and the existing Home heading assertions.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/HomePage.tsx src/pages/shellPages.test.tsx
git commit -m "feat: mette l'icona rotonda nell'intestazione della Home"
```

### Task 4: Login logo for light and dark

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/LoginPage.test.tsx`
- Test: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useSettings()` from `src/hooks/useSettings.tsx` (`settings.theme` is `'light' | 'dark' | 'auto'`). `resolveTheme(choice, systemPrefersDark)` and `prefersDark()` from `src/theme/theme.ts`. `resolveTheme` returns `'light' | 'dark'`. Imports: `logoVerticale` from `../assets/brand/groomly-logo-verticale.svg` and `logoScuro` from `../assets/brand/groomly-logo-scuro.svg`, both `string`. `createAccount`, `logout` from `src/data/local/auth.ts`. `setTheme(uid, theme)` from `src/data/local/settings.ts`.
- Produces: one `img` with accessible name `Groomly`, above the existing `<h1>`. Resolved light: `src` is `logoVerticale`, `width` 168. Resolved dark: `src` is `logoScuro`, `width` 220. No `height` attribute, so the file’s own ratio stands. `groomly-logo-orizzontale.svg` is not imported.

- [ ] **Step 1: Write the failing test**

`src/pages/LoginPage.test.tsx` already starts with `// @vitest-environment happy-dom`. Leave that as line 1. Add imports:

```ts
import logoScuro from '../assets/brand/groomly-logo-scuro.svg'
import logoVerticale from '../assets/brand/groomly-logo-verticale.svg'
import { createAccount, logout } from '../data/local/auth'
import { setTheme } from '../data/local/settings'
```

`src/test/setup.ts` already makes `matchMedia` report `matches: false`, so a theme of `auto` resolves to light. Add these tests inside `describe('login')`:

```ts
it('mostra il marchio verticale in chiaro', () => {
  render(<App memory isDev={false} />)
  const logo = screen.getByRole('img', { name: 'Groomly' })
  expect(logo).toHaveAttribute('src', logoVerticale)
  expect(logo).toHaveAttribute('width', '168')
  expect(logo).not.toHaveAttribute('height')
  const heading = screen.getByRole('heading', { name: 'Crea accesso' })
  expect(logo.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})

it('mostra il marchio a testo bianco quando il tema salvato è scuro', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  logout()
  setTheme(account.uid, 'dark')
  render(<App memory isDev={false} />)
  const logo = screen.getByRole('img', { name: 'Groomly' })
  expect(logo).toHaveAttribute('src', logoScuro)
  expect(logo).toHaveAttribute('width', '220')
  expect(logo).not.toHaveAttribute('height')
  const heading = screen.getByRole('heading', { name: 'Entra' })
  expect(logo.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})
```

`logout()` removes `groomly.session`, so the screen is login. `setTheme` writes the existing settings document; it does not add a storage key.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/LoginPage.test.tsx`

Expected: FAIL. Both new tests throw `Unable to find an accessible element with the role "img" and name "Groomly"`. The existing login tests still pass.

- [ ] **Step 3: Show the logo**

In `src/pages/LoginPage.tsx` add:

```ts
import logoScuro from '../assets/brand/groomly-logo-scuro.svg'
import logoVerticale from '../assets/brand/groomly-logo-verticale.svg'
import { useSettings } from '../hooks/useSettings'
import { prefersDark, resolveTheme } from '../theme/theme'
```

Inside `LoginPage`, after the `creating` line:

```ts
const { settings } = useSettings()
const dark = resolveTheme(settings.theme, prefersDark()) === 'dark'
```

As the first child of the `<form>`, before the `<h1>`:

```tsx
<img
  alt="Groomly"
  src={dark ? logoScuro : logoVerticale}
  width={dark ? 220 : 168}
  style={{ display: 'block', height: 'auto', margin: '0 auto' }}
/>
```

Do not import `groomly-logo-orizzontale.svg`. Do not add an error fallback. The form fields and the submit button stay as they are.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/pages/LoginPage.test.tsx`

Expected: PASS, including the two new tests and the existing login tests.

Then run the touched suites together:

```powershell
npm test -- src/brand.test.ts src/pages/shellPages.test.tsx src/pages/LoginPage.test.tsx src/pages/SettingsPage.test.tsx
```

Expected: PASS. Settings still shows `Groomly v1.0` and has no logo image from this work.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx
git commit -m "feat: mostra il marchio nella schermata di accesso"
```
