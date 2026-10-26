# Notifiche push Implementation Plan

Eseguito — vedi registro.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far arrivare sul telefono, anche con Groomly chiusa, le push scelte in Notifiche: aggiornamento disponibile e «c’è da completare Lilly», senza spostare i riquadri in Home.

**Architecture:** Le preferenze stanno su `accounts/{uid}/push/prefs`, il token sul dispositivo. Una funzione ogni 5 minuti decide gli invii con `selectPushes` e li manda via FCM. Home continua a usare `CLOSE_AFTER_MS`.

**Tech Stack:** React 18, Vitest, Capacitor 8, Firebase Functions v2, Firebase Cloud Messaging, Firestore rules.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-21-notifiche-push-design.md`. I testi fra virgolette si copiano così come sono.
- Non cambiare la forma di `SettingsMain`. Non scrivere campi push in `salon/shared/settings/main`.
- `CLOSE_AFTER_MS` e il riquadro «Da chiudere» restano un’ora dopo la fine. Il promemoria mensile non cambia comportamento.
- Nessun colore esadecimale nuovo. Controlli nuovi alti almeno 44 px. Niente ellipsis sul testo. Etichetta visibile, non solo `aria-label`.
- Non alzare `APP_VERSION` e non pubblicare l’APK in questi task.
- Non inventare `google-services.json` né una chiave privata.
- Se il deploy della funzione pianificata fallisce perché il progetto non è su Blaze, fermarsi e dirlo. Non sostituire l’invio con un allarme locale.
- Un tipo push futuro è una chiave booleana default false. Questo piano ne ha due: `updates` e `complete`.

---

### Task 1: Calcolo di cosa inviare

**Files:**
- Create: `src/lib/pushDue.ts`
- Test: `src/lib/pushDue.test.ts`

**Interfaces:**
- Produces:
  - `PushPrefs` `{ enabled: boolean; updates: boolean; complete: boolean; completeAfterMin: number }`
  - `DEFAULT_PUSH_PREFS` enabled false, updates true, complete true, completeAfterMin 60
  - `readPushPrefs(value: unknown): PushPrefs`
  - `deliveryId(deviceId: string, kind: 'updates' | 'complete', subject: string): string`
  - `appointmentDueMs(startMs: number, durationMin: number, afterMin: number): number`
  - `completeBody(name: string | undefined): string`
  - `PushSend` `{ deviceId: string; token: string; kind: 'updates' | 'complete'; subject: string; title: string; body: string; data: Record<string, string> }`
  - `selectPushes(input: SelectInput): PushSend[]`
  - `isNewerRelease(remote: string, local: string): boolean` stessa regola di `isNewerVersion` in `src/lib/appRelease.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/pushDue.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CLOSE_AFTER_MS, appointmentEnd, closeDueAt } from './appointments'
import {
  appointmentDueMs,
  completeBody,
  DEFAULT_PUSH_PREFS,
  deliveryId,
  readPushPrefs,
  selectPushes,
} from './pushDue'

const summer = Date.parse('2026-06-15T08:00:00.000Z') // 10:00 a Roma
const winter = Date.parse('2026-01-15T09:00:00.000Z') // 10:00 a Roma

describe('scadenza push', () => {
  it('a Roma arrotonda come roundEnd e poi aggiunge i minuti della push', () => {
    expect(appointmentDueMs(summer, 45, 60)).toBe(Date.parse('2026-06-15T09:45:00.000Z'))
    expect(appointmentDueMs(summer, 53, 60)).toBe(Date.parse('2026-06-15T09:55:00.000Z'))
    expect(appointmentDueMs(winter, 45, 0)).toBe(Date.parse('2026-01-15T09:45:00.000Z'))
  })

  it('i minuti della push non sono l’ora fissa di Home', () => {
    const start = new Date(2026, 5, 15, 10, 0, 0)
    const services = [{ durationMin: 60 }]
    expect(closeDueAt(start, services).getTime() - appointmentEnd(start, services).getTime()).toBe(CLOSE_AFTER_MS)
    expect(appointmentDueMs(start.getTime(), 60, 15)).not.toBe(closeDueAt(start, services).getTime())
  })

  it('legge i default e tiene i minuti fra 0 e 1440', () => {
    expect(readPushPrefs(undefined)).toEqual(DEFAULT_PUSH_PREFS)
    expect(readPushPrefs({ enabled: true, updates: false, complete: true, completeAfterMin: 2000 }).completeAfterMin).toBe(1440)
    expect(readPushPrefs({ completeAfterMin: -3 }).completeAfterMin).toBe(0)
  })

  it('compone id e corpo', () => {
    expect(deliveryId('tel 1', 'complete', 'app/9')).toBe('tel_1__complete__app_9')
    expect(completeBody('Lilly')).toBe('C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.')
    expect(completeBody('  ')).toBe('C’è da completare un appuntamento: è passato il tempo dopo la fine dell’appuntamento.')
  })

  it('seleziona al massimo 8 da completare, dentro le 24 ore, e l’aggiornamento più nuovo', () => {
    const now = appointmentDueMs(summer, 60, 60) + 60_000
    const prefs = { ...DEFAULT_PUSH_PREFS, enabled: true, completeAfterMin: 60 }
    const base = { deviceId: 'd1', token: 'tok', appVersion: '1.1.62', delivered: [], dogNames: { lilly: 'Lilly' }, latestVersion: '1.2.0', nowMs: now, prefs }
    const fresh = { id: 'a1', dogId: 'lilly', status: 'programmato', startMs: summer, durationMin: 60 }
    const done = { ...fresh, id: 'a2', status: 'completato' }
    const old = { ...fresh, id: 'a3', startMs: summer - 3 * 24 * 60 * 60 * 1000 }
    const sends = selectPushes({ ...base, appointments: [done, old, fresh] })
    expect(sends.map((item) => item.kind).sort()).toEqual(['complete', 'updates'])
    const complete = sends.find((item) => item.kind === 'complete')
    expect(complete).toMatchObject({
      title: 'Da completare',
      body: 'C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.',
      subject: 'a1',
      data: { type: 'complete', appointmentId: 'a1', url: '/appuntamenti/a1' },
    })
    const update = sends.find((item) => item.kind === 'updates')
    expect(update).toMatchObject({
      title: 'Aggiornamento disponibile',
      body: 'È pronta la versione 1.2.0.',
      data: { type: 'update', version: '1.2.0' },
    })
    expect(selectPushes({ ...base, prefs: { ...prefs, enabled: false }, appointments: [fresh] })).toEqual([])
    expect(selectPushes({ ...base, prefs: { ...prefs, complete: false }, appointments: [fresh] }).every((item) => item.kind === 'updates')).toBe(true)
    expect(selectPushes({ ...base, prefs: { ...prefs, updates: false }, latestVersion: '1.2.0', appointments: [fresh] }).every((item) => item.kind === 'complete')).toBe(true)
    expect(selectPushes({ ...base, delivered: [deliveryId('d1', 'complete', 'a1'), deliveryId('d1', 'updates', '1.2.0')], appointments: [fresh] })).toEqual([])
    const many = Array.from({ length: 9 }, (_, index) => ({ ...fresh, id: `n${index}`, startMs: summer - index * 60_000 }))
    const limited = selectPushes({ ...base, latestVersion: null, appointments: many }).filter((item) => item.kind === 'complete')
    expect(limited).toHaveLength(8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pushDue.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`appointmentDueMs` ricostruisce il muro di `Europe/Rome` con `Intl.DateTimeFormat` (`hourCycle: 'h23'`). La fine è la mezzanotte di quel giorno a Roma più i minuti arrotondati ai 5, la stessa formula di `roundEnd` in `src/lib/quote.ts`: `Math.round(minutiEsatti / 5) * 5`, poi `setMinutes`. Aggiunge `afterMin` minuti. Non usa l’orologio locale del processo.

`readPushPrefs`: oggetto assente o malformato torna `DEFAULT_PUSH_PREFS`. `completeAfterMin` non intero o fuori da 0..1440 viene stretto a quell’intervallo. Le booleane assenti usano il default. Una chiave futura assente non diventa true.

`selectPushes` ritorna `[]` se manca il token o `enabled` è false. Aggiornamento solo se `updates` e `isNewerRelease(latestVersion, appVersion)`. Da completare solo se `status === 'programmato'`, `due <= now` e `now - due <= 24 * 60 * 60 * 1000`. Ordine per `due` crescente, taglio a 8. Salta gli id già in `delivered`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pushDue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pushDue.ts src/lib/pushDue.test.ts
git commit -m "feat: decide quali push partono senza toccare Home"
```

---

### Task 2: Regole Firestore

**Files:**
- Modify: `firestore.rules`
- Test: `src/lib/firestoreRules.test.ts`

**Interfaces:**
- Consumes: percorsi `accounts/{uid}/push/prefs`, `accounts/{uid}/devices/{deviceId}`, `pushDeliveries/{id}` dalla specifica
- Produces: quelle regole, niente altro

- [ ] **Step 1: Write the failing test**

Aggiungi in `firestoreRules.test.ts` un test che legge il file e si aspetta:

- `match /accounts/{uid}/push/{docId}`
- `match /accounts/{uid}/devices/{deviceId}`
- `match /pushDeliveries/{id}`
- `allow read, write: if false` nel blocco `pushDeliveries`
- `request.auth.uid == uid` nei due blocchi dell’account
- `completeAfterMin <= 1440`
- `docId == 'prefs'`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: FAIL perché i match non ci sono.

- [ ] **Step 3: Write minimal implementation**

Dopo il match `accounts/{uid}`, aggiungi i tre match. `push/prefs`: read e delete solo del proprio uid; create e update solo se `docId == 'prefs'` e le chiavi sono esattamente `enabled`, `updates`, `complete`, `completeAfterMin`, `updatedAt`, con i tipi della specifica e `completeAfterMin` intero fra 0 e 1440. `devices`: il proprio uid, chiavi esattamente `token`, `platform`, `appVersion`, `updatedAt`, `platform == 'android'`, `token.size() < 4096`. `pushDeliveries`: `allow read, write: if false`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firestoreRules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/lib/firestoreRules.test.ts
git commit -m "feat: le preferenze push restano sull'account"
```

---

### Task 3: Lettura e salvataggio preferenze

**Files:**
- Create: `src/data/pushPrefs.ts`
- Test: `src/data/pushPrefs.test.ts`
- Modify: `src/data/firebase/client.ts` (tre funzioni in fondo)

**Interfaces:**
- Consumes: `readPushPrefs`, `PushPrefs` da `src/lib/pushDue.ts`
- Produces:
  - `loadPushPrefs(uid: string): PushPrefs`
  - `savePushPrefs(uid: string, prefs: PushPrefs): void` in locale
  - `listenAccountPush(uid: string, onData: (prefs: PushPrefs) => void): Promise<() => void>`
  - `writeAccountPush(uid: string, prefs: PushPrefs): Promise<void>`
  - `writePushDevice(uid: string, deviceId: string, device: { token: string; appVersion: string } | null): Promise<void>`
  - chiave locale `groomly.pushPrefs.{uid}`

- [ ] **Step 1: Write the failing test**

`pushPrefs.test.ts` con il localStorage di Vitest. `loadPushPrefs` di un uid nuovo è `DEFAULT_PUSH_PREFS`. `savePushPrefs` con `completeAfterMin: 15` e `enabled: true` si rilegge uguale. Un JSON rotto torna i default. Il test di `client.ts` non è obbligato a parlare con Firestore vero: esporta le funzioni e, se il file di test del client è troppo accoppiato, copri solo il modulo locale qui. Le funzioni Firestore vanno comunque aggiunte e tipate.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/pushPrefs.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`src/data/pushPrefs.ts` usa `localStorage` e `readPushPrefs`. In `client.ts`, in fondo, `listenAccountPush` fa `onSnapshot` su `accounts/{uid}/push/prefs` e chiama `onData(readPushPrefs(data))` anche se il documento non esiste. `writeAccountPush` fa `setDoc` con merge false e `updatedAt` ISO. `writePushDevice` con device null fa `deleteDoc`; altrimenti `setDoc` con `platform: 'android'`, token, appVersion, updatedAt. Usa `database()` e gli import Firestore già presenti nel file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/pushPrefs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/pushPrefs.ts src/data/pushPrefs.test.ts src/data/firebase/client.ts
git commit -m "feat: salva le preferenze push sull'account"
```

---

### Task 4: Scheda in Notifiche e riga in Impostazioni

**Files:**
- Modify: `src/components/ui/Toggle.tsx`
- Modify: `src/pages/NotificationsPage.tsx`
- Modify: `src/pages/NotificationsPage.test.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Create: `src/hooks/usePushPrefs.ts`

**Interfaces:**
- Consumes: `loadPushPrefs`, `savePushPrefs`, `listenAccountPush`, `writeAccountPush`, `PushPrefs`
- Produces: `usePushPrefs(uid: string): { prefs: PushPrefs; save: (next: PushPrefs) => void }`

`Toggle` guadagna `disabled?: boolean`. Se true: `aria-disabled="true"`, il click non chiama `onChange`, opacità 0.45. I chiamanti attuali non passano `disabled`.

- [ ] **Step 1: Write the failing test**

In `NotificationsPage.test.tsx` un test apre `/impostazioni/notifiche` e vede «Notifiche push», «Arrivano sul telefono, anche con Groomly chiusa. Non spostano i riquadri in Home.», «Aggiornamenti», «Da completare», «Minuti dopo la fine», «Vale solo per questa push. In Home, Da chiudere resta un’ora dopo la fine.» Lo switch «Notifiche push» è spento e i due tipi sono disabilitati. Accendendolo, i tipi si possono spegnere. I minuti `15` restano dopo un rerender. Una lettera nel campo non cambia il 60 di default. Il promemoria mensile resta con «Notifica sul telefono».

In `SettingsPage.test.tsx` la riga Notifiche contiene `Push spente`. Dopo aver salvato `enabled: true` per quell’uid, contiene `Push attive` insieme al dettaglio del mensile, con ` · `.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL sui testi nuovi.

- [ ] **Step 3: Write minimal implementation**

`usePushPrefs`: se Firebase è spento o `readsLocal()`, legge e scrive il modulo locale. Altrimenti ascolta `listenAccountPush` e salva con `writeAccountPush`; errore di scrittura chiama `notifySaveFailed`.

Seconda `Card` sotto il promemoria, stesso padding e `USER_TEXT`. Interruttore «Notifiche push» con span visibile, `minHeight: 44`. Tipi e campo disabilitati quando `enabled` è false. Nel browser (`!Capacitor.isNativePlatform()`) la frase «Da questo browser non partono.» Il campo minuti ignora ciò che non è un intero 0..1440. Accendere la prima volta, se il documento non aveva `enabled` true, lascia `updates` e `complete` ai default true.

La riga Impostazioni usa `usePushPrefs` e concatena il dettaglio esistente con ` · Push attive` o ` · Push spente`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

Poi: `npm test`
Expected: PASS. Il test di Home «Da chiudere compare un’ora dopo la fine» resta verde.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Toggle.tsx src/hooks/usePushPrefs.ts src/pages/NotificationsPage.tsx src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: in Notifiche si scelgono le push"
```

---

### Task 5: Token sul telefono e arrivo della notifica

**Files:**
- Modify: `package.json`, `package-lock.json` (`@capacitor/push-notifications` major 8, allineato agli altri plugin Capacitor)
- Create: `src/lib/pushDevice.ts`
- Test: `src/lib/pushDevice.test.ts`
- Modify: `src/app/UpdateNotice.tsx`
- Modify: `src/app/UpdateNotice.test.tsx`
- Modify: `src/pages/NotificationsPage.tsx` solo per il permesso e la frase di indisponibilità

**Interfaces:**
- Consumes: `writePushDevice`, `PushPrefs`, `APP_VERSION`
- Produces:
  - `pushDeviceId(): string` da `localStorage` chiave `groomly.pushDevice`, creato con `crypto.randomUUID` se manca
  - `shouldScheduleLocalUpdate(pushUpdates: boolean, hasToken: boolean): boolean` true solo se la push aggiornamenti non è pronta
  - `pushTapPath(data: Record<string, string>): string | null` per `type=complete` e `url` che inizia con `/appuntamenti/` ritorna quell’url; altrimenti null

- [ ] **Step 1: Write the failing test**

`pushDevice.test.ts` copre id stabile, `shouldScheduleLocalUpdate(true, true) === false`, `shouldScheduleLocalUpdate(true, false) === true`, `shouldScheduleLocalUpdate(false, true) === true`, e `pushTapPath({ type: 'complete', url: '/appuntamenti/a1' }) === '/appuntamenti/a1'`. Un url che non inizia con `/appuntamenti/` ritorna null.

In `UpdateNotice.test.tsx`, con native true e un modulo mock di `shouldScheduleLocalUpdate` che ritorna false, la release nuova non chiama `LocalNotifications.schedule`. Il mock va messo nel test, non cambiando gli altri test: il default della funzione vera, senza token, resta true, quindi i test esistenti dell’id 2 restano verdi.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pushDevice.test.ts src/app/UpdateNotice.test.tsx`
Expected: FAIL sul modulo assente o sullo schedule ancora chiamato.

- [ ] **Step 3: Write minimal implementation**

Installa `@capacitor/push-notifications`. Non eseguire `cap sync` in questo task se non serve al test.

`UpdateNotice` chiama `announceRelease` solo se `shouldScheduleLocalUpdate` è true. Il valore arriva da un argomento interno letto da `localStorage` chiave `groomly.pushUpdatesReady` uguale a `1`. La scrive la pagina Notifiche quando, su Android, permesso concesso e `updates` true e `PushNotifications.register` ha emesso un token: allora `writePushDevice` e la chiave vale `1`. Se il tipo aggiornamenti è spento, il permesso è negato, o `registrationError` scatta, la chiave si toglie e, se l’interruttore è acceso ma il token manca, compare «Le notifiche push non sono disponibili su questo telefono.» Permesso negato: l’interruttore torna spento e compare «Per riceverle, consenti le notifiche a Groomly.»

All’avvio nativo, se `enabled` è true, aggiorna `appVersion` sul device già salvato. Crea i canali `da-completare` («Da completare») e `aggiornamenti` («Aggiornamenti») con importance 4. Su `pushNotificationActionPerformed`, se `pushTapPath` ritorna un path, `navigate` lì. Se `type` è `update`, non navigare: il foglio lo apre il controllo già esistente. Su `pushNotificationReceived` con `type=complete` e app aperta, programma una notifica locale sullo stesso canale, id ricavato in modo stabile dall’`appointmentId` fra 1000 e 2_000_000_000, titolo e corpo uguali al messaggio. Non programmare una locale per `type=update`.

Prova a ottenere `google-services.json` con Firebase CLI per `it.groomly.app` nel progetto `groomly-3128b`, e mettilo in `android/app/google-services.json`. Se il comando fallisce, non creare il file. Non committare chiavi private. Il json client, se ottenuto, si committa perché la build del telefono lo applica già in `android/app/build.gradle`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pushDevice.test.ts src/app/UpdateNotice.test.tsx src/pages/NotificationsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/pushDevice.ts src/lib/pushDevice.test.ts src/app/UpdateNotice.tsx src/app/UpdateNotice.test.tsx src/pages/NotificationsPage.tsx android/app/google-services.json
git commit -m "feat: il telefono registra il token e apre l'appuntamento"
```

Se `google-services.json` non c’è, non aggiungerlo.

---

### Task 6: Funzione che invia

**Files:**
- Create: `functions/src/sendPush.ts`
- Modify: `functions/src/index.ts`
- Test: `src/lib/sendPush.test.ts` importa `../../functions/src/sendPush`

**Interfaces:**
- Consumes: `selectPushes`, `readPushPrefs`, `deliveryId`, `isNewerRelease`
- Produces: `collectSends(load: PushLoad, nowMs: number): Promise<PushSend[]>` e `export const sendPush = onSchedule(...)` ogni 5 minuti, `europe-west1`

`PushLoad` ha: `accountIds()`, `prefs(uid)`, `devices(uid)` ritorna `{ id, token, appVersion }[]`, `appointments()` ritorna `{ id, dogId, status, startMs, durationMin }[]`, `dogName(dogId)`, `delivered(deviceId)` ritorna gli id già scritti, `latestVersion()` ritorna `string | null`.

- [ ] **Step 1: Write the failing test**

Due dispositivi, uno con `enabled` false. Un appuntamento programmato dovuto e uno completato. `latestVersion` `9.0.0`, un device su `1.1.62` e uno già su `9.0.0`. `collectSends` manda «Da completare» e l’aggiornamento solo al device acceso e solo se la versione è più nuova. `latestVersion` che ritorna null non toglie il da completare. La somma `durationMin` di due servizi entra in `selectPushes`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sendPush.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`collectSends` non importa `firebase-admin`. `index.ts` aggiunge `onSchedule('every 5 minutes', { region: 'europe-west1' }, ...)`. Legge `accounts`, per ognuno `push/prefs` e `devices`. Appuntamenti da `salon/shared/appointments` con status `programmato` e `start` nelle ultime 48 ore (il filtro delle 24 ore sulla scadenza sta in `selectPushes`). Nome cane da `salon/shared/dogs/{dogId}` campo `name`. `latestVersion` fa un solo `fetch` a `https://api.github.com/repos/robmass83-ui/Groomly/releases/latest` con header `Accept: application/vnd.github+json` e `User-Agent: groomly`. Se fallisce, `null`. Per ogni `PushSend`, `getMessaging().send` con `notification` titolo e corpo, `data` tutte stringhe, `android.priority: 'high'`, `channelId` `da-completare` o `aggiornamenti`. Poi `set` su `pushDeliveries/{deliveryId}` con `{ at: now }`. Se l’errore FCM ha codice `registration-token-not-registered`, cancella il campo `token` di quel device e non scrive la consegna. `npm --prefix functions run build` deve passare.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sendPush.test.ts src/lib/pushDue.test.ts`
Expected: PASS

Poi: `npm test` e `npm --prefix functions run build`
Expected: PASS entrambi.

- [ ] **Step 5: Commit**

```bash
git add functions/src/sendPush.ts functions/src/index.ts src/lib/sendPush.test.ts
git commit -m "feat: la funzione manda le push ogni cinque minuti"
```

Non fare il deploy in questo task.

---

## Fuori da questi task

Il bump di versione, l’APK, la release GitHub e il deploy Firebase (regole, indici, hosting e functions) stanno dopo, quando tutto il piano è verde. Se la funzione pianificata non si può pubblicare sul piano gratuito, ci si ferma e lo si dice.
