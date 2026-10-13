# Groomly — Agenda: altezza dinamica + mensili fissati

Data: 2026-10-13  
Stato: design approvato in chat (opzione A mensili; altezza = max(durata, contenuto) con griglia espansa); in attesa della lettura di questo file.

Due fix collegati da UX, non da modello dati: (1) card agenda giorno/settimana che non tagliano il contenuto; (2) contatori e liste mensili Home/Avvisi che trattano «prenotato» come «fissato» anche senza storico completato.

## 0. Decisioni

| # | Regola |
|---|---|
| M1 | Mensile attivo senza `completato` ma con almeno un `programmato` futuro → `group: 'fissato'` (non più `nuovo`). |
| M2 | Mensile attivo senza `completato` e senza `programmato` futuro → resta `nuovo`. |
| M3 | Con almeno un `completato`, la logica attuale non cambia (`fissato` / `in_ritardo` / `in_scadenza` / nascosto fuori finestra). |
| M4 | Home tile `X/Y` e Avvisi `X/Y fissati` + filtro «Fissati» usano la stessa classificazione aggiornata. |
| A1 | In vista giorno (e timeline settimana), altezza card = `max(altezza da durata, altezza necessaria al contenuto)`. |
| A2 | Se il contenuto richiede più px della durata, la fascia oraria del giorno si espande in modo dinamico: gli appuntamenti successivi scendono, niente overlap né `overflow: hidden` sul testo. |
| A3 | Layout card: preferire contenuto completo (nome, servizi, note) quando c’è spazio; non troncare note/chip per durata breve. |

## 1. Mensili — root cause e fix

### Root cause

`monthlyStatus` oggi, se manca `lastCompleted`, restituisce sempre `group: 'nuovo'` anche se `booked` è valorizzato. Home e `MonthlyPage` contano come fissati solo `group === 'fissato'`, e «da fissare» solo `dueSoon` (`in_ritardo` / `in_scadenza`). I «Nuovi» con data in agenda non entrano in nessun contatore → `0/0`. Il filtro «Fissati» è vuoto mentre sotto «Nuovi» compaiono le chip data.

Questo contraddice il prodotto originale (`2026-10-03-groomly-mensili-design.md`): **Fissato = almeno un appuntamento futuro**.

### Comportamento atteso

In `src/lib/cycle.ts` → `monthlyStatus`:

```
se non attivo o non mensile → null
booked = primo programmato futuro (come oggi)
lastCompleted = ultimo completato (come oggi)

se !lastCompleted:
  se booked → group 'fissato', due null (o invariato), late false
  altrimenti → group 'nuovo', due null (come oggi)

se lastCompleted:
  (invariato: fissato se booked, altrimenti openGroup / null)
```

`cycleRow` / `monthBoard` già trattano `booked ? fissato : da_fissare` senza richiedere completato; restano allineati a M1. Non è obbligatorio far passare Home/Avvisi a `monthBoard` in questo ciclo: basta allineare `monthlyStatus`.

### Superfici UI

- **Home** (`HomePage`): `bookedMonthly` include i nuovi-ex fissati con visita nel mese (`fissatoVisible`). Denominatore = fissati del mese + `dueSoon` (come oggi), quindi sale quando ci sono prenotazioni.
- **Avvisi /mensili** (`MonthlyPage`): sezione «Fissati» e contatore `booked` includono questi cani; sezione «Nuovi» solo chi non ha ancora appuntamento. Filtro «Fissati» non è più vuoto se in agenda ci sono date.
- Banner / campanello / `dueSoon`: invariati (non includono `nuovo` né `fissato`).

### Test

Aggiornare `src/lib/cycle.test.ts`:

- `monthlyStatus(mensile, [programmato futuro], …).group` → `'fissato'` (oggi il test aspetta `'nuovo'`).
- `booked` valorizzato; `due` resta `null` senza completato.
- Caso senza appuntamenti → ancora `'nuovo'`.
- Casi con completato: invariati.

Aggiornare eventuali assert di pagina in `monthly.test.tsx` / home se dipendono dal vecchio raggruppamento.

## 2. Agenda — altezza dinamica

### Root cause

In `CalendarPage` → `DayColumn`, `height = max((durataMin/60)*HOUR, MIN_BLOCK)` con `HOUR = 50` e `MIN_BLOCK = 18`. `AppointmentBlock` usa quell’altezza fissa e `overflow: 'hidden'`. Sotto i 60 minuti `eventLayout` è `compact` e può comunque superare i px della durata → testo tagliato (es. Luna 13:30 sul 14 ottobre).

### Comportamento atteso

1. Calcolare un’altezza «da durata» come oggi.
2. Calcolare (o stimare) l’altezza minima per mostrare tutto il contenuto della card in layout completo (nome, sticker/icone, chip servizi, nota critica).
3. `height = max(durataPx, contentMinPx)`.
4. Se `contentMinPx > durataPx`, la timeline del giorno non resta a `(endHour-startHour)*HOUR` fisso: le fasce orarie si allungano in modo che la posizione verticale resti coerente con gli orari e le card successive non si sovrappongano. In pratica: o si espande l’ora che contiene l’appuntamento (o le ore attraversate), oppure si usa un offset cumulativo sotto ogni blocco «gonfiato» — l’implementazione sceglie la variante più semplice che preserva leggibilità degli orari a sinistra e evita overlap.
5. Rimuovere il taglio del contenuto: niente `overflow: hidden` sul testo utile, oppure overflow solo se strettamente necessario per bordi ma con altezza già sufficiente.

Vista **mese** e liste settimana non-timeline: fuori scope se non usano la stessa `AppointmentBlock` a durata.

### Test

- Aggiornare `appointments.test.tsx` (o test calendario dedicati): un appuntamento breve con nota/servizi non deve avere altezza solo-da-durata se il contenuto richiede di più; oppure assert su presenza del testo nota nel DOM senza clipping strutturale.
- Non richiedere pixel-perfect su ogni device: basarsi su altezza calcolata / assenza di overflow intenzionale sul blocco.

## 3. Fuori scope

- Cambiare `clientType`, `recurrenceWeeks`, o campi su `Dog`/`Appointment`.
- Ridisegnare banner copy o soglia `daysBefore`.
- Vista mese a bollini, drag & drop, resize manuale appuntamenti.
- Pubblicare solo dopo i fix verificati (regola publish del repo).

## 4. Verifica manuale

1. Agenda giorno 14 ottobre: card Luna (e simili brevi) mostrano nome, servizi e nota per intero; nessun testo tagliato in basso.
2. Home: tile Mensili ott ≠ `0/0` se esistono mensili con appuntamenti in ottobre (es. Giovannino 16, Arlo/Luna/Pippi 14).
3. Avvisi → Clienti mensili → ott: contatore riflette fissati; filtro «Fissati» elenca chi ha data; «Nuovi» solo senza appuntamento; «Da fissare» coerente con scadenze in finestra.
