# /appuntamenti/:id

Sorgente: `src/pages/AppointmentPage.tsx`

```json
{
 "route": "/appuntamenti/:id",
 "sourceFile": "src/pages/AppointmentPage.tsx",
 "title": "Appuntamento",
 "requiresAuth": true,
 "authFailed": false,
 "analyzedAsRole": "titolare",
 "rolesAllowed": [
  "titolare",
  "titolare-go",
  "collaboratore"
 ],
 "note": "Sheet route over Home; real id apt-9p1x686k (Pippo, 31 ott 08:00, status Da chiudere) opened from the Home DA CHIUDERE card. A \"Dati non aggiornati - offline\" banner can appear with the emulator.",
 "elements": {
  "forms": [
   {
    "id": "completa-visita",
    "label": "Completare (CloseVisitDialog)",
    "fields": [
     {
      "name": "Prezzo",
      "type": "text",
      "required": true,
      "label": "Prezzo",
      "default": "30",
      "validations": [
       "numeric euro amount"
      ],
      "sampleValid": "35",
      "sampleInvalid": "abc"
     },
     {
      "name": "Ore",
      "type": "text",
      "required": true,
      "label": "Ore",
      "default": "0",
      "validations": [
       "integer >= 0"
      ],
      "sampleValid": "1",
      "sampleInvalid": "-1"
     },
     {
      "name": "Minuti",
      "type": "text",
      "required": true,
      "label": "Minuti",
      "default": "45",
      "validations": [
       "integer 0-59"
      ],
      "sampleValid": "30",
      "sampleInvalid": "99"
     },
     {
      "name": "Pagamento",
      "type": "button-group",
      "required": false,
      "label": "Pagamento",
      "options": [
       "POS",
       "Contanti",
       "N/A"
      ],
      "sampleValid": "Contanti",
      "sampleInvalid": null
     },
     {
      "name": "Nota",
      "type": "textarea",
      "required": false,
      "label": "Nota",
      "sampleValid": "Cliente soddisfatto",
      "sampleInvalid": null
     }
    ],
    "submit": {
     "label": "Salva e completa",
     "destructive": false
    },
    "secondary": [
     {
      "label": "Nessuna modifica"
     }
    ]
   },
   {
    "id": "nota-appuntamento",
    "label": "Aggiungi nota (dialog)",
    "fields": [
     {
      "name": "Nota",
      "type": "textarea",
      "required": false,
      "label": "Nota",
      "sampleValid": "Pelo annodato",
      "sampleInvalid": ""
     }
    ],
    "submit": {
     "label": "Salva",
     "destructive": false
    },
    "secondary": [
     {
      "label": "Annulla"
     }
    ]
   },
   {
    "id": "messaggi-whatsapp",
    "label": "Messaggi WhatsApp (dialog)",
    "fields": [
     {
      "name": "Messaggi WhatsApp",
      "type": "textarea",
      "required": false,
      "label": "Messaggi WhatsApp",
      "default": "Ciao Antonio Sanna, ti ricordiamo l appuntamento di Pippo...",
      "sampleValid": "Ciao, a domani!",
      "sampleInvalid": ""
     }
    ],
    "submit": {
     "label": "Apri WhatsApp",
     "destructive": false
    }
   },
   {
    "id": "modifica-appuntamento",
    "label": "Modifica appuntamento (sheet)",
    "fields": [
     {
      "name": "Giorno",
      "type": "date",
      "required": true,
      "label": "Giorno",
      "default": "2026-10-31",
      "sampleValid": "2026-11-03",
      "sampleInvalid": ""
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
    "label": "Chiudi",
    "destructive": false
   },
   {
    "label": "Altre azioni",
    "destructive": false,
    "opens": "dialog:Altre azioni"
   },
   {
    "label": "Anticipa -15",
    "destructive": false
   },
   {
    "label": "Posticipa +15",
    "destructive": false
   },
   {
    "label": "Modifica appuntamento",
    "destructive": false,
    "opens": "sheet:modifica"
   },
   {
    "label": "Messaggi pronti",
    "destructive": false,
    "opens": "dialog:Messaggi WhatsApp"
   },
   {
    "label": "Aggiungi nota",
    "destructive": false,
    "opens": "dialog:nota"
   },
   {
    "label": "Servizi",
    "destructive": false,
    "opens": "toggles service chips"
   },
   {
    "label": "Note del lavoro +",
    "destructive": false,
    "opens": "accordion"
   },
   {
    "label": "Completato",
    "destructive": false,
    "opens": "dialog:Completare"
   },
   {
    "label": "Non venuto",
    "destructive": false,
    "opens": "mutates immediately, toast with Annulla"
   },
   {
    "label": "Disdici",
    "destructive": true,
    "opens": "dialog:Chi disdice?"
   },
   {
    "label": "Elimina",
    "destructive": true,
    "opens": "dialog:Eliminare questo appuntamento?"
   },
   {
    "label": "Chiama",
    "destructive": false
   },
   {
    "label": "WhatsApp",
    "destructive": false
   },
   {
    "label": "Apri scheda",
    "destructive": false
   }
  ],
  "links": [
   {
    "label": "Apri scheda",
    "href": "/animali/dog-5s3yd4ky"
   },
   {
    "label": "Chiama",
    "href": "tel:"
   },
   {
    "label": "WhatsApp",
    "href": "https://wa.me/"
   }
  ],
  "modals": [
   {
    "id": "altre-azioni",
    "title": "Altre azioni",
    "elements": {
     "buttons": [
      "Elimina"
     ]
    }
   },
   {
    "id": "elimina",
    "title": "Eliminare questo appuntamento?",
    "elements": {
     "text": "Sparisce anche dallo storico.",
     "buttons": [
      "Tieni",
      "Elimina"
     ]
    }
   },
   {
    "id": "disdici",
    "title": "Chi disdice?",
    "elements": {
     "buttons": [
      "Cliente",
      "Salone"
     ]
    }
   },
   {
    "id": "messaggi",
    "title": "Messaggi WhatsApp",
    "elements": {
     "buttons": [
      "Italiano",
      "English",
      "Espanol",
      "Promemoria",
      "Conferma",
      "Cane pronto",
      "Richiamo",
      "Auguri",
      "Apri WhatsApp"
     ],
     "textarea": "Messaggi WhatsApp"
    }
   },
   {
    "id": "completare",
    "title": "Completare",
    "elements": {
     "buttons": [
      "POS",
      "Contanti",
      "N/A",
      "Nessuna modifica",
      "Salva e completa"
     ]
    }
   },
   {
    "id": "salone-chiuso",
    "title": "Salone chiuso",
    "elements": {
     "buttons": [
      "Indietro",
      "Salva lo stesso"
     ]
    },
    "note": "only when the day is a closure"
   },
   {
    "id": "cane-mensile",
    "title": "Cane mensile (ritmo)",
    "elements": {},
    "note": "only for monthly dogs"
   }
  ],
  "tabs": [],
  "tables": [],
  "chips": [
   "Bagno",
   "Taglio / tosatura",
   "Bagno + taglio",
   "Stripping",
   "Gestione nodi",
   "Dermatologico",
   "Antiparassitario",
   "Unghie",
   "SPA ozono"
  ]
 },
 "flows": [
  "Open appointment from Home card",
  "Shift time +-15",
  "Edit appointment (day/time/services/dog)",
  "Toggle services and see Totale update",
  "Add note",
  "Send WhatsApp message in IT/EN/ES",
  "Complete visit with price/duration/payment",
  "Mark no-show (toast undo)",
  "Cancel by client/salon",
  "Delete appointment (confirm)",
  "Back navigation closes the sheet"
 ],
 "assertions": [
  "Sheet shows dog name, owner, date/time, status Da chiudere",
  "Service chip toggles recalc Totale",
  "Completato opens Completare dialog prefilled 30/0/45",
  "Elimina requires confirm and Tieni cancels",
  "Collaboratore can reach the page"
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
