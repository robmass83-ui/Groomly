# Registrazione e accesso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un titolare nuovo si registra (nome, cognome, email, password, nome della toelettatura) e ottiene un salone vuoto; Laura resta su `salon/shared` senza rifare la registrazione.

**Architecture:** Funzioni pure decidono percorso, regole di scrittura e quale schermata mostrare. Il client Firebase tiene un solo id di salone attivo e tutte le letture passano da lì. `salon/shared` resta di Laura. I saloni nuovi sono `salons/{uid}`. La UI di accesso è due viste sulla route `/login`. L'avviso fiscale legge `business.vatNumber` e `business.taxCode`.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom 6, react-hook-form, zod, Firebase Auth + Firestore, Vitest 3, Testing Library, happy-dom.

**Spec:** `docs/superpowers/specs/archive/2026-10-17-registrazione-accesso-design.md`

## Global Constraints

- Testi alla lettera: `Crea account`, `Entra`, `Non hai un account? Crea account`, `Hai già un account? Entra`, `Password dimenticata`, `Puoi completarli dopo`, `Conferma l'email`, `Ho confermato`, `Invia di nuovo`, `Esci`, `Nuova password`, `Conferma la tua email`, `Apri il link che ti abbiamo inviato`, `Invia`, `Aggiungi partita IVA o codice fiscale`, `Per completare l'attività`, `Aggiungi`, `Basta la partita IVA oppure il codice fiscale.`, `Questa email ha già un account`, `Email o password non corretti`, `Connessione assente`, `Il link non risulta ancora aperto`, `Aspetta un momento e riprova`, `Salvataggio non riuscito`, `Inserisci un'email valida`, `Minimo 8 caratteri`, `Il nome è obbligatorio`, `Il cognome è obbligatorio`, `Il nome della toelettatura è obbligatorio`, `11 cifre, senza IT`, `16 lettere o numeri`.
- Email di Laura, minuscolo: `laura.masala@tiscali.it`. Id del suo salone: `shared`. Ruolo salvato: `titolare`.
- Partita IVA scritta: 11 cifre, senza prefisso `IT`. Codice fiscale scritto: 16 tra lettere e numeri, salvato in maiuscolo. Vuoto ammesso. Chiave impostazioni: `business.taxCode`.
- Recupero password, testo intero: `Se questo indirizzo è un account Groomly, ti arriva un'email per scegliere una nuova password. Poi torna su Entra.`
- Conferma email, testo: `Ti abbiamo scritto a {email}. Apri il messaggio e tocca il link, poi torna qui.`
- Logo animato intero e fisso: `src/assets/brand/groomly-logo-animato.svg` in chiaro, `groomly-logo-animato-scuro.svg` con tema scuro. Niente cerchio che lo taglia.
- Colori solo `var(--…)`. Titolo 17, testo 12.5, etichetta 11, da `TYPE`.
- Con Firebase spento non c'è conferma email. `Password dimenticata` risponde `Connessione assente`. `createAccount(email, password)` senza profilo resta la fixture dei test già esistenti.
- Comandi da `d:\Groomly`, PowerShell, senza `&&`. Un file: `npx vitest run <file>`. Tutto: `npm test`.
- `git add` con percorsi espliciti. Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`, né file estranei. I task fanno solo commit. Non alzare `APP_VERSION`. Ramo: quello corrente.

## Chiusure (la fonte si poteva leggere in due modi)

- **Vista iniziale.** Senza sessione e senza account locale la vista è `Crea account`. Se esiste un account locale o un hint di accesso, la vista è `Entra` con l'email compilata.
- **Chiavi account.** `firstName`, `lastName`, `email`, `salonId`, `role`, `legacy`. Il telefono non è un campo della registrazione.
- **Codice fiscale.** Non sta nel modulo di registrazione. Sta nel foglio Attività.
- **Ordine di creazione.** Utente Firebase, documento `accounts/{uid}`, salone vuoto con `business.name`, poi email di conferma. Se account o salone mancano si vede `Riprova`, non `Conferma l'email`.
- **Due email del saluto** (`masala.roberto@hotmail.it`, `robmass83@gmail.com`) non sono Laura e non leggono `shared`.
- **Saluto.** Se `firstName` ha caratteri, `Ciao {firstName}`. Altrimenti la mappa email già in `greeting.ts`. Altrimenti `Ciao!`.
- **Fasce in home.** Prima la conferma email di Laura, se serve. Poi la fascia fiscale, se serve. Poi quella dei mensili.
- **Bollino.** Stessa classe `.bottom-nav__dot` di Avvisi, sulla voce `Altro` (`/impostazioni`), `data-testid="tax-dot"`.
- **Aggiungi.** Naviga a `/impostazioni` con state `{ openBusiness: true }` e il foglio Attività si apre.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/lib/salonPath.ts` | Id, percorso, documento account, chi può leggere |
| `src/lib/profile.ts` | Partita IVA, codice fiscale, schema di registrazione |
| `src/lib/authGate.ts` | Home, conferma email, o riparazione del salone; fascia fiscale |
| `src/data/firebase/salonRoot.ts` | Id attivo e segmenti di percorso usati dal client |
| `src/data/local/auth.ts` | Profilo opzionale sull'account locale |
| `src/data/local/settings.ts`, `src/lib/firebaseMap.ts` | `business.taxCode` |
| `src/data/firebase/client.ts`, `src/data/firebase/files.ts` | Leggono solo il salone attivo |
| `firestore.rules` | Laura su `shared`, gli altri solo sul proprio id |
| `src/pages/LoginPage.tsx`, `src/components/brand/AuthMark.tsx` | Due viste e logo fisso |
| `src/hooks/useSession.tsx` | Registrazione con profilo, reset, reinvio, riparazione |
| `src/pages/HomePage.tsx`, `src/components/layout/BottomNav.tsx`, `src/pages/SettingsPage.tsx` | Fasce, bollino, codice fiscale |
| `src/lib/greeting.ts`, `src/app/App.tsx` | Saluto col nome |

---

### Task 1: Percorso del salone

**Files:**
- Create: `src/lib/salonPath.ts`
- Test: `src/lib/salonPath.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `export const LAURA_EMAIL = 'laura.masala@tiscali.it'`
  - `export const SHARED_SALON_ID = 'shared'`
  - `export type AccountRole = 'titolare'`
  - `export interface CloudAccount { firstName: string; lastName: string; email: string; salonId: string; role: AccountRole; legacy: boolean }`
  - `normalizeEmail(email: string): string`
  - `isLauraEmail(email: string | null | undefined): boolean`
  - `salonCollection(salonId: string): string[]`
  - `newOwnerAccount(uid: string, input: { firstName: string; lastName: string; email: string }): CloudAccount`
  - `lauraAccount(email: string): CloudAccount`
  - `accountCreateAllowed(uid: string, email: string, data: CloudAccount): boolean`
  - `canReadSalon(email: string, account: CloudAccount | null, salonId: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  accountCreateAllowed,
  canReadSalon,
  isLauraEmail,
  lauraAccount,
  newOwnerAccount,
  salonCollection,
} from './salonPath'

describe('salonPath', () => {
  it('shared resta salon/shared e un id nuovo sta sotto salons', () => {
    expect(salonCollection('shared')).toEqual(['salon', 'shared'])
    expect(salonCollection('uid-9')).toEqual(['salons', 'uid-9'])
  })

  it('riconosce solo l’email di Laura, in qualunque maiuscolo', () => {
    expect(isLauraEmail(' Laura.Masala@tiscali.it ')).toBe(true)
    expect(isLauraEmail('robmass83@gmail.com')).toBe(false)
    expect(isLauraEmail('masala.roberto@hotmail.it')).toBe(false)
  })

  it('un titolare nuovo ha id uguale all’utente e legacy falso', () => {
    expect(newOwnerAccount('uid-9', { firstName: ' Ada ', lastName: ' Neri ', email: 'Ada@Salone.it' })).toEqual({
      firstName: 'Ada',
      lastName: 'Neri',
      email: 'ada@salone.it',
      salonId: 'uid-9',
      role: 'titolare',
      legacy: false,
    })
  })

  it('Laura può il documento shared; un altro no. Il nuovo può solo il suo id', () => {
    const laura = lauraAccount('laura.masala@tiscali.it')
    const ada = newOwnerAccount('uid-9', { firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it' })
    expect(accountCreateAllowed('laura', 'laura.masala@tiscali.it', laura)).toBe(true)
    expect(accountCreateAllowed('uid-9', 'ada@salone.it', { ...ada, salonId: 'shared', legacy: true })).toBe(false)
    expect(accountCreateAllowed('uid-9', 'ada@salone.it', ada)).toBe(true)
    expect(canReadSalon('laura.masala@tiscali.it', null, 'shared')).toBe(true)
    expect(canReadSalon('ada@salone.it', ada, 'shared')).toBe(false)
    expect(canReadSalon('ada@salone.it', ada, 'uid-9')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/salonPath.test.ts`
Expected: FAIL, cannot find module `./salonPath`

- [ ] **Step 3: Write minimal implementation**

```ts
export const LAURA_EMAIL = 'laura.masala@tiscali.it'
export const SHARED_SALON_ID = 'shared'

export type AccountRole = 'titolare'

export interface CloudAccount {
  firstName: string
  lastName: string
  email: string
  salonId: string
  role: AccountRole
  legacy: boolean
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isLauraEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email ?? '') === LAURA_EMAIL
}

export function salonCollection(salonId: string): string[] {
  if (salonId === SHARED_SALON_ID) return ['salon', 'shared']
  return ['salons', salonId]
}

export function newOwnerAccount(uid: string, input: { firstName: string; lastName: string; email: string }): CloudAccount {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: normalizeEmail(input.email),
    salonId: uid,
    role: 'titolare',
    legacy: false,
  }
}

export function lauraAccount(email: string): CloudAccount {
  return {
    firstName: '',
    lastName: '',
    email: normalizeEmail(email),
    salonId: SHARED_SALON_ID,
    role: 'titolare',
    legacy: true,
  }
}

export function accountCreateAllowed(uid: string, email: string, data: CloudAccount): boolean {
  if (data.role !== 'titolare') return false
  if (isLauraEmail(email) && data.legacy && data.salonId === SHARED_SALON_ID) return true
  return data.legacy === false && data.salonId === uid && data.salonId !== SHARED_SALON_ID
}

export function canReadSalon(email: string, account: CloudAccount | null, salonId: string): boolean {
  if (salonId === SHARED_SALON_ID && isLauraEmail(email)) return true
  return account?.salonId === salonId
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/salonPath.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/salonPath.ts src/lib/salonPath.test.ts
git commit -m "feat: percorso del salone e chi puo leggerlo"
```

---

### Task 2: Partita IVA, codice fiscale, schema

**Files:**
- Create: `src/lib/profile.ts`
- Test: `src/lib/profile.test.ts`
- Modify: `src/lib/schemas.ts`

**Interfaces:**
- Consumes: `normalizeEmail` da `src/lib/salonPath.ts`
- Produces:
  - `vatError(value: string): string | null`
  - `taxCodeError(value: string): string | null`
  - `normalizeVat(value: string): string`
  - `normalizeTaxCode(value: string): string`
  - `fiscalNoticeVisible(vat: string, taxCode: string): boolean`
  - `export const registrationSchema` in `src/lib/schemas.ts`, output `{ firstName, lastName, email, password, salonName, vatNumber, address }` con stringhe già normalizzate (`vatNumber` `''` oppure 11 cifre)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { registrationSchema } from './schemas'
import { fiscalNoticeVisible, normalizeTaxCode, taxCodeError, vatError } from './profile'

describe('profile', () => {
  it('la partita IVA vuota passa, 11 cifre passano, IT e il resto no', () => {
    expect(vatError('')).toBeNull()
    expect(vatError(' 12345678901 ')).toBeNull()
    expect(vatError('IT12345678901')).toBe('11 cifre, senza IT')
    expect(vatError('123')).toBe('11 cifre, senza IT')
  })

  it('il codice fiscale vuoto passa e si salva in maiuscolo', () => {
    expect(taxCodeError('')).toBeNull()
    expect(normalizeTaxCode(' rssmra85t10a562s ')).toBe('RSSMRA85T10A562S')
    expect(taxCodeError('ABC')).toBe('16 lettere o numeri')
  })

  it('la fascia c’è solo se mancano entrambi', () => {
    expect(fiscalNoticeVisible('', '')).toBe(true)
    expect(fiscalNoticeVisible('12345678901', '')).toBe(false)
    expect(fiscalNoticeVisible('', 'RSSMRA85T10A562S')).toBe(false)
    expect(fiscalNoticeVisible('', '   ')).toBe(true)
  })

  it('la registrazione pretende i cinque campi e lascia vuoti IVA e indirizzo', () => {
    const ok = registrationSchema.safeParse({
      firstName: ' Ada ', lastName: 'Neri', email: 'Ada@Salone.it', password: 'segretissimo',
      salonName: ' I Pelosetti ', vatNumber: '', address: '',
    })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data).toMatchObject({ firstName: 'Ada', email: 'ada@salone.it', salonName: 'I Pelosetti', vatNumber: '' })
    expect(registrationSchema.safeParse({
      firstName: '', lastName: 'Neri', email: 'ada@salone.it', password: 'corta', salonName: '', vatNumber: '12', address: '',
    }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: FAIL, `./profile` assente e `registrationSchema` non esportato

- [ ] **Step 3: Write minimal implementation**

`src/lib/profile.ts`:

```ts
import { normalizeEmail } from './salonPath'

export function normalizeVat(value: string): string {
  return value.replace(/\s/g, '')
}

export function normalizeTaxCode(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function vatError(value: string): string | null {
  const vat = normalizeVat(value)
  if (vat === '') return null
  return /^\d{11}$/.test(vat) ? null : '11 cifre, senza IT'
}

export function taxCodeError(value: string): string | null {
  const code = normalizeTaxCode(value)
  if (code === '') return null
  return /^[A-Z0-9]{16}$/.test(code) ? null : '16 lettere o numeri'
}

export function fiscalNoticeVisible(vat: string, taxCode: string): boolean {
  return normalizeVat(vat) === '' && normalizeTaxCode(taxCode) === ''
}

export { normalizeEmail }
```

In `src/lib/schemas.ts`, accanto a `loginSchema`:

```ts
const vatField = z.string().trim().superRefine((value, ctx) => {
  if (vatError(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: '11 cifre, senza IT' })
})

export const registrationSchema = z.object({
  firstName: z.string().trim().min(1, 'Il nome è obbligatorio'),
  lastName: z.string().trim().min(1, 'Il cognome è obbligatorio'),
  email: z.string().trim().email('Inserisci un’email valida').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Minimo 8 caratteri'),
  salonName: z.string().trim().min(1, 'Il nome della toelettatura è obbligatorio'),
  vatNumber: vatField.transform((value) => value.replace(/\s/g, '')),
  address: z.string().trim(),
})
```

Importare `vatError` da `./profile`. Lo schema email usa l'apostrofo tipografico `un’email`, uguale a `loginSchema` già nel file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/profile.test.ts src/lib/schemas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/profile.ts src/lib/profile.test.ts src/lib/schemas.ts
git commit -m "feat: valida registrazione, partita IVA e codice fiscale"
```

---

### Task 3: Quale schermata dopo l'accesso

**Files:**
- Create: `src/lib/authGate.ts`
- Test: `src/lib/authGate.test.ts`
- Modify: `src/lib/authAction.ts`

**Interfaces:**
- Consumes: `isLauraEmail` da `src/lib/salonPath.ts`
- Produces:
  - `export type EntryGate = { kind: 'home' } | { kind: 'confirm-email' } | { kind: 'repair-salon' }`
  - `entryGate(input: { firebase: boolean; email: string; emailVerified: boolean; legacy: boolean; hasAccountDoc: boolean }): EntryGate`
  - `loginFailureMessage` guadagna il codice `auth_email_taken` → `Questa email ha già un account`
  - `passwordResetMessage(): string` → il testo intero del recupero
  - `confirmEmailCopy(email: string): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { confirmEmailCopy, entryGate, passwordResetMessage } from './authGate'
import { loginFailureMessage } from './authAction'

describe('entryGate', () => {
  it('senza Firebase entra in home', () => {
    expect(entryGate({ firebase: false, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('un nuovo senza documento ripara, Laura senza documento lavora', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'repair-salon' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('un nuovo non verificato conferma; Laura non verificata entra', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'confirm-email' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: true })).toEqual({ kind: 'home' })
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'home' })
  })

  it('i testi sono quelli fissati', () => {
    expect(loginFailureMessage('auth_email_taken')).toBe('Questa email ha già un account')
    expect(passwordResetMessage()).toBe('Se questo indirizzo è un account Groomly, ti arriva un’email per scegliere una nuova password. Poi torna su Entra.')
    expect(confirmEmailCopy('ada@salone.it')).toBe('Ti abbiamo scritto a ada@salone.it. Apri il messaggio e tocca il link, poi torna qui.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/authGate.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`src/lib/authGate.ts`:

```ts
import { isLauraEmail } from './salonPath'

export type EntryGate = { kind: 'home' } | { kind: 'confirm-email' } | { kind: 'repair-salon' }

export function entryGate(input: {
  firebase: boolean
  email: string
  emailVerified: boolean
  legacy: boolean
  hasAccountDoc: boolean
}): EntryGate {
  if (!input.firebase) return { kind: 'home' }
  if (!input.hasAccountDoc) return isLauraEmail(input.email) ? { kind: 'home' } : { kind: 'repair-salon' }
  if (!input.legacy && !input.emailVerified) return { kind: 'confirm-email' }
  return { kind: 'home' }
}

export function passwordResetMessage(): string {
  return 'Se questo indirizzo è un account Groomly, ti arriva un’email per scegliere una nuova password. Poi torna su Entra.'
}

export function confirmEmailCopy(email: string): string {
  return `Ti abbiamo scritto a ${email}. Apri il messaggio e tocca il link, poi torna qui.`
}
```

In `loginFailureMessage`, prima del `return` finale:

```ts
if (code === 'auth_email_taken') return 'Questa email ha già un account'
```

Aggiungere `'auth_email_taken'` a `AppErrorCode` in `src/data/errors.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/authGate.test.ts src/lib/authAction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/authGate.ts src/lib/authGate.test.ts src/lib/authAction.ts src/data/errors.ts
git commit -m "feat: decide conferma email, riparazione e testi di accesso"
```

---

### Task 4: Profilo sull'account locale

**Files:**
- Modify: `src/data/local/auth.ts`
- Modify: `src/data/local/auth.test.ts`

**Interfaces:**
- Consumes: `RegistrationValues` inferito da `registrationSchema` non serve qui. Il terzo argomento è opzionale.
- Produces: `LocalAccount` con campi opzionali `firstName?: string`, `lastName?: string`, `salonId?: string`, `legacy?: boolean`. `createAccount(email, password, profile?)` se `profile` c'è salva nome, cognome, `salonId` uguale all'`uid` generato, `legacy: false`. Senza `profile` il comportamento di oggi resta (niente campi nuovi).

- [ ] **Step 1: Write the failing test**

Aggiungere in `src/data/local/auth.test.ts`:

```ts
it('con il profilo salva nome, cognome e id del salone uguale all’uid', async () => {
  const account = await createAccount('Ada@Salone.it', 'segretissimo', { firstName: 'Ada', lastName: 'Neri' })
  expect(account.firstName).toBe('Ada')
  expect(account.lastName).toBe('Neri')
  expect(account.salonId).toBe(account.uid)
  expect(account.legacy).toBe(false)
  expect(account.email).toBe('ada@salone.it')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/auth.test.ts`
Expected: FAIL, `createAccount` accetta 2 argomenti e `firstName` è `undefined`

- [ ] **Step 3: Write minimal implementation**

Estendere l'interfaccia e la firma:

```ts
export interface LocalAccount {
  uid: string
  email: string
  passwordHash: string
  salt: string
  iterations: number
  createdAt: string
  firstName?: string
  lastName?: string
  salonId?: string
  legacy?: boolean
}

export async function createAccount(
  email: string,
  password: string,
  profile?: { firstName: string; lastName: string },
): Promise<LocalAccount> {
  // corpo attuale, e se profile è definito aggiungere firstName, lastName, salonId: uid, legacy: false
}
```

L'`uid` va calcolato prima dell'oggetto, così `salonId` può copiarlo. Non cambiare `login`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/auth.test.ts`
Expected: PASS, compresi i test vecchi a due argomenti

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/local/auth.ts src/data/local/auth.test.ts
git commit -m "feat: l'account locale puo tenere nome e id del salone"
```

---

### Task 5: Codice fiscale nelle impostazioni

**Files:**
- Modify: `src/data/local/settings.ts`
- Modify: `src/lib/firebaseMap.ts`
- Test: `src/data/local/settings.tax.test.ts`

**Interfaces:**
- Consumes: `normalizeTaxCode`, `taxCodeError` da `src/lib/profile.ts`
- Produces: `SettingsMain['business']` è `{ name: string; vatNumber: string; phone: string; address: string; taxCode: string }`. `blankSettings` mette `taxCode: ''`. Un JSON vecchio senza la chiave, riletto da `getSettings`, ha `taxCode: ''`.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings } from './settings'
import { storageKeys, writeJson } from './storage'

describe('taxCode', () => {
  beforeEach(() => localStorage.clear())

  it('un documento senza la chiave vale vuoto e uno minuscolo torna maiuscolo', () => {
    writeJson(storageKeys.settings('u1'), {
      theme: 'light',
      updatedAt: '2026-10-17T00:00:00.000Z',
      business: { name: 'I Pelosetti', vatNumber: '', phone: '', address: '' },
    })
    expect(getSettings('u1').business.taxCode).toBe('')
    writeJson(storageKeys.settings('u1'), {
      ...getSettings('u1'),
      business: { ...getSettings('u1').business, taxCode: 'rssmra85t10a562s' },
    })
    expect(getSettings('u1').business.taxCode).toBe('RSSMRA85T10A562S')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/settings.tax.test.ts`
Expected: FAIL, `taxCode` non è sul tipo o è `undefined`

- [ ] **Step 3: Write minimal implementation**

In `blankSettings`, `business.taxCode: ''`. In `mergeSettings` e in `settingsFromDoc`:

```ts
business: {
  ...base.business,
  ...(existing.business ?? {}),
  taxCode: normalizeTaxCode(existing.business?.taxCode ?? ''),
},
```

`firebaseMap.ts` `settingsFromDoc` fa già lo spread di `business`: aggiungere la stessa riga `taxCode` lì, importando `normalizeTaxCode`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/settings.tax.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/local/settings.ts src/data/local/settings.tax.test.ts src/lib/firebaseMap.ts
git commit -m "feat: le impostazioni ricordano il codice fiscale"
```

---

### Task 6: Regole Firestore

**Files:**
- Modify: `firestore.rules`
- Test: `src/lib/firestoreRules.test.ts`

**Interfaces:**
- Consumes: le decisioni di `accountCreateAllowed` e `canReadSalon`. Le regole non importano TypeScript: il testo le ripete.
- Produces: `accounts/{uid}` leggibile e scrivibile solo dal proprio uid. Create nuovo: `salonId == uid`, `role == 'titolare'`, `legacy == false`. Create Laura: email in minuscolo `laura.masala@tiscali.it`, `salonId == 'shared'`, `legacy == true`, `role == 'titolare'`. Update: `salonId`, `role`, `legacy` immutati. `salon/shared` se email di Laura oppure `account.salonId == 'shared'`. `salons/{salonId}` se `account.salonId == salonId`. I limiti di byte dei file restano quelli attuali, copiati sotto `salons/{salonId}/files`.

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('firestore.rules', () => {
  const rules = readFileSync('firestore.rules', 'utf8')

  it('ancora Laura a shared e gli altri al proprio uid', () => {
    expect(rules).toContain("request.auth.token.email.lower() == 'laura.masala@tiscali.it'")
    expect(rules).toContain("request.resource.data.salonId == 'shared'")
    expect(rules).toContain('request.resource.data.salonId == uid')
    expect(rules).toContain("request.resource.data.role == 'titolare'")
    expect(rules).toContain('request.resource.data.legacy == false')
    expect(rules).toContain('request.resource.data.legacy == true')
    expect(rules).toContain('request.resource.data.salonId == resource.data.salonId')
    expect(rules).toContain('request.resource.data.role == resource.data.role')
    expect(rules).toContain('request.resource.data.legacy == resource.data.legacy')
    expect(rules).toContain('match /salons/{salonId}/{kind}/{id}')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: FAIL, le stringhe nuove non ci sono

- [ ] **Step 3: Write minimal implementation**

Tenere i blocchi `users/{uid}` com'è. Sostituire i match `salon/shared` con funzioni in testa al `match /databases/{database}/documents`:

```
function signedIn() {
  return request.auth != null;
}
function isLaura() {
  return signedIn() && request.auth.token.email.lower() == 'laura.masala@tiscali.it';
}
function accountPath() {
  return /databases/$(database)/documents/accounts/$(request.auth.uid);
}
function owns(salonId) {
  return signedIn() && exists(accountPath()) && get(accountPath()).data.salonId == salonId;
}
function fileOk() {
  return signedIn() && (!('thumb' in request.resource.data) || request.resource.data.thumb.size() < 25000);
}
```

`match /accounts/{uid}`: read se `request.auth.uid == uid`. Create se (`request.auth.uid == uid` && `salonId == uid` && `role == 'titolare'` && `legacy == false`) oppure (`isLaura()` && `request.auth.uid == uid` && `salonId == 'shared'` && `role == 'titolare'` && `legacy == true`). Update se uid proprio e i tre campi immutati.

`match /salon/shared/{kind}/{id}` e il resto `**`: read/write se `isLaura() || owns('shared')`, con `kind != 'files'` sulle write dei documenti normali, come oggi.

Copiare i tre match dei file (`files/{fileId}`, `full/{part}`, `chunks/{n}`) sotto `match /salons/{salonId}/files/...` con le stesse soglie (`25000`, `716800`, `614400`) e la condizione `owns(salonId)` al posto di `request.auth != null`.

`match /salons/{salonId}/{kind}/{id}` e `{rest=**}`: read/write se `owns(salonId) && kind != 'files'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- firestore.rules src/lib/firestoreRules.test.ts
git commit -m "feat: le regole chiudono il salone di Laura agli altri"
```

---

### Task 7: Il client legge solo il salone attivo

**Files:**
- Create: `src/data/firebase/salonRoot.ts`
- Modify: `src/data/firebase/client.ts`
- Modify: `src/data/firebase/files.ts`
- Modify: `src/data/firebase/client.test.ts`
- Modify: `src/data/firebase/files.test.ts`

**Interfaces:**
- Consumes: `salonCollection`, `newOwnerAccount`, `lauraAccount`, `isLauraEmail`, `SHARED_SALON_ID`, `CloudAccount` da `src/lib/salonPath.ts`. `entryGate` non si usa qui.
- Produces:
  - `bindSalon(salonId: string): void`
  - `clearSalon(): void`
  - `currentSalonId(): string | null`
  - `salonDocPath(kind: string, id: string): string[]` lancia `AppError('Salvataggio non riuscito', 'storage_write')` se non c'è un id attivo
  - `registerOwner(input: { email: string; password: string; firstName: string; lastName: string; salonName: string; vatNumber: string; address: string }): Promise<LocalAccount>`
  - `repairOwnerSalon(input: { firstName: string; lastName: string; salonName: string; vatNumber: string; address: string }): Promise<void>`
  - `sendVerification(): Promise<void>`
  - `sendPasswordReset(email: string): Promise<void>`
  - `reloadEmailVerified(): Promise<boolean>`
  - `registerEmail` non fa più il fallback a `signIn`. Se il codice è `auth/email-already-in-use` lancia `AppError('Questa email ha già un account', 'auth_email_taken')`.
  - `LocalAccount` restituito da `toAccount` include `firstName`, `lastName`, `salonId`, `legacy` letti dal documento, e `emailVerified` non sta sull'account: sta su un campo modulo `export function lastEmailVerified(): boolean`.

- [ ] **Step 1: Write the failing test**

Sostituire i due test `registerEmail: già in uso…` con:

```ts
it('registerOwner: email già in uso non entra', async () => {
  authFns.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
  await expect(client.registerOwner({
    email: 'ada@salone.it', password: 'segretissimo', firstName: 'Ada', lastName: 'Neri',
    salonName: 'I Pelosetti', vatNumber: '', address: '',
  })).rejects.toMatchObject({ code: 'auth_email_taken', message: 'Questa email ha già un account' })
  expect(authFns.signIn).not.toHaveBeenCalled()
})

it('registerOwner scrive accounts e salons/{uid}, mai salon/shared', async () => {
  authFns.createUser.mockResolvedValue({ user: firebaseUser('uid-9', 'ada@salone.it') })
  authFns.sendEmail = vi.fn(async () => undefined)
  await client.registerOwner({
    email: 'Ada@Salone.it', password: 'segretissimo', firstName: 'Ada', lastName: 'Neri',
    salonName: 'I Pelosetti', vatNumber: '', address: 'Via Roma',
  })
  expect(fs.store.get('accounts')?.get('uid-9')).toMatchObject({
    firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
  })
  expect(fs.store.get('salons/uid-9/settings')?.get('main')).toMatchObject({
    business: { name: 'I Pelosetti', vatNumber: '', address: 'Via Roma', taxCode: '' },
  })
  expect(fs.writes.some((path: string) => path.startsWith('salon/shared'))).toBe(false)
  expect(authFns.sendEmail).toHaveBeenCalledTimes(1)
})
```

Il fake `fs` e `authFns` vanno estesi dove il test li definisce già: `sendEmailVerification`, `sendPasswordResetEmail`, `reload`. Seguire il modo in cui `createUser` è mockato in cima al file. `firebaseUser` resta la funzione già presente.

Aggiungere:

```ts
it('Laura senza documento viene legata a shared e un’altra email no', async () => {
  authFns.signIn.mockResolvedValue({ user: firebaseUser('laura-uid', 'laura.masala@tiscali.it') })
  await client.signInEmail('laura.masala@tiscali.it', 'segretissimo')
  expect(fs.store.get('accounts')?.get('laura-uid')).toMatchObject({ salonId: 'shared', legacy: true, role: 'titolare' })
  expect(client.currentSalonId()).toBe('shared')
})
```

I test esistenti che firmano `maria@salone.it` o `laura@salone.it` e aspettano scritture su `salon/shared` vanno fatti firmare `laura.masala@tiscali.it` con uid stabile `fb-1`, così il bind è `shared` e le asserzioni sui percorsi restano. Il test che fa entrare due email diverse nello stesso salone va riscritto: la seconda email (`maria@salone.it`, uid `uid-2`) non legge i cani di `shared`. Asserzione: dopo il suo `signInEmail`, `client.currentSalonId()` è `uid-2` e `fs.snapshots` dell'ascolto cani contiene `salons/uid-2/dogs`, non `salon/shared/dogs`.

`files.test.ts`: il percorso atteso dei file nuovi di un salone non-shared è `salons/{id}/files`. Esporre nel fake uno `salonId` di test. Se il test costruisce lo store senza bind, chiamare `bindSalon('shared')` nel `beforeEach` di quel file e lasciare le asserzioni `salon/shared/files`. Aggiungere un caso con `bindSalon('uid-9')` che scrive `salons/uid-9/files/{id}`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/client.test.ts src/data/firebase/files.test.ts`
Expected: FAIL, `registerOwner` non esiste

- [ ] **Step 3: Write minimal implementation**

`src/data/firebase/salonRoot.ts`:

```ts
import { AppError } from '../errors'
import { salonCollection } from '../../lib/salonPath'

let salonId: string | null = null

export function bindSalon(next: string): void {
  salonId = next
}

export function clearSalon(): void {
  salonId = null
}

export function currentSalonId(): string | null {
  return salonId
}

export function salonDocPath(kind: string, id: string): string[] {
  if (!salonId) throw new AppError('Salvataggio non riuscito', 'storage_write')
  return [...salonCollection(salonId), kind, id]
}

export function salonRootPath(): string[] {
  if (!salonId) throw new AppError('Salvataggio non riuscito', 'storage_write')
  return salonCollection(salonId)
}
```

In `client.ts`:

- Cancellare `sharedPath`. Ogni `['salon', 'shared', kind, id]` e ogni `sharedPath(kind, id)` diventa `salonDocPath(kind, id)`. Ogni `collection(db, 'salon', 'shared', name)` diventa `collection(db, ...salonRootPath(), name)`.
- `ensureShared` parte solo se `currentSalonId() === 'shared'`.
- `finishUser`: leggere `accounts/{uid}`. Se c'è, `bindSalon(data.salonId)`. Se non c'è ed è Laura, scrivere `lauraAccount` e `bindSalon('shared')`. Se non c'è e non è Laura, `clearSalon()` e non chiamare `ensureShared`.
- `toAccount` copia `firstName`, `lastName`, `salonId`, `legacy` dal documento letto (stringhe vuote e `legacy: false` se mancano).
- `registerOwner`: `createUserWithEmailAndPassword`. Su `auth/email-already-in-use` lancia `auth_email_taken` senza `signIn`. Poi `setDoc` di `newOwnerAccount`, `bindSalon(uid)`, `setDoc` di `salons/{uid}/settings/main` con `blankSettings` e `business.name/vatNumber/address/taxCode`. Poi `sendEmailVerification`. Se il `setDoc` fallisce, il ritorno è l'errore `storage_write` e il bind resta vuoto.
- `repairOwnerSalon`: stesso `setDoc` account + settings, per l'utente già autenticato, poi `sendEmailVerification`.
- `sendVerification` chiama `sendEmailVerification` sull'utente corrente. `sendPasswordReset` chiama `sendPasswordResetEmail`. Errori rete → `auth_offline`. `auth/too-many-requests` → nuovo codice `auth_slow` con messaggio `Aspetta un momento e riprova` in `loginFailureMessage`.
- `reloadEmailVerified`: `user.reload()` e ritorna `user.emailVerified`.
- `signOutEmail` chiama `clearSalon()`.

In `files.ts`, `fs.doc(firestore, 'salon', 'shared', 'files', ...path)` diventa `fs.doc(firestore, ...salonRootPath(), 'files', ...path)`.

Esportare `currentSalonId` anche da `client.ts` come re-export, così il test lo legge dal modulo client.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/client.test.ts src/data/firebase/files.test.ts`
Expected: PASS

Poi: `rg -n "salon', 'shared" src/data/firebase`
Expected: nessun match. L'unico posto con i segmenti `salon` / `shared` è `salonCollection` in `src/lib/salonPath.ts`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/firebase/salonRoot.ts src/data/firebase/client.ts src/data/firebase/client.test.ts src/data/firebase/files.ts src/data/firebase/files.test.ts src/lib/authAction.ts src/data/errors.ts
git commit -m "feat: un utente nuovo scrive solo nel suo salone"
```

---

### Task 8: Due viste e logo fisso

**Files:**
- Create: `src/components/brand/AuthMark.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/LoginPage.test.tsx`
- Modify: `src/hooks/useSession.tsx`

**Interfaces:**
- Consumes: `registrationSchema`, `loginSchema`, `passwordResetMessage` (ancora non collegato al bottone: il bottone c'è, l'invio è il Task 9), `TYPE`
- Produces: `AuthMark` mostra l'img con `alt="Groomly"`, `src` animato chiaro o scuro, dentro un contenitore `position: 'sticky'`, `top: 0`, `zIndex: 2`, `background: 'var(--bg)'`, senza width 74 e senza `borderRadius: 50%`. `LoginPage` ha vista `create` | `enter`. `useSession.createAccount` accetta il risultato di `registrationSchema` e, con Firebase spento, chiama `createAccount(email, password, { firstName, lastName })` e salva `business.name`, `vatNumber`, `address` nelle impostazioni di quell'uid. Non chiama più `signIn` se la registrazione risponde `auth_email_taken` o `auth_exists`.

- [ ] **Step 1: Write the failing test**

Riscrivere `src/pages/LoginPage.test.tsx` così che, senza account, il titolo è `Crea account`, il logo ha `src` di `groomly-logo-animato.svg`, il padre non ha `width: 74px` e ha `position: sticky`. I campi Nome, Cognome, Nome della toelettatura ci sono. `Puoi completarli dopo` c'è. Manca Nome: il testo `Il nome è obbligatorio` e non si entra. Il link `Hai già un account? Entra` mostra il titolo `Entra`, `Password dimenticata` e nasconde Nome. Da lì `Non hai un account? Crea account` torna indietro. Compilando i cinque campi e lasciando vuota la partita IVA, il click su `Crea account` arriva al titolo home `Groomly` (Firebase spento nei test di `App`). Il test del tema scuro aspetta `groomly-logo-animato-scuro.svg` sulla vista `Entra` (creare l'account, `logout`, tema dark). Tenere il test della password che si mostra e quello dei dati illeggibili. Il bottone iniziale non si chiama più `Crea accesso`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL, titolo `Crea accesso` o logo verticale

- [ ] **Step 3: Write minimal implementation**

`AuthMark.tsx` legge `useSettings().theme`, `resolveTheme` e `prefersDark` come fa oggi `LoginPage`, e rende:

```tsx
<div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)', display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
  <img alt="Groomly" src={dark ? logoScuro : logoChiaro} width={148} style={{ display: 'block', height: 'auto' }} />
</div>
```

`LoginPage` tiene `mode: 'create' | 'enter'`, iniziale `create` se `getAccount()` è null, altrimenti `enter`. Due `useForm`. La vista create usa `registrationSchema` e i campi del test. La vista enter usa `loginSchema`. Submit create chiama `session.createAccount(values)` con l'oggetto dello schema. Errore `auth_email_taken`: `setError('root', { message })` e un bottone/link che porta a `enter`. `useSession.createAccount` cambia tipo in `(values: { firstName: string; lastName: string; email: string; password: string; salonName: string; vatNumber: string; address: string }) => Promise<void>`. L'unica chiamata è `LoginPage.tsx`. `createAccount` di `data/local/auth` resta a due argomenti più il profilo opzionale: i test di pagina non si toccano. Ramo senza Firebase: `createAccountRepo(email, password, { firstName, lastName })`, poi `writeJson(storageKeys.settings(uid), { ...getSettings(uid), business: { ...getSettings(uid).business, name: salonName, vatNumber, address, taxCode: '' } })`. Ramo Firebase: `registerOwner`, senza il `catch` che chiama `signInEmail`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/components/brand/AuthMark.tsx src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/hooks/useSession.tsx
git commit -m "feat: entra e crea account con il logo animato fisso"
```

---

### Task 9: Conferma email, password dimenticata, riprova

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/LoginPage.test.tsx`
- Modify: `src/hooks/useSession.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/HomePage.tsx` solo per non montare la home quando il gate di sessione non è `in` libero: il blocco sta nel router

**Interfaces:**
- Consumes: `entryGate`, `confirmEmailCopy`, `passwordResetMessage`, `loginFailureMessage`, `sendVerification`, `sendPasswordReset`, `reloadEmailVerified`, `repairOwnerSalon`
- Produces: la sessione espone `emailVerified: boolean`, `legacy: boolean`, `hasAccountDoc: boolean`, `resendVerification()`, `reloadVerification()`, `sendReset(email)`, `repair()`. `Guard` manda a `/login` se `entryGate` non è `home`. Su `/login`, se il gate è `confirm-email`, si vede quella vista anche se l'utente è autenticato (`LoginSwitch` oggi rimanda a `/` chi è `in`: deve guardare `entryGate` prima). Vista `repair`: testo `Salvataggio non riuscito` e bottone `Riprova`.

- [ ] **Step 1: Write the failing test**

In `LoginPage.test.tsx`, con Firebase mockato acceso solo in questo test (`vi.mock` già usato altrove: seguire `src/app/firebaseGate.test.tsx` per il modo di accendere il client finto). Casi:

- Dopo `registerOwner` risolto con `emailVerified: false` e `legacy: false`, la home non c'è e c'è il titolo `Conferma l'email` più `Ho confermato`, `Invia di nuovo`, `Esci`. `Ho confermato` mentre `reload` ritorna false mostra `Il link non risulta ancora aperto`.
- `Password dimenticata` con email vuota mostra `Inserisci un’email valida` e non chiama `sendPasswordReset`. Con email valida mostra il testo di `passwordResetMessage` e `Torna a Entra`.
- Con Firebase spento, `Password dimenticata` mostra `Connessione assente`.
- `repair`: titolo assente, c'è `Salvataggio non riuscito` e `Riprova`.

Se il mock del client è troppo largo per un test di pagina, testare le tre viste rendendo `LoginPage` dentro un `SessionProvider` finto non è possibile perché il provider non è iniettabile. In quel caso i test stanno in `src/pages/LoginPage.test.tsx` mockando `../data/firebase/enabled` a true e `../data/firebase/client` con le funzioni del Task 7. Copiare lo stile di mock da `src/app/firebaseGate.test.tsx`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL, titolo `Conferma l'email` assente

- [ ] **Step 3: Write minimal implementation**

`useSession` conserva, oltre al gate, `{ emailVerified, legacy, hasAccountDoc }` aggiornati da `watchAuth` / `lastEmailVerified` / documento account. `LoginSwitch` calcola `entryGate`. `home` e utente `in` → `<Navigate to="/" />`. `confirm-email` e `repair-salon` restano su `LoginPage`. `Guard` uguale: se non è `home`, `<Navigate to="/login" />`.

Viste in `LoginPage` sotto `AuthMark`. `Invia di nuovo` e `Riprova` mappano `auth_offline` e `auth_slow` con `loginFailureMessage`. `Esci` chiama `session.logout()`. All'evento `visibilitychange` con `document.visibilityState === 'visible'`, sulla vista conferma, chiamare `reloadVerification()` e se true navigare a `/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LoginPage.test.tsx src/app/firebaseGate.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/LoginPage.tsx src/pages/LoginPage.test.tsx src/hooks/useSession.tsx src/app/router.tsx
git commit -m "feat: conferma email, recupero password e riprova del salone"
```

---

### Task 10: Fascia, bollino, Attività, saluto

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/layout/PhoneShell.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/components/layout/chrome.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Modify: `src/lib/greeting.ts`
- Modify: `src/lib/greeting` test se c'è, altrimenti `src/lib/authGate.test.ts` no: creare `src/lib/greeting.test.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `fiscalNoticeVisible`, `taxCodeError`, `vatError`, `normalizeTaxCode`, `normalizeVat`, `isLauraEmail`, `entryGate` (solo per sapere che in home Laura può essere non verificata)
- Produces: fascia fiscale con `aria-label` assente e ruolo regione `Completa l'attività`. Fascia email con regione `Conferma la tua email`, solo se Firebase è acceso, `legacy` è true, `emailVerified` è false. `BottomNav` prop `tax?: boolean`. Saluto `greetingText(email, firstName?)`.

- [ ] **Step 1: Write the failing test**

`greeting.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { greetingText } from './greeting'

describe('greetingText', () => {
  it('preferisce il nome dell’account e tiene Laura se il nome è vuoto', () => {
    expect(greetingText('ada@salone.it', 'Ada')).toBe('Ciao Ada')
    expect(greetingText('laura.masala@tiscali.it', '')).toBe('Ciao Laura')
    expect(greetingText('sconosciuto@salone.it', '  ')).toBe('Ciao!')
  })
})
```

`chrome.test.tsx`: `<BottomNav tax />` rende `data-testid="tax-dot"` dentro il link `Altro` e non dentro Home.

`HomePage.test.tsx`, nel test dell'ordine Oggi / banner / Da chiudere: con impostazioni senza partita IVA e senza codice fiscale, la regione `Completa l'attività` sta dopo Oggi e prima del banner mensili. Salvando `vatNumber: '12345678901'` la regione non c'è. Il test crea l'account con la fixture `createAccount(email, password)` senza profilo: la fascia fiscale c'è lo stesso.

`SettingsPage.test.tsx`: aprire Attività mostra `Codice fiscale` e il testo `Basta la partita IVA oppure il codice fiscale.`. Salvare `abc` nel codice fiscale mostra `16 lettere o numeri` e non chiude il foglio. Salvare `rssmra85t10a562s` scrive `RSSMRA85T10A562S`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/greeting.test.ts src/components/layout/chrome.test.tsx src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL sulle asserzioni nuove. I fallimenti vecchi dell'ordine in home si sistemano in questo task, non togliendo la fascia.

- [ ] **Step 3: Write minimal implementation**

`greetingText(email, firstName?)`: se `firstName?.trim()` è non vuoto, `Ciao ${firstName.trim()}`. Altrimenti la mappa. `App.tsx` passa `gate.account.firstName`.

Home: due `section` nello stile di `MonthlyBanner` (`background: var(--warn-s)`, `color: var(--warn)`, raggio 12, padding 12). Email sopra, fiscale sotto, entrambe prima del banner mensili. `Aggiungi` fa `navigate('/impostazioni', { state: { openBusiness: true } })`. `Invia` chiama `resendVerification`.

`BottomNav` disegna il dot su `item.to === '/impostazioni'` quando `tax` è true. `PhoneShell` accetta `tax?: boolean` e lo passa a `BottomNav`. `ShellFrame` calcola `const tax = fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode)` accanto a `bell` e lo passa: `<PhoneShell fill={fill} showNav menuOpen={open} bell={bell} tax={tax} onFab={() => setOpen(true)}>`.

`SettingsPage`: nel dialogo Attività, sotto Partita IVA, input Codice fiscale. Testo sotto il titolo. `saveBusiness` rifiuta con gli errori di `vatError` e `taxCodeError` senza chiamare `save` se uno dei due torna una stringa. Se passano, salva `normalizeVat` e `normalizeTaxCode`. `useLocation().state.openBusiness` apre il dialogo all'arrivo e poi `navigate('.', { replace: true, state: null })` così un refresh non lo riapre.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. I test di home che contano i banner includono `Completa l'attività` quando l'attività è vuota.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/components/layout/BottomNav.tsx src/components/layout/PhoneShell.tsx src/components/layout/chrome.test.tsx src/pages/ShellFrame.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/lib/greeting.ts src/lib/greeting.test.ts src/app/App.tsx
git commit -m "feat: avvisa se mancano partita IVA o codice fiscale"
```

---

## Copertura della spec

| Spec | Task |
|---|---|
| D1, D2, D8, D9, §2 percorsi e regole | 1, 6, 7 |
| D3 ruolo titolare immutabile, niente schermate invito | 1, 6 |
| D4 campi e facoltativi | 2, 8 |
| D5 fascia, bollino, Laura, uno dei due basta | 2, 5, 10 |
| D6 password dimenticata | 3, 9 |
| D7 conferma email, Laura non bloccata | 3, 7, 9, 10 |
| §3 logo fisso e due viste | 8 |
| §5 foglio Attività e `taxCode` | 5, 10 |
| §6 errori e salvataggi a metà | 3, 7, 9 |
| §7 prove | i test di ogni task |
| §8 fuori scope | nessun task |
