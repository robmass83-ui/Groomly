# Salone nel catalogo, prenotazione online, logo e suggerimenti

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-27. Decisioni prese in autonomia, come chiesto: si valutano le strade e si tiene quella consigliata, senza un secondo giro di domande. Questa specifica non si implementa da sola. Il piano è `docs/superpowers/plans/2026-10-27-salone-prenotazioni-suggerimenti.md`.

## Problema

Un account Base, in Piano e in Funzioni, vede il Servizio Pro e il pulsante per provarlo. Non vede il Servizio Salone. I collaboratori e i soci sono elencati dentro il Pro (`PRO_VETRINA` in `src/pages/PianoPagine.tsx`), mentre `livelloMinimo('team')` è già `salone`. Il Salone è il piano che aggiunge gli inviti.

In Impostazioni il nome della toelettatura è a sinistra e il logo (o l’iniziale) a destra. Il logo deve stare a sinistra del nome.

La prenotazione online è già una funzione Pro (`FeatureKey` `prenotazioni`) e le callable `saloneInfo`, `postiLiberi`, `inviaRichiesta`, `pubblicaSalone` esistono. La pagina che il cliente aprirebbe è ancora il segnaposto in `hosting/salone/`: un titolo e un paragrafo, senza slug nel percorso, senza anteprima social col nome del salone, senza un modulo. Manca la regola «si accende solo a profilo completo e con il Pro».

Suggerimenti (`src/pages/SuggerimentiPage.tsx`) è un menu nativo, poi un’area di testo, poi due card: Guida rapida, Novità, Notifiche. Sotto resta molto vuoto. Guida, novità e notifiche non stanno su questa pagina. La selezione non usa il tema dell’app.

## Decisioni

1. Il catalogo che vede il titolare ha quattro gruppi, in quest’ordine, sia su `/impostazioni/piano` sia su `/impostazioni/strumenti`: Profilo base, Servizio base, Servizio Pro, Servizio Salone.
2. Il Servizio Salone include tutto il Servizio Pro più invitare collaboratori e soci. Non è un secondo elenco delle funzioni Pro. La frase visibile è «Include tutto il Servizio Pro, più l’invito di collaboratori e soci.»
3. Non si vendono prezzi. `mostraPiani` e `abbonamentiAttivi` restano false. La prova di 30 giorni resta solo Pro, come `avviaProva`. Il Salone, da un account che non lo ha, si chiede con «Avvisami per il Salone» (`interesse`, chiave `team`). Nessun acquisto.
4. Il link pubblico è `https://groomlyapp.it/s/{slug}`, uno per toelettatura, da incollare su Instagram e Facebook. Non si fa un link opaco e non si fa un elenco di tutti i saloni.
5. La prenotazione online si può accendere solo se il piano include `prenotazioni`, il profilo è 5 su 5 e c’è la partita IVA oppure il codice fiscale. Spenta, la pagina resta il biglietto da visita.
6. Il logo in testata Impostazioni sta a sinistra del nome. Matita a destra. Stesse misure.
7. Suggerimenti è solo il modulo: domanda, categorie, testo, invio. Niente guida, novità, notifiche. Le categorie sono frasi più lunghe, disegnate come righe dell’app, non come `<select>`.

## Fuori da questo lavoro

Prezzi, RevenueCat, Play Billing, WhatsApp automatico, QR stampato, lista d’attesa sulla pagina pubblica, conferma automatica, prezzi visibili al cliente, una vetrina di tutti i saloni, un font o una palette nuovi. I cinque passi di `completaSalone` non si riscrivono. La pagina inviti (`ProPage`) non si ridisegna: ci si arriva dal Salone quando il piano lo include.

## Strade scartate

**Catalogo.** Tenere i collaboratori dentro il Pro e aggiungere solo una riga «Salone» senza i quattro nomi. Scartato: il titolare non distingue i tre servizi, e il codice dice già che `team` è Salone.

**Link.** Un token tipo `/b/a8f3…` è brutto in bio. Una sola pagina `groomlyapp.it` con la ricerca del salone obbliga il cliente a cercarlo. Un widget Instagram o un calendario esterno non entra in agenda. Si tiene lo slug già previsto da `slugDaNome` e `pubblici/{slug}`.

**Pagina.** Rifare la disponibilità. `postiLiberi` e `orariLiberi` restano. La pagina nuova li chiama, non li sostituisce.

**Aspetto.** La ricerca di design per «pet grooming» propone verde acqua `#0D9488`, arancio `#EA580C`, Varela Round e Nunito Sans. Non si usano. Groomly ha già i token in `src/theme/tokens.css` (`--pri` `#3A5BA0`, `--bg`, `--card`, `--sh-2`) e il font di sistema. Una seconda palette spezza il tema che i suggerimenti devono invece seguire. Niente GSAP: il cambio di passo è immediato, e `prefers-reduced-motion` non ha animazioni da spegnere.

## Quattro gruppi

Titoli visibili, identici nelle tre lingue come chiavi nuove:

| Chiave | Italiano |
| --- | --- |
| `profiloBase` | Profilo base |
| `servizioBase` | Servizio base |
| `servizioPro` | Servizio Pro |
| `servizioSalone` | Servizio Salone |

`funzioniBase` e `funzioniPro` restano nel file lingue se qualche test le legge, ma Piano e Strumenti mostrano le chiavi nuove.

**Profilo base.** Una card, senza interruttori. Testo: «Agenda, schede degli animali e listino. Restano sempre, anche con Pro o Salone.» Non è un prodotto da attivare.

**Servizio base.** Le tre righe già in `BASE` (messaggi, affidabilità, note vocali) con gli interruttori di oggi, più WhatsApp automatico con «Da sviluppare» e senza interruttore. Intro: «Sempre disponibili, anche senza abbonamento.»

**Servizio Pro.** Le chiavi già in `PRO` di `StrumentiPage`, senza collaboratori. Prenotazioni online resta qui. Intro: «Si sbloccano con il Servizio Pro. Il Salone le include.» Su Piano, se il livello è `base` e la prova non è usata, sotto il gruppo c’è «Prova Pro gratis per 30 giorni» e chiama `apriPaywall` come oggi. Se la prova è usata, il pulsante è «Avvisami» sulla chiave `prenotazioni`. Le righe bloccate dicono «Si sblocca con Pro».

**Servizio Salone.** Intro fissa: «Include tutto il Servizio Pro, più l’invito di collaboratori e soci.» Due righe: Collaboratori e soci (`team`), Posti in più (`postiExtra`). Se `haAccesso(stato, 'team')` è falso, le righe dicono «Si sblocca con Salone» e il pulsante «Avvisami per il Salone» chiama `avvisa('team')`. Se è vero, la riga collaboratori apre `/impostazioni/pro` (la pagina inviti già esistente). Non si duplica l’elenco Pro sotto il Salone.

`PianoPage` oggi, se il livello non è `base`, mostra solo «servizio attivo» e nasconde il catalogo. Quel ramo si toglie. I quattro gruppi si vedono sempre. Il gruppo già incluso ha la spunta «Inclusa nel piano». Un livello più basso non offre il ritorno a Base: quello resta all’operatore.

Su Strumenti il collaboratore continua a non vedere Backup, Servizi e Archivio. Se la pagina Funzioni gli è aperta, vede i quattro gruppi. Le righe Pro e Salone bloccate non aprono la paywall e non navigano: il dettaglio è «Lo accende il titolare.» La paywall resta del titolare.

L’interruttore in Utenti è etichettato «Servizio Pro per …» e in `cambiaPiano` scrive il Salone. L’etichetta diventa «Servizio Salone per …» (`servizioSalonePer`). I pulsanti Prova, Pro omaggio, Salone omaggio e Torna a base restano. Il VIP non si abbassa.

## Logo

In `SettingsPage`, nel pulsante che apre l’account, l’ordine è: logo (o cerchio con l’iniziale, 48×48, come oggi), poi il nome (`headline.title`, `flex: 1`, allineato a sinistra). La matita resta a destra del pulsante, solo se non è un collaboratore. Il nome non va a capo sotto il logo: stessa riga, `alignItems: 'center'`, `gap: 8`.

## Quando si accende la prenotazione

Funzione pura in `src/lib/prenotazionePubblica.ts`:

```ts
export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale'

export function puoAccenderePrenotazioni(input: {
  accesso: boolean
  completo: boolean
  vat: string
  tax: string
}): { ok: true } | { ok: false; manca: MancaPrenotazione }

export function linkPrenotazione(slug: string): string
```

`accesso` è `haAccesso(stato, 'prenotazioni')`. `completo` è `avanzamentoSalone(passi).completo` (logo, sede = indirizzo e orari, listino, primo backup, email verificata: i 5 di `src/lib/completaSalone.ts`). Il fiscale è vero se `vat.trim()` oppure `tax.trim()` non è vuoto, la stessa regola di «basta la partita IVA oppure il codice fiscale». Il primo ostacolo vince, in ordine: `piano`, `profilo`, `fiscale`.

`linkPrenotazione('i-pelosetti')` è `https://groomlyapp.it/s/i-pelosetti`. Slug vuoto o con caratteri fuori da `a-z`, `0-9` e trattino restituisce stringa vuota.

In Strumenti, il tocco su Prenotazioni online:

- senza accesso Pro: paywall, come le altre righe Pro;
- con accesso ma profilo o fiscale mancante: dialogo con l’elenco di ciò che manca e un link al passo (logo → gestione listino, sede → account con `modifica=toelettatura`, listino → `/listino`, backup → il foglio backup già in Impostazioni, email → account sicurezza, fiscale → lo stesso dialogo Toelettatura). Nessun pulsante Pubblica;
- con tutto pronto: dialogo con l’interruttore `settings.prenotazioniOnline` (booleano, default false in `blankSettings` e `mergeSettings`), il link, «Copia» (scrive negli appunti e il testo del bottone diventa «Copiato» per due secondi), e la frase «Metti questo link nella bio di Instagram o di Facebook.»

Accendere l’interruttore chiama `callPubblicaSalone(salonName)` se lo slug non c’è ancora, poi salva `prenotazioniOnline: true`. Se la callable risponde «Nome già preso», l’interruttore resta spento e il dialogo mostra quel messaggio. Spengere salva `false` e non cancella `pubblici/{slug}`: la pagina resta, senza modulo.

## Pagina pubblica

Un documento solo, non i cinque HTML di `hosting/salone/`. Quelli restano dove sono e non sono il link da condividere. Firebase Hosting riscrive `/s/**` su una Cloud Function `onRequest` `paginaPubblica` (`europe-west1`, invoker public). La funzione legge lo slug dall’ultimo segmento, chiama la stessa lettura di `saloneInfoPer`, e risponde `text/html` con cache `no-cache`.

L’HTML lo costruisce una funzione pura `htmlPaginaPubblica` in `src/lib/paginaPubblica.ts`, così il test non alza l’emulatore. Contiene:

- `lang` dalla query `?lang=it|en|es`, default `it`;
- `og:title` e `<title>` uguali al nome del salone;
- `og:description`: indirizzo se c’è, altrimenti «Prenota online» tradotto;
- niente `og:image` in questo giro (il logo sta nei file del salone, non è un URL pubblico);
- niente partita IVA e niente codice fiscale, a meno che `mostraDatiFiscali` sia già true (lo decide `profiloPubblico`, invariato);
- un JSON `<script type="application/json" id="profilo">` con nome, telefono, indirizzo, orari, servizi prenotabili (id, nome, minuti per taglia), `prenotabile`, `salonId`;
- lo script statico `/s/pagina.js`.

Slug assente o salone `shared`: HTTP 404 e una card «Questa pagina non c’è.» con lo stesso CSS, senza dati di altri saloni.

`prenotabile` lo calcola il server: `settings.prenotazioniOnline === true` e `haAccesso` su `prenotazioni` è vero. I cinque passi e il fiscale si controllano solo quando il titolare accende l’interruttore, perché l’email verificata sta sull’account e non sul documento del salone. Se il piano torna Base, la pagina nasconde il modulo anche se l’interruttore è rimasto acceso. Il browser non può accendere il modulo da solo.

`postiLiberi` e `inviaRichiesta`, se `prenotabile` è falso, rispondono `failed-precondition` e non scrivono.

### Come è fatta

Telefono prima. A 375 px una colonna, padding orizzontale 16, `padding-bottom` con `env(safe-area-inset-bottom)`. Da 900 px una card centrata, `max-width: 880px`, due colonne (`minmax(280px, 340px)` e il resto), `gap: 16`, ombra `--sh-2`. Sotto i 900 px la card è larga quanto la colonna, stessa ombra, niente hero a tutta pagina e niente fascia vuota.

Colori copiati dai token chiari di `tokens.css`, e il blocco scuro se `prefers-color-scheme: dark`. Nessun esadecimale nuovo sparso nei componenti: nel file della pagina le variabili si chiamano come in app (`--bg`, `--card`, `--pri`, `--tx`, `--line`, `--sh-2`). Font: `system-ui, "Segoe UI", sans-serif`. Corpo 16 px, interlinea 1.45. Titolo del salone 22 px, peso 700, non un hero da 48 px.

**Biglietto, sempre.** Logo 56 px se il JSON porta un `logoUrl` https (in questo giro il campo può mancare: si mostra l’iniziale nel cerchio 56, fondo `--pri-s`, testo `--pri-ink`). Sotto, o a destra del logo sulla stessa riga se il nome ci sta: il nome. Una riga indirizzo in `--tx2`, 14 px. Chip compatte (altezza visiva 28, font 13, padding `4px 8px`, raggio 999, gap 8): «Aperto oggi» o «Chiuso oggi» calcolato dagli orari e dal fuso Europe/Rome, e il telefono se c’è. I pulsanti Chiama e WhatsApp sono alti 44, larghi almeno metà riga, gap 8. WhatsApp usa `wa.me` solo con un cellulare, la stessa idea già in app; se il numero non è un cellulare resta solo Chiama. Listino: i servizi attivi come chip colore servizio se il nome coincide con le chiavi già note (bagno, taglio, …), altrimenti chip neutra `--surf`. Non sono giganti: altezza 44 perché si toccano nel passo servizio, font 13, non card da mezza schermata. In fondo, 12 px, «Gestito con Groomly».

**Modulo, solo se `prenotabile`.** Quattro passi, una schermata alla volta. Sopra, quattro chip di progresso alte 28, non bottoni: Servizio, Cane, Quando, I tuoi dati. Quella del passo corrente ha fondo `--pri` e testo `--on-pri`. Le altre `--surf` e `--tx2`. Niente «Sei già venuto da noi?»: all’accettazione il salone confronta già il telefono.

1. Servizio. Una o più chip. La durata mostrata è quella della taglia scelta al passo dopo; prima del passo cane si mostra la durata media, o 60 se manca. Si può andare avanti solo con almeno un servizio.
2. Cane. Nome (etichetta visibile, non solo placeholder), taglia in tre chip alte 44: piccola, media, grande. Razza facoltativa.
3. Quando. Sette giorni a partire da domani, chip giorno. Il giorno scelto chiama `postiLiberi(salonId, giorno, durata)`. Gli orari tornati sono chip alte 44. Lista vuota: «Nessun orario in questo giorno.» e si può cambiare giorno. Il cliente non riceve gli appuntamenti altrui: la callable restituisce solo stringhe orario, come oggi.
4. I tuoi dati. Nome, cellulare, email, note facoltative, spunta privacy obbligatoria con link a `/privacy`. Campo esca `esca`, nascosto e fuori tab. Invio chiama `preparaRichiesta` e poi `inviaRichiesta`.

`inviaRichiesta` accetta in più `cane`, `taglia` (`piccola` | `media` | `grande`) e `servizi` (array di id). Li scrive sul documento `richieste`, solo il server. `nome` resta il nome della persona. `start` e `end` restano gli orari scelti; `end` è `start` più la somma delle durate della taglia.

Dopo l’invio la stessa pagina sostituisce il modulo con «Richiesta inviata a {nome}. Ti arriverà un’email.» Non si apre un altro sito. Errore di rete o `resource-exhausted`: una riga `--bad` sotto il pulsante, il modulo resta. Pulsante in attesa disabilitato, etichetta «Invio…».

Contrasto testo almeno 4,5:1 sui fondi già dei token. Focus visibile `outline: 2px solid var(--pri)`. Icone: SVG inline, tratto 2, niente emoji. Nessun hover come unica via. Lingue: la riga Italiano · English · Español già usata nelle pagine hosting, in testa, compatta.

## Suggerimenti

La route resta `/impostazioni/suggerimenti`. Spariscono le card Guida rapida, Novità e il link Notifiche. Le notifiche restano dove sono: la scorciatoia Avvisi in Impostazioni. La guida resta in Info su Groomly, non qui. `hubSuggerimentiDettaglio` diventa «Segnala un problema o un’idea».

In testa, la domanda «Che cosa vorresti suggerire?». Sotto, una sola `Card`. Dentro, un `role="radiogroup"` con una riga per categoria, `minHeight: 44`, separatore `border-top: 1px solid var(--line)`, la prima senza bordo. Testo 14 px, peso 650, colore `--tx`. La riga scelta ha fondo `--pri-s`, testo `--pri-ink`, e un segno di spunta Lucide `Check` 16 a destra. Non è un `<select>`, non è una chip che va a capo a metà parola, non è una card per categoria.

Categorie, id stabili. I sei vecchi restano validi per i documenti già salvati. Se ne aggiungono cinque.

| id | Italiano |
| --- | --- |
| `bug` | Qualcosa non funziona |
| `critica` | Una schermata è scomoda o poco chiara |
| `miglioramento` | Una funzione che c’è già si può fare meglio |
| `manca` | Manca una funzione che mi servirebbe |
| `agenda` | Agenda, orari o appuntamenti |
| `animali` | Schede degli animali |
| `listino` | Listino, servizi o prezzi |
| `incassi` | Incassi, report o export |
| `account` | Account, backup o accesso |
| `lingua` | Una scritta o una lingua |
| `altro` | Altro |

Subito sotto la card, senza `sectionGap` da 32: etichetta «Scrivi qui», area di testo `minHeight: 96`, `maxHeight: 160`, etichetta vera (`<label>`), non solo placeholder. Poi il pulsante Invia a tutta larghezza, alto 44. La colonna non ha `flex: 1` e la card non cresce per riempire lo schermo. Lo spazio sotto il pulsante è il fondo della pagina, non un vuoto dentro il modulo.

Validazione invariata: sotto i 10 caratteri `sugBreve`, sopra i 2000 `sugTroppo`, errore in `--bad` sotto l’area, successo nel `Dialog` già presente. Invio disabilitato mentre parte. Inglese e spagnolo hanno le stesse chiavi.

## Errori

| Caso | Cosa vede chi usa |
| --- | --- |
| Profilo non 5/5 | Dialogo con i passi mancanti, ciascuno apre il posto dove si completa. Il link pubblico non compare |
| Manca IVA e codice fiscale | Stesso dialogo, riga verso Toelettatura |
| Slug occupato | «Nome già preso», interruttore spento |
| Pagina sconosciuta | 404, «Questa pagina non c’è.» |
| Giorno senza orari | «Nessun orario in questo giorno.» |
| Troppe richieste | Il messaggio già restituito da `decisioneAntispam` |
| Suggerimento corto | `sugBreve` sotto il campo |

## Prove

Funzioni pure: `puoAccenderePrenotazioni`, `linkPrenotazione`, `htmlPaginaPubblica` (nome nel title e in og:title, niente IVA se non richiesta, `prenotabile` false se il flag è spento).

Testing Library: Piano con livello base mostra i quattro titoli e non elenca «Collaboratori» sotto il Pro; il Salone ha «Avvisami per il Salone». Impostazioni: il logo (o l’iniziale) precede il nome nel pulsante account. Suggerimenti: non ci sono «Guida rapida», «Novità», «Notifiche»; c’è «Agenda, orari o appuntamenti»; non c’è un `combobox`.

Le callable si provano come le altre in `functions`, sull’emulatore solo se il giro lo usa già. `npm test` non apre la rete.

## Criteri di accettazione

- Un titolare Base apre Piano e vede Profilo base, Servizio base, Servizio Pro e Servizio Salone. Può chiedere il Salone. I collaboratori non sono una voce del Pro.
- Con Pro acceso, profilo 5/5 e partita IVA o codice fiscale, Prenotazioni online dà un link `https://groomlyapp.it/s/{slug}` da copiare. Senza uno di questi tre, il link non si accende.
- Chi apre il link dal telefono vede nome, contatti e, se acceso, il modulo in quattro passi. Dal computer la stessa pagina sta in una card a due colonne, senza grandi vuoti. L’anteprima del link ha il nome del salone.
- In Impostazioni il logo è a sinistra del nome.
- Suggerimenti è un modulo compatto, tema dell’app, senza guida, novità e notifiche.
