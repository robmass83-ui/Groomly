# T106-info-groomly-as-titolare: Info su Groomly - versione, guida e link

| Field | Value |
|---|---|
| Route | `/impostazioni/info` |
| Source | `src/pages/InfoGroomlyPage.tsx` |
| Flow | Leggere versione e guida d'uso; aprire Novità, Valuta, Contatto, Sito |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- Voci "Come si usa": Animali, Agenda, Listino, Dati, Incassi, Backup, Avvisi
- Href attesi: Novità `/impostazioni/aggiornamenti`; Valuta l'app `https://play.google.com/store/apps/details?id=it.groomly.app`; Contattaci `mailto:info@groomlyapp.it`; Sito web `https://groomlyapp.it`

## Steps

### TC-01: Happy path - Leggere la pagina
1. Sign in as titolare. Navigate to `/impostazioni/info`.
2. Assert: titolo **Info su Groomly**; la riga **Versione** mostra la build corrente (non vuota).
3. Assert: sono presenti le sette voci "Come si usa": Animali, Agenda, Listino, Dati, Incassi, Backup, Avvisi.
4. Espandi/apri ogni voce. Assert: ciascuna mostra testo di guida non vuoto.

### TC-02: Link
| Link | Azione | Risultato atteso |
|---|---|---|
| Indietro | click | URL `/impostazioni/account` |
| Novità | click | URL `/impostazioni/aggiornamenti` |
| Valuta l'app | verifica href | `https://play.google.com/store/apps/details?id=it.groomly.app` |
| Contattaci | verifica href | `mailto:info@groomlyapp.it` |
| Sito web | verifica href | `https://groomlyapp.it` |

Non seguire i link esterni: verifica solo l'attributo href.

### TC-03: Negative & edge cases
- Click **Aggiungi (FAB)**: si apre il menu di aggiunta senza errori.
- Reload su `/impostazioni/info`: contenuto invariato.

## Assertions
- [ ] Versione mostra la build corrente.
- [ ] Sette voci Come si usa presenti.
- [ ] Link esterni con href attesi.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Una voce guida espansa

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
