# Beta Plus/Salon — B1 «Server beta e feedback» — design

Data: 4 novembre 2026. Fonti: `docs/GROOMLY-BETA-PIANI-PROMPT.md` (fasi 2.1, 3.1, 3.3 lato server), `2026-11-04-beta-piani-ondate-coordinamento.md`, `2026-11-04-beta-fondamenta-design.md` (Contratti), `2026-11-04-admin-manager-design.md` (§3, §5, §7.2, §9).

## Perché
Roberto invita saloni scelti a provare Plus o Salon gratis, raccoglie feedback e poi decide i prezzi. B2 (Admin Manager) e B3 (app del salone) costruiscono le schermate sopra le callable dei Contratti. Questa parte fa il server: callable, pianificate, avvisi in app ed email.

## Scelte di Roberto (brainstorm del 4/11)
1. **Email al titolare** per invito, ritiro o revoca, estensione, fine a 7 giorni e fine a 1 giorno. Il promemoria feedback dopo 7 giorni e la «beta finita» arrivano solo come avviso in app.
2. **Email a Roberto** (`info@groomlyapp.it`, come i Suggerimenti) per i **feedback** e i **rifiuti**. Le accettazioni no: si vedono nell'Admin Manager.
3. **Saloni con un piano acceso:** chi è **in prova** di 30 giorni si può invitare, e alla risposta «sì» la beta sostituisce la prova. Chi ha Plus o Salon **attivato a mano** (o un omaggio non VIP, o Play) si salta come `piano-attivo`.
4. **Avvisi:** un solo documento `salons/{id}/avvisi/beta` con l'**ultimo evento**. I promemoria li manda una pianificata **ogni giorno alle 9 (ora di Roma)**.

## Obiettivi
- Le callable dei Contratti con le firme fisse: `invitaBeta`, `rispondiInvitoBeta`, `revocaBeta`, `estendiBeta`, `segnaEarlyAdopter`, `inviaFeedbackBeta`, `contatoriAdmin`.
- In più: `impostaMostraPiani` (design §7.2) e `segnaAvvisoBeta`, che segna come letto l'avviso beta (il client non può scrivere `avvisi`).
- Pianificate: `scadiInvitiBeta` (ogni ora) e `avvisiFineBeta` (ogni giorno alle 9). La seconda manda anche il promemoria feedback.
- Email Brevo in it/en/es nello stile Groomly: logo, scheda bianca, fascia azzurra.

## Non obiettivi
- Interfacce (B2, B3) e wrapper client.
- `annunciaPagamenti` e abbonamenti (B4).
- Push sul telefono: per la beta bastano avviso ed email.

## Anti-obiettivi
- Toccare `salon/shared` o i VIP.
- Cancellare la traccia `exBeta`/`betaPiano`/`betaDal`/`betaFinoAl`/`earlyAdopter`.
- Cambiare le firme dei Contratti. Le aggiunte che si possono ignorare sono sotto, in «Aggiunte ai Contratti».

## Approcci considerati
- **Avvisi: un documento con l'ultimo evento (scelto)**, contro un documento per tipo (B3 deve seguirne tanti e i vecchi si accumulano), contro l'uso della sola `betaInviti` (non copre promemoria ed estensioni).
- **Promemoria: ogni giorno alle 9 (scelto)**, contro ogni ora (avvisi ed email di notte).
- **Codice:** cartella nuova `functions/src/beta/`, una funzione `…Per(input)` per file come in `piano/`, collegata a `index.ts` da wrapper sottili, e test con `firestoreFinto`. È l'unica strada coerente col progetto.

## Dati

### Avviso beta — `salons/{salonId}/avvisi/beta` (scritto solo dalle functions)
```ts
type TipoAvvisoBeta = 'invito' | 'invito-ritirato' | 'revoca' | 'estensione' | 'feedback' | 'fine-7' | 'fine-1' | 'finita'
interface AvvisoBeta {
  tipo: TipoAvvisoBeta
  piano: 'pro' | 'salone'
  scadeIl: string | null   // invito: scadenza dell'invito; estensione/fine-7/fine-1/finita: fine della beta; revoca: null
  giorni: number | null    // invito: durata della beta; estensione: giorni aggiunti; altrimenti null
  testo: string | null     // messaggio dell'operatore (invito, revoca); altrimenti null
  at: string               // ISO
  letto: boolean           // false a ogni evento nuovo
}
```
Ogni evento nuovo sostituisce il documento intero (`set` senza merge). I testi li traduce l'app (B3) a partire da `tipo`. L'avviso dell'invito si segna `letto: true` quando il titolare risponde o quando l'invito scade.
**Regola:** l'avviso lo legge solo il titolare (`owns(salonId) && memberRole() == 'titolare'`) e non lo scrive nessuno. La regola generica `salons/{salonId}/{kind}/{id}` esclude `avvisi/beta`.

### Aggiunte a `betaInviti/{salonId}` (campi in più, `invitoBetaDi` li ignora)
- `estensioni: { il: string; giorni: number; scadeIl: string }[]`: per lo Storico dell'Admin Manager.
- `testoRevoca: string | null`.
- `promemoria: { feedback?: string; 'fine-7'?: string; 'fine-1'?: string; finita?: string }`: per `feedback` vale l'ISO dell'invio. Per gli altri vale la `betaFinoAl` a cui si riferiva l'avviso: dopo un'estensione la fine cambia, quindi i due avvisi «fine» ripartono da soli.

### Limite dei feedback — `betaFeedbackLimiti/{salonId}` = `{ giorno: 'YYYY-MM-DD' (Roma), n: number }`

## Callable
Tutte nella regione `europe-west1`. Gli errori sono `failed-precondition` con un messaggio in italiano, come oggi. «Operatore» = `operatoreAutorizzato(token)`. Un `salonId` è valido se è una stringa non vuota, senza `/` e diversa da `shared`.

Definizioni comuni (lette da `pro/main` con `statoPiano` / `eVip` dell'app):
- **VIP** = `eVip(doc)`.
- **Vivo** = `statoPiano(doc).livello !== 'base'`.
- **Beta in corso** = fonte `beta` e vivo.
- **Piano attivo che blocca** = vivo e fonte né `prova` né `beta`, dopo aver escluso il VIP.

### `invitaBeta({ salonIds, piano, giorni, messaggio? })` → `{ invitati, saltati }`
- Input: `salonIds` è un array di 1–50 stringhe (i doppioni si tolgono); `piano` è `pro|salone`; `giorni` è un intero da 1 a 365; `messaggio` è facoltativo, ripulito e lungo al massimo 500 caratteri (vuoto = `null`). Input non valido → errore, e non si scrive niente.
- Per ogni salone, in una transazione sua e in quest'ordine:
  1. `shared` → `shared`;
  2. id non valido, oppure `accounts/{id}` mancante o non titolare di se stesso → `non-trovato`;
  3. VIP → `vip`;
  4. invito `invitato` non ancora scaduto, oppure beta in corso → `gia-invitato`;
  5. piano attivo che blocca → `piano-attivo`.
- Altrimenti: se c'è già un invito, il vecchio documento si copia in `betaInviti/{id}/storico/{autoId}`. Poi si scrive l'invito nuovo (stato `invitato`, `scadeInvitoIl` = adesso + 14 giorni, `invitatoDa` = email dell'operatore) e l'avviso `invito`.
- Dopo le transazioni: un'email di invito per ogni invitato, in parallelo. Se un'email fallisce si registra nel log e l'invito resta.

### `rispondiInvitoBeta({ accetta, motivo?, altro? })` → `{ ok, scadeIl }`
- Chi chiama: titolare (`accounts/{uid}` con `salonId == uid` e ruolo `titolare` o assente; non `shared`). Altrimenti «Accesso negato».
- L'invito deve essere `invitato`, altrimenti «Invito non più valido». Se `scadeInvitoIl` è passata: lo si segna `scaduto` e si risponde «Invito scaduto».
- **Sì**, in una transazione:
  - VIP → «Il piano VIP resta attivo»;
  - piano attivo che blocca → «Hai già un piano attivo»;
  - altrimenti si scrive `pro/main` = `scriviPiano(campiBeta(piano, giorni, adesso))` + `tracciaBeta(...)` (con `earlyAdopter: true`) + `updatedAt`;
  - per Salon, il membro titolare se manca (`membroTitolareMancante`, come il bypass: 3 posti);
  - l'invito passa ad `accettato` con `rispostoIl`, e l'avviso a `letto: true`;
  - risposta: `scadeIl` della beta.
- **No:**
  - `motivo` facoltativo, uno dei quattro;
  - `altro` solo con `altro`, al massimo 300 caratteri, ripulito;
  - l'invito passa a `rifiutato` e l'avviso a letto;
  - email a Roberto; risposta `scadeIl: null`.

### `revocaBeta({ salonId, testo? })` → `{ ok, emailStato }`
- Operatore. `testo` facoltativo, al massimo 400 caratteri.
- Con l'invito `invitato`: passa a `revocato` e l'avviso diventa `invito-ritirato`.
- Con l'invito `accettato`:
  - se la beta è ancora in corso, `pro/main` = `scriviPiano(campiBase(true))` in merge, e la traccia resta com'è;
  - l'invito passa a `revocato`, l'avviso diventa `revoca`;
  - se la beta è già finita o sostituita da un altro piano → «La beta è già finita».
- Altri stati o nessun invito → «Niente da revocare».
- Il campo `revocatoIl` e `testoRevoca` si salvano. Poi parte l'email al titolare e `emailStato` vale `inviata` o `non_inviata`.

### `estendiBeta({ salonId, giorni })` → `{ ok, scadeIl }`
- Operatore; `giorni` intero da 1 a 365. Serve l'invito `accettato` con la beta in corso, altrimenti «La beta non è in corso».
- Nuova fine = `scadeIl` + `giorni`. Se va oltre 365 giorni da oggi → «Al massimo 365 giorni da oggi».
- Si scrivono in merge `pro/main.scadeIl`, `betaFinoAl` e `updatedAt`.
- Sull'invito si aggiunge una voce a `estensioni` e si aggiorna `aggiornatoIl`.
- Avviso `estensione` ed email al titolare.

### `segnaEarlyAdopter({ salonId, valore })` → `{ ok }`
Operatore; `valore` booleano; serve `accounts/{salonId}`, altrimenti «Salone non trovato». Scrive in merge `pro/main.earlyAdopter`.

### `inviaFeedbackBeta(input)` → `{ ok }`
- Chi chiama: titolare o socio del suo salone (non `shared`), con `pro/main.exBeta === true`. Altrimenti «Il feedback è per chi ha provato la beta». Non c'è limite di tempo dopo la fine.
- Validazione:
  - `voto` intero da 1 a 5;
  - `funzioni`: chiavi `FeatureKey` e valori `GiudizioFunzione`;
  - `nonVa` e `manca` lunghi al massimo 1000 caratteri, ripuliti;
  - `pagheresti` è uno dei tre valori;
  - `quanto` è una fascia oppure `null`, e diventa sempre `null` con `no`;
  - `ricontatto` e `fineBeta` sono booleani;
  - `versioneApp` è lunga al massimo 40 caratteri.
- In una transazione: il limite di 5 al giorno per salone (sesto → «Hai già mandato 5 feedback oggi»), poi `betaFeedback/{uuid}` con `salonId`, `uid`, `piano` (= `betaPiano`) e `creatoIl` dal server.
- Dopo: email a Roberto con nome del salone, voto, pagheresti e testi.

### `contatoriAdmin({})` → firma del Contratto + aggiunte
- Saloni = i `salonId` distinti di `accounts` (non vuoti, validi, senza `shared`).
- Per ogni salone si legge `pro/main`:
  - `perPiano` con `livelloElenco`;
  - `perFonte` con la fonte del piano vivo, oppure `nessuna`.
- **Attività:**
  - per ogni persona si prende l'ultimo accesso dell'account Firebase (`metadata.lastRefreshTime`, se manca `lastSignInTime`), letto con `getAuth().getUsers` a gruppi di 100;
  - per il salone vale il più recente tra le sue persone;
  - `attivi7`/`attivi30` contano i saloni con accesso negli ultimi 7/30 giorni.
- `inviti`: conteggio per stato. Un `invitato` con la scadenza passata conta come `scaduto`.
- `avvisami`: conteggio per id dei documenti `interesse` (`collectionGroup`), solo sotto `salons/`.
- `feedback`: totali e `pagheresti`.
- **Aggiunte, che si possono ignorare:**
  - `inBeta: number` (inviti `accettato` con la beta in corso, per il riquadro «In beta»);
  - `ultimoAccesso: Record<salonId, string | null>` (per «Attivo N gg fa» nel dettaglio salone).

### `impostaMostraPiani({ valore })` → `{ ok }`
Operatore; `valore` booleano, altrimenti «Impostazione non valida». Scrive in merge `config/globale.mostraPiani` (radice, letta dalle APK installate). È sul modello di `impostaTourBenvenuto`.

### `segnaAvvisoBeta({})` → `{ ok }`
Titolare; `avvisi/beta` diventa `letto: true` in merge, ma solo se il documento esiste.

## Pianificate
- **`scadiInvitiBeta`**, ogni 60 minuti:
  - prende i `betaInviti` con `stato == 'invitato'`;
  - per quelli con `scadeInvitoIl` ≤ adesso, ricontrolla in transazione e scrive `scaduto` + `aggiornatoIl`;
  - se l'avviso era `invito`, lo segna come letto;
  - un errore su un salone non ferma gli altri.
- **`avvisiFineBeta`**, ogni giorno alle 9:00 `Europe/Rome`. Per ogni invito `accettato` legge `pro/main`, poi:
  - **beta in corso:** `giorniAllaFine` = giorni di calendario a Roma tra oggi e `betaFinoAl`. Parte al massimo un evento per salone a ogni giro:
    1. con `giorniAllaFine` ≤ 1 e `promemoria['fine-1']` ≠ fine → `fine-1` (avviso ed email). Si segnano anche `fine-7` e `feedback`;
    2. altrimenti, con ≤ 7 e `promemoria['fine-7']` ≠ fine → `fine-7` (avviso ed email, con l'invito a lasciare il feedback). Si segna anche `feedback`;
    3. altrimenti, se sono passati almeno 7 giorni da `betaDal` e manca `promemoria.feedback` → `feedback` (solo avviso).
  - **beta chiusa** (piano `base`, `betaFinoAl` passata, `promemoria.finita` ≠ fine) → `finita` (solo avviso). Se nel frattempo è arrivato un altro piano, non parte niente.
  - Il segno in `promemoria` e l'avviso si scrivono nella stessa transazione. L'email parte dopo.

## Email
- File: `functions/src/beta/emailBeta.ts`.
- Una funzione per tipo (`invito`, `invito-ritirato`, `revoca`, `estensione`, `fine-7`, `fine-1`) restituisce `{ oggetto, html }` in it/en/es.
- La cornice copia `avvolgi` di `src/i18n/emailHtml.ts`, che non è esportata e che B1 non tocca: logo, scheda bianca, fascia `#8ADBD9→#4A9FCB`, piede «Groomly · groomlyapp.it».
- Il messaggio dell'operatore va in un riquadro citato, con l'escape HTML.
- I nomi dei piani sono «Plus» e «Salon» in tutte le lingue. Le date si scrivono nella lingua del titolare (`accounts.lingua`), con il fuso di Roma.
- Non c'è nessun pulsante, perché l'app non apre link: «Apri Groomly: trovi tutto negli Avvisi».
- Le email per Roberto sono semplici, come `mailSuggerimento`, e vanno a `info@groomlyapp.it`.
- Senza chiave Brevo o senza l'email del titolare, l'email non parte: `non_inviata`, nel log.

## Regole Firestore
- Nuovo `match /salons/{salonId}/avvisi/beta`: read per il titolare (`owns && memberRole() == 'titolare'`), write false.
- Nelle due regole generiche `salons/{salonId}/{kind}/{id}` (e `/{rest=**}`) la read diventa `canUse(salonId) && !(kind == 'avvisi' && id == 'beta')`.
- Test in `tests/rules` (o nel file delle regole esistente): il titolare legge l'avviso; socio, collaboratore ed estranei no; nessuno lo scrive.

## Aggiunte ai Contratti (da segnalare a B2/B3)
Nessuna firma cambia. Si aggiungono:
- `contatoriAdmin`: due campi in uscita in più (`inBeta`, `ultimoAccesso`);
- la callable `segnaAvvisoBeta`;
- il documento `avvisi/beta` con la forma sopra;
- i campi in più di `betaInviti`.

## Collaudo
- Test vitest per ogni `…Per` con `firestoreFinto`.
- `npm run test:rules` su un emulatore mio (porta 8095, come la nota di A1).
- Sugli emulatori, con saloni finti di `scripts/test360` (mai `salon/shared`):
  - il flusso completo: invito → accettazione → piano attivo → scadenza (`chiudiProve`) → Go, con `exBeta` intatta;
  - poi rifiuto, revoca, estensione, invito multiplo con i salti, invito scaduto, feedback con il limite e contatori.
- Alla fine si cancellano i dati di test.

## Lasciato al costruttore
- Nomi degli helper interni e testo esatto delle email.
- Ordine dei campi.
- Forma dei log.
