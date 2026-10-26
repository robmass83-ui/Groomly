# Allineamento del salone di Laura — piano

Eseguito — vedi registro.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare il codice sul percorso `salons/{id}` per Laura e Roberto, con la pagina Utenti compatta e uno script che copia, punta e cancella solo dopo l’impronta, senza eseguire il passaggio sul database acceso in questi task.

**Architecture:** Le decisioni stanno in `src/lib/allineaLaura.ts` e si provano senza Firebase. Le regole, l’ingresso e le notifiche consumano quelle decisioni. Lo script è un guscio che chiama le stesse funzioni; i task non lo lanciano sul progetto vero.

**Tech Stack:** TypeScript, Vitest, Firestore rules, Cloud Functions `sendPush`, React.

## Global Constraints

- Il lavoro sta sul ramo che parte da `pro-collaboratori` (commit `c454758`), non su `main`.
- Gli id dei documenti copiati non cambiano. Una foto è `file:{id}`.
- Laura `laura.masala@tiscali.it` diventa titolare di `salons/{suo uid}`. Roberto `masala.roberto@hotmail.it` diventa socio di quell’uid, con `accessWithoutPro: true`.
- `legacy` è falso solo se l’email risulta già confermata; altrimenti resta vero.
- Pro del salone di Laura: `enabled: true`, `seats: 3`.
- Le email operatore restano `laura.masala@tiscali.it` e `masala.roberto@hotmail.it`.
- Tre accessi non si cancellano: quelle due email e `robmass83@gmail.com`. Il nome Troddioni è `business.name`, spazi ai bordi e maiuscole ignorati.
- L’impronta è lo SHA-256 esadecimale minuscolo delle uid da cancellare, ordinate, unite da `\n`.
- `salon/shared` si legge e, in questo passaggio, non si cancella. Il secondo passaggio non si implementa.
- La pagina «Utenti» non ha il campo Cerca né un pulsante a tutta larghezza. Titolo di sezione `Servizio Pro`. Parole `Attivo` e `Spento`. Interruttore esistente. Una riga per salone. Nome accessibile `Servizio Pro per ` più il nome del titolare. Errore `Accesso negato`.
- Questi task non pubblicano, non fanno deploy e non scrivono sul progetto Firebase acceso.
- Questo piano non alza `APP_VERSION`.

---

### Task 1: Decisioni di copia, puntamento e cancellazione

**Files:**
- Create: `src/lib/allineaLaura.ts`
- Test: `src/lib/allineaLaura.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `copiaBloccata(percorsiDestinazione: string[]): boolean`
  - `percorsiUguali(origine: string[], destinazione: string[]): boolean`
  - `legacyAllineato(emailConfermata: boolean): boolean`
  - `scrittureAccount(input: AllineaAccount): { laura: AccountAllineato; roberto: AccountAllineato; membroLaura: MembroAllineato; membroRoberto: MembroAllineato; pro: { enabled: true; seats: 3 } }`
  - `troddioniValido(input: { salonId: string; lauraUid: string; businessName: string }): boolean`
  - `impronta(uids: string[]): string`
  - `insiemeCancellazione(input: ElencoCancellazione): ElencoPronto | null`

```ts
export type AccountAllineato = {
  uid: string
  email: string
  firstName: string
  lastName: string
  salonId: string
  role: 'titolare' | 'socio'
  legacy: boolean
}

export type MembroAllineato = {
  uid: string
  email: string
  firstName: string
  lastName: string
  role: 'titolare' | 'socio'
  status: 'attivo'
  accessWithoutPro?: true
}

export type AllineaAccount = {
  lauraUid: string
  robertoUid: string
  lauraVerified: boolean
  robertoVerified: boolean
  laura: { firstName: string; lastName: string; email: string }
  roberto: { firstName: string; lastName: string; email: string }
}

export type ElencoCancellazione = {
  authUids: { uid: string; email: string }[]
  salonIds: string[]
  lauraUid: string
  robertoUid: string
  troddioniUid: string
  troddioniSalonId: string
  troddioniOk: boolean
}

export type ElencoPronto = {
  uids: string[]
  salonIds: string[]
  fingerprint: string
}
```

- [ ] **Step 1: Write the failing test**

Crea `src/lib/allineaLaura.test.ts` con questi casi:

```ts
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  copiaBloccata,
  impronta,
  insiemeCancellazione,
  legacyAllineato,
  percorsiUguali,
  scrittureAccount,
  troddioniValido,
} from './allineaLaura'

describe('allineaLaura', () => {
  it('blocca la copia se in destinazione c’è già un cane, un appuntamento o un file', () => {
    expect(copiaBloccata(['salons/l/settings/main'])).toBe(false)
    expect(copiaBloccata(['salons/l/dogs/rex'])).toBe(true)
    expect(copiaBloccata(['salons/l/appointments/a1'])).toBe(true)
    expect(copiaBloccata(['salons/l/files/f1/chunks/0'])).toBe(true)
  })

  it('confronta i percorsi relativi, non il prefisso del salone', () => {
    expect(percorsiUguali(
      ['salon/shared/dogs/rex', 'salon/shared/files/f1/chunks/0'],
      ['salons/laura/dogs/rex', 'salons/laura/files/f1/chunks/0'],
    )).toBe(true)
    expect(percorsiUguali(['salon/shared/dogs/rex'], ['salons/laura/dogs/lux'])).toBe(false)
  })

  it('legacy è falso solo se l’email è già confermata', () => {
    expect(legacyAllineato(true)).toBe(false)
    expect(legacyAllineato(false)).toBe(true)
  })

  it('Laura è titolare, Roberto è socio con accesso anche a Pro spento', () => {
    const wrote = scrittureAccount({
      lauraUid: 'laura',
      robertoUid: 'rob',
      lauraVerified: false,
      robertoVerified: true,
      laura: { firstName: 'Laura', lastName: 'Masala', email: ' Laura.Masala@tiscali.it ' },
      roberto: { firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it' },
    })
    expect(wrote.laura).toMatchObject({ uid: 'laura', salonId: 'laura', role: 'titolare', legacy: true, email: 'laura.masala@tiscali.it' })
    expect(wrote.roberto).toMatchObject({ uid: 'rob', salonId: 'laura', role: 'socio', legacy: false })
    expect(wrote.membroLaura).toMatchObject({ uid: 'laura', role: 'titolare', status: 'attivo' })
    expect(wrote.membroLaura).not.toHaveProperty('accessWithoutPro')
    expect(wrote.membroRoberto).toMatchObject({ uid: 'rob', role: 'socio', status: 'attivo', accessWithoutPro: true })
    expect(wrote.pro).toEqual({ enabled: true, seats: 3 })
  })

  it('Troddioni vale solo con quel nome e un salone suo', () => {
    expect(troddioniValido({ salonId: 't1', lauraUid: 'laura', businessName: ' Troddioni ' })).toBe(true)
    expect(troddioniValido({ salonId: 't1', lauraUid: 'laura', businessName: 'Altro' })).toBe(false)
    expect(troddioniValido({ salonId: 'shared', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
    expect(troddioniValido({ salonId: 'laura', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
    expect(troddioniValido({ salonId: '', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
  })

  it('l’impronta è lo sha256 delle uid ordinate', () => {
    const body = ['b', 'a'].sort().join('\n')
    expect(impronta(['b', 'a'])).toBe(createHash('sha256').update(body).digest('hex'))
  })

  it('non cancella shared, Laura, Roberto, Troddioni, e si ferma se Troddioni non torna', () => {
    const base = {
      authUids: [
        { uid: 'laura', email: 'laura.masala@tiscali.it' },
        { uid: 'rob', email: 'masala.roberto@hotmail.it' },
        { uid: 't1', email: 'robmass83@gmail.com' },
        { uid: 'altro', email: 'altro@salone.it' },
      ],
      salonIds: ['laura', 'rob', 't1', 'vuoto', 'shared'],
      lauraUid: 'laura',
      robertoUid: 'rob',
      troddioniUid: 't1',
      troddioniSalonId: 't1',
      troddioniOk: true,
    }
    const ready = insiemeCancellazione(base)
    expect(ready?.uids).toEqual(['altro'])
    expect(ready?.salonIds).toEqual(['rob', 'vuoto'])
    expect(insiemeCancellazione({ ...base, troddioniOk: false })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/allineaLaura.test.ts`
Expected: FAIL, modulo non trovato.

- [ ] **Step 3: Write minimal implementation**

`src/lib/allineaLaura.ts` esporta le funzioni del test. `copiaBloccata` è vero se un percorso, spezzato da `/`, ha un segmento `dogs`, `appointments` o `files`. `percorsiUguali` toglie i primi due segmenti (`salon/shared` oppure `salons/{id}`) e confronta le liste ordinate. `legacyAllineato` torna `!emailConfermata`. `scrittureAccount` normalizza le email con trim e minuscolo, non sovrascrive nome e cognome oltre al trim. `troddioniValido` rifiuta `salonId` vuoto, `shared`, o uguale a `lauraUid`, e accetta il nome se `trim().toLowerCase() === 'troddioni'`. `impronta` fa SHA-256 di `uids` copiate, ordinate con `sort()`, unite da `\n`. `insiemeCancellazione` torna `null` se `troddioniOk` è falso; altrimenti le uid di `authUids` diverse da Laura, Roberto e Troddioni, e i `salonIds` diversi da `lauraUid`, `troddioniSalonId` e `shared`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/allineaLaura.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/allineaLaura.ts src/lib/allineaLaura.test.ts
git commit -m "feat: decisioni per copiare e puntare il salone di Laura"
```

### Task 2: Regole, shared in sola lettura e accesso senza Pro

**Files:**
- Modify: `firestore.rules`
- Test: `src/lib/firestoreRules.test.ts`

**Interfaces:**
- Consumes: il campo `accessWithoutPro` sul membro, definito nel Task 1
- Produces: `canUse` vero per il membro con `accessWithoutPro == true` anche se Pro è spento; scritture su `salon/shared` negate; un update dell’account non può mettere `salonId` a `shared`

- [ ] **Step 1: Write the failing test**

In `src/lib/firestoreRules.test.ts` aggiungi asserzioni sul testo delle regole:

```ts
it('shared non si scrive e un socio resta dentro se il membro ha accessWithoutPro', () => {
  const rules = readFileSync('firestore.rules', 'utf8')
  const canUse = rules.slice(rules.indexOf('function canUse(salonId)'), rules.indexOf('function ownerRank(salonId)'))
  expect(canUse).toContain('accessWithoutPro')
  expect(canUse).toContain('members/$(request.auth.uid)')
  const sharedDogs = rules.slice(rules.indexOf('match /salon/shared/dogs/{dogId}'), rules.indexOf('match /salon/shared/appointments/{appointmentId}'))
  expect(sharedDogs).toContain('allow create: if false')
  expect(sharedDogs).toContain('allow update: if false')
  expect(sharedDogs).toContain('allow delete: if false')
  expect(sharedDogs).not.toContain('allow create: if isOperator()')
  const accounts = rules.slice(rules.indexOf('match /accounts/{uid}'), rules.indexOf('match /accounts/{uid}/push/{docId}'))
  expect(accounts).not.toContain("salonId == 'shared'")
})
```

Adatta gli indici di `slice` se i match vicini hanno un nome diverso: il blocco cani shared deve essere solo quello, e il blocco account solo `accounts/{uid}`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: FAIL perché `canUse` non cita `accessWithoutPro` e shared si scrive ancora.

- [ ] **Step 3: Write minimal implementation**

In `canUse`, accanto al titolare e al socio o collaboratore con Pro acceso, aggiungi la lettura di `salons/$(salonId)/members/$(request.auth.uid)` con `accessWithoutPro == true`. Non applicarla al ramo `salon/shared`.

In `match /accounts/{uid}`, `create` resta solo `salonId == uid`, `role == 'titolare'`, `legacy == false`. `update` resta solo il ramo che tiene `salonId`, `role` e `legacy` uguali al documento esistente. Togli i due rami `isOperator()` che scrivono `shared`.

In ogni `allow create`, `allow update`, `allow delete` e `allow write` sotto `match /salon/shared`, la condizione diventa `if false`. Le `allow read` restano.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/lib/firestoreRules.test.ts
git commit -m "fix: shared non si scrive e l'accesso senza Pro resta al membro segnato"
```

### Task 3: L’ingresso non forza più shared

**Files:**
- Modify: `src/data/firebase/client.ts` (funzioni `resolveSalon` e `writeOwnerSalon`)
- Test: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: `salonCollection` esistente. Se `salonId` è `shared`, il percorso resta `salon/shared`.
- Produces: per `laura.masala@tiscali.it` e `masala.roberto@hotmail.it`, se l’account ha già un `salonId`, si apre quello e non si riscrive `shared`.

- [ ] **Step 1: Write the failing test**

Vicino ai test che oggi si aspettano `salonId: 'shared'` per Laura, aggiungi:

```ts
it('Laura con salonId proprio non viene riportata su shared', async () => {
  fs.store.get('accounts')?.set('laura-uid', {
    firstName: 'Laura', lastName: 'Masala', email: 'laura.masala@tiscali.it',
    salonId: 'laura-uid', role: 'titolare', legacy: true,
  })
  authFns.signIn.mockResolvedValue({ user: firebaseUser('laura-uid', 'laura.masala@tiscali.it') })
  await client.signInEmail('laura.masala@tiscali.it', 'segretissimo')
  expect(fs.store.get('accounts')?.get('laura-uid')).toMatchObject({ salonId: 'laura-uid', role: 'titolare' })
  expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
})
```

Usa gli helper già presenti nel file (`fs`, `authFns`, `firebaseUser`, `client`). Se `signInEmail` non è il nome esportato, usa la funzione di ingresso che gli altri test di Laura già chiamano.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/client.test.ts -t "non viene riportata su shared"`
Expected: FAIL, l’account torna a `salonId: 'shared'`.

- [ ] **Step 3: Write minimal implementation**

In `resolveSalon` e in `writeOwnerSalon`, il ramo `isSharedEmail` non sostituisce un account che ha già `salonId` non vuoto. Apre quel `salonId`. Non chiama `sharedMemberAccount` e non scrive l’account. Il ramo che crea `shared` resta solo se il documento account manca: serve finché il puntamento non è avvenuto e un telefono vecchio non è l’unico caso. Se il documento c’è, non si tocca.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: PASS. I test vecchi che entrano senza documento account possono ancora creare `shared`. Il test nuovo no.

- [ ] **Step 5: Commit**

```bash
git add src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "fix: un account già puntato non torna su shared"
```

### Task 4: Notifiche per salone

**Files:**
- Modify: `functions/src/sendPush.ts`
- Modify: `functions/src/index.ts` (oggetto `load` dentro `sendPush`)
- Test: `src/lib/sendPush.test.ts`

**Interfaces:**
- Consumes: `PushLoad` attuale
- Produces: `PushLoad` con `account(uid: string): Promise<{ salonId: string } | null>`, `appointments(salonId: string): Promise<PushAppointment[]>`, `dogName(salonId: string, dogId: string): Promise<string>`. `collectSends` chiede gli appuntamenti una volta per `salonId` e non chiama `appointments('shared')`, né per id vuoto, né per id che contiene `/`.

- [ ] **Step 1: Write the failing test**

In `src/lib/sendPush.test.ts`, estendi `load` con `account: async (uid) => ({ salonId: 'salon-a' })` e cambia `appointments` e `dogName` perché accettino `salonId`. Aggiungi:

```ts
it('non manda gli appuntamenti di un salone al telefono di un altro, e ignora shared', async () => {
  const sends = await collectSends({
    ...load('9.0.0'),
    accountIds: async () => ['active', 'altro', 'fermo'],
    account: async (uid) => {
      if (uid === 'active') return { salonId: 'salon-a' }
      if (uid === 'altro') return { salonId: 'salon-b' }
      return { salonId: 'shared' }
    },
    appointments: async (salonId) => {
      expect(salonId).not.toBe('shared')
      return salonId === 'salon-a' ? [{
        id: 'due', dogId: 'lilly', status: 'programmato',
        startMs: Date.parse('2026-06-15T08:00:00.000Z'), durationMin: 90,
      }] : []
    },
    dogName: async (_salonId, _dogId) => 'Lilly',
  }, now)
  expect(sends.filter((send) => send.kind === 'complete').map((send) => send.deviceId)).toEqual(['phone-active'])
})
```

Aggiungi in `load` un dispositivo anche per `altro` solo dentro questo test (`devices` che per `altro` torna un telefono `phone-altro`). `active` resta l’unico con le preferenze abilitate, quindi `altro` non riceve comunque se le prefs sono spente: per provare il filtro, nello stesso test `prefs` di `altro` deve essere abilitato. Così, se gli appuntamenti di `salon-a` gli arrivassero, il test fallirebbe.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sendPush.test.ts`
Expected: FAIL, `appointments` non riceve `salonId`.

- [ ] **Step 3: Write minimal implementation**

`collectSends` legge `account` per ogni uid, raggruppa per `salonId`, salta `shared`, vuoto e gli id con `/`, e passa quel `salonId` a `appointments` e `dogName`. In `functions/src/index.ts` le due query e `deleted-dogs` e il nome del cane usano `salons/${salonId}/...`, non `salon/shared`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sendPush.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/sendPush.ts functions/src/index.ts src/lib/sendPush.test.ts
git commit -m "fix: le notifiche leggono il salone dell'account"
```

### Task 5: Pagina Utenti compatta

**Files:**
- Modify: `src/lib/salonDirectory.ts`
- Modify: `src/pages/UsersPage.tsx`
- Test: `src/lib/salonDirectory.test.ts`
- Test: `src/pages/UsersPage.test.tsx`

**Interfaces:**
- Consumes: `accountSummary`, `salonSummary`, `Toggle` da `src/components/ui/Toggle.tsx`, `SectionTitle`, `callSetSalonPro`
- Produces: `summarizeDirectory` può ancora restituire una voce per account. La pagina raggruppa per `salonId` del campo `pro`. Il salone `shared` non ha riga.

- [ ] **Step 1: Write the failing test**

In `src/pages/UsersPage.test.tsx` aggiungi un caso con due account sullo stesso `salonId: 'laura'` (Laura titolare, Roberto socio) e uno `salonId: 't1'` (Troddioni), più un account `salonId: 'shared'` che non deve generare riga. Il directory mock segue la forma già usata dagli altri test del file (`entries`, `pro`, `accountCount`, `salonCount`).

Attese:

```ts
expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Servizio Pro' })).toBeInTheDocument()
expect(screen.getByText('Attivo')).toBeInTheDocument()
expect(screen.getByText('Spento')).toBeInTheDocument()
expect(screen.getAllByRole('switch')).toHaveLength(2)
expect(screen.getByRole('switch', { name: 'Servizio Pro per Laura' })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: 'Spegni Pro' })).not.toBeInTheDocument()
expect(screen.queryByText('shared')).not.toBeInTheDocument()
```

I nomi `Laura` e lo stato acceso o spento vengono dai dati del mock: un salone con `enabled: true`, l’altro `false`. Il conteggio in pagina contiene `accountSummary` e `salonSummary` sulla stessa riga, separati da ` · `.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/UsersPage.test.tsx`
Expected: FAIL, il campo Cerca c’è ancora.

- [ ] **Step 3: Write minimal implementation**

Togli l’input Cerca. La riga dei conti è `` `${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}` ``. `SectionTitle` con testo `Servizio Pro`. Una `Card`. Per ogni `salonId` distinto in `directory.pro`, salta `shared` e gli id con `/`. Una sola riga: nome del titolare (la entry il cui `uid` è il `salonId`; se manca, la prima entry di quel salone), sotto il nome del salone, poi `Attivo` o `Spento`, poi `Toggle`. `Attivo` ha `color: 'var(--ok)'`, `Spento` ha `color: 'var(--tx3)'`. Il `label` del `Toggle` è `` `Servizio Pro per ${nome}` ``. `onChange` chiama `callSetSalonPro(salonId, next)`. L’errore sotto la riga è `Accesso negato`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/UsersPage.test.tsx src/lib/salonDirectory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/UsersPage.tsx src/pages/UsersPage.test.tsx src/lib/salonDirectory.ts src/lib/salonDirectory.test.ts
git commit -m "feat: in Utenti il servizio Pro è un interruttore per salone"
```

### Task 6: Script locale, senza toccare il progetto acceso

**Files:**
- Create: `scripts/allinea-laura.ts`
- Test: `src/lib/allineaLaura.test.ts` (aggiunge i casi dello script solo se lo script esporta funzioni pure; altrimenti le funzioni restano in `src/lib/allineaLaura.ts`)

**Interfaces:**
- Consumes: `copiaBloccata`, `percorsiUguali`, `scrittureAccount`, `troddioniValido`, `insiemeCancellazione`, `impronta`
- Produces: `eseguiCopia(origine: Map<string, Record<string, unknown>>, destinazione: Map<string, Record<string, unknown>>, lauraUid: string): { ok: true; destinazione: Map<string, Record<string, unknown>> } | { ok: false; reason: 'destino-pieno' | 'conteggio' }`. In caso di fallimento la mappa di destinazione passata non cambia. `cancellaConsentita(improntaChiesta: string, elenco: ElencoPronto): boolean`. Lo script non chiama Firebase.

- [ ] **Step 1: Write the failing test**

Aggiungi in `src/lib/allineaLaura.test.ts` una funzione `cancellaConsentita(improntaChiesta: string, elenco: ElencoPronto): boolean` che è vera solo se `improntaChiesta === elenco.fingerprint`.

```ts
it('copia gli stessi percorsi e non tocca una destinazione già piena', () => {
  const origine = new Map<string, Record<string, unknown>>([
    ['salon/shared/dogs/rex', { name: 'Rex' }],
    ['salon/shared/files/f1/chunks/0', { n: 0 }],
  ])
  const piena = new Map<string, Record<string, unknown>>([['salons/laura/dogs/gia', { name: 'Gia' }]])
  expect(eseguiCopia(origine, piena, 'laura')).toEqual({ ok: false, reason: 'destino-pieno' })
  expect(piena.has('salons/laura/dogs/rex')).toBe(false)
  const vuota = new Map<string, Record<string, unknown>>()
  const copied = eseguiCopia(origine, vuota, 'laura')
  expect(copied.ok).toBe(true)
  if (copied.ok) {
    expect(copied.destinazione.get('salons/laura/dogs/rex')).toEqual({ name: 'Rex' })
    expect(copied.destinazione.get('salons/laura/files/f1/chunks/0')).toEqual({ n: 0 })
  }
})

it('cancella solo se l’impronta è quella dell’elenco', () => {
  const ready = insiemeCancellazione({
    authUids: [
      { uid: 'laura', email: 'laura.masala@tiscali.it' },
      { uid: 'altro', email: 'altro@salone.it' },
    ],
    salonIds: ['laura', 'altro'],
    lauraUid: 'laura',
    robertoUid: 'rob',
    troddioniUid: 't1',
    troddioniSalonId: 't1',
    troddioniOk: true,
  })
  expect(ready).not.toBeNull()
  expect(cancellaConsentita(ready!.fingerprint, ready!)).toBe(true)
  expect(cancellaConsentita('no', ready!)).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/allineaLaura.test.ts -t "impronta è quella"`
Expected: FAIL, `cancellaConsentita` non esiste.

- [ ] **Step 3: Write minimal implementation**

Esporta `cancellaConsentita` e `eseguiCopia` da `src/lib/allineaLaura.ts`. `eseguiCopia` se `copiaBloccata` è vera sui percorsi già in destinazione torna `{ ok: false, reason: 'destino-pieno' }` senza mutare la mappa. Altrimenti crea una mappa nuova con gli stessi valori e la chiave `salons/${lauraUid}/` più il resto dopo `salon/shared/`. Se `percorsiUguali` fra origine e destinazione è falso, torna `{ ok: false, reason: 'conteggio' }`. `scripts/allinea-laura.ts` legge `process.argv[2]`. Per `elenco` e `cancella` non chiama `initializeApp` e non legge credenziali: se `argv` è `elenco` scrive su stdout `Questo script non collega Firebase in questo passaggio.` ed esce 0. Se è `cancella` senza un secondo argomento esce 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/allineaLaura.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/allineaLaura.ts src/lib/allineaLaura.test.ts scripts/allinea-laura.ts
git commit -m "feat: lo script di allineamento non cancella senza impronta"
```
