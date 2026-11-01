# T080-abbonamento-piano-salone-vetrina-titolare: Abbonamento - Salone non attivo per Plus

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento/salone` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Salone page as plus36 (not active) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (plus36)

## Test data
- none

## Steps

### TC-01: Happy path - vetrina Salone
1. Sign in as titolare. Navigate to `/impostazioni/abbonamento/salone`.
2. Assert: Vetrina with price "19,99" euro al mese, section "Come funziona", button **Abbonati**; no "Attivo" badge.
3. Click **Abbonati**. Assert: purchase flow starts with no unhandled error; cancel out.
4. Click **Indietro**. Assert: URL `/impostazioni/abbonamento`.

### TC-02: Navigazione laterale
1. Click nav links **Home**, **Animali**, **Agenda**, **Mensili**, **Listino**, **Impostazioni** in turn; assert URLs `/`, `/animali`, `/calendario`, `/mensili`, `/listino`, `/impostazioni`.

## Assertions
- [ ] Salone shown as not active for plus36.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Vetrina Salone

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
