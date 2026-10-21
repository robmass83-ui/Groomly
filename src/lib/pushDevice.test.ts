import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pushDeviceId, pushTapPath, shouldScheduleLocalUpdate } from './pushDevice'

describe('push del telefono', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('mantiene un identificativo stabile del telefono', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')

    expect(pushDeviceId()).toBe('00000000-0000-4000-8000-000000000001')
    expect(pushDeviceId()).toBe('00000000-0000-4000-8000-000000000001')
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
  })

  it('lascia l’avviso locale solo quando la push aggiornamenti non è pronta', () => {
    expect(shouldScheduleLocalUpdate(true, true)).toBe(false)
    expect(shouldScheduleLocalUpdate(true, false)).toBe(true)
    expect(shouldScheduleLocalUpdate(false, true)).toBe(true)
  })

  it('apre solo un appuntamento indicato da una push da completare', () => {
    expect(pushTapPath({ type: 'complete', url: '/appuntamenti/a1' })).toBe('/appuntamenti/a1')
    expect(pushTapPath({ type: 'reminder', url: '/appuntamenti/personale/p1' })).toBe('/appuntamenti/personale/p1')
    expect(pushTapPath({ type: 'complete', url: '/impostazioni' })).toBeNull()
    expect(pushTapPath({ type: 'update', url: '/appuntamenti/a1' })).toBeNull()
  })
})
