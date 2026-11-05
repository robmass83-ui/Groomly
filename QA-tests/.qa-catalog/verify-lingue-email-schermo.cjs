// Apre le email generate da verify-lingue-documenti.mjs a 320 e 390 px: niente sbordi, e i caratteri si vedono.
// Uso: node QA-tests/.qa-catalog/verify-lingue-email-schermo.cjs <cartella>
const path = require('path'); const fs = require('fs')
const { chromium } = require(path.resolve('node_modules/playwright'))
const dir = path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch()
  const file = fs.readdirSync(dir).filter((f) => f.endsWith('.html'))
  const male = []; let viste = 0
  for (const w of [320, 390]) {
    const c = await b.newContext({ viewport: { width: w, height: 800 } })
    await c.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()))
    const p = await c.newPage()
    for (const f of file) {
      await p.goto('file:///' + path.join(dir, f).replace(/\\/g, '/'))
      const m = await p.evaluate(() => ({ larga: document.documentElement.scrollWidth, testo: document.body.innerText, strani: (document.body.innerText.match(/�|Ã.|â€/g) || []).length }))
      viste++
      if (m.larga > w + 1 || m.strani) male.push(`${w} ${f} larga=${m.larga} strani=${m.strani}`)
      if (w === 320 && /^(de|fr)-(ricevuta|proposta|annuncio|beta-invito)\.html$/.test(f)) await p.screenshot({ path: path.join(dir, f.replace('.html', '.png')), fullPage: true })
    }
    await c.close()
  }
  console.log(`aperte ${viste}, problemi ${male.length}`); for (const x of male) console.log(x)
  await b.close()
})()
