# T127-impostazioni-piano-prenotazioni-online-as-titolare: Link prenotazioni e specie accettate

| Field | Value |
|---|---|
| Route | `/impostazioni/piano` |
| Source | `src/pages/PianoPagine.tsx` |
| Flow | Copiare/condividere il link prenotazioni (Plus); Scegliere specie accettate |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` (Plus)

## Test data
- Specie: `Cani`, `Gatti`, `Altro`
- Link atteso: `https://groomlyapp.it/s/<slug>`

## Steps

### TC-01: Link prenotazione
1. Sign in as `titolare`, navigate to `/impostazioni/piano`.
2. Nella riga "Prenotazioni online" assert: il link `https://groomlyapp.it/s/<slug>` è visibile con **Copia** e **Condividi**.
3. Click **Copia**. Assert: conferma visibile (toast o cambio etichetta) e la clipboard contiene il link.
4. Click **Condividi**. Assert: parte lo share nativo oppure, su web senza supporto, nessun crash o errore in console.

### TC-02: Accetta prenotazioni per
1. Annota lo stato dei chip **Cani**, **Gatti**, **Altro**.
2. Click **Gatti** per cambiare stato. Assert: il chip cambia stato subito (nessun submit, salva al click).
3. Reload. Assert: lo stato del chip **Gatti** è persistito.
4. Click **Gatti** di nuovo per ripristinare. Reload. Assert: stato originale.

### TC-03: Nessuna specie
1. Disattiva tutti i chip uno alla volta.
2. Assert: osserva se l'ultimo può essere disattivato; registra il comportamento (blocco o messaggio). Ripristina lo stato iniziale.

## Assertions
- [ ] Link prenotazioni nel formato atteso con Copia/Condividi.
- [ ] I chip salvano al click e persistono.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Riga Prenotazioni online
- Chip in stati diversi
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
