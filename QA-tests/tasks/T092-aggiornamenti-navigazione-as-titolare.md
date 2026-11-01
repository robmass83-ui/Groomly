# T092-aggiornamenti-navigazione-as-titolare: Navigazione da e verso Aggiornamenti

| Field | Value |
|---|---|
| Route | `/impostazioni/aggiornamenti` |
| Source | `src/pages/ReleaseHistoryPage.tsx` |
| Flow | Caricare storico release da GitHub (navigazione) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`, build APK
- Signed in as role `titolare`

## Test data
- Nessun input.

## Steps

### TC-01: Link della barra di navigazione
1. Sign in as `titolare`, navigate to `/impostazioni/aggiornamenti`.
2. Click **Home**. Assert: URL `/`.
3. Torna alla pagina; click **Animali**. Assert: URL `/animali`.
4. Torna alla pagina; click **Agenda**. Assert: URL `/calendario`.
5. Torna alla pagina; click **Mensili**. Assert: URL `/mensili`.
6. Torna alla pagina; click **Listino**. Assert: URL `/listino`.
7. Torna alla pagina; click **Impostazioni**. Assert: URL `/impostazioni`.

### TC-02: Indietro
1. Da `/impostazioni/aggiornamenti` click **Indietro**. Assert: URL `/impostazioni`.

### TC-03: Reload
1. Reload `/impostazioni/aggiornamenti`. Assert: la pagina resta, titolo "Aggiornamenti", nessun redirect.

### TC-04: Build non APK
1. Se disponibile una build senza aggiornamentiApkAttivi, apri la route. Assert: redirect a `/impostazioni`. Altrimenti segna il caso come non eseguibile.

## Assertions
- [ ] Tutti i link raggiungono la destinazione indicata.
- [ ] Console: solo ERR_FAILED di GitHub ammessi.
- [ ] Nessuna richiesta 4xx/5xx oltre GitHub bloccato.

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
