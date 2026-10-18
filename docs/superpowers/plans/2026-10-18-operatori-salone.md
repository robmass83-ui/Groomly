# Operatori del salone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `masala.roberto@hotmail.it` lavora nel salone di Laura, le due email vedono l’elenco dei saloni registrati, e in accesso sotto il logo compaiono Groomly e toelettatura.

**Architecture:** Due email sono insieme il salone `shared` e gli operatori. Funzioni pure decidono l’account, il riassunto e le frasi. Il client Firebase aggancia `shared` senza copiare i dati di Roberto. Le regole aprono agli operatori la lettura degli account e di `settings/main`. La pagina Utenti sta in Altro.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom 6, Firebase Auth + Firestore, Vitest 3, Testing Library, happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-18-operatori-salone-design.md`

## Global Constraints

- Email, minuscolo: `laura.masala@tiscali.it` e `masala.roberto@hotmail.it`. `robmass83@gmail.com` non è operatore e non entra in `shared`.
- Documento shared: `salonId` `shared`, ruolo `titolare`, `legacy` true. Nome e cognome già salvati non si svuotano.
- Roberto non esegue `copyLocal`, non legge `users/{uid}`, non applica cancellazioni locali, non ricarica media. Scrive solo `salon/shared/members/{uid}`. Laura continua a copiare come oggi.
- Frasi: `1 account creato`, `{n} account creati`, `1 toelettatura creata`, `{n} toelettature create`, `Senza nome`, `Nessuna toelettatura`, `Connessione assente`, `Caricamento…`, `Groomly`, `toelettatura`, `Utenti`.
- Marchio: riquadro logo 180 per 104 px, `overflow: hidden`. `Groomly` 32 px peso 700 colore `var(--tx)`. `toelettatura` 15 px peso 600, `letter-spacing: 0.18em`, `text-transform: uppercase`, colore `var(--tx3)`.
- La riga dell’elenco non è un link e non apre un altro salone.
- Comandi da `d:\Groomly`, PowerShell, senza `&&`. Un file: `npx vitest run <file>`. Prima del commit del task: `npm test`.
- `git add` con percorsi espliciti. Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`, né file estranei. Non alzare `APP_VERSION`. Non fare push, release o deploy: li fa il coordinatore a lavoro finito.
- I task fanno solo il commit del proprio codice.

---

### Task 1: Email condivise

**Files:**
- Modify: `src/lib/salonPath.ts`
- Test: `src/lib/salonPath.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `export const ROBERTO_EMAIL = 'masala.roberto@hotmail.it'`
  - `isSharedEmail(email: string | null | undefined): boolean`
  - `isOperator(email: string | null | undefined): boolean`
  - `sharedMemberAccount(email: string, existing?: { firstName?: string; lastName?: string } | null): CloudAccount`
  - `lauraAccount` resta e delega a `sharedMemberAccount`
  - `accountCreateAllowed` e `canReadSalon` usano `isSharedEmail`

- [ ] **Step 1: Write the failing test**

In `src/lib/salonPath.test.ts` aggiungi gli import `isOperator`, `isSharedEmail`, `sharedMemberAccount` e questi test. Lascia il test che `isLauraEmail('masala.roberto@hotmail.it')` è falso.

```ts
it('le due email del salone sono condivise e operatrici, in qualunque maiuscolo', () => {
  expect(isSharedEmail(' Laura.Masala@tiscali.it ')).toBe(true)
  expect(isOperator(' MASALA.ROBERTO@hotmail.it ')).toBe(true)
  expect(isSharedEmail('robmass83@gmail.com')).toBe(false)
  expect(isOperator('robmass83@gmail.com')).toBe(false)
})

it('Roberto può il documento shared e ne conserva il nome', () => {
  const roberto = sharedMemberAccount('masala.roberto@hotmail.it', { firstName: ' Roberto ', lastName: ' Masala ' })
  expect(roberto).toEqual({
    firstName: 'Roberto',
    lastName: 'Masala',
    email: 'masala.roberto@hotmail.it',
    salonId: 'shared',
    role: 'titolare',
    legacy: true,
  })
  expect(accountCreateAllowed('rob', 'masala.roberto@hotmail.it', roberto)).toBe(true)
  expect(accountCreateAllowed('uid-9', 'robmass83@gmail.com', { ...roberto, email: 'robmass83@gmail.com' })).toBe(false)
  expect(canReadSalon('masala.roberto@hotmail.it', null, 'shared')).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/salonPath.test.ts`
Expected: FAIL, import assente

- [ ] **Step 3: Write minimal implementation**

Sostituisci il corpo di `src/lib/salonPath.ts` con:

```ts
export const LAURA_EMAIL = 'laura.masala@tiscali.it'
export const ROBERTO_EMAIL = 'masala.roberto@hotmail.it'
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

export function isSharedEmail(email: string | null | undefined): boolean {
  const value = normalizeEmail(email ?? '')
  return value === LAURA_EMAIL || value === ROBERTO_EMAIL
}

export function isOperator(email: string | null | undefined): boolean {
  return isSharedEmail(email)
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

export function sharedMemberAccount(email: string, existing?: { firstName?: string; lastName?: string } | null): CloudAccount {
  return {
    firstName: (existing?.firstName ?? '').trim(),
    lastName: (existing?.lastName ?? '').trim(),
    email: normalizeEmail(email),
    salonId: SHARED_SALON_ID,
    role: 'titolare',
    legacy: true,
  }
}

export function lauraAccount(email: string): CloudAccount {
  return sharedMemberAccount(email)
}

export function accountCreateAllowed(uid: string, email: string, data: CloudAccount): boolean {
  if (data.role !== 'titolare') return false
  if (isSharedEmail(email) && data.legacy && data.salonId === SHARED_SALON_ID) return true
  return data.legacy === false && data.salonId === uid && data.salonId !== SHARED_SALON_ID
}

export function canReadSalon(email: string, account: CloudAccount | null, salonId: string): boolean {
  if (salonId === SHARED_SALON_ID && isSharedEmail(email)) return true
  return account?.salonId === salonId
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/salonPath.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/salonPath.ts src/lib/salonPath.test.ts
git commit -m "feat: le due email restano sul salone di Laura"
```

---

### Task 2: Porta d’ingresso

**Files:**
- Modify: `src/lib/authGate.ts`
- Test: `src/lib/authGate.test.ts`

**Interfaces:**
- Consumes: `isSharedEmail` da `src/lib/salonPath.ts`
- Produces: `entryGate` manda in home un’email condivisa senza documento account

- [ ] **Step 1: Write the failing test**

In `src/lib/authGate.test.ts` aggiungi:

```ts
it('Roberto senza documento entra, un titolare nuovo va in riparazione', () => {
  expect(entryGate({ firebase: true, email: 'masala.roberto@hotmail.it', emailVerified: false, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'home' })
  expect(entryGate({ firebase: true, email: 'robmass83@gmail.com', emailVerified: true, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'repair-salon' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/authGate.test.ts`
Expected: FAIL, Roberto riceve `repair-salon`

- [ ] **Step 3: Write minimal implementation**

In `src/lib/authGate.ts` importa `isSharedEmail` al posto di `isLauraEmail` e usa `isSharedEmail(input.email)` nel ramo senza documento.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/authGate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/authGate.ts src/lib/authGate.test.ts
git commit -m "feat: Roberto entra in home senza rifare il salone"
```

---

### Task 3: Aggancio Firebase senza copia

**Files:**
- Modify: `src/data/firebase/client.ts` (`resolveSalon`, `writeOwnerSalon`, `runMigration`, `ensureShared`, `finishUser`, `watchAuth`)
- Test: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: `isLauraEmail`, `isSharedEmail`, `sharedMemberAccount`, `SHARED_SALON_ID`
- Produces: l’accesso delle due email aggancia `shared`; solo Laura copia

- [ ] **Step 1: Write the failing test**

In `src/data/firebase/client.test.ts`, vicino al test «Laura senza documento viene legata a shared», aggiungi:

```ts
it('Roberto senza documento entra in shared e non copia users né un salone proprio', async () => {
  fs.store.set('users/rob-uid/dogs', new Map([['rex', { name: 'Rex' }]]))
  authFns.signIn.mockResolvedValue({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
  await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
  expect(client.currentSalonId()).toBe('shared')
  expect(fs.store.get('accounts')?.get('rob-uid')).toMatchObject({ salonId: 'shared', legacy: true, role: 'titolare' })
  expect(fs.store.get('salon/shared/dogs')?.has('rex')).toBeFalsy()
  expect(fs.writes.some((item) => item.path.startsWith('salons/'))).toBe(false)
  expect(fs.store.get('salon/shared/members')?.has('rob-uid')).toBe(true)
})

it('Roberto con un salone proprio viene riportato su shared e tiene nome e cognome', async () => {
  fs.store.set('accounts', new Map([['rob-uid', {
    firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it', salonId: 'rob-uid', role: 'titolare', legacy: false,
  }]]))
  authFns.signIn.mockResolvedValue({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
  const account = await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
  expect(account).toMatchObject({ firstName: 'Roberto', lastName: 'Masala', salonId: 'shared', legacy: true })
  expect(client.currentSalonId()).toBe('shared')
})

it('robmass83 senza documento non aggancia shared', async () => {
  authFns.signIn.mockResolvedValue({ user: firebaseUser('robmass-uid', 'robmass83@gmail.com') })
  const account = await client.signInEmail('robmass83@gmail.com', 'segretissimo')
  expect(client.currentSalonId()).toBeNull()
  expect(account.salonId).toBe('')
  expect(fs.store.get('accounts')?.has('robmass-uid')).toBeFalsy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: FAIL, Roberto non risulta `shared`

- [ ] **Step 3: Write minimal implementation**

In `resolveSalon`, prima del ramo `if (data && salonId)`, gestisci l’email condivisa:

```ts
if (isSharedEmail(user.email)) {
  const already = data
    && salonId === SHARED_SALON_ID
    && data.legacy === true
    && data.role === 'titolare'
  const next = sharedMemberAccount(user.email ?? '', {
    firstName: docText(data, 'firstName'),
    lastName: docText(data, 'lastName'),
  })
  accountDoc = { uid: user.uid, data: already ? data : next }
  bindSalon(SHARED_SALON_ID)
  if (!already && !readFailed) void putDoc(['accounts', user.uid], next).catch(() => notifySaveFailed())
  return
}
```

Importa `isSharedEmail` e `sharedMemberAccount`. `isLauraEmail` resta per la copia.

All’inizio di `writeOwnerSalon`, prima di `newOwnerAccount`:

```ts
if (isSharedEmail(user.email)) {
  const account = sharedMemberAccount(user.email ?? '')
  await putDoc(['accounts', user.uid], account)
  accountDoc = { uid: user.uid, data: account }
  bindSalon(SHARED_SALON_ID)
  return
}
```

In `runMigration`, calcola l’email dal documento appena agganciato e non copiare se non è Laura:

```ts
const linkedEmail = docText(accountDoc?.uid === firebaseUid ? accountDoc.data : null, 'email')
if (currentSalonId() !== SHARED_SALON_ID || !isLauraEmail(linkedEmail)) {
  markCloudReady()
  return true
}
```

Il resto di `runMigration`, inclusa `copyLocal` e `ensureShared`, resta nel ramo di Laura.

Cambia `ensureShared` così:

```ts
async function markSharedMember(uid: string): Promise<void> {
  await putDoc(salonDocPath('members', uid), { uid, at: Date.now() })
}

function ensureShared(uid: string, email: string | null): Promise<void> {
  if (currentSalonId() !== SHARED_SALON_ID) return Promise.resolve()
  if (shareTask && shareUid === uid) return shareTask
  shareUid = uid
  const copy = isLauraEmail(email)
  shareTask = (copy ? restoreAccount(uid).then(() => replayLocalDeletion()) : markSharedMember(uid)).then(() => {
    if (copy) void resaveLocalMedia(uid).catch(() => undefined)
  }).catch((error: unknown) => {
    shareTask = null
    shareUid = null
    throw error
  })
  return shareTask
}
```

Aggiorna le chiamate: `ensureShared(firebaseUid, linkedEmail)` dentro `runMigration`, `ensureShared(user.uid, user.email)` in `finishUser`. In `watchAuth`, dopo `resolveSalon`, chiama `ensureShared(user.uid, user.email ?? null)` sia quando il cloud è già pronto sia dopo `migrate`, così anche il ripristino della sessione di Roberto scrive `members/{uid}`. La seconda chiamata con lo stesso uid restituisce la promessa già in corso.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: PASS, compresi i test già presenti su Laura

- [ ] **Step 5: Commit**

```powershell
git add src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "feat: Roberto entra nel salone di Laura senza copiarlo"
```

---

### Task 4: Regole

**Files:**
- Modify: `firestore.rules`
- Test: `src/lib/firestoreRules.test.ts`

**Interfaces:**
- Consumes: le due email della spec
- Produces: `isOperator()` al posto di `isLaura()`, lettura elenco account, aggiornamento verso `shared`, lettura `settings/main`

- [ ] **Step 1: Write the failing test**

Sostituisci il primo test di `src/lib/firestoreRules.test.ts` con uno che esige anche Roberto, la lettura operatore e `settings/main`:

```ts
it('le due email operano su shared e leggono gli account', () => {
  expect(rules).toContain("request.auth.token.email.lower() == 'laura.masala@tiscali.it'")
  expect(rules).toContain("request.auth.token.email.lower() == 'masala.roberto@hotmail.it'")
  expect(rules).toContain('function isOperator()')
  expect(rules).not.toContain('function isLaura()')
  expect(rules).toContain('request.auth.uid == uid || isOperator()')
  expect(rules).toContain("request.resource.data.salonId == 'shared'")
  expect(rules).toContain('match /salons/{salonId}/settings/main')
  expect(rules).toContain('owns(salonId) || isOperator()')
})
```

Tieni il test sulla cancellazione degli account non legacy.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: FAIL, manca l’email di Roberto

- [ ] **Step 3: Write minimal implementation**

Sostituisci `isLaura` con:

```
function isOperator() {
  return signedIn() && (
    request.auth.token.email.lower() == 'laura.masala@tiscali.it'
    || request.auth.token.email.lower() == 'masala.roberto@hotmail.it'
  );
}
```

Sostituisci ogni `isLaura()` con `isOperator()`.

Lettura account:

```
allow read: if signedIn() && (request.auth.uid == uid || isOperator());
```

Creazione: il ramo shared usa `isOperator()` al posto di `isLaura()`.

Aggiornamento:

```
allow update: if signedIn() && request.auth.uid == uid
  && (
    (request.resource.data.salonId == resource.data.salonId
      && request.resource.data.role == resource.data.role
      && request.resource.data.legacy == resource.data.legacy)
    || (isOperator()
      && request.resource.data.salonId == 'shared'
      && request.resource.data.role == 'titolare'
      && request.resource.data.legacy == true)
  );
```

Prima di `match /salons/{salonId}/files/{fileId}` aggiungi:

```
match /salons/{salonId}/settings/main {
  allow read: if owns(salonId) || isOperator();
}
```

Non allargare la scrittura di cani, visite o file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add firestore.rules src/lib/firestoreRules.test.ts
git commit -m "feat: gli operatori leggono gli account e il nome del salone"
```

---

### Task 5: Riassunto puro

**Files:**
- Create: `src/lib/salonDirectory.ts`
- Test: `src/lib/salonDirectory.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `DirectoryAccount`, `DirectoryEntry`, `SalonDirectory`
  - `businessName(data: Record<string, unknown> | null): string`
  - `summarizeDirectory(accounts: DirectoryAccount[], salonNames: ReadonlyMap<string, string>): SalonDirectory`
  - `accountSummary(count: number): string`
  - `salonSummary(count: number): string`

- [ ] **Step 1: Write the failing test**

Crea `src/lib/salonDirectory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { accountSummary, businessName, salonSummary, summarizeDirectory } from './salonDirectory'

describe('salonDirectory', () => {
  it('conta gli account e le toelettature distinte e ordina le righe', () => {
    const directory = summarizeDirectory([
      { uid: 'b', firstName: 'Laura', lastName: '', email: 'laura.masala@tiscali.it', salonId: 'shared' },
      { uid: 'a', firstName: '', lastName: '', email: 'masala.roberto@hotmail.it', salonId: 'shared' },
      { uid: 'c', firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'c' },
      { uid: 'd', firstName: '', lastName: '', email: '', salonId: '' },
    ], new Map([['shared', ' I Pelosetti '], ['c', '']]))
    expect(directory.accountCount).toBe(4)
    expect(directory.salonCount).toBe(2)
    expect(directory.entries.map((entry) => entry.ownerName)).toEqual(['Laura', 'masala.roberto@hotmail.it', 'Ada Neri'])
    expect(directory.entries[0].salonName).toBe('I Pelosetti')
    expect(directory.entries[2].salonName).toBe('Senza nome')
    expect(accountSummary(1)).toBe('1 account creato')
    expect(accountSummary(2)).toBe('2 account creati')
    expect(salonSummary(1)).toBe('1 toelettatura creata')
    expect(salonSummary(0)).toBe('0 toelettature create')
  })

  it('il nome attività esce da business.name', () => {
    expect(businessName({ business: { name: '  Bauci  ' } })).toBe('Bauci')
    expect(businessName(null)).toBe('')
    expect(businessName({ business: { name: 3 } })).toBe('')
  })
})
```

L’ordine con `localeCompare` e locale `it` mette `I Pelosetti` prima di `Senza nome`, e dentro il primo `Laura` prima dell’email di Roberto.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/salonDirectory.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

Crea `src/lib/salonDirectory.ts` con i tipi della spec e:

```ts
export function businessName(data: Record<string, unknown> | null): string {
  const business = data?.business
  if (!business || typeof business !== 'object') return ''
  const name = (business as { name?: unknown }).name
  return typeof name === 'string' ? name.trim() : ''
}

function ownerLabel(account: DirectoryAccount): string {
  const name = `${account.firstName} ${account.lastName}`.replace(/\s+/g, ' ').trim()
  return name || account.email.trim() || 'Senza nome'
}

export function summarizeDirectory(accounts: DirectoryAccount[], salonNames: ReadonlyMap<string, string>): SalonDirectory {
  const salonIds = new Set(accounts.map((account) => account.salonId.trim()).filter((id) => id !== ''))
  const entries = accounts.flatMap((account) => {
    const salonId = account.salonId.trim()
    if (!salonId) return []
    const salonName = (salonNames.get(salonId) ?? '').trim() || 'Senza nome'
    return [{ uid: account.uid, ownerName: ownerLabel(account), salonName }]
  })
  entries.sort((left, right) => left.salonName.localeCompare(right.salonName, 'it')
    || left.ownerName.localeCompare(right.ownerName, 'it')
    || left.uid.localeCompare(right.uid))
  return { accountCount: accounts.length, salonCount: salonIds.size, entries }
}

export function accountSummary(count: number): string {
  return count === 1 ? '1 account creato' : `${count} account creati`
}

export function salonSummary(count: number): string {
  return count === 1 ? '1 toelettatura creata' : `${count} toelettature create`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/salonDirectory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/salonDirectory.ts src/lib/salonDirectory.test.ts
git commit -m "feat: riassunto di account e toelettature"
```

---

### Task 6: Lettura cloud dell’elenco

**Files:**
- Modify: `src/data/firebase/client.ts`
- Test: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: `summarizeDirectory`, `businessName`, `DirectoryAccount` da `src/lib/salonDirectory.ts`, `SHARED_SALON_ID`
- Produces: `export async function listSalonDirectory(): Promise<SalonDirectory>`

- [ ] **Step 1: Write the failing test**

```ts
it('elenco operatori legge gli account e il nome, anche di shared', async () => {
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
  fs.store.set('accounts', new Map<string, Record<string, unknown>>([
    ['laura-uid', { firstName: 'Laura', lastName: 'Masala', email: 'laura.masala@tiscali.it', salonId: 'shared', role: 'titolare', legacy: true }],
    ['ada-uid', { firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'ada-uid', role: 'titolare', legacy: false }],
  ]))
  fs.store.set('salon/shared/settings', new Map([['main', { business: { name: 'I Pelosetti' } }]]))
  fs.store.set('salons/ada-uid/settings', new Map([['main', { business: { name: 'Bauci' } }]]))
  const directory = await client.listSalonDirectory()
  expect(directory.accountCount).toBe(2)
  expect(directory.salonCount).toBe(2)
  expect(directory.entries).toEqual(expect.arrayContaining([
    { uid: 'laura-uid', ownerName: 'Laura Masala', salonName: 'I Pelosetti' },
    { uid: 'ada-uid', ownerName: 'Ada Neri', salonName: 'Bauci' },
  ]))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: FAIL, `listSalonDirectory` assente

- [ ] **Step 3: Write minimal implementation**

Aggiungi in `client.ts`:

```ts
export async function listSalonDirectory(): Promise<SalonDirectory> {
  if (!firebaseEnabled()) throw new AppError('Connessione assente', 'auth_offline')
  try {
    const { collection, doc, getDoc, getDocs } = await loadFirestore()
    const db = await database()
    const snap = await getDocs(collection(db, 'accounts'))
    const accounts: DirectoryAccount[] = snap.docs.map((item) => {
      const data = item.data() as Record<string, unknown>
      return {
        uid: item.id,
        firstName: docText(data, 'firstName'),
        lastName: docText(data, 'lastName'),
        email: docText(data, 'email'),
        salonId: docText(data, 'salonId'),
      }
    })
    const ids = [...new Set(accounts.map((item) => item.salonId.trim()).filter((id) => id !== ''))]
    const salonNames = new Map<string, string>()
    await Promise.all(ids.map(async (salonId) => {
      try {
        const path = salonId === SHARED_SALON_ID
          ? ['salon', 'shared', 'settings', 'main']
          : ['salons', salonId, 'settings', 'main']
        const read = await getDoc(doc(db, path[0], ...path.slice(1)))
        salonNames.set(salonId, read.exists() ? businessName(read.data() as Record<string, unknown>) : '')
      } catch {
        salonNames.set(salonId, '')
      }
    }))
    return summarizeDirectory(accounts, salonNames)
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Connessione assente', 'auth_offline')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "feat: lettura dell'elenco saloni per gli operatori"
```

---

### Task 7: Marchio in accesso

**Files:**
- Modify: `src/components/brand/AuthMark.tsx`
- Modify: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: i due SVG animati già usati
- Produces: sotto il logo, `Groomly` e `toelettatura` con le misure dei vincoli

- [ ] **Step 1: Write the failing test**

Nel test «senza account la vista è Crea account» di `LoginPage.test.tsx`, dopo il controllo del logo, non leggere più `position: sticky` dal genitore immediato dell’immagine. Leggilo da `logo.closest('[data-testid="auth-mark"]')`. Aggiungi:

```ts
const mark = logo.closest('[data-testid="auth-mark"]')
expect(mark?.getAttribute('style')).toContain('position: sticky')
const frame = screen.getByTestId('auth-mark-frame')
expect(frame.getAttribute('style')).toContain('height: 104px')
expect(frame.getAttribute('style')).toContain('overflow: hidden')
const word = screen.getByText('Groomly')
const tag = screen.getByText('toelettatura')
expect(word.getAttribute('style')).toContain('font-size: 32px')
expect(tag.getAttribute('style')).toContain('font-size: 15px')
expect(word.compareDocumentPosition(tag)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
expect(logo.compareDocumentPosition(word)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
```

Nel test del tema scuro, sposta il controllo sticky sullo stesso `closest`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: FAIL, manca `toelettatura`

- [ ] **Step 3: Write minimal implementation**

Sostituisci il return di `AuthMark`:

```tsx
return (
  <div data-testid="auth-mark" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 8px', gap: 4 }}>
    <div data-testid="auth-mark-frame" style={{ width: 180, height: 104, overflow: 'hidden' }}>
      <img alt="Groomly" src={dark ? logoScuro : logoChiaro} width={180} style={{ display: 'block', height: 'auto' }} />
    </div>
    <p style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1, color: 'var(--tx)' }}>Groomly</p>
    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--tx3)' }}>toelettatura</p>
  </div>
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/brand/AuthMark.tsx src/pages/LoginPage.test.tsx
git commit -m "feat: nome e toelettatura sotto il logo di accesso"
```

---

### Task 8: Pagina Utenti

**Files:**
- Create: `src/pages/UsersPage.tsx`
- Create: `src/pages/UsersPage.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `isOperator`, `listSalonDirectory`, `accountSummary`, `salonSummary`, `SalonDirectory`
- Produces: riga `Utenti` in Altro e route `/impostazioni/utenti`

- [ ] **Step 1: Write the failing test**

Crea `src/pages/UsersPage.test.tsx` con ambiente happy-dom. Mock:

```ts
const directory = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return { ...actual, listSalonDirectory: (...args: unknown[]) => directory.load(...args) }
})
```

Test:

1. `createAccount('maria@salone.it', 'segretissimo')`, `render(<App memory isDev={false} initialPath="/impostazioni" />)`. Non c’è il link `Utenti`. `initialPath` poi non basta per la seconda navigazione: render separato con `initialPath="/impostazioni/utenti"` mostra il titolo `Impostazioni`.
2. `createAccount('laura.masala@tiscali.it', 'segretissimo')`, path `/impostazioni`, c’è il link `Utenti`. `directory.load` rifiuta `new AppError('Connessione assente', 'auth_offline')`. Click sul link, compare `Connessione assente`.
3. Stessa Laura, `directory.load` risolve `{ accountCount: 2, salonCount: 1, entries: [{ uid: 'a', ownerName: 'Ada Neri', salonName: 'Bauci' }] }`. Dopo il click si leggono `2 account creati`, `1 toelettatura creata`, `Ada Neri`, `Bauci`. `screen.queryByRole('link', { name: /Ada Neri/ })` è nullo.

Usa `findByRole('heading', { name: 'Impostazioni' })` prima delle asserzioni, come gli altri test di pagina.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/UsersPage.test.tsx`
Expected: FAIL, route assente

- [ ] **Step 3: Write minimal implementation**

`UsersPage` usa `useSession`, `Header` con `title="Utenti"` e `backTo="/impostazioni"`, `ShellFrame`. Se l’email non è operatore, `<Navigate to="/impostazioni" replace />`. Al mount chiama `listSalonDirectory`. Stato: caricamento `Caricamento…`, errore `Connessione assente`, successo con card del resoconto (`fontSize: 17`, `fontWeight: 700`) e una card per riga (nome peso 600, toelettatura 12.5 px `var(--tx3)`). Righe in `div`, non link. Elenco vuoto: `Nessuna toelettatura`.

In `SettingsPage`, se `isOperator` sull’email della sessione, prima di `<SectionTitle>Attività</SectionTitle>` inserisci sezione `Groomly` e `Link` a `/impostazioni/utenti` con lo stesso `menuLink` delle altre righe, icona `Users` di lucide, titolo `Utenti`.

In `buildRoutes`, accanto ai servizi: `{ path: '/impostazioni/utenti', element: <Guard><UsersPage /></Guard> }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/UsersPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/UsersPage.tsx src/pages/UsersPage.test.tsx src/pages/SettingsPage.tsx src/app/router.tsx
git commit -m "feat: gli operatori vedono chi si è registrato"
```

Poi `npm test` e, se fallisce, sistema prima di considerare il task chiuso.
