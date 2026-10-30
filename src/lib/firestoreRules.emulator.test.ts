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
import { aprePaywall, haAccesso, propostaVisibile, statoPiano, type FeatureKey } from './piano'

const PROJECT_ID = 'demo-groomly'
const LAURA = 'uid-laura'
const ROBERTO = 'uid-roberto'
const TRODDIONI = 'uid-troddioni'
const ALTRO = 'uid-salone-1'
const SALON = 'uid-salone-1'
const COLLAB = 'uid-collab'
const GIORNO = '2026-10-01'

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

  it('un operatore con email non verificata non legge un account altrui', async () => {
    const db = env.authenticatedContext(ROBERTO, {
      email: 'masala.roberto@hotmail.it',
      email_verified: false,
    }).firestore()
    await assertFails(getDoc(doc(db, 'accounts', 'uid-altro-account')))
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
      'reportPassati', 'export', 'copieCloud', 'promemoriaAuto', 'richiamo', 'pronto', 'compleanno',
      'pagella', 'prezzoSuggerito', 'aumentoListino', 'collage', 'senzaFirma', 'prenotazioni',
      'listaAttesa', 'recensioni', 'fedelta', 'schedaCliente', 'statistiche', 'team', 'postiExtra',
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
    expect(propostaVisibile(true, stato)).toBe(false)
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
    await assertSucceeds(setDoc(doc(comeCollab, 'salons', salon, 'dogs', 'teo'), { name: 'Teo', status: 'attivo' }))
    await assertSucceeds(updateDoc(doc(comeCollab, 'salons', salon, 'dogs', 'teo'), { name: 'Teo', status: 'attivo', note: 'bravo' }))
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
  it('avvisi di sistema: tutti leggono, solo gli operatori scrivono, il segno di lettura sta sull’account', async () => {
    const roberto = env.authenticatedContext(ROBERTO, { email: 'masala.roberto@hotmail.it', email_verified: true }).firestore()
    const salone = env.authenticatedContext(ALTRO).firestore()
    const { serverTimestamp } = await import('firebase/firestore')
    await assertSucceeds(setDoc(doc(roberto, 'avvisiSistema', 'a1'), { tipo: 'importante', titolo: 'Prezzi', testo: 'Dal 1° dicembre.', creato: serverTimestamp() }))
    await assertFails(setDoc(doc(roberto, 'avvisiSistema', 'a2'), { tipo: 'boh', titolo: 'Prezzi', testo: '', creato: serverTimestamp() }))
    await assertFails(setDoc(doc(salone, 'avvisiSistema', 'a3'), { tipo: 'novita', titolo: 'Finto', testo: '', creato: serverTimestamp() }))
    await assertSucceeds(getDocs(collection(salone, 'avvisiSistema')))
    await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'avvisiSistema')))
    await assertFails(deleteDoc(doc(salone, 'avvisiSistema', 'a1')))
    await assertFails(updateDoc(doc(roberto, 'avvisiSistema', 'a1'), { titolo: 'Altro' }))
    await assertSucceeds(deleteDoc(doc(roberto, 'avvisiSistema', 'a1')))
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'accounts', ALTRO), { salonId: ALTRO, role: 'titolare', legacy: false })
    })
    await assertSucceeds(updateDoc(doc(salone, 'accounts', ALTRO), { avvisiLettiFino: 123 }))
  })
})
