# /impostazioni/info

Sorgente: `src/pages/InfoGroomlyPage.tsx`

```json
{
 "route": "/impostazioni/info",
 "sourceFile": "src/pages/InfoGroomlyPage.tsx",
 "title": "Info su Groomly",
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
    "href": "/impostazioni/account"
   },
   {
    "label": "Novità",
    "href": "/impostazioni/aggiornamenti"
   },
   {
    "label": "Valuta l'app",
    "href": "https://play.google.com/store/apps/details?id=it.groomly.app"
   },
   {
    "label": "Contattaci",
    "href": "mailto:info@groomlyapp.it"
   },
   {
    "label": "Sito web",
    "href": "https://groomlyapp.it"
   }
  ],
  "modals": [],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Leggere versione e guida d'uso",
  "Aprire Novità, Valuta, Contatto, Sito"
 ],
 "assertions": [
  "Riga Versione mostra build corrente",
  "Sette voci 'Come si usa' (Animali, Agenda, Listino, Dati, Incassi, Backup, Avvisi)",
  "Link esterni hanno gli href attesi"
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
