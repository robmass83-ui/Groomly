# T076-abbonamento-piano-lista-slug: Abbonamento - lista piani e slug non valido

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento/:piano` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Open each plan page from list; invalid slug redirect |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (Plus owner, plan plus36)

## Test data
- Valid slugs: `go`, `plus`, `salone`
- Invalid slugs: `xyz`, `pro`

## Steps

### TC-01: Happy path - aprire ogni piano
1. Sign in as titolare. Navigate to `/impostazioni/abbonamento`.
2. Assert: 3 cards (Go, Plus, Salone); Go and Plus show "Attivo"; Salone shows "19,99" euro al mese.
3. Click the Go card. Assert: URL `/impostazioni/abbonamento/go`.
4. Click **Indietro**. Assert: URL `/impostazioni/abbonamento`.
5. Repeat for Plus (`/plus`) and Salone (`/salone`).

### TC-02: Slug non valido
1. Navigate to `/impostazioni/abbonamento/xyz`. Assert: redirect to `/impostazioni/abbonamento`.
2. Navigate to `/impostazioni/abbonamento/pro`. Assert: same redirect.

## Assertions
- [ ] Plan list status labels correct.
- [ ] Invalid slug redirects.
- [ ] No console errors, except the known emulator 500 from `pubblicaSalone` on the Plus page (expected).
- [ ] No other failed network requests.

## Screenshots required
- Plan list
- Each plan page

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
