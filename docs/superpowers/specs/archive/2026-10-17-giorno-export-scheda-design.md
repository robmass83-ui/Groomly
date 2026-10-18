# Groomly — Giorno a fasce, export del commercialista, contatti e storico

Data: 2026-10-17

Tre modifiche indipendenti, da fare in quest'ordine: la vista Giorno del calendario, l'export per il commercialista, i contatti e lo storico nella scheda del cane. Settimana, Mese, testata della scheda, prezzi, note e galleria restano come sono.

## 1. Vista Giorno a fasce

Oggi la vista Giorno è una scala unica: l'altezza di un appuntamento è la sua durata per i pixel al minuto, e se una chip ha tanto testo la scala di tutta la giornata cresce. Una tosatura di tre ore diventa un riquadro altissimo.

La vista Giorno diventa una sequenza verticale di due pezzi, dall'ora di apertura a quella di chiusura. L'apertura è `bounds.startHour` e la chiusura `bounds.endHour`, già calcolate da `gridBounds`: di norma 8–19, e si allargano se c'è un appuntamento fuori orario. I segnali «prima delle 8» e «dopo le 19» restano, con la nuova geometria.

Settimana (`WeekRows`) e Mese non usano questa scala.

### 1.1 Ora libera

Un'ora di orologio, da `H:00` a `H+1:00`, che non tocca nessun appuntamento è una riga alta 36 px. L'etichetta `H:00` sta a sinistra, centrata nella riga. Toccando la riga si apre un nuovo appuntamento a quell'ora, con la stessa aria-label di oggi (`Nuovo … alle H:00`).

Un buco dentro un'ora che contiene già un appuntamento non ha una riga sua. Un appuntamento alle 10:30 occupa l'ora delle 10: la fascia del gruppo parte alle 10:30 e non c'è una riga «10:00» da toccare.

### 1.2 Gruppo di appuntamenti

Due appuntamenti si incrociano se gli intervalli `[inizio, inizio + durata)` si toccano. Un gruppo è un insieme collegato. L'intervallo del gruppo è dal primo inizio all'ultima fine.

Dentro il gruppo le chip restano affiancate, con le colonne già calcolate da `placeAppointments` e il bordo arancione di sovrapposizione quando le colonne sono più di una.

Ogni chip è alta solo quanto il suo contenuto, stimato con `contentMinHeightPx` (nome, adesivo, stato, orario di inizio, razza se va mostrata, una riga per ogni servizio, nota critica). Niente ellissi sul nome, niente «+1», tutti i servizi e la nota si leggono. La chip non si allunga per riempire la fascia: se la fascia è più alta, sotto la chip più bassa resta il fondo della fascia.

In verticale la chip si allinea al proprio inizio. Chi parte alle 10 dentro un gruppo 9–12 non è in cima.

### 1.3 Ore a sinistra

La colonna delle ore è larga 48 px, così ci sta `10:30`.

Nel gruppo le etichette sono un segno ogni 60 minuti, partendo dall'inizio del gruppo, finché il segno è strettamente prima della fine.

- 9:00–12:00 mostra 9:00, 10:00, 11:00.
- 10:30 per tre ore (fine 13:30) mostra 10:30, 11:30, 12:30.
- Due cani, 9–12 e 10–11, mostrano 9:00, 10:00, 11:00.

L'ora di fine non è un segno del gruppo. Se le 12:00 sono libere, sono la riga vuota successiva.

I segni si distribuiscono in parti uguali sull'altezza della fascia. Il primo sta in cima. Ogni segno ha almeno 16 px. Se il testo è più alto di questo minimo, i segni si allargano con la fascia. Se il testo è una riga e i segni sono quattro, la fascia è alta 64 px e la chip resta alta quanto il testo.

La chip si aggancia al segno più tardo che non supera il suo inizio. La fascia è alta quanto la chip più alta, e cresce solo se una chip agganciata più in basso uscirebbe dal fondo: l'altezza è il minimo `H` tale che `H` è almeno `numero di segni × 16` e, per ogni chip, la posizione del suo segno più `C` non supera `H`. Una durata 0 conta come 1 minuto, così il gruppo ha un segno e una chip.

### 1.4 Ora attuale

La linea rossa cade nel pezzo che contiene il minuto corrente: dentro un gruppo, alla frazione del gruppo; dentro un'ora libera, alla frazione dei 36 px. Aprendo l'oggi, la pagina si posiziona su quella linea, con la stessa intenzione di `openingScroll`.

## 2. Export per il commercialista

Il foglio è lo `Sheet` «Esporta per il commercialista». I dati restano quelli di `buildExportData`: solo completati nel dettaglio, mancati solo se l'interruttore è acceso, fuori dal totale.

### 2.1 Nome del file

Il prefisso è la ragione sociale di Impostazioni → Attività (`settings.business.name`), sistemata così:

1. si tagliano gli spazi agli estremi;
2. ogni sequenza di spazi diventa `_`;
3. si tolgono i caratteri `\ / : * ? " < > |` e quelli di controllo;
4. si fondono i `_` ripetuti e si tolgono dai due estremi.

Se non resta nulla, il prefisso è `Groomly`. Altrimenti è quel nome. «I Pelosetti» dà `I_Pelosetti_Incassi_2026-10.pdf` e `I_Pelosetti_Incassi_2026-10.xlsx`.

Il suffisso non cambia:

- anno: `_Incassi_2026`;
- mese: `_Incassi_2026-10`;
- intervallo: `_Incassi_2026-10-01_2026-10-31`.

Dentro il PDF il titolo resta «Riepilogo incassi», il piè di pagina resta «Generato con Groomly» e il titolo della condivisione resta «Incassi Groomly».

### 2.2 Tipo di pagamento

In «Cosa includere», dopo il dettaglio, c'è l'interruttore **Tipo di pagamento**. Testo sotto: «Colonna nel dettaglio e riga POS / contanti nel PDF». È acceso di partenza. La preferenza sta in `exportPrefs.include.pagamento`. Una preferenza già salvata senza questo campo resta accesa: solo `false` lo spegne.

Da spento:

- nel PDF sparisce la riga `POS … · Contanti …` e lo spazio che occupava;
- nel PDF sparisce la colonna Pagamento del dettaglio. I subtotali e il totale del periodo tengono l'importo sull'ultima colonna rimasta;
- nell'Excel sparisce la colonna Pagamento.

La tabella dei mancati incassi non ha quella colonna e non cambia. L'interruttore si può spegnere anche se il dettaglio è spento: in quel caso toglie solo la riga del PDF.

Il suggerimento sotto «Dettaglio appuntamenti» diventa «Data, ora, cane, proprietario, servizi, importo».

### 2.3 Excel

Il pulsante Excel consegna un `.xlsx`. Il valore salvato `formato: 'csv'` continua a significare Excel, così le preferenze già scritte non si resettano. L'estensione del file è `xlsx`.

Un foglio solo, nell'ordine:

1. Prima riga: «Riepilogo incassi», grassetto, testo chiaro, fascia `#1F2937`, unita su tante colonne quante ne ha la tabella più larga del foglio (il dettaglio, se c'è; altrimenti il riepilogo).
2. Periodo, nella forma già usata (`01/10/2026 - 31/10/2026`).
3. Se «Dati dell'attività» è acceso: Attività, P. IVA, indirizzo, telefono, una riga ciascuno.
4. Se il dettaglio è acceso, la tabella con le colonne di oggi: Data, Ora, Cane, Proprietario, Servizi, Durata (min), Importo (€), Pagamento, Stato. Con i mancati accesi si aggiunge Importo mancato (€). Pagamento c'è solo se l'interruttore del §2.2 è acceso.
5. Le righe dei mancati, se accese, stanno in questa tabella.
6. La riga Totale sta sotto la tabella, fuori dal filtro.
7. Se il riepilogo è acceso, dopo una riga vuota: per servizio (Servizio, Volte, Importo) e per settimana o per mese, con la riga Totale dove c'è già nel CSV. Formattati, senza filtro.

Intestazioni della tabella dettaglio: grassetto, testo chiaro, fascia `#1F2937`. Il filtro automatico copre l'intestazione e le righe dati, mancati compresi, e si ferma prima del Totale. Bloccando le righe, l'intestazione del dettaglio resta visibile insieme alle righe sopra di essa.

Larghezze di partenza, in caratteri: Data 12, Ora 8, Cane 18, Proprietario 22, Servizi 36, Durata 14, Importo 14, Pagamento 16, Stato 22, Importo mancato 20. Servizi va a capo dentro i 36.

Data è una data vera, mostrata `gg/mm/aaaa`. Ora resta testo `HH:mm`. Durata, importo e importo mancato sono numeri. Gli importi hanno il formato a due decimali, così si sommano e si filtrano.

Se il dettaglio è spento restano titolo, periodo, eventuale attività e riepilogo, senza filtro.

### 2.4 Scroll del pannello

Con uno `Sheet` aperto il dito muove solo il corpo del pannello. Il pannello arriva al massimo al 90% dell'altezza dello schermo, il corpo ha lo scroll suo (`overflow: auto`, `min-height: 0`, `overscroll-behavior: contain`) e la pagina sotto non scorre. Il dito sullo sfondo scuro non trascina la pagina. Alla chiusura la pagina è ferma dov'era. Vale per ogni `Sheet`, perché il difetto è del componente.

Se la generazione del file fallisce, resta il toast «Esportazione non riuscita».

## 3. Scheda del cane: contatti e storico

La testata (foto, nome, chiamata e WhatsApp del numero principale, «Fissa appuntamento»), i fatti, le note, i prezzi personalizzati, i tag, i campi e la galleria non cambiano.

### 3.1 Contatti

Il titolo di sezione resta. Ogni contatto è una card. Il principale ha il bordo sinistro di 4 px `var(--pri)`. Gli altri hanno il bordo sinistro di 4 px `var(--line2)`.

Dentro, da sinistra: nome in grassetto; una chip con il telefono, se c'è; una chip con il ruolo, se c'è; la chip «Principale» se `isPrimary`. A destra, se c'è il telefono, il pulsante rotondo che chiama (`tel:`), con l'aria-label `Chiama ${nome}`.

In modifica i contatti aggiuntivi usano la stessa card, con «Togli». Il contatto principale si continua a modificare dai campi del proprietario. Il pulsante «+ Contatto» resta.

### 3.2 Storico chiuso e aperto

Il titolo di sezione ha il conteggio delle righe della timeline (completati e non venuti). Zero trattamenti: niente conteggio, una card con «Nessun trattamento», e non si apre.

Con almeno una riga, la card chiusa è un pulsante `aria-expanded=false` ed etichetta «Storico». Mostra l'ultima riga nel linguaggio della timeline, senza foto e senza matita:

- data in `var(--pri)`;
- nomi dei servizi;
- per un completato, la riga di dettaglio già usata oggi (prezzo, strumenti, durata, prodotti, taglio);
- per un non venuto, «Non venuto» in `var(--bad)`, nome barrato.

Se ci sono altre righe, sotto sta «Altra 1 visita» oppure «Altre N visite». A destra il chevron.

Un tocco sulla card chiusa, o sul titolo di sezione, apre. Un tocco sul titolo richiude. Le righe aperte non sono dentro il pulsante: matita, foto e frecce del prezzo restano usabili.

Aperto, la card contiene la timeline di oggi, dalla più recente, senza duplicare l'anteprima: la prima riga è la visita che si vedeva da chiusa. Restano prezzo, strumenti, durata, prodotti, taglio, nota di chiusura, freccia rispetto alla visita precedente, matita «Correggi prezzo», foto prima e dopo, e il foglio «Prezzo in scheda».

## 4. Prove

- Giorno: un appuntamento 9:00–12:00 ha la chip alta quanto il contenuto e a sinistra 9:00, 10:00, 11:00. Un'ora vuota è una riga da 36 px e apre il nuovo appuntamento a quell'ora. Due appuntamenti sovrapposti restano affiancati e il secondo si allinea al suo inizio. Settimana e Mese non cambiano altezze.
- Export: ragione sociale «I Pelosetti» nel nome del file PDF e xlsx; vuota, il prefisso è `Groomly`. Titolo interno del PDF ancora «Riepilogo incassi». Interruttore pagamento spento: niente colonna e niente riga POS / Contanti. Acceso di default anche con una preferenza vecchia. L'xlsx ha fascia sul titolo, fascia sulle intestazioni, filtro che esclude il totale, data e importo numerici.
- Pannello: con lo Sheet aperto, far scorrere il dito non muove la pagina sotto.
- Scheda: ogni contatto è una card con striscia, chip e chiamata. Lo storico chiuso mostra l'ultima visita; aprendolo la timeline c'è tutta e l'ultima visita compare una volta sola. Senza trattamenti la card non si apre.
