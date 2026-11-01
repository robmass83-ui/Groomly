# T124-notifiche-navigazione-as-titolare-go: Notifiche - titolare piano gratuito e navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni/notifiche` |
| Source | `src/pages/NotificationsPage.tsx` |
| Flow | Aprire le info di ogni voce; navigazione |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare-go

## Test data
- Nessun input.

## Steps

### TC-01: Render e info
1. Sign in as titolare-go. Navigate to `/impostazioni/notifiche`.
2. Assert: tre voci presenti: `Mensili in scadenza`, `Nuova versione`, `Appuntamenti da chiudere`, con default on/off/off.
3. Clicca ogni pulsante `Informazioni su ...`. Assert: popup che si apre e si chiude correttamente per tutte e tre.

### TC-02: Navigazione
1. Clicca **`Indietro`**. Assert: URL `/impostazioni`.
2. Torna alla pagina; clicca `Home`, `Animali`, `Agenda`, `Mensili`, `Listino`, `Impostazioni`. Assert: URL `/`, `/animali`, `/calendario`, `/mensili`, `/listino`, `/impostazioni`.

### TC-03: Anonimo
1. Sign out; navigate to `/impostazioni/notifiche`. Assert: reindirizzo alla schermata di accesso.

## Assertions
- [ ] Default: 7 giorni prima, 60 min dopo, orario 18:30
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
