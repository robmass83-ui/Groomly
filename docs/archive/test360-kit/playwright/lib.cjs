const { chromium } = require('playwright')
const SHOTS = 'test-results/test360/shots'
async function open(email, opts = {}) {
  const browser = opts.browser || await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, timezoneId: 'Europe/Rome', locale: 'it-IT', colorScheme: opts.dark ? 'dark' : 'light' })
  await ctx.route(/github\.com|githubusercontent|groomly-3128b\.web\.app/, (r) => r.abort())
  const page = await ctx.newPage()
  const log = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[${m.type()}] ${m.text().slice(0, 300)}`) })
  page.on('pageerror', (e) => log.push(`[pageerror] ${String(e).slice(0, 300)}`))
  const t0 = Date.now()
  await page.goto('http://127.0.0.1:5173/login')
  if (email) {
    await page.getByLabel('Email').first().fill(email)
    const pw = page.getByLabel('Password', { exact: true })
    if (!(await pw.isVisible().catch(() => false))) {
      const enter = page.getByRole('button', { name: /^Entra$/ }).first()
      if (await enter.isVisible().catch(() => false)) await enter.click()
    }
    await page.getByLabel('Password', { exact: true }).fill('Test1234!')
    await page.getByRole('button', { name: /^Entra$/ }).last().click()
  }
  return { browser, ctx, page, log, t0 }
}
async function shot(page, name) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); return `${SHOTS}/${name}.png` }
module.exports = { open, shot, SHOTS }
