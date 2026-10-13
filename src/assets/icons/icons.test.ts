import { describe, expect, it } from 'vitest'
import { PRICE_ICONS, SERVICE_ICONS } from './icons'
import { SERVICE_ICON_KEYS } from '../../types/models'

const EXTRA = ['bagno_sistemazione', 'pelo_corto', 'pelo_lungo', 'unghie', 'orecchie', 'occhi', 'shampoo', 'tosatrice'] as const

describe('PRICE_ICONS', () => {
  it('tiene le icone servizio e ne aggiunge otto, ognuna con src e label', () => {
    expect(Object.keys(SERVICE_ICONS).sort()).toEqual([...SERVICE_ICON_KEYS].sort())
    for (const key of EXTRA) {
      expect(PRICE_ICONS[key].src).toEqual(expect.any(String))
      expect(PRICE_ICONS[key].label.length).toBeGreaterThan(0)
    }
    expect(PRICE_ICONS.bagno.src).toBe(SERVICE_ICONS.bagno.src)
    expect(PRICE_ICONS.shampoo.label).toBe('Shampoo')
  })
})
