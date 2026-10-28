# Pulizia del lavoro locale

Data: 28 ottobre 2026.

Si mette in ordine la cartella di lavoro senza cambiare l’app e senza pubblicare una release nuova. La 1.1.123 è già online. I pulsanti Collega e Scollega Google restano quelli già in `main`.

## Lavoro lasciato intatto

Prima della pulizia, `main` locale aveva quattro commit non ancora inviati. L’ultimo è `25ddb97`. Insieme a `be3a498` ci sono `c038b16`, `49010ef` e `25ddb97`: i testi WhatsApp salutano, non portano più la firma «Fatto con Groomly», e promemoria, conferma e richiamo chiedono nome, cane, servizio e orario. I file sono `src/lib/messaggiManuali.ts`, `src/lib/messaggiManuali.test.ts`, `src/pages/strumenti.test.tsx`, `docs/superpowers/specs/2026-10-28-testi-mail-whatsapp-design.md` e la riga di `docs/superpowers/specs/LEGGIMI.md` che elenca quella specifica.

Quei commit non si modificano, non si annullano e non si uniscono ad altri. La pulizia non tocca quei file.

## Situazione di partenza

`origin/main` è `77f00c1`, «Pubblica la 1.1.123: l'aggiornamento scarica l'APK solo da Groomly e dalla sua release GitHub». Il tag `v1.1.123` punta a quel commit. Dentro ci sono anche gli otto commit successivi al tag `v1.1.122`: tetto di cinque email al giorno, push che non legge tutti gli account, email verificata per l’operatore, conferma e rifiuto solo dal pulsante, e il cancello della prenotazione pubblica.

I file di versione in quel commit sono già `1.1.123`. In `android/app/build.gradle` il `versionCode` è `10223` e il `versionName` è `1.1.123`. Non si toccano.

Quei quattro commit restano sopra `77f00c1`. Il codice dell’app che si ripristina è quello di `HEAD`, quindi include già i testi WhatsApp nuovi.

Lo stage è vuoto. Sul disco, rispetto a `main`, restano due modifiche al codice e un mucchio di file mai committati.

## Codice

Si ripristinano per intero, indice e disco, alla copia di `HEAD`:

- `src/pages/AccountPage.tsx`
- `src/data/firebase/client.ts`

Dopo il ripristino `git diff` su questi due file è vuoto. In `client.ts` c’è `collegaGoogle`. In Account, nella scheda Sicurezza, ci sono i pulsanti Collega e Scollega Google.

`src/i18n/zona.ts` non è mai stato committato e nessuno lo importa. Si cancella il file. Non si usa `git rm`.

## File da cancellare dal disco

Sono tutti non tracciati. Si cancellano solo questi percorsi:

- `firestore-debug.log`
- `pubsub-debug.log`
- `seed-report.json`
- `test-results/`

Non si esegue `git clean`.

## File che restano sul computer e spariscono dallo status

Restano sul disco e si ignorano, perché non fanno parte dell’app:

- `.agents/`
- `.claude/skills/`
- `.grok/`
- `skills-lock.json`
- `.superpowers/brainstorm/`

In fondo a `.gitignore` si aggiungono queste righe, in questo ordine:

```
firestore-debug.log
pubsub-debug.log
seed-report.json
test-results/
skills-lock.json
.agents/
.claude/skills/
.grok/
.superpowers/brainstorm/
```

Le tre righe già presenti per `.superpowers/brainstorm/.last-port`, `.last-token` e `**/state/` restano. Non si ignora l’intera cartella `.claude/`, così un altro file sotto `.claude/` può ancora essere tracciato.

## File che restano visibili e non entrano nel commit

Si lasciano come sono, modifiche locali o file nuovi:

- gli spostamenti dei documenti verso `docs/archive/` e verso `docs/superpowers/plans/archive/` e `docs/superpowers/specs/archive/`
- `SECURITY-AUDIT.md`
- `docs/brevo/`
- `Icon and logo/`
- gli altri file nuovi sotto `docs/` che non sono questa specifica

## Commit e invio

Questa specifica si committa da sola, prima della pulizia, insieme alla riga che la elenca in `docs/superpowers/specs/LEGGIMI.md`. Non si invia ancora.

La pulizia avviene dopo, in un secondo commit che contiene solo `.gitignore`. Prima di quel commit si lancia `npm test`. Se i test falliscono, non si committa `.gitignore` e non si invia nulla.

Se i test passano, si invia `main` con un push normale. Partono i quattro commit già presenti, il commit di questa specifica e il commit di `.gitignore`. Non si forza il push. Se GitHub rifiuta l’accesso, ci si ferma e lo si dice.

Non si alza la versione. Non si crea una release. Non si costruisce un APK. Non si esegue il deploy di Firebase. Una release 1.1.124 con lo stesso codice della 1.1.123 non va pubblicata.

## Verifica

- `git diff -- src/pages/AccountPage.tsx src/data/firebase/client.ts` non stampa nulla.
- `src/i18n/zona.ts` non esiste.
- `npm test` termina con successo.
- `git status` non elenca log, `seed-report.json`, `test-results/`, skill, `skills-lock.json` né `.superpowers/brainstorm/`.
- `git status` elenca ancora i documenti spostati, `SECURITY-AUDIT.md`, `docs/brevo/` e `Icon and logo/`.
