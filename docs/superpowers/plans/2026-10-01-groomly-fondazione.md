# Groomly ciclo 1 — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un’app Vite in italiano, per una sola toelettatrice, con login locale, tema e catalogo servizi salvati sul dispositivo nella forma Firestore.

**Architecture:** Le pagine parlano solo con gli hook. Gli hook parlano solo con i repository in `src/data/local`. L’adapter scrive su `localStorage`. Il dominio usa `Date`; lo storage usa stringhe ISO. `src/lib/firebase.ts` non si crea.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6, react-hook-form, Zod 3, date-fns 4, lucide-react, Vitest, React Testing Library, jsdom.

Directory di lavoro: `D:\Groomly`. Shell: PowerShell. Il repository git esiste già (commit della specifica). Non committare `GROOMLY.md`, `groomly-design.html`, `groomly-cursor-kit.zip`.

## Global Constraints

Ogni task include queste regole. I valori sono quelli della specifica `docs/superpowers/specs/2026-10-01-groomly-fondazione-design.md`.

- Interfaccia solo in italiano.
- Euro: `€ 25` se intero, `€ 10,50` se ha decimali. Simbolo, spazio, numero `it-IT`. Vietato il formato `Intl` currency `25,00 €`.
- Password minima 8 caratteri. PBKDF2-SHA-256, 100000 iterazioni, sale 16 byte, chiave 32 byte, sale e hash in base64. La password in chiaro non si scrive e non si logga.
- Un solo account. Email salvata in minuscolo, senza spazi esterni.
- Chiavi: `groomly.auth`, `groomly.session` (uid grezzo, non JSON), `groomly.users.{uid}.settings`, `groomly.users.{uid}.services`.
- Tema: `light` | `dark` | `auto`. Se il documento manca, crearlo con `auto`. `auto` segue `prefers-color-scheme` via JavaScript. Il CSS non usa `@media (prefers-color-scheme)`.
- Colonna centrata `max-width: 390px` su sfondo `--bg`. A 360 px nessuno scroll orizzontale.
- Toast 2 secondi. «Salvato» ha il check verde. «In arrivo» e «Salvataggio non riuscito» no.
- Seed di 8 servizi, id stabili, `order` 0–7, extra con lo stesso numero sulle tre taglie, nodi a prezzo 5. Il seed parte solo se la mappa è assente o vuota.
- Il tipo di un servizio si sceglie solo in creazione. Nessuna azione Elimina. Disattivare è consentito anche per l’ultimo servizio attivo.
- `/dev/kit` esiste solo se `import.meta.env.DEV` è true. Nessun link nel menu.
- date-fns locale `it`, `weekStartsOn: 1`. Font Inter. Lucide `strokeWidth={2}`.
- Non creare `src/lib/firebase.ts`. Non implementare cani, calendario, mensili, listino PDF, backup, campanello, attività, campi, tag, archivio, microchip, messaggi ai clienti.
- `bottomNav.fabRadius` non è nel blocco §4.3: vale 14, dal §3 di `GROOMLY.md`. I raggi avatar (8 / 10 / 12 / 20 / 14) sono il commento del §4.3.

## File map

| File | Responsabilità |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/index.css`, `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `.gitignore` | Tooling |
| `src/theme/tokens.css` | Colori §4.1 |
| `src/theme/sizes.ts` | Misure §4.3 più `fabRadius` e raggi avatar |
| `src/theme/theme.ts` | Tipografia, `resolveTheme`, `applyTheme`, `prefersDark` |
| `src/lib/format.ts` | Euro, data Home, opzioni date-fns |
| `src/lib/password.ts` | PBKDF2 e confronto |
| `src/data/errors.ts` | `AppError` e i codici |
| `src/data/local/storage.ts` | Lettura/scrittura JSON e scan chiavi illeggibili |
| `src/data/local/auth.ts` | Account, sessione, `reconcileSession` |
| `src/data/local/settings.ts` | Tema |
| `src/types/models.ts` | `Service`, input, patch, chiavi icona |
| `src/lib/schemas.ts` | Zod login e servizio |
| `src/lib/serviceSummary.ts` | Sintesi durata, prezzo, sottotitolo |
| `src/data/seed/services.ts` | Gli 8 servizi |
| `src/data/local/services.ts` | CRUD e seed |
| `src/assets/icons/**` | SVG del kit e `icons.ts` |
| `src/components/ui/*` | Controlli |
| `src/components/layout/*` | Guscio, header, barra, sheet, toast |
| `src/components/domain/*` | Avatar, carattere, icona servizio |
| `src/hooks/*` | Sessione, tema, servizi |
| `src/app/router.tsx` | `buildRoutes(isDev)` |
| `src/app/providers.tsx` | Provider |
| `src/app/App.tsx` | Radice |
| `src/pages/*` | Login, Home, Placeholder, Settings, Services, ServiceSheet, DevKit |

---

### Task 1: Tooling, token, formattazione

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/index.css`, `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `.gitignore`, `src/theme/tokens.css`, `src/theme/sizes.ts`, `src/theme/theme.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/app/App.tsx` (segnaposto sostituito nel Task 8)

**Interfaces:**
- Consumes: niente
- Produces:
  - `formatEuro(amount: number): string`
  - `formatHomeDate(date: Date): string`
  - `IT_DATE: { locale: Locale; weekStartsOn: 1 }`
  - `SIZES` come sotto
  - `TYPE` come sotto

- [ ] **Step 1: Write the failing test**

Creare `src/lib/format.test.ts`:

```ts
import { startOfWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { formatEuro, formatHomeDate, IT_DATE } from './format'

describe('formatEuro', () => {
  it('mette il simbolo prima e omette i decimali interi', () => {
    expect(formatEuro(25)).toBe('€ 25')
  })

  it('mostra due decimali con la virgola italiana', () => {
    expect(formatEuro(10.5)).toBe('€ 10,50')
  })
})

describe('formatHomeDate', () => {
  it('scrive il giorno con l’iniziale maiuscola', () => {
    expect(formatHomeDate(new Date(2026, 9, 1, 12))).toBe('Giovedì 1 ottobre')
  })
})

describe('IT_DATE', () => {
  it('fa iniziare la settimana di lunedì', () => {
    const monday = startOfWeek(new Date(2026, 9, 1, 12), IT_DATE)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(28)
    expect(monday.getMonth()).toBe(8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`

Expected: FAIL. Il modulo `./format` non esiste (Vite/Vitest non sono ancora installati: se il comando non parte, passare allo step 3 e rieseguire questo step prima di considerare il task chiuso; il fallimento atteso dopo l’install è `Failed to resolve import "./format"`).

- [ ] **Step 3: Write minimal implementation**

`.gitignore`:

```gitignore
node_modules
dist
.tmp-kit
```

`package.json`:

```json
{
  "name": "groomly",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.487.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^6.30.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.0.8"
  }
}
```

Poi: `npm install`

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
})
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string
  export default src
}
```

`index.html`:

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Groomly</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/theme/tokens.css` — copiare i valori, non inventarli:

```css
:root {
  --bg: #eceff4;
  --card: #fff;
  --surf: #f4f6fa;
  --surf2: #eef1f6;
  --line: #e3e7ee;
  --tx: #1b2232;
  --tx2: #566072;
  --tx3: #8a93a3;
  --pri: #3a5ba0;
  --pri-s: #e7edf9;
  --ok: #17905a;
  --ok-s: #e2f4eb;
  --warn: #b9770c;
  --warn-s: #fcf0d9;
  --bad: #cf4339;
  --bad-s: #fce6e4;
  --sen: #7254c0;
  --sen-s: #eee8fb;
  --tea: #0f8a8a;
  --tea-s: #dff3f2;
}

[data-theme="dark"] {
  --bg: #0c0f15;
  --card: #151a22;
  --surf: #1b212b;
  --surf2: #212834;
  --line: #29303c;
  --tx: #e6e9ef;
  --tx2: #a2aaba;
  --tx3: #6c7586;
  --pri: #86a1e4;
  --pri-s: #1e2940;
  --ok: #3fcd8b;
  --ok-s: #132a20;
  --warn: #eeb04c;
  --warn-s: #2d2412;
  --bad: #f07d72;
  --bad-s: #331b1a;
  --sen: #a891f1;
  --sen-s: #251e3a;
  --tea: #4dd0cf;
  --tea-s: #12292b;
}
```

`src/theme/sizes.ts`:

```ts
export const SIZES = {
  pagePadX: 12,
  sectionGap: 9,
  headerIconBtn: 30,
  headerIconRadius: 9,
  search: { h: 32, radius: 9 },
  row: { padY: 7, padX: 9, minH: 44 },
  card: { radius: 12, border: 1 },
  chip: { padY: 3, padX: 6, font: 10.5, iconInChip: 14, serviceIconInChip: 13, radius: 999 },
  avatar: { sm: 28, md: 36, lg: 46, xl: 84, grid: 52 },
  temperamentIcon: { row: 25, grid: 23, calendar: 18, title: 18, banner: 28, legend: 50 },
  serviceIcon: { row: 19 },
  button: { h: 26, hLg: 34, radius: 7, radiusLg: 9 },
  bottomNav: { h: 58, icon: 19, fab: 42, fabRadius: 14 },
  sheet: { radiusTop: 18, grab: { w: 34, h: 4 } },
  calendar: { hourHeight: 44, startHour: 8, endHour: 19, gutter: 34 },
} as const

export const AVATAR_RADIUS = { sm: 8, md: 10, lg: 12, xl: 20, grid: 14 } as const
```

`src/theme/theme.ts` (le funzioni tema arrivano nel Task 4; qui solo la tipografia):

```ts
export const TYPE = {
  base: 12.5,
  pageTitle: 17,
  pageTitleTracking: '-0.015em',
  dogName: 18,
  rowTitle: 12.5,
  rowSub: 11,
  meta: 10.5,
  section: 11,
  sectionTracking: '0.04em',
  chip: 10.5,
  navLabel: 9.5,
} as const
```

`src/index.css`:

```css
@import "tailwindcss";
@import "./theme/tokens.css";

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--tx);
  font-family: Inter, system-ui, sans-serif;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.35;
}

body {
  font-variant-numeric: tabular-nums;
}
```

`src/lib/format.ts`:

```ts
import { format, type Locale } from 'date-fns'
import { it } from 'date-fns/locale'

export const IT_DATE: { locale: Locale; weekStartsOn: 1 } = {
  locale: it,
  weekStartsOn: 1,
}

export function formatEuro(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 1e-9
  const formatted = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `€ ${formatted}`
}

export function formatHomeDate(date: Date): string {
  const raw = format(date, 'EEEE d MMMM', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/app/App.tsx` temporaneo, sostituito nel Task 8:

```tsx
export function App() {
  return <p>Groomly</p>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`

Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```powershell
git add .gitignore package.json package-lock.json vite.config.ts tsconfig.json index.html src/index.css src/main.tsx src/vite-env.d.ts src/test/setup.ts src/theme src/lib/format.ts src/lib/format.test.ts src/app/App.tsx
git commit -m "feat: aggiunge tooling, token e formattazione italiana"
```

---

### Task 2: Password

**Files:**
- Create: `src/lib/password.ts`, `src/lib/password.test.ts`
- Modify: `src/data/errors.ts` (creato qui perché `hashPassword` lo usa)

**Interfaces:**
- Consumes: Web Crypto
- Produces:
  - `class AppError extends Error { readonly code: AppErrorCode }`
  - `type AppErrorCode = 'auth_exists' | 'auth_invalid' | 'auth_crypto' | 'storage_corrupt' | 'storage_write' | 'service_missing' | 'service_boundary'`
  - `hashPassword(password: string, iterations?: number): Promise<{ passwordHash: string; salt: string; iterations: number }>`
  - `verifyPassword(password: string, salt: string, passwordHash: string, iterations: number): Promise<boolean>`
  - `PASSWORD_ITERATIONS = 100000`

- [ ] **Step 1: Write the failing test**

`src/lib/password.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../data/errors'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('verifica la password giusta e rifiuta quella sbagliata', async () => {
    const stored = await hashPassword('segretissimo', 10)
    expect(stored.iterations).toBe(10)
    expect(stored.salt).not.toContain('segretissimo')
    expect(stored.passwordHash).not.toContain('segretissimo')
    await expect(verifyPassword('segretissimo', stored.salt, stored.passwordHash, 10)).resolves.toBe(true)
    await expect(verifyPassword('sbagliata', stored.salt, stored.passwordHash, 10)).resolves.toBe(false)
  })

  it('rifiuta se Web Crypto non c’è', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes, subtle: undefined })
    await expect(hashPassword('segretissimo', 10)).rejects.toMatchObject({ code: 'auth_crypto' })
    vi.unstubAllGlobals()
  })
})

describe('AppError', () => {
  it('espone il codice', () => {
    const error = new AppError('x', 'auth_crypto')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('auth_crypto')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/password.test.ts`

Expected: FAIL, import di `./password` o `../data/errors` irrisolto.

- [ ] **Step 3: Write minimal implementation**

`src/data/errors.ts`:

```ts
export type AppErrorCode =
  | 'auth_exists'
  | 'auth_invalid'
  | 'auth_crypto'
  | 'storage_corrupt'
  | 'storage_write'
  | 'service_missing'
  | 'service_boundary'

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(message: string, code: AppErrorCode) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}
```

`src/lib/password.ts`:

```ts
import { AppError } from '../data/errors'

export const PASSWORD_ITERATIONS = 100_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index]
  return diff === 0
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new AppError('Web Crypto assente', 'auth_crypto')
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS) {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new AppError('Web Crypto assente', 'auth_crypto')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await derive(password, salt, iterations)
  return { passwordHash: bytesToBase64(key), salt: bytesToBase64(salt), iterations }
}

export async function verifyPassword(password: string, salt: string, passwordHash: string, iterations: number) {
  const key = await derive(password, base64ToBytes(salt), iterations)
  return sameBytes(key, base64ToBytes(passwordHash))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/password.test.ts`

Expected: PASS, 3 test. Se `vi.unstubAllGlobals` rompe crypto per il processo, il test crypto deve salvare `const original = globalThis.crypto` e ripristinarlo con `vi.stubGlobal('crypto', original)` invece di `unstubAllGlobals`.

- [ ] **Step 5: Commit**

```powershell
git add src/data/errors.ts src/lib/password.ts src/lib/password.test.ts
git commit -m "feat: cifra la password locale con PBKDF2"
```

---

### Task 3: Storage e account

**Files:**
- Create: `src/data/local/storage.ts`, `src/data/local/auth.ts`, `src/data/local/auth.test.ts`

**Interfaces:**
- Consumes: `AppError`, `hashPassword`, `verifyPassword`, `PASSWORD_ITERATIONS`
- Produces:
  - `storageKeys.auth = 'groomly.auth'`
  - `storageKeys.session = 'groomly.session'`
  - `storageKeys.settings(uid: string): string`
  - `storageKeys.services(uid: string): string`
  - `readJson<T>(key: string): T | null` — `null` se la chiave manca; `AppError storage_corrupt` se il JSON non si legge; la chiave non viene cancellata
  - `writeJson(key: string, value: unknown): void` — `AppError storage_write` se `setItem` lancia
  - `findCorruptGroomlyKey(): string | null` — controlla solo chiavi JSON (`auth`, `settings`, `services`), non `groomly.session`
  - `LocalAccount` come nella specifica
  - `getAccount(): LocalAccount | null`
  - `createAccount(email: string, password: string): Promise<LocalAccount>`
  - `login(email: string, password: string): Promise<LocalAccount>`
  - `logout(): void`
  - `getSession(): string | null`
  - `reconcileSession(): { kind: 'in'; account: LocalAccount } | { kind: 'out' } | { kind: 'corrupt' }`

- [ ] **Step 1: Write the failing test**

`src/data/local/auth.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import {
  createAccount,
  getAccount,
  getSession,
  login,
  logout,
  reconcileSession,
} from './auth'
import { readJson, storageKeys, writeJson } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('non cancella una chiave illeggibile', () => {
    localStorage.setItem(storageKeys.auth, '{')
    expect(() => readJson(storageKeys.auth)).toThrow(AppError)
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })

  it('propaga il fallimento di scrittura senza cambiare la chiave', () => {
    writeJson(storageKeys.auth, { ok: true })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeJson(storageKeys.auth, { ok: false })).toThrow(AppError)
    vi.restoreAllMocks()
    expect(readJson<{ ok: boolean }>(storageKeys.auth)?.ok).toBe(true)
  })
})

describe('auth', () => {
  beforeEach(() => localStorage.clear())

  it('crea l’account, scrive la sessione e rifiuta il secondo create', async () => {
    const account = await createAccount('  Maria@Salone.IT ', 'segretissimo')
    expect(account.email).toBe('maria@salone.it')
    expect(account.passwordHash).not.toContain('segretissimo')
    expect(getSession()).toBe(account.uid)
    expect(getAccount()?.uid).toBe(account.uid)
    await expect(createAccount('altra@salone.it', 'segretissimo')).rejects.toMatchObject({ code: 'auth_exists' })
  })

  it('il login giusto entra e quello sbagliato non scrive la sessione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    logout()
    expect(getSession()).toBeNull()
    expect(getAccount()?.email).toBe('maria@salone.it')
    await expect(login('maria@salone.it', 'no-no-no')).rejects.toMatchObject({ code: 'auth_invalid' })
    expect(getSession()).toBeNull()
    const again = await login(' MARIA@salone.it ', 'segretissimo')
    expect(again.uid).toBe(account.uid)
    expect(getSession()).toBe(account.uid)
  })

  it('azzerra la sessione se l’uid non coincide e lascia i servizi', () => {
    localStorage.setItem(storageKeys.auth, JSON.stringify({
      uid: 'account-1',
      email: 'maria@salone.it',
      passwordHash: 'aa',
      salt: 'bb',
      iterations: 10,
      createdAt: '2026-10-01T00:00:00.000Z',
    }))
    localStorage.setItem(storageKeys.session, 'altro-uid')
    localStorage.setItem(storageKeys.services('altro-uid'), JSON.stringify({ custom: { id: 'custom' } }))
    expect(reconcileSession()).toEqual({ kind: 'out' })
    expect(getSession()).toBeNull()
    expect(localStorage.getItem(storageKeys.services('altro-uid'))).toContain('custom')
  })

  it('segnala i dati illeggibili senza cancellarli', () => {
    localStorage.setItem(storageKeys.auth, '{')
    expect(reconcileSession()).toEqual({ kind: 'corrupt' })
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/auth.test.ts`

Expected: FAIL, moduli `./auth` e `./storage` assenti.

- [ ] **Step 3: Write minimal implementation**

`src/data/local/storage.ts`:

```ts
import { AppError } from '../errors'

export const storageKeys = {
  auth: 'groomly.auth',
  session: 'groomly.session',
  settings: (uid: string) => `groomly.users.${uid}.settings`,
  services: (uid: string) => `groomly.users.${uid}.services`,
}

const JSON_KEY = /^groomly\.(auth|users\..+\.(settings|services))$/

export function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
}

export function findCorruptGroomlyKey(): string | null {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !JSON_KEY.test(key)) continue
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      JSON.parse(raw)
    } catch {
      return key
    }
  }
  return null
}
```

`src/data/local/auth.ts`:

```ts
import { PASSWORD_ITERATIONS, hashPassword, verifyPassword } from '../../lib/password'
import { AppError } from '../errors'
import { findCorruptGroomlyKey, readJson, storageKeys, writeJson } from './storage'

export interface LocalAccount {
  uid: string
  email: string
  passwordHash: string
  salt: string
  iterations: number
  createdAt: string
}

export type SessionGate =
  | { kind: 'in'; account: LocalAccount }
  | { kind: 'out' }
  | { kind: 'corrupt' }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getAccount(): LocalAccount | null {
  return readJson<LocalAccount>(storageKeys.auth)
}

export function getSession(): string | null {
  const uid = localStorage.getItem(storageKeys.session)
  return uid ? uid : null
}

export function logout(): void {
  localStorage.removeItem(storageKeys.session)
}

export async function createAccount(email: string, password: string): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  if (getAccount()) throw new AppError('Account già presente', 'auth_exists')
  const hashed = await hashPassword(password, PASSWORD_ITERATIONS)
  const account: LocalAccount = {
    uid: crypto.randomUUID(),
    email: normalizeEmail(email),
    passwordHash: hashed.passwordHash,
    salt: hashed.salt,
    iterations: hashed.iterations,
    createdAt: new Date().toISOString(),
  }
  writeJson(storageKeys.auth, account)
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  return account
}

export async function login(email: string, password: string): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  const account = getAccount()
  if (!account || account.email !== normalizeEmail(email)) {
    throw new AppError('Email o password non corretti', 'auth_invalid')
  }
  const ok = await verifyPassword(password, account.salt, account.passwordHash, account.iterations)
  if (!ok) throw new AppError('Email o password non corretti', 'auth_invalid')
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  return account
}

export function reconcileSession(): SessionGate {
  if (findCorruptGroomlyKey()) return { kind: 'corrupt' }
  const account = getAccount()
  const session = getSession()
  if (!account) {
    if (session) logout()
    return { kind: 'out' }
  }
  if (session && session !== account.uid) {
    logout()
    return { kind: 'out' }
  }
  if (!session) return { kind: 'out' }
  return { kind: 'in', account }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/auth.test.ts`

Expected: PASS, 6 test.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/storage.ts src/data/local/auth.ts src/data/local/auth.test.ts
git commit -m "feat: salva un solo account locale e la sessione"
```

---

### Task 4: Tema e impostazioni

**Files:**
- Create: `src/data/local/settings.ts`, `src/data/local/settings.test.ts`, `src/theme/theme.test.ts`
- Modify: `src/theme/theme.ts`

**Interfaces:**
- Consumes: `writeJson`, `readJson`, `storageKeys`, `AppError`
- Produces:
  - `ThemeChoice = 'light' | 'dark' | 'auto'`
  - `SettingsMain = { theme: ThemeChoice; updatedAt: string }`
  - `getSettings(uid: string): SettingsMain`
  - `setTheme(uid: string, theme: ThemeChoice): SettingsMain`
  - `resolveTheme(choice: ThemeChoice, prefersDark: boolean): 'light' | 'dark'`
  - `applyTheme(resolved: 'light' | 'dark'): void`
  - `prefersDark(): boolean`

- [ ] **Step 1: Write the failing test**

`src/theme/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('rispetta chiaro, scuro e auto', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })
})
```

`src/data/local/settings.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, setTheme } from './settings'
import { readJson, storageKeys } from './storage'

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('crea il tema auto se il documento manca', () => {
    const settings = getSettings('uid-1')
    expect(settings.theme).toBe('auto')
    expect(readJson(storageKeys.settings('uid-1'))).toMatchObject({ theme: 'auto' })
  })

  it('salva il tema scelto', () => {
    setTheme('uid-1', 'dark')
    expect(getSettings('uid-1').theme).toBe('dark')
  })

  it('se la scrittura fallisce non cambia il tema già letto', () => {
    setTheme('uid-1', 'light')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => setTheme('uid-1', 'dark')).toThrow()
    vi.restoreAllMocks()
    expect(getSettings('uid-1').theme).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/theme.test.ts src/data/local/settings.test.ts`

Expected: FAIL, `resolveTheme` e `./settings` assenti.

- [ ] **Step 3: Write minimal implementation**

Sostituire `src/theme/theme.ts` con:

```ts
export const TYPE = {
  base: 12.5,
  pageTitle: 17,
  pageTitleTracking: '-0.015em',
  dogName: 18,
  rowTitle: 12.5,
  rowSub: 11,
  meta: 10.5,
  section: 11,
  sectionTracking: '0.04em',
  chip: 10.5,
  navLabel: 9.5,
} as const

export type ThemeChoice = 'light' | 'dark' | 'auto'

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): 'light' | 'dark' {
  if (choice === 'auto') return systemPrefersDark ? 'dark' : 'light'
  return choice
}

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
}
```

`src/data/local/settings.ts`:

```ts
import type { ThemeChoice } from '../../theme/theme'
import { readJson, storageKeys, writeJson } from './storage'

export interface SettingsMain {
  theme: ThemeChoice
  updatedAt: string
}

export function getSettings(uid: string): SettingsMain {
  const existing = readJson<SettingsMain>(storageKeys.settings(uid))
  if (existing) return existing
  const created: SettingsMain = { theme: 'auto', updatedAt: new Date().toISOString() }
  writeJson(storageKeys.settings(uid), created)
  return created
}

export function setTheme(uid: string, theme: ThemeChoice): SettingsMain {
  const next: SettingsMain = { theme, updatedAt: new Date().toISOString() }
  writeJson(storageKeys.settings(uid), next)
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theme/theme.test.ts src/data/local/settings.test.ts`

Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```powershell
git add src/theme/theme.ts src/theme/theme.test.ts src/data/local/settings.ts src/data/local/settings.test.ts
git commit -m "feat: salva il tema e risolve chiaro, scuro e auto"
```

---

### Task 5: Catalogo servizi

**Files:**
- Create: `src/types/models.ts`, `src/lib/schemas.ts`, `src/lib/schemas.test.ts`, `src/lib/serviceSummary.ts`, `src/lib/serviceSummary.test.ts`, `src/data/seed/services.ts`, `src/data/local/services.ts`, `src/data/local/services.test.ts`

**Interfaces:**
- Consumes: `readJson`, `writeJson`, `storageKeys`, `AppError`, `formatEuro`
- Produces: tipi e funzioni sotto. `Service` nel dominio ha `Date`. In storage le date sono ISO. `createService` non accetta `iconKey` né `kind` dopo la creazione. `ServicePatch` non ha `kind` né `id`.

```ts
export type ServiceIconKey = 'bagno' | 'taglio' | 'bagno_taglio' | 'nodi' | 'dermatologico' | 'antiparassitario'
export type ServiceKind = 'principale' | 'extra'
export interface SizeTriple { piccola: number; media: number; grande: number }
export interface Service {
  id: string
  name: string
  iconKey?: ServiceIconKey
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
export interface ServiceInput {
  name: string
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  active: boolean
}
export interface ServicePatch {
  name?: string
  durationMin?: SizeTriple
  price?: SizeTriple
  active?: boolean
}
export const loginSchema: ZodType<{ email: string; password: string }>
export const serviceFormSchema: ZodType<ServiceInput, ZodTypeDef, unknown>
export function summarizeDuration(service: Pick<Service, 'kind' | 'durationMin'>): string
export function summarizePrice(service: Pick<Service, 'kind' | 'price'>): string
export function activeServicesSubtitle(count: number): string
export function listServices(uid: string): Service[]
export function ensureServiceSeed(uid: string): Service[]
export function createService(uid: string, input: ServiceInput): Service
export function updateService(uid: string, id: string, patch: ServicePatch): Service
export function moveService(uid: string, id: string, direction: 'up' | 'down'): Service[]
```

- [ ] **Step 1: Write the failing test**

`src/lib/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loginSchema, serviceFormSchema } from './schemas'

describe('loginSchema', () => {
  it('rifiuta email vuota e password corta', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'corta' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'maria@salone.it', password: 'segretissimo' }).success).toBe(true)
  })
})

describe('serviceFormSchema', () => {
  it('copia prezzo e durata extra sulle tre taglie', () => {
    const parsed = serviceFormSchema.parse({
      kind: 'extra',
      name: '  Nodi extra  ',
      active: true,
      durationMin: '20',
      price: '5,50',
    })
    expect(parsed.name).toBe('Nodi extra')
    expect(parsed.durationMin).toEqual({ piccola: 20, media: 20, grande: 20 })
    expect(parsed.price).toEqual({ piccola: 5.5, media: 5.5, grande: 5.5 })
  })

  it('rifiuta durata non intera, prezzo negativo e nome vuoto', () => {
    expect(serviceFormSchema.safeParse({
      kind: 'principale', name: '   ', active: true,
      durationMin: { piccola: '1.5', media: '30', grande: '30' },
      price: { piccola: '10', media: '10', grande: '-1' },
    }).success).toBe(false)
  })
})
```

`src/lib/serviceSummary.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activeServicesSubtitle, summarizeDuration, summarizePrice } from './serviceSummary'

const base = { createdAt: new Date(), updatedAt: new Date(), id: 'x', name: 'x', order: 0, active: true }

describe('serviceSummary', () => {
  it('riassume un principale con intervallo e un valore unico', () => {
    expect(summarizeDuration({ ...base, kind: 'principale', durationMin: { piccola: 30, media: 45, grande: 60 } })).toBe('30–60m')
    expect(summarizePrice({ ...base, kind: 'principale', price: { piccola: 20, media: 28, grande: 38 } })).toBe('€ 20–38')
    expect(summarizeDuration({ ...base, kind: 'principale', durationMin: { piccola: 60, media: 60, grande: 60 } })).toBe('60m')
  })

  it('prefissa la durata extra', () => {
    expect(summarizeDuration({ ...base, kind: 'extra', durationMin: { piccola: 20, media: 20, grande: 20 } })).toBe('+20m')
    expect(summarizePrice({ ...base, kind: 'extra', price: { piccola: 5, media: 5, grande: 5 } })).toBe('€ 5')
  })

  it('accorda il sottotitolo', () => {
    expect(activeServicesSubtitle(1)).toBe('1 servizio · tempi stimati')
    expect(activeServicesSubtitle(8)).toBe('8 servizi · tempi stimati')
  })
})
```

`src/data/local/services.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '../errors'
import { createService, ensureServiceSeed, listServices, moveService, updateService } from './services'
import { storageKeys } from './storage'

describe('services', () => {
  beforeEach(() => localStorage.clear())

  it('scrive gli 8 servizi una sola volta', () => {
    const first = ensureServiceSeed('uid-1')
    expect(first.map((service) => service.id)).toEqual([
      'bagno', 'taglio', 'bagno-taglio', 'stripping', 'nodi', 'dermatologico', 'antiparassitario', 'unghie',
    ])
    expect(first.find((service) => service.id === 'nodi')?.price).toEqual({ piccola: 5, media: 5, grande: 5 })
    expect(first.find((service) => service.id === 'stripping')?.iconKey).toBeUndefined()
    const extra = createService('uid-1', {
      name: 'Spazzolata',
      kind: 'extra',
      durationMin: { piccola: 10, media: 10, grande: 10 },
      price: { piccola: 5, media: 5, grande: 5 },
      active: true,
    })
    expect(extra.iconKey).toBeUndefined()
    expect(extra.order).toBe(8)
    const second = ensureServiceSeed('uid-1')
    expect(second).toHaveLength(9)
    expect(second.some((service) => service.id === extra.id)).toBe(true)
  })

  it('disattiva, aggiorna e non cambia il tipo', () => {
    ensureServiceSeed('uid-1')
    const updated = updateService('uid-1', 'bagno', {
      name: 'Bagno delicato',
      active: false,
      price: { piccola: 22, media: 28, grande: 38 },
    })
    expect(updated.name).toBe('Bagno delicato')
    expect(updated.active).toBe(false)
    expect(updated.kind).toBe('principale')
    expect(() => updateService('uid-1', 'manca', { name: 'x' })).toThrow(AppError)
    expect(listServices('uid-1').some((service) => service.id === 'manca')).toBe(false)
  })

  it('scambia l’ordine e non scrive agli estremi', () => {
    ensureServiceSeed('uid-1')
    const rawBefore = localStorage.getItem(storageKeys.services('uid-1'))
    expect(() => moveService('uid-1', 'bagno', 'up')).toThrowError(expect.objectContaining({ code: 'service_boundary' }))
    expect(localStorage.getItem(storageKeys.services('uid-1'))).toBe(rawBefore)
    const moved = moveService('uid-1', 'taglio', 'up')
    expect(moved[0].id).toBe('taglio')
    expect(moved[1].id).toBe('bagno')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schemas.test.ts src/lib/serviceSummary.test.ts src/data/local/services.test.ts`

Expected: FAIL, moduli assenti.

- [ ] **Step 3: Write minimal implementation**

`src/types/models.ts`:

```ts
export type ServiceIconKey =
  | 'bagno'
  | 'taglio'
  | 'bagno_taglio'
  | 'nodi'
  | 'dermatologico'
  | 'antiparassitario'

export type ServiceKind = 'principale' | 'extra'

export interface SizeTriple {
  piccola: number
  media: number
  grande: number
}

export interface Service {
  id: string
  name: string
  iconKey?: ServiceIconKey
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  order: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServiceInput {
  name: string
  kind: ServiceKind
  durationMin: SizeTriple
  price: SizeTriple
  active: boolean
}

export interface ServicePatch {
  name?: string
  durationMin?: SizeTriple
  price?: SizeTriple
  active?: boolean
}

export const SERVICE_ICON_KEYS: ServiceIconKey[] = [
  'bagno', 'taglio', 'bagno_taglio', 'nodi', 'dermatologico', 'antiparassitario',
]
```

`src/lib/schemas.ts`:

```ts
import { z } from 'zod'
import type { ServiceInput, SizeTriple } from '../types/models'

const durationField = z.string().trim().regex(/^\d+$/, 'Minuti interi, minimo 1').transform(Number).refine((value) => value >= 1, 'Minuti interi, minimo 1')

const priceField = z.string().trim().transform((value, ctx) => {
  const normalized = value.replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prezzo ≥ 0, al massimo due decimali' })
    return z.NEVER
  }
  return Number(normalized)
})

const triple = z.object({ piccola: durationField, media: durationField, grande: durationField })
const priceTriple = z.object({ piccola: priceField, media: priceField, grande: priceField })

export const loginSchema = z.object({
  email: z.string().trim().email('Inserisci un’email valida'),
  password: z.string().min(8, 'Minimo 8 caratteri'),
})

function sameTriple(value: number): SizeTriple {
  return { piccola: value, media: value, grande: value }
}

export const serviceFormSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('principale'),
    name: z.string().trim().min(1, 'Il nome è obbligatorio'),
    active: z.boolean(),
    durationMin: triple,
    price: priceTriple,
  }),
  z.object({
    kind: z.literal('extra'),
    name: z.string().trim().min(1, 'Il nome è obbligatorio'),
    active: z.boolean(),
    durationMin: durationField,
    price: priceField,
  }),
]).transform((value): ServiceInput => {
  if (value.kind === 'extra') {
    return {
      kind: 'extra',
      name: value.name,
      active: value.active,
      durationMin: sameTriple(value.durationMin),
      price: sameTriple(value.price),
    }
  }
  return value
})
```

`src/lib/serviceSummary.ts`:

```ts
import type { Service, SizeTriple } from '../types/models'
import { formatEuro } from './format'

function ends(values: SizeTriple): [number, number] {
  const list = [values.piccola, values.media, values.grande]
  return [Math.min(...list), Math.max(...list)]
}

function euroBody(amount: number): string {
  return formatEuro(amount).slice(2)
}

export function summarizeDuration(service: Pick<Service, 'kind' | 'durationMin'>): string {
  const [low, high] = ends(service.durationMin)
  if (service.kind === 'extra') return `+${low}m`
  return low === high ? `${low}m` : `${low}–${high}m`
}

export function summarizePrice(service: Pick<Service, 'kind' | 'price'>): string {
  const [low, high] = ends(service.price)
  if (low === high) return formatEuro(low)
  return `€ ${euroBody(low)}–${euroBody(high)}`
}

export function activeServicesSubtitle(count: number): string {
  return `${count} ${count === 1 ? 'servizio' : 'servizi'} · tempi stimati`
}
```

`src/data/seed/services.ts`:

```ts
import type { ServiceInput, ServiceIconKey } from '../../types/models'

export interface SeedService extends ServiceInput {
  id: string
  order: number
  iconKey?: ServiceIconKey
}

export const SERVICE_SEED: SeedService[] = [
  { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } },
  { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 30, media: 35, grande: 45 } },
  { id: 'bagno-taglio', order: 2, name: 'Bagno + taglio', kind: 'principale', iconKey: 'bagno_taglio', active: true, durationMin: { piccola: 60, media: 90, grande: 120 }, price: { piccola: 35, media: 45, grande: 60 } },
  { id: 'stripping', order: 3, name: 'Stripping', kind: 'principale', active: true, durationMin: { piccola: 120, media: 150, grande: 180 }, price: { piccola: 50, media: 65, grande: 85 } },
  { id: 'nodi', order: 4, name: 'Gestione nodi', kind: 'extra', iconKey: 'nodi', active: true, durationMin: { piccola: 20, media: 20, grande: 20 }, price: { piccola: 5, media: 5, grande: 5 } },
  { id: 'dermatologico', order: 5, name: 'Dermatologico', kind: 'extra', iconKey: 'dermatologico', active: true, durationMin: { piccola: 15, media: 15, grande: 15 }, price: { piccola: 10, media: 10, grande: 10 } },
  { id: 'antiparassitario', order: 6, name: 'Antiparassitario', kind: 'extra', iconKey: 'antiparassitario', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 12, media: 12, grande: 12 } },
  { id: 'unghie', order: 7, name: 'Unghie', kind: 'extra', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 } },
]
```

`src/data/local/services.ts`:

```ts
import type { Service, ServiceInput, ServicePatch } from '../../types/models'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredService {
  id: string
  name: string
  iconKey?: Service['iconKey']
  kind: Service['kind']
  durationMin: Service['durationMin']
  price: Service['price']
  order: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function toDomain(stored: StoredService): Service {
  return { ...stored, createdAt: new Date(stored.createdAt), updatedAt: new Date(stored.updatedAt) }
}

function toStored(service: Service): StoredService {
  return { ...service, createdAt: service.createdAt.toISOString(), updatedAt: service.updatedAt.toISOString() }
}

function readMap(uid: string): Record<string, StoredService> | null {
  return readJson<Record<string, StoredService>>(storageKeys.services(uid))
}

function writeMap(uid: string, map: Record<string, StoredService>): Service[] {
  writeJson(storageKeys.services(uid), map)
  return Object.values(map).map(toDomain).sort((a, b) => a.order - b.order)
}

export function listServices(uid: string): Service[] {
  const map = readMap(uid) ?? {}
  return Object.values(map).map(toDomain).sort((a, b) => a.order - b.order)
}

export function ensureServiceSeed(uid: string): Service[] {
  const map = readMap(uid)
  if (map && Object.keys(map).length > 0) return listServices(uid)
  const now = new Date().toISOString()
  const seeded: Record<string, StoredService> = {}
  for (const service of SERVICE_SEED) {
    seeded[service.id] = { ...service, createdAt: now, updatedAt: now }
  }
  return writeMap(uid, seeded)
}

export function createService(uid: string, input: ServiceInput): Service {
  const map = readMap(uid) ?? {}
  const orders = Object.values(map).map((service) => service.order)
  const now = new Date()
  const service: Service = {
    ...input,
    id: crypto.randomUUID(),
    order: orders.length === 0 ? 0 : Math.max(...orders) + 1,
    createdAt: now,
    updatedAt: now,
  }
  map[service.id] = toStored(service)
  writeMap(uid, map)
  return service
}

export function updateService(uid: string, id: string, patch: ServicePatch): Service {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Servizio assente', 'service_missing')
  const next = toDomain({ ...current, ...patch, id, kind: current.kind, iconKey: current.iconKey, updatedAt: new Date().toISOString() })
  map[id] = toStored(next)
  writeMap(uid, map)
  return next
}

export function moveService(uid: string, id: string, direction: 'up' | 'down'): Service[] {
  const map = readMap(uid) ?? {}
  const ordered = Object.values(map).sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((service) => service.id === id)
  if (index < 0) throw new AppError('Servizio assente', 'service_missing')
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ordered.length) throw new AppError('Estremo della lista', 'service_boundary')
  const currentOrder = ordered[index].order
  ordered[index].order = ordered[target].order
  ordered[target].order = currentOrder
  map[ordered[index].id] = ordered[index]
  map[ordered[target].id] = ordered[target]
  return writeMap(uid, map)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schemas.test.ts src/lib/serviceSummary.test.ts src/data/local/services.test.ts`

Expected: PASS. Se `toThrow(AppError)` fallisce perché il codice è `service_missing` ma l’istanza è giusta, tenere `toThrow(AppError)`. Il test dell’estremo usa `service_boundary`.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/lib/schemas.ts src/lib/schemas.test.ts src/lib/serviceSummary.ts src/lib/serviceSummary.test.ts src/data/seed/services.ts src/data/local/services.ts src/data/local/services.test.ts
git commit -m "feat: aggiunge il catalogo servizi con seed stabile"
```

---

### Task 6: Kit interfaccia

**Files:**
- Create: `src/components/ui/Button.tsx`, `IconButton.tsx`, `Chip.tsx`, `Input.tsx`, `SearchBar.tsx`, `Segmented.tsx`, `Toggle.tsx`, `Card.tsx`, `SectionTitle.tsx`, `src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `SIZES`, `TYPE`
- Produces i componenti con queste props:
  - `Button`: `variant?: 'primary' | 'ghost'`, `children`, e gli attributi `button` nativi
  - `IconButton`: `label: string`, `children`, attributi `button`
  - `Chip`: `children`, `tone?: 'neutral' | 'ok' | 'warn'`
  - `Input`: `label: string`, `error?: string`, attributi `input`
  - `SearchBar`: `placeholder?: string`, `onClick?: () => void`
  - `Segmented<T extends string>`: `value: T`, `onChange: (value: T) => void`, `options: { value: T; label: string }[]`, `label: string`
  - `Toggle`: `checked: boolean`, `onChange: (checked: boolean) => void`, `label: string`
  - `Card` e `Row`: `children`
  - `SectionTitle`: `children`

- [ ] **Step 1: Write the failing test**

`src/components/ui/ui.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Chip } from './Chip'
import { Input } from './Input'
import { SearchBar } from './SearchBar'
import { Segmented } from './Segmented'
import { Toggle } from './Toggle'

function ThemeProbe() {
  const [value, setValue] = useState<'light' | 'dark' | 'auto'>('auto')
  return (
    <Segmented
      label="Tema"
      value={value}
      onChange={setValue}
      options={[
        { value: 'light', label: 'Chiaro' },
        { value: 'dark', label: 'Scuro' },
        { value: 'auto', label: 'Auto' },
      ]}
    />
  )
}

describe('ui kit', () => {
  it('mostra bottone, chip, errore di campo e ricerca', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <div>
        <Button>Entra</Button>
        <Chip>Principale</Chip>
        <Input label="Email" error="Inserisci un’email valida" />
        <SearchBar onClick={onClick} />
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByText('Principale')).toBeInTheDocument()
    expect(screen.getByText('Inserisci un’email valida')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('cambia tema e toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <div>
        <ThemeProbe />
        <Toggle label="Attivo" checked onChange={onToggle} />
      </div>,
    )
    await user.click(screen.getByRole('radio', { name: 'Scuro' }))
    expect(screen.getByRole('radio', { name: 'Scuro' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('switch', { name: 'Attivo' }))
    expect(onToggle).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ui.test.tsx`

Expected: FAIL, componenti assenti.

- [ ] **Step 3: Write minimal implementation**

`src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', style, children, type = 'button', ...props }: Props) {
  const primary = variant === 'primary'
  return (
    <button
      type={type}
      {...props}
      style={{
        height: SIZES.button.hLg,
        borderRadius: SIZES.button.radiusLg,
        border: primary ? 'none' : '1px solid var(--line)',
        background: primary ? 'var(--pri)' : 'transparent',
        color: primary ? '#fff' : 'var(--tx)',
        fontWeight: 600,
        fontSize: TYPE.base,
        padding: '0 12px',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
```

`src/components/ui/IconButton.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }

export function IconButton({ label, children, style, ...props }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      style={{
        width: SIZES.headerIconBtn,
        height: SIZES.headerIconBtn,
        borderRadius: SIZES.headerIconRadius,
        border: 'none',
        background: 'var(--surf)',
        color: 'var(--tx2)',
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
```

`src/components/ui/Chip.tsx`:

```tsx
import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

const TONE = {
  neutral: { background: 'var(--surf2)', color: 'var(--tx2)' },
  ok: { background: 'var(--ok-s)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-s)', color: 'var(--warn)' },
} as const

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 'max-content',
        alignItems: 'center',
        gap: 3,
        padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
        borderRadius: SIZES.chip.radius,
        fontSize: SIZES.chip.font,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...TONE[tone],
      }}
    >
      {children}
    </span>
  )
}
```

`src/components/ui/Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'
import { TYPE } from '../../theme/theme'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

export function Input({ label, error, id, ...props }: Props) {
  const inputId = id ?? label
  return (
    <label htmlFor={inputId} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        {...props}
        style={{
          height: 34,
          borderRadius: 9,
          border: `1px solid ${error ? 'var(--bad)' : 'var(--line)'}`,
          background: 'var(--card)',
          color: 'var(--tx)',
          padding: '0 10px',
          font: 'inherit',
        }}
      />
      {error ? <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{error}</span> : null}
    </label>
  )
}
```

`src/components/ui/SearchBar.tsx`:

```tsx
import { Search } from 'lucide-react'
import { SIZES } from '../../theme/sizes'

export function SearchBar({ placeholder = 'Cerca nome, proprietario, razza', onClick }: { placeholder?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerca"
      style={{
        height: SIZES.search.h,
        borderRadius: SIZES.search.radius,
        border: '1px solid var(--line)',
        background: 'var(--surf)',
        color: 'var(--tx3)',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        width: '100%',
        padding: '0 10px',
        font: 'inherit',
        textAlign: 'left',
      }}
    >
      <Search size={14} strokeWidth={2} aria-hidden />
      <span>{placeholder}</span>
    </button>
  )
}
```

`src/components/ui/Segmented.tsx`:

```tsx
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Option<T extends string> = { value: T; label: string }

export function Segmented<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            style={{
              border: 0,
              borderRadius: 6,
              background: selected ? 'var(--card)' : 'transparent',
              color: selected ? 'var(--tx)' : 'var(--tx2)',
              fontWeight: 600,
              fontSize: TYPE.rowSub,
              padding: '4px 10px',
              minHeight: SIZES.button.h,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

`src/components/ui/Toggle.tsx`:

```tsx
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      style={{ width: 36, height: 22, borderRadius: 999, border: 0, background: checked ? 'var(--ok)' : 'var(--line)', position: 'relative' }}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 16 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff' }} />
    </button>
  )
}
```

`src/components/ui/Card.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Card({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...props} style={{ background: 'var(--card)', border: `${SIZES.card.border}px solid var(--line)`, borderRadius: SIZES.card.radius, ...props.style }}>
      {children}
    </div>
  )
}

export function Row({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...props} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, minHeight: SIZES.row.minH, borderTop: `${SIZES.card.border}px solid var(--line)`, ...props.style }}>
      {children}
    </div>
  )
}
```

La prima `Row` di una card non deve avere il bordo superiore. `ServicesPage` passa `style={{ borderTop: 'none' }}` alla prima riga.

`src/components/ui/SectionTitle.tsx`:

```tsx
import type { ReactNode } from 'react'
import { TYPE } from '../../theme/theme'

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontSize: TYPE.section, fontWeight: 700, letterSpacing: TYPE.sectionTracking, textTransform: 'uppercase', color: 'var(--tx3)' }}>
      {children}
    </h2>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/ui.test.tsx`

Expected: PASS, 2 test.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ui
git commit -m "feat: aggiunge i controlli del kit interfaccia"
```

---

### Task 7: Guscio, toast, icone

**Files:**
- Create: `src/assets/icons/**` (copia dal zip), `src/components/layout/PhoneShell.tsx`, `Header.tsx`, `BottomNav.tsx`, `Sheet.tsx`, `Toast.tsx`, `src/components/domain/DogAvatar.tsx`, `TemperamentIcon.tsx`, `ServiceIcon.tsx`, `src/components/layout/shell.test.tsx`

**Interfaces:**
- Consumes: `SIZES`, `AVATAR_RADIUS`, `TYPE`, `SERVICE_ICON_KEYS`, `NavLink` da `react-router-dom`
- Produces:
  - `PhoneShell({ showNav, children })`
  - `Header({ title, subtitle?, backTo?, action? })`
  - `BottomNav()` con i link `/`, `/animali`, `/calendario`, `/listino` e il bottone `Apri azioni`
  - `Sheet({ open, title, onClose, children })`
  - `ToastProvider`, `useToast(): { show: (message: string, tone: 'ok' | 'plain') => void }`
  - `DogAvatar({ alt, src?, size? })`
  - `TemperamentIcon({ kind, size })` con `kind: 'bravo' | 'agitato' | 'mordace'`
  - `ServiceIcon({ iconKey, size })` — senza `iconKey` rende `Scissors`

Copiare le icone, in PowerShell, dalla root del repo:

```powershell
Expand-Archive -Path groomly-cursor-kit.zip -DestinationPath .tmp-kit -Force
New-Item -ItemType Directory -Force -Path src/assets/icons | Out-Null
Copy-Item -Recurse -Force .tmp-kit/groomly-cursor-kit/icons/svg src/assets/icons/svg
Copy-Item -Force .tmp-kit/groomly-cursor-kit/icons/icons.ts src/assets/icons/icons.ts
Remove-Item -Recurse -Force .tmp-kit
```

Non modificare `icons.ts`: gli import `./svg/...` restano validi.

- [ ] **Step 1: Write the failing test**

`src/components/layout/shell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SERVICE_ICONS, TEMPERAMENT_ICONS } from '../../assets/icons/icons'
import { SERVICE_ICON_KEYS } from '../../types/models'
import { DogAvatar } from '../domain/DogAvatar'
import { ServiceIcon } from '../domain/ServiceIcon'
import { TemperamentIcon } from '../domain/TemperamentIcon'
import { BottomNav } from './BottomNav'
import { PhoneShell } from './PhoneShell'
import { Sheet } from './Sheet'
import { ToastProvider, useToast } from './Toast'

function ToastProbe() {
  const toast = useToast()
  return <button type="button" onClick={() => toast.show('Salvato', 'ok')}>Mostra</button>
}

describe('shell', () => {
  it('limita la colonna a 390 px e mostra la barra', () => {
    render(
      <MemoryRouter>
        <PhoneShell showNav>
          <p>Oggi</p>
        </PhoneShell>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('phone-shell')).toHaveStyle({ maxWidth: '390px' })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Animali' })).toHaveAttribute('href', '/animali')
    expect(screen.getByRole('button', { name: 'Apri azioni' })).toBeInTheDocument()
  })

  it('apre il foglio e il toast Salvato', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Sheet open title="Prova" onClose={() => undefined}><p>Contenuto</p></Sheet>
        <ToastProbe />
      </ToastProvider>,
    )
    expect(screen.getByRole('dialog', { name: 'Prova' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mostra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Salvato')
  })

  it('usa le icone del kit e le forbici se manca la chiave', () => {
    expect(Object.keys(SERVICE_ICONS).sort()).toEqual([...SERVICE_ICON_KEYS].sort())
    render(
      <div>
        <TemperamentIcon kind="bravo" size={18} />
        <ServiceIcon iconKey="bagno" size={19} />
        <ServiceIcon size={19} />
        <DogAvatar alt="Foto mancante" size="md" />
      </div>,
    )
    expect(screen.getByRole('img', { name: 'Bravo' })).toHaveAttribute('src', TEMPERAMENT_ICONS.bravo.src)
    expect(screen.getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
    expect(screen.getByTestId('service-fallback')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto mancante' })).toBeInTheDocument()
  })
})
```

`BottomNav` va renderizzato anche da `PhoneShell` quando `showNav` è true. Il test cerca i link dentro `PhoneShell`, quindi `PhoneShell` include `BottomNav`. Il test non deve montare `BottomNav` due volte.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/shell.test.tsx`

Expected: FAIL, file assenti. Dopo la copia delle icone, l’import di `icons.ts` deve risolversi; se Vitest non tratta gli SVG come URL, aggiungere in `src/test/setup.ts` niente: la dichiarazione `*.svg` e il plugin Vite bastano. Se l’import SVG fallisce, in `vite.config.ts` la configurazione di test è già dentro Vite, quindi il transform asset è attivo.

- [ ] **Step 3: Write minimal implementation**

`src/components/layout/Toast.tsx`:

```tsx
import { Check } from 'lucide-react'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'plain'
type ToastItem = { id: number; message: string; tone: Tone } | null

const ToastContext = createContext<{ show: (message: string, tone: Tone) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem>(null)
  const api = useMemo(() => ({
    show(message: string, tone: Tone) {
      const id = Date.now()
      setToast({ id, message, tone })
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, 2000)
    },
  }), [])
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <div role="status" style={{ position: 'fixed', left: '50%', bottom: 72, transform: 'translateX(-50%)', background: 'var(--tx)', color: 'var(--card)', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center', zIndex: 40 }}>
          {toast.tone === 'ok' ? <Check size={14} strokeWidth={2} color="var(--ok)" aria-hidden /> : null}
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fuori da ToastProvider')
  return ctx
}
```

`src/components/layout/Sheet.tsx`:

```tsx
import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button type="button" aria-label="Chiudi" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(12,15,21,.45)' }} />
      <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'relative', width: 'min(100%, 390px)', background: 'var(--card)', borderRadius: `${SIZES.sheet.radiusTop}px ${SIZES.sheet.radiusTop}px 0 0`, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ width: SIZES.sheet.grab.w, height: SIZES.sheet.grab.h, borderRadius: 999, background: 'var(--line)', alignSelf: 'center' }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

`src/components/layout/BottomNav.tsx`:

```tsx
import { CalendarDays, FileText, Home, PawPrint, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/animali', label: 'Animali', icon: PawPrint },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/listino', label: 'Listino', icon: FileText },
] as const

export function BottomNav({ onFab }: { onFab?: () => void }) {
  const left = items.slice(0, 2)
  const right = items.slice(2)
  const linkStyle = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, fontSize: TYPE.navLabel, fontWeight: 600, color: 'var(--tx3)', textDecoration: 'none' }
  return (
    <nav style={{ height: SIZES.bottomNav.h, display: 'grid', gridTemplateColumns: '1fr 1fr 58px 1fr 1fr', alignItems: 'center', borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
      {left.map((item) => <NavLink key={item.to} to={item.to} style={linkStyle}><item.icon size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />{item.label}</NavLink>)}
      <button type="button" aria-label="Apri azioni" onClick={onFab} style={{ width: SIZES.bottomNav.fab, height: SIZES.bottomNav.fab, borderRadius: SIZES.bottomNav.fabRadius, border: 0, background: 'var(--pri)', color: '#fff', justifySelf: 'center', display: 'grid', placeItems: 'center' }}>
        <Plus size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />
      </button>
      {right.map((item) => <NavLink key={item.to} to={item.to} style={linkStyle}><item.icon size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />{item.label}</NavLink>)}
    </nav>
  )
}
```

`src/components/layout/PhoneShell.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function PhoneShell({ showNav = false, onFab, children }: { showNav?: boolean; onFab?: () => void; children: ReactNode }) {
  return (
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 390, minHeight: '100dvh', margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: showNav ? 58 : 0 }}>{children}</div>
      {showNav ? <div style={{ position: 'sticky', bottom: 0 }}><BottomNav onFab={onFab} /></div> : null}
    </div>
  )
}
```

`src/components/layout/Header.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { IconButton } from '../ui/IconButton'

export function Header({ title, subtitle, backTo, action }: { title: string; subtitle?: string; backTo?: string; action?: ReactNode }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
      {backTo ? (
        <Link to={backTo} aria-label="Indietro" style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' }}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        </Link>
      ) : null}
      <h1 style={{ margin: 0, flex: 1, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15 }}>
        {title}
        {subtitle ? <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>{subtitle}</small> : null}
      </h1>
      {action}
    </header>
  )
}
```

Togliere l’import inutilizzato di `IconButton` da questo file.

`src/components/domain/DogAvatar.tsx`:

```tsx
import { AVATAR_PLACEHOLDER } from '../../assets/icons/icons'
import { AVATAR_RADIUS, SIZES } from '../../theme/sizes'

const SIZE = { sm: SIZES.avatar.sm, md: SIZES.avatar.md, lg: SIZES.avatar.lg, xl: SIZES.avatar.xl } as const

export function DogAvatar({ alt, src, size = 'md' }: { alt: string; src?: string; size?: keyof typeof SIZE }) {
  return <img alt={alt} src={src || AVATAR_PLACEHOLDER} width={SIZE[size]} height={SIZE[size]} style={{ borderRadius: AVATAR_RADIUS[size], objectFit: 'cover', background: 'var(--surf)' }} />
}
```

`src/components/domain/TemperamentIcon.tsx`:

```tsx
import { TEMPERAMENT_ICONS } from '../../assets/icons/icons'

export function TemperamentIcon({ kind, size }: { kind: keyof typeof TEMPERAMENT_ICONS; size: number }) {
  const icon = TEMPERAMENT_ICONS[kind]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
```

`src/components/domain/ServiceIcon.tsx`:

```tsx
import { Scissors } from 'lucide-react'
import { SERVICE_ICONS } from '../../assets/icons/icons'
import type { ServiceIconKey } from '../../types/models'

export function ServiceIcon({ iconKey, size }: { iconKey?: ServiceIconKey; size: number }) {
  if (!iconKey) return <Scissors data-testid="service-fallback" role="img" aria-label="Servizio" size={size} strokeWidth={2} color="var(--tx3)" />
  const icon = SERVICE_ICONS[iconKey]
  return <img alt={icon.label} src={icon.src} width={size} height={size} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/shell.test.tsx`

Expected: PASS, 3 test. Il pulsante + è `Apri azioni` dentro `BottomNav`. Non creare `Fab.tsx`.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/icons src/components/layout src/components/domain
git commit -m "feat: aggiunge guscio, toast e icone del kit"
```

---

### Task 8: Sessione, router e login

**Files:**
- Create: `src/hooks/useSession.tsx`, `src/app/router.tsx`, `src/app/providers.tsx`, `src/pages/LoginPage.tsx`, `src/pages/LoginPage.test.tsx`
- Modify: `src/app/App.tsx`, `src/main.tsx` (già importa `./app/App`)

**Interfaces:**
- Consumes: `createAccount`, `login`, `logout`, `reconcileSession`, `getAccount`, `loginSchema`, `AppError`, `PhoneShell`, `Card`, `Input`, `Button`
- Produces:
  - `useSession(): { gate: SessionGate; createAccount: (email: string, password: string) => Promise<void>; login: (email: string, password: string) => Promise<void>; logout: () => void }`
  - `buildRoutes(isDev: boolean): RouteObject[]` — se `isDev` è false, `/dev/kit` non è registrato.
  - `App({ isDev?: boolean; memory?: boolean; initialPath?: string })`. Default: `isDev` da `import.meta.env.DEV`, `memory` false, `initialPath` `'/'`. I test passano `memory`.

`LoginPage` legge `getAccount()`: se è `null`, titolo e bottone «Crea accesso»; se esiste, «Entra». Errori Zod sotto il campo. `auth_invalid` e `auth_exists` mostrano «Email o password non corretti» solo per il login; `auth_exists` non dovrebbe apparire perché la schermata diventa «Entra». `auth_crypto` mostra «Questo dispositivo non può proteggere la password». Dopo successo, `navigate('/')`.

Se `gate.kind === 'corrupt'`, `App` rende solo `<p>Dati locali illeggibili</p>` e non il form.

- [ ] **Step 1: Write the failing test**

`src/pages/LoginPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

describe('login', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('crea l’account e al rimontaggio resta in Home', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    view.unmount()
    render(<App memory isDev={false} />)
    expect(screen.getByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea accesso' })).not.toBeInTheDocument()
  })

  it('rifiuta la password sbagliata e non apre le rotte senza sessione', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    await screen.findByRole('heading', { name: 'Groomly' })
    view.unmount()
    localStorage.removeItem(storageKeys.session)
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea accesso' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Password'), 'sbagliata')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByText('Email o password non corretti')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
  })

  it('mostra i dati illeggibili senza cancellarli', () => {
    localStorage.setItem(storageKeys.auth, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })

  it('non registra /dev/kit quando non è sviluppo', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/dev/kit" />)
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.type(screen.getByLabelText('Password'), 'segretissimo')
    await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Kit' })).not.toBeInTheDocument()
  })
})
```

I test usano `memory`. `main.tsx` rende `<App />`: browser router, `isDev` da Vite.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`

Expected: FAIL, `App` non accetta le props e le pagine non esistono.

- [ ] **Step 3: Write minimal implementation**

`src/hooks/useSession.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type SessionGate } from '../data/local/auth'

type SessionApi = {
  gate: SessionGate
  createAccount: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionApi | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => reconcileSession())
  const api = useMemo<SessionApi>(() => ({
    gate,
    async createAccount(email, password) {
      const account = await createAccountRepo(email, password)
      setGate({ kind: 'in', account })
    },
    async login(email, password) {
      const account = await loginRepo(email, password)
      setGate({ kind: 'in', account })
    },
    logout() {
      logoutRepo()
      setGate({ kind: 'out' })
    },
  }), [gate])
  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fuori da SessionProvider')
  return ctx
}
```

`src/pages/LoginPage.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '../data/local/auth'
import { AppError } from '../data/errors'
import { loginSchema } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

type FormValues = { email: string; password: string }

export function LoginPage() {
  const existing = getAccount()
  const session = useSession()
  const navigate = useNavigate()
  const creating = !existing
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: FormValues) {
    try {
      if (creating) await session.createAccount(values.email, values.password)
      else await session.login(values.email, values.password)
      navigate('/')
    } catch (error) {
      const message = error instanceof AppError && error.code === 'auth_crypto'
        ? 'Questo dispositivo non può proteggere la password'
        : 'Email o password non corretti'
      setError('root', { message })
    }
  }

  return (
    <PhoneShell>
      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <h1 style={{ margin: 0, fontSize: 17 }}>{creating ? 'Crea accesso' : 'Entra'}</h1>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Input label="Email" type="email" autoComplete="username" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} {...register('password')} error={errors.password?.message} />
          {errors.root?.message ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          <Button type="submit">{creating ? 'Crea accesso' : 'Entra'}</Button>
        </Card>
      </form>
    </PhoneShell>
  )
}
```

`src/pages/HomePage.tsx` minimo per far passare questo task (il Task 9 lo sostituisce):

```tsx
export function HomePage() {
  return <h1>Groomly</h1>
}
```

`src/app/router.tsx`:

```tsx
import type { ReactElement } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const routes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '*', element: <Navigate to="/" replace /> },
  ]
  if (isDev) routes.push({ path: '/dev/kit', element: <Guard><h1>Kit</h1></Guard> })
  return routes
}

function LoginSwitch() {
  const { gate } = useSession()
  if (gate.kind === 'in') return <Navigate to="/" replace />
  return <LoginPage />
}
```

`src/app/providers.tsx`:

```tsx
import type { ReactNode } from 'react'
import { ToastProvider } from '../components/layout/Toast'
import { SessionProvider } from '../hooks/useSession'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
```

`src/app/App.tsx`:

```tsx
import { useMemo } from 'react'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { Providers } from './providers'
import { buildRoutes } from './router'

function Gate({ isDev, memory, initialPath }: { isDev: boolean; memory: boolean; initialPath: string }) {
  const { gate } = useSession()
  const router = useMemo(() => {
    const routes = buildRoutes(isDev)
    return memory
      ? createMemoryRouter(routes, { initialEntries: [initialPath] })
      : createBrowserRouter(routes)
  }, [isDev, memory, initialPath])
  if (gate.kind === 'corrupt') return <p>Dati locali illeggibili</p>
  return <RouterProvider router={router} />
}

export function App({ isDev = import.meta.env.DEV, memory = false, initialPath = '/' }: { isDev?: boolean; memory?: boolean; initialPath?: string }) {
  return (
    <Providers>
      <Gate isDev={isDev} memory={memory} initialPath={initialPath} />
    </Providers>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LoginPage.test.tsx`

Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useSession.tsx src/app src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/pages/HomePage.tsx src/components/ui/Button.tsx
git commit -m "feat: aggiunge login locale e rotte protette"
```

---

### Task 9: Home, segnaposto e pulsante +

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/app/router.tsx`
- Create: `src/pages/PlaceholderPage.tsx`, `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: `formatHomeDate`, `PhoneShell`, `Header`, `SearchBar`, `Sheet`, `useToast`, `BottomNav` via `PhoneShell`
- Produces: rotte `/animali`, `/calendario`, `/listino` con `PlaceholderPage`. Home: heading `Groomly`, data di oggi, link ingranaggio a `/impostazioni` con accessible name `Impostazioni`, `SearchBar` che naviga a `/animali`, testo `In arrivo`. Nessun bottone `Notifiche`. Il + apre un dialog con `Nuovo appuntamento` e `Nuovo cane`; il tocco chiude il dialog e mostra lo status `In arrivo`.

- [ ] **Step 1: Write the failing test**

`src/pages/shellPages.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('guscio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 12))
  })

  it('mostra la data, nasconde il campanello e apre Animali dalla ricerca', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByText('Giovedì 1 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifiche' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(screen.getByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getAllByText('In arrivo').length).toBeGreaterThan(0)
  })

  it('il più annuncia che le azioni arrivano dopo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(screen.getByRole('status')).toHaveTextContent('In arrivo')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

Alla fine del file, in `afterEach`, chiamare `vi.useRealTimers()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/shellPages.test.tsx`

Expected: FAIL, data e rotta Animali assenti.

- [ ] **Step 3: Write minimal implementation**

`src/pages/ShellFrame.tsx` è il guscio con il pulsante +. `PlaceholderPage` lo riusa. Non duplicare il foglio dentro `PlaceholderPage`.

```tsx
import { useState, type ReactNode } from 'react'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'

export function ShellFrame({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  function soon() {
    setOpen(false)
    toast.show('In arrivo', 'plain')
  }
  return (
    <PhoneShell showNav onFab={() => setOpen(true)}>
      {children}
      <Sheet open={open} title="Nuovo" onClose={() => setOpen(false)}>
        <button type="button" onClick={soon}>Nuovo appuntamento</button>
        <button type="button" onClick={soon}>Nuovo cane</button>
      </Sheet>
    </PhoneShell>
  )
}
```

`PlaceholderPage`:

```tsx
import { Header } from '../components/layout/Header'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <ShellFrame>
      <Header title={title} />
      <p style={{ color: 'var(--tx3)', fontSize: TYPE.base, padding: '0 12px' }}>In arrivo</p>
    </ShellFrame>
  )
}
```

`HomePage`:

```tsx
import { Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SearchBar } from '../components/ui/SearchBar'
import { formatHomeDate } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function HomePage() {
  const navigate = useNavigate()
  return (
    <ShellFrame>
      <Header
        title="Groomly"
        subtitle={formatHomeDate(new Date())}
        action={(
          <Link to="/impostazioni" aria-label="Impostazioni" style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' }}>
            <Settings size={16} strokeWidth={2} aria-hidden />
          </Link>
        )}
      />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar onClick={() => navigate('/animali')} />
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>In arrivo</p>
      </div>
    </ShellFrame>
  )
}
```

In `buildRoutes`, sostituire `*` che manda tutto a `/` prima di registrare le pagine: le rotte esplicite sono `/`, `/animali`, `/calendario`, `/listino`, `/impostazioni` (placeholder fino al Task 10), `/login`. Il catch-all resta per il resto.

```tsx
{ path: '/animali', element: <Guard><PlaceholderPage title="Animali" /></Guard> },
{ path: '/calendario', element: <Guard><PlaceholderPage title="Calendario" /></Guard> },
{ path: '/listino', element: <Guard><PlaceholderPage title="Listino" /></Guard> },
```

`/impostazioni` per ora può essere un `PlaceholderPage` titolo `Impostazioni`: il test del Task 9 non lo apre. Il Task 10 lo sostituisce. Il link Impostazioni nel test del Task 9 non viene cliccato. Lasciare la rotta assente fino al Task 10 va bene: il link esiste lo stesso.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/LoginPage.test.tsx`

Expected: PASS. I fake timer non devono lasciare `matchMedia` rotto: `userEvent.setup({ advanceTimers })` è obbligatorio, altrimenti `userEvent` va in timeout.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/HomePage.tsx src/pages/PlaceholderPage.tsx src/pages/ShellFrame.tsx src/pages/shellPages.test.tsx src/app/router.tsx
git commit -m "feat: aggiunge home, segnaposto e menu del più"
```

---

### Task 10: Impostazioni, aspetto, esci

**Files:**
- Create: `src/hooks/useSettings.ts`, `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`
- Modify: `src/app/router.tsx` — `/impostazioni` rende `SettingsPage` dentro `Guard`, senza barra

**Interfaces:**
- Consumes: `getSettings`, `setTheme`, `applyTheme`, `resolveTheme`, `prefersDark`, `useSession`, `activeServicesSubtitle`, `listServices` (il conteggio attivi; il seed lo farà il Task 11, quindi qui chiamare `ensureServiceSeed` così il sottotitolo è vero anche prima di aprire l’editor)
- Produces: `useSettings(uid: string | null): { settings: SettingsMain; choose: (theme: ThemeChoice) => boolean }`

La pagina ha freccia `Indietro` verso `/`, sezione `Aspetto`, radio Chiaro/Scuro/Auto, sezione `Personalizza`, link `Servizi e durate` verso `/impostazioni/servizi`, testo `Groomly v1.0`, bottone `Esci`. Non contiene i testi `Attività`, `Backup`, `Campi scheda`, `Tag caratteristiche`, `Archivio animali`. Il tocco su Scuro imposta `document.documentElement.dataset.theme` a `dark` subito. Se `setTheme` lancia, il dataset torna al valore precedente e compare `Salvataggio non riuscito`. `Esci` toglie la sessione, lascia `groomly.auth` e torna al bottone `Entra`.

- [ ] **Step 1: Write the failing test**

`src/pages/SettingsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
}

describe('impostazioni', () => {
  beforeEach(() => localStorage.clear())

  it('mostra solo aspetto e servizi, e esce lasciando l’account', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByText('Aspetto')).toBeInTheDocument()
    expect(screen.getByText('8 servizi · tempi stimati')).toBeInTheDocument()
    expect(screen.getByText('Groomly v1.0')).toBeInTheDocument()
    expect(screen.queryByText('Attività')).not.toBeInTheDocument()
    expect(screen.queryByText('Backup')).not.toBeInTheDocument()
    expect(screen.queryByText('Campi scheda')).not.toBeInTheDocument()
    expect(screen.queryByText('Tag caratteristiche')).not.toBeInTheDocument()
    expect(screen.queryByText('Archivio animali')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(await screen.findByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.auth)).toContain('maria@salone.it')
  })

  it('applica il tema scuro e lo ripristina se il salvataggio fallisce', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('radio', { name: 'Scuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('radio', { name: 'Chiaro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
  })
})
```

Il secondo test è fragile: `setItem` lancia anche per altre chiavi dopo lo spy. Lo spy va messo subito prima del click su Chiaro, quando il tema è già `dark`. `choose` chiama `setTheme` che chiama `setItem`. Bene.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL, rotta Impostazioni assente (`findByRole heading Impostazioni` non arriva; il click sul link può finire sul catch-all).

- [ ] **Step 3: Write minimal implementation**

`src/hooks/useSettings.ts`:

```ts
import { useState } from 'react'
import { getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import type { ThemeChoice } from '../theme/theme'
import { applyTheme, prefersDark, resolveTheme } from '../theme/theme'

export function useSettings(uid: string | null) {
  const [settings, setSettings] = useState<SettingsMain>(() =>
    uid ? getSettings(uid) : { theme: 'auto', updatedAt: '' },
  )

  function choose(theme: ThemeChoice): boolean {
    if (!uid) return false
    const previous = settings.theme
    applyTheme(resolveTheme(theme, prefersDark()))
    try {
      setSettings(setTheme(uid, theme))
      return true
    } catch {
      applyTheme(resolveTheme(previous, prefersDark()))
      return false
    }
  }

  return { settings, choose }
}
```

Un effetto in `SettingsPage` applica il tema corrente al mount e, se è `auto`, riascolta `change` su `matchMedia`.

`src/pages/SettingsPage.tsx`:

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Card, Row } from '../components/ui/Card'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { ensureServiceSeed } from '../data/local/services'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { activeServicesSubtitle } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import { applyTheme, prefersDark, resolveTheme, type ThemeChoice } from '../theme/theme'
import { Button } from '../components/ui/Button'

export function SettingsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const { settings, choose } = useSettings(uid)
  const toast = useToast()
  const activeCount = uid ? ensureServiceSeed(uid).filter((service) => service.active).length : 0

  useEffect(() => {
    const apply = () => applyTheme(resolveTheme(settings.theme, prefersDark()))
    apply()
    if (settings.theme !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  function onTheme(theme: ThemeChoice) {
    if (!choose(theme)) toast.show('Salvataggio non riuscito', 'plain')
  }

  return (
    <PhoneShell>
      <Header title="Impostazioni" backTo="/" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <SectionTitle>Aspetto</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Tema</span>
            <Segmented label="Tema" value={settings.theme} onChange={onTheme} options={[
              { value: 'light', label: 'Chiaro' },
              { value: 'dark', label: 'Scuro' },
              { value: 'auto', label: 'Auto' },
            ]} />
          </Row>
        </Card>
        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/servizi" style={{ display: 'flex', flex: 1, flexDirection: 'column', color: 'inherit', textDecoration: 'none' }}>
              <span>Servizi e durate</span>
              <small style={{ color: 'var(--tx3)' }}>{activeServicesSubtitle(activeCount)}</small>
            </Link>
          </Row>
        </Card>
        <p style={{ textAlign: 'center', color: 'var(--tx3)' }}>Groomly v1.0</p>
        <Button variant="ghost" onClick={() => session.logout()}>Esci</Button>
      </div>
    </PhoneShell>
  )
}
```

In `router.tsx` aggiungere la rotta e il catch-all in fondo, dopo `/dev/kit`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useSettings.ts src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/app/router.tsx
git commit -m "feat: aggiunge aspetto, conteggio servizi e uscita"
```

---

### Task 11: Editor servizi

**Files:**
- Create: `src/hooks/useServices.ts`, `src/pages/ServiceSheet.tsx`, `src/pages/ServicesPage.tsx`, `src/pages/ServicesPage.test.tsx`
- Modify: `src/app/router.tsx` — `/impostazioni/servizi`

**Interfaces:**
- Consumes: `ensureServiceSeed`, `createService`, `updateService`, `moveService`, `serviceFormSchema`, `summarizeDuration`, `summarizePrice`, `ServiceIcon`, `Sheet`, `useToast`, `AppError`
- Produces: `useServices(uid: string): { services: Service[]; saveNew: (input: ServiceInput) => boolean; saveExisting: (id: string, patch: ServicePatch) => boolean; move: (id: string, direction: 'up' | 'down') => boolean; error: string | null }`

`saveNew` / `saveExisting` / `move` non lanciano verso la pagina: catturano `AppError`, lasciano `services` all’ultimo stato riuscito e mettono `error` a `Salvataggio non riuscito` per `storage_write` e `service_missing`. `service_boundary` non cambia lo storage e non è un toast: i bottoni sono `disabled`. Dopo un successo, `error` è `null` e la pagina mostra il toast `Salvato` e chiude il foglio. Se c’è errore, il foglio resta aperto.

Lista ordinata per `order`. Chip `Principale` o `Extra`. Chip `Disattivato` se `active` è false, colore terziario sul nome (`var(--tx3)`). Su disabilitato sul primo, giù sull’ultimo, etichette `Sposta su` e `Sposta giù` più il nome, per esempio `Sposta su Bagno`. Nessun bottone il cui nome contenga `Elimina`.

Foglio modifica: niente controllo del tipo. Principale: sei campi (durata e prezzo per piccola, media, grande). Extra: un campo Durata e un campo Prezzo. Toggle `Attivo`. Bottone `Salva`.

Foglio creazione, bottone `Aggiungi servizio`: segmented Principale/Extra, `Attivo` true di default, niente selettore icona.

- [ ] **Step 1: Write the failing test**

`src/pages/ServicesPage.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

async function openServices(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
  await user.click(screen.getByRole('link', { name: /Servizi e durate/ }))
  await screen.findByRole('heading', { name: 'Servizi e durate' })
}

describe('servizi', () => {
  beforeEach(() => localStorage.clear())

  it('modifica un extra, aggiunge un servizio e non offre elimina', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    expect(screen.queryByRole('button', { name: /Elimina/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sposta su Bagno' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Apri Gestione nodi' }))
    const price = screen.getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '9')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const raw = localStorage.getItem(storageKeys.services(JSON.parse(localStorage.getItem(storageKeys.auth)!).uid))!
    const nodi = JSON.parse(raw).nodi
    expect(nodi.price).toEqual({ piccola: 9, media: 9, grande: 9 })
    await user.click(screen.getByRole('button', { name: 'Aggiungi servizio' }))
    await user.type(screen.getByLabelText('Nome'), 'Spazzolata')
    await user.click(screen.getByRole('radio', { name: 'Extra' }))
    await user.type(screen.getByLabelText('Durata'), '10')
    await user.type(screen.getByLabelText('Prezzo'), '5')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Spazzolata')).toBeInTheDocument()
    expect(within(screen.getByTestId('icon-Spazzolata')).getByTestId('service-fallback')).toBeInTheDocument()
  })

  it('se la scrittura fallisce lascia il nome precedente', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    await user.click(screen.getByRole('button', { name: 'Apri Bagno' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Bagno nuovo')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    vi.restoreAllMocks()
    expect(screen.getByRole('button', { name: 'Apri Bagno' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ServicesPage.test.tsx`

Expected: FAIL, rotta assente.

- [ ] **Step 3: Write minimal implementation**

`src/hooks/useServices.ts`:

```ts
import { useState } from 'react'
import { AppError } from '../data/errors'
import { createService, listServices, moveService, updateService, ensureServiceSeed } from '../data/local/services'
import type { Service, ServiceInput, ServicePatch } from '../types/models'

export function useServices(uid: string) {
  const [services, setServices] = useState<Service[]>(() => ensureServiceSeed(uid))
  const [error, setError] = useState<string | null>(null)

  function guard(action: () => Service[] | Service): boolean {
    try {
      const result = action()
      setServices(Array.isArray(result) ? result : listServices(uid))
      setError(null)
      return true
    } catch (caught) {
      if (caught instanceof AppError && (caught.code === 'storage_write' || caught.code === 'service_missing')) {
        setError('Salvataggio non riuscito')
      }
      return false
    }
  }

  return {
    services,
    error,
    saveNew(input: ServiceInput) {
      return guard(() => {
        createService(uid, input)
        return listServices(uid)
      })
    },
    saveExisting(id: string, patch: ServicePatch) {
      return guard(() => {
        updateService(uid, id, patch)
        return listServices(uid)
      })
    },
    move(id: string, direction: 'up' | 'down') {
      return guard(() => moveService(uid, id, direction))
    },
  }
}
```

`ensureServiceSeed` si usa solo nel `useState` iniziale. Dopo create e update si rilegge con `listServices`, così un salvataggio non rilancia il seed.

`src/pages/ServiceSheet.tsx` gestisce create e edit. Per l’edit, i valori iniziali arrivano dal servizio. Per il principale i campi sono stringhe. Per l’extra un duration e un price presi da `piccola`.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { serviceFormSchema } from '../lib/schemas'
import type { Service, ServiceInput, ServiceKind } from '../types/models'

type Props = {
  mode: 'create' | 'edit'
  initial?: Service
  onSubmit: (input: ServiceInput) => void
}

export function ServiceSheet({ mode, initial, onSubmit }: Props) {
  const kindLocked = mode === 'edit'
  const kindDefault: ServiceKind = initial?.kind ?? 'principale'
  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: defaults(kindDefault, initial),
  })
  const kind = kindLocked ? kindDefault : (form.watch('kind') as ServiceKind)

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Input label="Nome" {...form.register('name')} error={form.formState.errors.name?.message as string | undefined} />
      {mode === 'create' ? (
        <Segmented
          label="Tipo"
          value={kind}
          onChange={(value) => {
            const name = form.getValues('name')
            form.reset({ ...defaults(value), name })
          }}
          options={[{ value: 'principale', label: 'Principale' }, { value: 'extra', label: 'Extra' }]}
        />
      ) : null}
      {kind === 'principale' ? <PrincipalFields form={form} /> : <ExtraFields form={form} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Attivo</span>
        <Toggle label="Attivo" checked={Boolean(form.watch('active'))} onChange={(checked) => form.setValue('active', checked)} />
      </div>
      <Button type="submit">Salva</Button>
    </form>
  )
}
```

Nello stesso file, sopra `ServiceSheet`, mettere `defaults`, `PrincipalFields` e `ExtraFields`. `useForm` resta senza generico: il resolver Zod 3 restituisce l’output del transform, quindi `onSubmit` riceve `ServiceInput`.

```tsx
type FormApi = ReturnType<typeof useForm>

function PrincipalFields({ form }: { form: FormApi }) {
  const errors = form.formState.errors as {
    durationMin?: { piccola?: { message?: string }; media?: { message?: string }; grande?: { message?: string } }
    price?: { piccola?: { message?: string }; media?: { message?: string }; grande?: { message?: string } }
  }
  return (
    <>
      {(['piccola', 'media', 'grande'] as const).map((size) => (
        <div key={size}>
          <Input label={`Durata ${size}`} {...form.register(`durationMin.${size}`)} error={errors.durationMin?.[size]?.message} />
          <Input label={`Prezzo ${size}`} {...form.register(`price.${size}`)} error={errors.price?.[size]?.message} />
        </div>
      ))}
    </>
  )
}

function ExtraFields({ form }: { form: FormApi }) {
  const errors = form.formState.errors as {
    durationMin?: { message?: string }
    price?: { message?: string }
  }
  return (
    <>
      <Input label="Durata" {...form.register('durationMin')} error={errors.durationMin?.message} />
      <Input label="Prezzo" {...form.register('price')} error={errors.price?.message} />
    </>
  )
}
```

`defaults`:

```ts
function defaults(kind: ServiceKind, initial?: Service) {
  if (kind === 'extra') {
    return {
      kind: 'extra' as const,
      name: initial?.name ?? '',
      active: initial?.active ?? true,
      durationMin: initial ? String(initial.durationMin.piccola) : '',
      price: initial ? String(initial.price.piccola).replace('.', ',') : '',
    }
  }
  return {
    kind: 'principale' as const,
    name: initial?.name ?? '',
    active: initial?.active ?? true,
    durationMin: {
      piccola: initial ? String(initial.durationMin.piccola) : '',
      media: initial ? String(initial.durationMin.media) : '',
      grande: initial ? String(initial.durationMin.grande) : '',
    },
    price: {
      piccola: initial ? String(initial.price.piccola) : '',
      media: initial ? String(initial.price.media) : '',
      grande: initial ? String(initial.price.grande) : '',
    },
  }
}
```

`src/pages/ServicesPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { useSession } from '../hooks/useSession'
import { useServices } from '../hooks/useServices'
import { summarizeDuration, summarizePrice } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import type { Service, ServiceInput } from '../types/models'
import { ServiceSheet } from './ServiceSheet'

export function ServicesPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useServices(uid)
  const toast = useToast()
  const [editing, setEditing] = useState<Service | 'new' | null>(null)

  useEffect(() => {
    if (api.error) toast.show(api.error, 'plain')
  }, [api.error])

  function submit(input: ServiceInput) {
    const ok = editing === 'new'
      ? api.saveNew(input)
      : editing
        ? api.saveExisting(editing.id, {
          name: input.name,
          durationMin: input.durationMin,
          price: input.price,
          active: input.active,
        })
        : false
    if (ok) {
      toast.show('Salvato', 'ok')
      setEditing(null)
    }
  }

  return (
    <PhoneShell>
      <Header title="Servizi e durate" backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card>
          {api.services.map((service, index) => (
            <Row key={service.id} style={index === 0 ? { borderTop: 'none' } : undefined}>
              <span data-testid={`icon-${service.name}`}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              </span>
              <button type="button" aria-label={`Apri ${service.name}`} onClick={() => setEditing(service)} style={{ flex: 1, textAlign: 'left', border: 0, background: 'transparent', color: service.active ? 'var(--tx)' : 'var(--tx3)', font: 'inherit' }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{service.name}</span>
                <span style={{ color: 'var(--tx2)' }}>{summarizeDuration(service)} · {summarizePrice(service)}</span>
              </button>
              <Chip>{service.kind === 'principale' ? 'Principale' : 'Extra'}</Chip>
              {service.active ? null : <Chip tone="warn">Disattivato</Chip>}
              <button type="button" aria-label={`Sposta su ${service.name}`} disabled={index === 0} onClick={() => api.move(service.id, 'up')}>Su</button>
              <button type="button" aria-label={`Sposta giù ${service.name}`} disabled={index === api.services.length - 1} onClick={() => api.move(service.id, 'down')}>Giù</button>
            </Row>
          ))}
        </Card>
        <Button onClick={() => setEditing('new')}>Aggiungi servizio</Button>
      </div>
      <Sheet
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
      </Sheet>
    </PhoneShell>
  )
}
```

Il bottone della riga ha `aria-label` `Apri Bagno` e il nome visibile `Bagno`. `getByText('Spazzolata')` legge il nome visibile.

Rotta in `buildRoutes`, prima del catch-all:

```tsx
{ path: '/impostazioni/servizi', element: <Guard><ServicesPage /></Guard> },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ServicesPage.test.tsx src/lib/schemas.test.ts src/data/local/services.test.ts`

Expected: PASS. Il cambio Principale/Extra fa `form.reset` con i default del tipo scelto e conserva il nome.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useServices.ts src/pages/ServiceSheet.tsx src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx src/app/router.tsx
git commit -m "feat: modifica, aggiunge e riordina i servizi"
```

---

### Task 12: Kit di sviluppo e verifica finale

**Files:**
- Create: `src/pages/DevKitPage.tsx`, `src/pages/DevKitPage.test.tsx`
- Modify: `src/app/router.tsx` — sostituire l’elemento temporaneo `/dev/kit` con `DevKitPage`

**Interfaces:**
- Consumes: tutti i componenti dei task 6 e 7, `buildRoutes`
- Produces: pagina titolo `Kit` visibile solo con `isDev`

- [ ] **Step 1: Write the failing test**

`src/pages/DevKitPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'

describe('dev kit', () => {
  beforeEach(async () => {
    localStorage.clear()
    await createAccount('maria@salone.it', 'segretissimo')
  })

  it('mostra i componenti quando isDev è true', async () => {
    render(<App memory isDev initialPath="/dev/kit" />)
    expect(await screen.findByRole('heading', { name: 'Kit' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Agitato' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mordace' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto mancante' })).toBeInTheDocument()
  })
})
```

`createAccount` scrive la sessione, quindi la rotta iniziale `/dev/kit` è già autorizzata.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DevKitPage.test.tsx`

Expected: FAIL, le immagini Bravo, Agitato, Mordace, Bagno e Foto mancante non ci sono nello stub `<h1>Kit</h1>`.

- [ ] **Step 3: Write minimal implementation**

`src/pages/DevKitPage.tsx`:

```tsx
import { useState } from 'react'
import { DogAvatar } from '../components/domain/DogAvatar'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { SearchBar } from '../components/ui/SearchBar'
import { Toggle } from '../components/ui/Toggle'
import { SERVICE_ICON_KEYS } from '../types/models'

export function DevKitPage() {
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState(true)
  return (
    <PhoneShell>
      <Header title="Kit" backTo="/" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar />
        <Chip tone="ok">Selezionato</Chip>
        <Toggle label="Attivo" checked={on} onChange={setOn} />
        <DogAvatar alt="Foto mancante" size="md" />
        <div style={{ display: 'flex', gap: 8 }}>
          <TemperamentIcon kind="bravo" size={25} />
          <TemperamentIcon kind="agitato" size={25} />
          <TemperamentIcon kind="mordace" size={25} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SERVICE_ICON_KEYS.map((key) => <ServiceIcon key={key} iconKey={key} size={19} />)}
        </div>
        <Button onClick={() => setOpen(true)}>Apri foglio</Button>
        <Sheet open={open} title="Foglio di prova" onClose={() => setOpen(false)}><p>Prova</p></Sheet>
      </div>
    </PhoneShell>
  )
}
```

In `buildRoutes`, sostituire `<h1>Kit</h1>` con `<DevKitPage />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`

Expected: PASS sull’intera suite. Poi `npm run build` termina con exit code 0.

- [ ] **Step 5: Controllo manuale**

Run: `npm run dev` e aprire l’URL che Vite stampa.

A larghezza 360 della colonna, in chiaro e poi in scuro (Impostazioni → Scuro, poi Auto):

- nessuno scroll orizzontale
- testi leggibili sul fondo
- primo avvio crea l’account; refresh resta dentro; Esci e password sbagliata restano fuori
- Impostazioni contiene solo Aspetto, Servizi e durate, `Groomly v1.0`, Esci
- gli 8 servizi ci sono; un extra salvato ha tre prezzi uguali; non c’è Elimina
- Home, Animali, Calendario, Listino e il + si comportano come la specifica
- `http://localhost:<porta>/dev/kit` in `npm run dev` mostra il titolo Kit
- `npm run build && npm run preview`: `/dev/kit` non mostra il titolo Kit (la rotta non c’è e il catch-all manda a Home se c’è sessione, altrimenti al login)

- [ ] **Step 6: Commit**

```powershell
git add src/pages/DevKitPage.tsx src/pages/DevKitPage.test.tsx src/app/router.tsx
git commit -m "feat: aggiunge la pagina di confronto del kit"
```

Non c’è uno step 5 di commit prima del manuale: il commit del codice è questo step 6, dopo che i test automatici sono verdi. Il controllo manuale è lo step 5 e non si salta se si dichiara il ciclo chiuso.
