# Brief: qa-test-runner — verifica audit su main 1.1.188 (C1, C2, A5)

Run `2026-11-04T13-45-40Z`. Si ripetono sulla versione attuale le verifiche fatte il 1° novembre sui rami dei fix.

1. Contratto: `D:/Groomly/.claude/agents/qa-test-runner.md` (formato di `result.md` validato a macchina).
2. Browser: se i tuoi strumenti Playwright MCP non sono disponibili, guida Chromium con Playwright da script Node in `D:/Groomly/QA-tests/.qa-catalog/work/run-verifica-<gruppo>/`, lanciati con `node` da `D:/Groomly`. Puoi usare l'helper `D:/Groomly/test-results/audit/lib.cjs` (`open(email)`, `login`, `go`, `shot`, `text`; blocca gli host non locali). Chiudi sempre il browser alla fine di ogni script.
3. Impostazioni: devUrl `http://127.0.0.1:5173`, settleMs 4000, authMode per-role. Le credenziali per ruolo sono nell'oggetto `roles` di `D:/Groomly/QA-tests/.qa-catalog/state/creds.json` (account di prova sull'emulatore Firebase locale). Non scrivere MAI le password in `result.md` o nelle risposte.
4. runDir del task `<id>` = `D:/Groomly/QA-tests/results/runs/2026-11-04T13-45-40Z/<id>`.
5. Fixture e controlli nel cloud: campo `fixtures` di `QA-tests/.qa-catalog/verify-c1-criteria.json`, `verify-c2-criteria.json`, `verify-a5-criteria.json`. Usa un nome cane unico per task (es. «QA V301 Fido»). Altri runner usano gli stessi saloni: giudica solo le visite create dalla TUA fixture.
6. I task sono stati scritti il 1° novembre: se un'etichetta dell'interfaccia è cambiata da allora ma la funzione c'è, adattati e annotalo; segna FAIL solo per un difetto vero dell'app rispetto ai criteri. Difetti in «## Defects Found» con id `DEF-<task>-<n>`.
7. Riporta nel `result.md` la tabella «## Acceptance criteria» con i criteri del task (C1/C2/A5 ACn) che hai verificato.
8. Dopo ogni `result.md`: `node "C:/Users/masal/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/rpm/bf2bb543/f2046299/plugin_013zBe7hFNCRa1ujqfW4eqNh/scripts/verify-result.mjs" "D:/Groomly/QA-tests/results/runs/2026-11-04T13-45-40Z/<id>"`; correggi il file se fallisce (un nuovo tentativo).
9. Non modificare nulla fuori da `D:/Groomly/QA-tests/`. Non lanciare sottoagenti.
10. Se subito dopo l'accesso l'app mostra «Could not reach Cloud Firestore backend» o «Salvataggio non riuscito», aspetta 30 s e riprova una volta; se continua, task BLOCKED (ambiente) e passa al successivo.
11. Risposta finale: SOLO una riga per task: `<id> PASS|FAIL|BLOCKED <criteri verificati, es. C2-AC1✓> <id difetti o ->`.
