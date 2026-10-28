import { describe, expect, it } from 'vitest'
import type { Service } from '../types/models'
import { listinoView } from './listino'

function at(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function svc(partial: Pick<Service, 'id' | 'name' | 'kind' | 'order'> & Partial<Service>): Service {
  return {
    durationMin: { piccola: 30, media: 45, grande: 60 },
    price: { piccola: 20, media: 28, grande: 38 },
    active: true,
    createdAt: at(2026, 10, 1),
    updatedAt: at(2026, 10, 1),
    ...partial,
  }
}

describe('listinoView', () => {
  it('mette tre prezzi sul principale e una cella sull\u2019extra', () => {
    const view = listinoView([
      svc({ id: 'bagno', name: 'Bagno', kind: 'principale', order: 0 }),
      svc({
        id: 'nodi', name: 'Gestione nodi', kind: 'extra', order: 1,
        durationMin: { piccola: 20, media: 20, grande: 20 },
        price: { piccola: 5, media: 5, grande: 5 },
      }),
    ])
    expect(view.rows).toEqual([
      {
        id: 'bagno', name: 'Bagno', duration: '30–60 min',
        price: { kind: 'sizes', piccola: '€ 20', media: '€ 28', grande: '€ 38' },
      },
    ])
    expect(view.extras).toEqual([
      {
        id: 'nodi', name: 'Gestione nodi', duration: '+20 min',
        price: { kind: 'single', text: '€ 5' },
      },
    ])
    expect(view.updatedAt).toEqual(at(2026, 10, 1))
  })

  it('riassume una durata unica e un extra dal prezzo più piccolo al più grande', () => {
    const view = listinoView([
      svc({
        id: 'fisso', name: 'Fisso', kind: 'principale', order: 0,
        durationMin: { piccola: 60, media: 60, grande: 60 },
      }),
      svc({
        id: 'vario', name: 'Vario', kind: 'extra', order: 1,
        durationMin: { piccola: 15, media: 15, grande: 15 },
        price: { piccola: 8, media: 5, grande: 8 },
      }),
    ])
    expect(view.rows[0].duration).toBe('60 min')
    expect(view.extras[0].price).toEqual({ kind: 'single', text: '€ 5–8' })
  })

  it('un principale con tre prezzi uguali è una sola cella «tutte le taglie»', () => {
    const view = listinoView([
      svc({
        id: 'unghie', name: 'Unghie', kind: 'principale', order: 0,
        price: { piccola: 5, media: 5, grande: 5 },
      }),
    ])
    expect(view.rows[0].price).toEqual({ kind: 'all', text: '€ 5 · tutte le taglie' })
  })

  it('ignora un servizio spento e la sua data', () => {
    const view = listinoView([
      svc({ id: 'acceso', name: 'Acceso', kind: 'principale', order: 1, updatedAt: at(2026, 9, 1) }),
      svc({ id: 'spento', name: 'Spento', kind: 'principale', order: 0, active: false, updatedAt: at(2026, 12, 1) }),
    ])
    expect(view.rows.map((row) => row.id)).toEqual(['acceso'])
    expect(view.updatedAt).toEqual(at(2026, 9, 1))
  })

  it('a parità di order mette prima l\u2019id che localeCompare considera minore', () => {
    const view = listinoView([
      svc({ id: 'b', name: 'B', kind: 'principale', order: 0 }),
      svc({ id: 'a', name: 'A', kind: 'principale', order: 0 }),
    ])
    expect(view.rows.map((row) => row.id)).toEqual(['a', 'b'])
  })

  it('senza attivi non ha righe né data', () => {
    const view = listinoView([
      svc({ id: 'spento', name: 'Spento', kind: 'principale', order: 0, active: false }),
    ])
    expect(view.rows).toEqual([])
    expect(view.extras).toEqual([])
    expect(view.updatedAt).toBeNull()
  })
})
