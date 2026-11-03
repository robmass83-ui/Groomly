# Basse «Account» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le basse «Account» dell'audit: conferma email onesta (conto alla rovescia vero, «già verificata»), link profondo ricordato dopo l'accesso, titolare dalla registrazione e «Il tuo nome» modificabile, tour con conteggio vero e tasto indietro tra i passi, tre traduzioni.

**Architecture:** Due piccoli moduli di memoria locale (`src/data/local/verificaInviata.ts`, `src/data/local/dopoAccesso.ts`) con funzioni pure testabili; il resto sono modifiche puntuali a `LoginPage`, `router.tsx` (`Guard`), `useSession`, `client.ts`, `AccountPage`, `TourPage`/`TourPassi`, i18n.

**Tech Stack:** React + TypeScript, react-router, Vitest + Testing Library, Firebase (solo client), i18n `src/i18n/{it,en,es}.ts`.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-account-design.md`

## Global Constraints

- Solo app (APK): niente functions, regole Firestore, hosting. Non cambiare versione (`build.gradle`, `package.json`, `appVersion.ts`, `release.json`).
- Testi nuovi in it/en/es con **chiavi nuove**; nessun letterale italiano nel codice (test `src/i18n/frasiFisse.test.ts`). Le tre lingue devono avere le stesse chiavi.
- Test con `npx vitest run --dir src <file>`; suite intera `npx vitest run --dir src`. Fallimenti già presenti da ignorare: `src/lib/driveInvio.test.ts`, 21 test di `src/pages/DogsPage.test.tsx`, 3 di `src/pages/appointments.test.tsx`.
- `localStorage`/`sessionStorage` sempre dentro `try/catch` (come `src/data/local/cambioSalone.ts`).
- Attesa della conferma email: `RESEND_WAIT_SECONDS` (60) da `src/lib/authGate.ts`, non un numero nuovo.
- Testi italiani fissati: «La tua email è già verificata», «Il tuo nome», «{{n}} piccole cose e Groomly lavora al massimo per te. Ci vogliono un paio di minuti, e quello che vuoi lo salti.», singolare «Una piccola cosa e Groomly lavora al massimo per te. Ci vuole un minuto, e se vuoi la salti.», senza numero «Qualche piccola cosa e Groomly lavora al massimo per te. Ci vogliono un paio di minuti, e quello che vuoi lo salti.». EN `hubSuggerimenti` = «Suggestions», `infoGuidaAgenda` = «The day’s appointments are in the Diary.»; ES `impNotifiche` = «Notificaciones».

## Review Focus

- Destinazione ricordata che è `/login`, `/`, `/invito/…` o un percorso di un altro sito (`//evil.com`, `https://…`): non va ricordata né usata; si usa solo un percorso che inizia con un solo `/`. Test in Task 2.
- «Esci» e poi accesso con un altro account: la destinazione del primo non deve pilotare il secondo (si dimentica all'uscita). Test in Task 2.
- Orologio del telefono spostato indietro (ora salvata nel futuro): il conto non deve superare 60 s. Test in Task 1.
- Tour ripreso dopo una ricarica (benvenuto mai mostrato) e tasto indietro dal primo passo: non deve restare su «Caricamento…» per sempre; esce dal tour come oggi. Test in Task 4.
- «Il tuo nome» con nome di soli spazi: errore, non salva. Test in Task 3.

---

### Task 1: Conferma email onesta

**Files:**
- Create: `src/data/local/verificaInviata.ts`, `src/data/local/verificaInviata.test.ts`
- Modify: `src/hooks/useSession.tsx` (`createAccount`, `resendVerification`), `src/pages/LoginPage.tsx` (`ConfirmView`, ~297-350), `src/pages/AccountPage.tsx` (`inviaVerifica`, ~244), `src/i18n/{it,en,es}.ts`
- Test: `src/pages/LoginPage.test.tsx`, `src/pages/AccountPage.test.tsx`

**Interfaces:**
- Produces:
  - `secondiDaAspettare(inviataIl: number | null, ora: number): number` — `0` se `null`; altrimenti `min(RESEND_WAIT_SECONDS, max(0, ceil(RESEND_WAIT_SECONDS - (ora - inviataIl)/1000)))`.
  - `segnaVerificaInviata(email: string, ora?: number): void` e `verificaInviataIl(email: string): number | null` — chiave `groomly.verificaInviata.<email in minuscolo>`.
- Consumes: `sendVerification(): Promise<{ alreadyVerified: boolean }>` (già in `client.ts:2498`).

- [ ] **Step 1: Test che falliscono.** In `verificaInviata.test.ts`: `secondiDaAspettare(null, 0)` → 0; `(1000, 1000)` → 60; `(0, 15_500)` → 45; `(0, 61_000)` → 0; `(10_000, 0)` (futuro) → 60; dopo `segnaVerificaInviata('A@b.it', 5)` `verificaInviataIl('a@b.it')` → 5. In `LoginPage.test.tsx`: schermata di conferma senza segno salvato → nessun testo «tra 60 secondi» e «Invia di nuovo» abilitato; con segno di 20 s fa → testo con 40. In `AccountPage.test.tsx`: `sendVerification` simulato che risolve `{ alreadyVerified: true }` → toast «La tua email è già verificata»; con `false` → «Email inviata».
- [ ] **Step 2:** Lanciare i tre file: falliscono.
- [ ] **Step 3:** Implementare il modulo. In `useSession`: dopo `createAccount` riuscito (Firebase) e dopo `resendVerification` che non risponde `alreadyVerified`, `segnaVerificaInviata(email)`. In `ConfirmView`: `useState(() => secondiDaAspettare(verificaInviataIl(email), Date.now()))` con l'email dell'account nel gate; `setWait(RESEND_WAIT_SECONDS)` dopo l'invio resta. In `AccountPage.inviaVerifica`: chiave nuova `accGiaVerificata` se `alreadyVerified`.
- [ ] **Step 4:** I tre file passano.
- [ ] **Step 5:** Commit `fix(account): conto alla rovescia vero e «già verificata»`.

### Task 2: Pagina ricordata dopo l'accesso

**Files:**
- Create: `src/data/local/dopoAccesso.ts`, `src/data/local/dopoAccesso.test.ts`
- Modify: `src/app/router.tsx` (`Guard`, ~62-67), `src/pages/LoginPage.tsx` (tutti i `navigate('/')`: ~132, 221, 314, 325, 340), `src/hooks/useSession.tsx` (`logout`) o `src/data/local/uscita.ts`
- Test: `src/data/local/dopoAccesso.test.ts`, `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Produces:
  - `destinazioneValida(percorso: string): boolean` — vero solo se inizia con `/` ma non `//`, non è `/` né inizia con `/login` o `/invito/`.
  - `ricordaDestinazione(percorso: string): void` — salva in `sessionStorage['groomly.dopoAccesso']` solo se valida.
  - `prendiDestinazione(): string` — restituisce la destinazione e la toglie; `'/'` se assente o non valida.
  - `dimenticaDestinazione(): void`.

- [ ] **Step 1: Test che falliscono.** `destinazioneValida`: `/impostazioni/notifiche?x=1` vero; `/`, `/login`, `/invito/abc`, `//evil.com`, `https://x.it` falsi. `ricordaDestinazione('/incassi')` poi `prendiDestinazione()` → `/incassi`, seconda chiamata → `/`. `dimenticaDestinazione()` dopo `ricorda` → `prendi` dà `/`. In `LoginPage.test.tsx`: con `/impostazioni/notifiche` ricordata, accesso riuscito → `navigate` verso `/impostazioni/notifiche`.
- [ ] **Step 2:** Falliscono.
- [ ] **Step 3:** Implementare. In `Guard`, quando rimanda a `/login` con `gate.kind === 'out'` o con `entry.kind !== 'home'`, prima `ricordaDestinazione(pathname + search)` (via `useLocation`, nel corpo prima del `return`). In `LoginPage` sostituire ogni `navigate('/')` dopo accesso, registrazione o conferma con `navigate(prendiDestinazione())`. All'uscita (`logout` / `segnaUscita`) `dimenticaDestinazione()`. `RimandoInvito` resta com'è: dopo la navigazione rimanda comunque all'invito, così l'invito vince.
- [ ] **Step 4:** Passano, insieme a `src/app/*.test.tsx`.
- [ ] **Step 5:** Commit `fix(account): dopo l'accesso torna alla pagina chiesta`.

### Task 3: Titolare dalla registrazione e «Il tuo nome»

**Files:**
- Modify: `src/data/firebase/client.ts` (`writeOwnerSalon` ~2405-2418; nuova funzione esportata), `src/data/local/auth.ts` (funzione locale), `src/lib/validazioni.ts`, `src/pages/AccountPage.tsx` (riga e foglio accanto a `accTitolare`, ~349 e ~484), `src/i18n/{it,en,es}.ts`
- Test: `src/pages/AccountPage.test.tsx`, test esistente di `writeOwnerSalon`/`registerOwner` se c'è (cercare `registerOwner` nei `*.test.ts`), altrimenti `src/lib/` per l'unità pura

**Interfaces:**
- Produces:
  - `validazioni.ts`: `NOME_PERSONA_MAX = 40`; `titolareDaRegistrazione(nome: string, cognome: string): string` — nome e cognome con trim, uniti da uno spazio, tagliati a `TITOLARE_MAX`.
  - `client.ts`: `aggiornaNomeAccount(firstName: string, lastName: string): Promise<LocalAccount>` — Firebase: `setDoc(accounts/<uid>, { firstName, lastName }, { merge: true })` (trim), aggiorna `accountDoc` in memoria, restituisce `toAccount(user)`; senza Firebase delega a `aggiornaNomeLocale` in `local/auth.ts` (aggiorna `storageKeys.auth`).
- Consumes: `session.replaceAccount(account)` da `useSession`.

- [ ] **Step 1: Test che falliscono.** `titolareDaRegistrazione(' Prova ', ' Account ')` → `'Prova Account'`; `('Ada', '')` → `'Ada'`; con nome di 100 caratteri → lunghezza 80. In `AccountPage.test.tsx`: riga «Il tuo nome» visibile anche per un collaboratore, con il nome dell'account; foglio con Nome e Cognome; Nome di soli spazi → «Campo obbligatorio» (chiave esistente usata dal titolare, o nuova se manca) e `aggiornaNomeAccount` non chiamata; salvataggio valido chiama `aggiornaNomeAccount('Ada','Neri')` e poi `replaceAccount`.
- [ ] **Step 2:** Falliscono.
- [ ] **Step 3:** Implementare. In `writeOwnerSalon`, ramo salone proprio (non `isSharedEmail`), `business.titolare: titolareDaRegistrazione(input.firstName, input.lastName)`. In Riprova (`keepExisting`) le impostazioni esistenti non si toccano, come oggi. Riga `frasi.accTuoNome` sopra il titolare, valore `Nome Cognome`; foglio con due `Input` `maxLength={NOME_PERSONA_MAX}`; errore di salvataggio → toast `messaggioAuth` come gli altri fogli.
- [ ] **Step 4:** Passano.
- [ ] **Step 5:** Commit `fix(account): titolare dalla registrazione e «Il tuo nome»`.

### Task 4: Tour con conteggio vero e indietro tra i passi

**Files:**
- Modify: `src/pages/TourPage.tsx`, `src/components/tour/TourPassi.tsx` (`TourFine` ~501), `src/i18n/{it,en,es}.ts` (`tourBenvenutoSotto` + chiavi nuove)
- Test: `src/pages/TourPage.test.tsx`

**Interfaces:**
- Consumes: `passiDaMostrare(passi, saltati)` (già in `TourPage.tsx`).
- Produces: nessuna interfaccia nuova verso altri task.

- [ ] **Step 1: Test che falliscono** in `TourPage.test.tsx`:
  - benvenuto con 4 passi da fare → testo «4 piccole cose…»; con 1 → frase singolare; prima che i passi siano pronti → frase senza numero.
  - «Iniziamo» → passo 1; «Salta» → passo 2; `history.back()` (o `navigate(-1)` nel router di memoria) → di nuovo passo 1 con «1 di N»; ancora indietro → benvenuto.
  - schermata finale: l'anello conta solo i passi del tour (con passi che includono `email`, l'elenco non mostra la riga della verifica email).
  - ripresa (tour già `in-corso`): passo 1 mostrato; indietro → si esce dal tour (non resta su «Caricamento…»).
- [ ] **Step 2:** Falliscono.
- [ ] **Step 3:** Implementare.
  - Conteggio: n = `passiDaMostrare(passi, saltati salvati).length` quando `pronto`; `tourBenvenutoSotto` diventa la frase senza numero, nuove `tourBenvenutoSottoN` (`{{n}}`) e `tourBenvenutoSottoUno`. `TourFine` riceve i passi senza `email` (filtrare in `TourPage` o in `TourFine`).
  - Indietro: la schermata corrente vive nello stato della navigazione (`location.state.tour`) invece che in `useState`. `vai()` fa `navigate('/benvenuto', { state: { tour: prossima } })` (push; anche la fase `tempi` è una voce). La ripresa al caricamento porta al primo passo con `replace`, così indietro dal primo passo esce dal tour. All'apertura, uno stato `tour` rimasto in cronologia con `elenco` vuoto (ricarica) si tratta come ripresa (`replace`). `entra`/`dopo` restano `replace` verso `/`. Animazione di uscita e scrittura delle ricette invariate: passano solo da `vai()`, non dal tasto indietro.
- [ ] **Step 4:** `TourPage.test.tsx` e `src/app/TourAvvio.test.tsx` passano.
- [ ] **Step 5:** Commit `fix(tour): conteggio vero e indietro tra i passi`.

### Task 5: Traduzioni

**Files:**
- Modify: `src/i18n/en.ts` (`hubSuggerimenti`, `infoGuidaAgenda`), `src/i18n/es.ts` (`impNotifiche`)
- Test: `src/i18n/*.test.ts`

- [ ] **Step 1:** Cambiare i tre valori come nei Global Constraints; cercare con grep altre occorrenze inglesi di «Agenda» rivolte all'utente e uniformarle a «Diary».
- [ ] **Step 2:** `npx vitest run --dir src src/i18n` passa; eventuali test che cercano «Tips»/«Avisos» aggiornati.
- [ ] **Step 3:** Commit `fix(i18n): Suggestions, Diary, Notificaciones`.
