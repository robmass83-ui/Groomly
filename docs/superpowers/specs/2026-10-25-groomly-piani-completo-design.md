# Groomly — Piani, sicurezza e funzioni: specifica unica

Data: 2026-10-25
Stato: accettata per esecuzione immediata. Il committente ha chiesto una sola specifica, un solo piano e l’esecuzione intera senza conferme intermedie. Le domande della §17 del piano sorgente sono chiuse qui sotto con la raccomandazione già scritta in quel piano.

Fonti, in questo ordine se un dettaglio manca qui: `docs/Groomly_Abbonamenti_PIANO.md` (v2, 25/10/2026), `docs/Groomly_Test360_RAPPORTO_2026-10-25.md`, `docs/test360-kit/LEGGIMI.md`, `docs/Groomly_Controlli_Avanzati_PIANO.md` (solo le parti non sostituite), `docs/superpowers/specs/2026-10-24-pro-collaboratori-design.md`.

Base di codice da cui si riparte (25/10/2026, pomeriggio): ramo `main`, commit `f60df42`, versione **1.1.93**. `origin/main` è ancora `8ea3fc4` (1.1.80): `main` è avanti di 64 commit, non ancora pushato. Il rapporto di verifica è `docs/Groomly_Test360_VERIFICA_FASE0_2026-10-25.md`.

## Obiettivo

Un solo ramo, regole Firestore che chiudono le falle del test 360°, e i piani Base / Pro / Salone accesi a mano (prova e omaggio) finché Google Play e RevenueCat non sono pronti. Le funzioni Pro di lancio sono prenotazioni online, lista d’attesa e recensioni Google, più fedeltà, scheda per il cliente, statistiche, export, report dei mesi passati, copie nel cloud, promemoria email, pagella, collage, prezzo suggerito, aumento listino e i controlli avanzati in modalità manuale. L’aggiornamento via APK resta. WhatsApp automatico e crediti restano solo predisposti. Alla fine il test 360° è verde e ogni falla 🔴 e 🟠 del rapporto del 25/10 risulta chiusa.

## Decisioni chiuse in questa specifica

| # | Decisione |
|---|---|
| D1–D10 | Restano quelle della §1 del piano sorgente. |
| A1 | Sui documenti in Base (listino, pagella, collage) c’è la scritta piccola «Fatto con Groomly». Pro e Salone la tolgono (`senzaFirma`). |
| A2 | Il prezzo fondatori è un’offerta da creare in Play Console, non un prezzo nel codice. Va in `docs/DA-FARE-ROBERTO.md`. |
| A3 | La prova dura 30 giorni (`config/globale.provaGiorni`). Una volta sola per salone. Senza carta. |
| A4 | Account Play personale o organizzazione: lo decide il commercialista. Non blocca il codice. |
| A5 | Export PDF/Excel è Pro per i saloni nuovi. Il report del mese corrente resta visibile in Base. |
| A6 | Prezzi di lancio, solo in Play Console e in `DA-FARE-ROBERTO.md`, mai nel codice: Pro 9,99 €/mese o 99,90 €/anno; Salone 19,99 €/mese o 199,90 €/anno con 3 posti; posto extra 3,99 €/mese (39,90 €/anno). Quando arriverà il WhatsApp automatico i prezzi nuovi varranno solo per i nuovi abbonati. |
| A7 | Il codice di RevenueCat si scrive ora, dietro `abbonamentiAttivi == false`. Nessun acquisto vero parte finché Roberto non completa Play Console e RevenueCat. |
| R1-bis | Con `mostraPiani == false` l’app è identica a oggi, con due sole voci nuove, richieste dal Play Store anche in Base: Privacy e termini, Elimina account. Niente badge, niente card piano, niente sezioni Messaggi / Team / Strumenti. |
| Laura | Il salone vero non si legge e non si scrive. L’omaggio Salone si fa una volta, a mano, dal telefono dell’operatore, dopo la pubblicazione. Nessuno script lo fa. |

## Fuori da questo lavoro

- WhatsApp automatico (P1, W1–W6, procedura «Collega il tuo WhatsApp»). `config/globale.canaleAuto` esiste e vale solo `"email"`.
- Crediti, `CreditiMeter`, `/impostazioni/crediti`, `assegnaCrediti`, prodotti `crediti_100` e `crediti_300`. I tipi in `piano.ts` possono esistere come funzioni pure non collegate all’interfaccia, così un seguito non riscrive il modello. Nessuna schermata li mostra.
- Togliere l’aggiornamento APK, il flavor `play`, `REQUEST_INSTALL_PACKAGES` e `AppInstallerPlugin`. Piano 8 del sorgente: si fa solo quando l’app è stabile e si passa al Play Store.
- Test chiuso Play di 14 giorni (piano 10): passo di Roberto.
- Accendere `abbonamentiAttivi` o `mostraPiani` in produzione. Restano `false`.
- Toccare `groomly-3128b` dagli script di test. Toccare `salons/{uid di Laura}`, `salon/shared`, il salone Troddioni (`robmass83@gmail.com`) e i loro `users/{uid}`.

## Approcci

1. **Billing.** RevenueCat sopra Google Play, come §9 del piano sorgente. Scartati: verifica Play scritta a mano, e Stripe adesso. Stripe resta un seguito solo per il web.
2. **Accesso.** Un solo modulo `src/lib/piano.ts`. Nessun componente confronta `piano === 'pro'`. Scartato: un `if` per schermata.
3. **Pagina pubblica.** Web app in `hosting/salone/` che parla solo con callable. Scartato: leggere Firestore dal browser del cliente.

## Stato reale del codice (f60df42), da non reinventare

Già in `main`, con commit: unione di `pro-collaboratori` e della scheda nido (`d42c4b7`, `e6a633f`); regole F1 F3 F4 M12 (`1b42e94`); salvataggio offline F2 (`940bd4f`); `src/lib/piano.ts` (`3cad49e`); usabilità F8 M1 M2 M4 M7 M8 M9 M10 (`3fdba0c` … `f60df42`). La schermata F5 esiste e i test con i mock passano; con le regole vere il collaboratore resta su «Carico l'agenda…». `npm test` su questo commit: 1.515 verdi, 9 rossi.

- `pro/main` è già leggibile da chi ha l'account su quel salone (`accountSalonIs`), anche con il piano spento. La raccolta `members` no: il collaboratore legge solo `members/{proprio uid}`. `watchSalonAccess` ascolta l'elenco intero, l'errore `permission-denied` lascia i membri vuoti, e `accessoSospeso` con membri vuoti non decide. Scelta: non si allarga l'elenco (contiene le email dei colleghi) e non si scrive un campo nuovo sugli account veri. Si ascolta il documento del membro proprio, già consentito, e se l'elenco è negato si mostra la sospensione.
- I 9 test rossi si correggono nel codice di test o nel filtro del segno di cancellazione. L'orologio dei test di appuntamento si ferma con `vi.setSystemTime`. Non si cambia l'orario proposto nell'app.
- Il nome del salone compare due volte in Impostazioni dopo M8 (`salonName` e ragione sociale uguali). Si aggiorna il test. Non si nasconde un campo.
- `fetch` di test che fa `vi.unstubAllGlobals()` torna oggi alla rete vera. Il blocco deve restare anche dopo l'unstub.

- Collaboratori già pubblicati: ruoli, `members`, `invites`, `setSalonPro`, `createInvite`, `acceptInvite`, `revokeMember`, `changeMemberRole`, `assigneeUid`, «Chi lo fa», incassi filtrati, `/impostazioni/pro`, `PRO_SEAT_LIMIT = 3`, `accessWithoutPro`. Non si riscrivono.
- F1, F3, F4 e M12 sono già nelle regole di `f60df42`, con test sull’emulatore in `src/lib/firestoreRules.emulator.test.ts` (escluso da `npm test`, lanciato da `test:rules`). Non si riaprono.
- F2 è già in `saveDog`: una lettura offline non annulla la scrittura. Il filtro in ascolto non deve però trattare un segno illeggibile come «nessuna cancellazione».
- Non esiste ancora `src/i18n/`. I testi nuovi vanno in `src/i18n/it.ts`.
- `functions/src/index.ts` esporta già `setSalonPro`. Le funzioni nuove stanno in `functions/src/piano/` e si registrano da `index.ts`.
- Il kit 360° è ancora solo in `docs/test360-kit/`. La patch emulatori non si copia così com’è: gli import `connect*` stanno dentro il ramo `VITE_EMULATORS === '1'`.

## Rami (fase 0.2)

1. Il codice che si continua è `pro-collaboratori` (`f8630c3`), unito in `main`. `main` non ha commit che `pro-collaboratori` non abbia, a parte la documentazione locale.
2. Si riporta il commit `f6b2e16` (scheda nido: `DogPage`, `NextAppointment`, `NotificationsPage`) sopra il risultato, tenendo i vincoli del collaboratore (niente archivia, niente deceduto, niente elimina).
3. Le modifiche non salvate su `main` si confrontano con `f6b2e16` e con `f8630c3`. Si tengono se aggiungono un comportamento che i test dimostrano e che il nido non ha già: altezza del `PhoneShell` (`frameHeight`), animazione scheda ferma (`.scheda-enter.is-settled`, `touch-action: pan-y`), e la pagina Notifiche se è più avanti del nido. Se un pezzo è lo stesso lavoro due volte, resta una sola copia, quella che i test accettano.
4. I worktree in `D:\Groomly-worktrees\*` e `D:\Groomly\.worktrees\*` si rimuovono solo dopo che il loro commit è raggiungibile da `main` o è stato scartato con una nota nel rapporto. Non si cancella un worktree il cui commit non è in `main`.

## Modello

`config/globale` (solo server in scrittura, lettura a chi è entrato):

- `mostraPiani: false`
- `abbonamentiAttivi: false`
- `whatsappAutoAttivo: false`
- `canaleAuto: "email"`
- `emailOggi: { data, inviate, limite: 300 }`
- `provaGiorni: 30`
- `postiInclusiSalone: 3`
- `postiMax: 8`
- `versioneMinimaApp` resta informativo

`salons/{salonId}/pro/main` (solo server):

- Campi della §7.1 del piano sorgente.
- `enabled` è derivato: `true` solo se `piano === "salone"` e lo stato effettivo non è base (attivo, prova, grazia, oppure disdetto con `scadeIl` nel futuro). `scadeIl` null su fonte `omaggio` o `manuale` non scade.
- `seats = seatsIncluded + seatsExtra`. Pro ha `seatsIncluded` 0. Salone ha 3 più gli extra, tetto 8.
- `accessWithoutPro` sul membro non si tocca. Vale come accesso al salone anche in Base.

Raccolte solo server, scrittura client negata: `pro`, `crediti`, `movimentiCrediti`, `copieCloud`, `members`, `messaggi`, `whatsapp`, `richieste`, `attesa` (l’attesa la scrive il server quando arriva dal web; dal telefono del salone la scrive il titolare o il socio attraverso una callable, non con un `setDoc` libero). `interesse/{feature}` : create per titolare e socio, niente update né delete. `rcEventi`, `emailRateLimits`, `invites`, `pubblici`: client negato. `azioneTokens` solo server.

Elenco chiuso scrivibile dal titolare o dal socio, oltre alle regole già dedicate di cani, appuntamenti, file e impostazioni: `services`, `closures`, `settings`, `meta`, `deletedDogs`. Ogni altro `kind` è negato. Il collaboratore non entra in questo elenco.

Su un appuntamento con `status == "completato"`, il collaboratore non può cambiare `total`, `paymentMethod`, `actualDurationMin`, `status`, `assigneeUid`.

`isOperator()` richiede `request.auth.token.email_verified == true` oltre alle due email. In parallelo si prepara il custom claim `admin` (B-3): le regole accettano `request.auth.token.admin == true` **oppure** il controllo email attuale con verifica. Il client legge `getIdTokenResult().claims.admin`. Le email non si cancellano dalle regole in questo giro: toglierle prima che il claim sia impostato sugli account veri chiuderebbe fuori l’operatore. Lo script che imposta il claim sta nel repo ma **non si lancia** sul progetto vero da questo lavoro; la nota è in `DA-FARE-ROBERTO.md`.

## `src/lib/piano.ts`

Logica pura. Nessun import di Firebase.

```ts
export type Livello = 'base' | 'pro' | 'salone'
export type StatoPianoNome = 'attivo' | 'prova' | 'grazia' | 'sospeso' | 'disdetto' | 'scaduto'
export type FontePiano = 'play' | 'prova' | 'omaggio' | 'manuale'

export type FeatureKey =
  | 'reportPassati' | 'export' | 'copieCloud'
  | 'promemoriaAuto' | 'richiamo' | 'pronto' | 'compleanno'
  | 'pagella' | 'prezzoSuggerito' | 'aumentoListino' | 'collage' | 'senzaFirma'
  | 'prenotazioni' | 'listaAttesa' | 'recensioni' | 'fedelta' | 'schedaCliente' | 'statistiche'
  | 'team' | 'postiExtra'

export interface ProMain { /* campi §7.1, tutti opzionali in ingresso */ }
export interface StatoPiano {
  livello: Livello
  stato: StatoPianoNome | 'assente'
  fonte: FontePiano | null
  scadeIl: Date | null
  inProva: boolean
  giorniProva: number | null
  posti: number
  rinnovoAutomatico: boolean
}

export function statoPiano(doc: ProMain | undefined, adesso: Date, opzioni?: { offline?: boolean }): StatoPiano
export function haAccesso(stato: StatoPiano, feature: FeatureKey): boolean
export function livelloMinimo(feature: FeatureKey): Livello
export function mostraBadge(cfg: { mostraPiani?: boolean }, stato: StatoPiano, feature: FeatureKey): boolean
export function puoProporre(ui: { ultimaProposta?: string }, creatoIl: Date, adesso: Date): boolean
export function postiTotali(doc: ProMain | undefined): number
```

Regole di `statoPiano`:

- Documento assente → livello `base`, stato `assente`, posti 0.
- `sospeso` o `scaduto` → base.
- `attivo`, `prova`, `grazia`, `disdetto`: se `scadeIl` è null (omaggio o manuale) oppure è dopo `adesso`, il livello è quello del documento. Altrimenti base.
- Offline: se `opzioni.offline` e `scadeIl` è passata da meno di 72 ore, si tiene il livello del documento. Oltre 72 ore, base. La prova non si allunga sul client: `avviaProva` è solo server.
- `haAccesso`: salone include pro include base. `team` e `postiExtra` solo salone. Le altre chiavi Pro solo pro e salone. Una chiave non elencata non esiste.
- `mostraBadge`: falso se `mostraPiani` non è true, falso se `haAccesso`, vero se la vista della funzione è `badge`.
- `puoProporre`: falso se l’account ha meno di 7 giorni; falso se `ultimaProposta` è entro 7 giorni; altrimenti vero.

`setSalonPro(salonId, true)` chiama `impostaPianoManuale` con piano `salone`, fonte `omaggio`, senza scadenza. `false` scrive piano `base`, stato `scaduto`, `enabled: false`. Rifiuta `shared` e il chiamante che non è operatore, con gli stessi messaggi di oggi.

`avviaProva`: solo il titolare, solo se `provaUsata` non è true, scrive `piano: pro`, `stato: prova`, `fonte: prova`, `scadeIl` a +30 giorni, `provaUsata: true`, `enabled: false` (la prova è Pro, non Salone). Funziona anche con `abbonamentiAttivi == false`.

`chiudiProve`: ogni ora, le prove con `scadeIl` passato e senza entitlement Play diventano `piano: base`, `stato: scaduto`, `enabled: false`. I dati restano.

## Interfaccia

Componenti in `src/components/piano/`: `ProBadge`, `ProGate`, `PaywallSheet`, `PianoCard`. Hook `usePiano()` legge `pro/main` e `config/globale`. Con i documenti assenti si comporta come Base e `mostraPiani: false`.

Con `abbonamentiAttivi == false` la paywall non mostra prezzi: testo «Abbonamenti in arrivo», pulsante «Avvisami» che crea `interesse/{feature}`, e, se la prova non è mai stata usata, pulsante «Prova gratis 30 giorni» che chiama `avviaProva`.

La paywall non si apre da sola durante creazione appuntamento, Completato, Disdici o salvataggio scheda. Si apre al tocco su una funzione Pro, o nei momenti della §6.4 (massimo uno ogni 7 giorni, mai prima di 7 giorni di uso).

Menu: la barra in basso non cambia. «Funzioni Pro» diventa «Team» sulla route `/impostazioni/team` (la vecchia `/impostazioni/pro` reindirizza). Le sezioni nuove della §5.2 compaiono solo con `mostraPiani == true`, salvo Privacy ed Elimina account. Il collaboratore non vede card piano, Team, Messaggi, Strumenti, Abbonamento. Il socio non vede «Abbonati».

Pagina Utenti (solo operatore): per ogni salone che non è `shared`, azioni «Prova 30 giorni», «Pro omaggio», «Salone omaggio», «Torna a Base». `shared` non ha azioni. Nessun pulsante chiama il salone vero da uno script.

Testi visibili «pelosetto» diventano «Appuntamento» / «Fissa un appuntamento». Il valore salvato `kind: 'pelosetto'` resta.

## Funzioni di prodotto

Ogni funzione della tabella §4 del piano sorgente passa da `haAccesso` / `ProGate`. Dettaglio di comportamento: §4b e §8.0 di quel piano, con questi vincoli di implementazione.

- **H0 Orari.** `settings.business.orari`. Default assente: l’agenda non cambia (R1).
- **H1 Pagina.** Slug unico in `pubblici/{slug}`, scritto solo dal server. HTML con Open Graph da `paginaSalone`. Il collegamento DNS di `groomlyapp.it` è un passo di Roberto; i test usano l’hosting dell’emulatore.
- **H2 Disponibilità.** `src/lib/disponibilita.ts` puro, fuso `Europe/Rome`, test sull’ultima domenica di marzo e di ottobre. Il client pubblico non riceve gli appuntamenti altrui, solo gli orari d’inizio.
- **H2 richieste.** Stati `nuova`, `accettata`, `proposta`, `rifiutata`, `scaduta`, `disdetta`. Blocco tratteggiato in agenda per 48 ore. Email Brevo con gli stessi stili delle email già presenti. Se Brevo non è configurato (emulatore, chiave assente) la funzione registra l’email come non inviata e non lancia un errore al cliente: la richiesta resta `nuova`. I template nuovi si elencano in `DA-FARE-ROBERTO.md`; il codice invia con un modulo che, senza template id, compone l’HTML già usato da `brevoMail`.
- **H3 Lista d’attesa.** Alla disdetta, `postoLiberato` cerca i compatibili e mostra il foglio. In Base la voce ha il badge.
- **H4 Recensioni.** Link incollato dal salone. Dopo Completato, un foglio, al massimo una volta ogni 12 mesi per cliente, mai sulla stessa visita con una nota di problema, mai più di 5 proposte al giorno. Nessun premio nel testo.
- **H5 Fedeltà.** Timbro automatico al Completato, tolto se il Completato si annulla. Premio a 0 € con nota «Premio fedeltà».
- **H6 Scheda cliente.** Token da 32 byte, revocabile. La callable non restituisce note interne, tag, «mordace».
- **H7 Statistiche.** Calcolo sul telefono in `src/lib/statistiche.ts`. In Base si vede solo la card €/ora del mese, le altre sono badge.
- **M1** coda «Invia tutti» in Base, gratis, WhatsApp del telefono, stato persistito.
- **M2** promemoria email la sera prima, idempotenti per appuntamento + data, tetto `emailOggi.limite`. Oltre il tetto il cliente resta nella coda M1.
- **F1, F2, F3, P2–P5, P7, P8** in modalità manuale (WhatsApp con un tocco o schermata locale). **P6** compare solo con almeno 3 cani simili, poi badge se Base.
- **B2** copie cloud: foto una volta sola, ZIP giornaliero dei dati, 30 giorni, callable `scaricaCopia` con URL firmato. Senza bucket configurato la funzione risponde «Copie non disponibili» e i test usano un fake dello storage.
- **E1** scritta Base, assente con Pro.
- **Proposte §6.4** e **metriche §13**: eventi solo dopo il consenso. Senza consenso, nessuna chiamata Analytics.

## Billing preparato, spento

`src/lib/billing.ts` avvolge il plugin. Senza `VITE_REVENUECAT_KEY`, o con `abbonamentiAttivi == false`, `compra` non chiama lo store e la paywall resta «In arrivo». `rcWebhook` verifica `Authorization`, ignora l’evento se `rcEventi/{id}` esiste già, rilegge il subscriber e chiama `scriviPiano`. Senza `REVENUECAT_API_KEY` il webhook risponde 503 e non scrive il piano. `launchMode` diventa `singleTop` solo insieme al permesso billing; si verifica che `/azione`, il ritorno da Drive e il tasto indietro restino. Se il plugin RevenueCat non è installabile in questo ambiente, il wrapper compila contro un’interfaccia locale e il plugin si annota in `DA-FARE-ROBERTO.md` come dipendenza da aggiungere al momento del Play Store. Non si pubblica un APK che apre acquisti.

Android: il permesso `BILLING` si aggiunge solo se il plugin c’è. Non si toglie `REQUEST_INSTALL_PACKAGES`.

## Test e pulizia

- Ogni fase finisce con i test di quella fase verdi e `npm run build` pulito. `APP_VERSION` non si alza fino all’ultima pubblicazione.
- `npm test` non apre rete. Obiettivo sotto 4 minuti. I test lenti (emulatore, Playwright) stanno in `test:rules`, `test:e2e`, `test:360`.
- Gli script di test si fermano se `FIRESTORE_EMULATOR_HOST` o `FIREBASE_AUTH_EMULATOR_HOST` mancano, e se il project id non inizia con `demo-`.
- Dati di prova solo in memoria sugli emulatori. Si spengono senza `--export-on-exit`. Si cancellano `test-results/`, i log dell’emulatore e i download di prova. `git status` non deve mostrare dati di saloni.
- Il test 360° iniziale si fa dopo la fase 0, sul codice sistemato, e fotografa le falle ancora aperte. Il test finale deve trovare chiuse F1, F2, F3, F4, F5, F6, F7 (o motivata in `DA-FARE-ROBERTO.md` se GitHub rifiuta il privato), F8, F9, F10 e M1–M13. F7 si considera chiusa solo se il repo del codice è privato **e** l’APK pubblico resta scaricabile. Se il privato non si può fare senza spegnere gli aggiornamenti, F7 resta aperta nel rapporto e il passo sta in `DA-FARE-ROBERTO.md`: non si rende privato un repo che è l’unico indirizzo dell’APK.

## Pubblicazione finale

Una sola volta, a lavoro finito e test verdi: patch sopra la versione trovata (da `1.1.93` a `1.1.94`, `versionCode` `10194`), commit, push, release GitHub con asset `groomly.apk`. **Niente** `firebase deploy` sul progetto `groomly-3128b` in questo giro: le regole e l'hosting restano da pubblicare a mano, voce in `docs/DA-FARE-ROBERTO.md`. `mostraPiani` e `abbonamentiAttivi` restano false. Non si committano `groomly.apk`, `android/app/build`, `.env.local`. Il push di `main` della fase 0 (prima dei piani) non alza la versione.

## Criteri di accettazione

Quelli della §18 del piano sorgente, più:

- Un titolare sull’emulatore non legge `users/{altro}/backups`.
- Un titolare non scrive `salons/{suo}/crediti/main` né `pro/main`.
- Un collaboratore non porta `total` di un completato a 1.
- Un cane creato con la rete assente c’è ancora dopo reconnect e ricarica.
- Con `mostraPiani` false, Impostazioni non mostra «Il tuo piano», «Team», «Messaggi ai clienti», «Strumenti».
- `grep` su `src` non trova confronti di piano fuori da `piano.ts`, `usePiano` e i test.
