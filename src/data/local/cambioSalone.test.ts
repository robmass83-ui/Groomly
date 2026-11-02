// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __impostaRicarica, dopoCambioSalone, finisciCambioSalone, pulisciDatiSalone } from './cambioSalone'
import { storageKeys } from './storage'

const UID = 'ada'

describe('cambio di salone sul telefono', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    __impostaRicarica(null)
  })

  it('toglie le copie del salone sotto l’uid e lascia il resto', () => {
    const salone = [
      storageKeys.settings(UID),
      storageKeys.services(UID),
      storageKeys.dogs(UID),
      storageKeys.appointments(UID),
      storageKeys.closures(UID),
      storageKeys.attesa(UID),
      storageKeys.avvisiAttesa(UID),
      `groomly.users.${UID}.ripristinoSicurezza`,
      `groomly.users.${UID}.driveUltimoInvio`,
      `groomly.users.${UID}.driveUltimoErrore`,
      `groomly.piano.${UID}`,
      `groomly.pending-photos.${UID}`,
    ]
    const restano = [
      storageKeys.lastSignIn,
      storageKeys.auth,
      storageKeys.session,
      'groomly.lingua',
      'groomly.pushDevice',
      'groomly.pendingSalon.ada@salone.it',
      `groomly.pushPrefs.${UID}`,
      storageKeys.settings('altro'),
      storageKeys.dogs('altro'),
      `groomly.piano.altro`,
    ]
    for (const key of [...salone, ...restano]) localStorage.setItem(key, '{}')
    localStorage.setItem(`groomly.mirror.${UID}`, '1')
    pulisciDatiSalone(UID)
    for (const key of salone) expect(localStorage.getItem(key), key).toBeNull()
    for (const key of restano) expect(localStorage.getItem(key), key).toBe('{}')
    expect(localStorage.getItem(`groomly.mirror.${UID}`)).toBe('1')
  })

  it('i dati mai arrivati nel cloud restano: sono l’unica copia', () => {
    localStorage.setItem(storageKeys.dogs(UID), '[]')
    pulisciDatiSalone(UID)
    expect(localStorage.getItem(storageKeys.dogs(UID))).toBe('[]')
  })

  it('dopo il cambio pulisce e ricarica dalla Home', () => {
    const ricarica = vi.fn(() => {
      expect(localStorage.getItem(storageKeys.settings(UID))).toBeNull()
    })
    __impostaRicarica(ricarica)
    localStorage.setItem(`groomly.mirror.${UID}`, '1')
    localStorage.setItem(storageKeys.settings(UID), '{}')
    dopoCambioSalone(UID)
    expect(ricarica).toHaveBeenCalledTimes(1)
  })

  it('senza uid ricarica soltanto', () => {
    const ricarica = vi.fn()
    __impostaRicarica(ricarica)
    localStorage.setItem(storageKeys.settings(UID), '{}')
    dopoCambioSalone('')
    expect(ricarica).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(storageKeys.settings(UID))).toBe('{}')
  })

  it('all’avvio ripulisce le copie riscritte mentre la pagina si chiudeva, una volta sola', () => {
    __impostaRicarica(() => undefined)
    localStorage.setItem(`groomly.mirror.${UID}`, '1')
    dopoCambioSalone(UID)
    localStorage.setItem(storageKeys.settings(UID), '{"vecchio":true}')
    finisciCambioSalone()
    expect(localStorage.getItem(storageKeys.settings(UID))).toBeNull()
    localStorage.setItem(storageKeys.settings(UID), '{"nuovo":true}')
    finisciCambioSalone()
    expect(localStorage.getItem(storageKeys.settings(UID))).toBe('{"nuovo":true}')
  })

  it('senza un cambio appena fatto l’avvio non tocca nulla', () => {
    localStorage.setItem(`groomly.mirror.${UID}`, '1')
    localStorage.setItem(storageKeys.settings(UID), '{}')
    finisciCambioSalone()
    expect(localStorage.getItem(storageKeys.settings(UID))).toBe('{}')
  })
})
