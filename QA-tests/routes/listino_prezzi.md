# /listino/prezzi

Sorgente: `src/pages/PriceSheetPricesPage.tsx`

```json
{
  "route": "/listino/prezzi",
  "sourceFile": "src/pages/PriceSheetPricesPage.tsx",
  "title": "Aggiorna prezzi",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go"
  ],
  "analyzedAsRole": "titolare",
  "elements": {
    "forms": [
      {
        "id": "griglia-prezzi",
        "label": "Prezzi per taglia",
        "fields": [
          {
            "name": "Prezzo <voce> <razza>",
            "type": "text(decimale)",
            "required": false,
            "label": "es. \"Prezzo Bagno Yorkshire\"",
            "default": "28",
            "validations": [
              "valori negativi ignorati",
              "testo non numerico ignorato (resta il valore precedente)",
              "virgola decimale accettata: \"99,5\" diventa \"99,50\"",
              "valore uguale all’originale rimuove la modifica",
              "voci \"su valutazione\" non editabili"
            ],
            "sampleValid": "99,5",
            "sampleInvalid": "-5"
          }
        ],
        "submit": {
          "label": "Salva",
          "destructive": false,
          "note": "disabilitato con 0 prezzi modificati"
        }
      }
    ],
    "buttons": [
      {
        "label": "Indietro",
        "destructive": false,
        "opens": "/listino (dialogo \"Esci\" se ci sono modifiche)"
      },
      {
        "label": "Annulla tutto",
        "destructive": true,
        "opens": "dialogo \"Annullare le modifiche?\""
      },
      {
        "label": "Piccola",
        "type": "toggle",
        "destructive": false,
        "default": "selected"
      },
      {
        "label": "Media",
        "destructive": false
      },
      {
        "label": "Grande",
        "destructive": false
      },
      {
        "label": "Extra",
        "destructive": false,
        "note": "bagno+tosatura indicativo, taglio unghie, shampoo dermatologico"
      },
      {
        "label": "+5%",
        "destructive": false
      },
      {
        "label": "+10%",
        "destructive": false,
        "note": "verificato: 14 prezzi modificati in scheda Piccola"
      },
      {
        "label": "+1 €",
        "destructive": false
      },
      {
        "label": "−1 €",
        "destructive": false
      },
      {
        "label": "Arrotonda",
        "destructive": false
      },
      {
        "label": "Salva",
        "destructive": false,
        "opens": "toast \"prezzi salvati\""
      }
    ],
    "links": [
      {
        "label": "Indietro",
        "href": "/listino"
      }
    ],
    "modals": [
      {
        "id": "annulla-modifiche",
        "title": "Annullare le modifiche?",
        "elements": {
          "buttons": [
            "Conferma",
            "Annulla"
          ]
        }
      },
      {
        "id": "esci",
        "title": "Esci",
        "elements": {
          "text": "avviso modifiche perse",
          "buttons": [
            "Conferma",
            "Annulla"
          ]
        }
      }
    ],
    "tabs": [
      {
        "id": "scope",
        "items": [
          "Piccola",
          "Media",
          "Grande",
          "Extra"
        ],
        "pattern": "aria-pressed chips"
      }
    ],
    "tables": [
      {
        "id": "prezzi",
        "groups": "razze per taglia (Yorkshire; Maltese/Shih Tzu/Barboncino/Maltipoo; Jack Russell; Chihuahua/Pinscher; Volpino/Pomerania; Bassotto)",
        "columns": [
          "Voce",
          "Prezzo"
        ]
      }
    ]
  },
  "flows": [
    "Cambiare scheda taglia",
    "Modificare un singolo prezzo",
    "Operazione di massa (+5%, +10%, +1, -1, Arrotonda)",
    "Annullare tutto con conferma",
    "Salvare i prezzi",
    "Uscire con modifiche non salvate"
  ],
  "assertions": [
    "Salva disabilitato con 0 modifiche",
    "Dopo +10% il contatore mostra \"14 prezzi modificati\"",
    "Prezzo negativo ignorato",
    "Testo non numerico ignorato",
    "Annulla tutto apre il dialogo e Conferma azzera il contatore",
    "Il prezzo originale compare barrato quando modificato",
    "Collaboratore non accede (StaffSettings)"
  ],
  "api": [
    {
      "method": "POST",
      "url": "http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel",
      "status": 200
    },
    {
      "method": "GET",
      "url": "https://groomlyapp.it/release.json",
      "status": 200
    }
  ],
  "console": {
    "errors": [],
    "warnings": [
      "React Router Future Flag Warning (v7_startTransition)"
    ]
  }
}
```
