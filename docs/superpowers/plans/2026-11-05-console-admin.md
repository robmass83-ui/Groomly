# Console Admin e sito admin — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare l'Admin Manager in una Console con rotte vere, risposte ai saloni, comunicazioni mirate e un sito web `admin.groomlyapp.it` separato dal salone.

**Architecture:** Prima il server (canale avvisi per account, contatore email, Assistenza, Comunicazioni, scheda salone), poi il client: rotte admin in un file proprio, dati comuni in un provider del layout, pagine sottili. Infine un ingresso web dedicato che monta solo login e Console.

**Tech Stack:** React 18, react-router 6, Vite, Capacitor 8, Firebase (Auth, Firestore, Functions v2 `europe-west1`, Hosting), Brevo, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-console-admin-design.md`

## Global Constraints

- I dati di I Pelosetti (`salons/{uid di Laura}`, `salon/shared`) non si scrivono né si cancellano, nemmeno nei test.
- Scheda salone: solo numeri aggregati, mai dati dei clienti finali.
- Email promozionali solo da `inviaPromo` (`functions/src/promo/inviaPromo.ts`). Email di servizio senza «Disiscriviti».
- Mittente `noreply@groomlyapp.it`, `replyTo` `info@groomlyapp.it`.
- `hosting/` e il blocco pubblico di `firebase.json` restano identici.
- Ogni frase nuova in `src/i18n/it.ts`, `en.ts`, `es.ts`, `fr.ts`, `de.ts`. Interfaccia compatta, chiaro e scuro con i token di `src/theme/tokens.css`.
- `adminLog` con `conRegistro` per ogni azione, `dettagli` senza testi e senza email.
- Limiti: comunicazioni 10 l'ora (in comune con gli avvisi, `riservaAvviso`), risposte 30 l'ora.
- Blocco email: un invio non supera `Math.floor(margine / 2)`, con `margine = TETTO_EMAIL_GIORNO - totale` (300).
- Nessun deploy, APK o merge. Niente `--force`. Se la cartella non ha `node_modules`, leggere prima la memoria «Junction nei worktree».
- Vitest dalla cartella principale prende i worktree: lì usare `--exclude "**/.claude/**"`.

## Review Focus

1. **Comunicazione interrotta e ripresa:** «Riprendi» non deve rimandare a chi ha già ricevuto. Test in Task 5.
2. **Account senza lingua o con lingua non valida:** riceve l'italiano, in app e via email, senza errori. Test in Task 1 e Task 5.
3. **Doppio tocco su «Invia» o «Rispondi»:** una sola risposta, una sola comunicazione. Test con `idRichiesta` in Task 4 e Task 5.
4. **APK vecchia con `traduzioni` in `avvisiSistema`:** continua a leggere `titolo` e `testo` in italiano. Test in Task 1.
5. **Pagina admin aperta da link diretto prima che i dati siano arrivati:** `/admin/saloni/:salonId` mostra l'attesa, non «nessun salone». Test in Task 7.

---

### Task 1: Canale degli avvisi per account

**Files:**
- Create: `functions/src/config/avvisiAccount.ts`, `functions/src/config/avvisiAccount.test.ts`
- Modify: `src/lib/avvisiSistema.ts`, `src/hooks/useAvvisiSistema.ts`, `src/data/firebase/client.ts` (solo `listenAvvisiSistema` e un nuovo listener), `src/pages/AvvisiSistemaPage.tsx`, `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`, `functions/src/config/avvisiSistema.ts`
- Test: `src/lib/avvisiSistema.test.ts`, test del hook

**Interfaces:**
- Produces: `type Traduzioni = Partial<Record<Lingua, { titolo: string; testo: string }>>`; `testoPerLingua(avviso: { titolo; testo; traduzioni?: Traduzioni }, lingua: Lingua): { titolo: string; testo: string }`; `scriviAvvisoAccount(db, uid, avviso: { tipo; titolo; testo; traduzioni?; origine: 'assistenza' | 'comunicazione'; comunicazioneId?: string }): Promise<string>`; `listenAvvisiAccount(uid, onData)`.

- [ ] **Step 1: Test che falliscono**

`testoPerLingua`: `de` con traduzione → tedesco; `de` senza → italiano; `titolo` tedesco vuoto → italiano. `scriviAvvisoAccount` scrive in `accounts/{uid}/avvisi` con `creato` server. Il hook unisce globali e dell'account in ordine di `creato`, e `nonLetti` conta entrambi. Regole: l'account legge i propri avvisi, non quelli di un altro; nessun client scrive; l'admin non legge. Documento globale con `traduzioni`: `titolo` e `testo` restano in italiano.

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `npx vitest run src/lib/avvisiSistema.test.ts` e `npm --prefix functions test -- avvisiAccount`
Expected: FAIL, funzioni non definite.

- [ ] **Step 3: Implementare**

Regola: `match /accounts/{uid}/avvisi/{id} { allow read: if signedIn() && request.auth.uid == uid; allow write: if false; }`. `AvvisiSistemaPage` mostra `testoPerLingua(avviso, lingua)`. `avvisoValido` accetta `traduzioni` con i limiti `TITOLO_MAX` e `TESTO_MAX`.

- [ ] **Step 4: Lanciare i test, regole comprese**

Run: i comandi dello Step 2 e `npm run test:rules`
Expected: PASS.

- [ ] **Step 5: Commit** `feat(avvisi): canale per account e testi per lingua`

### Task 2: Cancellazione con account e salone

**Files:**
- Modify: `functions/src/piano/pulisciSalone.ts`, `functions/src/piano/eliminaSalone.ts`
- Test: i test vicini di `pulisciSalone` ed `eliminaSalone`

**Interfaces:**
- Produces: `pulisciPersona` e `pulisciRaccolteSalone` puliscono anche le nuove raccolte; le firme non cambiano.

- [ ] **Step 1: Test che falliscono**

`pulisciPersona` cancella `accounts/{uid}/avvisi/*`, `assistenza` con quell'`uid`, `betaFeedback` con quell'`uid`, e toglie l'uid da `comunicazioni.uids` con `arrayRemove`. `pulisciRaccolteSalone` cancella `assistenza` e `betaFeedback` con quel `salonId`.

- [ ] **Step 2: Vederli fallire**, con `npm --prefix functions test -- pulisciSalone`.

- [ ] **Step 3: Implementare** a blocchi di query, come fa già il file per `suggerimenti`.

- [ ] **Step 4: Vederli passare**, stesso comando.

- [ ] **Step 5: Commit** `fix(privacy): feedback e assistenza si cancellano con l'account`

### Task 3: Contatore email condiviso

**Files:**
- Create: `functions/src/postaGiorno.ts`, `functions/src/postaGiorno.test.ts`
- Modify: `functions/src/piano/giraCoda.ts` (sposta `POSTA_GIORNO`, `postaDi`, `postaOggi`, `contaInvii` senza cambiare il comportamento), `functions/src/beta/contatoriAdmin.ts`, `src/lib/adminManager.ts` (`contatoriDi`)

**Interfaces:**
- Produces: `emailOggi(db, adesso): Promise<number>`; `margineConsole(totale: number): number` = `Math.floor(Math.max(0, TETTO_EMAIL_GIORNO - totale) / 2)`; `prenotaEmail(db, adesso, n): Promise<boolean>`: in transazione, `false` se `n > margineConsole(totale)`, altrimenti somma `n` al totale; `ContatoriAdmin.emailOggi: number`, `ContatoriAdmin.nuoviSaloni: string[]` (salonId creati negli ultimi 7 giorni).

- [ ] **Step 1: Test che falliscono**

`margineConsole(120) === 90`, `margineConsole(300) === 0`, `margineConsole(400) === 0`. `prenotaEmail` con 91 a totale 120 → `false`, totale invariato; con 90 → `true`, totale 210. Giorno nuovo a Roma: riparte da 0. `contatoriAdminPer` restituisce `emailOggi` e `nuoviSaloni`. I test esistenti di `giraCoda` restano verdi.

- [ ] **Step 2: Vederli fallire**, con `npm --prefix functions test -- postaGiorno`.

- [ ] **Step 3: Implementare.** La prenotazione non tocca `perSalone`, così i posti dei saloni restano calcolati come oggi.

- [ ] **Step 4: Vederli passare**, con `npm --prefix functions test -- postaGiorno giraCoda contatoriAdmin`.

- [ ] **Step 5: Commit** `feat(email): contatore giornaliero comune a saloni e Console`

### Task 4: Assistenza sul server

**Files:**
- Create: `functions/src/assistenza/assistenza.ts`, `functions/src/assistenza/assistenza.test.ts`, `src/lib/assistenza.ts`, `src/lib/assistenza.test.ts`
- Modify: `functions/src/index.ts`, `functions/src/rateLimit.ts`, `src/i18n/emailHtml.ts`, `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`, `src/data/firebase/adminClient.ts`

**Interfaces:**
- Consumes: `scriviAvvisoAccount`, `prenotaEmail`, `conRegistro`.
- Produces (client puro in `src/lib/assistenza.ts`): `type FonteAssistenza = 'suggerimento' | 'feedback'`; `type StatoAssistenza = 'nuovo' | 'in-corso' | 'risolto'`; `type RichiestaAssistenza = { chiave: string; fonte; idOrigine; salonId; categoria?; testo; quando: string; stato; risposte: RispostaAssistenza[] }`; `chiaveAssistenza(fonte, id) => \`${fonte}_${id}\``; `unisciRichieste(suggerimenti, feedback, documenti, assistenzaDal: string | null): RichiestaAssistenza[]`; `contaNuove(richieste): number`.
- Produces (callable): `impostaStatoAssistenza`, `rispondiAssistenza({ fonte, id, testo, anchEmail, idRichiesta })` → `{ ok: true, email: 'inviata' | 'non_inviata' | 'limite' | null }`, `salvaModelloAssistenza`, `eliminaModelloAssistenza`, `avviaAssistenza` (scrive `config/globale.assistenzaDal` se manca). Wrapper in `adminClient.ts` con gli stessi nomi preceduti da `call`, più `elencoAssistenza()`, `elencoModelliAssistenza()`.

- [ ] **Step 1: Test che falliscono**

`unisciRichieste`: senza documento e prima del taglio → `risolto`; dopo il taglio → `nuovo`; con `assistenzaDal` nullo → `nuovo`; col documento vale il documento. `rispondiAssistenzaPer`: non admin → `accesso_negato`; autore assente → errore `autore_assente`, nulla scritto; riuscita → avviso all'`uid` dell'origine, risposta aggiunta, stato `risolto`; stesso `idRichiesta` due volte → una sola risposta; `anchEmail` con email fallita → risposta salvata ed esito `non_inviata`; `prenotaEmail` falso → esito `limite`; testo vuoto o oltre `TESTO_MAX` → `richiesta_non_valida`; 31ª risposta nell'ora → `troppe_richieste`. Email: nessun link «Disiscriviti», `replyTo` `info@groomlyapp.it`. L'avviso usa il titolo fisso nella lingua dell'account. `adminLog` senza testo. Regole: `assistenza` e `assistenzaModelli` letti solo dall'admin, nessuna scrittura client.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/lib/assistenza.test.ts` e `npm --prefix functions test -- assistenza`.

- [ ] **Step 3: Implementare**, con `risposteRateDecision` (`RISPOSTE_RATE_MAX = 30`, finestra 1 ora) in `rateLimit.ts`. `TipoEmail` nuovo `rispostaAssistenza` in `emailHtml.ts`, in 5 lingue.

- [ ] **Step 4: Vederli passare**, stessi comandi più `npm run test:rules`.

- [ ] **Step 5: Commit** `feat(assistenza): stati, risposte e modelli sul server`

### Task 5: Comunicazioni sul server

**Files:**
- Create: `functions/src/comunicazioni/destinatari.ts`, `functions/src/comunicazioni/comunicazioni.ts`, i test vicini
- Modify: `functions/src/index.ts`, `src/i18n/emailHtml.ts`, `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`, `src/data/firebase/adminClient.ts`

**Interfaces:**
- Consumes: `scriviAvvisoAccount`, `prenotaEmail`, `emailOggi`, `margineConsole`, `inviaPromo`, `archivioPromo`, `riservaAvviso`, `controllaAccessoRecente`.
- Produces: `type InputComunicazione = { tipo: TipoAvviso; salonIds: string[] | 'tutti'; testi: { it: { titolo; testo } } & Traduzioni; email: 'nessuna' | 'promozionale' | 'servizio'; idRichiesta: string }`; `selezionaDestinatari(db, salonIds): Promise<{ account: Destinatario[]; titolari: Destinatario[] }>` con `Destinatario = { uid; email; lingua: Lingua; salonId }`; callable `anteprimaComunicazione(input)` → `{ account, email, inItaliano, senzaConsenso, restanoOggi, massimo, bloccata }`, `inviaComunicazione(input)` → `{ id, inviate, nonInviate }`, `riprendiComunicazione({ id })`, `eliminaComunicazione({ id })`; wrapper `call*` ed `elencoComunicazioni()`.

- [ ] **Step 1: Test che falliscono**

`selezionaDestinatari`: esclude le email che finiscono in `@test.groomly`; tiene gli account con `salonId: 'shared'`; lingua non valida → `it`; `titolari` solo con `role: 'titolare'`. `inviaComunicazione`: `tutti` senza accesso recente → errore della riconferma; filtro senza accesso recente → passa; senza testo italiano → `richiesta_non_valida`; `tutti` scrive un solo documento in `avvisiSistema` con `traduzioni`; filtro scrive un documento per account e `comunicazioni/{id}.uids`; `promozionale` passa da `inviaPromo` e salta chi non ha il consenso; `servizio` non contiene `mode=promo` né «Disiscriviti»; lingua senza testo → email in italiano; oltre `margineConsole` → errore `email_limite`, nulla inviato e nessun avviso scritto; stesso `idRichiesta` → una sola comunicazione; `invii/{uid}` scritto per ogni email; `riprendiComunicazione` manda solo a chi non è in `invii`; `eliminaComunicazione` toglie gli avvisi dei destinatari. Regole: `comunicazioni` e `invii` letti solo dall'admin.

- [ ] **Step 2: Vederli fallire**, con `npm --prefix functions test -- comunicazioni`.

- [ ] **Step 3: Implementare**, con `timeoutSeconds: 300` e invii a gruppi di 10. `TipoEmail` nuovo `comunicazione`, in 5 lingue.

- [ ] **Step 4: Vederli passare**, stesso comando più `npm run test:rules`.

- [ ] **Step 5: Commit** `feat(comunicazioni): avvisi mirati ed email di due tipi`

### Task 6: Scheda salone aggregata

**Files:**
- Create: `functions/src/beta/schedaSaloneAdmin.ts`, `functions/src/beta/schedaSaloneAdmin.test.ts`
- Modify: `functions/src/index.ts`, `src/data/firebase/adminClient.ts`, `src/components/admin/SchedaSalone.tsx`

**Interfaces:**
- Produces: `callSchedaSaloneAdmin(salonId): Promise<SchedaAggregata>` con `SchedaAggregata = { cani: number; appuntamenti: number; appuntamenti30: number; persone: number; versioneApp: string | null; lingua: Lingua | null }`.

- [ ] **Step 1: Test che falliscono**

Solo admin. Salone inesistente → zeri. `Object.keys(esito).sort()` è esattamente l'elenco dei sei campi. La versione più recente è confrontata per numeri (`1.1.100` > `1.1.99`). `SchedaSalone` mostra i numeri e, se la chiamata fallisce, un trattino, non un errore a tutta pagina.

- [ ] **Step 2: Vederli fallire**, con `npm --prefix functions test -- schedaSaloneAdmin`.

- [ ] **Step 3: Implementare** con `count()` su `salons/{id}/dogs` e `salons/{id}/appointments`, e `members` con `status: 'attivo'`. Verificare il campo data degli appuntamenti in `src/data/firebase/client.ts` prima di scrivere il filtro dei 30 giorni. Solo lettura.

- [ ] **Step 4: Vederli passare**, stesso comando.

- [ ] **Step 5: Commit** `feat(admin): conteggi aggregati nella scheda salone`

### Task 7: Layout, rotte e pagine spostate

**Files:**
- Create: `src/app/adminRoutes.tsx`, `src/components/admin/AdminLayout.tsx`, `src/components/admin/AdminDati.tsx`, `src/pages/admin/{PanoramicaPage,SaloniPage,SchedaSalonePage,BetaPage,PianiPage,AltroPage}.tsx`
- Delete: `src/pages/AdminManagerPage.tsx`, `src/components/admin/AdminFrame.tsx`, `src/components/admin/TabAdmin.tsx`
- Modify: `src/app/router.tsx`, `src/lib/percorsoAdmin.ts`, `src/components/admin/PanoramicaAdmin.tsx`, `src/components/admin/ListaSaloni.tsx`, `src/lib/adminManager.ts`, `src/pages/AvvisiSistemaPage.tsx`
- Test: `src/lib/percorsoAdmin.test.ts`, `src/app/router.admin.test.tsx`, `src/pages/AdminManagerPage.test.tsx` e `AdminManagerBeta.test.tsx` spostati in `src/pages/admin/`

**Interfaces:**
- Produces: `adminRoutes(): RouteObject[]`, con guardia passata dal chiamante; `percorsoAdminDaVecchio(search: string): string`; `useAdminDati(): { directory, righe, inviti, invitiPer, feedback, note, richieste, config, contatori, azioni, nomeDi, ricarica*, pronti, errori }`; `AdminLayout` con `<Outlet />`.
- `daFareOggi` riceve `richiesteNuove: number` al posto di `feedback`, `feedbackVisti`, `suggerimentiDaVedere`; `VoceDaFare` guadagna `{ tipo: 'assistenza'; n: number }` e `{ tipo: 'nuovi-saloni'; n: number }`.

- [ ] **Step 1: Test che falliscono**

Tabella del design in `percorsoAdmin.test.ts`, con un caso per riga, più parametri sconosciuti conservati. Router: `/admin/avvisi` → `/admin/comunicazioni`; non admin su `/admin/saloni` → `/`; admin su `/animali` → `/admin`. Layout: a 1280 px menu laterale con otto voci; a 375 px barra con Panoramica, Saloni, Assistenza, Beta, Altro; «Altro» elenca Comunicazioni, Piani, Registro, Sistema. Nessuna voce Metriche. `/admin/saloni/:salonId` da link diretto: attesa finché la directory manca, «nessun salone» solo dopo. Panoramica: nuovi saloni e `richiesteNuove`, tour assente.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/lib/percorsoAdmin.test.ts src/app/router.admin.test.tsx`.

- [ ] **Step 3: Spostare la logica di `AdminManagerPage`** in `AdminDati` e nelle pagine, senza riscriverla. I parametri `tab` e `id` diventano rotte; `cat`, `stato`, `vista` restano query. `AvvisiSistemaPage` perde `AdminFrame`, `ScriviAvviso` ed elimina. `CardTour` si esporta per il Task 10.

- [ ] **Step 4: Spostare i test** di `AdminManagerPage.test.tsx` e `AdminManagerBeta.test.tsx`, cambiando solo gli indirizzi e la navigazione. Nessun caso si perde: contare i `it(` prima e dopo.

- [ ] **Step 5: Vederli passare**

Run: `npx vitest run src/pages/admin src/lib/percorsoAdmin.test.ts src/app/router.admin.test.tsx src/lib/adminManager.test.ts` e `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit** `feat(admin): layout e rotte della Console`

### Task 8: Pagina Assistenza

**Files:**
- Create: `src/pages/admin/AssistenzaPage.tsx`, `src/pages/admin/RichiestaPage.tsx`, i test vicini
- Modify: `src/components/admin/CodaSuggerimenti.tsx`, `src/components/admin/FeedbackAdmin.tsx`, `src/lib/esportaSuggerimenti.ts`, `src/app/adminRoutes.tsx`
- Delete: `src/lib/revisioneSuggerimenti.ts` e il suo test

**Interfaces:**
- Consumes: Task 4, `useAdminDati().richieste`.
- Produces: rotte `/admin/assistenza`, `/admin/assistenza/:id`, numerino da `contaNuove`.

- [ ] **Step 1: Test che falliscono**

La prima apertura chiama `callAvviaAssistenza` una volta. Filtri per fonte, categoria, stato e salone, letti dalla query (`?fonte=suggerimenti&cat=bug`). Aprire una richiesta non cambia lo stato. Rispondere manda `idRichiesta`, svuota il campo e mostra la risposta nello storico. `autore_assente` → messaggio, testo conservato. Esito `limite` → «Risposta inviata, email non partita: limite di oggi». Modello: riempie il campo, modificabile. Sotto la casella email, la riga sull'APK. Doppio tocco: una chiamata. Esportazione: sul web `downloadAnchor`, in app `shareFiles`.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/pages/admin/AssistenzaPage.test.tsx`.

- [ ] **Step 3: Implementare**, riusando le righe e il dialogo di esportazione di `CodaSuggerimenti`. `shareFile` si importa con `import()` solo se `Capacitor.isNativePlatform()`.

- [ ] **Step 4: Vederli passare**, stesso comando.

- [ ] **Step 5: Commit** `feat(admin): pagina Assistenza con risposte`

### Task 9: Pagina Comunicazioni

**Files:**
- Create: `src/pages/admin/ComunicazioniPage.tsx`, `src/components/admin/ModuloComunicazione.tsx`, i test vicini
- Modify: `src/components/admin/PianiPagamenti.tsx` (l'Annuncio si sposta), `src/app/adminRoutes.tsx`

**Interfaces:**
- Consumes: Task 5, `useRiconferma`, i filtri di `ListaSaloni`.

- [ ] **Step 1: Test che falliscono**

«Promozionale» preselezionata quando si accende l'email. Scegliendo «Servizio» appare il promemoria. Italiano vuoto → invio spento. L'anteprima si aggiorna a ogni cambio di destinatari, lingua o tipo, e mostra account, email, in italiano, senza consenso, restanti. `bloccata` → bottone spento con il motivo, ma togliendo l'email si può inviare. «Tutti» passa da `conRiconferma`, il filtro no. Storico con conteggi, «Riprendi» se `inviate < email`, «Elimina». Annuncio pagamenti presente qui, assente in Piani.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/pages/admin/ComunicazioniPage.test.tsx`.

- [ ] **Step 3: Implementare**, spostando `ScriviAvviso` e la sezione Annuncio. `idRichiesta` nasce con `crypto.randomUUID()` all'apertura del modulo.

- [ ] **Step 4: Vederli passare**, stesso comando.

- [ ] **Step 5: Commit** `feat(admin): pagina Comunicazioni`

### Task 10: Registro, Sistema ed Email oggi

**Files:**
- Create: `src/pages/admin/RegistroPage.tsx`, `src/pages/admin/SistemaPage.tsx`, i test vicini
- Modify: `src/data/firebase/adminClient.ts`, `src/components/admin/PanoramicaAdmin.tsx`, `src/app/adminRoutes.tsx`, `firestore.indexes.json` se serve

**Interfaces:**
- Produces: `elencoAdminLog({ dopo?: string; azione?: string; salonId?: string; limite: 50 })`.

- [ ] **Step 1: Test che falliscono**

Registro: dal più recente, «Altri» carica la pagina seguente, filtri per azione e salone, nome del salone dove noto. Sistema: versione installata, versione da `release.json`, se il fetch fallisce un trattino; `CardTour`; link rapidi a Firebase, Play Console, Brevo, RevenueCat, con `rel="noreferrer"`; «Email oggi: 120 su 300». Panoramica: stessa riga.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/pages/admin/RegistroPage.test.tsx src/pages/admin/SistemaPage.test.tsx`.

- [ ] **Step 3: Implementare.** I filtri su `adminLog` con ordinamento richiedono indici composti: aggiungerli a `firestore.indexes.json` a mano, l'emulatore non li chiede.

- [ ] **Step 4: Vederli passare**, stesso comando.

- [ ] **Step 5: Commit** `feat(admin): Registro, Sistema e conteggio email`

### Task 11: Sito admin

**Files:**
- Create: `admin.html`, `src/main.admin.tsx`, `src/app/AdminApp.tsx`, `src/pages/admin/AdminLoginPage.tsx`, `src/pages/admin/AccessoRiservatoPage.tsx`, `scripts/controlla-bundle-admin.mjs`, `src/lib/firebaseJson.test.ts`, stub in `src/lib/stubNativi/` se servono
- Modify: `firebase.json`, `.firebaserc`, `package.json`, `vite.config.ts`, `.gitignore`, `src/data/firebase/client.ts` (solo `auth()` e `database()`)

**Interfaces:**
- Consumes: `adminRoutes()`.
- Produces: `npm run build:admin`, `npm run deploy:admin`, `solaAdmin(): boolean` = `import.meta.env.VITE_ENTRY === 'admin'`.

- [ ] **Step 1: Test che falliscono**

`firebaseJson.test.ts`: il target `pubblico` è uguale, chiave per chiave, al blocco di `main` copiato nel test; il target `admin` ha `public: 'dist-admin'`, la rewrite `**` e `X-Robots-Tag: noindex, nofollow`. `AdminApp`: non autenticato → `AdminLoginPage` senza registrazione; senza claim → «Accesso riservato» ed Esci; con claim → Console; `/animali` → `/admin`. `admin.html` contiene `noindex`.

- [ ] **Step 2: Vederli fallire**, con `npx vitest run src/lib/firebaseJson.test.ts src/app/AdminApp.test.tsx`.

- [ ] **Step 3: Implementare.** Con `solaAdmin()`, `auth()` usa `initializeAuth(app, { persistence: browserSessionPersistence })` e `database()` usa `memoryLocalCache()`. Vite con `VITE_ENTRY=admin`: `build.rollupOptions.input` su `admin.html`, `outDir` `dist-admin`, e rinomina in `index.html` oppure rewrite su `/admin.html`. Script: `build:admin` con `cross-env` solo se già installato, altrimenti `vite build --mode admin` con `.env.admin` contenente `VITE_ENTRY=admin`. `deploy:admin` = `npm run build:admin && firebase deploy --only hosting:admin`. `.firebaserc` con `targets`: `pubblico` → `groomly-3128b`, `admin` → `groomly-admin`.

- [ ] **Step 4: Controllo del bundle**

`scripts/controlla-bundle-admin.mjs` cerca in `dist-admin` `local-notifications`, `push-notifications`, `purchases-capacitor`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/share`, `HomePage`, ed esce con 1 se ne trova. Il worktree non ha `.env.local`: per la prova usare `VITE_FIREBASE_API_KEY=finta`, senza pubblicare il risultato.

Run: `npm run build:admin && node scripts/controlla-bundle-admin.mjs`
Expected: `Bundle admin pulito`. Se un plugin compare, proteggere l'import o aggiungere un alias allo stub.

- [ ] **Step 5: Vederli passare**, comando dello Step 2 e `npm run build` per l'app.

- [ ] **Step 6: Commit** `feat(admin): sito web con ingresso proprio`

### Task 12: Verifica nel browser e documenti

**Files:**
- Modify: `docs/GUIDA-ADMIN-MANAGER.md`, `PROGRESS.md`, `scripts/test360/*` se servono

- [ ] **Step 1: Suite complete**

Run: `npm test`, `npm --prefix functions test`, `npm run test:rules`, `npx tsc --noEmit`
Expected: tutto verde. Eventuali fallimenti già presenti su `main` si riportano, non si nascondono.

- [ ] **Step 2: Prova su emulatori**

Con `npm run emu` e `test:360`, senza produzione: login admin, a 1280 px e 375 px, chiaro e scuro, ogni rotta. Risposta a un suggerimento e avviso visto dall'account autore. Comunicazione filtrata, promozionale con un account col consenso. Blocco oltre il limite. Vecchi link. Non admin su `/admin`. Sulla build `admin`: login, ricarica, chiusura scheda.

- [ ] **Step 3: Cancellare i dati di test**, sugli emulatori e in cartella. Nessun dato in produzione.

- [ ] **Step 4: Scrivere i documenti**

Guida riscritta sulle nuove pagine, con «Email oggi», i due tipi di email, `hosting:pubblico` per il sito pubblico e i passi a mano. `PROGRESS.md` aggiornato. Versione invariata: la incrementa il rilascio.

- [ ] **Step 5: Commit** `docs(admin): guida della Console e avanzamento`
