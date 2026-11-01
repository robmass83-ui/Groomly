# /incassi/report

Sorgente: `src/pages/EarningsReportPage.tsx`

```json
{
 "route": "/incassi/report",
 "sourceFile": "src/pages/EarningsReportPage.tsx",
 "title": "Incassi e report",
 "requiresAuth": true,
 "authFailed": false,
 "analyzedAsRole": "titolare",
 "rolesAllowed": [
  "titolare",
  "titolare-go",
  "collaboratore"
 ],
 "note": "Export is gated by exportBloccato(piano.stato); with titolare plus36 the ExportSheet opened. Amounts are masked when settings.ui.hideAmounts.",
 "elements": {
  "forms": [
   {
    "id": "export-sheet",
    "label": "Esporta per il commercialista",
    "fields": [
     {
      "name": "Periodo",
      "type": "segmented",
      "options": [
       "Mese",
       "Anno",
       "Da... a..."
      ],
      "default": "Mese",
      "sampleValid": "Anno",
      "sampleInvalid": null
     },
     {
      "name": "Mese",
      "type": "month-picker",
      "options": [
       "Gen..Dic"
      ],
      "sampleValid": "Ott",
      "sampleInvalid": null
     },
     {
      "name": "Formato",
      "type": "radio",
      "options": [
       "PDF",
       "Excel"
      ],
      "default": "PDF",
      "sampleValid": "Excel",
      "sampleInvalid": null
     },
     {
      "name": "Cosa includere",
      "type": "toggles",
      "options": [
       "Riepilogo",
       "Dettaglio appuntamenti",
       "Tipo di pagamento",
       "Dati dellattivita",
       "Mancati incassi"
      ],
      "sampleValid": "Riepilogo",
      "sampleInvalid": null
     }
    ],
    "submit": {
     "label": "Invia al commercialista",
     "destructive": false
    },
    "secondary": [
     {
      "label": "Salva"
     }
    ]
   }
  ],
  "buttons": [
   {
    "label": "Esporta",
    "destructive": false,
    "opens": "sheet:Esporta per il commercialista or paywall"
   },
   {
    "label": "Questo mese",
    "destructive": false
   },
   {
    "label": "Anno",
    "destructive": false
   },
   {
    "label": "Scegli...",
    "destructive": false,
    "opens": "dialog:Scegli il mese"
   },
   {
    "label": "Mancati",
    "destructive": false,
    "opens": "sheet:Mancati"
   },
   {
    "label": "Anno precedente",
    "destructive": false
   },
   {
    "label": "Anno successivo",
    "destructive": false
   }
  ],
  "links": [
   {
    "label": "Indietro",
    "href": "/impostazioni"
   },
   {
    "label": "Statistiche",
    "href": "/incassi/statistiche"
   },
   {
    "label": "<cane top>",
    "href": "/animali/:id"
   }
  ],
  "modals": [
   {
    "id": "scegli-mese",
    "title": "Scegli il mese",
    "elements": {
     "buttons": [
      "Anno precedente",
      "Anno successivo",
      "Gen..Dic with euro totals"
     ],
     "note": "future months disabled"
    }
   },
   {
    "id": "mancati",
    "title": "Mancati",
    "elements": {
     "note": "rows: dog, when, reason, amount, plus incNotaPersi"
    }
   },
   {
    "id": "export",
    "title": "Esporta per il commercialista",
    "elements": {}
   }
  ],
  "tabs": [
   {
    "id": "periodo",
    "options": [
     "Questo mese",
     "Anno",
     "Scegli..."
    ]
   }
  ],
  "tables": [
   {
    "id": "per-servizio",
    "columns": [
     "Servizio - volte",
     "Importo"
    ],
    "sortable": false,
    "filterable": false,
    "pagination": false,
    "rowActions": []
   },
   {
    "id": "clienti-top",
    "columns": [
     "Cane",
     "Importo"
    ],
    "sortable": false,
    "filterable": false,
    "pagination": false,
    "rowActions": [
     "link scheda"
    ]
   }
  ],
  "kpis": [
   "Incassato",
   "Appuntamenti",
   "Media a cane",
   "Guadagno allora",
   "POS",
   "Contanti"
  ]
 },
 "flows": [
  "Switch period Questo mese/Anno/Scegli",
  "Pick a month in the picker",
  "Open Mancati sheet",
  "Open export (or paywall on free plan)",
  "Open Statistiche",
  "Open top dog"
 ],
 "assertions": [
  "Default preset Questo mese is pressed",
  "Picker disables future months",
  "Month picker shows euro per month (Lug-Ott seeded)",
  "Mancati card shows 45 euro and 1 disdetto when seeded"
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
