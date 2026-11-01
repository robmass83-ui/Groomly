# T205-listino-vedi-as-titolare-go-e-anonimo: Listino - titolare Go e anonimo

| Field | Value |
|---|---|
| Route | `/listino/vedi` |
| Source | `src/pages/PriceViewPage.tsx` |
| Flow | View price list / access control |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- TC-01: signed in as titolare-go; TC-02: nessuna sessione

## Test data
- Nessun input.

## Steps

### TC-01: titolare-go
1. Sign in as titolare-go. Navigate to `/listino/vedi`.
2. Assert: intestazione "Listino"; "Nessun file" se non c'e file, altrimenti immagine o PDF con **Apri**. Nessun paywall.
3. Click **Indietro**. Assert: URL `/listino`.

### TC-02: Anonimo
1. Chiudi la sessione. Navigate to `/listino/vedi`.
2. Assert: redirect alla schermata di accesso; nessun contenuto del listino visibile.

## Assertions
- [ ] titolare-go vede la pagina.
- [ ] Anonimo non vede il listino.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except redirect attesi.

## Screenshots required
- Vista titolare-go
- Redirect anonimo

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
