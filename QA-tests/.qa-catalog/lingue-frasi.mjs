// Scrive i cinque cataloghi in un JSON per il giro delle lingue (verify-cinque-lingue.cjs).
// Uso: node QA-tests/.qa-catalog/lingue-frasi.mjs <file.json>
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const uscita = process.argv[2]
const lingue = ['it', 'en', 'es', 'fr', 'de']
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingue-'))
const file = path.join(dir, 'frasi.mjs')
await build({
  stdin: { contents: lingue.map((l) => `export { ${l} } from './src/i18n/${l}'`).join('\n'), resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error',
})
const tutti = await import(pathToFileURL(file).href)
fs.writeFileSync(uscita, JSON.stringify(Object.fromEntries(lingue.map((l) => [l, tutti[l]]))))
console.log(lingue.map((l) => `${l}=${Object.keys(tutti[l]).length}`).join(' '))
