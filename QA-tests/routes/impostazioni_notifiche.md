# /impostazioni/notifiche

Sorgente: `src/pages/NotificationsPage.tsx`

```json
{
  "route": "/impostazioni/notifiche",
  "sourceFile": "src/pages/NotificationsPage.tsx",
  "title": "Notifiche",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "note": "Per collaboratore il promemoria mensile è bloccato (monthlyLocked).",
  "elements": {
    "forms": [],
    "buttons": [
      {
        "label": "Indietro",
        "destructive": false,
        "opens": "/impostazioni"
      },
      {
        "label": "Informazioni su Mensili in scadenza",
        "destructive": false,
        "opens": "popup info"
      },
      {
        "label": "Mensili in scadenza",
        "type": "switch",
        "destructive": false,
        "default": "on"
      },
      {
        "label": "Meno giorni",
        "destructive": false,
        "note": "minimo 0"
      },
      {
        "label": "Più giorni",
        "destructive": false,
        "note": "default 7 giorni prima"
      },
      {
        "label": "Informazioni su Nuova versione",
        "destructive": false,
        "opens": "popup info"
      },
      {
        "label": "Nuova versione",
        "type": "switch",
        "destructive": false,
        "default": "off"
      },
      {
        "label": "Informazioni su Appuntamenti da chiudere",
        "destructive": false,
        "opens": "popup info"
      },
      {
        "label": "Appuntamenti da chiudere",
        "type": "switch",
        "destructive": false,
        "default": "off"
      },
      {
        "label": "Meno minuti",
        "destructive": false,
        "note": "disabilitato se toggle off; min 0"
      },
      {
        "label": "Più minuti",
        "destructive": false,
        "note": "disabilitato se toggle off; max 1440; default 60 min dopo"
      }
    ],
    "inputs": [
      {
        "name": "orario",
        "type": "time",
        "label": "Orario",
        "default": "18:30",
        "sampleValid": "09:00",
        "sampleInvalid": "",
        "note": "disabilitato se Mensili off o collaboratore"
      }
    ],
    "links": [
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
        "id": "info-popup",
        "title": "Info Mensili in scadenza / Nuova versione / Appuntamenti da chiudere",
        "elements": {}
      }
    ],
    "tabs": [],
    "tables": [],
    "notices": [
      "Messaggio permessi negati o push non disponibili, se applicabile"
    ]
  },
  "flows": [
    "Attivare/disattivare promemoria mensile",
    "Cambiare orario",
    "Cambiare giorni di anticipo",
    "Attivare push nuova versione",
    "Attivare push appuntamenti da chiudere e regolare minuti",
    "Aprire le info di ogni voce"
  ],
  "assertions": [
    "Default: 7 giorni prima, 60 min dopo, orario 18:30",
    "Stepper minuti disabilitato con \"Appuntamenti da chiudere\" off",
    "Orario disabilitato con Mensili off",
    "Il valore persiste dopo reload",
    "Collaboratore non può modificare il promemoria mensile"
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
      "React Router Future Flag Warning (v7_startTransition)"
    ]
  }
}
```
