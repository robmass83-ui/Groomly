import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { campiOmaggio, scriviPiano } from '../../functions/src/piano/scriviPiano'
import { accessoSospeso } from './accessoSospeso'
import { dogToDoc } from './firebaseMap'
import type { Dog } from '../types/models'
import { aprePaywall, haAccesso, statoPiano, type FeatureKey } from './piano'

const PROJECT_ID = 'demo-groomly'
const LAURA = 'uid-laura'
const ROBERTO = 'uid-roberto'
const TRODDIONI = 'uid-troddioni'
const ALTRO = 'uid-salone-1'
const SALON = 'uid-salone-1'
const COLLAB = 'uid-collab'
const GIORNO = '2026-10-01'

function cane(over: Partial<Dog> = {}): Dog {
  return {
    id: 'fido',
    name: 'Fido',
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Mario', phone: '333' },
    status: 'attivo',
    searchKey: 'fido',
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    servicePrices: [{ serviceId: 'bagno', price: 25 }],
    hiddenServiceIds: [],
    customFields: [],
    gallery: [],
    contacts: [],
    ...over,
  }
}

function backup(uid: string, day = GIORNO): string {
  return `users/${uid}/backups/${day}`
}

function emulatorAddress(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST
  if (!raw) throw new Error('FIRESTORE_EMULATOR_HOST assente: questo test parla solo con l’emulatore')
  if (!PROJECT_ID.startsWith('demo-')) throw new Error('Project id non demo: mi fermo')
  const [host, portText] = raw.split(':')
  const port = Number(portText)
  if (!host || !Number.isInteger(port)) throw new Error(`FIRESTORE_EMULATOR_HOST non valido: ${raw}`)
  return { host, port }
}

describe('regole Firestore sull’emulatore', () => {
  let env: RulesTestEnvironment

  beforeAll(async () => {
    const address = emulatorAddress()
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
        host: address.host,
        port: address.port,
      },
    })
    expect(env.projectId).toBe(PROJECT_ID)
  })

  beforeEach(async () => {
    await env.clearFirestore()
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, backup(LAURA)), { di: 'laura' })
      await setDoc(doc(db, backup(ROBERTO)), { di: 'roberto' })
      await setDoc(doc(db, backup(TRODDIONI)), { di: 'troddioni' })
      await setDoc(doc(db, 'accounts', ALTRO), { salonId: SALON, role: 'titolare', legacy: false })
      await setDoc(doc(db, 'accounts', COLLAB), { salonId: SALON, role: 'collaboratore', legacy: false })
      await setDoc(doc(db, 'accounts', 'uid-altro-account'), { salonId: 'altro', role: 'titolare', legacy: false })
      await setDoc(doc(db, 'salons', SALON, 'pro', 'main'), { enabled: true, seats: 3 })
      await setDoc(doc(db, 'salons', SALON, 'appointments', 'done'), {
        status: 'completato',
        total: 40,
        paymentMethod: 'contanti',
        actualDurationMin: 60,
        assigneeUid: ALTRO,
      })
      await setDoc(doc(db, 'salons', SALON, 'dogs', 'fido'), dogToDoc(cane({ contact: { name: 'Mario', phone: '333', email: 'mario@example.it' } })))
      await setDoc(doc(db, 'salons', SALON, 'appointments', 'aperta'), {
        status: 'programmato',
        start: 1000,
        assigneeUid: ALTRO,
      })
    })
  })

  afterAll(async () => {
    await env.cleanup()
  })

  it('un altro utente non legge il backup di Laura', async () => {
    const db = env.authenticatedContext(ALTRO).firestore()
    await assertFails(getDoc(doc(db, backup(LAURA))))
  })

  it('Roberto operatore non legge il backup di Laura', async () => {
    const db = env.authenticatedContext(ROBERTO, {
      email: 'masala.roberto@hotmail.it',
      email_verified: true,
      admin: true,
    }).firestore()
    await assertFails(getDoc(doc(db, backup(LAURA))))
  })

  it('ciascuno legge solo il proprio backup', async () => {
    const laura = env.authenticatedContext(LAURA, {
      email: 'laura.masala@tiscali.it',
      email_verified: true,
    }).firestore()
    await assertSucceeds(getDoc(doc(laura, backup(LAURA))))
  })

  it('il titolare non scrive crediti né pro/main, e scrive un servizio', async () => {
    const db = env.authenticatedContext(ALTRO).firestore()
    await assertFails(setDoc(doc(db, 'salons', SALON, 'crediti', 'main'), { inclusi: 9999 }))
    await assertFails(setDoc(doc(db, 'salons', SALON, 'pro', 'main'), { enabled: true, seats: 99 }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'services', 'bagno'), { name: 'Bagno' }))
  })

  it('il collaboratore non cambia l’importo di un completato', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    await assertFails(updateDoc(doc(db, 'salons', SALON, 'appointments', 'done'), { total: 1 }))
  })

  it('il collaboratore non cambia la persona di un completato se è un altro', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    await assertFails(updateDoc(doc(db, 'salons', SALON, 'appointments', 'done'), { assigneeUid: 'uid-altra-persona' }))
  })

  it('il collaboratore può annotare un completato senza toccare l’importo', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    await assertSucceeds(updateDoc(doc(db, 'salons', SALON, 'appointments', 'done'), { note: 'ok' }))
  })

  it('il collaboratore non svuota la scheda di un cane', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    await assertFails(setDoc(doc(db, 'salons', SALON, 'dogs', 'fido'), { status: 'attivo' }))
  })

  it('il collaboratore non lascia il nome vuoto', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    await assertFails(updateDoc(doc(db, 'salons', SALON, 'dogs', 'fido'), { name: '' }))
  })

  it('il collaboratore modifica prezzi, note e contatto di un cane', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const modificato = cane({
      servicePrices: [{ serviceId: 'bagno', price: 30 }],
      notes: 'Note nuove',
      contact: { name: 'Mario', phone: '333' },
    })
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'dogs', 'fido'), dogToDoc(modificato)))
  })

  it('i campi nuovi del prodotto sono facoltativi e hanno il tipo giusto', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const prodotto = doc(db, 'salons', SALON, 'prodotti', 'campi')
    const base = { nome: 'Shampoo', categoria: 'lavaggio' }
    await assertSucceeds(setDoc(prodotto, base))
    await assertSucceeds(setDoc(prodotto, { nome: 'Vecchio', categoria: 'shampoo', pezzi: 1 }))
    await assertSucceeds(setDoc(prodotto, { ...base, uso: 'vendita', diluizione: 10, apertoIl: 1762400000000, mesiDopoApertura: 12, costo: 18.5, prezzoVendita: 25, mlPerCane: { piccola: 15, media: 30, grande: 50 }, giorniConsegna: 3, confrontoIl: 1762400000000 }))
    await assertSucceeds(setDoc(prodotto, { ...base, uso: 'salone', diluizione: null, apertoIl: null, mesiDopoApertura: null, costo: null, prezzoVendita: null, mlPerCane: null, giorniConsegna: null, confrontoIl: null }))
    await assertFails(setDoc(prodotto, { ...base, uso: 'regalo' }))
    await assertFails(setDoc(prodotto, { ...base, diluizione: 'tanta' }))
    await assertFails(setDoc(prodotto, { ...base, diluizione: 1.5 }))
    await assertFails(setDoc(prodotto, { ...base, costo: -1 }))
    await assertFails(setDoc(prodotto, { ...base, prezzoVendita: '25' }))
    await assertFails(setDoc(prodotto, { ...base, mesiDopoApertura: -1 }))
    await assertFails(setDoc(prodotto, { ...base, mlPerCane: { piccola: 15 } }))
    await assertFails(setDoc(prodotto, { ...base, mlPerCane: { piccola: 15, media: 30, grande: -1 } }))
    await assertFails(setDoc(prodotto, { ...base, giorniConsegna: 'presto' }))
  })

  it('il collaboratore aggiunge e modifica un prodotto ma non lo elimina', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const titolare = env.authenticatedContext(ALTRO).firestore()
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'prodotti', 'shampoo'), { nome: 'Shampoo', categoria: 'shampoo' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'prodotti', 'shampoo'), { nome: 'Shampoo bianco', categoria: 'shampoo' }))
    await assertFails(setDoc(doc(db, 'salons', SALON, 'prodotti', 'senza-nome'), { nome: '' }))
    await assertFails(deleteDoc(doc(db, 'salons', SALON, 'prodotti', 'shampoo')))
    await assertSucceeds(deleteDoc(doc(titolare, 'salons', SALON, 'prodotti', 'shampoo')))
  })

  it('il collaboratore crea un cane con i dati minimi', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const nuovo = cane({ id: 'rex', name: 'Rex', searchKey: 'rex', servicePrices: [] })
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'dogs', 'rex'), dogToDoc(nuovo)))
  })

  it('il titolare può ancora salvare un cane come vuole', async () => {
    const db = env.authenticatedContext(ALTRO).firestore()
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'dogs', 'fido'), { status: 'attivo' }))
  })

  it('il collaboratore sposta e chiude la visita di un altro', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const ref = doc(db, 'salons', SALON, 'appointments', 'aperta')
    await assertSucceeds(updateDoc(ref, { start: 2000 }))
    await assertSucceeds(updateDoc(ref, { status: 'completato', total: 30, paymentMethod: 'contanti' }))
  })

  it('il collaboratore non cambia stato, pagamento e durata di un completato', async () => {
    const db = env.authenticatedContext(COLLAB).firestore()
    const ref = doc(db, 'salons', SALON, 'appointments', 'done')
    await assertFails(updateDoc(ref, { status: 'programmato' }))
    await assertFails(updateDoc(ref, { paymentMethod: 'pos' }))
    await assertFails(updateDoc(ref, { actualDurationMin: 5 }))
  })

  describe('permessi admin solo dal claim', () => {
    const LAURA_UID = 'uid-laura-vera'
    const ROBMASS = 'uid-robmass83'
    const ADMIN = 'uid-admin-senza-salone'
    const laura = () => env.authenticatedContext(LAURA_UID, { email: 'laura.masala@tiscali.it', email_verified: true }).firestore()
    const robmass = () => env.authenticatedContext(ROBMASS, { email: 'robmass83@gmail.com', email_verified: true }).firestore()
    const admin = () => env.authenticatedContext(ADMIN, { email: 'masala.roberto@hotmail.it', email_verified: true, admin: true }).firestore()

    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore()
        await setDoc(doc(db, 'accounts', LAURA_UID), { email: 'laura.masala@tiscali.it', salonId: LAURA_UID, role: 'titolare', legacy: false })
        await setDoc(doc(db, 'accounts', ROBMASS), { email: 'robmass83@gmail.com', salonId: LAURA_UID, role: 'socio', legacy: false })
        await setDoc(doc(db, 'salons', LAURA_UID, 'members', ROBMASS), { uid: ROBMASS, role: 'socio', status: 'attivo', accessWithoutPro: true })
        await setDoc(doc(db, 'salons', LAURA_UID, 'pro', 'main'), { enabled: false, seats: 3 })
        await setDoc(doc(db, 'salons', LAURA_UID, 'dogs', 'rex'), { name: 'Rex', species: 'cane', contact: {} })
        await setDoc(doc(db, 'salons', SALON, 'settings', 'main'), { business: {} })
      })
    })

    it('il registro admin lo legge solo l’admin e non lo scrive nessun client', async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'adminLog', 'v1'), { azione: 'prova' })
      })
      await assertSucceeds(getDoc(doc(admin(), 'adminLog', 'v1')))
      await assertFails(getDoc(doc(laura(), 'adminLog', 'v1')))
      await assertFails(setDoc(doc(admin(), 'adminLog', 'v2'), { azione: 'finta' }))
      await assertFails(deleteDoc(doc(admin(), 'adminLog', 'v1')))
    })

    it('l’admin legge saloni e account', async () => {
      await assertSucceeds(getDoc(doc(admin(), 'salons', SALON, 'settings', 'main')))
      await assertSucceeds(getDoc(doc(admin(), 'accounts', LAURA_UID)))
    })

    it('la hotmail senza claim non è nessuno, anche con l’email verificata', async () => {
      const db = env.authenticatedContext(ROBERTO, { email: 'masala.roberto@hotmail.it', email_verified: true }).firestore()
      await assertFails(getDoc(doc(db, 'accounts', LAURA_UID)))
      await assertFails(getDoc(doc(db, 'salons', LAURA_UID, 'dogs', 'rex')))
    })

    it('Laura non legge altri saloni né altri account, e lavora nel suo', async () => {
      await assertFails(getDoc(doc(laura(), 'salons', SALON, 'settings', 'main')))
      await assertFails(getDoc(doc(laura(), 'accounts', ROBMASS)))
      await assertSucceeds(getDoc(doc(laura(), 'salons', LAURA_UID, 'dogs', 'rex')))
      await assertSucceeds(setDoc(doc(laura(), 'salons', LAURA_UID, 'services', 'bagno'), { name: 'Bagno' }))
    })

    it('robmass83 socio lavora nel salone di Laura anche col piano spento', async () => {
      await assertSucceeds(getDoc(doc(robmass(), 'salons', LAURA_UID, 'dogs', 'rex')))
      await assertSucceeds(setDoc(doc(robmass(), 'salons', LAURA_UID, 'services', 'taglio'), { name: 'Taglio' }))
    })

    it('robmass83 non si mette da solo nel salone di Laura', async () => {
      const db = env.authenticatedContext('uid-nuovo', { email: 'robmass83@gmail.com', email_verified: true }).firestore()
      await assertFails(setDoc(doc(db, 'accounts', 'uid-nuovo'), { email: 'robmass83@gmail.com', salonId: LAURA_UID, role: 'socio', legacy: false }))
      await assertFails(setDoc(doc(db, 'salons', LAURA_UID, 'members', 'uid-nuovo'), { uid: 'uid-nuovo', role: 'socio', status: 'attivo', accessWithoutPro: true }))
    })

    it('l’account non si crea con un’email non propria né con consensi già scritti', async () => {
      const db = env.authenticatedContext('uid-reg', { email: 'nuova@test.it', email_verified: false }).firestore()
      const ref = doc(db, 'accounts', 'uid-reg')
      const base = { salonId: 'uid-reg', role: 'titolare', legacy: false }
      await assertFails(setDoc(ref, { ...base, email: 'estraneo@test.it' }))
      await assertFails(setDoc(ref, { ...base, email: 'nuova@test.it', emailPromo: { attivo: true } }))
      await assertFails(setDoc(ref, { ...base, email: 'nuova@test.it', consensoMetriche: { attivo: true } }))
      await assertSucceeds(setDoc(ref, { ...base, email: 'nuova@test.it', lingua: 'it', termini: { accettati: true } }))
    })

    it('l’email dell’account si allinea solo a quella di accesso confermata', async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'accounts', 'uid-mail'), { salonId: 'uid-mail', role: 'titolare', legacy: false, email: 'vecchia@test.it' })
      })
      const ref = (token: { email: string; email_verified: boolean }) => doc(env.authenticatedContext('uid-mail', token).firestore(), 'accounts', 'uid-mail')
      const confermata = { email: 'nuova@test.it', email_verified: true }
      await assertFails(updateDoc(ref(confermata), { email: 'estraneo@test.it' }))
      await assertFails(updateDoc(ref({ ...confermata, email_verified: false }), { email: 'nuova@test.it' }))
      await assertFails(updateDoc(ref(confermata), { emailPromo: { attivo: true } }))
      await assertFails(updateDoc(ref(confermata), { termini: { versione: 'finta' } }))
      await assertSucceeds(updateDoc(ref({ ...confermata, email_verified: false }), { lingua: 'de', firstName: 'Ada' }))
      await assertSucceeds(updateDoc(ref(confermata), { email: 'nuova@test.it' }))
    })

    it('le offerte della lista d’attesa non si leggono e non si scrivono dal client', async () => {
      const db = env.authenticatedContext(ALTRO).firestore()
      await assertFails(getDoc(doc(db, 'salons', SALON, 'offerteAttesa', 'o1')))
      await assertFails(setDoc(doc(db, 'salons', SALON, 'offerteAttesa', 'o1'), { url: 'https://truffa.example' }))
    })

    it('l’admin senza account non scrive nel salone di Laura', async () => {
      await assertFails(setDoc(doc(admin(), 'salons', LAURA_UID, 'services', 'finto'), { name: 'Finto' }))
    })
  })

  it('con il piano spento il collaboratore legge il proprio membro e non l’elenco', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'salons', SALON, 'pro', 'main'), { enabled: false, seats: 3 })
      await setDoc(doc(db, 'salons', SALON, 'members', COLLAB), {
        uid: COLLAB, role: 'collaboratore', status: 'attivo', email: 'c@test.groomly',
      })
      await setDoc(doc(db, 'salons', SALON, 'members', 'altro-membro'), {
        uid: 'altro-membro', role: 'socio', status: 'attivo', email: 'socio@test.groomly',
      })
    })
    const db = env.authenticatedContext(COLLAB).firestore()
    const pro = await assertSucceeds(getDoc(doc(db, 'salons', SALON, 'pro', 'main')))
    expect(pro.data()?.enabled).toBe(false)
    await assertSucceeds(getDoc(doc(db, 'salons', SALON, 'members', COLLAB)))
    await assertFails(getDocs(collection(db, 'salons', SALON, 'members')))
    await assertFails(getDoc(doc(db, 'salons', SALON, 'dogs', 'rex')))
  })

  it('un token admin legge un account altrui', async () => {
    const db = env.authenticatedContext('uid-admin', { admin: true }).firestore()
    await assertSucceeds(getDoc(doc(db, 'accounts', 'uid-altro-account')))
  })

  it('i salvataggi della 1.1.93 restano permessi al titolare', async () => {
    const db = env.authenticatedContext(ALTRO).firestore()
    await assertSucceeds(setDoc(doc(db, backup(ALTRO)), { dati: '{}' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'meta', `restored-${ALTRO}`), { done: true, at: 1 }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'deletedDogs', 'rex'), { at: 1 }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'dogs', 'rex'), { name: 'Rex', status: 'attivo' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'appointments', 'vis'), { status: 'programmato', dogId: 'rex' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'services', 'bagno-193'), { name: 'Bagno' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'closures', 'ferie'), { reason: 'Ferie' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'settings', 'main'), { backup: { lastAt: '2026-10-21T10:00:00.000Z' } }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex'), {
      kind: 'foto',
      owner: 'dog:rex',
      name: '',
      mime: 'image/webp',
      createdBy: ALTRO,
    }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'full', 'data'), { dati: 'abc' }))
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'chunks', '0'), { dati: 'abc' }))
    // Un file da 10 MB usa i pezzi da 0 a 17: oltre si riempirebbe il database.
    await assertSucceeds(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'chunks', '17'), { dati: 'abc' }))
    await assertFails(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'chunks', '18'), { dati: 'abc' }))
    await assertFails(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'chunks', 'altro'), { dati: 'abc' }))
    await assertFails(setDoc(doc(db, 'salons', SALON, 'files', 'foto-rex', 'full', 'altro'), { dati: 'abc' }))
  })

  it('un salone finto con omaggio senza scadenza non sospende il collaboratore', async () => {
    const finto = 'salone-finto'
    const collab = 'uid-collab-finto'
    const scritto = scriviPiano(campiOmaggio('salone'), new Date('2026-10-25T12:00:00.000Z'))
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'accounts', collab), { salonId: finto, role: 'collaboratore', legacy: false })
      await setDoc(doc(db, 'salons', finto, 'pro', 'main'), scritto)
      await setDoc(doc(db, 'salons', finto, 'members', collab), {
        uid: collab, role: 'collaboratore', status: 'attivo', email: 'finto@test.groomly',
      })
      await setDoc(doc(db, 'salons', finto, 'dogs', 'rex'), { name: 'Rex', status: 'attivo' })
    })
    const db = env.authenticatedContext(collab).firestore()
    const pro = await assertSucceeds(getDoc(doc(db, 'salons', finto, 'pro', 'main')))
    const dati = pro.data() ?? {}
    const stato = statoPiano({
      piano: dati.piano,
      stato: dati.stato,
      fonte: dati.fonte,
      scadeIl: dati.scadeIl,
      seatsIncluded: dati.seatsIncluded,
      seatsExtra: dati.seatsExtra,
      seats: dati.seats,
      rinnovoAutomatico: dati.rinnovoAutomatico,
    }, new Date('2026-10-25T12:00:00.000Z'))
    const chiavi: FeatureKey[] = [
      'export', 'backupAuto', 'drive', 'messaggiCategoria', 'copieCloud', 'promemoriaAuto', 'richiamo',
      'pronto', 'compleanno',
      'prenotazioni', 'listaAttesa', 'recensioni', 'fedelta', 'team', 'postiExtra',
    ]
    expect(stato.livello).toBe('salone')
    expect(stato.scadeIl).toBeNull()
    expect(dati.enabled).toBe(true)
    expect(dati.fonte).toBe('omaggio')
    expect(dati.stato).toBe('attivo')
    for (const chiave of chiavi) {
      expect(haAccesso(stato, chiave)).toBe(true)
      expect(aprePaywall(stato, chiave)).toBe(false)
    }
    expect(accessoSospeso('collaboratore', {
      enabled: dati.enabled === true,
      members: [{
        uid: collab,
        email: 'finto@test.groomly',
        role: 'collaboratore',
        firstName: '',
        lastName: '',
        status: 'attivo',
      }],
      openInviteExpiries: [],
    }, collab)).toBe(false)
    await assertSucceeds(getDoc(doc(db, 'salons', finto, 'dogs', 'rex')))
    await assertSucceeds(setDoc(doc(db, 'salons', finto, 'appointments', 'vis'), { status: 'programmato', dogId: 'rex' }))
  })

  it('i salvataggi della 1.1.94 restano permessi a titolare, socio e collaboratore su un omaggio tipo Laura', async () => {
    const salon = 'uid-laura-tipo'
    const socio = 'uid-socio-tipo'
    const collab = 'uid-collab-tipo'
    const omaggio = scriviPiano(campiOmaggio('salone'), new Date('2026-10-25T12:00:00.000Z'))
    const push = {
      enabled: true,
      updates: true,
      complete: false,
      completeAfterMin: 15,
      updatedAt: '2026-10-25T12:00:00.000Z',
    }
    const device = {
      token: 'tok-finto',
      platform: 'android',
      appVersion: '1.1.94',
      updatedAt: '2026-10-25T12:00:00.000Z',
    }
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'accounts', salon), { salonId: salon, role: 'titolare', legacy: false })
      await setDoc(doc(db, 'accounts', socio), { salonId: salon, role: 'socio', legacy: false })
      await setDoc(doc(db, 'accounts', collab), { salonId: salon, role: 'collaboratore', legacy: false })
      await setDoc(doc(db, 'salons', salon, 'pro', 'main'), omaggio)
      await setDoc(doc(db, 'salons', salon, 'members', socio), {
        uid: socio, role: 'socio', status: 'attivo', email: 'socio-tipo@test.groomly', accessWithoutPro: true,
      })
      await setDoc(doc(db, 'salons', salon, 'members', collab), {
        uid: collab, role: 'collaboratore', status: 'attivo', email: 'collab-tipo@test.groomly',
      })
    })

    const titolare = env.authenticatedContext(salon).firestore()
    await assertSucceeds(setDoc(doc(titolare, backup(salon)), { dati: '{}' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'meta', `restored-${salon}`), { done: true, at: 1 }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'deletedDogs', 'rex'), { at: 1 }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'dogs', 'rex'), { name: 'Rex', status: 'attivo' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'appointments', 'vis'), { status: 'programmato', dogId: 'rex' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'services', 'bagno'), { name: 'Bagno' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'closures', 'ferie'), { reason: 'Ferie' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'prodotti', 'shampoo'), { nome: 'Shampoo', categoria: 'shampoo' }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'settings', 'main'), { backup: { lastAt: '2026-10-25T12:00:00.000Z' } }))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'files', 'foto-rex'), {
      kind: 'foto', owner: 'dog:rex', name: '', mime: 'image/webp', createdBy: salon,
    }))
    await assertSucceeds(setDoc(doc(titolare, 'accounts', salon, 'push', 'prefs'), push))
    await assertSucceeds(setDoc(doc(titolare, 'accounts', salon, 'devices', 'tel'), device))
    await assertSucceeds(setDoc(doc(titolare, 'salons', salon, 'interesse', 'prenotazioni'), {
      feature: 'prenotazioni', uid: salon, at: '2026-10-25T12:00:00.000Z',
    }))
    await assertFails(setDoc(doc(titolare, 'salons', salon, 'pro', 'main'), { enabled: true, seats: 99 }))

    const comeSocio = env.authenticatedContext(socio).firestore()
    await assertSucceeds(setDoc(doc(comeSocio, 'salons', salon, 'dogs', 'luna'), { name: 'Luna', status: 'attivo' }))
    await assertSucceeds(setDoc(doc(comeSocio, 'salons', salon, 'appointments', 'vis-socio'), { status: 'programmato', dogId: 'luna' }))
    await assertSucceeds(setDoc(doc(comeSocio, 'salons', salon, 'services', 'taglio'), { name: 'Taglio' }))
    await assertSucceeds(updateDoc(doc(comeSocio, 'salons', salon, 'settings', 'main'), { updatedAt: '2026-10-25T12:01:00.000Z' }))
    await assertSucceeds(setDoc(doc(comeSocio, 'accounts', socio, 'push', 'prefs'), push))
    await assertSucceeds(setDoc(doc(comeSocio, 'accounts', socio, 'devices', 'tel'), device))
    await assertFails(setDoc(doc(comeSocio, 'salons', salon, 'pro', 'main'), { enabled: false }))

    const comeCollab = env.authenticatedContext(collab).firestore()
    await assertSucceeds(getDoc(doc(comeCollab, 'salons', salon, 'dogs', 'rex')))
    await assertSucceeds(setDoc(doc(comeCollab, 'salons', salon, 'dogs', 'teo'), dogToDoc(cane({ id: 'teo', name: 'Teo', searchKey: 'teo' }))))
    await assertSucceeds(updateDoc(doc(comeCollab, 'salons', salon, 'dogs', 'teo'), { name: 'Teo', status: 'attivo', notes: 'bravo' }))
    await assertSucceeds(setDoc(doc(comeCollab, 'salons', salon, 'appointments', 'vis-collab'), { status: 'programmato', dogId: 'teo' }))
    await assertSucceeds(setDoc(doc(comeCollab, 'salons', salon, 'files', 'foto-teo'), {
      kind: 'foto', owner: 'dog:teo', name: '', mime: 'image/webp', createdBy: collab,
    }))
    await assertSucceeds(setDoc(doc(comeCollab, 'accounts', collab, 'push', 'prefs'), push))
    await assertSucceeds(setDoc(doc(comeCollab, 'accounts', collab, 'devices', 'tel'), device))
    await assertFails(setDoc(doc(comeCollab, 'salons', salon, 'settings', 'main'), { backup: { lastAt: 'x' } }))
    await assertFails(setDoc(doc(comeCollab, 'salons', salon, 'services', 'extra'), { name: 'Extra' }))
    await assertFails(setDoc(doc(comeCollab, 'salons', salon, 'interesse', 'export'), {
      feature: 'export', uid: collab, at: '2026-10-25T12:00:00.000Z',
    }))
    await assertFails(deleteDoc(doc(comeCollab, 'salons', salon, 'dogs', 'teo')))
    await assertFails(deleteDoc(doc(comeCollab, 'accounts', collab)))
    await assertSucceeds(deleteDoc(doc(titolare, 'accounts', salon)))
    expect(accessoSospeso('collaboratore', {
      enabled: true,
      members: [{
        uid: collab, email: 'collab-tipo@test.groomly', role: 'collaboratore',
        firstName: '', lastName: '', status: 'attivo',
      }],
      openInviteExpiries: [],
    }, collab)).toBe(false)
  })

  it('il collaboratore aggiorna solo stato e motivo della coda, un altro salone non la legge, il cliente non scrive', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'salons', SALON, 'coda', 'riga-1'), {
        tipo: 'promemoria',
        dogId: 'rex',
        evento: 'promemoria:a:2026-10-28',
        stato: 'in_coda',
        motivo: '',
        email: 'a@b.it',
      })
    })
    const collab = env.authenticatedContext(COLLAB).firestore()
    const riga = doc(collab, 'salons', SALON, 'coda', 'riga-1')
    await assertSucceeds(getDoc(riga))
    await assertSucceeds(updateDoc(riga, { stato: 'fermata' }))
    await assertSucceeds(updateDoc(riga, { motivo: 'fermata' }))
    await assertFails(updateDoc(riga, { email: 'altro@b.it' }))
    await assertSucceeds(setDoc(doc(collab, 'salons', SALON, 'coda', 'riga-nuova'), { stato: 'in_coda', motivo: '' }))
    await assertFails(setDoc(doc(collab, 'salons', SALON, 'coda', 'riga-piena'), {
      stato: 'in_coda',
      motivo: '',
      email: 'a@b.it',
    }))
    await assertFails(deleteDoc(riga))

    const altro = env.authenticatedContext('uid-altro-account').firestore()
    await assertFails(getDoc(doc(altro, 'salons', SALON, 'coda', 'riga-1')))

    const cliente = env.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(cliente, 'salons', SALON, 'coda', 'riga-cliente'), { stato: 'in_coda', motivo: '' }))
    await assertFails(updateDoc(doc(cliente, 'salons', SALON, 'coda', 'riga-1'), { stato: 'fermata' }))

    const titolare = env.authenticatedContext(ALTRO).firestore()
    await assertSucceeds(deleteDoc(doc(titolare, 'salons', SALON, 'coda', 'riga-1')))
  })
  it.each(['assistenza', 'assistenzaModelli', 'comunicazioni'])('%s: legge solo l’admin, nessun client scrive', async (raccolta) => {
    const admin = env.authenticatedContext('uid-admin', { admin: true }).firestore()
    const salone = env.authenticatedContext(ALTRO).firestore()
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), raccolta, 'v1'), { stato: 'nuovo' })
    })
    await assertSucceeds(getDoc(doc(admin, raccolta, 'v1')))
    await assertFails(getDoc(doc(salone, raccolta, 'v1')))
    await assertFails(setDoc(doc(admin, raccolta, 'v2'), { stato: 'nuovo' }))
    await assertFails(deleteDoc(doc(admin, raccolta, 'v1')))
  })

  it('invii delle comunicazioni: legge solo l’admin', async () => {
    const admin = env.authenticatedContext('uid-admin', { admin: true }).firestore()
    const salone = env.authenticatedContext(ALTRO).firestore()
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'comunicazioni', 'c1', 'invii', ALTRO), { esito: 'inviata' })
    })
    await assertSucceeds(getDoc(doc(admin, 'comunicazioni', 'c1', 'invii', ALTRO)))
    await assertFails(getDoc(doc(salone, 'comunicazioni', 'c1', 'invii', ALTRO)))
    await assertFails(setDoc(doc(admin, 'comunicazioni', 'c1', 'invii', 'altro'), { esito: 'inviata' }))
  })

  it('avvisi per account: li legge solo l’account, nessun client li scrive', async () => {
    const proprio = env.authenticatedContext(ALTRO).firestore()
    const estraneo = env.authenticatedContext(COLLAB).firestore()
    const admin = env.authenticatedContext('uid-admin', { admin: true }).firestore()
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'accounts', ALTRO, 'avvisi', 'p1'), { tipo: 'novita', titolo: 'Risposta', testo: 'Ciao', creato: new Date() })
    })
    await assertSucceeds(getDocs(collection(proprio, 'accounts', ALTRO, 'avvisi')))
    await assertFails(getDocs(collection(estraneo, 'accounts', ALTRO, 'avvisi')))
    await assertFails(getDocs(collection(admin, 'accounts', ALTRO, 'avvisi')))
    await assertFails(setDoc(doc(proprio, 'accounts', ALTRO, 'avvisi', 'p2'), { titolo: 'Finto' }))
    await assertFails(deleteDoc(doc(proprio, 'accounts', ALTRO, 'avvisi', 'p1')))
  })

  it('avvisi di sistema: tutti leggono, nessun client scrive, il segno di lettura sta sull’account', async () => {
    const roberto = env.authenticatedContext(ROBERTO, { email: 'masala.roberto@hotmail.it', email_verified: true, admin: true }).firestore()
    const salone = env.authenticatedContext(ALTRO).firestore()
    const { serverTimestamp } = await import('firebase/firestore')
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'avvisiSistema', 'a1'), { tipo: 'importante', titolo: 'Prezzi', testo: '', creato: new Date() })
      await setDoc(doc(context.firestore(), 'accounts', ALTRO), { salonId: ALTRO, role: 'titolare', legacy: false })
    })
    await assertFails(setDoc(doc(roberto, 'avvisiSistema', 'a2'), { tipo: 'importante', titolo: 'Prezzi', testo: '', creato: serverTimestamp() }))
    await assertFails(setDoc(doc(salone, 'avvisiSistema', 'a3'), { tipo: 'novita', titolo: 'Finto', testo: '', creato: serverTimestamp() }))
    await assertSucceeds(getDocs(collection(salone, 'avvisiSistema')))
    await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'avvisiSistema')))
    await assertFails(deleteDoc(doc(salone, 'avvisiSistema', 'a1')))
    await assertFails(deleteDoc(doc(roberto, 'avvisiSistema', 'a1')))
    await assertFails(updateDoc(doc(roberto, 'avvisiSistema', 'a1'), { titolo: 'Altro' }))
    await assertSucceeds(updateDoc(doc(salone, 'accounts', ALTRO), { avvisiLettiFino: 123 }))
  })

  it('inviti, feedback beta e config: solo le functions scrivono, il titolare legge solo il suo invito', async () => {
    const SOCIO = 'uid-socio'
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'accounts', SOCIO), { salonId: SALON, role: 'socio', legacy: false })
      await setDoc(doc(db, 'betaInviti', SALON), { salonId: SALON, piano: 'salone', stato: 'invitato' })
      await setDoc(doc(db, 'betaInviti', SALON, 'storico', 'v1'), { stato: 'scaduto' })
      await setDoc(doc(db, 'betaInviti', 'altro'), { salonId: 'altro', piano: 'pro', stato: 'invitato' })
      await setDoc(doc(db, 'betaFeedback', 'f1'), { salonId: SALON, voto: 5 })
      await setDoc(doc(db, 'betaFeedbackLimiti', SALON), { giorno: '2026-11-04', n: 1 })
      await setDoc(doc(db, 'config', 'globale'), { mostraPiani: false, piani: { provaSelfService: false } })
    })
    const titolare = env.authenticatedContext(ALTRO).firestore()
    const socio = env.authenticatedContext(SOCIO).firestore()
    const collab = env.authenticatedContext(COLLAB).firestore()
    const operatore = env.authenticatedContext(ROBERTO, { email: 'masala.roberto@hotmail.it', email_verified: true, admin: true }).firestore()

    await assertSucceeds(getDoc(doc(titolare, 'betaInviti', SALON)))
    await assertFails(getDoc(doc(titolare, 'betaInviti', 'altro')))
    await assertFails(getDoc(doc(titolare, 'betaInviti', SALON, 'storico', 'v1')))
    await assertFails(getDoc(doc(socio, 'betaInviti', SALON)))
    await assertFails(getDoc(doc(collab, 'betaInviti', SALON)))
    await assertFails(setDoc(doc(titolare, 'betaInviti', SALON), { salonId: SALON, piano: 'salone', stato: 'accettato' }))
    await assertFails(updateDoc(doc(titolare, 'betaInviti', SALON), { stato: 'accettato' }))
    await assertFails(setDoc(doc(titolare, 'betaInviti', 'nuovo'), { stato: 'invitato' }))

    await assertSucceeds(getDoc(doc(operatore, 'betaInviti', SALON)))
    await assertSucceeds(getDoc(doc(operatore, 'betaInviti', SALON, 'storico', 'v1')))
    await assertSucceeds(getDocs(collection(operatore, 'betaInviti')))
    await assertFails(setDoc(doc(operatore, 'betaInviti', SALON), { stato: 'revocato' }))

    await assertFails(getDoc(doc(titolare, 'betaFeedback', 'f1')))
    await assertFails(setDoc(doc(titolare, 'betaFeedback', 'f2'), { salonId: SALON, voto: 1 }))
    await assertSucceeds(getDocs(collection(operatore, 'betaFeedback')))
    await assertFails(setDoc(doc(operatore, 'betaFeedback', 'f3'), { voto: 1 }))
    await assertFails(getDoc(doc(operatore, 'betaFeedbackLimiti', SALON)))
    await assertFails(setDoc(doc(titolare, 'betaFeedbackLimiti', SALON), { n: 0 }))

    await assertSucceeds(getDoc(doc(titolare, 'config', 'globale')))
    await assertFails(setDoc(doc(titolare, 'config', 'globale'), { piani: { provaSelfService: true } }, { merge: true }))
    await assertFails(setDoc(doc(operatore, 'config', 'globale'), { piani: { provaSelfService: true } }, { merge: true }))
    await assertFails(getDocs(collection(operatore, 'salons', SALON, 'interesse')))
  })
  it('avviso beta: lo legge solo il titolare, nessuno lo scrive; avvisi/piano resta del salone', async () => {
    const SOCIO = 'uid-socio'
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'accounts', SOCIO), { salonId: SALON, role: 'socio', legacy: false })
      await setDoc(doc(db, 'salons', SALON, 'avvisi', 'beta'), { tipo: 'invito', piano: 'pro', letto: false })
      await setDoc(doc(db, 'salons', SALON, 'avvisi', 'piano'), { testo: 'x', letto: false })
    })
    const titolare = env.authenticatedContext(ALTRO).firestore()
    const socio = env.authenticatedContext(SOCIO).firestore()
    const collab = env.authenticatedContext(COLLAB).firestore()
    const estraneo = env.authenticatedContext('uid-altro-account').firestore()

    await assertSucceeds(getDoc(doc(titolare, 'salons', SALON, 'avvisi', 'beta')))
    await assertFails(getDoc(doc(socio, 'salons', SALON, 'avvisi', 'beta')))
    await assertFails(getDoc(doc(collab, 'salons', SALON, 'avvisi', 'beta')))
    await assertFails(getDoc(doc(estraneo, 'salons', SALON, 'avvisi', 'beta')))
    await assertFails(setDoc(doc(titolare, 'salons', SALON, 'avvisi', 'beta'), { letto: true }, { merge: true }))
    await assertFails(setDoc(doc(socio, 'salons', SALON, 'avvisi', 'beta'), { letto: true }))
    await assertSucceeds(getDoc(doc(socio, 'salons', SALON, 'avvisi', 'piano')))
  })
  it('il consenso alle statistiche lo scrive solo il server', async () => {
    const titolare = env.authenticatedContext(ALTRO).firestore()
    await assertFails(setDoc(doc(titolare, 'accounts', ALTRO), { consensoMetriche: { attivo: true } }, { merge: true }))
    await assertSucceeds(setDoc(doc(titolare, 'accounts', ALTRO), { lingua: 'it' }, { merge: true }))
  })

  it('le statistiche della notte le legge solo l’operatore e non le scrive nessuno', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'statsGiornaliere', '2026-11-04'), { saloni: 1 })
    })
    const operatore = env.authenticatedContext('uid-operatore', { admin: true }).firestore()
    const titolare = env.authenticatedContext(ALTRO).firestore()
    await assertSucceeds(getDoc(doc(operatore, 'statsGiornaliere', '2026-11-04')))
    await assertFails(getDoc(doc(titolare, 'statsGiornaliere', '2026-11-04')))
    await assertFails(setDoc(doc(operatore, 'statsGiornaliere', '2026-11-04'), { saloni: 2 }))
  })
})
