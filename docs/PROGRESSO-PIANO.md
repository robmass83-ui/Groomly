# Progresso del piano piani completi

Ripartenza dal commit `f60df42` su `main`. Aggiornare questo file e fare commit dopo ogni task. Se la sessione si interrompe, il primo task che non è `fatto` o `bloccato da Roberto` è quello da cui ripartire.

## Fuori piano — regola `users/{uid}` (25/10/2026, urgente)

Separato dai task qui sotto. Non alza la versione, non tocca l’APK, gli indici, l’hosting e non è stato committato.

Base pubblicata: regole della 1.1.93, commit `f8630c3` sul ramo `pro-collaboratori`. L’unica differenza rispetto a quel commit è il match dei dati personali. Prima:

```
match /users/{uid}/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid;
}
```

Adesso, in produzione:

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Nessun elenco chiuso delle raccolte e nessun’altra riga. Le regole di `main` (elenco chiuso e altre modifiche del piano) non sono state pubblicate e il file `firestore.rules` di `main` non è stato modificato.

Quel testo era già online dal 24/10/2026 alle 23:26 UTC (ruleset `89cb4014-30e4-45f8-959e-94a20f524aa5`), caricato dal worktree `pro-collaboratori`. Il deploy di oggi non ha ricaricato un file diverso: Firebase ha risposto «latest version of firestore.rules already up to date, skipping upload» e ha rilasciato di nuovo lo stesso ruleset. `updateTime` della release `cloud.firestore`: `2026-10-25T10:10:28.895641Z`. Comando, dalla cartella `.worktrees/pro-collaboratori`: `npx firebase deploy --only firestore:rules --project groomly-3128b --non-interactive`. Compilazione riuscita. Restano gli avvisi già presenti nella 1.1.93 (`owns` non usata; `exists` e `get` segnate dal compilatore come nomi non validi) e non sono stati toccati.

Prova sull’emulatore Firestore `cloud-firestore-emulator-v1.19.8.jar`, progetto `demo-groomly`, porta `127.0.0.1:8080`, con lo stesso file di regole poi pubblicato. Dati scritti a regole spente: documento `users/laura-finta` e `users/laura-finta/backups/2026-10-01`. Laura finta è l’utente `laura-finta` con email `laura.masala@tiscali.it`. L’altro utente è `uid-salone-1`.

| Prova | Esito |
|---|---|
| L’altro utente legge il backup di Laura | negato |
| L’altro utente legge il documento `users/laura-finta` | negato |
| Laura finta legge il suo backup | permesso |
| Laura finta legge il suo documento | permesso |
| L’altro utente scrive il backup di Laura | negato |
| Laura finta scrive il suo backup | permesso |

6/6. Il log `PERMISSION_DENIED` sulla scrittura dell’altro utente è il rifiuto atteso.

| Task | Stato | Commit | Test |
|---|---|---|---|
| R0 Specifica, piano, decisioni | fatto | `6bb5b2b` | solo documenti |
| R1 F5 con le regole vere | fatto | `57dcceb` | accessoSospeso 6/6, client filtrato verde; emulatore non lanciato |
| R2 Nove test rossi e orologio fermo | fatto | `9ef9e47` | i 10 rossi di quei file sono verdi; suite intera 1526/1527, un timeout alzato a 10 s |
| R3 Kit 360° e `VITE_EMULATORS` | fatto | `5108d6a` | guardia 3/3, client.test verde, tsc verde |
| R4 `npm test` senza rete | fatto | `1d56ddc` | `rete.test` verde (prima unstub prendeva HTTP 200 da GitHub). Suite intera ancora ~5,5 min dopo aver spostato 4 file oltre 60 s in `test:slow`. Due test falliscono solo a pieno carico e passano da soli. Terzo tentativo sul tetto dei 4 minuti: non raggiunto, si va avanti. |
| R5 Push di `main` | fatto | `61133f3` | `origin/main` aggiornato da `8ea3fc4` a `61133f3` |
| 0 Nota Roberto | fatto | `26e482f` | documento |
| 1 Un solo ramo | fatto | `d42c4b7`, `e6a633f` | — |
| 2 Regole F1 F3 F4 M12 | fatto | `1b42e94` | emulatore nel commit |
| 3 Kit 360° | sostituito da R3 | — | — |
| 4 Offline F2 | fatto | `940bd4f` | — |
| 5 Usabilità | fatto | `57dcceb`, `284af07` | F5 con `elencoNegato`; M11 lo spazio è già `BOTTOM_NAV_CONTENT_PAD` nel guscio; M13 `revocaMembroAllUscita` (la callable la chiama il task 21) |
| 6 Test senza rete | sostituito da R4 | — | — |
| 7 Test 360° iniziale | fatto | `c3416e1` | rapporto in `docs/Groomly_Test360_RAPPORTO_INIZIALE.md`. Regole emulatore 10/10 (F5 e salvataggi 1.1.93); rules.ts 27/28; giri titolare chiaro/scuro, collaboratore, socio, operatore, offline. Functions non partito. Deploy regole no. |
| 8 `piano.ts` | fatto | `3cad49e` | — |
| 9 Paywall e menu | fatto | `06fcf93` | `usePiano`, card «Prova Pro gratis per 30 giorni», badge, route piano/team/messaggi/strumenti. Flag spento: solo Privacy e Elimina account. «Avvisami» scrive `interesse/{feature}`. Collaboratore senza card. |
| 10 Prova e omaggio | non fatto | — | — |
| 11 Team e posti | non fatto | — | — |
| 12 Report ed export | non fatto | — | — |
| 13 Crediti | non fatto (previsto: solo nota, nessun codice) | — | — |
| 14 Copie cloud | non fatto | — | — |
| 15 Invia tutti | non fatto | — | — |
| 16 Promemoria email | non fatto | — | — |
| 17 Orari | non fatto | — | — |
| 18 Statistiche | non fatto | — | — |
| 19 Recensioni | non fatto | — | — |
| 20 Fedeltà | non fatto | — | — |
| 21 Account e privacy | non fatto | — | — |
| 22 Pagina salone | non fatto | — | — |
| 23 Disponibilità | non fatto | — | — |
| 24 Percorso cliente | non fatto | — | — |
| 25 Lato toelettatrice | non fatto | — | — |
| 26 Lista d’attesa | non fatto | — | — |
| 27 Scheda cliente | non fatto | — | — |
| 28 Controlli manuali | non fatto | — | — |
| 29 Flavor Play | non fatto (previsto: non si fa) | — | — |
| 30 Test chiuso Play | non fatto (previsto: non si fa) | — | — |
| 31 RevenueCat spento | non fatto | — | — |
| 32 Checklist, flag fermi | non fatto | — | — |
| 33 Proposte e firma | non fatto | — | — |
| 34 Metriche | non fatto | — | — |
| 35 Verifica trasversale | non fatto | — | — |
| 36 Test 360° finale | non fatto | — | — |
| 37 Pubblicazione | non fatto | — | deploy Firebase bloccato da Roberto |
