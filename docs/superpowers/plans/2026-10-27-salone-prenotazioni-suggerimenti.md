# Salone, prenotazioni, logo e suggerimenti — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il titolare vede Profilo base, Servizio base, Servizio Pro e Servizio Salone; con profilo completo e Pro può copiare il link di prenotazione; la pagina pubblica mostra il salone; il logo sta a sinistra del nome; Suggerimenti è solo il modulo.

**Architecture:** Il catalogo vive in `PianoPagine.tsx` (vetrina e strumenti). La regola di accensione è pura in `prenotazionePubblica.ts`. L’HTML pubblico lo costruisce `htmlPaginaPubblica` e lo serve `paginaPubblica` su `/s/{slug}`. Il browser parla solo con le callable già pubbliche. I token restano quelli di `src/theme/tokens.css`.

**Tech Stack:** React 19, React Router, Vitest, Testing Library, Firebase Functions v2 (`europe-west1`), Hosting rewrite, i18n `it` / `en` / `es`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-27-salone-prenotazioni-suggerimenti-design.md`. In caso di dubbio vince la spec.
- Non introdurre la palette verde acqua né Varela Round né Nunito. Colori: variabili di `src/theme/tokens.css`.
- `mostraPiani` e `abbonamentiAttivi` restano false. Nessun prezzo in interfaccia. La prova 30 giorni resta solo Pro.
- Tre lingue insieme: ogni chiave nuova in `src/i18n/it.ts`, `en.ts`, `es.ts`.
- `npm test` non apre la rete.
- Non committare APK, `android/app/build`, `.env.local`.
- Non alzare `APP_VERSION` prima del task 9. Il task 9 parte solo con i test dei task precedenti verdi.
- Il collaboratore non apre la paywall. Il dettaglio delle righe bloccate è «Lo accende il titolare.»
- Partita IVA e codice fiscale non compaiono sulla pagina pubblica se `mostraDatiFiscali` non è true.

---

### Task 1: Regola pura di accensione e link

**Files:**
- Create: `src/lib/prenotazionePubblica.ts`
- Create: `src/lib/prenotazionePubblica.test.ts`

**Interfaces:**
- Produces:
  - `export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale'`
  - `export function puoAccenderePrenotazioni(input: { accesso: boolean; completo: boolean; vat: string; tax: string }): { ok: true } | { ok: false; manca: MancaPrenotazione }`
  - `export function linkPrenotazione(slug: string): string`

- [ ] **Step 1: Test che fallisce**

`src/lib/prenotazionePubblica.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { linkPrenotazione, puoAccenderePrenotazioni } from './prenotazionePubblica'

describe('puoAccenderePrenotazioni', () => {
  it('chiede prima il piano, poi il profilo, poi il fiscale', () => {
    expect(puoAccenderePrenotazioni({ accesso: false, completo: false, vat: '', tax: '' })).toEqual({ ok: false, manca: 'piano' })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: false, vat: '123', tax: '' })).toEqual({ ok: false, manca: 'profilo' })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '  ', tax: '' })).toEqual({ ok: false, manca: 'fiscale' })
  })

  it('accetta la partita IVA oppure il codice fiscale', () => {
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '', tax: 'RSSMRA' })).toEqual({ ok: true })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '01234567890', tax: '' })).toEqual({ ok: true })
  })
})

describe('linkPrenotazione', () => {
  it('compone lo slug pubblico e rifiuta uno slug vuoto o sporco', () => {
    expect(linkPrenotazione('i-pelosetti')).toBe('https://groomlyapp.it/s/i-pelosetti')
    expect(linkPrenotazione('')).toBe('')
    expect(linkPrenotazione('Maiuscole')).toBe('')
    expect(linkPrenotazione('../segreto')).toBe('')
  })
})
```

- [ ] **Step 2: Lancia il test**

Run: `npx vitest run src/lib/prenotazionePubblica.test.ts`

Expected: FAIL, modulo assente.

- [ ] **Step 3: Implementazione**

`src/lib/prenotazionePubblica.ts`:

```ts
export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale'

export function puoAccenderePrenotazioni(input: {
  accesso: boolean
  completo: boolean
  vat: string
  tax: string
}): { ok: true } | { ok: false; manca: MancaPrenotazione } {
  if (!input.accesso) return { ok: false, manca: 'piano' }
  if (!input.completo) return { ok: false, manca: 'profilo' }
  if (input.vat.trim() === '' && input.tax.trim() === '') return { ok: false, manca: 'fiscale' }
  return { ok: true }
}

export function linkPrenotazione(slug: string): string {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return ''
  return `https://groomlyapp.it/s/${slug}`
}
```

- [ ] **Step 4: Il test passa**

Run: `npx vitest run src/lib/prenotazionePubblica.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prenotazionePubblica.ts src/lib/prenotazionePubblica.test.ts
git commit -m "Aggiunge la regola per accendere la prenotazione online."
```

---

### Task 2: Logo a sinistra del nome

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (il pulsante con `aria-label={frasi.hubGestisci}`, circa le righe 909–920)
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: niente del task 1. `logoSrc`, `riquadroLogo`, `iniziale`, `headline.title` restano.

- [ ] **Step 1: Test che fallisce**

Nel describe delle impostazioni del titolare, aggiungi:

```ts
it('mette il logo a sinistra del nome della toelettatura', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, role: 'titolare' })
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  const pulsante = await screen.findByRole('button', { name: 'Gestisci account Groomly' })
  const marchio = pulsante.querySelector('img, span[aria-hidden="true"]')
  const nome = pulsante.querySelector('span:not([aria-hidden])')
  expect(marchio).not.toBeNull()
  expect(nome).not.toBeNull()
  expect(marchio!.compareDocumentPosition(nome!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
```

- [ ] **Step 2: Lancia il test**

Run: `npx vitest run src/pages/SettingsPage.test.tsx -t "logo a sinistra"`

Expected: FAIL, perché il nome oggi precede il marchio.

- [ ] **Step 3: Scambia l’ordine nel pulsante**

In `SettingsPage.tsx`, dentro il `button` di `hubGestisci`, il primo figlio è il marchio e il secondo è il nome. Il nome tiene `flex: 1`. Non cambiare misura 48, `riquadroLogo`, né la matita.

```tsx
{logoSrc ? (
  <img alt="" src={logoSrc} width={48} height={48} style={riquadroLogo(formaLogo(settings.priceSheet?.intestazione.logoForma), 48)} />
) : (
  <span aria-hidden style={{ width: 48, height: 48, borderRadius: 24, display: 'grid', placeItems: 'center', background: 'var(--surf)', fontWeight: 750 }}>{iniziale}</span>
)}
<span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 22, lineHeight: 1.15, ...USER_TEXT }}>{empty || !ready ? (ready ? frasi.homeAggiungi : '…') : headline.title}</span>
```

- [ ] **Step 4: Il test passa**

Run: `npx vitest run src/pages/SettingsPage.test.tsx -t "logo a sinistra"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "Mette il logo a sinistra del nome in Impostazioni."
```

---

### Task 3: Suggerimenti, solo il modulo

**Files:**
- Modify: `src/lib/categorieSuggerimento.ts`
- Modify: `src/pages/SuggerimentiPage.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Create: `src/pages/SuggerimentiPage.test.tsx`

**Interfaces:**
- Produces: `CATEGORIE_SUGGERIMENTO` con gli id `bug`, `critica`, `miglioramento`, `manca`, `agenda`, `animali`, `listino`, `incassi`, `account`, `lingua`, `altro`.
- Consumes: `inviaSuggerimento` invariato. Il campo `categoria` è una stringa.

- [ ] **Step 1: Allunga l’elenco**

`src/lib/categorieSuggerimento.ts`:

```ts
export const CATEGORIE_SUGGERIMENTO = [
  'bug',
  'critica',
  'miglioramento',
  'manca',
  'agenda',
  'animali',
  'listino',
  'incassi',
  'account',
  'lingua',
  'altro',
] as const

export type CategoriaSuggerimento = (typeof CATEGORIE_SUGGERIMENTO)[number]
```

Chiavi nuove, stesso testo concettuale nelle tre lingue:

| Chiave | it | en | es |
| --- | --- | --- | --- |
| `sugCatBug` | Qualcosa non funziona | Something does not work | Algo no funciona |
| `sugCatCritica` | Una schermata è scomoda o poco chiara | A screen is awkward or unclear | Una pantalla es incómoda o poco clara |
| `sugCatMigliora` | Una funzione che c’è già si può fare meglio | A feature that exists could work better | Una función que ya está puede ir mejor |
| `sugCatManca` | Manca una funzione che mi servirebbe | A feature I need is missing | Falta una función que necesitaría |
| `sugCatAgenda` | Agenda, orari o appuntamenti | Diary, hours or appointments | Agenda, horarios o citas |
| `sugCatAnimali` | Schede degli animali | Pet records | Fichas de los animales |
| `sugCatListino` | Listino, servizi o prezzi | Price list, services or prices | Lista, servicios o precios |
| `sugCatIncassi` | Incassi, report o export | Earnings, reports or export | Ingresos, informes o exportación |
| `sugCatAccount` | Account, backup o accesso | Account, backup or access | Cuenta, copia o acceso |
| `sugCatLingua` | Una scritta o una lingua | Some wording or a language | Un texto o un idioma |
| `sugCatAltro` | Altro | Something else | Otra cosa |
| `sugScrivi` | Che cosa vorresti suggerire? | What would you like to suggest? | ¿Qué te gustaría sugerir? |
| `sugTesto` | Scrivi qui | Write it here | Escríbelo aquí |
| `hubSuggerimentiDettaglio` | Segnala un problema o un’idea | Report a problem or an idea | Señala un problema o una idea |

Sostituisci i valori esistenti di `sugCatBug`, `sugCatCritica`, `sugCatMigliora`, `sugCatManca`, `sugCatLingua`, `sugCatAltro`, `sugScrivi`, `hubSuggerimentiDettaglio`. Aggiungi le chiavi mancanti. `sugGuida` e `sugNovita` possono restare nel file lingue: la pagina non le legge più.

- [ ] **Step 2: Test che fallisce**

`src/pages/SuggerimentiPage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'

describe('Suggerimenti', () => {
  it('è un modulo, senza guida, novità e notifiche', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const account = getAccount()
    if (!account) throw new Error('account assente')
    writeJson(storageKeys.auth, { ...account, role: 'titolare' })
    render(<App memory isDev={false} initialPath="/impostazioni/suggerimenti" />)
    expect(await screen.findByRole('radiogroup', { name: 'Che cosa vorresti suggerire?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Agenda, orari o appuntamenti' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Qualcosa non funziona' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Guida rapida')).not.toBeInTheDocument()
    expect(screen.queryByText('Novità')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Notifiche' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Schede degli animali' }))
    expect(screen.getByRole('radio', { name: 'Schede degli animali' })).toHaveAttribute('aria-checked', 'true')
  })
})
```

Se `impNotifiche` in italiano non è «Notifiche», il test usa la stringa reale e comunque la pagina non deve contenere un link a `/impostazioni/notifiche`.

- [ ] **Step 3: Lancia il test**

Run: `npx vitest run src/pages/SuggerimentiPage.test.tsx`

Expected: FAIL.

- [ ] **Step 4: Riscrivi la pagina**

Togli import di `ChevronRight`, `Link`, `aggiornamentiApkAttivi`. Un solo `Card`. Il gruppo:

```tsx
<div role="radiogroup" aria-label={frasi.sugScrivi}>
  {CATEGORIE_SUGGERIMENTO.map((id, index) => {
    const acceso = categoria === id
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={acceso}
        onClick={() => setCategoria(id)}
        style={{
          width: '100%',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: 0,
          borderTop: index === 0 ? 'none' : '1px solid var(--line)',
          background: acceso ? 'var(--pri-s)' : 'transparent',
          color: acceso ? 'var(--pri-ink)' : 'var(--tx)',
          font: 'inherit',
          fontSize: 14,
          fontWeight: 650,
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1 }}>{frasi[ETICHETTA[id]]}</span>
        {acceso ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
      </button>
    )
  })}
</div>
```

`ETICHETTA` mappa anche `agenda`, `animali`, `listino`, `incassi`, `account`. Sotto la card, subito, `<label>` con `frasi.sugTesto` e il `textarea` (`minHeight: 96`, `maxHeight: 160`). Poi `Button` Invia. Il contenitore della pagina usa `gap: 8` e non `flex: 1` sulla card. Cancella le due card di guida, novità e notifiche. Il `Dialog` di grazie resta. `Check` viene da `lucide-react`.

- [ ] **Step 5: Il test passa**

Run: `npx vitest run src/pages/SuggerimentiPage.test.tsx`

Expected: PASS. Se `en.ts` o `es.ts` non soddisfano `Record<keyof typeof italiano, string>`, il build dei tipi fallisce: aggiungi lì le stesse chiavi.

- [ ] **Step 6: Commit**

```bash
git add src/lib/categorieSuggerimento.ts src/pages/SuggerimentiPage.tsx src/pages/SuggerimentiPage.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Riduce Suggerimenti al modulo, con le categorie nel tema dell'app."
```

---

### Task 4: Quattro gruppi in Piano e in Funzioni

**Files:**
- Modify: `src/pages/PianoPagine.tsx`
- Modify: `src/pages/pianoBase.test.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`

**Interfaces:**
- Consumes: `haAccesso` da `src/lib/piano.ts`, `usePiano().avvisa`, `usePiano().apriPaywall`.
- Produces: titoli `profiloBase`, `servizioBase`, `servizioPro`, `servizioSalone`.

- [ ] **Step 1: Chiavi**

| Chiave | it | en | es |
| --- | --- | --- | --- |
| `profiloBase` | Profilo base | Base profile | Perfil base |
| `servizioBase` | Servizio base | Base service | Servicio base |
| `servizioPro` | Servizio Pro | Pro service | Servicio Pro |
| `servizioSalone` | Servizio Salone | Salon service | Servicio salón |
| `profiloBaseTesto` | Agenda, schede degli animali e listino. Restano sempre, anche con Pro o Salone. | Diary, pet records and the price list. They stay, with Pro or Salon too. | Agenda, fichas y lista. Siguen ahí, también con Pro o Salón. |
| `servizioSaloneIntro` | Include tutto il Servizio Pro, più l’invito di collaboratori e soci. | It includes every Pro service, plus inviting staff and partners. | Incluye todo el Pro, más invitar a colaboradores y socios. |
| `servizioProIntro` | Si sbloccano con il Servizio Pro. Il Salone le include. | They unlock with Pro. Salon includes them. | Se desbloquean con Pro. El salón las incluye. |
| `sbloccaSalone` | Si sblocca con Salone | Unlocks with Salon | Se desbloquea con Salón |
| `avvisaSalone` | Avvisami per il Salone | Tell me when Salon is available | Avísame cuando haya Salón |
| `pianoLoAccendeTitolare` | Lo accende il titolare. | The owner turns this on. | Lo enciende el titular. |

`funzioniBaseIntro` resta la frase del Servizio base.

- [ ] **Step 2: Aggiorna il test del piano base**

In `src/pages/pianoBase.test.tsx`, dopo il click su «Piano, Base», sostituisci le attese sui titoli:

```ts
expect(screen.getByRole('heading', { name: 'Profilo base' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Servizio base' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Servizio Pro' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Servizio Salone' })).toBeInTheDocument()
expect(screen.getByText('Prenotazioni online')).toBeInTheDocument()
expect(screen.queryByText('Collaboratori')).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Avvisami per il Salone' })).toBeInTheDocument()
```

Togli `Collaboratori` da `PRO_VETRINA` prima di far passare il test: la voce team non sta nel gruppo Pro. Il pulsante «Prova Pro gratis per 30 giorni» resta e chiama ancora `apriPaywall`.

- [ ] **Step 3: Lancia il test**

Run: `npx vitest run src/pages/pianoBase.test.tsx`

Expected: FAIL sui titoli nuovi.

- [ ] **Step 4: PianoPage**

Cancella il ramo `if (attivo) return …servAttivo`. La pagina mostra sempre, in ordine:

1. `SectionTitle` Profilo base e un paragrafo `profiloBaseTesto`.
2. `GruppoVetrina` del Servizio base con `BASE_VETRINA` (messaggi, affidabilità, note vocali, WhatsApp «Da sviluppare»).
3. `GruppoVetrina` del Servizio Pro con `PRO_VETRINA` senza la voce `hubCollaboratori`.
4. Se `piano.stato.livello === 'base'` e `!piano.provaUsata`, il bottone prova. Se la prova è usata e il livello è base, un bottone «Avvisami» che chiama `void piano.avvisa('prenotazioni')`.
5. `SectionTitle` Servizio Salone, paragrafo `servizioSaloneIntro`, card con due righe: `frasi.hubCollaboratori` / `frasi.impInvita`, e `frasi` per i posti (`postiExtra` ha già un nome in lingue: se manca, chiave `postiExtraEtichetta` = «Posti in più» / «Extra seats» / «Puestos de más»).
6. Se `haAccesso(piano.stato, 'team')` è falso, bottone `avvisaSalone` → `void piano.avvisa('team')`. Se è vero, la riga collaboratori è un `Link` a `/impostazioni/pro`.

Importa `haAccesso` da `src/lib/piano.ts`.

In `StrumentiPage`, i `SectionTitle` diventano `servizioBase`, `servizioPro`, `servizioSalone`. Dopo il card Pro aggiungi un card Salone. La riga `team`, se `funzioneVisibile(..., 'team')`, naviga a `/impostazioni/pro`. Se il ruolo è `collaboratore`, il dettaglio è `pianoLoAccendeTitolare` e il click non chiama `apriPaywall`. Il titolare senza accesso chiama `apriPaywall('team')`. `postiExtra` segue la stessa regola, senza navigare. L’array `PRO` non contiene `team`.

- [ ] **Step 5: Il test passa**

Run: `npx vitest run src/pages/pianoBase.test.tsx src/pages/SettingsPage.test.tsx src/pages/ProPage.test.tsx`

Expected: PASS. Se un test cerca il titolo «Funzioni Pro» sulla pagina Strumenti, aggiorna quel titolo a «Servizio Pro» solo dove la pagina è `StrumentiPage`. `ProPage` (inviti) tiene `impFunzioni` finché il task non lo cambia: non rinominare la pagina inviti.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PianoPagine.tsx src/pages/pianoBase.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Mostra Profilo base, Pro e Salone come tre servizi distinti."
```

Aggiungi anche i test che hai dovuto toccare per il titolo.

---

### Task 5: L’interruttore operatore dice Salone

**Files:**
- Modify: `src/pages/UsersPage.tsx` (la `label` del `Toggle`, circa riga 214)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`

**Interfaces:**
- Consumes: `cambiaPiano`, che già scrive `salone` quando l’interruttore si accende. Non cambiare `cambiaPiano`.

- [ ] **Step 1: Chiave**

`servizioSalonePer`: it `Servizio Salone per {{nome}}`, en `Salon service for {{nome}}`, es `Servicio salón para {{nome}}`.

- [ ] **Step 2: Sostituisci la label**

```tsx
label={frasi.servizioSalonePer.replace('{{nome}}', row.ownerName)}
```

Non togliere i pulsanti Prova, Pro omaggio, Salone omaggio, Torna a base.

- [ ] **Step 3: Test**

In `src/pages/UsersPage.test.tsx`, se un test cerca «Servizio Pro per», aggiornalo a «Servizio Salone per». Lancia:

Run: `npx vitest run src/pages/UsersPage.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/UsersPage.tsx src/pages/UsersPage.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "L'interruttore operatore dice Servizio Salone, perché accende il Salone."
```

---

### Task 6: Dialogo Prenotazioni online

**Files:**
- Modify: `src/data/local/settings.ts` (`prenotazioniOnline?: boolean` su `SettingsMain`, `blankSettings` non lo mette, `mergeSettings` lo tiene solo se `=== true`)
- Modify: `src/pages/PianoPagine.tsx` (il ramo `scelta === 'prenotazioni'` del dialogo)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`

**Interfaces:**
- Consumes: `puoAccenderePrenotazioni`, `linkPrenotazione` dal task 1. `avanzamentoSalone` e `passiCompletamento` da `src/lib/completaSalone.ts`. `callPubblicaSalone` già usata nel dialogo. `haAccesso(piano.stato, 'prenotazioni')`.
- Produces: `settings.prenotazioniOnline`.

- [ ] **Step 1: Campo**

In `mergeSettings`, accanto a `fedeltaAccesa`:

```ts
prenotazioniOnline: existing.prenotazioniOnline === true,
```

- [ ] **Step 2: Test del dialogo**

Aggiungi in `src/pages/pianoBase.test.tsx` un caso con `stato` di un documento `piano: 'pro'` (usa `statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'omaggio' }, new Date(2026, 9, 25))` e controlla la forma di `ProMain` in `src/lib/piano.ts`). `initialPath` è `/impostazioni/strumenti`. Il salvataggio delle impostazioni di test non ha logo, quindi `completo` è falso.

Attese:

- il click su «Prenotazioni online» non mostra `https://groomlyapp.it`;
- mostra il testo del passo mancante (chiave `prenotaMancaProfilo`).

Secondo caso, nello stesso file o in un test puro già coperto dal task 1: non ripetere `puoAccenderePrenotazioni`. Qui si prova solo che il dialogo nasconde il link.

- [ ] **Step 3: Lancia il test**

Run: `npx vitest run src/pages/pianoBase.test.tsx`

Expected: FAIL, il dialogo attuale mostra «Pubblica la pagina» anche senza il profilo.

- [ ] **Step 4: Ramo prenotazioni**

Calcola i passi come in `SettingsPage` (`passiCompletamento`). `completo = avanzamentoSalone(passi).completo`. `decisione = puoAccenderePrenotazioni({ accesso: haAccesso(piano.stato, 'prenotazioni'), completo, vat: settings.business.vatNumber, tax: settings.business.taxCode })`.

Se `decisione.ok` è falso e `decisione.manca === 'profilo'`, elenca i passi con `fatto === false` come bottoni che navigano: `logo` → `/listino/gestione`, `sede` → `/impostazioni/account?scheda=personali&modifica=toelettatura`, `listino` → `/listino`, `backup` → `/impostazioni` con `state: { openBackup: true }`, `email` → `/impostazioni/account?scheda=sicurezza`. Se `manca === 'fiscale'`, un solo bottone verso il dialogo Toelettatura e il testo `prenotaMancaFiscale` («Serve la partita IVA oppure il codice fiscale.»).

Se `decisione.ok`, mostra `Toggle` legato a `settings.prenotazioniOnline`. All’accensione: `callPubblicaSalone(settings.business.salonName)`. Se risolve, `save` con `prenotazioniOnline: true` e mostra `linkPrenotazione` dello slug restituito se la callable restituisce `{ slug }`, altrimenti `linkPrenotazione(slugDaNome(settings.business.salonName))`. Se rifiuta con messaggio che contiene «Nome già preso», non salvare `true` e mostra quel messaggio. Allo spegnimento: `save` con `false`.

Bottone Copia: `navigator.clipboard.writeText(link)`. Per due secondi l’etichetta è `prenotaCopiato` («Copiato»). Frase sotto: `prenotaBio` («Metti questo link nella bio di Instagram o di Facebook.»).

Chiavi:

| Chiave | it |
| --- | --- |
| `prenotaMancaProfilo` | Per accendere la pagina completa il profilo, 5 su 5. |
| `prenotaMancaFiscale` | Serve la partita IVA oppure il codice fiscale. |
| `prenotaBio` | Metti questo link nella bio di Instagram o di Facebook. |
| `prenotaCopia` | Copia |
| `prenotaCopiato` | Copiato |
| `prenotaInterruttore` | Prenotazioni online |

Traduci en/es nello stesso giro. Il bottone vecchio «Pubblica la pagina» non è più l’azione principale: l’interruttore pubblica.

- [ ] **Step 5: Il test passa**

Run: `npx vitest run src/pages/pianoBase.test.tsx src/lib/prenotazionePubblica.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/local/settings.ts src/pages/PianoPagine.tsx src/pages/pianoBase.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "Accende la prenotazione solo a profilo completo e consegna il link."
```

---

### Task 7: HTML della pagina pubblica

**Files:**
- Create: `src/lib/paginaPubblica.ts`
- Create: `src/lib/paginaPubblica.test.ts`
- Create: `functions/src/piano/paginaPubblica.ts`
- Modify: `functions/src/index.ts` (export `onRequest`)
- Modify: `firebase.json` (rewrite `/s/**`)
- Create: `hosting/s/pagina.js`

**Interfaces:**
- Consumes: `profiloPubblico` da `src/lib/slug.ts`. `saloneInfoPer` resta per la callable. La function HTTP rilegge con la stessa logica, poi passa il risultato a `htmlPaginaPubblica`.
- Produces:
  - `export function htmlPaginaPubblica(input: { lang: 'it' | 'en' | 'es'; nome: string; indirizzo: string; telefono: string; prenotabile: boolean; salonId: string; vat?: string }): string`

- [ ] **Step 1: Test che fallisce**

```ts
import { describe, expect, it } from 'vitest'
import { htmlPaginaPubblica } from './paginaPubblica'

const base = { lang: 'it' as const, nome: 'I Pelosetti', indirizzo: 'Via Roma 1', telefono: '3331234567', prenotabile: true, salonId: 'abc' }

describe('htmlPaginaPubblica', () => {
  it('mette il nome nel title e in og:title, senza partita IVA', () => {
    const html = htmlPaginaPubblica({ ...base, vat: '01234567890' })
    expect(html).toContain('<title>I Pelosetti</title>')
    expect(html).toContain('property="og:title" content="I Pelosetti"')
    expect(html).not.toContain('01234567890')
    expect(html).toContain('"prenotabile":true')
    expect(html).toContain('/s/pagina.js')
  })

  it('con prenotabile false il JSON non invita a prenotare', () => {
    const html = htmlPaginaPubblica({ ...base, prenotabile: false })
    expect(html).toContain('"prenotabile":false')
  })

  it('sfugge il nome', () => {
    const html = htmlPaginaPubblica({ ...base, nome: 'A & B <script>' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('A &amp; B')
  })
})
```

Il nome pericoloso nel JSON va serializzato con `JSON.stringify`, che non chiude il tag script se si sostituisce `<` con `\u003c` nella stringa JSON. Il test del nome controlla l’HTML del title, non il JSON.

- [ ] **Step 2: Lancia il test**

Run: `npx vitest run src/lib/paginaPubblica.test.ts`

Expected: FAIL.

- [ ] **Step 3: Funzione pura**

`htmlPaginaPubblica` restituisce un documento con:

- viewport e `theme-color` non servono oltre al viewport `width=device-width, initial-scale=1`;
- CSS interno che definisce `--bg:#ECEFF4`, `--card:#FFFFFF`, `--pri:#3A5BA0`, `--on-pri:#FFFFFF`, `--pri-s:#E6ECF8`, `--pri-ink:#2C4785`, `--tx:#141B2B`, `--tx2:#525D71`, `--line:#E1E6EE`, `--sh-2:0 1px 2px rgba(22,34,64,.05), 0 6px 16px -6px rgba(22,34,64,.12)`, `--bad:#C0362C`;
- `@media (prefers-color-scheme: dark)` con i valori del blocco `[data-theme="dark"]` di `src/theme/tokens.css` per quelle stesse variabili;
- `main` `max-width:880px; margin:0 auto; padding:16px`;
- `@media (min-width:900px)` `main` in griglia `minmax(280px,340px) 1fr` con `gap:16px`;
- card `background:var(--card); border-radius:12px; box-shadow:var(--sh-2); padding:16px`;
- un `<h1>` col nome sfuggito;
- `application/json` id `profilo` con `nome`, `indirizzo`, `telefono`, `prenotabile`, `salonId` (niente `vat`);
- `<script src="/s/pagina.js" defer></script>`;
- se `prenotabile` è false, un paragrafo «Gestito con Groomly» e nessun form nel HTML statico. Il form lo monta `pagina.js` solo leggendo `prenotabile === true`.

Escape HTML: `& < > "`.

- [ ] **Step 4: Function e rewrite**

`functions/src/piano/paginaPubblica.ts` esporta `paginaPubblicaHttp(req, res)` che:

- prende l’ultimo segmento del path, toglie la query;
- se non passa `/^[a-z0-9-]{1,80}$/`, risponde 404 con `htmlPaginaPubblica` di un nome «Questa pagina non c’è.» e `prenotabile: false`, `salonId: ''`;
- altrimenti chiama la lettura già in `saloneInfoPer`. Se lancia `not-found`, stesso 404;
- `prenotabile` è true solo se `settings.prenotazioniOnline === true` e `haAccesso(statoPiano(pro/main), 'prenotazioni')`. Non rileggere i cinque passi qui: l’email verificata non sta sul documento del salone. Il controllo 5/5 e fiscale resta nel dialogo del task 6;
- `lang` da `?lang=` se è `it`, `en` o `es`, altrimenti `it`;
- `res.status(200).set('Cache-Control','no-cache').set('Content-Type','text/html; charset=utf-8').send(html)`.

In `functions/src/index.ts`:

```ts
import { onRequest } from 'firebase-functions/v2/https'
import { paginaPubblicaHttp } from './piano/paginaPubblica'

export const paginaPubblica = onRequest({ region: 'europe-west1', invoker: 'public' }, (req, res) => {
  paginaPubblicaHttp(req, res).catch(() => {
    res.status(500).send('')
  })
})
```

`firebase.json`, dentro `hosting.rewrites`, prima della fine dell’array:

```json
{ "source": "/s/**", "function": { "functionId": "paginaPubblica", "region": "europe-west1" } }
```

- [ ] **Step 5: pagina.js**

`hosting/s/pagina.js` legge `#profilo`. Se `prenotabile` non è true, disegna solo biglietto: nome (già nell’h1), indirizzo, telefono, due link `tel:` e, se il telefono ha 9–10 cifre e inizia per 3, `https://wa.me/39` più le cifre. Chip «Gestito con Groomly». Nessun form.

Se `prenotabile` è true, quattro chip di progresso e un passo alla volta, come la spec. Gli orari li chiede alla callable `postiLiberi` già esportata, regione `europe-west1`, progetto `groomly-3128b`. L’invio chiama `preparaRichiesta` poi `inviaRichiesta` con `esca` dal campo nascosto. Non usare l’SDK Firestore. Il file delle callable dal browser può usare `firebase/functions` solo se l’hosting ha già la config in un altro script: se non c’è, `pagina.js` fa `fetch` POST verso `https://europe-west1-groomly-3128b.cloudfunctions.net/{nome}` con il corpo JSON delle callable v2 (`{ data: { ... } }`). Controlla un chiamante esistente in `hosting/` prima di inventare il formato: `hosting/app-check.js` e le pagine azione. Se il formato del body è diverso, usa quello.

Durata inviata a `postiLiberi`: 60 finché il task 8 non passa le durate dei servizi. Il passo servizio elenca i servizi che il JSON porta in `servizi` (array, default vuoto). Se l’array è vuoto, un’unica scelta «Appuntamento» con durata 60.

La callable si chiama come in `scripts/emu/prenotazione.mjs`: `POST` con header `Content-Type: application/json` e corpo `JSON.stringify({ data })`. In produzione l’URL è `https://europe-west1-groomly-3128b.cloudfunctions.net/` più il nome (`saloneInfo` non serve: i dati sono già nel JSON della pagina; servono `postiLiberi`, `preparaRichiesta`, `inviaRichiesta`).

Dopo l’ok, sostituisci il form con «Richiesta inviata a {nome}. Ti arriverà un’email.» Le stringhe visibili del biglietto e del modulo stanno in un oggetto `{ it, en, es }` dentro `pagina.js`, scelta dal `lang` del JSON (aggiungi `lang` al JSON di `htmlPaginaPubblica`).

- [ ] **Step 6: Test e build functions**

Run: `npx vitest run src/lib/paginaPubblica.test.ts`

Run: `npm --prefix functions run build`

Expected: entrambi verdi. Il test di `htmlPaginaPubblica` non chiama la rete.

- [ ] **Step 7: Commit**

```bash
git add src/lib/paginaPubblica.ts src/lib/paginaPubblica.test.ts functions/src/piano/paginaPubblica.ts functions/src/index.ts firebase.json hosting/s/pagina.js
git commit -m "Serve la pagina del salone su /s/slug con il nome nell'anteprima."
```

---

### Task 8: La richiesta porta cane e servizi, e si rifiuta se è spenta

**Files:**
- Modify: `functions/src/piano/inviaRichiesta.ts`
- Modify: `functions/src/piano/postiLiberi.ts`
- Modify: `functions/src/index.ts` (passa i campi nuovi)
- Modify: `scripts/emu/prenotazione.mjs`

**Interfaces:**
- Consumes: `prenotazioneAccesa` e `haAccesso`. Il dialogo del task 6 resta l’unico posto che chiama `puoAccenderePrenotazioni`.
- Produces: il documento richiesta può avere `cane: string`, `taglia: 'piccola' | 'media' | 'grande'`, `servizi: string[]`.

- [ ] **Step 1: Aggiorna lo script emulatore**

`scripts/emu/prenotazione.mjs` oggi chiama `inviaRichiesta` senza `prenotazioniOnline` e si aspetta `doc.status === 'nuova'`. Prima della chiamata che deve riuscire, scrivi:

```js
await db.doc(`salons/${salonId}/settings/main`).set({ prenotazioniOnline: true, business: { vatNumber: '01234567890', salonName: 'Prova' } }, { merge: true })
await db.doc(`salons/${salonId}/pro/main`).set({ piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
```

Aggiungi una chiamata precedente, sullo stesso salone ma dopo aver messo `prenotazioniOnline: false`, e aspetta `error.message === 'Prenotazioni spente'` e che non esista un documento con `nome === 'Spenta'`. La chiamata che oggi deve restare verde usa `cane: 'Fido'`, `taglia: 'media'`, `servizi: ['bagno']` e il documento letto ha quei campi.

`npm test` non lancia questo script. Il controllo è: leggere lo script e, se l’emulatore demo è già acceso, `node scripts/emu/prenotazione.mjs`. Se l’emulatore non c’è, lo script esce da solo con «Emulatore demo assente» e non è un fallimento del task: la logica di rifiuto sta anche in un test puro. Estrai il predicato in `src/lib/prenotazionePubblica.ts`:

```ts
export function prenotazioneAccesa(input: { prenotazioniOnline: boolean; accesso: boolean }): boolean {
  return input.prenotazioniOnline === true && input.accesso === true
}
```

Test in `prenotazionePubblica.test.ts`: false se il flag è false anche con `accesso` true, false se `accesso` è false, true solo se entrambi.

- [ ] **Step 2: Test che fallisce**

Aggiungi i tre `it` di `prenotazioneAccesa` e lancia `npx vitest run src/lib/prenotazionePubblica.test.ts`. Expected: FAIL, funzione assente.

- [ ] **Step 3: Implementazione**

All’inizio di `inviaRichiestaPer` e di `postiLiberiPer`, leggi `settings/main` e `pro/main`. `accesso` è `haAccesso(statoPiano(...), 'prenotazioni')`. Se `prenotazioneAccesa` è false, `throw new HttpsError('failed-precondition', 'Prenotazioni spente')`. Non richiedere i cinque passi qui.

Estendi l’input di `inviaRichiestaPer` con `cane?: string`, `taglia?: string`, `servizi?: string[]`. Sul `ref.set`, aggiungi `cane` trimmato (max 80), `taglia` solo se è una delle tre, `servizi` solo id che passano `/^[a-z0-9-]{1,40}$/`, al massimo 8. `index.ts` legge quei field dal `request.data` e li passa.

In `pagina.js`, manda `cane`, `taglia`, `servizi` e la durata somma. Se il JSON del profilo non ha minuti, durata 60.

- [ ] **Step 4: I test passano**

Run: `npx vitest run src/lib/prenotazionePubblica.test.ts`

Expected: PASS, compresi i tre casi di `prenotazioneAccesa`.

- [ ] **Step 5: Commit**

```bash
git add functions/src/piano/inviaRichiesta.ts functions/src/piano/postiLiberi.ts functions/src/index.ts hosting/s/pagina.js scripts/emu/prenotazione.mjs src/lib/prenotazionePubblica.ts src/lib/prenotazionePubblica.test.ts
git commit -m "La pagina pubblica non prenota se il salone ha spento il servizio."
```

Includi il file di test modificato.

---

### Task 9: Verifica e pubblicazione

Solo dopo che i task 1–8 sono verdi.

- [ ] **Step 1: Suite**

Run: `npm test`

Expected: PASS. Poi `npm run build` e `npm --prefix functions run build`. Expected: entrambi senza errori.

- [ ] **Step 2: Versione**

Alza la patch in tutti e quattro i posti, insieme, come `docs` della regola di pubblicazione: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle` (`versionName` e `versionCode = major * 10000 + minor * 100 + patch`), `hosting/release.json` (`version` e `url` `https://groomlyapp.it/groomly.apk`).

- [ ] **Step 3: APK e release**

`npx cap sync android`, poi in `android` `.\gradlew assembleGithubDebug`. Copia l’APK in `groomly.apk` alla radice e in `hosting/groomly.apk`. Non committare quegli APK.

Commit dei sorgenti e della versione, push su `origin`, release GitHub con asset `groomly.apk` e tag `vX.Y.Z`, note che dicono: il Salone compare accanto al Pro, la prenotazione online ha un link da condividere, il logo sta a sinistra del nome, Suggerimenti è solo il modulo.

Poi:

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Le functions della pagina pubblica vanno nel deploy solo se il comando hosting non le pubblica da solo. Se `paginaPubblica` non è in hosting, aggiungi `functions:paginaPubblica` al `--only`. Se `gh` o Firebase non sono autenticati, fermati e dillo. Non forzare il push.

- [ ] **Step 4: Commit di versione già fatto nello step 3**

`git status` pulito rispetto ai sorgenti. APK e `android/app/build` fuori dal commit.
