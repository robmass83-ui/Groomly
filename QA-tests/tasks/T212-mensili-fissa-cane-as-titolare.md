# T212-mensili-fissa-cane-as-titolare: Mensili - fissare un cane e aprire un appuntamento fissato

| Field | Value |
|---|---|
| Route | `/mensili` |
| Source | `src/pages/MonthlyPage.tsx` |
| Flow | Fissare un cane dal bottone Fissa; aprire l'appuntamento fissato |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: almeno un cane in DA FISSARE e uno in FISSATI

## Test data
- `cane` = primo cane in DA FISSARE (annota nome e contatore `booked/total` iniziale)
- Il servizio e il giorno vengono scelti nello sheet (primo servizio disponibile, primo orario libero)

## Steps

### TC-01: Happy path - Fissare
1. Sign in as titolare. Navigate to `/mensili`.
2. Annota il contatore `booked/total`.
3. Click **Fissa** accanto a `cane`.
4. Assert: si apre lo sheet di nuovo appuntamento con il Cane precompilato.
5. Scegli un servizio e un orario Quando, poi salva l'appuntamento con il bottone di salvataggio dello sheet.
6. Assert: ritorno su `/mensili`; `cane` non e piu in DA FISSARE ed e in FISSATI con la data scelta.
7. Assert: il contatore e `booked+1/total`.
8. Reload. Assert: lo stato persiste.

### TC-02: Aprire l'appuntamento fissato
1. Click il link `<cane> fissato <data>` in FISSATI. Assert: URL `/appuntamenti/:id` con i dati dell'appuntamento.
2. Torna a `/mensili`, click il nome `<cane> (scheda)`. Assert: URL `/animali/:id`.

### TC-03: Negative & edge cases
- Click **Fissa**, poi chiudi lo sheet senza salvare: il cane resta in DA FISSARE e il contatore e invariato.

## Assertions
- [ ] Fissa apre lo sheet con cane precompilato.
- [ ] Dopo il salvataggio il cane e in FISSATI e il contatore aumenta di 1.
- [ ] Link ai dettagli corretti.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Sheet aperto da Fissa
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
