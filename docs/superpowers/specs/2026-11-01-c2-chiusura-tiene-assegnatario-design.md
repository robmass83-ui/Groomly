# C2 — Chiudere una visita non perde più chi l'ha fatta

Data: 1 novembre 2026. Origine: audit `docs/AUDIT-QA-2026-11-01.md`, voce **C2**. Lavoro piccolo: specifica breve.

## Perché

Chiudendo una visita (Completato, Salva e completa, Non venuto, Disdetto) l'app la riscrive partendo dalla sua copia locale, prodotta da `appointmentToLocal` in `src/data/firebase/localSeed.ts`. Quella funzione è una seconda copia, rimasta indietro, del serializzatore `toStored` di `src/data/local/appointments.ts`, e non salva `assigneeUid`, `chiusoIl` e `kind: 'pelosetto'`. Risultato: la visita perde chi la fa e gli incassi del collaboratore finiscono al titolare. La stessa funzione (`appointmentsToLocalMap`) costruisce anche i **backup** (`src/data/firebase/backupCollect.ts:147`, `src/data/firebase/client.ts:2507`), che quindi perdono gli stessi campi.

## Obiettivi

1. Dopo qualsiasi chiusura (Completato, Salva e completa, Non venuto, Disdetto, anche annullata dal toast) la visita conserva `assigneeUid`, `chiusoIl` e `kind`, oltre a tutto il resto.
2. I backup contengono quei campi e un ripristino li rimette.
3. Una sola funzione produce la copia locale di un appuntamento: `localSeed.ts` usa il serializzatore di `src/data/local/appointments.ts` invece della sua copia.
4. Un test salva e rilegge un appuntamento con **tutti** i campi di `Appointment` valorizzati (visita e impegno personale) e verifica che nessuno si perda; fallisce se in futuro si aggiunge un campo al tipo senza salvarlo.

## Non obiettivi

- Recuperare l'assegnatario delle visite già chiuse (deciso da Roberto: vale da ora in poi; il dato non esiste più).
- Riassegnare a mano visite chiuse.
- Cambiare il modo in cui la chiusura scrive nel cloud (strada 3, scartata).

## Anti-obiettivi

- Cambiare il formato della copia locale già salvata sui telefoni in modo che le versioni attuali non la rileggano più.
- Perdere qualche campo che oggi `appointmentToLocal` salva e `toStored` no (vanno confrontati campo per campo: in caso di differenza vince l'unione).

## Approcci considerati

1. **Una sola funzione per la copia locale + test di andata e ritorno su tutti i campi** — scelto da Roberto. Elimina la causa (due serializzatori divergenti) e protegge dai campi futuri.
2. Aggiungere i tre campi a `appointmentToLocal` — scartato: resterebbero due funzioni da allineare a mano, che è ciò che ha creato il bug.
3. Alla chiusura scrivere nel cloud solo i campi cambiati — scartato: cambio profondo del salvataggio e dell'offline, sproporzionato.

## Lasciato a chi costruisce

- Come esportare il serializzatore unico da `src/data/local/appointments.ts` (o spostarlo in un modulo condiviso) senza dipendenze circolari.
- Il test di andata e ritorno: come costruire un `Appointment` con tutti i campi in modo che un campo nuovo nel tipo faccia fallire il test (per esempio un oggetto tipizzato `Required<Appointment>`).

## Come si verifica che è chiuso

1. Salone con collaboratore: una visita assegnata al collaboratore, chiusa con Completato (e una con Salva e completa, una Non venuto, una Disdetto) → nel cloud `assigneeUid`, `chiusoIl` e `kind` restano; il collaboratore vede l'incasso nei suoi Incassi, il titolare non lo vede attribuito a sé.
2. Backup e ripristino di quel salone → le visite chiuse hanno ancora l'assegnatario.
3. Il test di andata e ritorno passa e fallisce se si toglie un campo dal serializzatore.
