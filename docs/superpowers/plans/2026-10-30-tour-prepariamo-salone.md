# Tour "Prepariamo il salone" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al primo ingresso (dopo la verifica email) il titolare di una toelettatura nuova segue un tour animato a schermo intero che gli fa compilare i passi di "Completa il profilo"; gli operatori lo accendono/spengono da Utenti.

**Architecture:** Logica pura in `src/lib/tourBenvenuto.ts` (chi vede il tour, quali passi mostrare, da dove riprendere). Stato del tour per salone in `settings/main` (`tourBenvenuto`), interruttore globale in `config/globale` scritto da una nuova callable riservata agli operatori. Una pagina `/benvenuto` a schermo intero ospita il tour; un componente montato nel router decide se portarci l'utente o mostrare l'avviso "tour a metà".

**Tech Stack:** React 18 + TypeScript, react-router, Vitest + Testing Library (happy-dom), Firebase (Auth, Firestore, Functions v2), Capacitor (Android). Animazioni solo CSS.

**Spec:** `docs/superpowers/specs/2026-10-30-tour-prepariamo-salone-design.md`

## Global Constraints

- I passi sono quelli di `passiCompletamento` (`src/lib/completaSalone.ts`), stesso ordine: logo, sede, listino, backup, email, fiscale. Il "fatto" si calcola esattamente come in `SettingsPage.tsx` (~827-835): estrarre quel calcolo in un hook condiviso, non duplicarlo.
- Passo fatto → saltato dal tour, **tranne `listino`, che compare sempre**. `email` non compare mai a chi vede il tour (è sempre già fatto: `entryGate` blocca chi non ha verificato).
- Il tour lo vede solo chi: interruttore acceso **e** account creato dopo `dal` **e** non collaboratore **e** tour non "visto".
- "Visto" = arrivato alla fine oppure "Lo facciamo dopo" sul benvenuto. Non ricompare mai, su nessun dispositivo.
- Spegnere l'interruttore = nessuno vede tour né avviso; la card in Impostazioni resta.
- Accendere aggiorna sempre `dal` a adesso.
- Orari: un orario **per giorno**, mai unico per la settimana; riusare `OrariEditor` (`src/components/piano/OrariEditor.tsx`).
- Prezzi e tempi: i 4 principali del seme (`bagno`, `taglio`, `bagno-taglio`, `stripping`); passo in due schermate (prima `price`, poi `durationMin`, entrambi per taglia `piccola`/`media`/`grande`), salvati sugli stessi id con `saveExisting`; servizi mancanti o disattivati non si mostrano. Avviso tempi (it): *"Anche questi tempi sono di esempio: mettici i tuoi. Il calendario li usa per proporre gli orari liberi."*
- Avviso prezzi (it): *"Questi prezzi li abbiamo messi noi come esempio: sono indicativi, cambiali con i tuoi. Gli extra e il listino completo con le razze li sistemi dopo."*
- Backup sul web: niente collegamento, solo spiegazione "si collega dall'app sul telefono" + "Avanti".
- Testi in `src/i18n/it.ts`, `en.ts`, `es.ts` (stesse chiavi; prefisso `tour`).
- **Aspetto e animazioni:** il riferimento vincolante è il prototipo `docs/superpowers/specs/2026-10-30-tour-prototipo.html` e la tabella "Animazioni" della spec. Ogni riga di quella tabella deve esistere nel tour con quei valori. Animazioni solo CSS, solo `transform`/`opacity`/`stroke-dashoffset`; con `prefers-reduced-motion: reduce` durate ~0 e niente ripetizioni (la festa resta, ferma).
- Niente Tailwind/shadcn/librerie di animazione: stili inline come il resto dell'app, token di `src/theme/tokens.css` (chiaro e scuro), `SIZES`/`TYPE`, componenti di `src/components/ui`, icone lucide. Niente emoji come illustrazioni (unica: ✨ nel titolo di benvenuto).
- Toni dei passi: logo `--pri`/`--pri-s`, sede `--tea`/`--tea-s`, prezzi `--s-combo`/`--s-combo-bg`, backup `--s-bagno`/`--s-bagno-bg`, fiscale `--sen`/`--sen-s`.
- Copy fissato dalla spec (it): benvenuto "Ciao {{nome}}! Prepariamo il salone insieme ✨" (senza nome: "Ciao! Prepariamo il salone insieme ✨"), sottotitolo "6 piccole cose e Groomly lavora al massimo per te. Ci vogliono un paio di minuti, e quello che vuoi lo salti.", pulsanti "Iniziamo" / "Lo facciamo dopo", testata "Prepariamo il salone · {{n}} di {{m}}", "Fatto, avanti", "Salta", fine "Il salone è quasi pronto!" / "Il salone è pronto!", "Entra in Groomly", avviso "Non hai finito di preparare il salone. Vuoi continuare?" + "Continua".
- Dopo il merge: pubblicare l'APK firmata come da memoria del progetto (`assembleGithubRelease`, chiave Groomly).

## Review Focus

- Tour aperto mentre `settings`/`services` non sono ancora caricati dal cloud: il tour non deve decidere "passo fatto/non fatto" né redirigere prima che `ready` sia vero (altrimenti salta passi o mostra l'avviso a vuoto). → test in Task 6.
- Collaboratore o account di un salone condiviso (`isOperator`) con interruttore acceso: non deve mai vedere tour né avviso. → test in Task 1 e Task 6.
- Utente che chiude il tour a metà e lo riapre su un altro telefono: deve vedere l'avviso, non il tour automatico, e i passi saltati non tornano. → test in Task 1 (`passiDelTour` con `saltati`) e Task 6.
- Salvataggio fallito in un passo (offline): niente festa, niente avanzamento, messaggio `frasi.authSalvataggio`. → test in Task 5.
- Account esistente creato prima di `dal` (o `creationTime` assente/illeggibile): niente tour. → test in Task 1.

---

### Task 1: Logica pura del tour

**Files:**
- Create: `src/lib/tourBenvenuto.ts`
- Test: `src/lib/tourBenvenuto.test.ts`

**Interfaces:**
- Consumes: `PassoSalone` da `src/lib/completaSalone.ts`.
- Produces:
  - `type ConfigTour = { acceso: boolean; dal: string | null }`
  - `type TourSalone = { stato: 'in-corso' | 'visto'; saltati: PassoSalone[] }`
  - `leggiConfigTour(config: Record<string, unknown> | null): ConfigTour` — legge `config.tourBenvenuto`; qualsiasi forma non valida → `{ acceso: false, dal: null }`.
  - `leggiTourSalone(raw: unknown): TourSalone | undefined` — solo `stato` valido; `saltati` filtrato a `PassoSalone` noti, senza doppioni.
  - `deveVedereTour(input: { config: ConfigTour; creazioneAccount: string | null; collaboratore: boolean; operatore: boolean; tour: TourSalone | undefined }): 'tour' | 'avviso' | 'niente'` — `'tour'` se mai iniziato, `'avviso'` se `stato === 'in-corso'`, `'niente'` altrimenti.
  - `passiDelTour(passi: readonly { id: PassoSalone; fatto: boolean }[], saltati: readonly PassoSalone[]): PassoSalone[]` — ordine di `passi`; toglie i saltati e i fatti, tranne `listino` che resta anche se fatto (ma un `listino` saltato non torna alla ripresa).

- [ ] **Step 1: Write the failing tests**

```ts
const acceso = { acceso: true, dal: '2026-10-30T10:00:00.000Z' }
const base = { config: acceso, creazioneAccount: '2026-10-30T11:00:00.000Z', collaboratore: false, operatore: false, tour: undefined }

it('nuovo iscritto dopo l’accensione vede il tour', () => expect(deveVedereTour(base)).toBe('tour'))
it('interruttore spento: niente, anche a metà', () => {
  expect(deveVedereTour({ ...base, config: { acceso: false, dal: acceso.dal } })).toBe('niente')
  expect(deveVedereTour({ ...base, config: { acceso: false, dal: acceso.dal }, tour: { stato: 'in-corso', saltati: [] } })).toBe('niente')
})
it('account creato prima di dal, o senza data: niente', () => {
  expect(deveVedereTour({ ...base, creazioneAccount: '2026-10-30T09:59:59.000Z' })).toBe('niente')
  expect(deveVedereTour({ ...base, creazioneAccount: null })).toBe('niente')
  expect(deveVedereTour({ ...base, creazioneAccount: 'boh' })).toBe('niente')
})
it('collaboratore e operatore: niente', () => {
  expect(deveVedereTour({ ...base, collaboratore: true })).toBe('niente')
  expect(deveVedereTour({ ...base, operatore: true })).toBe('niente')
})
it('a metà → avviso; visto → niente', () => {
  expect(deveVedereTour({ ...base, tour: { stato: 'in-corso', saltati: ['logo'] } })).toBe('avviso')
  expect(deveVedereTour({ ...base, tour: { stato: 'visto', saltati: [] } })).toBe('niente')
})
it('passiDelTour: listino sempre, fatti e saltati fuori, email mai se fatta', () => {
  const passi = [
    { id: 'logo', fatto: false }, { id: 'sede', fatto: true }, { id: 'listino', fatto: true },
    { id: 'backup', fatto: false }, { id: 'email', fatto: true }, { id: 'fiscale', fatto: false },
  ] as const
  expect(passiDelTour(passi, [])).toEqual(['logo', 'listino', 'backup', 'fiscale'])
  expect(passiDelTour(passi, ['logo', 'listino'])).toEqual(['backup', 'fiscale'])
})
it('leggiConfigTour e leggiTourSalone scartano forme sbagliate', () => {
  expect(leggiConfigTour(null)).toEqual({ acceso: false, dal: null })
  expect(leggiConfigTour({ tourBenvenuto: { acceso: 'si' } })).toEqual({ acceso: false, dal: null })
  expect(leggiConfigTour({ tourBenvenuto: { acceso: true, dal: acceso.dal } })).toEqual(acceso)
  expect(leggiTourSalone({ stato: 'boh' })).toBeUndefined()
  expect(leggiTourSalone({ stato: 'in-corso', saltati: ['logo', 'logo', 'x'] })).toEqual({ stato: 'in-corso', saltati: ['logo'] })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/tourBenvenuto.test.ts` → FAIL (modulo mancante).
- [ ] **Step 3:** Implementa le funzioni sopra in `src/lib/tourBenvenuto.ts`. Confronto date con `Date.parse`; `NaN` → `'niente'`.
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5:** `git add src/lib/tourBenvenuto.* && git commit -m "feat: regole del tour di benvenuto"`

### Task 2: Stato del tour sul salone e passi condivisi

**Files:**
- Modify: `src/data/local/settings.ts:120-156` (campo) e `mergeSettings` (~195-240)
- Create: `src/hooks/usePassiSalone.ts`
- Modify: `src/pages/SettingsPage.tsx:827-836` (usa l'hook)
- Test: `src/data/local/settings.test.ts` (aggiungi), `src/pages/SettingsPage.test.tsx` (deve restare verde)

**Interfaces:**
- Consumes: `TourSalone`, `leggiTourSalone` (Task 1).
- Produces:
  - `SettingsMain.tourBenvenuto?: TourSalone`
  - `usePassiSalone(): { passi: { id: PassoSalone; fatto: boolean }[]; pronto: boolean; driveEmail: string | null }` — stessa logica di oggi in SettingsPage (logo, indirizzo, `orariCompilati`, servizi attivi, `backupImpostato || driveEmail`, `session.emailVerified`, `!fiscalNoticeVisible`); `pronto` = settings `ready` e servizi caricati. La lettura `DriveAuth.leggi` (SettingsPage ~300-317) si sposta qui.

- [ ] **Step 1: Write the failing test** in `settings.test.ts`: `getSettings` dopo aver scritto `{ tourBenvenuto: { stato: 'in-corso', saltati: ['logo', 'zzz'] } }` restituisce `{ stato: 'in-corso', saltati: ['logo'] }`; con `{ tourBenvenuto: 7 }` il campo è assente.
- [ ] **Step 2:** `npx vitest run src/data/local/settings.test.ts` → FAIL.
- [ ] **Step 3:** In `mergeSettings` aggiungi `tourBenvenuto` letto con `leggiTourSalone` (assente se `undefined`, come `avvisiInviati`). Crea `usePassiSalone` spostando il calcolo e la lettura Drive da SettingsPage; SettingsPage usa l'hook (e il suo `driveEmail` per il resto della pagina dove serve, mantenendo `setDriveEmail` locale per collega/scollega — l'hook espone anche `aggiornaDrive(email: string | null): void`).
- [ ] **Step 4:** `npx vitest run src/data/local/settings.test.ts src/pages/SettingsPage.test.tsx` → PASS.
- [ ] **Step 5:** commit `feat: stato del tour sul salone e passi condivisi`.

### Task 3: Interruttore globale (server + client)

**Files:**
- Create: `functions/src/config/impostaTour.ts`, `functions/src/config/impostaTour.test.ts`
- Modify: `functions/src/index.ts` (export `impostaTourBenvenuto`, accanto a `impostaFunzione` ~892)
- Modify: `src/data/firebase/client.ts` (accanto a `callImpostaFunzione` ~474)
- Modify: `src/hooks/usePiano.tsx` (espone `tour`)

**Interfaces:**
- Produces:
  - `configTourDopo(acceso: boolean, adesso: Date, attuale: unknown): { acceso: boolean; dal: string | null }` — acceso → `dal = adesso.toISOString()`; spento → conserva il `dal` attuale se stringa, altrimenti `null`.
  - `impostaTourPer(input: { operatorEmail: string; emailVerified?: boolean; admin?: boolean; acceso: boolean }): Promise<{ ok: true }>` — `operatoreAutorizzato` come `impostaFunzionePer`, poi `db.doc('config/globale').set({ tourBenvenuto: configTourDopo(...) }, { merge: true })` in transazione.
  - callable `impostaTourBenvenuto` (`onCall(pianoCall, ...)`, dati `{ acceso: boolean }`, `...tokenOperatore(request.auth)`).
  - client: `callImpostaTour(acceso: boolean): Promise<void>`; `creazioneAccount(): Promise<string | null>` (da `auth().currentUser?.metadata.creationTime`, convertito in ISO; `null` se assente).
  - `PianoValore.tour: ConfigTour` (da `leggiConfigTour(config)`; `spento.tour = { acceso: false, dal: null }`).

- [ ] **Step 1: Write the failing tests** (`impostaTour.test.ts`): `impostaTourPer` con Laura non verificata → rejects `'Accesso negato'`; `configTourDopo(true, new Date('2026-10-30T10:00:00Z'), { dal: 'vecchio' })` → `{ acceso: true, dal: '2026-10-30T10:00:00.000Z' }`; `configTourDopo(false, …, { dal: 'x' })` → `{ acceso: false, dal: 'x' }`; `configTourDopo(false, …, null)` → `{ acceso: false, dal: null }`.
- [ ] **Step 2:** `npx vitest run functions/src/config/impostaTour.test.ts` → FAIL.
- [ ] **Step 3:** Implementa server, export, wrapper client, campo `tour` in `usePiano`.
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit` e `npm --prefix functions run build` → nessun errore.
- [ ] **Step 5:** commit `feat: interruttore globale del tour di benvenuto`.

### Task 4: Sezione "Impostazioni utenti" in Utenti

**Files:**
- Modify: `src/pages/UsersPage.tsx` (nuova sezione in cima al contenuto, ~606)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/UsersPage.test.tsx` (crea se assente, sul modello di `SettingsPage.test.tsx`)

**Interfaces:**
- Consumes: `usePiano().tour`, `callImpostaTour` (Task 3).
- Produces: chiavi `uteImpostazioniUtenti` ("Impostazioni utenti"), `uteTourTitolo` ("Tour di benvenuto per i nuovi iscritti"), `uteTourAiuto` ("Acceso: lo vede chi si registra da adesso. Spento: non lo vede nessuno.").

- [ ] **Step 1: Write the failing test:** da operatore, la pagina mostra uno `switch` con nome `uteTourTitolo`, `aria-checked` uguale a `tour.acceso`; il clic chiama `callImpostaTour(true)` (mock di `../data/firebase/client`); su errore torna allo stato precedente e mostra `frasi.authSalvataggio`.
- [ ] **Step 2:** `npx vitest run src/pages/UsersPage.test.tsx` → FAIL.
- [ ] **Step 3:** `SectionTitle` + `Card` con riga interruttore, stesso componente switch già usato in UsersPage per le funzioni (~919); stato ottimistico mentre la callable è in volo.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: interruttore del tour in Utenti`.

### Task 5a: Mattoni visivi e animazioni del tour

**Files:**
- Create: `src/components/tour/tour.css` — tutte le keyframes e classi della tabella "Animazioni" della spec, prese dal prototipo e rinominate col prefisso `tour-` (es. `.tour-entra`, `.tour-esce`, `.tour-cascata` con `--i`, `.tour-riquadro`, `.tour-alone`, `.tour-bolla`, `.tour-barra`, `.tour-btn` con riflesso/onda/pressione, `.tour-pronto`, `.tour-flash`, `.tour-avviso-prezzi`, `.tour-festa`, `.tour-coriandolo` con `--dx --dy --r`, `.tour-anello`, `.tour-riga`, `.tour-toast`), più il blocco `@media (prefers-reduced-motion: reduce)` del prototipo.
- Create: `src/components/tour/Mascotte.tsx` — `Mascotte({ size }: { size: number })`: SVG inline del badge di `src/assets/brand/groomly-logo-animato.svg` (cagnolino, schiuma, bollicine), con le sue animazioni ricopiate in `tour.css` (prefisso `tour-m-`); `aria-hidden`.
- Create: `src/components/tour/TourScena.tsx` — i pezzi riusabili:
  - `TourTestata({ n, m }: { n: number; m: number })`: "Prepariamo il salone · n di m" + barra che si riempie da `(n-1)/m` a `n/m`.
  - `TourIllustrazione({ tono, icona, compatta }: { tono: 'logo' | 'sede' | 'listino' | 'backup' | 'fiscale'; icona: LucideIcon; compatta?: boolean })`: riquadro 96px (56px se `compatta`) con alone e bolle.
  - `TourPulsante(props: ButtonHTMLAttributes<HTMLButtonElement> & { pronto?: boolean })`: `Button` primario lg con riflesso, onda dal punto toccato, pressione, freccia; quando `pronto` passa da false a true parte `.tour-pronto` una volta.
  - `TourFesta({ titolo, onFine }: { titolo: string; onFine: () => void })`: velo, cerchio con spunta disegnata, 26 coriandoli (colori `--s-bagno --s-taglio --s-combo --s-nodi --s-derma --pri-solid`, angoli e distanze casuali 70–160px), testi; chiama `onFine` dopo 1100 ms.
  - `TourAnello({ fatti, tutti }: { fatti: number; tutti: number })`: anello SVG con `stroke-dashoffset` animato e numero che conta (easing cubico, 1400 ms).
- Modify: `src/pages/DevKitPage.tsx` — una sezione "Tour" che mostra i mattoni (serve a provarli a occhio).
- Test: `src/components/tour/TourScena.test.tsx`

**Interfaces:**
- Produces: i componenti sopra, usati da Task 5 e Task 6 (`Mascotte`, `TourPulsante`, classe `.tour-toast`).

- [ ] **Step 1: Write the failing tests:** `TourTestata n=2 m=5` mostra "Prepariamo il salone · 2 di 5"; `TourFesta` chiama `onFine` dopo 1100 ms (fake timers) e mostra 26 elementi `.tour-coriandolo`; `TourAnello fatti=4 tutti=6` alla fine mostra "4"; `TourPulsante` riceve `.tour-pronto` solo al passaggio `pronto` false → true; `tour.css` contiene `prefers-reduced-motion` (lettura del file come in `src/pages/schedaEnter.test.ts`).
- [ ] **Step 2:** `npx vitest run src/components/tour/TourScena.test.tsx` → FAIL.
- [ ] **Step 3:** Implementa i componenti e `tour.css` copiando valori e curve dal prototipo.
- [ ] **Step 4:** → PASS. Poi apri `/dev/kit` (skill `run`) e confronta a occhio con il prototipo, in chiaro e in scuro.
- [ ] **Step 5:** commit `feat: mattoni visivi e animazioni del tour`.

### Task 5: Pagina del tour `/benvenuto`

**Files:**
- Create: `src/pages/TourPage.tsx` (guscio: benvenuto → passi → festa → fine; scrive `tourBenvenuto`; cambio schermata con `.tour-esce`/`.tour-entra`, pezzi con `.tour-cascata`)
- Create: `src/components/tour/TourPassi.tsx` (i 5 passi: `PassoLogo`, `PassoSede`, `PassoPrezzi`, `PassoBackup`, `PassoFiscale`, costruiti con i mattoni di Task 5a)
- Create: `src/hooks/useCollegaDrive.ts` (estratto da `SettingsPage.collegaDrive` ~656-689, incluso il caso `proposto` → conferma; SettingsPage lo usa)
- Modify: `src/app/router.tsx` (rotta `{ path: '/benvenuto', element: <Guard><StaffSettings><TourPage /></StaffSettings></Guard> }`)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` (copy delle Global Constraints + titoli passi: "Il tuo logo", "Dove sei e quando ti trovano aperto?", "Ora i tuoi prezzi", "Mettiamo al sicuro i tuoi dati", "Dati fiscali"; festa "{{passo}}: fatto!" + "Un altro pezzo del salone è pronto."; orari "Pause pranzo e giorni speciali li sistemi dopo."; backup web "Il backup si collega dall'app sul telefono.")
- Test: `src/pages/TourPage.test.tsx`

**Interfaces:**
- Consumes: `usePassiSalone` (Task 2), `passiDelTour`, `TourSalone` (Task 1), `useSettings().save`, `useServices(uid).saveExisting`, `OrariEditor`, `prepareLogo` (`src/lib/dogPhoto.ts`), `useCollegaDrive`.
- Produces: `TourPage` (nessuna prop). Comportamento:
  - All'apertura scrive `tourBenvenuto = { stato: 'in-corso', saltati: attuali ?? [] }` se non già presente.
  - "Lo facciamo dopo" → `{ stato: 'visto', saltati }` e `navigate('/', { replace: true })`.
  - I passi da mostrare si fissano **una volta** all'uscita dal benvenuto con `passiDelTour` (così un passo appena salvato non sparisce dal contatore "n di m").
  - "Salta" → aggiunge a `saltati`, avanza senza festa.
  - "Fatto, avanti" → salva; se il salvataggio riesce: festa ~1000 ms poi avanti; se fallisce: `toast.show(frasi.authSalvataggio)`, resta sul passo.
  - Fine: anello `avanzamentoSalone(passi)` sui 6 passi veri, elenco ✓/○ con `hubPasso*`, "Entra in Groomly" → `{ stato: 'visto' }` + `navigate('/')`. Lo stato `'visto'` si scrive appena si arriva alla fine.
  - Passi: Logo = input file → `prepareLogo` → `priceSheet.intestazione.logo`. Sede = campo indirizzo con suggerimenti di Google (il componente del piano `2026-10-30-indirizzo-google.md`, da eseguire prima di questo; salva `business.address` e `business.placeId`) + `OrariEditor mostra orari onChange`; abilita "Fatto, avanti" solo con indirizzo non vuoto e almeno un giorno aperto. Prezzi e tempi = due schermate con indicatore a due tappe (`.tour-tappe`, aggiungere la classe in `tour.css` come `.seg` del prototipo): prima per ciascuno dei 4 id presenti e attivi tre campi prezzo (interi ≥ 0) + avviso prezzi, "Avanti: i tempi →" salva con `saveExisting(id, { price })` e passa alla seconda; seconda con tre campi minuti (interi da 5 a 600) + avviso tempi, "Fatto, avanti" salva con `saveExisting(id, { durationMin })` e fa partire la festa ("Prezzi e tempi"). "Salta" su una delle due schermate aggiunge `'listino'` a `saltati` e va al passo dopo. Backup = `Capacitor.isNativePlatform()` ? pulsante collega (`useCollegaDrive`, poi `conBackupImpostato(current, true)`) : testo web + "Avanti" che conta come salto. Fiscale = partita IVA o codice fiscale, valida con le stesse funzioni della scheda toelettatura (`src/lib/profile.ts`); basta uno.

- [ ] **Step 1: Write the failing tests** (`TourPage.test.tsx`, `App memory initialPath="/benvenuto"`, account locale nuovo con servizi seminati):
  - benvenuto mostra "Ciao {{nome}}! Prepariamo il salone insieme ✨" col nome salone; "Lo facciamo dopo" → `getSettings(uid).tourBenvenuto` = `{ stato: 'visto', saltati: [] }` e si torna a `/`.
  - "Iniziamo" con salone senza logo/indirizzo/fiscale: testata "Prepariamo il salone · 1 di 5"; il passo Prezzi c'è anche se i servizi sono attivi; il passo email non c'è.
  - Salta sul logo → `saltati` contiene `'logo'`, nessun testo di festa.
  - Prezzi e tempi: cambio `bagno` piccola in 27 → "Avanti: i tempi" → `price.piccola === 27`, nessuna festa, compare "E quanto ci metti?"; cambio `bagno` grande in 70 minuti → "Fatto, avanti" → `durationMin.grande === 70`, compare la festa, poi il passo successivo (usa `vi.useFakeTimers` per i 1100 ms).
  - Prezzi e tempi: "Salta" sulla schermata dei tempi → `saltati` contiene `'listino'`, i prezzi già cambiati restano salvati.
  - Orari: due giorni con orari diversi (lun 09:00-19:00, sab 09:00-13:00) → salvati in `settings.orari` come fasce distinte.
  - Salvataggio che fallisce (`save` restituisce false) → niente festa, resta sul passo.
  - Fine: "Entra in Groomly" → `stato: 'visto'`.
- [ ] **Step 2:** `npx vitest run src/pages/TourPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementa `useCollegaDrive` (e fai usare a SettingsPage), `TourPassi`, `TourPage`, rotta, testi it/en/es. Disposizione di ogni schermata come nel prototipo `docs/superpowers/specs/2026-10-30-tour-prototipo.html` (benvenuto con `Mascotte` 170px e scintille; sede e prezzi con `TourIllustrazione compatta` accanto al titolo; prezzi con card PICCOLA/MEDIA/GRANDE e caselle `.tour-flash`; avviso prezzi `.tour-avviso-prezzi`; "Fatto, avanti" con `TourPulsante pronto` legato alla validità del passo; fine con `TourAnello` e righe `.tour-riga`).
- [ ] **Step 4:** `npx vitest run src/pages/TourPage.test.tsx src/pages/SettingsPage.test.tsx` → PASS.
- [ ] **Step 5:** commit `feat: pagina del tour Prepariamo il salone`.

### Task 6: Avvio automatico e avviso "tour a metà"

**Files:**
- Create: `src/app/TourAvvio.tsx`
- Modify: `src/app/router.tsx` (montato in `SheetLayer` accanto a `PushHost`, solo con `gate.kind === 'in' && entry.kind === 'home'`)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` (`tourAvviso`, `tourContinua`, `tourChiudiAvviso` per l'aria-label della X)
- Test: `src/app/TourAvvio.test.tsx`

**Interfaces:**
- Consumes: `deveVedereTour`, `leggiTourSalone` (Task 1), `usePiano().tour`, `creazioneAccount()` (Task 3), `useSettings()` (`ready`), `useSession()` (ruolo collaboratore, `isOperator(email)`).
- Produces: `TourAvvio` (nessuna prop) — aspetta `ready` e la risposta di `creazioneAccount()`; poi:
  - `'tour'` e pagina corrente ≠ `/benvenuto` → `navigate('/benvenuto', { replace: true })`, una volta sola per apertura.
  - `'avviso'` → card fluttuante in alto `.tour-toast` (scende con rimbalzo; `Mascotte` 40px, testo in due righe, barra d'avanzamento sottile in fondo), non bloccante, con `frasi.tourAvviso`, pulsante "Continua" → `/benvenuto`, X → nasconde. La X vale per l'apertura dell'app: flag a livello di modulo (`let avvisoChiuso = false`), così si azzera solo a riavvio completo. Non mostrato su `/benvenuto`.
  - `'niente'` → nulla.
  - Ripresa: se `/benvenuto` si apre con `tourBenvenuto.stato === 'in-corso'` già scritto, `TourPage` salta il benvenuto e riparte dal primo passo di `passiDelTour(passi, saltati)`. Questo caso si aggiunge a `TourPage` in questo task, con il suo test.

- [ ] **Step 1: Write the failing tests** (mock `usePiano` tour acceso, mock `creazioneAccount`):
  - account nuovo senza `tourBenvenuto` all'apertura di `/` → finisce su `/benvenuto`.
  - con `ready` falso nessun redirect; diventa vero → redirect.
  - `tourBenvenuto: { stato: 'in-corso', saltati: ['logo'] }` → resta su `/`, mostra `tourAvviso`; "Continua" → `/benvenuto` e il primo passo non è il logo.
  - X → avviso sparisce; rimontando `TourAvvio` nella stessa esecuzione resta nascosto.
  - collaboratore, operatore, interruttore spento, `creazioneAccount` prima di `dal` → né redirect né avviso.
- [ ] **Step 2:** `npx vitest run src/app/TourAvvio.test.tsx` → FAIL.
- [ ] **Step 3:** Implementa `TourAvvio` e montalo nel router; aggiungi in `TourPage` il caso ripresa.
- [ ] **Step 4:** `npx vitest run src/app/TourAvvio.test.tsx src/pages/TourPage.test.tsx` → PASS.
- [ ] **Step 5:** commit `feat: avvio del tour e avviso tour a metà`.

### Task 7: Verifica finale e rilascio

- [ ] **Step 1:** `npm test` → tutto verde; `npm run build` → nessun errore; `npm --prefix functions run build` → nessun errore.
- [ ] **Step 2:** Prova a mano nell'app (skill `run`): accendi l'interruttore da Utenti, registra un account nuovo, verifica email, segui il tour saltando un passo, chiudi a metà e riapri (avviso), finisci (anello in Impostazioni = passi fatti). Con tema scuro e con "riduci animazioni".
- [ ] **Step 3:** Chiedi a Roberto prima del deploy della callable (`firebase deploy --only functions:impostaTourBenvenuto`): è un'azione verso l'esterno.
- [ ] **Step 4:** Pubblica l'APK firmata come da memoria del progetto (versione successiva alla 1.1.133, `assembleGithubRelease` con chiave Groomly).
