const { mk } = require('./runner.cjs')
const txt = async (page, n = 600) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, n)
;(async () => {
  for (const [email, tag] of [['salone2@test.groomly', 'P2'], ['salone17@test.groomly', 'P17'], ['socio17@test.groomly', 'PS17']]) {
    const c = mk(tag); await c.login(email); await c.waitData()
    await c.step('pro', async (p) => { await c.go('/impostazioni/pro'); await p.waitForTimeout(1500); return txt(p, 700) })
    if (tag === 'P2') await c.step('toggle', async (p) => { const t = p.getByLabel('Piano Pro'); if (!(await t.count())) return 'NESSUN interruttore'; await t.click(); await p.waitForTimeout(4000); return txt(p, 500) })
    if (tag === 'P17') await c.step('invito-popup', async (p) => { await p.getByText('Invita nuovo collaboratore').click(); await p.waitForTimeout(800); return (await p.locator('[role=dialog]:visible').innerText()).replace(/\n+/g,' | ') })
    await c.done()
  }
})()
