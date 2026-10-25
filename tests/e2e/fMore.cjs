const { mk } = require('./runner.cjs')
const { chromium } = require('playwright')
const txt = async (page, n = 600) => (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, n)
;(async () => {
  const which = process.argv[2]
  if (which === 'invite') {
    const c = mk('IN'); await c.login('salone16@test.groomly'); await c.waitData()
    await c.step('pro', async (p) => { await c.go('/impostazioni/pro'); await p.waitForTimeout(1500); return txt(p, 500) })
    await c.step('invia', async (p) => { const f = p.locator('form[aria-label="Invita"]'); await f.getByLabel('Email').fill('nuovo.collab16@test.groomly'); await f.getByRole('button', { name: 'Collaboratore' }).click(); await f.getByRole('button', { name: 'Invia' }).click(); await p.waitForTimeout(6000); return txt(p, 700) })
    await c.step('invia-email-sbagliata', async (p) => { const f = p.locator('form[aria-label="Invita"]'); await f.getByLabel('Email').fill('non-una-email'); await f.getByRole('button', { name: 'Invia' }).click(); await p.waitForTimeout(3000); return txt(p, 700) })
    await c.step('invita-laura', async (p) => { const f = p.locator('form[aria-label="Invita"]'); await f.getByLabel('Email').fill('laura.masala@tiscali.it'); await f.getByRole('button', { name: 'Invia' }).click(); await p.waitForTimeout(4000); return txt(p, 700) })
    await c.done()
  }
  if (which === 'signup') {
    const c = mk('SU'); await c.login(null)
    await c.step('crea', async (p) => { await p.getByRole('button', { name: /Crea account/ }).click() })
    await c.step('compila', async (p) => { await p.getByLabel('Nome', { exact: true }).fill('Anna'); await p.getByLabel('Cognome').fill('Nuova'); await p.getByLabel('Email').fill('anna.nuova@test.groomly'); await p.getByLabel('Password', { exact: true }).fill('Test1234!'); await p.getByLabel('Nome della toelettatura').fill('Pelo Nuovo'); await p.getByLabel('Partita IVA').fill('12345678901'); await p.getByLabel('Indirizzo').fill('Via Test 1') })
    await c.step('invia', async (p) => { await p.getByRole('button', { name: /^Crea account$/ }).last().click(); await p.waitForTimeout(8000); return txt(p, 500) })
    await c.done()
  }
  if (which === 'realtime') {
    const a = mk('RT-A'); await a.login('salone17@test.groomly'); await a.waitData()
    const b = mk('RT-B'); await b.login('collab17@test.groomly'); await b.waitData()
    await b.step('collab-prima', async (p) => { await b.go('/calendario'); return txt(p, 200) })
    const t = Date.now()
    await a.step('titolare-crea', async (p) => { await p.locator('.bottom-nav__fab').click(); await p.getByRole('button', { name: /Fissa un appuntamento/ }).click(); await p.getByPlaceholder('Nome, razza, proprietario o telefono').fill('a'); await p.waitForTimeout(500); await p.locator('[role=dialog]:visible button, button').filter({ hasText: /·/ }).first().click(); await p.getByRole('button', { name: 'Oggi' }).click(); await p.getByRole('button', { name: '19:00' }).click(); await p.getByRole('button', { name: /^Salva$/ }).last().click(); await p.waitForTimeout(1000); const yes = p.getByRole('button', { name: /Salva comunque|Salva lo stesso|^No/ }).first(); if (await yes.count()) await yes.click(); return txt(p, 200) })
    await b.step('collab-dopo', async (p) => { const ok = await p.waitForFunction(() => document.body.innerText.includes('19:00'), null, { timeout: 15000 }).then(() => true).catch(() => false); return `visto=${ok} in ${Date.now() - t}ms` })
    await a.done(); await b.done()
  }
  if (which === 'offline') {
    const c = mk('OF'); const o = await c.login('salone9@test.groomly'); await c.waitData()
    await c.step('offline', async (p) => { await o.ctx.setOffline(true); await p.waitForTimeout(1000) })
    await c.step('crea-offline', async (p) => { await p.locator('.bottom-nav__fab').click(); await p.getByRole('button', { name: /Nuovo cane/ }).click(); await p.getByLabel('Nome', { exact: true }).first().fill('Offline Fufi3'); await p.getByLabel('Proprietario').fill('Off Line'); await p.getByLabel('Telefono').fill('333 0000000'); await p.getByRole('button', { name: /^Salva/ }).first().click(); await p.waitForTimeout(2000); return txt(p, 300) })
    await c.step('online', async (p) => { await o.ctx.setOffline(false); await p.waitForTimeout(20000); await p.reload(); await p.waitForTimeout(20000); return txt(p, 200) })
    await c.done()
  }
})()
