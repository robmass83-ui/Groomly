# T077-abbonamento-piano-go: Abbonamento - pagina piano Go

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento/go` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Active plan shows Attivo badge and feature blocks |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go (plan go12)

## Test data
- none (read-only page)

## Steps

### TC-01: Happy path - contenuto Go
1. Sign in as titolare-go. Navigate to `/impostazioni/abbonamento/go`.
2. Assert: "Attivo" badge and section "SERVIZIO BASE" with "Messaggi WhatsApp" and "Affidabilita".
3. Click **Messaggi WhatsApp**. Assert: an explanatory panel/info opens without error.
4. Click **Informazioni su Affidabilita**. Assert: info opens.
5. Click **Indietro**. Assert: URL `/impostazioni/abbonamento`.

### TC-02: Edge
- Navigate to `/impostazioni/abbonamento/pro`. Assert: redirect to `/impostazioni/abbonamento`.

## Assertions
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
