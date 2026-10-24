# Groomly — Piani, sicurezza e funzioni: specifica unica

Data: 2026-10-25
Stato: accettata per esecuzione immediata. Il committente ha chiesto una sola specifica, un solo piano e l’esecuzione intera senza conferme intermedie. Le domande della §17 del piano sorgente sono chiuse qui sotto con la raccomandazione già scritta in quel piano.

Fonti, in questo ordine se un dettaglio manca qui: `docs/Groomly_Abbonamenti_PIANO.md` (v2, 25/10/2026), `docs/Groomly_Test360_RAPPORTO_2026-10-25.md`, `docs/test360-kit/LEGGIMI.md`, `docs/Groomly_Controlli_Avanzati_PIANO.md` (solo le parti non sostituite), `docs/superpowers/specs/2026-10-24-pro-collaboratori-design.md`.

Base di codice: ramo `pro-collaboratori`, commit `f8630c3`, versione **1.1.93**, worktree `D:\Groomly\.worktrees\pro-collaboratori`. Il checkout `D:\Groomly` è `main` a `8d7f6b5`, avanti di un commit di documentazione rispetto a `origin/main`, con modifiche non salvate. `scheda-nido` (`f6b2e16`, 1.1.88) non è antenato di `pro-collaboratori`.

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

## Stato reale del codice (f8630c3), da non reinventare

- Collaboratori già pubblicati: ruoli, `members`, `invites`, `setSalonPro`, `createInvite`, `acceptInvite`, `revokeMember`, `changeMemberRole`, `assigneeUid`, «Chi lo fa», incassi filtrati, `/impostazioni/pro`, `PRO_SEAT_LIMIT = 3`, `accessWithoutPro`.
- `firestore.rules` su `users/{uid}/{document=**}` è già `request.auth.uid == uid`. La falla F1 del rapporto va **richiusa con un test sull’emulatore**, non riaperta. `isOperator()` non chiede `email_verified` (M12). La regola generica `salons/{salonId}/{kind}/{id}` lascia scrivere raccolte inventate (F3). Il collaboratore, su un completato, può ancora cambiare `total`, `paymentMethod`, `actualDurationMin` e `status` se non tocca `assigneeUid` (F4).
- `saveDog` chiama `cloudDeletion()` prima di scrivere. Quella lettura, se chiede il server e la rete manca, fa fallire il salvataggio: il cane si vede e poi sparisce (F2). Stesso schema da verificare su appuntamenti, completato e chiusure.
- Non esiste `src/i18n/`. I testi nuovi vanno in `src/i18n/it.ts`.
- `functions/src/index.ts` esporta già `setSalonPro`. Le funzioni nuove stanno in `functions/src/piano/` e si registrano da `index.ts`.
- `package.json` ha già `test:rules`, ma il kit 360° è ancora solo in `docs/test360-kit/` e la patch emulatori, copiata così com’è, rompe `client.test.ts`.

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

Una sola volta, a lavoro finito e test verdi: patch sopra la versione trovata (da `1.1.93` a `1.1.94`, `versionCode` `10194`), commit, push, release GitHub con asset `groomly.apk`, deploy Firestore rules, indexes e hosting. `mostraPiani` e `abbonamentiAttivi` restano false nel deploy. Non si committano `groomly.apk`, `android/app/build`, `.env.local`.

## Criteri di accettazione

Quelli della §18 del piano sorgente, più:

- Un titolare sull’emulatore non legge `users/{altro}/backups`.
- Un titolare non scrive `salons/{suo}/crediti/main` né `pro/main`.
- Un collaboratore non porta `total` di un completato a 1.
- Un cane creato con la rete assente c’è ancora dopo reconnect e ricarica.
- Con `mostraPiani` false, Impostazioni non mostra «Il tuo piano», «Team», «Messaggi ai clienti», «Strumenti».
- `grep` su `src` non trova confronti di piano fuori da `piano.ts`, `usePiano` e i test.
