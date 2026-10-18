# Groomly — interfaccia più comoda

Data: 2026-10-18
Stato: scelte chiuse in questa specifica. L’utente ha chiesto di adottare le risposte consigliate e di eseguire il piano.

Questa specifica sostituisce, solo per le misure e i contrasti elencati qui, il vincolo del 2026-10-10 che congelava altezze di bottoni, chip e `TYPE`. Route, salvataggi, documenti e flussi restano.

## Decisioni chiuse

1. Si sistemano i punti dell’audit del 18 ottobre, senza nuove funzioni e senza cambiare i dati.
2. Il testo scritto dall’utente (nome, razza, proprietario, note, tag, servizio, file, salone, indirizzo) non si tronca e non usa i puntini. Va a capo, la riga o il pulsante crescono, il testo resta tutto visibile.
3. Le scritte nostre e corte (Home, Fissa, Completato, i nomi dei filtri) restano su una riga. Se a una di queste si attacca un dato dell’utente, l’insieme va a capo dentro il controllo.
4. Ogni controllo toccabile ha un’area di almeno 44×44 px. Il premuto si vede con l’opacità, senza spostare il layout. Il disabilitato è opaco e non parte.
5. La barra usa gli stessi blu del tema. Le voci si chiamano come le pagine: Mensili e Impostazioni.
6. L’apertura dura 900 ms se c’è già un account o un accesso ricordato, altrimenti 1400 ms. La dissolvenza resta 350 ms.

## Testo dell’utente

Costante `USER_TEXT` in `src/theme/text.ts`:

- `minWidth: 0`
- `maxWidth: '100%'`
- `whiteSpace: 'normal'`
- `overflowWrap: 'anywhere'`

Si applica a ogni punto che stampa un dato dell’utente: righe, chip, celle, pulsanti, titoli di foglio, toast. Vietato `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'` e `overflow: 'hidden'` su quel testo. `overflow: hidden` sulle card può restare solo se il testo interno va a capo e non viene tagliato.

Una razza di tre o quattro parole, un nome lungo o un file con un nome lungo si leggono per intero. Il contenitore cresce in altezza. Su schermi larghi il testo di una nota non supera i 640 px già imposti dalla shell.

I chip di filtro nostri (Tutti, Mordaci, Giorno) restano su una riga e la fila può scorrere. I chip che contengono dati dell’utente vanno a capo e possono occupare tutta la larghezza della fila.

## Misure

`src/theme/theme.ts` `TYPE`:

| Chiave | Prima | Dopo |
|---|---|---|
| base | 12.5 | 14 |
| pageTitle | 17 | 17 |
| dogName | 18 | 18 |
| rowTitle | 12.5 | 14 |
| rowSub | 11 | 13 |
| meta | 10.5 | 12 |
| section | 11 | 12 |
| chip | 10.5 | 13 |
| navLabel | 9.5 | 12 |

`html` in `src/index.css` usa `font-size: 14px` e `line-height: 1.45`.

`src/theme/sizes.ts`:

- `headerIconBtn` 44, raggio 12
- `search.h` 44
- `button.h`, `button.hMd` 44; `button.hLg` 48
- `field.h` e `field.hLg` 44; `field.label` 12
- `filterChip.h` 44, `filterChip.font` 13
- `chip.font` 13
- `switch` pista visiva 48×28 dentro un bersaglio 44 di altezza
- `kv.label` 12, `kv.value` 14
- `serviceChip.h` non è più un’altezza fissa: il chip ha `minHeight` 28 e altezza automatica

`src/theme/theme.test.ts` si aggiorna a questi numeri. Il commento del test non parla più di «non ingrandire».

## Colori

In `src/theme/tokens.css`, solo questi valori cambiano. Gli altri token restano.

- Chiaro `--tx3: #5C677A` (almeno 4,5:1 su `--bg`, `--card` e `--surf`)
- Chiaro `--warn: #7A4C09` (almeno 4,5:1 su `--warn-s`)
- Scuro `--tx3: #8491A6` (almeno 4,5:1 su `--bg`, `--card` e `--surf`, e più scuro di `--tx2`)

I componenti non introducono nuovi esadecimali per testo, icone o fondi. Il verde WhatsApp `#128C7E` e il foglio di carta bianca della stampa restano, perché sono il marchio e la carta. L’alone del bollino in agenda usa `var(--card)`, non `#fff`. Lo scrim dei dialoghi usa `var(--scrim)`.

## Controlli condivisi

`Button`: `font: inherit`, `minHeight` della taglia, `height: auto`, padding `8px 12px`, `lineHeight: 1.25`, più `USER_TEXT`. Cursore pointer. `:disabled` opacità 0.45 e cursore di default. `:focus-visible` anello `0 0 0 3px var(--focus)`. `:active` opacità 0.86, senza cambiare le misure. Le pagine non impongono più `height` fisso sui bottoni.

`IconButton` e le X di dialogo e foglio: 44×44, stesso focus e stessa opacità al tocco.

`FilterChip` e le opzioni di `Segmented`: altezza minima 44, testo che può andare a capo se è un dato dell’utente. I segmenti con etichette nostre corte restano centrati.

`Chip`: niente `nowrap`. `maxWidth: 100%`, altezza automatica, `USER_TEXT`.

`Toggle`: bersaglio alto 44, pista animata in 150 ms sulla posizione del pallino. Con movimento ridotto la transizione è nulla.

`Input` e ricerca: altezza minima 44. Il campo cresce solo se è un’area di testo.

`Toast`: i pulsanti Annulla e le altre azioni sono testo del toast (`color: inherit`, `font: inherit`, `minHeight: 44`, senza bordo né sottolineatura del browser). Il messaggio usa `USER_TEXT`.

In `index.css`, per `button` e per i link che sono controlli: `font: inherit`, `touch-action: manipulation`. `@media (prefers-reduced-motion: reduce)` azzera durate di transizione e animazione.

Il font dell’interfaccia è Inter incluso nell’app con `@fontsource/inter` (400, 500, 600, 700), importato da `src/main.tsx`. Il link a Google Fonts esce da `index.html`. I font del listino stampato restano quelli già locali.

## Barra

`BottomNav`: etichette Mensili (al posto di Avvisi) e Impostazioni (al posto di Altro). Stesse route. Testo 12 px. Colori da token: voce a riposo `--tx3`, voce attiva `--pri`, mattonella e «+» da `--pri` e `--pri-solid`. Il «+» sta tutto sopra la barra, con almeno 4 px di aria, e non copre le icone. Con avvisi, il nome accessibile della voce Mensili è «Mensili, ci sono avvisi». Con dati fiscali mancanti, Impostazioni è «Impostazioni, dati da completare». Senza pallino il nome accessibile resta l’etichetta visibile.

Le pagine radice `/mensili` e `/impostazioni` non hanno la freccia Indietro: si torna con la barra.

## Fogli e dialoghi

`Dialog` e `Sheet`: all’apertura il focus entra nel pannello; alla chiusura torna all’elemento che era attivo. Esc chiude anche il foglio. Il livello pagina sotto un foglio ha `inert`. Il foglio appuntamento ha un solo scorrimento: lo scorrimento è quello di `Sheet`, il riquadro interno non ha `overflow` né `maxHeight` propri. La maniglia resta, e il pulsante di chiusura resta.

## Schermate

Le funzioni, gli hook e i testi di errore di salvataggio restano, salvo i messaggi indicati.

### Accesso

Entra disabilita il pulsante e mostra «Accesso…» mentre il login è in corso. L’occhio della password è allineato al campo, entrambi alti 44.

### Home

Le quattro tessere sono una griglia 2×2, con `minWidth: 0` e `USER_TEXT` su numeri e etichette. Il giorno vuoto ha il pulsante «Nuovo appuntamento». «Fissa» più il nome del cane sta in un bottone a tutta larghezza della riga, altezza automatica, nome intero. Completato, Non venuto e Disdetto sono tre bottoni a tutta larghezza, uno sotto l’altro, con 8 px tra loro. Disdetto è l’ultimo.

### Animali e scheda

Le quattro schede scorrono in orizzontale, ogni scheda è alta almeno 44 e non va a capo (sono scritte nostre). Il vuoto dice «Aggiungi il primo animale» se non c’è nessuno, altrimenti «Aggiungi un animale». Il foglio Ordina segna la scelta con `aria-pressed` e righe alte almeno 44. La ricerca usa la stessa altezza della home.

I fatti in scheda (specie, razza, sesso, peso, taglia, cliente, durata) sono una griglia `repeat(auto-fit, minmax(104px, 1fr))`. Etichetta 12 px, valore 14 px, entrambi con `USER_TEXT`. Nessuna larghezza fissa da 36 px, nessun `nowrap`, nessun ellipsis. «Occas.» torna «Occasionale». Chiama, WhatsApp e Fissa appuntamento sono alti almeno 44. I pulsanti che tolgono tag, campi e contatti hanno bersaglio 44.

### Agenda e appuntamento

Le celle del giorno e del mese hanno altezza minima 44. L’alone del conteggio è `var(--card)`. «+ Aggiungi» è un bottone a tutta larghezza, altezza minima 44. Il foglio appuntamento non cambia le azioni: cambiano solo misure, a capo e lo scorrimento unico. I chip dei servizi con il nome del servizio usano `USER_TEXT`.

### Mensili

Titolo «Mensili». Il selettore del mese sta sotto il titolo, non accanto. I chip con data vanno a capo. «Fissa» è alto almeno 44. Toccare il nome del cane apre la scheda, oltre al pulsante Fissa che resta.

### Incassi e report

Frecce del periodo 44×44. La legenda va a capo su più righe, testo 12 px. Lo swipe del periodo sta solo sulla riga del titolo, non sulla card del grafico. Le etichette del grafico passano a 12 px e non si sovrappongono alle barre: se non c’è spazio, la cifra sta sopra la barra. I conteggi di POS e contanti dicono «animale / animali». «Chiudi» punta a `/#da-chiudere` e la sezione Da chiudere ha `id="da-chiudere"`. Il link al report è una riga alta almeno 44.

### Listino

Le tre azioni dell’intestazione stanno su una riga sotto il titolo, icone 44. La tabella prezzi usa 13 px, le celle vanno a capo, la prima colonna non taglia il nome del servizio. Eliminare un file chiede conferma in un dialogo: titolo «Eliminare questo file?», il nome del file intero, Annulla e Elimina (variante bad). Il PDF in «Vedi» ha sempre il pulsante «Apri», che usa l’apertura già presente. «Annulla tutto» nei prezzi chiede «Annullare le modifiche?» prima di svuotare la bozza. Il tavolo dell’anteprima di stampa usa `var(--surf)`; il foglio resta bianco.

### Impostazioni, servizi, utenti

Esci chiede «Uscire da Groomly?» con Resta e Esci. Il ripristino dice «Sostituisce i dati di questo salone.» e il pulsante Ripristina è variante bad. Se la copia della partita IVA fallisce, il toast è «Copia non riuscita». Il badge NUOVO è testo 12 px, colore `var(--on-pri)` su `var(--pri-solid)`. La riga dei tag non dice più «4 caratteri»: dice quanti tag ci sono.

Ogni servizio è su due livelli: prima riga maniglia, icona, nome (che va a capo) e interruttore; seconda riga durata, prezzo e, se serve, Disattivato. Il trascinamento e le frecce restano.

Utenti ha un campo Cerca che filtra per nome del titolare o del salone, senza troncare i risultati. L’errore di caricamento è «Elenco non disponibile». «Caricamento…» resta.

## Cosa non si tocca

Route, Firestore, backup, login vero, calcolo incassi, chiusura visita, foto, listino cartaceo (tipografia del foglio stampato), testi di conferma già chiari (scheda, decesso, appuntamento). Nessun `textOverflow: ellipsis` nuovo.

## Prove

I test di comportamento restano. Si aggiornano solo le asserzioni che fissano le vecchie misure, i vecchi nomi Avvisi e Altro della barra, e l’altezza 26 px del bottone. `npm test` deve passare. Un nome di razza di quattro parole, reso in una cella della scheda e in una cella del listino, è tutto nel documento, senza ellipsis.
