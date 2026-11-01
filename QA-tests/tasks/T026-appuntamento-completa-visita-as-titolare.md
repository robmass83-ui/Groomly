# T026-appuntamento-completa-visita-as-titolare: Appuntamento - completare la visita di un cane eliminato con prezzo, durata e pagamento

| Field | Value |
|---|---|
| Route | `/appuntamenti/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Complete visit with price/duration/payment |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T026 Fido"` (annota `salonId`).

## Test data
- Visita: `qat026fido-dachiudere` (Bagno, 30 min, 20 euro).
- Completare: `Prezzo = "35"`, `Ore = "1"`, `Minuti = "30"`, `Pagamento = Contanti`, `Nota = "Cliente soddisfatto"`.

## Steps

### TC-01: Happy path - Salva e completa (AC3)
1. `check-c1.cjs <salonId> "QA T026 Fido"`: I0 (`incassatoTotale`).
2. Apri `/animali/qat026fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`** (conferma reale).
3. Apri `/appuntamenti/qat026fido-dachiudere`. Assert: foglio «Appuntamento», nome «Cane eliminato», stato «Da chiudere», data di ~26 ore fa.
4. Premi **`Completato`**. Assert: dialog «Completare» con Prezzo 20 (valore prefissato del servizio), Ore 0, Minuti 30 e **POS / Contanti / N/A**, **Nessuna modifica**, **Salva e completa**.
5. Compila Prezzo 35, Ore 1, Minuti 30, scegli **Contanti**, Nota «Cliente soddisfatto». Premi **`Salva e completa`**.
6. Assert: dialog chiuso, stato «Completato», totale 35.
7. `check-c1.cjs`. Assert: `qat026fido-dachiudere` = `completato`; `incassatoTotale` = I0 + 35; `qat026fido-chiusa` = completato.
8. Apri `/`: la visita non è più in DA CHIUDERE.

### TC-02: Percorso breve
- Con fixture «QA T026 Fido B» (cane NON eliminato): **Completato** → **Nessuna modifica** chiude con i valori proposti; stato `completato` nel cloud.

## Assertions
- [ ] Il cane eliminato è mostrato come «Cane eliminato» e la sua visita si chiude.
- [ ] Stato e importo salvati nel cloud.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Foglio appuntamento, dialog Completare compilato, stato finale, esito check

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 Dopo l'eliminazione la visita da chiudere compare in Home come «Cane eliminato» e si chiude con Completato/Non venuto/Disdetto, salvando lo stato nel cloud | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
