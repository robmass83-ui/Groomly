# Testi di mail e WhatsApp — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le mail, i WhatsApp e le pagine di risposta usano i testi della specifica, in italiano, inglese e spagnolo, senza promettere pagine o risposte che non esistono.

**Architecture:** Le frasi restano in `src/i18n/emailHtml.ts` e `src/lib/messaggiManuali.ts`. `emailMessaggio` riceve cliente e cane separati, il salone e un flag `rispondi`. La coda conserva `nomeCliente` e, sul promemoria, `inizio`. Le pagine dopo Confermo e Non posso escono da una funzione pura, nella lingua dei clienti del salone.

**Tech Stack:** TypeScript, Vitest (`npm test`), Cloud Functions che chiamano `emailMessaggio` e `postBrevoHtml`.

## Global Constraints

- Specifica: `docs/superpowers/specs/2026-10-28-testi-mail-whatsapp-design.md`. Le frasi si copiano da lì, non si riscrivono.
- Mittente: Groomly, `noreply@groomlyapp.it`. Dentro la frase, se il nome del salone manca, il soggetto è «il salone» / «the salon» / «la peluquería». Dopo una preposizione l’italiano è «del salone», «al salone», «dal salone». Mai «di il salone» e mai la parola Groomly al posto del salone.
- Senza nome del cliente il saluto è «Ciao,» «Hi,» o «Hola,», senza spazio prima della virgola.
- Senza nome del cane l’oggetto tiene solo la cornice scritta nella specifica.
- Pulsanti che restano: proposta (Confermo / Non posso, Confirm / I can't make it, Confirmo / No puedo), recensione, posto libero, conferma email, password, invito. Gli altri non hanno `<a>` di azione. Il silenzio Pro resta un link.
- La nota «rispondi, arriva al salone» e il periodo della recensione che invita a rispondere ci sono solo se `rispondi` è true. «Posto liberato» ha sempre la sua nota, diversa.
- Sotto «Richiesta ricevuta» resta `riepilogoRicevuta`. Poi la riga salone · cane, solo con i valori veri.
- «Richiesta scaduta» e «Appuntamento disdetto» cambiano testo e non si inviano.
- Il WhatsApp non aggiunge «Fatto con Groomly».
- Una riga di coda vecchia, senza `nomeCliente` e senza `inizio`, parte lo stesso.
- Non si pubblica l’app a metà di questo piano.

---

### Task 1: WhatsApp senza firma

**Files:**
- Modify: `src/lib/messaggiManuali.ts`
- Test: `src/lib/messaggiManuali.test.ts`

**Interfaces:**
- Consumes: `Lingua` da `src/i18n/lingua.ts`. `renderTemplate` resta per pronto e auguri.
- Produces: `testoMessaggio(lingua, tipo, valori: { nome: string; cane: string; servizio: string; quando: string }): string`. Nessuna riga di firma. `firmaMessaggio` si può lasciare esportata: i test non la pretendono più nel testo.

- [ ] **Step 1: Write the failing test**

Sostituire l’attesa della firma in `src/lib/messaggiManuali.test.ts` e aggiungere:

```ts
it('il promemoria italiano saluta e non firma', () => {
  const testo = testoMessaggio('it', 'promemoria', {
    nome: 'Giulia', cane: 'Rex', servizio: 'bagno', quando: 'martedì 4 novembre alle 10:30',
  })
  expect(testo).toBe('Ciao Giulia, ti ricordiamo l’appuntamento di Rex per bagno, martedì 4 novembre alle 10:30. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!')
  expect(testo).not.toContain('Fatto con Groomly')
})

it('senza nome, servizio o orario la frase resta intera', () => {
  expect(testoMessaggio('it', 'promemoria', { nome: '', cane: 'Rex', servizio: '', quando: '' }))
    .toBe('Ciao, ti ricordiamo l’appuntamento di Rex. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!')
  expect(testoMessaggio('en', 'conferma', { nome: '', cane: 'Rex', servizio: '', quando: '' }))
    .toBe('Hi, could you confirm Rex\'s appointment? Just reply here. Thank you!')
  expect(testoMessaggio('es', 'richiamo', { nome: 'Ana', cane: 'Rex', servizio: '', quando: 'martes 4 de noviembre a las 10:30' }))
    .toBe('Hola Ana, ya ha pasado un tiempo: es un buen momento para volver a traer a Rex, martes 4 de noviembre a las 10:30. Escríbenos por aquí para reservar. ¡Hasta pronto!')
})
```

Le altre quattro frasi piene, nelle tre lingue, sono le tabelle WhatsApp della specifica. Aggiungere un’asserzione `toBe` per ciascuna, con i valori Giulia, Rex, bagno e «martedì 4 novembre alle 10:30» (in inglese e spagnolo i valori già nella lingua, perché il chiamante formatta `quando`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/messaggiManuali.test.ts`
Expected: FAIL. Il testo attuale contiene «Fatto con Groomly» oppure non ha «Se hai un imprevisto».

- [ ] **Step 3: Write minimal implementation**

In `fraseMessaggio` / `frasePulita`, comporre le frasi della specifica. Tagli:

- nome vuoto: il saluto è `Ciao,` / `Hi,` / `Hola,`.
- servizio vuoto: togliere ` per ${servizio}`, ` for ${servizio}`, ` para ${servizio}` e ` (${servizio})`.
- quando vuoto: togliere `, ${quando}` oppure ` ${quando}` prima del punto o del punto interrogativo.
- `testoMessaggio` ritorna solo la frase, senza `\n\n` e senza `firmaMessaggio`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/messaggiManuali.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/messaggiManuali.ts src/lib/messaggiManuali.test.ts
git commit -m "I WhatsApp salutano e non portano più la firma."
```

---

### Task 2: Mail al cliente, con cliente e cane separati

**Files:**
- Modify: `src/i18n/emailHtml.ts`
- Modify: `src/i18n/emailHtml.test.ts`
- Modify: `functions/src/postaHtml.ts`
- Modify: `functions/src/piano/gestisciPrenotazione.ts`
- Modify: `functions/src/piano/inviaRichiesta.ts`
- Modify: `functions/src/piano/inviaCoda.ts`
- Modify: `functions/src/campioneEmail.ts`
- Modify: `functions/src/piano/promemoriaEmail.ts`
- Modify: `functions/src/index.ts`
- Test: `src/i18n/emailHtml.test.ts`

**Interfaces:**
- Consumes: `riepilogoRicevuta` resta. `nomeSalone` e `linguaClientiSalon` restano.
- Produces: `emailMessaggio(lingua, tipo, dati)` con

```ts
dati: {
  cliente?: string
  cane?: string
  salone?: string
  ruolo?: 'socio' | 'collaboratore'
  url?: string
  urlRifiuta?: string
  quando?: string
  invece?: string
  entro?: string
  silenzio?: string
  scheda?: string
  rispondi?: boolean
  account?: string
}
```

`nome` non c’è più. `spedisciHtml` accetta lo stesso oggetto e il `replyTo` che ha già.

- [ ] **Step 1: Write the failing test**

In `src/i18n/emailHtml.test.ts` aggiornare `SENZA_PULSANTI` con `promemoria`, `pronto`, `auguri`, `disdetta`. `rifiuto` è già senza pulsante quando l’url non è la pagina pubblica: il test nuovo non passa `url` per il rifiuto. `SILENZIO` diventa «Non voglio più ricevere queste email», «I don't want to receive these emails any more», «No quiero recibir más estos correos».

Aggiungere:

```ts
const pieni = {
  cliente: 'Giulia',
  cane: 'Rex',
  salone: 'Canespa',
  quando: 'martedì 4 novembre, 10:30–11:30',
  invece: 'lunedì 3 novembre alle 09:00',
  entro: 'le 18:00',
  rispondi: true,
}

it('la conferma saluta, non ha pulsante e non dice di arrivare puntuali', () => {
  const mail = emailMessaggio('it', 'conferma', pieni)
  expect(mail.oggetto).toBe('Appuntamento confermato per Rex')
  expect(mail.html).toContain('Ciao Giulia, buone notizie: Canespa ha confermato l’appuntamento di Rex, martedì 4 novembre, 10:30–11:30.')
  expect(mail.html).not.toContain('puntuali')
  expect(mail.html).not.toContain('>Vedi')
  expect(mail.html).toContain('Hai una domanda?')
  expect(mail.html).toContain('Canespa · Rex')
})

it('senza rispondi-a non promette la risposta', () => {
  const mail = emailMessaggio('it', 'conferma', { ...pieni, rispondi: false })
  expect(mail.html).not.toContain('Hai una domanda?')
  const recensione = emailMessaggio('it', 'recensione', { ...pieni, rispondi: false, url: 'https://groomlyapp.it/s/x' })
  expect(recensione.html).not.toContain('rispondi a questa email')
  expect(recensione.html).toContain('Lascia una recensione')
})

it('il posto liberato ha la nota della pagina, non quella della risposta', () => {
  const mail = emailMessaggio('it', 'liberato', pieni)
  expect(mail.html).toContain('Puoi inviare una nuova richiesta dalla pagina del salone.')
  expect(mail.html).not.toContain('Hai una domanda?')
})

it('senza nome del salone non scrive Groomly né «di il»', () => {
  const mail = emailMessaggio('it', 'promemoria', { cliente: 'Giulia', cane: 'Rex', quando: 'martedì 4 novembre alle 10:30', rispondi: false })
  expect(mail.html).toContain('il salone ti ricorda')
  expect(mail.html).not.toContain('Groomly ti ricorda')
  const disdetta = emailMessaggio('it', 'disdetta', { cliente: 'Giulia', cane: 'Rex', rispondi: false })
  expect(disdetta.html).toContain('dal salone')
  expect(disdetta.html).not.toContain('di il')
  expect(disdetta.html).not.toContain('<a ')
})

it('il promemoria mette il giorno nella frase e non ha pulsante', () => {
  const mail = emailMessaggio('it', 'promemoria', { ...pieni, quando: 'martedì 4 novembre alle 10:30' })
  expect(mail.oggetto).toBe('Ci vediamo presto, Rex!')
  expect(mail.html).toContain('il prossimo appuntamento di Rex, martedì 4 novembre alle 10:30')
  expect(mail.html).not.toContain('nel promemoria')
  expect(mail.html).toContain('Non voglio più ricevere queste email')
})

it('senza cliente il saluto è Ciao, e senza cane l’oggetto resta intero', () => {
  const mail = emailMessaggio('it', 'pronto', { cliente: '', cane: '', salone: 'Canespa', rispondi: false })
  expect(mail.oggetto).toBe('È pronto')
  expect(mail.html).toContain('Ciao, abbiamo finito')
})
```

Per ogni tipo e ogni lingua, un’asserzione sull’oggetto e su una frase del corpo presi dalle tabelle della specifica (richiesta, Pro, testi non attivi). La proposta, con `url` e `urlRifiuta`, contiene «Confermo» e «Non posso» (e le coppie inglesi e spagnole) e non contiene «Rifiuta» come etichetta del secondo pulsante.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/emailHtml.test.ts`
Expected: FAIL. Oggetto o corpo vecchi, oppure `nome` ancora obbligatorio nel tipo.

- [ ] **Step 3: Write minimal implementation**

Sostituire `OGGETTI`, `TESTI`, `corpoConferma`, `corpoProposta` e `corpoRifiuto` con le frasi della specifica. Il corpo si compone dai campi `cliente`, `cane`, `salone`, `quando`, `invece`, `entro`.

`saloneNellaFrase(lingua, nome, ruolo)` con `ruolo` in `'soggetto' | 'di' | 'a' | 'da' | 'dopoDi'`:

- nome pieno: il nome, escapato, in ogni ruolo.
- nome vuoto, soggetto: il salone / the salon / la peluquería.
- nome vuoto, `di`: del salone / of the salon / de la peluquería.
- nome vuoto, `a`: al salone / to the salon / a la peluquería.
- nome vuoto, `da`: dal salone / from the salon / de la peluquería.

Il chiamante sceglie il ruolo in base alla frase, non concatena «di » + «il salone».

`saluto(lingua, cliente)`: cliente vuoto → `Ciao,` / `Hi,` / `Hola,`. Altrimenti `Ciao ${cliente},`.

Pulsanti: nessuno per ricevuta, conferma, rifiuto, liberato, scadenza, disdetta, promemoria, pronto, auguri. Proposta: due ancore. Recensione e attesa: un’ancora, solo se `url` è passato. Senza url il pulsante non si disegna (niente fallback a `/azione` per questi tipi). Verifica, reset e invito tengono il pulsante: il loro testo arriva nel task 3, ma il ramo dei pulsanti non deve rompersi. Finché il task 3 non cambia quelle frasi, verifica/reset/invito possono ancora usare il corpo vecchio se il test di questo task non li asserisce. Non lasciare `nome` nel tipo: verifica non usa cliente; reset userà `account` nel task 3. In questo task `account` è accettato e ignorato dalle mail al cliente.

Nota: se `rispondi` è true e il tipo è ricevuta, conferma, proposta o rifiuto, la nota è quella della specifica. Liberato ha sempre la nota della pagina. I servizi Pro non hanno la nota «puoi rispondere»; hanno solo il link di silenzio, con il testo nuovo.

Riga sotto il testo: `salone` vero e `cane`, uniti da ` · `, solo i pezzi non vuoti. Non usare il fallback «il salone» in questa riga.

Oggetto con cane vuoto: le cornici della specifica («Appuntamento confermato», «È pronto», «Ci vediamo presto!», e le altre elencate lì).

Aggiornare ogni chiamante di `emailMessaggio` nello stesso commit, perché `nome` esce dal tipo:

- `inviaMailRichiesta`: `cliente: richiesta.nome`, `cane: richiesta.cane`, `salone`, tempi come oggi. `rispondi: true` solo dopo aver letto l’email di `accounts/{salonId}` e averla passata come `replyTo` a `spedisciHtml`. Se l’email non è valida, `rispondi: false` e niente `replyTo`.
- `inviaRichiesta`: `cliente: ingresso.nome`, `cane`, `salone`, `scheda` come oggi, e lo stesso `rispondi` / `replyTo`.
- `inviaCoda`: `cane: riga.nomeCane`, `cliente: ''`, `rispondi: Boolean(replyTo)`, `salone` dal nome del profilo se la funzione lo riceve già, altrimenti `replyTo.name` quando non è la stringa `Groomly`. Il task 3 mette `riga.nomeCliente` e `quando`.
- `campioneEmail`: `cliente: 'Luna'`, `cane: 'Luna'`, `salone: 'Salone Demo'`.
- `promemoriaEmail`: togliere `nome: voce.giorno`. Quell’invio è chiamato con `voci: []` e non è la coda. Passare `salone` dal reply-to solo se il nome non è `Groomly`, e `rispondi: Boolean(input.replyTo)`.
- `index.ts` per il reset: `account: email` al posto di `nome`. Il corpo della password si sostituisce nel task 4. Fino ad allora la frase vecchia, se citava `nome`, legge `account` senza cambiare le parole.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/emailHtml.test.ts src/lib/paginaPubblica.test.ts functions/src/piano/gestisciPrenotazione.test.ts`
Expected: PASS. Se un test vecchio cerca «Conferma» / «Rifiuta» o «Si prega», aggiornare quel test al testo nuovo nella stessa modifica. Non allentare l’asserzione: deve cercare la frase nuova.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts functions/src/postaHtml.ts functions/src/piano/gestisciPrenotazione.ts functions/src/piano/inviaRichiesta.ts functions/src/piano/inviaCoda.ts functions/src/campioneEmail.ts functions/src/piano/promemoriaEmail.ts functions/src/index.ts
git commit -m "Le mail al cliente salutano e rispondono al salone."
```

---

### Task 3: Coda Pro con nome del cliente e orario del promemoria

**Files:**
- Modify: `src/lib/codaEmail.ts`
- Modify: `src/lib/righeServizio.ts`
- Modify: `functions/src/piano/inviaCoda.ts`
- Modify: `functions/src/piano/giraCoda.ts`
- Test: `src/lib/codaEmail.test.ts`
- Test: `src/lib/righeServizio.test.ts`
- Test: `functions/src/piano/inviaCoda.test.ts`

**Interfaces:**
- Consumes: `emailMessaggio` del task 2, con `cliente`, `cane`, `salone`, `quando`, `rispondi`.
- Produces: `RigaCoda` con `nomeCliente: string` e `inizio: string | null`. `inizio` è valorizzato solo sul promemoria. `CaneMinuto` e `VisitaPromemoria` guadagnano `nomeCliente?: string`. `inviaCoda` formatta `inizio` con la lingua ricevuta.

- [ ] **Step 1: Write the failing test**

In `src/lib/codaEmail.test.ts`, una riga letta da `codaDaImpostazioni` senza i campi nuovi ha `nomeCliente: ''` e `inizio: null`. Una riga che li ha li conserva.

In `src/lib/righeServizio.test.ts`, `righePromemoria` su una visita con `start` e `nomeCliente: 'Giulia'` scrive `inizio` ISO di quello start e `nomeCliente: 'Giulia'`. Senza `nomeCliente`, la riga ha `nomeCliente: ''`.

In `functions/src/piano/inviaCoda.test.ts`, una riga promemoria con `nomeCliente: 'Giulia'`, `nomeCane: 'Rex'`, `inizio` alle 09:00 UTC del 2026-11-04 e `replyTo` `{ email: 'sala@salone.it', name: 'Canespa' }` produce HTML che contiene «Ciao Giulia» e «Rex,» seguito dal giorno in italiano, e il body Brevo ha `replyTo.email === 'sala@salone.it'`. Una riga senza `nomeCliente` e senza `inizio` contiene «Ciao,» e non contiene «nel promemoria». Senza `replyTo`, l’HTML non contiene «rispondi a questa email» e il body non ha `replyTo`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/codaEmail.test.ts src/lib/righeServizio.test.ts functions/src/piano/inviaCoda.test.ts`
Expected: FAIL. `nomeCliente` o `inizio` non sono sul tipo.

- [ ] **Step 3: Write minimal implementation**

`codaDaImpostazioni` legge `nomeCliente` e `inizio` se sono stringhe, altrimenti `''` e `null`.

`righePromemoria` copia `nomeCliente` dalla visita e `inizio: visita.start.toISOString()`. Pronto, auguri, recensione e attesa copiano `nomeCliente` dal cane o dalla visita e lasciano `inizio: null`. `unisciRiga` già sostituisce la riga in coda con quella nuova: i campi nuovi si aggiornano da soli.

`CaneMinuto.nomeCliente` arriva da `contact.name` in `caneDi`. `VisitaMinuto` prende il nome del cliente dal cane con lo stesso `dogId`, in `righeDelMinuto`, prima di chiamare `righePromemoria`.

`inviaCoda`, per ogni riga:

```ts
const quando = riga.tipo === 'promemoria' && riga.inizio
  ? dataConOra(lingua, new Date(riga.inizio))
  : ''
const mail = emailMessaggio(lingua, riga.tipo, {
  cliente: riga.nomeCliente,
  cane: riga.nomeCane,
  salone: replyTo?.name && replyTo.name !== 'Groomly' ? replyTo.name : salonePassato,
  quando,
  url: riga.url,
  silenzio: ...,
  rispondi: Boolean(replyTo),
})
```

`giraCoda` e `inviaSubitoRiga` passano il nome del salone anche quando il `replyTo` manca. Aggiungere a `inviaCoda` il campo `salone: string`, il nome del profilo. Non usare `replyTo.name` come unico modo per avere il salone. Se `replyTo.name` è il fallback `'Groomly'` di oggi, ignorarlo e usare `salone`.

`dataConOra` è in `src/i18n/format.ts`. Per il promemoria la specifica vuole «martedì 4 novembre alle 10:30»: è quello che `dataConOra('it', data)` produce, con la maiuscola del giorno. Va bene.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/codaEmail.test.ts src/lib/righeServizio.test.ts functions/src/piano/inviaCoda.test.ts src/i18n/emailHtml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/codaEmail.ts src/lib/codaEmail.test.ts src/lib/righeServizio.ts src/lib/righeServizio.test.ts functions/src/piano/inviaCoda.ts functions/src/piano/inviaCoda.test.ts functions/src/piano/giraCoda.ts
git commit -m "Il promemoria porta il giorno e il nome di chi accompagna il cane."
```

---

### Task 4: Mail dell’account

**Files:**
- Modify: `src/i18n/emailHtml.ts`
- Modify: `functions/src/index.ts` (le chiamate a `emailMessaggio` per verifica e reset)
- Modify: `functions/src/salonInvite.ts`
- Modify: `functions/src/piano/emailEliminazione.ts`
- Test: `src/i18n/emailHtml.test.ts`
- Test: `functions/src/salonInvite.test.ts`
- Test: `functions/src/piano/eliminaAccount.test.ts`

**Interfaces:**
- Consumes: `emailMessaggio` con `account`, `salone`, `ruolo`. `etichettaRuolo` resta.
- Produces: oggetti e corpi della sezione «Email dell’account» della specifica. `emailEliminazione(nome: string)` ritorna `{ oggetto, html }` con il testo nuovo.

- [ ] **Step 1: Write the failing test**

```ts
it('la password dice l’indirizzo e che si può ignorare', () => {
  const mail = emailMessaggio('it', 'reset', { account: 'ada@salone.it', url: 'https://groomlyapp.it/azione/?mode=resetPassword' })
  expect(mail.oggetto).toBe('Reimposta la tua password')
  expect(mail.html).toContain('account ada@salone.it')
  expect(mail.html).toContain('Se non sei stato tu')
  expect(mail.html).toContain('Reimposta la password')
})

it('l’invito non ha la nota sul salone sconosciuto', () => {
  const mail = emailMessaggio('it', 'invito', { salone: 'Canespa', ruolo: 'collaboratore', url: 'https://groomlyapp.it/invito' })
  expect(mail.oggetto).toBe('Canespa ti invita su Groomly')
  expect(mail.html).toContain('come Collaboratore')
  expect(mail.html).not.toContain('Se non conosci')
})

it('senza salone l’invito ha l’oggetto di riserva', () => {
  expect(emailMessaggio('it', 'invito', { ruolo: 'socio', url: 'https://groomlyapp.it/invito' }).oggetto).toBe('Sei invitato su Groomly')
  expect(emailMessaggio('en', 'invito', { url: 'https://groomlyapp.it/invito' }).oggetto).toBe('You’re invited to Groomly')
  expect(emailMessaggio('es', 'invito', { url: 'https://groomlyapp.it/invito' }).oggetto).toBe('Te invitan a Groomly')
})
```

In `eliminaAccount.test.ts` l’oggetto atteso diventa «Il tuo account Groomly è stato eliminato» e l’HTML contiene «Grazie per aver lavorato con noi» e `info@groomlyapp.it`. Con nome vuoto l’HTML contiene «dell’account» senza «di il».

Le frasi inglesi e spagnole di verifica, reset, invito ed eliminazione sono quelle della specifica: un `toContain` per lingua su ciascuna.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/emailHtml.test.ts functions/src/salonInvite.test.ts functions/src/piano/eliminaAccount.test.ts`
Expected: FAIL sull’oggetto vecchio «Reimposta la password» o «Sei invitato su Groomly» quando il salone c’è.

- [ ] **Step 3: Write minimal implementation**

Corpi e oggetti dalla specifica. Verifica: niente nota «se non hai creato tu l’account». Reset: l’avviso sta nel corpo, `account` è l’email. Invito: «come ${etichettaRuolo}». Eliminazione: stesso testo nel suo HTML, con il logo che c’è già. `sendPasswordResetEmail` passa `account: email`, non `nome`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/emailHtml.test.ts functions/src/salonInvite.test.ts functions/src/piano/eliminaAccount.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts functions/src/index.ts functions/src/salonInvite.ts functions/src/salonInvite.test.ts functions/src/piano/emailEliminazione.ts functions/src/piano/eliminaAccount.test.ts
git commit -m "Le mail dell'account danno il benvenuto e il saluto."
```

---

### Task 5: Pagine di risposta e richiesta inviata

**Files:**
- Modify: `functions/src/piano/rispondiRichiesta.ts`
- Modify: `hosting/s/pagina.js`
- Modify: `hosting/salone/inviata.html`
- Test: `functions/src/piano/rispondiRichiesta.test.ts`
- Test: `src/lib/paginaPubblica.test.ts`

**Interfaces:**
- Consumes: `linguaClientiSalon` da `functions/src/postaHtml.ts`. `nomeSalone` da `gestisciPrenotazione.ts`.
- Produces:

```ts
export function paginaRisposta(
  lingua: Lingua,
  esito: 'confermato' | 'liberato' | 'nonValido',
  dati: { salone?: string; cane?: string; quando?: string },
): string
```

Il titolo è la prima frase, fino al punto. Il resto è il paragrafo. `rispondiRichiestaHttp` la usa dopo aver letto la lingua del salone. La GET continua a non scrivere prima del POST già in produzione: non toccare quel cancello.

- [ ] **Step 1: Write the failing test**

Creare `functions/src/piano/rispondiRichiesta.test.ts`:

```ts
it('la conferma in italiano mette salone, cane e ora', () => {
  const html = paginaRisposta('it', 'confermato', {
    salone: 'Canespa', cane: 'Rex', quando: 'martedì 4 novembre alle 10:30',
  })
  expect(html).toContain('<title>Appuntamento confermato</title>')
  expect(html).toContain('L’appuntamento di Rex da Canespa è confermato per martedì 4 novembre alle 10:30.')
})

it('il link non valido in inglese non è solo italiano', () => {
  const html = paginaRisposta('en', 'nonValido', {})
  expect(html).toContain('This link is no longer valid.')
})
```

Stesse asserzioni per `liberato` in spagnolo («De acuerdo, el hueco ha quedado libre») e per il titolo inglese «Appointment confirmed».

In `src/lib/paginaPubblica.test.ts` la stringa `ok` e la `nota` diventano quelle della specifica, nelle tre lingue. Il test che oggi cerca «Richiesta inviata a {{nome}}. Non è ancora una prenotazione.» va aggiornato alla frase «Grazie, richiesta inviata a {{nome}}».

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/rispondiRichiesta.test.ts src/lib/paginaPubblica.test.ts`
Expected: FAIL. `paginaRisposta` non esiste, oppure il js ha la frase vecchia.

- [ ] **Step 3: Write minimal implementation**

`paginaRisposta` sceglie titolo e paragrafo dalle tre righe della tabella «Pagine del sito» della specifica e riempie i segnaposto. Salone vuoto: stesso `saloneNellaFrase` del task 2, ruolo `da` nella conferma («da Canespa» / «at Canespa» / «en Canespa»). Se il nome manca: «dal salone», «at the salon», «en la peluquería».

`rispondiRichiestaHttp` legge `linguaClientiSalon(salonId)` e passa salone, cane e «giorno alle ora» già calcolati.

`hosting/s/pagina.js`: chiavi `ok` e `nota` per `it`, `en`, `es`.
`hosting/salone/inviata.html`: i tre blocchi `data-lang` usano la stessa frase `ok`, senza la riga vecchia «Il salone la conferma».

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/rispondiRichiesta.test.ts src/lib/paginaPubblica.test.ts src/i18n/emailHtml.test.ts src/lib/messaggiManuali.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/rispondiRichiesta.ts functions/src/piano/rispondiRichiesta.test.ts hosting/s/pagina.js hosting/salone/inviata.html src/lib/paginaPubblica.test.ts
git commit -m "Le pagine dopo il link e dopo l'invio parlano nelle tre lingue."
```
