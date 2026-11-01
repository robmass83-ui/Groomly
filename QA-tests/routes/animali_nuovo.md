# /animali/nuovo

Sorgente: `src/pages/DogPage.tsx`

```json
{
  "route": "/animali/nuovo",
  "sourceFile": "src/pages/DogPage.tsx",
  "title": "Nuovo cane",
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
        "id": "scheda-cane-nuovo",
        "label": "Nuovo cane (scheda in modifica)",
        "fields": [
          {
            "name": "Nome",
            "type": "text",
            "required": true,
            "label": "Nome",
            "validations": [
              "obbligatorio: \"Il nome è obbligatorio\"",
              "trim, nessun maxLength HTML (accetta 80 caratteri)"
            ],
            "sampleValid": "Rex",
            "sampleInvalid": ""
          },
          {
            "name": "Razza",
            "type": "text",
            "required": false,
            "label": "Razza",
            "validations": [],
            "sampleValid": "Barboncino",
            "sampleInvalid": ""
          },
          {
            "name": "taglia",
            "type": "radio",
            "required": false,
            "label": "Taglia (radio Piccola/Media/Grande)",
            "validations": [],
            "sampleValid": "Media",
            "sampleInvalid": ""
          },
          {
            "name": "Proprietario",
            "type": "text",
            "required": true,
            "label": "Proprietario",
            "validations": [
              "obbligatorio: \"Il proprietario è obbligatorio\""
            ],
            "sampleValid": "Mario Rossi",
            "sampleInvalid": ""
          },
          {
            "name": "Telefono",
            "type": "tel",
            "required": true,
            "label": "Telefono",
            "validations": [
              "obbligatorio: \"Il telefono è obbligatorio\" (zod trim.min(1)); inputmode tel"
            ],
            "sampleValid": "3331234567",
            "sampleInvalid": ""
          },
          {
            "name": "carattere",
            "type": "radio",
            "required": false,
            "label": "Carattere (radio Bravo/Agitato/Mordace)",
            "validations": [],
            "sampleValid": "Bravo",
            "sampleInvalid": ""
          },
          {
            "name": "Avviso critico",
            "type": "text",
            "required": false,
            "label": "Avviso critico",
            "validations": [],
            "sampleValid": "Allergico allo shampoo",
            "sampleInvalid": ""
          }
        ],
        "submit": {
          "label": "Salva",
          "destructive": false
        }
      },
      {
        "id": "altri-dettagli",
        "label": "Altri dettagli (sezione espandibile)",
        "fields": [
          {
            "name": "Specie",
            "type": "radio",
            "required": false,
            "label": "Specie (Cane/Gatto/Altro)",
            "validations": [],
            "sampleValid": "Cane",
            "sampleInvalid": ""
          },
          {
            "name": "Sesso",
            "type": "radio",
            "required": false,
            "label": "Sesso (Maschio/Femmina)",
            "validations": [],
            "sampleValid": "Maschio",
            "sampleInvalid": ""
          },
          {
            "name": "Età",
            "type": "radio",
            "required": false,
            "label": "Età (Cucciolo/Giovane/Adulto/Anziano)",
            "validations": [],
            "sampleValid": "Adulto",
            "sampleInvalid": ""
          },
          {
            "name": "Anno di nascita",
            "type": "text",
            "required": false,
            "label": "Anno di nascita",
            "validations": [],
            "sampleValid": "2020",
            "sampleInvalid": "abcd",
            "inputMode": "numeric"
          },
          {
            "name": "Peso",
            "type": "text",
            "required": false,
            "label": "Peso",
            "validations": [],
            "sampleValid": "8.5",
            "sampleInvalid": "abc",
            "placeholder": "kg",
            "inputMode": "decimal"
          },
          {
            "name": "Giorno",
            "type": "text",
            "required": false,
            "label": "Compleanno - Giorno",
            "validations": [],
            "sampleValid": "15",
            "sampleInvalid": "45",
            "inputMode": "numeric"
          },
          {
            "name": "Mese",
            "type": "text",
            "required": false,
            "label": "Compleanno - Mese",
            "validations": [],
            "sampleValid": "6",
            "sampleInvalid": "13",
            "inputMode": "numeric"
          },
          {
            "name": "Cliente",
            "type": "radio",
            "required": false,
            "label": "Cliente (Mensile/Occasionale)",
            "validations": [],
            "sampleValid": "Occasionale",
            "sampleInvalid": ""
          }
        ],
        "submit": {
          "label": "Salva",
          "destructive": false
        }
      },
      {
        "id": "prezzi-personalizzati",
        "label": "Prezzi personalizzati (prezzo-<slug> e durata-<slug> per servizio)",
        "fields": [
          {
            "name": "prezzo-bagno",
            "type": "text",
            "required": false,
            "label": "Prezzo Bagno",
            "validations": [
              "numerico; errore da collectPrices mostrato come quoteError"
            ],
            "sampleValid": "25",
            "sampleInvalid": "abc",
            "placeholder": "20 (da listino)",
            "inputMode": "decimal"
          },
          {
            "name": "durata-bagno",
            "type": "text",
            "required": false,
            "label": "Durata Bagno (min)",
            "validations": [],
            "sampleValid": "40",
            "sampleInvalid": "-5",
            "placeholder": "30",
            "inputMode": "numeric"
          },
          {
            "name": "prezzo-/durata- altri servizi",
            "type": "text",
            "required": false,
            "label": "taglio, bagno-taglio, stripping, nodi, dermatologico, antiparassitario, unghie, spa",
            "validations": [],
            "sampleValid": "30",
            "sampleInvalid": "abc",
            "inputMode": "decimal/numeric"
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
        "label": "Foto del cane",
        "destructive": false,
        "opens": "file picker / dialog foto"
      },
      {
        "label": "Piccola / Media / Grande",
        "destructive": false
      },
      {
        "label": "Bravo / Agitato / Mordace",
        "destructive": false
      },
      {
        "label": "Altri dettagli",
        "destructive": false,
        "opens": "sezione espandibile (specie, sesso, età, peso, compleanno, cliente, altri contatti, note, campi)"
      },
      {
        "label": "Aggiungi numero",
        "destructive": false,
        "opens": "dialog:contatto"
      },
      {
        "label": "Aggiungi nota",
        "destructive": false
      },
      {
        "label": "Campi",
        "destructive": false,
        "opens": "dialog:campo"
      },
      {
        "label": "Prezzi personalizzati",
        "destructive": false,
        "opens": "sezione espandibile con prezzo/durata per servizio"
      },
      {
        "label": "Salva",
        "destructive": false,
        "opens": "naviga a /animali/<id> con toast \"Annulla\" (Annulla elimina il cane appena creato)"
      }
    ],
    "links": [
      {
        "label": "Animali (indietro)",
        "href": "/animali"
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
        "id": "contatto",
        "title": "Contatto",
        "elements": {
          "fields": [
            "Nome contatto",
            "Telefono contatto (tel)",
            "ruolo (chip)"
          ],
          "buttons": [
            "Aggiungi",
            "Chiudi"
          ]
        }
      },
      {
        "id": "campo",
        "title": "Campo",
        "elements": {
          "fields": [
            "Etichetta",
            "Valore"
          ],
          "buttons": [
            "Aggiungi",
            "Chiudi"
          ]
        }
      },
      {
        "id": "foto-profilo",
        "title": "Foto profilo",
        "elements": {
          "buttons": [
            "scatta/scegli foto",
            "Chiudi"
          ]
        }
      }
    ],
    "tabs": [],
    "tables": []
  },
  "flows": [
    "Salvare vuoto: compaiono 3 errori (nome, proprietario, telefono)",
    "Creare un cane con nome, proprietario, telefono -> redirect a /animali/<id> + toast con Annulla",
    "Aggiungere contatto extra e campo personalizzato",
    "Impostare prezzi personalizzati per servizio",
    "Aprire da altre pagine con returnTo (torna con ?cane=<id>)",
    "Collaboratore può creare un cane"
  ],
  "assertions": [
    "Titolo \"Nuovo cane\" e sezioni IDENTITÀ, CONTATTI, CARATTERE visibili",
    "Salva vuoto mostra \"Il nome è obbligatorio\", \"Il proprietario è obbligatorio\", \"Il telefono è obbligatorio\"",
    "Nome/Proprietario/Telefono hanno aria-invalid=true dopo errore",
    "Nessun maxLength HTML su Nome",
    "Altri dettagli espande specie/sesso/età/peso/compleanno/cliente",
    "Prezzi personalizzati mostra campo prezzo e durata per servizio con placeholder da listino"
  ],
  "api": [
    {
      "method": "POST",
      "url": "http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel",
      "status": 200
    }
  ],
  "console": {
    "errors": [],
    "warnings": [
      "React Router Future Flag Warning: v7_startTransition"
    ]
  }
}
```
