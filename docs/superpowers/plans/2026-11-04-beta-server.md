# Server beta e feedback (B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** callable, pianificate, avvisi ed email della beta Plus/Salon, lato Cloud Functions.

**Architecture:** cartella `functions/src/beta/`, un file per callable con una funzione `…Per(input)` testabile (Firestore finto) e wrapper sottili in `functions/src/index.ts`. La logica di piano usa gli helper di A1 (`campiBeta`, `tracciaBeta`, `campiBase`, `scriviPiano`) e le letture dell'app (`statoPiano`, `eVip`, `livelloElenco`, `invitoBetaDi`).

**Tech Stack:** TypeScript, firebase-functions v2, firebase-admin, vitest, emulatori Firebase.

**Spec:** `docs/superpowers/specs/2026-11-04-beta-server-design.md`

## Global Constraints
- Mai toccare `salon/shared`; `salonId` valido = non vuoto, senza `/`, ≠ `shared`.
- VIP (`eVip`) mai cambiati. Traccia beta mai cancellata: ogni scrittura di `pro/main` in merge.
- Errori `HttpsError('failed-precondition', <messaggio italiano>)`; operatore = `operatoreAutorizzato`.
- Regione `europe-west1`; pianificate `every 60 minutes` e `0 9 * * *` con `timeZone: 'Europe/Rome'`.
- Non toccare `src/` (eccetto `src/lib/firestoreRules.emulator.test.ts`). `firestore.rules` sì.
- Regole testate su emulatore proprio: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8095`.

## Review Focus
1. Due operatori invitano lo stesso salone insieme → un solo invito (transazione per salone; test: secondo invito → `gia-invitato`).
2. Accettazione dopo `scadeInvitoIl` ma prima della pianificata → «Invito scaduto» e stato `scaduto` (test in Task 4).
3. Estensione dopo un `fine-7` già inviato → il `fine-7` riparte sulla nuova fine (test in Task 8).
4. Revoca di una beta già chiusa da `chiudiProve` → errore, `pro/main` invariato (test in Task 5).
5. Feedback con `pagheresti: 'no'` e `quanto` valorizzato → salvato con `quanto: null` (test in Task 6).

---

### Task 1: Comune, avviso e regole

**Files:** Create `functions/src/beta/comune.ts`, `functions/src/beta/comune.test.ts`; Modify `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`.

**Interfaces — Produces:**
- `type TipoAvvisoBeta`, `interface AvvisoBeta` (forma della spec).
- `salonIdValido(id: unknown): id is string`
- `proMainDi(dati: DocumentData | undefined): ProMain | undefined` (piano, stato, fonte, scadeIl + traccia via `tracciaBetaDi`)
- `betaInCorso(doc, adesso): boolean`, `pianoCheBlocca(doc, adesso): boolean` (vivo, fonte ∉ {prova, beta}, non VIP)
- `avviso(tipo, piano, adesso, extra?: { scadeIl?, giorni?, testo? }): AvvisoBeta`
- `richiediOperatore(token: { operatorEmail; emailVerified?; admin? }): void`
- `titolareDi(db, uid): Promise<{ salonId; email; lingua }>` (lancia «Accesso negato»)
- `contattoTitolare(db, salonId): Promise<{ email: string; lingua: Lingua; nome: string }>`

- [ ] Test: `pianoCheBlocca` vero per manuale/omaggio Plus/play vivi, falso per prova, beta, VIP, base, scaduti; `salonIdValido('shared') === false`.
- [ ] Implementa, test verdi.
- [ ] Regole: match `salons/{salonId}/avvisi/beta` read titolare, write false; generiche escludono `kind=='avvisi' && id=='beta'`. Test regole: titolare legge, socio/collaboratore/estraneo no, nessuno scrive; `avvisi/piano` resta leggibile dal socio.
- [ ] `FIRESTORE_EMULATOR_HOST=127.0.0.1:8095 npx vitest run --config vitest.rules.config.ts` verde. Commit.

### Task 2: Email beta

**Files:** Create `functions/src/beta/emailBeta.ts`, `emailBeta.test.ts`.

**Produces:** `type TipoEmailBeta = 'invito'|'invito-ritirato'|'revoca'|'estensione'|'fine-7'|'fine-1'`; `emailBeta(lingua, tipo, dati: { piano; giorni?; scadeIl?; testo?; nome? }): { oggetto; html }`; `emailOperatore(tipo: 'rifiuto'|'feedback', righe: string[]): { oggetto; html }`; `inviaEmail(apiKey, to, mail): Promise<'inviata'|'non_inviata'>`.

- [ ] Test: oggetto in tre lingue per ogni tipo; html contiene logo, «Plus»/«Salon», data nella lingua (fuso Roma), messaggio escapato (`<b>` → `&lt;b&gt;`); `inviaEmail` senza chiave o email → `non_inviata`.
- [ ] Implementa (cornice copiata da `avvolgi`), verdi, commit.

### Task 3: invitaBeta

**Files:** `functions/src/beta/invitaBeta.ts` + test. **Produces:** `invitaBetaPer(input: { token; salonIds: unknown; piano: unknown; giorni: unknown; messaggio?: unknown; adesso?: Date; apiKey?: string; invia?: InviaMail }) → { invitati; saltati }` (`InviaMail` iniettabile per i test, default `inviaEmail`).

- [ ] Test: input non valido (0 o 51 id, giorni 0/366/1.5, messaggio 501) → errore senza scritture; salti `shared`, `non-trovato`, `vip`, `gia-invitato` (invito aperto e beta in corso), `piano-attivo` (manuale); prova attiva invitata; doppioni tolti; vecchio invito rifiutato copiato in `storico`; invito scritto con `scadeInvitoIl` +14 gg e avviso `invito`; email chiamata una volta per invitato; secondo invito allo stesso → `gia-invitato`.
- [ ] Implementa, verdi, commit.

### Task 4: rispondiInvitoBeta

**Files:** `rispondiInvitoBeta.ts` + test. **Produces:** `rispondiInvitoBetaPer(input: { uid; dati: unknown; adesso?; apiKey?; invia? }) → { ok: true; scadeIl }`.

- [ ] Test: non titolare/socio/shared → «Accesso negato»; nessun invito/stato finale → «Invito non più valido»; scaduto → stato `scaduto` + «Invito scaduto»; accetta Salon: `pro/main` = fonte beta, 3 posti, `enabled`, traccia con `earlyAdopter: true`, membro titolare creato, invito `accettato`, avviso letto; accetta su prova → beta; VIP e manuale attivo rifiutati; rifiuta con `altro` → `altroRifiuto` ripulito e email a info@; `altro` ignorato con altro motivo.
- [ ] Implementa, verdi, commit.

### Task 5: revocaBeta, estendiBeta, segnaEarlyAdopter

**Files:** `revocaBeta.ts`, `estendiBeta.ts`, `segnaEarlyAdopter.ts` + test. **Produces:** `revocaBetaPer({ token; salonId; testo?; adesso?; apiKey?; invia? }) → { ok; emailStato }`, `estendiBetaPer({ token; salonId; giorni; adesso?; apiKey?; invia? }) → { ok; scadeIl }`, `segnaEarlyAdopterPer({ token; salonId; valore }) → { ok }`.

- [ ] Test revoca: invitato → `revocato` + avviso `invito-ritirato`, piano invariato; accettato in corso → Go (`campiBase(true)`), traccia intatta, avviso `revoca`; beta chiusa → «La beta è già finita» senza scritture; stato rifiutato → «Niente da revocare»; `emailStato`.
- [ ] Test estendi: +30 da fine attuale su `scadeIl` e `betaFinoAl`, voce in `estensioni`, avviso `estensione`; oltre 365 gg da oggi → errore; beta non in corso → errore.
- [ ] Test early adopter: scrive in merge, salone mancante → «Salone non trovato», non booleano → errore.
- [ ] Implementa, verdi, commit.

### Task 6: inviaFeedbackBeta

**Files:** `inviaFeedbackBeta.ts` + test. **Produces:** `inviaFeedbackBetaPer({ uid; dati; adesso?; apiKey?; invia? }) → { ok }`.

- [ ] Test: collaboratore → «Accesso negato»; senza `exBeta` → «Il feedback è per chi ha provato la beta»; validazione (voto 0/6/2.5, chiave funzione sconosciuta, giudizio sconosciuto, testo 1001, versione 41); `no` + `quanto` → `null`; documento con `salonId`, `uid`, `piano = betaPiano`, `creatoIl`; sesto del giorno → «Hai già mandato 5 feedback oggi», nuovo giorno riparte; email operatore.
- [ ] Implementa, verdi, commit.

### Task 7: contatoriAdmin, impostaMostraPiani, segnaAvvisoBeta

**Files:** `beta/contatoriAdmin.ts`, `config/impostaMostraPiani.ts`, `beta/segnaAvvisoBeta.ts` + test. **Produces:** `contatoriAdminPer({ token; adesso?; ultimiAccessi: (uids: string[]) => Promise<Map<string, string|null>> })`, `impostaMostraPianiPer({ token; valore })`, `segnaAvvisoBetaPer(uid)`.

- [ ] Test contatori: shared escluso; perPiano con VIP; perFonte con `nessuna`; attivi7/30 dal più recente fra le persone; invitato scaduto contato `scaduto`; `inBeta`; avvisami per id solo sotto `salons/`; feedback e pagheresti; non operatore → errore.
- [ ] Test mostraPiani: scrive solo `mostraPiani`, non booleano → «Impostazione non valida». Test segnaAvviso: letto true, nessun documento → nessuna scrittura.
- [ ] Implementa, verdi, commit.

### Task 8: Pianificate

**Files:** `beta/scadiInvitiBeta.ts`, `beta/avvisiFineBeta.ts` + test. **Produces:** `scadiInvitiBetaScaduti(adesso?) → number`, `mandaAvvisiFineBeta({ adesso?; apiKey?; invia? }) → number`; helper puro `prossimoAvviso(invito, doc, adesso): 'feedback'|'fine-7'|'fine-1'|'finita'|null`.

- [ ] Test scadi: solo invitati con scadenza passata; avviso `invito` → letto.
- [ ] Test `prossimoAvviso`: giorno 8 → feedback; 7 alla fine → fine-7 (e niente feedback dopo); 1 → fine-1; già mandato → null; dopo estensione → fine-7 di nuovo; chiusa → finita una volta; altro piano → null; giorni di calendario a Roma (fine alle 23:30 UTC).
- [ ] Test giro: email solo per fine-7/fine-1; segni in `promemoria`.
- [ ] Implementa, verdi, commit.

### Task 9: Collegamento in index.ts

**Files:** Modify `functions/src/index.ts`.
- [ ] Wrapper `onCall({ ...pianoCall, secrets: [brevoApiKey] })` per le callable con email, `pianoCall` per le altre; `onSchedule` per le due pianificate; `ultimiAccessi` con `getAuth().getUsers` a gruppi di 100.
- [ ] `cd functions && npx tsc --noEmit -p .` e `npm test` verdi. Commit.

### Task 10: Collaudo, documenti, chiusura

- [ ] `npm run test:rules` (porta 8095) verde.
- [ ] Emulatori con saloni finti (`scripts/test360`): invito → accettazione → piano attivo → scadenza (`chiudiProve`) → Go con `exBeta` intatta; rifiuto, revoca, estensione, invito multiplo, invito scaduto, feedback, contatori. Cancella i dati di test.
- [ ] `docs/DECISIONI-AUTOMATICHE.md` (sezione B1), `PROGRESS.md`, nota condivisa; commit.
