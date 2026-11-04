# Beta Plus/Salone — Fase 1 «Fondamenta» (A1) — design

Data: 4 novembre 2026. Fonte: `docs/GROOMLY-BETA-PIANI-PROMPT.md` (fase 1, punti 1.1–1.7). Coordinamento: `2026-11-04-beta-piani-ondate-coordinamento.md`.

## Perché
Groomly esce gratis. Roberto vuole invitare saloni scelti a provare Plus e Salone gratis (beta), raccogliere feedback e, quando ha i numeri, accendere gli abbonamenti con un clic. Questa fase prepara **solo dati, regole e server** su cui l'ondata B costruisce interfacce e flussi. Nessuna interfaccia nuova, tranne il rispetto di `provaSelfService` in vetrine, paywall e `avviaProva`.

## Scelte di Roberto (brainstorm del 4/11)
1. **Fonte nuova `fonte: 'beta'`** (scartata: `manuale` + campo `beta`, perché ogni lettura di `manuale` dovrebbe ricordarsi del campo e un beta rischierebbe di diventare un manuale senza scadenza).
2. **Early adopter** = in automatico chi accetta la beta; l'operatore può anche segnarlo o toglierlo a mano a qualunque salone.
3. **Config**: una sola callable operatore `impostaConfigPiani` con i campi da cambiare, che scrive nel blocco `piani` di `config/globale`.

## Obiettivi
1. **Fonte unica.** `FONTI_PIANO` e `fonteDi(value): FontePiano | null` in `src/lib/piano.ts`; li usano `scriviPiano.ts`, `chiudiProve.ts` (`campiDi`), `impostaPianoManuale.ts`, `client.ts` (directory admin) e `UsersPage.tsx` (`fonteLetta`). Il tipo `FontePiano` delle functions deriva da quello dell'app.
2. **`beta` gestita ovunque.** `statoPiano` la tratta come ogni piano con scadenza; `provaConcessa`: una beta (anche passata) toglie la prova self-service; `chiudiProve` la chiude alla scadenza (stessa regola); `decisioneBypass`: una beta non è Play, quindi spegnerla o cambiarla non chiede testo; VIP resta solo `omaggio`.
3. **Traccia permanente** in `salons/{id}/pro/main`: `exBeta`, `betaPiano`, `betaDal`, `betaFinoAl`, `earlyAdopter`. Nessuna funzione la cancella: tutte le scritture di `pro/main` usano `merge: true` e `campiBase`/`pianoScaduto` non contengono quei campi (test).
4. **Helper per l'ondata B** in `scriviPiano.ts`: `campiBeta(livello, giorni, adesso)` e `tracciaBeta(livello, adesso, fine)`.
5. **Modello inviti e feedback**: tipi e percorsi (sezione Contratti), regole Firestore.
6. **`config/globale.piani`** con `impostaConfigPiani` + lettura difensiva `leggiConfigPiani` condivisa da app e functions.
7. **ID fissi** di prodotti, piani base, offerta, entitlement e offering in `src/lib/idAbbonamenti.ts` e in `PRIMA-DEI-PAGAMENTI.md`.
8. **Prova self-service spenta di default**: `avviaProva` rifiuta se `provaSelfService !== true`; `usePiano` espone `provaConcessa` falso se la config la spegne (vetrina, paywall, scheda, pagine piano lo leggono già da lì). L'azione operatore `prova` («Regala 30 giorni») non cambia.

## Non obiettivi
- Interfacce (Admin Manager, pagina invito, badge BETA, modulo feedback): ondata B, dopo la scelta del design.
- Implementare le callable dell'ondata B: qui solo le firme.
- Toccare `mostraPiani` e `abbonamentiAttivi` (restano nella radice di `config/globale`, le leggono le APK installate).
- SDK RevenueCat nel client (fase 4).

## Anti-obiettivi
- Cambiare il comportamento dell'app oltre la prova self-service spenta.
- Toccare `salon/shared` o i VIP.
- Cancellare dati a fine beta.

## Approcci considerati
- Fonte: **`beta`** (scelta) contro `manuale` + campo. Le APK già installate leggono una fonte sconosciuta come «nessuna» ma calcolano il livello da `piano/stato/scadeIl`: un beta tester con APK vecchia vede Plus/Salone, solo senza etichetta.
- Config: **una callable con blocco `piani`** (scelta) contro una callable per campo (6 funzioni) o campi sparsi in radice.
- Avvisami in admin: **callable operatore** che conta con `collectionGroup('interesse')` (scelta) contro aprire la lettura agli operatori nelle regole (letture costose dal telefono e regole più larghe).
- Feedback: **raccolta dedicata `betaFeedback`** scritta da callable (scelta) contro categoria `beta` nei Suggerimenti (campi diversi: voto, funzioni, «pagheresti»; riepilogo illeggibile mescolato ai suggerimenti).

## Contratti (per l'ondata B)

### Piano — `salons/{salonId}/pro/main` (scritto solo da functions)
```ts
// src/lib/piano.ts
export const FONTI_PIANO = ['play', 'prova', 'omaggio', 'manuale', 'beta'] as const
export type FontePiano = typeof FONTI_PIANO[number]
export function fonteDi(value: unknown): FontePiano | null

export interface TracciaBeta {
  exBeta?: boolean            // true dal momento dell'accettazione, per sempre
  betaPiano?: 'pro' | 'salone' // ultimo piano provato in beta
  betaDal?: string            // ISO, accettazione
  betaFinoAl?: string         // ISO, fine prevista (aggiornata da estendi; non cambia alla revoca)
  earlyAdopter?: boolean      // prezzo di favore; true all'accettazione, modificabile dall'operatore
}
export interface ProMain extends TracciaBeta { /* campi di oggi */ }
export function tracciaBetaDi(doc: unknown): TracciaBeta  // lettura difensiva
```
Beta attiva = `{ piano: 'pro'|'salone', stato: 'attivo', fonte: 'beta', scadeIl: <fine ISO>, seatsIncluded: 3 se salone, rinnovoAutomatico: false, provaUsata: true }`, prodotta da `scriviPiano(campiBeta(livello, giorni, adesso), adesso)`. `campiBeta` rifiuta `giorni` non intero o fuori 1–365. Alla scadenza `chiudiProve` scrive `campiBase(true)`: la traccia resta.

### Invito beta — `betaInviti/{salonId}` (uno per salone, l'ultimo)
```ts
// src/lib/betaInvito.ts
export type StatoInvitoBeta = 'invitato' | 'accettato' | 'rifiutato' | 'scaduto' | 'revocato'
export type MotivoRifiutoBeta = 'non-serve' | 'complicato' | 'non-pagherei' | 'altro'
export interface InvitoBeta {
  salonId: string
  piano: 'pro' | 'salone'
  giorni: number              // durata della beta dopo l'accettazione, 1–365
  messaggio: string | null    // facoltativo, max 500
  stato: StatoInvitoBeta
  invitatoIl: string          // ISO
  scadeInvitoIl: string       // ISO, invitatoIl + 14 giorni
  rispostoIl: string | null
  motivoRifiuto: MotivoRifiutoBeta | null
  altroRifiuto: string | null // max 300, solo con 'altro'
  revocatoIl: string | null
  invitatoDa: string          // email operatore
  aggiornatoIl: string
}
export const GIORNI_SCADENZA_INVITO = 14
export function invitoBetaDi(doc: unknown): InvitoBeta | null
export function transizioneInvito(da: StatoInvitoBeta, a: StatoInvitoBeta): boolean
```
Transizioni ammesse: `invitato → accettato | rifiutato | scaduto | revocato`; `accettato → revocato` (revoca della beta in corso). Un nuovo invito sovrascrive un documento in stato finale (`rifiutato`, `scaduto`, `revocato`, o `accettato` di una beta già finita) e copia il vecchio in `betaInviti/{salonId}/storico/{autoId}`.
Lettura: operatori; il **titolare** del salone (non socio, non collaboratore). Scrittura: nessuno dal client.

### Feedback beta — `betaFeedback/{autoId}` (scritto solo da callable)
```ts
// src/lib/betaFeedback.ts
export type GiudizioFunzione = 'utile' | 'poco-utile' | 'non-usata'
export type Pagheresti = 'si' | 'forse' | 'no'
export type FasciaPrezzo = 'meno-5' | '5-10' | '10-20' | 'piu-20'
export interface FeedbackBeta {
  salonId: string
  uid: string
  piano: 'pro' | 'salone'      // piano in beta al momento dell'invio
  voto: 1 | 2 | 3 | 4 | 5
  funzioni: Partial<Record<FeatureKey, GiudizioFunzione>>
  nonVa: string                // max 1000
  manca: string                // max 1000
  pagheresti: Pagheresti
  quanto: FasciaPrezzo | null  // null se 'no'
  ricontatto: boolean
  fineBeta: boolean            // risposta alla domanda finale «continueresti a pagamento?»
  versioneApp: string
  creatoIl: string             // ISO, dal server
}
```
Lettura: solo operatori. Scrittura: nessuno dal client. Limiti come i Suggerimenti: in `betaFeedbackLimiti/{salonId}` (solo functions), massimo 5 al giorno per salone.

### Avvisami — `salons/{id}/interesse/{feature}` (invariato)
Resta leggibile solo dal titolare/socio. Gli operatori li contano con la callable `contatoriAdmin` (sotto). Chiavi: le `FeatureKey` e `piano-plus` / `piano-salone` (dalle vetrine).

### Config — `config/globale` (scritta solo da functions)
```ts
// src/lib/configPiani.ts
export interface ConfigPiani {
  provaSelfService: boolean            // default false
  showPrezziInBeta: boolean            // default false
  offertaEarlyAdopter: { it: string; en: string; es: string } // max 500 ciascuno, default ''
  revenueCat: { chiaveSdk: string; offeringId: string }       // chiave pubblica SDK Android ('goog_…'), default '' e OFFERING_ID
  annuncioPagamentiIl: string | null   // ISO, data dell'annuncio 15 giorni (fase 4)
}
export const CONFIG_PIANI_DEFAULT: ConfigPiani
export function leggiConfigPiani(globale: unknown): ConfigPiani  // legge globale.piani, ripiega sui default
```
`config/globale` = `{ mostraPiani, abbonamentiAttivi, tourBenvenuto, piani: ConfigPiani }`. La chiave SDK RevenueCat è pubblica per natura (non è un segreto); i segreti (`REVENUECAT_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`) restano nei secret delle functions.

### Callable
Implementata in A1:
- `impostaConfigPiani(input: Partial<{ provaSelfService: boolean; showPrezziInBeta: boolean; offertaEarlyAdopter: Partial<{it,en,es: string}>; revenueCat: Partial<{ chiaveSdk: string; offeringId: string }>; annuncioPagamentiIl: string | null }>) → { ok: true; piani: ConfigPiani }`. Solo operatore (`operatoreAutorizzato`); campi sconosciuti o non validi → `invalid-argument` senza scrivere; scrive in transazione `piani` completo (lettura attuale + modifiche).

Da implementare nell'ondata B (firme fisse; errori `failed-precondition` con messaggio, come oggi):
| Callable | Chi | Input | Output |
|---|---|---|---|
| `invitaBeta` | operatore | `{ salonIds: string[] (1–50), piano: 'pro'\|'salone', giorni: number, messaggio?: string }` | `{ invitati: string[]; saltati: { salonId: string; motivo: 'vip'\|'shared'\|'gia-invitato'\|'piano-attivo'\|'non-trovato' }[] }` |
| `rispondiInvitoBeta` | titolare | `{ accetta: boolean; motivo?: MotivoRifiutoBeta; altro?: string }` | `{ ok: true; scadeIl: string \| null }` |
| `revocaBeta` | operatore | `{ salonId: string; testo?: string }` | `{ ok: true; emailStato: 'inviata'\|'non_inviata'\|null }` |
| `estendiBeta` | operatore | `{ salonId: string; giorni: number }` | `{ ok: true; scadeIl: string }` |
| `segnaEarlyAdopter` | operatore | `{ salonId: string; valore: boolean }` | `{ ok: true }` |
| `inviaFeedbackBeta` | titolare/socio in beta o ex beta | `Omit<FeedbackBeta, 'salonId'\|'uid'\|'piano'\|'creatoIl'>` | `{ ok: true }` |
| `contatoriAdmin` | operatore | `{}` | `{ saloni: { totali, attivi7, attivi30 }; perPiano: Record<LivelloElenco, number>; perFonte: Record<FontePiano\|'nessuna', number>; inviti: Record<StatoInvitoBeta, number>; avvisami: Record<string, number>; feedback: { totali: number; pagheresti: Record<Pagheresti, number> } }` |
| `annunciaPagamenti` (fase 4) | operatore | `{ data: string }` | `{ ok: true; email: number }` |
Pianificate (B1): `scadiInvitiBeta` (ogni ora: `invitato` con `scadeInvitoIl` passata → `scaduto`), `avvisiFineBeta` (7 e 1 giorno prima). `rispondiInvitoBeta` all'accettazione scrive in transazione piano (`campiBeta`), traccia (`tracciaBeta`, `earlyAdopter: true`) e invito; non accetta se l'invito è scaduto, se il salone è VIP o `shared`, o se c'è un piano Play attivo. Revoca: piano a Go con `campiBase(true)`, traccia invariata.

### ID fissi (`src/lib/idAbbonamenti.ts`)
| Cosa | ID |
|---|---|
| Abbonamento Play Plus | `groomly_plus` (piani base `mensile` 9,99 €, `annuale` 99,90 €) |
| Abbonamento Play Salone | `groomly_salone` (piani base `mensile` 19,99 €, `annuale` 199,90 €) |
| Abbonamento Play posto extra | `groomly_posto_extra` (piani base `mensile` 3,99 €, `annuale` 39,90 €) |
| Offerta early adopter (su ogni piano base, idoneità decisa dallo sviluppatore) | `early-adopter` |
| ID prodotto in RevenueCat | `<abbonamento>:<piano base>`, es. `groomly_plus:mensile` |
| Entitlement RevenueCat | `plus`, `salone` (il posto extra non ha entitlement: conta i posti) |
| Offering | `groomly_standard`, pacchetti `plus_mensile`, `plus_annuale`, `salone_mensile`, `salone_annuale`, `posto_extra_mensile`, `posto_extra_annuale` (ID di pacchetto unici nell'offering) |

## Regole Firestore
- `betaInviti/{salonId}`: read se operatore o titolare del salone (`owns(salonId) && memberRole() == 'titolare'`); write false. `storico/{id}`: read solo operatore; write false.
- `betaFeedback/{id}`, `betaFeedbackLimiti/{id}`: read operatore (limiti: nessuno); write false.
- `config/{docId}`: invariata (read chi è dentro, write false).
- `salons/{id}/pro/main`: invariata (write false).
- `interesse`: invariata.

## Decisioni minori (annotate in `DECISIONI-AUTOMATICHE.md`)
Percorsi `betaInviti`/`betaFeedback` in radice; storico inviti in sottoraccolta; offerta early adopter in tre lingue; scadenza invito 14 giorni; durata beta 1–365; limite feedback 5/giorno; ID prodotti e offering; `contatoriAdmin` come unica callable dei numeri.

## Lasciato al costruttore
Nomi interni degli helper, forma esatta dei messaggi d'errore, test. Verifica: `npm test`, test functions, `npm run test:rules`.
