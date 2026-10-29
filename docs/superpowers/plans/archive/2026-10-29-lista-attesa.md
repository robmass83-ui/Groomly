# Lista d’attesa — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dal sito ci si iscrive quando una settimana non ha orari. Se si libera un’ora ancora futura, la mail arriva a tutti. Il primo il cui trattamento ci sta conferma e entra in agenda. Il non venuto a ora passata non avvisa nessuno.

**Architecture:** Le decisioni stanno in `src/lib/listaAttesa.ts`, senza rete. Il sito in `hosting/s/pagina.js` mostra il pulsante e manda l’iscrizione a una callable. Un giro sul server, lo stesso minuto della coda, crea un’offerta per ogni iscritto quando un inizio è ancora nel futuro, e manda la mail una volta sola. La conferma è un’altra callable: in transazione riusa `intervalloAncoraLibero` e scrive il cane e la visita, oppure risponde che il posto è occupato. La home legge gli avvisi nel segnaposto lasciato dal piano delle cose piccole.

**Tech Stack:** React, Vitest, la pagina pubblica già in `hosting/s/pagina.js`, Cloud Functions, Firestore `salons/{salonId}`, Brevo tramite il canale già usato da `inviaCoda`, token in `src/theme/tokens.css`.

**Spec:** `docs/superpowers/specs/2026-10-29-lista-attesa-design.md`

Dipende dal piano `docs/superpowers/plans/2026-10-29-servizi-pro-semplici.md`: l’interruttore acceso o spento, lo spegnimento delle offerte vecchie, e il contenitore `data-posto="conferma-attesa"` in home. Questo piano non riaccende `righeAttesa`.

## Global Constraints

- Orari in Europe/Rome. Orizzonte 42 giorni, `ORIZZONTE_GIORNI` in `src/lib/disponibilita.ts`.
- Settimana: lunedì-domenica. Il pulsante sta su una settimana senza nessun orario di partenza per animale, taglia e trattamento già scelti.
- Chi si iscrive non riscrive animale, taglia e trattamento. Si chiedono solo nome, cellulare, email e nome dell’animale, se vuoti. Razza e foto no. Il consenso privacy è obbligatorio.
- Nessuna precedenza. Una mail per persona per ora liberata. Un retry non la rimanda.
- La mail parte solo se l’inizio è ancora nel futuro. Disdetta, spostamento o cancellazione prima dell’inizio avvisano. Non venuto a ora già passata non avvisa. Disdetta, spostamento o cancellazione dopo l’inizio non avvisano. Completare non libera il posto.
- Il link è personale: `https://groomlyapp.it/s/{slug}?attesa={token}`.
- Se l’ora è libera e la durata ci sta: «Il posto è ancora libero. Vuoi confermare?» Conferma scrive la visita `programmato` senza un secondo sì del salone. Rifiuta lascia la persona in lista.
- Se l’ora è presa o la durata non ci sta: «Il posto è già stato occupato.» e «Vuoi restare in lista d’attesa per un possibile prossimo buco?» Sì resta. No esce.
- Chi non apre la mail resta in lista.
- Stessa email e stesso nome del cane già in salone: si riusa quel cane. Altrimenti si crea la scheda.
- Durata da `scegliCatalogo` in `src/lib/catalogoPrenotazione.ts`, per il servizio e la taglia.
- In home la riga è una linea, sotto gli auguri e sopra i promemoria, fino a mezzanotte del giorno della conferma. Testo: «{cane}, {trattamento}, ha confermato e verrà al posto di {altro}, che ha disdetto.»
- Interruttore spento: niente pulsante, niente voce nel più, niente linguetta In attesa, torna Archivio. Acceso: nel più c’è «Lista d’attesa» e in Animali In attesa sostituisce Archivio.
- Titolare, socio e collaboratore aggiungono e tolgono. Solo titolare e socio muovono l’interruttore.
- Registrazione a mano: nome, cellulare, email, nome dell’animale, animale, taglia, trattamento. Senza trattamento non si salva.
- Colori dai token. Icone Lucide stroke 2. Testi in italiano, inglese e spagnolo.

## Review Focus

- Due conferme della stessa ora: la seconda riceve occupato, e una sola visita viene scritta.
- Un trattamento che finisce dopo l’inizio del cane successivo è occupato, con la domanda se restare.
- Non venuto segnato dopo l’inizio non crea offerte.
- Email e nome del cane già presenti riusano quel cane e non ne creano un altro.
- Interruttore spento: il sito non mostra il pulsante e in Animali c’è Archivio, non In attesa.

---

## File

- Create: `src/lib/listaAttesa.ts` — settimana, iscrizione, ora ancora davanti, ci sta, esito del clic, idempotenza della mail.
- Create: `functions/src/piano/offerteAttesa.ts` — quali offerte nascono da una disdetta.
- Create: `functions/src/piano/confermaAttesa.ts` — transazione di conferma, rifiuto, resta, esci.
- Modify: `hosting/s/pagina.js` — pulsante, campi mancanti, pagina del link.
- Modify: `src/i18n/emailHtml.ts` — testo della mail.
- Modify: `src/pages/HomePage.tsx` — riga nel segnaposto.
- Modify: `src/pages/DogsPage.tsx` — linguetta In attesa.
- Modify: `src/pages/ShellFrame.tsx` — voce nel più.
- Modify: `firestore.rules` — la lista non è scrivibile dal pubblico. Scrive solo la callable.
- Modify: `functions/src/index.ts` — le callable.

Firme. I task dopo il 1 le usano così, senza rinominarle.

```ts
export type SpecieAttesa = 'cane' | 'gatto' | 'altro'
export type TagliaAttesa = 'piccola' | 'media' | 'grande'

export interface IscrittoAttesa {
  id: string
  nome: string
  phone: string
  email: string
  nomeCane: string
  specie: SpecieAttesa
  taglia: TagliaAttesa
  servizioId: string
  trattamento: string
  durataMin: number
  creatoIl: string
}

export interface BucoAttesa {
  appointmentId: string
  inizio: Date
  nomeCaneDisdetto: string
}

export type MotivoPosto = 'libero' | 'passato' | 'occupato' | 'non_ci_sta'

export function settimanaDi(giorno: string): { inizio: string, fine: string }
export function settimanaPiena(giorniConOrari: readonly string[], settimana: { inizio: string, fine: string }): boolean
export function campiMancanti(gia: { nome?: string, phone?: string, email?: string, nomeCane?: string }): Array<'nome' | 'phone' | 'email' | 'nomeCane'>
export function oraAncoraDavanti(inizio: Date, adesso: Date): boolean
export function ciSta(inizio: Date, durataMin: number, prossimoInizio: Date | null): boolean
export function motivoPosto(input: { inizio: Date, adesso: Date, durataMin: number, prossimoInizio: Date | null, preso: boolean }): MotivoPosto
export function idOfferta(appointmentId: string, iscrittoId: string): string
```

`idOfferta` è `attesa:{appointmentId}:{iscrittoId}`.

Firestore, sotto `salons/{salonId}`:

- `attesa/{iscrittoId}` documento `IscrittoAttesa` più `attivo: boolean`
- `offerteAttesa/{idOfferta}` con `token`, `appointmentId`, `iscrittoId`, `inizio`, `inviataIl`
- `avvisiAttesa/{id}` con `cane`, `trattamento`, `altro`, `giorno` (`YYYY-MM-DD` di Roma della conferma)

---

### Task 1: Regole pure

**Files:**
- Create: `src/lib/listaAttesa.ts`
- Test: `src/lib/listaAttesa.test.ts`

**Interfaces:**
- Consumes: niente della rete. `scegliCatalogo` non si chiama qui: la durata arriva già calcolata.
- Produces: le firme del blocco sopra.

- [ ] **Step 1: Write the failing test**

```ts
it('la settimana di mercoledì 4 novembre 2026 è dal 2 all’8', () => {
  expect(settimanaDi('2026-11-04')).toEqual({ inizio: '2026-11-02', fine: '2026-11-08' })
})

it('è piena se nessun giorno di quella settimana ha orari', () => {
  expect(settimanaPiena(['2026-11-09'], { inizio: '2026-11-02', fine: '2026-11-08' })).toBe(true)
  expect(settimanaPiena(['2026-11-04'], { inizio: '2026-11-02', fine: '2026-11-08' })).toBe(false)
})

it('chiede solo i campi ancora vuoti', () => {
  expect(campiMancanti({ nome: 'Anna', phone: '', email: 'a@b.it', nomeCane: '' })).toEqual(['phone', 'nomeCane'])
})

it('le 10 già passate alle 16 non sono davanti', () => {
  expect(oraAncoraDavanti(new Date('2026-11-04T09:00:00.000Z'), new Date('2026-11-04T15:00:00.000Z'))).toBe(false)
})

it('un’ora di trattamento non ci sta in mezz’ora', () => {
  const inizio = new Date('2026-11-04T09:00:00.000Z')
  const prossimo = new Date('2026-11-04T09:30:00.000Z')
  expect(ciSta(inizio, 60, prossimo)).toBe(false)
  expect(motivoPosto({ inizio, adesso: new Date('2026-11-04T08:00:00.000Z'), durataMin: 60, prossimoInizio: prossimo, preso: false })).toBe('non_ci_sta')
})
```

`2026-11-04T09:00:00.000Z` è le 10:00 a Roma. `2026-11-04T15:00:00.000Z` è le 16:00.

Aggiungi: `motivoPosto` con `preso: true` è `occupato`. Con inizio nel futuro, durata che ci sta e `preso: false` è `libero`. Con inizio nel passato è `passato`, anche se non è preso.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/listaAttesa.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Implement le funzioni in `src/lib/listaAttesa.ts`**

`settimanaDi` calcola il lunedì e la domenica di quel `YYYY-MM-DD` in calendario, senza spostare il fuso: è una data, non un istante. `ciSta` è vero se `prossimoInizio` è null, oppure se `inizio + durataMin` è minore o uguale a `prossimoInizio`. `motivoPosto` guarda nell’ordine: passato, poi preso, poi non ci sta, altrimenti libero.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/listaAttesa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/listaAttesa.ts src/lib/listaAttesa.test.ts
git commit -m "feat: regole della lista, settimana piena e ora ancora davanti"
```

---

### Task 2: Quali mail nascono

**Files:**
- Create: `functions/src/piano/offerteAttesa.ts`
- Test: `functions/src/piano/offerteAttesa.test.ts`

**Interfaces:**
- Consumes: `oraAncoraDavanti`, `idOfferta`, `IscrittoAttesa`, `BucoAttesa`
- Produces: `offerteDaCreare(input: { buchi: readonly BucoAttesa[], iscritti: readonly IscrittoAttesa[], esistenti: readonly { id: string }[], adesso: Date }): { id: string, appointmentId: string, iscrittoId: string, inizio: string }[]`

- [ ] **Step 1: Write the failing test**

Due iscritti e una disdetta alle 10 ancora futura: due offerte, id `attesa:{appointmentId}:{iscrittoId}`. La stessa disdetta segnata come non venuto alle 16, con `adesso` alle 16, produce un array vuoto. Un’offerta il cui id è già in `esistenti` non viene ripetuta. Una visita completata non è un buco: il test non la passa, e un buco con inizio passato restituisce `[]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/offerteAttesa.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

Filtra i buchi con `oraAncoraDavanti`. Per ogni coppia buco-iscritto, se `idOfferta` non è in `esistenti`, emetti la riga. Non filtrare per settimana né per durata: la durata si guarda quando aprono il link.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/offerteAttesa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/offerteAttesa.ts functions/src/piano/offerteAttesa.test.ts
git commit -m "feat: una mail a ogni iscritto solo se l'ora è ancora davanti"
```

---

### Task 3: Mail e link

**Files:**
- Modify: `src/i18n/emailHtml.ts`
- Test: `src/i18n/emailHtml.test.ts`
- Modify: `functions/src/piano/inviaCoda.ts` per spedire le offerte nuove con lo stesso tetto giornaliero

**Interfaces:**
- Consumes: `offerteDaCreare`, `emailMessaggio` o il compositore già in `emailHtml.ts`
- Produces: una funzione `mailPostoLibero({ nomeSalone, quando, url }: { nomeSalone: string, quando: string, url: string }): { oggetto: string, testo: string }` per `it`, `en`, `es`. Il testo italiano contiene «Si è liberato un posto», la data, «Affrettati» e l’url.

- [ ] **Step 1: Write the failing test**

L’italiano contiene «Si è liberato un posto», «Affrettati, prima di perdere questa possibilità.» e l’url passato. Inglese e spagnolo contengono l’url e non la frase italiana. L’oggetto italiano è «Si è liberato un posto».

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/emailHtml.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement il testo e l’aggancio al giro**

Nel giro del minuto, dopo le altre mail, calcola `offerteDaCreare` dai buchi del giro (disdetta, spostamento, cancellazione il cui inizio è ancora davanti). Per ogni offerta nuova scrivi `offerteAttesa` con un token di 32 byte esadecimali, `inviataIl` null, poi manda la mail. A invio riuscito scrivi `inviataIl`. Se la mail fallisce, `inviataIl` resta null e il giro dopo riprova, perché l’id c’è già in `esistenti` solo quando `inviataIl` è valorizzato: passa a `offerteDaCreare` solo le offerte già inviate. Il tetto è `TETTO_EMAIL_GIORNO`, lo stesso delle altre mail. La lingua è quella del cliente se c’è, altrimenti italiano.

Il chiamante del giro deve passare i buchi, non le visite completate e non i non venuto il cui inizio è passato. Un test in `inviaCoda.test.ts`: un non venuto con inizio già passato non aggiunge documenti `offerteAttesa`. Una disdetta con inizio futuro ne aggiunge uno per iscritto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/emailHtml.test.ts functions/src/piano/inviaCoda.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts functions/src/piano/inviaCoda.ts functions/src/piano/inviaCoda.test.ts
git commit -m "feat: la mail del posto libero arriva a tutta la lista"
```

---

### Task 4: Conferma in transazione

**Files:**
- Create: `functions/src/piano/confermaAttesa.ts`
- Test: `functions/src/piano/confermaAttesa.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `motivoPosto`, `intervalloAncoraLibero` da `functions/src/piano/postiLiberi.ts`, `documentoCane` se è esportato da `gestisciPrenotazione.ts`. Se non è esportato, duplicare il minimo di campi cane non è permesso: esporta `documentoCane` e usalo.
- Produces:

```ts
export type EsitoConferma =
  | { ok: true, esito: 'confermato', appointmentId: string, dogId: string }
  | { ok: true, esito: 'visto', motivo: 'libero' | 'passato' | 'occupato' | 'non_ci_sta' }
  | { ok: true, esito: 'rifiutato' | 'restato' | 'uscito' }
  | { ok: true, esito: 'occupato' }
  | { ok: false, errore: 'token' | 'spento' }

export function confermaAttesaPer(input: {
  salonId: string
  token: string
  azione: 'leggi' | 'conferma' | 'rifiuta' | 'resta' | 'esci'
  adesso: Date
}): Promise<EsitoConferma>
```

- [ ] **Step 1: Write the failing test**

Con il posto libero e la durata che ci sta, `conferma` scrive una visita `programmato` in `salons/{id}/appointments`, toglie l’iscritto (`attivo: false`) e crea `avvisiAttesa` con il nome del cane, il trattamento e il nome del cane disdetto. Una seconda `conferma` dello stesso token riceve `occupato` e non scrive una seconda visita.

Se email e nome del cane coincidono con un cane già in `dogs`, `dogId` è quello e non nasce un documento cane nuovo.

`rifiuta` con posto libero restituisce `rifiutato` e lascia `attivo: true`. `esci` mette `attivo: false`. `resta` lascia `attivo: true`. `leggi` non scrive nulla e restituisce `{ ok: true, esito: 'visto', motivo: 'libero' }` quando il posto è libero. Token sconosciuto: `{ ok: false, errore: 'token' }`. Servizio spento: `{ ok: false, errore: 'spento' }`.

Il test del non ci sta: `conferma` quando la durata sfora il prossimo appuntamento restituisce `occupato` e non scrive la visita.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/confermaAttesa.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

La callable è pubblica, il token è il segreto. In transazione rileggi gli appuntamenti e chiama `intervalloAncoraLibero` sull’intervallo `inizio` → `inizio + durataMin`. Se non è libero, `occupato`. Se è libero e l’azione è `conferma`, scrivi cane se serve e visita con `status: 'programmato'`, `start` e `end` in millisecondi, `services` con il `servizioId`. Poi `attivo: false` e l’avviso. `rifiuta` e `resta` non scrivono visite. `esci` mette `attivo: false`.

Le regole: `attesa`, `offerteAttesa` e `avvisiAttesa` sono leggibili e scrivibili dai membri del salone. Il pubblico non le scrive. La callable usa l’admin SDK.

Registra la callable in `functions/src/index.ts` accanto a `gestisciPrenotazione`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/confermaAttesa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/confermaAttesa.ts functions/src/piano/confermaAttesa.test.ts functions/src/index.ts functions/src/piano/gestisciPrenotazione.ts firestore.rules
git commit -m "feat: confermare il posto scrive la visita, la seconda trova occupato"
```

---

### Task 5: Sito

**Files:**
- Modify: `hosting/s/pagina.js`
- Test: il test già usato per la pagina pubblica. Cerca `pagina.js` nei test e aggiorna quello. Se non c’è un test del DOM, aggiungi `hosting/s/paginaAttesa.test.ts` che importa le funzioni pure estratte, non il DOM intero.

**Interfaces:**
- Consumes: `settimanaPiena`, `campiMancanti`. Estrai da `pagina.js` due funzioni pure in `src/lib/listaAttesaPagina.ts` se il file della pagina non è importabile dai test: `mostraPulsante(giorniConOrari: readonly string[], settimana): boolean` che è `settimanaPiena`, e `campiDaChiedere`.
- Produces: il pulsante «Lista d’attesa» sulla settimana piena, e dopo il clic solo i campi mancanti più il consenso. Il link `?attesa=` mostra Conferma, Rifiuta, oppure la domanda se restare.

- [ ] **Step 1: Write the failing test**

Settimana senza orari: il pulsante c’è. Settimana con un orario: il pulsante non c’è, anche se un’altra settimana del mese è piena il pulsante di quella piena c’è e l’altra no. Con nome ed email già messi, i campi chiesti sono solo cellulare e nome dell’animale. Non compaiono razza e foto.

Per il link, un test della funzione che sceglie la schermata:

```ts
export function schermataAttesa(motivo: MotivoPosto): 'conferma' | 'resta'
```

`libero` → `conferma`. `occupato`, `non_ci_sta` e `passato` → `resta`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/listaAttesa.test.ts`
Expected: FAIL su `schermataAttesa` finché non c’è. Poi il test della pagina.

- [ ] **Step 3: Implement**

Sul calendario, per la settimana visibile che è piena, bottone «Lista d’attesa». Il clic mostra solo `campiMancanti`, più la casella del consenso. Senza consenso non si invia. L’invio chiama una callable `iscrivitiAttesa` che rifiuta se il servizio è spento o il consenso manca, e scrive `attesa` con la durata di `scegliCatalogo`.

La pagina con `?attesa=` chiama `confermaAttesa` in lettura prima: aggiungi l’azione `leggi` a `confermaAttesaPer` che non scrive e restituisce il motivo. Poi i bottoni chiamano `conferma`, `rifiuta`, `resta` o `esci`. Testi italiani come nella specifica. Inglese e spagnolo sulla stessa pagina, con la lingua già scelta dal sito.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/listaAttesa.test.ts functions/src/piano/confermaAttesa.test.ts`
Expected: PASS. Aggiungi un test di `iscrivitiAttesa` spento che restituisce errore `spento` e non scrive.

- [ ] **Step 5: Commit**

```bash
git add hosting/s/pagina.js src/lib/listaAttesa.ts src/lib/listaAttesa.test.ts functions/src/piano/confermaAttesa.ts functions/src/index.ts
git commit -m "feat: dal sito ci si iscrive solo sulla settimana piena"
```

---

### Task 6: Home, Animali, più

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Create: `src/pages/AttesaPage.tsx` se l’elenco non sta in un foglio. Preferisci una pagina `AttesaPage` aperta dal più e dalla linguetta.
- Test: `src/pages/HomePage.test.tsx`, `src/pages/shellPages.test.tsx`, un test della linguetta in `src/pages/DogsPage` se c’è già `DogsPage` coperto da un test. Altrimenti `src/pages/AttesaPage.test.tsx`.

**Interfaces:**
- Consumes: il contenitore `data-posto="conferma-attesa"` del piano precedente. Documenti `avvisiAttesa` del giorno di Roma corrente.
- Produces: la riga nel contenitore. La linguetta. La voce del più. Il modulo di registrazione.

- [ ] **Step 1: Write the failing test**

Home, con un avviso di oggi: il testo «Fluffy, bagno, ha confermato e verrà al posto di Rex, che ha disdetto.» sta dopo il testo degli auguri e prima del promemoria. Un avviso di ieri non si vede.

DogsPage con il servizio acceso: c’è la linguetta «In attesa» e non «Archivio». Con il servizio spento: c’è «Archivio» e non «In attesa».

Il più, servizio acceso, ha un bottone «Lista d’attesa». Spento, non ce l’ha. Il collaboratore lo vede. Il modulo senza trattamento non salva: il test chiama `iscrizioneManualeValida` e si aspetta falso se `servizioId` è vuoto.

```ts
export function iscrizioneManualeValida(input: { nome: string, phone: string, email: string, nomeCane: string, servizioId: string, taglia: string, specie: string }): boolean
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/shellPages.test.tsx src/lib/listaAttesa.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

La riga è una linea, padding verticale 4, nessun bottone. La i di Strumenti per questo servizio, rimasta nel piano precedente con il testo ponte, diventa: «Quando una settimana non ha orari, sul sito ci si può mettere in lista. Se si libera un posto la mail arriva a tutti. Il primo che conferma, e il cui trattamento ci sta, entra in agenda. Tu vedi solo la conferma. Dal più puoi vedere la lista e aggiungere chi è lì con te.»

`AttesaPage` elenca cane e trattamento, ha Togli, e il modulo con i campi della firma. Salva su `attesa` con `attivo: true` e la durata di `scegliCatalogo`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/shellPages.test.tsx src/lib/listaAttesa.test.ts src/pages/strumenti.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/DogsPage.tsx src/pages/ShellFrame.tsx src/pages/shellPages.test.tsx src/pages/AttesaPage.tsx src/lib/listaAttesa.ts src/lib/listaAttesa.test.ts src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat: in home la conferma, in Animali chi aspetta"
```

---

## Copertura

| Pezzo della specifica | Task |
| --- | --- |
| Settimana piena, campi mancanti, ora passata, durata | 1 |
| Mail a tutti, una volta, non sul non venuto tardivo | 2 e 3 |
| Testo della mail e link personale | 3 |
| Conferma che scrive la visita, seconda conferma occupata, cane già in salone | 4 |
| Rifiuta resta, No esce, trattamento che non ci sta | 4 e 5 |
| Pulsante sul sito e consenso | 5 |
| Riga in home, più, linguetta, archivio che torna | 6 |
