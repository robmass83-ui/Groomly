# A8 + A9 — Elimina account del titolare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quando il titolare elimina l'account non restano online pagina pubblica, inviti e altri resti; soci e collaboratori tornano al proprio salone; il telefono che elimina non riscrive le impostazioni.

**Architecture:** Si estrae da `eliminaSalonePer` una pulizia comune (raccolte del salone + resti delle persone eliminate) usata sia da `eliminaSalonePer` sia da `eliminaAccountPer`. `eliminaAccountPer` (titolare) riporta prima i membri al proprio salone. Nel client un segno «eliminazione in corso» impedisce a `listenSettings` di riseminare il salone.

**Tech Stack:** Cloud Functions TypeScript (firebase-admin), test con Firestore finti già usati in `functions/src/piano/eliminaSalone.test.ts` / `eliminaAccount.test.ts` (eseguiti dalla radice con `npx vitest run functions/...`); client React/TS + Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-a8-a9-elimina-account-titolare-design.md`

## Global Constraints
- Ramo `fix/a8-a9-elimina-account-titolare`.
- Soci e collaboratori del salone eliminato tengono login, email e dati; `members/<uid>` → `revocato`; `accounts/<uid>` → `{ salonId: <uid>, role: 'titolare' }` (merge) solo se `salonId` era il salone eliminato.
- Persona eliminata da «Elimina account» del titolare: solo il titolare.
- «Elimina salone» dell'operatore: comportamento invariato (i suoi test restano verdi).
- «Elimina account» di un membro: invariato.
- Ordine in «Elimina account» del titolare: membri riportati → salone (`recursiveDelete`) → raccolte del salone → resti del titolare → utente Auth per ultimo.
- Commit con riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Membro il cui account punta già a un altro salone (es. reinvitato altrove): il suo account non viene toccato → test in Task 1.
2. Titolare senza pagina pubblica, senza inviti, senza telefoni: l'eliminazione va a buon fine → test in Task 1.
3. Email del titolare con maiuscole: `emailRateLimits` cancellato sulla forma normalizzata (come in `eliminaSalone`) → test in Task 1.
4. Eliminazione che fallisce a metà e viene rilanciata: riprende senza errori (le cancellazioni di documenti assenti non falliscono) → test in Task 1.
5. Telefono del titolare: dopo «Elimina account» nessuna scrittura di `settings/main` anche se lo snapshot arriva «non esiste» → test in Task 2.

---

### Task 1: Server — pulizia comune e membri riportati al proprio salone

**Files:**
- Create: `functions/src/piano/pulisciSalone.ts` (pulizia comune)
- Modify: `functions/src/piano/eliminaSalone.ts:~60-100` (usa la pulizia comune)
- Modify: `functions/src/piano/eliminaAccount.ts:~59-78` (ramo `salone`)
- Test: `functions/src/piano/eliminaAccount.test.ts`, `functions/src/piano/eliminaSalone.test.ts` (o un nuovo `pulisciSalone.test.ts`)

**Interfaces:**
- Produces: `export async function pulisciRaccolteSalone(db: Firestore, salonId: string): Promise<void>` (invites, pubblici, schede, suggerimenti per `salonId`) e `export async function pulisciPersona(db: Firestore, persona: { uid: string; emails: string[] }): Promise<void>` (suggerimenti/pushSfide per uid, i tre limiti, `accounts/<uid>`, `users/<uid>`, Storage, `pushDeliveries` dei suoi `accounts/<uid>/devices` letti prima di cancellare l'account, `emailRateLimits/<email normalizzata>`). Nomi liberi se il builder trova di meglio, purché due funzioni distinte (salone / persona).

- [ ] **Step 1: Test** in `eliminaAccount.test.ts` (Firestore finto del file):
  - `'il titolare che si elimina non lascia pagina pubblica, inviti né contatori email'` → salone con `pubblici/<slug>` (salonId), un `invites/<id>` (salonId), `emailRateLimits/<email titolare>`, `schede`/`suggerimenti` del salone → dopo `eliminaAccountPer(uid)` non esistono più.
  - `'soci e collaboratori tornano al proprio salone e tengono l’accesso'` → un socio e un collaboratore con `accounts.salonId` = salone → dopo: `members` `revocato`, `accounts` `{ salonId: <loro uid>, role: 'titolare' }`, i loro `accounts`/Auth non cancellati.
  - `'un membro che è già in un altro salone non viene toccato'` → `accounts.salonId` = altro salone → invariato.
  - `'senza pagina pubblica, inviti e telefoni l’eliminazione riesce'`.
- [ ] **Step 2: Esegui** `npx vitest run functions/src/piano/eliminaAccount.test.ts functions/src/piano/eliminaSalone.test.ts` → i nuovi FAIL, quelli di `eliminaSalone` PASS.
- [ ] **Step 3: Implementa** le due funzioni comuni, rifai `eliminaSalonePer` con esse (stesso ordine e stessi risultati) e il ramo `salone` di `eliminaAccountPer` nell'ordine dei Global Constraints.
- [ ] **Step 4: Esegui** → PASS; root `npx vitest run` (noto: `src/lib/driveInvio.test.ts`), `cd functions && npx tsc --noEmit`.
- [ ] **Step 5: Commit** `fix(A8,A9): eliminare l'account del titolare pulisce tutto e libera soci e collaboratori`

### Task 2: Client — il telefono che elimina non riscrive le impostazioni

**Files:**
- Modify: `src/data/firebase/client.ts` (`callEliminaAccount` ~490; guardia usata da `listenSettings` ~1809, es. `canAutomaticallySeedSalon()`)
- Test: test esistente di `client.ts` per `listenSettings` o un nuovo test focalizzato

**Interfaces:**
- Produces: un segno di modulo «eliminazione in corso» acceso da `callEliminaAccount` prima della chiamata e mai spento con successo (l'app esce dopo); spento se la chiamata fallisce.

- [ ] **Step 1: Test** `'durante e dopo Elimina account le impostazioni assenti non vengono riseminate'` → con il segno acceso, uno snapshot «non esiste» di `settings/main` non provoca scritture; `'se l’eliminazione fallisce si torna come prima'` → segno spento, il seme riparte come oggi.
- [ ] **Step 2: Esegui** → FAIL.
- [ ] **Step 3: Implementa** il segno e il controllo in `listenSettings` (e negli altri semi automatici del salone che usano la stessa guardia).
- [ ] **Step 4: Esegui** → PASS; `npx vitest run` (noto: driveInvio), `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 5: Commit** `fix(A9): il telefono che elimina l'account non riscrive le impostazioni`

### Task 3: Verifica, audit, merge, release (controller)

- [ ] **Step 1:** Emulatori: script che chiama `eliminaAccountPer` compilata (le callable in emulatore danno INTERNAL) sul titolare di un Salone di prova con socio e collaboratore, pagina pubblica e un invito → controlla resti e account dei membri; poi accesso del collaboratore nel browser → parte come salone nuovo, nessun «Il titolare ha spento il piano».
- [ ] **Step 2:** Solo se tutto passa: A8 e A9 «risolti» nell'audit, commit `docs: A8 e A9 verificati e chiusi`, merge in `main`, deploy functions `eliminaAccount`, `eliminaSalone` (`FUNCTIONS_DISCOVERY_TIMEOUT=60`), release APK.
