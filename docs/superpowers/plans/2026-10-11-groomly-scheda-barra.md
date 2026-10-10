# Scheda, barra, tema e apertura — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La scheda mostra i servizi con lo switch acceso, il tema resta sul telefono, Chiama e WhatsApp stanno affiancati e WhatsApp apre l’app, la barra ha cinque voci uguali con il + sollevato, e Home si disegna subito coi dati già sul telefono.

**Architecture:** Si tiene `hiddenServiceIds` come elenco degli switch accesi e si cambia solo chi lo legge. Il tema sta in `localStorage` alla chiave `groomly.theme` e non segue `settings.theme`. L’apertura non aspetta Firebase se la sessione locale è già nota, e cani, appuntamenti, servizi e impostazioni partono dalla copia locale.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, happy-dom, React Router, Capacitor 8, Firebase.

## Global Constraints

- Cani, foto, note, prezzi, appuntamenti e listino restano del salone. Un salvataggio su un telefono è lo stesso sugli altri.
- Lo switch acceso significa «questo servizio sta nel profilo». Gli id già salvati in `hiddenServiceIds` sono quelli accesi. Non si crea un secondo campo e non si inverte l’array già scritto.
- In scheda, una riga per ogni id acceso. Prezzo o durata non scritti si vedono come «—». Lo switch spento toglie la riga e tiene il numero in memoria.
- Il tema (`light`, `dark`, `auto`) vive solo sul telefono, chiave `groomly.theme`. Il tema dentro le impostazioni condivise non si applica e non sostituisce la chiave.
- Chiama e WhatsApp sono due loghi affiancati, senza andare a capo. Sul telefono, WhatsApp apre `whatsapp://send?phone=` e non il browser interno.
- La barra è Home, Animali, Calendario, Listino, Altro, a cinque colonne uguali. Il + è al centro, circa metà sopra la barra. Altro apre `/impostazioni`. La rotella esce da Home. La campanella resta.
- Se l’accesso è già sul telefono, Home si disegna subito coi dati locali. Il cloud aggiorna sul posto e non svuota la pagina mentre risponde.
- Non si aggiunge un campo Firestore nuovo. Non si sincronizza il tema. Non si riprogetta l’editor, il foglio del +, il campanello, il listino o il calendario.

## File structure

- `src/lib/deviceTheme.ts` — legge e scrive `groomly.theme`. Unica fonte del tema a schermo.
- `src/lib/phone.ts` — `whatsAppLink` resta il link web; `whatsAppAppLink` è l’indirizzo `whatsapp://`.
- `src/pages/DogPage.tsx` — righe del profilo, salvataggio dei soli numeri digitati, pulsanti icona, apertura nativa.
- `src/lib/quote.ts` — se manca il numero salvato, l’appuntamento usa il listino. La scheda non usa questa funzione per il trattino.
- `src/lib/firebaseMap.ts` — un prezzo o una durata assenti restano assenti, non diventano 0.
- `src/types/models.ts` — `price` e `durationMin` di `DogServicePrice` possono mancare.
- `src/hooks/useSettings.tsx` — applica il tema del telefono e parte dalle impostazioni locali.
- `src/pages/SettingsPage.tsx` e `src/pages/LoginPage.tsx` — leggono il tema del telefono.
- `src/components/layout/BottomNav.tsx` — cinque voci e + sollevato.
- `src/pages/HomePage.tsx` — via la rotella.
- `src/hooks/useServices.ts` — il seme dei servizi c’è anche con Firebase.
- `src/lib/authAction.ts` — `openingGate` restituisce la sessione già nota.

---

### Task 1: Prezzi accesi nel profilo

**Files:**
- Modify: `src/types/models.ts` (`DogServicePrice`)
- Modify: `src/pages/DogPage.tsx` (`profilePrices`, `CustomPrices`, `shownQuote`, `collectPrices`, etichetta dello switch)
- Modify: `src/lib/quote.ts` (`quotedPrice`)
- Modify: `src/lib/firebaseMap.ts` (`dogFromDoc` sui `servicePrices`)
- Test: `src/pages/DogsPage.test.tsx`
- Test: `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: `Dog.hiddenServiceIds: string[]`, `Dog.servicePrices: { serviceId: string; price?: number; durationMin?: number }[]`, `Service.order`, `formatEuro`.
- Produces: in lettura, una riga per id in `hiddenServiceIds`. Prezzo assente → testo `—`. Durata assente → testo `—`. Lo switch accessibile si chiama `mostra nel profilo`. `quotedPrice` restituisce sempre numeri, usando il listino dove il campo manca.

- [ ] **Step 1: Write the failing test**

In `src/pages/DogsPage.test.tsx`, nel test che salva lo switch, sostituisci il nome del controllo:

```tsx
expect(screen.queryByText('mostra nel profilo')).toBeNull()
await user.click(within(bagno).getByRole('switch', { name: 'mostra nel profilo' }))
```

Sostituisci il test `in scheda compaiono solo i prezzi personalizzati scelti per quel cane` con questo corpo, tenendo `createAccount`, `createDog`, `write`, `user` e `render` come nel file:

```tsx
it('in scheda compaiono solo i servizi con lo switch acceso', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const created = createDog(account.uid, write({
    name: 'Tata',
    contact: { name: 'Roby', phone: '3336666' },
    hiddenServiceIds: ['bagno', 'nodi', 'scomparso'],
    servicePrices: [
      { serviceId: 'nodi', price: 8, durationMin: 25 },
      { serviceId: 'bagno', price: 25 },
      { serviceId: 'stripping', price: 40, durationMin: 90 },
    ],
  }))
  createDog(account.uid, write({ name: 'Nina', contact: { name: 'Lea', phone: '333' } }))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
  expect(await screen.findByRole('heading', { name: 'Prezzi personalizzati' })).toBeInTheDocument()
  const list = screen.getByRole('list', { name: 'Prezzi personalizzati' })
  const items = within(list).getAllByRole('listitem')
  expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(['Bagno', 'Gestione nodi', 'scomparso'])
  expect(within(items[0]).getByText('€ 25')).toBeInTheDocument()
  expect(within(items[0]).getByText('—')).toBeInTheDocument()
  expect(within(items[1]).getByText('€ 8')).toBeInTheDocument()
  expect(within(items[1]).getByText('25 min')).toBeInTheDocument()
  expect(within(items[2]).getByText('—')).toBeInTheDocument()
  expect(screen.queryByRole('listitem', { name: 'Stripping' })).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Indietro' }))
  await user.click(await screen.findByRole('button', { name: 'Apri Nina' }))
  expect(screen.queryByRole('heading', { name: 'Prezzi personalizzati' })).toBeNull()
})
```

In `src/lib/firebaseMap.test.ts`, aggiungi un caso: un documento con `servicePrices: [{ serviceId: 'bagno' }]` e `hiddenServiceIds: ['bagno']` produce `price` e `durationMin` assenti, non 0. Il round-trip `dogToDoc` non scrive `price: 0`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/lib/firebaseMap.test.ts`

Expected: FAIL perché lo switch si chiama ancora «nascondi questo servizio per questo cane» e la scheda esclude gli id in `hiddenServiceIds`.

- [ ] **Step 3: Write minimal implementation**

`DogServicePrice.price` e `durationMin` diventano opzionali.

`profilePrices` elenca `dog.hiddenServiceIds`, ordinati per `service.order`, non filtra via quegli id. Senza `price` il testo è `—`. Senza `durationMin` il testo è `—`.

`shownQuote`: se l’override non ha il numero, la stringa dell’input è `''` così resta il placeholder del listino.

`collectPrices`: campo vuoto non viene riempito col listino. Si salva solo il numero digitato e valido. Entrambi vuoti: si toglie la voce da `servicePrices`. L’id acceso resta in `hiddenServiceIds`.

Etichetta dello switch: `mostra nel profilo`.

`quotedPrice`: `override.price ?? service.price[dog.size]` e lo stesso per la durata.

`dogFromDoc`: se `numberValue` è `null`, il campo non c’è sull’oggetto. Non usare `?? 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/lib/firebaseMap.test.ts src/lib/quote.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/pages/DogPage.tsx src/lib/quote.ts src/lib/firebaseMap.ts src/pages/DogsPage.test.tsx src/lib/firebaseMap.test.ts
git commit -m "fix: in scheda si vedono i servizi con lo switch acceso"
```

### Task 2: Tema sul telefono

**Files:**
- Create: `src/lib/deviceTheme.ts`
- Test: `src/lib/deviceTheme.test.ts`
- Modify: `src/hooks/useSettings.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/LoginPage.tsx`
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `ThemeChoice` da `src/theme/theme.ts`.
- Produces: `readDeviceTheme(): ThemeChoice`, `writeDeviceTheme(theme: ThemeChoice): void`, chiave `groomly.theme`. `useSettings` espone `theme` letto da quella chiave. `choose` scrive solo la chiave.

- [ ] **Step 1: Write the failing test**

`src/lib/deviceTheme.test.ts`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest'
import { readDeviceTheme, writeDeviceTheme } from './deviceTheme'

describe('tema del telefono', () => {
  beforeEach(() => localStorage.clear())

  it('senza chiave vale auto e una scelta resta sulla chiave', () => {
    expect(readDeviceTheme()).toBe('auto')
    writeDeviceTheme('dark')
    expect(localStorage.getItem('groomly.theme')).toBe('dark')
    expect(readDeviceTheme()).toBe('dark')
  })

  it('un valore sconosciuto vale auto', () => {
    localStorage.setItem('groomly.theme', 'blu')
    expect(readDeviceTheme()).toBe('auto')
  })
})
```

In `SettingsPage.test.tsx`, il test che applica il tema al refresh scrive `localStorage.setItem('groomly.theme', 'dark')` e non si fida di `setTheme`. Aggiungi:

```tsx
it('il tema del salone non sostituisce quello del telefono', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  setTheme(account.uid, 'light')
  localStorage.setItem('groomly.theme', 'dark')
  render(<App memory isDev={false} initialPath="/" />)
  expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('groomly.theme')).toBe('dark')
})
```

Il test che cambia tema dal segmento controlla `localStorage.getItem('groomly.theme')` dopo il tocco su Scuro, e `getSettings(uid).theme` resta quello di prima.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/deviceTheme.test.ts src/pages/SettingsPage.test.tsx`

Expected: FAIL, modulo assente e dataset che segue `settings.theme`.

- [ ] **Step 3: Write minimal implementation**

`deviceTheme.ts` legge `light` | `dark` | `auto`, altrimenti `auto`. `writeDeviceTheme` fa `localStorage.setItem('groomly.theme', theme)`.

`useSettings` tiene `theme` nello stato inizializzato con `readDeviceTheme`. `useLayoutEffect` chiama `applyTheme(resolveTheme(theme, prefersDark()))`. Se è `auto`, ascolta `prefers-color-scheme`. `choose` applica, scrive la chiave, aggiorna lo stato. Se `setItem` lancia, ripristina il tema precedente e ritorna `false`. Non chiama `saveSettings` e non cambia `settings.theme`.

Lo stato iniziale di `settings` è `getSettings(uid)` anche con Firebase. L’effetto del listener non chiama `setReady(false)` prima dello snapshot.

`SettingsPage` passa `theme` al segmento, non `settings.theme`. `LoginPage` sceglie il logo con `theme`, non con `settings.theme`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/deviceTheme.test.ts src/pages/SettingsPage.test.tsx src/pages/LoginPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/deviceTheme.ts src/lib/deviceTheme.test.ts src/hooks/useSettings.tsx src/pages/SettingsPage.tsx src/pages/LoginPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: il tema chiaro o scuro resta sul telefono"
```

### Task 3: Loghi affiancati e WhatsApp diretto

**Files:**
- Modify: `src/lib/phone.ts`
- Test: `src/lib/phone.test.ts`
- Modify: `src/pages/DogPage.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `whatsAppLink(phone: string): string`.
- Produces: `whatsAppAppLink(phone: string): string` con le stesse cifre e prefisso `whatsapp://send?phone=`.

- [ ] **Step 1: Write the failing test**

```tsx
expect(whatsAppAppLink('333 123 4567')).toBe('whatsapp://send?phone=393331234567')
expect(whatsAppAppLink('+39 333 1234567')).toBe(whatsAppLink('+39 333 1234567').replace('https://wa.me/', 'whatsapp://send?phone='))
```

Nel test della scheda in lettura, il link WhatsApp ha `href` `https://wa.me/...` quando `Capacitor.isNativePlatform` è falso. Il contenitore dei due link ha `flex-wrap: nowrap`. I link accessibili sono `Chiama` e `WhatsApp` e il loro testo visibile non contiene quelle parole: contengono solo l’svg. `Browser.open` non è chiamato.

Con `vi.mock` di `@capacitor/core` che fa `isNativePlatform: () => true`, il click chiama `window.location.assign` con `whatsapp://send?phone=` e non `Browser.open`. Se `assign` lancia, il toast è `WhatsApp non si apre`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/phone.test.ts src/pages/DogsPage.test.tsx`

Expected: FAIL, `whatsAppAppLink` assente e i bottoni hanno ancora la scritta.

- [ ] **Step 3: Write minimal implementation**

```ts
export function whatsAppAppLink(phone: string): string {
  return whatsAppLink(phone).replace('https://wa.me/', 'whatsapp://send?phone=')
}
```

In scheda, il numero sta su una riga sua. Sotto, `display: flex; flex-wrap: nowrap; gap: 8`. Due link 34×34, raggio 9. Chiama: fondo `var(--pri)`, icona `Phone`, `aria-label` `Chiama`, `href` `tel:`. WhatsApp: fondo `#128C7E`, segno svg della cornetta nel fumetto, `aria-label` `WhatsApp`. Nel browser `href` è `whatsAppLink`. Sul nativo `href` è `whatsAppAppLink`, `preventDefault`, `window.location.assign`. Se assegna lancia, toast `WhatsApp non si apre`. Niente `Browser.open` su questo tap. I contatti in basso restano con la sola icona di chiamata.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/phone.test.ts src/pages/DogsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/phone.ts src/lib/phone.test.ts src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "fix: WhatsApp apre l'app e i due loghi restano affiancati"
```

### Task 4: Barra con Altro e + sollevato

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/components/layout/chrome.test.tsx`
- Test: `src/components/layout/shell.test.tsx`
- Test: `src/pages/HomePage.test.tsx`
- Test: `src/pages/SettingsPage.test.tsx`
- Test: `src/pages/ServicesPage.test.tsx`

**Interfaces:**
- Consumes: route esistenti `/`, `/animali`, `/calendario`, `/listino`, `/impostazioni`.
- Produces: link accessibile `Altro` verso `/impostazioni`. Home non ha più il link `Impostazioni`. Il bottone `Apri azioni` resta.

- [ ] **Step 1: Write the failing test**

In `chrome.test.tsx` aggiungi gli href in ordine e lo stile del +:

```tsx
const links = screen.getAllByRole('link')
expect(links.map((link) => link.textContent)).toEqual(['Home', 'Animali', 'Calendario', 'Listino', 'Altro'])
expect(screen.getByRole('link', { name: 'Altro' })).toHaveAttribute('href', '/impostazioni')
const fab = screen.getByRole('button', { name: 'Apri azioni' })
expect(fab.getAttribute('style')).toContain('transform: translate(-50%, -50%)')
expect(screen.getByRole('navigation').getAttribute('style')).toContain('repeat(5, 1fr)')
```

In `HomePage.test.tsx`, accanto al test della campanella:

```tsx
expect(screen.getByRole('link', { name: 'Avvisi' })).toHaveAttribute('href', '/mensili')
expect(screen.queryByRole('link', { name: 'Impostazioni' })).toBeNull()
```

Nei test che aprono le impostazioni dalla Home (`SettingsPage.test.tsx` `enter`, `ServicesPage.test.tsx` `openServices`) il click diventa `getByRole('link', { name: 'Altro' })`. Il titolo della pagina resta `Impostazioni`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/chrome.test.tsx src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ServicesPage.test.tsx`

Expected: FAIL, la barra ha quattro voci e Home ha ancora Impostazioni.

- [ ] **Step 3: Write minimal implementation**

`BottomNav` ha cinque voci. Griglia `repeat(5, 1fr)`, `alignItems: 'end'`. Il + è `position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%)`. Icona di Altro: `Settings`. `HomePage` toglie il `Link` della rotella e l’import `Settings` se non serve più. La campanella resta.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/chrome.test.tsx src/components/layout/shell.test.tsx src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ServicesPage.test.tsx src/pages/listino.test.tsx`

Expected: PASS. Il test del listino che torna a Impostazioni con Indietro non cambia: quel link si chiama ancora Indietro e punta a `/impostazioni`.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/pages/HomePage.tsx src/components/layout/chrome.test.tsx src/components/layout/shell.test.tsx src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx src/pages/ServicesPage.test.tsx
git commit -m "feat: Altro in barra e il + sollevato al centro"
```

### Task 5: Apertura coi dati già sul telefono

**Files:**
- Modify: `src/lib/authAction.ts`
- Test: `src/lib/authAction.test.ts`
- Modify: `src/hooks/useServices.ts`
- Modify: `src/hooks/useSettings.tsx` (se il Task 2 non ha già tolto `setReady(false)`)

**Interfaces:**
- Consumes: `SessionGate` (`in` | `out` | `pending` | `corrupt`).
- Produces: `openingGate(firebase, reconciled)` restituisce `reconciled` per `in`, `out` e `corrupt`, con Firebase acceso o spento.

- [ ] **Step 1: Write the failing test**

Sostituisci il test in `authAction.test.ts`:

```tsx
it('con Firebase la sessione già nota si apre subito', () => {
  const account = { uid: 'uid-1', email: 'maria@salone.it', salt: 's', passwordHash: 'h', iterations: 1, createdAt: '2026-01-01T00:00:00.000Z' }
  const inside: SessionGate = { kind: 'in', account }
  expect(openingGate(true, inside)).toEqual(inside)
  expect(openingGate(true, out)).toEqual(out)
  expect(openingGate(true, corrupt)).toEqual(corrupt)
  expect(openingGate(false, out)).toEqual(out)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/authAction.test.ts`

Expected: FAIL, `openingGate(true, out)` è ancora `pending`.

- [ ] **Step 3: Write minimal implementation**

```ts
export function openingGate(firebase: boolean, reconciled: SessionGate): SessionGate {
  void firebase
  return reconciled
}
```

`useServices` inizializza con `ensureServiceSeed(uid)` anche se Firebase è acceso. L’effetto del listener non svuota l’array prima della callback.

`useDogs` e `useAppointments` partono già da `listDogs` e `listAppointments`: non aggiungere uno `setState([])` nell’effetto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`

Expected: PASS sull’intera suite.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authAction.ts src/lib/authAction.test.ts src/hooks/useServices.ts src/hooks/useSettings.tsx
git commit -m "fix: Home si apre coi dati già sul telefono"
```
