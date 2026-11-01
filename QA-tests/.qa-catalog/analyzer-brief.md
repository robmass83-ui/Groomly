# Brief: page analysis for qa-my-app init (Groomly)

You replace the `qa-page-analyzer` agent (not loadable in this session). Do its job exactly, for each route assigned to you.

1. Read the analyzer instructions and the output schema: D:/Groomly/.claude/agents/qa-page-analyzer.md. Follow its Process and Output sections.
2. Browser: instead of the Playwright MCP tools, drive Chromium with Playwright from Node scripts you write under D:/Groomly/QA-tests/.qa-catalog/work/<your-group>/ and run with `node` from D:/Groomly (so `require('playwright')` resolves). Use your own browser instance. You may reuse the helper D:/Groomly/test-results/audit/lib.cjs (`open(email)`, `go(page, path)`, `shot`, `text`; it logs in and blocks non-local hosts).
3. Settings: devUrl http://127.0.0.1:5173, settleMs 4000, per-role auth. Credentials map: the "roles" object in D:/Groomly/QA-tests/.qa-catalog/state/creds.json (test-only accounts on a local Firebase emulator — never print passwords). Role choice per route: first entry of route.rolesAllowed; `null` → anonymous. Route records: D:/Groomly/QA-tests/.qa-catalog/routes.json.
4. Dynamic params: take real ids from the app (e.g. open /animali and use the first dog link; open /calendario or Home for an appointment id; /impostazioni/abbonamento/pro for :piano; /invito/:token with a fake token is fine — record the invalid-invite state). For sheet routes (/appuntamenti/*, /chiusure/*) open them from their background page.
5. Read the route's source file first (validation rules, zod schemas, i18n texts in src/i18n/it.ts) to fill sampleValid/sampleInvalid per field.
6. Do NOT submit destructive actions (delete, eliminate account, revoke). Opening dialogs to inventory them is fine; cancel them.
7. Save each route's Page Analysis JSON with Bash to D:/Groomly/QA-tests/.qa-catalog/analyses/<slug>.json where slug = path with "/" → "_" and ":" removed (root "/" → "_home"). Do not modify any file outside D:/Groomly/QA-tests/.
8. Do not dispatch subagents.
9. Final reply: ONLY one line per route: "<path> <slug>.json forms:<n> buttons:<n> authFailed:<bool>".
