# T126-impostazioni-piano-vetrina-as-titolare: Vetrina piani con account Plus

| Field | Value |
|---|---|
| Route | `/impostazioni/piano` |
| Source | `src/pages/PianoPagine.tsx` |
| Flow | Leggere la vetrina piani Base/Plus/Salone |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` (account Plus, senza Salone)

## Test data
- Nessun input.

## Steps

### TC-01: Rendering
1. Sign in as `titolare`, navigate to `/impostazioni/piano`.
2. Assert: titolo "Piano" con sezioni PROFILO BASE, SERVIZIO BASE (2), SERVIZIO PLUS (9), SERVIZIO SALONE.
3. Assert: SERVIZIO BASE contiene "Messaggi WhatsApp" e "Affidabilità".
4. Assert: SERVIZIO PLUS contiene Promemoria, Cane pronto, Richiamo, WhatsApp automatico, Auguri, Tessera fedeltà, Prenotazioni online, Lista d'attesa, Recensione Google.
5. Assert: le righe Richiamo e WhatsApp automatico mostrano il chip "In sviluppo".
6. Assert: nessun pulsante "Prova gratis" (account Plus).
7. Assert: SERVIZIO SALONE mostra "Si sblocca con Salone" e **Avvisami per il Salone**.

### TC-02: Navigazione
1. Click **Indietro**. Assert: URL `/impostazioni`.
2. Torna a `/impostazioni/piano`, click **Home**, **Animali**, **Agenda**, **Mensili**, **Listino**, **Impostazioni** in sequenza (tornando ogni volta). Assert: URL `/`, `/animali`, `/calendario`, `/mensili`, `/listino`, `/impostazioni`.
3. Click **Aggiungi** (FAB). Assert: si apre il menu nuovo.

### TC-03: Persistenza
1. Reload. Assert: stesse sezioni e stesso stato.

## Assertions
- [ ] Sezioni e conteggi corretti (2 Base, 9 Plus).
- [ ] Chip "In sviluppo" su Richiamo e WhatsApp automatico.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Sezione Salone bloccata
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
