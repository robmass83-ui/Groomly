# /animali

Sorgente: `src/pages/DogsPage.tsx`

```json
{
  "route": "/animali",
  "sourceFile": "src/pages/DogsPage.tsx",
  "title": "Animali",
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
    "/animali?tab=archivio redirects to /impostazioni/archivio",
    "Tab \"In attesa\" only appears when the waiting-list email service is on (navigates to /animali/attesa)",
    "Chip \"Altri\" only appears when an other-species animal exists",
    "List scroll position persisted in sessionStorage key groomly.dogs-list-scroll"
  ],
  "elements": {
    "forms": [
      {
        "id": "dogs-search",
        "label": "Cerca",
        "fields": [
          {
            "name": "query",
            "type": "text",
            "required": false,
            "label": "Cerca",
            "placeholder": "Nome, proprietario o razza",
            "validations": [],
            "sampleValid": "Bella",
            "sampleInvalid": "zzzzqq (no match, shows empty state \"Aggiungi un animale\")"
          }
        ],
        "submit": null
      }
    ],
    "buttons": [
      {
        "label": "Ordina",
        "destructive": false,
        "opens": "sheet:ordina"
      },
      {
        "label": "Attivi N",
        "destructive": false,
        "role": "tab"
      },
      {
        "label": "Mensili N",
        "destructive": false,
        "role": "tab"
      },
      {
        "label": "Occasionali N",
        "destructive": false,
        "role": "tab"
      },
      {
        "label": "Nuovi N",
        "destructive": false,
        "role": "tab"
      },
      {
        "label": "In attesa (conditional tab)",
        "destructive": false,
        "opens": "/animali/attesa"
      },
      {
        "label": "Tutti",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "Mordaci",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "Anziani",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "In agenda",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "Gatti",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "Altri (conditional chip)",
        "destructive": false,
        "role": "chip"
      },
      {
        "label": "Apri <nome>",
        "destructive": false,
        "opens": "/animali/:id",
        "note": "one per dog row"
      },
      {
        "label": "Ripristina (archived rows only)",
        "destructive": false
      },
      {
        "label": "Aggiungi un animale / Aggiungi il primo (empty state)",
        "destructive": false,
        "opens": "/animali/nuovo"
      }
    ],
    "links": [
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
        "id": "ordina",
        "title": "Ordina",
        "type": "sheet",
        "elements": {
          "buttons": [
            "Alfabetico (default pressed)",
            "Per prossimo appuntamento",
            "Chiudi"
          ]
        }
      }
    ],
    "tabs": [
      {
        "id": "stato",
        "tablist": "Stato",
        "tabs": [
          "Attivi",
          "Mensili",
          "Occasionali",
          "Nuovi",
          "In attesa (conditional)"
        ]
      }
    ],
    "tables": [
      {
        "id": "dogs-list",
        "columns": [
          "Avatar",
          "Nome + flag mensile/anziano",
          "Razza, eta, proprietario",
          "Prossimo appuntamento",
          "Temperamento"
        ],
        "sortable": true,
        "filterable": true,
        "pagination": false,
        "rowActions": [
          "Apri",
          "Ripristina"
        ]
      }
    ]
  },
  "flows": [
    "Search dogs by name/owner/breed",
    "Switch tab Attivi/Mensili/Occasionali/Nuovi and verify counts match header",
    "Apply filter chips (Mordaci, Anziani, In agenda, Gatti)",
    "Sort alphabetical vs next appointment",
    "Open dog detail from row",
    "Empty search shows add-animal CTA to /animali/nuovo",
    "Restore archived dog"
  ],
  "assertions": [
    "Header subtitle \"37 attivi · 2 in archivio\" matches counts",
    "Tab Attivi selected by default, chip Tutti pressed",
    "Sort sheet shows 2 options, Alfabetico pressed by default",
    "No-match query shows \"Aggiungi un animale\" button",
    "/animali?tab=archivio redirects to /impostazioni/archivio"
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
