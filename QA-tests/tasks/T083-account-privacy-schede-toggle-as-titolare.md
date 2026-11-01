# T083-account-privacy-schede-toggle-as-titolare: Gestisci account - schede, privacy e toggle

| Field | Value |
|---|---|
| Route | `/impostazioni/account` |
| Source | `src/pages/AccountPage.tsx` |
| Flow | Navigare tra le schede; attivare/disattivare promozioni e metriche; cambiare logo |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 24 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- File immagine `QA-tests/fixtures/logo.png` (PNG valido) e `QA-tests/fixtures/doc.txt`
- Il runner annota e ripristina lo stato iniziale dei toggle e del logo

## Test data
- `logo = QA-tests/fixtures/logo.png`, `badLogo = QA-tests/fixtures/doc.txt`

## Steps

### TC-01: Happy path - navigare tra le schede
1. Sign in as titolare. Navigate to `/impostazioni/account`.
2. Click **Info personali**. Assert: URL contiene `?scheda=personali`.
3. Click **Indietro**. Assert: home account con tre riquadri.
4. Click **Sicurezza**. Assert: URL contiene `?scheda=sicurezza`; visibili Password, Cambia email, **Esci da tutti gli altri dispositivi**.
5. Click **Indietro**, poi **Privacy e dati**. Assert: URL contiene `?scheda=privacy`; visibili toggle "Email promozionali" e "Metriche", link **Centro privacy**, **Scarica i miei dati**, **Elimina account**.

### TC-02: Toggle promozioni e metriche
1. In Privacy e dati annotare lo stato di **Email promozionali (toggle)**.
2. Click il toggle. Assert: lo stato cambia (aria-checked invertito).
3. Reload `?scheda=privacy`. Assert: lo stato persiste. Ripristinare lo stato originale.
4. Ripetere per **Metriche (toggle)**.

### TC-03: Cambia logo
1. Click **Cambia logo** e caricare `logo.png`. Assert: il logo nella testata aggiorna l'immagine (upload immediato), nessun errore.
2. Caricare `doc.txt`. Assert: toast d'errore o file rifiutato; il logo precedente rimane.

### TC-04: Link
| Link | Expected |
|---|---|
| **Centro privacy** | URL `/impostazioni/legale` |
| **Scarica i miei dati** | URL `/impostazioni` con il dialog backup aperto |
| **Lingua** | URL `/impostazioni` con il dialog lingua aperto |
| **Elimina account** | URL `/impostazioni/account/elimina` (non procedere) |
| **Legale** | URL `/impostazioni/legale` |
| **Info su Groomly** | URL `/impostazioni/info` |

Dopo ogni click tornare con il back del browser.

### TC-05: Negative & edge cases
- Navigate to `/impostazioni/account?scheda=inesistente`. Assert: nessun crash; si mostra la home account.
- Reload su `?scheda=sicurezza`. Assert: resta sulla scheda Sicurezza.

## Assertions
- [ ] Le tre schede si aprono e **Indietro** funziona.
- [ ] I toggle persistono dopo reload.
- [ ] I link portano alle destinazioni previste.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni scheda aperta
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
