// Genera PDF ed Excel in cinque lingue e li rilegge: il testo deve tenere ß, é, œ. Serve pdftotext.
// Uso: node QA-tests/.qa-catalog/verify-lingue-file.mjs <cartella>
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const out = path.resolve(process.argv[2] ?? 'QA-tests/results/cinque-lingue/file')
fs.mkdirSync(out, { recursive: true })
const memoria = new Map()
globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k), key: () => null, length: 0 }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-'))
const file = path.join(dir, 'file.mjs')
await build({ entryPoints: ['QA-tests/.qa-catalog/lingue-file-entry.ts'], bundle: true, format: 'esm', platform: 'node', outfile: file, logLevel: 'error', nodePaths: [path.resolve('node_modules')], loader: { '.svg': 'text', '.png': 'dataurl', '.webp': 'dataurl', '.ttf': 'dataurl' }, banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }, external: ['canvg', 'html2canvas', 'dompurify'] })
const { tutto, LINGUE } = await import(pathToFileURL(file).href)
const ExcelJS = createRequire(path.resolve('package.json'))('exceljs')
const leggiXlsx = async (byte) => {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(byte))
  const righe = []
  wb.eachSheet((s) => { righe.push(`## ${s.name}`); s.eachRow((r) => righe.push(r.values.filter((v) => v !== undefined && v !== null).map((v) => (typeof v === 'object' ? v.text ?? v.result ?? JSON.stringify(v) : v)).join(' | '))) })
  return righe.join('\n')
}
for (const lingua of LINGUE) {
  memoria.set('groomly.lingua', lingua)
  const f = await tutto(lingua)
  const pdf = path.join(out, `incassi-${lingua}.pdf`)
  fs.writeFileSync(pdf, f.pdf); fs.writeFileSync(path.join(out, `incassi-${lingua}.xlsx`), f.xlsx)
  const testoPdf = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', pdf, '-']).toString('utf8')
  const testoXlsx = await leggiXlsx(f.xlsx)
  fs.writeFileSync(path.join(out, `incassi-${lingua}.pdf.txt`), testoPdf); fs.writeFileSync(path.join(out, `incassi-${lingua}.xlsx.txt`), testoXlsx)
  let testoReg = ''
  if (f.registro) { fs.writeFileSync(path.join(out, `registro-${lingua}.xlsx`), f.registro); testoReg = await leggiXlsx(f.registro); fs.writeFileSync(path.join(out, `registro-${lingua}.txt`), testoReg) }
  const prova = (t) => ['Größe', 'Cœur', 'Maß', 'Été'].map((p) => `${p}:${t.includes(p) ? 'sì' : 'NO'}`).join(' ')
  console.log(lingua, 'PDF', prova(testoPdf), '| XLSX', prova(testoXlsx), '| Registro', f.registro ? prova(testoReg) : `errore ${f.errore.slice(0, 120)}`)
}
