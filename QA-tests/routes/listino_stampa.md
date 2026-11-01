# /listino/stampa

Sorgente: `src/pages/PriceSheetExportPage.tsx`

```json
{
  "route": "/listino/stampa",
  "sourceFile": "src/pages/PriceSheetExportPage.tsx",
  "title": "Stampa e condividi",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "notes": "Le scelte (formato, tipo file, lingua, \"a partire da\") sono salvate nelle impostazioni del salone; per il collaboratore restano locali alla pagina. Stampa/Scarica/Condividi generano PDF/JPEG; sul web Scarica usa un download anchor.",
  "elements": {
    "forms": [
      {
        "id": "opzioni-foglio",
        "label": "Opzioni del foglio",
        "fields": [
          {
            "name": "formato",
            "type": "radio",
            "required": false,
            "label": "Formato carta (A4 / A3)",
            "validations": [],
            "sampleValid": "A3",
            "sampleInvalid": ""
          },
          {
            "name": "tipoFile",
            "type": "radio",
            "required": false,
            "label": "Tipo file (PDF / JPEG (immagine))",
            "validations": [],
            "sampleValid": "JPEG (immagine)",
            "sampleInvalid": ""
          },
          {
            "name": "lingua",
            "type": "radio",
            "required": false,
            "label": "Lingua del listino (Italiano / English / Español)",
            "validations": [],
            "sampleValid": "English",
            "sampleInvalid": ""
          },
          {
            "name": "aPartireDa",
            "type": "switch",
            "required": false,
            "label": "Scrivi \"a partire da\" sui prezzi",
            "validations": [],
            "sampleValid": "true",
            "sampleInvalid": ""
          }
        ],
        "submit": {
          "label": "Stampa / Scarica / Condividi",
          "destructive": false
        }
      }
    ],
    "buttons": [
      {
        "label": "Apri a schermo intero",
        "destructive": false,
        "opens": "overlay anteprima con pinch/pan"
      },
      {
        "label": "A4 / A3",
        "destructive": false
      },
      {
        "label": "PDF / JPEG (immagine)",
        "destructive": false
      },
      {
        "label": "Lingua del listino",
        "destructive": false,
        "opens": "dialog:lingua"
      },
      {
        "label": "Scrivi \"a partire da\" sui prezzi",
        "destructive": false,
        "opens": "toggle"
      },
      {
        "label": "Stampa",
        "destructive": false,
        "opens": "genera PDF e lo apre"
      },
      {
        "label": "Scarica",
        "destructive": false,
        "opens": "download file (web) o salva documenti (nativo)"
      },
      {
        "label": "Condividi",
        "destructive": false,
        "opens": "share nativo"
      },
      {
        "label": "Chiudi (schermo intero)",
        "destructive": false
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
        "id": "lingua",
        "title": "Lingua del listino",
        "elements": {
          "radios": [
            "Italiano",
            "English",
            "Español"
          ],
          "buttons": [
            "Chiudi"
          ]
        }
      },
      {
        "id": "schermo-intero",
        "title": "(overlay anteprima)",
        "elements": {
          "buttons": [
            "Chiudi"
          ],
          "gestures": [
            "pinch zoom",
            "pan"
          ]
        }
      }
    ],
    "tabs": [],
    "tables": []
  },
  "flows": [
    "Cambiare formato A4/A3 e leggere la didascalia di adattamento",
    "Scegliere PDF o JPEG",
    "Cambiare lingua del foglio",
    "Attivare/disattivare \"a partire da\"",
    "Anteprima a schermo intero",
    "Stampare/Scaricare/Condividere",
    "Errore export: toast lisExportKo"
  ],
  "assertions": [
    "Titolo \"Stampa e condividi\" con sottotitolo \"Il foglio è sempre uguale al listino cartaceo\"",
    "Anteprima mostra intestazione salone e prezzi con \"a partire da\"",
    "Dialog lingua con 3 opzioni, quella corrente aria-checked",
    "Stampa/Scarica/Condividi disabilitati mentre busy",
    "Collaboratore: le scelte non vengono salvate nelle impostazioni"
  ],
  "api": [
    {
      "method": "POST",
      "url": "http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel",
      "status": 200
    }
  ],
  "console": {
    "errors": [],
    "warnings": [
      "React Router Future Flag Warning: v7_startTransition"
    ]
  }
}
```
