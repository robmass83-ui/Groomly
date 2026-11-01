# /listino/vedi

Sorgente: `src/pages/PriceViewPage.tsx`

```json
{
 "route": "/listino/vedi",
 "sourceFile": "src/pages/PriceViewPage.tsx",
 "title": "Listino",
 "requiresAuth": true,
 "authFailed": false,
 "analyzedAsRole": "titolare",
 "rolesAllowed": [
  "titolare",
  "titolare-go",
  "collaboratore"
 ],
 "note": "?id selects a price-list history file. With no file: \"Nessun file\". Image: pinch-zoom/pan frame. PDF: filename + Apri button.",
 "elements": {
  "forms": [],
  "buttons": [
   {
    "label": "Indietro",
    "destructive": false
   },
   {
    "label": "Apri",
    "destructive": false,
    "opens": "opens PDF (only when a PDF file is present)"
   },
   {
    "label": "image frame",
    "destructive": false,
    "opens": "touch pinch zoom/pan"
   }
  ],
  "links": [
   {
    "label": "Indietro",
    "href": "/listino"
   }
  ],
  "modals": [],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Empty state Nessun file",
  "View image price list with pinch zoom",
  "Open PDF price list",
  "Error text when file unreadable"
 ],
 "assertions": [
  "Header \"Listino\"",
  "Account without file shows \"Nessun file\""
 ],
 "api": [
  {
   "method": "POST",
   "url": "http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel",
   "status": 200
  },
  {
   "method": "POST",
   "url": "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:lookup",
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
   "React Router v7_startTransition future flag warning"
  ]
 }
}
```
