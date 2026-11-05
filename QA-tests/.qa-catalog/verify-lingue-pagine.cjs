// Pagine pubbliche di hosting nelle cinque lingue e tre larghezze: lingua, riga «fa fede l'italiano», sbordi.
// Uso: node QA-tests/.qa-catalog/verify-lingue-pagine.cjs <out.json>
const path = require('path'); const fs = require('fs')
const { chromium } = require(path.resolve('node_modules/playwright'))
const HOST = 'http://127.0.0.1:5195'
const PAGINE = ['/', '/c/', '/privacy/', '/privacy.html', '/termini/', '/dpa/', '/elimina-account/', '/azione/', '/salone/', '/salone/servizio.html', '/salone/quando.html', '/salone/dati.html', '/salone/inviata.html', '/salone/stato.html', '/s/pagina-che-non-esiste']
const LEGALI = /privacy|termini|dpa|elimina/
const FEDE = { en: 'If in doubt, the Italian text prevails.', es: 'En caso de duda, prevalece el texto italiano.', fr: 'En cas de doute, le texte italien fait foi.', de: 'Im Zweifel gilt der italienische Text.' };
(async () => {
  const b = await chromium.launch(); const righe = []
  for (const w of [320, 360, 390]) for (const l of ['it', 'en', 'es', 'fr', 'de']) {
    const c = await b.newContext({ viewport: { width: w, height: 800 }, locale: 'it-IT' })
    await c.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()))
    const p = await c.newPage()
    for (const pagina of PAGINE) {
      await p.goto(`${HOST}${pagina}?lang=${l}`, { waitUntil: 'load' }).catch(() => {})
      await p.waitForTimeout(250)
      const m = await p.evaluate(() => ({ lang: document.documentElement.lang, larga: document.documentElement.scrollWidth, testo: document.body.innerText }))
      const note = []
      if (m.lang !== l) note.push(`lang ${m.lang}`)
      if (m.larga > w + 1) note.push(`sborda ${m.larga}`)
      if (LEGALI.test(pagina) && l !== 'it' && !m.testo.includes(FEDE[l])) note.push('manca fa fede')
      righe.push({ pagina, lingua: l, larghezza: w, note })
      if (note.length) console.log(w, l, pagina, note.join('; '))
    }
    await c.close()
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(righe))
  console.log(`FATTO ${righe.length} aperture, ${righe.filter((r) => r.note.length).length} con note`)
  await b.close()
})()
