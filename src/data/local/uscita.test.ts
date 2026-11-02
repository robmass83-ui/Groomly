// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __impostaRipartenza, finisciUscita, prendiCacheDaSvuotare, pulisciDatiAccount, ripartiDaAccesso, segnaCacheSvuotata, segnaUscita } from './uscita'
import { chiaveEliminazioni } from '../../lib/tombstone'
import { storageKeys } from './storage'
import { sharedMirrorKey } from '../../lib/sharedMirror'
import { PUSH_TOKEN_KEY } from '../../lib/pushDevice'

const UID = 'u1'

describe('uscita: pulizia dei dati dell’account', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    __impostaRipartenza(null)
  })

  const via = [
    storageKeys.dogs(UID),
    storageKeys.settings(UID),
    storageKeys.appointments(UID),
    `groomly.users.${UID}.driveUltimoInvio`,
    `groomly.piano.${UID}`,
    `groomly.pending-photos.${UID}`,
  ]
  const restano = [
    storageKeys.dogs('u2'),
    `groomly.piano.u2`,
    sharedMirrorKey(UID),
    `groomly.mirror.${UID}`,
    'groomly.lingua',
    PUSH_TOKEN_KEY,
    'groomly.pushDevice',
    `groomly.pushPrefs.${UID}`,
    storageKeys.lastSignIn,
    'groomly.pendingSalon.x',
  ]

  it('toglie tutto ciò che è dell’account, anche senza il segno di copia del cloud', () => {
    for (const key of [...via, ...restano]) localStorage.setItem(key, '{}')
    pulisciDatiAccount(UID)
    for (const key of via) expect(localStorage.getItem(key), key).toBeNull()
    for (const key of restano) expect(localStorage.getItem(key), key).toBe('{}')
  })

  it('in modalità locale non toglie nulla', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    for (const key of [...via, ...restano]) localStorage.setItem(key, '{}')
    pulisciDatiAccount(UID)
    for (const key of [...via, ...restano]) expect(localStorage.getItem(key), key).toBe('{}')
  })

  it('senza uid non toglie nulla', () => {
    localStorage.setItem(storageKeys.dogs(UID), '{}')
    pulisciDatiAccount('')
    expect(localStorage.getItem(storageKeys.dogs(UID))).toBe('{}')
  })

  it('ripartiDaAccesso usa la ripartenza sostituita nei test', () => {
    const riparti = vi.fn()
    __impostaRipartenza(riparti)
    ripartiDaAccesso()
    expect(riparti).toHaveBeenCalledTimes(1)
  })

  it('il segno d’uscita resta per la ripartenza', () => {
    segnaUscita(UID)
    expect(sessionStorage.getItem('groomly.uscita')).toBe(UID)
  })

  it('all’avvio ripulisce le copie riscritte dagli ascolti e toglie il segno, una volta sola', () => {
    segnaUscita(UID)
    for (const key of [...via, ...restano]) localStorage.setItem(key, '{}')
    localStorage.setItem(chiaveEliminazioni(UID), '{"ids":["d1"]}')
    finisciUscita()
    for (const key of via) expect(localStorage.getItem(key), key).toBeNull()
    for (const key of restano) expect(localStorage.getItem(key), key).toBe('{}')
    expect(localStorage.getItem(chiaveEliminazioni(UID))).toBeNull()
    expect(sessionStorage.getItem('groomly.uscita')).toBeNull()
    localStorage.setItem(storageKeys.dogs(UID), '{}')
    finisciUscita()
    expect(localStorage.getItem(storageKeys.dogs(UID))).toBe('{}')
  })

  it('senza segno l’avvio non tocca nulla', () => {
    for (const key of [...via, ...restano]) localStorage.setItem(key, '{}')
    finisciUscita()
    for (const key of [...via, ...restano]) expect(localStorage.getItem(key), key).toBe('{}')
  })

  it('se all’uscita la cache non si è svuotata, l’avvio chiede di svuotarla una volta', () => {
    segnaUscita(UID)
    finisciUscita()
    expect(sessionStorage.getItem('groomly.uscita.svuotaCache')).toBe('1')
    expect(prendiCacheDaSvuotare()).toBe(true)
    expect(prendiCacheDaSvuotare()).toBe(false)
  })

  it('con la cache svuotata all’uscita l’avvio non chiede nulla', () => {
    segnaUscita(UID)
    segnaCacheSvuotata()
    finisciUscita()
    expect(prendiCacheDaSvuotare()).toBe(false)
    expect(sessionStorage.getItem('groomly.uscita.cacheSvuotata')).toBeNull()
  })

  it('senza uscita l’avvio non chiede di svuotare la cache', () => {
    finisciUscita()
    expect(prendiCacheDaSvuotare()).toBe(false)
  })

  it('in modalità locale non lascia il segno', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    segnaUscita(UID)
    expect(sessionStorage.getItem('groomly.uscita')).toBeNull()
  })
})
