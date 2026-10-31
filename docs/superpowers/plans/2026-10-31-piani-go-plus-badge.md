# Piani Go / Plus / Salone con segno Plus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riallineare cosa è Go e cosa è Plus/Salone, con un solo segno Plus, una finestra specifica al tocco e nessuna interruzione non richiesta.

**Architecture:** Un catalogo unico in `src/lib/piano.ts` (livello minimo + vista `badge`/`nascosta` per chiave) da cui leggono un hook `usePlus`, il componente `SegnoPlus` e la finestra `PaywallSheet`. Si eliminano la mappa per-funzione `pro/main.funzioni` (client e server) e la dipendenza dei blocchi da `config.mostraPiani`.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library, Capacitor (Android), Firebase Functions (TypeScript), lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-31-piani-go-plus-badge-design.md`

## Global Constraints

- Ogni testo visibile esiste in `src/i18n/it.ts`, `en.ts`, `es.ts` (stesse chiavi; c'è un test che lo verifica).
- Segno identico ovunque: icona `Zap` di lucide-react + parola "Plus" (o "Salone" per chiavi di livello `salone`), colore `var(--pri)`, una sola dimensione.
- Mai popup all'avvio, banner o promemoria a tempo per vendere il piano.
- In Go un tocco su una funzione Plus apre la finestra e **non cambia nulla** (nessun interruttore che si accende, nessun invio).
- Blocchi e segni dipendono solo dal piano (`StatoPiano.livello`). `mostraPiani` decide solo la scheda Abbonamento e il tasto "Prova gratis".
- VIP = livello `salone` (vede tutto, invariato).
- Testi pagina Plus (it): "Promemoria email automatici ai clienti", "Messaggi WhatsApp per categoria", "Avviso «il tuo cane è pronto»", "Tessera fedeltà", "Prenotazioni online", "Lista d’attesa", "Richiesta di recensioni", "Esporta il report degli incassi", "Backup automatico e Google Drive".
- Comandi: `npm test -- <file>` (vitest), `npm run build` (tsc + vite), functions: `cd functions && npm test`.

## Review Focus

1. **Go con `autoDaily` già acceso**: il backup notturno non deve inviare su Drive → test in Task 6 (`provaInvioAutomatico` salta senza piano Plus salvato).
2. **Salone senza `scadeIl` (VIP) senza rete**: il backup notturno deve partire → test in Task 6.
3. **Go con `serviziEmail` accesi**: il server non spedisce email Plus → test in Task 8 (`serviziPerPiano`).
4. **Tocco sul segno quando `mostraPiani` è spento e abbonamenti non attivi**: la finestra ha sempre almeno un tasto ("Avvisami") → test in Task 3.
5. **Cliente senza telefono in Go**: il tasto WhatsApp non compare (come oggi) → test in Task 7.

---

### Task 1: Catalogo unico in `piano.ts` e fine della mappa `funzioni` nel client

**Files:**
- Modify: `src/lib/piano.ts` (tipo `FeatureKey`, `VISTA`, `LIVELLO`, `mostraBadge`)
- Modify: `src/lib/funzioniPiano.ts` (togli `funzioneVisibile`, `funzioneAccesa`, `FunzioniMappa`; `strumentoVisibile` senza `funzioni`; `prenotazioniConcesse` usa `haAccesso`)
- Modify: `src/hooks/usePiano.tsx` (togli `funzioni` da `PianoValore` e `funzioniDi`)
- Modify tutti i chiamanti di `funzioneVisibile(piano.stato, piano.funzioni, X)` → `haAccesso(piano.stato, X)`: `BlocchiPiano.tsx`, `LinkCondivisione.tsx`, `AppointmentPage.tsx`, `DogPage.tsx`, `HomePage.tsx`, `PianoPagine.tsx`, `SettingsPage.tsx`, `EarningsReportPage.tsx`, `StatistichePage.tsx`; `strumentoVisibile(x, settings, piano.funzioni)` → `strumentoVisibile(x, settings)` in `PulsanteMessaggi.tsx`, `StrumentiCane.tsx`, `DogPage.tsx`
- Test: `src/lib/piano.test.ts`, `src/lib/funzioniPiano.test.ts`

**Interfaces:**
- Produces:
  - `type FeatureKey = 'export' | 'backupAuto' | 'drive' | 'messaggiCategoria' | 'copieCloud' | 'promemoriaAuto' | 'richiamo' | 'pronto' | 'compleanno' | 'pagella' | 'prezzoSuggerito' | 'aumentoListino' | 'collage' | 'senzaFirma' | 'prenotazioni' | 'listaAttesa' | 'recensioni' | 'fedelta' | 'schedaCliente' | 'team' | 'postiExtra'` (escono `statistiche`, `reportPassati`)
  - `vistaFunzione(feature: FeatureKey): 'badge' | 'nascosta'` — `nascosta` solo per `copieCloud`, `postiExtra`, `prezzoSuggerito`
  - `mostraSegno(stato: StatoPiano, feature: FeatureKey): boolean` — sostituisce `mostraBadge`; vero se `!haAccesso && vista === 'badge'`; nessun parametro `mostraPiani`
  - `strumentoVisibile(chiave: ChiaveStrumentoPiano, settings): boolean`
  - `PianoValore` senza `funzioni`

- [ ] **Step 1: Test che falliscono** in `piano.test.ts`:
  - `haAccesso(statoBase, 'export') === false`, `haAccesso(statoPro, 'backupAuto') === true`, `haAccesso(statoPro, 'team') === false`, `haAccesso(statoSalone, 'messaggiCategoria') === true`
  - `eFeature('statistiche') === false`, `eFeature('reportPassati') === false`
  - `mostraSegno(statoBase, 'drive') === true`, `mostraSegno(statoBase, 'copieCloud') === false`, `mostraSegno(statoPro, 'drive') === false`
  - In `funzioniPiano.test.ts`: `prenotazioniConcesse({ piano: 'pro', stato: 'attivo', funzioni: { prenotazioni: false } }) === true` (la mappa è ignorata); `strumentoVisibile('messaggi', { strumenti: { messaggi: false } }) === false`
- [ ] **Step 2:** `npm test -- src/lib/piano.test.ts src/lib/funzioniPiano.test.ts` → FAIL.
- [ ] **Step 3:** Implementa in `piano.ts` e `funzioniPiano.ts`; aggiorna `usePiano` e i chiamanti elencati. `eChiaveFunzione` resta solo se usata dal server (Task 8 la elimina con `impostaFunzione`).
- [ ] **Step 4:** Togli dai test esistenti le asserzioni sulla mappa `funzioni` e sulle chiavi rimosse. `npm test` e `npm run build` → verdi (l'errore di tipo su `piano.funzioni` è la guida per trovare i chiamanti rimasti).
- [ ] **Step 5:** Commit "Catalogo unico dei piani: niente mappa funzioni, statistiche e mesi passati gratis".

### Task 2: Segno Plus e hook `usePlus`

**Files:**
- Create: `src/components/piano/SegnoPlus.tsx` (sostituisce `ProBadge.tsx`, da eliminare)
- Create: `src/hooks/usePlus.ts`
- Modify: `src/components/piano/ProGate.tsx` (usa `usePlus` + `SegnoPlus`), `src/components/piano/CopieCloudRiga.tsx`
- Test: `src/components/piano/SegnoPlus.test.tsx`, `src/hooks/usePlus.test.tsx`

**Interfaces:**
- Consumes: `haAccesso`, `vistaFunzione`, `livelloMinimo` (Task 1)
- Produces:
  - `SegnoPlus({ feature }: { feature: FeatureKey })` → `<span>` con `Zap` (size 12) + "Plus" o "Salone" (chiavi `segnoPlus`, `segnoSalone` in i18n), `aria-label` uguale al testo
  - `usePlus(feature: FeatureKey): { accesso: boolean; visibile: boolean; apri: () => void }` — `visibile = accesso || vistaFunzione(feature) === 'badge'`; `apri` chiama `piano.apriPaywall(feature)`

- [ ] **Step 1: Test che falliscono:** `SegnoPlus feature="export"` mostra "Plus" e un `svg`; `feature="team"` mostra "Salone"; `usePlus('copieCloud')` con piano base → `{ accesso: false, visibile: false }`; `usePlus('export')` base → `{ accesso: false, visibile: true }`; con piano `pro` → `accesso: true`. Usa il provider di test già usato in `BlocchiPiano.test.tsx`.
- [ ] **Step 2:** `npm test -- SegnoPlus usePlus` → FAIL.
- [ ] **Step 3:** Implementa. `CopieCloudRiga` usa `usePlus('copieCloud')` e ritorna `null` se `!visibile` (prop `mostraPiani` e `onPaywall` eliminate; aggiorna `SettingsPage`).
- [ ] **Step 4:** `npm test` → verde.
- [ ] **Step 5:** Commit "Segno Plus unico col fulmine".

### Task 3: Finestra specifica per funzione

**Files:**
- Modify: `src/components/piano/PaywallSheet.tsx`, `src/hooks/usePiano.tsx` (passa `feature`, `mostraProva`, `abbonamentiAttivi`)
- Create: `src/lib/paywallTesti.ts`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/components/piano/PaywallSheet.test.tsx`

**Interfaces:**
- Consumes: `FeatureKey`, `livelloMinimo`
- Produces:
  - `TESTI_PAYWALL: Record<FeatureKey, { titolo: Chiave; testo: Chiave }>` (chiavi i18n `pw<Feature>Titolo` / `pw<Feature>Testo`, 21 coppie, frasi brevi nel tono dell'app; es. it `pwExportTitolo: 'Esporta il report degli incassi'`, `pwExportTesto: 'Scarica il report con tutti i dati in PDF o Excel.'`)
  - `PaywallSheet` props: `{ open; feature: FeatureKey | null; mostraProva: boolean; abbonamentiAttivi: boolean; esitoProva; messaggioProva; onClose; onAvvisami; onProva; onAbbonati }`

- [ ] **Step 1: Test che falliscono:**
  - con `feature='export'` il titolo del dialog è "Esporta il report degli incassi" e c'è il testo di `pwExportTesto`
  - `mostraProva=true` → c'è "Prova Plus gratis per 30 giorni"; `false` → assente
  - `abbonamentiAttivi=true` → c'è "Abbonati" e non "Avvisami"; `false` → c'è "Avvisami"
  - `mostraProva=false, abbonamentiAttivi=false` → almeno il tasto "Avvisami" (Review Focus 4)
  - `feature='team'` → "Abbonati" porta a `/impostazioni/abbonamento/salone`; altrimenti `/impostazioni/abbonamento/plus` (verifica `onAbbonati` chiamata con il percorso)
- [ ] **Step 2:** `npm test -- PaywallSheet` → FAIL.
- [ ] **Step 3:** Implementa. In `usePiano`: `mostraProva = mostraPiani && stato.livello === 'base' && !provaUsata`; `onAbbonati` chiude e naviga (usa `window.location` hash/route come gli altri link del provider o `useNavigate` se il provider è dentro il router — verificare in `src/app`). Testo `abbonamentiInArrivo` e `prezziPlay` non più usati dalla finestra: eliminali se nessun altro li usa.
- [ ] **Step 4:** `npm test` → verde (incluso il test di parità delle lingue).
- [ ] **Step 5:** Commit "Finestra Plus specifica per ogni funzione".

### Task 4: Via le interruzioni: proposta in Home, anteprima Statistiche, fascia listino, periodi bloccati

**Files:**
- Delete: `src/components/piano/AvvisoProposta.tsx` (+ test); modify `src/pages/HomePage.tsx`
- Modify: `src/lib/piano.ts` (togli `propostaVisibile`, `puoProporre`, `PROPOSTA_MS` se senza altri usi), `src/lib/proposte.ts` (elimina se senza usi)
- Modify: `src/lib/reportGate.ts` (togli `periodoBloccato`, `mesePrima`, `mostraFasciaAumento`; `exportBloccato(stato)` senza `mostraPiani`)
- Modify: `src/pages/EarningsReportPage.tsx`, `src/pages/StatistichePage.tsx`, `src/components/piano/SchedeStatistiche.tsx`
- Test: `src/lib/reportGate.test.ts`, `src/pages/HomePage.test.tsx`, `src/pages/StatistichePage.test.tsx` (se esiste)

**Interfaces:**
- Consumes: `usePlus`, `SegnoPlus` (Task 2)
- Produces: `exportBloccato(stato: StatoPiano): boolean`

- [ ] **Step 1: Test che falliscono:** `exportBloccato(statoBase) === true`, `exportBloccato(statoPro) === false`; Report con piano base: il tasto "Esporta" contiene il segno "Plus", il tocco non apre il foglio export ma la finestra; scegliere "Anno" o un mese passato con piano base mostra i dati (nessuna finestra); link "Statistiche" visibile con piano base; `StatistichePage` con piano base mostra le schede senza anteprima/paywall; Home con piano base e `mostraPiani` acceso non mostra "Prova le funzioni Plus".
- [ ] **Step 2:** `npm test -- reportGate EarningsReport Statistiche HomePage` → FAIL.
- [ ] **Step 3:** Implementa. `SchedeStatistiche` perde le prop `accesso`/`onPaywall`. La fascia "Aggiorna listino" si toglie (chiave `aggiornaListino` eliminata se senza usi).
- [ ] **Step 4:** `npm test` e `npm run build` → verdi.
- [ ] **Step 5:** Commit "Niente interruzioni: statistiche e mesi passati liberi, Esporta col segno Plus".

### Task 5: Backup — automatico e Google Drive col segno Plus

**Files:**
- Modify: `src/pages/SettingsPage.tsx:1027-1090` (foglio Backup), `SettingsPage.tsx:~920-930` (riga riassunto)
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `usePlus('backupAuto')`, `usePlus('drive')`, `SegnoPlus`

- [ ] **Step 1: Test che falliscono** (piano base):
  - l'interruttore "Backup automatico giornaliero" è spento anche con `settings.backup.autoDaily = true`, accanto c'è il segno Plus; il tocco apre la finestra con titolo `pwBackupAutoTitolo` e `save` non viene chiamato
  - frequenza, orario, Solo Wi-Fi, Solo in carica non compaiono in Go (sono impostazioni del backup automatico)
  - "Collega Google Drive" ha il segno Plus e apre la finestra `drive`; "Invia su Drive" e "Ripristina da Drive" non compaiono senza Drive collegato (come oggi)
  - "Completo con foto" e "Ripristina da un file" restano attivi
  - riga riassunto: in Go mostra "Spento" anche se `autoDaily` è vero
  - con piano `pro`: tutto come oggi
- [ ] **Step 2:** `npm test -- SettingsPage` → FAIL.
- [ ] **Step 3:** Implementa. Se un salone Go ha Drive già collegato, le righe Drive (invia, ripristina, scollega) mostrano il segno e aprono la finestra, tranne "Scollega" che resta attivo.
- [ ] **Step 4:** `npm test -- SettingsPage` → PASS.
- [ ] **Step 5:** Commit "Backup automatico e Google Drive diventano Plus".

### Task 6: Backup notturno controlla il piano

**Files:**
- Create: `src/lib/pianoSalvato.ts`
- Modify: `src/hooks/usePiano.tsx` (salva il documento piano a ogni aggiornamento), `src/lib/driveInvio.ts:110` (`provaInvioAutomatico`)
- Test: `src/lib/pianoSalvato.test.ts`, `src/lib/driveInvio.test.ts`

**Interfaces:**
- Consumes: `statoPiano(doc, adesso, { offline: true })`, `haAccesso`
- Produces:
  - `salvaPiano(uid: string, doc: ProMain | null): void` — localStorage `groomly.piano.<uid>`, try/catch
  - `pianoPermette(uid: string, feature: FeatureKey, adesso: Date): boolean` — legge il doc salvato, `haAccesso(statoPiano(doc, adesso, { offline: true }), feature)`; nessun doc → `false`

- [ ] **Step 1: Test che falliscono:**
  - `pianoPermette` senza doc salvato → `false`
  - doc `{ piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }` → `true` per `backupAuto` a qualsiasi data (Review Focus 2)
  - doc `{ piano: 'pro', stato: 'attivo', scadeIl: <ieri> }` → `true` entro 72 h dalla scadenza, `false` dopo
  - doc `{ piano: 'base' }` → `false`
  - `provaInvioAutomatico` con `autoDaily: true` e nessun piano Plus salvato → `'saltato'` senza chiamare `DriveAuth.leggi` (Review Focus 1)
- [ ] **Step 2:** `npm test -- pianoSalvato driveInvio` → FAIL.
- [ ] **Step 3:** Implementa. In `provaInvioAutomatico` il controllo `pianoPermette(uid, 'backupAuto', now)` va subito dopo `autoDaily`. `usePiano` chiama `salvaPiano(uidCorrente, comePro(pro))` quando arriva il documento (uid da `currentUid`/sessione già disponibile nel client; verificarlo in `src/data/firebase/client.ts`).
- [ ] **Step 4:** `npm test` → verde.
- [ ] **Step 5:** Commit "Backup notturno solo con il piano Plus".

### Task 7: WhatsApp semplice in Go, messaggi per categoria in Plus

**Files:**
- Modify: `src/components/piano/PulsanteMessaggi.tsx`, `src/lib/messaggiManuali.ts` (aggiungi `hrefChat`)
- Modify i18n: chiave `messaggiPronti` ("Messaggi pronti" / "Ready messages" / "Mensajes listos")
- Test: `src/components/piano/PulsanteMessaggi.test.tsx` (crea se manca), `src/lib/messaggiManuali.test.ts`

**Interfaces:**
- Consumes: `usePlus('messaggiCategoria')`, `SegnoPlus`
- Produces: `hrefChat(telefono: string): string | null` → `https://wa.me/<numero>` senza `?text`, `null` senza numero

- [ ] **Step 1: Test che falliscono:**
  - `hrefChat('333 1234567')` uguale a `whatsAppLink('333 1234567')` e senza `text=`; `hrefChat('')` → `null`
  - piano base: il tasto WhatsApp è un link a `hrefChat(telefono)` (nessun dialog aperto al tocco); sotto c'è un tasto "Messaggi pronti" col segno Plus che apre la finestra `messaggiCategoria`
  - piano base senza telefono: niente tasto (Review Focus 5)
  - piano `pro`: comportamento di oggi (il tocco apre il dialog con le categorie), nessun "Messaggi pronti"
- [ ] **Step 2:** `npm test -- PulsanteMessaggi messaggiManuali` → FAIL.
- [ ] **Step 3:** Implementa. In nativo il link usa `hrefMessaggioApp` come oggi (gestisci l'assenza di `&text=`: `whatsapp://send?phone=<numero>`).
- [ ] **Step 4:** `npm test` → verde.
- [ ] **Step 5:** Commit "WhatsApp semplice in Go, messaggi per categoria in Plus".

### Task 8: Pagina Utenti solo piano; server senza mappa `funzioni`

**Files:**
- Modify: `src/pages/UsersPage.tsx` (togli `CHIAVI_FUNZIONE`, `funzioni`, `forzate`, `cambiaFunzione`, prop `onFunzione`/`funzioni` di `Scheda` e la lista interruttori), `src/data/firebase/client.ts:525` (togli `callImpostaFunzione`), i18n `uteAccesaMano`/`uteSpentaMano` se senza usi
- Delete: `functions/src/piano/impostaFunzione.ts` (+ test); modify `functions/src/index.ts:45,906-915`
- Modify: `functions/src/piano/inviaCoda.ts:99-112`, `functions/src/piano/giraCoda.ts:383`
- Test: `src/pages/UsersPage.test.tsx`, `functions/src/piano/inviaCoda.test.ts`

**Interfaces:**
- Consumes: `statoPiano`, `haAccesso` da `src/lib/piano`
- Produces: `serviziPerPiano(servizi: unknown, pro: ProMain | undefined, adesso: Date): unknown` (sostituisce `serviziConOperatore`) — mette `modo: 'spento'` su ogni tipo coda la cui `FUNZIONE_DI[tipo]` non è accessibile al livello del piano

- [ ] **Step 1: Test che falliscono:**
  - `serviziPerPiano({ promemoria: { modo: 'auto' } }, undefined, adesso).promemoria.modo === 'spento'` (Review Focus 3)
  - con `{ piano: 'pro', stato: 'attivo' }` il modo resta `'auto'`
  - con `{ piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null }` resta `'auto'`
  - `UsersPage`: aprendo la scheda di un salone non c'è nessun interruttore per funzione (es. nessun elemento con nome "Prenotazioni online"); la scelta del piano funziona come oggi
- [ ] **Step 2:** `npm test -- UsersPage` e `cd functions && npm test -- inviaCoda` → FAIL.
- [ ] **Step 3:** Implementa; `giraCoda` passa `proSnap.data()` e `adesso`.
- [ ] **Step 4:** `npm test`, `cd functions && npm test && npm run build` → verdi.
- [ ] **Step 5:** Commit "Utenti sceglie solo il piano; email Plus legate al piano".

### Task 9: Pagina Plus con i nuovi testi

**Files:**
- Modify: `src/components/abbonamento/Vetrina.tsx:21-32`, `src/i18n/it.ts:1369-1378`, `en.ts`, `es.ts`
- Test: `src/pages/AbbonamentoPage.test.tsx`

**Interfaces:**
- Produces chiavi i18n: `abbFPromemoria` (testo nuovo), `abbFMessaggi` (nuova, icona `MessageCircle`), `abbFExport` (nuova, icona `Download`), `abbFBackup` (nuova, icona `Cloud`); eliminate `abbFAuguri`, `abbFStatistiche`, `abbFReport`, `abbFCopie`

- [ ] **Step 1: Test che fallisce:** la pagina Plus elenca, in quest'ordine, i 9 testi delle Global Constraints e non contiene "Auguri di compleanno", "Statistiche del salone", "Report dei mesi passati", "Copie nel cloud".
- [ ] **Step 2:** `npm test -- AbbonamentoPage` → FAIL.
- [ ] **Step 3:** Implementa (en: "Automatic email reminders to clients", "WhatsApp messages by category", "Export the earnings report", "Automatic backup and Google Drive"; es: "Recordatorios automáticos por email a los clientes", "Mensajes de WhatsApp por categoría", "Exportar el informe de ingresos", "Copia automática y Google Drive").
- [ ] **Step 4:** `npm test` → verde.
- [ ] **Step 5:** Commit "Pagina Plus: elenco aggiornato".

### Task 10: Verifica finale, deploy e APK

- [ ] **Step 1:** `npm test`, `npm run build`, `cd functions && npm test && npm run build` → tutti verdi.
- [ ] **Step 2:** `grep -rn "funzioneVisibile\|piano.funzioni\|ProBadge\|mostraBadge\|AvvisoProposta\|reportPassati\|'statistiche'" src functions/src` → nessun risultato fuori dai test di regressione.
- [ ] **Step 3:** Deploy functions: `FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only functions` (la callable `impostaFunzione` va confermata come eliminata).
- [ ] **Step 4:** Alza la versione e pubblica l'APK firmato come da procedura del progetto (`assembleGithubRelease`, release GitHub).
- [ ] **Step 5:** Commit e push su `main`.
