# Cinque lingue, T5 Server

Parte del progetto `2026-11-04-cinque-lingue-design.md`. Le regole di lingua sono decise lì. Questo documento fissa il contratto con T4 e T6 e dice come lo realizzano le functions.

## Contratti

Copia per le altre sessioni: `D:\Groomly\.claude\lingue-note\contratti-t5.md`.

### 1. Errori delle callable

Ogni `HttpsError` delle functions porta un codice stabile in `details`.

```json
{ "error": { "status": "FAILED_PRECONDITION", "message": "Accesso negato", "details": { "codice": "accesso_negato" } } }
```

- **Posizione.** `details.codice`, sempre una stringa `snake_case`. Con segnaposto c'è anche `details.valori`, per esempio `{ "codice": "annuncio_giorni_minimi", "valori": { "n": 15 } }`.
- **Client web e app** (SDK Firebase): `error.details?.codice` e `error.details?.valori`.
- **Pagine pubbliche** (`fetch` diretto): `corpo.error.details.codice`.
- **`message` resta in italiano**, uguale a oggi: serve alle APK già installate, che non conoscono i codici. Chi conosce i codici non lo mostra mai.
- **Codice sconosciuto o assente** (errori `INTERNAL`, rete, funzione vecchia): frase generica della lingua (`generico`, `t.ko`). Mai `message`.
- **Tabella unica.** Le frasi nelle cinque lingue stanno in `src/i18n/errori.ts`, blocco `// Lingue T5`, lette con `fraseErrore(lingua, codice, valori?)`. Il server prende da lì anche il `message` italiano. Le pagine di `hosting` tengono la loro tabella (T6), solo con i codici della sezione «Pagine pubbliche e prenotazione» più i generali che citano.

Il valore `HttpsError.code` (`failed-precondition`, `invalid-argument`...) non cambia.

**Generali**

| Codice | Italiano | Dove |
|---|---|---|
| `accesso_richiesto` | Accesso richiesto | tutte le callable con login |
| `accesso_negato` | Accesso negato | tutte le callable con login |
| `richiesta_non_valida` | Richiesta non valida | pubbliche e salone |
| `troppe_richieste` | Troppe richieste | `inviaRichiesta`, `preparaRichiesta` |
| `attendi_riprova` | Aspetta un momento e riprova | email di servizio, push |
| `invio` | Invio non riuscito | email di servizio, inviti (codice già in `errori.ts`) |
| `email_valida` | Inserisci un’email valida | email di servizio, inviti (codice già in `errori.ts`) |
| `dispositivo_non_valido` | Dispositivo non valido | `prendiPushTelefono`, `confermaPushTelefono` |
| `riga_assente` | Riga assente | `fermaCoda`, `inviaSubito` |
| `ricerca_non_riuscita` | Ricerca non riuscita | indirizzi |
| `troppe_ricerche` | Troppe ricerche oggi | indirizzi |

**Pagine pubbliche e prenotazione**

| Codice | Italiano | Dove |
|---|---|---|
| `prenotazioni_spente` | Prenotazioni spente | `inviaRichiesta`, `postiLiberi` |
| `orario_non_disponibile` | Orario non disponibile | `inviaRichiesta` |
| `servizio_non_valido` | Servizio non valido | `inviaRichiesta` |
| `foto_non_valida` | Foto non valida | `inviaRichiesta` |
| `razza_obbligatoria` | Razza obbligatoria | `inviaRichiesta` |
| `animale_non_accettato` | Questo salone non accetta questo animale | `inviaRichiesta` |
| `consenso_mancante` | Serve il consenso | `inviaRichiesta` |
| `nome_non_valido` | Nome non valido | `inviaRichiesta` |
| `telefono_non_valido` | Telefono non valido | `inviaRichiesta`, `preparaRichiesta` |
| `email_obbligatoria` | Email obbligatoria | `inviaRichiesta` |
| `pagina_assente` | Pagina assente | `saloneInfo` |
| `link_non_valido` | Link non valido | `silenzioEmail` |
| `cane_assente` | Cane assente | `silenzioEmail` |

Più i generali `richiesta_non_valida` e `troppe_richieste`.

**Salone**

| Codice | Italiano | Dove |
|---|---|---|
| `richiesta_assente` | Richiesta assente | `gestisciPrenotazione` |
| `nome_preso` | Nome già preso | `pubblicaSalone` (codice già in `errori.ts`) |
| `prova_non_disponibile` | Prova non disponibile | `avviaProva` |
| `piano_vip_attivo` | Il piano VIP resta attivo | `impostaPianoManuale`, `setSalonPro` |
| `motivo_piano` | Scrivi il motivo, da 1 a 400 caratteri | `impostaPianoManuale` |
| `account_non_eliminabile` | Questo account non si può eliminare | `eliminaAccount` |
| `salone_non_eliminabile` | Questa toelettatura non si può eliminare | `eliminaSalone` |

**Team e inviti**

| Codice | Italiano |
|---|---|
| `pro_non_attivo` | Pro non è attivo |
| `posti_esauriti` | Posti esauriti |
| `email_gia_nel_salone` | Questa email è già nel salone |
| `email_non_invitabile` | Questa email non si può invitare |
| `invito_non_valido` | Invito non valido |
| `invito_scaduto` | Invito scaduto |
| `invito_altra_email` | Questo invito è per un’altra email |
| `invito_conferma_email` | Conferma la tua email per accettare l’invito |
| `invito_account_con_salone` | Questo account ha già un salone |
| `invito_aggiorna_app` | Aggiorna l'app per accettare l'invito |
| `invito_non_in_sospeso` | Invito non più in sospeso |
| `revoca_titolare` | Non puoi revocare il titolare |

**Beta**

| Codice | Italiano |
|---|---|
| `beta_risposta_non_valida` | Risposta non valida: riprova |
| `beta_solo_titolare` | Solo il titolare può rispondere all’invito |
| `beta_invito_non_valido` | Questo invito non è più valido |
| `beta_invito_scaduto` | Questo invito è scaduto |
| `beta_gia_vip` | Hai già il piano Salon omaggio: l’invito non serve |
| `beta_gia_piano` | Hai già un piano attivo: l’invito non serve |
| `beta_feedback_non_valido` | Controlla le risposte e riprova |
| `beta_feedback_ruolo` | Il feedback lo mandano il titolare o il socio |
| `beta_feedback_solo_beta` | Il feedback è per chi ha provato la beta |
| `beta_feedback_limite` | Hai già mandato 5 feedback oggi: riprova domani |

**Solo operatore** (Admin Manager: hanno il codice e la frase nelle cinque lingue come gli altri, ma le pagine non si traducono)

`impostazione_non_valida`, `valore_non_valido`, `durata_non_valida`, `salone_non_trovato`, `beta_non_in_corso`, `beta_gia_finita`, `beta_massimo_giorni`, `beta_niente_da_revocare`, `controllo_non_superato`, `abbonamenti_gia_attivi`, `annuncio_giorni_minimi` (`valori.n`), `scrivi_parola` (`valori.parola`).

**Le frasi dentro `src/lib`.** Alcune decisioni condivise col client restituiscono `{ ok: false, message }` in italiano: `salonAccess.ts`, `prenotazione.ts`, `disponibilita.ts`, `funzioniPiano.ts`, `slug.ts`. Il server trasforma quel testo in codice con `codiceDaMessaggio`, per confronto esatto. **T4:** se tocchi queste frasi, il testo italiano deve restare identico; un test delle functions fallisce se un `message` di questi file non ha un codice.

### 2. Errori che sono già codici

Queste callable rispondono `{ ok: false, errore }` nel `result`, con status 200. Non cambiano, e i codici sono già stabili:

| Callable | `errore` |
|---|---|
| `iscrivitiAttesa` | `spento`, `consenso`, `dati`, `tante` |
| `confermaAttesa` | `token`, `spento` e gli altri esiti di oggi |
| `gestisciPrenotazione` | `stato` e gli altri di oggi |

### 3. Campo `lingua` delle pagine pubbliche

Valori ammessi: `it`, `en`, `es`, `fr`, `de`. Un valore assente o diverso non è un errore: il server lo ignora e usa la catena di riserva.

| Chiamata | Campo | Cosa fa il server |
|---|---|---|
| `inviaRichiesta` | `data.lingua` | lo salva in `salons/{id}/richieste/{id}.lingua` |
| `iscrivitiAttesa` | `data.lingua` | lo salva in `salons/{id}/attesa/{id}.lingua`; chi si riscrive lo aggiorna |
| `confermaAttesa` | `data.lingua` | serve solo agli iscritti vecchi senza lingua; va mandato a ogni azione |

**T6** manda sempre la lingua in cui la pagina è mostrata, cioè quella decisa da `?lang=`, poi browser, poi inglese. Nessun'altra chiamata pubblica la vuole.

### 4. Catena sul server

- **Email di una richiesta:** `richiesta.lingua`, poi `settings.linguaClienti`, poi `'it'`.
- **Lista d'attesa:** `iscritto.lingua`, poi la stessa riserva.
- **Coda automatica:** `dog.lingua` riga per riga, poi la stessa riserva.
- **Titolare, soci, collaboratori:** `accounts/{uid}.lingua`, poi `'it'`.

La lingua del titolare non entra mai nella catena dei clienti.

### 5. `dog.lingua`

Le functions scrivono `salons/{id}/dogs/{dogId}.lingua` quando una richiesta o un iscritto diventa cliente, con la lingua della richiesta. Su una scheda che esiste già si scrive solo se manca. **T4:** il campo va letto in `PulsanteMessaggi` e non va perso quando l'app salva la scheda.

### 6. `?lang=` nei link

Ogni link per il cliente in un'email porta `lang=<lingua dell'email>`: pagina del salone (`/s/<slug>`), lista d'attesa (`?attesa=<token>`), `rispondiRichiesta`, `/azione`. **T6:** `hosting/azione` e `hosting/s/pagina.js` leggono `lang` anche da questi link. `rispondiRichiesta` risponde già nella lingua del parametro: non serve altro.
