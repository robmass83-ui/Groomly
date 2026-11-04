# T1 Basi: cinque lingue nel codice

Parte del progetto `2026-11-04-cinque-lingue-design.md`, che decide le regole. Qui c'è solo ciò che quel documento lascia a chi costruisce. Tutte le scelte qui sotto sono di Claude e sono riportate in `docs/DECISIONI-AUTOMATICHE.md`.

## Perché

Le ondate 2 e 3 hanno bisogno di un tipo `Lingua` a cinque valori, di una regola di lingua definitiva e di test che elenchino il lavoro rimasto. T1 non traduce: mette le basi e lascia tutto verde.

## Approcci per le catene `lingua === 'es'`

Nei file delle ondate successive ci sono catene `if (lingua === 'en') … if (lingua === 'es') … italiano`. Compilano anche con cinque lingue, ma fr e de cadono sull'italiano.

- **Scelto: lasciarle e metterle in un elenco di debito.** Nessuna APK esce prima della chiusura, quindi nessuno vede il ripiego. Le riscrivono T4, T5 e T6, che possiedono quei file. Un test fallisce se ne compare una in un file nuovo o se l'elenco resta con file già puliti.
- Scartato: un ripiego sull'inglese in ogni funzione. Molte modifiche in `emailHtml.ts` che T5 riscrive comunque.
- Scartato: riscrivere le catene ora. È il lavoro dell'ondata 2.

## Scelte

**Elenco unico.** `src/i18n/lingua.ts` esporta `LINGUE`, `Lingua`, `NOMI_LINGUA` (nomi nella propria lingua) e `LOCALE_INTL`. `LinguaOfferta` diventa un alias di `Lingua`, `LINGUE_OFFERTA` è `LINGUE`. Le catene che scelgono solo il locale (`'en-GB'`) passano a `LOCALE_INTL`.

**Chi ha già l'app.** `passaggioLingua()` gira una volta, nell'inizializzazione di `LinguaProvider`, prima di leggere la lingua. Tiene il segno `groomly.linguaPassaggio`, scritto anche nelle installazioni nuove: senza, al secondo avvio una installazione nuova sembrerebbe vecchia.
- È «già installata» se esiste `groomly.session`, `groomly.auth`, `groomly.lastSignIn` o una chiave `groomly.users.*` o `groomly.mirror.*`.
- Se è già installata e non c'è una scelta, salva la lingua della vecchia regola. La vecchia regola conosce solo tre lingue: un telefono francese a Parigi vedeva l'inglese e deve continuare a vederlo. Per questo `linguaVecchiaRegola` tiene il suo elenco di tre lingue e non usa `linguaDelTelefono`.
- `linguaDalLuogo` resta in `linguaLuogo.ts`, usato solo da qui.

**`accounts/{uid}.lingua`.** Le regole già permettono al proprietario di cambiare il campo: non si toccano. Il componente `LinguaAccount` in `providers.tsx`, a sessione aperta su `home`, chiama `allineaLinguaAccount(lingua)`, che confronta con la copia in memoria del documento e scrive solo se è diversa. Riparte anche quando la lingua cambia a mano. Un errore si ignora: si riprova all'avvio dopo. Il campo si scrive anche alla creazione dell'account, perché l'email di verifica parte subito e legge da lì.

**Lingua dei clienti.** `primoAvvio({ nuovo, lingua, ruolo })` dà `linguaClienti` solo a un titolare nuovo. `writeOwnerSalon` la mette nelle impostazioni iniziali del salone, con la lingua dell'app. Per i saloni esistenti il campo resta vuoto e la voce mostra Italiano, come il server. In Impostazioni è una riga sotto «Lingua», solo se `puoScrivereLinguaClienti(ruolo)`, con il suo dialogo. Il testo `linguaMessaggiDettaglio` parlava del fuso: cambia in it, en, es.

**Login.** Oggi non ha un selettore. Si aggiunge una riga in fondo alla pagina con il nome della lingua, che apre un dialogo con le cinque lingue. `SceltaLista` esce da `SettingsPage` per essere usata in entrambe.

**Hosting.** T1 non tocca `hosting/*`: se accettasse `?lang=fr` le pagine resterebbero senza testo, perché le tabelle sono di T6. Il confronto in JavaScript non è un'unione di tipi. Il ripiego sull'italiano di `paginaPubblica` resta a T6.

**File provvisori.** `fr.ts` e `de.ts` riusano `en` con il commento `// LINGUE: da tradurre`. Le tabelle `Record<Lingua, …>` hanno l'inglese accanto, con lo stesso commento.

**Test.**
- `lingue.test.ts`: chiavi e segnaposto uguali; frasi fr e de uguali a en o it solo da `FRASI_UGUALI`, spento finché il file è provvisorio (riconosciuto dal commento); nessuna unione scritta a mano; catene solo nei file di `DEBITO_CATENE`; controllo sul commento `// LINGUE: da tradurre` spento da `SEGNAPOSTO_AMMESSI = true`, da mettere a `false` a fine ondata 2.
- `frasiFisse` guarda `.ts` e `.tsx` di `src` e `functions/src`, e anche i template con backtick. Si saltano cataloghi e test. `FILE_CON_TABELLE` elenca i file di tabelle che restano italiani per natura. `src/i18n/debitoFrasi.json` raccoglie file per file le frasi dell'ondata 2: una frase nuova fallisce, e fallisce anche una voce di debito che non esiste più.
- I test girano con `navigator.language = 'it-IT'` da `src/test/setup.ts`: prima l'italiano arrivava dal fuso della macchina.

## Cosa non si fa

Niente testi delle aree dell'ondata 2 oltre ai segnaposto. Niente `hosting`. Niente `dog.lingua`, `richiesta.lingua` e catena di riserva delle email: sono di T5.

## Lasciato a chi costruisce

Disposizione della riga nel Login, nome dei file di test.
