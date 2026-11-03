# Basse «Agenda» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Agenda**; dettagli in `test-results/audit/findings/agenda.md`, `visivo.md`, `android.md`.

## Perché
Sei difetti piccoli dell'agenda, tutti nell'app: lo spostamento rapido e il modulo non controllano le stesse cose, il report conta perdite che non sono ancora avvenute, due fastidi di navigazione e grafica. Obiettivo: l'agenda non lascia salvare per sbaglio un orario impossibile senza dirlo, e i numeri del report dicono il vero «fino a oggi».

## Decisioni (prese con Roberto il 3 novembre)
1. **−15 / +15** nel dettaglio della visita (`AppointmentPage.tsx`, `shiftStart`): stesso controllo del modulo. Se il nuovo orario si sovrappone a un'altra visita programmata (nel Salone solo della stessa persona assegnata) o esce dagli orari del salone, compare l'avviso con «Sposta comunque» / «Annulla». Il controllo dei giorni di chiusura (ferie) resta com'è. Ai bordi della griglia il pulsante si spegne: −15 alle 08:00, +15 alle 19:00 (la visita resta sempre su un orario della griglia, «Modifica» non perde più l'ora). Una visita già fuori griglia (dati vecchi) non viene toccata: si spegne solo il pulsante che la porterebbe più fuori.
2. **Orari del salone** (solo se compilati e il piano li comprende, come oggi `orariAperti`): un inizio fuori fascia resta spento come ora; un inizio dentro fascia la cui fine (durata dei servizi scelti) cade nella pausa o dopo la chiusura resta **selezionabile** con una riga d'avviso come quella della sovrapposizione, es. «Finisce dopo la chiusura delle 13:00». Avvisare, non bloccare: a volte si resta oltre di proposito.
3. **Giorno chiuso** (solo con orari compilati): sotto la scelta del giorno compare «Il salone è chiuso questo giorno». Un nuovo appuntamento aperto senza data parte dal prossimo giorno aperto invece che da oggi. Con un `?data=` esplicito (dal calendario, «prossimo», ecc.) si tiene la data passata. Su Go (senza orari) nessun cambiamento.
4. **«Mancati» del Report e «Persi» di Incassi**: contano solo visite con inizio entro oggi (`non_venuto` e disdette del cliente). Le disdette future entrano nel conto quando arriva il loro giorno. Stessa regola nell'esportazione (`earningsExport.ts`).
5. **Freccia del Report** (`EarningsReportPage.tsx:204`): torna da dove si è arrivati, Incassi o Impostazioni. Di partenza (link diretto, ricarica) torna a Incassi.
6. **Ultima ora 19:00** nella vista Giorno (`CalendarPage.tsx`): l'ora 18–19 alta come le altre e l'etichetta «19:00» intera, anche su desktop.

## Approcci (per 1-3)
- **A — scelto.** Una funzione pura in `src/lib/` (es. `controlloOrario`) che dato inizio, durata, visite del giorno, persona e orari restituisce le sovrapposizioni e l'eventuale sforamento della chiusura. La usano il modulo (`AppointmentForm.tsx` ~415-430, griglia e avviso) e `shiftStart`. Una regola sola, testabile senza schermo. Costo: spostare con cura la logica di sovrapposizione del modulo.
- **B — scartato.** Copiare il controllo dentro `shiftStart`: più veloce ma la stessa regola in due posti; l'audit ha già trovato più volte modulo e server non allineati.

## Fuori dallo scopo
- Gli impegni personali restano esclusi dal controllo di sovrapposizione delle visite (com'è oggi nel modulo; minore lasciato da A3).
- Niente server, niente regole: solo APK.
- La griglia resta 08:00–19:00.

## Lasciato al costruttore (scelte di Claude)
- Nome e forma della funzione condivisa; testi nuovi in it/en/es con chiavi nuove (attenzione al controllo «frasi fisse»).
- Come il Report sa da dove si arriva (stato della navigazione o parametro), purché una ricarica torni a Incassi.
- Il calcolo dell'altezza dell'ultima ora: correggere la causa nel layout, non solo l'etichetta.

## Verifica
Test unitari della funzione condivisa e di `classify`/report; script Playwright `QA-tests/.qa-catalog/verify-basse-agenda.cjs` sull'emulatore a 320/360/390 px: ±15 con visita accanto e alle 19:00, inizio 12:45 da 2 h con orari 9-13/15-19, nuovo appuntamento di domenica con orari, report con una disdetta futura, freccia da Incassi, altezza misurata dell'ultima ora.
