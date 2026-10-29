# Dati toelettatura nel profilo — piano

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** I dati della persona e della toelettatura si modificano solo in Gestisci account › Info personali, il PDF mostra il nome della toelettatura al posto di «TOELETTATURA», e la spiegazione dei messaggi sta in Info su Groomly.

**Architecture:** `business.titolare` è il nome della persona. `business.name` resta la ragione sociale. `conIntestazioneSalone` è l’unica funzione che decide titolo, nome, indirizzo e telefono visibili sul listino e sul PDF. I dialoghi restano il `Dialog` centrato già in `src/components/layout/Dialog.tsx`. Non si introduce `Sheet` e non si alza l’altezza dei campi.

**Tech Stack:** React 19, React Router, Vitest, Testing Library, i18n `it` / `en` / `es` con `satisfies Record<keyof typeof italiano, string>`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-27-dati-toelettatura-profilo-design.md`. In caso di dubbio vince la spec.
- Non alzare `APP_VERSION`, non fare commit, push, release o deploy. Lo fa il giro di pubblicazione dopo la verifica.
- Non committare APK, `android/app/build`, `.env.local`.
- Dialoghi di questi form: solo `Dialog` importato da `src/components/layout/Dialog.tsx`. È già centrato. Non usare `Sheet`. Non cambiare lo stile globale di `Dialog` né di `Input`.
- `Input` senza `size` (resta `md`, altezza 44, etichetta 12 da `SIZES.field`). Niente chip al posto dei campi. Colonna singola. Errori sotto il campo, etichetta visibile, niente solo-placeholder.
- Telefono del salone: `type="tel"`. Codice fiscale: `autoCapitalize="characters"`.
- Tre lingue insieme: ogni chiave nuova in `src/i18n/it.ts`, `en.ts`, `es.ts`.
- Il collaboratore (`role === 'collaboratore'`) non vede e non salva il blocco Toelettatura.
- Link recensioni, pubblica pagina e tessera fedeltà non entrano nel dialogo Toelettatura. Restano in `StrumentiPage`.
- Logo, forma, colore, descrizione e sottotitolo `LISTINO` del listino non si sovrascrivono.

---

### Task 1: Campo titolare e intestazione unica

**Files:**
- Create: `src/lib/intestazioneSalone.ts`
- Create: `src/lib/intestazioneSalone.test.ts`
- Modify: `src/data/local/settings.ts` (tipo `business`, `blankSettings`, `mergeSettings`)
- Modify: `src/lib/firebaseMap.ts` (`settingsFromDoc`, normalizza `titolare`)

**Interfaces:**
- Produces:
  - `business.titolare: string` su `SettingsMain`
  - `export function conIntestazioneSalone<T extends { intestazione: PriceSheet['intestazione'] }>(sheet: T, business: { salonName: string; name: string; address: string; phone: string }): T`

- [ ] **Step 1: Test che fallisce**

`src/lib/intestazioneSalone.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { conIntestazioneSalone } from './intestazioneSalone'
import type { PriceSheet } from '../types/priceSheet'

const base = {
  intestazione: {
    titolo: 'TOELETTATURA',
    sottotitolo: 'LISTINO',
    nome: 'Giungevano puddu',
    descrizione: 'Servizio di toelettatura',
    indirizzo: 'corso vecchio',
    telefono: '111',
    colore: '#B8285E',
  },
} as Pick<PriceSheet, 'intestazione'>

describe('conIntestazioneSalone', () => {
  it('titolo e nome diventano il nome della toelettatura', () => {
    const next = conIntestazioneSalone(base, { salonName: 'Canespa', name: 'Giovannino puddu', address: 'Via renoir 8', phone: '349' })
    expect(next.intestazione.titolo).toBe('Canespa')
    expect(next.intestazione.nome).toBe('Canespa')
    expect(next.intestazione.indirizzo).toBe('Via renoir 8')
    expect(next.intestazione.telefono).toBe('349')
    expect(next.intestazione.descrizione).toBe('Servizio di toelettatura')
    expect(next.intestazione.sottotitolo).toBe('LISTINO')
  })

  it('senza nome toelettatura usa la ragione sociale', () => {
    const next = conIntestazioneSalone(base, { salonName: '  ', name: 'Giovannino puddu', address: '', phone: '' })
    expect(next.intestazione.titolo).toBe('Giovannino puddu')
    expect(next.intestazione.nome).toBe('Giovannino puddu')
    expect(next.intestazione.indirizzo).toBe('corso vecchio')
    expect(next.intestazione.telefono).toBe('111')
  })

  it('senza nessun nome lascia titolo e nome del foglio', () => {
    const next = conIntestazioneSalone(base, { salonName: '', name: '', address: '', phone: '' })
    expect(next.intestazione.titolo).toBe('TOELETTATURA')
    expect(next.intestazione.nome).toBe('Giungevano puddu')
  })
})
```

- [ ] **Step 2: Implementare**

`src/lib/intestazioneSalone.ts`:

```ts
import type { PriceSheet } from '../types/priceSheet'

type Identita = { salonName: string; name: string; address: string; phone: string }

function primo(valori: string[]): string {
  return valori.map((voce) => voce.trim()).find((voce) => voce.length > 0) ?? ''
}

export function conIntestazioneSalone<T extends { intestazione: PriceSheet['intestazione'] }>(sheet: T, business: Identita): T {
  const nome = primo([business.salonName, business.name])
  const indirizzo = business.address.trim()
  const telefono = business.phone.trim()
  return {
    ...sheet,
    intestazione: {
      ...sheet.intestazione,
      titolo: nome || sheet.intestazione.titolo,
      nome: nome || sheet.intestazione.nome,
      indirizzo: indirizzo || sheet.intestazione.indirizzo,
      telefono: telefono || sheet.intestazione.telefono,
    },
  }
}
```

In `SettingsMain.business` e in `blankSettings` aggiungere `titolare: ''` dopo `salonName`.

In `mergeSettings` e in `settingsFromDoc`, dentro l’oggetto `business`, dopo `salonName`:

```ts
titolare: typeof existing.business?.titolare === 'string' ? existing.business.titolare.trim() : '',
```

Il tipo di `existing.business` in `settingsFromDoc` è quello di `SettingsMain`: dopo il cambio di tipo, `titolare` c’è.

- [ ] **Step 3: Verificare**

Run: `npx vitest run src/lib/intestazioneSalone.test.ts src/data/local/settings.test.ts src/lib/firebaseMap.test.ts`

Expected: PASS.

---

### Task 2: Info personali tiene persona e toelettatura

**Files:**
- Modify: `src/pages/AccountPage.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Test: spostare le asserzioni del dialogo da `src/pages/SettingsPage.test.tsx` verso l’account (Task 3 le toglie da Impostazioni; qui si aggiungono i casi che il dialogo deve già passare)

**Interfaces:**
- Consumes: `business.titolare`, `vatError`, `taxCodeError`, `normalizeVat`, `normalizeTaxCode` da `src/lib/profile.ts`, `OrariEditor` da `src/components/piano/OrariEditor.tsx`, `conIntestazioneSalone`, `getPriceSheet` / `priceSheetSchema` solo se il foglio va riscritto.
- Produces: route `/impostazioni/account?scheda=personali&modifica=toelettatura` apre il dialogo «Toelettatura» una volta.

Chiavi nuove (it / en / es):

| Chiave | it | en | es |
| --- | --- | --- | --- |
| `accToelettatura` | Toelettatura | Grooming salon | Peluquería |
| `accModificaToelettatura` | Modifica dati toelettatura | Edit grooming details | Editar datos de la peluquería |

`accToelettatura` è il titolo del dialogo (`aria-label` del dialog). `accModificaToelettatura` è l’etichetta accessibile di ogni riga del blocco, così non restano sei bottoni con lo stesso nome: l’etichetta è `${frasi.accModificaToelettatura}, ${titoloRiga}`.

- [ ] **Step 1: Salvataggio**

In `AccountPage`, il ruolo collaboratore è `session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'`.

Togliere il foglio `'salone'` e `'telefono'` da `Foglio` se non servono più. Aggiungere `'toelettatura' | 'orari'`. Il foglio `'titolare'` salva `business.titolare`, non `business.name`.

Stato bozza del dialogo Toelettatura: copia di `settings.business` all’apertura. Errori `{ vat: string | null; taxCode: string | null }`.

`salvaToelettatura`:

```ts
function salvaToelettatura() {
  const vat = vatError(bozzaBusiness.vatNumber)
  const taxCode = taxCodeError(bozzaBusiness.taxCode)
  setErrori({ vat, taxCode })
  if (vat !== null || taxCode !== null) return
  const business = {
    ...settings.business,
    titolare: settings.business.titolare,
    salonName: bozzaBusiness.salonName.trim(),
    name: bozzaBusiness.name.trim(),
    vatNumber: normalizeVat(bozzaBusiness.vatNumber),
    phone: bozzaBusiness.phone.trim(),
    address: bozzaBusiness.address.trim(),
    taxCode: normalizeTaxCode(bozzaBusiness.taxCode),
  }
  let priceSheet = settings.priceSheet
  if (priceSheet && priceSheetSchema.safeParse(priceSheet).success) {
    priceSheet = conIntestazioneSalone(priceSheet, business)
  }
  const ok = save({ ...settings, business, priceSheet })
  if (!ok) {
    toast.show(frasi.authSalvataggio, 'plain')
    return
  }
  setFoglio(null)
}
```

`salvaProfilo('titolare')` scrive `business.titolare`. Non usare più `salvaProfilo` per `name` o `salonName`.

Orari: il dialogo `orari` renderizza solo `<OrariEditor mostra orari={settings.orari} onChange={(orari) => save({ ...settings, orari })} />`. Nessun altro controllo Pro.

- [ ] **Step 2: UI**

Scheda `personali`, due `Card`.

Card Persona, come oggi, ma:
- la riga titolare legge e scrive `settings.business.titolare`
- niente riga nome toelettatura
- niente riga telefono
- restano logo, email, lingua

Card Toelettatura, solo se non collaboratore, preceduta da `<p>` con `frasi.accToelettatura` (stesso stile dei titoli di sezione già in Sicurezza: `margin: 0, fontWeight: 750, fontSize: 13`). Righe: ragione sociale (`authRagione` / `business.name`), partita IVA (`authIva`), codice fiscale (`authCodiceFiscale`), nome toelettatura (`authNomeSalone` / `salonName`), telefono (`schedaTelefono`), indirizzo (`authIndirizzo`). Poi una riga orari (`orariApertura`) che apre il dialogo orari. Ogni riga anagrafica chiama `apriToelettatura()` che copia `settings.business` e azzera gli errori. `aria-label={`${frasi.accModificaToelettatura}, ${titolo}`}`.

Dialogo Toelettatura: gli sei `Input` nell’ordine della spec, poi `<small>` con `frasi.authBastaIva`, poi `<Button onClick={salvaToelettatura}>{frasi.schedaSalva}</Button>`. Telefono `type="tel"`. Codice fiscale `autoCapitalize="characters"` e `error={errori.taxCode ?? undefined}`. Partita IVA `error={errori.vat ?? undefined}`.

Query: `useEffect` se `params.get('modifica') === 'toelettatura'` e non collaboratore, apri il dialogo e `setParams` senza `modifica` (`replace: true`), lasciando `scheda`. Dipendenze: non riaprire se l’utente lo ha chiuso. Pattern: leggere il param una volta.

```ts
const modifica = params.get('modifica')
useEffect(() => {
  if (modifica !== 'toelettatura' || collaboratore) return
  apriToelettatura()
  const next = new URLSearchParams(params)
  next.delete('modifica')
  setParams(next, { replace: true })
}, [modifica, collaboratore])
```

`apriToelettatura` va in un `useCallback` se il lint lo chiede, oppure il corpo sta nel effect senza funzione instabile. Non rimettere `modifica` dopo la chiusura.

- [ ] **Step 3: Test mirati**

Aggiungere in un file già di pagina, o in `src/pages/SettingsPage.test.tsx` solo se il render è `<App>`, questi comportamenti (si possono aggiornare i test esistenti che cercano il dialogo «Attività» invece di duplicarli):

- da `/impostazioni/account?scheda=personali&modifica=toelettatura` il dialogo si chiama «Toelettatura»
- Partita IVA `IT123` mostra «11 cifre, senza IT» e non salva `business.name`
- codice `abc` mostra «16 lettere o numeri» e non salva
- `123 456 789 01` e `rssmra85t10a562s` salvano `vatNumber` `12345678901` e `taxCode` `RSSMRA85T10A562S`
- il nome del titolare salvato dal suo dialogo finisce in `business.titolare` e non cambia `business.name`
- il collaboratore su quella URL non vede il dialogo Toelettatura. In `SettingsPage.test.tsx` il ruolo si fissa con `rememberRole('collaboratore', 'titolare-uid')` (è una funzione interna del file, circa riga 1409). Il test del collaboratore può stare in quel file.

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/AccountPage.tsx --passWithNoTests` non è valido per un tsx senza test. Lanciare i file di test che hai aggiornato.

Expected: PASS.

---

### Task 3: Impostazioni non ha più l’editor

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Modify: `src/pages/HomePage.tsx` solo se serve; lo state `openBusiness` può restare, lo consuma Impostazioni

- [ ] **Step 1: Togliere l’editor**

Eliminare il `<Dialog open={businessOpen} ...>` e lo stato `businessOpen`, `businessDraft`, `businessErrors`, `openBusiness`, `saveBusiness`. Tenere `businessEmpty`, `businessHeadline`, `copyVat`.

Matita (`IconButton` `frasi.impModifica`): `onClick` → `navigate('/impostazioni/account?scheda=personali&modifica=toelettatura')`.

`vaiPasso('sede')`: stessa `navigate`.

Effect `openBusinessState`: al posto di `openBusiness()`, `navigate('/impostazioni/account?scheda=personali&modifica=toelettatura', { replace: true })`. Non lasciare lo state sulla pagina impostazioni.

Rimuovere la `SRow` di `hubDatiSalone` (il bottone con `Building2`). Se `Building2` non è più usato, toglierlo dall’import. Il resto della card Salone resta.

- [ ] **Step 2: Aggiornare i test**

I test che cliccano «Modifica attività» e si aspettano il dialogo «Attività» devono:
- dopo il click trovare il dialogo «Toelettatura» (la navigazione è dentro `App`)
- salvare da lì e leggere `getSettings`
- non cercare più il riepilogo «Bauci» sulla stessa schermata se ora si è sull’account: il valore sta nella riga. Il riepilogo in Impostazioni si verifica renderizzando `/impostazioni` con i dati già scritti (il test «sotto la Partita IVA il nome toelettatura resta in cima al riepilogo» si spezza: una parte salva dal profilo, una parte controlla il riepilogo tornando a Impostazioni o pre-scrivendo `writeJson`)

`openBusiness apre il foglio una sola volta`: Aggiungi porta al dialogo Toelettatura; Chiudi non lo riapre; non deve riapparire da solo.

Il test dell’archivio che apre «Modifica attività» per controllare che non ci sia `sheet-grabber` lo sposta sul dialogo Toelettatura: `expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')` e niente `sheet-grabber`.

`InvitePage.test.tsx` e il test collaboratore che aspettano l’assenza di «Modifica attività» restano validi.

In Impostazioni non esiste più `getByRole('dialog', { name: 'Attività' })` né il testo «Dati del salone» come voce di menu. Il dettaglio del passo può ancora citare l’indirizzo: non cancellare «Indirizzo e orari».

- [ ] **Step 3: Verificare**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/InvitePage.test.tsx`

Expected: PASS.

---

### Task 4: Listino e PDF usano il nome della toelettatura

**Files:**
- Modify: `src/pages/ListinoPage.tsx` (`BreedSheet` riceve anche `business` oppure applica la funzione prima del render)
- Modify: `src/pages/PriceSheetManagePage.tsx`
- Modify: `src/pages/PriceSheetExportPage.tsx`
- Modify: `src/i18n/it.ts` `manDaAttivita`, e le stesse chiavi in `en.ts` e `es.ts`
- Modify: `src/components/priceSheet/priceSheetPaper.test.tsx` se il titolo è asserito sul componente che riceve già il foglio trasformato. Non cambiare `PriceSheetPaper`: chi lo chiama gli passa il foglio già passato da `conIntestazioneSalone`.

Testi:

- it: `Nome, indirizzo e telefono partono da Gestisci account › Info personali.`
- en: `Name, address and phone come from Manage account › Personal info.`
- es: `Nombre, dirección y teléfono salen de Gestionar cuenta › Info personal.`

- [ ] **Step 1: Resa**

`ListinoPage`: `const foglio = conIntestazioneSalone(sheet, settings.business)` e passare `foglio` a `BreedSheet`.

`PriceSheetExportPage`: stessa funzione sul `sheet` usato da `PriceSheetPaper` e dal titolo file (`etichette.titolo` + nome). Cercare le tre occorrenze di `<PriceSheetPaper sheet={sheet}` e il punto in cui si legge `sheet.intestazione.nome` per il file (circa riga 209). Una sola variabile `foglio` nel componente, usata ovunque si mostra l’identità.

`PriceSheetManagePage`: togliere i tre `Input` Nome salone, Indirizzo, Telefono. Al loro posto un blocco in sola lettura con `conIntestazioneSalone(sheet, settings.business).intestazione` (nome, indirizzo, telefono), font 13, colore `var(--tx2)`. La descrizione resta `Input`. Sotto, il testo `manDaAttivita` diventa un `Link` a `/impostazioni/account?scheda=personali&modifica=toelettatura` con quello come contenuto, `color: var(--pri)`, `minHeight: 44`.

- [ ] **Step 2: Test del titolo**

In `src/components/priceSheet/priceSheetPaper.test.tsx` il paper stampa `sheet.intestazione.titolo`. Aggiungere un caso in `intestazioneSalone.test.ts` è già sufficiente per la funzione. Aggiungere in `src/pages/listino.test.tsx` (o nel test del listino più vicino che renderizza `ListinoPage` / `App` su `/listino`) questo, se il file monta l’app:

scrivere `business.salonName = 'Canespa'` e `priceSheet.intestazione.titolo = 'TOELETTATURA'`, aprire il listino, aspettarsi `Canespa` nella card e non dipendere dal titolo grezzo.

Se il test di pagina è troppo pesante, un test del componente non è obbligatorio oltre a `intestazioneSalone.test.ts`, ma `PriceSheetExportPage` deve usare la funzione: verificarlo leggendo il file e, se esiste un test che controlla il nome file, aggiornarlo al nome della toelettatura.

- [ ] **Step 3: Verificare**

Run: `npx vitest run src/lib/intestazioneSalone.test.ts src/pages/listino.test.tsx src/pages/priceSheetManage.test.tsx src/components/priceSheet/priceSheetPaper.test.tsx src/data/seed/priceSheet.test.ts`

Expected: PASS. Il seed può ancora contenere `titolo: 'TOELETTATURA'`: non cambiarlo.

---

### Task 5: Guida in Info su Groomly, via la riga Promemoria

**Files:**
- Modify: `src/pages/InfoGroomlyPage.tsx`
- Modify: `src/pages/SettingsPage.tsx` (togliere il `Link` a `/impostazioni/messaggi`)
- Modify: `src/pages/PianoPagine.tsx` (`PAGINA_PRO` e cancellare `MessaggiPage` se non resta nessun import)
- Modify: `src/app/router.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Modify: `src/lib/systemBack.test.tsx` solo se il redirect cambia il comportamento atteso. La route può restare nel grafo come redirect: `systemBackChoice('/impostazioni/messaggi')` non dipende dal componente. Non cambiarlo se il test non monta la pagina.

Chiavi:

| Chiave | it |
| --- | --- |
| `infoComeSiUsa` | Come si usa |
| `infoGuidaAgenda` | Gli appuntamenti del giorno stanno in Agenda. |
| `infoGuidaListino` | Prezzi, stampa e condividi. In alto sul foglio c’è il nome della toelettatura, poi Listino. |
| `infoGuidaDati` | Ragione sociale, partita IVA, nome e indirizzo si modificano in Gestisci account › Info personali. |
| `infoGuidaIncassi` | Incassi e report stanno nella scorciatoia in Impostazioni. |
| `infoGuidaBackup` | La copia del salone sta in Funzioni › Backup e ripristino. |
| `infoGuidaAvvisi` | La campanella in Impostazioni elenca gli avvisi. Le notifiche stanno in App › Notifiche. |

en:

- How to use it
- The day’s appointments are in Agenda.
- Prices, print and share. The top of the sheet shows the grooming salon’s name, then Price list.
- Legal name, VAT, name and address are edited in Manage account › Personal info.
- Earnings and reports are the shortcut in Settings.
- The salon copy is in Features › Backup and restore.
- The bell in Settings lists notices. Notifications are in App › Notifications.

es:

- Cómo se usa
- Las citas del día están en Agenda.
- Precios, imprimir y compartir. Arriba en la hoja está el nombre de la peluquería y luego Lista.
- Razón social, NIF, nombre y dirección se editan en Gestionar cuenta › Info personal.
- Cobros e informes están en el acceso de Ajustes.
- La copia del salón está en Funciones › Copia y restauración.
- La campana en Ajustes lista los avisos. Las notificaciones están en App › Notificaciones.

La riga Animali non ha una chiave nuova: titolo `frasi.navAnimali`, dettaglio `${frasi.messaggiDove} ${frasi.strumMessaggiDettaglio}`.

- [ ] **Step 1: Pagina**

In `InfoGroomlyPage`, dopo la card esistente, `<p>` con `infoComeSiUsa` e una `Card` di sette `Row`. Titolo `fontWeight: 650`, dettaglio in `<small color: var(--tx3)>`. Prima riga `borderTop: 'none'`.

- [ ] **Step 2: Menu e route**

Togliere da `SettingsPage` il blocco `Link to="/impostazioni/messaggi"`. La prima riga rimasta di Funzioni tiene `borderTop: 'none'` (oggi lo ha Promemoria; dopo la rimozione lo deve avere Controlli avanzati, anche per il titolare). Se `MessageCircle` resta inutilizzato, toglierlo dall’import.

`PAGINA_PRO`: le quattro chiavi che valevano `/impostazioni/messaggi` diventano `/impostazioni/info`.

`router.tsx`: sostituire l’elemento di `/impostazioni/messaggi` con `<Navigate to="/impostazioni/info" replace />`. Togliere l’import di `MessaggiPage` se non serve. Cancellare `export function MessaggiPage` da `PianoPagine.tsx` insieme agli import che restano solo per lei (`Link` va tenuto se `PianoPage` lo usa).

- [ ] **Step 3: Test**

In `SettingsPage.test.tsx` una expect: `expect(screen.queryByRole('link', { name: /Promemoria e messaggi/ })).not.toBeInTheDocument()` dentro un test che è già su `/impostazioni`, oppure un it corto nuovo.

Un it su `/impostazioni/info`: heading Info su Groomly, testo «Come si usa», testo «sul pulsante WhatsApp».

Un it su `/impostazioni/messaggi`: heading di Info su Groomly (il redirect).

- [ ] **Step 4: Verificare**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/systemBack.test.tsx src/lib/vociMenu.ts`

`vociMenu` non è un test. Se `src/lib/vociMenu.ts` manda ancora a `/impostazioni/messaggi`, lasciarlo: la route reindirizza. Non inventare una voce di menu nuova.

Expected: PASS.

---

### Task 6: Suite dei file toccati

- [ ] **Step 1:** Run `npx vitest run src/lib/intestazioneSalone.test.ts src/data/local/settings.test.ts src/lib/firebaseMap.test.ts src/pages/SettingsPage.test.tsx src/pages/InvitePage.test.tsx src/pages/listino.test.tsx src/pages/priceSheetManage.test.tsx src/components/priceSheet/priceSheetPaper.test.tsx src/data/seed/priceSheet.test.ts src/lib/systemBack.test.tsx src/lib/menuAccount.test.ts`

Expected: PASS. Se un test fuori da questo elenco importa `MessaggiPage`, aggiornare quell’import e rilanciare quel file.

- [ ] **Step 2:** Non fare commit. Nel riepilogo elenca i file toccati e i comandi lanciati con l’esito.
