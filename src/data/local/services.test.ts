import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { createService, ensureServiceSeed, listServices, moveService, reorderKind, updateService } from './services'
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

  it('riordina dentro il gruppo kind in un solo salvataggio', () => {
    const key = storageKeys.services('uid-1')
    const now = new Date().toISOString()
    const map = {
      p0: { id: 'p0', name: 'A', kind: 'principale' as const, durationMin: { piccola: 1, media: 1, grande: 1 }, price: { piccola: 1, media: 1, grande: 1 }, order: 0, active: true, createdAt: now, updatedAt: now },
      p1: { id: 'p1', name: 'B', kind: 'principale' as const, durationMin: { piccola: 1, media: 1, grande: 1 }, price: { piccola: 1, media: 1, grande: 1 }, order: 1, active: true, createdAt: now, updatedAt: now },
      p2: { id: 'p2', name: 'C', kind: 'principale' as const, durationMin: { piccola: 1, media: 1, grande: 1 }, price: { piccola: 1, media: 1, grande: 1 }, order: 2, active: true, createdAt: now, updatedAt: now },
      e0: { id: 'e0', name: 'E', kind: 'extra' as const, durationMin: { piccola: 1, media: 1, grande: 1 }, price: { piccola: 1, media: 1, grande: 1 }, order: 3, active: true, createdAt: now, updatedAt: now },
    }
    localStorage.setItem(key, JSON.stringify(map))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const next = reorderKind('uid-1', 'p0', 2)
    expect(next.find((s) => s.id === 'e0')?.order).toBe(3)
    const principali = next.filter((s) => s.kind === 'principale').sort((a, b) => a.order - b.order)
    expect(principali.map((s) => s.id)).toEqual(['p1', 'p2', 'p0'])
    expect(principali.map((s) => s.order)).toEqual([0, 1, 2])
    expect(setItem.mock.calls.filter(([k]) => k === key)).toHaveLength(1)
    setItem.mockRestore()
    expect(() => reorderKind('uid-1', 'manca', 0)).toThrow(expect.objectContaining({ code: 'service_missing' }))
    const rawBefore = localStorage.getItem(key)
    expect(reorderKind('uid-1', 'p0', 9)).toEqual(next)
    expect(localStorage.getItem(key)).toBe(rawBefore)
  })
})
