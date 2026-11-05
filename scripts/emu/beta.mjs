// Collaudo della beta (B1) sugli emulatori demo: chiama la logica compilata delle functions (functions/lib),
// perché le callable in emulatore rispondono INTERNAL per la credenziale finta. Saloni finti beta-*, mai salon/shared.
// Uso: npm --prefix functions run build, poi FIRESTORE_EMULATOR_HOST=… FIREBASE_AUTH_EMULATOR_HOST=… node scripts/emu/beta.mjs
import assert from 'node:assert/strict'

const project = process.env.GCLOUD_PROJECT ?? 'demo-groomly'
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Mancano gli emulatori. Mi fermo.')
  process.exit(1)
}
if (!project.startsWith('demo-')) {
  console.error('Project id non demo. Mi fermo.')
  process.exit(1)
}

const { createRequire } = await import('node:module')
const requireFn = createRequire(new URL('../../functions/package.json', import.meta.url))
const { initializeApp } = requireFn('firebase-admin/app')
const { getAuth } = requireFn('firebase-admin/auth')
const { getFirestore } = requireFn('firebase-admin/firestore')
initializeApp({ projectId: project })
const auth = getAuth()
const db = getFirestore()

const lib = (nome) => requireFn(`./lib/functions/src/${nome}.js`)
const { invitaBetaPer } = lib('beta/invitaBeta')
const { rispondiInvitoBetaPer } = lib('beta/rispondiInvitoBeta')
const { revocaBetaPer } = lib('beta/revocaBeta')
const { estendiBetaPer } = lib('beta/estendiBeta')
const { segnaEarlyAdopterPer } = lib('beta/segnaEarlyAdopter')
const { inviaFeedbackBetaPer } = lib('beta/inviaFeedbackBeta')
const { contatoriAdminPer } = lib('beta/contatoriAdmin')
const { segnaAvvisoBetaPer } = lib('beta/segnaAvvisoBeta')
const { scadiInvitiBetaScaduti } = lib('beta/scadiInvitiBeta')
const { mandaAvvisiFineBeta } = lib('beta/avvisiFineBeta')
const { impostaMostraPianiPer } = lib('config/impostaMostraPiani')
const { chiudiProveScadute } = lib('piano/chiudiProve')

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', admin: true }
const T0 = new Date()
const DAY = 86_400_000
const dopo = (giorni) => new Date(T0.getTime() + giorni * DAY)
const SALONI = ['beta-t1', 'beta-t2', 'beta-t3', 'beta-t4', 'beta-t5', 'beta-vip', 'beta-man']
const SOCIO = 'beta-t1-socio'
const posta = []
const finta = async (_k, to, oggetto) => { posta.push({ to, oggetto }) }
let passi = 0

function ok(nome) {
  passi += 1
  console.log(`✓ ${nome}`)
}

async function errore(promessa, messaggio) {
  await assert.rejects(promessa, (e) => e.message === messaggio || (console.error(e.message), false))
}

const leggi = async (percorso) => (await db.doc(percorso).get()).data()

async function pulisci() {
  for (const id of [...SALONI, SOCIO]) {
    try { await auth.deleteUser(id) } catch { /* assente */ }
    await db.recursiveDelete(db.doc(`salons/${id}`))
    await db.recursiveDelete(db.doc(`betaInviti/${id}`))
    await db.doc(`betaFeedbackLimiti/${id}`).delete()
    await db.doc(`accounts/${id}`).delete()
  }
  const feedback = await db.collection('betaFeedback').where('salonId', 'in', SALONI).get()
  await Promise.all(feedback.docs.map((d) => d.ref.delete()))
}

async function salone(id, pro) {
  const email = `${id}@test.groomly`
  await auth.createUser({ uid: id, email, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${id}`).set({ firstName: 'Prova', lastName: id, email, salonId: id, role: 'titolare', lingua: 'it', legacy: false })
  await db.doc(`salons/${id}/settings/main`).set({ business: { salonName: `Toelettatura ${id}` } })
  if (pro) await db.doc(`salons/${id}/pro/main`).set(pro)
}

await pulisci()
const configPrima = await leggi('config/globale')
try {
  for (const id of SALONI.slice(0, 5)) await salone(id)
  await salone('beta-vip', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, enabled: true })
  await salone('beta-man', { piano: 'pro', stato: 'attivo', fonte: 'manuale', scadeIl: null, enabled: false })
  await auth.createUser({ uid: SOCIO, email: `${SOCIO}@test.groomly`, password: 'Test1234!', emailVerified: true })
  await db.doc(`accounts/${SOCIO}`).set({ salonId: 'beta-t1', role: 'socio', email: `${SOCIO}@test.groomly`, legacy: false })

  // Invito multiplo con i salti dei Contratti.
  const inviti = await invitaBetaPer({
    token: ROBERTO, salonIds: [...SALONI, 'shared', 'beta-manca'], piano: 'salone', giorni: 30, messaggio: 'Ciao!', adesso: T0, apiKey: 'k', posta: finta,
  })
  assert.deepEqual(inviti.invitati, ['beta-t1', 'beta-t2', 'beta-t3', 'beta-t4', 'beta-t5'])
  assert.deepEqual(inviti.saltati, [
    { salonId: 'beta-vip', motivo: 'vip' }, { salonId: 'beta-man', motivo: 'piano-attivo' },
    { salonId: 'shared', motivo: 'shared' }, { salonId: 'beta-manca', motivo: 'non-trovato' },
  ])
  assert.equal(posta.length, 5)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'invito')
  const doppio = await invitaBetaPer({ token: ROBERTO, salonIds: ['beta-t1'], piano: 'pro', giorni: 30, adesso: T0 })
  assert.deepEqual(doppio.saltati, [{ salonId: 'beta-t1', motivo: 'gia-invitato' }])
  ok('invito multiplo, salti e già invitato')

  // Accettazione → Salon attivo a 3 posti con traccia.
  const risposta = await rispondiInvitoBetaPer({ uid: 'beta-t1', dati: { accetta: true }, adesso: T0 })
  const fine = new Date(T0.getTime() + 30 * DAY).toISOString()
  assert.deepEqual(risposta, { ok: true, scadeIl: fine })
  const pro = await leggi('salons/beta-t1/pro/main')
  assert.equal(pro.fonte, 'beta'); assert.equal(pro.piano, 'salone'); assert.equal(pro.seats, 3); assert.equal(pro.enabled, true)
  assert.equal(pro.exBeta, true); assert.equal(pro.earlyAdopter, true); assert.equal(pro.betaFinoAl, fine)
  assert.equal((await leggi('salons/beta-t1/members/beta-t1')).role, 'titolare')
  assert.equal((await leggi('betaInviti/beta-t1')).stato, 'accettato')
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).letto, true)
  await errore(rispondiInvitoBetaPer({ uid: SOCIO, dati: { accetta: true }, adesso: T0 }), 'Solo il titolare può rispondere all’invito')
  ok('accettazione: piano beta Salon attivo con traccia')

  // Feedback: titolare e socio, limite di 5.
  const buono = { voto: 5, funzioni: { team: 'utile' }, nonVa: '', manca: 'Più colori', pagheresti: 'si', quanto: '10-20', ricontatto: true, fineBeta: false, versioneApp: '1.0.0' }
  await inviaFeedbackBetaPer({ uid: 'beta-t1', dati: buono, adesso: T0, apiKey: 'k', posta: finta })
  for (let i = 0; i < 4; i += 1) await inviaFeedbackBetaPer({ uid: SOCIO, dati: buono, adesso: T0 })
  await errore(inviaFeedbackBetaPer({ uid: 'beta-t1', dati: buono, adesso: T0 }), 'Hai già mandato 5 feedback oggi: riprova domani')
  await errore(inviaFeedbackBetaPer({ uid: 'beta-t2', dati: buono, adesso: T0 }), 'Il feedback è per chi ha provato la beta')
  assert.equal((await db.collection('betaFeedback').where('salonId', '==', 'beta-t1').get()).size, 5)
  assert.ok(posta.some((m) => m.to === 'info@groomlyapp.it' && m.oggetto.includes('Feedback')))
  ok('feedback e limite giornaliero')

  // Estensione, early adopter, avvisi di fine, scadenza → Go con la traccia intatta.
  const estesa = await estendiBetaPer({ token: ROBERTO, salonId: 'beta-t1', giorni: 15, adesso: T0, apiKey: 'k', posta: finta })
  const fineEstesa = new Date(T0.getTime() + 45 * DAY).toISOString()
  assert.equal(estesa.scadeIl, fineEstesa)
  assert.equal((await leggi('salons/beta-t1/pro/main')).betaFinoAl, fineEstesa)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'estensione')
  await segnaEarlyAdopterPer({ token: ROBERTO, salonId: 'beta-t1', valore: false })
  await segnaEarlyAdopterPer({ token: ROBERTO, salonId: 'beta-t1', valore: true })
  assert.equal((await leggi('salons/beta-t1/pro/main')).earlyAdopter, true)
  ok('estensione ed early adopter')

  assert.equal(await mandaAvvisiFineBeta({ adesso: dopo(8), apiKey: 'k', posta: finta }), 1)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'feedback')
  await segnaAvvisoBetaPer('beta-t1')
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).letto, true)
  const prima = posta.length
  assert.equal(await mandaAvvisiFineBeta({ adesso: dopo(39), apiKey: 'k', posta: finta }), 1)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'fine-7')
  assert.equal(await mandaAvvisiFineBeta({ adesso: dopo(39), apiKey: 'k', posta: finta }), 0)
  assert.equal(await mandaAvvisiFineBeta({ adesso: dopo(44), apiKey: 'k', posta: finta }), 1)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'fine-1')
  assert.equal(posta.length, prima + 2)
  ok('promemoria feedback, fine a 7 e a 1 giorno (una volta sola)')

  assert.ok(await chiudiProveScadute(dopo(46)) >= 1)
  const chiusa = await leggi('salons/beta-t1/pro/main')
  assert.equal(chiusa.piano, 'base'); assert.equal(chiusa.fonte, null); assert.equal(chiusa.enabled, false)
  assert.equal(chiusa.exBeta, true); assert.equal(chiusa.betaPiano, 'salone'); assert.equal(chiusa.betaFinoAl, fineEstesa); assert.equal(chiusa.earlyAdopter, true)
  assert.equal(await mandaAvvisiFineBeta({ adesso: dopo(46), apiKey: 'k', posta: finta }), 1)
  assert.equal((await leggi('salons/beta-t1/avvisi/beta')).tipo, 'finita')
  await errore(revocaBetaPer({ token: ROBERTO, salonId: 'beta-t1', adesso: dopo(46) }), 'La beta è già finita')
  await inviaFeedbackBetaPer({ uid: 'beta-t1', dati: { ...buono, fineBeta: true }, adesso: dopo(46) })
  ok('scadenza: Go con traccia exBeta intatta, avviso «finita», feedback da ex beta')

  // Rifiuto, revoca di una beta in corso, invito scaduto (pianificata e risposta in ritardo).
  await rispondiInvitoBetaPer({ uid: 'beta-t2', dati: { accetta: false, motivo: 'complicato' }, adesso: T0, apiKey: 'k', posta: finta })
  assert.equal((await leggi('betaInviti/beta-t2')).motivoRifiuto, 'complicato')
  assert.ok(posta.some((m) => m.to === 'info@groomlyapp.it' && m.oggetto.includes('rifiutato')))
  ok('rifiuto con motivo')

  await rispondiInvitoBetaPer({ uid: 'beta-t3', dati: { accetta: true }, adesso: T0 })
  const revoca = await revocaBetaPer({ token: ROBERTO, salonId: 'beta-t3', testo: 'Fine test', adesso: dopo(2), apiKey: 'k', posta: finta })
  assert.deepEqual(revoca, { ok: true, emailStato: 'inviata' })
  const revocata = await leggi('salons/beta-t3/pro/main')
  assert.equal(revocata.piano, 'base'); assert.equal(revocata.exBeta, true)
  assert.equal((await leggi('betaInviti/beta-t3')).stato, 'revocato')
  assert.equal((await leggi('salons/beta-t3/avvisi/beta')).tipo, 'revoca')
  ok('revoca: Go subito, traccia intatta')

  assert.ok(await scadiInvitiBetaScaduti(dopo(15)) >= 1)
  assert.equal((await leggi('betaInviti/beta-t4')).stato, 'scaduto')
  await errore(rispondiInvitoBetaPer({ uid: 'beta-t4', dati: { accetta: true }, adesso: dopo(15) }), 'Questo invito non è più valido')
  ok('invito scaduto dalla pianificata')
  await db.doc('betaInviti/beta-t5').set({ stato: 'invitato', scadeInvitoIl: dopo(-1).toISOString() }, { merge: true })
  await errore(rispondiInvitoBetaPer({ uid: 'beta-t5', dati: { accetta: true }, adesso: T0 }), 'Questo invito è scaduto')
  assert.equal((await leggi('betaInviti/beta-t5')).stato, 'scaduto')
  assert.equal(await leggi('salons/beta-t5/pro/main'), undefined)
  ok('risposta a un invito scaduto prima della pianificata')

  // Un nuovo invito dopo la fine copia il vecchio nello storico.
  const nuovo = await invitaBetaPer({ token: ROBERTO, salonIds: ['beta-t1'], piano: 'pro', giorni: 30, adesso: dopo(50) })
  assert.deepEqual(nuovo.invitati, ['beta-t1'])
  assert.equal((await db.collection('betaInviti/beta-t1/storico').get()).size, 1)
  ok('nuovo invito dopo la fine, vecchio nello storico')

  // Contatori e «Mostra i piani».
  const ultimiAccessi = async (uids) => {
    const { users } = await auth.getUsers(uids.map((uid) => ({ uid })))
    return new Map(users.map((u) => [u.uid, u.metadata.lastRefreshTime ?? u.metadata.lastSignInTime ?? null]))
  }
  const numeri = await contatoriAdminPer({ token: ROBERTO, adesso: dopo(50), ultimiAccessi })
  for (const id of SALONI) assert.ok(id in numeri.ultimoAccesso, id)
  assert.ok(numeri.inviti.invitato >= 1 && numeri.inviti.rifiutato >= 1 && numeri.inviti.revocato >= 1 && numeri.inviti.scaduto >= 2)
  assert.ok(numeri.feedback.totali >= 6 && numeri.feedback.pagheresti.si >= 6)
  assert.ok(numeri.perPiano.vip >= 1 && numeri.perFonte.manuale >= 1)
  ok('contatori admin')

  await impostaMostraPianiPer({ token: ROBERTO, valore: true })
  assert.equal((await leggi('config/globale')).mostraPiani, true)
  await errore(impostaMostraPianiPer({ token: { operatorEmail: 'beta-t1@test.groomly', emailVerified: true }, valore: false }), 'Accesso negato')
  ok('impostaMostraPiani')
} finally {
  await pulisci()
  if (configPrima) await db.doc('config/globale').set(configPrima)
  else await db.doc('config/globale').delete()
  const rimasti = await Promise.all(SALONI.map(async (id) => (await db.doc(`accounts/${id}`).get()).exists))
  console.log(rimasti.some(Boolean) ? 'Pulizia incompleta' : 'Dati di test cancellati')
}
console.log(`Collaudo beta: ${passi} passi verdi`)
process.exit(0)
