const { open } = require('./lib.cjs')
;(async () => {
  for (const email of ['salone18@test.groomly', 'salone1@test.groomly', 'salone20@test.groomly']) {
    const { browser, page, t0 } = await open(email)
    const has = () => page.waitForFunction(() => /DA CHIUDERE|Aggiungi il primo|0 · 0m/.test(document.body.innerText) && !document.body.innerText.includes('Caricamento'), null, { timeout: 90000 })
    await page.waitForFunction(() => document.body.innerText.includes('Calendario'), null, { timeout: 90000 })
    const tShell = Date.now() - t0
    await page.waitForFunction(() => /DA CHIUDERE|€ [1-9]/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {})
    const tData = Date.now() - t0
    const t1 = Date.now(); await page.reload()
    await page.waitForFunction(() => /DA CHIUDERE|€ [1-9]/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {})
    const tReload = Date.now() - t1
    console.log(email, { tShell, tData, tReload })
    await browser.close()
  }
})()
