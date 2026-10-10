# Groomly — UI rinnovata

Data: 2026-10-10
Stato: approvato in dialogo, in attesa di revisione del file

Fonte visiva: `ui-screenshots/Groomly UI rinnovata.html`.
Le note «cosa cambia» di quel file sono la lista di controllo. Le misure del mockup sono già allineate all’app: da lì si prendono ombre, bordi, chip, pill, stati e la divisione in card. I numeri già presenti in `src/theme/sizes.ts` e in `TYPE` (`src/theme/theme.ts`) restano la fonte e non si ingrandiscono.

Si allarga il sistema che c’è già. Le pagine non si riscrivono: cambiano gli stili e i componenti, e le pagine li usano. Testi, route e documenti restano, con le eccezioni scritte sotto.

## 1. Cosa resta fermo

- Route, hook, salvataggi e forma dei documenti.
- `ThemeChoice`: `light`, `dark`, `auto`. Il tema risolto resta su `document.documentElement.dataset.theme`.
- `TYPE`. I nomi in lista usano `rowTitle` (12.5). Il nome grande in scheda resta `dogName` (18).
- I numeri già in `sizes.ts`: padding di pagina, ricerca 32, riga 44, card raggio 12, avatar, icone carattere, bottoni 26 e 34, barra 58, foglio raggio 18 e maniglia 34×4, ora del calendario 50.
- `--sen` e `--tea`, con i loro sfondi. Il calendario e i test li usano ancora.
- Le stringhe visibili. Le scritte nuove sono tre: la pill del prossimo in Home («tra N min» oppure «ora»), il «+1» sulla card compatta del calendario, e la variazione di prezzo nello storico («▲» o «▼» più `formatEuro` del valore assoluto).
- Le icone illustrate di `src/assets/icons` (`icons.ts`): carattere, bandiere, servizi, strumenti, avatar. Le icone di interfaccia restano `lucide-react`. Nessun base64 del mockup entra nell’app.

L’insieme degli appuntamenti mostrati in «Oggi» resta quello di oggi: programmati e completati. Cambia l’ordine, che diventa per orario.

## 2. Token

I nomi già usati dall’app restano. Cambiano i valori, presi da `.app` e da `.app[data-mode="dark"]`. Non si introducono i nomi `--g-*`.

Mappa:

| Nostro | Mockup |
|---|---|
| `--bg` | `--g-bg` |
| `--card` | `--g-surface` |
| `--surf` | `--g-surface-2` |
| `--surf2` | stesso valore di `--surf` |
| `--surf3` | `--g-surface-3` |
| `--line` | `--g-line` |
| `--line2` | `--g-line-2` |
| `--tx` `--tx2` `--tx3` | `--g-text` `--g-text-2` `--g-text-3` |
| `--pri` | `--g-primary` |
| `--pri-solid` | `--g-primary-solid` |
| `--on-pri` | `--g-on-primary` |
| `--pri-s` | `--g-primary-soft` |
| `--pri-ink` | `--g-primary-ink` |
| `--focus` | `--g-focus` |
| `--ok` `--ok-s` | `--g-ok` `--g-ok-soft` |
| `--warn` `--warn-s` | `--g-warn` `--g-warn-soft` |
| `--bad` `--bad-s` | `--g-bad` `--g-bad-soft` |
| `--scrim` | `--g-scrim` |

In chiaro `--pri` e `--pri-solid` sono entrambi `#3A5BA0`. In scuro `--pri` è `#8AA4E8` e `--pri-solid` è `#4F6FC0`: i link usano il primo, i bottoni pieni il secondo.

Ombre, uguali ai valori del mockup:

- `--sh-1` controlli
- `--sh-2` card
- `--sh-3` fogli
- `--sh-btn` bottone pieno
- `--sh-foot` il footer del foglio: `0 -8px 20px -14px rgba(20,30,50,.25)` in entrambi i temi, perché il mockup non lo sdoppia
- `--sh-stk` l’ombra dello sticker: `0 2px 4px rgba(0,0,0,.18)`, più l’anello `0 0 0 2px var(--card)`

`--shadow` resta e vale `--sh-2`.

Colori servizio, con lo sfondo `-bg`, in chiaro e in scuro come nel mockup:

| Token | `iconKey` |
|---|---|
| `--s-bagno` | `bagno` |
| `--s-taglio` | `taglio` |
| `--s-combo` | `bagno_taglio` |
| `--s-nodi` | `nodi` |
| `--s-derma` | `dermatologico` |
| `--s-anti` | `antiparassitario` |
| `--s-strip` | assente o sconosciuto |
| `--s-mens` | bandiera mensile |

L’alone di focus e di selezione è `0 0 0 3px var(--focus)`.

## 3. Misure nuove

Si aggiungono in `sizes.ts`. I componenti le leggono da lì.

| Pezzo | Valore |
|---|---|
| Campo | altezza 32, etichetta 11, raggio 9, gap etichetta 4 |
| Campo login | altezza 44 |
| Area di testo | altezza minima 48 |
| Bottone medio | altezza 30, raggio 8 |
| Chip servizio | altezza 20, raggio 6, padding orizzontale 6, gap interno 3, gap del contenitore 5 |
| Chip filtro | altezza 26, padding orizzontale 10, raggio pieno, testo 11.5 |
| Pill | altezza 20, padding orizzontale 8, pallino 6. Il raggio resta 999. Il testo resta `TYPE.chip`, 10.5 |
| Box orario | larghezza 42, raggio 8, padding verticale 3. L’ora è 12, la durata è 10 |
| IconTile | 28, raggio 8. Piccola 24, raggio 7 |
| Interruttore | 38×22, pallino 16 |
| Griglia chiave-valore | etichetta 9.5, valore 13, raggio 10, padding 6×10 |
| Barretta di sezione | 3×14, raggio 2. Contatore altezza 17 |
| Footer del foglio | padding 8×12×12, gap 7 |

`chip.radius` 999 resta per le chip tonde. I 26 (`button.h`, raggio 7) e i 34 (`button.hLg`, raggio 9) restano. Chi non passa la taglia al `Button` resta su 34.

Lo switch del popup prezzi, oggi 36×22 scritto nel componente, diventa questo interruttore 38×22. È lo stesso controllo.

## 4. Componenti

Si aggiornano sul posto. Se ne aggiunge uno quando il ruolo è diverso.

`Button`: varianti `primary`, `tonal`, `ok`, `bad`, `ghost` e secondario (bordo, fondo superficie, `--sh-1`). Taglie `sm` 26, `md` 30, `lg` 34. Il primary pieno usa `--pri-solid`, testo `--on-pri`, ombra `--sh-btn`. `tonal` usa `--pri-s` e `--pri-ink`. `ok` e `bad` usano lo sfondo tenue e l’inchiostro del tono, senza ombra.

`Input`: altezza e etichetta da `sizes.ts`. In modifica, bordo `--pri` e alone `--focus`. In errore, bordo `--bad` e alone `--bad-s`. Il login passa la taglia 44. L’icona a sinistra e l’occhio della password sono lucide.

`Toggle` prende le misure dell’interruttore, acceso su `--ok`, e si esporta anche come `Switch`. Stessa API: `checked`, `onChange`, `label`.

`ServiceChip`: icona da `icons.ts`, colore `--s-*` dello `iconKey`, altezza 20, raggio 6, testo `TYPE.chip` (10.5), bordo interno `color-mix` al 20% come nel mockup.

`StatusPill`: tonda, con pallino. Toni `prim`, `ok`, `warn`, `bad` e neutro. Il prossimo in Home usa `prim`.

`FilterChip`: bottone. Da attiva ha fondo `--pri-s`, bordo `--pri`, testo `--pri-ink`, alone `--focus` e spunta lucide.

`Chip` resta per i tag neutri, tratteggiati (`+ Tag`, suggerimenti) e tondi (carattere in forma di etichetta). Il contenitore è `display: flex; flex-wrap: wrap` con il gap delle chip. Le chip vanno a capo e restano dentro lo schermo. Il `+N` che oggi taglia i servizi negli elenchi sparisce.

`TemperamentIcon` e `FlagIcon` restano le immagini di `icons.ts`. `TemperamentSticker` ci mette l’anello e `--sh-stk`. In lista lo sticker sta sull’angolo della foto.

`Card` ha bordo, raggio 12, `--sh-2`, `overflow: hidden`. La riga premuta ha fondo `--pri-s`. La riga del prossimo ha la barretta sinistra (3 px, `--pri`) e il box orario pieno: fondo `--pri-solid`, testo `--on-pri`, ombra `--sh-btn`.

`SectionTitle` guadagna barretta, contatore e link, e si esporta anche come `SectionHeader`. Toni della barretta: default `--pri`, `ok`, `warn`, `bad`.

`Segmented`: il selezionato è in rilievo, fondo `--surf3`, ombra `--sh-1` e bordo `--line`. Altezza 26. Una variante `solid` lo rende `--pri-solid` con testo `--on-pri` e `--sh-btn`.

`IconTile` e `KeyValueGrid` sono nuovi e leggono solo `sizes.ts`.

`Sheet` resta il foglio dal basso, con la chiusura a trascinamento di oggi. Si aggiunge `footer`: resta fermo in basso, bordo sopra `--line`, fondo `--card`, ombra `--sh-foot`. Il velo usa `--scrim`.

Stato selezionato, unico per filtro, tessera servizio e carattere: bordo `--pri`, alone `--focus`, spunta.

## 5. Gesti e liste

**Servizi.** «Su» e «Giù» diventano la maniglia. I due gruppi, Principali ed Extra, sono la divisione visiva di `kind`: il trascinamento riordina dentro il gruppo. Al rilascio si permutano gli `order` già presenti in quel gruppo, lo stesso scambio che fa `moveService`, e si scrive la mappa una volta. I numeri dell’altro gruppo non si toccano, così i due gruppi non si mescolano. L’interruttore scrive `active` con il salvataggio già usato. Se il salvataggio fallisce, l’elenco torna all’ordine precedente e compare il toast di errore già usato.

**Mensili.** Con i filtri `tutti` e `fissati` il gruppo Fissati è aperto. Il bottone «Mostra fissati» / «Nascondi fissati» non c’è più. `da fissare` continua a nascondere i fissati. Date, ritardi e l’azione «Fissa» restano calcolati come ora. «Fissa» è un bottone `tonal`.

**Liste.** Nome e sottotitolo vanno a capo. Non si usa `text-overflow: ellipsis` in home, animali, scheda, mensili e righe di appuntamento.

**Calendario, giorno e settimana.** La durata è la somma dei minuti dei servizi, la stessa che posiziona già il blocco.

- Sotto i 60 minuti la card è una riga: nome per intero, sticker (carattere e bandiere già mostrate), la chip del primo servizio, orario. Se i servizi sono più di uno, si aggiunge la scritta «+1». È sempre la stringa «+1», anche quando quelli nascosti sono più di uno. Il nome non si taglia.
- Da 60 minuti in su la card è intera: striscia, nome, sticker, orario e tutte le chip, che vanno a capo.

La striscia è verde se l’appuntamento è completato, `--s-mens` se è un mensile, `--pri` se è in arrivo. La linea «adesso» ha pallino e orario. L’altezza dell’ora resta 50.

**Prezzo nello storico.** Il totale di una visita è la somma dei prezzi già presenti sulle righe servizio. Se la visita precedente dello stesso cane ha un totale diverso, accanto al prezzo si vede «▲» o «▼» e `formatEuro` del valore assoluto della differenza. «▲» se il totale è salito, «▼» se è sceso. Senza visita precedente non compare nulla. Nessun campo nuovo.

**Tag.** «Togli» diventa la x sulla chip e chiama la stessa rimozione. Il dialogo centrale di tag, strumenti e prodotti diventa `Sheet` con footer. Questo aggiorna la specifica del popup del 2026-10-10 solo per quella voce. Attività e Campi scheda restano `Dialog`.

Vista settimana, toast e avviso di aggiornamento usano gli stessi pezzi e non cambiano comportamento.

## 6. Schermate

**Accesso.** Logo con alone e ombra. Campi con icona e, sulla password, l’occhio. Altezza 44. Il bottone principale ha `--sh-btn`.

**Home.** Gli appuntamenti di oggi sono ordinati per `start`, a parità di orario per `id`. I completati restano al loro orario, attenuati, con la pill «Completato». Il prossimo è lo stesso `currentOrNext` di oggi: box orario blu e, accanto alle chip, una pill. Se l’inizio è nel futuro, la pill dice «tra N min»: N è `Math.ceil` dei minuti che mancano ed è almeno 1. Se l’inizio è già arrivato, la pill dice «ora». Senza un prossimo non ci sono né box blu né pill. Le chip servizio vanno a capo. In «Da chiudere» i tre bottoni sono piccoli, sulla griglia `1.25fr 1fr 1fr`: Completato è `ok` con la spunta; Non venuto è secondario, solo etichetta; Disdetto è `bad`, solo etichetta. Le azioni restano `closeVisit` e la conferma di disdetta. Le tre caselle in basso hanno `IconTile` e restano toccabili.

**Animali.** Nome con sticker sull’angolo della foto, sottotitolo a capo, stato in `StatusPill`. Il tab attivo ha il badge blu pieno. I filtri sono `FilterChip`.

**Scheda cane.** Testata in una card: foto, nome, chip di carattere, cliente e taglia, proprietario con Chiama. Il prossimo appuntamento è una card con la data in evidenza e le scorciatoie +2, +4, +6. Lo storico ha la data a sinistra, il prezzo a destra e la variazione del §5. Note, tag e veterinario sono raggruppati. I dettagli sono `KeyValueGrid`. I contatti hanno iniziali e il ruolo in chip.

**Modifica cane.** Card: Identità, Carattere, Cliente, Note e tag, Contatti. Il carattere scelto ha bordo, alone e spunta; gli altri sono attenuati. I segmentati hanno il selezionato in rilievo. I tag sono chip con la x; «+ Tag» è tratteggiato. Salva sta nel footer fisso.

**Calendario, mese.** Casella con `--sh-1` e il numero di appuntamenti in un badge. Oggi ha l’anello `--pri`. Il giorno scelto è `--pri-solid`, anche quando è oggi. Il weekend ha fondo `--surf`. Sotto, la lista del giorno come la Home. «Aggiungi» è `tonal`.

**Appuntamento.** Il cane è una card toccabile verso la scheda. Data, orario, durata e telefono stanno in `KeyValueGrid`. Servizi e totale sono lo scontrino: icone colorate, riga tratteggiata, totale grande. Azioni, in ordine, a tutta larghezza e con icona: sposta e modifica `tonal`, poi Non venuto e Disdici, in fondo Completato `primary`. L’eccezione senza icona vale solo per i tre bottoni di «Da chiudere» in Home.

**Nuovo appuntamento.** L’avviso critico è un box `--bad-s` con icona e bordo sinistro `--bad`. I servizi sono tessere con `IconTile`, durata e prezzo, divise in Principali ed Extra; quelle scelte hanno lo stato selezionato del §4. Orari: libero (secondario), scelto (`--pri-solid`), occupato (tratteggio e barrato, non cliccabile), intervallo della durata in `--pri-s`. Prezzo e orario restano nel footer, sopra Salva.

**Note del lavoro.** Pill «Completato» accanto al titolo. La durata reale ha «min» nel campo e il confronto con la stima. Le scelte sono chip piene con la x; i suggerimenti sono chip tratteggiate con il +. Aggiungi sta dentro il campo. Le foto restano Prima e Dopo.

**Mensili.** Card con la barra a due colori e la legenda fissati / da fissare. Intestazioni colorate con contatore: in ritardo rosso, fissati verde. Pill di ritardo. «Fissa» è `tonal`. I fissati si vedono subito, come nel §5.

**Listino.** Il file è una card con `IconTile` e i bottoni Apri, Sostituisci, Foto. La versione precedente è attenuata, con la chip «Precedente». La tabella sta in una card, con icona colorata e la durata sotto il nome. La frase sui prezzi in scheda sta nel box informativo `--pri-s`.

**Impostazioni.** Ogni voce ha `IconTile` e la freccia. Il backup ha la pill verde, «Esegui ora» `tonal`, Esporta e Ripristina con icona. Orario e Giorni di anticipo stanno affiancati. Esci è `bad`, con icona.

**Servizi.** Maniglia, gruppi e interruttore come nel §5. Durata e prezzo sono chip. La riga disattivata è attenuata, con la pill «Disattivato».

**Tag, strumenti, prodotti.** Una card per gruppo, con icona e contatore. Chip con la x. Il + sta dentro il campo. Il contenitore è il `Sheet` del §5.

## 7. Verifica

I test di comportamento restano. Si aggiornano dove il gesto o l’aspetto nuovo è il risultato atteso.

- I token chiari e scuri coincidono con la tabella del §2, ombre e colori servizio compresi. `resolveTheme` resta com’è.
- `Input` è alto 32 con etichetta 11. Nel login l’altezza è 44.
- `Button`, `FilterChip`, `Segmented`, `ServiceChip` e `StatusPill` coprono varianti e stato selezionato. Il contenitore delle chip va a capo.
- Il trascinamento scrive `order` in un solo salvataggio. Se fallisce, l’elenco torna indietro e il toast è quello già usato. «Su» e «Giù» non ci sono più.
- I mensili fissati sono visibili con `tutti`. `da fissare` continua a nasconderli.
- Negli elenchi il nome non ha `text-overflow: ellipsis`.
- Sotto i 60 minuti la card compatta mostra nome intero, prima chip e «+1» se c’è altro servizio. Da 60 minuti le chip vanno a capo.
- In Home l’ordine è per orario, la pill è «tra X min» o «ora», e solo Completato ha la spunta.
- Lo storico mostra la variazione solo con una visita precedente di totale diverso.

A 390 px, in chiaro e in scuro, si ripassa la lista delle note del mockup insieme alle correzioni di Home e calendario di questo documento. Dialoghi, toast e aggiornamento si controllano sullo stesso guscio.

## 8. Fuori da questo lavoro

Nessuna route nuova, nessun campo nuovo, nessuna libreria di trascinamento. La pagina DevKit può mostrare i componenti già montati, senza diventare una schermata da pubblicare. Non si alza la versione e non si pubblica l’APK finché il restyling non è consegnato.
