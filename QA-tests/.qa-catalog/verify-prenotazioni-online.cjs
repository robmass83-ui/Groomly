// Verifica medie «Prenotazioni online» (audit 5, 6, 7, 9) — solo emulatore demo-groomly, funzioni compilate.
// Crea un salone di prova (account, impostazioni, piano), poi:
// (a) gestisciPrenotazionePer accetta una richiesta con prenotazioniOnline false → ok, visita creata;
// (b) uguale con il piano tolto;
// (c) postiLiberiPer dal cliente a prenotazioni spente → «Prenotazioni spente»;
// (d) servizio da 240 minuti → solo orari che finiscono entro la chiusura (09:00-18:00);
// (e) scadiProposteScadute su una «nuova» di ieri → «scaduta», emailStato registrato, mail a Brevo verso il cliente;
// (f) paginaPubblicaHttp a prenotazioni spente → nessun mailto: né email dell'account, il telefono sì;
// (g) la callable postiLiberi vera (handler compilato di index.js, come la chiama «Proponi un altro orario» in Home: 42 giorni)
//     a prenotazioni spente e senza piano: il titolare autenticato riceve gli orari, anonimo e titolare di un altro salone «Prenotazioni spente».
// Brevo finto: chiave finta e fetch globale intercettato, nessuna richiesta lascia la macchina.
// scadiProposteScadute scorre tutti i saloni: qui l'elenco dei saloni è ristretto a quello di prova, così i dati seminati restano intatti.
// Con --browser (app Vite in modo emu su 127.0.0.1:5173): un titolare Go appena creato (nessun piano) con una richiesta «nuova» futura
// scritta con firebase-admin entra e trova la richiesta in Home; screenshot in QA-tests/results/prenotazioni-online/.
// Uso: node QA-tests/.qa-catalog/verify-prenotazioni-online.cjs [--browser]  (dopo `cd functions && npx tsc`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
// index.js inizializza da sé l'app admin: initializeApp() senza argomenti, progetto da GCLOUD_PROJECT (demo-groomly), come faceva lo script.
// Fuori dal ramo FUNCTIONS_EMULATOR: la credenziale finta di quel ramo non basta a getFirestore() fuori dal runtime delle funzioni.
delete process.env.FUNCTIONS_EMULATOR
const { postiLiberi: postiLiberiCallable } = req('./lib/functions/src/index.js')
const firestoreMod = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = firestoreMod.getFirestore(); const auth = getAuth()
const { postiLiberiPer } = req('./lib/functions/src/piano/postiLiberi.js')
const { gestisciPrenotazionePer } = req('./lib/functions/src/piano/gestisciPrenotazione.js')
const { scadiProposteScadute } = req('./lib/functions/src/piano/scadiProposte.js')
const { paginaPubblicaHttp } = req('./lib/functions/src/piano/paginaPubblica.js')
const { istanteRoma, chiaveGiornoRoma } = req('./lib/src/lib/disponibilita.js')

const API_KEY = 'chiave-finta-qa'
const STAMP = Date.now().toString(36)
const EMAIL_TITOLARE = `qa-po-${STAMP}@test.groomly`
const EMAIL_CLIENTE = `cliente-po-${STAMP}@example.test`
const SLUG = `qa-po-${STAMP}`

// Brevo finto: registra le richieste a api.brevo.com e risponde 201; il resto passa.
const mailBrevo = []
const fetchVero = globalThis.fetch
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.brevo.com')) {
    mailBrevo.push({ url: String(url), apiKey: init?.headers?.['api-key'], body: JSON.parse(init?.body ?? '{}') })
    return new Response('{"messageId":"finto"}', { status: 201, headers: { 'content-type': 'application/json' } })
  }
  return fetchVero(url, init)
}

const saloniDiProva = new Set()
const listaVera = firestoreMod.CollectionReference.prototype.listDocuments
firestoreMod.CollectionReference.prototype.listDocuments = async function (...a) {
  const docs = await listaVera.apply(this, a)
  return this.path === 'salons' ? docs.filter((d) => saloniDiProva.has(d.id)) : docs
}

const giornoTra = (n) => chiaveGiornoRoma(new Date(Date.now() + n * 86400000))
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const PIANO = { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null }

async function creaSalone() {
  const u = await auth.createUser({ email: EMAIL_TITOLARE, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  saloniDiProva.add(uid)
  await db.doc(`accounts/${uid}`).set({ uid, email: EMAIL_TITOLARE, salonId: uid, role: 'titolare', firstName: 'Prenota', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({
    business: { salonName: 'Salone Prenota QA', name: 'Salone Prenota QA', phone: '+39 333 1112223', address: 'Via Prova 1, Roma' },
    orari: ORARI, prenotazioniOnline: false, linguaClienti: 'it', updatedAt: '2026-01-01T00:00:00.000Z',
  })
  await db.doc(`salons/${uid}/pro/main`).set(PIANO)
  await db.doc(`pubblici/${SLUG}`).set({ salonId: uid, nome: 'Salone Prenota QA' })
  return uid
}

async function richiesta(salonId, id, inizio, minuti = 60) {
  const fine = new Date(inizio.getTime() + minuti * 60000)
  await db.doc(`salons/${salonId}/richieste/${id}`).set({
    status: 'nuova', email: EMAIL_CLIENTE, phone: '+39 333 9998887', nome: 'Carla Cliente', cane: 'Briciola', razza: 'Meticcio',
    specie: 'cane', taglia: 'media', foto: [], start: inizio.toISOString(), end: fine.toISOString(), token: `tok-${id}-${STAMP}`,
    durataMin: minuti, emailStato: 'inviata', consenso: true, consensoIl: new Date().toISOString(),
  })
}

async function cancella(uid) {
  await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
  await db.doc(`accounts/${uid}`).delete().catch(() => {})
  await db.doc(`pubblici/${SLUG}`).delete().catch(() => {})
  await auth.deleteUser(uid).catch(() => {})
}

const esiti = []
async function caso(nome, fn) {
  try {
    const { ok, dettagli } = await fn()
    esiti.push({ caso: nome, esito: ok ? 'OK' : 'FALLITO', dettagli })
  } catch (e) {
    esiti.push({ caso: nome, esito: 'FALLITO', dettagli: { errore: e && e.message ? e.message : String(e) } })
  }
}

;(process.argv.includes('--browser') ? provaBrowser() : (async () => {
  let uid = ''
  try {
    uid = await creaSalone()
    const giorno = giornoTra(10)
    const settings = db.doc(`salons/${uid}/settings/main`)
    const pro = db.doc(`salons/${uid}/pro/main`)

    await caso('(a) accetta con prenotazioniOnline false', async () => {
      await richiesta(uid, 'qa-po-a', istanteRoma(giorno, '10:00'))
      const r = await gestisciPrenotazionePer({ salonId: uid, id: 'qa-po-a', azione: 'accetta', scelta: 'nuovo', giorno: '', ora: '' }, API_KEY)
      const visita = r.ok ? (await db.doc(`salons/${uid}/appointments/${r.appointmentId}`).get()).data() : null
      const stato = (await db.doc(`salons/${uid}/richieste/qa-po-a`).get()).data().status
      return { ok: r.ok === true && Boolean(visita) && stato === 'accettata', dettagli: { esito: r, visitaCreata: Boolean(visita), inizioVisita: visita && new Date(visita.start).toISOString(), statoRichiesta: stato } }
    })

    await caso('(b) accetta con il piano tolto', async () => {
      await settings.set({ prenotazioniOnline: true }, { merge: true })
      await pro.delete()
      await richiesta(uid, 'qa-po-b', istanteRoma(giorno, '12:00'))
      const r = await gestisciPrenotazionePer({ salonId: uid, id: 'qa-po-b', azione: 'accetta', scelta: 'nuovo', giorno: '', ora: '' }, API_KEY)
      const visita = r.ok ? (await db.doc(`salons/${uid}/appointments/${r.appointmentId}`).get()).data() : null
      const stato = (await db.doc(`salons/${uid}/richieste/qa-po-b`).get()).data().status
      return { ok: r.ok === true && Boolean(visita) && stato === 'accettata', dettagli: { pianoPresente: (await pro.get()).exists, esito: r, visitaCreata: Boolean(visita), statoRichiesta: stato } }
    })

    await caso('(c) postiLiberiPer dal cliente a prenotazioni spente', async () => {
      await pro.set(PIANO)
      await settings.set({ prenotazioniOnline: false }, { merge: true })
      const cliente = await postiLiberiPer(uid, giorno, 60).then((r) => ({ orari: r.orari }), (e) => ({ errore: e.message }))
      const salone = await postiLiberiPer(uid, giorno, 60, '', { perSalone: true }).then((r) => ({ orari: r.orari }), (e) => ({ errore: e.message }))
      return { ok: cliente.errore === 'Prenotazioni spente' && Array.isArray(salone.orari) && salone.orari.length > 0, dettagli: { cliente, saloneConPerSalone: salone } }
    })

    await caso('(d) servizio da 240 minuti, chiusura 18:00', async () => {
      await settings.set({ prenotazioniOnline: true }, { merge: true })
      const g = giornoTra(12)
      const { orari } = await postiLiberiPer(uid, g, 240)
      const salone = (await postiLiberiPer(uid, g, 240, '', { perSalone: true })).orari
      const fineOk = orari.every((o) => istanteRoma(g, o).getTime() + 240 * 60000 <= istanteRoma(g, '18:00').getTime())
      const ok = orari.length > 0 && fineOk && orari.includes('14:00') && !orari.includes('15:00') && JSON.stringify(salone) === JSON.stringify(orari)
      return { ok, dettagli: { giorno: g, orari, ultimoInizio: orari[orari.length - 1], tuttiFinisconoEntro18: fineOk, perSaloneUguale: JSON.stringify(salone) === JSON.stringify(orari) } }
    })

    await caso('(e) scadiProposteScadute su una «nuova» di ieri', async () => {
      const ieri = giornoTra(-1)
      await richiesta(uid, 'qa-po-e', istanteRoma(ieri, '10:00'))
      await db.doc(`salons/${uid}/richieste/qa-po-e`).set({ emailStato: 'non_inviata' }, { merge: true })
      const prima = mailBrevo.length
      await scadiProposteScadute(API_KEY, new Date())
      const doc = (await db.doc(`salons/${uid}/richieste/qa-po-e`).get()).data()
      const nuove = mailBrevo.slice(prima)
      const mail = nuove.find((m) => m.body?.to?.[0]?.email === EMAIL_CLIENTE)
      const telefonoInMail = Boolean(mail && mail.body.htmlContent.includes('333 1112223'))
      const ok = doc.status === 'scaduta' && doc.emailStato === 'inviata' && Boolean(mail) && mail.apiKey === API_KEY && telefonoInMail
      return { ok, dettagli: {
        status: doc.status, emailStato: doc.emailStato, mailBrevo: nuove.length,
        destinatario: mail && mail.body.to, oggetto: mail && mail.body.subject, replyTo: mail && mail.body.replyTo,
        contieneTelefonoSalone: telefonoInMail,
      } }
    })

    await caso('(f) pagina pubblica a prenotazioni spente', async () => {
      await settings.set({ prenotazioniOnline: false }, { merge: true })
      let codice = 0; let html = ''
      const res = { status(c) { codice = c; return this }, set() { return this }, send(b) { html = String(b); return this } }
      await paginaPubblicaHttp({ path: `/s/${SLUG}`, query: {} }, res)
      const mailto = html.includes('mailto:')
      const emailAccount = html.toLowerCase().includes(EMAIL_TITOLARE.toLowerCase())
      const telefono = html.includes('333 1112223')
      return { ok: codice === 200 && !mailto && !emailAccount && telefono, dettagli: { http: codice, byte: html.length, mailto, emailAccount, nomeSalone: html.includes('Salone Prenota QA'), telefono } }
    })

    await caso('(g) callable postiLiberi: il salone propone un orario a prenotazioni spente e senza piano', async () => {
      await settings.set({ prenotazioniOnline: false }, { merge: true })
      await pro.delete()
      const altro = `qa-po-altro-${STAMP}`
      await db.doc(`accounts/${altro}`).set({ uid: altro, email: `altro-${STAMP}@test.groomly`, salonId: altro, role: 'titolare' })
      const chiama = (authUid, data) => postiLiberiCallable.run({ data, auth: authUid ? { uid: authUid, token: {} } : undefined, rawRequest: {} })
        .then((r) => r, (e) => ({ errore: e.message }))
      try {
        const home = { salonId: uid, giorno: giornoTra(0), giorni: 42, durataMin: 60 }
        const titolare = await chiama(uid, home)
        const titolareGiorno = await chiama(uid, { salonId: uid, giorno, durataMin: 60 })
        const anonimo = await chiama(null, home)
        const anonimoGiorno = await chiama(null, { salonId: uid, giorno, durataMin: 60 })
        const altroSalone = await chiama(altro, home)
        // Un flag mandato dal client non conta: anche con perSalone nei dati l'anonimo resta fuori.
        const anonimoConFlag = await chiama(null, { ...home, perSalone: true })
        const giorniTitolare = titolare.giorni ? Object.keys(titolare.giorni).length : 0
        const ok = giorniTitolare > 0 && Array.isArray(titolare.giorni[giorno]) && titolare.giorni[giorno].length > 0
          && Array.isArray(titolareGiorno.orari) && titolareGiorno.orari.length > 0
          && anonimo.errore === 'Prenotazioni spente' && anonimoGiorno.errore === 'Prenotazioni spente'
          && altroSalone.errore === 'Prenotazioni spente' && anonimoConFlag.errore === 'Prenotazioni spente'
        return { ok, dettagli: {
          pianoPresente: (await pro.get()).exists,
          titolare: { giorniConOrari: giorniTitolare, orariDelGiorno: titolare.giorni && titolare.giorni[giorno], errore: titolare.errore },
          titolareGiornoSingolo: titolareGiorno, anonimo, anonimoGiorno, altroSalone, anonimoConFlag,
        } }
      } finally {
        await db.doc(`accounts/${altro}`).delete().catch(() => {})
      }
    })
  } finally {
    if (uid) await cancella(uid)
  }
  console.log(JSON.stringify(esiti, null, 1))
  const ok = esiti.filter((e) => e.esito === 'OK').length
  console.log(`\n${ok}/${esiti.length} OK`)
  process.exit(ok === esiti.length && esiti.length === 7 ? 0 : 2)
})()).catch((e) => { console.error(e); process.exit(1) })

// Home di un titolare Go (nessun documento pro/main) con una richiesta «nuova» fra tre giorni.
async function provaBrowser() {
  const fs = require('fs')
  const { chromium } = require('playwright')
  const OUT = path.resolve('QA-tests/results/prenotazioni-online')
  fs.mkdirSync(OUT, { recursive: true })
  const email = `qa-po-go-${STAMP}@test.groomly`
  const u = await auth.createUser({ email, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  let browser = null
  const esito = { titolare: email, piano: 'nessuno (Go)' }
  try {
    await db.doc(`accounts/${uid}`).set({ uid, email, salonId: uid, role: 'titolare', firstName: 'Gina', lastName: 'Go', createdAt: '2020-01-01T00:00:00.000Z' })
    await db.doc(`salons/${uid}/settings/main`).set({
      business: { salonName: 'Salone Go QA', name: 'Salone Go QA', phone: '+39 333 4445556' }, orari: ORARI,
      tourBenvenuto: { stato: 'visto', saltati: [] }, listinoConfermato: true, updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const giorno = giornoTra(3)
    await richiesta(uid, 'qa-po-home', istanteRoma(giorno, '10:00'))
    esito.richiesta = `${giorno} 10:00, Carla Cliente per Briciola`
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 400, height: 860 } })
    await page.goto('http://127.0.0.1:5173/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('Test1234!')
    await page.getByRole('button', { name: 'Entra', exact: true }).click()
    const riga = page.getByRole('button', { name: /Carla chiede per Briciola/ })
    await riga.waitFor({ timeout: 30000 })
    esito.url = new URL(page.url()).pathname
    esito.rigaInHome = (await riga.innerText()).replace(/\s+/g, ' ')
    await page.screenshot({ path: path.join(OUT, 'home-go-richiesta.png') })
    await riga.click()
    await page.getByText('Briciola').nth(1).waitFor({ timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT, 'home-go-richiesta-aperta.png') })
    esito.riquadroAperto = await page.getByRole('dialog').count() > 0
    esito.ok = esito.url === '/' && /Carla chiede per Briciola/.test(esito.rigaInHome)
  } catch (e) {
    esito.ok = false; esito.errore = e && e.message ? e.message.slice(0, 300) : String(e)
  } finally {
    if (browser) await browser.close().catch(() => {})
    await db.recursiveDelete(db.doc(`salons/${uid}`)).catch(() => {})
    await db.doc(`accounts/${uid}`).delete().catch(() => {})
    await auth.deleteUser(uid).catch(() => {})
  }
  console.log(JSON.stringify(esito, null, 1))
  console.log(esito.ok ? '\nbrowser OK' : '\nbrowser FALLITO')
  process.exit(esito.ok ? 0 : 2)
}
