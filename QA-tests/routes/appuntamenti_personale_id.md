# /appuntamenti/personale/:id

Sorgente: `src/pages/PersonalAppointmentPage.tsx`

```json
{
 "route": "/appuntamenti/personale/:id",
 "sourceFile": "src/pages/PersonalAppointmentPage.tsx",
 "title": "Appuntamento personale",
 "requiresAuth": true,
 "authFailed": false,
 "rolesAllowed": [
  "titolare",
  "titolare-go",
  "collaboratore"
 ],
 "analyzedAsRole": "titolare",
 "elements": {
  "forms": [
   {
    "id": "personale",
    "label": "Appuntamento personale",
    "fields": [
     {
      "name": "title",
      "type": "text",
      "required": true,
      "label": "Titolo",
      "validations": [
       "trim, 1-60 caratteri (personalTitleOk)",
       "errore: 'Scrivi un titolo.'"
      ],
      "sampleValid": "Dentista",
      "sampleInvalid": "",
      "placeholder": ""
     },
     {
      "name": "day",
      "type": "date",
      "required": false,
      "label": "Data",
      "validations": [
       "default: ?data= o oggi"
      ],
      "sampleValid": "2026-11-05",
      "sampleInvalid": ""
     },
     {
      "name": "startTime",
      "type": "time",
      "required": true,
      "label": "Ora di inizio",
      "validations": [
       "necessaria per salvare; HH:MM valido"
      ],
      "sampleValid": "10:00",
      "sampleInvalid": ""
     },
     {
      "name": "endTime",
      "type": "time",
      "required": false,
      "label": "Ora di fine",
      "validations": [
       "opzionale; dopo l'inizio, stesso giorno",
       "errore: \"L'ora di fine è dopo l'inizio.\""
      ],
      "sampleValid": "11:00",
      "sampleInvalid": "09:00"
     }
    ],
    "submit": {
     "label": "Salva",
     "destructive": false
    }
   }
  ],
  "buttons": [
   {
    "label": "Salva",
    "destructive": false
   },
   {
    "label": "Elimina (solo per id personale esistente)",
    "destructive": true,
    "opens": "modal:conferma eliminazione"
   },
   {
    "label": "Chiudi",
    "destructive": false
   }
  ],
  "links": [],
  "modals": [
   {
    "id": "conferma-elimina",
    "title": "Eliminare {titolo} del {data} alle {ora}?",
    "elements": {
     "buttons": [
      "Annulla",
      "Elimina"
     ]
    }
   }
  ],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Creare un appuntamento personale (id non esistente o /nuovo = creazione)",
  "Modificare titolo/orari di uno esistente",
  "Eliminare con conferma (destructive)"
 ],
 "assertions": [
  "Salva con titolo vuoto mostra 'Scrivi un titolo.'",
  "Fine prima dell'inizio mostra errore fine",
  "Con id inesistente il form e' vuoto e senza bottone Elimina",
  "Chiudi torna alla pagina di sfondo"
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
 },
 "notes": "Nessun appuntamento personale nel seed: analizzato con /appuntamenti/personale/nuovo (stesso componente) e id inesistente. Elimina compare solo per id personale esistente. Sheet sopra la Home. Titolo senza maxlength nel DOM: il limite 60 e' solo validazione."
}
```
