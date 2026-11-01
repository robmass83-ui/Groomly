# A3 — Gli impegni personali bloccano l'orario, i promemoria no

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A3. Specifica breve (lavoro piccolo-medio).

## Perché
Un impegno personale in agenda («Dentista 15:00-17:00») oggi non toglie quegli orari dalle prenotazioni online: il calcolo considera occupato solo ciò che ha `status: 'programmato'` (o una richiesta `nuova`), e gli impegni personali sono salvati senza `status` (`src/lib/firebaseMap.ts:337-348`). Tutti i controlli del server passano da `appuntamentoOccupato` (`functions/src/piano/postiLiberi.ts:65`): orari del sito (`postiLiberiPer`), invio richiesta (`inviaRichiesta.ts:113`), gestione richiesta (`gestisciPrenotazione.ts:277`), conferma lista d'attesa (`confermaAttesa.ts:37,91`).

## Decisioni di Roberto
1. Si distinguono **Impegno** e **Promemoria**: l'impegno blocca l'orario (anche per le prenotazioni online), il promemoria no.
2. Nel modulo dell'impegno personale si sceglie il tipo; **l'impegno vuole l'ora di fine**, il promemoria ha solo l'ora.
3. Gli impegni personali **già esistenti restano impegni** (bloccano). Quelli già esistenti **senza ora di fine bloccano un'ora** dall'inizio.
4. Strada **A**: il calcolo degli orari liberi impara a leggere gli impegni personali; nessuna riscrittura dei dati esistenti.
5. Nome del tipo che non blocca: **Promemoria**.

## Obiettivi
1. **Dato**: un impegno personale porta il tipo in un campo nuovo, scritto solo per i promemoria (es. `tipo: 'promemoria'`); campo assente = impegno (così gli esistenti restano impegni). Il campo passa per tutte le copie: documento Firestore (`appointmentToDoc` / lettura in `src/lib/firebaseMap.ts`), copia locale (`appointmentToStored` / `toDomain` in `src/data/local/appointments.ts`), backup e ripristino.
2. **Calcolo server** (`appuntamentoOccupato`): un documento `kind: 'personale'`:
   - promemoria → non occupa;
   - impegno → occupa da `start` a `plannedEnd`; senza `plannedEnd` → `start` + 60 minuti; trattato come `programmato` ai fini di `intervalloLibero`.
   Le visite normali restano come oggi.
3. **Modulo** (`src/pages/PersonalAppointmentPage.tsx`): scelta **Impegno / Promemoria** in alto (default Impegno). Impegno: ora di fine obbligatoria (messaggio d'errore se manca o non è dopo l'inizio, come oggi `persFine`). Promemoria: niente ora di fine. Aprendo un impegno esistente senza fine, per salvarlo bisogna aggiungere la fine o passarlo a Promemoria. Testi in it/en/es.
4. **Agenda e Home**: un promemoria si distingue a colpo d'occhio da un impegno (es. icona diversa) dove oggi compaiono gli impegni personali.
5. **Test**: `appuntamentoOccupato` per impegno con fine, impegno senza fine (60 min), promemoria (nessuna occupazione); `postiLiberiPer`/`intervalloAncoraLibero` non offre un orario coperto da un impegno e offre quello di un promemoria; andata e ritorno del campo tipo in Firestore, copia locale e backup; modulo (scelta, fine obbligatoria per l'impegno).

## Non obiettivi
- Disponibilità per persona nel Salone: un impegno di chiunque blocca l'orario per tutto il salone, come le visite (le prenotazioni online ragionano per salone intero).
- Cambiare impegni già salvati.
- Il controllo «posto già preso» dell'invio offerte della lista d'attesa (`inviaCoda.ts:~407`, guarda solo le visite programmate): un'offerta su un orario coperto da un impegno viene comunque fermata alla conferma («occupato»). Il builder lo segnala se allinearlo costa una riga.

## Anti-obiettivi
- Contare gli impegni come visite (contatori «Oggi», durata della giornata, incassi, statistiche): restano fuori come oggi.
- Bloccare orari con un promemoria.

## Approcci
- **A — il calcolo legge gli impegni personali (scelta)**: un solo punto sul server, dati esistenti intatti.
- B — salvare gli impegni come visite `programmato` con `end`: finirebbero nei contatori e nelle statistiche, da escludere ovunque.

## Lasciato al builder
- Nome esatto del campo e del tipo nel modello (`Appointment`), purché assente = impegno.
- Icona e resa del promemoria in agenda/Home.
- Se il calcolo lato app (`src/lib/disponibilita.ts`) ha consumatori che leggono impegni personali, allinearli alla stessa regola.
- Deploy: functions che importano `postiLiberi` (postiLiberi, inviaRichiesta, gestisciPrenotazione, confermaAttesa) con `FUNCTIONS_DISCOVERY_TIMEOUT=60` + release APK.
