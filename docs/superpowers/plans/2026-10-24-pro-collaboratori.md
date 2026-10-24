# Collaboratori nel piano Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un operatore accende Pro su un salone; il titolare invita per email un socio o un collaboratore; il collaboratore lavora sul salone e vede solo i propri incassi; Laura resta senza Pro.

**Architecture:** Ruoli, posti e decisioni di invito stanno in `src/lib/salonAccess.ts`. Le Cloud Functions applicano quelle decisioni e scrivono account, membri e inviti con l’Admin SDK. Le regole Firestore distinguono titolare, socio e collaboratore. L’interfaccia legge `pro/main` e `members` e filtra gli incassi del collaboratore.

**Tech Stack:** React, TypeScript, Vitest, happy-dom, Firestore rules, Cloud Functions v2 (`europe-west1`), Brevo template `5`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-24-pro-collaboratori-design.md`. In caso di conflitto vince la spec.
- Pro si accende solo da un operatore. `salonId === 'shared'` è sempre rifiutato. Il titolare non scrive `pro/main`.
- `PRO_SEAT_LIMIT` è `3`. `INVITE_DAYS` è `7`. Il titolare non occupa un posto. Socio e collaboratore attivi, più inviti `aperto` non scaduti, sì.
- Ruoli: `titolare`, `socio`, `collaboratore`. Il client non cambia `salonId`, `role`, `legacy`.
- Messaggi esatti: `Accesso negato`, `Pro non è attivo`, `Inserisci un’email valida`, `Posti esauriti`, `Questa email è già nel salone`, `Invito non valido`, `Invito scaduto`, `Questo account ha già un salone`, `Non puoi revocare il titolare`.
- Email invito: template Brevo `5`, parametri `link`, `salonName`, `roleLabel`. Link `https://groomly-3128b.web.app/invito/{token}`. `roleLabel` è `Socio` o `Collaboratore`.
- «Chi lo fa» solo se Pro è acceso e c’è almeno un socio o collaboratore attivo. Senza selettore, la sovrapposizione resta quella di oggi e il form non scrive `assigneeUid`.
- Su un completato, il collaboratore non cambia `assigneeUid`. Manca `assigneeUid`: la persona è l’uid del titolare, che per un salone normale è il `salonId`.
- Il collaboratore non scrive `settings/main`, non archivia, non segna deceduto, non elimina. Lo storico del cane mostra la cifra. Incassi, report, export e la riga in Impostazioni usano `visibleAppointments`.
- I task 1–11 non alzano `APP_VERSION`. Il task 12 pubblica. All’inizio del task 12, se `APP_VERSION` è `1.1.80`, si pubblica `1.1.81` (`versionCode` `10181`). Se non è più `1.1.80`, alza la patch rispetto al valore trovato, con `versionCode = major * 10000 + minor * 100 + patch`.
- `tsconfig` ha `noUnusedLocals` e `noUnusedParameters`. Prima di ogni commit: `npx tsc --noEmit`. Vitest non fa il controllo tipi.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.
- Un commit del task elenca solo i file di quel task.
- Shell PowerShell. Un comando alla volta. Non usare `&&`. Non cambiare la git config. Non saltare gli hook. Non fare amend. Non fare force push.
- Non aggiungere un ruolo o una scheda veterinario. Non aggiungere pagamenti con carta.

---

### Task 1: Decisioni pure di accesso

**Files:**
- Create: `src/lib/salonAccess.ts`
- Create: `src/lib/salonAccess.test.ts`
- Modify: `src/lib/salonPath.ts`

**Interfaces:**
- Consumes: `SHARED_SALON_ID`, `isSharedEmail`, `normalizeEmail` da `src/lib/salonPath.ts`.
- Produces: `AccountRole` include `socio` e `collaboratore`. Esporta `PRO_SEAT_LIMIT`, `INVITE_DAYS`, `INVITE_TEMPLATE_ID`, `INVITE_LINK_ORIGIN`, `usedSeats`, `inviteExpiresAt`, `assigneeOf`, `showAssigneePicker`, `visibleAppointments`, `setProDecision`, `createInviteDecision`, `acceptInviteDecision`, `revokeDecision`, `changeRoleDecision`, `inviteLink`, `roleLabel`.

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `src/lib/salonAccess.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  acceptInviteDecision,
  assigneeOf,
  changeRoleDecision,
  createInviteDecision,
  inviteExpiresAt,
  inviteLink,
  revokeDecision,
  roleLabel,
  setProDecision,
  showAssigneePicker,
  usedSeats,
  visibleAppointments,
} from './salonAccess'

const now = new Date('2026-10-24T12:00:00.000Z')

describe('salonAccess', () => {
  it('conta soci e collaboratori attivi e gli inviti aperti non scaduti', () => {
    expect(usedSeats(
      [
        { role: 'titolare', status: 'attivo' },
        { role: 'socio', status: 'attivo' },
        { role: 'collaboratore', status: 'revocato' },
      ],
      [
        { status: 'aperto', expiresAt: '2026-10-25T00:00:00.000Z' },
        { status: 'aperto', expiresAt: '2026-10-23T00:00:00.000Z' },
        { status: 'usato', expiresAt: '2026-10-30T00:00:00.000Z' },
      ],
      now,
    )).toBe(2)
    expect(inviteExpiresAt(now).toISOString()).toBe('2026-10-31T12:00:00.000Z')
  })

  it('mostra Chi lo fa solo con Pro e almeno un altro attivo', () => {
    expect(showAssigneePicker(false, [{ role: 'collaboratore', status: 'attivo' }])).toBe(false)
    expect(showAssigneePicker(true, [{ role: 'titolare', status: 'attivo' }])).toBe(false)
    expect(showAssigneePicker(true, [{ role: 'socio', status: 'attivo' }])).toBe(true)
  })

  it('senza persona l’appuntamento è del titolare e il collaboratore vede solo i suoi', () => {
    expect(assigneeOf({}, 'owner')).toBe('owner')
    expect(assigneeOf({ assigneeUid: 'c1' }, 'owner')).toBe('c1')
    const items = [{ id: 'a', assigneeUid: 'c1' }, { id: 'b' }, { id: 'c', assigneeUid: 'owner' }]
    expect(visibleAppointments(items, { uid: 'c1', ownerUid: 'owner', role: 'collaboratore' }).map((item) => item.id)).toEqual(['a'])
    expect(visibleAppointments(items, { uid: 'owner', ownerUid: 'owner', role: 'titolare' })).toHaveLength(3)
    expect(visibleAppointments(items, { uid: 's1', ownerUid: 'owner', role: 'socio' })).toHaveLength(3)
  })

  it('rifiuta Pro su shared e a chi non è operatore', () => {
    expect(setProDecision({ operator: false }, 'salon-1')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(setProDecision({ operator: true }, 'shared')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(setProDecision({ operator: true }, 'salon-1')).toEqual({ ok: true })
  })

  it('crea un invito solo con posto, email nuova e ruolo ammesso', () => {
    const caller = { uid: 'owner', email: 'ada@salone.it', salonId: 'owner', role: 'titolare' as const, operator: false }
    const members = [{ email: 'gia@salone.it', role: 'collaboratore' as const, status: 'attivo' as const }]
    expect(createInviteDecision({ caller, proEnabled: false, email: 'nuova@salone.it', role: 'collaboratore', members, invites: [], now }).message).toBe('Pro non è attivo')
    expect(createInviteDecision({ caller: { ...caller, role: 'collaboratore' }, proEnabled: true, email: 'nuova@salone.it', role: 'socio', members, invites: [], now }).message).toBe('Accesso negato')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'no', role: 'socio', members, invites: [], now }).message).toBe('Inserisci un’email valida')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'nuova@salone.it', role: 'titolare', members, invites: [], now }).message).toBe('Accesso negato')
    const full = [0, 1, 2].map(() => ({ status: 'aperto' as const, expiresAt: '2026-10-30T00:00:00.000Z' }))
    expect(createInviteDecision({ caller, proEnabled: true, email: 'nuova@salone.it', role: 'socio', members: [], invites: full, now }).message).toBe('Posti esauriti')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'gia@salone.it', role: 'socio', members, invites: [], now }).message).toBe('Questa email è già nel salone')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'laura.masala@tiscali.it', role: 'socio', members: [], invites: [], now }).message).toBe('Questa email è già nel salone')
    const ok = createInviteDecision({ caller, proEnabled: true, email: ' Nuova@Salone.it ', role: 'collaboratore', members, invites: [], now })
    expect(ok).toMatchObject({ ok: true, email: 'nuova@salone.it', role: 'collaboratore' })
    expect(roleLabel('socio')).toBe('Socio')
    expect(inviteLink('abc')).toBe('https://groomly-3128b.web.app/invito/abc')
  })

  it('accetta solo un invito aperto, in tempo, sull’email giusta, da un salone vuoto', () => {
    const invite = { status: 'aperto' as const, expiresAt: '2026-10-25T00:00:00.000Z', email: 'nuova@salone.it', salonId: 'owner', role: 'collaboratore' as const }
    const account = { uid: 'new', salonId: 'new', role: 'titolare' as const }
    expect(acceptInviteDecision({ invite: null, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite: { ...invite, expiresAt: '2026-10-23T00:00:00.000Z' }, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito scaduto')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'altra@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: false, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account: { ...account, salonId: 'altro' }, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Questo account ha già un salone')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: true }).message).toBe('Questo account ha già un salone')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 3, personalSalonHasData: false }).message).toBe('Posti esauriti')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 2, personalSalonHasData: false })).toEqual({ ok: true, salonId: 'owner', role: 'collaboratore' })
  })

  it('non revoca il titolare e cambia solo fra socio e collaboratore', () => {
    const caller = { uid: 'owner', email: 'ada@salone.it', salonId: 'owner', role: 'titolare' as const, operator: false }
    expect(revokeDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'owner', targetRole: 'titolare' }).message).toBe('Non puoi revocare il titolare')
    expect(revokeDecision({ caller: { ...caller, role: 'collaboratore' }, proEnabled: true, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' }).message).toBe('Accesso negato')
    expect(revokeDecision({ caller, proEnabled: false, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' }).message).toBe('Accesso negato')
    expect(revokeDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' })).toEqual({ ok: true })
    expect(changeRoleDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'owner', nextRole: 'socio' }).message).toBe('Accesso negato')
    expect(changeRoleDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'c1', nextRole: 'collaboratore' })).toEqual({ ok: true, role: 'collaboratore' })
  })
})
```

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/lib/salonAccess.test.ts`

Atteso: FAIL, modulo assente.

- [ ] **Step 3: Implementare**

In `src/lib/salonPath.ts` il tipo diventa `export type AccountRole = 'titolare' | 'socio' | 'collaboratore'`. `accountCreateAllowed` continua a rifiutare un ruolo diverso da `titolare` quando il client crea l’account.

Creare `src/lib/salonAccess.ts` con le funzioni sopra. `createInviteDecision` normalizza l’email con `normalizeEmail`. Un membro revocato con la stessa email non blocca un nuovo invito. `acceptInviteDecision` tratta `status` diverso da `aperto` come `Invito non valido`, e controlla la scadenza solo se lo status è `aperto`. `activeOthers` sono i soci e collaboratori già attivi, senza contare l’invito che si sta accettando. `revokeDecision` e `changeRoleDecision` richiedono chiamante `titolare` o `socio`, `proEnabled`, e `caller.salonId === salonId`. `changeRoleDecision` accetta `nextRole` solo `socio` o `collaboratore`, e rifiuta `targetUid === salonId`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/lib/salonAccess.test.ts`

Atteso: PASS.

Poi `npx tsc --noEmit`. Atteso: nessun errore.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/salonAccess.ts src/lib/salonAccess.test.ts src/lib/salonPath.ts
git commit -m "feat: decisioni di invito e posti del piano Pro"
```

---

### Task 2: Persona sull’appuntamento

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/appointments.ts`
- Modify: `src/data/local/appointments.test.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/lib/appointments.ts`
- Modify: `src/lib/appointments.test.ts`

**Interfaces:**
- Consumes: `assigneeOf` da `src/lib/salonAccess.ts`.
- Produces: `Appointment.assigneeUid?: string` e lo stesso su `AppointmentWrite`. `overlapLabel` accetta un quinto argomento opzionale `{ ownerUid: string; assigneeUid: string } | undefined`. Se manca, il comportamento attuale non cambia.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/appointments.test.ts`, accanto al test della sovrapposizione esistente, aggiungere un test: due visite alla stessa ora, una con `assigneeUid: 'a'` e una con `assigneeUid: 'b'`. Chiamare `overlapLabel(items, dogName, start, end, undefined, { ownerUid: 'owner', assigneeUid: 'a' })` e aspettarsi l’avviso solo per il cane della persona `a`. La stessa chiamata senza il sesto argomento si aspetta entrambi i cani, come oggi. Una visita senza `assigneeUid` conta come `owner`.

In `src/data/local/appointments.test.ts` un test crea una visita con `assigneeUid: 'c1'`, la rilegge, poi un update senza il campo la conserva, e un update con `assigneeUid: 'c2'` la sostituisce. Un personale nuovo senza campo resta senza campo in questo task: lo mette la UI nel task 9.

In `src/lib/firebaseMap.test.ts` un giro di scrittura e lettura conserva `assigneeUid`. Campo assente in lettura: la proprietà non c’è.

- [ ] **Step 2: Eseguire i test e vederli fallire**

`npx vitest run src/lib/appointments.test.ts src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts -t "assignee"`

Atteso: FAIL sui test nuovi. Se il filtro `-t` non prende i titoli, usare i titoli esatti scelti nello step 1, tutti contenenti `assignee`.

- [ ] **Step 3: Implementare**

Aggiungere il campo ai due tipi. In locale e in `firebaseMap`, leggerlo solo se è una stringa non vuota. In update, `undefined` conserva il valore precedente; una stringa lo sostituisce. `overlapLabel` con il filtro tiene gli item il cui `assigneeOf` è uguale a `assigneeUid` del filtro, poi riusa il testo attuale.

- [ ] **Step 4: Eseguire i test e vederli passare**

`npx vitest run src/lib/appointments.test.ts src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`

Atteso: PASS, compresi i test vecchi della sovrapposizione.

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/lib/appointments.ts src/lib/appointments.test.ts
git commit -m "feat: l'appuntamento ricorda chi lo fa"
```

---

### Task 3: Incassi del collaboratore

**Files:**
- Modify: `src/lib/earnings.ts`
- Modify: `src/lib/earnings.test.ts`
- Modify: `src/pages/EarningsPage.tsx`
- Modify: `src/pages/EarningsReportPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/lib/earningsExport.ts` solo se l’export riceve già l’elenco appuntamenti dal chiamante: in quel caso il filtro sta nel chiamante, non in una seconda copia.

**Interfaces:**
- Consumes: `visibleAppointments` e `EarningsViewer`.
- Produces: nessuna funzione nuova. I tre schermi passano al calcolo solo `visibleAppointments(appointments, viewer)`.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/lib/earnings.test.ts` non serve una funzione nuova se il filtro è già coperto dal task 1. Aggiungere un test di pagina in `src/pages/EarningsPage.test.tsx`: due visite completate nello stesso periodo, una assegnata all’uid della sessione e una a un altro. Con `role: 'collaboratore'` il totale è solo la prima. Con `role: 'titolare'` il totale è la somma.

Per forzare il ruolo, estendere il mock della sessione già usato dal test, oppure l’account locale se la pagina lo legge da `useSession().gate.account.role`. Il task 6 mette `role` sulla sessione: questo task legge `account.role ?? 'titolare'` e `account.salonId ?? account.uid` come `ownerUid`. Se `role` non è ancora sul tipo, aggiungerlo qui come campo opzionale su `LocalAccount` e copiarlo in `watchAuth` solo se il mapper ha già il ruolo del documento. Non spostare le altre pagine.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/EarningsPage.test.tsx -t "collaboratore"`

Atteso: FAIL, il totale include entrambe le visite.

- [ ] **Step 3: Implementare**

Nelle tre pagine, prima di `reportOf` e prima del calcolo della pagina Incassi, filtrare con `visibleAppointments`. `viewer.uid` è l’uid dell’account. `viewer.ownerUid` è `account.salonId` se c’è, altrimenti `uid`. `viewer.role` è `account.role` se è `socio` o `collaboratore`, altrimenti `titolare`. Lo storico in `DogPage` non si filtra.

L’export deve ricevere lo stesso elenco già filtrato. Cercare il chiamante dell’export in `EarningsPage` o `EarningsReportPage` e passare quell’elenco.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/EarningsPage.test.tsx src/lib/earnings.test.ts`

Atteso: PASS.

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts src/pages/EarningsPage.tsx src/pages/EarningsPage.test.tsx src/pages/EarningsReportPage.tsx src/pages/SettingsPage.tsx src/data/local/auth.ts src/data/firebase/client.ts
git commit -m "feat: il collaboratore vede solo i propri incassi"
```

Aggiungere all’`git add` solo i file davvero modificati fra quelli elencati.

---

### Task 4: Regole Firestore

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/firestoreRules.test.ts`

**Interfaces:**
- Consumes: i percorsi della spec, sezione 1 e 2.
- Produces: `canUse`, `ownerRank`, `proEnabled` nelle regole. Il client non scrive `pro/main`, `members` e `invites`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/firestoreRules.test.ts` aggiungere un test che legge `firestore.rules` e verifica, sul match `salons/{salonId}`:

- esiste `function proEnabled(salonId)`;
- esiste `function canUse(salonId)` e contiene `memberRole() == 'titolare'`;
- esiste `function ownerRank(salonId)`;
- `match /salons/{salonId}/pro/{docId}` ha `allow write: if false` e la lettura usa `canUse(salonId) || isOperator()`;
- `match /salons/{salonId}/members/{memberId}` ha `allow write: if false`;
- `match /invites/{token}` ha `allow read, write: if false`;
- il match dei cani, o il match generico con una condizione sul kind `dogs`, nega la delete al collaboratore e, in update, pretende `resource.data.status == 'attivo'` e `request.resource.data.status == 'attivo'` quando il ruolo è `collaboratore`;
- un appuntamento `completato` aggiornato da un collaboratore pretende che `assigneeUid` non cambi;
- i match di `salon/shared` restano con `isOperator() || owns('shared')`;
- `accounts/{uid}` continua a impedire al client di cambiare `salonId` e `role`.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/lib/firestoreRules.test.ts`

Atteso: FAIL, funzioni assenti.

- [ ] **Step 3: Implementare**

Aggiungere le funzioni. `memberRole()` legge `get(accountPath()).data.role`. Sostituire, sui documenti `salons/{salonId}` che non sono `shared`, `owns(salonId)` con `canUse(salonId)` in lettura. La scrittura di `settings`, `services`, `closures`, `files` e del listino resta a `ownerRank`. Cani e appuntamenti seguono la spec, sezione 2. Non allargare `shared`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/lib/firestoreRules.test.ts`

Atteso: PASS.

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add firestore.rules src/lib/firestoreRules.test.ts
git commit -m "feat: le regole separano titolare, socio e collaboratore"
```

---

### Task 5: Funzioni di invito

**Files:**
- Create: `functions/src/salonInvite.ts`
- Create: `functions/src/salonInvite.test.ts`
- Modify: `functions/src/index.ts`

**Interfaces:**
- Consumes: le decisioni di `src/lib/salonAccess.ts`. `sendBrevo` resta in `index.ts`: `salonInvite.ts` non chiama la rete. Esporta `inviteMail(token, salonName, role)` che torna `{ templateId: 5, params: { link, salonName, roleLabel } }`.
- Produces: callable `setSalonPro`, `createInvite`, `acceptInvite`, `revokeMember`, `changeMemberRole`.

- [ ] **Step 1: Scrivere il test che fallisce**

`functions/src/salonInvite.test.ts` verifica `inviteMail('abc', 'Pelo', 'socio')` uguale a `{ templateId: 5, params: { link: 'https://groomly-3128b.web.app/invito/abc', salonName: 'Pelo', roleLabel: 'Socio' } }`.

Un secondo test, sulla funzione pura `tokenBytes()` esportata, verifica che il token sia 64 caratteri esadecimali.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run functions/src/salonInvite.test.ts`

Atteso: FAIL.

- [ ] **Step 3: Implementare**

`salonInvite.ts` esporta `inviteMail` e `tokenBytes`. `index.ts` aggiunge le cinque callable con lo stesso `callable` di `sendVerificationEmail`. Ognuna:

- richiede `request.auth`;
- legge l’account `accounts/{uid}`;
- chiama la decisione di `salonAccess`;
- se `ok` è false, `throw new HttpsError('failed-precondition', result.message)`;
- se l’email deve partire, prima scrive l’invito in una transazione, poi `sendBrevo`. Se Brevo fallisce, cancella l’invito appena scritto e rilancia `Invio non riuscito`.

`createInvite` usa `crypto.randomBytes` via `tokenBytes`. `setSalonPro` scrive `salons/{salonId}/pro/main` con `enabled`, `seats: 3`, `updatedAt` ISO, e se manca crea il membro titolare. `acceptInvite` usa una transazione e rifiuta se nel salone personale esiste già un documento in `dogs` o `appointments`. `revokeMember` aggiorna membro e account come nella spec. `changeMemberRole` aggiorna membro e account.

Le email di Laura e Roberto non si invitano: lo decide già `createInviteDecision`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run functions/src/salonInvite.test.ts src/lib/salonAccess.test.ts`

Atteso: PASS.

Poi `npx tsc --noEmit`. Se le functions hanno un `tsconfig` proprio, eseguire anche il suo `tsc` se esiste già uno script. Non aggiungere dipendenze.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/salonInvite.ts functions/src/salonInvite.test.ts functions/src/index.ts
git commit -m "feat: invito, revoca e interruttore Pro sul server"
```

---

### Task 6: Lettura di Pro e dei membri

**Files:**
- Modify: `src/data/local/auth.ts` se `role` non è già stato aggiunto nel task 3
- Modify: `src/data/firebase/client.ts`
- Modify: `src/data/firebase/client.test.ts`
- Create: `src/lib/salonRoster.ts`
- Create: `src/lib/salonRoster.test.ts`

**Interfaces:**
- Consumes: `AccountRole`, `showAssigneePicker`.
- Produces: `watchSalonAccess(salonId, onChange)` in `client.ts` che restituisce `{ enabled: boolean; members: { uid: string; email: string; role: AccountRole; firstName: string; lastName: string; status: 'attivo' | 'revocato' }[] }`. `rosterLabel(member)` torna nome e cognome, oppure l’email. `pickerMembers(access)` torna i soli membri `attivo`, nell’ordine titolare, socio, collaboratore, poi etichetta.

- [ ] **Step 1: Scrivere i test che falliscono**

`salonRoster.test.ts`: un membro senza nome usa l’email; l’ordine del selettore è titolare, poi socio, poi collaboratore; i revocati non entrano. `client.test.ts`: il mapper dell’account copia `role: 'collaboratore'` e, se il campo manca, non inventa un socio.

- [ ] **Step 2: Eseguire i test e vederli fallire**

`npx vitest run src/lib/salonRoster.test.ts src/data/firebase/client.test.ts -t "role"`

- [ ] **Step 3: Implementare**

`watchAuth` copia `role` solo se è uno dei tre valori. `watchSalonAccess` legge `pro/main` e `members`. Documento assente: `enabled: false` e membri vuoti. Non scrivere da questa funzione.

- [ ] **Step 4: Eseguire i test e vederli passare**

`npx vitest run src/lib/salonRoster.test.ts src/data/firebase/client.test.ts`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/auth.ts src/data/firebase/client.ts src/data/firebase/client.test.ts src/lib/salonRoster.ts src/lib/salonRoster.test.ts
git commit -m "feat: la sessione legge ruolo, Pro e membri"
```

---

### Task 7: Funzioni Pro e menu del collaboratore

**Files:**
- Create: `src/pages/ProPage.tsx`
- Create: `src/pages/ProPage.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/NotificationsPage.tsx`
- Modify: `src/pages/EarningsPage.tsx`

**Interfaces:**
- Consumes: `watchSalonAccess`, `usedSeats`, `createInviteDecision` per il rifiuto locale a 3 posti, e le callable tramite funzioni sottili in `client.ts`: `callCreateInvite`, `callRevokeMember`, `callChangeMemberRole`.
- Produces: route `/impostazioni/pro`.

- [ ] **Step 1: Scrivere i test che falliscono**

`ProPage.test.tsx`:

- accesso con salone `shared` o `enabled: false` mostra «Non attivo» e non mostra «Invita»;
- con Pro acceso, un collaboratore attivo e un invito aperto mostra «2 di 3 posti»;
- «Invia» con email vuota mostra «Inserisci un’email valida» e non chiama la callable;
- a 3 posti il pulsante non chiama la callable e mostra «Posti esauriti».

`SettingsPage.test.tsx`:

- un titolare vede il link «Funzioni Pro»;
- un collaboratore non vede «Funzioni Pro», «Backup», «Servizi e durate», «Archivio animali»;
- vede «Incassi e report», «Tema», «Notifiche», «Esci».

Un test di `NotificationsPage`: con ruolo collaboratore il toggle «Mensili in scadenza» è disabilitato. Un test di `EarningsPage`: con ruolo collaboratore non c’è «Nascondi importi».

- [ ] **Step 2: Eseguire i test e vederli fallire**

`npx vitest run src/pages/ProPage.test.tsx src/pages/SettingsPage.test.tsx -t "Pro"`

- [ ] **Step 3: Implementare**

La voce sta sotto la sezione Attività, prima di Aspetto, con lo stesso stile `MenuIcon` e `ChevronRight` delle altre righe. Icona `Users` già importata, oppure `Sparkles` se `Users` è già usata nella riga operatore. Testo «Funzioni Pro».

`ProPage` usa `Header` con titolo «Funzioni Pro» e `backTo="/impostazioni"`. Il form Invita ha campo etichetta «Email», due pulsanti «Socio» e «Collaboratore» con `aria-pressed`, e «Invia». Il successo è il testo «Invito spedito a » più l’email normalizzata. «Revoca» ha `aria-label` `Revoca ` più l’etichetta della persona. Il cambio ruolo è un controllo con i due nomi, visibile solo su soci e collaboratori.

Per il collaboratore, `SettingsPage` non renderizza i blocchi vietati dalla spec. Le route vietate, in `router.tsx`, se `account.role === 'collaboratore'` rendono `Navigate` a `/impostazioni`. Il guard sta nel componente della route, non in un secondo router.

- [ ] **Step 4: Eseguire i test e vederli passare**

`npx vitest run src/pages/ProPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/NotificationsPage.test.tsx src/pages/EarningsPage.test.tsx`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/ProPage.tsx src/pages/ProPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/app/router.tsx src/pages/NotificationsPage.tsx src/pages/EarningsPage.tsx src/data/firebase/client.ts
git commit -m "feat: Funzioni Pro in Impostazioni"
```

---

### Task 8: Interruttore dell’operatore

**Files:**
- Modify: `src/pages/UsersPage.tsx`
- Modify: `src/pages/UsersPage.test.tsx`
- Modify: `src/data/firebase/client.ts`

**Interfaces:**
- Consumes: `callSetSalonPro(salonId, enabled)` che chiama la callable `setSalonPro`.
- Produces: su ogni salone diverso da `shared`, il pulsante «Attiva Pro» o «Spegni Pro».

- [ ] **Step 1: Scrivere il test che fallisce**

Nel test esistente di `UsersPage`, il salone `shared` non ha «Attiva Pro». Un salone normale ha «Attiva Pro». Il click chiama `callSetSalonPro` con `{ salonId, enabled: true }`. Dopo un accesso con `enabled: true`, il pulsante è «Spegni Pro».

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/UsersPage.test.tsx`

- [ ] **Step 3: Implementare**

Il pulsante sta nella card del salone, altezza almeno 44. Errore della callable: testo «Accesso negato» sotto la card. Non aggiungere il pulsante a `shared`.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/UsersPage.test.tsx`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/UsersPage.tsx src/pages/UsersPage.test.tsx src/data/firebase/client.ts
git commit -m "feat: l'operatore accende Pro sul salone"
```

---

### Task 9: Chi lo fa nel form

**Files:**
- Modify: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/appointments.test.tsx`
- Modify: `src/lib/appointments.ts` solo se il valore del form deve uscire in `AppointmentWrite`

**Interfaces:**
- Consumes: `showAssigneePicker`, `pickerMembers`, `rosterLabel`, `overlapLabel` con il filtro.
- Produces: il campo nel write solo quando il selettore è visibile.

- [ ] **Step 1: Scrivere il test che fallisce**

In `appointments.test.tsx`: con Pro spento il form non ha «Chi lo fa». Con Pro acceso e un collaboratore attivo, c’è il gruppo «Chi lo fa», il collaboratore è selezionabile, e il salvataggio dell’appuntamento contiene `assigneeUid` di quel membro. Due visite alla stessa ora di persone diverse non mostrano «Si sovrappone». Due della stessa persona sì.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/appointments.test.tsx -t "Chi lo fa"`

- [ ] **Step 3: Implementare**

La riga sta nel form della visita di un cane, dopo il cane e prima dei servizi. Gruppo `role="group"` e `aria-label="Chi lo fa"`. Pulsanti con `aria-pressed`. Valore iniziale: uid della sessione se è fra i membri attivi, altrimenti il titolare. In modifica, la persona salvata. Appuntamento personale: la persona è chi lo crea e la riga non si mostra. Il filtro di sovrapposizione si passa solo se `showAssigneePicker` è vero.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/appointments.test.tsx`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentForm.tsx src/pages/AppointmentPage.tsx src/pages/appointments.test.tsx src/lib/appointments.ts
git commit -m "feat: si assegna la visita a una persona del salone"
```

---

### Task 10: Scheda cane del collaboratore

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `account.role`.
- Produces: nessun pulsante nuovo.

- [ ] **Step 1: Scrivere il test che fallisce**

Con ruolo `collaboratore`, la scheda di un cane attivo non mostra «Non più in cura», «Deceduto» e «Elimina definitivamente». Mostra ancora il salvataggio delle modifiche. Con ruolo `titolare` i tre controlli restano.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/DogsPage.test.tsx -t "collaboratore"`

- [ ] **Step 3: Implementare**

Nascondere quei controlli quando `role === 'collaboratore'`. Non cambiare l’archivio del titolare.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/DogsPage.test.tsx`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: il collaboratore non archivia e non elimina un cane"
```

---

### Task 11: Pagina dell’invito

**Files:**
- Create: `src/pages/InvitePage.tsx`
- Create: `src/pages/InvitePage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/data/firebase/client.ts`

**Interfaces:**
- Consumes: `callAcceptInvite(token)`.
- Produces: route `/invito/:token` fuori da `Guard`, accanto a `/login`.

- [ ] **Step 1: Scrivere il test che fallisce**

La pagina mostra «Invito» e, se la sessione è fuori, un link a `/login`. Se la sessione è dentro e la callable risolve, naviga a `/`. Se la callable rifiuta con `Invito scaduto`, si legge quel testo e l’account non viene riscritto in locale. Se rifiuta con `Invito non valido`, si legge quel testo.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/pages/InvitePage.test.tsx`

- [ ] **Step 3: Implementare**

All’ingresso, se c’è una sessione, chiamare `acceptInvite` una volta. Errore: paragrafo con il messaggio della funzione, senza altri testi. Successo: `navigate('/')`. Non mostrare il token.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/pages/InvitePage.test.tsx`

Poi `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/InvitePage.tsx src/pages/InvitePage.test.tsx src/app/router.tsx src/data/firebase/client.ts
git commit -m "feat: si entra nel salone dal link dell'invito"
```

---

### Task 12: Pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`
- Modify: `package.json`
- Modify: `android/app/build.gradle`
- Modify: `hosting/release.json`

**Interfaces:**
- Consumes: la versione trovata all’inizio del task.
- Produces: patch successiva, release GitHub `groomly.apk`, deploy Firebase di regole, indici e hosting.

- [ ] **Step 1: Verificare la suite**

`npm test`

Atteso: PASS. Se fallisce, fermarsi. Non pubblicare.

- [ ] **Step 2: Alzare la patch**

Leggere `APP_VERSION`. Se è `1.1.80`, scrivere `1.1.81` e `versionCode` `10181`. Altrimenti incrementare la patch e calcolare `versionCode = major * 10000 + minor * 100 + patch`. Allineare `package.json`, `android/app/build.gradle` (`versionName` e `versionCode`) e `hosting/release.json` (`version` e `url` `https://github.com/robmass83-ui/Groomly/releases/download/vX.Y.Z/groomly.apk`).

- [ ] **Step 3: Costruire l’APK**

`npm run build`

`npx cap sync android`

In `android`: `.\gradlew assembleDebug`

Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del repo. Non metterlo in `hosting/` e non aggiungerlo al commit.

- [ ] **Step 4: Commit e push**

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "feat: pubblica i collaboratori del piano Pro"
git push origin HEAD
```

Il commit include anche gli altri file di codice già committati nei task precedenti solo se risultano ancora non committati. Non aggiungere `groomly.apk`.

- [ ] **Step 5: Release e Firebase**

```powershell
gh release create vX.Y.Z groomly.apk --repo robmass83-ui/Groomly --title "vX.Y.Z" --notes "Il piano Pro invita un socio o un collaboratore. Laura resta com'è."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook. Il template Brevo numero 5 va creato a mano nel pannello Brevo prima che un invito reale parta: il codice lo usa già.
