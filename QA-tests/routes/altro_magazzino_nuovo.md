# /altro/magazzino/nuovo

Sorgente: `src/pages/ProdottoPage.tsx`

```json
{
  "route": "/altro/magazzino/nuovo",
  "sourceFile": "src/pages/ProdottoPage.tsx",
  "title": "Nuovo prodotto",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "note": "Analisi statica dal codice, non rilevata in browser (6/11/2026). Modulo prodotto.",
  "elements": {
    "fields": [
      "Prodotto (obbligatorio, max 120)",
      "Categoria (radio)",
      "Quantità (vuota o numero maggiore di zero)",
      "Unità (Litri/ml)",
      "Fornitore / ditta (con proposte)",
      "Codice prodotto"
    ],
    "errors": [
      "Scrivi il nome del prodotto",
      "Scrivi un numero maggiore di zero"
    ]
  }
}

```
