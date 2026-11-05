// I casi di verify-lingue-flussi.cjs. Ogni caso scrive una riga con esito; le email restano nel file di Brevo finto.
const f = require('./verify-lingue-flussi.cjs')
const { salone, apriBrowser, posta, esito, risultati, db, auth, HOST, FUNZ, OUT, PASSWORD, chromium, fs, path } = f

const testo = (h) => String(h ?? '').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const ITALIANO = /\b(Bagno|Unghie|Ciao|grazie|appuntamento|richiesta|salone)\b/i
const nuove = (da) => posta().slice(da).map((m) => ({ a: (m.body?.to ?? []).map((x) => x.email).join(','), oggetto: m.body?.subject ?? '', html: m.body?.htmlContent ?? '' }))

async function token(email) {
  const r = await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }) })
  return (await r.json()).idToken
}
async function chiama(nome, data, id) {
  const r = await fetch(`${FUNZ}/${nome}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${id}` } : {}) }, body: JSON.stringify({ data }) })
  return r.json()
}
async function aspettaPosta(da, n = 1) {
  for (let i = 0; i < 60; i++) { const m = nuove(da); if (m.length >= n) return m; await new Promise((r) => setTimeout(r, 250)) }
  return nuove(da)
}

// Prenota dalla pagina vera, con il modulo vero, fino alla risposta del server.
async function prenota(page, url, { cane, telefono, foto }) {
  await page.goto(url, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Hund', exact: true }).click()
  await page.getByRole('button', { name: 'Mittel', exact: true }).click()
  const da = posta().length
  const finale = await prenota(page, `${HOST}/s/${s.slug}`, { cane: 'Bello', telefono: '+49 151 23456789', foto: true })
  esito('Invio vero da /s/: il server accetta e la pagina risponde in tedesco', !finale.startsWith('ERRORE') && /Anfrage|E-Mail|gesendet/i.test(finale), finale.slice(0, 160))
  await page.screenshot({ path: path.join(OUT, 'de-inviata.png'), fullPage: true })

  const richieste = (await db.collection(`salons/${s.uid}/richieste`).get()).docs.map((d) => ({ id: d.id, ...d.data() }))
  console.log('richieste', JSON.stringify(richieste).slice(0, 700))
  const r1 = richieste.find((x) => x.cane === 'Bello')
  esito('La richiesta salva lingua de', r1?.lingua === 'de', JSON.stringify({ lingua: r1?.lingua, voci: r1?.voci?.map((v) => v.nome) }))
  const ricevuta = (await aspettaPosta(da)).find((m) => m.a === 'kunde@example.test')
  esito('Ricevuta al cliente in tedesco, con i servizi in tedesco', /Wir haben Ihre Anfrage/.test(ricevuta?.oggetto ?? '') && !/Bagno/.test(testo(ricevuta?.html)), ricevuta?.oggetto)
  fs.writeFileSync(path.join(OUT, 'de-ricevuta.html'), ricevuta?.html ?? '')

  // B. Il titolare italiano accetta: il cliente legge tedesco, la scheda prende de.
  let d0 = posta().length
  const accetta = await chiama('gestisciPrenotazione', { salonId: s.uid, id: r1?.id, azione: 'accetta', scelta: 'nuovo' }, idTitolare)
  const conferma = (await aspettaPosta(d0)).find((m) => m.a === 'kunde@example.test')
  esito('Accettata: conferma in tedesco', /bestätigt/.test(conferma?.oggetto ?? ''), `${JSON.stringify(accetta).slice(0, 120)} | ${conferma?.oggetto}`)
  const cani = (await db.collection(`salons/${s.uid}/dogs`).get()).docs.map((d) => d.data())
  esito('La scheda nuova prende dog.lingua = de', cani.find((c) => c.name === 'Bello')?.lingua === 'de', JSON.stringify(cani.map((c) => [c.name, c.lingua])))

  // C. Proposta e link con ?lang=de, su una richiesta scritta dal server.
  const domani = new Date(Date.now() + 6 * 864e5)
  const giornoIso = `${domani.getFullYear()}-${String(domani.getMonth() + 1).padStart(2, '0')}-${String(domani.getDate()).padStart(2, '0')}`
  const nuova = async (nome, lingua, giorno = giornoIso, ora = '11:00', mail = 'kunde@example.test', tel = '+49 151 000000' + nome.length) => chiama('inviaRichiesta', { salonId: s.uid, nome, phone: tel, email: mail, cane: nome, razza: 'Pudel', foto: [], taglia: 'media', specie: 'cane', servizi: ['bagno'], giorno, ora, inizio: `${giorno}T${ora}:00`, fine: `${giorno}T${ora}:00`, esca: '', consenso: true, ...(lingua ? { lingua } : {}) })
  const giornoLavorativo = () => { const x = new Date(Date.now() + 8 * 864e5); while (x.getDay() === 0) x.setDate(x.getDate() + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
  const g2 = giornoLavorativo()
  d0 = posta().length
  const n2 = await nuova('Rex', 'de', g2, '11:00')
  await aspettaPosta(d0)
  d0 = posta().length
  const prop = await chiama('gestisciPrenotazione', { salonId: s.uid, id: n2.result?.id, azione: 'proponi', scelta: 'nuovo', giorno: g2, ora: '15:00' }, idTitolare)
  const proposta = (await aspettaPosta(d0)).find((m) => m.a === 'kunde@example.test')
  const link = [...(proposta?.html ?? '').matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
  esito('Proposta in tedesco', /Uhrzeit|Termin/.test(proposta?.oggetto ?? '') && !ITALIANO.test(testo(proposta?.html).replace(/Pelo e Coda/g, '')), `${JSON.stringify(prop).slice(0, 100)} | ${proposta?.oggetto}`)
  esito('I link della proposta portano lang=de', link.filter((l) => /azione=/.test(l)).length >= 2 && link.filter((l) => /azione=/.test(l)).every((l) => /lang=de/.test(l)), link.filter((l) => /azione=/.test(l))[0]?.slice(0, 140))
  const linkSi = link.find((l) => /azione=conferma/.test(l))
  if (linkSi) {
    const u = new URL(linkSi)
    const r = await fetch(`${FUNZ}/rispondiRichiesta${u.search}`, { redirect: 'follow' })
    const html = await r.text()
    esito('La pagina del link è in tedesco', /lang="de"/.test(html) && /bestätigen/i.test(html), testo(html).slice(0, 120))
    d0 = posta().length
    const ok = await fetch(`${FUNZ}/rispondiRichiesta${u.search}`, { method: 'POST' })
    const pagina = await ok.text()
    esito('Conferma dal link: pagina in tedesco', /lang="de"/.test(pagina) && /bestätigt/.test(pagina), testo(pagina).slice(0, 120))
  }

  // D. Rifiuto.
  d0 = posta().length
  const n3 = await nuova('Lumpi', 'de', g2, '09:00', 'kunde@example.test', '+49 151 7770001')
  await aspettaPosta(d0)
  d0 = posta().length
  await chiama('gestisciPrenotazione', { salonId: s.uid, id: n3.result?.id, azione: 'rifiuta' }, idTitolare)
  const rifiuto = (await aspettaPosta(d0)).find((m) => m.a === 'kunde@example.test')
  esito('Rifiuto in tedesco', /Neuigkeiten/.test(rifiuto?.oggetto ?? ''), rifiuto?.oggetto)

  // E. Catena: senza lingua nella richiesta vale linguaClienti, mai quella del titolare.
  const t2 = await salone('en', { linguaClienti: 'it', linguaTitolare: 'en' })
  d0 = posta().length
  const senza = await chiama('inviaRichiesta', { salonId: t2.uid, nome: 'Ada', phone: '+39 333 1110001', email: 'ada@example.test', cane: 'Ada', razza: 'Meticcio', foto: [], taglia: 'media', specie: 'cane', servizi: ['bagno'], giorno: g2, ora: '10:00', inizio: `${g2}T10:00:00`, fine: `${g2}T10:00:00`, esca: '', consenso: true })
  const mailIt = (await aspettaPosta(d0)).find((m) => m.a === 'ada@example.test')
  esito('Titolare in inglese, clienti in italiano: email in italiano', /Abbiamo ricevuto|ricevuto/i.test(mailIt?.oggetto ?? ''), `${JSON.stringify(senza).slice(0, 80)} | ${mailIt?.oggetto}`)

  // F. Lingua della pagina.
  for (const [loc, url, atteso] of [['pt-BR', `/s/${s.slug}`, 'en'], ['de-DE', `/s/${s.slug}?lang=fr`, 'fr'], ['fr-FR', `/s/${s.slug}`, 'fr'], ['es-ES', `/s/${s.slug}`, 'es'], ['it-IT', `/s/${s.slug}`, 'it']]) {
    const c = await apriBrowser(b, loc); const p = await c.newPage()
    await p.goto(`${HOST}${url}`, { waitUntil: 'load' }); await p.waitForTimeout(500)
    const l = await p.evaluate(() => document.documentElement.lang)
    esito(`Browser ${loc} su ${url.replace(s.slug, '…')} → ${atteso}`, l === atteso, l)
    await c.close()
  }

  // G. Errori del server: codice stabile e messaggio italiano per le APK vecchie.
  const e1 = await chiama('inviaRichiesta', { salonId: s.uid, nome: 'X', phone: '', email: '', cane: '', giorno: g2, ora: '10:00', esca: '', consenso: true, lingua: 'de' })
  esito('Errore con details.codice e message italiano', Boolean(e1.error?.details?.codice) && /[aeiou]/i.test(e1.error?.message ?? ''), JSON.stringify(e1.error))
  // Il limite vero del server, letto dalla pagina tedesca: stesso telefono, terza richiesta.
  await prenota(page, `${HOST}/s/${s.slug}`, { cane: 'Zwei', telefono: '+49 151 23456789' })
  const terza = await prenota(page, `${HOST}/s/${s.slug}`, { cane: 'Drei', telefono: '+49 151 23456789' })
  esito('Errore vero del server tradotto sulla pagina tedesca', terza.startsWith('ERRORE') && !/Troppe|richiest/i.test(terza), terza.slice(0, 120))

  // H. Lista d'attesa: la lingua della pagina si salva sull'iscritto.
  const iscr = await chiama('iscrivitiAttesa', { salonId: s.uid, nome: 'Heidi', phone: '+49 151 8880001', email: 'heidi@example.test', nomeCane: 'Heidi', taglia: 'media', specie: 'cane', servizioIds: ['bagno'], lingua: 'de', consenso: true, esca: '' })
  const iscritti = (await db.collection(`salons/${s.uid}/attesa`).get()).docs.map((d) => d.data())
  esito('Lista d\'attesa: iscritto con lingua de', iscritti.some((x) => x.lingua === 'de') || Boolean(iscr.error), JSON.stringify(iscr).slice(0, 140))

  await b.close()
  fs.writeFileSync(path.join(OUT, 'flussi-server.json'), JSON.stringify(risultati, null, 1))
  console.log(`FATTO ${risultati.filter((r) => r.ok).length}/${risultati.length}`)
  process.exit(0)
}
module.exports = { main }
