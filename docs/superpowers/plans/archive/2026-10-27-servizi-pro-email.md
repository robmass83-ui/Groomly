# Servizi Pro via email — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere promemoria, cane pronto, auguri, recensione, lista d’attesa, il campo email e la tessera, con una sola coda email che il salone può fermare o inviare.

**Architecture:** Le regole stanno in funzioni pure (`serviziEmail`, `codaEmail`). L’app scrive le righe e la home le mostra. Un lavoro sul server, ogni minuto, crea le righe mancanti e spedisce solo quelle Automatico scadute. Richiami e WhatsApp automatico restano la scritta In sviluppo. La pagella esce dall’elenco.

**Tech Stack:** React, Vitest, Firestore, Cloud Functions, Brevo tramite `postBrevoHtml`, notifiche locali Capacitor.

## Global Constraints

- Orari in Europe/Rome.
- Un servizio email, appena acceso, è Manuale.
- Promemoria automatico: default il giorno prima alle 18. Scelte: 1, 2 o 3 giorni prima.
- Auguri automatici: default alle 9, una volta all’anno, solo con giorno e mese.
- Cane pronto, recensione e posto libero in Automatico: 15 minuti dopo l’evento. I 15 minuti del cane pronto e della recensione partono dall’ora di chiusura salvata sulla visita.
- Senza email valida la riga si vede e non parte. Valida se, tagliati gli spazi, contiene `@` e un punto dopo la chiocciola.
- Ferma non fa rinascere lo stesso `evento`.
- Il server non manda le righe Manuale.
- Rispondi-a è l’email del salone se c’è. La lingua è quella dei messaggi del cliente, altrimenti italiano.
- Il link del posto libero è `https://groomlyapp.it/s/{slug}` con il giorno e l’ora del buco. La conferma rientra nelle richieste già esistenti. La mail non crea l’appuntamento.
- Titolare e socio cambiano i modi. Il collaboratore può Ferma, Invia e Metti in lista.
- Colori solo dai token in `src/theme/tokens.css`. Icone Lucide, stroke 2. Niente emoji. Pulsanti alti 48, distanza 8. Transizione colore 150 ms, immediata se `prefers-reduced-motion`.
- `mostraPiani` e `abbonamentiAttivi` restano spenti.
- Pagella assente da vetrina, controlli e home. Richiami e WhatsApp automatico: chip In sviluppo, non sono pulsanti.
- Tetto invii: 300 email per salone al giorno, la costante già in `src/lib/promemoriaEmail.ts`. Il resto resta `in_coda`.

---

## File

- Create: `src/lib/serviziEmail.ts` — modi, default, chi può modificare.
- Create: `src/lib/codaEmail.ts` — riga, evento, ferma, visibilità, email valida, opt-out.
- Create: `src/lib/righeServizio.ts` — costruisce le righe di promemoria, pronto, auguri, recensione, attesa.
- Create: `src/components/piano/CodaInPartenza.tsx` — card in home.
- Create: `src/components/piano/FoglioServizio.tsx` — Manuale / Automatico.
- Create: `src/components/piano/SegniFedelta.tsx` — dieci segni.
- Create: `functions/src/piano/inviaCoda.ts` — giro di invio.
- Modify: `src/data/local/settings.ts`, `src/pages/PianoPagine.tsx`, `src/pages/HomePage.tsx`, `src/pages/DogFields.tsx`, `src/pages/DogPage.tsx`, `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`, `src/i18n/emailHtml.ts`, `firestore.rules`, `functions/src/index.ts`.

Le firme usate dai task dopo il 2:

```ts
export type TipoCoda = 'promemoria' | 'pronto' | 'auguri' | 'recensione' | 'attesa'
export type StatoCoda = 'in_coda' | 'fermata' | 'inviata' | 'non_inviata' | 'chiusa'
export type ModoServizio = 'spento' | 'manuale' | 'automatico'
export interface RigaCoda {
  id: string
  tipo: TipoCoda
  dogId: string
  appointmentId: string | null
  evento: string
  parteIl: string | null
  stato: StatoCoda
  motivo: string
  email: string
  nomeCane: string
}
```

---

### Task 1: Modi dei servizi

**Files:**
- Create: `src/lib/serviziEmail.ts`
- Test: `src/lib/serviziEmail.test.ts`
- Modify: `src/data/local/settings.ts`

**Interfaces:**
- Consumes: niente
- Produces: `ModoServizio`, `sceltaIniziale`, `puoCambiareModo`, `servizioEmailAcceso`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { puoCambiareModo, sceltaIniziale, servizioEmailAcceso } from './serviziEmail'

describe('servizi email', () => {
  it('all’accensione parte in manuale, con i default di promemoria e auguri', () => {
    expect(sceltaIniziale('promemoria')).toEqual({ modo: 'manuale', anticipoGiorni: 1, ora: '18:00' })
    expect(sceltaIniziale('auguri')).toEqual({ modo: 'manuale', ora: '09:00' })
    expect(sceltaIniziale('pronto')).toEqual({ modo: 'manuale' })
  })

  it('solo titolare e socio cambiano il modo', () => {
    expect(puoCambiareModo('titolare')).toBe(true)
    expect(puoCambiareModo('socio')).toBe(true)
    expect(puoCambiareModo('collaboratore')).toBe(false)
  })

  it('spento non è un servizio email acceso', () => {
    expect(servizioEmailAcceso('spento')).toBe(false)
    expect(servizioEmailAcceso('manuale')).toBe(true)
    expect(servizioEmailAcceso('automatico')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/serviziEmail.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

```ts
export type ChiaveServizioEmail = 'promemoria' | 'pronto' | 'auguri' | 'recensione' | 'attesa' | 'fedelta'
export type ModoServizio = 'spento' | 'manuale' | 'automatico'
export interface SceltaServizio {
  modo: ModoServizio
  anticipoGiorni?: 1 | 2 | 3
  ora?: string
}

export function sceltaIniziale(chiave: ChiaveServizioEmail): SceltaServizio {
  if (chiave === 'promemoria') return { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }
  if (chiave === 'auguri') return { modo: 'manuale', ora: '09:00' }
  if (chiave === 'fedelta') return { modo: 'manuale' }
  return { modo: 'manuale' }
}

export function puoCambiareModo(ruolo: string): boolean {
  return ruolo === 'titolare' || ruolo === 'socio'
}

export function servizioEmailAcceso(modo: ModoServizio): boolean {
  return modo === 'manuale' || modo === 'automatico'
}
```

In `SettingsMain` aggiungere `serviziEmail?: Partial<Record<ChiaveServizioEmail, SceltaServizio>>`. In lettura, una chiave assente vale `{ modo: 'spento' }`. `fedeltaAccesa === true` già salvato si legge come fedeltà manuale, così i timbri di chi l’aveva accesa non spariscono.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/serviziEmail.test.ts src/data/local/settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/serviziEmail.ts src/lib/serviziEmail.test.ts src/data/local/settings.ts
git commit -m "I servizi email partono spenti e, accesi, in manuale."
```

---

### Task 2: Coda, evento, ferma, email

**Files:**
- Create: `src/lib/codaEmail.ts`
- Test: `src/lib/codaEmail.test.ts`

**Interfaces:**
- Consumes: `ModoServizio`
- Produces: `RigaCoda`, `emailValida`, `eventoDi`, `unisciRiga`, `fermaRiga`, `dovute`, `visibiliInHome`, `bloccaCane`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { dovute, emailValida, eventoDi, fermaRiga, unisciRiga, visibiliInHome, type RigaCoda } from './codaEmail'

const base: RigaCoda = {
  id: '1', tipo: 'promemoria', dogId: 'd', appointmentId: 'a', evento: 'promemoria:a:2026-10-28',
  parteIl: '2026-10-27T16:00:00.000Z', stato: 'in_coda', motivo: '', email: 'a@b.it', nomeCane: 'Fido',
}

describe('coda email', () => {
  it('accetta solo un indirizzo con chiocciola e punto dopo', () => {
    expect(emailValida('  maria@salon.it ')).toBe(true)
    expect(emailValida('maria@salon')).toBe(false)
    expect(emailValida('')).toBe(false)
  })

  it('la stessa evento non duplica e ferma non rinasce', () => {
    const prima = unisciRiga([], base)
    const seconda = unisciRiga(prima, { ...base, id: '2' })
    expect(seconda).toHaveLength(1)
    const fermata = fermaRiga(seconda[0])
    expect(unisciRiga([fermata], { ...base, id: '3', stato: 'in_coda' })).toEqual([fermata])
  })

  it('il server manda solo le automatiche scadute, non le manuali', () => {
    const manuale: RigaCoda = { ...base, id: 'm', parteIl: null, evento: 'promemoria:b:2026-10-28' }
    const futuro: RigaCoda = { ...base, id: 'f', parteIl: '2026-10-27T20:00:00.000Z', evento: 'x' }
    expect(dovute([base, manuale, futuro], new Date('2026-10-27T16:01:00.000Z')).map((r) => r.id)).toEqual(['1'])
  })

  it('la manuale resta in home dopo mezzanotte, l’automatica inviata no', () => {
    const inviata: RigaCoda = { ...base, stato: 'inviata' }
    const manuale: RigaCoda = { ...base, id: 'm', parteIl: null, evento: 'm', stato: 'in_coda' }
    const viste = visibiliInHome([inviata, manuale], new Date('2026-10-28T08:00:00.000Z'))
    expect(viste.map((r) => r.id)).toEqual(['m'])
  })

  it('lo stesso evento di pronto e di promemoria hanno chiavi diverse', () => {
    expect(eventoDi('promemoria', { appointmentId: 'a', giorno: '2026-10-28' })).toBe('promemoria:a:2026-10-28')
    expect(eventoDi('pronto', { appointmentId: 'a' })).toBe('pronto:a')
    expect(eventoDi('auguri', { dogId: 'd', anno: 2026 })).toBe('auguri:d:2026')
    expect(eventoDi('attesa', { appointmentId: 'dis', dogId: 'd' })).toBe('attesa:dis:d')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/codaEmail.test.ts`
Expected: FAIL, modulo assente

- [ ] **Step 3: Write minimal implementation**

Implementare i tipi del blocco File. `emailValida` fa trim e verifica `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`. `unisciRiga` se trova lo stesso `evento` in stato `fermata`, `inviata` o `chiusa` restituisce la lista invariata; se lo trova `in_coda` o `non_inviata` sostituisce quella riga; altrimenti appende. `fermaRiga` mette `stato: 'fermata'` e `motivo: 'fermata'`. `dovute` tiene `stato === 'in_coda'`, `parteIl` non nullo e `parteIl <= adesso`. Non include le righe Manuali (`parteIl === null`). `inviaSubito`, nel task 15, non passa da `dovute`: spedisce la riga chiesta da Invia anche se è Manuale. `unisciRiga`, se trova la stessa `evento` in `in_coda`, conserva il `parteIl` già scritto e non lo ricalcola. `visibiliInHome` tiene le manuali (`parteIl === null` e stato `in_coda` o `non_inviata`) sempre, e le altre se il loro giorno di Roma è il giorno di `adesso`. `bloccaCane` porta a `fermata` le righe `in_coda` di quel `dogId`. `eventoDi` formatta le chiavi scritte nel test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/codaEmail.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/codaEmail.ts src/lib/codaEmail.test.ts
git commit -m "La coda email non duplica un evento e non manda le righe manuali."
```

---

### Task 3: Promemoria

**Files:**
- Create: `src/lib/righeServizio.ts`
- Test: `src/lib/righeServizio.test.ts`

**Interfaces:**
- Consumes: `RigaCoda`, `eventoDi`, `unisciRiga`, `SceltaServizio`
- Produces: `righePromemoria`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { righePromemoria } from './righeServizio'

const visita = { id: 'a', dogId: 'd', start: new Date('2026-10-28T09:00:00+02:00'), status: 'programmato', nomeCane: 'Fido', email: 'a@b.it' }

describe('promemoria', () => {
  it('in automatico parte il giorno prima alle 18 di Roma', () => {
    const [riga] = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(riga.evento).toBe('promemoria:a:2026-10-28')
    expect(riga.parteIl).toBe('2026-10-27T17:00:00.000Z')
  })

  it('spostare la visita chiude la riga vecchia e ne apre una', () => {
    const vecchia = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    const mossa = { ...visita, start: new Date('2026-10-29T09:00:00+02:00') }
    const dopo = righePromemoria([mossa], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, vecchia)
    expect(dopo.find((r) => r.evento.endsWith('2026-10-28'))?.stato).toBe('chiusa')
    expect(dopo.find((r) => r.evento.endsWith('2026-10-29'))?.stato).toBe('in_coda')
  })

  it('in manuale la riga non ha ora di partenza', () => {
    const [riga] = righePromemoria([visita], { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }, [])
    expect(riga.parteIl).toBeNull()
  })

  it('disdetta e non venuto chiudono il promemoria non partito', () => {
    const nate = righePromemoria([visita], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, [])
    const dopo = righePromemoria([{ ...visita, status: 'disdetto' }], { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }, nate)
    expect(dopo[0].stato).toBe('chiusa')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`righePromemoria` ignora le visite che non sono `programmato`. Calcola il giorno della visita in Europe/Rome, sottrae `anticipoGiorni` e mette l’ora `ora` in quello stesso fuso. `parteIl` è quell’istante in ISO se il modo è `automatico`, altrimenti `null`. Se una riga promemoria esistente punta a un `appointmentId` il cui giorno è cambiato e non è `inviata`, diventa `chiusa`. Poi `unisciRiga` per la chiave nuova. Senza email la riga entra lo stesso con `motivo: 'manca_email'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/righeServizio.ts src/lib/righeServizio.test.ts
git commit -m "Il promemoria segue l’anticipo del salone e si sposta con la visita."
```

---

### Task 4: Cane pronto

**Files:**
- Modify: `src/lib/righeServizio.ts`
- Test: `src/lib/righeServizio.test.ts`

**Interfaces:**
- Consumes: `RigaCoda`, `unisciRiga`
- Produces: `righePronto`

- [ ] **Step 1: Write the failing test**

```ts
it('il pronto parte 15 minuti dopo la chiusura salvata', () => {
  const chiusa = { id: 'a', dogId: 'd', status: 'completato', chiusoIl: '2026-10-27T09:00:00.000Z', nomeCane: 'Fido', email: 'a@b.it' }
  const [riga] = righePronto([chiusa], { modo: 'automatico' }, [])
  expect(riga.parteIl).toBe('2026-10-27T09:15:00.000Z')
  expect(riga.evento).toBe('pronto:a')
})

it('riaprire entro 15 minuti toglie la riga non partita', () => {
  const nata = righePronto(
    [{ id: 'a', dogId: 'd', status: 'completato', chiusoIl: '2026-10-27T09:00:00.000Z', nomeCane: 'Fido', email: 'a@b.it' }],
    { modo: 'automatico' },
    [],
  )
  const dopo = righePronto([{ id: 'a', dogId: 'd', status: 'programmato', chiusoIl: null, nomeCane: 'Fido', email: 'a@b.it' }], { modo: 'automatico' }, nata)
  expect(dopo.find((r) => r.evento === 'pronto:a')).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: FAIL, `righePronto` assente

- [ ] **Step 3: Write minimal implementation**

`righePronto` crea la riga solo se `status === 'completato'` e `chiusoIl` c’è. `parteIl` è `chiusoIl + 15 minuti` in automatico, `null` in manuale. Se la visita passa a `programmato`, `disdetto` o `non_venuto` e la riga è `in_coda` o `non_inviata`, la toglie dall’array. Se è già `inviata`, la lascia. Un cane con `status` `non_in_cura` o `deceduto` non riceve righe nuove: `righePromemoria`, `righePronto`, `righeAuguri` e `righeRecensione` ricevono `caneAttivo: boolean` e, se è falso, chiudono le righe `in_coda` di quel cane.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/righeServizio.ts src/lib/righeServizio.test.ts
git commit -m "Il cane pronto parte dalla chiusura, non dall’orologio dell’agenda."
```

---

### Task 5: Auguri

**Files:**
- Modify: `src/lib/righeServizio.ts`
- Test: `src/lib/righeServizio.test.ts`

**Interfaces:**
- Consumes: `RigaCoda`
- Produces: `righeAuguri`

- [ ] **Step 1: Write the failing test**

```ts
it('gli auguri partono alle 9 del compleanno e non senza data', () => {
  const cani = [
    { id: 'd', nome: 'Luna', email: 'a@b.it', birthMonth: 10, birthDay: 27 },
    { id: 'e', nome: 'Rex', email: 'a@b.it' },
  ]
  const righe = righeAuguri(cani, { modo: 'automatico', ora: '09:00' }, [], new Date('2026-10-27T06:00:00.000Z'))
  expect(righe).toHaveLength(1)
  expect(righe[0].evento).toBe('auguri:d:2026')
  expect(righe[0].parteIl).toBe('2026-10-27T07:00:00.000Z')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`righeAuguri` salta i cani senza `birthMonth` o `birthDay`. Se oggi a Roma è quel giorno e mese, crea `auguri:{id}:{anno}` con `parteIl` alle `ora` di Roma in automatico, `null` in manuale. Un cane già con riga `inviata` o `fermata` per quell’anno non ne riceve un’altra. L’anno dopo la chiave cambia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/righeServizio.ts src/lib/righeServizio.test.ts
git commit -m "Gli auguri partono il giorno del compleanno, una volta all’anno."
```

---

### Task 6: Recensione

**Files:**
- Modify: `src/lib/righeServizio.ts`
- Test: `src/lib/righeServizio.test.ts`

**Interfaces:**
- Consumes: `puoChiedereRecensione` in `src/lib/recensioni.ts`, `RigaCoda`
- Produces: `righeRecensione`

- [ ] **Step 1: Write the failing test**

```ts
it('non chiede la recensione se oggi ce ne sono già cinque, fermate comprese', () => {
  const visite = [{ id: 'n', dogId: 'nuovo', status: 'completato', chiusoIl: '2026-10-27T09:00:00.000Z', nomeCane: 'N', email: 'a@b.it', noteProblema: false }]
  const gia = Array.from({ length: 5 }, (_, i) => ({
    id: String(i), tipo: 'recensione' as const, dogId: String(i), appointmentId: String(i),
    evento: `recensione:${i}`, parteIl: null, stato: 'fermata' as const, motivo: '', email: 'a@b.it', nomeCane: 'X',
  }))
  expect(righeRecensione(visite, { modo: 'automatico' }, 'https://g.page/x', gia, new Date('2026-10-27T10:00:00.000Z'))).toEqual(gia)
})
```

Aggiungere nello stesso file un test che una visita con nota problema non crea riga, e un test che `parteIl` è `chiusoIl` più 15 minuti. Riaprire la visita toglie la riga recensione non partita, come per il pronto. Una riga tolta per la riapertura non conta nel tetto dei cinque.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`righeRecensione` richiede link non vuoto, email valida, `puoChiedereRecensione` vero, e meno di cinque righe `tipo === 'recensione'` create oggi a Roma il cui stato non è `chiusa`. `parteIl` come il pronto. Senza link non crea righe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts src/lib/recensioni.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/righeServizio.ts src/lib/righeServizio.test.ts
git commit -m "La recensione entra in coda solo se le regole del salone lo permettono."
```

---

### Task 7: Lista d’attesa e link

**Files:**
- Modify: `src/lib/righeServizio.ts`
- Test: `src/lib/righeServizio.test.ts`

**Interfaces:**
- Consumes: `compatibili` in `src/lib/attesa.ts`, `linkPrenotazione` in `src/lib/prenotazionePubblica.ts`
- Produces: `righeAttesa`, `linkPostoLibero`

- [ ] **Step 1: Write the failing test**

```ts
it('il posto libero punta alla pagina del salone sul giorno e sull’ora', () => {
  expect(linkPostoLibero('i-pelosetti', '2026-10-28', '10:00')).toBe('https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00')
  expect(linkPostoLibero('', '2026-10-28', '10:00')).toBe('')
})

it('la prima mail partita chiude le altre della stessa disdetta', () => {
  const attesa = [
    { id: 'w1', dogId: 'd1', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-01', nomeCane: 'A', email: 'a@b.it' },
    { id: 'w2', dogId: 'd2', durataMin: 60, preferenza: 'mattina' as const, arrivato: '2026-10-02', nomeCane: 'B', email: 'b@b.it' },
  ]
  const adesso = new Date('2026-10-27T10:00:00.000Z')
  const nate = righeAttesa({ id: 'dis', status: 'disdetto', ora: '10:00', minuti: 90, giorno: '2026-10-28' }, attesa, { modo: 'automatico' }, 'i-pelosetti', [], adesso)
  expect(nate.filter((r) => r.stato === 'in_coda')).toHaveLength(2)
  const dopo = righeAttesa({ id: 'dis', status: 'disdetto', ora: '10:00', minuti: 90, giorno: '2026-10-28' }, attesa, { modo: 'automatico' }, 'i-pelosetti', nate.map((r, i) => i === 0 ? { ...r, stato: 'inviata' as const } : r), adesso)
  expect(dopo.find((r) => r.dogId === 'd2')?.stato).toBe('chiusa')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/righeServizio.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`linkPostoLibero` usa `linkPrenotazione` e, se il link non è vuoto, aggiunge `?giorno=` e `&ora=`. `righeAttesa` usa `postoLiberato` e `compatibili`. Ogni compatibile ottiene `attesa:{idDisdetta}:{dogId}`, `parteIl` a 15 minuti da adesso solo alla creazione in automatico. Se una riga della stessa disdetta è `inviata`, le sorelle ancora `in_coda` diventano `chiusa`. Senza slug la riga ha `motivo: 'pagina_assente'` e `parteIl: null`. La funzione non crea appuntamenti.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/righeServizio.test.ts src/lib/attesa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/righeServizio.ts src/lib/righeServizio.test.ts
git commit -m "Il posto libero manda al link di prenotazione e ne parte una sola."
```

---

### Task 8: Card In partenza

**Files:**
- Create: `src/components/piano/CodaInPartenza.tsx`
- Test: `src/components/piano/CodaInPartenza.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`

**Interfaces:**
- Consumes: `RigaCoda`, `visibiliInHome`
- Produces: il componente `CodaInPartenza`

- [ ] **Step 1: Write the failing test**

```tsx
it('mostra il cane, la parola del motivo e disattiva Invia se manca l’email', () => {
  render(<CodaInPartenza righe={[{ ...base, email: '', motivo: 'manca_email', parteIl: null }]} onFerma={() => {}} onInvia={() => {}} onEmail={() => {}} />)
  expect(screen.getByText('Manca l’email')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Aggiungi email' })).toBeEnabled()
})
```

Il test della card vuota cerca «Niente in partenza». Il test con due righe cerca «2 in partenza» in un elemento `role="status"`. Il chip Inviata contiene la parola Inviata, non solo un colore.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/CodaInPartenza.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Card con `--card`, bordo `--line`, ombra `--sh-2`, sotto la data e prima della ricerca in `HomePage`. Riga: ritratto 36, nome, `Chip` con tono `pri` promemoria, `tea` pronto, `sen` auguri, `warn` recensione e «Si riprova», `ok` posto libero e Inviata, `bad` manca email, `neutral` Fermata. Due `Button` alti 48 (`size="lg"`), gap 8: Ferma `secondary`, Invia `primary`. Durante l’invio il pulsante dice «Invio…» ed è disabilitato. `Aggiungi email` chiama `onEmail(dogId)`. Le stringhe passano da `frasi` in it, en, es. Icone Lucide `aria-hidden` accanto al testo. Rispettare `prefers-reduced-motion` non animando il colore.

Togliere da `HomePage` `RiquadroAvvisi`, `StrumentiManuali` e il `RiquadroAttesa` che mostra `proAncora`. Lasciare `RiquadroRichieste`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/CodaInPartenza.test.tsx src/pages/HomePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/CodaInPartenza.tsx src/components/piano/CodaInPartenza.test.tsx src/pages/HomePage.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "In home la coda mostra il motivo a parole e blocca l’invio senza email."
```

---

### Task 9: Controlli avanzati

**Files:**
- Create: `src/components/piano/FoglioServizio.tsx`
- Test: `src/components/piano/FoglioServizio.test.tsx`
- Modify: `src/pages/PianoPagine.tsx`

**Interfaces:**
- Consumes: `puoCambiareModo`, `SceltaServizio`, `sceltaIniziale`
- Produces: `FoglioServizio`

- [ ] **Step 1: Write the failing test**

```tsx
it('il collaboratore non apre il foglio e In sviluppo non è un pulsante', () => {
  render(<RigaServizio titolo="Richiami" stato="sviluppo" ruolo="titolare" onApri={() => { throw new Error('no') }} />)
  expect(screen.queryByRole('button', { name: 'Richiami' })).not.toBeInTheDocument()
  expect(screen.getByText('In sviluppo')).toBeInTheDocument()
})

it('in automatico il promemoria mostra i tre anticipi', () => {
  render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }} ruolo="titolare" onChange={() => {}} />)
  expect(screen.getByRole('radio', { name: 'Due giorni prima' })).toBeInTheDocument()
})
```

Un test verifica che Pagella non è tra i titoli renderizzati da `StrumentiPage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/FoglioServizio.test.tsx src/pages/strumenti.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

In `PianoPagine.tsx` togliere `pagella` da `PRO` e da `PRO_VETRINA`. Le chiavi `richiamo` e la riga WhatsApp automatico mostrano il chip In sviluppo e il loro contenitore non è un `button`. Le altre righe mostrano il chip Spento, Manuale o Automatico. Il tocco del titolare o del socio apre `Dialog` con due radio alte 48. In Manuale non ci sono altri campi. In Automatico: promemoria ha tre radio e `input type="time"`; auguri solo l’ora; recensione il campo link già esistente; attesa l’elenco nomi con Togli; pronto niente; fedeltà solo il toggle acceso/spento, senza radio email. `onChange` salva subito in `settings.serviziEmail`. Il collaboratore vede il chip e il tocco non apre il foglio.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/FoglioServizio.test.tsx src/pages/strumenti.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/FoglioServizio.tsx src/components/piano/FoglioServizio.test.tsx src/pages/PianoPagine.tsx src/pages/strumenti.test.tsx
git commit -m "I controlli Pro accendono ogni servizio e lasciano pagella e richiami fuori."
```

---

### Task 10: Scheda del cane

**Files:**
- Create: `src/components/piano/SegniFedelta.tsx`
- Test: `src/components/piano/SegniFedelta.test.tsx`
- Modify: `src/pages/DogFields.tsx`, `src/pages/DogPage.tsx`

**Interfaces:**
- Consumes: `servizioEmailAcceso`, `emailValida`, `ricalcolaFedelta`
- Produces: `SegniFedelta`, campo email, Metti in lista

- [ ] **Step 1: Write the failing test**

```tsx
it('dieci segni, gli ultimi vuoti, e il premio solo all’ultimo', () => {
  render(<SegniFedelta timbri={7} onUsa={() => {}} />)
  expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(0)
  expect(screen.getByText('7 su 10')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Usa premio' })).not.toBeInTheDocument()
})
```

Il test con `timbri={10}` trova Usa premio. Il test del campo email, con un servizio acceso, trova l’aiuto «Qui arrivano promemoria e avvisi» e, con valore `maria@salon`, l’errore sotto il campo. Con tutti i servizi email spenti il campo non c’è. Metti in lista è un bottone per il collaboratore se l’attesa è accesa.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/piano/SegniFedelta.test.tsx src/pages/DogPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`SegniFedelta` disegna dieci cerchi da 16 px, gap 8. I primi `timbri` hanno fondo `--pri`. Gli altri hanno bordo `--line` e fondo trasparente. Sotto, il testo «{n} su 10». A 10, `Button` primario Usa premio, che chiama la stessa `onUsa` già presente in `DogPage`. Sostituire il paragrafo timbri di `TesseraFedelta` con questo componente quando la fedeltà non è spenta.

In `DogFields`, mostrare Email se almeno un servizio tra promemoria, pronto, auguri, recensione e attesa è acceso. Errore sotto il campo se il valore non è vuoto e `emailValida` è falso.

In `DogPage`, bottone Metti in lista / Togli che scrive su `settings.attesa` un elemento `{ id, dogId, durataMin, preferenza, arrivato }`. Il foglio chiede giorno, oppure Mattina o Pomeriggio. `preferenza` resta `mattina`, `pomeriggio` o, se c’è un giorno, `qualsiasi` più il campo `giorno`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/piano/SegniFedelta.test.tsx src/pages/DogPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/piano/SegniFedelta.tsx src/components/piano/SegniFedelta.test.tsx src/pages/DogFields.tsx src/pages/DogPage.tsx
git commit -m "La scheda mostra l’email, i dieci segni e l’ingresso in lista."
```

---

### Task 11: Push dell’orario scaduto

**Files:**
- Create: `src/lib/orarioScaduto.ts`
- Create: `src/app/OrarioScadutoAvviso.tsx`
- Test: `src/lib/orarioScaduto.test.ts`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Consumes: visite programmate, `CompleanniAvviso` come esempio di notifica locale
- Produces: `visitaDaAvvisare`

- [ ] **Step 1: Write the failing test**

```ts
it('avvisa solo una visita ancora programmata la cui fine è passata', () => {
  const ora = new Date('2026-10-27T11:05:00+01:00')
  const visite = [
    { id: 'a', nome: 'Fido', status: 'programmato', fine: new Date('2026-10-27T11:00:00+01:00') },
    { id: 'b', nome: 'Luna', status: 'completato', fine: new Date('2026-10-27T11:00:00+01:00') },
  ]
  expect(visitaDaAvvisare(visite, ora, new Set())?.id).toBe('a')
  expect(visitaDaAvvisare(visite, ora, new Set(['a']))).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/orarioScaduto.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`visitaDaAvvisare` restituisce la programmata con `fine <= ora` non presente nel set, la più vecchia. `OrarioScadutoAvviso` su piattaforma nativa schedula una notifica locale con titolo «Orario scaduto» e corpo «{nome} doveva finire alle {ora}. Apri la visita.», `extra.path` verso l’appuntamento. Non scrive righe coda. Montarlo accanto a `CompleanniAvviso`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/orarioScaduto.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/orarioScaduto.ts src/lib/orarioScaduto.test.ts src/app/OrarioScadutoAvviso.tsx src/app/providers.tsx
git commit -m "La fine in agenda avvisa il salone e non il cliente."
```

---

### Task 12: Regole e pagina «Non scrivermi più»

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/firestoreRules.emulator.test.ts`
- Modify: `hosting` pagina azione già usata per il promemoria, funzione `silenzioEmail`

**Interfaces:**
- Consumes: `RigaCoda`, `bloccaCane`
- Produces: raccolta `salons/{salonId}/coda/{id}`, campo cane `emailBloccata`

- [ ] **Step 1: Write the failing test**

Nel test delle regole: il collaboratore aggiorna solo `stato` di una riga coda del proprio salone; un altro salone non la legge; il cliente non scrive la coda. Un test di `bloccaCane` ferma le righe `in_coda` di quel cane e `unisciRiga` non ne aggiunge di nuove se `emailBloccata` è vera.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/codaEmail.test.ts`
Expected: FAIL sul blocco del cane, finché `bloccaCane` non rifiuta le nuove

Aggiungere in `codaEmail.ts` `rigaAmmessa(bloccata: boolean, riga: RigaCoda): boolean` che restituisce falso se `bloccata`. Il test lo aspetta.

- [ ] **Step 3: Write minimal implementation**

In `firestore.rules`, prima del match generico `{kind}`, un match `coda/{id}`: read se `canUse(salonId)`; create e update di `stato` e `motivo` se `canUse`; delete solo `ownerRank`. Non allargare `salonKindWritable`.

La pagina pubblica legge un token di una riga e segna `emailBloccata` sul cane tramite una callable, sullo stesso modello di `/azione?mode=promemoria`. Poi `bloccaCane` sulle righe di quel cane. Sulla scheda del cane, se `emailBloccata` è vera, una riga dice «Mail spente» e un pulsante «Riattiva» la rimette falsa. Il collaboratore può premerlo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/codaEmail.test.ts` e `npm run test:rules`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/lib/codaEmail.ts src/lib/firestoreRules.emulator.test.ts
git commit -m "La coda è del salone e il cliente può spegnere le mail del proprio cane."
```

---

### Task 13: Invio sul server

**Files:**
- Create: `functions/src/piano/inviaCoda.ts`
- Test: `functions/src/piano/inviaCoda.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `src/i18n/emailHtml.ts`

**Interfaces:**
- Consumes: `dovute`, `emailValida`, `TETTO_EMAIL_GIORNO`, `postBrevoHtml`, `emailMessaggio`
- Produces: `inviaCoda`, tipi email `pronto`, `auguri`, `recensione`, `attesa`

- [ ] **Step 1: Write the failing test**

```ts
it('senza chiave non spedisce e segna non_inviata solo se la posta manca, non se manca l’email', async () => {
  const esito = await inviaCoda({
    apiKey: '',
    righe: [{ ...base, email: '' , motivo: 'manca_email' }, { ...base, id: '2', evento: 'e2' }],
    emailOggi: 0,
  })
  expect(esito.inviate).toBe(0)
  expect(esito.riprova).toEqual(['2'])
  expect(esito.attese).toEqual(['1'])
})
```

Un secondo test, con `apiKey: 'x'` e `fetchImpl` che registra il body, verifica che la riga `attesa` contiene `https://groomlyapp.it/s/i-pelosetti?giorno=2026-10-28&ora=10:00` e un link «Non scrivermi più». Un terzo test con `emailOggi: 300` non chiama fetch.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/inviaCoda.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`inviaCoda` filtra con `dovute`, salta `motivo === 'manca_email'` e `motivo === 'pagina_assente'`, si ferma a `TETTO_EMAIL_GIORNO`. Senza `apiKey` le altre restano da riprovare e non chiama la rete. Con chiave chiama `postBrevoHtml`. `emailMessaggio` guadagna i tipi `pronto`, `auguri`, `recensione`, `attesa`, con oggetto e corpo in it, en, es, bottone e nota. Per `attesa` il bottone usa `dati.url` del link posto libero. In fondo a tutti e cinque i corpi, il link di silenzio. `replyTo` è l’email del salone se presente. In `functions/src/index.ts` un `onSchedule` ogni minuto, `Europe/Rome`, legge i saloni con almeno un servizio non spento, chiama le funzioni riga già scritte e poi `inviaCoda`. Non sostituire il comportamento delle prenotazioni.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/inviaCoda.test.ts src/i18n/emailHtml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/inviaCoda.ts functions/src/piano/inviaCoda.test.ts functions/src/index.ts src/i18n/emailHtml.ts src/i18n/emailHtml.test.ts
git commit -m "Il server spedisce la coda scaduta e il posto libero porta alla prenotazione."
```

---

### Task 14: La pagina pubblica apre il buco

**Files:**
- Modify: `hosting/s/pagina.js`
- Test: `src/lib/postoLiberoLink.test.ts`

**Interfaces:**
- Consumes: `linkPostoLibero`
- Produces: la pagina `/s/{slug}` legge `giorno` e `ora` e li passa al passo «quando»

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parametriPosto } from './postoLiberoLink'

describe('parametri del posto libero', () => {
  it('legge giorno e ora solo se sono una data e un orario', () => {
    expect(parametriPosto('2026-10-28', '10:00')).toEqual({ giorno: '2026-10-28', ora: '10:00' })
    expect(parametriPosto('domani', '10:00')).toBeNull()
    expect(parametriPosto('2026-10-28', '25:00')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/postoLiberoLink.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`parametriPosto` accetta `giorno` con `/^\d{4}-\d{2}-\d{2}$/` e `ora` con `/^([01]\d|2[0-3]):[0-5]\d$/`. `hosting/s/pagina.js`, all’avvio, legge `URLSearchParams` e se `parametriPosto` non è nullo apre il passo dell’orario con quel giorno e quell’ora già scelti. Il resto del percorso di prenotazione non cambia: il cliente conferma, la richiesta arriva in home, il salone approva. La pagina non diventa privata.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/postoLiberoLink.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/postoLiberoLink.ts src/lib/postoLiberoLink.test.ts hosting/s/pagina.js
git commit -m "Il link del posto libero apre la prenotazione su quel giorno e quell’ora."
```

---

### Task 15: Collegare la home al salone

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `righePromemoria`, `righePronto`, `righeAuguri`, `righeRecensione`, `righeAttesa`, `CodaInPartenza`
- Produces: la home che legge impostazioni, cani e visite e passa le righe visibili

- [ ] **Step 1: Write the failing test**

Con piano Pro, promemoria automatico e una visita di domani con email, la home mostra il nome del cane e «Promemoria». Con il servizio spento non mostra la card di quella riga. Ferma chiama il salvataggio della riga con stato `fermata`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`HomePage` calcola le righe con le cinque funzioni, poi `visibiliInHome`. Le salva nel documento impostazioni o nella raccolta coda se Firebase è acceso; in locale nello stesso `settings` sotto `codaEmail`. Invia chiama la callable `inviaSubito` che riusa `inviaCoda` su una sola riga e aggiorna lo stato. Aggiungi email naviga a `/animali/{dogId}?campo=email`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx src/lib/righeServizio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx functions/src/index.ts
git commit -m "La home del salone Pro mostra la coda vera e può fermarla."
```

---

### Task 16: Verifica finale

**Files:**
- Modify: solo se un test di questa lista fallisce

- [ ] **Step 1: Run the focused suite**

Run: `npx vitest run src/lib/serviziEmail.test.ts src/lib/codaEmail.test.ts src/lib/righeServizio.test.ts src/lib/orarioScaduto.test.ts src/components/piano/CodaInPartenza.test.tsx src/components/piano/FoglioServizio.test.tsx src/components/piano/SegniFedelta.test.tsx src/i18n/emailHtml.test.ts functions/src/piano/inviaCoda.test.ts`
Expected: PASS

- [ ] **Step 2: Run the app suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit any fix from the suite**

Se lo step 2 ha richiesto una correzione, un commit nuovo con il motivo. Se la suite era già verde, nessun commit vuoto.
