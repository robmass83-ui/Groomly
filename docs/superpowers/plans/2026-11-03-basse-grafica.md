# Basse «Grafica» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere la riga «Grafica» delle basse dell'audit: backup onesto, un solo formato di durata, toast senza «·», «← Animali» che non copre, listino vuoto spiegato, e un giro su tutta l'app con contrasto ≥ 4,5:1, zona toccabile ≥ 40 px e nessun testo dell'app tagliato a 320 px.

**Architecture:** Correzioni puntuali con test unitari (Task 1-4), poi uno script Playwright di misura (Task 5) che percorre tutte le rotte e guida le correzioni condivise: colori nelle variabili del tema (Task 6), una classe CSS comune che allarga la zona toccabile (Task 7), tagli a 320 px (Task 8). Lo stesso script, con i casi mirati, è la verifica finale.

**Tech Stack:** React 18 + TypeScript, Vite, vitest + Testing Library, Playwright (`node`), emulatori Firebase `demo-groomly`.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-grafica-design.md`

## Global Constraints

- Lingua di codice, commenti, commit: italiano, come il resto del progetto.
- Testi nuovi solo in `src/i18n/{it,en,es}.ts` con chiavi nuove; il test «frasi fisse» (`src/i18n/frasiFisse.test.ts`) deve restare verde.
- Non toccare: `src/pages/AbbonamentoPage.tsx`, `src/components/abbonamento/PaywallSheet.tsx`, `src/components/abbonamento/Vetrina.tsx`, `LinkCondivisione.tsx`, `RiquadroRichiesta.tsx`. Nessuna modifica a versione (`android/app/build.gradle`, `package.json`, `src/lib/appVersion.ts`, `hosting/release.json`), niente server, niente regole.
- Formato durata unico: `45 min`, `0 min`, `1h`, `1h05`, `2h`, `7h15`.
- Regola del giro: contrasto testo ≥ 4,5:1 (≥ 3:1 se `font-size` ≥ 18,66 px grassetto o ≥ 24 px); zona toccabile ≥ 40×40 px; nessun elemento con `text-overflow: ellipsis` e `scrollWidth > clientWidth` a 320/360/390 px con i dati brevi del giro. Chiaro e scuro.
- Test: `npx vitest run --dir src <file>`; fallimenti già presenti da ignorare: `src/lib/driveInvio.test.ts`, 21 test di `src/pages/DogsPage.test.tsx`, 3 di `src/pages/appointments.test.tsx`.
- Emulatori (Firestore 8080, Auth 9099) condivisi: non riavviarli né svuotarli, niente seed globale. Account di prova solo con email `grafica-…@test.groomly`. L'app di questo ramo si serve con un Vite proprio: `npx vite --mode emu --port 5180 --host 127.0.0.1` dalla cartella del worktree (la 5173 serve un'altra copia). `node_modules` si risolve dalla cartella padre `D:\Groomly`.

## Review Focus

- Durata in posti stretti (blocchi del calendario, righe della Home): «45 min» è più lungo di «45m» e può andare a capo o tagliarsi → il giro (Task 5) a 320 px lo controlla sul Calendario e sulla Home con visite da 45 min; nessuna ellissi.
- Backup fatto a mano e poi annullato (condivisione annullata su Android) → `lastAt` NON cambia (test in Task 2).
- Classe della zona toccabile dentro contenitori con `overflow: hidden` o vicina ad altri pulsanti: la zona allargata non deve rubare il tocco al vicino → il giro misura con `elementFromPoint` che i 4 punti a ±20 px cadono sull'elemento stesso (Task 5) e la Task 7 controlla due pulsanti vicini in Home.
- Tema scuro: colori cambiati solo per il chiaro possono peggiorare lo scuro → il test dei colori (Task 6) controlla entrambi i temi.
- Salone con nome lungo nella scheda piano / testata Impostazioni a 320 px: va a capo, non si taglia (Task 8 lo prova con un nome di 40 caratteri).

---

### Task 1: Un solo formato di durata

**Files:**
- Modify: `src/lib/display.ts:6-13` (`formatCompactDuration`), `src/lib/appointments.ts:123-129` (`formatDuration`), `src/lib/closeVisit.ts:22-26` (`formatSpent`)
- Test: `src/lib/display.test.ts`, `src/lib/appointments.test.ts:63-66`, `src/lib/closeVisit.test.ts:18-19`, più i test di pagina che cercano i vecchi testi (`grep -rn "[0-9]m\b\|h [0-9]" src --include=*.test.tsx` per trovarli)

**Interfaces:**
- Produces: `formatCompactDuration(minutes: number): string`, `formatDuration(minutes: number): string`, `formatSpent(minutes: number): string` — stessa firma di oggi, tutte con lo stesso risultato. `formatDuration` e `formatSpent` diventano alias che chiamano `formatCompactDuration` (una regola sola).

- [ ] **Step 1: Test che falliscono**

```ts
// display.test.ts
expect(formatCompactDuration(0)).toBe('0 min')
expect(formatCompactDuration(45)).toBe('45 min')
expect(formatCompactDuration(60)).toBe('1h')
expect(formatCompactDuration(65)).toBe('1h05')
expect(formatCompactDuration(120)).toBe('2h')
expect(formatCompactDuration(435)).toBe('7h15')
// appointments.test.ts
expect(formatDuration(75)).toBe('1h15')
expect(formatDuration(65)).toBe('1h05')
// closeVisit.test.ts
expect(formatSpent(120)).toBe('2h')
expect(formatSpent(65)).toBe('1h05')
expect(formatSpent(45)).toBe('45 min')
```

- [ ] **Step 2:** `npx vitest run --dir src src/lib/display.test.ts src/lib/appointments.test.ts src/lib/closeVisit.test.ts` → FAIL sui nuovi valori.
- [ ] **Step 3:** cambiare le tre funzioni (minuti arrotondati e mai negativi come oggi in `formatCompactDuration`).
- [ ] **Step 4:** rilanciare i tre file → PASS; poi `npx vitest run --dir src` e aggiornare i test di pagina che si aspettano «45m», «1h 15», «2 h 00» (solo il testo atteso, non la logica). Nessun nuovo fallimento oltre a quelli noti.
- [ ] **Step 5:** commit `fix(grafica): durata sempre «1h05» / «45 min»`.

### Task 2: Backup onesto

**Files:**
- Modify: `src/lib/statoDrive.ts` (nuova `tonoBackup`), `src/pages/SettingsPage.tsx:731` (tono), `:593-622` (`exportBackupCompleto` scrive `lastAt`), `src/i18n/{it,en,es}.ts` (`hubPassoBackup`)
- Test: `src/lib/statoDrive.test.ts`, `src/pages/SettingsPage.test.tsx` (o il file di test esistente della pagina Impostazioni)

**Interfaces:**
- Produces: `tonoBackup(lastAt: string | undefined, frequenza: string | undefined, now: Date): 'ok' | 'warn'` in `src/lib/statoDrive.ts`.

- [ ] **Step 1: Test che falliscono**

```ts
const now = new Date('2026-11-03T10:00:00')
expect(tonoBackup(undefined, undefined, now)).toBe('warn')
expect(tonoBackup('non-una-data', undefined, now)).toBe('warn')
expect(tonoBackup('2026-11-03T08:00:00', 'giorno', now)).toBe('ok')
expect(tonoBackup('2026-10-01T08:00:00', 'giorno', now)).toBe('warn')
expect(tonoBackup('2026-10-30T08:00:00', 'settimana', now)).toBe('ok')
```
Test di pagina: con `settings.backup = { autoDaily: false }` la pillola «Mai eseguito» ha il tono `warn` (stessa classe/attributo che `StatusPill` usa per `warn`); dopo «Completo con foto» riuscito (mock di `raccogliBackup`/`backupCompleto`/`downloadAnchor`) `settings.backup.lastAt` è impostato e la riga dice `impOggiCompletato`; se la condivisione è annullata (`isShareCancel` vero) `lastAt` resta assente.

- [ ] **Step 2:** lanciare i test → FAIL.
- [ ] **Step 3:** `tonoBackup`: senza data valida `warn`; più vecchio di `millisecondiFrequenza(frequenza) + 24 h` `warn`; altrimenti `ok`. In `SettingsPage`: `backupTone = driveStato?.tono ?? tonoBackup(settings.backup.lastAt, settings.backup.frequenza, now)`. In `exportBackupCompleto`, dopo `shareFiles`/`downloadAnchor` riusciti: `update((c) => ({ ...c, backup: { ...c.backup, lastAt: now.toISOString() } }))`.
- [ ] **Step 4:** `hubPassoBackup`: it `'Fai il primo backup'`, en `'Make your first backup'`, es `'Haz tu primera copia'`. Aggiornare i test che cercano «Backup impostato».
- [ ] **Step 5:** test → PASS; commit `fix(grafica): backup mai fatto in giallo, il backup a mano conta`.

### Task 3: Toast e «← Animali»

**Files:**
- Modify: `src/components/layout/Toast.tsx:51` (via lo `span` «·»), `src/components/layout/AnimalsReturn.tsx`, `src/components/layout/animalsReturn.css`, `src/pages/DogPage.tsx` (spazio in fondo alla scheda, vicino a `<AnimalsReturn />` riga ~1028)
- Test: `src/components/layout/Toast.test.tsx` (nuovo), test esistente della scheda cane per `AnimalsReturn` (`grep -rn "schedaTornaAnimali\|AnimalsReturn" src --include=*.test.tsx`)

**Interfaces:**
- Produces: classe CSS `animals-return` invariata nel nome; nuova costante esportata `ANIMALS_RETURN_SPAZIO = 'calc(72px + env(safe-area-inset-bottom, 0px))'` in `AnimalsReturn.tsx`, usata da `DogPage` come `paddingBottom` (o un `div` vuoto alto così) in fondo alla scheda.

- [ ] **Step 1: Test che falliscono** — Toast: `show('Non venuto', 'plain', { label: 'Annulla', onClick })` → il `role="status"` non contiene il testo «·» (`expect(status.textContent).not.toContain('·')`) e il pulsante «Annulla» c'è. AnimalsReturn: il link ha nome accessibile `schedaTornaAnimali` e nessun testo visibile (`textContent.trim() === ''`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Toast: togliere lo `span`; l'azione resta separata dal `gap: 8` già presente. AnimalsReturn: solo l'icona, cerchio 48×48 (`border-radius: 50%`, `padding: 0`, `justify-content: center`), stessa posizione. DogPage: spazio in fondo con `ANIMALS_RETURN_SPAZIO`.
- [ ] **Step 4:** PASS; commit `fix(grafica): toast senza «·», ritorno ad Animali tondo che non copre`.

### Task 4: Listino «vedi» vuoto spiegato

**Files:**
- Modify: `src/pages/PriceViewPage.tsx:146-147`, `src/i18n/{it,en,es}.ts`
- Test: `src/pages/PriceViewPage.test.tsx` (esistente o nuovo)

**Interfaces:**
- Consumes: la stessa condizione di sola lettura di `ListinoPage.tsx:323` (`session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'`).
- Produces: chiavi `lisVediVuoto` (it «Qui vedi il listino che carichi nella pagina Listino.», en «Here you see the price list you upload on the Price list page.», es «Aquí ves la lista de precios que subes en la página Lista de precios.»), `lisVediVuotoCollab` (it «Il titolare non ha ancora caricato il listino.», en «The owner hasn't uploaded the price list yet.», es «El titular aún no ha subido la lista de precios.»), `lisVaiAlListino` (it «Vai al listino», en «Go to price list», es «Ir a la lista»). Verificare che i testi en/es non collidano con dati (frasi fisse).

- [ ] **Step 1: Test che falliscono** — senza file: titolare vede `lisNessunFile`, `lisVediVuoto` e un link/pulsante `lisVaiAlListino` verso `/listino`; collaboratore vede `lisVediVuotoCollab` e nessun `lisVaiAlListino`.
- [ ] **Step 2:** FAIL. **Step 3:** riga con `IconTile` + `FileText` come in `ListinoPage.tsx:463-466`, la frase, e `Button` che naviga a `/listino`. **Step 4:** PASS; commit `fix(grafica): listino vuoto con spiegazione e «Vai al listino»`.

### Task 5: Script del giro (misura)

**Files:**
- Create: `QA-tests/.qa-catalog/verify-basse-grafica.cjs`
- Output: `QA-tests/results/basse-grafica/` (screenshot, `giro-<data>.json`)

**Interfaces:**
- Produces: `node QA-tests/.qa-catalog/verify-basse-grafica.cjs [--app=http://127.0.0.1:5180] [--giro] [--solo=G1,B1] [--keep] [--larghezze=320,360,390] [--temi=light,dark]`. Con `--giro` scrive `giro-<stamp>.json`: `[{ ruolo, larghezza, tema, rotta, contrasto: string[], tocco: string[], tagli: string[], hscroll: boolean }]` e stampa un riepilogo per rotta; esce con codice 1 se ci sono violazioni fuori dalle eccezioni.

- [ ] **Step 1:** preparazione dati con firebase-admin come in `verify-basse-agenda.cjs:12-70` (stesse variabili d'ambiente, `legacy: false` negli account), email `grafica-<ruolo>-<stamp>@test.groomly`, password `Test1234!`. Tre saloni: Go (`piano: 'base'`), Plus (`piano: 'pro'`), Salone titolare (`piano: 'salone'`, `enabled: true`, `seats` come scrive `functions/src/piano/scriviPiano.ts`). In ognuno: i 9 servizi predefiniti dell'app, 3 cani con nomi brevi (uno con contatto, galleria vuota, mensile), visite di oggi già passate (da chiudere in Home), una futura da 45 min, una completata, un impegno personale, una chiusura. Cancellare tutto alla fine salvo `--keep`.
- [ ] **Step 2:** giro: accesso con email e password nel modulo di `/login`, poi le rotte di `test-results/audit/work/visivo/giro.cjs:12-19` (id reali del salone creato) **tranne** `/impostazioni/abbonamento*`, `/dev/kit`, `/benvenuto`, `/impostazioni/aggiornamenti`, a 320×640, 360×800, 390×844, temi chiaro e scuro (`colorScheme`). Navigazione con `pushState` + `popstate` e attesa stabile come in `giro.cjs:21-32`.
- [ ] **Step 3:** misure per pagina (e dentro il foglio aperto se `[role=dialog][aria-modal=true]`):
  - contrasto: la funzione `CHECK` di `giro.cjs:34-80` (parte `lowContrast`), soglie della sezione Global Constraints;
  - tocco: per ogni `button, a[href], [role=button], [role=tab], [role=switch], [role=radio], input[type=checkbox], input[type=radio], select` visibile, `scrollIntoView({ block: 'center' })`, poi `document.elementFromPoint` nei 4 punti (centro ±20 px orizzontale e verticale, limitati al riquadro del contenitore che scorre): ogni punto deve cadere sull'elemento o su un suo discendente. Eccezioni scritte nello script con il motivo: barre del grafico di Incassi, caselle della griglia del Calendario, link dentro una frase (un `a` con fratelli di testo nello stesso paragrafo), pulsanti disabilitati;
  - tagli: elementi visibili con `text-overflow: ellipsis` e `scrollWidth > clientWidth + 1`;
  - `hscroll`: `documentElement.scrollWidth > innerWidth + 1`.
- [ ] **Step 4:** avviare Vite del ramo (`npx vite --mode emu --port 5180 --host 127.0.0.1`, staccato) e lanciare `node QA-tests/.qa-catalog/verify-basse-grafica.cjs --giro` (un solo runner alla volta). Salvare il JSON come linea di partenza e riportare nel report del task l'elenco raggruppato per file sorgente (rotta → elemento → misura): è l'input delle Task 6-8.
- [ ] **Step 5:** commit dello script (non dei risultati) `test(grafica): giro di misura contrasto, tocco, tagli`.

### Task 6: Colori leggibili (tema)

**Files:**
- Modify: `src/theme/tokens.css`, i componenti che scrivono testo bianco fisso su colori pieni trovati dal giro (bollini numerici: `CountBadge` in `src/pages/CalendarPage.tsx:~329`, bollini della barra in basso in `src/components/layout/BottomNav.tsx`/`bottomNav.css`, etichetta dell'ora attuale del Calendario), l'etichetta «Toelettatura» in `src/pages/SettingsPage.tsx:835`
- Test: `src/theme/tokens.test.ts` (nuovo)

**Interfaces:**
- Produces: eventuali nuove variabili per il testo su fondo pieno (es. `--on-bad`, `--on-warn`) e per l'etichetta della testata (es. `--nome-a-testo`), in entrambi i temi. Se una variabile serve anche come decorazione (gradiente del nome, icone, barre), non cambiarla: aggiungere la variabile di testo.

- [ ] **Step 1: Test che fallisce** — `tokens.test.ts` legge `tokens.css` (fs), estrae i valori di `:root` e `[data-theme="dark"]`, compone gli `rgba` sopra `--card` e controlla rapporto ≥ 4,5 per: ogni `--s-<x>` su `--s-<x>-bg` (bagno, taglio, combo, strip, nodi, derma, anti, pelo, mens), `--tea` su `--tea-s`, la variabile di testo della testata su `--card`, il testo dei bollini sul loro fondo, il testo dell'ora attuale sul suo fondo; in tutti e due i temi.
- [ ] **Step 2:** FAIL (oggi `--s-taglio` 3,49, `--nome-a` 2,56, bianco su `--bad` scuro 2,72…).
- [ ] **Step 3:** scurire in chiaro / schiarire in scuro mantenendo la tinta (stessa tonalità HSL, solo luminosità); fondi pieni dei bollini in scuro con testo scuro o fondo più scuro. Applicare le nuove variabili nei componenti.
- [ ] **Step 4:** test PASS; `--solo` del giro sulle rotte toccate → nessun `contrasto` fuori da Abbonamento. Commit `fix(grafica): colori del testo almeno 4,5:1 in chiaro e scuro`.

### Task 7: Zona toccabile ≥ 40 px

**Files:**
- Create: `src/theme/tocco.css` (importato una volta dove si importano i CSS globali, es. `src/main.tsx`)
- Modify: le pagine/componenti indicati dal giro; dall'audit almeno: Home «Completato / Non venuto / Disdetto» e «Calendario ›», Listino «Gestisci» / «Modifica» / «Info», Gestione listino pallini colore e righe razza, Stampa «Apri a schermo intero», Impostazioni righe link e «Copia», Servizi «Riordina» / «Apri», Notifiche «Meno/Più» e «Informazioni», Appuntamento «Servizi» e «Chiedi la recensione», Report «Statistiche», scheda cane «Aggiungi», Team pulsanti di testo (`ProPage.tsx:28,55,273`), `FiltroPersona` (32 px)
- Test: `src/theme/tocco.test.ts` (la regola esiste) + giro

**Interfaces:**
- Produces: classe `tocco`:

```css
.tocco { position: relative; }
.tocco::after { content: ''; position: absolute; left: 50%; top: 50%; width: max(100%, 40px); height: max(100%, 40px); transform: translate(-50%, -50%); }
```
Si aggiunge con `className="tocco"` (unita a eventuali classi esistenti) senza cambiare stili visibili. Dove due pulsanti vicini sono a meno di 40 px di distanza da centro a centro, aumentare lo spazio tra loro (gap/margine) invece di sovrapporre le zone.

- [ ] **Step 1:** test che la classe esista nel CSS con `40px` (lettura file) e, in `HomePage.test.tsx` o simile, che i tre pulsanti di chiusura abbiano la classe `tocco`.
- [ ] **Step 2:** FAIL. **Step 3:** creare la classe, applicarla agli elementi del giro; nessun file escluso dalle Global Constraints. **Step 4:** test PASS e `--giro` → `tocco` vuoto fuori dalle eccezioni. Commit `fix(grafica): zona toccabile di almeno 40 px`.

### Task 8: Niente tagli a 320 px

**Files:**
- Modify: `src/components/layout/bottomNav.css` (etichetta più piccola sotto 360 px finché sta intera, es. `@media (max-width: 359px) { .bottom-nav__label { font-size: … ; letter-spacing: … } }`, nessuna ellissi), `src/components/abbonamento/SchedaAbbonamento.tsx` (titolo «Groomly Salone», «Go · Groomly Go», «Passa a Plus» vanno a capo: niente `nowrap`/ellissi sul testo dell'app), testata Impostazioni («Suggerimenti» che tocca il bordo), più le altre voci di `tagli` del giro
- Test: `SchedaAbbonamento.test.tsx` (esistente: lo stile del titolo non ha `textOverflow: 'ellipsis'`) + giro

- [ ] **Step 1:** test che falliscono su `SchedaAbbonamento` (niente ellissi sul titolo e sull'azione) e sull'etichetta della barra (classe senza `text-overflow: ellipsis` nel CSS letto da file).
- [ ] **Step 2:** FAIL. **Step 3:** correggere; con l'a capo dove c'è spazio verticale, carattere più piccolo solo nella barra in basso. **Step 4:** PASS; `--giro` a 320/360/390 → `tagli` vuoto (anche con il salone dal nome di 40 caratteri: aggiungere al giro un quarto salone Salone con `salonName` di 40 caratteri, solo rotta `/impostazioni`). Commit `fix(grafica): niente testi tagliati a 320 px`.

### Task 9: Casi mirati nello script

**Files:**
- Modify: `QA-tests/.qa-catalog/verify-basse-grafica.cjs`

- [ ] **Step 1:** aggiungere i casi (ognuno con screenshot in `QA-tests/results/basse-grafica/`, filtrabili con `--solo`):
  - **B1** Go senza backup: in `/impostazioni` la pillola del backup ha il tono avviso (colore calcolato = `--warn` del tema); «Completo con foto» nel foglio Backup (download intercettato con `page.waitForEvent('download')`) → la riga dice «Oggi…» e Firestore ha `backup.lastAt`.
  - **D1** scheda cane con media 65 min → «1h05»; modulo nuovo appuntamento con servizio da 65 min → «1h05».
  - **T1** Home: «Non venuto» su una visita da chiudere → toast senza «·» con «Annulla».
  - **A1** scheda cane a 390×844 e 844×390: dopo lo scorrimento in fondo il rettangolo di «← Animali» non interseca il pulsante di chiamata del contatto né «Galleria»; il pulsante è 48×48.
  - **L1** `/listino/vedi` vuoto: frase e «Vai al listino» → `/listino`.
  - **E1** lingua `en` (`localStorage groomly.lingua`): sotto il logo in `/impostazioni` c'è «Grooming salon» (maiuscolo da CSS).
- [ ] **Step 2:** lanciare tutto (`--giro` + casi) → tutti PASS, codice d'uscita 0. Commit `test(grafica): casi mirati della verifica`.
