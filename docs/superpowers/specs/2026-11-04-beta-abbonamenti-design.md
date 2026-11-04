# Abbonamenti «pronti al clic» — design (B4, fase 4)

Data: 4 novembre 2026. Sessione B4. Fonte: `docs/GROOMLY-BETA-PIANI-PROMPT.md`, fase 4 (4.1–4.6).
Contratti: `2026-11-04-beta-fondamenta-design.md` («Contratti», «ID fissi»). Schermate: `2026-11-04-admin-manager-design.md` §7.2–7.3.
Coordinamento: `2026-11-04-beta-piani-ondate-coordinamento.md` («Confini tra le sessioni B»).

## Intento
Groomly esce gratis. Roberto non ha ancora la Partita IVA. Il codice d'acquisto va preparato tutto **adesso**, ma **spento**.
Il giorno in cui ci saranno Partita IVA, profilo pagamenti e prodotti in Play Console, Roberto accende tutto dall'Admin Manager.
Prima un pannello a semaforo gli dice se manca qualcosa.

Successo:
- spento, nessuna differenza per i saloni;
- acceso senza chiave o senza prodotti, un messaggio gentile e nessun errore;
- il pannello blocca finché c'è un rosso;
- il flusso è collaudato con eventi simulati.

### Obiettivi
- SDK RevenueCat nell'app `play`, avviato solo con `abbonamentiAttivi = true` e la chiave presente.
- Acquisto del **mensile** di Plus e Salone dalla vetrina, ripristino degli acquisti, salone collegato a RevenueCat.
- Webhook che scrive davvero `pro/main`: attivo, rinnovo, grazia, disdetta, scadenza. Il passaggio da beta a Play avviene senza buchi.
- Offerta `early-adopter` applicata a chi ha `earlyAdopter: true`.
- Annuncio 15 giorni prima: banner a tutti i titolari ed email a ex beta ed early adopter.
- Controllo pre-accensione lato server, accensione e spegnimento solo per operatori, componente `PannelloAccensione`.

### Non obiettivi
- Piani annuali e posti extra nella vetrina. *Scelta di Roberto: solo il mensile, col pulsante di oggi.* Il webhook riconosce comunque i prodotti annuali.
- Sincronizzazione su richiesta con l'API di RevenueCat. *Scelta di Roberto: decide solo il webhook.*
- Montare il pannello nell'Admin Manager: lo fa B2.
- Card RevenueCat (chiave, offering) e card Annuncio nell'Admin Manager (§7.2): sono di B2. B4 fornisce le callable e il wrapper client.

### Anti-obiettivi
- Qualsiasi chiamata allo store o all'SDK con gli abbonamenti spenti, nell'APK GitHub o nel browser.
- Il piano scritto dall'app (resta scritto solo dalle functions).
- Toccare VIP o `salon/shared`.
- Togliere il piano a chi ha pagato quando si spegne.

## Approcci considerati (chi decide che il salone ha pagato)
1. **Solo il webhook** *(scelto da Roberto)*.
   - L'app compra e poi aspetta che `pro/main` cambi.
   - Pro: una sola fonte di verità, poco codice.
   - Contro: un evento perso si ripara all'evento successivo o a mano dall'admin.
2. Webhook più una callable di sincronizzazione che interroga RevenueCat.
   - Pro: attivazione immediata e auto-riparazione.
   - Contro: il doppio dei percorsi che scrivono il piano, più un'API da collegare.
3. L'app scrive il piano. Scartato: viola il vincolo «piano scritto solo da functions» e si può falsificare.

## Scelte di Roberto (4/11)
- Vetrina: solo il **mensile**, pulsante di oggi.
- Annuncio: Roberto **sceglie la data di partenza** dei pagamenti, almeno 15 giorni dopo l'annuncio. La data compare nel banner e nella mail.
- Salone in beta che compra: **può comprare quando vuole**.
  - Il piano diventa subito Play e i giorni gratis rimasti si perdono.
  - Prima del clic, un dialogo: «La beta gratuita finisce adesso».
- Architettura: **solo il webhook**.

---

## 1. Pacchetto e permesso (4.1)
- `@revenuecat/purchases-capacitor` **14.0.0**, versione esatta. Verificato su npm il 4/11/2026: peer `@capacitor/core >= 8`, Test Store supportato dalla 11.2.6.
- `npx cap sync android` rigenera `capacitor.settings.gradle` e `capacitor.build.gradle`. Capacitor include i plugin in tutti i flavor.
- Per questo l'APK **GitHub** toglie il permesso di fatturazione:
  - in `android/app/src/github/AndroidManifest.xml`: `<uses-permission android:name="com.android.vending.BILLING" tools:node="remove" />`;
  - nel flavor GitHub il codice JS non chiama mai l'SDK (vedi §2).
  - *Scelta di B4:* escludere il modulo Gradle solo dal flavor GitHub è fragile: Capacitor registra comunque la classe del plugin. Si toglie il permesso e si blocca il JS.
- L'AAB `play` riceve il permesso `com.android.vending.BILLING` dal manifest della libreria Billing (unione automatica dei manifest). Il test di build lo verifica nel manifest unito.

## 2. Client: `src/lib/billing.ts`
Logica pura più un adattatore iniettabile, così i test non toccano l'SDK.

```ts
export type StatoAcquisto = 'spento' | 'solo-play' | 'non-disponibile' | 'pronto'
export function statoAcquisto(i: { abbonamentiAttivi: boolean; distribuzione: 'play' | 'github' | 'web'; chiaveSdk: string }): StatoAcquisto
// spento: abbonamentiAttivi falso → vetrina di oggi (Avvisami / «In arrivo»).
// solo-play: acceso ma APK GitHub o browser → «Gli abbonamenti si attivano dall'app di Google Play».
// non-disponibile: acceso, play, chiave vuota → «Abbonamento momentaneamente non disponibile».
// pronto: si può avviare l'SDK.

export interface NegozioAbbonamenti {           // adattatore sopra @revenuecat/purchases-capacitor
  configura(apiKey: string, appUserID: string): Promise<void>
  collega(appUserID: string): Promise<void>      // Purchases.logIn({ appUserID })
  offering(id: string): Promise<OfferingMinima | null>  // getOfferings().all[id]
  compra(scelta: SceltaAcquisto): Promise<'ok' | 'annullato'>   // purchasePackage o purchaseSubscriptionOption
  ripristina(): Promise<void>                    // restorePurchases
}
export function sceltaAcquisto(offering: OfferingMinima, piano: 'plus' | 'salone', earlyAdopter: boolean): SceltaAcquisto | null
export async function avviaAcquisto(...): Promise<EsitoAcquisto>  // 'ok' | 'annullato' | 'non-disponibile' | 'solo-play' | 'spento' | 'errore'
export async function ripristinaAcquisti(...): Promise<'ok' | 'non-disponibile' | 'solo-play' | 'spento' | 'errore'>
```

- **Distribuzione:** `window.__GROOMLY_DISTRIBUTION__ === 'play'` e piattaforma nativa (`Capacitor.isNativePlatform()`). Altrimenti `github` o `web`.
- **Avvio pigro:**
  - il modulo `@revenuecat/purchases-capacitor` si importa con `import()` solo quando lo stato è `pronto` e l'utente tocca Abbonati o Ripristina;
  - con gli abbonamenti spenti non si carica nulla, come la promessa di oggi in `billing.ts`;
  - `configure({ apiKey: chiaveSdk, appUserID: salonId })` avviene una sola volta per sessione; se il salone cambia (cambio salone), si chiama `logIn({ appUserID: salonId })`.
- **Collegamento salone:** `appUserID = salonId`. Ripristino e acquisto valgono per il salone, da qualunque telefono del titolare. Il webhook legge il `salonId` da `app_user_id`.
- **Scelta del pacchetto:**
  - pacchetto `plus_mensile` o `salone_mensile` dell'offering `revenueCat.offeringId` (default `groomly_standard`);
  - con `earlyAdopter: true` si cerca nelle `subscriptionOptions` del prodotto l'opzione il cui `id` è `early-adopter` o che ha il tag `early-adopter`, e si compra con `purchaseSubscriptionOption`. Altrimenti `purchasePackage`, che usa la `defaultOption`.
  - Doc RevenueCat: le offerte con idoneità decisa dallo sviluppatore compaiono sempre in `subscriptionOptions`. Per non farle scegliere in automatico a chi non ne ha diritto, l'offerta va etichettata `rc-ignore-offer` in Play Console. Va in `PRIMA-DEI-PAGAMENTI.md`.
  - Se l'opzione early adopter manca, si compra il prezzo pieno (nessun errore). *Scelta di B4.*
- **Errori:**
  - offering assente, pacchetto mancante o errore di configurazione dell'SDK → `non-disponibile`;
  - acquisto annullato (`userCancelled` o codice `PURCHASE_CANCELLED_ERROR`) → `annullato`, nessun messaggio;
  - altro → `errore`.

## 3. Vetrina e PaywallSheet (ramo «acquisto acceso», minimo)
- **PaywallSheet:** nessuna modifica. Oggi da acceso porta già alla vetrina (`onAbbonati(percorso)`).
- **Vetrina:**
  - il ramo `offerta.acquisto === 'avvisami'` resta identico;
  - il ramo acceso sostituisce `compra(...)` con `avviaAcquisto` e aggiunge i dialoghi:
    1. salone con piano in beta attivo (`fonte === 'beta'`): dialogo «La beta gratuita finisce adesso» → «Continua» / «Annulla»;
    2. durante l'acquisto il pulsante è disattivato con «Attendi…»;
    3. `ok`: dialogo «Pagamento ricevuto, attivo il piano…». Si chiude da solo quando `usePiano` mostra `fonte === 'play'`. Dopo 20 secondi il testo diventa «Il piano si attiva entro qualche minuto», con «Ho capito»;
    4. `non-disponibile`: «Abbonamento momentaneamente non disponibile. Riprova più tardi.»;
    5. `solo-play`: «Gli abbonamenti si attivano dall'app scaricata da Google Play.»;
    6. `errore`: «Pagamento non riuscito. Riprova.».
  - Sotto il pulsante, da acceso, il link «Ripristina acquisti» (stessi esiti, `ok` → «Acquisti ripristinati»).
  - Con `earlyAdopter: true` e testo `offertaEarlyAdopter[lingua]` non vuoto (ripiego sull'italiano), una riga sopra il pulsante con quel testo.
- **usePiano** espone un campo nuovo `acquisto?: { chiaveSdk; offeringId; earlyAdopter; offertaEarly: Record<lingua, string>; pagamentiDal: string | null }`, letto da `config/globale.piani` e da `tracciaBetaDi(pro)`.

## 4. Webhook: `pro/main` aggiornato (4.2)
File nuovo, puro: `functions/src/abbonamenti/eventoRc.ts`. `rcWebhookHttp.ts` lo chiama dopo autenticazione e deduplica (`decisioneWebhook` invariata).

```ts
export function pianoDaEvento(evento: EventoRc, attuale: ProMain | undefined, adesso: Date):
  { azione: 'scrivi'; campi: CampiPiano; ms: number } | { azione: 'ignora'; motivo: string }
```

| Evento | Effetto su `pro/main` |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `SUBSCRIPTION_EXTENDED`, `PRODUCT_CHANGE` (usa `new_product_id` se c'è) | `{ piano, stato: 'attivo', fonte: 'play', scadeIl: expiration, rinnovoAutomatico: true, seatsIncluded: 3 se salone }` |
| `CANCELLATION` | `stato: 'disdetto'`, `scadeIl: expiration`, `rinnovoAutomatico: false` (resta attivo fino alla data) |
| `BILLING_ISSUE` | `stato: 'grazia'`, `scadeIl: grace_period_expiration_at_ms ?? expiration` |
| `EXPIRATION` | `campiBase(true)`, solo se il piano attuale è `fonte: 'play'` |
| `TEST` | nessuna scrittura sul piano; aggiorna solo lo stato del webhook |
| altri (`TRANSFER`, `SUBSCRIPTION_PAUSED`, `NON_RENEWING_PURCHASE`, …) | ignorati e registrati nel log |

Regole:
- **Prodotto:**
  - `product_id` tipo `groomly_plus:mensile` o `groomly_plus`: conta la parte prima di `:`;
  - `groomly_plus` → `pro`, `groomly_salone` → `salone`;
  - `groomly_posto_extra` → ignorato e registrato. *Scelta di B4: i posti extra non sono in vendita nell'app.*
- **Salone:** `app_user_id`; se è anonimo (`$RCAnonymousID:`), il primo di `aliases` non anonimo. Senza salone valido → ignora. `shared` → ignora sempre.
- **VIP** (`eVip`) → ignora sempre. I VIP restano VIP.
- **Ordine degli eventi:** `pro/main.rcEventoMs` salva `event_timestamp_ms` dell'ultimo evento applicato. Un evento più vecchio si ignora.
- **Beta → Play senza buchi:** `INITIAL_PURCHASE` sovrascrive il piano beta nella stessa scrittura. Il piano passa da `attivo/beta` ad `attivo/play` senza un istante a Go. La traccia beta (`exBeta`, `betaPiano`, …, `earlyAdopter`) resta: la scrittura fa merge dei campi del piano.
- **Grazia, disdetta e scadenza** seguono la spec «medie piani»:
  - l'app mostra già gli avvisi `grazia` e `disdetto`;
  - `chiudiProve` chiude un piano Play con `scadeIl` passata, come gli altri;
  - `EXPIRATION` lo chiude subito.
- **Ambiente:** `SANDBOX` e `PRODUCTION` si applicano entrambi. Servono i license tester. Il campo `rcAmbiente` resta nel documento.
- **Scrittura:** in transazione si rileggono `pro/main` e `rcEventi/{id}`, si scrive `scriviPiano(campi)` + `{ rcEventoMs, rcAmbiente, updatedAt }` con merge, poi `rcEventi/{id}`.
- **Stato del webhook:** ogni evento autenticato (compreso `TEST`) scrive `rcStato/webhook = { ultimoEventoIl, tipo, ambiente }`. Le regole lo lasciano senza accesso dal client: lo legge solo il controllo pre-accensione.

## 5. Annuncio (4.3): `annunciaPagamenti`
Firma del contratto: `{ data: string } → { ok: true; email: number }`. `data` è la **data di partenza dei pagamenti** scelta da Roberto.

Validazione:
- solo operatore (`operatoreAutorizzato`);
- `data` ISO valida e almeno 15 giorni dopo adesso, a livello di giorno (fuso Europe/Rome);
- `abbonamentiAttivi` deve essere spento.

Scrive in `config/globale.piani`:
- `annuncioPagamentiIl` = adesso;
- `pagamentiDal` = `data`, **campo nuovo**.

**Segnalazione:** `pagamentiDal: string | null` si aggiunge a `ConfigPiani` (default `null`) e a `leggiConfigPiani`. È un'aggiunta compatibile al contratto di A1: va segnalata alla chiusura. `impostaConfigPiani` non lo scrive.

Email:
- a tutti i titolari dei saloni con `pro/main.exBeta === true` o `earlyAdopter === true` (`collectionGroup('pro')`), escluso `shared`;
- via Brevo (`postBrevoHtml`), in it/en/es secondo la lingua dell'account;
- un errore su un indirizzo non ferma gli altri;
- `email` = quante sono partite.

Un nuovo annuncio sostituisce data e conteggio dei 15 giorni.

**Banner a tutti:**
- `BannerPagamenti` in `src/components/abbonamento/`, montato in `HomePage` con una riga;
- lo vede il titolare quando `pagamentiDal` c'è e gli abbonamenti sono spenti;
- testo: «Dal {data} Plus e Salone saranno a pagamento. Go resta gratis e i tuoi dati restano tutti.»;
- con ✕ si chiude: memoria locale per quella data.

## 6. Controllo pre-accensione (4.4)
Callable `controlloAccensione({}) → Controllo` (operatore). È la stessa funzione che usa `accendiAbbonamenti`, quindi il client non può aggirarla.

```ts
type VoceControllo =
  | { id: 'chiave'; ok: boolean }
  | { id: 'offering'; ok: boolean; trovati: number; attesi: 6; mancanti: string[]; errore?: 'senza-accesso' | 'rete' }
  | { id: 'webhook'; ok: boolean; ultimoEventoIl: string | null }
  | { id: 'annuncio'; ok: boolean; inviatoIl: string | null; pagamentiDal: string | null; mancanoGiorni: number }
  | { id: 'conferma'; ok: boolean; confermatoIl: string | null }
type Controllo = { voci: VoceControllo[]; pronti: number; tuttoVerde: boolean; attivi: boolean }
```

Le cinque voci:
1. **chiave:** `revenueCat.chiaveSdk` comincia con `goog_`. Una chiave di Test Store non accende la produzione.
2. **offering:**
   - API v2 di RevenueCat `GET https://api.revenuecat.com/v2/projects/{REVENUECAT_PROJECT_ID}/offerings?expand=items.package.product`, con `Authorization: Bearer REVENUECAT_API_KEY` (chiave segreta **V2**, permessi in lettura per offerings, packages e products);
   - si cerca l'offering con `lookup_key === offeringId`;
   - verde se ci sono tutti e 6 i pacchetti di `PACCHETTI`, ciascuno con un prodotto il cui `store_identifier` è quello atteso;
   - senza segreto o ID progetto: rosso con `errore: 'senza-accesso'`.
3. **webhook:** `rcStato/webhook.ultimoEventoIl` presente. Basta l'evento di prova che RevenueCat manda dal pannello.
4. **annuncio:** `annuncioPagamentiIl` di almeno 15 giorni fa **e** oggi ≥ `pagamentiDal`. `mancanoGiorni` = giorni al più lontano dei due.
5. **conferma:** `piani.confermaFiscaleIl` presente (campo nuovo, stessa segnalazione di §5).

Callable `confermaPartitaIva({ valore: boolean }) → { ok: true; confermatoIl: string | null }` (operatore).

`REVENUECAT_PROJECT_ID` si legge da `defineString` (non è un segreto), con default `''`.

**Segreti** (*scelta di Roberto, 4/11: dichiararli nel codice*):
- `REVENUECAT_API_KEY` (chiave segreta V2) e `REVENUECAT_WEBHOOK_AUTH` si dichiarano con `defineSecret` e si legano a `rcWebhook` e `controlloAccensione`/`accendiAbbonamenti`.
- Il 4/11 **non esistono** in Secret Manager: vanno creati, anche con un valore provvisorio, **prima** del deploy di fine ondata, altrimenti il deploy fallisce.
- Comandi in `DA-FARE-ROBERTO.md`; avviso alla sessione di coordinamento.
- Un valore provvisorio è innocuo: il webhook risponde 401 e il controllo segna l'offering rosso.

## 7. Accensione e spegnimento (4.4, 4.5)
**`accendiAbbonamenti({ parola: 'ACCENDI' }) → { ok: true }`** (operatore):
- rifà il controllo;
- con un rosso → `failed-precondition` «Controllo non superato»;
- parola diversa → `invalid-argument`;
- scrive `config/globale.abbonamentiAttivi = true` e `piani.accesiIl = adesso`.

**`spegniAbbonamenti({}) → { ok: true }`** (operatore):
- `abbonamentiAttivi = false`;
- non tocca nessun `pro/main`;
- il webhook continua a lavorare: rinnovi, disdette e scadenze dei piani Play già pagati si aggiornano;
- le vetrine tornano ad Avvisami, come in beta;
- nota per Roberto: chi ha pagato **continua a rinnovarsi** finché non disdice. Per fermare tutti i rinnovi si agisce da Play Console.

Le callable stanno in `functions/src/abbonamenti/*`, esportate da `functions/src/abbonamenti/index.ts` con **una** riga in `functions/src/index.ts` (`export * from './abbonamenti'`). Così il conflitto con B1/B2 è minimo.

## 8. `PannelloAccensione` (§7.3 della spec admin)
`src/components/admin/PannelloAccensione.tsx`, senza props. B2 lo monta così: `<PannelloAccensione />`.
- Wrapper client in `src/data/firebase/abbonamentiClient.ts` (file nuovo di B4): `controlloAccensione`, `confermaPartitaIva`, `accendiAbbonamenti`, `spegniAbbonamenti`, `annunciaPagamenti`.
- Aspetto e testi come §7.3:
  - riquadro scuro con `Power` rosso o verde, «N di 5 pronti», cinque segmenti;
  - card con le 5 voci;
  - la casella Partita IVA chiama `confermaPartitaIva`;
  - pulsante «Accendi» con lucchetto finché c'è un rosso;
  - con tutto verde, due dialoghi, il secondo con la parola **ACCENDI**;
  - da acceso, «Spegni» con dialogo.
- Dopo ogni azione il controllo si ricarica. Gli errori compaiono in un toast, come il resto dell'admin.

## 9. Testi
In fondo a `it.ts`/`en.ts`/`es.ts`, blocco `// Beta B4`. Si usano le chiavi `am*` della spec admin dove esistono (`amSpenti`, `amAttivi`, `amPronti`, `amAccendi`, `amSpegni`, `amParolaAccendi`). Se B2 le aggiunge uguali, all'unione vale una sola copia: B4 le prefissa `b4` per non collidere (*scelta di B4*).

## 10. Collaudo (4.6)
- **Senza Play:**
  - test unitari del webhook con sequenze di eventi simulati: beta → acquisto → rinnovo → problema di pagamento → disdetta → scadenza; evento vecchio fuori ordine; VIP; `shared`; anonimo con alias; posto extra; `TEST`;
  - test di `billing.ts` con un negozio finto: spento, solo-play, chiave vuota, offering mancante, early adopter con e senza opzione, annullato;
  - test della Vetrina e del pannello;
  - test delle callable con il Firestore finto delle functions.
- **Test Store di RevenueCat** (esiste: finestra con «acquisto riuscito / fallito / annulla», solo build di debug su Capacitor):
  - procedura scritta in `DA-FARE-ROBERTO.md` per quando Roberto avrà l'account (chiave di prova in config e `abbonamentiAttivi` acceso solo sugli emulatori);
  - la documentazione non dice se il Test Store manda eventi al webhook, quindi il webhook resta collaudato con eventi simulati.

## Lasciato al costruttore
Nomi interni degli helper, forma dei test, aspetto dei dialoghi della vetrina (componenti esistenti `Dialog`/`Button`).
