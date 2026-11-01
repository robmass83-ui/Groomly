# T307-vetrina-prova-gratis-solo-go-puro: «Prova gratis» solo per chi è su Go e non ha mai avuto Plus

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento` |
| Source | `src/components/abbonamento/Vetrina.tsx`, `src/lib/abbonamento.ts`, `src/pages/PianoPagine.tsx`, `src/hooks/usePiano.tsx` |
| Flow | Aprire Abbonamento e la vetrina di Plus con tre saloni in stati diversi |
| Requires auth | yes |
| Required role | titolare-grazia, titolare-omaggio, titolare-go-puro |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Documenti del piano già impostati: plus41 in grazia, plus44 in omaggio senza scadenza, go4 senza documento del piano.

## Test data
- Nessun dato da creare. Non premere «Prova gratis» né «Abbonati».

## Steps

### TC-01: Plus in grazia (AC1)
1. Sign in as titolare-grazia, apri `/impostazioni/abbonamento`, poi `/impostazioni/abbonamento/plus`.
2. Assert: nessun testo «Prova gratis» / «30 giorni gratis» (né bollino né pulsante); è presente «Abbonati» (o l'azione di abbonamento).

### TC-02: Plus in omaggio (AC2)
1. Sign in as titolare-omaggio, apri le stesse pagine.
2. Assert: nessun «Prova gratis» / «30 giorni gratis».

### TC-03: Go puro (AC3)
1. Sign in as titolare-go-puro, apri `/impostazioni/abbonamento` e `/impostazioni/abbonamento/plus`.
2. Assert: la vetrina di Plus mostra «Prova gratis» (e/o il bollino «30 giorni gratis»). Non premerla.

## Assertions
- [ ] La prova gratis compare solo al Go puro.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Vetrina Plus di plus41
- Vetrina Plus di plus44
- Vetrina Plus di go4

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Salone Plus in grazia (plus41): nella vetrina di Plus e nell'Abbonamento non compare «Prova gratis» né il bollino «30 giorni gratis»; c'è «Abbonati» | TC-01 |
| AC-2 | AC2 Salone Plus in omaggio (plus44): nessuna «Prova gratis» da nessuna parte | TC-02 |
| AC-3 | AC3 Salone Go puro senza piano (go4): la vetrina di Plus mostra «Prova gratis» (non premerla) | TC-03 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
