import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { riepilogoGiorno } from './settimana'

function visita(id: string, hour: number, kind?: 'personale'): Appointment {
  return {
    id,
    dogId: kind === 'personale' ? '' : `d-${id}`,
    title: kind === 'personale' ? 'Pausa' : undefined,
    kind,
    start: new Date(2026, 9, 11, hour, 0, 0, 0),
    services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 1 }],
    status: 'programmato',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Appointment
}

describe('riepilogo settimana', () => {
  const giorno = new Date(2026, 9, 11)

  it('quattro cani non sono un giorno pieno', () => {
    const items = [1, 2, 3, 4].map((n) => visita(String(n), n))
    expect(riepilogoGiorno(items, giorno)).toEqual({ cani: 4, minuti: 120, pieno: false })
  })

  it('il quinto cane rende il giorno pieno e ignora personale e disdetta', () => {
    const items = [1, 2, 3, 4, 5].map((n) => visita(String(n), n))
    items.push({ ...visita('no', 18), status: 'disdetto' })
    items.push(visita('pausa', 19, 'personale'))
    expect(riepilogoGiorno(items, giorno)).toEqual({ cani: 5, minuti: 150, pieno: true })
  })
})
