# /impostazioni/utenti

Sorgente: `src/app/router.tsx`

```json
{
  "route": "/impostazioni/utenti",
  "sourceFile": "src/app/router.tsx",
  "title": "Utenti (solo operatore)",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "note": "Pagina riservata agli operatori (isOperator(email)). Con il titolare QA reindirizza (replace) a /impostazioni: nessuna UI osservabile. Struttura ricavata dal sorgente; account operatore assente dalle credenziali QA.",
  "observedRedirect": {
    "from": "/impostazioni/utenti",
    "to": "/impostazioni",
    "role": "titolare"
  },
  "elements": {
    "forms": [
      {
        "id": "dialogo-testo",
        "label": "Dialogo azione piano (bypass-pro/spegni)",
        "fields": [
          {
            "name": "testo",
            "type": "textarea",
            "required": true,
            "label": "Messaggio/motivo",
            "validations": [
              "Conferma disabilitata se il messaggio non è pronto"
            ],
            "sampleValid": "Omaggio per test",
            "sampleInvalid": ""
          }
        ],
        "submit": {
          "label": "Conferma",
          "destructive": false
        }
      },
      {
        "id": "elimina-toelettatura",
        "label": "Elimina toelettatura (solo test)",
        "fields": [
          {
            "name": "parolaElimina",
            "type": "text",
            "required": true,
            "validations": [
              "parola di conferma richiesta"
            ],
            "sampleValid": "ELIMINA",
            "sampleInvalid": "x"
          }
        ],
        "submit": {
          "label": "Elimina",
          "destructive": true
        }
      }
    ],
    "buttons": [
      {
        "label": "Interruttore tour",
        "type": "switch",
        "destructive": false
      },
      {
        "label": "Toelettature",
        "destructive": false,
        "opens": "?zona=saloni"
      },
      {
        "label": "Suggerimenti",
        "destructive": false,
        "opens": "?zona=note"
      },
      {
        "label": "<salone>, <titolare>",
        "destructive": false,
        "opens": "?zona=salone&id=<id>"
      },
      {
        "label": "Attiva piano / Omaggio / Prova 30 gg / Spegni",
        "destructive": false,
        "opens": "dialogo piano"
      },
      {
        "label": "Elimina toelettatura",
        "destructive": true,
        "opens": "dialogo elimina"
      },
      {
        "label": "<categoria>, N",
        "destructive": false,
        "opens": "?zona=coda&cat=<id>"
      },
      {
        "label": "Da vedere/Interessanti/Visti",
        "type": "segmented",
        "destructive": false
      },
      {
        "label": "Esporta",
        "destructive": false,
        "opens": "dialogo esporta"
      },
      {
        "label": "Stella (segna interessante)",
        "destructive": false
      },
      {
        "label": "Visto",
        "destructive": false
      }
    ],
    "links": [],
    "modals": [
      {
        "id": "piano",
        "title": "(titolo dinamico)"
      },
      {
        "id": "elimina",
        "title": "Elimina toelettatura"
      },
      {
        "id": "esporta",
        "title": "Esporta suggerimenti",
        "elements": {
          "radio": [
            "portata"
          ],
          "formato": [
            "pdf"
          ]
        }
      }
    ],
    "tabs": [],
    "tables": []
  },
  "flows": [
    "Non operatore reindirizzato a /impostazioni",
    "(Operatore) elencare saloni, aprire scheda, cambiare piano",
    "(Operatore) smistare suggerimenti ed esportare"
  ],
  "assertions": [
    "Un titolare non operatore atterra su /impostazioni",
    "URL finale è /impostazioni e non /impostazioni/utenti"
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
