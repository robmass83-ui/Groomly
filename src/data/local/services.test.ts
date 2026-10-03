import { beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '../errors'
import { createService, ensureServiceSeed, listServices, moveService, updateService } from './services'
import { storageKeys } from './storage'

describe('services', () => {
  beforeEach(() => localStorage.clear())

  it('scrive gli 8 servizi una sola volta', () => {
    const first = ensureServiceSeed('uid-1')
    expect(first.map((service) => service.id)).toEqual([
      'bagno', 'taglio', 'bagno-taglio', 'stripping', 'nodi', 'dermatologico', 'antiparassitario', 'unghie',
    ])
    expect(first.find((service) => service.id === 'nodi')?.price).toEqual({ piccola: 5, media: 5, grande: 5 })
    expect(first.find((service) => service.id === 'stripping')?.iconKey).toBeUndefined()
    const extra = createService('uid-1', {
      name: 'Spazzolata',
      kind: 'extra',
      durationMin: { piccola: 10, media: 10, grande: 10 },
      price: { piccola: 5, media: 5, grande: 5 },
      active: true,
    })
    expect(extra.iconKey).toBeUndefined()
    expect(extra.order).toBe(8)
    const second = ensureServiceSeed('uid-1')
    expect(second).toHaveLength(9)
    expect(second.some((service) => service.id === extra.id)).toBe(true)
  })

  it('disattiva, aggiorna e non cambia il tipo', () => {
    ensureServiceSeed('uid-1')
    const updated = updateService('uid-1', 'bagno', {
      name: 'Bagno delicato',
      active: false,
      price: { piccola: 22, media: 28, grande: 38 },
    })
    expect(updated.name).toBe('Bagno delicato')
    expect(updated.active).toBe(false)
    expect(updated.kind).toBe('principale')
    expect(() => updateService('uid-1', 'manca', { name: 'x' })).toThrow(AppError)
    expect(listServices('uid-1').some((service) => service.id === 'manca')).toBe(false)
  })

  it('scambia l’ordine e non scrive agli estremi', () => {
    ensureServiceSeed('uid-1')
    const rawBefore = localStorage.getItem(storageKeys.services('uid-1'))
    expect(() => moveService('uid-1', 'bagno', 'up')).toThrowError(expect.objectContaining({ code: 'service_boundary' }))
    expect(localStorage.getItem(storageKeys.services('uid-1'))).toBe(rawBefore)
    const moved = moveService('uid-1', 'taglio', 'up')
    expect(moved[0].id).toBe('taglio')
    expect(moved[1].id).toBe('bagno')
  })
})
