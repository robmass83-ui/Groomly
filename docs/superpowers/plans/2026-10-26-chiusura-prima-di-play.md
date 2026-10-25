# Chiusura prima di Play — piano unico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le sezioni 2 e 3 di `docs/GROOMLY-COSA-RESTA.md` lasciando la 1.1.95 pronta e non pubblicata.

**Architecture:** Si riusa il vocabolario `it` / `en` / `es` e `useFrasi()`. La settimana affollata mostra un conteggio e apre il giorno, senza riscrivere la griglia del giorno. I flag `mostraPiani` e `abbonamentiAttivi` restano spenti. La pubblicazione si ferma prima della release GitHub e prima di sostituire `hosting/release.json`.

**Tech Stack:** React, Vite, Vitest, Firebase Functions, Capacitor Android, Playwright sul kit 360, solo emulatori `demo-groomly`.

Decisioni: `docs/DECISIONI-AUTOMATICHE.md` D33–D40. Il committente ha chiesto di non aspettare un’altra conferma.

## Global Constraints

- Con i flag spenti l’app di chi la usa oggi non cambia, a parte la lingua: un telefono italiano resta italiano.
- `mostraPiani` e `abbonamentiAttivi` restano spenti. App Check resta spento.
- Mai leggere o scrivere `salon/shared`, il salone di Laura o Troddioni. Prove solo su `demo-groomly`.
- APK GitHub firmato con la chiave debug di oggi. La chiave nuova solo per l’AAB `play`.
- Nessuna release GitHub. `hosting/release.json` resta `1.1.94` nel deploy. Il file `docs/play/release-1.1.95.json` si prepara e non si carica.
- Regole Firestore: deploy solo se il file cambia, e solo dopo la prova sull’emulatore con i salvataggi della 1.1.94. Annotare ruleset nuovo e vecchio.
- Test prima della modifica. Un commit per task. `docs/PROGRESSO-PIANO.md` aggiornato dopo ogni task. `npm test` e `npm run build` verdi prima della versione.
- Le quattro suite lente (`npm run test:slow`) si rilanciano quando si tocca accesso, animali, agenda o appuntamento.

## Già fatto (non rifare)

| Voce | Prova |
|---|---|
| Cataloghi, format, errori, lingua clienti, servizi, selettore, email HTML, Android | `8f05ab9` … `e758f88` |
| Push, listino, report, email dal codice | `a1236f9`; `postBrevoHtml` in `functions/src/index.ts`, `postaHtml.ts`, `promemoriaEmail.ts` |
| Voce Brevo 3–12 | già la voce 14 di `docs/DA-FARE-ROBERTO.md` |
| Pagine pubbliche e legali `?lang=` | `a5c1693`, `hosting/privacy`, `termini`, `dpa`, `elimina-account`, `azione`, `c` |
| Barra, accesso, invito | `426a6d0`, `41e6ea1` |
| Collaboratore non scrive `recentDogIds` | `f56f54b`, `src/pages/dogRecenti.test.tsx` |
| Splash a 0 e agenda rapida | `e91b6b8`; i tempi 4,0 s / 6,2 s sono precedenti |

---

### Task 1: Collaboratore, conferma

**Files:**
- Test: `src/pages/dogRecenti.test.tsx`
- Modify: nessuno, se il test è verde
- Docs: `docs/PROGRESSO-PIANO.md`

- [ ] **Step 1:** `npx vitest run src/pages/dogRecenti.test.tsx`. Atteso: il collaboratore non contiene l’id in `recentDogIds`, il titolare sì.
- [ ] **Step 2:** Se è verde, nel registro: fatto, prova `f56f54b` e questo test. Non si allarga la regola di `settings/main`.
- [ ] **Step 3:** Commit solo se il registro cambia: `docs: il collaboratore non scrive piu i cani recenti`.

### Task 2: Settimana, «N cani · tempo»

**Files:**
- Create: `src/lib/settimana.ts`, `src/lib/settimana.test.ts`
- Modify: `src/components/calendar/WeekRows.tsx`, `src/components/calendar/WeekRows.test.tsx`, `src/pages/CalendarPage.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` con le chiavi del conteggio

**Interfaces:**
- Produces: `riepilogoGiorno(appointments, day) -> { cani: number; minuti: number; pieno: boolean }`
- `pieno` è vero solo se `cani > 4`
- `WeekRows` riceve `onOpenDay(day: Date)`

Conteggio: appuntamenti del giorno, esclusi `disdetto`, `non_venuto` e `appointmentKind === 'personale'`. Minuti: `sumDuration` dei servizi. Testo: forma plurale «N cane / N cani» e, se i minuti sono più di zero, ` · ` più `formatCompactDuration`. Zero cani: «Nessun cane», senza tempo. Giorno pieno: al posto delle card, un pulsante con quel testo che chiama `onOpenDay`. Giorno non pieno: la riga di testo più le card di oggi. Il pulsante «Seleziona …» resta. La vista giorno non si modifica: `onOpenDay` in `CalendarPage` fa `params.set('data', localDayKey)` e `params.delete('vista')`.

- [ ] **Step 1: Test rosso**

```ts
import { describe, expect, it } from 'vitest'
import { riepilogoGiorno } from './settimana'
import type { Appointment } from '../types/models'

function visita(id: string, hour: number, kind?: 'personale'): Appointment {
  return {
    id,
    dogId: kind === 'personale' ? '' : `d-${id}`,
    title: kind === 'personale' ? 'Pausa' : undefined,
    start: new Date(2026, 9, 11, hour, 0, 0, 0),
    services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 1 }],
    status: 'programmato',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Appointment
}

describe('riepilogo settimana', () => {
  const giorno = new Date(2026, 9, 11)

  it('quattro cani non sono un giorno pieno', () => {
    const items = [1, 2, 3, 4].map((n) => visita(String(n), n))
    expect(riepilogoGiorno(items, giorno)).toEqual({ cani: 4, minuti: 120, pieno: false })
  })

  it('il quinto cane rende il giorno pieno e ignora personale e disdetta', () => {
    const items = [1, 2, 3, 4, 5].map((n) => visita(String(n), n))
    items.push({ ...visita('no', 18), status: 'disdetto' })
    items.push(visita('pausa', 19, 'personale'))
    expect(riepilogoGiorno(items, giorno)).toEqual({ cani: 5, minuti: 150, pieno: true })
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/settimana.test.ts` è rosso perché il modulo non c’è.
- [ ] **Step 3:** Implementare `riepilogoGiorno` come sopra, con `onLocalDay` da `src/lib/appointments.ts`.
- [ ] **Step 4:** In `WeekRows.test.tsx`, un giorno con 5 cani non ha pulsanti `Apri`, ha un pulsante il cui nome contiene `5 cani`, e il clic chiama `onOpenDay` con quel giorno. Un giorno con 3 cani tiene `Apri`.
- [ ] **Step 5:** Far passare i test di `WeekRows` e di `settimana`.
- [ ] **Step 6:** Registro e commit `feat: la settimana piena mostra quanti cani e apre il giorno`.

### Task 3: Funzioni Pro del titolare base (M3)

**Files:**
- Create: `src/pages/pianoBase.test.tsx`
- Modify: `src/pages/SettingsPage.tsx` solo se il test è rosso

- [ ] **Step 1: Test rosso o verde**

Il file mocka `usePiano` con `mostraPiani: true`, `provaUsata: false`, `stato: statoPiano(undefined, new Date('2026-10-25'))` (livello `base`) e `apriPaywall` spia. Rende `<App memory isDev={false} />` dopo `createAccount`. Atteso: c’è il pulsante `Prova Pro gratis per 30 giorni`; il clic chiama `apriPaywall`. Non c’è il link `Funzioni Pro` (la voce base con il flag acceso è nascosta, R1 vale solo a flag spento). Il test già in `PaywallSheet.test.tsx` copre `Avvisami`.

- [ ] **Step 2:** Se è rosso, il clic di `PianoCard` in Impostazioni deve chiamare `piano.apriPaywall`. Non si aggiunge un’altra schermata.
- [ ] **Step 3:** Registro e commit `test: il titolare base con i piani accesi puo provare o farsi avvisare`.

### Task 4: Home, chiaro e scuro

**Files:**
- Modify: solo se la misura trova un’attesa che non porta il primo dato
- Docs: `docs/PROGRESSO-PIANO.md`

- [ ] **Step 1:** Emulatori `demo-groomly` (Auth, Firestore, Functions), seed del kit, `npx vite --mode emu`. Mai `groomly-3128b`.
- [ ] **Step 2:** `tests/e2e/perf.cjs` per `salone1`, tema chiaro e tema scuro. Segnare i millisecondi e la fase (splash, account, agenda, cani, pro).
- [ ] **Step 3:** Se un tempo è ≥ 3000 ms, togliere solo l’attesa inutile e rimisurare. Lo splash è già a 0: non reintrodurlo. I colori del tema non si cambiano.
- [ ] **Step 4:** Scrivere i numeri e, se lo scuro resta più lento, la causa misurata.
- [ ] **Step 5:** Commit del codice se è cambiato, altrimenti solo il registro.

### Task 5: Kit 360 di oggi, una passata

**Files:**
- Docs: `docs/PROGRESSO-PIANO.md`
- Modify: i selettori o il codice solo dei giri che falliscono

- [ ] **Step 1:** Stessi emulatori. `node docs/test360-kit/playwright/tour.cjs` per i giri già descritti nel registro (titolare chiaro/scuro, socio, collaboratore, piano spento, omaggio finto, offline). Password `Test1234!`.
- [ ] **Step 2:** Correggere i fallimenti con un test prima. Non toccare dati veri.
- [ ] **Step 3:** Registro e commit.

### Task 6: Controllo delle frasi fisse

**Files:**
- Create: `src/i18n/frasiFisse.test.ts`

Il test legge i `.tsx` di `src/pages` e `src/components` che stanno nell’elenco `puliti`, esclusi `*.test.tsx` e `DevKitPage.tsx`. Toglie i commenti. Raccoglie i letterali fra apici. Fallisce se un letterale di almeno 4 caratteri, che non contiene `/`, `var(--` o `#`:

- è uguale a un valore di `it` il cui valore `en` è diverso, oppure
- contiene `à è é ì ò ù`, oppure
- contiene una parola intera di questa lista: Impostazioni, Appuntamento, Appuntamenti, Salvataggio, Animale, Animali, Agenda, Mensili, Listino, Chiudi, Annulla, Elimina, Archivio, Servizi, Notifiche, Backup, Titolare, Collaboratore, Nessun, Nessuna, Aggiungi, Incassi, Razza, Taglia, Chiuso, Settimana, Domani, Conferma, Indietro.

`/dev/kit` non entra. Groomly, Privacy ed Email restano se sono uguali nelle due lingue.

- [ ] **Step 1:** Il test tiene un elenco `puliti` di file già passati dal vocabolario (barra, accesso, invito). Fallisce solo se uno di quei file ha ancora una frase fissa. Gli altri file non fanno fallire `npm test`.
- [ ] **Step 2:** Commit `test: controllo delle frasi fisse sui file gia tradotti`. Ogni task 7–12 aggiunge i propri file a `puliti` e il test di quel task è verde prima del commit. All’ultimo file di schermata, `puliti` è tutti i `.tsx` di pagine e componenti salvo `DevKitPage.tsx`.

### Task 7–12: Schermate, una zona per commit

Ogni zona: le frasi visibili dei file elencati passano da `useFrasi()`. Si aggiunge la chiave in `it.ts` con la frase italiana di oggi, la stessa chiave in `en.ts` e `es.ts` (`satisfies` già impedisce una chiave mancante). Un test della zona rende la pagina con `localStorage['groomly.lingua'] = 'en'` e controlla titolo, vuoto e un pulsante in inglese, e che il nome di un cane resti il nome salvato.

Esempio di lettura, da ripetere su ogni scritta della zona:

```tsx
const frasi = useFrasi()
toast.show(frasi.authSalvataggio, 'plain')
```

- [ ] **Task 7 — Home e animali.** `src/pages/HomePage.tsx`, `DogsPage.tsx`, `NextAppointment.tsx`, componenti usati solo da lì in `src/components/domain` e `src/components/earnings` se il letterale è in quel file. Test: home inglese non mostra «Nessun appuntamento» quando il catalogo inglese è diverso; il nome del cane resta.
- [ ] **Task 8 — Scheda.** `DogPage.tsx`, `DogFields.tsx`, `ServiceSheet.tsx`. Test: titolo inglese, «Salvataggio non riuscito» non compare in inglese, un nome cane resta.
- [ ] **Task 9 — Calendario, mensili, appuntamento, chiusura.** `CalendarPage.tsx`, `MonthlyPage.tsx`, `AppointmentPage.tsx`, `AppointmentForm.tsx`, `PersonalAppointmentPage.tsx`, `ClosurePage.tsx`, `WeekRows.tsx`. Test lento di `AppointmentPage` verde. La vista giorno non cambia comportamento.
- [ ] **Task 10 — Incassi, report, statistiche.** `EarningsPage.tsx`, `EarningsReportPage.tsx`, `StatistichePage.tsx`. I file PDF e xlsx sono già sulla lingua della persona (`a1236f9`): non rifare la generazione, solo le scritte rimaste in pagina.
- [ ] **Task 11 — Listino.** `ListinoPage.tsx`, `PriceViewPage.tsx`, `PriceSheetPricesPage.tsx`, `PriceSheetManagePage.tsx`, `PriceSheetExportPage.tsx`, `ServicesPage.tsx`. Il foglio stampato resta su `linguaClienti`.
- [ ] **Task 12 — Impostazioni, dialoghi, componenti rimasti.** `SettingsPage.tsx`, `ProPage.tsx`, `UsersPage.tsx`, `PianoPagine.tsx`, `PrivacyPage.tsx`, `EliminaAccountPage.tsx`, `NotificationsPage.tsx`, `ArchivePage.tsx`, `ReleaseHistoryPage.tsx`, e i `.tsx` ancora segnalati da `frasiFisse.test.ts`. I toast di salvataggio, copia ed esportazione passano dal vocabolario. A fine task `npx vitest run src/i18n/frasiFisse.test.ts` è verde, poi `npm test` e `npm run test:slow`.

Commit di zona: `feat: <zona> segue la lingua della persona`.

### Task 13: Scheda Play, tre lingue

**Files:**
- Create: `docs/play/scheda-it.md`, `docs/play/scheda-en.md`, `docs/play/scheda-es.md`

- [ ] Titolo, descrizione breve (≤ 80 caratteri), descrizione lunga (≤ 4000). Funzioni vere dell’app di oggi. Niente Pro, abbonamenti, WhatsApp automatico o App Check come se fossero accesi. Si dice che l’app è gratuita. Claude le carica: non si usa la Play Console.
- [ ] Commit `docs: testi della scheda Play in italiano, inglese e spagnolo`.

### Task 14: Rami e worktree

- [ ] `git diff main...scheda-nido --stat` e un confronto di `DogPage.tsx`. Se «nido» non è in main, nel registro la differenza (layout compatto del 1.1.88 contro la scheda attuale) e «bloccato da Roberto». Non unire.
- [ ] `git log main..feat/firma-privacy --oneline`. Se il contenuto (firma propria, home, privacy) è superato da hosting e dalla chiave debug GitHub più il keystore Play fuori dal repo, «superato» nel registro. Non cancellare il ramo.
- [ ] `git config core.longpaths true`, `git worktree prune`. `git merge-base --is-ancestor <commit> main` per ogni worktree. Si rimuove la cartella solo se l’antenato è main (`git worktree remove`). Un commit non contenuto in main resta, cartella compresa.
- [ ] Commit del registro.

### Task 15: Ordine nei documenti

- [ ] In cima a ogni piano in `docs/superpowers/plans/` il cui lavoro è nel codice: `Eseguito — vedi commit <hash>`. Se una casella non ha il commit, elenco nel registro, non si spunta.
- [ ] `docs/DA-FARE-ROBERTO.md` allineato alla sezione 3 di `docs/GROOMLY-COSA-RESTA.md` (keystore, screenshot, prova 1.1.95, repository privato dopo l’arrivo dal sito, App Check, test chiuso, Brevo, pagamenti, claim). Si spostano in `docs/archive/` i `docs/prompt-cursor-*.md`, `docs/proposte-*.html` e `docs/bozze/`. Resta `docs/GROOMLY-COSA-RESTA.md`.
- [ ] Nel registro le nove voci della sezione 3 sono «bloccato da Roberto» con il motivo della tabella. Non si copiano keystore, non si rendono privati i repository, non si spengono i template.
- [ ] Commit `docs: un solo riferimento e i piani gia eseguiti`.

### Task 16: Variante play e dati dichiarati

**Files:**
- Modify: `src/pages/SettingsPage.tsx`, `src/app/router.tsx`, `src/lib/distribuzione.ts` se serve un aiutante
- Test: `src/lib/distribuzione.test.ts`, `src/pages/ReleaseHistoryPage.test.tsx`

- [ ] Con `window.__GROOMLY_DISTRIBUTION__ === 'play'`, Impostazioni non ha il pulsante «storico aggiornamenti» e `/impostazioni/aggiornamenti` torna a Impostazioni. `UpdateNotice` è già assente (`aggiornamentiApkAttivi`). La variante github tiene il pulsante.
- [ ] I link Privacy, Termini, DPA ed elimina account sono `https://groomlyapp.it/privacy/?lang=`, e lo stesso per `termini`, `dpa`, `elimina-account`, con la lingua della persona. Vale per github e play. In italiano il testo della pagina non cambia.
- [ ] Cercare nel codice invii di metriche, crash, pubblicità. Il toggle `consensoMetriche` da solo non è una raccolta. Se non parte nessun invio, scriverlo nel registro. Se parte altro rispetto a nome, email, ID utente, indirizzo, telefono, foto, file, ID dispositivo, aggiungerlo in `DA-FARE-ROBERTO` per Claude. Non aprire la Play Console.
- [ ] App Check: rileggere i tre flag false. Non accenderli.
- [ ] Commit `fix: la variante play non apre lo storico e i link legali portano la lingua`.

### Task 17: Test 360 nelle tre lingue

**Files:**
- Create: `docs/Groomly_Test360_RAPPORTO_LINGUE.md`

- [ ] Emulatori `demo-groomly` soltanto. Telefoni: italiano, inglese, spagnolo (lingua del browser o `groomly.lingua`). Giri: titolare chiaro, titolare scuro, socio, collaboratore, collaboratore con piano spento, salone finto con omaggio, offline, una prenotazione dalla pagina pubblica, un HTML per tipo di email (funzione pura `emailMessaggio`, non un invio Brevo vero).
- [ ] Correggere i giri rossi con un test prima.
- [ ] Il rapporto elenca ogni giro e l’esito. Nessun dato vero.

### Task 18: 1.1.95 pronta, non pubblicata

Solo se i task 1–17 sono fatti o bloccati da Roberto e `npm test`, `npm run test:slow` e `npm run build` sono verdi.

- [ ] `APP_VERSION`, `package.json` `version`, `android/app/build.gradle` `versionName "1.1.95"` e `versionCode 10195`. `hosting/release.json` non si alza.
- [ ] Scrivere `docs/play/release-1.1.95.json` con `version` `1.1.95` e `url` `https://groomlyapp.it/groomly.apk`.
- [ ] `npx cap sync android`. In `android`, JDK 21: `.\gradlew assembleGithubDebug` e `.\gradlew bundlePlayRelease`. Controllare che l’APK sia `CN=Android Debug`. Copiare l’APK in `groomly.apk` (radice, fuori dal commit) e in `hosting/groomly.apk` (gitignored).
- [ ] Deploy: `npx firebase deploy --only functions,hosting --project groomly-3128b`. Non includere `firestore:rules` se le regole non sono cambiate. Prima del deploy, `hosting/release.json` è ancora 1.1.94. Controllo online: le pagine legali rispondono, `release.json` dice 1.1.94, l’APK risponde.
- [ ] Nessun `gh release`. Registro: fermarsi. I passi per Roberto stanno nel registro e in `DA-FARE-ROBERTO`: installare l’APK debug su un telefono, provare, e solo allora copiare `docs/play/release-1.1.95.json` su `hosting/release.json` e rifare il deploy di hosting, oppure chiedere la release GitHub.
- [ ] Commit `chore: prepara la 1.1.95 senza pubblicarla`.

## Self-review

- Sezioni 2 e 3 coperte dai task 1–18. La sezione 4 (WhatsApp, billing proprio, Storage, accensione flag, parere legale) non ha task.
- Il collaboratore, le email, le pagine pubbliche e lo splash non si rifanno.
- M6 non tocca la vista giorno. M3 non accende i flag.
- La 1.1.95 non diventa «Aggiornamento disponibile» finché Roberto non sostituisce `release.json`.
