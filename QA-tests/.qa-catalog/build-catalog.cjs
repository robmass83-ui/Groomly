// Fase 5 di /qa-my-app:init: catalog.json, catalog.md, routes/<slug>.md, fingerprints.json
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
const Q = path.resolve('QA-tests'), P = process.argv[2]
const routes = require(path.join(Q, '.qa-catalog/routes.json'))
const tasks = fs.readdirSync(path.join(Q, 'tasks')).filter((f) => /^T\d{3}-.*\.md$/.test(f)).map((f) => f.replace(/\.md$/, ''))
const slugOf = (p) => p === '/' ? '_home' : p.replace(/\//g, '_').replace(/:/g, '').replace(/^_/, '')
const files = [...new Set(routes.map((r) => r.sourceFile).filter(Boolean))].filter((f) => fs.existsSync(f))
const fp = JSON.parse(execFileSync('node', [path.join(P, 'scripts/fingerprint.mjs'), ...files]).toString())
const status = JSON.parse(execFileSync('node', [path.join(P, 'scripts/auth-resolve.mjs'), '--status', '--json']).toString())
const stack = JSON.parse(execFileSync('node', [path.join(P, 'scripts/detect-framework.mjs')]).toString())
fs.mkdirSync(path.join(Q, 'routes'), { recursive: true })
const out = routes.map((r, i) => {
  const lo = i * 5 + 1, mine = tasks.filter((t) => { const n = +t.slice(1, 4); return n >= lo && n <= lo + 4 })
  const s = slugOf(r.path)
  const an = [`analyses/${s}.json`, `analyses/_${s}.json`].map((f) => path.join(Q, '.qa-catalog', f)).find((f) => fs.existsSync(f))
  fs.writeFileSync(path.join(Q, 'routes', `${s}.md`), `# ${r.path}\n\nSorgente: \`${r.sourceFile}\`\n\n\`\`\`json\n${an ? fs.readFileSync(an, 'utf8') : '{}'}\n\`\`\`\n`)
  return { path: r.path, sourceFile: r.sourceFile, fingerprint: fp[r.sourceFile] ?? (typeof fp === 'object' && fp.files ? fp.files[r.sourceFile] : null), requiresAuth: r.requiresAuth, rolesAllowed: r.rolesAllowed, guards: r.guards || [], httpMethods: r.httpMethods || ['GET'], tasks: mine }
})
const rolesUsed = [...new Set(['titolare', ...routes.flatMap((r) => r.rolesAllowed || [])])]
const catalog = { version: 3, generatedAt: new Date().toISOString(), framework: stack.framework, devUrl: 'http://127.0.0.1:5173', stack: stack.stack,
  integrations: { github: { enabled: false, mcpServer: null }, jira: { enabled: false, mcpServer: null }, azureDevOps: { enabled: false, mcpServer: null } },
  settingsSnapshot: { browserEngine: 'playwright', parallelAgents: 7, parallelTestAuthors: 7, settleMs: 4000, taskDepth: 'deep', maxTasksPerRoute: 5, authMode: 'per-role', defaultRole: 'titolare', note: 'analisi fatte con agenti generici + Playwright del progetto: gli agenti .claude/agents non erano caricabili nella sessione di init' },
  auth: { mode: 'per-role', defaultRole: 'titolare', credentialSource: 'QA-tests/.qa-catalog/auth.local.json', rolesUsed, rolesConfigured: status.rolesResolved || Object.keys(status.roles || {}) },
  routes: out }
fs.writeFileSync(path.join(Q, 'catalog.json'), JSON.stringify(catalog, null, 2))
fs.writeFileSync(path.join(Q, '.qa-catalog/fingerprints.json'), JSON.stringify(fp.files || fp, null, 2))
const md = ['# Catalogo QA — Groomly', '', `Generato: ${catalog.generatedAt} · ${out.length} rotte · ${tasks.length} task`, '', '| Path | Auth | Ruoli | Task |', '| --- | --- | --- | --- |', ...out.map((r) => `| \`${r.path}\` | ${r.requiresAuth ? 'sì' : 'no'} | ${(r.rolesAllowed || []).join(', ')} | ${r.tasks.join(', ') || '—'} |`)]
fs.writeFileSync(path.join(Q, 'catalog.md'), md.join('\n') + '\n')
console.log(JSON.stringify({ routes: out.length, tasks: tasks.length, senzaTask: out.filter((r) => !r.tasks.length).map((r) => r.path), fingerprints: Object.keys(fp.files || fp).length }))
