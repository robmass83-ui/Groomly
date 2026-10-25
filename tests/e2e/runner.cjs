const { open, shot } = require('./lib.cjs')
function mk(tag) {
  const steps = []
  const ctx = { page: null, steps }
  ctx.step = async (name, fn) => {
    const page = ctx.page
    try { page.setDefaultTimeout(8000); const r = await fn(page); await page.waitForTimeout(700); await shot(page, `${tag}-${String(steps.length).padStart(2,'0')}-${name}`); steps.push({ name, ok: true, r, text: (await page.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 260) }) }
    catch (e) { await shot(page, `${tag}-${String(steps.length).padStart(2,'0')}-${name}-ERR`).catch(()=>{}); steps.push({ name, ok: false, err: String(e).split('\n')[0].slice(0, 220), text: (await page.locator('body').innerText().catch(()=>'')).replace(/\n+/g, ' | ').slice(0, 260) }) }
  }
  ctx.login = async (email, opts) => { const o = await open(email, opts); ctx.page = o.page; ctx.o = o; return o }
  ctx.waitData = async () => { await ctx.page.waitForFunction(() => /\d{2}:\d{2}|Nessun appuntamento|Controlla|email/.test(document.body.innerText), null, { timeout: 60000 }).catch(()=>{}); await ctx.page.waitForTimeout(6000) }
  ctx.go = async (r) => { await ctx.page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, r); await ctx.page.waitForTimeout(1500) }
  ctx.done = async () => { await ctx.o.browser.close(); console.log(JSON.stringify({ tag, steps, log: [...new Set(ctx.o.log.filter(l => !l.includes('Future Flag')))] }, null, 1)) }
  return ctx
}
module.exports = { mk }
