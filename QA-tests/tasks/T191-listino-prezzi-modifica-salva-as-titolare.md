# T191-listino-prezzi-modifica-salva-as-titolare: Aggiorna prezzi - modifica e salvataggio

| Field | Value |
|---|---|
| Route | `/listino/prezzi` |
| Source | `src/pages/PriceSheetPricesPage.tsx` |
| Flow | Cambiare scheda taglia; modificare un singolo prezzo; salvare |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare; listino seed con scheda Piccola (es. `Bagno Yorkshire` = 28)

## Test data
- `prezzoNuovo = "99,5"` (diventa "99,50")
- `prezzoVoce = "Prezzo Bagno Yorkshire"`

## Steps

### TC-01: Happy path - Modificare un prezzo e salvare
1. Sign in as titolare. Navigate to `/listino/prezzi`.
2. Assert: titolo `Aggiorna prezzi`; scheda `Piccola` selezionata (aria-pressed); **`Salva`** disabilitato (0 modifiche).
3. Nel campo `Prezzo Bagno Yorkshire` scrivi `99,5` ed esci dal campo.
4. Assert: il valore diventa `99,50`; il prezzo originale compare barrato; contatore "1 prezzi modificati" (o 1 prezzo modificato); **`Salva`** abilitato.
5. Clicca **`Salva`**.
6. Assert: toast con testo "prezzi salvati"; **`Salva`** torna disabilitato; contatore azzerato.
7. Ricarica. Assert: `Prezzo Bagno Yorkshire` = `99,50`.
8. Ripristina il valore originale (28) e **`Salva`** per lasciare i dati puliti.

### TC-02: Cambio scheda
1. Clicca **`Media`**, **`Grande`**, **`Extra`**. Assert: ogni scheda ha aria-pressed true e mostra le sue voci (Extra: bagno+tosatura indicativo, taglio unghie, shampoo dermatologico).
2. Modifica un prezzo in `Piccola`, passa a `Media` e torna. Assert: la modifica è mantenuta e il contatore la include.

### TC-03: Voci su valutazione
1. Assert: le voci "su valutazione" non sono editabili.

## Assertions
- [ ] Salva disabilitato con 0 modifiche
- [ ] Prezzo originale barrato quando modificato
- [ ] Virgola decimale accettata: "99,5" diventa "99,50"
- [ ] Valore persistente dopo reload
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Prezzo modificato (barrato)
- Toast dopo Salva

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
