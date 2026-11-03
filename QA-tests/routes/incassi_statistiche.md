# /incassi/statistiche

Sorgente: `src/pages/StatistichePage.tsx`

```json
{
 "route": "/incassi/statistiche",
 "sourceFile": "src/pages/StatistichePage.tsx",
 "title": "Statistiche",
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
    "label": "Aggiungi (tab bar FAB)",
    "destructive": false,
    "opens": "/appuntamenti/nuovo"
   }
  ],
  "links": [
   {
    "label": "Indietro",
    "href": "/incassi/report"
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
 "cards": [
  {
   "id": "euro-ora",
   "text": "€ all’ora · <€ importo> · visite completate"
  },
  {
   "id": "previsione",
   "text": "Previsione del mese · <€ importo> · <nome del mese in corso>"
  },
  {
   "id": "in-ritardo",
   "text": "Clienti in ritardo · <n> · oltre il loro ritmo abituale"
  }
 ],
 "flows": [
  "View stats cards (€ all’ora, Previsione del mese, Clienti in ritardo)",
  "Back to /incassi/report",
  "Collaboratore sees only visibleAppointments per spettatoreIncassi"
 ],
 "assertions": [
  "Heading \"Statistiche\" visible",
  "Three stat cards (label, value, subtitle): € all’ora and Previsione del mese as euro amounts (€), subtitle of Previsione = current month name, Clienti in ritardo a count; with Nascondi importi on, the two euro cards show ••• and no euro digits",
  "Indietro goes to /incassi/report"
 ],
 "api": [],
 "console": {
  "errors": [],
  "warnings": [
   "React Router Future Flag Warning: v7_startTransition (x1-2)"
  ]
 }
}
```
