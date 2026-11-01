# /impostazioni/legale

Sorgente: `src/pages/LegalePage.tsx`

```json
{
  "route": "/impostazioni/legale",
  "sourceFile": "src/pages/LegalePage.tsx",
  "title": "Legale",
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
    "External entries open https://groomlyapp.it/<pagina>/?lang=<lingua> via apriEsterno; not opened in-browser (external hosts blocked)"
  ],
  "elements": {
    "forms": [],
    "buttons": [
      {
        "label": "Privacy policy",
        "destructive": false,
        "opens": "external:https://groomlyapp.it/privacy/?lang=it"
      },
      {
        "label": "Termini di servizio",
        "destructive": false,
        "opens": "external:https://groomlyapp.it/termini/"
      },
      {
        "label": "Trattamento dati",
        "destructive": false,
        "opens": "external:https://groomlyapp.it/dpa/"
      },
      {
        "label": "Come eliminare l'account",
        "destructive": false,
        "opens": "external:https://groomlyapp.it/elimina-account/"
      }
    ],
    "links": [
      {
        "label": "Indietro",
        "href": "/impostazioni/account"
      },
      {
        "label": "Licenze open source",
        "href": "/impostazioni/licenze"
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
    "tables": []
  },
  "flows": [
    "Open each legal document (external)",
    "Open Licenze open source in-app"
  ],
  "assertions": [
    "Page lists 5 entries: Privacy policy, Termini di servizio, Trattamento dati, Licenze open source, Come eliminare l'account",
    "Licenze link goes to /impostazioni/licenze",
    "Back goes to /impostazioni/account"
  ],
  "api": [],
  "console": {
    "errors": [],
    "warnings": [
      "React Router Future Flag Warning v7_startTransition"
    ]
  }
}
```
