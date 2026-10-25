import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
})
