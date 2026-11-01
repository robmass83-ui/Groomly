# /impostazioni/abbonamento

Sorgente: `src/pages/AbbonamentoPage.tsx`

```json
{
 "route": "/impostazioni/abbonamento",
 "sourceFile": "src/pages/AbbonamentoPage.tsx",
 "title": "Abbonamento",
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
    "label": "Aggiungi (FAB)",
    "destructive": false
   }
  ],
  "links": [
   {
    "label": "Indietro",
    "href": "/impostazioni"
   },
   {
    "label": "Groomly Go (Gratis/Attivo)",
    "href": "/impostazioni/abbonamento/go"
   },
   {
    "label": "Groomly Plus (Attivo / prezzo al mese)",
    "href": "/impostazioni/abbonamento/plus"
   },
   {
    "label": "Groomly Salone 19,99 € al mese",
    "href": "/impostazioni/abbonamento/salone"
   }
  ],
  "modals": [],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Vedere i tre piani con stato Attivo/prezzo",
  "Aprire il dettaglio di un piano"
 ],
 "assertions": [
  "Tre schede Go, Plus, Salone visibili",
  "Il piano attivo mostra 'Attivo', gli altri il prezzo",
  "Ogni scheda porta a /impostazioni/abbonamento/:piano"
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
