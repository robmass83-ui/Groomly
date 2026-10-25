# Progresso del piano piani completi

Ripartenza dal commit `f60df42` su `main`. Aggiornare questo file e fare commit dopo ogni task. Se la sessione si interrompe, il primo task che non è `fatto` o `bloccato da Roberto` è quello da cui ripartire.

| Task | Stato | Commit | Test |
|---|---|---|---|
| R0 Specifica, piano, decisioni | fatto | `6bb5b2b` | solo documenti |
| R1 F5 con le regole vere | fatto | `57dcceb` | accessoSospeso 6/6, client filtrato verde; emulatore non lanciato |
| R2 Nove test rossi e orologio fermo | fatto | `9ef9e47` | i 10 rossi di quei file sono verdi; suite intera 1526/1527, un timeout alzato a 10 s |
| R3 Kit 360° e `VITE_EMULATORS` | fatto | `5108d6a` | guardia 3/3, client.test verde, tsc verde |
| R4 `npm test` senza rete | fatto | `1d56ddc` | `rete.test` verde (prima unstub prendeva HTTP 200 da GitHub). Suite intera ancora ~5,5 min dopo aver spostato 4 file oltre 60 s in `test:slow`. Due test falliscono solo a pieno carico e passano da soli. Terzo tentativo sul tetto dei 4 minuti: non raggiunto, si va avanti. |
| R5 Push di `main` | non fatto | — | — |
| 0 Nota Roberto | fatto | `26e482f` | documento |
| 1 Un solo ramo | fatto | `d42c4b7`, `e6a633f` | — |
| 2 Regole F1 F3 F4 M12 | fatto | `1b42e94` | emulatore nel commit |
| 3 Kit 360° | sostituito da R3 | — | — |
| 4 Offline F2 | fatto | `940bd4f` | — |
| 5 Usabilità | in corso (mancano F5 vero, M11, M13) | `cbeb495`…`f60df42` | mock verdi, regole vere no |
| 6 Test senza rete | sostituito da R4 | — | — |
| 7 Test 360° iniziale | non fatto | — | — |
| 8 `piano.ts` | fatto | `3cad49e` | — |
| 9 Paywall e menu | non fatto | — | — |
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
