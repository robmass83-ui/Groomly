# /impostazioni/aggiornamenti

Sorgente: `src/pages/ReleaseHistoryPage.tsx`

```json
{
  "route": "/impostazioni/aggiornamenti",
  "sourceFile": "src/pages/ReleaseHistoryPage.tsx",
  "title": "Aggiornamenti",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "notes": "Solo build APK (aggiornamentiApkAttivi), altrimenti redirect a /impostazioni. In test api.github.com e bloccata dalla guard dell'harness: la pagina mostra lo stato di errore.",
  "elements": {
    "forms": [],
    "buttons": [
      {
        "label": "Riprova",
        "destructive": false,
        "opens": "ricarica le release (stato errore)"
      },
      {
        "label": "Release precedenti",
        "destructive": false,
        "opens": "carica pagina successiva (solo con Link next)"
      },
      {
        "label": "Indietro (header)",
        "destructive": false,
        "opens": "/impostazioni"
      }
    ],
    "links": [
      {
        "label": "Indietro",
        "href": "/impostazioni"
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
    "modals": [],
    "tabs": [],
    "tables": [
      {
        "id": "release-list",
        "columns": [
          "versione",
          "data",
          "badge Questa se installata",
          "note"
        ],
        "sortable": false,
        "filterable": false,
        "pagination": true,
        "rowActions": []
      }
    ]
  },
  "flows": [
    "Caricare storico release da GitHub",
    "Errore di rete: \"Lo storico non si carica\" + Riprova",
    "Caricare release precedenti",
    "Release installata marcata"
  ],
  "assertions": [
    "Titolo \"Aggiornamenti\" con sottotitolo \"Versione installata <versione>\"",
    "GitHub non raggiungibile: \"Lo storico non si carica\" e bottone Riprova",
    "Con release: ogni blocco mostra versione, data (d MMM yyyy) e note o \"nessuna nota\""
  ],
  "api": [
    {
      "method": "GET",
      "url": "https://api.github.com/repos/<RELEASE_REPO>/releases?per_page=100",
      "status": "blocked (ERR_FAILED)"
    }
  ],
  "console": {
    "errors": [
      "Failed to load resource: net::ERR_FAILED (x2, GitHub bloccato)"
    ],
    "warnings": [
      "React Router Future Flag Warning: v7_startTransition"
    ]
  }
}
```
