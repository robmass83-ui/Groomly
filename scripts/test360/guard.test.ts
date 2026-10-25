import { afterEach, describe, expect, it } from 'vitest'
import { fermaSeNonDemo } from './guard'

const keys = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GCLOUD_PROJECT', 'FIREBASE_PROJECT'] as const

describe('guardia emulatori', () => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })

  it('si ferma se manca un emulatore', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST
    expect(() => fermaSeNonDemo()).toThrow(/Emulatori assenti/)
  })

  it('si ferma se il progetto non è demo', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
    process.env.GCLOUD_PROJECT = 'groomly-3128b'
    expect(() => fermaSeNonDemo()).toThrow(/non demo/)
  })

  it('passa sul progetto demo', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
    process.env.GCLOUD_PROJECT = 'demo-groomly'
    expect(() => fermaSeNonDemo()).not.toThrow()
  })
})
