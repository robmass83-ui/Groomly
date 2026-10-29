# Prenotazioni pubbliche sicure — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedire a chi non ha un account di riempire `salons/{salonId}/richieste` saltando il posto libero e il tetto antispam.

**Architecture:** La decisione sta in funzioni pure in `src/lib/prenotazione.ts` (`contaAperte`, `ingressoRichiestaPubblica`). `inviaRichiestaPer` le chiama prima di ogni scrittura e controlla sempre `postiLiberiPer`. `preparaRichiesta` non scrive più. App Check resta spento: non c’è una site key, e accenderlo ora chiuderebbe la pagina pubblica.

**Tech Stack:** TypeScript, Vitest (`npx vitest run` dalla radice), Cloud Functions in `functions/src`, Firestore Admin SDK solo dentro `inviaRichiestaPer`.

## Global Constraints

- Questo piano chiude solo VULN-001 di `SECURITY-AUDIT.md` (High). Zero finding Critical. VULN-002, VULN-003, VULN-004, VERIFY-001 e VERIFY-002 sono piani separati, elencati sotto.
- `APP_CHECK_ATTIVO` resta `false`. `RECAPTCHA_SITE_KEY` resta `''`. Non aggiungere `enforceAppCheck: true`.
- `functions/src/index.ts` non passa `apiKey` né `chiaveBrevo()` a `inviaRichiestaPer`.
- Tetti già usati da `decisioneAntispam`: 2 richieste `nuova` per telefono, 20 per salone. Si aggiunge lo stesso 2 per email. Niente tetto per IP.
- Lunghezze: nome 2–80, telefono 1–20 caratteri con 6–15 cifre, email al massimo 320 e ancora `emailPrenotazioneValida`.
- Il giorno è `YYYY-MM-DD` di Roma, da oggi incluso fino al giorno `ORIZZONTE_GIORNI` (42) incluso. L’ora è `HH:mm`.
- Messaggi della function, già letti dalla pagina: `Richiesta non valida`, `Email obbligatoria`, `Troppe richieste`, `Orario non disponibile`, `Prenotazioni spente`. Nessuna stringa nuova in `src/i18n`.
- La durata del posto resta quella già nel codice al momento del task. Oggi `postiLiberiPer` è chiamato con `60`. Se il piano `2026-10-28-schermate-prenotazione-agenda.md` ha già messo `durataMin`, non rimettere `60`: il controllo del posto deve solo diventare obbligatorio.
- Non alzare `APP_VERSION`, non costruire l’APK, non fare il deploy di Hosting. Il cambiamento sta nelle Functions.
- Commit solo dei file del task. Non `git add -A`. Non committare `.env.local`, `groomly.apk`, `android/app/build`.
- `intervalloRichiesta` tiene il ramo `inizio`/`fine`: lo usa il test esistente. La function pubblica non lo usa più per decidere se scrivere.

## Piani separati (non in questo file)

| Finding | Perché sta fuori |
| --- | --- |
| VULN-002 GET che conferma la visita | `rispondiRichiesta.ts`, altro contratto HTTP |
| VULN-003 scansione di tutti gli account in `prendiPushTelefono` | push, non la prenotazione |
| VULN-004 suggerimenti senza tetto | `suggerimenti` e `mailSuggerimento` |
| VERIFY-001 `email_verified` sull’operatore | piani e funzioni Pro |
| VERIFY-002 host dell’APK | `appRelease.ts` |

## File

- Modify: `src/lib/prenotazione.ts` — lunghezze, conteggio, ingresso pubblico.
- Test: `src/lib/prenotazione.test.ts`
- Modify: `functions/src/piano/inviaRichiesta.ts` — applica l’ingresso e il posto libero sempre.
- Test: `functions/src/piano/inviaRichiesta.test.ts` — la function non scrive sul ramo `inizio`/`fine` e non riceve Brevo.
- Modify: `functions/src/piano/postiLiberi.ts` — `preparaRichiestaPer` rifiuta senza scrivere.
- Test: `functions/src/piano/postiLiberi.test.ts` — il rifiuto, accanto ai test già presenti su `appuntamentoOccupato`.
- Modify: `scripts/emu/postiLiberi.mjs` — lo script manuale non si aspetta più tre scritture da `preparaRichiesta`.

Firme prodotte dal Task 1 e usate dal Task 2:

```ts
export function cifreTelefono(phone: string): string

export function contaAperte(
  righe: readonly { phone?: unknown; email?: unknown }[],
  phone: string,
  email: string,
): { aperteTelefono: number; aperteEmail: number; aperteSalone: number }

export type IngressoRichiesta =
  | { ok: true; scrivi: false }
  | { ok: true; scrivi: true; nome: string; phone: string; email: string; giorno: string; ora: string }
  | { ok: false; message: string }

export function ingressoRichiestaPubblica(input: {
  nome: string
  phone: string
  email: string
  giorno: string
  ora: string
  esca: string
  aperteTelefono: number
  aperteEmail: number
  aperteSalone: number
  adesso: Date
}): IngressoRichiesta
```

---

### Task 1: Il cancello puro della richiesta pubblica

**Files:**
- Modify: `src/lib/prenotazione.ts`
- Test: `src/lib/prenotazione.test.ts`

**Interfaces:**
- Consumes: `chiaveGiornoRoma`, `giornoDopo`, `ORIZZONTE_GIORNI`, `decisioneAntispam` da `src/lib/disponibilita.ts`. `emailPrenotazioneValida` già in questo file.
- Produces: `cifreTelefono`, `contaAperte`, `ingressoRichiestaPubblica`, `IngressoRichiesta`. `emailPrenotazioneValida` rifiuta anche le email più lunghe di 320 caratteri.

- [ ] **Step 1: Write the failing test**

In fondo a `src/lib/prenotazione.test.ts`, aggiungi l’import e il describe. L’import in cima al file diventa:

```ts
import { emailPrenotazioneValida, esitoEmailPrenotazione, icsRoma, ingressoRichiestaPubblica, contaAperte, intervalloRichiesta, templatePrenotazione, transizionePrenotazione } from './prenotazione'
```

```ts
describe('ingresso richiesta pubblica', () => {
  const adesso = new Date('2026-10-28T10:00:00+01:00')
  const base = {
    nome: 'Ada Bianchi',
    phone: '333 1234567',
    email: 'ada@cliente.it',
    giorno: '2026-10-28',
    ora: '16:00',
    esca: '',
    aperteTelefono: 0,
    aperteEmail: 0,
    aperteSalone: 0,
    adesso,
  }

  it('accetta nome, telefono, email, giorno e ora dentro i 42 giorni', () => {
    expect(ingressoRichiestaPubblica(base)).toEqual({
      ok: true,
      scrivi: true,
      nome: 'Ada Bianchi',
      phone: '333 1234567',
      email: 'ada@cliente.it',
      giorno: '2026-10-28',
      ora: '16:00',
    })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-12-08' }).ok).toBe(true)
  })

  it('senza giorno e ora non scrive, anche se inizio e fine sarebbero validi', () => {
    expect(ingressoRichiestaPubblica({ ...base, giorno: '', ora: '' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-10-27', ora: '16:00' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-12-09', ora: '16:00' })).toEqual({ ok: false, message: 'Richiesta non valida' })
  })

  it('taglia nome, telefono ed email fuori misura', () => {
    expect(ingressoRichiestaPubblica({ ...base, nome: 'A' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, nome: 'A'.repeat(81) })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, phone: '123' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, phone: '1'.repeat(21) })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(emailPrenotazioneValida(`${'a'.repeat(320)}@b.co`)).toBe(false)
    expect(ingressoRichiestaPubblica({ ...base, email: 'non-una-email' })).toEqual({ ok: false, message: 'Email obbligatoria' })
  })

  it('l’esca non scrive; due telefoni, due email o venti del salone si fermano', () => {
    expect(ingressoRichiestaPubblica({ ...base, esca: 'bot' })).toEqual({ ok: true, scrivi: false })
    expect(ingressoRichiestaPubblica({ ...base, aperteTelefono: 2 })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(ingressoRichiestaPubblica({ ...base, aperteEmail: 2 })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(ingressoRichiestaPubblica({ ...base, aperteSalone: 20 })).toEqual({ ok: false, message: 'Troppe richieste' })
  })

  it('conta le cifre del telefono e l’email minuscola, e il totale è il numero di righe', () => {
    const righe = [
      { phone: '333-1234567', email: 'Ada@Cliente.it' },
      { phone: '3331234567', email: 'altro@cliente.it' },
      { phone: '3400000000', email: 'ada@cliente.it' },
    ]
    expect(contaAperte(righe, '333 1234567', 'ada@cliente.it')).toEqual({
      aperteTelefono: 2,
      aperteEmail: 2,
      aperteSalone: 3,
    })
  })
})
```

`2026-10-28` più 41 giorni, con `giornoDopo`, è `2026-12-08`. Il giorno dopo è fuori orizzonte.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/prenotazione.test.ts`

Expected: FAIL. `ingressoRichiestaPubblica` non è esportato.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/prenotazione.ts`, estendi l’import da `./disponibilita`:

```ts
import { chiaveGiornoRoma, decisioneAntispam, giornoDopo, istanteRoma, oraRoma, ORIZZONTE_GIORNI } from './disponibilita'
```

Sostituisci `emailPrenotazioneValida` e aggiungi il resto subito dopo. Lascia `intervalloRichiesta` com’è.

```ts
export const EMAIL_PRENOTAZIONE_MAX = 320
export const NOME_PRENOTAZIONE_MAX = 80
export const TELEFONO_PRENOTAZIONE_MAX = 20

export function emailPrenotazioneValida(email: string): boolean {
  const pulita = email.trim()
  return pulita.length <= EMAIL_PRENOTAZIONE_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pulita)
}

export function cifreTelefono(phone: string): string {
  return phone.replace(/\D/g, '')
}

function nomePrenotazioneValido(nome: string): boolean {
  const pulito = nome.trim()
  return pulito.length >= 2 && pulito.length <= NOME_PRENOTAZIONE_MAX && !/[\u0000-\u001f]/.test(pulito)
}

function telefonoPrenotazioneValido(phone: string): boolean {
  const pulito = phone.trim()
  if (pulito.length === 0 || pulito.length > TELEFONO_PRENOTAZIONE_MAX) return false
  const cifre = cifreTelefono(pulito)
  return cifre.length >= 6 && cifre.length <= 15
}

function giornoEntroOrizzonte(giorno: string, adesso: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return false
  const oggi = chiaveGiornoRoma(adesso)
  if (giorno < oggi) return false
  let ultimo = oggi
  for (let passo = 1; passo < ORIZZONTE_GIORNI; passo += 1) ultimo = giornoDopo(ultimo)
  return giorno <= ultimo
}

export function contaAperte(
  righe: readonly { phone?: unknown; email?: unknown }[],
  phone: string,
  email: string,
): { aperteTelefono: number; aperteEmail: number; aperteSalone: number } {
  const cifre = cifreTelefono(phone)
  const normale = email.trim().toLowerCase()
  let aperteTelefono = 0
  let aperteEmail = 0
  for (const riga of righe) {
    const tel = typeof riga.phone === 'string' ? cifreTelefono(riga.phone) : ''
    const mail = typeof riga.email === 'string' ? riga.email.trim().toLowerCase() : ''
    if (cifre.length >= 6 && tel === cifre) aperteTelefono += 1
    if (normale !== '' && mail === normale) aperteEmail += 1
  }
  return { aperteTelefono, aperteEmail, aperteSalone: righe.length }
}

export type IngressoRichiesta =
  | { ok: true; scrivi: false }
  | { ok: true; scrivi: true; nome: string; phone: string; email: string; giorno: string; ora: string }
  | { ok: false; message: string }

export function ingressoRichiestaPubblica(input: {
  nome: string
  phone: string
  email: string
  giorno: string
  ora: string
  esca: string
  aperteTelefono: number
  aperteEmail: number
  aperteSalone: number
  adesso: Date
}): IngressoRichiesta {
  if (input.esca.trim() !== '') return { ok: true, scrivi: false }
  if (!nomePrenotazioneValido(input.nome) || !telefonoPrenotazioneValido(input.phone)) {
    return { ok: false, message: 'Richiesta non valida' }
  }
  if (!emailPrenotazioneValida(input.email)) return { ok: false, message: 'Email obbligatoria' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.giorno) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.ora)) {
    return { ok: false, message: 'Richiesta non valida' }
  }
  if (!giornoEntroOrizzonte(input.giorno, input.adesso)) return { ok: false, message: 'Richiesta non valida' }
  if (input.aperteEmail >= 2) return { ok: false, message: 'Troppe richieste' }
  const spam = decisioneAntispam({
    aperteTelefono: input.aperteTelefono,
    aperteSalone: input.aperteSalone,
    esca: '',
  })
  if (!spam.ok) return { ok: false, message: spam.message }
  return {
    ok: true,
    scrivi: true,
    nome: input.nome.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    giorno: input.giorno,
    ora: input.ora,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/prenotazione.test.ts src/lib/disponibilita.test.ts`

Expected: PASS. Il test vecchio di `intervalloRichiesta` con solo `inizio` resta verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prenotazione.ts src/lib/prenotazione.test.ts
git commit -m "Il cancello della prenotazione pubblica esige giorno, ora e un tetto."
```

---

### Task 2: `inviaRichiestaPer` scrive solo se il cancello e il posto libero dicono sì

**Files:**
- Modify: `functions/src/piano/inviaRichiesta.ts`
- Test: `functions/src/piano/inviaRichiesta.test.ts`

**Interfaces:**
- Consumes: `contaAperte`, `ingressoRichiestaPubblica` dal Task 1. `postiLiberiPer`, `salonPrenota`, `intervalloRichiesta`, `fotoRichiesta`, `razzaRichiesta`, `specieAccettate`.
- Produces: `inviaRichiestaPer` ignora `inizio` e `fine` per decidere se scrivere. Sul documento finiscono `nome`, `phone` ed `email` già normalizzati dall’ingresso. `index.ts` non cambia firma e non riceve la chiave Brevo.

- [ ] **Step 1: Write the failing test**

Crea `functions/src/piano/inviaRichiesta.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('inviaRichiesta pubblica', () => {
  it('non scrive sul ramo inizio/fine e non riceve la chiave Brevo', () => {
    const funzione = readFileSync('functions/src/piano/inviaRichiesta.ts', 'utf8')
    expect(funzione).toContain('ingressoRichiestaPubblica')
    expect(funzione).toContain('contaAperte')
    expect(funzione).not.toContain('quando.giorno && quando.ora')
    const index = readFileSync('functions/src/index.ts', 'utf8')
    const da = index.indexOf('export const inviaRichiesta')
    const a = index.indexOf('function chiaveBrevo')
    const corpo = index.slice(da, a)
    expect(corpo).not.toContain('chiaveBrevo')
    expect(corpo).not.toContain('apiKey')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/inviaRichiesta.test.ts`

Expected: FAIL su `ingressoRichiestaPubblica` assente dal sorgente. L’asserzione su `index.ts` è già vera e deve restare vera.

- [ ] **Step 3: Write minimal implementation**

In `functions/src/piano/inviaRichiesta.ts` sostituisci l’import da `prenotazione`:

```ts
import { contaAperte, esitoEmailPrenotazione, ingressoRichiestaPubblica, intervalloRichiesta, templatePrenotazione } from '../../../src/lib/prenotazione'
```

Sostituisci il corpo di `inviaRichiestaPer` fino al `return`, lasciando `campiRichiesta` invariata. `emailPrenotazioneValida` non serve più qui: ci pensa l’ingresso.

```ts
export async function inviaRichiestaPer(input: {
  salonId: string
  email: string
  phone: string
  nome: string
  inizio: string
  fine: string
  esca: string
  giorno?: string
  ora?: string
  cane?: string
  taglia?: string
  specie?: string
  razza?: string
  foto?: unknown
  servizi?: string[]
}, apiKey?: string): Promise<{ ok: true; id?: string; emailStato: 'inviata' | 'non_inviata' }> {
  if (input.salonId === '' || input.salonId === 'shared' || input.salonId.includes('/')) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  if (!(await salonPrenota(input.salonId))) throw new HttpsError('failed-precondition', 'Prenotazioni spente')
  const db = getFirestore()
  const aperte = await db.collection(`salons/${input.salonId}/richieste`).where('status', '==', 'nuova').get()
  const conti = contaAperte(
    aperte.docs.map((doc) => doc.data()),
    input.phone,
    input.email,
  )
  const ingresso = ingressoRichiestaPubblica({
    nome: input.nome,
    phone: input.phone,
    email: input.email,
    giorno: input.giorno ?? '',
    ora: input.ora ?? '',
    esca: input.esca,
    aperteTelefono: conti.aperteTelefono,
    aperteEmail: conti.aperteEmail,
    aperteSalone: conti.aperteSalone,
    adesso: new Date(),
  })
  if (!ingresso.ok) {
    const codice = ingresso.message === 'Troppe richieste' ? 'resource-exhausted' : 'invalid-argument'
    throw new HttpsError(codice, ingresso.message)
  }
  if (!ingresso.scrivi) return { ok: true, emailStato: 'non_inviata' }
  const razza = razzaRichiesta(input.razza)
  if (!razza) throw new HttpsError('invalid-argument', 'Razza obbligatoria')
  const impostazioni = (await db.doc(`salons/${input.salonId}/settings/main`).get()).data() ?? {}
  if (!specieAccettate(impostazioni.speciePrenotabili).includes(input.specie as 'cane' | 'gatto' | 'altro')) {
    throw new HttpsError('invalid-argument', 'Questo salone non accetta questo animale')
  }
  const foto = fotoRichiesta(input.foto)
  if (!foto) throw new HttpsError('invalid-argument', 'Foto non valida')
  const quando = intervalloRichiesta({ giorno: ingresso.giorno, ora: ingresso.ora })
  if (!quando?.giorno || !quando.ora) throw new HttpsError('invalid-argument', 'Richiesta non valida')
  const liberi = await postiLiberiPer(input.salonId, quando.giorno, 60)
  if (!liberi.orari.includes(quando.ora)) throw new HttpsError('failed-precondition', 'Orario non disponibile')
  const emailStato = esitoEmailPrenotazione(apiKey)
  const token = randomBytes(16).toString('hex')
  const ref = db.collection(`salons/${input.salonId}/richieste`).doc()
  await ref.set({
    status: 'nuova',
    email: ingresso.email,
    phone: ingresso.phone,
    nome: ingresso.nome,
    start: quando.inizio.toISOString(),
    end: quando.fine.toISOString(),
    token,
    emailStato,
    template: templatePrenotazione('nuova'),
    ...campiRichiesta(input, razza, foto),
  })
  if (apiKey) {
    const lingua = await linguaClientiSalon(input.salonId)
    await spedisciHtml(apiKey, tipoEmailPrenotazione('nuova'), lingua, ingresso.email, { nome: ingresso.nome }).catch(() => undefined)
  }
  return { ok: true, id: ref.id, emailStato }
}
```

`input.inizio` e `input.fine` restano nella firma perché `index.ts` li manda ancora. Non entrano in `intervalloRichiesta`. Se nel file trovi già `durataMin` al posto di `60`, lascia quel numero e rendi comunque obbligatoria la chiamata a `postiLiberiPer`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/inviaRichiesta.test.ts src/lib/prenotazione.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/inviaRichiesta.ts functions/src/piano/inviaRichiesta.test.ts
git commit -m "La prenotazione pubblica non scrive senza giorno, ora e posto libero."
```

---

### Task 3: `preparaRichiesta` non crea più segnaposto

**Files:**
- Modify: `functions/src/piano/postiLiberi.ts`
- Test: `functions/src/piano/postiLiberi.test.ts`
- Modify: `scripts/emu/postiLiberi.mjs`

**Interfaces:**
- Consumes: niente dal Task 1. La callable in `index.ts` può continuare a chiamare `preparaRichiestaPer` con gli stessi argomenti.
- Produces: `preparaRichiestaPer` lancia `HttpsError` `failed-precondition` con messaggio `Richiesta non valida` e non legge Firestore.

- [ ] **Step 1: Write the failing test**

In `functions/src/piano/postiLiberi.test.ts`, accanto all’import esistente di `appuntamentoOccupato` e `dataDi`, importa `preparaRichiestaPer`. Aggiungi:

```ts
it('preparaRichiesta non scrive più', async () => {
  await expect(preparaRichiestaPer({ salonId: 'salone', phone: '3331234567', esca: '' })).rejects.toThrow('Richiesta non valida')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/src/piano/postiLiberi.test.ts`

Expected: FAIL. Oggi la function prova a leggere Firestore (`salonPrenota` / `getFirestore`) invece di rifiutare subito. L’errore non è `Richiesta non valida`, oppure il test resta appeso sulla rete. Se parte l’emulatore e la function ritorna `{ ok: true }`, il test fallisce lo stesso perché si aspettava un rifiuto.

- [ ] **Step 3: Write minimal implementation**

Sostituisci l’intera `preparaRichiestaPer` in `functions/src/piano/postiLiberi.ts` con:

```ts
export async function preparaRichiestaPer(_input: { salonId: string; phone: string; esca: string }): Promise<{ ok: true }> {
  throw new HttpsError('failed-precondition', 'Richiesta non valida')
}
```

Togli dal file ciò che resta usato solo da quella function (`decisioneAntispam`, se l’import non serve ad altro in `postiLiberi.ts`). `appuntamentoOccupato`, `postiLiberiPer` e `calendarioLiberiPer` restano.

In `scripts/emu/postiLiberi.mjs` sostituisci il blocco da `const esca` fino a `terza.error?.message === 'Troppe richieste'` con:

```js
const esca = await chiama('preparaRichiesta', { salonId, phone: '3332222222', esca: 'sono un bot' })
const dopoEsca = await db.collection(`salons/${salonId}/richieste`).where('phone', '==', '3332222222').get()
const chiusa = await chiama('preparaRichiesta', { salonId, phone: '3333333333', esca: '' })
const ok = Array.isArray(orari)
  && orari.includes('09:00')
  && orari.includes('11:00')
  && !orari.includes('10:00')
  && !orari.includes('12:00')
  && !testo.includes('Rex')
  && !testo.includes('Fido')
  && esca.error?.message === 'Richiesta non valida'
  && chiusa.error?.message === 'Richiesta non valida'
  && dopoEsca.empty
```

Aggiorna anche il `console.log` finale: non citare `prima`, `seconda`, `terza`. Stampa `esca.error` e `chiusa.error`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/src/piano/postiLiberi.test.ts functions/src/piano/inviaRichiesta.test.ts src/lib/prenotazione.test.ts`

Expected: PASS. `scripts/emu/postiLiberi.mjs` non fa parte di `npm test`: si lancia solo a mano con gli emulatori demo.

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/postiLiberi.ts functions/src/piano/postiLiberi.test.ts scripts/emu/postiLiberi.mjs
git commit -m "preparaRichiesta non crea più segnaposto aperti."
```

---

### Task 4: Verifica del pacchetto e deploy delle Functions

**Files:**
- Nessun file nuovo. Si controlla che i tre commit precedenti siano l’intero diff di questo piano.

**Interfaces:**
- Consumes: i tre commit.
- Produces: le Functions `inviaRichiesta` e `preparaRichiesta` in produzione su `groomly-3128b`. Nessuna nuova versione dell’app.

- [ ] **Step 1: Write the failing test**

Non c’è un test nuovo. La verifica è la suite dei file toccati.

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/lib/prenotazione.test.ts src/lib/disponibilita.test.ts functions/src/piano/inviaRichiesta.test.ts functions/src/piano/postiLiberi.test.ts`

Expected: PASS

- [ ] **Step 3: Build the functions**

Run: `npm --prefix functions run build`

Expected: `tsc` esce 0. Se il piano delle schermate ha cambiato il tipo di `inviaRichiestaPer`, questo build è il punto in cui si vede il conflitto: tieni `durataMin` di quel piano e il cancello di questo.

- [ ] **Step 4: Deploy only the functions**

Serve `firebase` autenticato sul progetto `groomly-3128b`. Se il login manca, fermati e dillo. Non fare il deploy di Hosting e non alzare la versione.

```powershell
npx firebase deploy --only functions:inviaRichiesta,functions:preparaRichiesta --project groomly-3128b
```

Expected: le due function risultano aggiornate in `europe-west1`. Se il CLI rifiuta i nomi filtrati, lo stesso comando con `--only functions`.

- [ ] **Step 5: Non creare un commit vuoto**

Questo task non cambia file. Non fare commit se `git status` è pulito.
