import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { controlloOrario } from './controlloOrario'

const lunedi = [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }]
const ORARI = { 1: lunedi, 2: lunedi, 3: lunedi, 4: lunedi, 5: lunedi, 6: [{ da: '09:00', a: '13:00' }] }
const at = (h: number, m: number) => new Date(2026, 10, 9, h, m)

function visita(id: string, start: Date, minuti: number, extra: Partial<Appointment> = {}): Appointment {
  return {
    id, dogId: `dog-${id}`, start, status: 'programmato',
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: minuti, price: 20 }],
    createdAt: start, updatedAt: start, ...extra,
  }
}

const A = visita('A', at(10, 0), 60, { assigneeUid: 'u1' })
const B = visita('B', at(10, 30), 60, { assigneeUid: 'u2' })
const disdetta = visita('C', at(10, 0), 60, { status: 'disdetto' })
const personale = visita('P', at(10, 0), 60, { kind: 'personale' })
const visite = [A, B, disdetta, personale]

describe('controlloOrario', () => {
  it('elenca le visite in programma che si sovrappongono, in ordine', () => {
    const esito = controlloOrario({ inizio: at(10, 15), fine: at(10, 45), visite, orari: undefined })
    expect(esito.sovrapposte).toEqual([A, B])
    expect(esito.chiudeAlle).toBeNull()
    expect(esito.fuoriOrario).toBe(false)
  })

  it('con una persona conta solo le sue visite', () => {
    const esito = controlloOrario({ inizio: at(10, 15), fine: at(10, 45), visite, persona: { uid: 'u1', ownerUid: 'own' } })
    expect(esito.sovrapposte).toEqual([A])
  })

  it('ignora la visita che si sta modificando', () => {
    const esito = controlloOrario({ inizio: at(10, 15), fine: at(10, 45), visite, ignoraId: A.id })
    expect(esito.sovrapposte).toEqual([B])
  })

  it('segnala la chiusura superata', () => {
    const esito = controlloOrario({ inizio: at(12, 45), fine: at(14, 45), visite, orari: ORARI })
    expect(esito.chiudeAlle).toBe('13:00')
    expect(esito.fuoriOrario).toBe(false)
  })

  it('segnala l’inizio fuori orario', () => {
    expect(controlloOrario({ inizio: at(13, 30), fine: at(14, 0), visite, orari: ORARI }).fuoriOrario).toBe(true)
  })

  it('una visita che inizia quando un’altra finisce non si sovrappone', () => {
    expect(controlloOrario({ inizio: at(11, 30), fine: at(12, 0), visite }).sovrapposte).toEqual([])
  })
})
