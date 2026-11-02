// Task 3 (medie «Dati e caricamento"): l'avviso «Dati non aggiornati · offline» compare solo quando è vero.
// Solo emulatore demo-groomly, app su 127.0.0.1:5173 in modo emu.
// (a) ricarica della pagina: l'avviso deve sparire (o non comparire) entro pochi secondi.
// (b) rete tolta 10 s: l'avviso deve comparire; rete tornata: deve sparire entro pochi secondi.
// (c) cadute brevi di 1 e 2 s (due giri ciascuna): dopo il ritorno della rete l'avviso deve sparire.
// Registra la linea del tempo dell'avviso e, se presenti, le righe di console «QA-DIAG» degli hook.
// Uso: node QA-tests/.qa-catalog/verify-avviso-stantio.cjs
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
const { initializeApp } = req('firebase-admin/app'); initializeApp({ projectId: 'demo-groomly' })
const { getFirestore } = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const { chromium } = require('playwright')
const db = getFirestore(); const auth = getAuth()
const APP = 'http://127.0.0.1:5173'
const AVVISO = 'Dati non aggiornati · offline'
const ENTRO_MS = 8000
const esiti = []
const prova = async (nome, f) => { try { esiti.push({ nome, esito: 'PASS', note: await f() }) } catch (e) { esiti.push({ nome, esito: 'FAIL', note: String(e.message || e).slice(0, 800) }) } }

let t0 = Date.now()
const diario = []
const segna = (riga) => { const r = `${String(Date.now() - t0).padStart(6)}ms ${riga}`; diario.push(r); console.log(r) }

async function avvisoVisibile(page) {
  return (await page.getByText(AVVISO, { exact: true }).count()) > 0 && page.getByText(AVVISO, { exact: true }).first().isVisible()
}
// Campiona l'avviso ogni 250 ms per `ms`; restituisce i campioni [ms, visibile].
async function campiona(page, ms, etichetta) {
  const campioni = []
  const inizio = Date.now()
  let ultimo = null
  while (Date.now() - inizio < ms) {
    const v = await avvisoVisibile(page).catch(() => null)
    if (v !== ultimo) { segna(`[${etichetta}] avviso ${v ? 'VISIBILE' : 'assente'}`); ultimo = v }
    campioni.push([Date.now() - inizio, v])
    await page.waitForTimeout(250)
  }
  return campioni
}
const finale = (c) => c[c.length - 1][1]
const primoAssenteStabile = (c) => {
  for (let i = 0; i < c.length; i += 1) if (c.slice(i).every(([, v]) => v === false)) return c[i][0]
  return null
}

;(async () => {
  const email = 'qa-avviso-stantio@test.groomly'
  const old = await auth.getUserByEmail(email).catch(() => null)
  if (old) { await db.recursiveDelete(db.doc(`salons/${old.uid}`)); await db.recursiveDelete(db.doc(`accounts/${old.uid}`)); await auth.deleteUser(old.uid) }
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  const now = Date.now(); const H = 3600000
  await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: 'Avviso', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({ business: { salonName: 'Salone Avviso', name: 'Salone Avviso' }, updatedAt: '2026-01-01T00:00:00.000Z' })
  const dogId = 'qa-avviso-cane'
  await db.doc(`salons/${uid}/dogs/${dogId}`).set({ id: dogId, name: 'Fido Avviso', species: 'cane', breed: 'Meticcio', size: 'piccola', ageCategory: 'adulto', temperament: 'bravo', clientType: 'occasionale', contact: { name: 'Prova QA', phone: '+39 333 0000000' }, contacts: [], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: 'fido avviso', createdAt: now - 864e6, updatedAt: now - 864e6 })
  const svc = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
  for (const [id, start] of [['qa-avviso-v1', now + 2 * H], ['qa-avviso-v2', now + 72 * H], ['qa-avviso-v3', now - 240 * H]]) {
    await db.doc(`salons/${uid}/appointments/${id}`).set({ id, dogId, start, end: start + 1800000, services: svc, status: 'programmato', kind: 'pelosetto', createdAt: now - 864e6, updatedAt: now - 864e6 })
  }

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const page = await ctx.newPage()
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('QA-DIAG')) segna(t) })

  await prova('0 accesso e caricamento: nessun avviso', async () => {
    t0 = Date.now()
    await page.goto(`${APP}/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('Test1234!')
    await page.getByRole('button', { name: 'Entra', exact: true }).click()
    await page.waitForURL(`${APP}/`, { timeout: 40000 })
    const c = await campiona(page, 10000, 'accesso')
    if (finale(c)) throw new Error('avviso ancora visibile 10 s dopo l\'accesso')
    return 'ok'
  })
  await prova('a ricarica: avviso spento entro pochi secondi', async () => {
    segna('--- ricarica ---')
    await page.reload()
    const c = await campiona(page, 15000, 'ricarica')
    const spento = primoAssenteStabile(c)
    if (spento === null || spento > ENTRO_MS) throw new Error(`avviso non spento (primo assente stabile: ${spento} ms)`)
    return `assente stabile da ${spento} ms`
  })
  await prova('b rete tolta: avviso c\'è; rete tornata: avviso spento', async () => {
    // Moduli che servono offline già caricati: Vite non può servirne di nuovi senza rete.
    await page.waitForTimeout(1000)
    segna('--- rete tolta ---')
    await ctx.setOffline(true)
    const offline = await campiona(page, 10000, 'offline')
    if (!finale(offline)) throw new Error('con la rete tolta l\'avviso non compare')
    segna('--- rete tornata ---')
    await ctx.setOffline(false)
    const c = await campiona(page, 20000, 'online')
    const spento = primoAssenteStabile(c)
    if (spento === null || spento > ENTRO_MS) throw new Error(`avviso non spento dopo il ritorno della rete (primo assente stabile: ${spento} ms)`)
    return `offline visibile; online assente stabile da ${spento} ms`
  })
  // (c) cadute brevi (passaggio Wi-Fi → rete mobile): Firestore può non passare mai alla cache.
  for (const [ms, giro] of [[1000, 1], [1000, 2], [2000, 1], [2000, 2]]) {
    await prova(`c caduta breve ${ms} ms (giro ${giro}): avviso spento dopo il ritorno`, async () => {
      await page.waitForTimeout(1500)
      segna(`--- caduta ${ms} ms ---`)
      await ctx.setOffline(true)
      const giu = await campiona(page, ms, `giu-${ms}`)
      await ctx.setOffline(false)
      segna('--- rete tornata ---')
      const c = await campiona(page, 15000, `su-${ms}`)
      const spento = primoAssenteStabile(c)
      if (spento === null || spento > ENTRO_MS) throw new Error(`avviso non spento dopo una caduta di ${ms} ms (primo assente stabile: ${spento} ms)`)
      return `durante la caduta visibile: ${giu.some(([, v]) => v)}; assente stabile da ${spento} ms`
    })
  }
  await browser.close()
  await db.recursiveDelete(db.doc(`salons/${uid}`)); await db.recursiveDelete(db.doc(`accounts/${uid}`)); await auth.deleteUser(uid)
  console.log(JSON.stringify(esiti, null, 1)); process.exit(esiti.every((e) => e.esito === 'PASS') ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
