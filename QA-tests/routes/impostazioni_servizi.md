# /impostazioni/servizi

Sorgente: `src/pages/ServicesPage.tsx`

```json
{
 "route": "/impostazioni/servizi",
 "sourceFile": "src/pages/ServicesPage.tsx",
 "title": "Servizi e durate",
 "requiresAuth": true,
 "authFailed": false,
 "rolesAllowed": [
  "titolare",
  "titolare-go"
 ],
 "analyzedAsRole": "titolare",
 "elements": {
  "forms": [
   {
    "id": "servizio-principale",
    "label": "Nuovo/Modifica servizio (principale)",
    "fields": [
     {
      "name": "name",
      "type": "text",
      "required": true,
      "label": "Nome",
      "validations": [
       "trim, min 1",
       "'Il nome è obbligatorio'"
      ],
      "sampleValid": "Pulizia orecchie",
      "sampleInvalid": ""
     },
     {
      "name": "durationMin.piccola",
      "type": "text",
      "required": true,
      "label": "Durata piccola",
      "validations": [
       "intero >=1",
       "'Minuti interi, minimo 1'"
      ],
      "sampleValid": "30",
      "sampleInvalid": "0"
     },
     {
      "name": "price.piccola",
      "type": "text",
      "required": true,
      "label": "Prezzo piccola",
      "validations": [
       ">=0, max 2 decimali, virgola ok",
       "'Prezzo ≥ 0, al massimo due decimali'"
      ],
      "sampleValid": "20,50",
      "sampleInvalid": "abc"
     },
     {
      "name": "durationMin.media",
      "type": "text",
      "required": true,
      "label": "Durata media",
      "validations": [
       "come sopra"
      ],
      "sampleValid": "45",
      "sampleInvalid": "1.5"
     },
     {
      "name": "price.media",
      "type": "text",
      "required": true,
      "label": "Prezzo media",
      "validations": [
       "come sopra"
      ],
      "sampleValid": "28",
      "sampleInvalid": "-1"
     },
     {
      "name": "durationMin.grande",
      "type": "text",
      "required": true,
      "label": "Durata grande",
      "validations": [
       "come sopra"
      ],
      "sampleValid": "60",
      "sampleInvalid": ""
     },
     {
      "name": "price.grande",
      "type": "text",
      "required": true,
      "label": "Prezzo grande",
      "validations": [
       "come sopra"
      ],
      "sampleValid": "38",
      "sampleInvalid": "12,345"
     },
     {
      "name": "active",
      "type": "switch",
      "required": false,
      "label": "Attivo",
      "validations": [],
      "sampleValid": true,
      "sampleInvalid": false
     }
    ],
    "submit": {
     "label": "Salva",
     "destructive": false
    }
   },
   {
    "id": "servizio-extra",
    "label": "Nuovo servizio (extra, prezzo unico)",
    "fields": [
     {
      "name": "name",
      "type": "text",
      "required": true,
      "label": "Nome",
      "validations": [
       "'Il nome è obbligatorio'"
      ],
      "sampleValid": "SPA",
      "sampleInvalid": ""
     },
     {
      "name": "durationMin",
      "type": "text",
      "required": true,
      "label": "Durata",
      "validations": [
       "intero >=1"
      ],
      "sampleValid": "15",
      "sampleInvalid": "0"
     },
     {
      "name": "price",
      "type": "text",
      "required": true,
      "label": "Prezzo",
      "validations": [
       "prezzo >=0, 2 decimali"
      ],
      "sampleValid": "5",
      "sampleInvalid": "x"
     },
     {
      "name": "active",
      "type": "switch",
      "required": false,
      "label": "Attivo",
      "validations": [],
      "sampleValid": true,
      "sampleInvalid": false
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
    "label": "Aggiungi servizio",
    "destructive": false,
    "opens": "modal:Nuovo servizio"
   },
   {
    "label": "Riordina <servizio> (drag handle / frecce)",
    "destructive": false
   },
   {
    "label": "Apri <servizio>",
    "destructive": false,
    "opens": "modal:Modifica servizio"
   },
   {
    "label": "Toggle attivo per riga",
    "destructive": false
   },
   {
    "label": "Elimina servizio",
    "destructive": true,
    "opens": "modal:Eliminare «nome»?"
   },
   {
    "label": "Principale / Extra (segmented, solo creazione)",
    "destructive": false
   },
   {
    "label": "Chiudi",
    "destructive": false
   }
  ],
  "links": [
   {
    "label": "Indietro",
    "href": "/impostazioni"
   }
  ],
  "modals": [
   {
    "id": "srv-nuovo",
    "title": "Nuovo servizio",
    "elements": {
     "fields": [
      "Nome",
      "Principale/Extra",
      "Durata e Prezzo (x3 taglie o unico)",
      "Attivo"
     ],
     "buttons": [
      "Salva",
      "Chiudi"
     ]
    }
   },
   {
    "id": "srv-modifica",
    "title": "Modifica servizio",
    "elements": {
     "fields": [
      "Nome",
      "Durata/Prezzo",
      "Attivo"
     ],
     "buttons": [
      "Salva",
      "Elimina servizio",
      "Chiudi"
     ]
    }
   },
   {
    "id": "srv-elimina",
    "title": "Eliminare «{nome}»?",
    "elements": {
     "text": "Sparisce da questa lista e dalle prenotazioni online. Gli appuntamenti già fissati restano come sono.",
     "buttons": [
      "Annulla",
      "Elimina servizio"
     ]
    }
   }
  ],
  "tabs": [
   {
    "id": "tipo",
    "tabs": [
     "Principale",
     "Extra"
    ]
   }
  ],
  "tables": []
 },
 "flows": [
  "Aggiungere servizio principale con 3 taglie",
  "Aggiungere servizio extra",
  "Modificare un servizio",
  "Attivare/disattivare un servizio",
  "Riordinare con ArrowUp/ArrowDown",
  "Eliminare con conferma (destructive)"
 ],
 "assertions": [
  "Gruppi PRINCIPALI (4) ed EXTRA (5) con seed",
  "Salva vuoto mostra 7 errori (principale)",
  "Passando a Extra restano Nome, Durata, Prezzo",
  "Elimina disponibile solo in modifica e con >1 servizio"
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
