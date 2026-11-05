# Lingue T7: audit finale

Parte di `2026-11-04-cinque-lingue-design.md`, ondata 3. Le regole di lingua sono decise lì e qui non si riaprono. Non c'è un brainstorm: il compito è una verifica e le scelte di prodotto restano quelle del progetto.

## Come si verifica

- **Emulatori propri.** `firebase.lingue.json` e `QA-tests/.qa-catalog/vite-lingue.config.ts` usano porte diverse da 8080 e 5173, che altre sessioni possono tenere occupate. Il codice dell'app non cambia.
- **Nessuna email esce.** `brevo-finto.cjs` si carica nelle functions in emulatore e scrive su file ogni chiamata a Brevo. Fa anche funzionare `getFirestore()` nelle callable, che con la credenziale finta di `index.ts` rispondono INTERNAL.
- **Schermate.** `verify-cinque-lingue.cjs` apre ogni rotta per ruolo, lingua e larghezza. Confronta il testo con i cinque cataloghi e misura sbordi, tagli e parole spezzate. Con `--dialoghi` tocca i pulsanti di ogni rotta; con `--ripeti` riapre solo quelli che in tedesco a 320 px hanno aperto qualcosa.
- **Flussi.** `verify-lingue-flussi.cjs` prenota dalla pagina `/s/` vera con browser tedesco, poi il salone risponde con le callable vere. `verify-lingue-app.cjs` prova telefono, passaggio, cambio in tempo reale, giro di benvenuto e pagine senza accesso.
- **Documenti.** `verify-lingue-documenti.mjs` genera email, pagine di esito e push. `verify-lingue-email-schermo.cjs` le apre a 320 e 390 px. `verify-lingue-file.mjs` genera PDF ed Excel e li rilegge.

## Fatto quando

Vedi il compito della sessione: `npm run build`, `npm test` e test delle functions verdi, `docs/audit-cinque-lingue.md` con una riga per schermata e lingua, scritto ciò che non si è potuto verificare.
