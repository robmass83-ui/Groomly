# /benvenuto

Sorgente: `src/pages/TourPage.tsx`

```json
{
 "route": "/benvenuto",
 "sourceFile": "src/pages/TourPage.tsx",
 "title": "Tour di benvenuto",
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
    "id": "passo-logo",
    "label": "Passo 'Il tuo logo'",
    "fields": [
     {
      "name": "logo",
      "type": "file",
      "required": false,
      "label": "Scegli un’immagine",
      "accept": "image/*",
      "sampleValid": "PNG/JPG valido",
      "sampleInvalid": "file non immagine / troppo grande"
     }
    ],
    "submit": {
     "label": "Fatto, avanti",
     "destructive": false,
     "note": "disabilitato finché non c'è un logo"
    }
   },
   {
    "id": "passo-sede",
    "label": "Passo 'Dove sei e quando ti trovano aperto?'",
    "fields": [
     {
      "name": "indirizzo",
      "type": "text",
      "required": true,
      "label": "Indirizzo",
      "validations": [
       "non vuoto + orari compilati"
      ],
      "sampleValid": "Via Roma 1, Napoli",
      "sampleInvalid": ""
     },
     {
      "name": "orari",
      "type": "time",
      "required": false,
      "label": "Orari per giorno (Dalle/Alle, Aperto/Chiuso)",
      "sampleValid": "09:00-13:00"
     }
    ],
    "submit": {
     "label": "Fatto, avanti",
     "destructive": false
    }
   },
   {
    "id": "passo-listino",
    "label": "Passo prezzi poi tempi",
    "fields": [
     {
      "name": "<servizio> <taglia>",
      "type": "text",
      "required": true,
      "label": "Bagno/Taglio/Bagno+taglio/Stripping x piccola/media/grande",
      "validations": [
       "cifra valida per prezzo / minuti"
      ],
      "sampleValid": "30",
      "sampleInvalid": "abc"
     }
    ],
    "submit": {
     "label": "Avanti: i tempi / Fatto, avanti",
     "destructive": false
    }
   },
   {
    "id": "passo-backup",
    "label": "Passo backup Drive",
    "fields": [],
    "submit": {
     "label": "Collega Google Drive / Avanti",
     "destructive": false
    }
   },
   {
    "id": "passo-fiscale",
    "label": "Passo fiscale",
    "fields": [
     {
      "name": "iva",
      "type": "text",
      "required": false,
      "label": "Partita IVA",
      "placeholder": "11 cifre",
      "validations": [
       "^\\d{11}$: '11 cifre, senza IT'"
      ],
      "sampleValid": "12345678901",
      "sampleInvalid": "123"
     },
     {
      "name": "cf",
      "type": "text",
      "required": false,
      "label": "oppure Codice fiscale",
      "placeholder": "16 caratteri",
      "validations": [
       "^[A-Z0-9]{16}$: '16 lettere o numeri'"
      ],
      "sampleValid": "RSSMRA80A01H501U",
      "sampleInvalid": "abc"
     }
    ],
    "submit": {
     "label": "Fatto, avanti",
     "destructive": false,
     "note": "serve almeno uno dei due, scritto bene"
    }
   }
  ],
  "buttons": [
   {
    "label": "Scegli un’immagine",
    "destructive": false,
    "opens": "file picker"
   },
   {
    "label": "Fatto, avanti→",
    "destructive": false,
    "opens": "overlay festa poi passo successivo"
   },
   {
    "label": "Salta",
    "destructive": false,
    "opens": "passo successivo (registra il passo saltato)"
   },
   {
    "label": "Iniziamo",
    "destructive": false,
    "opens": "primo passo (solo se tour non iniziato)"
   },
   {
    "label": "Lo facciamo dopo",
    "destructive": false,
    "opens": "navigate:/ (segna visto)"
   },
   {
    "label": "Entra in Groomly",
    "destructive": false,
    "opens": "navigate:/ (schermata finale)"
   }
  ],
  "links": [],
  "modals": [
   {
    "id": "festa",
    "title": "Festa passo completato (overlay)",
    "elements": {}
   }
  ],
  "tabs": [],
  "tables": []
 },
 "flows": [
  "Tour completo: benvenuto -> logo -> sede -> prezzi -> tempi -> backup -> fiscale -> fine",
  "Saltare un passo",
  "Ripresa del tour già iniziato (parte dal primo passo mancante, contatore n di m)",
  "Rimandare con 'Lo facciamo dopo'",
  "Entrare in Groomly dalla schermata finale"
 ],
 "assertions": [
  "Con tour in corso si apre al passo 'PREPARIAMO IL SALONE · 1 DI 4' 'Il tuo logo'",
  "'Fatto, avanti' disabilitato senza logo",
  "Salta avanza al passo seguente",
  "Fiscale: IVA '123' -> '11 cifre, senza IT'",
  "Lo facciamo dopo porta a Home",
  "Collaboratore reindirizzato a /impostazioni"
 ],
 "api": [
  {
   "method": "GET/WRITE",
   "url": "firestore emulator salons/<uid>/settings",
   "status": 200
  }
 ],
 "console": {
  "errors": [],
  "warnings": [
   "React Router Future Flag Warning: v7_startTransition (benign)"
  ]
 },
 "notes": "Osservato in stato di ripresa (tour già avviato): nessuna schermata di benvenuto. I passi successivi al primo sono derivati dal sorgente (TourPassi.tsx), non cliccati, per non alterare lo stato."
}
```
