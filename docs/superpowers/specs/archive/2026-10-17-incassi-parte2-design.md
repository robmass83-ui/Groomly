# Groomly — Incassi, Parte 2: report e export per il commercialista

Data: 2026-10-17
Stato: aggiorna la Parte 2 di `docs/incassi/incassi-spec.md` (§14–§22) dopo la 1.1.45.

La Parte 1 è già in app (pagina `/incassi`, `src/lib/earnings.ts`). Questo documento è la Parte 2: la voce in Impostazioni, la pagina Report, il PDF e il CSV. Dove questo testo e la fonte del 13 ottobre dicono cose diverse, vale questo.

## 1. Cosa è cambiato dopo la fonte

La fonte metteva il metodo di pagamento fuori da questo lavoro (§21). Non è più vero.

- `Appointment.paymentMethod` è `'pos' | 'contanti' | 'na'`, oppure assente.
- Un completato senza metodo è **Non indicato**: i soldi restano nell'incassato. Sono le chiusure fatte prima della 1.1.45.
- **N/A** è un completato a prezzo 0 (omaggio). Non è un mancato incasso. Il conteggio sta in `pagamenti.offerti`. L'importo è 0, quindi non alza l'incassato.
- `summarize` calcola già `pagamenti.pos`, `pagamenti.contanti`, `pagamenti.nonIndicato` e `pagamenti.offerti`. POS + Contanti + Non indicato = incassato.
- L'importo di una visita è `total` se c'è, altrimenti la somma dei servizi (`appointmentAmount`). Il prezzo cambiato in chiusura è quello che vedono il report e il commercialista.
- La nota di chiusura (`adjustmentNote`) non entra nel report né nei file.
- Il telefono del cliente non entra nei file. Il telefono dell'attività, se i dati attività sono accesi, sta solo nell'intestazione del PDF.
- In interfaccia gli importi usano `formatEuro` (`€ 1.840`). Nei file gli importi hanno sempre due decimali e la virgola (`1840,00` nel CSV, `1.840,00 €` nel PDF).
- Con l'occhio chiuso (`settings.ui.hideAmounts`) il report mostra `•••` e i conteggi restano. Il file contiene sempre le cifre vere.

## 2. Decisioni

| # | Decisione |
|---|---|
| R1 | La voce **Incassi e report** sta in Impostazioni › Attività, nella stessa card, sotto la riga dell'attività. Apre `/incassi/report`. |
| R2 | Il report e i file usano `classify`, `appointmentAmount` e la stessa ripartizione servizi di `summarize`. Per un mese intero i numeri coincidono con la pagina Incassi su quel mese. |
| R3 | Il report mostra anche POS, Contanti e, solo se il conteggio è maggiore di zero, «Non indicato» e «Offerti (N/A)», con le stesse parole della pagina Incassi. |
| R4 | **Esporta per il commercialista** è un `Sheet` aperto da **Esporta** sul report. Periodo: Mese, Anno o Da… a…. Formati: PDF e CSV. |
| R5 | Nei totali entrano solo i completati. I mancati (non venuto, disdetto dal cliente) si aggiungono con un interruttore spento di default e non entrano nel totale. Disdetto dal salone e deceduto restano esclusi, come in Parte 1. |
| R6 | Il file è un riepilogo, non una fattura. Lo dice il piè di pagina. |
| R7 | Niente fatture, corrispettivi, IVA, invio email automatico. |

## 3. Voce in Impostazioni

Nella card Attività, seconda riga, link a `/incassi/report`:

- `IconTile` tono `ok`, icona lucide `ChartLine`.
- Titolo **Incassi e report**. Badge **NUOVO** per 14 giorni, giorno di partenza compreso, poi sparisce.
- La data di partenza è `settings.ui.reportBadgeSince`, giorno locale `aaaa-mm-gg`. Se manca, la prima apertura di Impostazioni la scrive e non la riscrive più.
- Sotto: mese corrente, incassato di quel mese e, se c'è, il delta della pagina Incassi (`vs settembre`, ▲ in `--ok`, ▼ in `--bad`). Con importi nascosti: solo il nome del mese e `•••`, senza percentuale.
- A destra, sparkline 40×18 dell'incassato cumulato del mese fino a oggi (linea 2 px `--ok`, nessun numero), poi il chevron. La sparkline resta anche con gli importi nascosti: non ha cifre.
- Sfondo `linear-gradient(90deg, var(--pri-s) 0%, var(--card) 70%)` solo mentre il badge è visibile.

In fondo alla pagina Incassi, un link centrato **Report ed esportazione ›** verso `/incassi/report`.

## 4. Pagina Report

Rotta `/incassi/report`. `Header` titolo **Incassi e report**, `backTo="/impostazioni"`, azione **Esporta** (bottone piccolo, primario, icona `Download`).

### 4.1 Periodo

Chip in un gruppo «Periodo»: **Questo mese**, **Mese scorso**, **3 mesi**, **Anno**, **Scegli…**. Si riusa `FilterChip` (`aria-pressed`), senza cambiare il componente condiviso.

- Questo mese: dal 1° a fine mese. Sottotitolo `Ottobre 2026 · fino a oggi` se il mese è in corso, altrimenti `Ottobre 2026`.
- Mese scorso: il mese precedente, titolo `Settembre 2026`.
- 3 mesi: dal 1° del mese di due mesi fa fino a fine mese corrente. Titolo `ago – ott 2026` (abbreviazione di date-fns, senza punto).
- Anno: 1 gennaio – 1 gennaio dell'anno dopo. Se l'anno è in corso, sottotitolo `Anno 2026 · fino a oggi`, altrimenti `Anno 2025`.
- Scegli… apre un foglio: anno con ‹ › e griglia 4×3. Ogni cella ha il nome del mese e l'incassato sotto (nascosto se l'occhio è chiuso). I mesi futuri sono disabilitati. Il titolo segue il mese scelto, con `· fino a oggi` solo se è il mese corrente.

### 4.2 Quattro numeri

Griglia 2×2. Il confronto di un mese usa `compare(..., 'mese', ...)`, così la scritta è la stessa della pagina Incassi. Per 3 mesi l'etichetta è `vs i 3 mesi prima`. Per l'anno è `vs anno scorso`. Il periodo di confronto ha la stessa lunghezza e, se il periodo scelto è in corso, si ferma allo stesso punto (stessa idea di `compare`).

1. **Incassato** e delta in percentuale. Se il confronto è 0, il delta non si mostra.
2. **Appuntamenti**: numero dei completati. Se ce ne sono di previsti, sotto `+ 29 in agenda`. I previsti non sono nell'incassato.
3. **Media a cane**: incassato diviso i completati, arrotondata all'euro. Sotto, la differenza in euro rispetto al periodo di confronto (`+ € 4` / `− € 4`). Se un lato non ha completati, la differenza non si mostra. I N/A entrano nel divisore, come già fa `mediaACane`.
4. **Guadagno all'ora**: incassato diviso le ore dei completati. I minuti sono `actualDurationMin` se è un numero ≥ 0, altrimenti la somma delle durate dei servizi. Anche i N/A contano nel tempo. Se i minuti sono 0, il valore è `—`. Sotto, `59 ore lavorate` se le ore sono intere, altrimenti la durata già usata in chiusura (`1 h 30`) più `lavorati`. Formato del valore: `31 €/h`.

### 4.3 Pagamenti

Sotto i quattro numeri, gli stessi due riquadri della pagina Incassi: **POS** e **Contanti**, con cifra e numero di cani. Sotto, in piccolo, `Non indicato € …` e `Offerti (N/A) N` solo se il conteggio è > 0, separati da ` · `. Con l'occhio chiuso le cifre sono `•••` e i conteggi restano.

### 4.4 Andamento

- **Questo mese**, **Mese scorso** e **Scegli…**: linea cumulativa SVG, alta 118. Mese scelto: linea 2.5 px `--pri` e area `--pri` al 12%. Mese precedente: linea 2 px tratteggiata `--tx3`, allineata sul numero del giorno. Se il mese prima è più corto, i giorni in più non hanno il tratto precedente. I giorni futuri del mese in corso non hanno il tratto corrente. Assi con `niceScale`. Tocco o trascinamento: linea verticale e fumetto `12 ottobre · € 1.320 (set. € 1.180)`. L'abbreviazione del mese prima è quella di date-fns, senza punto. Con importi nascosti il fumetto dice `importi nascosti` e non legge le cifre.
- **3 mesi** e **Anno**: barre per mese con `EarningsChart`. Un mese a zero resta, se nel periodo c'è almeno un incassato o un previsto. Se non c'è niente, al posto del grafico c'è `Nessun incasso in questo periodo`.

### 4.5 Per servizio, clienti, mancati

- **Per servizio**: stessi importi ripartiti di `serviceRows` (quota sul prezzo di riga; gli extra in un solo gruppo). Barra alta 7 px, colore `serviceTone(iconKey).ink`. Ordine per importo.
- **Clienti top**: fino a 5 cani con incassato > 0, il più alto prima. Tap su `/animali/:id`.
- **Mancati**: card `--bad-s`, importo dei persi, `3 disdetti · 1 non venuto`. Tap: foglio con le stesse righe persi della Parte 1.

Se una di queste tre liste è vuota, quella sezione non si disegna. I quattro numeri restano, a zero se serve.

`role="img"` sul grafico, con un `aria-label` che non legge le cifre quando sono nascoste.

## 5. Foglio Esporta

`Sheet` titolo **Esporta per il commercialista**, sottotitolo **Solo incassi di appuntamenti completati**.

1. **Periodo**: `Segmented` **Mese** · **Anno** · **Da… a…**. All'apertura, se non c'è una scelta ricordata, è Mese e il mese è quello scorso (il commercialista chiede il mese chiuso).
2. **Selettore** ‹ valore ›. Mese: griglia come Scegli…. Anno: elenco degli anni dal primo appuntamento a quest'anno; senza appuntamenti, solo l'anno corrente. Da… a…: due `input type="date"`. La fine non può precedere l'inizio. Il tratto massimo è 24 mesi: se è più lungo, la fine si accorcia e compare `Massimo 24 mesi`.
3. **Anteprima**: Incassato, Appuntamenti, Giorni lavorati. Un giorno lavorato è un giorno di calendario con almeno un completato. Si aggiorna subito.
4. **Formato**: **PDF** («Riepilogo + dettaglio») e **Excel** («Una riga per appuntamento», file `.csv`). Scelto: bordo 2 px `--pri` e alone `0 0 0 3px var(--focus)`.
5. **Cosa includere**, con `Toggle`:
   - **Riepilogo** — `Totale, giorno per giorno, per servizio`. In un anno o in un intervallo: `mese per mese`. Default acceso.
   - **Dettaglio appuntamenti** — `Data, ora, cane, proprietario, servizi, importo, pagamento`. Default acceso.
   - **Dati dell'attività** — `Nome, P. IVA, indirizzo in intestazione`. Default acceso.
   - **Mancati incassi** — `Non venuti e disdetti dal cliente`. Default spento.
   - Riepilogo e Dettaglio non possono essere entrambi spenti: l'ultimo acceso non si spegne.
6. Avvisi, solo se servono:
   - completati mancanti nel periodo (`da_chiudere`): `3 appuntamenti di settembre non sono chiusi: non saranno nel file`.
   - P. IVA vuota con Dati dell'attività acceso: `Manca la P. IVA`.
   - nessun incasso: `Nessun incasso in questo periodo` e Salva / Invia disabilitati.

Footer: **Salva** e **Invia al commercialista**. Durante la generazione i bottoni sono disabilitati, `aria-busy`, testo `Preparo il PDF…` o `Preparo il CSV…`. Il foglio resta aperto. Toast: `Salvato in Documenti/Groomly`, `Scegli dove salvarlo` se il salvataggio cade sulla condivisione, `Esportazione non riuscita` se fallisce per un motivo diverso dall'annullamento.

Sul telefono, Salva scrive in `Documents/Groomly/`. Se non può, apre la condivisione. Nel browser, Salva scarica il file. Invia usa la condivisione, titolo `Incassi Groomly`.

Le scelte ricordate stanno in `settings.exportPrefs`: `formato` (`pdf` | `csv`), `periodo` (`mese` | `anno` | `intervallo`), `include` con i quattro booleani. Un valore estraneo torna al default. Se riepilogo e dettaglio arrivano entrambi falsi, il riepilogo si riaccende. Il mese o l'anno precisi non si ricordano: si ricorda solo il tipo di periodo.

## 6. File

Nomi: `Groomly_Incassi_2026-09.pdf`, `Groomly_Incassi_2026.csv`, `Groomly_Incassi_2026-07-01_2026-09-30.pdf`.

Il proprietario è il nome del contatto principale (`contacts` con `isPrimary`, altrimenti il primo), se è vuoto `dog.contact.name`. Mai il telefono.

La colonna pagamento è `POS`, `Contanti`, `N/A` o `Non indicato`. Sui mancati è vuota.

### 6.1 PDF

A4 verticale, `jspdf` già nel progetto più `jspdf-autotable`. Testo vero. Margini 14 mm, Helvetica, corpo 8.5 pt.

1. Intestazione: `Riepilogo incassi · Settembre 2026`. Sotto, il periodo e `solo appuntamenti completati`. Se i dati attività sono accesi: nome, `P. IVA`, indirizzo, telefono dell'attività. Linea sotto.
2. Quattro box: Totale incassato, Appuntamenti, Giorni lavorati, Media per appuntamento.
3. Una riga pagamenti: POS, Contanti e, se il conteggio è > 0, Non indicato e Offerti (N/A). La somma POS + Contanti + Non indicato è il totale. Gli omaggi non si sommano un'altra volta.
4. Riepilogo, se acceso: tabella Per servizio (Servizio, Volte, Importo, riga Totale). Nel mese, anche Per settimana. In anno o intervallo, Per mese a tutta larghezza. Le volte possono superare gli appuntamenti.
5. Dettaglio, se acceso: Data, Ora, Cane, Proprietario, Servizi, Importo, Pagamento. Intestazione ripetuta su ogni pagina. Nell'anno e nell'intervallo, riga di subtotale a ogni cambio mese. In fondo `Totale periodo`.
6. Mancati, se accesi: Data, Cane, Proprietario, Motivo, Importo non incassato, con la nota `Non inclusi nel totale`.
7. Piè di pagina su ogni pagina: `Generato con Groomly il 17/10/2026 alle 09:40 · documento riepilogativo, non è una fattura` e `Pagina 1 di 3`.

### 6.2 CSV

UTF-8 con BOM, separatore `;`, decimali con virgola e due cifre, senza separatore delle migliaia, fine riga CRLF, date `gg/mm/aaaa`. Un campo che contiene `;`, `"` o un a capo va tra virgolette, e le virgolette interne si raddoppiano.

Se i dati attività sono accesi: `Attività;…`, `P. IVA;…`, `Periodo;01/09/2026 - 30/09/2026`, riga vuota. La P. IVA vuota resta una riga vuota.

Tabella, una riga per completato, ordinate per data e ora:

`Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Pagamento;Stato`

I servizi sono uniti da `, `. Lo stato dei completati è `completato`.

La riga totale ha `Totale` nella colonna Durata e l'importo nella colonna Importo. Le altre celle sono vuote: `;;;;;Totale;145,00;;`.

Con i mancati si aggiunge la colonna `Importo mancato (€)`. Quelle righe hanno Importo `0,00`, stato `non venuto` o `disdetto dal cliente`, pagamento vuoto, e l'importo non incassato nella colonna nuova. Non cambiano la riga Totale.

Con il riepilogo, dopo una riga vuota: tabella `Servizio;Volte;Importo (€)` e poi `Settimana;App.;Importo (€)` oppure `Mese;App.;Importo (€)`.

## 7. Codice

- `src/lib/earnings.ts`: intervalli del report, riepilogo di un intervallo, serie cumulativa, barre dei mesi, punti della sparkline, badge dei 14 giorni. `summarize` non cambia forma.
- `src/lib/earningsExport.ts`: intervallo di export, dati, CSV, nome file. Logica pura.
- `src/lib/earningsPdf.ts`: `toPdf` → `Blob`.
- `src/lib/shareFile.ts`: le funzioni di cache, Documenti e condivisione che oggi stanno dentro `PriceSheetExportPage`. Il listino le riusa e non cambia i testi (`Listino prezzi`, `Salvato in Documenti/Groomly`, `Scegli dove salvarlo`). L'export le chiama con il titolo `Incassi Groomly`.
- `src/pages/EarningsReportPage.tsx`, `src/components/earnings/ExportSheet.tsx`, `src/components/earnings/CumulativeChart.tsx`.
- `settings.ui.reportBadgeSince` e `settings.exportPrefs` si leggono e si scrivono in locale e in `settingsFromDoc` / `settingsToDoc`. Un documento vecchio resta valido: badge assente, preferenze ai default.

Nessuna collezione Firestore nuova. `jspdf` e i plugin Capacitor di file e condivisione ci sono già. Si aggiunge solo `jspdf-autotable`.

## 8. Fuori da questo lavoro

Fatture, corrispettivi, IVA, registratore di cassa, invio email automatico, pagamenti divisi fra POS e contanti, la nota di chiusura dentro il file.

## 9. Accettazione

- In Impostazioni › Attività c'è Incassi e report, con il mese corrente, il delta e la sparkline. Il badge NUOVO dura 14 giorni.
- Per lo stesso mese, incassato, POS, Contanti, Non indicato, Offerti, completati, previsti e persi sono identici alla pagina Incassi.
- Mese, mese scorso, 3 mesi, anno e Scegli funzionano. L'€/h usa il tempo vero della chiusura.
- Il PDF e il CSV si salvano e si inviano. Il CSV si apre in Excel italiano con le colonne separate. Il PDF ha più pagine, l'intestazione della tabella ripetuta e `Pagina X di Y`.
- I mancati non entrano nei totali. Gli appuntamenti non chiusi sono avvisati prima dell'export. Il telefono del cliente non c'è nel file. N/A è una riga a 0, non un mancato.
