# /

Sorgente: `src/pages/HomePage.tsx`

```json
{
 "route": "/",
 "sourceFile": "src/pages/HomePage.tsx",
 "title": "Home (Oggi)",
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
  "buttons": [
   {
    "label": "Cerca",
    "destructive": false,
    "opens": "navigates to /animali with search focus"
   },
   {
    "label": "Nuovo appuntamento",
    "destructive": false,
    "opens": "sheet:/appuntamenti/nuovo"
   },
   {
    "label": "Apri <cane>",
    "destructive": false,
    "opens": "navigates /animali/:id"
   },
   {
    "label": "Completato <cane>",
    "destructive": false
   },
   {
    "label": "Non venuto <cane>",
    "destructive": false
   },
   {
    "label": "Disdetto <cane>",
    "destructive": true,
    "opens": "modal:Chi disdice?"
   },
   {
    "label": "Vedi",
    "destructive": false
   },
   {
    "label": "Aggiungi (FAB)",
    "destructive": false,
    "opens": "add menu"
   },
   {
    "label": "Aggiungi (card dati da completare)",
    "destructive": false,
    "opens": "navigates /impostazioni/account?scheda=personali"
   }
  ],
  "links": [
   {
    "label": "Calendario",
    "href": "/calendario?data=<oggi>"
   },
   {
    "label": "Oggi tile",
    "href": "/calendario?data=<oggi>"
   },
   {
    "label": "Incassi di oggi",
    "href": "/incassi?periodo=giorno"
   },
   {
    "label": "Mensili tile",
    "href": "/mensili"
   },
   {
    "label": "Listino Apri",
    "href": "/listino"
   },
   {
    "label": "Impostazioni (avviso)",
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
  "modals": [
   {
    "id": "disdetto-chi",
    "title": "Chi disdice?",
    "elements": {
     "buttons": [
      "Cliente",
      "Salone",
      "Indietro"
     ]
    }
   },
   {
    "id": "rimuovi-appuntamento",
    "title": "conferma rimozione (askingRemove)",
    "elements": {}
   }
  ],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Vedere gli appuntamenti di oggi",
  "Chiudere una visita da 'Da chiudere' come completata / non venuto / disdetto",
  "Aprire un nuovo appuntamento",
  "Aprire il tile Mensili / Listino / Incassi"
 ],
 "assertions": [
  "Sezioni OGGI e DA CHIUDERE visibili con dati seed",
  "Disdetto apre 'Chi disdice?' con Cliente/Salone/Indietro",
  "Nuovo appuntamento apre /appuntamenti/nuovo con Cane, Servizi, Quando",
  "Tile Mensili mostra booked/total (es. 20/23)"
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
   "React Router Future Flag Warning v7_startTransition"
  ]
 }
}
```
