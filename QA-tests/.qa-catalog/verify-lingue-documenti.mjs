// Genera email, pagine di esito e push in cinque lingue, senza spedire niente, e controlla il testo.
// Uso: node QA-tests/.qa-catalog/verify-lingue-documenti.mjs <cartella>
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const out = path.resolve(process.argv[2] ?? 'QA-tests/results/cinque-lingue/documenti')
fs.mkdirSync(out, { recursive: true })
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-'))
const file = path.join(dir, 'doc.mjs')
await build({ entryPoints: ['QA-tests/.qa-catalog/lingue-documenti-entry.ts'], bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error', loader: { '.svg': 'text', '.png': 'dataurl' }, external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*'], banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" } })
const { tutto } = await import(pathToFileURL(file).href)
const dati = tutto()
const testo = (h) => h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const righe = []
for (const e of dati.email) {
  fs.writeFileSync(path.join(out, `${e.lingua}-${e.tipo}.html`), e.html)
  righe.push(`[${e.lingua}] ${e.tipo}\n  OGGETTO: ${e.oggetto}\n  ${testo(e.html)}`)
}
for (const a of dati.altri) righe.push(`[${a.lingua}] ${a.tipo}\n  ${testo(a.testo)}`)
for (const p of dati.push) righe.push(`[${p.lingua}] push ${p.tipo}\n  ${p.title} — ${p.body}`)
fs.writeFileSync(path.join(out, 'tutto.txt'), righe.join('\n\n'))
console.log(`email ${dati.email.length}, altri ${dati.altri.length}, push ${dati.push.length}`)
