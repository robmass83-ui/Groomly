# Impostazioni chiare — piano

Eseguito — vedi registro.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere chiare le voci di Impostazioni: nomi fissi sulla scheda, solo i tag dei cani, un archivio dedicato, una pagina Notifiche, lo storico delle release e l’avviso di aggiornamento subito.

**Architecture:** Impostazioni resta l’elenco e apre tre pagine (`/impostazioni/archivio`, `/impostazioni/notifiche`, `/impostazioni/aggiornamenti`) più il foglio dei tag. I dati salvati non cambiano forma. La scheda ignora `fieldLabels`. La visita ignora `toolSuggestions` e `productSuggestions`. Lo storico e il controllo aggiornamento leggono GitHub; le push restano fuori.

**Tech Stack:** React 18, React Router 6, TypeScript, Vitest, happy-dom, Capacitor Local Notifications e App, Firebase solo come sync già esistente.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-21-impostazioni-chiare-design.md`. I testi fra virgolette in questa specifica si copiano così come sono.
- Non cambiare la forma di `SettingsMain`, backup, Firestore o sync. Non migrare `fieldLabels`, `toolSuggestions`, `productSuggestions`.
- Non aggiungere una riga Push né un testo «prossimamente».
- Non aggiungere una freccia Indietro sulla scheda cane.
- La linguetta Archivio di `/animali` e `/animali?tab=archivio` restano.
- `NavLink` di Impostazioni non riceve `end`. Le pagine nuove non sono fogli: `isSheetPath` non le include.
- Nessun colore esadecimale nuovo. Controlli nuovi alti almeno 44 px. Niente ellipsis sul testo.
- Il promemoria mensile resta `{ enabled, time, daysBefore }`. L’interruttore comanda solo la notifica telefono. Home usa ancora `daysBefore` a interruttore spento.
- A processo chiuso non si controlla l’aggiornamento e non si manda una push.
- Non alzare `APP_VERSION` e non pubblicare l’APK in questi task. Il publish sta dopo, quando tutto il piano è verde.
- I test del task devono passare prima del commit di quel task. `npm test` è `vitest run`. Per un file: `npx vitest run src/path/file.test.tsx`.

---

### Task 1: Nomi fissi e via «Campi scheda»

**Files:**
- Modify: `src/pages/DogPage.tsx` (circa riga 1207 e 1349, `labels`)
- Modify: `src/pages/SettingsPage.tsx` (riga Campi scheda, dialog, `FIELD_EDITOR`, `saveLabels`, `labelDraft`)
- Test: `src/pages/DogsPage.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `ProfileFacts` in `DogPage.tsx`
- Produces: la scheda stampa sempre Specie, Razza, Sesso, Peso, Taglia, Cliente, Durata media. Impostazioni non ha «Campi scheda».

- [ ] **Step 1: Write the failing test**

In `src/pages/DogsPage.test.tsx`, nel test che già cerca `within(facts).getByText('Specie')`, prima del render salva un override:

```ts
const settings = getSettings(account.uid)
writeJson(storageKeys.settings(account.uid), {
  ...settings,
  fieldLabels: { ...settings.fieldLabels, species: 'Tipo' },
})
```

L’asserzione resta `within(facts).getByText('Specie')` e aggiungi `expect(within(facts).queryByText('Tipo')).not.toBeInTheDocument()`.

In `src/pages/SettingsPage.test.tsx` sostituisci il pezzo che apre «Campi scheda», scrive «Tipo» e si aspetta `fieldLabels.species === 'Tipo'`. Il test deve fare:

```ts
expect(screen.queryByRole('button', { name: /Campi scheda/ })).not.toBeInTheDocument()
expect(screen.queryByRole('dialog', { name: 'Campi scheda' })).not.toBeInTheDocument()
```

Togli l’import di `APP_NOTES` solo se questo task elimina anche le note sotto la versione. Non farlo qui: le note escono nel Task 5. Lascia `APP_NOTES` finché il Task 5 non le toglie.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL perché la scheda mostra «Tipo» e Impostazioni ha ancora «Campi scheda».

- [ ] **Step 3: Write minimal implementation**

In `DogPage.tsx` sostituisci `const labels = settings.fieldLabels` con un oggetto locale costante:

```ts
const labels = {
  species: 'Specie',
  breed: 'Razza',
  sex: 'Sesso',
  age: 'Età',
  weight: 'Peso',
  size: 'Taglia',
  clientType: 'Cliente',
  avgDuration: 'Durata media',
}
```

Non aggiungere una riga Età in `ProfileFacts`. Non chiamare `setFieldLabel`.

In `SettingsPage.tsx` togli il bottone «Campi scheda», il `Dialog` «Campi scheda», `FIELD_EDITOR`, `labelDraft`, `labelsOpen`, `saveLabels`. Non toccare ancora tag, archivio, promemoria, versione.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/DogPage.tsx src/pages/SettingsPage.tsx src/pages/DogsPage.test.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: la scheda usa i nomi fissi e Campi scheda esce dalle impostazioni"
```

---

### Task 2: Solo i tag dei cani

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (foglio tag, riga menu)
- Modify: `src/pages/AppointmentPage.tsx` (circa 658-663, `toolChoices` e `productChoices`)
- Test: `src/pages/SettingsPage.test.tsx`, un test visita esistente che copre i suggerimenti strumenti, oppure `src/pages/AppointmentPage.test.tsx` se lì si aprono Strumenti

**Interfaces:**
- Consumes: `tagSuggestions` già salvati da `addSuggestion`
- Produces: il foglio si intitola «Tag dei cani» e ha una sola lista. `toolChoices` non legge `settings.toolSuggestions`. `productChoices` non legge `settings.productSuggestions`.

- [ ] **Step 1: Write the failing test**

Nel test impostazioni che aggiunge tag, strumento e prodotto, sostituisci le attese. Dopo il click sulla riga:

```ts
expect(screen.getByRole('button', { name: /Tag dei cani/ })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: /Tag caratteristiche/ })).not.toBeInTheDocument()
```

Apri il foglio. Il titolo del dialog è «Tag dei cani». Dentro c’è per intero: «Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.» C’è la casella «Tag». Non ci sono etichette «Strumenti» né «Prodotti». Aggiungere «ipoallergenico» salva `tagSuggestions`. Non scrivere `toolSuggestions` né `productSuggestions` da questa UI.

La riga, con zero tag, mostra «Nessuno da proporre». Dopo un tag mostra «1 da proporre sulla scheda».

Per la visita, in un test che monta l’appuntamento con settings già salvati:

```ts
writeJson(storageKeys.settings(account.uid), {
  ...getSettings(account.uid),
  toolSuggestions: ['Pettine'],
  productSuggestions: ['Balsamo'],
})
```

Apri la zona Strumenti della visita. «Tosatrice» è tra i suggerimenti. «Pettine» non è l’unico suggerimento. Se il test non ha un appuntamento con strumenti, basta asserire che Tosatrice compare anche con `toolSuggestions: ['Pettine']`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/AppointmentPage.test.tsx`
Expected: FAIL sul titolo «Tag caratteristiche» e sull’assenza di Tosatrice.

- [ ] **Step 3: Write minimal implementation**

Riga menu:

```tsx
<MenuBody
  title="Tag dei cani"
  detail={settings.tagSuggestions.length === 0
    ? 'Nessuno da proporre'
    : settings.tagSuggestions.length === 1
      ? '1 da proporre sulla scheda'
      : `${settings.tagSuggestions.length} da proporre sulla scheda`}
/>
```

Foglio: titolo «Tag dei cani». Paragrafo, colore `var(--tx2)`, `fontSize: TYPE.base`, `lineHeight: 1.5`:

«Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.»

Una sola `SuggestionList` con `label="Tag"` e `addLabel="Aggiungi tag"`. `addSuggestion` e `removeSuggestion` restano solo per `'tagSuggestions'`.

In `AppointmentPage.tsx`:

```ts
const toolChoices = uniqueNames(['Tosatrice', 'Shampoo', 'Profumo', ...appointments.flatMap((item) => item.tools ?? [])])
const productChoices = uniqueNames(appointments.flatMap((item) => item.products ?? []))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/AppointmentPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/AppointmentPage.tsx src/pages/SettingsPage.test.tsx src/pages/AppointmentPage.test.tsx
git commit -m "fix: in impostazioni restano solo i tag dei cani"
```

---

### Task 3: Pagina Archivio

**Files:**
- Create: `src/pages/ArchivePage.tsx`
- Create: `src/pages/ArchivePage.test.tsx`
- Modify: `src/app/router.tsx` (accanto a `/impostazioni/servizi`)
- Modify: `src/pages/SettingsPage.tsx` (il link non è più `/animali?tab=archivio`)
- Test: `src/pages/SettingsPage.test.tsx`, `src/pages/DogsPage.test.tsx` (la linguetta Archivio resta)

**Interfaces:**
- Consumes: `useDogs(uid).restore`, `visibleDogs` e `sortDogs` da `src/lib/dogList.ts`, `ARCHIVE_LABEL`, `dogSubtitle`
- Produces: route `/impostazioni/archivio`. Il link in Impostazioni ha `href="/impostazioni/archivio"`.

- [ ] **Step 1: Write the failing test**

`src/pages/ArchivePage.test.tsx` monta `App` con `initialPath="/impostazioni/archivio"`.

Caso vuoto, account senza cani archiviati:

```ts
expect(await screen.findByRole('heading', { name: 'Archivio' })).toBeInTheDocument()
expect(screen.getByText('Nessuno in archivio')).toBeInTheDocument()
expect(screen.getByText('Nessun animale in archivio')).toBeInTheDocument()
expect(screen.queryByRole('button', { name: /Aggiungi/ })).not.toBeInTheDocument()
expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni')
expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('aria-current', 'page')
```

Caso con un attivo, uno `non_in_cura` e uno `deceduto`: si vedono i due archiviati con «Non più in cura» e «Deceduto». Non si vede il nome del cane attivo. `Ripristina` sul primo toglie quello dalla lista. La heading resta «Archivio».

In `SettingsPage.test.tsx` il link «Archivio animali» ha `href="/impostazioni/archivio"` e il dettaglio «1 in archivio» o «0 in archivio» come oggi. Il test che clicca il link e si aspetta la linguetta «Archivio 1» va spostato: quel click ora apre la pagina Archivio, non Animali. Aggiungi in `DogsPage.test.tsx`, se non c’è già, che `/animali?tab=archivio` ha la linguetta Archivio selezionata. Quel test c’è già: non romperlo.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ArchivePage.test.tsx src/pages/SettingsPage.test.tsx src/pages/DogsPage.test.tsx`
Expected: FAIL perché la route non esiste.

- [ ] **Step 3: Write minimal implementation**

`ArchivePage` usa `ShellFrame`, `Header title="Archivio" backTo="/impostazioni"` e il sottotitolo descritto sopra. Lista con `sortDogs(visibleDogs(dogs, 'archivio', 'tutti', '', appointments, now), 'alfabetico', () => null)`. Riga come `DogRow` di `DogsPage`: nome, `dogSubtitle`, pillola `ARCHIVE_LABEL`, pulsante Ripristina che chiama `restore`. Tap sul nome: `navigate(\`/animali/${dog.id}\`)`. Vuoto: paragrafo «Nessun animale in archivio», senza bottone.

Router:

```tsx
{ path: '/impostazioni/archivio', element: <Guard><ArchivePage /></Guard> },
```

Link impostazioni: `to="/impostazioni/archivio"`. Dettaglio riga resta `` `${archived} in archivio` ``.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ArchivePage.test.tsx src/pages/SettingsPage.test.tsx src/pages/DogsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ArchivePage.tsx src/pages/ArchivePage.test.tsx src/app/router.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: l'archivio in impostazioni mostra solo i cani archiviati"
```

---

### Task 4: Pagina Notifiche

**Files:**
- Create: `src/pages/NotificationsPage.tsx`
- Create: `src/pages/NotificationsPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/SettingsPage.tsx` (togli la sezione Promemoria mensili, aggiungi la riga)
- Test: `src/pages/SettingsPage.test.tsx` (il test «il promemoria si salva…» va aggiornato: il toggle non è più sulla pagina Impostazioni)

**Interfaces:**
- Consumes: `settings.monthlyReminder`, `save` delle impostazioni, `dueSoon` da `src/lib/cycle.ts`, `reminderText` da `src/lib/reminderText.ts`, `useDogs`, `useAppointments`
- Produces: route `/impostazioni/notifiche`. La riga si chiama «Notifiche».

- [ ] **Step 1: Write the failing test**

`NotificationsPage.test.tsx`:

Account, un mensile con visita completata abbastanza indietro da essere in scadenza con 7 giorni (stesso setup del test impostazioni che vede «scadono entro 7 gg» in Home). Path iniziale `/impostazioni/notifiche`.

```ts
expect(await screen.findByRole('heading', { name: 'Notifiche' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Promemoria mensili' })).toBeInTheDocument()
expect(screen.getByText(/Alle 18:30 il telefono avvisa/)).toBeInTheDocument()
expect(screen.getByText(/2 mensili da programmare: Rex, Luna/)).toBeInTheDocument()
expect(screen.getByText(/Adesso direbbe:/)).toBeInTheDocument()
expect(screen.getByText('Il riquadro in Home resta anche con la notifica spenta.')).toBeInTheDocument()
expect(screen.getByText('Vale per la notifica e per il riquadro in Home.')).toBeInTheDocument()
```

Se c’è un solo cane, la riga «Adesso direbbe» usa `reminderText` reale (`1 mensile da programmare: Rex`), e l’esempio fisso «Rex, Luna» sta comunque nella prima frase. Non confondere le due.

Spegnere lo switch «Notifica sul telefono» mette `monthlyReminder.enabled` a false. Tornare in Home lascia la region «Mensili da programmare». Cambiare «Giorni di anticipo» in `3` salva `daysBefore === 3` e Home dice «scadono entro 3 gg».

Senza cani in scadenza la pagina contiene «Adesso non parte nessuna notifica, perché non c’è un mensile in ritardo o in scadenza.»

In Impostazioni la sezione con heading o testo «Promemoria mensili» come blocco della pagina principale non c’è. C’è il link «Notifiche». Con il default acceso il dettaglio è «Promemoria mensile alle 18:30». Dopo lo spegnimento, riaprendo Impostazioni, «Promemoria mensile spento».

Il test vecchio in `SettingsPage.test.tsx` che cercava lo switch direttamente in Impostazioni va riscritto: da Impostazioni si entra in Notifiche e lì si usa lo switch. L’asserzione sul riquadro Home resta.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL perché la route non esiste.

- [ ] **Step 3: Write minimal implementation**

Pagina con `Header title="Notifiche" backTo="/impostazioni"`. Scheda titolo «Promemoria mensili».

Frase. Se `daysBefore === 1`:

`Alle ${time} il telefono avvisa se un cliente mensile è in ritardo o va toelettato entro il giorno successivo.`

Altrimenti:

`Alle ${time} il telefono avvisa se un cliente mensile è in ritardo o va toelettato entro i prossimi ${daysBefore} giorni.`

Poi, nella stessa frase: ` Per esempio: «2 mensili da programmare: Rex, Luna». Se apri la notifica, vai in Mensili.`

Seconda riga da `reminderText(dueSoon(...))` come nella specifica. Poi la frase sul riquadro Home.

`Toggle` `label="Notifica sul telefono"`. Input `label="Orario della notifica"` e `label="Giorni di anticipo"`, stesso salvataggio di `onReminder`, `onTime`, `onDays` oggi in `SettingsPage` (cifre intere, `0` valido, stringa non numerica ignorata).

Permesso: solo se `Capacitor.isNativePlatform()` e `LocalNotifications.checkPermissions()` risolve con `display !== 'granted'`, mostra «Per riceverle, consenti le notifiche a Groomly.» Se `checkPermissions` manca nel mock dei test, trattalo come assente e non mostrare la riga quando la piattaforma non è nativa. I test di questa pagina non sono nativi, quindi la riga non c’è.

Riga in Impostazioni, sezione nuova «Notifiche» oppure dentro Personalizza sotto Archivio. Una sola riga:

```tsx
<MenuBody
  title="Notifiche"
  detail={settings.monthlyReminder.enabled
    ? `Promemoria mensile alle ${settings.monthlyReminder.time}`
    : 'Promemoria mensile spento'}
/>
```

Link `to="/impostazioni/notifiche"`. Togli dalla pagina Impostazioni la `SectionTitle` «Promemoria mensili» e la card con orario e giorni.

Router: `{ path: '/impostazioni/notifiche', element: <Guard><NotificationsPage /></Guard> }`.

`providers.tsx` non si modifica: il promemoria telefono legge già `monthlyReminder`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/NotificationsPage.test.tsx src/pages/SettingsPage.test.tsx src/app/monthlyReminder.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/NotificationsPage.tsx src/pages/NotificationsPage.test.tsx src/app/router.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: il promemoria mensile sta nella pagina Notifiche"
```

---

### Task 5: Storico versioni

**Files:**
- Modify: `src/lib/appRelease.ts`
- Modify: `src/lib/appRelease.test.ts`
- Modify: `src/lib/appVersion.ts` (togli `APP_NOTES`)
- Create: `src/pages/ReleaseHistoryPage.tsx`
- Create: `src/pages/ReleaseHistoryPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/SettingsPage.tsx` e `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `parseVersion`, `notesFromRelease`, `APP_VERSION`, `IT_DATE` da `src/lib` o dal modulo date già usato da `backupDoc.ts`
- Produces:

```ts
export type PublishedRelease = { version: string; publishedAt: Date; notes: string[] }

export function notesFromHistory(value: unknown): string[]

export function publishedReleases(payload: unknown): PublishedRelease[]

export function nextReleasesUrl(link: string | null): string | null
```

`notesFromHistory` è `notesFromRelease` senza il tetto di 6 righe. `notesFromRelease` resta a 6 per il foglio di aggiornamento.

- [ ] **Step 1: Write the failing test**

In `appRelease.test.ts`:

```ts
expect(notesFromHistory('Uno\n- Due\nhttps://esempio.test\nTre\nQuattro\nCinque\nSei\nSette')).toEqual([
  'Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette',
])

expect(publishedReleases([
  { tag_name: 'v1.1.0', draft: true, published_at: '2026-10-02T00:00:00Z', body: 'Bozza' },
  { tag_name: 'v1.1.1', prerelease: true, published_at: '2026-10-03T00:00:00Z', body: 'Anteprima' },
  { tag_name: 'v1.0.0', published_at: '2026-10-01T00:00:00Z', body: 'Prima' },
  { tag_name: 'v1.2.0', published_at: '2026-10-04T00:00:00Z', body: '- Seconda' },
])).toMatchObject([
  { version: '1.2.0', notes: ['Seconda'] },
  { version: '1.0.0', notes: ['Prima'] },
])

expect(nextReleasesUrl('<https://api.github.com/repos/robmass83-ui/Groomly/releases?page=2>; rel="next"')).toBe(
  'https://api.github.com/repos/robmass83-ui/Groomly/releases?page=2',
)
expect(nextReleasesUrl(null)).toBeNull()
```

`ReleaseHistoryPage.test.tsx` monta l’app su `/impostazioni` con fetch che per `releases?per_page=100` risponde un array di due release, una con tag `v${APP_VERSION}` e corpo «Nota installata», una più vecchia con corpo vuoto. Header `Link` con `rel="next"` verso `https://api.github.com/next`. Non importare `APP_NOTES`: è stato rimosso. In Impostazioni non c’è il testo «In Home, Da chiudere compare».

```ts
expect(screen.getByRole('button', { name: `Groomly ${APP_VERSION}, storico aggiornamenti` })).toHaveTextContent(`Groomly ${APP_VERSION}`)
expect(screen.queryByText(/In Home, Da chiudere/)).not.toBeInTheDocument()
```

Poi click e:

```ts
expect(await screen.findByRole('heading', { name: 'Aggiornamenti' })).toBeInTheDocument()
expect(screen.getByText(`Versione installata ${APP_VERSION}`)).toBeInTheDocument()
expect(screen.getByText('Installata')).toBeInTheDocument()
expect(screen.getByText('Nota installata')).toBeInTheDocument()
expect(screen.getByText('Nessuna nota per questa versione.')).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Mostra le precedenti' })).toBeInTheDocument()
```

Un altro test: fetch rifiuta. La pagina mostra «Lo storico non si carica» e «Riprova». Il sottotitolo della versione installata resta. `release.json` non viene usato per riempire l’elenco: il mock di `releases/latest` o di `release.json` non deve diventare una riga dello storico.

Durante il caricamento, prima della risposta, c’è «Caricamento…». Si può asserire con una promise fetch che non resolve subito.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/appRelease.test.ts src/pages/ReleaseHistoryPage.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL perché le funzioni e la pagina non esistono, e `APP_NOTES` è ancora visibile.

- [ ] **Step 3: Write minimal implementation**

Implementa `notesFromHistory`, `publishedReleases`, `nextReleasesUrl` in `appRelease.ts`. `publishedReleases` scarta draft, prerelease, tag illeggibili e `published_at` invalidi. Ordina per data decrescente e, a parità, versione più alta tramite `parseVersion`.

`ReleaseHistoryPage` chiede `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=100` con `cache: 'no-store'` e `Accept: application/vnd.github+json`. Stato loading, errore, lista. Data con `format(publishedAt, 'd MMM yyyy', IT_DATE)`. Pulsante «Mostra le precedenti» se `nextReleasesUrl(response.headers.get('Link'))` non è null; il click fetcha quell’URL e accoda. «Riprova» azzera e richiede la prima pagina.

Togli `APP_NOTES` da `appVersion.ts` e ogni import rimasto. Il pulsante in fondo a Impostazioni:

```tsx
<button
  type="button"
  onClick={() => navigate('/impostazioni/aggiornamenti')}
  aria-label={`Groomly ${APP_VERSION}, storico aggiornamenti`}
  style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--tx3)', font: 'inherit' }}
>
  {`Groomly ${APP_VERSION}`}
</button>
```

Niente elenco di note sotto. Route `/impostazioni/aggiornamenti`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/appRelease.test.ts src/pages/ReleaseHistoryPage.test.tsx src/pages/SettingsPage.test.tsx src/lib/appRelease.test.ts`
Expected: PASS. Cerca anche `APP_NOTES` nel repo `src`: zero import.

- [ ] **Step 5: Commit**

```bash
git add src/lib/appRelease.ts src/lib/appRelease.test.ts src/lib/appVersion.ts src/pages/ReleaseHistoryPage.tsx src/pages/ReleaseHistoryPage.test.tsx src/app/router.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: lo storico aggiornamenti si apre dalla versione"
```

---

### Task 6: Avviso subito e notifica sul telefono

**Files:**
- Modify: `src/lib/appRelease.ts` (`watchLatestRelease`)
- Modify: `src/lib/appRelease.test.ts`
- Modify: `src/app/UpdateNotice.tsx`
- Modify: `src/app/UpdateNotice.test.tsx`
- Modify: `src/pages/SettingsPage.tsx` (togli la sezione App e `onCheckUpdates`)
- Test: `src/pages/SettingsPage.test.tsx` (il test «controlla gli aggiornamenti…» non cerca più quel bottone)

**Interfaces:**
- Consumes: `watchLatestRelease`, `fetchLatestRelease`, `LocalNotifications`, `App` da `@capacitor/app`, `registerUpdatePrompt`
- Produces: un controllo in corso, se ne arriva un altro, al termine ne esegue uno. `App.appStateChange` con `isActive === true` scatena lo stesso controllo di `groomlyResume`. Il foglio si intitola «Vuoi aggiornare adesso?».

- [ ] **Step 1: Write the failing test**

In `appRelease.test.ts`, estendi il watch. Con `fetchRelease` che resta pending alla prima chiamata, un `groomlyResume` durante il pending non chiama fetch una seconda volta in parallelo. Quando la prima resolve, parte una seconda chiamata (la coda). Il test attuale che conta le chiamate dopo resume va aggiornato se il numero cambia per via della coda: le chiamate restano sequenziali, non sovrapposte. Aggiungi il caso esplicito della coda invece di allentare il test vecchio senza motivo. Se il test vecchio assume che un resume durante un check finito aggiunge una chiamata, quello resta vero.

In `UpdateNotice.test.tsx` la dialog si chiama «Vuoi aggiornare adesso?» e contiene «È pronta la versione». I pulsanti restano «Scarica» e «Più tardi». Con `native.value = true` e permesso granted, `LocalNotifications.schedule` è chiamato una volta per quella versione, titolo «Aggiornamento disponibile», corpo «È pronta la versione {version}.», id 2. Un secondo render della stessa versione non programma di nuovo. «Più tardi» chiude il foglio; ridisegnare la stessa release non lo riapre. Cambiare versione lo riapre. Il listener `localNotificationActionPerformed` con id 2 riapre il foglio dopo «Più tardi».

Mock di `@capacitor/app`:

```ts
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}))
```

Nel test, il listener registrato per `appStateChange`, chiamato con `{ isActive: true }`, provoca un nuovo `fetch` del controllo. Si può asserire sul mock di fetch o su `fetchRelease` se il test monta `UpdateNotice` senza la prop `release` e con fetch stub.

In Impostazioni non esiste il bottone «Controlla aggiornamenti». I test che lo cliccano vanno tolti o diventano: la riga non c’è, e il foglio «Vuoi aggiornare adesso?» compare da `UpdateNotice` quando il fetch di `releases/latest` restituisce una versione più nuova. Non deve comparire il toast «Nessun aggiornamento» da un bottone che non c’è.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/appRelease.test.ts src/app/UpdateNotice.test.tsx src/pages/SettingsPage.test.tsx`
Expected: FAIL sul titolo «Aggiornamento disponibile» del foglio e sul bottone «Controlla aggiornamenti».

- [ ] **Step 3: Write minimal implementation**

In `watchLatestRelease` aggiungi `let queued = false`. Se `check` arriva mentre `pending` è true, metti `queued = true` e ritorna. Nel `then` e nel rifiuto, dopo `pending = false`, se `live && queued` allora `queued = false` e richiama `check()`.

In `UpdateNotice.tsx` importa `App` da `@capacitor/app`. In un effect, se `Capacitor.isNativePlatform()`, `App.addListener('appStateChange', (state) => { if (state.isActive) window.dispatchEvent(new Event('groomlyResume')) })` e rimuovi il listener allo smontaggio. Il watch esistente ascolta già `groomlyResume`.

Cambia il titolo del `Dialog` in «Vuoi aggiornare adesso?». Il paragrafo diventa «È pronta la versione {offer.version}.» Le note restano al massimo sei, via `notesFromRelease` già applicato in `releaseFromGithub`.

`announceRelease` usa il corpo «È pronta la versione {version}.» senza la frase sullo scaricare. Chiedi il permesso solo se `checkPermissions` non è già `granted`. Tieni un ref `permissionAsked` così un rifiuto non richiama `requestPermissions` nello stesso processo. Se il permesso non arriva, esci dalla notifica e lascia il foglio.

Togli da `SettingsPage` la sezione «App», `onCheckUpdates`, `checking`, e l’import di `showUpdatePrompt` se non resta usato. Non toccare `registerUpdatePrompt` in `UpdateNotice`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/appRelease.test.ts src/app/UpdateNotice.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS

Poi: `npm test`
Expected: PASS sull’intera suite. Se un test cerca ancora «Campi scheda», «Tag caratteristiche», «Controlla aggiornamenti» o `APP_NOTES`, aggiornalo in questo task solo se è un residuo dei task precedenti, senza cambiare il comportamento appena chiuso.

- [ ] **Step 5: Commit**

```bash
git add src/lib/appRelease.ts src/lib/appRelease.test.ts src/app/UpdateNotice.tsx src/app/UpdateNotice.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "fix: l'aggiornamento avvisa subito dentro l'app e sul telefono"
```

---

## Fuori da questi task

Non implementare Firebase Cloud Messaging, token, né una funzione cloud per l’avviso a app chiusa. È il lavoro successivo descritto in fondo alla specifica.
