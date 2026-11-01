# T091-aggiornamenti-errore-github-as-titolare: Storico release, stato di errore e Riprova

| Field | Value |
|---|---|
| Route | `/impostazioni/aggiornamenti` |
| Source | `src/pages/ReleaseHistoryPage.tsx` |
| Flow | Errore di rete: "Lo storico non si carica" + Riprova |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`, build APK (aggiornamentiApkAttivi attivo); altrimenti la route reindirizza a `/impostazioni`
- Signed in as role `titolare`
- `api.github.com` bloccato dalla guard dell'harness (stato errore)

## Test data
- Nessun input. Richiesta attesa: `GET https://api.github.com/repos/<RELEASE_REPO>/releases?per_page=100` bloccata (ERR_FAILED)

## Steps

### TC-01: Stato di errore
1. Sign in as `titolare`.
2. Navigate to `/impostazioni/aggiornamenti`.
3. Assert: titolo "Aggiornamenti" con sottotitolo "Versione installata <versione>".
4. Assert: testo "Lo storico non si carica" e pulsante **Riprova** visibili.
5. Assert: nessuna lista release.

### TC-02: Riprova
1. Click **Riprova**.
2. Assert: una nuova richiesta a api.github.com viene emessa (bloccata) e lo stato di errore "Lo storico non si carica" ricompare, senza crash.

### TC-03: Con release disponibili (se GitHub raggiungibile o mock)
1. Se il mock/rete restituisce release: Assert: ogni blocco mostra versione, data (formato `d MMM yyyy`) e note oppure "nessuna nota"; la release installata ha il badge "Questa".
2. Se è presente un link next, click **Release precedenti**. Assert: si aggiungono altre release in coda.

### TC-04: Indietro
1. Click **Indietro** nell'header. Assert: URL `/impostazioni`.

## Assertions
- [ ] Titolo e sottotitolo "Versione installata <versione>".
- [ ] Errore + Riprova quando GitHub non è raggiungibile.
- [ ] Console: gli unici errori ammessi sono "Failed to load resource: net::ERR_FAILED" (GitHub bloccato, x2); nessun altro.
- [ ] Nessuna richiesta 4xx/5xx oltre a GitHub bloccato.

## Screenshots required
- Page initial load (stato errore)
- Dopo Riprova
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
