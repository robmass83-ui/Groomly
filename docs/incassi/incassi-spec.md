# Groomly — Incassi: riquadro in Home + pagina Incassi + Report ed esportazione per il commercialista

Data: 2026-10-13
Stato: **design approvato** in chat: proposta **1A + 1B** (riquadro in Home + pagina Incassi, con il grafico rifatto) **e 4A + 4B** (voce in Altro + Report), più **4C/4D** (Esporta per il commercialista + PDF). Brainstorming già fatto: non ripeterlo.
La **Parte 1** (§0–§13) è la pagina Incassi; la **Parte 2** (§14–§21) è Report ed esportazione. Si implementano insieme, nell'ordine del piano (§12 + §20).
Prototipo di riferimento: `docs/incassi/incassi-prototipo.html` (aprilo nel browser: è interattivo, con dati finti realistici; contiene 1A, 1B, 4A, 4B e il foglio Esporta, che genera davvero il PDF e il file Excel/CSV).

> **Per Cursor (superpowers):** leggi tutto questo file e apri il prototipo. Poi usa `superpowers:writing-plans` per trasformare il §12 e il §20 in un piano in `docs/superpowers/plans/2026-10-13-incassi.md` ed eseguilo con `superpowers:subagent-driven-development` (un task alla volta, review tra i task). Usa `superpowers:test-driven-development` per tutta la logica pura (§3) e `superpowers:verification-before-completion` prima di dire «fatto». Valgono i vincoli di `.superpowers/sdd/global-constraints.md` (italiano, stile del codice, comandi PowerShell, `git add` con percorsi espliciti).

---

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | **Nessun dato nuovo da inserire.** Gli incassi si calcolano dagli appuntamenti che ci sono già. |
| D2 | Importo di un appuntamento = `appointment.total ?? sumPrice(appointment.services)` (stessa regola di `AppointmentPage`). |
| D3 | **Incassato** = appuntamenti `completato`. **Previsto** = `programmato` con inizio da adesso in poi. **Persi** = `non_venuto` + `disdetto` con `cancelReason === 'cliente'`. I disdetti dal salone e per decesso **non** contano come persi. Gli appuntamenti `programmato` già passati (quelli «Da chiudere» in Home) non sono né incassati né previsti: li si conta a parte (§5.7). |
| D4 | Entrata dalla **Home**: la riga dei riquadri passa da 3 a **4** (Oggi · **Incassi oggi** · Mensili · Listino). Nient'altro cambia nella Home. |
| D5 | Pagina nuova **`/incassi`**, con 3 periodi (Giorno, Settimana, Mese), grafico a barre interattivo, 3 numeri sintetici ed elenco di dettaglio. |
| D6 | **Privacy:** un occhio nasconde tutti gli importi (`•••`) sia nel riquadro della Home sia nella pagina. La scelta si ricorda (§7). |
| D7 | Settimana da lunedì (`IT_DATE.weekStartsOn: 1`), formati e locale come nel resto dell'app (`formatEuro`, `IT_DATE`). |
| D8 | Densità e stile identici all'app: `TYPE`, `SIZES`, token colore di `tokens.css`, chiaro e scuro. |

## 1. Dove sta e come ci si arriva

```
Home ── riquadro «Incassi oggi» ──▶ /incassi?periodo=giorno
                                         │
                       Giorno · Settimana · Mese  (Segmented)
                                         │
     elenco «Per giorno» (settimana) ──▶ tap su un giorno → periodo=giorno&data=AAAA-MM-GG
     elenco «Appuntamenti» (giorno) ──▶ tap → apre l'appuntamento (stesso foglio usato da Home/Agenda)
```

- Rotta: `{ path: '/incassi', element: <Guard><EarningsPage /></Guard> }` in `buildRoutes`, tra le pagine (non è un foglio).
- Query string: `periodo=giorno|settimana|mese` (default `settimana` se si arriva senza parametri, `giorno` dal riquadro della Home) e `data=AAAA-MM-GG` (giorno di riferimento, default oggi). Così il tasto indietro di sistema e i link funzionano come nell'Agenda (`parseDayParam`, `localDayKey`).
- Indietro (`Header backTo="/"`) torna alla Home.

## 2. Modello e calcoli (nessun cambio a Firestore)

Nessun campo nuovo negli appuntamenti. Un solo campo nuovo nelle impostazioni (§7).

## 3. Logica pura — `src/lib/earnings.ts` (con test, TDD)

```ts
export type EarningsPeriod = 'giorno' | 'settimana' | 'mese'

export interface Money { incassato: number; previsto: number; persi: number }

export interface EarningsBucket {          // una barra del grafico
  key: string                              // es. '2026-10-13' o '09' o '2026-10-12_2026-10-18'
  label: string                            // sotto la barra: 'Mar' · '9' · '12–18'
  sublabel: string                         // seconda riga: '13' · '' · 'sett. 3'
  title: string                            // titolo del fumetto: 'Martedì 13 · oggi'
  incassato: number
  previsto: number
  isToday: boolean                         // etichetta evidenziata
}

export interface EarningsSummary {
  periodo: EarningsPeriod
  from: Date; to: Date                     // estremi del periodo (to escluso)
  titolo: string                           // '12 – 18 ottobre' · 'Oggi · mar 13 ottobre' · 'Ottobre 2026'
  totali: Money
  completati: number                       // n. appuntamenti completati
  totaliAppuntamenti: number               // completati + previsti
  mediaACane: number | null                // incassato / completati (null se 0)
  daChiudere: { count: number; importo: number }
  confronto: { delta: number | null; etichetta: string }   // +12 → «▲ 12% vs sett. scorsa»
  buckets: EarningsBucket[]
  mediaBarre: number | null                // media dei bucket con incassato > 0 (linea tratteggiata)
  scala: { step: number; max: number }     // asse Y «bello» (§3.4)
  elenco: EarningsRow[]                    // elenco sotto i numeri (§5.8)
}
```

Funzioni (ognuna testata):

1. `appointmentAmount(a)` → `a.total ?? sumPrice(a.services)`.
2. `classify(a, now)` → `'incassato' | 'previsto' | 'perso' | 'da_chiudere' | 'escluso'` secondo D3.
3. `periodRange(periodo, ref)` → `{ from, to }`: giorno = mezzanotte→mezzanotte; settimana = lunedì→lunedì dopo; mese = 1°→1° del mese dopo.
4. `niceScale(max)` → primo `step` fra `[25, 50, 100, 200, 250, 500, 1000, 2000]` con `ceil(max/step) ≤ 4`; `max = ceil(valore/step)*step`; con valore 0 → `{ step: 25, max: 100 }`. Test: 175 → 50/200; 60 → 25/75; 845 → 250/1000.
5. `buckets(appointments, periodo, ref, now)`:
   - **giorno**: una barra **per ora di inizio che ha almeno un appuntamento** (ore vuote saltate), in ordine. Label = ora (`'9'`), title = `'Ore 9 · Zeus'` (più cani nella stessa ora: `'Ore 9 · 2 appuntamenti'`).
   - **settimana**: Lun→Sab sempre; Dom solo se ha appuntamenti. Label `'Lun'`, sublabel giorno del mese, title `'Lunedì 12'` (+ `' · oggi'`).
   - **mese**: una barra per settimana (lun–dom) tagliata ai confini del mese. Label `'1–4'`, sublabel `'sett. 1'`, title `'1 – 4 ottobre'`.
6. `compare(appointments, periodo, ref, now)`: confronta l'**incassato** con il periodo precedente **a parità di avanzamento**:
   - periodo in corso: giorno → stesso giorno della settimana prima, fino alla stessa ora; settimana → settimana prima fino allo stesso giorno e ora; mese → mese prima fino allo stesso giorno (se il mese prima è più corto, fino alla sua fine);
   - periodo passato: periodo precedente intero.
   - `delta` in % arrotondato all'intero; precedente = 0 → `null` (la pillola non compare).
   - Etichette: `'vs mar scorso'`, `'vs sett. scorsa'`, `'vs settembre'`.
7. `summarize(appointments, dogs, services, periodo, ref, now)` → `EarningsSummary` (usa le funzioni sopra).

Test minimi: i 3 periodi con i dati del prototipo (vedi §11) danno esattamente i numeri della tabella; `disdetto` dal salone non entra nei persi; un `programmato` di ieri finisce in `daChiudere`; `total` manuale vince sulla somma dei servizi; settimana a cavallo di due mesi; mese che inizia di domenica.

## 4. Riquadro in Home (1A)

In `HomePage` la riga di riquadri finali diventa `display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6` (oggi è `flex` con gap 8). Ordine: **Oggi · Incassi oggi · Mensili · Listino**. Stesso stile `tile` di adesso (padding `5px 8px 4px`, `card`, `line`, radius 12).

Contenuto del riquadro nuovo (`EarningsTile`):
- `IconTile tone="ok" size="sm"` con icona euro (lucide `Euro`, 13 px, `strokeWidth 2`).
- Valore: incassato di oggi con `formatEuro` (es. «110 €»), `tileValue` (TYPE.dogName 18, 700, tabular-nums). Se gli importi sono nascosti (§7): «•••».
- Etichetta: «Incassi oggi» (`tileLabel`).
- Se oggi ci sono previsti, sotto l'etichetta niente di più: il riquadro resta pulito. Il dettaglio sta nella pagina.
- Tutto il riquadro è un `Link` a `/incassi?periodo=giorno`, `aria-label="Incassi di oggi: 110 euro. Apri incassi"`.
- Il valore si aggiorna appena si preme «Completato» (deriva da `useAppointments`, nessuna cache).

Con 4 riquadri il testo è più stretto: verificare a 360 px di larghezza. Se «5 · 3h30» non entra, il riquadro Oggi va su due righe (valore sopra, durata sotto) **senza** ridurre il font.

> Nel mockup della Home il bottone «+» è centrato sopra la barra: è solo un ritocco di disegno, **non** fa parte di questa modifica. Lasciare la barra in basso com'è.

## 5. Pagina Incassi (1B) — `src/pages/EarningsPage.tsx`

Dall'alto in basso, padding pagina `SIZES.pagePadX`, gap verticale 9.

### 5.1 Header
`<Header title="Incassi" subtitle="Solo appuntamenti completati" backTo="/" action={…} />`. A destra un `IconButton` occhio (`Eye` / `EyeOff` lucide, 16 px), `aria-label` «Nascondi importi» / «Mostra importi», `aria-pressed`.

### 5.2 Periodo
`Segmented` (`fill`) con Giorno · Settimana · Mese, `label="Periodo"`. Cambiare periodo **mantiene la data di riferimento** (da martedì 13 in Settimana → Giorno apre martedì 13) e azzera la barra selezionata.

### 5.3 Navigazione periodo
Riga con `‹` · titolo del periodo centrato (700, TYPE.base) · `›`. Bottoni 30×30, radius 9, bordo `--line`, sfondo `--card`.
- `‹` / `›` spostano di un giorno / una settimana / un mese.
- `›` disabilitato (opacità .4) quando il periodo successivo è oltre **4 settimane** da oggi (oltre non c'è niente di utile).
- Se non si è sul periodo di oggi, accanto al titolo compare un link «Oggi» (TYPE.meta, `--pri`) che riporta al periodo corrente.
- **Swipe** orizzontale sulla card del grafico (soglia 48 px, solo se il movimento è più orizzontale che verticale) = `‹` / `›`.

### 5.4 Card principale (`Card`, padding 12)
1. Riga in alto:
   - a sinistra: etichetta «INCASSATO» (TYPE.meta, 700, `--tx3`, maiuscolo, spaziatura .04em); sotto l'importo grande **30 px / 800 / letter-spacing −.02em**; sotto «+ **65 €** ancora previsti» (11 px, `--tx2`). Se previsto = 0 la riga diventa «Nessun altro appuntamento» (periodo in corso) o sparisce (periodo passato).
   - a destra la **pillola confronto**: altezza 22, radius 999, 11 px 700. Positivo → `--ok-s` / `--ok` con «▲ 12% vs sett. scorsa»; negativo → `--bad-s` / `--bad` con «▼»; zero → `--surf` / `--tx2` con «= vs …». Senza confronto: nessuna pillola.
2. **Grafico** (§6).
3. **Legenda** sotto il grafico, separata da `border-top: 1px solid var(--line)`, 10.5 px `--tx2`: quadratino Incassato · quadratino tratteggiato Previsto · trattino «Media 128 €» (valore in 700 `--tx`) · a destra, in `--tx3`, «Tocca una barra».

### 5.5 Tre numeri
Griglia `repeat(3, minmax(0,1fr))`, gap 6, tre `Card` piccole (padding `7px 9px`): etichetta TYPE.meta 600 `--tx3`, valore 16 px 700.
- **Appuntamenti**: «3 di 5» (completati di totali) o solo «48» quando il periodo è finito.
- **Media a cane**: `formatEuro(mediaACane)` o «—».
- **Persi**: importo persi in `--bad`; tap → `Sheet` «Persi» con l'elenco (cane · data · motivo · importo). Se 0: «0 €» in `--tx3`, non toccabile.

### 5.6 Elenco di dettaglio
`SectionTitle` + `Card` con righe `Row` (min-height 40):
- **Giorno** → «Appuntamenti di oggi» (o «… di mar 13»): `HH:MM · Cane · Servizi` + stato («completato» in `--ok`, «previsto» in `--tx3`, «non venuto» / «disdetto» barrati in `--bad`) + importo a destra (completati 700 `--tx`, previsti 600 `--tx3`). Tap → apre l'appuntamento come fa `AppointmentRow` in Home.
- **Settimana** → «Per giorno»: «Lunedì 12» + «4 completati · 1 previsto» + importo (incassato; se il giorno è solo previsto, importo previsto in `--tx3`). Tap → passa a **Giorno** su quella data.
- **Mese** → «Per servizio»: nome del servizio (con `ServiceIcon` 13 px in `IconTile size="sm"`) · «18 volte» · importo incassato. Ordinato per importo decrescente. Un appuntamento con più servizi divide l'importo tra i servizi **in proporzione al loro prezzo** (se c'è un `total` manuale diverso dalla somma). Servizi `extra` raggruppati in una riga «Extra».

### 5.7 Avviso «da chiudere»
Se nel periodo ci sono appuntamenti `programmato` già passati, sopra l'elenco compare una barra `--warn-s` / `--warn`: «2 appuntamenti da chiudere · 65 € non ancora contati» con link «Chiudi ›» alla Home (sezione Da chiudere). Così i numeri non sembrano sbagliati.

### 5.8 Stati vuoti
- Periodo senza appuntamenti: card con importo «0 €», grafico con sola griglia (scala 0–100) e testo centrato «Nessun appuntamento in questo periodo» (TYPE.base, `--tx3`). Niente pillola, niente media.
- Nessun appuntamento in assoluto: stesso stato vuoto con, sotto, «Gli incassi compaiono quando segni un appuntamento come Completato».

## 6. Grafico — `src/components/earnings/EarningsChart.tsx`

Disegnato con **div e CSS** (niente librerie di grafici), come nel prototipo. Props: `{ buckets, scala, mediaBarre, selectedKey, onSelect, hidden }`.

### 6.1 Misure
- Contenitore alto **196 px**: i primi **46 px** sono riservati al fumetto, sotto c'è l'area barre (150 px).
- Asse Y a sinistra largo **30 px**: etichette `0`, `50€`, `100€`… (9.5 px, `--tx3`, allineate a destra, centrate sulla riga).
- Griglia: linea dello 0 `1px solid var(--line2)`; le altre `1px dashed` col colore `--line` (chiaro `#E6EAF0`).
- Barre in una riga `flex` con `gap: 6px`; ogni barra è un `<button>` largo `flex:1`; il rettangolo dentro è largo il 100% con **max 28 px**, centrato.
- Etichette sotto (fuori dai 196 px), margine sinistro 30 px, stessa griglia delle barre: riga 1 label (10.5 px 600 `--tx2`), riga 2 sublabel (9.5 px 500 `--tx3`). Il bucket di **oggi** ha la label in **800 `--pri`**; quello selezionato in 700 `--tx`.

### 6.2 Incassato e previsto
- **Incassato**: rettangolo pieno dal basso, `linear-gradient(180deg, #6F8BCB, var(--pri-solid))`; selezionato `linear-gradient(180deg, #4F6FC0, var(--pri-ink))`. Raggio `7px 7px 3px 3px` (se sopra c'è previsto: `0 0 3px 3px`). Altezza minima 3 px se > 0.
- **Previsto**: impilato **sopra** l'incassato, `background: repeating-linear-gradient(135deg, #EEF2FA 0 4px, #E0E8F6 4px 8px)`, bordo `1.5px dashed #8EA5D6` (senza bordo inferiore se poggia sull'incassato), raggio `7px 7px 0 0`.
- Sopra ogni barra **non selezionata** con totale > 0: il valore (`145`) in 9.5 px 600 `--tx3`, 3 px sopra.
- Scuro: incassato `#4F6FC0 → #8AA4E8`; previsto `rgba(138,164,232,.10)` a righe con bordo `rgba(138,164,232,.45)`; testi con i token.

### 6.3 Linea della media
Linea orizzontale `1.5px dashed var(--tx3)` all'altezza di `mediaBarre`, sopra le barre (`z-index 1`, `pointer-events: none`). **Nessuna etichetta sulla linea** (coprirebbe i valori delle barre): il valore sta nella legenda, «Media **128 €**». Linea e voce di legenda spariscono se nessun bucket ha incassato.

### 6.4 Selezione e fumetto (interazione chiave)
- All'apertura è selezionato il bucket di **oggi** (giorno: l'ultima ora con un completato; periodo passato: il bucket con più incasso).
- Tap su una barra → diventa selezionata; le altre vanno a **opacità .5** (transizione 150 ms). Tap sulla barra già selezionata → resta selezionata (niente stato «nessuna selezione»).
- Il **fumetto** sta sopra la barra selezionata: sfondo `#141B2B` (scuro: `#E9EDF4` con testo `#141B2B`), radius 9, padding `6px 9px`, ombra `0 8px 18px -8px rgba(20,27,43,.6)`, `white-space: nowrap`.
  - Riga 1 (11.5 px 700): `title` del bucket («Martedì 13 · oggi»).
  - Riga 2 (10 px, `#C9D6EE`): «110 € incassati · +65 € previsti» oppure «nessun incasso · +160 € previsti».
  - Allineamento: prima barra → bordo sinistro; ultima → bordo destro; le altre centrato (`left:50%; transform:translateX(-50%)`). Così non esce mai dalla card.
- Il valore sopra la barra selezionata non si mostra (lo dice il fumetto).
- `onSelect` aggiorna anche l'evidenza della riga corrispondente nell'elenco sotto (settimana: il giorno; giorno: l'appuntamento), con sfondo `--pri-s` per 1 s.
- Animazione d'ingresso: le barre crescono dal basso in 250 ms `ease-out` al cambio di periodo; con `prefers-reduced-motion` niente animazione.

### 6.5 Accessibilità
Ogni barra è un `<button>` con `aria-label` «Martedì 13: 110 euro incassati, 65 previsti» e `aria-pressed` sulla selezionata. Frecce sinistra/destra spostano la selezione quando il focus è sul grafico. Il fumetto è `aria-live="polite"`. Contrasto testi ≥ 4.5:1 su entrambi i temi.

## 7. Importi nascosti (privacy)

- Nuovo campo in `SettingsMain`: `ui: { hideAmounts: boolean }` (default `false`; aggiungere a `blankSettings`, `mergeSettings`, `settingsFromDoc`, come gli altri gruppi).
- Occhio nella pagina Incassi → inverte `hideAmounts` e salva subito.
- Con `hideAmounts = true`:
  - riquadro Home: valore «•••»;
  - pagina: importo grande, previsto, numeri, elenco, valori sopra le barre e fumetto mostrano «•••»; asse Y senza numeri (solo griglia);
  - il grafico resta visibile: le **proporzioni** non rivelano le cifre ma aiutano a capire la giornata.
- Tenere premuto (500 ms) l'importo grande lo mostra finché il dito resta giù (sbircia), senza cambiare l'impostazione.

## 8. Formati
- Importi con `formatEuro` (senza decimali se interi, «1.840 €»).
- Percentuali intere con segno grafico ▲ / ▼ / =.
- Date con `IT_DATE`: «12 – 18 ottobre», «Oggi · mar 13 ottobre», «Ottobre 2026»; settimana a cavallo di mese: «28 sett – 4 ott».

## 9. File nuovi e toccati
- Nuovi: `src/lib/earnings.ts` (+ `earnings.test.ts`), `src/pages/EarningsPage.tsx` (+ test), `src/components/earnings/EarningsChart.tsx`, `src/components/earnings/EarningsTile.tsx`.
- Toccati: `src/app/router.tsx` (rotta), `src/pages/HomePage.tsx` (4 riquadri), `src/data/local/settings.ts` + `src/lib/firebaseMap.ts` (`ui.hideAmounts`), test esistenti di Home se controllano i 3 riquadri.
- Nessuna dipendenza nuova.

## 10. Fuori scope
- Spese, margini, IVA, fatture o ricevute, metodo di pagamento (vedi §21).
- Obiettivo mensile, report per cliente, vista anno.
- Totali dentro l'Agenda (proposta 3), da valutare dopo.
- Spostare il «+» della barra in basso.

## 11. Dati di prova (gli stessi del prototipo) e risultati attesi

Oggi = **martedì 13 ottobre 2026, ore 15:05**.

| Giorno | Appuntamenti |
|---|---|
| Lun 12 | 4 completati: 40 + 35 + 45 + 25 = **145 €** |
| Mar 13 | Zeus 09:00 Bagno + taglio 55 ✔ · Micio 11:30 Bagno 25 ✔ · Iris 12:15 Bagno 30 ✔ · Luna 15:30 Bagno 30 (prog.) · Otto 17:00 Taglio 35 (prog.) |
| Mer 14 | 5 programmati, **160 €** |
| Gio 15 | 3 programmati, **90 €** · più 1 disdetto dal cliente da 35 € il 15 |
| Ven 16 | 4 programmati, **120 €** |

Attesi:
- **Giorno** (13): incassato 110 €, previsto 65 €, «3 di 5», media 37 €, persi 0 €, 5 barre (9 · 11 · 12 · 15 · 17), media barre 37 €, scala 25/75.
- **Settimana** (12–18): incassato 255 €, previsto 435 €, «7 di 21», media 36 €, persi 35 €, barre Lun–Sab, media barre 128 €, scala 50/200, selezionata Mar.
- **Mese** (ottobre): con il seed di prova del mese incassato 1.840 €, previsto 1.120 € (barre 1–4 · 5–11 · 12–18 · 19–25 · 26–31).

Il riquadro Home mostra **110 €**.

## 12. Piano a task (da espandere con `superpowers:writing-plans`)

1. **`lib/earnings.ts`** in TDD: `appointmentAmount`, `classify`, `periodRange`, `niceScale`, `buckets`, `compare`, `summarize` con i casi del §3 e del §11.
2. **Impostazione `ui.hideAmounts`**: tipo, default, merge locale e Firestore, test di round-trip.
3. **`EarningsChart`**: rendering (griglia, barre impilate, media, valori), selezione, fumetto con allineamento ai bordi, `aria`, tastiera, reduced motion. Test con Testing Library: tap su «Mercoledì 14» mostra «nessun incasso · +160 € previsti».
4. **`EarningsPage`**: header + occhio, Segmented, navigazione ‹ › + swipe + «Oggi», card principale con pillola, tre numeri, sheet Persi, elenco per periodo con i tap, avviso da chiudere, stati vuoti, query string. Rotta in `router.tsx`.
5. **`EarningsTile` in Home**: griglia a 4, link, «•••» se nascosto. Aggiornare i test di Home che contano i riquadri.
6. **Verifica**: `npm test`, `npm run build`; controllo a occhio a 360 e 390 px, chiaro e scuro, con i dati del §11 confrontando col prototipo; versione `package.json` +1 (patch).

## 13. Criteri di accettazione (Parte 1)
- [ ] In Home c'è il riquadro «Incassi oggi» con l'incassato di oggi; il resto della Home non cambia.
- [ ] Segnare un appuntamento come Completato aggiorna subito riquadro e pagina.
- [ ] La pagina mostra Giorno / Settimana / Mese con i numeri del §11.
- [ ] Il grafico ha scala, griglia, previsto tratteggiato sopra l'incassato, linea della media, valori; tocco = fumetto, le altre barre si attenuano, il fumetto non esce mai dalla card.
- [ ] ‹ › e swipe cambiano periodo; «Oggi» riporta al periodo corrente; tap su un giorno della settimana apre quel giorno.
- [ ] Occhio: importi nascosti in Home e in pagina, scelta ricordata.
- [ ] Disdetti dal salone non sono «persi»; appuntamenti passati non chiusi compaiono nell'avviso.
- [ ] Chiaro e scuro corretti, testi in italiano, build e test verdi.


---

# Parte 2 — Altro › Incassi e report (4A · 4B) ed Esporta per il commercialista (4C · 4D)

> **17 ottobre 2026.** Il testo qui sotto è la fonte originale. Da quando è stato scritto, la chiusura registra POS, Contanti e N/A e la pagina Incassi mostra già quei totali. Vale il documento aggiornato `docs/superpowers/specs/archive/2026-10-17-incassi-parte2-design.md` e il piano `docs/superpowers/plans/archive/2026-10-17-incassi-parte2.md`. In particolare il §21 non tiene più fuori il metodo di pagamento.

## 14. Decisioni (Parte 2)

| # | Regola |
|---|---|
| R1 | La voce **«Incassi e report»** sta in **Altro (Impostazioni) › Attività**, subito sotto la riga dell'attività. È il posto «da ufficio»: la pagina Incassi della Parte 1 resta quella veloce, il Report è per analisi ed esportazione. |
| R2 | Il Report usa **la stessa logica** della Parte 1 (`lib/earnings.ts`): stessi numeri ovunque. |
| R3 | **Esporta per il commercialista** = foglio (`Sheet`) aperto dal bottone «Esporta» del Report. Periodo: **Mese**, **Anno** o **Da… a…**. Formati: **PDF** (riepilogo + dettaglio, testo vero, più pagine) ed **Excel (CSV)** (una riga per appuntamento). |
| R4 | Nei file vanno **solo gli incassi dei completati**. I mancati si possono aggiungere con un interruttore (spento di default) e non entrano mai nel totale. |
| R5 | Il file è un **riepilogo**, non una fattura: lo dice il piè di pagina. |
| R6 | Niente telefono dei clienti nei file: per il commercialista basta il nome del proprietario. |

## 15. 4A — Voce in Altro (`SettingsPage`)

Nella sezione **Attività**, dopo la riga con nome e indirizzo, una riga nuova (`Row` dentro la stessa `Card`, cliccabile, `Link` a `/incassi/report`):
- `IconTile tone="ok"` con lucide `ChartLine` (15 px).
- Titolo «Incassi e report» (700) con badge «NUOVO» (9.5 px 700, bianco su `--pri-solid`, radius 999, padding `1px 6px`) per **14 giorni** dalla prima apertura dell'app aggiornata, poi sparisce (data salvata in `settings.ui.reportBadgeSince`).
- Sotto (10.5 px `--tx2`): «Ottobre **1.840 €** · ▲ 8% vs settembre» (pillola colore come in §5.4; con importi nascosti: «Ottobre ••• »).
- A destra una **sparkline** 40×18: incassato cumulato del mese, linea 2 px `--ok`, nessun asse. Poi il chevron «›».
- Sfondo della riga leggermente evidenziato: `linear-gradient(90deg, var(--pri-s) 0%, var(--card) 70%)` (solo con il badge attivo).

Anche la pagina Incassi (Parte 1) ha in fondo un link testuale «Report ed esportazione ›» (TYPE.meta 700 `--pri`, centrato) verso `/incassi/report`.

## 16. 4B — Pagina Report (`src/pages/EarningsReportPage.tsx`, rotta `/incassi/report`)

### 16.1 Header
`Header title="Incassi e report" subtitle="Ottobre 2026 · fino a oggi" backTo="/impostazioni"` con `action` = bottone **«Esporta»** (`Button size="sm"`, primario, icona `Download` 14 px) che apre il foglio §17.

### 16.2 Periodo
Riga di `FilterChip`: **Questo mese** · **Mese scorso** · **3 mesi** · **Anno** · **Scegli…**. «Scegli…» apre un foglio con: anno (‹ 2026 ›) e griglia 4×3 dei mesi (ogni cella: nome mese + incassato piccolo sotto; mesi futuri disabilitati). Il sottotitolo dell'header segue la scelta («Settembre 2026», «Lug – set 2026», «Anno 2026 · fino a oggi»).

### 16.3 Quattro numeri
`Card` con griglia 2×2 (divisori `--line`), ogni cella padding `8px 10px`: etichetta 10.5 px 600 `--tx3`, valore 18 px 800, nota 10.5 px 700.
1. **Incassato** + delta vs periodo precedente (stessa regola del §3.6; colori ▲ `--ok`, ▼ `--bad`).
2. **Appuntamenti** completati + «+ 29 in agenda» (previsti del periodo, se in corso).
3. **Media a cane** + differenza in € vs periodo precedente.
4. **Guadagno all'ora** = incassato / ore lavorate, dove ore = somma di `actualDurationMin ?? sumDuration(services)` dei completati. Nota: «59 ore lavorate». Formato «31 €/h».

### 16.4 Andamento
`Card` padding 10, titolo «Andamento del mese» (12 px 700) con legenda a destra.
- **Mese / Mese scorso**: **linea cumulativa** (SVG, larghezza 100%, alta 118): mese scelto linea 2.5 px `--pri` con area sotto `--pri` al 12%; mese precedente linea 2 px tratteggiata `4 3` `--tx3`, sugli stessi giorni del mese; assi: 3 righe orizzontali `--line` con etichette «1k / 2k / 3k» (scala `niceScale`), giorni 1 · 10 · 20 · 31 sotto. Punto finale 4 px con bordo bianco 2 px e pillola scura con il totale («1.840 €»). Tocco/scorrimento sul grafico: linea verticale e fumetto «12 ottobre · 1.320 € (sett. 1.180 €)».
- **3 mesi / Anno**: **barre per mese** con lo stesso componente `EarningsChart` della Parte 1 (bucket = mesi; label «Gen», sublabel vuota; fumetto «Settembre 2026 · 3.210 € incassati»).

### 16.5 Per servizio
`SectionTitle` «Per servizio» + `Card` padding `8px 10px`, gap 7: per ogni servizio (ordinati per importo) riga «Nome · 18 volte» + importo in grassetto a destra, sotto una barra alta 7 px radius 4 su fondo `--surf`, larga in proporzione al primo, colore `serviceTone(iconKey).ink`. Ripartizione degli importi come §5.6.

### 16.6 Clienti top e Mancati
Griglia `1.25fr 1fr`, gap 8:
- **Clienti top**: i 5 cani con più incassato nel periodo («1. Zeus … 165 €»), tap → scheda del cane.
- **Mancati**: card `--bad-s`, importo 18 px 800 `--bad`, «3 disdetti · 1 non venuto»; tap → foglio Persi (§5.5).

Con importi nascosti (§7) tutto il Report mostra «•••» come la pagina Incassi; il bottone Esporta resta attivo (il file contiene sempre gli importi).

## 17. 4C — Foglio «Esporta per il commercialista» (`src/components/earnings/ExportSheet.tsx`)

`Sheet` (si apre dal basso, alto fino all'88%), titolo «Esporta per il commercialista», sottotitolo «Solo incassi di appuntamenti completati».

Contenuto, dall'alto (gap 12, padding 14):
1. **Periodo** — `Segmented fill`: **Mese** · **Anno** · **Da… a…**. Default: **mese scorso** (il commercialista di solito chiede il mese chiuso).
2. **Selettore** — `‹` · campo centrale con il periodo e freccina («Settembre 2026 ▾», «Anno 2026 (gen – ott)», «1 lug – 30 set 2026») · `›`. Tap sul campo: Mese → griglia mesi come §16.2; Anno → elenco anni con dati; Da… a… → due campi data (`Input type="date"`), «a» non prima di «da», massimo 24 mesi.
3. **Anteprima numeri** — box `--pri-s` / `--pri-ink`, radius 12, padding `10px 12px`, griglia 3 colonne: Incassato · Appuntamenti · Giorni lavorati. Si aggiorna subito a ogni cambio.
4. **Formato** — due card affiancate (radius 12, padding `9px 10px`), selezione = bordo 2 px `--pri` + alone `0 0 0 3px var(--focus)`:
   - **PDF** (icona quadrata «PDF» `--bad-s`/`--bad`) «Riepilogo + dettaglio»;
   - **Excel** (icona «XLS» `--ok-s`/`--ok`) «Una riga per appuntamento» (file `.csv` che Excel apre direttamente).
5. **Cosa includere** — card con `Toggle` per riga (min-height 44):
   - **Riepilogo** — «Totale, giorno per giorno, per servizio» (Anno: «mese per mese»). Default sì. (Nel CSV aggiunge in fondo le righe di totale per mese/servizio.)
   - **Dettaglio appuntamenti** — «Data, ora, cane, proprietario, servizi, importo». Default sì.
   - **Dati dell'attività** — «Nome, P. IVA, indirizzo in intestazione». Default sì.
   - **Mancati incassi** — «Non venuti e disdetti dal cliente». Default no.
   Almeno uno fra Riepilogo e Dettaglio deve restare acceso (l'altro toggle si blocca).
6. **Avvisi** (sopra il footer, solo se servono):
   - appuntamenti del periodo ancora da chiudere → barra `--warn-s`: «3 appuntamenti di settembre non sono chiusi: non saranno nel file» + «Chiudi ›»;
   - P. IVA vuota con «Dati dell'attività» acceso → «Manca la P. IVA · Aggiungi ›» (apre il dialog Attività);
   - periodo senza incassi → «Nessun incasso in questo periodo» e bottoni disabilitati.

Footer (`SIZES.sheet.footer`, ombra `--sh-foot`), griglia `1fr 1.4fr`:
- **Salva** (secondario, icona `Download`) → scrive in `Documents/Groomly/` (fallback: condividi) e toast «Salvato in Documenti/Groomly».
- **Invia al commercialista** (primario, icona `Share2`) → menu di condivisione di Android (email, WhatsApp, Drive…).
- Durante la generazione: bottoni disabilitati, testo «Preparo il PDF…», poi il foglio resta aperto (così si può inviare anche l'altro formato).

Le ultime scelte (periodo tipo, formato, interruttori) si ricordano in `settings.export = { formato, periodo, include }`.

## 18. 4D — Contenuto dei file

Nomi: `Groomly_Incassi_2026-09.pdf`, `Groomly_Incassi_2026.csv`, `Groomly_Incassi_2026-07-01_2026-09-30.pdf`.

### 18.1 PDF (A4 verticale, `jspdf` + `jspdf-autotable`, testo vero e selezionabile)
Margini 14 mm, font Helvetica, corpo 8.5 pt, importi con 2 decimali («1.705,00 €»).
1. **Intestazione** (prima pagina): titolo «Riepilogo incassi · Settembre 2026» 16 pt bold; sotto «Periodo: 1 – 30 settembre 2026 · solo appuntamenti completati». A destra (se «Dati dell'attività»): nome in grassetto, «P. IVA …», indirizzo, telefono. Linea 1.5 pt `#3A5BA0` sotto.
2. **Quattro box**: Totale incassato · Appuntamenti · Giorni lavorati · Media per appuntamento.
3. **Riepilogo** (se acceso), due tabelle affiancate:
   - «Per servizio» (Servizio · Volte · Importo + riga Totale; «Volte» può superare gli appuntamenti perché un appuntamento può avere più servizi);
   - Mese: «Per settimana» (Settimana · App. · Importo). Anno o intervallo lungo: «Per mese» (Mese · App. · Importo + Totale) a tutta larghezza.
4. **Dettaglio appuntamenti** (se acceso): colonne Data · Ora · Cane · Proprietario · Servizi · Importo; righe alternate leggere; **intestazione ripetuta su ogni pagina**; nell'export annuale una riga di **subtotale per mese** in grassetto; in fondo «Totale periodo».
5. **Mancati incassi** (se acceso): tabella a parte (Data · Cane · Proprietario · Motivo · Importo non incassato), con nota «Non inclusi nel totale».
6. **Piè di pagina** su ogni pagina: «Generato con Groomly il 13/10/2026 alle 21:40 · documento riepilogativo, non è una fattura» a sinistra, «Pagina 1 di 3» a destra.

Riferimento visivo: artboard **4D** della tela e il PDF generato dal prototipo.

### 18.2 Excel (CSV)
- UTF-8 **con BOM**, separatore **`;`**, decimali con **virgola**, fine riga CRLF, date `gg/mm/aaaa`, testo tra virgolette quando contiene `;` `"` o a capo (virgolette raddoppiate).
- Righe di intestazione (se «Dati dell'attività»): `Attività;I Pelosetti`, `P. IVA;…`, `Periodo;01/09/2026 - 30/09/2026`, riga vuota.
- Tabella: `Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Stato` — una riga per appuntamento completato, ordinate per data e ora; servizi separati da `, `.
- Con «Mancati»: righe aggiuntive con Stato `non venuto` / `disdetto dal cliente`, Importo `0,00` e una colonna in più `Importo mancato (€)`.
- In fondo `;;;;;;Totale;3210,00`. Con «Riepilogo»: riga vuota e poi le tabelle «Per servizio» e «Per mese» / «Per settimana» nello stesso formato.

### 18.3 Codice
- `src/lib/earningsExport.ts` (logica pura, TDD): `exportRange(kind, ref | from/to)`, `buildExportData(appointments, dogs, settings, range, include)` → `{ header, summary, perService, perWeekOrMonth, rows, missed, total }`, `toCsv(data)` → `string`, `exportFileName(range, formato)`.
- `src/lib/earningsPdf.ts`: `toPdf(data)` → `Blob` con jsPDF + autotable (test con mock: titolo, numero tabelle, totale, piè di pagina su ogni pagina).
- Condivisione e salvataggio: helper comune `src/lib/shareFile.ts` (`shareBlob(blob, name, mime)` con `Filesystem` in `Cache` + `Share.share`; `saveBlob(...)` in `Documents/Groomly` con fallback a `shareBlob`). Se l'helper esiste già dal lavoro sul listino, **riusarlo**.
- Dipendenze: `jspdf` (forse già presente dal listino), **`jspdf-autotable`**, `@capacitor/share` (+ `npx cap sync android`).

## 19. Accessibilità e stati (Parte 2)
- Ogni grafico ha `role="img"` con `aria-label` descrittivo; i chip periodo sono `radio`.
- Generazione file: `aria-busy` sul footer, toast di esito («Inviato», «Salvato in Documenti/Groomly», «Esportazione non riuscita»).
- Report senza dati: numeri «0 €», grafico vuoto con «Nessun incasso in questo periodo», sezioni Per servizio / Clienti / Mancati nascoste.

## 20. Piano a task (Parte 2, dopo il §12)
7. **Voce in Altro (4A)** con sparkline e badge 14 giorni; link «Report ed esportazione» in fondo alla pagina Incassi.
8. **`EarningsReportPage` (4B)**: chip periodo + «Scegli…», 4 numeri (incluso €/h), linea cumulativa interattiva, barre per mese (3 mesi/Anno) riusando `EarningsChart`, per servizio, clienti top, mancati. Rotta `/incassi/report`.
9. **`lib/earningsExport.ts`** in TDD: intervalli, dati, CSV (BOM, `;`, virgola, escape, totali, mancati), nomi file.
10. **`lib/earningsPdf.ts`** con jspdf-autotable: intestazione, box, tabelle, subtotali annuali, mancati, piè di pagina con numerazione.
11. **`ExportSheet` (4C)** + `shareFile.ts`: selettori periodo, anteprima numeri, formati, interruttori, avvisi, Salva / Invia, scelte ricordate in `settings.export`.
12. **Verifica**: export di settembre (mese) e del 2026 (anno) in PDF e CSV con i dati di prova; aprire il CSV in Excel/Google Fogli (colonne giuste, numeri come numeri); PDF su 2+ pagine con intestazione tabella ripetuta; `npm test`, `npm run build`, prova su Android con condivisione via email.

## 21. Fuori scope (Parte 2) e idee dopo
- Fatture, corrispettivi telematici, IVA: Groomly non sostituisce il registratore di cassa.
- **Metodo di pagamento** (contanti / POS / bonifico): utile al commercialista; se serve, si aggiunge come campo nella chiusura dell'appuntamento e come colonna nei file in una versione successiva.
- Invio automatico mensile via email.

## 22. Criteri di accettazione (Parte 2)
- [ ] In Altro › Attività c'è «Incassi e report» con mese corrente, delta e sparkline.
- [ ] Il Report mostra gli stessi numeri della pagina Incassi per lo stesso periodo, più €/h, per servizio, clienti top, mancati; Mese / Mese scorso / 3 mesi / Anno / Scegli funzionano.
- [ ] Esporta: si sceglie Mese, Anno o Da… a…; anteprima numeri corretta; PDF ed Excel generati, salvati e inviati dal telefono.
- [ ] Il PDF ha intestazione con P. IVA, riepiloghi, dettaglio su più pagine con intestazione ripetuta, subtotali per mese nell'annuale, piè di pagina «Pagina X di Y».
- [ ] Il CSV si apre in Excel italiano con colonne separate, importi numerici e totale giusto.
- [ ] I mancati non entrano mai nei totali; appuntamenti non chiusi segnalati prima dell'export.
