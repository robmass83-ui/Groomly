import { describe, expect, it } from 'vitest'
import { messaggioCallable } from './messaggioCallable'

const RIPROVA = 'Riprova'
const FALLITO = 'Non riuscito'
const m = (e: unknown) => messaggioCallable(e, FALLITO, RIPROVA)

describe('messaggioCallable', () => {
  it('timeout con codice nudo: riprova', () => {
    expect(m(Object.assign(new Error('deadline-exceeded'), { code: 'functions/deadline-exceeded' }))).toBe(RIPROVA)
  })
  it('messaggio che è solo un codice: riprova', () => {
    expect(m(new Error('unavailable'))).toBe(RIPROVA)
    expect(m(new Error('permission-denied'))).toBe(RIPROVA)
    expect(m(new Error('internal'))).toBe(RIPROVA)
  })
  it('codici auth e INTERNAL: riprova', () => {
    expect(m(Object.assign(new Error('Firebase: Error'), { code: 'auth/network-request-failed' }))).toBe(RIPROVA)
    expect(m(new Error('INTERNAL'))).toBe(RIPROVA)
  })
  it('il codice del server decide la frase, nella lingua dell’app', () => {
    localStorage.setItem('groomly.lingua', 'de')
    expect(m(Object.assign(new Error('Invito scaduto'), { code: 'functions/failed-precondition', details: { codice: 'invito_scaduto' } }))).toBe('Einladung abgelaufen')
    localStorage.removeItem('groomly.lingua')
  })
  it('senza codice il testo italiano del server non si mostra', () => {
    expect(m(Object.assign(new Error('functions/failed-precondition: Invito scaduto [400]'), { code: 'functions/failed-precondition' }))).toBe(FALLITO)
  })
  it('senza errore leggibile: fallito', () => {
    expect(m('x')).toBe(FALLITO)
  })
})
