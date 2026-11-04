# Admin Manager (B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, TDD). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire «Utenti Groomly» con l'Admin Manager a tab (Panoramica, Saloni, Beta, Feedback, Suggerimenti, Piani) senza perdere funzioni.

**Architecture:** `AdminManagerPage` tiene URL (`tab`, `id`, `cat`), dati e dialoghi piano di oggi; ogni tab è un componente in `src/components/admin/`; la logica pura sta in `src/lib/adminManager.ts`; le callable/letture operatore in `src/data/firebase/adminClient.ts`.

**Tech Stack:** React 18 + TS, react-router, Vitest + Testing Library (happy-dom), Firebase JS SDK.

**Spec:** `docs/superpowers/specs/2026-11-04-beta-admin-ui-design.md` e `2026-11-04-admin-manager-design.md`.

## Global Constraints
- Solo `isOperator(email)` vede la pagina; gli altri → `<Navigate to="/impostazioni" replace />` senza caricare dati.
- `salon/shared` escluso sempre (`salonRows`).
- Testi nuovi nel blocco `// Beta B2` in fondo a `it.ts`, `en.ts`, `es.ts`.
- Nessuna scrittura Firestore dal client: solo callable.
- Niente `PannelloAccensione` (B4): segnaposto.
- Righe ≥ 44 px, testo che va a capo (`USER_TEXT`), colori da token.

## Review Focus
- Operatore senza rete: ogni tab mostra un errore, non una pagina bianca (test «Elenco non disponibile», «Numeri non disponibili»).
- Invito con saltati: il toast dice «· M saltati» e l'elenco col motivo (test in Task 4).
- Callable B1 assente (`not-found`/`internal`): toast d'errore, nessuno stato cambiato (test Task 4/6).
- Feedback/inviti malformati da Firestore: lettura difensiva, righe scartate (test Task 1).
- Durata «Altro» fuori 1–365: pulsante Invia disattivato (test Task 4).

---

### Task 1: logica pura e wrapper client
**Files:** Create `src/lib/adminManager.ts` + test; create `src/data/firebase/adminClient.ts` + test; modify `src/data/firebase/client.ts` (export `callCallableData`, `database`, `loadFirestore`).
**Produces:**
- `salonRows(directory, senzaNome): SalonRow[]` (spostata da UsersPage), `SalonRow`.
- `statoBetaDi(invito | undefined, adesso): 'in-beta'|'invitato'|'chiuso'|'mai'`; `giorniTra(da, a): number`.
- `filtraSaloni(rows, { testo, piani, beta, attivita }, inviti, perSalone, adesso)` — gruppi in E, valori in O.
- `daFareOggi({ inviti, feedback, visti, nomi, suggerimentiDaVedere }, adesso): VoceDaFare[]` max 5, ordine: invito in scadenza, beta in scadenza, feedback, suggerimenti.
- `perchePiano(row, invito, traccia): CausaPiano`.
- `feedbackBetaDi(id, doc): FeedbackLetto | null`; `riepilogoFeedback(lista)`; `righeFeedbackExcel(...)`.
- adminClient: `callInvitaBeta`, `callRevocaBeta`, `callEstendiBeta`, `callSegnaEarlyAdopter`, `callContatoriAdmin`, `callImpostaMostraPiani`, `elencoInvitiBeta`, `storicoInvitoBeta`, `elencoFeedbackBeta`, `listenConfigGlobale` — firme dei Contratti.
- [ ] Test rossi per filtri, daFareOggi (limite 5, «niente»), feedbackBetaDi (scarta voto fuori 1–5), contatoriAdmin difensivo.
- [ ] Implementare, test verdi, commit.

### Task 2: pagina, rotte, tab, Impostazioni
**Files:** Create `src/pages/AdminManagerPage.tsx`, `src/components/admin/TabAdmin.tsx`; modify `src/app/router.tsx` (`/impostazioni/admin-manager`, `/impostazioni/utenti` → `<Navigate replace>` con la query), `src/pages/SettingsPage.tsx` (voce Crown viola «Admin Manager» · «Solo operatori»); i18n B2.
- [ ] Portare `UsersPage.test.tsx` in `AdminManagerPage.test.tsx` con i nuovi percorsi (link «Admin Manager», tab «Saloni»), test rossi.
- [ ] Test: tablist con `aria-selected`; `/impostazioni/utenti?tab=saloni` reindirizza; non operatore rimandato.
- [ ] Implementare spostando la logica di UsersPage; cancellare `UsersPage.tsx`; commit.

### Task 3: Panoramica
`PanoramicaAdmin`, `DaFareOggi`: riquadro Beta (4 numeri che aprono i tab), Da fare oggi (+30 gg con dialogo → `estendiBeta`), Saloni con barra a strati e fonti, Avvisami (max 6), Inviti per stato, Tour (logica di oggi). Errore → «Numeri non disponibili» + Riprova. Test: numeri, tocco «In beta» → `tab=beta`, +30 gg chiama `callEstendiBeta(id, 30)` dopo conferma.

### Task 4: Saloni e Beta, selezione e invito
`ListaSaloni`, `BarraSelezione`, `DialogoInvitoBeta`, `EtichettaBeta`. Tab Beta = lista filtrata per stato beta. Test: cerca, filtri con conteggi, selezione (pulsante Seleziona, caselle `aria-checked` col nome), Invia N inviti → `callInvitaBeta({ salonIds, piano, giorni: 60 })`, toast con saltati, «Altro» 0 o 366 disattiva Invia, «Regala 30 giorni a tutti».

### Task 5: Dettaglio salone
`SchedaSalone`: piano effettivo + Perché + barra giorni; Segmented Azioni | Storico | Feedback; blocco Beta (Estendi, Revoca, Early adopter, Invita, Revoca invito) + Scheda piani di oggi + Regala 30 + Elimina. Test: Estendi +15 → `callEstendiBeta(id, 15)`; Revoca → `callRevocaBeta`; Early → `callSegnaEarlyAdopter`; storico letto; i test portati di oggi verdi.

### Task 6: Feedback, Suggerimenti, Piani
`FeedbackAdmin` (Segmented piano, cerca, riepilogo, funzioni, righe, esporta PDF/Excel con `pdfFeedback`/`xlsxFeedback`), `CodaSuggerimenti` (codice di oggi), `PianiPagamenti` (segnaposto accensione, interruttori ottimistici, offerta it/en/es, RevenueCat, annuncio solo lettura). Test: riepilogo medio, filtro Plus, esporta chiama xlsx; toggle prova → `callImpostaConfigPiani({ provaSelfService: true })` e rollback su errore; Salva offerta.

### Task 7: chiusura
Controllo 360×640 chiaro/scuro vs proposta 2; `npm test`, `npm run typecheck`/lint; `DECISIONI-AUTOMATICHE.md`, `PROGRESS.md`; commit.
