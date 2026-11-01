# T032-appuntamenti-nuovo-validazione-as-titolare: Form validation - appointment-form

| Field | Value |
|---|---|
| Route | `/appuntamenti/nuovo` |
| Source | `src/pages/AppointmentPage.tsx` (+`AppointmentForm.tsx`) |
| Flow | Save with nothing selected is blocked |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T032 Fido"`.

## Test data
- Valido: cane `QA T032 Fido`, servizio `Unghie`, giorno `+7 gg`, primo slot abilitato.
- Invalido: ricerca `zzzz`, nessun servizio, giorno vuoto, nessuna ora.

## Steps

### TC-01: Happy path - completa il form dopo i blocchi
1. Apri `/appuntamenti/nuovo`. Assert: **Salva** disabilitato.
2. Esegui TC-02, poi seleziona cane, servizio Unghie, **+7 gg**, uno slot, **`Salva`**.
3. Assert: foglio chiuso e appuntamento visibile in `/calendario` alla data scelta.

### TC-02: Form validation - `appointment-form`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Cane (Cerca cane) | "Scegli un cane" (Salva bloccato) | `zzzz` → solo «+ Nuovo cane» | n/a |
| Servizi | "Scegli un servizio" | n/a | n/a |
| Giorno | "Scegli il giorno" | n/a | n/a |
| Ora | "Scegli l’ora" | slot passati/occupati disabilitati | n/a |

Per ogni riga: lascia vuoto solo quel campo, tentando **Salva** (o notando che è disabilitato): Assert: nessun appuntamento creato (conteggio cloud invariato) ed errore o stato disabilitato visibile.

### TC-03: Negative
- Scegli un cane, nessun servizio: Salva resta disabilitato.
- Toggle del servizio due volte: torna senza servizio, Salva disabilitato.

## Assertions
- [ ] Messaggi esatti o Salva disabilitato per ogni campo mancante.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Ogni stato bloccato, stato finale

## Acceptance criteria
Nessun criterio C1 verificabile in questo task (regressione sul form).

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
