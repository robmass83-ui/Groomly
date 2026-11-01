# T107-info-groomly-as-collaboratore: Info su Groomly come collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/info` |
| Source | `src/pages/InfoGroomlyPage.tsx` |
| Flow | Leggere versione e guida d'uso |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore

## Test data
- Voci "Come si usa": Animali, Agenda, Listino, Dati, Incassi, Backup, Avvisi

## Steps

### TC-01: Happy path
1. Sign in as collaboratore. Navigate to `/impostazioni/info`.
2. Assert: titolo **Info su Groomly** e riga **Versione** con la build corrente.
3. Assert: le sette voci "Come si usa" sono presenti.
4. Click **Novità**. Assert: URL `/impostazioni/aggiornamenti`.
5. Torna a `/impostazioni/info`, click **Indietro**. Assert: URL `/impostazioni/account`.

### TC-02: Negative & edge cases
- Assert che i link Contattaci e Sito web abbiano href `mailto:info@groomlyapp.it` e `https://groomlyapp.it`.

## Assertions
- [ ] Pagina raggiungibile dal collaboratore con versione e guida.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
