# T063-chiusura-modal-sovrapposizione-visite-as-titolare: Modal - sovrapposizione e visite-presenti

| Field | Value |
|---|---|
| Route | `/chiusure/nuovo` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Overlap with existing closure offers Apri; Visits in range prompt confirm |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: una chiusura esistente `Ferie QA esistente` il 2026-12-20 e almeno 1 appuntamento in un altro giorno `giornoConVisite` (es. un giorno con visite in agenda)

## Test data
- `motivo = "Test sovrapposizione QA"`
- `giornoSovrapposto = "2026-12-20"`
- `giornoConVisite` = data di un appuntamento esistente (annotala dal Calendario)

## Steps

### TC-01: Modal sovrapposizione
1. Sign in as titolare. Navigate to `/chiusure/nuovo?data=2026-12-20`.
2. Scrivi Motivo `Test sovrapposizione QA`, click **Salva**.
3. Assert: dialog "<motivo> gia chiuso" con pulsanti **Indietro** e **Apri**.
4. Click **Indietro**. Assert: dialog chiuso, form ancora aperto, nessuna nuova chiusura.
5. Click **Salva** di nuovo e poi **Apri**. Assert: si apre `/chiusure/<id>` della chiusura esistente con il pulsante **Riapri** presente.

### TC-02: Modal visite presenti - Indietro
1. Navigate to `/chiusure/nuovo?data=<giornoConVisite>`.
2. Scrivi Motivo `Chiusura con visite QA`, click **Salva**.
3. Assert: dialog "N visite in questo periodo" (N >= 1) con **Indietro** e **Salva**.
4. Click **Indietro**. Assert: nessuna chiusura creata; le visite restano in agenda.

### TC-03: Modal visite presenti - Salva
1. Ripeti i passi 1-3 di TC-02 e click **Salva** nel dialog.
2. Assert: chiusura creata, sheet chiusa, giorno segnato chiuso nel Calendario.
3. Reload. Assert: la chiusura persiste. Annota cosa succede alle visite esistenti (restano in agenda) e riferiscilo.

## Assertions
- [ ] Dialog sovrapposizione offre Indietro / Apri.
- [ ] Dialog visite presenti mostra il numero corretto di visite.
- [ ] Indietro non modifica dati.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog sovrapposizione
- Dialog visite presenti
- Stato finale

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
