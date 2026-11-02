# Medie «Agenda e incassi» (audit 18-22) — design

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione Medie → «Agenda e incassi», punti 18-22. Dettagli: `test-results/audit/findings/agenda.md`, `visivo.md`.

## Perché
L'agenda è lo strumento di ogni giorno: una visita lunga che passa la mezzanotte non deve sparire, un errore di tocco su «Completato», «Disdetto» o «Non venuto» si deve poter disfare, e con il Salone bisogna sapere chi fa cosa. Statistiche e grafico degli incassi devono dire numeri comprensibili e leggibili.

## Cosa cambia

### 18 — Visite oltre la mezzanotte
- Giorno d'inizio: la griglia si allunga fino alle 24:00 e il blocco arriva in fondo (`gridBounds` in `src/lib/calendarView.ts` deve considerare una fine in un giorno successivo come 24:00; `daySegments` in `calendarLayout.ts` non deve scartare il gruppo).
- Giorno dopo: la parte restante compare dalle 00:00 fino alla fine reale, con lo stesso aspetto della visita (stesso tocco: apre la visita). Vale per le viste Giorno e Settimana; nella vista Mese la visita conta solo nel giorno d'inizio (come oggi).
- L'intestazione del giorno dopo non conta la visita una seconda volta (né cani né durata).

### 19 — Chi fa la visita (solo piano Salone)
- Con il Salone attivo e almeno un membro attivo: su ogni visita del Calendario (Giorno e Settimana) compaiono le iniziali della persona assegnata (`assigneeOf`, `src/lib/salonAccess.ts`; nome da `rosterLabel`); nella vista Mese no.
- Filtro persona «Tutti · <nome> · …» in Calendario e in Incassi (e quindi nel grafico e nei totali di Incassi), solo per titolare e socio. Il collaboratore vede già solo le sue visite (`visibleAppointments`) e non ha il filtro.
- La scelta del filtro si ricorda sul telefono (`localStorage`, per salone), torna «Tutti» se la persona non c'è più.
- Report, Statistiche e Home: invariati (non obiettivo).

### 20 — Rimettere in programma una visita
- In «Altre azioni» della visita (`src/pages/AppointmentPage.tsx`, Sheet `menu`) compare «Rimetti in programma» per una visita `completato`, `disdetto` o `non_venuto`, con conferma: «Rimettere la visita in programma? » + per una completata « L'incasso registrato verrà tolto.».
- Effetto: `status: 'programmato'`; per una completata si tolgono `total`, `paymentMethod`, `actualDurationMin`, `chiusoIl`, `adjustmentNote`; per una disdetta si toglie anche il motivo della disdetta. Restano servizi, note, foto, assegnatario, orario.
- Chi: titolare e socio su tutte; il collaboratore solo su disdette e non venute (le regole gli vietano di cambiare una visita completata, coerente con il gruppo B: per una completata il menu non gli mostra la voce).
- Il «Annulla» di 5 secondi resta com'è.

### 21 — Pagina Statistiche
- Tre schede con lo stile di quelle di Incassi (`src/components/piano/SchedeStatistiche.tsx`, `src/pages/StatistichePage.tsx`):
  - «€ all'ora» — importo con `euro(lingua, …)`, sottotitolo «visite completate»;
  - «Previsione del mese» — incassato del mese in corso + visite ancora in programma nel mese × (1 − quota media di non venuti), sottotitolo con il nome del mese;
  - «Clienti in ritardo» — numero di clienti, sottotitolo «oltre il loro ritmo abituale».
- `previsione` in `src/lib/statistiche.ts` prende il periodo (inizio e fine del mese in corso); il tasso di non venuti resta calcolato su tutto lo storico.
- «Nascondi importi» (`settings.ui.hideAmounts`) acceso: le due schede in euro mostrano «•••».
- Il link «Statistiche» in Report diventa una riga come le altre della pagina (oggi è un link blu grezzo, `EarningsReportPage.tsx:204`).

### 22 — Fumetto del grafico Incassi
- Il fumetto della barra scelta (`EarningsChart.tsx` ~98-112) ha una larghezza propria (contenuto, massimo la larghezza del grafico), è centrato sulla barra ma spostato per non uscire dai bordi del grafico, va su al massimo due righe senza spezzare le parole, e non copre il totale sopra il grafico (si appoggia sopra la barra dentro l'area del grafico). Leggibile a 320, 360 e 390 px.

## Approcci considerati
- 18: **allungare la griglia fino a mezzanotte e mostrare il resto il giorno dopo** (scelta) contro mostrare tutta la visita solo nel giorno d'inizio con una griglia oltre le 24 (fuorviante: le ore dopo mezzanotte sono del giorno dopo).
- 19: **iniziali sulla visita + filtro persona** (scelta) contro colori per persona (servirebbe una tavolozza e una legenda; le iniziali bastano e si leggono anche in bianco e nero).
- 20: **voce in «Altre azioni» con conferma, incasso tolto per una completata** (scelta di Roberto) contro tenere l'incasso nascosto finché si richiude (dati incoerenti: una visita in programma con un importo).
- 21, 22: una sola strada sensata.

## Non obiettivi
- Nessun filtro persona in Home, Report, Statistiche.
- Nessun cambio alle regole Firestore né alle functions.
- I premi fedeltà già usati nella chiusura non tornano disponibili riaprendo la visita; una mail «pronto» già spedita resta spedita.

## Decisioni di Claude (da controllare)
- Vista Mese: la visita oltre mezzanotte conta solo nel giorno d'inizio.
- Il filtro persona si ricorda per telefono e per salone.
- Il collaboratore non può rimettere in programma una visita completata (regole) ma sì una disdetta o non venuta.
- Premio fedeltà e mail «pronto» non si annullano riaprendo.
- Previsione: mese di calendario in corso; tasso di non venuti su tutto lo storico.

## Lasciato al costruttore
- Testi esatti in en/es; aspetto delle iniziali (pastiglia piccola come i chip di Team).
- Test: unità per `gridBounds`/`daySegments` con fine il giorno dopo e per la parte del giorno dopo, per il filtro persona (Calendario e Incassi), per «Rimetti in programma» (campi tolti, ruoli), per `previsione` con periodo e per le schede con `hideAmounts`, per il fumetto (larghezza e bordi con un layout misurato o un calcolo puro della posizione); verifica nel browser sull'emulatore a 320/360/390 px.

## Rilascio
Solo APK.
