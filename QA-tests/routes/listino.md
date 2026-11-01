# /listino

Sorgente: `src/pages/ListinoPage.tsx`

```json
{
  "route": "/listino",
  "sourceFile": "src/pages/ListinoPage.tsx",
  "title": "Listino prezzi",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "notes": [
    "Role collaboratore (staff55a@test.groomly) logs in but every page shows a full-screen block \"Il tuo accesso a Pelo & Coccole Nuoro 55 e sospeso / Il titolare ha spento il piano. I dati non sono persi.\" with only an Esci button; analysed as titolare instead.",
    "Price-file list is empty for the test account (\"Nessun file\"); Rinomina/Elimina controls and a link to /listino/vedi?id= appear only once a file is uploaded; delete opens a Dialog with Annulla/Elimina (not exercised)",
    "File input is hidden (accept pdf, image/*), triggered by the \"Aggiungi il tuo listino prezzi\" button; size limit FILE_MAX_BYTES"
  ],
  "elements": {
    "forms": [
      {
        "id": "listino-file-upload",
        "label": "Aggiungi il tuo listino prezzi",
        "fields": [
          {
            "name": "file",
            "type": "file",
            "required": false,
            "label": "Aggiungi il tuo listino prezzi",
            "validations": [
              "accept application/pdf,image/*,.pdf",
              "multiple",
              "too large shows toast",
              "unusable photo shows toast"
            ],
            "sampleValid": "listino.pdf (small PDF)",
            "sampleInvalid": "file larger than FILE_MAX_BYTES"
          },
          {
            "name": "rename",
            "type": "text",
            "required": false,
            "label": "Nome di <file> (inline after Rinomina)",
            "validations": [
              "Enter commits, Escape cancels, blur commits; empty ignored"
            ],
            "sampleValid": "Listino 2026.pdf",
            "sampleInvalid": ""
          }
        ],
        "submit": null
      }
    ],
    "buttons": [
      {
        "label": "Gestione listino",
        "destructive": false,
        "opens": "/listino/gestione"
      },
      {
        "label": "Aggiorna prezzi",
        "destructive": false,
        "opens": "/listino/prezzi"
      },
      {
        "label": "Stampa e condividi",
        "destructive": false,
        "opens": "/listino/stampa"
      },
      {
        "label": "Aggiungi il tuo listino prezzi",
        "destructive": false,
        "opens": "file chooser"
      },
      {
        "label": "Piccola",
        "destructive": false,
        "role": "jump-tab"
      },
      {
        "label": "Media",
        "destructive": false,
        "role": "jump-tab"
      },
      {
        "label": "Grande",
        "destructive": false,
        "role": "jump-tab"
      },
      {
        "label": "Extra",
        "destructive": false,
        "role": "jump-tab"
      },
      {
        "label": "Info",
        "destructive": false,
        "role": "jump-tab"
      },
      {
        "label": "Rinomina <file> (conditional)",
        "destructive": false
      },
      {
        "label": "Elimina <file> (conditional)",
        "destructive": true,
        "opens": "dialog:elimina-file"
      }
    ],
    "links": [
      {
        "label": "Gestisci",
        "href": "/listino/gestione"
      },
      {
        "label": "Modifica",
        "href": "/impostazioni/servizi"
      },
      {
        "label": "Home",
        "href": "/"
      },
      {
        "label": "Animali",
        "href": "/animali"
      },
      {
        "label": "Agenda",
        "href": "/calendario"
      },
      {
        "label": "Mensili",
        "href": "/mensili"
      },
      {
        "label": "Listino",
        "href": "/listino"
      },
      {
        "label": "Impostazioni",
        "href": "/impostazioni"
      }
    ],
    "modals": [
      {
        "id": "elimina-file",
        "title": "Elimina? (confirm)",
        "elements": {
          "buttons": [
            "Annulla",
            "Elimina"
          ]
        }
      }
    ],
    "tabs": [
      {
        "id": "taglia",
        "tabs": [
          "Piccola",
          "Media",
          "Grande",
          "Extra",
          "Info"
        ],
        "note": "sticky anchors that scroll to sections"
      }
    ],
    "tables": [
      {
        "id": "prezzi-tempi",
        "columns": [
          "Servizio",
          "Piccola",
          "Media",
          "Grande"
        ],
        "sortable": false,
        "filterable": false,
        "pagination": false,
        "rowActions": []
      }
    ]
  },
  "flows": [
    "Navigate to Gestione/Aggiorna prezzi/Stampa",
    "Upload a price-list PDF/image and see it listed",
    "Rename and view uploaded file",
    "Delete uploaded file via confirm dialog",
    "Jump between size sections",
    "Review price table"
  ],
  "assertions": [
    "Header \"Listino prezzi\" with \"Aggiornato <data>\" subtitle",
    "Empty state \"Nessun file\" when no uploads",
    "Sections LISTINO PER RAZZA, PREZZI E TEMPI STANDARD, SERVIZI AGGIUNTIVI present",
    "Table has 4 columns",
    "Piccola tab pressed by default"
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
      "React Router Future Flag Warning v7_startTransition"
    ]
  }
}
```
