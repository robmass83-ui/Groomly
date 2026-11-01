# T087-account-elimina-validazione-as-titolare: Elimina account - validazione password e frase

| Field | Value |
|---|---|
| Route | `/impostazioni/account/elimina` |
| Source | `src/pages/EliminaAccountPage.tsx` |
| Flow | Password errata; frase non valida |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes (mai cliccare Conferma elimina) |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare; wizard portato al passo 4 con **`Continua`** (passi 0..3)

## Test data
- `wrongPassword = "wrongpass1"`
- `passwordVuota = ""`
- `fraseValida1 = "ELIMINA"`; `fraseValida2 = nome del salone (trim)`
- `fraseInvalide = "elimina"`, `"ELIMINA "` (con spazio finale e trim: valida), `"x"`, `""`

## Steps

### TC-01: Form validation - `wizard-password`
1. Porta il wizard al passo password.
2. Con campo vuoto: assert **`Continua`** disabilitato.
3. Digita `wrongpass1` e clicca **`Continua`**. Assert: alert `Email o password non corretti`; il wizard resta al passo password; una chiamata a `signInWithPassword` risponde 400 (atteso).
4. Svuota il campo. Assert: **`Continua`** di nuovo disabilitato.

### TC-02: Form validation - `wizard-frase`
1. Inserisci la password corretta del ruolo e clicca **`Continua`** (passo 5).
2. Assert: **`Conferma elimina`** disabilitato con campo vuoto.

| Valore frase | Esito atteso |
|---|---|
| "" | disabilitato |
| `x` | disabilitato |
| `elimina` | disabilitato (case-sensitive) |
| `ELIMINAA` | disabilitato |
| `ELIMINA` | abilitato |
| nome esatto del salone | abilitato |

3. Per ogni riga digita il valore e assert lo stato del pulsante. Termina con campo svuotato. NON cliccare **`Conferma elimina`**.

### TC-03: Abbandono
1. Clicca **`Indietro`**. Assert: URL `/impostazioni/account?scheda=privacy` e l'account esiste ancora (ricarica: sessione ancora valida).

## Assertions
- [ ] Password errata mostra "Email o password non corretti"
- [ ] Passo 5: eliminazione disabilitata con frase diversa da ELIMINA/nome salone
- [ ] Il 400 su signInWithPassword è l'unico errore di rete/console atteso (solo TC-01 passo 3)
- [ ] Nessun account eliminato

## Screenshots required
- Errore password errata
- Pulsante disabilitato con frase `elimina`
- Pulsante abilitato con `ELIMINA` (prima di non cliccare)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
