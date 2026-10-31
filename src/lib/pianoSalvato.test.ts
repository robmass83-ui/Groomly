import { beforeEach, describe, expect, it } from 'vitest'
import { pianoPermette, salvaPiano } from './pianoSalvato'

const ORA = new Date('2026-10-31T12:00:00.000Z')
const ORE = 60 * 60 * 1000

describe('piano salvato sul telefono', () => {
  beforeEach(() => localStorage.clear())

  it('senza documento salvato non permette nulla', () => {
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(false)
  })

  it('un salone in omaggio senza scadenza resta Plus a qualsiasi data', () => {
    salvaPiano('u1', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null })
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(true)
    expect(pianoPermette('u1', 'backupAuto', new Date('2035-01-01T00:00:00.000Z'))).toBe(true)
  })

  it('un Plus scaduto vale ancora 72 ore, poi no', () => {
    const scadeIl = new Date(ORA.getTime() - 24 * ORE).toISOString()
    salvaPiano('u1', { piano: 'pro', stato: 'attivo', scadeIl })
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(true)
    expect(pianoPermette('u1', 'backupAuto', new Date(ORA.getTime() + 47 * ORE))).toBe(true)
    expect(pianoPermette('u1', 'backupAuto', new Date(ORA.getTime() + 49 * ORE))).toBe(false)
  })

  it('il piano Go non permette', () => {
    salvaPiano('u1', { piano: 'base' })
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(false)
  })

  it('ogni account ha il suo piano e null lo toglie', () => {
    salvaPiano('u1', { piano: 'pro', stato: 'attivo', scadeIl: null })
    expect(pianoPermette('u2', 'backupAuto', ORA)).toBe(false)
    salvaPiano('u1', null)
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(false)
  })

  it('un salvataggio rovinato non permette e non rompe', () => {
    localStorage.setItem('groomly.piano.u1', '{rotto')
    expect(pianoPermette('u1', 'backupAuto', ORA)).toBe(false)
  })
})
