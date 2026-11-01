# T079-abbonamento-piano-vetrina-as-titolare-go: Abbonamento - vetrina Plus e Salone come titolare-go

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento/:piano` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Non-active plan shows Vetrina with Abbonati |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go (go12)

## Test data
- Slugs: `plus`, `salone`

## Steps

### TC-01: Happy path - vetrina Plus
1. Sign in as titolare-go. Navigate to `/impostazioni/abbonamento/plus`.
2. Assert: sales page (Vetrina) visible, no "Attivo" badge, button **Abbonati** present.
3. Click **Abbonati**. Assert: the purchase flow starts (checkout/redirect or dialog) and no unhandled error; return without paying.

### TC-02: Vetrina Salone
1. Navigate to `/impostazioni/abbonamento/salone`.
2. Assert: Vetrina with "Come funziona" and **Abbonati**.

### TC-03: Lista
1. Navigate to `/impostazioni/abbonamento`. Assert: Go shows "Attivo"; Plus and Salone do not.

## Assertions
- [ ] Abbonati visible on non-active plans.
- [ ] No console errors.
- [ ] No failed network requests except any purchase call explicitly triggered.

## Screenshots required
- Vetrina Plus
- Vetrina Salone

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
