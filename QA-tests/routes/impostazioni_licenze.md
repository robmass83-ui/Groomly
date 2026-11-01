# /impostazioni/licenze

Sorgente: `src/pages/LicenzePage.tsx`

```json
{
 "route": "/impostazioni/licenze",
 "sourceFile": "src/pages/LicenzePage.tsx",
 "title": "Licenze open source",
 "requiresAuth": true,
 "authFailed": false,
 "rolesAllowed": [
  "titolare",
  "titolare-go",
  "collaboratore"
 ],
 "analyzedAsRole": "titolare",
 "elements": {
  "forms": [],
  "buttons": [],
  "links": [
   {
    "label": "Indietro",
    "href": "/impostazioni/legale"
   },
   {
    "label": "React MIT",
    "href": "https://github.com/facebook/react"
   },
   {
    "label": "Capacitor MIT",
    "href": "https://github.com/ionic-team/capacitor"
   },
   {
    "label": "Firebase Apache-2.0",
    "href": "https://github.com/firebase/firebase-js-sdk"
   },
   {
    "label": "Lucide ISC",
    "href": "https://github.com/lucide-icons/lucide"
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
    "id": "licenze",
    "columns": [
     "Libreria",
     "Licenza"
    ],
    "sortable": false,
    "filterable": false,
    "pagination": false,
    "rowActions": [
     "link esterno al repository"
    ]
   }
  ]
 },
 "flows": [
  "Leggere l'elenco delle librerie open source",
  "Aprire il repository di una libreria",
  "Tornare a Legale"
 ],
 "assertions": [
  "Titolo 'Licenze open source' e testo 'Groomly usa librerie open source…'",
  "Quattro librerie: React MIT, Capacitor MIT, Firebase Apache-2.0, Lucide ISC",
  "Indietro porta a /impostazioni/legale"
 ],
 "api": [],
 "console": {
  "errors": [],
  "warnings": [
   "React Router Future Flag Warning: v7_startTransition (benign)"
  ]
 }
}
```
