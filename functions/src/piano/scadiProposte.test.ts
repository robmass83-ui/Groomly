import { describe, expect, it } from 'vitest'
import { nuovePassate, proposteScadute } from './scadiProposte'

describe('nuovePassate', () => {
  const adesso = new Date('2026-10-28T08:00:00.000Z')

  it('sceglie la nuova di ieri e lascia la nuova di domani e la proposta', () => {
    expect(nuovePassate([
      { id: 'ieri', status: 'nuova', start: '2026-10-27T16:00:00.000Z' },
      { id: 'domani', status: 'nuova', start: '2026-10-29T16:00:00.000Z' },
      { id: 'proposta', status: 'proposta', start: '2026-10-27T16:00:00.000Z' },
    ], adesso)).toEqual(['ieri'])
  })

  it('include l’inizio proprio adesso e ignora un inizio illeggibile o assente', () => {
    expect(nuovePassate([
      { id: 'adesso', status: 'nuova', start: '2026-10-28T08:00:00.000Z' },
      { id: 'mah', status: 'nuova', start: 'ieri' },
      { id: 'senza', status: 'nuova' },
    ], adesso)).toEqual(['adesso'])
  })
})

describe('proposteScadute', () => {
  it('sceglie solo le proposte con la finestra già chiusa', () => {
    expect(proposteScadute([
      { id: 'a', status: 'proposta', scadeIl: '2026-10-28T07:00:00.000Z', appointmentId: 'app1' },
      { id: 'b', status: 'proposta', scadeIl: '2026-10-28T10:00:00.000Z', appointmentId: 'app2' },
      { id: 'c', status: 'nuova', scadeIl: '2026-10-28T07:00:00.000Z' },
    ], new Date('2026-10-28T08:00:00.000Z'))).toEqual([{ id: 'a', appointmentId: 'app1' }])
  })

  it('non rivede una richiesta già scaduta', () => {
    expect(proposteScadute([
      { id: 'a', status: 'scaduta', scadeIl: '2026-10-28T07:00:00.000Z', appointmentId: 'app1' },
      { id: 'b', status: 'accettata', scadeIl: '2026-10-28T07:00:00.000Z' },
      { id: 'c', status: 'rifiutata', scadeIl: '2026-10-28T07:00:00.000Z' },
    ], new Date('2026-10-28T08:00:00.000Z'))).toEqual([])
  })

  it('include chi scade proprio adesso e lascia fuori chi scade dopo', () => {
    expect(proposteScadute([
      { id: 'a', status: 'proposta', scadeIl: '2026-10-28T08:00:00.000Z', appointmentId: 'app1' },
      { id: 'b', status: 'proposta', scadeIl: '2026-10-28T08:00:00.001Z', appointmentId: 'app2' },
    ], new Date('2026-10-28T08:00:00.000Z'))).toEqual([{ id: 'a', appointmentId: 'app1' }])
  })

  it('una proposta senza data valida non resta appesa per sempre e senza visita non porta id', () => {
    expect(proposteScadute([
      { id: 'a', status: 'proposta' },
      { id: 'b', status: 'proposta', scadeIl: 'ieri' },
    ], new Date('2026-10-28T08:00:00.000Z'))).toEqual([{ id: 'a' }, { id: 'b' }])
  })
})
