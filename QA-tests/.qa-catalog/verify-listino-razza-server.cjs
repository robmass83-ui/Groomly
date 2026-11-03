// Verifica media 23 (seguito server) — solo emulatore demo-groomly, funzioni compilate.
// Salone di prova con listino «Yorkshire» bagno 25 € e servizio Bagno 20/25/30 (piccola/media/grande). Casi:
// (1) richiesta Yorkshire taglia piccola accettata con cane nuovo → visita a 25;
// (2) richiesta accettata e collegata a un cane esistente con prezzo personale bagno 18 → 18;
// (3) richiesta con proposta di orario poi confermata: sia la visita nata dalla proposta sia la conferma che
//     sostituisce il segnaposto «Prenotazione» → 25;
// (4) lista d'attesa, iscritto che corrisponde (email + nome) a uno Yorkshire esistente taglia piccola → 25 (non 20);
// (5) lista d'attesa, cane nuovo taglia media → 25 (prezzo per taglia), totale e voci dell'iscritto invariati.
// Brevo finto: fetch globale intercettato, nessuna richiesta lascia la macchina.
// Uso: node QA-tests/.qa-catalog/verify-listino-razza-server.cjs [--keep]  (dopo `npm --prefix functions run build`)
const path = require('path')
const req = require('module').createRequire(path.resolve('functions/package.json'))
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'; process.env.GCLOUD_PROJECT = 'demo-groomly'
delete process.env.FUNCTIONS_EMULATOR
req('./lib/functions/src/index.js')
const firestoreMod = req('firebase-admin/firestore'); const { getAuth } = req('firebase-admin/auth')
const db = firestoreMod.getFirestore(); const auth = getAuth()
const { gestisciPrenotazionePer, leggiRichiesta, applicaPiano } = req('./lib/functions/src/piano/gestisciPrenotazione.js')
const { confermaAttesaPer } = req('./lib/functions/src/piano/confermaAttesa.js')
const { pianoRichiesta } = req('./lib/src/lib/pianoRichiesta.js')
const { istanteRoma, chiaveGiornoRoma } = req('./lib/src/lib/disponibilita.js')

const API_KEY = 'chiave-finta-qa'
const KEEP = process.argv.includes('--keep')
const STAMP = Date.now().toString(36)
const EMAIL_TITOLARE = `qa-lr-${STAMP}@test.groomly`
const EMAIL_CLIENTE = `cliente-lr-${STAMP}@example.test`
const EMAIL_ISCRITTO = `iscritto-lr-${STAMP}@example.test`
const SLUG = `qa-lr-${STAMP}`

const fetchVero = globalThis.fetch
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.brevo.com')) return new Response('{"messageId":"finto"}', { status: 201, headers: { 'content-type': 'application/json' } })
  return fetchVero(url, init)
}

const giornoTra = (n) => chiaveGiornoRoma(new Date(Date.now() + n * 86400000))
const ORARI = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((g) => [String(g), [{ da: '09:00', a: '18:00' }]]))
const VOCE = [{ id: 'bagno', nome: 'Bagno', kind: 'principale', minuti: 60, prezzo: 20 }]

async function creaSalone() {
  const u = await auth.createUser({ email: EMAIL_TITOLARE, password: 'Test1234!', emailVerified: true })
  const uid = u.uid
  await db.doc(`accounts/${uid}`).set({ uid, email: EMAIL_TITOLARE, salonId: uid, role: 'titolare', firstName: 'Listino', lastName: 'QA', createdAt: '2020-01-01T00:00:00.000Z' })
  await db.doc(`salons/${uid}/settings/main`).set({
    business: { salonName: 'Salone Listino QA', name: 'Salone Listino QA', phone: '+39 333 1112223', address: 'Via Prova 1, Roma' },
    orari: ORARI, prenotazioniOnline: true, linguaClienti: 'it', updatedAt: '2026-01-01T00:00:00.000Z',
    serviziEmail: { attesa: { modo: 'manuale' } },
    priceSheet: { razze: [{ id: 'yorkshire', nome: 'Yorkshire', taglia: 'piccola', voci: [{ id: 'y-bagno', nome: 'Bagno', tipo: 'fisso', prezzo: 25, servizioId: 'bagno' }] }] },
  })
  await db.doc(`salons/${uid}/pro/main`).set({ piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null })
  await db.doc(`salons/${uid}/services/bagno`).set({
    id: 'bagno', name: 'Bagno', active: true, kind: 'principale', price: { piccola: 20, media: 25, grande: 30 },
    duration: { piccola: 60, media: 60, grande: 60 },
  })
  await db.doc(`pubblici/${SLUG}`).set({ salonId: uid, nome: 'Salone Listino QA' })
  return uid
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
    esiti.push({ caso: nome, ok, dettagli })
  } catch (e) {
    esiti.push({ caso: nome, ok: false, dettagli: { errore: e && e.message ? e.message : String(e) } })
  }
  const e = esiti[esiti.length - 1]
  console.log(`${e.ok ? 'OK   ' : 'FAIL '} ${e.caso} ${JSON.stringify(e.dettagli)}`)
}

const prezzi = (v) => (v && v.services ? v.services.map((s) => s.price) : [])

;(async () => {
  let uid = ''
  try {
    uid = await creaSalone()
    const base = `salons/${uid}`
    const richiesta = async (id, extra) => {
      const inizio = istanteRoma(giornoTra(extra.giorno), extra.ora)
      await db.doc(`${base}/richieste/${id}`).set({
        status: 'nuova', email: EMAIL_CLIENTE, phone: '+39 333 9998887', nome: 'Carla Cliente', cane: 'Briciola',
        razza: 'Yorkshire', specie: 'cane', taglia: 'piccola', foto: [], start: inizio.toISOString(),
        end: new Date(inizio.getTime() + 3600000).toISOString(), token: `tok-${id}-${STAMP}-xxxxxxxx`, durataMin: 60,
        emailStato: 'inviata', consenso: true, consensoIl: new Date().toISOString(), voci: VOCE, totaleIndicativo: 20,
        ...(extra.campi || {}),
      })
    }
    const visita = async (id) => (await db.doc(`${base}/appointments/${id}`).get()).data()

    await caso('(1) accettata, cane nuovo Yorkshire piccola -> 25', async () => {
      await richiesta('r1', { giorno: 10, ora: '10:00' })
      const r = await gestisciPrenotazionePer({ salonId: uid, id: 'r1', azione: 'accetta', scelta: 'nuovo', giorno: '', ora: '' }, API_KEY)
      const v = r.ok ? await visita(r.appointmentId) : null
      return { ok: r.ok === true && JSON.stringify(prezzi(v)) === '[25]', dettagli: { esito: r, prezzi: prezzi(v) } }
    })

    await caso('(2) accettata su cane esistente con prezzo personale 18 -> 18', async () => {
      await db.doc(`${base}/dogs/cane-pers`).set({ id: 'cane-pers', name: 'Briciola', breed: 'Yorkshire', size: 'piccola', status: 'attivo', contact: { email: EMAIL_CLIENTE }, servicePrices: [{ serviceId: 'bagno', price: 18 }] })
      await richiesta('r2', { giorno: 11, ora: '10:00', campi: { sceltaAnimale: 'cane-pers' } })
      const r = await gestisciPrenotazionePer({ salonId: uid, id: 'r2', azione: 'accetta', scelta: 'cane-pers', giorno: '', ora: '' }, API_KEY)
      const v = r.ok ? await visita(r.appointmentId) : null
      return { ok: r.ok === true && JSON.stringify(prezzi(v)) === '[18]', dettagli: { esito: r, prezzi: prezzi(v) } }
    })

    await caso('(3) proposta di orario poi confermata -> 25 (anche sostituendo il segnaposto)', async () => {
      const g = giornoTra(12)
      await richiesta('r3', { giorno: 10, ora: '14:00' })
      const prop = await gestisciPrenotazionePer({ salonId: uid, id: 'r3', azione: 'proponi', scelta: 'nuovo', giorno: g, ora: '11:00' }, API_KEY)
      const dopoProposta = (await db.doc(`${base}/richieste/r3`).get()).data()
      const vProposta = prop.ok ? await visita(dopoProposta.appointmentId) : null
      // Conferma del cliente, come rispondiRichiestaHttp (link «conferma» della mail).
      const adesso = new Date()
      const ric = leggiRichiesta(dopoProposta)
      const piano = pianoRichiesta({ richiesta: ric, comando: { azione: 'confermaCliente' }, token: dopoProposta.token, adesso, orarioLibero: false, animaleArchivio: false })
      const sc = piano.ok ? await applicaPiano({ salonId: uid, id: 'r3', richiesta: ric, piano, adesso }) : { ok: false, errore: piano.errore }
      const vConf = sc.ok ? await visita(ric.appointmentId) : null
      // Segnaposto: visita col solo «Prenotazione» a 0, la conferma la sostituisce.
      await richiesta('r3b', { giorno: 10, ora: '16:00' })
      const scade = new Date(Date.now() + 86400000).toISOString()
      await db.doc(`${base}/appointments/seg`).set({ id: 'seg', dogId: '', start: istanteRoma(giornoTra(14), '10:00').getTime(), end: istanteRoma(giornoTra(14), '11:00').getTime(), status: 'programmato', kind: 'pelosetto', provvisorio: true, scadeIl: scade, services: [{ serviceId: 'prenotazione', name: 'Prenotazione', durationMin: 60, price: 0 }] })
      await db.doc(`${base}/richieste/r3b`).set({ status: 'proposta', appointmentId: 'seg', scadeIl: scade, sceltaAnimale: 'nuovo' }, { merge: true })
      const ric2 = leggiRichiesta((await db.doc(`${base}/richieste/r3b`).get()).data())
      const piano2 = pianoRichiesta({ richiesta: ric2, comando: { azione: 'confermaCliente' }, token: ric2.token, adesso, orarioLibero: false, animaleArchivio: false })
      const sc2 = piano2.ok ? await applicaPiano({ salonId: uid, id: 'r3b', richiesta: ric2, piano: piano2, adesso }) : { ok: false, errore: piano2.errore }
      const vSeg = sc2.ok ? await visita('seg') : null
      const ok = prop.ok === true && JSON.stringify(prezzi(vProposta)) === '[25]' && sc.ok === true && JSON.stringify(prezzi(vConf)) === '[25]'
        && sc2.ok === true && JSON.stringify(prezzi(vSeg)) === '[25]'
      return { ok, dettagli: { proposta: prop, prezziProposta: prezzi(vProposta), conferma: sc, prezziConferma: prezzi(vConf), confermaSegnaposto: sc2, prezziSegnaposto: prezzi(vSeg) } }
    })

    // Lista d'attesa: posto disdetto + offerta + iscritto.
    const posto = async (n, iscritto, giorno) => {
      const inizio = istanteRoma(giornoTra(giorno), '10:00')
      const token = `tokattesa${n}${STAMP}`.padEnd(24, 'x')
      await db.doc(`${base}/appointments/v${n}`).set({ id: `v${n}`, dogId: 'd0', start: inizio.getTime(), end: inizio.getTime() + 3600000, status: 'disdetto', services: [] })
      await db.doc(`${base}/buchiAttesa/v${n}`).set({ appointmentId: `v${n}`, inizio: inizio.toISOString(), nomeCane: 'Luna' })
      await db.doc(`${base}/offerteAttesa/attesa:v${n}:i${n}`).set({ token, appointmentId: `v${n}`, iscrittoId: `i${n}`, inizio: inizio.toISOString(), inviataIl: new Date().toISOString() })
      await db.doc(`${base}/attesa/i${n}`).set({
        attivo: true, nome: 'Mario', phone: '+3900000000', specie: 'cane', servizioId: 'bagno', trattamento: 'Bagno', durataMin: 60,
        creatoIl: new Date().toISOString(), ...iscritto,
      })
      return token
    }
    const confermaAttesa = (token) => confermaAttesaPer({ salonId: uid, token, azione: 'conferma', adesso: new Date() })

    await caso('(4) attesa: iscritto = Yorkshire esistente piccola (email + nome) -> 25 (non 20)', async () => {
      await db.doc(`${base}/dogs/cane-york`).set({ id: 'cane-york', name: 'Rex', breed: 'Yorkshire', size: 'piccola', status: 'attivo', contact: { email: EMAIL_ISCRITTO }, servicePrices: [] })
      const token = await posto(1, { nomeCane: 'Rex', email: EMAIL_ISCRITTO, taglia: 'piccola' }, 15)
      const r = await confermaAttesa(token)
      const v = r.ok && r.esito === 'confermato' ? await visita(r.appointmentId) : null
      return { ok: r.ok === true && r.esito === 'confermato' && v.dogId === 'cane-york' && JSON.stringify(prezzi(v)) === '[25]', dettagli: { esito: r, dogId: v && v.dogId, prezzi: prezzi(v) } }
    })

    await caso('(5) attesa: cane nuovo taglia media -> 25 (taglia), totale e voci invariati', async () => {
      const token = await posto(2, { nomeCane: 'Nuvola', email: `nuovo-${STAMP}@example.test`, taglia: 'media', totaleIndicativo: 99, voci: VOCE }, 16)
      const r = await confermaAttesa(token)
      const v = r.ok && r.esito === 'confermato' ? await visita(r.appointmentId) : null
      const iscritto = (await db.doc(`${base}/attesa/i2`).get()).data()
      const invariati = iscritto.totaleIndicativo === 99 && JSON.stringify(iscritto.voci) === JSON.stringify(VOCE)
      return { ok: r.ok === true && r.esito === 'confermato' && JSON.stringify(prezzi(v)) === '[25]' && invariati, dettagli: { esito: r, prezzi: prezzi(v), totaleEVociInvariati: invariati } }
    })
  } finally {
    if (uid && !KEEP) await cancella(uid)
    else if (uid) console.log(`--keep: salone ${uid}, account ${EMAIL_TITOLARE}`)
  }
  const ok = esiti.filter((e) => e.ok).length
  console.log(`\n${ok}/${esiti.length} OK`)
  process.exit(ok === esiti.length && esiti.length === 5 ? 0 : 2)
})().catch((e) => { console.error(e); process.exit(1) })
