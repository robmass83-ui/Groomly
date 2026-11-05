// Flussi dell'app per le lingue: cambio in tempo reale, telefono in lingua non prevista, chi ha già l'app, accounts.lingua,
// e le pagine senza accesso nelle cinque lingue a 320, 360 e 390 px.
// Uso: node QA-tests/.qa-catalog/verify-lingue-app.cjs --frasi=<frasi.json> --out=<cartella>
const path = require('path'); const fs = require('fs')
const g = require('./verify-cinque-lingue.cjs')
const { MISURA, valuta, FRASI, aspettaStabile, chromium, db, APP, PASSWORD, creaUtente } = g
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d }
const OUT = path.resolve(arg('out', 'QA-tests/results/cinque-lingue/app')); fs.mkdirSync(OUT, { recursive: true })
const LINGUE = ['it', 'en', 'es', 'fr', 'de']
const NOMI = { it: 'Italiano', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' }
const righe = []
const esito = (nome, ok, nota = '') => { righe.push({ nome, ok, nota }); console.log(`${ok ? 'OK ' : 'NO '} ${nome}${nota ? ' — ' + nota : ''}`) }
const pulita = (t) => String(t).replace(/­/g, '')

async function contesto(b, locale, tz = 'Europe/Rome', w = 390) {
  const ctx = await b.newContext({ locale, timezoneId: tz, viewport: { width: w, height: 800 } })
  await ctx.route('**/*', (r) => { const h = new URL(r.request().url()).hostname; return h === '127.0.0.1' || /fonts\.g/.test(r.request().url()) ? r.continue() : r.abort() })
  return ctx
}
async function titolare(nome, extra = {}) {
  const p = await creaUtente(nome)
  await db.doc(`accounts/${p.uid}`).set({ uid: p.uid, email: p.email, salonId: p.uid, role: 'titolare', legacy: false, firstName: 'Tina', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z', ...extra })
  await db.doc(`salons/${p.uid}/settings/main`).set({ business: { salonName: 'Salone Prova', name: 'Salone Prova', phone: '+39 333 1112223' }, tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z' })
  await db.doc(`salons/${p.uid}/members/${p.uid}`).set({ uid: p.uid, email: p.email, role: 'titolare', firstName: 'Tina', lastName: 'QA', status: 'attivo' })
  return p
}
const campoEmail = (p) => p.locator('input[type=email], input[autocomplete=email], input[autocomplete=username]').first()
async function entra(page, u, lingua) {
  await campoEmail(page).waitFor({ timeout: 20000 })
  await campoEmail(page).fill(u.email)
  await page.locator('input[type=password]').first().fill(PASSWORD)
  await page.getByRole('button', { name: FRASI[lingua].authEntra, exact: true }).click()
  await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 30000 })
  await aspettaStabile(page, 8000)
}
const aspettaLingua = async (uid, lingua) => { for (let i = 0; i < 40; i++) { const d = (await db.doc(`accounts/${uid}`).get()).data(); if (d?.lingua === lingua) return true; await new Promise((r) => setTimeout(r, 250)) } return false }

async function main() {
  const b = await chromium.launch()

  // Telefono: scelta, telefono, inglese. Il fuso non conta.
  for (const [locale, tz, atteso] of [['pt-BR', 'America/Sao_Paulo', 'en'], ['pt-PT', 'Europe/Rome', 'en'], ['de-DE', 'Europe/Berlin', 'de'], ['fr-FR', 'Europe/Rome', 'fr'], ['es-ES', 'Europe/Rome', 'es'], ['it-IT', 'Europe/London', 'it'], ['ja-JP', 'Asia/Tokyo', 'en']]) {
    const c = await contesto(b, locale, tz); const p = await c.newPage()
    await p.goto(`${APP}/login`); await p.waitForFunction(() => document.getElementById('root')?.childElementCount > 0, null, { timeout: 30000 }); await p.waitForTimeout(800)
    const lang = await p.evaluate(() => document.documentElement.lang)
    esito(`Installazione nuova, telefono ${locale}, fuso ${tz} → ${atteso}`, lang === atteso && (await p.getByText(FRASI[atteso].authEntra).count()) > 0, `lang=${lang}`)
    await c.close()
  }

  // Chi ha già l'app e non ha mai scelto: resta nella lingua di prima.
  for (const [locale, tz, atteso, nota] of [['it-IT', 'Europe/Rome', 'it', ''], ['en-US', 'Europe/Rome', 'it', 'telefono inglese in Italia: vedeva italiano'], ['de-DE', 'Europe/Berlin', 'en', 'vedeva inglese, il tedesco non esisteva'], ['fr-FR', 'Europe/Paris', 'en', 'vedeva inglese'], ['es-ES', 'Europe/Madrid', 'es', '']]) {
    const c = await contesto(b, locale, tz)
    await c.addInitScript(() => { try { if (localStorage.getItem('groomly.linguaPassaggio') === null) localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'u1', email: 'prova@example.test' })) } catch { /* niente */ } })
    const p = await c.newPage()
    await p.goto(`${APP}/login`); await p.waitForFunction(() => document.getElementById('root')?.childElementCount > 0, null, { timeout: 30000 }); await p.waitForTimeout(800)
    const stato = await p.evaluate(() => ({ lang: document.documentElement.lang, salvata: localStorage.getItem('groomly.lingua'), segno: localStorage.getItem('groomly.linguaPassaggio') }))
    await p.reload(); await p.waitForFunction(() => document.getElementById('root')?.childElementCount > 0, null, { timeout: 30000 }); await p.waitForTimeout(800)
    const dopo = await p.evaluate(() => document.documentElement.lang)
    esito(`Chi ha già l'app, ${locale} a ${tz} → ${atteso}${nota ? ` (${nota})` : ''}`, stato.lang === atteso && stato.salvata === atteso && stato.segno !== null && dopo === atteso, JSON.stringify(stato))
    await c.close()
  }

  // Il telefono decide e il server lo sa.
  {
    const u = await titolare('tel')
    const c = await contesto(b, 'de-DE', 'Europe/Berlin'); const p = await c.newPage()
    await p.goto(`${APP}/login`)
    await entra(p, u, 'de')
    esito('Telefono tedesco, nessuna scelta: accounts.lingua diventa de', await aspettaLingua(u.uid, 'de'))
    await c.close()
  }

  // Cambio in tempo reale, senza ricaricare.
  {
    const u = await titolare('live', { lingua: 'it' })
    const c = await contesto(b, 'it-IT'); const p = await c.newPage()
    await p.goto(`${APP}/login`)
    await entra(p, u, 'it')
    await p.evaluate(() => { window.__stessaPagina = true; window.history.pushState({}, '', '/impostazioni'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await aspettaStabile(p)
    let prec = 'it'
    for (const l of ['de', 'fr', 'es', 'en', 'it']) {
      await p.getByText(NOMI[prec], { exact: true }).first().click({ timeout: 5000 })
      await p.waitForTimeout(400)
      await p.getByRole('dialog').getByText(NOMI[l], { exact: true }).first().click({ timeout: 5000 })
      await p.waitForTimeout(500)
      await p.keyboard.press('Escape').catch(() => {})
      await p.waitForTimeout(300)
      const r = await p.evaluate(() => ({ lang: document.documentElement.lang, stessa: window.__stessaPagina === true, testo: document.body.textContent.replace(/­/g, '') }))
      const voce = pulita(FRASI[l].navImpostazioni)
      esito(`Cambio in tempo reale ${prec} → ${l}`, r.lang === l && r.stessa && r.testo.includes(voce) && await aspettaLingua(u.uid, l), `titolo ${voce}`)
      prec = l
    }
    await c.close()
  }

  const misure = []
  // Giro di benvenuto: ogni schermata, finché si può andare avanti.
  for (const w of [320, 390]) for (const l of LINGUE) {
    const t = await titolare(`tour${l}${w}`)
    await db.doc(`salons/${t.uid}/settings/main`).set({ tourBenvenuto: { stato: 'in-corso', saltati: [] }, listinoConfermato: false }, { merge: true })
    const c = await contesto(b, 'it-IT', 'Europe/Rome', w)
    await c.addInitScript((x) => { try { localStorage.setItem('groomly.lingua', x) } catch { /* niente */ } }, l)
    const p = await c.newPage()
    await p.goto(`${APP}/login`)
    await entra(p, t, l)
    await p.evaluate(() => { window.history.pushState({}, '', '/benvenuto'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await aspettaStabile(p)
    const viste = new Set()
    for (let i = 0; i < 16; i++) {
      const m = await p.evaluate(MISURA).catch(() => null)
      if (!m) { await p.waitForTimeout(800); continue }
      const firma = m.testi.slice(0, 6).join('|')
      if (viste.has(firma) || !m.url.startsWith('/benvenuto')) break
      viste.add(firma)
      misure.push({ ruolo: 'nuovo', larghezza: w, lingua: l, rotta: `/benvenuto passo ${i}`, url: m.url, lang: m.lang, hscroll: m.hscroll, estranee: valuta(m, l), tagli: m.tagli, fuori: m.fuori, spezzate: m.spezzate, frasi: m.testi.length })
      if (w === 320) await p.screenshot({ path: path.join(OUT, `${l}-tour-${i}.png`), fullPage: true }).catch(() => {})
      const avanti = p.locator('button:not([disabled])').filter({ hasText: new RegExp(`${FRASI[l].tourIniziamo}|${FRASI[l].tourAvanti ?? '^$'}|${FRASI[l].tourDopo}`) }).first()
      if (!(await avanti.count())) { await p.locator('main button:not([disabled]), button:not([disabled])').last().click({ timeout: 1500 }).catch(() => {}) } else await avanti.click({ timeout: 1500 }).catch(() => {})
      await p.waitForTimeout(500)
    }
    esito(`Giro di benvenuto in ${l} a ${w} px`, viste.size >= 2, `${viste.size} schermate`)
    await c.close()
  }

  // Pagine senza accesso, stati ed errori, nelle cinque lingue e tre larghezze.
  const u = await titolare('errori')
  for (const w of [320, 360, 390]) for (const l of LINGUE) {
    const c = await contesto(b, 'it-IT', 'Europe/Rome', w)
    await c.addInitScript((x) => { try { localStorage.setItem('groomly.lingua', x) } catch { /* niente */ } }, l)
    const p = await c.newPage()
    const fotografa = async (nome) => {
      const m = await p.evaluate(MISURA)
      misure.push({ ruolo: 'anonimo', larghezza: w, lingua: l, rotta: nome, url: m.url, lang: m.lang, hscroll: m.hscroll, estranee: valuta(m, l), tagli: m.tagli, fuori: m.fuori, spezzate: m.spezzate, frasi: m.testi.length })
      if (w === 320) await p.screenshot({ path: path.join(OUT, `${l}-${nome.replace(/\W+/g, '_')}.png`), fullPage: true }).catch(() => {})
      return m
    }
    await p.goto(`${APP}/login`); await p.waitForTimeout(1200); await fotografa('/login')
    await p.getByRole('button', { name: FRASI[l].authEntra, exact: true }).click(); await p.waitForTimeout(400); await fotografa('/login vuoto')
    await campoEmail(p).fill(u.email)
    await p.locator('input[type=password]').first().fill('sbagliata123')
    await p.getByRole('button', { name: FRASI[l].authEntra, exact: true }).click(); await p.waitForTimeout(1500)
    const m = await fotografa('/login password errata')
    if (w === 320) esito(`Errore di accesso in ${l}`, !m.testi.some((t) => /auth\/|Firebase/i.test(t)), m.testi.filter((t) => t.length > 18).slice(-2).join(' | ').slice(0, 130))
    await p.getByText(FRASI[l].authDimenticata).first().click(); await p.waitForTimeout(1200); await fotografa('/login password dimenticata')
    await p.goto(`${APP}/invito/token-che-non-esiste`); await p.waitForTimeout(2500); await fotografa('/invito/:token')
    await p.goto(`${APP}/login`); await p.waitForTimeout(800)
    await p.getByRole('button', { name: new RegExp(FRASI[l].authCrea, 'i') }).first().click({ timeout: 3000 }).catch(() => {})
    await p.waitForTimeout(400); await fotografa('/login crea account')
    await c.close()
  }
  fs.writeFileSync(path.join(OUT, 'anonimo.json'), JSON.stringify(misure))
  fs.writeFileSync(path.join(OUT, 'flussi-app.json'), JSON.stringify(righe, null, 1))
  const male = misure.filter((r) => r.estranee.length || r.hscroll || r.fuori.length || r.tagli.length || r.spezzate.length)
  for (const r of male) console.log(r.larghezza, r.lingua, r.rotta, JSON.stringify({ e: r.estranee.map((x) => x.testo.slice(0, 50)), f: r.fuori, t: r.tagli, s: r.spezzate, h: r.hscroll }).slice(0, 300))
  console.log(`FATTO ${righe.filter((r) => r.ok).length}/${righe.length}, ${misure.length} pagine, ${male.length} con segnalazioni`)
  await b.close(); process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
