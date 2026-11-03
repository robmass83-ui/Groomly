# /impostazioni

Sorgente: `src/pages/SettingsPage.tsx`

```json
{
 "route": "/impostazioni",
 "sourceFile": "src/pages/SettingsPage.tsx",
 "title": "Impostazioni",
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
    "id": "backup-dialog",
    "label": "Backup (dialog)",
    "fields": [
     {
      "name": "autoBackup",
      "type": "switch",
      "required": false,
      "label": "Backup automatico giornaliero",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     },
     {
      "name": "frequenza",
      "type": "segmented",
      "required": false,
      "label": "Frequenza",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": "",
      "options": [
       "Giorno",
       "Settimana",
       "Mese"
      ]
     },
     {
      "name": "orario",
      "type": "time",
      "required": false,
      "label": "Orario del backup automatico",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "03:00",
      "sampleInvalid": ""
     },
     {
      "name": "soloWifi",
      "type": "switch",
      "required": false,
      "label": "Solo Wi-Fi",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     },
     {
      "name": "soloCarica",
      "type": "switch",
      "required": false,
      "label": "Solo in carica",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     }
    ],
    "submit": null
   },
   {
    "id": "dati-salone-dialog",
    "label": "Dati del salone (dialog opened from \"Partita IVA o codice fiscale\" row)",
    "fields": [
     {
      "name": "nomeToelettatura",
      "type": "text",
      "required": false,
      "label": "Nome toelettatura",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "Pet Spa QA",
      "sampleInvalid": ""
     },
     {
      "name": "ragioneSociale",
      "type": "text",
      "required": false,
      "label": "Ragione sociale",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     },
     {
      "name": "partitaIva",
      "type": "text",
      "required": false,
      "label": "Partita IVA",
      "placeholder": null,
      "maxLength": null,
      "validations": [
       "11 cifre"
      ],
      "sampleValid": "12345678903",
      "sampleInvalid": "123"
     },
     {
      "name": "codiceFiscale",
      "type": "text",
      "required": false,
      "label": "Codice fiscale",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     },
     {
      "name": "telefono",
      "type": "tel",
      "required": false,
      "label": "Telefono",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "3331234567",
      "sampleInvalid": ""
     },
     {
      "name": "indirizzo",
      "type": "text",
      "required": false,
      "label": "Cerca l indirizzo (address autocomplete)",
      "placeholder": null,
      "maxLength": null,
      "validations": [],
      "sampleValid": "",
      "sampleInvalid": ""
     }
    ],
    "submit": {
     "label": "Salva",
     "destructive": false
    },
    "note": "hint \"Basta la partita IVA oppure il codice fiscale.\""
   }
  ],
  "buttons": [
   {
    "label": "Gestisci account Groomly",
    "destructive": false,
    "opens": "/impostazioni/account"
   },
   {
    "label": "Logo",
    "destructive": false,
    "opens": "/impostazioni/account?scheda=personali"
   },
   {
    "label": "Fai il primo backup (completeness chip)",
    "destructive": false,
    "opens": "modal:backup"
   },
   {
    "label": "Partita IVA o codice fiscale (completeness chip)",
    "destructive": false,
    "opens": "/impostazioni/account?scheda=personali dialog"
   },
   {
    "label": "Backup e ripristino row",
    "destructive": false,
    "opens": "modal:backup"
   },
   {
    "label": "Tema, Auto",
    "destructive": false,
    "opens": "modal:tema"
   },
   {
    "label": "Lingua Italiano",
    "destructive": false,
    "opens": "modal:lingua"
   },
   {
    "label": "Esci",
    "destructive": true,
    "opens": "modal:esci"
   },
   {
    "label": "Groomly 1.1.166, storico aggiornamenti",
    "destructive": false,
    "opens": "/impostazioni/aggiornamenti"
   },
   {
    "label": "Aggiungi (tab bar FAB)",
    "destructive": false
   }
  ],
  "links": [
   {
    "label": "Suggerimenti",
    "href": "/impostazioni/suggerimenti"
   },
   {
    "label": "Incassi e report NUOVO",
    "href": "/incassi/report"
   },
   {
    "label": "Avvisi",
    "href": "/impostazioni/avvisi"
   },
   {
    "label": "Abbonamento (Prova Plus, ancora 10 giorni)",
    "href": "/impostazioni/abbonamento"
   },
   {
    "label": "Listino prezzi",
    "href": "/listino"
   },
   {
    "label": "Servizi e durate",
    "href": "/impostazioni/servizi"
   },
   {
    "label": "Archivio animali",
    "href": "/impostazioni/archivio"
   },
   {
    "label": "Notifiche",
    "href": "/impostazioni/notifiche"
   },
   {
    "label": "Gestisci account Groomly",
    "href": "/impostazioni/account"
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
    "id": "backup",
    "title": "Backup",
    "elements": {
     "buttons": [
      "Backup automatico giornaliero",
      "Informazioni sulla frequenza",
      "Giorno",
      "Settimana",
      "Mese",
      "Solo Wi-Fi",
      "Solo in carica",
      "Collega Google Drive",
      "Completo con foto",
      "Ripristina da un file (destructive: sostituisce i dati)",
      "Chiudi"
     ],
     "inputs": [
      "time Orario del backup automatico"
     ]
    }
   },
   {
    "id": "tema",
    "title": "Scegli il tema",
    "elements": {
     "buttons": [
      "Chiaro",
      "Scuro",
      "Auto",
      "Chiudi"
     ]
    }
   },
   {
    "id": "lingua",
    "title": "Lingua",
    "elements": {
     "buttons": [
      "Italiano",
      "English",
      "Español",
      "Chiudi"
     ]
    }
   },
   {
    "id": "esci",
    "title": "Uscire da Groomly?",
    "elements": {
     "buttons": [
      "Resta",
      "Esci",
      "Chiudi"
     ]
    }
   }
  ],
  "tabs": [],
  "tables": []
 },
 "sections": [
  "SALONE",
  "FUNZIONI",
  "APP",
  "ACCOUNT"
 ],
 "completeness": "Completa il tuo salone 3/6 (Logo, Fai il primo backup, Partita IVA o codice fiscale)",
 "flows": [
  "Navigate to each settings sub-page via rows",
  "Change theme (Chiaro/Scuro/Auto)",
  "Change language (it/en/es)",
  "Open Backup dialog and inspect options",
  "Complete salone data (Partita IVA) via completeness chips",
  "Esci opens confirm dialog; Resta cancels",
  "Collaboratore view has restricted rows (StaffLock)"
 ],
 "assertions": [
  "Heading Impostazioni with 4 sections",
  "Salone name shown \"Pet Spa Napoli 36\"",
  "Theme dialog lists 3 options",
  "Language dialog lists it/en/es",
  "Esci dialog asks \"Uscire da Groomly?\" with Resta/Esci",
  "Rows link to expected sub-routes"
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
