// Verifica nel browser del Magazzino da toelettatura, sui saloni di scripts/test360/magazzino.ts (emulatori demo-groomly).
// Uso: node QA-tests/.qa-catalog/verify-magazzino.cjs <cartella dei risultati>, con Vite in modo emu su localhost:5181.
// G: Go, filtri, chip, nessuna stima. P: Plus, stime, Da ordinare, riepilogo. W: il – salva nel formato nuovo solo quel prodotto.
// O: ordine e Arrivato come prima. K: kit base da 14 voci sul salone vuoto. Ogni pagina a 360 px, chiaro e scuro, senza sbordi.
const path = require('path'); const fs = require('fs')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const admin = req('firebase-admin/app')
if (!admin.getApps().length) admin.initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore')
const db = getFirestore()

const CARTELLA = process.argv[2]
const { saloni } = JSON.parse(fs.readFileSync(path.join(CARTELLA, 'atteso.json'), 'utf8'))
const APP = 'http://localhost:5181'
const PASSWORD = 'Test1234!'
const SHOTS = path.join(CARTELLA, 'schermate')
fs.mkdirSync(SHOTS, { recursive: true })

const esiti = []
const erroriPagina = []
function atteso(cond, cosa, dati) { if (!cond) throw new Error(`${cosa}: ${JSON.stringify(dati ?? null)}`) }

async function apri(browser, salone, schema) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: schema, permissions: ['clipboard-read', 'clipboard-write'] })
  await ctx.addInitScript(() => { try { localStorage.setItem('groomly.lingua', 'it') } catch { /* niente */ } })
  await ctx.route('http://127.0.0.1:5001/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => erroriPagina.push(`${salone.indice}: ${e.message}`))
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').fill(salone.email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entra', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

async function vai(page, percorso) {
  await page.goto(`${APP}${percorso}`)
  await page.waitForTimeout(1800)
}

async function senzaSbordi(page, nome) {
  const misure = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, finestra: window.innerWidth }))
  atteso(misure.pagina <= misure.finestra, `${nome}: la pagina sborda`, misure)
}

async function caso(nome, fn) {
  try {
    esiti.push({ nome, esito: 'PASS', note: await fn() })
  } catch (e) {
    esiti.push({ nome, esito: 'FAIL', note: String(e.message).slice(0, 800) })
  }
}

async function main() {
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  const go = saloni.find((item) => item.livello === 'go' && item.prodotti > 0)
  const plus = saloni.find((item) => item.indice === 20) ?? saloni.find((item) => item.livello === 'plus')
  const vuoto = saloni.find((item) => item.prodotti === 0)
  const chip = (page, name) => page.getByRole('button', { name, exact: true })
  const prodotto = (page, nome) => page.getByRole('link', { name: new RegExp(nome) })

  await caso('G1 Go: chip in ordine, Vendita e Altro filtrano, nessuna stima', async () => {
    const { ctx, page } = await apri(browser, go, 'light')
    await vai(page, '/altro/magazzino')
    for (const nome of ['Tutti', 'Da ordinare', 'Lavaggio', 'Finitura', 'Cura', 'Macchinette', 'Pulizia salone', 'Tocchi finali', 'Vendita', 'Altro']) atteso(await chip(page, nome).count() === 1, `chip ${nome}`)
    atteso(await page.getByRole('link').filter({ hasText: /./ }).count() >= 13, 'tutti i prodotti in elenco')
    atteso(await page.getByText(/Ti dura circa/).count() === 0, 'in Go niente durata')
    await page.screenshot({ path: path.join(SHOTS, 'go-elenco-chiaro.png'), fullPage: true })
    await senzaSbordi(page, 'elenco')
    await chip(page, 'Vendita').click()
    atteso(await prodotto(page, 'Crema zampe').count() === 1 && await prodotto(page, 'Shampoo concentrato').count() === 0, 'Vendita')
    await chip(page, 'Cura').click()
    atteso(await prodotto(page, 'Crema zampe').count() === 0, 'Cura senza il venduto')
    await chip(page, 'Altro').click()
    atteso(await prodotto(page, 'Cosa ignota').count() === 1, 'Altro')
    await chip(page, 'Macchinette').click()
    atteso(await prodotto(page, 'Lame per tosatrice').count() === 1, 'lama convertita')
    await chip(page, 'Tutti').click()
    await page.getByRole('button', { name: /1 prodotto da buttare/ }).click()
    atteso(await prodotto(page, 'Balsamo aperto da tanto').count() === 1 && await prodotto(page, 'Balsamo aperto da poco').count() === 0, 'striscia da buttare')
    await vai(page, '/altro/magazzino/tanica')
    await page.getByRole('button', { name: /Quanto mi dura\?/ }).waitFor()
    atteso(await page.getByText('Diluizione 1:10', { exact: false }).count() === 1, 'diluizione sulla scheda')
    await page.screenshot({ path: path.join(SHOTS, 'go-scheda-chiaro.png'), fullPage: true })
    await senzaSbordi(page, 'scheda')
    await ctx.close()
  })

  await caso('P1 Plus: durata, consumo, costo a cane e riepilogo', async () => {
    const { ctx, page } = await apri(browser, plus, 'dark')
    await vai(page, '/altro/magazzino')
    atteso(await page.getByText(/Ti dura circa/).count() >= 2, 'durata in elenco')
    await page.getByLabel('Riepilogo del magazzino').waitFor()
    await page.screenshot({ path: path.join(SHOTS, 'plus-elenco-scuro.png'), fullPage: true })
    await senzaSbordi(page, 'elenco')
    await vai(page, '/altro/magazzino/tanica')
    const card = page.getByLabel('Quanto mi dura?')
    await card.waitFor()
    const testo = await card.innerText()
    atteso(/Ti dura circa/.test(testo) && /al mese/.test(testo) && /a cane/.test(testo) && /stima/.test(testo), 'card completa', testo)
    await page.screenshot({ path: path.join(SHOTS, 'plus-scheda-scuro.png'), fullPage: true })
    await senzaSbordi(page, 'scheda')
    await ctx.close()
    return testo.replace(/\n/g, ' · ')
  })

  await caso('P2 Plus: la stima porta in Da ordinare, Go no', async () => {
    const { ctx, page } = await apri(browser, plus, 'light')
    await vai(page, '/altro/magazzino/ordini')
    const stimati = await page.getByText(/Sta per finire \(stima\)/).count()
    atteso(stimati >= 1, 'almeno un prodotto stimato nel salone con 200 lavaggi', stimati)
    await page.screenshot({ path: path.join(SHOTS, 'plus-ordini-chiaro.png'), fullPage: true })
    await senzaSbordi(page, 'ordini')
    await ctx.close()
    const altro = await apri(browser, go, 'light')
    await vai(altro.page, '/altro/magazzino/ordini')
    atteso(await altro.page.getByText(/Sta per finire/).count() === 0, 'Go senza stima')
    await altro.ctx.close()
    return `${stimati} prodotti stimati`
  })

  await caso('W1 Il – converte solo il prodotto toccato', async () => {
    const { ctx, page } = await apri(browser, go, 'light')
    await vai(page, '/altro/magazzino')
    await page.getByRole('button', { name: 'Togli un pezzo di Shampoo neutro' }).click()
    await page.waitForTimeout(1500)
    const [toccato, altro] = await Promise.all([db.doc(`salons/${go.uid}/prodotti/vecchioShampoo`).get(), db.doc(`salons/${go.uid}/prodotti/vecchioProfumo`).get()])
    atteso(toccato.data().categoria === 'lavaggio' && toccato.data().uso === 'salone' && toccato.data().pezzi === 3, 'toccato nel formato nuovo', toccato.data())
    atteso(altro.data().categoria === 'profumi' && !('uso' in altro.data()), 'altro non toccato', altro.data())
    await ctx.close()
  })

  await caso('O1 Ordine, In arrivo e Arrivato come prima', async () => {
    const { ctx, page } = await apri(browser, go, 'light')
    await vai(page, '/altro/magazzino/ordini')
    await page.getByRole('button', { name: /Prepara/ }).click()
    await page.getByRole('dialog').waitFor()
    const testo = await page.getByRole('dialog').locator('textarea').inputValue()
    atteso(/Lame per tosatrice/.test(testo) && /Profumo talco/.test(testo), 'testo ordine', testo)
    await page.getByRole('button', { name: 'Copia', exact: false }).click()
    await page.waitForTimeout(1500)
    const lama = (await db.doc(`salons/${go.uid}/prodotti/vecchiaLama`).get()).data()
    atteso(lama.inArrivo > 0 && lama.categoria === 'macchinette', 'ordinato', lama)
    await page.getByRole('button', { name: /^Arrivato/ }).first().click()
    await page.waitForTimeout(1500)
    const docs = await db.collection(`salons/${go.uid}/prodotti`).get()
    atteso(docs.docs.some((item) => item.id !== 'inArrivo' && item.data().pezzi > 0 && item.data().ordinatoIl === null && (item.data().movimenti ?? []).length > 0), 'arrivato')
    await ctx.close()
  })

  await caso('K1 Kit base da 14 voci nel salone vuoto', async () => {
    const { ctx, page } = await apri(browser, vuoto, 'dark')
    await vai(page, '/altro/magazzino')
    atteso(await page.getByRole('checkbox').count() === 14, 'voci del kit')
    await page.screenshot({ path: path.join(SHOTS, 'kit-scuro.png'), fullPage: true })
    await senzaSbordi(page, 'kit')
    await page.getByRole('button', { name: 'Continua con 14' }).click()
    await page.getByRole('button', { name: 'Aggiungi al magazzino' }).click()
    await page.waitForTimeout(2000)
    const docs = await db.collection(`salons/${vuoto.uid}/prodotti`).get()
    atteso(docs.size === 14 && docs.docs.every((item) => item.data().uso === 'salone'), 'kit salvato', docs.size)
    const neutro = docs.docs.find((item) => item.data().nome.startsWith('Shampoo neutro')).data()
    atteso(neutro.diluizione === 10 && neutro.mlPerCane.media === 30, 'valori dal catalogo', neutro)
    await ctx.close()
  })

  await caso('S1 Scheda di modifica: altri dettagli a 360 px', async () => {
    const { ctx, page } = await apri(browser, plus, 'dark')
    await vai(page, '/altro/magazzino')
    await vai(page, '/altro/magazzino/tanica')
    await page.getByRole('button', { name: 'Modifica prodotto' }).click()
    await page.getByRole('button', { name: 'Altri dettagli' }).click()
    await page.getByLabel('Costo a pezzo (€)').waitFor()
    atteso(await page.getByText('Consumo a cane (ml di concentrato)').count() === 1, 'consumo con il piano')
    await page.screenshot({ path: path.join(SHOTS, 'plus-modifica-scuro.png') })
    await senzaSbordi(page, 'modifica')
    await ctx.close()
  })

  await browser.close()
  fs.writeFileSync(path.join(CARTELLA, 'browser.json'), JSON.stringify({ esiti, erroriPagina }, null, 2))
  for (const item of esiti) console.log(item.esito, item.nome, item.note ?? '')
  console.log('ERRORI PAGINA', erroriPagina.length, erroriPagina.slice(0, 5).join(' | '))
  process.exit(esiti.some((item) => item.esito === 'FAIL') ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
