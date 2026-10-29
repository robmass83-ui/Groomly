const { open, shot } = require('./lib.cjs')
const ROUTES = ['/', '/animali', '/calendario', '/mensili', '/listino', '/impostazioni', '/incassi', '/incassi/report', '/impostazioni/servizi', '/impostazioni/archivio', '/impostazioni/notifiche', '/impostazioni/pro', '/impostazioni/utenti', '/impostazioni/aggiornamenti', '/listino/gestione', '/listino/prezzi', '/listino/stampa']
;(async () => {
  const email = process.argv[2], tag = process.argv[3], dark = process.argv[4] === 'dark'
  const { browser, page, log, t0 } = await open(email, { dark })
  // tempo fino al primo dato vero in Home
  const ok = await page.waitForFunction(() => /Completato|Nessun appuntamento|Controlla|Conferma|Riprova/.test(document.body.innerText), null, { timeout: 60000 }).then(() => true).catch(() => false)
  const tFirst = Date.now() - t0
  const tData = await page.waitForFunction(() => !document.body.innerText.includes('Nessun appuntamento') && /\d{2}:\d{2}/.test(document.body.innerText), null, { timeout: 45000 }).then(() => Date.now() - t0).catch(() => -1)
  console.log(JSON.stringify({ tag, tFirstPaintMs: tFirst, tDataMs: tData, ok }))
  for (const r of ROUTES) {
    const t = Date.now()
    await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, r)
    await page.waitForTimeout(1800)
    const url = new URL(page.url()).pathname
    const name = `${tag}${r.replace(/\//g, '_') || '_home'}`
    await shot(page, name)
    const text = (await page.locator('body').innerText()).replace(/\n+/g, ' | ')
    console.log(JSON.stringify({ route: r, finale: url, ms: Date.now() - t, testo: text.slice(0, 260) }))
  }
  await browser.close()
  console.log('LOG', JSON.stringify([...new Set(log.filter(l => !l.includes('Future Flag')))]))
})()
