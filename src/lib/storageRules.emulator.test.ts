import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { getBytes, ref, uploadString } from 'firebase/storage'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { storagePaths } from './firebaseMap'

let env: RulesTestEnvironment
const copia = storagePaths('u1').backup('2026-11-05')

function archivioDi(uid: string | null) {
  const contesto = uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()
  return contesto.storage()
}

describe('regole Storage', () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-groomly',
      storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('storage.rules', 'utf8') },
    })
  })

  afterAll(async () => {
    await env.clearStorage()
    await env.cleanup()
  })

  it('il proprietario scrive e legge la sua copia', async () => {
    await assertSucceeds(uploadString(ref(archivioDi('u1'), copia), '{}'))
    await assertSucceeds(getBytes(ref(archivioDi('u1'), copia)))
  })

  it('un altro utente non legge né scrive', async () => {
    await assertFails(getBytes(ref(archivioDi('u2'), copia)))
    await assertFails(uploadString(ref(archivioDi('u2'), copia), '{}'))
  })

  it('chi non è entrato non legge né scrive', async () => {
    await assertFails(getBytes(ref(archivioDi(null), copia)))
    await assertFails(uploadString(ref(archivioDi(null), copia), '{}'))
  })

  it('fuori da users è tutto negato', async () => {
    await assertFails(uploadString(ref(archivioDi('u1'), 'altro/file.json'), '{}'))
    await assertFails(getBytes(ref(archivioDi('u1'), 'altro/file.json')))
  })
})
