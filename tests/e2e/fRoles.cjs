const { mk } = require('./runner.cjs')
const txt = async (page, n = 700) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, n)
;(async () => {
  const which = process.argv[2]
  if (which === 'undo') {
    const c = mk('UN'); await c.login('salone8@test.groomly'); await c.waitData()
    await c.step('disdetto', async (p) => { await p.locator('#da-chiudere').getByRole('button', { name: /^Disdetto/ }).first().click(); await p.locator('[role=dialog]:visible').getByRole('button', { name: /Cliente/ }).first().click() })
    await c.step('annulla', async (p) => { await p.getByRole('button', { name: 'Annulla' }).first().click(); await p.waitForTimeout(3500); return await txt(p, 400) })
    await c.done()
  }
  if (which === 'collab') {
    const c = mk('CO'); await c.login('collab15@test.groomly'); await c.waitData()
    await c.step('home', async (p) => txt(p, 300))
    await c.step('impostazioni', async (p) => { await c.go('/impostazioni'); return txt(p) })
    await c.step('incassi', async (p) => { await c.go('/incassi/report'); return txt(p, 500) })
    await c.step('servizi-vietato', async (p) => { await c.go('/impostazioni/servizi'); return new URL(p.url()).pathname })
    await c.step('pro-vietato', async (p) => { await c.go('/impostazioni/pro'); return new URL(p.url()).pathname })
    await c.step('scheda-cane', async (p) => { await c.go('/animali'); await p.waitForTimeout(800); await p.getByRole('button', { name: /^Apri / }).first().click(); await p.waitForTimeout(1500); return txt(p, 900) })
    await c.step('altre-azioni-cane', async (p) => { const b = p.getByRole('button', { name: /Altre azioni|Menu|Altro/ }).first(); if (await b.count()) await b.click(); await p.waitForTimeout(600); return txt(p, 900) })
    await c.step('nuovo-appuntamento-chi-lo-fa', async (p) => { await c.go('/'); await p.locator('.bottom-nav__fab').click(); await p.getByRole('button', { name: /Fissa un appuntamento/ }).click(); await p.waitForTimeout(800); return (await p.getByLabel('Chi lo fa').count()) ? (await p.getByLabel('Chi lo fa').innerText()) : 'NESSUN Chi lo fa' })
    await c.done()
  }
  if (which === 'collab-pro-off') {
    const c = mk('CX'); await c.login('collab14@test.groomly'); await c.page.waitForTimeout(12000)
    await c.step('dopo-login', async (p) => txt(p, 600))
    await c.done()
  }
  if (which === 'unverified') {
    const c = mk('UV'); await c.login('salone11@test.groomly'); await c.page.waitForTimeout(10000)
    await c.step('dopo-login', async (p) => txt(p, 600))
    await c.done()
  }
  if (which === 'empty') {
    const c = mk('EM'); await c.login('salone18@test.groomly'); await c.waitData()
    for (const r of ['/', '/animali', '/calendario', '/mensili', '/incassi', '/incassi/report', '/listino']) await c.step('r' + r.replace(/\//g, '_'), async (p) => { await c.go(r); return txt(p, 300) })
    await c.done()
  }
  if (which === 'weird') {
    const c = mk('WE'); await c.login('salone19@test.groomly'); await c.waitData()
    await c.step('home', async (p) => txt(p, 200))
    await c.step('animali', async (p) => { await c.go('/animali'); return txt(p, 200) })
    await c.step('scheda-lunga', async (p) => { const a = p.getByRole('button', { name: /Apri .*Terribile/ }).first(); await a.click(); await p.waitForTimeout(1500); return txt(p, 300) })
    await c.step('impostazioni', async (p) => { await c.go('/impostazioni'); return txt(p, 300) })
    await c.step('listino-stampa', async (p) => { await c.go('/listino/stampa'); await p.waitForTimeout(1500); return txt(p, 300) })
    await c.done()
  }
  if (which === 'big') {
    const t0 = Date.now(); const c = mk('BG'); await c.login('salone20@test.groomly'); await c.waitData()
    await c.step('home', async (p) => `${Date.now() - t0}ms`)
    await c.step('animali', async (p) => { const t = Date.now(); await c.go('/animali'); return `${Date.now() - t}ms ` + (await txt(p, 120)) })
    await c.step('scroll-animali', async (p) => { await p.mouse.wheel(0, 20000); await p.waitForTimeout(800) })
    await c.step('mese', async (p) => { await c.go('/calendario'); await p.getByRole('button', { name: 'Mese' }).click(); await p.waitForTimeout(1200) })
    await c.step('settimana', async (p) => { await p.getByRole('button', { name: 'Settimana' }).click(); await p.waitForTimeout(1200) })
    await c.done()
  }
  if (which === 'operator') {
    const c = mk('OP'); await c.login('masala.roberto@hotmail.it'); await c.waitData()
    await c.step('home', async (p) => txt(p, 300))
    await c.step('utenti', async (p) => { await c.go('/impostazioni/utenti'); await p.waitForTimeout(2500); return txt(p, 1500) })
    await c.step('accendi-pro-salone1', async (p) => { const sw = p.getByRole('switch').or(p.getByRole('checkbox')).filter({ has: p.locator('xpath=.') }); const t = p.getByLabel(/Servizio Pro per .*/); const n = await t.count(); const labels = []; for (let i = 0; i < n; i++) labels.push(await t.nth(i).getAttribute('aria-label')); return labels.join(' ; ') })
    await c.step('pro-page', async (p) => { await c.go('/impostazioni/pro'); await p.waitForTimeout(1500); return txt(p, 600) })
    await c.step('invita', async (p) => { const b = p.getByRole('button', { name: /Invita/ }).first(); await b.click(); await p.waitForTimeout(600); const e = p.getByLabel('Email').last(); await e.fill('nuovo.collab@test.groomly'); await p.getByRole('button', { name: /Collaboratore/ }).first().click().catch(()=>{}); await p.getByRole('button', { name: /^Invia/ }).first().click(); await p.waitForTimeout(5000); return txt(p, 700) })
    await c.done()
  }
  if (which === 'dark') {
    const c = mk('DK'); await c.login('salone13@test.groomly', { dark: true }); await c.waitData()
    for (const r of ['/', '/calendario', '/animali', '/impostazioni', '/incassi/report']) await c.step('r' + r.replace(/\//g, '_'), async (p) => { await c.go(r) })
    await c.done()
  }
})()
