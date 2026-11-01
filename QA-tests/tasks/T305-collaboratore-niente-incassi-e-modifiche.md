# T305-collaboratore-niente-incassi-e-modifiche: Il collaboratore non vede gli incassi ma modifica schede e chiude visite

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx`, `src/app/SoloIncassi.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/InfoGroomlyPage.tsx` |
| Flow | Collaboratore: Home, link incassi, Impostazioni, guida, scheda cane, chiusura visita del titolare |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Fixture: `node QA-tests/.qa-catalog/fixture-c2.cjs salone55@test.groomly staff55a@test.groomly "QA T305 Fido"` (annota `salonId`, `ownerUid`, `dogId`).
- Prepara una visita del titolare da chiudere: con firebase-admin (vedi lo schema di `fixture-c2.cjs`) imposta `assigneeUid` = `ownerUid` su `qat305fido-completato`.

## Test data
- Cane «QA T305 Fido»; nuovo prezzo personalizzato per un servizio a scelta (es. 33 €), nota «nota QA T305».
- Chiusura: Completato con importo 41 € e un metodo di pagamento.

## Steps

### TC-01: Home senza incassi (AC1)
1. Sign in as collaboratore, apri `/`.
2. Assert: nessun riquadro «Incassi di oggi» e nessun link a `/incassi`; i riquadri restanti formano una griglia senza buchi (screenshot).

### TC-02: Link diretti (AC2)
1. Apri `/incassi?periodo=giorno`, poi `/incassi/report`, poi `/incassi/statistiche`.
2. Assert: ogni volta si finisce su `/` (Home) e non compare nessun importo di incassi.

### TC-03: Impostazioni e guida (AC3)
1. Apri `/impostazioni`. Assert: nessuna scorciatoia «Incassi»/«Incassi e report»; la griglia delle scorciatoie è ordinata (screenshot).
2. Apri la guida in Info Groomly (dal menu Impostazioni). Assert: nessuna voce che parli di incassi.

### TC-04: Scheda cane (AC5)
1. Apri la scheda di «QA T305 Fido», cambia un prezzo personalizzato e aggiungi la nota; salva.
2. Assert: nessun errore; con firebase-admin il documento `salons/<salonId>/dogs/<dogId>` ha il prezzo e la nota nuovi, nome e specie intatti.

### TC-05: Chiusura di una visita del titolare (AC5)
1. In Home (DA CHIUDERE) o dalla scheda visita chiudi `qat305fido-completato` con Completato, 41 € e un metodo di pagamento.
2. `check-c2.cjs <salonId> "QA T305 Fido"`. Assert: `status` = `completato`, `assigneeUid` = `ownerUid` (il titolare), `chiusoIl` presente.

### TC-06: Regole (AC7)
1. `node QA-tests/.qa-catalog/check-a5-regole.mjs staff55a@test.groomly <password> <salonId> <dogId>` (non scrivere la password nel risultato).
2. Assert: «svuota scheda» e «nome vuoto» = `permission-denied`; «modifica note» = `PERMESSO`; nome e specie dopo invariati.

## Assertions
- [ ] Il collaboratore non vede incassi da nessuna parte; modifica e chiude normalmente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Home del collaboratore
- Impostazioni del collaboratore
- Scheda cane dopo il salvataggio
- Esito `check-c2.cjs` e `check-a5-regole.mjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Collaboratore: in Home non c'è il riquadro «Incassi di oggi» e la griglia dei riquadri non ha buchi | TC-01 |
| AC-2 | AC2 Collaboratore: aprendo /incassi?periodo=giorno, /incassi/report e /incassi/statistiche finisce in Home senza vedere importi | TC-02 |
| AC-3 | AC3 Collaboratore: in Impostazioni non c'è la scorciatoia Incassi e in Info Groomly la guida non parla di incassi | TC-03 |
| AC-5 | AC5 Collaboratore: modifica e salva una scheda cane (prezzo personalizzato e note) e chiude con importo una visita assegnata al titolare; nel cloud i cambiamenti ci sono | TC-04, TC-05 |
| AC-7 | AC7 Regole: come collaboratore, via Firestore diretto, svuotare la scheda di un cane e lasciarne il nome vuoto sono rifiutati; una modifica normale passa | TC-06 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
