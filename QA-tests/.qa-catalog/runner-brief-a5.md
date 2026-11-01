# Brief: test runner for qa-my-app verify (Groomly) — A5

You replace the `qa-test-runner` agent (not loadable in this session). For each task assigned to you, do its job exactly.

1. Read the runner contract: D:/Groomly/.claude/agents/qa-test-runner.md (Input, Execution contract, Output — the result.md format MUST match it exactly, it is machine-validated).
2. Browser: instead of Playwright MCP tools, drive Chromium with Playwright from Node scripts under D:/Groomly/QA-tests/.qa-catalog/work/run-<your-group>/, run with `node` from D:/Groomly. Own browser instance. You may use the helper D:/Groomly/test-results/audit/lib.cjs (`open(email)`, `login`, `go`, `shot`, `text`; blocks non-local hosts). Save screenshots inside the task's runDir and embed them in result.md as the contract says.
3. Settings: devUrl http://127.0.0.1:5173, settleMs 4000, authMode per-role, credentialsByRole = the "roles" object in D:/Groomly/QA-tests/.qa-catalog/state/creds.json (test-only accounts on a local Firebase emulator; NEVER write passwords into result.md or any output).
4. Run: runId 2026-11-01T20-38-36Z; runDir for task <id> = D:/Groomly/QA-tests/results/runs/2026-11-01T20-38-36Z/<id>.
5. Fixtures/cloud checks: see D:/Groomly/QA-tests/.qa-catalog/verify-a5-criteria.json ("fixtures"). Use a dog name unique to the task (e.g. "QA T305 Fido").
6. Mark a TC FAIL only for a real app defect; if your script was wrong, fix it and re-run. Put real defects in "## Defects Found" with DEF-<task>-<n> ids.
7. Do not modify anything outside D:/Groomly/QA-tests/. Do not dispatch subagents.
8. After writing each result.md, run: node "C:/Users/masal/.claude/plugins/synced/f2046299-1d7d-4263-921a-df5aafd004d6_bf2bb543-7650-4f22-b64e-1c5729f338e6/5312096c-d928-406e-8884-b59f0b622012/scripts/verify-result.mjs" "D:/Groomly/QA-tests/results/runs/2026-11-01T20-38-36Z/<id>" and fix the file if it fails (one retry).
9. Final reply: ONLY one line per task: "<id> PASS|FAIL|BLOCKED <AC verified, e.g. AC2✓ AC5✓> <defect ids or ->".
10. Ruoli: titolare-salone (salone55), collaboratore (staff55a, collaboratore di salone55), socio-salone (staff54a, socio di salone54). Giudica solo i dati creati dalla TUA fixture.
11. Always close your browser at the end of every script (`await browser.close()` in a finally). Never leave Chromium running.
12. If the app shows «Could not reach Cloud Firestore backend» / «Salvataggio non riuscito» right after login, wait 30 s and retry once; if it persists, mark the task BLOCKED (environment) and stop — do not loop.
