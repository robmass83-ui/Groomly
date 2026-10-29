# Richieste di prenotazione in app — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare in home ogni richiesta online ancora nuova, e da lì accettarla, proporre un altro orario o rifiutarla, creando l’appuntamento e, solo quando serve, il profilo in Nuovi.

**Architecture:** Le regole stanno in funzioni pure (`tempoRisposta`, `candidatiRichiesta`, `pianoRichiesta`). Il server, con il permesso del membro del salone o con il token del cliente, scrive richiesta, appuntamento e profilo. La home ascolta le richieste `nuova` e apre un riquadro. Il posto si blocca solo con l’appuntamento: definitivo se si accetta l’ora chiesta, provvisorio fino a `scadeIl` se si propone un altro orario.

**Tech Stack:** React, Vitest, Firestore, Cloud Functions `onCall` / `onRequest` / `onSchedule`, Brevo tramite `postBrevoHtml`, token in `src/theme/tokens.css`.

## Global Constraints

- Orari in Europe/Rome. Durata pubblica 60 minuti, inizi all’ora.
- Una richiesta `nuova` non occupa il posto. Due clienti possono chiedere la stessa ora. Accetta scrive comunque l’appuntamento.
- Proponi offre solo un orario libero in quel momento. Quell’orario resta occupato fino a `scadeIl`, poi torna libero subito, anche prima della pulizia.
- Il profilo nuovo nasce all’accettazione dell’ora chiesta, oppure quando il cliente conferma la proposta. Non nasce su un rifiuto né su una scadenza.
- `daRevisionare: true` tiene l’animale solo nel tab Nuovi. Il salvataggio della scheda lo toglie.
- Un deceduto non è selezionabile. Un archiviato (`non_in_cura`) sì: torna `attivo` solo quando l’appuntamento diventa definitivo.
- La mail della proposta parte prima di creare il provvisorio. Se non parte, la richiesta resta `nuova` e non c’è appuntamento.
- Conferma e Rifiuta del cliente usano il token già sulla richiesta, una volta sola, senza login.
- Tempi, da quando la mail parte, mai oltre l’inizio: stesso giorno 15 minuti, giorno dopo 1 ora, oltre 48 ore 24 ore, il caso in mezzo 1 ora.
- Testo dopo l’invio sul sito, italiano: «Richiesta inviata a CANESPA. Non è ancora una prenotazione.» e il resto della spec, senza verde da conferma. Inglese e spagnolo dicono la stessa cosa.
- Niente stringhe italiane fisse nei tsx. Icone Lucide, stroke 2. Colori solo dai token. Pulsanti alti almeno 44.
- Non riusare `RiquadroRichieste` né la card «Accetta {{nome}}». Non accendere `mostraPiani`.
- Non promettere una mail se `emailStato` non è `inviata`.

## File

- Create: `src/lib/tempoRisposta.ts` — finestra di risposta.
- Create: `src/lib/candidatiRichiesta.ts` — animali con lo stesso telefono o la stessa email.
- Create: `src/lib/pianoRichiesta.ts` — che documenti scrivere per ogni azione.
- Create: `src/components/piano/RigaRichieste.tsx` — card compatta in home.
- Create: `src/components/piano/RiquadroRichiesta.tsx` — riquadro al centro.
- Create: `functions/src/piano/scadiProposte.ts` — pulizia ogni cinque minuti.
- Modify: `src/lib/disponibilita.ts`, `src/lib/dogList.ts`, `src/types/models.ts`, `src/lib/firebaseMap.ts`, `src/data/firebase/client.ts`, `src/pages/HomePage.tsx`, `src/pages/DogsPage.tsx`, `src/pages/DogPage.tsx`, `src/pages/CalendarPage.tsx`, `src/components/calendar/WeekRows.tsx`, `src/components/domain/AppointmentRow.tsx`, `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/emailHtml.ts`, `hosting/s/pagina.js`, `src/lib/paginaPubblica.ts`, `functions/src/piano/gestisciPrenotazione.ts`, `functions/src/piano/postiLiberi.ts`, `functions/src/index.ts`.

Firme usate dai task dopo il 4:

```ts
export type SceltaAnimale = { tipo: 'nuovo' } | { tipo: 'esistente'; dogId: string }

export type ComandoRichiesta =
  | { azione: 'accetta'; scelta: SceltaAnimale }
  | { azione: 'proponi'; scelta: SceltaAnimale; giorno: string; ora: string }
  | { azione: 'rifiuta' }
  | { azione: 'confermaCliente' }
  | { azione: 'rifiutaCliente' }
  | { azione: 'scade' }

export interface RichiestaDoc {
  status: 'nuova' | 'accettata' | 'proposta' | 'rifiutata' | 'scaduta'
  token: string
  nome: string
  phone: string
  email: string
  cane: string
  razza: string
  specie: 'cane' | 'gatto' | 'altro'
  taglia: 'piccola' | 'media' | 'grande'
  foto: string[]
  start: string
  end: string
  sceltaAnimale?: 'nuovo' | string
  appointmentId?: string
  scadeIl?: string
}

export interface PianoRichiesta {
  ok: true
  richiesta: Partial<RichiestaDoc> & { status: RichiestaDoc['status'] }
  appuntamento: 'crea' | 'conferma' | 'cancella' | 'niente'
  cane: 'crea' | 'riattiva' | 'niente'
  mail: 'conferma' | 'proposta' | 'rifiuto' | 'scadenza' | 'nessuna'
  scadeIl?: string
  inizio?: string
  fine?: string
}
```

L’appuntamento provvisorio ha `status: 'programmato'`, `provvisorio: true`, `scadeIl`, `richiestaId`, `dogId` vuoto se il profilo non esiste ancora, `ospiteNome` con il nome dell’animale in quel caso. Il servizio è uno: `{ serviceId: 'prenotazione', name: 'Toelettatura', durationMin: 60, price: 0 }`.

---

### Task 1: Finestra di risposta

**Files:**
- Create: `src/lib/tempoRisposta.ts`
- Test: `src/lib/tempoRisposta.test.ts`

**Interfaces:**
- Consumes: `chiaveGiornoRoma`, `istanteRoma` da `src/lib/disponibilita.ts`
- Produces: `tempoRisposta(adesso: Date, inizio: Date): { minuti: number; scade: Date } | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { istanteRoma } from './disponibilita'
import { tempoRisposta } from './tempoRisposta'

describe('tempo di risposta', () => {
  it('15 minuti lo stesso giorno, 1 ora il giorno dopo, 24 ore oltre le 48, 1 ora in mezzo', () => {
    const stesso = tempoRisposta(istanteRoma('2026-10-28', '09:00'), istanteRoma('2026-10-28', '17:00'))
    expect(stesso?.minuti).toBe(15)
    expect(stesso?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '09:15').toISOString())

    const domani = tempoRisposta(istanteRoma('2026-10-28', '21:15'), istanteRoma('2026-10-29', '10:00'))
    expect(domani?.minuti).toBe(60)
    expect(domani?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '22:15').toISOString())

    const lontano = tempoRisposta(istanteRoma('2026-10-28', '09:00'), istanteRoma('2026-11-02', '10:00'))
    expect(lontano?.minuti).toBe(24 * 60)

    const mezzo = tempoRisposta(istanteRoma('2026-10-28', '21:00'), istanteRoma('2026-10-30', '09:00'))
    expect(mezzo?.minuti).toBe(60)
  })

  it('non supera l’inizio e rifiuta un orario già passato', () => {
    const corto = tempoRisposta(istanteRoma('2026-10-28', '16:50'), istanteRoma('2026-10-28', '17:00'))
    expect(corto?.scade.toISOString()).toBe(istanteRoma('2026-10-28', '17:00').toISOString())
    expect(tempoRisposta(istanteRoma('2026-10-28', '17:00'), istanteRoma('2026-10-28', '17:00'))).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tempoRisposta.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

```ts
import { chiaveGiornoRoma, istanteRoma } from './disponibilita'

function giornoDopo(giorno: string): string {
  return chiaveGiornoRoma(new Date(istanteRoma(giorno, '12:00').getTime() + 26 * 60 * 60 * 1000))
}

export function tempoRisposta(adesso: Date, inizio: Date): { minuti: number; scade: Date } | null {
  if (inizio.getTime() <= adesso.getTime()) return null
  const oggi = chiaveGiornoRoma(adesso)
  const giorno = chiaveGiornoRoma(inizio)
  let minuti = 60
  if (giorno === oggi) minuti = 15
  else if (giorno === giornoDopo(oggi)) minuti = 60
  else if (inizio.getTime() - adesso.getTime() > 48 * 60 * 60 * 1000) minuti = 24 * 60
  const scade = new Date(Math.min(adesso.getTime() + minuti * 60 * 1000, inizio.getTime()))
  if (scade.getTime() <= adesso.getTime()) return null
  return { minuti, scade }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tempoRisposta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tempoRisposta.ts src/lib/tempoRisposta.test.ts
git commit -m "Il tempo per rispondere a una proposta dipende da quanto è vicino l'appuntamento."
```

---

### Task 2: Animali già registrati

**Files:**
- Create: `src/lib/candidatiRichiesta.ts`
- Test: `src/lib/candidatiRichiesta.test.ts`

**Interfaces:**
- Consumes: `phoneDigits` da `src/lib/dogList.ts`
- Produces: `candidatiRichiesta(animali, telefono, email)` nell’ordine attivo poi archivio, per nome

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { candidatiRichiesta } from './candidatiRichiesta'

const rex = { id: 'rex', name: 'Rex', breed: 'Labrador', status: 'attivo' as const, contact: { phone: '349 305 3622', email: 'mario@email.it' } }
const mia = { id: 'mia', name: 'Mia', breed: 'Europeo', status: 'attivo' as const, contact: { phone: '333', email: 'laura@email.it' } }
const archivio = { id: 'old', name: 'Birba', breed: 'Meticcio', status: 'non_in_cura' as const, contact: { phone: '3493053622', email: '' } }
const morto = { id: 'x', name: 'Leo', breed: 'Boxer', status: 'deceduto' as const, contact: { phone: '3493053622', email: 'mario@email.it' } }

describe('candidati della richiesta', () => {
  it('tiene telefono o email, esclude il deceduto e non accoppia i campi vuoti', () => {
    expect(candidatiRichiesta([mia, morto, archivio, rex], '3493053622', 'mario@email.it').map((item) => item.id)).toEqual(['rex', 'old'])
    expect(candidatiRichiesta([rex], '', '')).toEqual([])
    expect(candidatiRichiesta([{ ...mia, contact: { phone: '', email: 'mario@email.it' } }], '000', 'Mario@Email.it').map((item) => item.id)).toEqual(['mia'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/candidatiRichiesta.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

```ts
import { phoneDigits } from './dogList'

type Animale = {
  id: string
  name: string
  breed: string
  status: 'attivo' | 'non_in_cura' | 'deceduto'
  contact: { phone: string; email?: string }
}

export function candidatiRichiesta(animali: readonly Animale[], telefono: string, email: string): Animale[] {
  const cifre = phoneDigits(telefono)
  const posta = email.trim().toLowerCase()
  return animali
    .filter((animale) => animale.status !== 'deceduto')
    .filter((animale) => {
      const stessoTelefono = cifre !== '' && phoneDigits(animale.contact.phone) === cifre
      const stessaEmail = posta !== '' && (animale.contact.email ?? '').trim().toLowerCase() === posta
      return stessoTelefono || stessaEmail
    })
    .slice()
    .sort((a, b) => Number(a.status !== 'attivo') - Number(b.status !== 'attivo') || a.name.localeCompare(b.name, 'it'))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/candidatiRichiesta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/candidatiRichiesta.ts src/lib/candidatiRichiesta.test.ts
git commit -m "La richiesta propone gli animali già legati a quel telefono o a quella email."
```

---

### Task 3: Il posto libero

**Files:**
- Modify: `src/lib/disponibilita.ts`
- Test: `src/lib/disponibilita.test.ts`
- Modify: `functions/src/piano/postiLiberi.ts` — passa `provvisorio` e `scadeIl` degli appuntamenti a `orariLiberi`

**Interfaces:**
- Consumes: niente di nuovo
- Produces: `orariLiberi` ignora `status: 'nuova'`. Un appuntamento `programmato` con `provvisorio: true` occupa solo se `scadeIl` è nel futuro.

- [ ] **Step 1: Write the failing test**

Nel test «un programmato e una richiesta nuova occupano» la richiesta delle 12:00 non deve più occupare. Atteso: `['09:00', '11:00', '12:00']`. Aggiungi:

```ts
it('il provvisorio occupa fino alla scadenza e poi libera il posto', () => {
  const giorno = '2026-10-28'
  const fascia = (ora: string) => ({
    inizio: istanteRoma(giorno, ora),
    fine: new Date(istanteRoma(giorno, ora).getTime() + 60 * 60 * 1000),
    status: 'programmato',
    provvisorio: true as const,
  })
  const base = {
    giorno,
    fasce: [{ da: '09:00', a: '12:00' }],
    passoMin: 60,
    durataMin: 60,
    richieste: [],
    adesso: istanteRoma(giorno, '08:00'),
  }
  expect(orariLiberi({
    ...base,
    appuntamenti: [{ ...fascia('10:00'), scadeIl: istanteRoma(giorno, '09:00') }],
  })).toEqual(['09:00', '11:00'])
  expect(orariLiberi({
    ...base,
    adesso: istanteRoma(giorno, '09:01'),
    appuntamenti: [{ ...fascia('10:00'), scadeIl: istanteRoma(giorno, '09:00') }],
  })).toEqual(['09:00', '10:00', '11:00'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/disponibilita.test.ts`
Expected: FAIL sul nuovo caso e sul vecchio atteso `['09:00', '11:00']`

- [ ] **Step 3: Write minimal implementation**

In `orariLiberi`, il tipo appuntamento guadagna `provvisorio?: boolean` e `scadeIl?: Date`. Gli occupati sono solo:

```ts
...input.appuntamenti.filter((voce) => {
  if (voce.status !== 'programmato') return false
  if (voce.provvisorio && voce.scadeIl && voce.scadeIl.getTime() <= input.adesso.getTime()) return false
  return true
}),
```

Togli il filtro sulle richieste `nuova`. In `postiLiberi.ts`, quando leggi gli appuntamenti, copia `provvisorio === true` e `scadeIl` se è una data. Senza `scadeIl` un provvisorio resta occupato finché il documento esiste.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/disponibilita.test.ts functions/src/piano/piano.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/disponibilita.ts src/lib/disponibilita.test.ts functions/src/piano/postiLiberi.ts
git commit -m "Solo l'appuntamento occupa il posto, e il provvisorio lo libera allo scadere."
```

---

### Task 4: Che cosa scrive ogni azione

**Files:**
- Create: `src/lib/pianoRichiesta.ts`
- Test: `src/lib/pianoRichiesta.test.ts`

**Interfaces:**
- Consumes: `tempoRisposta`, `SceltaAnimale`, `ComandoRichiesta`, `RichiestaDoc`, `PianoRichiesta`
- Produces: `pianoRichiesta(input): PianoRichiesta | { ok: false; errore: 'stato' | 'scelta' | 'orario' | 'token' | 'scaduta' }`

`input` è `{ richiesta, comando, token, adesso, orarioLibero, animaleArchivio }`. `orarioLibero` serve solo a `proponi`. `animaleArchivio` è vero se la scelta esistente è `non_in_cura`.

- [ ] **Step 1: Write the failing test**

Copri questi casi, con una richiesta `nuova` alle 17:00 del 28 ottobre 2026 e `adesso` alle 09:00:

- `accetta` senza scelta → `errore: 'scelta'`
- `accetta` nuovo → `appuntamento: 'crea'`, `cane: 'crea'`, `mail: 'conferma'`, status `accettata`, niente `scadeIl`
- `accetta` su un id esistente archiviato → `cane: 'riattiva'`, non `crea`
- `accetta` anche se `orarioLibero` è false → comunque `ok: true`
- `proponi` alle 10:00 del 29, orario libero, nuovo → `appuntamento: 'crea'`, `cane: 'niente'`, `mail: 'proposta'`, status `proposta`, `sceltaAnimale: 'nuovo'`, `scadeIl` un’ora dopo `adesso`
- `proponi` su orario non libero → `errore: 'orario'`
- `proponi` su un’ora già passata → `errore: 'orario'`
- `rifiuta` da `nuova` → status `rifiutata`, `appuntamento: 'niente'`, `cane: 'niente'`, `mail: 'rifiuto'`
- da `proposta`, `confermaCliente` con token giusto e `sceltaAnimale: 'nuovo'` e `scadeIl` nel futuro → status `accettata`, `appuntamento: 'conferma'`, `cane: 'crea'`, `mail: 'nessuna'`
- `confermaCliente` con token vuoto o diverso → `errore: 'token'` e lo stato non cambia
- `confermaCliente` con `scadeIl` passato → `errore: 'scaduta'`
- `rifiutaCliente` e `scade` da `proposta` → `appuntamento: 'cancella'`, `cane: 'niente'`, status `rifiutata` o `scaduta`, mail `rifiuto` o `scadenza`
- un secondo `confermaCliente` su richiesta già `accettata` → `errore: 'stato'`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pianoRichiesta.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`accetta` e `proponi` e `rifiuta` solo da `nuova`. `confermaCliente`, `rifiutaCliente` e `scade` solo da `proposta`, e solo se `token` coincide ed è non vuoto. `scade` non controlla il token: lo chiama il server. `confermaCliente` e `rifiutaCliente` con `scadeIl` assente o passato restituiscono `scaduta` senza scrivere.

Per `proponi`, `inizio` è `istanteRoma(giorno, ora)` e `fine` è un’ora dopo. `scadeIl` viene da `tempoRisposta`. Se è `null` o `orarioLibero` è false, errore `orario`. `sceltaAnimale` salvato è `'nuovo'` oppure il `dogId`.

`cane: 'riattiva'` solo se `animaleArchivio` è vero e l’appuntamento diventa definitivo (`accetta`, oppure `confermaCliente` con scelta esistente). `confermaCliente` con `sceltaAnimale: 'nuovo'` ha `cane: 'crea'`. Con un id, `cane` è `riattiva` o `niente`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pianoRichiesta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pianoRichiesta.ts src/lib/pianoRichiesta.test.ts
git commit -m "Ogni azione sulla richiesta sa se creare l'appuntamento, il profilo o la mail."
```

---

### Task 5: Tab Nuovi

**Files:**
- Modify: `src/types/models.ts` — `Dog.daRevisionare?: boolean`
- Modify: `src/lib/firebaseMap.ts` — `dogFromDoc` legge il booleano, e lo scrive nel documento solo se vero
- Modify: `src/lib/dogList.ts`
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/pages/DogPage.tsx` — `save` spegne `daRevisionare`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Test: `src/lib/dogList.test.ts`

**Interfaces:**
- Consumes: `Dog.daRevisionare`
- Produces: `DogTab` include `'nuovi'`. `countDogs` restituisce anche `nuovi`. `inTab('attivi' | 'mensili' | 'occasionali')` è falso se `daRevisionare` è vero.

- [ ] **Step 1: Write the failing test**

Un animale attivo occasionale con `daRevisionare: true` conta in `nuovi` e non in `attivi` né in `occasionali`. Senza il campo conta come oggi. `visibleDogs` sul tab `nuovi` lo mostra, sul tab `attivi` no.

Aggiorna l’atteso di `countDogs` che oggi è `{ attivi, mensili, occasionali, archivio }` aggiungendo `nuovi`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dogList.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export type DogTab = 'attivi' | 'mensili' | 'occasionali' | 'nuovi' | 'archivio'

function inTab(dog: Dog, tab: DogTab): boolean {
  if (tab === 'archivio') return dog.status === 'non_in_cura' || dog.status === 'deceduto'
  if (dog.status !== 'attivo') return false
  if (tab === 'nuovi') return dog.daRevisionare === true
  if (dog.daRevisionare === true) return false
  if (tab === 'mensili') return dog.clientType === 'mensile'
  if (tab === 'occasionali') return dog.clientType === 'occasionale'
  return true
}
```

`countDogs` aggiunge `nuovi`. In `DogsPage`, `TABS` è `['attivi', 'mensili', 'occasionali', 'nuovi', 'archivio']`. Il tab Nuovi mostra il numero dentro un bollino `background: var(--pri); color: var(--on-pri); border-radius: 999px; min-width: 18px; height: 18px; font-size: 11px`. Gli altri tab restano «Attivi 12».

In `DogPage.save`, dopo un salvataggio riuscito di un cane che aveva `daRevisionare`, `saveExisting` parte da un write con `daRevisionare: false`. Il mapper non deve rimettere il campo se è false.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dogList.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/lib/firebaseMap.ts src/lib/dogList.ts src/lib/dogList.test.ts src/pages/DogsPage.tsx src/pages/DogPage.tsx
git commit -m "Gli animali arrivati da una richiesta restano nel tab Nuovi finché non si salva la scheda."
```

Le chiavi i18n `caniNuovi` (it «Nuovi», en «New», es «Nuevos») e `caniDaRivedere` (it «da rivedere», en «to review», es «por revisar») si aggiungono in questo task, accanto a `caniArchivio`. La terza riga della lista, se `daRevisionare`, usa `caniDaRivedere` al posto del sottotitolo solito. Controlla `frasiFisse`: niente letterali italiani nei tsx.

---

### Task 6: Riga ambra in agenda

**Files:**
- Modify: `src/types/models.ts` — su `Appointment`: `provvisorio?: boolean`, `scadeIl?: string`, `richiestaId?: string`, `ospiteNome?: string`. `dogId` può essere `''`.
- Modify: `src/lib/firebaseMap.ts` — leggi e scrivi questi campi. `provvisorio` si persiste solo se vero.
- Modify: `src/components/domain/AppointmentRow.tsx`
- Modify: `src/pages/CalendarPage.tsx` intorno alla riga del giorno
- Modify: `src/components/calendar/WeekRows.tsx` intorno alla riga 246
- Modify: `src/pages/HomePage.tsx` sulle righe di oggi
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: i campi sopra
- Produces: la riga resta cliccabile senza cane se c’è `ospiteNome`. Lo sfondo della riga è `var(--warn-s)` se `provvisorio`. Il sottotitolo è «Da confermare · entro le HH:MM» con `oraRoma(new Date(scadeIl))`.

- [ ] **Step 1: Write the failing test**

In `appointments.test.tsx`, una riga con `dog` assente, `ospiteNome: 'Rex'` e `provvisorio: true` non è `disabled` e il nome accessibile contiene Rex. Una riga senza cane e senza `ospiteNome` resta disabilitata, come oggi.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`AppointmentRow` usa `appointment.ospiteNome` se non c’è il cane. `disabled` è vero solo se mancano entrambi. Il chiamante, in home, giorno e settimana, mette `background: 'var(--warn-s)'` sulla `Row` o sul bottone della settimana quando `provvisorio` è vero. Il sottotitolo del provvisorio sostituisce durata e servizi con la frase i18n `agendaDaConfermare` = «Da confermare · entro le {{ora}}». Chiavi anche en «To confirm · by {{ora}}» ed es «Por confirmar · antes de las {{ora}}».

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx src/lib/firebaseMap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/lib/firebaseMap.ts src/components/domain/AppointmentRow.tsx src/pages/CalendarPage.tsx src/components/calendar/WeekRows.tsx src/pages/HomePage.tsx src/pages/appointments.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "L'appuntamento provvisorio si vede in ambra, anche se il profilo non esiste ancora."
```

---

### Task 7: Il server scrive

**Files:**
- Modify: `functions/src/piano/gestisciPrenotazione.ts`
- Create: `functions/src/piano/rispondiRichiesta.ts`
- Create: `functions/src/piano/scadiProposte.ts`
- Modify: `functions/src/index.ts`
- Test: `src/lib/pianoRichiesta.test.ts` resta la rete di sicurezza. Aggiungi `functions/src/piano/scadiProposte.test.ts` solo per la funzione pura che sceglie i documenti scaduti, se la separi. Il giro Firestore non si testa qui.

**Interfaces:**
- Consumes: `pianoRichiesta`, `tempoRisposta`, `postBrevoHtml`, `emailMessaggio`
- Produces: `gestisciPrenotazione` accetta anche `scelta` (`nuovo` o un id) e, per proponi, `giorno` e `ora`. `rispondiRichiesta` è `onRequest` pubblico. `scadiProposte` è `onSchedule` ogni 5 minuti, `Europe/Rome`, `europe-west1`.

- [ ] **Step 1: Write the failing test**

Il test di `pianoRichiesta` del task 4 è il contratto. Non duplicarlo. Aggiungi in `scadiProposte.ts` una funzione `proposteScadute(docs, adesso)` e il test:

```ts
expect(proposteScadute([
  { id: 'a', status: 'proposta', scadeIl: '2026-10-28T07:00:00.000Z', appointmentId: 'app1' },
  { id: 'b', status: 'proposta', scadeIl: '2026-10-28T10:00:00.000Z', appointmentId: 'app2' },
  { id: 'c', status: 'nuova', scadeIl: '2026-10-28T07:00:00.000Z' },
], new Date('2026-10-28T08:00:00.000Z'))).toEqual([{ id: 'a', appointmentId: 'app1' }])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/scadiProposte.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`gestisciPrenotazione` in `index.ts` richiede l’utente. L’account deve avere `salonId` uguale a quello chiesto, diverso da `shared`, e ruolo `titolare`, `socio` o `collaboratore`. Il secret è `brevoApiKey`, come `eliminaAccount`.

Il corpo legge la richiesta, i cani se la scelta è un id, e per `proponi` chiama `postiLiberiPer` su quel giorno. `orarioLibero` è vero se l’ora è nella lista. Poi `pianoRichiesta`. Se `mail` è `proposta` e la chiave Brevo manca o `postBrevoHtml` lancia, ritorna `{ ok: false, errore: 'email' }` senza scrivere appuntamento né cambiare stato.

Se il piano è `ok`:

- `cane: 'crea'` scrive `salons/{id}/dogs/{nuovoId}` con nome, specie, razza, taglia, `clientType: 'occasionale'`, `status: 'attivo'`, `daRevisionare: true`, contatto, `photo` la prima foto se è un data URL jpeg/png/webp sotto i 160000 caratteri, `gallery` le successive con id `richiesta-2` e `richiesta-3`.
- `cane: 'riattiva'` aggiorna quel cane a `status: 'attivo'` senza toccare `daRevisionare`.
- `appuntamento: 'crea'` scrive l’appuntamento con i campi del preambolo. Se il piano ha `scadeIl`, `provvisorio` è vero.
- `appuntamento: 'conferma'` toglie `provvisorio` e `scadeIl` e, se è nato il cane, mette `dogId`.
- `appuntamento: 'cancella'` cancella il documento `appointmentId`.
- La richiesta riceve i campi del piano, incluso `emailStato: 'inviata'` o `'non_inviata'`.
- Le mail `conferma` e `rifiuto` partono dopo la scrittura. Se falliscono, l’appuntamento resta e `emailStato` è `non_inviata`.

`rispondiRichiesta` legge `salonId`, `id`, `token`, `azione` (`conferma` o `rifiuta`) dalla query. I link nella mail sono `https://europe-west1-groomly-3128b.cloudfunctions.net/rispondiRichiesta` con quei parametri. Token o stato invalidi rispondono HTML «Posto liberato» con status 200, senza scrivere. Il successo di conferma risponde «Appuntamento confermato» con salone, animale, giorno e ora in Europe/Rome. Stesso guscio visivo di `paginaPubblica`: fondo `#eef3f7`, testo `#2C4560`, card bianca. Niente login.

`scadiProposte` interroga le richieste `proposta` con `scadeIl` minore di adesso, chiama `pianoRichiesta` con azione `scade`, cancella l’appuntamento, aggiorna la richiesta e manda la mail `scadenza` una volta. Un documento già `scaduta` non si rivede.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/scadiProposte.test.ts src/lib/pianoRichiesta.test.ts`
Expected: PASS

Poi `npm --prefix functions run build`
Expected: `tsc` senza errori

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/gestisciPrenotazione.ts functions/src/piano/rispondiRichiesta.ts functions/src/piano/scadiProposte.ts functions/src/piano/scadiProposte.test.ts functions/src/index.ts
git commit -m "Il salone e il cliente chiudono la richiesta sul server, che crea visita e profilo."
```

---

### Task 8: Home e riquadro

**Files:**
- Create: `src/components/piano/RigaRichieste.tsx`
- Create: `src/components/piano/RiquadroRichiesta.tsx`
- Test: `src/components/piano/RiquadroRichiesta.test.tsx`
- Modify: `src/data/firebase/client.ts` — `listenRichiesteNuove` restituisce i campi di `RichiestaDoc` più `id`. `callGestisciPrenotazione` manda `scelta`, `giorno`, `ora` e legge `{ ok, errore }`.
- Modify: `src/pages/HomePage.tsx` — la card sta sopra la sezione di oggi. Nessuna card se l’elenco è vuoto.
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`

**Interfaces:**
- Consumes: `candidatiRichiesta`, `postiLiberi` già usato dal sito (`orariPrenotabili` / la callable `postiLiberi`), `callGestisciPrenotazione`
- Produces: la riga e il riquadro descritti nella spec

Chiavi, italiano / inglese / spagnolo:

- `richiestaRiga`: «{{chi}} chiede per {{cane}}» / «{{chi}} asked for {{cane}}» / «{{chi}} pide cita para {{cane}}»
- `richiestaMancaCane`: «l’animale» / «the pet» / «el animal»
- `richiestaTitolo`: «Richiesta» / «Request» / «Solicitud»
- `richiestaChiede`: «{{chi}} chiede un appuntamento per {{cane}}» / «{{chi}} asked for an appointment for {{cane}}» / «{{chi}} pide una cita para {{cane}}»
- `richiestaOccupata`: «A quest’ora c’è già una visita.» / «There is already a visit at this time.» / «A esta hora ya hay una cita.»
- `richiestaNuovo`: «Nuovo profilo» / «New profile» / «Perfil nuevo»
- `richiestaArchivio`: «Archivio» / «Archive» / «Archivo»
- `richiestaAccetta`: «Accetta» / «Accept» / «Aceptar»
- `richiestaProponi`: «Proponi un altro orario» / «Suggest another time» / «Proponer otro horario»
- `richiestaRifiuta`: «Rifiuta» / «Decline» / «Rechazar»
- `richiestaEmailKo`: «Email non inviata» / «Email was not sent» / «El correo no se envió»
- `richiestaScegli`: «Scegli l’animale» / «Choose the pet» / «Elige el animal»

- [ ] **Step 1: Write the failing test**

```tsx
it('senza scelta Accetta e Proponi sono spenti, Rifiuta no', () => {
  render(<RiquadroRichiesta aperta richiesta={richiesta()} cani={[]} visite={[]} onChiudi={() => undefined} onFatto={() => undefined} />)
  expect(screen.getByRole('button', { name: 'Accetta' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Proponi un altro orario' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeEnabled()
})

it('la riga non mostra la foto', () => {
  const { container } = render(<RigaRichieste richieste={[richiesta()]} onApri={() => undefined} />)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).toHaveTextContent('17:00')
  expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).toHaveTextContent('Cane')
  expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).not.toHaveTextContent('foto')
})
```

`richiesta()` ha nome Mario Rossi, cane Rex, specie cane, foto un data URL, start 17:00 Roma del 28 ottobre 2026.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/RiquadroRichiesta.test.tsx`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

`RigaRichieste`: una `Card`, un bottone per riga, altezza minima 48, prima riga 13/700 con `richiestaRiga`, seconda 12 e `var(--tx2)` con giorno breve, ora `HH:MM` di Rome e l’etichetta della specie. Chevron Lucide `ChevronRight` size 16. Nessun `img`.

`RiquadroRichiesta`: un dialog centrato (`role="dialog"`, `aria-modal`, chiusura con X e con Escape). Foto a 56 pixel solo qui. Radio «Nuovo profilo» e una radio per candidato, con «Archivio» se `non_in_cura`. Se `visite` contiene un `programmato` non provvisorio che si sovrappone all’ora chiesta, mostra `richiestaOccupata` e lascia Accetta attivo. Proponi sostituisce il blocco orario con un giorno e la lista di `orariLiberi` di quel giorno; gli orari si chiedono alla callable già usata dal sito. Accetta e Proponi chiamano `callGestisciPrenotazione`. Se torna `errore: 'email'`, il riquadro resta aperto e mostra `richiestaEmailKo`.

`listenRichiesteNuove` mappa anche cane, specie, razza, taglia, phone, email, foto, start, end, nome. La home filtra `status === 'nuova'` già dalla query.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/RiquadroRichiesta.test.tsx src/i18n/frasiFisse.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/RigaRichieste.tsx src/components/piano/RiquadroRichiesta.tsx src/components/piano/RiquadroRichiesta.test.tsx src/data/firebase/client.ts src/pages/HomePage.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "La home mostra le richieste e il riquadro accetta, propone o rifiuta."
```

---

### Task 9: Mail e pagina pubblica

**Files:**
- Modify: `src/i18n/emailHtml.ts`
- Test: `src/i18n/emailHtml.test.ts`
- Modify: `hosting/s/pagina.js`
- Modify: `src/lib/paginaPubblica.ts` — la classe del messaggio finale non usa `--ok`
- Test: `src/lib/paginaPubblica.test.ts` se asserisce il testo vecchio

**Interfaces:**
- Consumes: `emailMessaggio`
- Produces: `dati.url` e `dati.urlRifiuta`. Se `urlRifiuta` c’è, due pulsanti. La proposta dice l’orario nuovo, l’orario chiesto e «entro le {{ora}}».

- [ ] **Step 1: Write the failing test**

```ts
const proposta = emailMessaggio('it', 'proposta', {
  nome: 'Rex',
  salone: 'Canespa',
  url: 'https://groomlyapp.it/r?azione=conferma',
  urlRifiuta: 'https://groomlyapp.it/r?azione=rifiuta',
  quando: 'giovedì 29 ottobre, 10:00–11:00',
  invece: 'mercoledì 28 ottobre alle 17:00',
  entro: 'le 22:15',
})
expect(proposta.html).toContain('Conferma')
expect(proposta.html).toContain('Rifiuta')
expect(proposta.html).toContain('le 22:15')
expect(proposta.html).not.toContain('>Togli<')
```

Estendi il tipo dati di `emailMessaggio` con `urlRifiuta?`, `quando?`, `invece?`, `entro?`. Il rifiuto e la scadenza non hanno `url`: il template non stampa un pulsante. Aggiorna il test che elenca i tipi se il corpo cambia.

Per il sito, il test di `paginaPubblica` o una lettura di `hosting/s/pagina.js` deve contenere «Non è ancora una prenotazione» e non la classe verde sull’esito. Le tre lingue:

- it: il testo della spec, con `{{nome}}` e `{{email}}`
- en: «Request sent to {{nome}}. This is not a booking yet.» e le tre frasi equivalenti sull’esito, lo spam e il tempo nella mail
- es: «Solicitud enviada a {{nome}}. Todavía no es una reserva.» e le tre frasi equivalenti

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/emailHtml.test.ts src/lib/paginaPubblica.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Due ancore affiancate solo per la proposta: la prima `url` con testo Conferma, la seconda `urlRifiuta` con bordo e testo Rifiuta, colore `#9E2F2A`. Il corpo della proposta usa `quando`, `invece` ed `entro`. In `pagina.js` il messaggio finale è un paragrafo colore `var(--ink)`, non `ok`. Sostituisci `t.ok`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/emailHtml.test.ts src/lib/paginaPubblica.test.ts src/i18n/frasiFisse.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts hosting/s/pagina.js src/lib/paginaPubblica.ts src/lib/paginaPubblica.test.ts
git commit -m "La proposta si conferma dalla mail e il sito non la dà per già accettata."
```

---

### Task 10: Pubblicare

Questo task si fa solo quando i task 1–9 sono verdi. È un cambiamento dell’app: vale la regola di pubblicazione del repository.

- [ ] **Step 1: Verifica**

Run: `npm test`
Expected: PASS. Se `src/lib/releasePubblicata.test.ts` va in timeout sulla rete, rilancialo da solo. Non cambiare `release.json` per zittirlo.

- [ ] **Step 2: Alza la patch**

Leggi `APP_VERSION`. Se è `1.1.114`, diventa `1.1.115` e `versionCode` `10215` (`major * 10000 + minor * 100 + patch`). Stessi valori in `package.json`, `android/app/build.gradle` (`versionName` e `versionCode`) e `hosting/release.json`. L’url resta `https://groomlyapp.it/groomly.apk`. La nota dice che le richieste online arrivano in home e si accettano, si propongono o si rifiutano.

- [ ] **Step 3: APK e release**

`npm run build`, `npx cap sync android`, in `android` `.\gradlew assembleGithubDebug`. Copia l’apk github debug in `groomly.apk` alla radice e in `hosting/groomly.apk`. Non committare l’apk né `hosting/anteprima-prenota.html`.

Commit dei sorgenti, push su `origin`, poi:

```powershell
gh release create v1.1.115 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.115" --notes "Le richieste online arrivano in home e si accettano, si propongono o si rifiutano."
```

- [ ] **Step 4: Firebase**

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting,functions:gestisciPrenotazione,functions:rispondiRichiesta,functions:scadiProposte,functions:paginaPubblica --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermati e dillo. Non forzare il push e non saltare gli hook.
