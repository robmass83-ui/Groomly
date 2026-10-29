import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../.capture-tools/node_modules/playwright-core/index.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const base = process.env.GROOMLY_URL ?? 'http://127.0.0.1:5173'
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const catalog = []
const failures = []
const solo = new Set((process.env.SOLO ?? '').split(',').map((item) => item.trim()).filter(Boolean))

function at(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()
}

function svgAvatar(color, face) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="${color}"/><circle cx="80" cy="66" r="28" fill="${face}"/><ellipse cx="80" cy="122" rx="38" ry="24" fill="${face}"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function svgListino(title, lines) {
  const rows = lines.map((line, index) => `<text x="36" y="${120 + index * 36}" font-family="sans-serif" font-size="18" fill="#3d3428">${line}</text>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="860"><rect width="640" height="860" fill="#f6f1e8"/><text x="36" y="64" font-family="sans-serif" font-size="28" fill="#2a241c">${title}</text>${rows}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function dog(input) {
  const row = {
    species: 'cane',
    sex: 'M',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    status: 'attivo',
    contact: { name: 'Proprietario', phone: '333 0000000' },
    tags: [],
    servicePrices: [],
    hiddenServiceIds: [],
    customFields: [],
    createdAt: at(2026, 1, 10, 9, 0),
    updatedAt: at(2026, 10, 1, 9, 0),
    ...input,
  }
  row.searchKey = `${row.name} ${row.breed} ${row.contact.name}`.toLocaleLowerCase('it-IT')
  return row
}

function line(serviceId, name, durationMin, price) {
  return { serviceId, name, durationMin, price }
}

function visit(id, dogId, start, services, status, extra = {}) {
  return {
    id,
    dogId,
    start,
    services,
    status,
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

function buildPayload(theme) {
  const now = at(2026, 10, 10, 9, 0)
  const services = {
    bagno: { id: 'bagno', order: 0, name: 'Bagno', kind: 'principale', iconKey: 'bagno', active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 }, createdAt: now, updatedAt: now },
    taglio: { id: 'taglio', order: 1, name: 'Taglio / tosatura', kind: 'principale', iconKey: 'taglio', active: true, durationMin: { piccola: 45, media: 60, grande: 75 }, price: { piccola: 30, media: 35, grande: 45 }, createdAt: now, updatedAt: now },
    'bagno-taglio': { id: 'bagno-taglio', order: 2, name: 'Bagno + taglio', kind: 'principale', iconKey: 'bagno_taglio', active: true, durationMin: { piccola: 60, media: 90, grande: 120 }, price: { piccola: 35, media: 45, grande: 60 }, createdAt: now, updatedAt: now },
    stripping: { id: 'stripping', order: 3, name: 'Stripping', kind: 'principale', active: true, durationMin: { piccola: 120, media: 150, grande: 180 }, price: { piccola: 50, media: 65, grande: 85 }, createdAt: now, updatedAt: now },
    nodi: { id: 'nodi', order: 4, name: 'Gestione nodi', kind: 'extra', iconKey: 'nodi', active: true, durationMin: { piccola: 20, media: 20, grande: 20 }, price: { piccola: 5, media: 5, grande: 5 }, createdAt: now, updatedAt: now },
    dermatologico: { id: 'dermatologico', order: 5, name: 'Dermatologico', kind: 'extra', iconKey: 'dermatologico', active: true, durationMin: { piccola: 15, media: 15, grande: 15 }, price: { piccola: 10, media: 10, grande: 10 }, createdAt: now, updatedAt: now },
    antiparassitario: { id: 'antiparassitario', order: 6, name: 'Antiparassitario', kind: 'extra', iconKey: 'antiparassitario', active: true, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 12, media: 12, grande: 12 }, createdAt: now, updatedAt: now },
    unghie: { id: 'unghie', order: 7, name: 'Unghie', kind: 'extra', active: false, durationMin: { piccola: 10, media: 10, grande: 10 }, price: { piccola: 5, media: 5, grande: 5 }, createdAt: now, updatedAt: now },
  }
  const dogs = {
    luna: dog({
      id: 'luna', name: 'Luna', breed: 'Barboncino', sex: 'F', size: 'media', temperament: 'agitato', clientType: 'mensile',
      photo: svgAvatar('#d7c4a3', '#6b4f34'),
      contact: { name: 'Giulia Rossi', phone: '333 1204567' },
      contacts: [
        { id: 'luna-1', name: 'Giulia Rossi', role: 'Proprietaria', phone: '333 1204567', isPrimary: true },
        { id: 'luna-2', name: 'Marco Rossi', role: 'Famiglia', phone: '347 8801122', isPrimary: false },
      ],
      birthYear: 2019, weightKg: 8.4, recurrenceWeeks: 4,
      tags: ['Pelo riccio', 'Sensibile'],
      notes: 'Preferisce essere asciugata a mano.',
      servicePrices: [{ serviceId: 'bagno', price: 25, durationMin: 45 }],
      customFields: [{ id: 'vet', label: 'Veterinario', value: 'Dott. Bianchi' }],
    }),
    zeus: dog({
      id: 'zeus', name: 'Zeus', breed: 'Pastore tedesco', sex: 'M', size: 'grande', clientType: 'occasionale',
      photo: svgAvatar('#c8b49a', '#3e3328'),
      contact: { name: 'Luca Ferri', phone: '320 5566778' },
      birthYear: 2020, weightKg: 34,
    }),
    nala: dog({
      id: 'nala', name: 'Nala', breed: 'Jack Russell', sex: 'F', size: 'piccola', temperament: 'mordace', clientType: 'mensile',
      photo: svgAvatar('#e6d3b3', '#8a5a32'),
      contact: { name: 'Sara Conti', phone: '339 4455667' },
      criticalNote: 'Morde se le tocchi le zampe',
      recurrenceWeeks: 4, birthYear: 2018, weightKg: 6.2,
    }),
    coco: dog({
      id: 'coco', name: 'Coco', breed: 'Labrador', sex: 'M', size: 'grande', clientType: 'mensile',
      photo: svgAvatar('#e2c48a', '#5c4318'),
      contact: { name: 'Paolo Neri', phone: '348 2211009' },
      recurrenceWeeks: 4, birthYear: 2021, weightKg: 29,
    }),
    otto: dog({
      id: 'otto', name: 'Otto', breed: 'Bassotto', sex: 'M', size: 'piccola', temperament: 'agitato',
      contact: { name: 'Elena Vita', phone: '331 9099887' },
      birthYear: 2017, weightKg: 9,
    }),
    micio: dog({
      id: 'micio', name: 'Micio', breed: 'Europeo', species: 'gatto', sex: 'M', size: 'piccola', ageCategory: 'anziano', isSenior: true,
      contact: { name: 'Chiara Blu', phone: '366 1011223' },
      birthYear: 2012, weightKg: 4.5,
    }),
    iris: dog({
      id: 'iris', name: 'Iris', breed: 'Maltese', sex: 'F', size: 'piccola', ageCategory: 'giovane', clientType: 'mensile',
      contact: { name: 'Marta Gallo', phone: '328 6767676' },
      birthYear: 2024, weightKg: 3.2, recurrenceWeeks: 4,
    }),
    birba: dog({
      id: 'birba', name: 'Birba', breed: 'Meticcio', sex: 'F', size: 'media', status: 'non_in_cura',
      contact: { name: 'Anna Serra', phone: '340 3030303' },
      archivedAt: at(2026, 9, 2, 12, 0),
    }),
    rocky: dog({
      id: 'rocky', name: 'Rocky', breed: 'Beagle', sex: 'M', size: 'media', ageCategory: 'anziano', status: 'deceduto',
      contact: { name: 'Davide Russo', phone: '335 4545454' },
      archivedAt: at(2026, 9, 20, 12, 0), birthYear: 2013,
    }),
  }
  const bagnoMedia = line('bagno', 'Bagno', 45, 28)
  const bagnoPiccola = line('bagno', 'Bagno', 30, 20)
  const bagnoGrande = line('bagno', 'Bagno', 60, 38)
  const taglioMedia = line('taglio', 'Taglio / tosatura', 60, 35)
  const taglioGrande = line('taglio', 'Taglio / tosatura', 75, 45)
  const appointments = {
    'ap-zeus-oggi': visit('ap-zeus-oggi', 'zeus', at(2026, 10, 10, 9, 0), [bagnoGrande, taglioGrande], 'completato', {
      total: 83, actualDurationMin: 120, tools: ['Tosatrice', 'Forbici'], products: ['Shampoo delicato'], cutStyle: 'Tedesco',
    }),
    'ap-micio-oggi': visit('ap-micio-oggi', 'micio', at(2026, 10, 10, 12, 0), [bagnoPiccola], 'programmato'),
    'ap-luna-oggi': visit('ap-luna-oggi', 'luna', at(2026, 10, 10, 15, 30), [bagnoMedia], 'programmato'),
    'ap-otto-ieri': visit('ap-otto-ieri', 'otto', at(2026, 10, 9, 10, 0), [taglioMedia], 'programmato'),
    'ap-iris-scaduta': visit('ap-iris-scaduta', 'iris', at(2026, 10, 8, 16, 0), [bagnoPiccola], 'programmato'),
    'ap-micio-assente': visit('ap-micio-assente', 'micio', at(2026, 10, 6, 9, 30), [bagnoPiccola], 'non_venuto'),
    'ap-luna-disdetta': visit('ap-luna-disdetta', 'luna', at(2026, 10, 7, 14, 0), [bagnoMedia], 'disdetto', { cancelReason: 'cliente' }),
    'ap-nala-agosto': visit('ap-nala-agosto', 'nala', at(2026, 8, 22, 10, 0), [bagnoPiccola], 'completato', { total: 20 }),
    'ap-coco-sett': visit('ap-coco-sett', 'coco', at(2026, 9, 12, 11, 0), [bagnoGrande, taglioGrande], 'completato', { total: 83 }),
    'ap-luna-sett': visit('ap-luna-sett', 'luna', at(2026, 9, 12, 11, 0), [taglioMedia], 'completato', { total: 35, cutStyle: 'Cucciolo' }),
    'ap-coco-futuro': visit('ap-coco-futuro', 'coco', at(2026, 10, 20, 11, 0), [bagnoGrande], 'programmato', { seriesId: 'serie-coco' }),
    'ap-rocky': visit('ap-rocky', 'rocky', at(2026, 10, 5, 9, 0), [bagnoMedia], 'completato'),
    'ap-otto-domenica': visit('ap-otto-domenica', 'otto', at(2026, 10, 11, 10, 0), [bagnoPiccola], 'programmato'),
  }
  const currentList = svgListino('Listino 2026', ['Bagno media — 28 € · 45 min', 'Taglio media — 35 € · 60 min', 'Bagno + taglio grande — 60 €'])
  const oldList = svgListino('Listino 2025', ['Bagno media — 25 €', 'Taglio media — 32 €'])
  const settings = {
    theme,
    updatedAt: now,
    recentDogIds: ['luna', 'zeus', 'coco', 'micio'],
    fieldLabels: {
      species: 'Specie', breed: 'Razza', sex: 'Sesso', age: 'Età', weight: 'Peso', size: 'Taglia', clientType: 'Cliente', avgDuration: 'Durata media',
    },
    tagSuggestions: ['Pelo riccio', 'Sensibile', 'Ansioso', 'Senior'],
    toolSuggestions: ['Tosatrice', 'Forbici', 'Cardatore'],
    productSuggestions: ['Shampoo delicato', 'Balsamo'],
    business: { name: 'Toelettatura La Rosa', vatNumber: 'IT01234567890', phone: '06 1234567', address: 'Via Roma 12, Roma' },
    priceList: { id: 'listino-2026', fileName: 'listino-2026.svg', mime: 'image/svg+xml', byteSize: 2400, uploadedAt: at(2026, 10, 2, 18, 0), dataUrl: currentList },
    priceListHistory: [{ id: 'listino-2025', fileName: 'listino-2025.svg', mime: 'image/svg+xml', byteSize: 1800, uploadedAt: at(2026, 3, 1, 18, 0), dataUrl: oldList }],
    monthlyReminder: { enabled: true, time: '18:30', daysBefore: 7 },
    backup: { lastAt: at(2026, 10, 9, 19, 0), autoDaily: true },
    ageThresholds: { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 },
  }
  return {
    'groomly.auth': JSON.stringify({
      uid: 'demo',
      email: 'rosa@toelettatura.test',
      passwordHash: 'demo',
      salt: 'demo',
      iterations: 1,
      createdAt: at(2026, 1, 1, 10, 0),
    }),
    'groomly.session': 'demo',
    'groomly.users.demo.settings': JSON.stringify(settings),
    'groomly.users.demo.services': JSON.stringify(services),
    'groomly.users.demo.dogs': JSON.stringify(dogs),
    'groomly.users.demo.appointments': JSON.stringify(appointments),
  }
}

function remember(section, file, title, detail) {
  const next = { section, file, title, detail }
  const index = catalog.findIndex((item) => item.file === file)
  if (index >= 0) catalog[index] = next
  else catalog.push(next)
}

async function shoot(page, file, title, section, detail, full = false) {
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await page.waitForTimeout(180)
  try {
    await page.screenshot({ path: join(root, file), fullPage: full, animations: 'disabled', timeout: full ? 90000 : 20000 })
  } catch (error) {
    if (!full) throw error
    await page.screenshot({ path: join(root, file), fullPage: false, animations: 'disabled', timeout: 20000 })
    console.log('solo finestra', file, error instanceof Error ? error.message.split('\n')[0] : error)
  }
  remember(section, file, title, detail)
  console.log('foto', file)
}

async function open(page, path, locator) {
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await locator.waitFor({ timeout: 12000 })
  await page.waitForTimeout(250)
}

async function closeTop(page) {
  await page.mouse.click(18, 16)
  await page.waitForTimeout(220)
}

async function scrollDialog(page, name) {
  const moved = await page.getByRole('dialog', { name }).evaluate((dialog) => {
    const box = [...dialog.querySelectorAll('div')].find((el) => getComputedStyle(el).overflowY === 'auto')
    if (!box || box.scrollHeight <= box.clientHeight + 24) return false
    box.scrollTop = box.scrollHeight
    return true
  })
  if (moved) await page.waitForTimeout(180)
  return moved
}

async function scrollHours(page, top) {
  await page.waitForTimeout(450)
  await page.getByRole('grid', { name: 'Orari' }).evaluate((node, value) => {
    node.scrollTop = value
  }, top)
  await page.waitForTimeout(180)
}

async function run(name, task) {
  if (solo.size > 0 && !solo.has(name)) return
  try {
    await task()
    console.log('ok', name)
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    failures.push(`${name}: ${message}`)
    console.error('errore', name, message)
  }
}

function phoneContext(browser, colorScheme) {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'it-IT',
    colorScheme,
    reducedMotion: 'reduce',
  })
}

async function blockUpdates(context) {
  let showUpdate = false
  await context.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.includes('releases/latest')) {
      if (!showUpdate) {
        await route.fulfill({ status: 404, body: '' })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tag_name: 'v9.9.9',
          html_url: 'https://github.com/robmass83-ui/Groomly/releases/tag/v9.9.9',
          assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.9.9/groomly.apk' }],
        }),
      })
      return
    }
    if (url.includes('release.json')) {
      await route.fulfill({ status: 404, body: '' })
      return
    }
    await route.continue()
  })
  return {
    arm() { showUpdate = true },
    disarm() { showUpdate = false },
  }
}

async function bind(page) {
  page.setDefaultTimeout(12000)
  page.on('pageerror', (error) => console.log('pagina', error.message))
}

async function captureLogin(browser) {
  const context = await phoneContext(browser, 'light')
  await blockUpdates(context)
  const page = await context.newPage()
  bind(page)
  await run('login crea', async () => {
    await open(page, '/login', page.getByRole('heading', { name: 'Crea accesso' }))
    await shoot(page, 'chiaro/01-login-crea.png', 'Crea accesso', 'Accesso', 'Primo avvio, senza account. Route /login')
  })
  await run('login errori', async () => {
    await page.getByRole('button', { name: 'Crea accesso' }).click()
    await page.getByText(/email valida/).waitFor()
    await shoot(page, 'chiaro/02-login-errori.png', 'Errori di accesso', 'Accesso', 'Email e password vuote')
  })
  await run('login entra', async () => {
    const auth = JSON.parse(buildPayload('light')['groomly.auth'])
    await page.evaluate((value) => {
      localStorage.setItem('groomly.auth', JSON.stringify(value))
      localStorage.removeItem('groomly.session')
    }, auth)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Entra' }).waitFor()
    await shoot(page, 'chiaro/03-login-entra.png', 'Entra', 'Accesso', 'Account già presente, sessione chiusa. Email rosa@toelettatura.test')
  })
  await context.close()

  const dark = await phoneContext(browser, 'dark')
  await blockUpdates(dark)
  const darkPage = await dark.newPage()
  bind(darkPage)
  await run('login scuro', async () => {
    await open(darkPage, '/login', darkPage.getByRole('heading', { name: 'Crea accesso' }))
    await shoot(darkPage, 'scuro/01-login-crea.png', 'Crea accesso, tema scuro', 'Tema scuro', 'Stesso primo avvio con preferenza di sistema scura')
  })
  await dark.close()
}

async function captureLight(page, updates) {
  await run('home', async () => {
    await open(page, '/', page.getByRole('heading', { name: 'Groomly' }))
    const text = await page.locator('body').innerText()
    if (!text.includes('Luna') || !text.includes('Zeus')) {
      throw new Error(`Dati demo assenti. Inizio pagina: ${text.slice(0, 280)}`)
    }
    const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))
    console.log('home', size)
    await shoot(page, 'chiaro/10-home.png', 'Home', 'Home', 'Oggi, mensili, visite da chiudere e cani recenti. Route /', true)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await shoot(page, 'chiaro/10-home-basso.png', 'Home, in fondo', 'Home', 'Parte bassa: riquadri, cani recenti ed esci dalla vista iniziale')
  })
  await run('aggiornamento', async () => {
    updates.arm()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('dialog', { name: 'Aggiornamento disponibile' }).waitFor()
    await shoot(page, 'chiaro/11-aggiornamento.png', 'Aggiornamento disponibile', 'Home', 'Foglio mostrato quando esiste una release più nuova')
    await page.getByRole('button', { name: 'Più tardi' }).click()
    updates.disarm()
    await page.getByRole('dialog', { name: 'Aggiornamento disponibile' }).waitFor({ state: 'hidden' })
  })
  await run('home disdetto', async () => {
    await open(page, '/', page.getByRole('heading', { name: 'Groomly' }))
    await page.getByRole('button', { name: 'Disdetto Otto' }).click()
    await page.getByRole('dialog', { name: 'Chi disdice?' }).waitFor()
    await shoot(page, 'chiaro/12-home-disdetto.png', 'Chi disdice', 'Home', 'Foglio dalla visita da chiudere di Otto')
  })
  await run('home nuovo', async () => {
    await open(page, '/', page.getByRole('button', { name: 'Apri azioni' }))
    await page.getByRole('button', { name: 'Apri azioni' }).click()
    await page.getByRole('dialog', { name: 'Nuovo' }).waitFor()
    await shoot(page, 'chiaro/13-home-nuovo.png', 'Nuovo', 'Home', 'Pulsante + in basso: appuntamento o animale')
  })
  await run('animali', async () => {
    await open(page, '/animali', page.getByRole('heading', { name: 'Animali' }))
    await shoot(page, 'chiaro/20-animali.png', 'Animali', 'Animali', 'Elenco attivi. Route /animali', true)
    await page.getByRole('textbox', { name: 'Cerca' }).fill('Luna')
    await shoot(page, 'chiaro/21-animali-cerca.png', 'Ricerca', 'Animali', 'Ricerca per nome: Luna')
    await page.getByRole('textbox', { name: 'Cerca' }).fill('')
    await page.getByRole('tab', { name: /Mensili/ }).click()
    await shoot(page, 'chiaro/22-animali-mensili.png', 'Solo mensili', 'Animali', 'Scheda Mensili')
    await page.getByRole('tab', { name: /Occasionali/ }).click()
    await shoot(page, 'chiaro/23-animali-occasionali.png', 'Solo occasionali', 'Animali', 'Scheda Occasionali')
    await page.getByRole('tab', { name: /Attivi/ }).click()
    await page.getByRole('button', { name: 'Mordaci' }).click()
    await shoot(page, 'chiaro/24-animali-mordaci.png', 'Filtro mordaci', 'Animali', 'Chip Mordaci tra gli attivi')
    await page.getByRole('button', { name: 'Ordina' }).click()
    await page.getByRole('dialog', { name: 'Ordina' }).waitFor()
    await shoot(page, 'chiaro/25-animali-ordina.png', 'Ordina', 'Animali', 'Foglio ordine alfabetico o per prossimo appuntamento')
  })
  await run('archivio', async () => {
    await open(page, '/animali?tab=archivio', page.getByRole('tab', { name: /Archivio/ }))
    await shoot(page, 'chiaro/26-animali-archivio.png', 'Archivio', 'Animali', 'Non in cura e deceduti. Route /animali?tab=archivio', true)
  })
  await run('scheda', async () => {
    await open(page, '/animali/luna', page.getByRole('heading', { name: 'Scheda' }))
    await page.getByText('Giulia Rossi').first().waitFor()
    await shoot(page, 'chiaro/30-cane-scheda.png', 'Scheda di Luna', 'Scheda cane', 'Lettura: foto, contatti, prezzi, storia. Route /animali/luna', true)
    const price = page.getByRole('button', { name: /Correggi prezzo/ })
    if (await price.count()) {
      await price.first().click()
      await page.getByRole('dialog', { name: 'Prezzo' }).waitFor()
      await shoot(page, 'chiaro/31-cane-prezzo.png', 'Correggi prezzo', 'Scheda cane', 'Foglio sul prezzo di una visita passata')
      await closeTop(page)
    }
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('dialog', { name: 'Scheda' }).waitFor()
    await shoot(page, 'chiaro/32-cane-menu.png', 'Menu scheda', 'Scheda cane', 'Non più in cura, deceduto, elimina')
    await page.getByRole('button', { name: 'Non più in cura' }).click()
    await page.getByRole('dialog', { name: 'Archivia' }).waitFor()
    await shoot(page, 'chiaro/33-cane-archivia.png', 'Archivia', 'Scheda cane', 'Conferma prima di togliere Luna dagli attivi')
    await closeTop(page)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: 'Elimina definitivamente' }).click()
    await page.getByRole('dialog', { name: 'Elimina definitivamente' }).waitFor()
    await shoot(page, 'chiaro/34-cane-elimina.png', 'Elimina cane', 'Scheda cane', 'Conferma eliminazione definitiva')
    await closeTop(page)
  })
  await run('scheda modifica', async () => {
    await open(page, '/animali/luna', page.getByRole('button', { name: 'Modifica' }))
    await page.getByRole('button', { name: 'Modifica' }).click()
    await page.getByRole('button', { name: 'Salva' }).waitFor()
    await shoot(page, 'chiaro/35-cane-modifica.png', 'Modifica scheda', 'Scheda cane', 'Modulo di Luna. Route /animali/luna', true)
    await page.getByRole('button', { name: 'Altri dettagli' }).click()
    await page.getByRole('button', { name: '+ Tag' }).waitFor()
    await shoot(page, 'chiaro/35b-cane-dettagli.png', 'Altri dettagli', 'Scheda cane', 'Tag, campi personalizzati e contatti aggiuntivi', true)
    await page.getByRole('button', { name: '+ Tag' }).click()
    await page.getByRole('dialog', { name: 'Tag' }).waitFor()
    await shoot(page, 'chiaro/36-cane-tag.png', 'Aggiungi tag', 'Scheda cane', 'Foglio tag')
    await closeTop(page)
    await page.getByRole('button', { name: 'Campi' }).click()
    await page.getByRole('dialog', { name: 'Campo' }).waitFor()
    await shoot(page, 'chiaro/37-cane-campo.png', 'Aggiungi campo', 'Scheda cane', 'Foglio campo personalizzato')
    await closeTop(page)
    await page.getByRole('button', { name: '+ Contatto' }).click()
    await page.getByRole('dialog', { name: 'Contatto' }).waitFor()
    await shoot(page, 'chiaro/38-cane-contatto.png', 'Aggiungi contatto', 'Scheda cane', 'Foglio contatto')
  })
  await run('nuovo cane', async () => {
    await open(page, '/animali/nuovo', page.getByRole('heading', { name: 'Nuovo cane' }))
    await shoot(page, 'chiaro/39-cane-nuovo.png', 'Nuovo cane', 'Scheda cane', 'Modulo vuoto. Route /animali/nuovo', true)
    await page.getByRole('button', { name: 'Salva' }).click()
    await page.waitForTimeout(300)
    await shoot(page, 'chiaro/40-cane-nuovo-errori.png', 'Nuovo cane, errori', 'Scheda cane', 'Salvataggio senza dati obbligatori', true)
  })
  await run('calendario giorno', async () => {
    await open(page, '/calendario?vista=giorno&data=2026-10-10', page.getByRole('radiogroup', { name: 'Vista' }))
    await scrollHours(page, 40)
    await shoot(page, 'chiaro/50-calendario-giorno-mattina.png', 'Giorno, mattina', 'Calendario', 'Griglia oraria del 10 ottobre, verso le 9. Route /calendario?vista=giorno')
    await scrollHours(page, 360)
    await shoot(page, 'chiaro/51-calendario-giorno-pomeriggio.png', 'Giorno, pomeriggio', 'Calendario', 'Stessa giornata verso le 15:30, appuntamento di Luna')
  })
  await run('calendario settimana', async () => {
    await open(page, '/calendario?vista=settimana&data=2026-10-10', page.getByRole('grid', { name: 'Orari' }))
    await scrollHours(page, 80)
    await shoot(page, 'chiaro/52-calendario-settimana.png', 'Settimana', 'Calendario', 'Sette colonne, settimana del 10 ottobre')
  })
  await run('calendario mese', async () => {
    await open(page, '/calendario?vista=mese&data=2026-10-10', page.getByRole('grid', { name: 'Mese' }))
    await shoot(page, 'chiaro/53-calendario-mese.png', 'Mese', 'Calendario', 'Griglia di ottobre 2026')
    await page.getByRole('grid', { name: 'Mese' }).evaluate((grid) => {
      const scroller = grid.parentElement
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
    await page.waitForTimeout(200)
    await shoot(page, 'chiaro/54-calendario-mese-giorno.png', 'Mese, elenco del giorno', 'Calendario', 'Sotto la griglia, gli appuntamenti del giorno selezionato')
  })
  await run('mensili', async () => {
    await open(page, '/mensili', page.getByRole('heading', { name: 'Clienti mensili' }))
    await shoot(page, 'chiaro/60-mensili.png', 'Clienti mensili', 'Mensili', 'Mese corrente, da fissare e già fissati. Route /mensili', true)
    await page.getByRole('button', { name: 'Da fissare', exact: true }).click()
    await shoot(page, 'chiaro/61-mensili-da-fissare.png', 'Da fissare', 'Mensili', 'Filtro solo chi non ha il prossimo appuntamento', true)
    await page.getByRole('button', { name: 'Fissati', exact: true }).click()
    await shoot(page, 'chiaro/62-mensili-fissati.png', 'Fissati', 'Mensili', 'Filtro di chi ha già un prossimo appuntamento', true)
    await page.getByRole('radiogroup', { name: 'Mese' }).getByRole('radio').nth(1).click()
    await shoot(page, 'chiaro/63-mensili-mese-dopo.png', 'Mese successivo', 'Mensili', 'Il mese dopo quello corrente', true)
  })
  await run('listino', async () => {
    await open(page, '/listino', page.getByRole('heading', { name: 'Listino prezzi' }))
    await shoot(page, 'chiaro/70-listino.png', 'Listino prezzi', 'Listino', 'File caricato e tabella taglie. Route /listino', true)
    await open(page, '/listino/vedi', page.getByRole('heading', { name: 'Listino' }))
    await shoot(page, 'chiaro/71-listino-file.png', 'File del listino', 'Listino', 'Anteprima del file. Route /listino/vedi', true)
  })
  await run('impostazioni', async () => {
    await open(page, '/impostazioni', page.getByRole('heading', { name: 'Impostazioni' }))
    await shoot(page, 'chiaro/80-impostazioni.png', 'Impostazioni', 'Impostazioni', 'Attività, tema, backup, campi, promemoria. Route /impostazioni', true)
    await page.getByRole('button', { name: 'Modifica attività' }).click()
    await page.getByRole('dialog', { name: 'Attività' }).waitFor()
    await shoot(page, 'chiaro/81-impostazioni-attivita.png', 'Attività', 'Impostazioni', 'Ragione sociale, partita IVA, telefono, indirizzo')
    await closeTop(page)
    await page.getByRole('button', { name: 'Campi scheda' }).click()
    await page.getByRole('dialog', { name: 'Campi scheda' }).waitFor()
    await shoot(page, 'chiaro/82-impostazioni-campi.png', 'Campi scheda', 'Impostazioni', 'Nomi dei campi della scheda cane')
    await closeTop(page)
    await page.getByRole('button', { name: /Tag caratteristiche/ }).click()
    await page.getByRole('dialog', { name: 'Tag caratteristiche' }).waitFor()
    await shoot(page, 'chiaro/83-impostazioni-tag.png', 'Tag, strumenti, prodotti', 'Impostazioni', 'Suggerimenti usati in scheda e in appuntamento')
    await closeTop(page)
    const backup = {
      dogs: { rex: { name: 'Rex' } },
      appointments: {},
      services: {},
      settings: { theme: 'light' },
    }
    const backupPath = join(root, '_backup-demo.json')
    await writeFile(backupPath, JSON.stringify(backup))
    await page.locator('input[aria-label="Scegli backup"]').setInputFiles(backupPath)
    await page.getByRole('dialog', { name: 'Ripristina' }).waitFor()
    await shoot(page, 'chiaro/84-impostazioni-ripristina.png', 'Ripristina backup', 'Impostazioni', 'Conferma prima di sostituire i dati. Non è stato ripristinato')
  })
  await run('servizi', async () => {
    await open(page, '/impostazioni/servizi', page.getByRole('heading', { name: 'Servizi e durate' }))
    await shoot(page, 'chiaro/85-servizi.png', 'Servizi e durate', 'Impostazioni', 'Elenco con Unghie disattivato. Route /impostazioni/servizi', true)
    await page.getByRole('button', { name: 'Apri Bagno', exact: true }).click()
    await page.getByRole('dialog', { name: 'Modifica servizio' }).waitFor()
    await shoot(page, 'chiaro/86-servizio-modifica.png', 'Modifica servizio', 'Impostazioni', 'Durata e prezzo per taglia di Bagno')
    await closeTop(page)
    await page.getByRole('button', { name: 'Aggiungi servizio' }).click()
    await page.getByRole('dialog', { name: 'Nuovo servizio' }).waitFor()
    await shoot(page, 'chiaro/87-servizio-nuovo.png', 'Nuovo servizio', 'Impostazioni', 'Foglio di creazione')
  })
  await run('appuntamento', async () => {
    await open(page, '/appuntamenti/ap-luna-oggi', page.getByRole('dialog', { name: 'Appuntamento' }))
    await page.getByRole('dialog', { name: 'Appuntamento' }).getByText('Luna').waitFor()
    await shoot(page, 'chiaro/90-appuntamento.png', 'Appuntamento di Luna', 'Appuntamento', 'Visita programmata oggi alle 15:30. Route /appuntamenti/ap-luna-oggi')
    if (await scrollDialog(page, 'Appuntamento')) {
      await shoot(page, 'chiaro/91-appuntamento-basso.png', 'Appuntamento, in fondo', 'Appuntamento', 'Azioni in fondo al foglio: completato, disdici, modifica')
    }
    await page.getByRole('button', { name: 'Altre azioni' }).click()
    await page.getByRole('dialog', { name: 'Altre azioni' }).waitFor()
    await shoot(page, 'chiaro/92-appuntamento-azioni.png', 'Altre azioni', 'Appuntamento', 'Menu secondario, include elimina')
    await closeTop(page)
    await page.getByRole('button', { name: 'Disdici' }).click()
    await page.getByRole('dialog', { name: 'Chi disdice?' }).waitFor()
    await shoot(page, 'chiaro/93-appuntamento-disdici.png', 'Chi disdice', 'Appuntamento', 'Cliente o salone')
    await closeTop(page)
    await page.getByRole('button', { name: 'Altre azioni' }).click()
    await page.getByRole('dialog', { name: 'Altre azioni' }).getByRole('button', { name: 'Elimina' }).click()
    await page.getByRole('dialog', { name: 'Eliminare questo appuntamento?' }).waitFor()
    await shoot(page, 'chiaro/94-appuntamento-elimina.png', 'Elimina appuntamento', 'Appuntamento', 'Conferma eliminazione')
  })
  await run('appuntamento modifica', async () => {
    await open(page, '/appuntamenti/ap-luna-oggi', page.getByRole('button', { name: 'Modifica' }))
    await page.getByRole('button', { name: 'Modifica' }).click()
    await page.getByLabel('Cerca cane').waitFor({ state: 'hidden' }).catch(() => {})
    await page.waitForTimeout(300)
    await shoot(page, 'chiaro/95-appuntamento-modifica.png', 'Modifica appuntamento', 'Appuntamento', 'Stesso foglio in modifica')
  })
  await run('appuntamento completato', async () => {
    await open(page, '/appuntamenti/ap-zeus-oggi', page.getByRole('dialog', { name: 'Appuntamento' }))
    await page.getByText('Zeus').first().waitFor()
    await shoot(page, 'chiaro/96-appuntamento-completato.png', 'Appuntamento completato', 'Appuntamento', 'Zeus, oggi alle 9: note, strumenti, prodotti e stile')
    if (await scrollDialog(page, 'Appuntamento')) {
      await shoot(page, 'chiaro/97-appuntamento-completato-basso.png', 'Completato, in fondo', 'Appuntamento', 'Parte bassa della visita chiusa')
    }
  })
  await run('nuovo appuntamento', async () => {
    await open(page, '/appuntamenti/nuovo?cane=nala&data=2026-10-24&ora=10:00&servizi=bagno,nodi', page.getByRole('dialog', { name: 'Nuovo appuntamento' }))
    await page.getByText('Nala').first().waitFor()
    await shoot(page, 'chiaro/98-appuntamento-nuovo.png', 'Nuovo appuntamento', 'Appuntamento', 'Nala, 24 ottobre alle 10, bagno e nodi')
    if (await scrollDialog(page, 'Nuovo appuntamento')) {
      await shoot(page, 'chiaro/99-appuntamento-nuovo-basso.png', 'Nuovo appuntamento, orario', 'Appuntamento', 'Giorno, ore e ripetizione')
    }
    const repeat = page.getByRole('button', { name: 'Fissa anche il prossimo' })
    if (await repeat.count()) {
      await repeat.click()
      await shoot(page, 'chiaro/100-appuntamento-ripeti.png', 'Fissa anche il prossimo', 'Appuntamento', 'Opzione di ripetizione aperta')
    }
  })
  await run('sovrapposizione', async () => {
    await open(page, '/appuntamenti/nuovo?cane=zeus&data=2026-10-10&ora=15:30&servizi=bagno', page.getByRole('button', { name: 'Salva' }))
    await page.getByRole('button', { name: 'Salva' }).click()
    await page.getByRole('dialog', { name: 'Orario già occupato' }).waitFor()
    await shoot(page, 'chiaro/101-orario-occupato.png', 'Orario già occupato', 'Appuntamento', 'Zeus alle 15:30 si sovrappone a Luna. Non è stato salvato')
  })
  await run('kit', async () => {
    await open(page, '/dev/kit', page.getByRole('heading', { name: 'Kit' }))
    await shoot(page, 'chiaro/110-kit.png', 'Kit componenti', 'Kit', 'Pulsanti, chip, icone e avatar. Route /dev/kit, solo in sviluppo', true)
    await page.getByRole('button', { name: 'Apri foglio' }).click()
    await page.getByRole('dialog', { name: 'Foglio di prova' }).waitFor()
    await shoot(page, 'chiaro/111-kit-foglio.png', 'Foglio di prova', 'Kit', 'Componente foglio vuoto')
  })
}

async function captureDark(page) {
  const folder = 'scuro'
  await run('scuro home', async () => {
    await open(page, '/', page.getByRole('heading', { name: 'Groomly' }))
    await shoot(page, `${folder}/10-home.png`, 'Home', 'Tema scuro', 'Stessa home dei dati demo', true)
    await page.getByRole('button', { name: 'Apri azioni' }).click()
    await page.getByRole('dialog', { name: 'Nuovo' }).waitFor()
    await shoot(page, `${folder}/11-home-nuovo.png`, 'Nuovo', 'Tema scuro', 'Foglio del pulsante +')
  })
  await run('scuro animali e scheda', async () => {
    await open(page, '/animali', page.getByRole('heading', { name: 'Animali' }))
    await shoot(page, `${folder}/20-animali.png`, 'Animali', 'Tema scuro', 'Elenco attivi', true)
    await open(page, '/animali/luna', page.getByRole('heading', { name: 'Scheda' }))
    await shoot(page, `${folder}/30-cane-scheda.png`, 'Scheda di Luna', 'Tema scuro', 'Lettura', true)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('dialog', { name: 'Scheda' }).waitFor()
    await shoot(page, `${folder}/31-cane-menu.png`, 'Menu scheda', 'Tema scuro', 'Foglio azioni della scheda')
  })
  await run('scuro calendario', async () => {
    await open(page, '/calendario?vista=giorno&data=2026-10-10', page.getByRole('grid', { name: 'Orari' }))
    await scrollHours(page, 40)
    await shoot(page, `${folder}/50-calendario-giorno.png`, 'Giorno', 'Tema scuro', 'Griglia oraria')
    await open(page, '/calendario?vista=settimana&data=2026-10-10', page.getByRole('grid', { name: 'Orari' }))
    await scrollHours(page, 80)
    await shoot(page, `${folder}/51-calendario-settimana.png`, 'Settimana', 'Tema scuro', 'Sette colonne')
    await open(page, '/calendario?vista=mese&data=2026-10-10', page.getByRole('grid', { name: 'Mese' }))
    await shoot(page, `${folder}/52-calendario-mese.png`, 'Mese', 'Tema scuro', 'Ottobre 2026')
  })
  await run('scuro mensili listino', async () => {
    await open(page, '/mensili', page.getByRole('heading', { name: 'Clienti mensili' }))
    await shoot(page, `${folder}/60-mensili.png`, 'Clienti mensili', 'Tema scuro', 'Mese corrente', true)
    await open(page, '/listino', page.getByRole('heading', { name: 'Listino prezzi' }))
    await shoot(page, `${folder}/70-listino.png`, 'Listino', 'Tema scuro', 'Tabella e file', true)
  })
  await run('scuro impostazioni', async () => {
    await open(page, '/impostazioni', page.getByRole('heading', { name: 'Impostazioni' }))
    await shoot(page, `${folder}/80-impostazioni.png`, 'Impostazioni', 'Tema scuro', 'Pagina intera', true)
    await page.getByRole('button', { name: 'Modifica attività' }).click()
    await page.getByRole('dialog', { name: 'Attività' }).waitFor()
    await shoot(page, `${folder}/81-impostazioni-attivita.png`, 'Attività', 'Tema scuro', 'Foglio attività')
    await open(page, '/impostazioni/servizi', page.getByRole('heading', { name: 'Servizi e durate' }))
    await shoot(page, `${folder}/85-servizi.png`, 'Servizi', 'Tema scuro', 'Elenco', true)
  })
  await run('scuro appuntamento', async () => {
    await open(page, '/appuntamenti/ap-luna-oggi', page.getByRole('dialog', { name: 'Appuntamento' }))
    await shoot(page, `${folder}/90-appuntamento.png`, 'Appuntamento', 'Tema scuro', 'Luna, oggi alle 15:30')
    await open(page, '/appuntamenti/nuovo', page.getByRole('dialog', { name: 'Nuovo appuntamento' }))
    await shoot(page, `${folder}/91-appuntamento-nuovo.png`, 'Nuovo appuntamento', 'Tema scuro', 'Modulo vuoto')
  })
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]))
}

async function writeIndex() {
  const sections = []
  for (const item of catalog) {
    const found = sections.find((section) => section.name === item.section)
    if (found) found.items.push(item)
    else sections.push({ name: item.section, items: [item] })
  }
  for (const section of sections) section.items.sort((a, b) => a.file.localeCompare(b.file, 'it'))
  const sectionOrder = ['Accesso', 'Home', 'Animali', 'Scheda cane', 'Calendario', 'Mensili', 'Listino', 'Impostazioni', 'Appuntamento', 'Kit', 'Tema scuro']
  sections.sort((a, b) => sectionOrder.indexOf(a.name) - sectionOrder.indexOf(b.name))
  const body = sections.map((section) => `
    <section id="${escapeHtml(section.name.toLocaleLowerCase('it-IT').replace(/\s+/g, '-'))}">
      <h2>${escapeHtml(section.name)}</h2>
      <div class="grid">
        ${section.items.map((item) => `
          <figure>
            <a href="${escapeHtml(item.file)}"><img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.title)}"></a>
            <figcaption>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.detail)}</span>
              <code>${escapeHtml(item.file)}</code>
            </figcaption>
          </figure>`).join('')}
      </div>
    </section>`).join('')
  const missing = failures.length === 0 ? '' : `<section><h2>Non riuscite</h2><ul>${failures.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Groomly, schermate</title>
  <style>
    body { margin: 0; font: 16px/1.45 system-ui, sans-serif; background: #f4f1ea; color: #241f1a; }
    header, section { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
    header { padding: 28px 0 8px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 28px 0 12px; font-size: 20px; }
    p { margin: 0; max-width: 68ch; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    figure { margin: 0; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 0 rgba(0,0,0,.06); }
    img { width: 100%; height: auto; display: block; background: #ddd; }
    figcaption { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px 12px; }
    code { color: #75685c; font-size: 12px; }
    ul { padding-left: 18px; }
  </style>
</head>
<body>
  <header>
    <h1>Schermate Groomly</h1>
    <p>Foto reali dell’app, larghezza telefono 390px, dati di esempio al 10 ottobre 2026. Apri questo file nel browser. Le immagini stanno in <code>chiaro/</code> e <code>scuro/</code>. <code>indice.json</code> elenca file, titolo e route per rivederle con Claude.</p>
  </header>
  ${body}
  ${missing}
</body>
</html>`
  await writeFile(join(root, 'index.html'), html)
  await writeFile(join(root, 'indice.json'), JSON.stringify({ capturedAt: '2026-10-10', viewport: '390x844', scale: 2, failures, screens: catalog }, null, 2))
}

if (solo.size > 0) {
  try {
    const previous = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(join(root, 'indice.json'), 'utf8')))
    if (Array.isArray(previous.screens)) catalog.push(...previous.screens)
  } catch { /* prima esecuzione */ }
}

if (process.argv.includes('--solo-indice')) {
  catalog.length = 0
  const { readFile } = await import('node:fs/promises')
  const previous = JSON.parse(await readFile(join(root, 'indice.json'), 'utf8'))
  for (const screen of previous.screens) {
    if (screen.file === 'chiaro/10-home-basso.png') continue
    catalog.push(screen)
  }
  await writeIndex()
  process.exit(0)
}

const browser = await chromium.launch({ executablePath: chrome, headless: true })
await mkdir(join(root, 'chiaro'), { recursive: true })
await mkdir(join(root, 'scuro'), { recursive: true })
try {
  if (solo.size === 0) await captureLogin(browser)
  const light = await phoneContext(browser, 'light')
  const updates = await blockUpdates(light)
  await light.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, buildPayload('light'))
  const lightPage = await light.newPage()
  bind(lightPage)
  await captureLight(lightPage, updates)
  await light.close()

  if (solo.size === 0) {
  const dark = await phoneContext(browser, 'dark')
  await blockUpdates(dark)
  await dark.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value)
  }, buildPayload('dark'))
  const darkPage = await dark.newPage()
  bind(darkPage)
  await captureDark(darkPage)
  await dark.close()
  }
} finally {
  await browser.close()
  await writeIndex()
}

console.log(`schermate ${catalog.length}, errori ${failures.length}`)
if (failures.length) {
  for (const failure of failures) console.log(' -', failure)
  process.exitCode = 1
}
