# T177-invito-loggato-token-falso-as-titolare: Invito con token non valido da loggato

| Field | Value |
|---|---|
| Route | `/invito/:token` |
| Source | `src/pages/InvitePage.tsx` |
| Flow | Loggato: chiama la callable acceptInvite(token) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Nota: in emulatore le callable rispondono errore `INTERNAL` (HTTP 500 su acceptInvite); e un esito atteso

## Test data
- `fakeToken = "token-finto-qa-0002"`

## Steps

### TC-01: Token falso da loggato
1. Sign in as titolare.
2. Navigate to `/invito/token-finto-qa-0002`.
3. Assert: viene chiamata la callable `acceptInvite` (POST a `http://127.0.0.1:5001/demo-groomly/europe-west1/acceptInvite`) con risposta HTTP 500 (atteso).
4. Assert: la pagina mostra un messaggio di errore leggibile (nell'emulatore `INTERNAL`) e non resta in caricamento infinito; non c'e redirect a `/`.
5. Assert: l'unico errore in console e la 500 di acceptInvite.

### TC-02: Token valido (se disponibile)
1. Solo se un invito reale e stato generato dal seed/emulatore e acceptInvite funziona: apri `/invito/<token valido>` da un utente non ancora nello studio.
2. Assert: redirect a `/`. Se l'emulatore non lo supporta, annota il TC come non eseguibile (non fallito).

## Assertions
- [ ] acceptInvite chiamata una volta per visita.
- [ ] Errore mostrato all'utente per token falso, senza crash.
- [ ] Console: ammesso solo il 500 di acceptInvite; nessun altro errore.

## Screenshots required
- Pagina con messaggio di errore

## Pass criteria
All TCs above pass AND no unexpected console/network errors (il 500 su acceptInvite con token falso e atteso).
