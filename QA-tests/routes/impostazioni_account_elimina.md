# /impostazioni/account/elimina

Sorgente: `src/pages/EliminaAccountPage.tsx`

```json
{
  "route": "/impostazioni/account/elimina",
  "sourceFile": "src/pages/EliminaAccountPage.tsx",
  "title": "Elimina account",
  "requiresAuth": true,
  "authFailed": false,
  "rolesAllowed": [
    "titolare",
    "titolare-go",
    "collaboratore"
  ],
  "analyzedAsRole": "titolare",
  "note": "Wizard a passi 0..5. Account protetti (operatori/VIP) vedono solo il messaggio di blocco. Il passo Play compare solo con abbonamento Play. Eliminazione finale NON eseguita.",
  "elements": {
    "forms": [
      {
        "id": "wizard-password",
        "label": "Conferma con la password (passo 4)",
        "fields": [
          {
            "name": "password",
            "type": "password",
            "required": true,
            "label": "Password attuale",
            "validations": [
              "Continua disabilitato se vuoto",
              "password errata -> alert \"Email o password non corretti\""
            ],
            "sampleValid": "(password dell’account)",
            "sampleInvalid": "wrongpass1"
          }
        ],
        "submit": {
          "label": "Continua",
          "destructive": false
        }
      },
      {
        "id": "wizard-frase",
        "label": "Scrivi per confermare (passo 5)",
        "fields": [
          {
            "name": "frase",
            "type": "text",
            "required": true,
            "label": "Parola di conferma",
            "validations": [
              "esattamente \"ELIMINA\" oppure il nome del salone (trim)"
            ],
            "sampleValid": "ELIMINA",
            "sampleInvalid": "elimina"
          }
        ],
        "submit": {
          "label": "Conferma elimina",
          "destructive": true,
          "note": "disabilitato finché la frase non è valida; non cliccato"
        }
      }
    ],
    "buttons": [
      {
        "label": "Indietro",
        "destructive": false,
        "opens": "/impostazioni/account?scheda=privacy"
      },
      {
        "label": "Continua",
        "destructive": false,
        "opens": "passo successivo (0,1,[2],3,4)"
      },
      {
        "label": "Salva su…",
        "destructive": false,
        "opens": "/impostazioni con openBackup (passo 1)"
      },
      {
        "label": "Conferma elimina",
        "destructive": true,
        "opens": "callEliminaAccount (non eseguito)"
      }
    ],
    "links": [
      {
        "label": "Indietro",
        "href": "/impostazioni/account?scheda=privacy"
      },
      {
        "label": "Gestisci abbonamento Play",
        "href": "https://play.google.com/store/account/subscriptions?package=it.groomly.app"
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
  "flows": [
    "Percorrere i passi: Cosa viene eliminato, Prima salva una copia, (Play), avviso titolare/membro, password, frase",
    "Password errata mostra errore",
    "Frase non valida lascia disabilitato il bottone",
    "Account protetto vede il blocco",
    "Salvare un backup dal passo 1"
  ],
  "assertions": [
    "Passo 0 mostra elenco dati eliminati e Continua",
    "Passo 1 offre \"Salva su…\"",
    "Passo 4: Continua disabilitato con password vuota",
    "Password errata mostra \"Email o password non corretti\"",
    "Passo 5: eliminazione disabilitata con frase diversa da ELIMINA/nome salone",
    "Footer mostra info@groomlyapp.it"
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
    },
    {
      "method": "POST",
      "url": "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
      "status": 400,
      "note": "solo con password errata"
    }
  ],
  "console": {
    "errors": [
      "400 su signInWithPassword con password errata (atteso)"
    ],
    "warnings": [
      "React Router Future Flag Warning (v7_startTransition)"
    ]
  }
}
```
