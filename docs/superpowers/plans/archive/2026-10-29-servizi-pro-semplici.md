# Servizi Pro, le cose piccole — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Strumenti i servizi Pro si accendono con un interruttore e una i, e in home restano solo le righe strette di auguri e promemoria, nell’ordine deciso.

**Architecture:** Le regole di orario e di visibilità restano funzioni pure in `serviziEmail`, `righeServizio` e `codaEmail`. La home smette di usare la card «In partenza» per questi servizi e disegna righe sottili sotto gli appuntamenti e sotto i cani da completare. Il server continua a spedire le righe `in_coda` con `parteIl` scaduto, tranne gli auguri. La lista d’attesa non crea più offerte: quel flusso è l’altro piano.

**Tech Stack:** React, Vitest, token in `src/theme/tokens.css`, Lucide, Firestore già usato dalla coda, Cloud Functions che importano `src/lib`.

**Spec:** `docs/superpowers/specs/2026-10-29-servizi-pro-semplici-design.md`

## Global Constraints

- Orari in Europe/Rome.
- Titolare e socio cambiano gli interruttori. Il collaboratore no.
- Promemoria, auguri, recensione e lista d’attesa sono solo accesi o spenti. Cane pronto è l’unico con Manuale o Automatico.
- Promemoria acceso: default il giorno prima alle 18:00. Restano le scelte 1, 2 o 3 giorni prima, e l’ora.
- Auguri: la mail parte solo se in home si preme Sì. Il cestino vale per quell’anno. Se il giorno passa senza scelta, non parte il giorno dopo.
- Cane pronto automatico: la mail parte all’istante del Completato, non 15 minuti dopo. Manuale: il popup già in `ChiediPronto`. In home non compare.
- Recensione: solo automatica. Alle 20 del giorno del completamento. Se il completamento è alle 20 o dopo, alle 9 del mattino dopo. Restano nota di problema, una volta l’anno, cinque al giorno. In home non compare.
- Lista d’attesa accesa non crea offerte e non manda la mail vecchia.
- Email, statistiche e copie delle foto escono da Strumenti. Restano in scheda, Incassi e backup. L’elenco operatore non si tocca.
- Colori solo dai token. Icona `Info` Lucide 16 px, stroke 2, colore `var(--tx3)`. Tasto 36×44, fondo trasparente, raggio 8. Premuto: `var(--pri-s)` per 150 ms, subito se `prefers-reduced-motion`. Dialogo già in app.
- La riga home è una linea, padding verticale 4. Sì e cestino hanno area di tocco di almeno 44 senza andare a capo. Il colore è accompagnato dalla parola.
- Ordine sotto la ricerca e le richieste: appuntamenti di oggi, cani da completare se ci sono, auguri, posto per la conferma della lista, promemoria ultimi.

## Review Focus

- Completare una visita alle 20:01 ora di Roma deve mettere la recensione alle 9 del giorno dopo, non alle 20 dello stesso giorno.
- Una riga auguri già salvata con `parteIl` alle 9 non deve partire da sola.
- Il collaboratore vede l’interruttore e non lo muove.
- Un promemoria già `inviata` non ha il cestino.
- Lista d’attesa accesa non aggiunge righe `attesa`.

---

## File

- Create: `src/components/ui/Info.tsx` — il pulsante i e il dialogo.
- Create: `src/components/piano/RigheHome.tsx` — riga auguri e riga promemoria.
- Modify: `src/lib/serviziEmail.ts` — recensione solo automatica.
- Modify: `src/lib/righeServizio.ts` — orari di pronto, recensione, auguri.
- Modify: `src/lib/codaEmail.ts` — `dovute` non spedisce gli auguri.
- Modify: `src/pages/PianoPagine.tsx` — interruttori, tre voci tolte.
- Modify: `src/pages/HomePage.tsx` — ordine e righe.
- Modify: `src/pages/NotificationsPage.tsx`, `src/pages/SettingsPage.tsx` — stessa i.
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`.
- Modify: `functions/src/piano/inviaCoda.ts` — non crea offerte di attesa.
- Test accanto ai file già esistenti: `serviziEmail.test.ts`, `righeServizio.test.ts`, `codaEmail.test.ts`, `FoglioServizio.test.tsx`, `HomePage.test.tsx`, `functions/src/piano/inviaCoda.test.ts`.
- Test nuovi: `src/components/ui/Info.test.tsx`, `src/components/piano/RigheHome.test.tsx`.

Firme prodotte dal task 2 e usate dopo:

```ts
export function parteIlRecensione(chiusoIl: string): string
export function soloAutomatico(chiave: ChiaveServizioEmail): boolean
```

`soloAutomatico` è vero per `promemoria`, `auguri` e `recensione`. È falso per `pronto`.

---

### Task 1: La i

**Files:**
- Create: `src/components/ui/Info.tsx`
- Test: `src/components/ui/Info.test.tsx`
- Modify: `src/pages/NotificationsPage.tsx`, `src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `Dialog` da `src/components/layout/Dialog.tsx`
- Produces: `Info({ nome, titolo, testo }: { nome: string, titolo: string, testo: string })`

- [ ] **Step 1: Write the failing test**

Il bottone ha nome accessibile `Informazioni su Promemoria`. Al clic il dialogo mostra il titolo e il testo. Un secondo test rende il bottone e controlla che l’icona sia nel bottone.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/Info.test.tsx`
Expected: FAIL, `Info` non esiste.

- [ ] **Step 3: Implement `Info`**

Lucide `Info`, 16, stroke 2, `var(--tx3)`. Bottone 36×44, fondo trasparente, raggio 8, bordo 0. A `:active` il fondo è `var(--pri-s)` per 150 ms. Se `prefers-reduced-motion: reduce`, niente transizione. Il dialogo è quello già in app. Pulsante di chiusura: la frase già usata `notCapito` («Ho capito»).

- [ ] **Step 4: Sostituire i due bottoni locali**

In `NotificationsPage.tsx` e nel bottone della frequenza backup in `SettingsPage.tsx`, il bottone scritto a mano diventa `Info`. I testi restano le frasi già in app.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ui/Info.test.tsx src/pages/SettingsPage.test.tsx`
Expected: PASS. Il test esistente che apre «Informazioni sulla frequenza» passa ancora.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Info.tsx src/components/ui/Info.test.tsx src/pages/NotificationsPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: un solo pulsante informazione per servizi e backup"
```

---

### Task 2: Modi e orari

**Files:**
- Modify: `src/lib/serviziEmail.ts`
- Modify: `src/lib/righeServizio.ts`
- Modify: `src/lib/codaEmail.ts`
- Test: `src/lib/serviziEmail.test.ts`, `src/lib/righeServizio.test.ts`, `src/lib/codaEmail.test.ts`

**Interfaces:**
- Consumes: `romeDay` da `src/lib/romeTime.ts`, l’helper `istanteRoma(giorno, ora)` già dentro `righeServizio.ts`
- Produces: `parteIlRecensione(chiusoIl: string): string`. `soloAutomatico` include `recensione`. `dovute` esclude `tipo === 'auguri'`. `righePronto` in automatico mette `parteIl` uguale a `chiusoIl`. `righeAuguri` mette `parteIl: null`.

- [ ] **Step 1: Write the failing tests**

```ts
import { parteIlRecensione } from './righeServizio'

it('la recensione delle 20:01 parte alle 9 del giorno dopo', () => {
  expect(parteIlRecensione('2026-10-28T18:01:00.000Z')).toBe('2026-10-29T08:00:00.000Z')
})

it('la recensione delle 19:59 parte alle 20 dello stesso giorno', () => {
  expect(parteIlRecensione('2026-10-28T17:59:00.000Z')).toBe('2026-10-28T19:00:00.000Z')
})
```

`2026-10-28T18:01:00.000Z` è le 20:01 a Roma in ora solare. `2026-10-28T17:59:00.000Z` è le 19:59. `2026-10-28T19:00:00.000Z` è le 20:00. `2026-10-29T08:00:00.000Z` è le 9 del giorno dopo.

In `codaEmail.test.ts`, una riga `auguri` con `parteIl` già passato e stato `in_coda` non è in `dovute`. Una riga `promemoria` nelle stesse condizioni ci è.

In `serviziEmail.test.ts`, `soloAutomatico('recensione')` è vero e `soloAutomatico('pronto')` è falso. `normalizzaServiziEmail` con recensione `manuale` la rende `automatico`. Una scelta pronto `manuale` resta `manuale`.

In `righeServizio.test.ts`, un pronto automatico con `chiusoIl` `2026-10-27T09:00:00.000Z` ha `parteIl` uguale a quel valore, non 15 minuti dopo. Un augurio del giorno ha `parteIl` `null` e stato `in_coda`. Aggiorna le asserzioni esistenti che si aspettano i 15 minuti o le 9 per gli auguri, così il file resta verde per la regola nuova.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts src/lib/codaEmail.test.ts src/lib/serviziEmail.test.ts`
Expected: FAIL sulle asserzioni nuove.

- [ ] **Step 3: Implement**

`parteIlRecensione`: giorno di Roma di `chiusoIl`. Se l’ora di Roma è prima delle 20, `istanteRoma(giorno, '20:00')`. Altrimenti `istanteRoma` del giorno dopo alle `09:00`. `righeRecensione` in automatico usa questa funzione al posto dei 15 minuti. Il modo manuale non crea una riga da inviare a mano: `sceltaOperativa` l’ha già portato ad automatico.

`righePronto` automatico: `parteIl` è `chiusoIl`, non `chiusoIl` più 15 minuti.

`righeAuguri`: la riga del compleanno ha `parteIl: null`. Non chiamare `istanteRoma` con le 9.

`dovute`: scarta `riga.tipo === 'auguri'` prima del controllo sull’ora.

`soloAutomatico` e `normalizzaServiziEmail`: aggiungi `recensione` accanto a promemoria e auguri. `sceltaIniziale('recensione')` è `{ modo: 'automatico' }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts src/lib/codaEmail.test.ts src/lib/serviziEmail.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/serviziEmail.ts src/lib/serviziEmail.test.ts src/lib/righeServizio.ts src/lib/righeServizio.test.ts src/lib/codaEmail.ts src/lib/codaEmail.test.ts
git commit -m "fix: recensione a fine giornata, auguri fermi finché non si preme Sì"
```

---

### Task 3: Strumenti a interruttore

**Files:**
- Modify: `src/pages/PianoPagine.tsx`
- Modify: `src/components/piano/FoglioServizio.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Test: `src/components/piano/FoglioServizio.test.tsx`, `src/pages/strumenti.test.tsx`

**Interfaces:**
- Consumes: `Info` dal task 1, `soloAutomatico` e `Toggle`
- Produces: la riga Strumenti non apre più il foglio a radio per i servizi solo automatici. Cane pronto, all’accensione, apre la scelta Manuale o Automatico.

- [ ] **Step 1: Write the failing test**

In `strumenti.test.tsx`, l’elenco Pro non contiene «Statistiche», «Email» e «Copie delle foto». Contiene Promemoria con un interruttore e una i. Accendere Cane pronto mostra due scelte, Manuale e Automatico. Dopo la scelta, accanto all’interruttore c’è la parola scelta. Il collaboratore ha l’interruttore disabilitato.

I testi italiani della i, da mettere in `it.ts` e da asserire nel test della i di Promemoria:

- Promemoria: «Manda da solo un promemoria alla proprietaria prima dell’appuntamento. In home, in fondo, una riga stretta: pallino rosso se deve ancora partire, spunta verde se è partito. Il cestino annulla quello che non è ancora partito.»
- Cane pronto: «Quando segni la visita completata, la proprietaria può ricevere la mail che il cane è pronto. Automatico: parte da sola. Manuale: te lo chiede in quel momento. In home non compare.»
- Auguri: «Il giorno del compleanno, in home, compare una riga. Puoi inviare gli auguri o cestinare. Non parte da sola.»
- Recensione: «Se la visita è completata, a fine giornata parte una mail con il link di Google. Non parte se quel giorno c’è una nota di problema, se a quel cane è già stata chiesta nell’ultimo anno, o se oggi ce ne sono già cinque. In home non compare.»
- Tessera: «Dieci visite chiuse fanno un premio. In scheda si vedono i segni e, a dieci, Usa premio.»

La i della lista d’attesa arriva col piano della lista. In questo task il testo è: «Quando è acceso, la lista d’attesa è descritta nel suo servizio. Finché quel lavoro non c’è, acceso non manda mail.»

Inglese e spagnolo dicono la stessa cosa, non la stringa italiana.

Aggiorna `FoglioServizio.test.tsx`: i test che cercano le radio Spento / Manuale / Automatico per il promemoria diventano l’interruttore. La tessera resta un interruttore.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/strumenti.test.tsx src/components/piano/FoglioServizio.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

Togli da `PRO` le voci `statistiche`, `schedaCliente` e `copieCloud`. Non togliere le pagine né `UsersPage.tsx`.

Per ogni servizio email tranne cane pronto: `Toggle` acceso se il modo non è `spento`. Accendere salva `sceltaIniziale`. Spegnere salva `{ modo: 'spento' }` tenendo anticipo e ora già scelti. Promemoria acceso mostra sotto i tre chip di anticipo e il campo ora, come fa oggi il foglio. Recensione accesa mostra il campo del link Google.

Cane pronto spento: il toggle off. Accenderlo apre il dialogo con Manuale e Automatico, testi «Manuale. Te lo chiede quando premi Completato.» e «Automatico. La mail parte da sola.» La scelta salva il modo. La parola resta accanto al toggle. Ripremerla riapre il dialogo.

`Info` accanto a ogni riga, con le frasi sopra. Richiami resta In sviluppo. Prenotazioni online resta dov’è.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/strumenti.test.tsx src/components/piano/FoglioServizio.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/PianoPagine.tsx src/components/piano/FoglioServizio.tsx src/components/piano/FoglioServizio.test.tsx src/pages/strumenti.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat: interruttori nei servizi Pro e tre voci tolte dall'elenco"
```

---

### Task 4: Spegni le offerte vecchie della lista

**Files:**
- Modify: `functions/src/piano/inviaCoda.ts`
- Test: `functions/src/piano/inviaCoda.test.ts`
- Modify: `src/lib/righeServizio.ts` solo se il server chiama ancora `righeAttesa` da lì

**Interfaces:**
- Consumes: il blocco `if (aperti.has('attesa'))` in `inviaCoda.ts`
- Produces: quel blocco non chiama `righeAttesa`. Le righe `attesa` già `in_coda` passano a `chiusa` in quello stesso giro.

- [ ] **Step 1: Write the failing test**

Il test che oggi si aspetta una riga `attesa` quando il servizio è automatico e c’è un iscritto, si aspetta invece zero righe nuove di tipo `attesa`. Una riga `attesa` già `in_coda` nello stesso giro diventa `chiusa`. Promemoria e recensione di quello stesso giro restano.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/inviaCoda.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Nel giro del minuto, non costruire offerte di attesa. Chiudi le `in_coda` di tipo `attesa`. Non cancellare le `inviata` e le `fermata`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/inviaCoda.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/inviaCoda.ts functions/src/piano/inviaCoda.test.ts
git commit -m "fix: la lista accesa non manda più l'offerta vecchia"
```

---

### Task 5: Righe in home

**Files:**
- Create: `src/components/piano/RigheHome.tsx`
- Test: `src/components/piano/RigheHome.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `RigaCoda`, `fermaRiga`, `inviaRigaAdesso` da `src/data/invioCoda.ts`
- Produces:
  - `RigaPromemoria({ nome, quando, inviato, onCestino }: { nome: string, quando: string, inviato: boolean, onCestino: (() => void) | null })`
  - `RigaAuguri({ nome, onSi, onCestino }: { nome: string, onSi: () => void, onCestino: () => void })`

- [ ] **Step 1: Write the failing test**

`RigaPromemoria` con `inviato` falso mostra il nome, la data, la parola Promemoria, un pallino con nome accessibile «Da inviare» e un bottone Cestino. Con `inviato` vero mostra «Inviato» e non ha il Cestino.

`RigaAuguri` mostra «È il compleanno di Fluffy. Inviare gli auguri?», Sì e Cestino.

In `HomePage.test.tsx`: con un appuntamento di oggi e un cane da completare, l’ordine del testo è appuntamento, poi il cane da completare, poi l’augurio, poi il promemoria. Senza cani da completare, l’augurio sta subito sotto l’appuntamento e il promemoria è ancora dopo. Non esiste la regione «In partenza». Non si vede una riga di tipo pronto né di tipo recensione.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/RigheHome.test.tsx src/pages/HomePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

Togli `CodaInPartenza` dalla home. Non togliere `ChiediPronto`: se cane pronto è manuale, Completato apre ancora quel dialogo. Se è automatico, il dialogo non si apre e la riga ha `parteIl` uguale a `chiusoIl`, così la manda il server. La sezione `da-chiudere` si sposta subito sotto la card degli appuntamenti di oggi. Poi gli auguri visibili oggi (`tipo === 'auguri'`, stato `in_coda`, compleanno di oggi). Poi un segnaposto vuoto per la conferma della lista: un contenitore con `data-posto="conferma-attesa"` e nessun figlio. Poi i promemoria di oggi, `in_coda` o `inviata`. Il cestino del promemoria chiama `fermaRiga` solo se non è inviato. Sì degli auguri chiama `inviaRigaAdesso`. Il cestino degli auguri chiama `fermaRiga`.

La riga è flex, una linea, padding verticale 4. Pallino 8 px, `--bad` se da inviare, spunta `--ok` se inviato. La parola sta nel nome accessibile.

Sì manda e, a invio riuscito, la riga esce. Se l’invio fallisce, la riga resta e mostra il motivo già usato dalla coda.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/RigheHome.test.tsx src/pages/HomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/RigheHome.tsx src/components/piano/RigheHome.test.tsx src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: in home auguri e promemoria stanno sotto la giornata"
```

---

## Copertura

| Pezzo della specifica | Task |
| --- | --- |
| Componente i, anche su notifiche e backup | 1 |
| Interruttori, solo cane pronto con la scelta, tre voci tolte | 3 |
| Recensione alle 20 o alle 9 | 2 |
| Cane pronto all’istante del Completato, assente da home | 2 e 5 |
| Auguri solo con Sì, niente invio il giorno dopo | 2 e 5 |
| Promemoria in fondo, cestino solo se non partito | 5 |
| Lista accesa senza offerte vecchie | 4 |
| Ordine appuntamenti, da completare, auguri, promemoria | 5 |
