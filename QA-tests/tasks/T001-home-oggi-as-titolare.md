# T001-home-oggi-as-titolare: Home (Oggi) - nessuna visita cancellata da sola e nessun "Cane eliminato" durante il caricamento

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx` |
| Flow | Vedere gli appuntamenti di oggi; aprire i tile Mensili / Listino / Incassi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`, emulatori Firebase attivi.
- Utente non ancora loggato, poi accesso come ruolo `titolare` (account plus36).
- Fixture creata da `D:/Groomly`: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T001 Fido"` (annota `salonId`).

## Test data
- `nomeCane = "QA T001 Fido"` (cane con 1 visita chiusa, 1 da chiudere, 2 future, 1 visita ospite "Ospite QA T001 Fido" da chiudere).
- `attesa = 15 s`.

## Steps

### TC-01: Happy path - Home dopo il login non cancella visite (AC1)
1. Esegui `node QA-tests/.qa-catalog/check-c1.cjs <salonId> "QA T001 Fido"`. Annota `visiteNelSalone` = N0 e `incassatoTotale` = I0. `visiteDelCane` contiene `qat001fido-chiusa`=completato, `qat001fido-dachiudere`=programmato, `qat001fido-futura1`=programmato, `qat001fido-futura2`=programmato.
2. Sign in as titolare e apri `/`.
3. Assert: sono visibili le sezioni OGGI e DA CHIUDERE; in DA CHIUDERE compaiono «QA T001 Fido» e «Ospite QA T001 Fido».
4. Attendi 15 s senza toccare nulla.
5. Esegui di nuovo `check-c1.cjs`. Assert: `visiteNelSalone` = N0, tutte e 4 le visite del cane con lo stesso stato del punto 1, `incassatoTotale` = I0.
6. Ricarica la pagina, attendi 15 s, ripeti `check-c1.cjs`. Assert: ancora N0.

### TC-02: Nessun "Cane eliminato" durante il caricamento (AC4)
1. Fai logout, poi di nuovo Sign in as titolare, osservando la Home dal primo istante dopo il login (screenshot a ~0 s, ~1 s, ~3 s).
2. Assert: in nessuno screenshot compaiono il testo «Cane eliminato» né il pulsante «Rimuovi dalla lista»; finché i dati caricano non c'è nessuna riga con quei testi.
3. Assert: a caricamento finito «QA T001 Fido» e «Ospite QA T001 Fido» sono mostrati col loro nome, non «Cane eliminato».

### TC-03: Tile e link
| Elemento | Azione | Risultato atteso |
|---|---|---|
| Tile Oggi / Calendario | click | URL `/calendario?data=<oggi>` |
| Incassi di oggi | click | URL `/incassi?periodo=giorno` |
| Tile Mensili | click | URL `/mensili`, tile mostra `booked/total` |
| Listino Apri | click | URL `/listino` |
| Nuovo appuntamento | click | si apre il foglio `/appuntamenti/nuovo` con sezioni Cane, Servizi, Quando |
| Cerca | click | URL `/animali` con ricerca a fuoco |

### TC-04: Negative & edge
- Ricarica con rete lenta (throttling Slow 3G): per tutta la durata del caricamento nessuna comparsa di «Cane eliminato».
- Apri `/?x=1`: la Home rende comunque OGGI e DA CHIUDERE.

## Assertions
- [ ] Nessuna visita cancellata dopo login + 15 s (conteggio cloud invariato).
- [ ] Nessun «Cane eliminato» / «Rimuovi dalla lista» durante il caricamento.
- [ ] Ospite mostrato col suo nome.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Home primo istante dopo login (3 scatti)
- Home a caricamento finito
- Foglio Nuovo appuntamento
- Esito `check-c1.cjs` prima e dopo

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01 |
| AC-4 | AC4 Nei primi istanti dopo il login, mentre i dati caricano, la Home non mostra «Cane eliminato» né «Rimuovi dalla lista» | TC-02, TC-04 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
