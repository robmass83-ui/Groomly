# T072-abbonamento-piani-as-titolare-go: Abbonamento - i tre piani (Go gratuito)

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Vedere i tre piani con stato Attivo/prezzo |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go (free owner)

## Test data
- Piani: `go`, `plus`, `salone`

## Steps

### TC-01: Happy path - Piano Go attivo
1. Sign in as titolare-go. Navigate to `/impostazioni/abbonamento`.
2. Assert: tre schede Go, Plus, Salone visibili.
3. Assert: la scheda Groomly Go mostra **Attivo**; Plus mostra il prezzo al mese e Salone "19,99 € al mese".
4. Click Groomly Plus. Assert: URL `/impostazioni/abbonamento/plus`. Torna indietro.
5. Click Groomly Go. Assert: URL `/impostazioni/abbonamento/go`.

### TC-02: Collaboratore
1. Sign in as collaboratore. Navigate to `/impostazioni/abbonamento`.
2. Assert: la pagina e raggiungibile (route consentita a tutti i ruoli) e mostra le tre schede.

## Assertions
- [ ] Per titolare-go la scheda Go mostra "Attivo".
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
