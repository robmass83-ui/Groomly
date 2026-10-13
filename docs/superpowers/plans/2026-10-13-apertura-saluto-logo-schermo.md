# Apertura senza login, saluto, logo in alto e schermo pieno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All'apertura non compare più il login se l'accesso è già stato fatto; la schermata di caricamento con il logo animato saluta «Ciao Laura» / «Ciao Roberto»; il logo Groomly (senza «TOELETTATURA») sta in alto in ogni pagina; il contenuto usa tutta la larghezza e non lascia vuoto in alto.

**Architecture:** Un ricordo `groomly.lastSignIn` in `localStorage` fa partire il cancello di sessione da `pending` (schermata di caricamento) invece che da `out` (login) quando Firebase deve ancora rispondere, con limite di 10 s. `greetingText(email)` ricava il saluto da un abbinamento fisso. `App` monta una sola `LoadingSplash` nella stessa posizione dall'inizio alla fine. `BrandBar` mostra il logo di testata chiaro/scuro seguendo `data-theme`; `Header`, Home e Agenda lo usano. `PhoneShell`, barra in basso e fogli passano da 390 px a tutta larghezza (tetto 640 px); nell'app Android il margine superiore della WebView vale 0 perché la barra di stato è già fuori.

**Tech Stack:** React 19 + TypeScript, react-router, Vitest + jsdom (alcuni file happy-dom) + Testing Library, Capacitor 8 Android (Java, AndroidX core-splashscreen).

**Spec:** `docs/superpowers/specs/2026-10-13-apertura-saluto-logo-schermo-design.md`

## Global Constraints

- Abbinamento saluto, alla lettera, confronto con `trim().toLowerCase()`: `laura.masala@tiscali.it` → `Laura`; `masala.roberto@hotmail.it` e `robmass83@gmail.com` → `Roberto`; altre email → `Ciao!`. Testo: `Ciao Laura`, `Ciao Roberto`, `Ciao!`.
- Nessun saluto nella Home. Il saluto vive solo in `LoadingSplash`.
- Chiave del ricordo: `groomly.lastSignIn`, valore JSON `{ "uid": string, "email": string }`.
- Limite attesa Firebase: 10 000 ms. Durata minima schermata: `SPLASH_MIN_MS = 3600`. Ingresso saluto a 2,4 s, 0,6 s. Dissolvenza 350 ms (invariata).
- Logo di testata: altezza 30 px nelle pagine, 44 px in Home. `SIZES.brandBar = { regular: 30, large: 44, padTop: 10, gap: 8 }`.
- Larghezza: tetto 640 px per `PhoneShell`, barra in basso e `Sheet`. `Dialog` resta `min(100%, 390px)`.
- Testi, chip, icone, pulsanti e spaziature interne non cambiano dimensione.
- Lingua UI: italiano. Stile del codice come i file intorno. Niente commenti superflui.
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto, `npm run build`. Shell: PowerShell, cartella `d:\Groomly`.
- `git add` sempre con percorsi espliciti. Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`, né i file non tracciati estranei che compaiono in `git status`.
- Ramo di lavoro: quello corrente (`feat/listino-razze`, che segue `origin/feat/listino-razze`).
- A fine aggiornamento consegnato (Task 8, con test e build verdi): regola workspace `publish-update`. I task intermedi fanno solo commit.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/lib/greeting.ts` (nuovo) | `greetingName`, `greetingText` |
| `src/data/local/signInHint.ts` (nuovo) | leggere/scrivere/cancellare il ricordo |
| `src/data/local/storage.ts` | chiave `lastSignIn` |
| `src/lib/authAction.ts` | `openingGate` con il ricordo |
| `src/hooks/useSession.tsx` | ricordo all'accesso/uscita, limite 10 s |
| `src/app/App.tsx`, `src/app/LoadingSplash.tsx`, `src/app/loadingSplash.css` | una sola schermata, saluto, durata |
| `android/app/src/main/res/...`, `MainActivity.java` | avvio a tinta unita, inset del ritaglio fotocamera |
| `src/assets/brand/groomly-logo-testata*.svg` (nuovi) | logo senza «TOELETTATURA» |
| `src/theme/useDocumentTheme.ts` (nuovo) | tema corrente da `data-theme` |
| `src/components/layout/BrandBar.tsx` (nuovo) | logo di testata |
| `src/components/layout/Header.tsx`, `src/pages/HomePage.tsx`, `src/pages/CalendarPage.tsx` | logo in alto |
| `src/components/layout/PhoneShell.tsx`, `bottomNav.css`, `Sheet.tsx`, `src/index.css`, `src/theme/theme.ts`, `src/main.tsx` | tutta larghezza, margine superiore |
| `src/lib/breakAfterPlus.tsx` (nuovo), `src/pages/ListinoPage.tsx` | a capo dopo il «+» |

---

### Task 1: Saluto dall'email

**Files:**
- Create: `src/lib/greeting.ts`
- Test: `src/lib/greeting.test.ts`

**Interfaces:**
- Produces: `greetingName(email: string | null | undefined): string | null`, `greetingText(email: string | null | undefined): string`

- [ ] **Step 1: Scrivi il test che fallisce**

`src/lib/greeting.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { greetingName, greetingText } from './greeting'

describe('saluto', () => {
  it('riconosce Laura e le due email di Roberto', () => {
    expect(greetingName('laura.masala@tiscali.it')).toBe('Laura')
    expect(greetingName('masala.roberto@hotmail.it')).toBe('Roberto')
    expect(greetingName('robmass83@gmail.com')).toBe('Roberto')
  })

  it('ignora maiuscole e spazi', () => {
    expect(greetingName('  Laura.Masala@Tiscali.IT ')).toBe('Laura')
    expect(greetingName('RobMass83@Gmail.com')).toBe('Roberto')
  })

  it('senza abbinamento non c’è nome', () => {
    expect(greetingName('maria@salone.it')).toBeNull()
    expect(greetingName('')).toBeNull()
    expect(greetingName(null)).toBeNull()
    expect(greetingName(undefined)).toBeNull()
  })

  it('compone il testo del saluto', () => {
    expect(greetingText('laura.masala@tiscali.it')).toBe('Ciao Laura')
    expect(greetingText('robmass83@gmail.com')).toBe('Ciao Roberto')
    expect(greetingText('maria@salone.it')).toBe('Ciao!')
    expect(greetingText(null)).toBe('Ciao!')
  })
})
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run src/lib/greeting.test.ts`
Expected: FAIL, `Failed to resolve import "./greeting"`.

- [ ] **Step 3: Implementa**

`src/lib/greeting.ts`:

```ts
const NAMES: Record<string, string> = {
  'laura.masala@tiscali.it': 'Laura',
  'masala.roberto@hotmail.it': 'Roberto',
  'robmass83@gmail.com': 'Roberto',
}

export function greetingName(email: string | null | undefined): string | null {
  if (!email) return null
  return NAMES[email.trim().toLowerCase()] ?? null
}

export function greetingText(email: string | null | undefined): string {
  const name = greetingName(email)
  return name ? `Ciao ${name}` : 'Ciao!'
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run src/lib/greeting.test.ts`
Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/greeting.ts src/lib/greeting.test.ts
git commit -m "feat: saluto Ciao Laura o Ciao Roberto dall'email"
```

---

### Task 2: Ricordo dell'accesso e apertura senza login

**Files:**
- Create: `src/data/local/signInHint.ts`
- Modify: `src/data/local/storage.ts:3-10` (chiave `lastSignIn`)
- Modify: `src/lib/authAction.ts:20-23` (`openingGate`)
- Modify: `src/hooks/useSession.tsx` (intero file sotto)
- Test: `src/data/local/signInHint.test.ts` (nuovo), `src/lib/authAction.test.ts`, `src/app/firebaseGate.test.tsx`

**Interfaces:**
- Produces: `type SignInHint = { uid: string; email: string }`, `readSignInHint(): SignInHint | null`, `writeSignInHint(account: { uid: string; email: string }): void`, `clearSignInHint(): void`, `storageKeys.lastSignIn === 'groomly.lastSignIn'`, `openingGate(firebase: boolean, reconciled: SessionGate, remembered?: boolean): SessionGate`.

- [ ] **Step 1: Test del ricordo**

`src/data/local/signInHint.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { clearSignInHint, readSignInHint, writeSignInHint } from './signInHint'
import { storageKeys } from './storage'

describe('ricordo dell’accesso', () => {
  beforeEach(() => localStorage.clear())

  it('scrive, legge e cancella uid ed email', () => {
    expect(storageKeys.lastSignIn).toBe('groomly.lastSignIn')
    expect(readSignInHint()).toBeNull()
    writeSignInHint({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    expect(JSON.parse(localStorage.getItem('groomly.lastSignIn')!)).toEqual({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    expect(readSignInHint()).toEqual({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    clearSignInHint()
    expect(localStorage.getItem('groomly.lastSignIn')).toBeNull()
  })

  it('un valore rovinato vale come nessun ricordo', () => {
    localStorage.setItem('groomly.lastSignIn', '{rotto')
    expect(readSignInHint()).toBeNull()
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: '', email: 'a@b.it' }))
    expect(readSignInHint()).toBeNull()
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'fb-1' }))
    expect(readSignInHint()).toBeNull()
  })
})
```

- [ ] **Step 2: Aggiorna il test di `openingGate`**

In `src/lib/authAction.test.ts` sostituisci il test `'con Firebase la sessione già nota si apre subito'` (righe 31-38) con:

```ts
  it('con Firebase la sessione già nota si apre subito', () => {
    const account = { uid: 'uid-1', email: 'maria@salone.it', salt: 's', passwordHash: 'h', iterations: 1, createdAt: '2026-01-01T00:00:00.000Z' }
    const inside: SessionGate = { kind: 'in', account }
    expect(openingGate(true, inside)).toEqual(inside)
    expect(openingGate(true, out)).toEqual(out)
    expect(openingGate(true, corrupt)).toEqual(corrupt)
    expect(openingGate(false, out)).toEqual(out)
  })

  it('con Firebase e un accesso ricordato aspetta invece di mostrare il login', () => {
    const account = { uid: 'uid-1', email: 'maria@salone.it', salt: 's', passwordHash: 'h', iterations: 1, createdAt: '2026-01-01T00:00:00.000Z' }
    const inside: SessionGate = { kind: 'in', account }
    expect(openingGate(true, out, true)).toEqual({ kind: 'pending' })
    expect(openingGate(true, out, false)).toEqual(out)
    expect(openingGate(false, out, true)).toEqual(out)
    expect(openingGate(true, corrupt, true)).toEqual(corrupt)
    expect(openingGate(true, inside, true)).toEqual(inside)
  })
```

- [ ] **Step 3: Test di integrazione nel cancello Firebase**

In `src/app/firebaseGate.test.tsx` (`vi`, `act`, `waitFor`, `createAccount` e `storageKeys` sono già importati), dentro `describe('gate Firebase', …)`, dopo il test `'se watchAuth non parte si vede l’accesso e non una pagina bianca'`, aggiungi:

```tsx
  it('con l’accesso ricordato non mostra il login mentre Firebase risponde', async () => {
    cloud.mode = 'pending'
    const account = await createAccount('laura.masala@tiscali.it', 'segretissimo')
    localStorage.removeItem(storageKeys.session)
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: account.uid, email: account.email }))
    render(<App memory isDev={false} initialPath="/" />)
    expect(screen.getByRole('status', { name: 'Caricamento Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entra' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
    await waitFor(() => expect(cloud.onAccount).not.toBeNull())
    await act(async () => { cloud.onAccount?.(account) })
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Caricamento Groomly' })).not.toBeInTheDocument()
  })

  it('l’accesso Firebase si ricorda e la risposta senza utente lo dimentica', async () => {
    cloud.mode = 'pending'
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/" />)
    await waitFor(() => expect(cloud.onAccount).not.toBeNull())
    await act(async () => { cloud.onAccount?.(account) })
    expect(JSON.parse(localStorage.getItem('groomly.lastSignIn')!)).toEqual({ uid: account.uid, email: 'maria@salone.it' })
    await act(async () => { cloud.onAccount?.(null) })
    expect(localStorage.getItem('groomly.lastSignIn')).toBeNull()
  })

  it('se Firebase non risponde entro 10 secondi compare il login', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      cloud.mode = 'pending'
      localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'fb-1', email: 'robmass83@gmail.com' }))
      render(<App memory isDev={false} initialPath="/" />)
      expect(screen.getByRole('status', { name: 'Caricamento Groomly' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Crea accesso' })).not.toBeInTheDocument()
      await act(async () => { vi.advanceTimersByTime(10_000) })
      expect(await screen.findByRole('heading', { name: 'Crea accesso' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] **Step 4: Verifica che falliscano**

Run: `npx vitest run src/data/local/signInHint.test.ts src/lib/authAction.test.ts src/app/firebaseGate.test.tsx`
Expected: FAIL — `signInHint` non risolto; `openingGate(true, out, true)` restituisce `out`; nei test del cancello compare `Crea accesso`/`Entra` e il ricordo resta `null`.

- [ ] **Step 5: Chiave in `storage.ts`**

In `src/data/local/storage.ts` sostituisci l'oggetto `storageKeys` con:

```ts
export const storageKeys = {
  auth: 'groomly.auth',
  session: 'groomly.session',
  lastSignIn: 'groomly.lastSignIn',
  settings: (uid: string) => `groomly.users.${uid}.settings`,
  services: (uid: string) => `groomly.users.${uid}.services`,
  dogs: (uid: string) => `groomly.users.${uid}.dogs`,
  appointments: (uid: string) => `groomly.users.${uid}.appointments`,
}
```

(`JSON_KEY` non cambia: un ricordo rovinato non deve segnare i dati come illeggibili.)

- [ ] **Step 6: Modulo del ricordo**

`src/data/local/signInHint.ts`:

```ts
import { storageKeys } from './storage'

export type SignInHint = { uid: string; email: string }

export function readSignInHint(): SignInHint | null {
  try {
    const raw = localStorage.getItem(storageKeys.lastSignIn)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SignInHint> | null
    if (!value || typeof value.uid !== 'string' || !value.uid || typeof value.email !== 'string') return null
    return { uid: value.uid, email: value.email }
  } catch {
    return null
  }
}

export function writeSignInHint(account: { uid: string; email: string }): void {
  try {
    localStorage.setItem(storageKeys.lastSignIn, JSON.stringify({ uid: account.uid, email: account.email }))
  } catch {
    return
  }
}

export function clearSignInHint(): void {
  try {
    localStorage.removeItem(storageKeys.lastSignIn)
  } catch {
    return
  }
}
```

- [ ] **Step 7: `openingGate`**

In `src/lib/authAction.ts` sostituisci `openingGate` con:

```ts
export function openingGate(firebase: boolean, reconciled: SessionGate, remembered = false): SessionGate {
  if (firebase && remembered && reconciled.kind === 'out') return { kind: 'pending' }
  return reconciled
}
```

- [ ] **Step 8: `useSession.tsx`**

Sostituisci il contenuto di `src/hooks/useSession.tsx` con:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled, notifySaveFailed } from '../data/firebase/enabled'
import { AppError } from '../data/errors'
import { createAccount as createAccountRepo, login as loginRepo, logout as logoutRepo, reconcileSession, type LocalAccount, type SessionGate } from '../data/local/auth'
import { clearSignInHint, readSignInHint, writeSignInHint } from '../data/local/signInHint'
import { openingGate, shouldFallbackToSignIn } from '../lib/authAction'

const PENDING_LIMIT_MS = 10_000

type SessionApi = {
  gate: SessionGate
  createAccount: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const SessionContext = createContext<SessionApi | null>(null)

function accountGate(account: LocalAccount | null): SessionGate {
  return account ? { kind: 'in', account } : { kind: 'out' }
}

function remember(account: LocalAccount): SessionGate {
  writeSignInHint(account)
  return { kind: 'in', account }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<SessionGate>(() => openingGate(firebaseEnabled(), reconcileSession(), readSignInHint() !== null))

  useEffect(() => {
    if (!firebaseEnabled()) return
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.watchAuth((account) => {
      if (cancelled) return
      if (account) writeSignInHint(account)
      else clearSignInHint()
      setGate(accountGate(account))
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => {
      if (cancelled) return
      setGate({ kind: 'out' })
      notifySaveFailed()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  useEffect(() => {
    if (gate.kind !== 'pending') return
    const timer = window.setTimeout(() => {
      setGate((current) => (current.kind === 'pending' ? { kind: 'out' } : current))
    }, PENDING_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [gate.kind])

  const api = useMemo<SessionApi>(() => ({
    gate,
    async createAccount(email, password) {
      if (!firebaseEnabled()) {
        const account = await createAccountRepo(email, password)
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      try {
        setGate(remember(await mod.registerEmail(email, password)))
      } catch (error) {
        const code = error instanceof AppError ? error.code : ''
        if (!shouldFallbackToSignIn(code)) throw error
        setGate(remember(await mod.signInEmail(email, password)))
      }
    },
    async login(email, password) {
      if (!firebaseEnabled()) {
        const account = await loginRepo(email, password)
        setGate({ kind: 'in', account })
        return
      }
      const mod = await import('../data/firebase/client')
      setGate(remember(await mod.signInEmail(email, password)))
    },
    logout() {
      clearSignInHint()
      if (!firebaseEnabled()) {
        logoutRepo()
        setGate({ kind: 'out' })
        return
      }
      void import('../data/firebase/client').then((mod) => mod.signOutEmail()).finally(() => setGate({ kind: 'out' }))
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

- [ ] **Step 9: Verifica che passino**

Run: `npx vitest run src/data/local/signInHint.test.ts src/lib/authAction.test.ts src/app/firebaseGate.test.tsx`
Expected: PASS. Il primo test del cancello cerca `role="status"` con nome «Caricamento Groomly»: `App` già mostra `LoadingSplash` quando il cancello è `pending`.

- [ ] **Step 10: Commit**

```powershell
git add src/data/local/signInHint.ts src/data/local/signInHint.test.ts src/data/local/storage.ts src/lib/authAction.ts src/lib/authAction.test.ts src/hooks/useSession.tsx src/app/firebaseGate.test.tsx
git commit -m "fix: con l'accesso già fatto l'app non mostra il login all'apertura"
```

---

### Task 3: Schermata di caricamento con saluto

**Files:**
- Modify: `src/app/LoadingSplash.tsx` (intero)
- Modify: `src/app/loadingSplash.css` (intero)
- Modify: `src/app/App.tsx` (intero)
- Test: `src/app/LoadingSplash.test.tsx` (nuovo), `src/app/firebaseGate.test.tsx`

**Interfaces:**
- Consumes: `greetingText` (Task 1), `readSignInHint` (Task 2).
- Produces: `LoadingSplash({ leaving?: boolean; greeting?: string | null })`.

- [ ] **Step 1: Test del componente**

`src/app/LoadingSplash.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingSplash } from './LoadingSplash'

describe('schermata di caricamento', () => {
  it('mostra il saluto sotto il logo', () => {
    render(<LoadingSplash greeting="Ciao Laura" />)
    const splash = screen.getByRole('status', { name: 'Caricamento Groomly' })
    const greeting = screen.getByText('Ciao Laura')
    expect(greeting).toHaveClass('loading-splash__greeting')
    expect(splash).toContainElement(greeting)
    const logo = splash.querySelector('.loading-splash__logo--light')
    expect(logo!.compareDocumentPosition(greeting) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('senza saluto mostra solo il logo', () => {
    render(<LoadingSplash />)
    expect(screen.getByRole('status', { name: 'Caricamento Groomly' }).querySelector('.loading-splash__greeting')).toBeNull()
  })
})
```

- [ ] **Step 2: Test del saluto nel cancello**

In `src/app/firebaseGate.test.tsx`, nel test `'con l’accesso ricordato non mostra il login mentre Firebase risponde'` (Task 2), subito dopo `render(...)` aggiungi:

```tsx
    expect(screen.getByText('Ciao Laura')).toBeInTheDocument()
```

e nel test `'se Firebase non risponde entro 10 secondi compare il login'`, subito dopo `render(...)`:

```tsx
      expect(screen.getByText('Ciao Roberto')).toBeInTheDocument()
```

- [ ] **Step 3: Verifica che falliscano**

Run: `npx vitest run src/app/LoadingSplash.test.tsx src/app/firebaseGate.test.tsx`
Expected: FAIL, `Unable to find an element with the text: Ciao Laura`.

- [ ] **Step 4: Componente**

`src/app/LoadingSplash.tsx`:

```tsx
import logoChiaro from '../assets/brand/groomly-logo-animato.svg'
import logoScuro from '../assets/brand/groomly-logo-animato-scuro.svg'
import './loadingSplash.css'

/** Schermata di caricamento con il logo animato; la versione chiara/scura segue il tema scelto nell'app (data-theme su <html>). */
export function LoadingSplash({ leaving = false, greeting = null }: { leaving?: boolean; greeting?: string | null }) {
  return (
    <div className={`loading-splash${leaving ? ' is-leaving' : ''}`} role="status" aria-label="Caricamento Groomly">
      <div className="loading-splash__center">
        <img className="loading-splash__logo loading-splash__logo--light" src={logoChiaro} alt="" />
        <img className="loading-splash__logo loading-splash__logo--dark" src={logoScuro} alt="" />
        {greeting ? <p className="loading-splash__greeting">{greeting}</p> : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: CSS**

`src/app/loadingSplash.css`:

```css
.loading-splash {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: var(--bg);
  transition: opacity 0.35s ease;
}
.loading-splash.is-leaving {
  opacity: 0;
  pointer-events: none;
}
.loading-splash__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.loading-splash__logo {
  width: min(84vw, 380px);
  height: auto;
}
.loading-splash__logo--dark {
  display: none;
}
[data-theme="dark"] .loading-splash__logo--light {
  display: none;
}
[data-theme="dark"] .loading-splash__logo--dark {
  display: block;
}
.loading-splash__greeting {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--tx);
  animation: splash-greet 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) 2.4s both;
}
@keyframes splash-greet {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@keyframes splash-greet-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .loading-splash__greeting {
    animation-name: splash-greet-fade;
  }
}
```

- [ ] **Step 6: `App.tsx` con una sola schermata**

Oggi durante `pending` si monta una `LoadingSplash` e poi un'altra sopra il router: l'animazione ripartirebbe. Sostituisci `src/app/App.tsx` con:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { RouterProvider, createBrowserRouter, createMemoryRouter } from 'react-router-dom'
import { readSignInHint } from '../data/local/signInHint'
import { useSession } from '../hooks/useSession'
import { greetingText } from '../lib/greeting'
import { Providers } from './providers'
import { buildRoutes } from './router'
import { prepareBrowserHistory, sheetEntries } from './sheetHistory'
import { UpdateNotice } from './UpdateNotice'
import { LoadingSplash } from './LoadingSplash'

/** Tempo minimo della schermata di caricamento: la scritta Groomly si compone e il saluto resta leggibile. */
const SPLASH_MIN_MS = 3600
const SPLASH_FADE_MS = 350

function useSplash(enabled: boolean, ready: boolean): 'show' | 'leaving' | 'done' {
  const [minElapsed, setMinElapsed] = useState(!enabled)
  const [done, setDone] = useState(!enabled)
  useEffect(() => {
    if (!enabled) return
    const t = window.setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS)
    return () => window.clearTimeout(t)
  }, [enabled])
  const leaving = ready && minElapsed
  useEffect(() => {
    if (!leaving || done) return
    const t = window.setTimeout(() => setDone(true), SPLASH_FADE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, done])
  if (done) return 'done'
  return leaving ? 'leaving' : 'show'
}

function Gate({ isDev, memory, initialPath }: { isDev: boolean; memory: boolean; initialPath: string }) {
  const { gate } = useSession()
  const ready = gate.kind !== 'pending'
  const splash = useSplash(!memory && import.meta.env.MODE !== 'test', ready)
  const greeting = useMemo(() => {
    if (gate.kind === 'in') return greetingText(gate.account.email)
    const hint = readSignInHint()
    return hint ? greetingText(hint.email) : null
  }, [gate])
  const router = useMemo(() => {
    const routes = buildRoutes(isDev)
    if (memory) {
      const entries = sheetEntries(initialPath)
      return createMemoryRouter(routes, { initialEntries: entries, initialIndex: entries.length - 1 })
    }
    prepareBrowserHistory()
    return createBrowserRouter(routes)
  }, [isDev, memory, initialPath])
  if (gate.kind === 'corrupt') return <p>Dati locali illeggibili</p>
  return (
    <>
      {ready ? <RouterProvider router={router} /> : null}
      {ready ? <UpdateNotice /> : null}
      {!ready || splash !== 'done' ? <LoadingSplash leaving={ready && splash === 'leaving'} greeting={greeting} /> : null}
    </>
  )
}

export function App({ isDev = import.meta.env.DEV, memory = false, initialPath = '/' }: { isDev?: boolean; memory?: boolean; initialPath?: string }) {
  return (
    <Providers>
      <Gate isDev={isDev} memory={memory} initialPath={initialPath} />
    </Providers>
  )
}
```

- [ ] **Step 7: Verifica che passino**

Run: `npx vitest run src/app/LoadingSplash.test.tsx src/app/firebaseGate.test.tsx src/app/UpdateNotice.test.tsx src/app/corruptStorage.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/app/LoadingSplash.tsx src/app/LoadingSplash.test.tsx src/app/loadingSplash.css src/app/App.tsx src/app/firebaseGate.test.tsx
git commit -m "feat: la schermata di caricamento saluta Laura o Roberto"
```

---

### Task 4: Android — avvio a tinta unita e niente doppio margine in alto

**Files:**
- Modify: `android/app/src/main/res/values/colors.xml`
- Create: `android/app/src/main/res/values-night/colors.xml`
- Create: `android/app/src/main/res/drawable/launch_blank.xml`
- Modify: `android/app/src/main/res/values/styles.xml` (stile `AppTheme.NoActionBarLaunch`)
- Modify: `android/app/src/main/java/it/groomly/app/MainActivity.java` (listener degli inset)

Nessun test automatico Android nel progetto: la verifica è la build Gradle e, dopo la pubblicazione, il telefono.

- [ ] **Step 1: Colore di avvio**

`android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#3a5ba0</color>
    <color name="colorPrimaryDark">#2a4680</color>
    <color name="colorAccent">#3a5ba0</color>
    <color name="launch_background">#ECEFF4</color>
</resources>
```

`android/app/src/main/res/values-night/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="launch_background">#0C111A</color>
</resources>
```

- [ ] **Step 2: Icona di avvio vuota**

`android/app/src/main/res/drawable/launch_blank.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
</shape>
```

- [ ] **Step 3: Stile di avvio**

In `android/app/src/main/res/values/styles.xml` sostituisci il blocco `AppTheme.NoActionBarLaunch` con:

```xml
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/launch_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/launch_blank</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">@color/launch_background</item>
    </style>
```

- [ ] **Step 4: Inset del ritaglio fotocamera**

In `MainActivity.java` sostituisci il listener degli inset con:

```java
        ViewCompat.setOnApplyWindowInsetsListener(decor, (view, insets) -> {
            int types = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = insets.getInsets(types);
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(types, Insets.NONE)
                .setDisplayCutout(null)
                .build();
        });
```

- [ ] **Step 5: Build Android**

Run:

```powershell
npm run build
npx cap sync android
cd android; .\gradlew assembleDebug; cd ..
```

Expected: `BUILD SUCCESSFUL`. Se `windowSplashScreenAnimatedIcon` viene rifiutato, controlla che `androidx.core:core-splashscreen` sia in `android/app/build.gradle` (c'è: `coreSplashScreenVersion = '1.2.0'`).

- [ ] **Step 6: Commit**

```powershell
git add android/app/src/main/res/values/colors.xml android/app/src/main/res/values-night/colors.xml android/app/src/main/res/drawable/launch_blank.xml android/app/src/main/res/values/styles.xml android/app/src/main/java/it/groomly/app/MainActivity.java
git commit -m "fix: avvio Android a tinta unita e senza doppio margine sotto la fotocamera"
```

---

### Task 5: Logo di testata e `BrandBar`

**Files:**
- Create: `src/assets/brand/groomly-logo-testata.svg`, `src/assets/brand/groomly-logo-testata-scuro.svg`
- Create: `src/theme/useDocumentTheme.ts`
- Create: `src/components/layout/BrandBar.tsx`
- Modify: `src/theme/sizes.ts` (voce `brandBar`)
- Test: `src/brand.test.ts`, `src/components/layout/brandBar.test.tsx` (nuovo)

**Interfaces:**
- Produces: `useDocumentTheme(): 'light' | 'dark'`; `BrandBar({ size?: 'regular' | 'large'; as?: 'div' | 'h1' })` che rende un elemento con `data-testid="brand-bar"` e un solo `<img alt="Groomly" height={30|44}>`; `SIZES.brandBar = { regular: 30, large: 44, padTop: 10, gap: 8 }`.

- [ ] **Step 1: Test degli asset**

In `src/brand.test.ts` aggiungi in fondo, dentro `describe('marchio', …)`:

```ts
  it('il logo di testata è l’orizzontale senza TOELETTATURA', () => {
    const pairs: [string, string, string][] = [
      ['groomly-logo-orizzontale.svg', 'groomly-logo-testata.svg', '#6B7A8C'],
      ['groomly-logo-scuro.svg', 'groomly-logo-testata-scuro.svg', '#B8C4D2'],
    ]
    for (const [source, target, subtitle] of pairs) {
      const original = readFileSync(path.join(root, 'Icon and logo', source), 'utf8')
      const testata = readFileSync(path.join(root, 'src', 'assets', 'brand', target), 'utf8')
      const expected = original
        .replace(new RegExp(`<g fill="${subtitle}">[\\s\\S]*?</g>\\s*`), '')
        .replace('viewBox="0 0 437 120" width="1311" height="360"', 'viewBox="6 6 426 108"')
      expect(testata).toBe(expected)
      expect(testata).not.toContain(`fill="${subtitle}"`)
    }
  })
```

- [ ] **Step 2: Test di `BrandBar`**

`src/components/layout/brandBar.test.tsx`:

```tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import { SIZES } from '../../theme/sizes'
import { BrandBar } from './BrandBar'

describe('logo di testata', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('nelle pagine è il logo chiaro alto 30 px', () => {
    render(<BrandBar />)
    const logo = screen.getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '30')
    expect(screen.getByTestId('brand-bar').tagName).toBe('DIV')
    expect(SIZES.brandBar).toEqual({ regular: 30, large: 44, padTop: 10, gap: 8 })
  })

  it('in Home è il titolo, alto 44 px', () => {
    render(<BrandBar size="large" as="h1" />)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    expect(heading).toBe(screen.getByTestId('brand-bar'))
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
  })

  it('segue il tema scuro', async () => {
    document.documentElement.dataset.theme = 'dark'
    render(<BrandBar />)
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoTestataScuro)
    await act(async () => {
      document.documentElement.dataset.theme = 'light'
    })
    await waitFor(() => expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoTestata))
  })
})
```

- [ ] **Step 3: Verifica che falliscano**

Run: `npx vitest run src/brand.test.ts src/components/layout/brandBar.test.tsx`
Expected: FAIL, file `groomly-logo-testata.svg` e `./BrandBar` mancanti.

- [ ] **Step 4: Crea gli asset**

Crea il file temporaneo `.tmp-testata.mjs` nella radice:

```js
import { readFileSync, writeFileSync } from 'node:fs'

const pairs = [
  ['groomly-logo-orizzontale.svg', 'groomly-logo-testata.svg', '#6B7A8C'],
  ['groomly-logo-scuro.svg', 'groomly-logo-testata-scuro.svg', '#B8C4D2'],
]
for (const [source, target, subtitle] of pairs) {
  const original = readFileSync(`Icon and logo/${source}`, 'utf8')
  const out = original
    .replace(new RegExp(`<g fill="${subtitle}">[\\s\\S]*?</g>\\s*`), '')
    .replace('viewBox="0 0 437 120" width="1311" height="360"', 'viewBox="6 6 426 108"')
  if (out === original || out.includes(`fill="${subtitle}"`)) throw new Error(`nessuna modifica ${source}`)
  writeFileSync(`src/assets/brand/${target}`, out)
}
```

Run:

```powershell
node .tmp-testata.mjs
Remove-Item .tmp-testata.mjs
```

Expected: nessun output; i due file esistono e non contengono il gruppo «TOELETTATURA».

- [ ] **Step 5: Misure**

In `src/theme/sizes.ts`, dentro `SIZES`, dopo `bottomNav: { … },` aggiungi:

```ts
  brandBar: { regular: 30, large: 44, padTop: 10, gap: 8 },
```

- [ ] **Step 6: Tema del documento**

`src/theme/useDocumentTheme.ts`:

```ts
import { useSyncExternalStore } from 'react'

function read(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export function useDocumentTheme(): 'light' | 'dark' {
  return useSyncExternalStore<'light' | 'dark'>(subscribe, read, () => 'light')
}
```

- [ ] **Step 7: `BrandBar`**

`src/components/layout/BrandBar.tsx`:

```tsx
import logoTestata from '../../assets/brand/groomly-logo-testata.svg'
import logoTestataScuro from '../../assets/brand/groomly-logo-testata-scuro.svg'
import { SIZES } from '../../theme/sizes'
import { useDocumentTheme } from '../../theme/useDocumentTheme'

export function BrandBar({ size = 'regular', as: Tag = 'div' }: { size?: 'regular' | 'large'; as?: 'div' | 'h1' }) {
  const dark = useDocumentTheme() === 'dark'
  const height = SIZES.brandBar[size]
  return (
    <Tag data-testid="brand-bar" style={{ margin: 0, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <img alt="Groomly" src={dark ? logoTestataScuro : logoTestata} height={height} style={{ display: 'block', height, width: 'auto', maxWidth: '100%' }} />
    </Tag>
  )
}
```

- [ ] **Step 8: Verifica che passino**

Run: `npx vitest run src/brand.test.ts src/components/layout/brandBar.test.tsx src/theme/theme.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/assets/brand/groomly-logo-testata.svg src/assets/brand/groomly-logo-testata-scuro.svg src/theme/useDocumentTheme.ts src/theme/sizes.ts src/components/layout/BrandBar.tsx src/components/layout/brandBar.test.tsx src/brand.test.ts
git commit -m "feat: logo Groomly di testata senza TOELETTATURA, chiaro e scuro"
```

---

### Task 6: Logo in alto in Home, Agenda e tutte le pagine con `Header`

**Files:**
- Modify: `src/components/layout/Header.tsx` (intero)
- Modify: `src/pages/HomePage.tsx:3` (import) e `:128-137` (intestazione)
- Modify: `src/pages/CalendarPage.tsx:612-613` (riga del logo prima della navigazione mese)
- Test: `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: `BrandBar`, `SIZES.brandBar` (Task 5).

- [ ] **Step 1: Aggiorna i test del guscio**

In `src/pages/shellPages.test.tsx`:

1. Sostituisci l'import `import brandIcon from '../assets/brand/groomly-icon.svg'` con:

```tsx
import logoTestata from '../assets/brand/groomly-logo-testata.svg'
```

2. Aggiungi `within` all'import di Testing Library: `import { render, screen, waitFor, within } from '@testing-library/react'`.

3. Sostituisci il test `'mostra l’icona rotonda accanto al titolo'` con:

```tsx
  it('in Home il logo grande è il titolo e sotto c’è la data', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    const logo = within(heading).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '44')
    expect(heading.closest('header')).toHaveTextContent('Giovedì 1 ottobre')
    expect(screen.queryByText(/^Ciao/)).not.toBeInTheDocument()
  })

  it('nelle altre pagine il logo sta sopra il titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('link', { name: 'Animali' }))
    const title = await screen.findByRole('heading', { name: 'Animali' })
    const header = title.closest('header')!
    const logo = within(header).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('height', '30')
    expect(logo.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Agenda' }))
    await screen.findByRole('heading', { name: 'Ottobre 2026' })
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '30')
  })
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/pages/shellPages.test.tsx`
Expected: FAIL — in Home non c'è `img` «Groomly» dentro il titolo; in Animali nessun logo nell'intestazione.

- [ ] **Step 3: `Header`**

`src/components/layout/Header.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { BrandBar } from './BrandBar'

const backStyle = { width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' } as const

export function Header({ title, subtitle, backTo, onBack, action }: { title: string; subtitle?: string; backTo?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: SIZES.brandBar.gap, padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
      <BrandBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Indietro" style={backStyle}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          </button>
        ) : backTo ? (
          <Link to={backTo} aria-label="Indietro" style={backStyle}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15 }}>
            {title}
          </h1>
          {subtitle ? <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>{subtitle}</small> : null}
        </div>
        {action}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Home**

In `src/pages/HomePage.tsx`:

1. Rimuovi la riga `import brandIcon from '../assets/brand/groomly-icon.svg'` e aggiungi tra gli import dei componenti:

```tsx
import { BrandBar } from '../components/layout/BrandBar'
```

2. Sostituisci il blocco `<header …>…</header>` (oggi righe 128-137, icona 26 px + `h1` «Groomly» + data) con:

```tsx
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
        <BrandBar size="large" as="h1" />
        <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>
          {formatHomeDate(now)}
        </small>
      </header>
```

- [ ] **Step 5: Agenda**

In `src/pages/CalendarPage.tsx`, nel `return` sostituisci:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
```

con:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
          <BrandBar />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.brandBar.gap}px ${SIZES.pagePadX}px 0` }}>
```

e aggiungi in cima l'import:

```tsx
import { BrandBar } from '../components/layout/BrandBar'
```

- [ ] **Step 6: Verifica**

Run: `npx vitest run src/pages/shellPages.test.tsx src/pages/HomePage.test.tsx src/pages/DogsPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ServicesPage.test.tsx src/pages/LoginPage.test.tsx`
Expected: PASS. I test che aspettano `heading` «Groomly» trovano il titolo della Home (il nome viene dall'`alt` del logo). Se un test cerca `getByRole('img', { name: 'Groomly' })` in una pagina con più loghi, restringilo con `within` alla zona giusta.

- [ ] **Step 7: Commit**

```powershell
git add src/components/layout/Header.tsx src/pages/HomePage.tsx src/pages/CalendarPage.tsx src/pages/shellPages.test.tsx
git commit -m "feat: logo Groomly in alto in Home, Agenda e in tutte le pagine"
```

---

### Task 7: Tutta larghezza, niente vuoto in alto, «+» che va a capo

**Files:**
- Modify: `src/components/layout/PhoneShell.tsx:8`
- Modify: `src/components/layout/bottomNav.css:16-17`
- Modify: `src/components/layout/Sheet.tsx:48`
- Modify: `src/index.css` (variabile `--safe-top`)
- Modify: `src/theme/theme.ts` (`applyPlatform`)
- Modify: `src/main.tsx`
- Create: `src/lib/breakAfterPlus.tsx`
- Modify: `src/pages/ListinoPage.tsx:549` e `:582`
- Test: `src/components/layout/shell.test.tsx`, `src/theme/theme.test.ts`, `src/lib/breakAfterPlus.test.tsx` (nuovo)

**Interfaces:**
- Produces: `applyPlatform(native: boolean): void` (classe `native` su `<html>`), `breakAfterPlus(text: string): ReactNode`.

- [ ] **Step 1: Test del guscio**

In `src/components/layout/shell.test.tsx` aggiungi in cima:

```tsx
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
```

e sostituisci il test `'limita la colonna a 390 px e mostra la barra'` con:

```tsx
  it('usa tutta la larghezza fino a 640 px, parte sotto la barra di stato e mostra la barra', () => {
    render(
      <MemoryRouter>
        <PhoneShell showNav>
          <p>Oggi</p>
        </PhoneShell>
      </MemoryRouter>,
    )
    const shell = screen.getByTestId('phone-shell')
    expect(shell).toHaveStyle({ maxWidth: '640px' })
    expect(shell.getAttribute('style')).toContain('var(--safe-top)')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Animali' })).toHaveAttribute('href', '/animali')
    expect(screen.getByRole('button', { name: 'Aggiungi' })).toBeInTheDocument()
    const contentPad = shell.firstElementChild?.getAttribute('style') ?? ''
    expect(contentPad).toContain('safe-area-inset-bottom')
    expect(contentPad).toMatch(/72px \+ 56px|128px/)
    const navCss = readFileSync(createRequire(import.meta.url).resolve('./bottomNav.css'), 'utf8')
    expect(navCss).toContain('calc((100% - 640px) / 2 + 4px)')
    expect(navCss).not.toContain('390px')
  })
```

Nel test `'apre il foglio e il toast Salvato'` aggiungi dopo la prima `expect`:

```tsx
    expect(screen.getByRole('dialog', { name: 'Prova' }).getAttribute('style')).toContain('min(100%, 640px)')
```

- [ ] **Step 2: Test della piattaforma**

In `src/theme/theme.test.ts` cambia l'import in `import { applyPlatform, resolveTheme } from './theme'` e aggiungi in fondo:

```ts
describe('applyPlatform', () => {
  it('segna l’app Android e la toglie nel browser', () => {
    const css = readFileSync(createRequire(import.meta.url).resolve('../index.css'), 'utf8')
    expect(css).toContain('--safe-top: env(safe-area-inset-top, 0px);')
    expect(css).toContain(':root.native')
    applyPlatform(true)
    expect(document.documentElement.classList.contains('native')).toBe(true)
    applyPlatform(false)
    expect(document.documentElement.classList.contains('native')).toBe(false)
  })
})
```

- [ ] **Step 3: Test del «+»**

`src/lib/breakAfterPlus.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { breakAfterPlus } from './breakAfterPlus'

describe('a capo dopo il +', () => {
  it('mette un punto di a capo dopo ogni + e lascia il testo uguale', () => {
    const { container } = render(<div>{breakAfterPlus('Bagno+sistemazione')}</div>)
    const box = container.firstElementChild!
    expect(box.textContent).toBe('Bagno+sistemazione')
    expect(box.querySelectorAll('wbr')).toHaveLength(1)
    expect(box.innerHTML).toBe('Bagno+<wbr>sistemazione')
  })

  it('senza + non aggiunge nulla', () => {
    const { container } = render(<div>{breakAfterPlus('Stripping')}</div>)
    expect(container.firstElementChild!.innerHTML).toBe('Stripping')
  })
})
```

- [ ] **Step 4: Verifica che falliscano**

Run: `npx vitest run src/components/layout/shell.test.tsx src/theme/theme.test.ts src/lib/breakAfterPlus.test.tsx`
Expected: FAIL — `maxWidth` è 390px, `applyPlatform` e `breakAfterPlus` non esistono.

- [ ] **Step 5: `PhoneShell`**

In `src/components/layout/PhoneShell.tsx`, nello stile del `div` `phone-shell`, cambia `maxWidth: 390` in `maxWidth: 640` e `paddingTop: 'env(safe-area-inset-top, 0px)'` in `paddingTop: 'var(--safe-top)'`. La riga diventa:

```tsx
    <div data-testid="phone-shell" style={{ width: '100%', maxWidth: 640, minHeight: '100dvh', margin: '0 auto', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top)' }}>
```

- [ ] **Step 6: Barra in basso e foglio**

In `src/components/layout/bottomNav.css` sostituisci:

```css
  left: max(4px, calc((100% - 390px) / 2 + 4px));
  right: max(4px, calc((100% - 390px) / 2 + 4px));
```

con:

```css
  left: max(4px, calc((100% - 640px) / 2 + 4px));
  right: max(4px, calc((100% - 640px) / 2 + 4px));
```

In `src/components/layout/Sheet.tsx` cambia `width: 'min(100%, 390px)',` in `width: 'min(100%, 640px)',`. `Dialog.tsx` resta com'è.

- [ ] **Step 7: Margine superiore**

In `src/index.css`, dopo le due righe `@import`, aggiungi:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
}

:root.native {
  --safe-top: 0px;
}
```

In `src/theme/theme.ts` aggiungi in fondo:

```ts
export function applyPlatform(native: boolean): void {
  document.documentElement.classList.toggle('native', native)
}
```

`src/main.tsx`:

```tsx
import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyPlatform } from './theme/theme'
import './index.css'

applyPlatform(Capacitor.isNativePlatform())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: `breakAfterPlus`**

`src/lib/breakAfterPlus.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react'

export function breakAfterPlus(text: string): ReactNode {
  const parts = text.split('+')
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <>+<wbr /></> : null}
    </Fragment>
  ))
}
```

In `src/pages/ListinoPage.tsx` aggiungi l'import `import { breakAfterPlus } from '../lib/breakAfterPlus'` e cambia le due righe dei nomi:

```tsx
                          <div style={{ fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{breakAfterPlus(row.name)}</div>
```

```tsx
                      <span style={{ display: 'block', fontWeight: 700, fontSize: TYPE.rowTitle, overflowWrap: 'anywhere' }}>{breakAfterPlus(row.name)}</span>
```

- [ ] **Step 9: Verifica**

Run: `npx vitest run src/components/layout/shell.test.tsx src/theme/theme.test.ts src/lib/breakAfterPlus.test.tsx src/pages/listino.test.tsx`
Expected: PASS. Se un test del listino cerca un nome con «+» via `getByText`, passa comunque: i pezzi di testo sono figli diretti dello stesso elemento.

- [ ] **Step 10: Commit**

```powershell
git add src/components/layout/PhoneShell.tsx src/components/layout/bottomNav.css src/components/layout/Sheet.tsx src/components/layout/shell.test.tsx src/index.css src/theme/theme.ts src/theme/theme.test.ts src/main.tsx src/lib/breakAfterPlus.tsx src/lib/breakAfterPlus.test.tsx src/pages/ListinoPage.tsx
git commit -m "fix: il contenuto usa tutto lo schermo e parte subito sotto la barra di stato"
```

---

### Task 8: Verifica completa e pubblicazione 1.1.38

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json`

- [ ] **Step 1: Suite e build**

Run:

```powershell
npm test
npm run build
```

Expected: tutti i test PASS, build senza errori TypeScript. Se un test esterno ai task fallisce per il logo in più (`img` «Groomly» ripetuto) o per la larghezza 390, correggi l'aspettativa nel test di quella pagina seguendo la spec, poi rilancia `npm test`.

- [ ] **Step 2: Versione 1.1.38**

- `src/lib/appVersion.ts`: `APP_VERSION = '1.1.38'` e

```ts
export const APP_NOTES = [
  'All’apertura non compare più il login se hai già fatto l’accesso.',
  'La schermata di caricamento ti saluta per nome.',
  'Logo Groomly in alto in ogni pagina e contenuto a tutto schermo.',
]
```

- `package.json`: `"version": "1.1.38"`.
- `android/app/build.gradle`: `versionCode 10138`, `versionName "1.1.38"`.
- `hosting/release.json`:

```json
{
  "version": "1.1.38",
  "url": "https://github.com/robmass83-ui/Groomly/releases/download/v1.1.38/groomly.apk",
  "notes": [
    "All’apertura non compare più il login se hai già fatto l’accesso.",
    "La schermata di caricamento ti saluta per nome.",
    "Logo Groomly in alto in ogni pagina e contenuto a tutto schermo."
  ]
}
```

- [ ] **Step 3: APK**

Run:

```powershell
npm test
npm run build
npx cap sync android
cd android; .\gradlew assembleDebug; cd ..
Copy-Item android/app/build/outputs/apk/debug/app-debug.apk groomly.apk -Force
```

Expected: `BUILD SUCCESSFUL`, `groomly.apk` nella radice (fuori da `hosting/`, non nel commit).

- [ ] **Step 4: Commit e push**

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "chore: versione 1.1.38"
git push origin feat/listino-razze
```

Se `npx cap sync` ha modificato `android/app/capacitor.build.gradle` o `android/capacitor.settings.gradle`, controlla il diff: committali solo se il cambiamento viene da questa sync e serve alla build.

- [ ] **Step 5: Release GitHub**

```powershell
gh release create v1.1.38 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.38" --notes "All'apertura non compare più il login se l'accesso è già fatto; la schermata di caricamento saluta Laura o Roberto; logo Groomly in alto in ogni pagina; contenuto a tutta larghezza senza vuoto sotto la barra di stato."
```

- [ ] **Step 6: Firebase**

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati: fermati e dillo all'utente.

- [ ] **Step 7: Verifica sul telefono (con l'utente)**

Chiedi all'utente di installare l'aggiornamento e controllare: (1) chiudendo e riaprendo l'app non compare il login; (2) il logo animato è al centro e sotto compare «Ciao Laura» / «Ciao Roberto»; (3) nessun vuoto tra barra di stato e logo; (4) il contenuto arriva ai bordi con lo stesso margine di 12 px; (5) «Bagno+sistemazione» va a capo dopo il «+».
